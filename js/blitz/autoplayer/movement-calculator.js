// Removed constants import - using defaults
import { ThreatAssessment } from "./threat-assessment.js";
import { CollisionPredictor } from "./collision-predictor.js";

/**
 * MovementCalculator - Handles all movement calculations for the autoplayer
 * Separated from main autoplayer to improve code organization
 */
export class MovementCalculator {
  constructor(player, options = {}) {
    this.player = player;
    this.threatAssessment = new ThreatAssessment(player);
    this.collisionPredictor = new CollisionPredictor(player);
    
    // Enhanced safety buffer - 1.5x normal player hitbox for better collision avoidance
    this.PLAYER_HITBOX = 6; // Base player hitbox
    this.SAFETY_BUFFER = this.PLAYER_HITBOX * 1.5; // 9 pixels for enhanced safety
    
    // Movement goal configuration
    this.goalDuration = options.goalDuration || 60;
    this.goalRevaluationThreshold = options.goalRevaluationThreshold || 30;
    this.maxGoalDistance = options.maxGoalDistance || 100;
    
    // Movement state
    this.currentMovementGoal = null;
    this.goalTimer = 0;
  }

  /**
   * SURVIVAL-FIRST movement calculation - prioritizes staying alive above all else
   */
  calculateDodgeVector(enemies, miniBosses, boss, enemyBullets, enemyLasers, asteroids, powerups = [], timeSlowActive = false) {
    // Create collidables array for internal threat assessment
    const collidables = [];
    enemies.forEach(e => collidables.push({...e, collidableType: "enemy"}));
    miniBosses.forEach(e => collidables.push({...e, collidableType: "enemy"}));
    if (boss) collidables.push({...boss, collidableType: "boss"});
    enemyBullets.forEach(e => collidables.push({...e, collidableType: "enemyBullet"}));
    enemyLasers.forEach(e => collidables.push({...e, collidableType: "enemyLaser"}));
    asteroids.forEach(e => collidables.push({...e, collidableType: "asteroid"}));

    // Calculate slowdown factor for time slow mode
    const slowdownFactor = timeSlowActive ? 0.3 : 1.0;

    // STEP 1: Identify immediate lethal threats
    const immediateDangers = this.identifyLethalThreats(collidables, slowdownFactor);
    
    // STEP 2: Calculate collision-free escape vectors
    const safeEscapeVectors = this.calculateSafeEscapeVectors(collidables, slowdownFactor);
    
    // STEP 3: If in immediate danger, execute emergency evasion
    if (immediateDangers.length > 0) {
      return this.executeEmergencyEvasion(immediateDangers, safeEscapeVectors, slowdownFactor);
    }
    
    // STEP 4: Apply fluidity system for non-emergency movement
    const threats = this.collisionPredictor.mapAllThreats(collidables, slowdownFactor);
    const collisionPredictions = this.collisionPredictor.predictAllCollisions(threats, slowdownFactor);
    const primaryThreat = this.collisionPredictor.identifyPrimaryThreat(collisionPredictions, threats);
    const movementGoal = this.determineMovementGoal(collidables, powerups, threats, collisionPredictions, primaryThreat);
    
    return this.applyFluiditySystem(movementGoal, threats, collisionPredictions, slowdownFactor, primaryThreat);
  }

  /**
   * SURVIVAL SYSTEM: Identify immediate lethal threats that require emergency action
   */
  identifyLethalThreats(collidables, slowdownFactor) {
    return this.threatAssessment.identifyLethalThreats(collidables, slowdownFactor);
  }

  /**
   * Get standardized threat properties for any collidable
   */
  getThreatProperties(collidable) {
    return this.threatAssessment.getThreatProperties(collidable);
  }

  /**
   * Calculate accurate collision time for a specific threat
   */
  calculateCollisionTime(threat, slowdownFactor) {
    return this.threatAssessment.calculateCollisionTime(threat, slowdownFactor);
  }

  /**
   * Calculate threat severity (0.0 = no threat, 1.0 = imminent death)
   */
  calculateThreatSeverity(distance, collisionTime, priority) {
    return this.threatAssessment.calculateThreatSeverity(distance, collisionTime, priority);
  }

  /**
   * Calculate all safe escape vectors from current position
   */
  calculateSafeEscapeVectors(collidables, slowdownFactor) {
    const testDirections = [];
    const numDirections = 12;
    
    for (let i = 0; i < numDirections; i++) {
      const angle = (i * Math.PI * 2) / numDirections;
      testDirections.push({
        x: Math.cos(angle),
        y: Math.sin(angle),
        angle: angle
      });
    }
    
    const safeVectors = [];
    const testDistance = 80;
    
    for (const direction of testDirections) {
      const testX = this.player.x + direction.x * testDistance;
      const testY = this.player.y + direction.y * testDistance;
      
      if (this.isPositionSafe(testX, testY, collidables, slowdownFactor)) {
        const safetyScore = this.calculatePositionSafety(testX, testY, collidables, slowdownFactor);
        safeVectors.push({
          direction: direction,
          safetyScore: safetyScore,
          testX: testX,
          testY: testY
        });
      }
    }
    
    return safeVectors.sort((a, b) => b.safetyScore - a.safetyScore);
  }

  /**
   * Check if a position is safe from all threats, including laser paths
   */
  isPositionSafe(testX, testY, collidables, slowdownFactor) {
    const safetyMargin = 30;
    
    // Check screen bounds
    if (testX < safetyMargin || testX > window.innerWidth - safetyMargin ||
        testY < safetyMargin || testY > window.innerHeight - safetyMargin) {
      return false;
    }
    
    // Check for threat collisions and laser paths
    for (const collidable of collidables) {
      const threatData = this.getThreatProperties(collidable);
      if (!threatData) continue;
      
      // Only check imminent threats unless they're lasers
      const isImminentOrLaser = this.threatAssessment.isImminentThreat(collidable, slowdownFactor) || 
                               this.threatAssessment.hasLaserIndicators(collidable) ||
                               collidable.collidableType === 'enemyLaser';
      
      if (!isImminentOrLaser) {
        continue; // Skip distant non-laser threats
      }
      
      // Check laser path avoidance - primary entity lasers
      const laserInfo = this.threatAssessment.getLaserLineInfo(collidable);
      if (laserInfo && (laserInfo.isCharging || laserInfo.warningActive || laserInfo.isActive)) {
        // Use larger safety buffer for laser paths
        const laserSafetyBuffer = this.SAFETY_BUFFER * 4; // 4x safety buffer for lasers (increased from 3x)
        if (this.threatAssessment.isPositionInLaserPath(testX, testY, laserInfo, laserSafetyBuffer)) {
          return false;
        }
      }
      
      // Additional check for boss parts with activeLaser properties
      if (collidable.parts && Array.isArray(collidable.parts)) {
        for (const part of collidable.parts) {
          if (part.activeLaser && !part.destroyed) {
            const laser = part.activeLaser;
            const partLaserInfo = {
              originX: laser.originX || part.x,
              originY: laser.originY || part.y,
              angle: laser.angle,
              width: laser.width || 16,
              maxLength: laser.maxLength || Math.max(window.innerWidth, window.innerHeight) * 1.5
            };
            
            // Very large safety buffer for laser warnings
            const laserSafetyBuffer = this.SAFETY_BUFFER * 4;
            if (this.threatAssessment.isPositionInLaserPath(testX, testY, partLaserInfo, laserSafetyBuffer)) {
              return false;
            }
          }
        }
      }
      
      // Check regular threat collisions
      const distance = Math.sqrt((collidable.x - testX) ** 2 + (collidable.y - testY) ** 2);
      const requiredDistance = threatData.radius + this.SAFETY_BUFFER + safetyMargin;
      
      if (distance < requiredDistance) {
        if (threatData.isMoving) {
          const collisionTime = this.calculateCollisionTimeForPosition(collidable, testX, testY, slowdownFactor);
          if (collisionTime > 0 && collisionTime < 60) {
            return false;
          }
        } else {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Calculate collision time for a specific position
   */
  calculateCollisionTimeForPosition(threat, testX, testY, slowdownFactor) {
    // Create temporary player position object for calculation
    const tempPlayer = { x: testX, y: testY, vx: 0, vy: 0 };
    const tempThreatAssessment = new ThreatAssessment(tempPlayer);
    return tempThreatAssessment.calculateCollisionTime(threat, slowdownFactor);
  }

  /**
   * Calculate position safety score (higher = safer) including laser avoidance
   */
  calculatePositionSafety(testX, testY, collidables, slowdownFactor) {
    let safetyScore = 1.0;
    const dangerRadius = 120;
    
    // Penalty for being near screen edges
    const edgeMargin = 50;
    const edgePenalty = Math.max(0, 
      Math.min(testX - edgeMargin, window.innerWidth - testX - edgeMargin,
               testY - edgeMargin, window.innerHeight - testY - edgeMargin)
    ) / edgeMargin;
    safetyScore *= (0.8 + 0.2 * edgePenalty);
    
    // Check for laser threats and regular threats
    for (const collidable of collidables) {
      const distance = Math.sqrt((collidable.x - testX) ** 2 + (collidable.y - testY) ** 2);
      const threatData = this.getThreatProperties(collidable);
      if (!threatData) continue;
      
      // Only check imminent threats unless they're lasers
      const isImminentOrLaser = this.threatAssessment.isImminentThreat(collidable, slowdownFactor) || 
                               this.threatAssessment.hasLaserIndicators(collidable) ||
                               collidable.collidableType === 'enemyLaser';
      
      if (!isImminentOrLaser) {
        continue; // Skip distant non-laser threats
      }
      
      // Major penalty for being in laser paths
      const laserInfo = this.threatAssessment.getLaserLineInfo(collidable);
      if (laserInfo) {
        const laserSafetyBuffer = this.SAFETY_BUFFER * 2;
        if (this.threatAssessment.isPositionInLaserPath(testX, testY, laserInfo, laserSafetyBuffer)) {
          if (laserInfo.isActive) {
            safetyScore *= 0.01; // Extreme penalty for active laser paths (reduced from 0.05)
          } else if (laserInfo.isCharging || laserInfo.warningActive) {
            safetyScore *= 0.1; // Very large penalty for charging/warning laser paths (reduced from 0.2)
          } else {
            safetyScore *= 0.5; // Large penalty for potential laser paths
          }
        }
      }
      
      // Additional penalty check for boss part activeLaser properties
      if (collidable.parts && Array.isArray(collidable.parts)) {
        for (const part of collidable.parts) {
          if (part.activeLaser && !part.destroyed) {
            const laser = part.activeLaser;
            const partLaserInfo = {
              originX: laser.originX || part.x,
              originY: laser.originY || part.y,
              angle: laser.angle,
              width: laser.width || 16,
              maxLength: laser.maxLength || Math.max(window.innerWidth, window.innerHeight) * 1.5
            };
            
            const laserSafetyBuffer = this.SAFETY_BUFFER * 2;
            if (this.threatAssessment.isPositionInLaserPath(testX, testY, partLaserInfo, laserSafetyBuffer)) {
              if (laser.isLaserActive) {
                safetyScore *= 0.01; // Extreme penalty for active laser paths
              } else if (laser.state === 'charging' || laser.warningActive) {
                safetyScore *= 0.1; // Very large penalty for charging/warning laser paths
              }
            }
          }
        }
      }
      
      // Regular proximity penalties
      if (distance < dangerRadius) {
        const proximityFactor = 1.0 - (distance / dangerRadius);
        safetyScore *= (1.0 - proximityFactor * 0.3 * threatData.priority);
      }
    }
    
    return Math.max(0, safetyScore);
  }

  /**
   * Execute emergency evasion when in immediate danger
   */
  executeEmergencyEvasion(immediateDangers, safeEscapeVectors, slowdownFactor) {
    const primaryThreat = immediateDangers[0];
    
    // If we have safe escape vectors, use the safest one
    if (safeEscapeVectors.length > 0) {
      const escapeVector = safeEscapeVectors[0];
      return {
        x: escapeVector.direction.x * 2.0,
        y: escapeVector.direction.y * 2.0
      };
    }
    
    // Otherwise, calculate direct avoidance vector
    const avoidanceVector = this.calculateAvoidanceVector(primaryThreat.entity, slowdownFactor);
    return {
      x: avoidanceVector.x * 2.0,
      y: avoidanceVector.y * 2.0
    };
  }

  /**
   * Calculate direct avoidance vector from a threat
   */
  calculateAvoidanceVector(threat, slowdownFactor) {
    const toPlayer = {
      x: this.player.x - threat.x,
      y: this.player.y - threat.y
    };
    
    const distance = Math.sqrt(toPlayer.x * toPlayer.x + toPlayer.y * toPlayer.y);
    if (distance === 0) return { x: 1, y: 0 };
    
    // Normalize
    const normalized = {
      x: toPlayer.x / distance,
      y: toPlayer.y / distance
    };
    
    // Add perpendicular component for more interesting movement
    const perpendicular = {
      x: -normalized.y,
      y: normalized.x
    };
    
    return {
      x: normalized.x * 0.7 + perpendicular.x * 0.3,
      y: normalized.y * 0.7 + perpendicular.y * 0.3
    };
  }


  /**
   * Determine movement goal based on current situation
   */
  determineMovementGoal(collidables, powerups, threats, collisionPredictions, primaryThreat) {
    // High threat level: focus on active dodging
    if (primaryThreat && primaryThreat.severity > 0.7) {
      return {
        type: 'dodge',
        target: primaryThreat.threat,
        priority: 'high'
      };
    }
    
    // Medium threat: balanced approach
    if (threats.length > 3) {
      return {
        type: 'dodge',
        target: null,
        priority: 'medium'
      };
    }
    
    // Check if we're near dangerous boundaries or bosses
    const boundaryCheck = this.checkBoundaryProximity();
    if (boundaryCheck.needsAdjustment) {
      return {
        type: 'boundary-avoid',
        target: boundaryCheck.safePosition,
        priority: 'medium'
      };
    }
    
    // Check for boss proximity
    const bossProximity = this.checkBossProximity(collidables);
    if (bossProximity.tooClose) {
      return {
        type: 'boss-avoid',
        target: bossProximity.safePosition,
        priority: 'medium'
      };
    }
    
    // Enhanced powerup collection: prioritize more aggressively when safe
    if (powerups.length > 0) {
      const nearestSafePowerup = this.findSafestPowerup(powerups, threats, collisionPredictions);
      
      if (nearestSafePowerup) {
        // More aggressive powerup collection - higher base priority
        let priority = 'high'; // Start with high priority
        
        // Only reduce priority for serious threats
        if (threats.length > 5 || (primaryThreat && primaryThreat.severity > 0.6)) {
          priority = 'medium';
        }
        // Reduce further only for extreme threats
        if (threats.length > 8 || (primaryThreat && primaryThreat.severity > 0.8)) {
          priority = 'low';
        }
        
        return {
          type: 'collect',
          target: nearestSafePowerup.powerup,
          priority: priority
        };
      }
    }
    
    // Enhanced center bias: always consider center positioning to prevent corner-pushing
    const centerTarget = this.calculateCenterBiasTarget(threats, collisionPredictions);
    if (centerTarget.shouldMoveToCenter) {
      // Don't override high-priority dodge movements, but do override other goals
      if (primaryThreat && primaryThreat.severity > 0.8) {
        // High threat - focus on dodging but still include center bias in movement calculation
        return {
          type: 'dodge-with-center',
          target: primaryThreat.threat,
          centerTarget: centerTarget.position,
          priority: 'high'
        };
      } else {
        // Normal center bias goal
        return {
          type: 'center',
          target: centerTarget.position,
          priority: centerTarget.priority
        };
      }
    }
    
    // Default: maintain current position
    return {
      type: 'maintain',
      target: null,
      priority: 'low'
    };
  }

  /**
   * Check if player is too close to screen boundaries
   */
  checkBoundaryProximity() {
    const margin = 100; // Safe distance from edges
    const criticalMargin = 50; // Critical distance
    
    const playerX = this.player.x;
    const playerY = this.player.y;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    let needsAdjustment = false;
    let safeX = playerX;
    let safeY = playerY;
    
    // Check horizontal boundaries
    if (playerX < margin) {
      needsAdjustment = true;
      safeX = margin + 50;
    } else if (playerX > screenWidth - margin) {
      needsAdjustment = true;
      safeX = screenWidth - margin - 50;
    }
    
    // Check vertical boundaries
    if (playerY < margin) {
      needsAdjustment = true;
      safeY = margin + 50;
    } else if (playerY > screenHeight - margin) {
      needsAdjustment = true;
      safeY = screenHeight - margin - 50;
    }
    
    // Extra urgency if very close to edge
    const urgency = Math.min(
      playerX - criticalMargin,
      screenWidth - playerX - criticalMargin,
      playerY - criticalMargin,
      screenHeight - playerY - criticalMargin
    ) < 0;
    
    return {
      needsAdjustment: needsAdjustment,
      safePosition: { x: safeX, y: safeY },
      urgent: urgency
    };
  }
  
  /**
   * Check proximity to bosses and minibosses
   */
  checkBossProximity(collidables) {
    const safeDistance = 200; // Minimum safe distance from bosses
    const criticalDistance = 120;
    
    let tooClose = false;
    let closestBoss = null;
    let closestDistance = Infinity;
    
    for (const collidable of collidables) {
      // Check for boss-type enemies
      const isBoss = collidable.type === 'boss' || 
                     collidable.type === 'miniboss' ||
                     collidable.constructor?.name === 'MiniBoss' ||
                     (collidable.maxHealth && collidable.maxHealth > 50);
      
      if (isBoss) {
        const distance = Math.sqrt(
          (collidable.x - this.player.x) ** 2 + 
          (collidable.y - this.player.y) ** 2
        );
        
        if (distance < safeDistance && distance < closestDistance) {
          tooClose = true;
          closestBoss = collidable;
          closestDistance = distance;
        }
      }
    }
    
    if (tooClose && closestBoss) {
      // Calculate safe position away from boss
      const awayVector = {
        x: this.player.x - closestBoss.x,
        y: this.player.y - closestBoss.y
      };
      
      const awayDistance = Math.sqrt(awayVector.x ** 2 + awayVector.y ** 2);
      if (awayDistance > 0) {
        awayVector.x /= awayDistance;
        awayVector.y /= awayDistance;
      }
      
      // Move to safe distance
      const targetDistance = safeDistance + 50;
      const safePosition = {
        x: closestBoss.x + awayVector.x * targetDistance,
        y: closestBoss.y + awayVector.y * targetDistance
      };
      
      // Ensure safe position is within screen bounds
      safePosition.x = Math.max(100, Math.min(window.innerWidth - 100, safePosition.x));
      safePosition.y = Math.max(100, Math.min(window.innerHeight - 100, safePosition.y));
      
      return {
        tooClose: true,
        safePosition: safePosition,
        urgent: closestDistance < criticalDistance
      };
    }
    
    return { tooClose: false, safePosition: null };
  }

  /**
   * Calculate center bias target - now active even during boss fights to prevent corner-pushing
   */
  calculateCenterBiasTarget(threats, collisionPredictions) {
    const screenCenter = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    };
    
    const distanceFromCenter = Math.sqrt(
      (this.player.x - screenCenter.x) ** 2 + 
      (this.player.y - screenCenter.y) ** 2
    );
    
    // More aggressive center bias - reduced threshold and always active when far from center
    const centerBiasThreshold = 80; // Reduced from 120 to 80
    if (distanceFromCenter < centerBiasThreshold) {
      return { shouldMoveToCenter: false };
    }
    
    // Calculate safe center position that avoids threats
    const safeCenterPosition = this.findSafeCenterPosition(screenCenter, threats, collisionPredictions);
    
    // Enhanced priority system - more aggressive center positioning
    let priority = 'medium'; // Default to medium instead of low
    
    // High priority when far from center, regardless of threat count
    if (distanceFromCenter > 200) {
      priority = 'high';
    }
    
    // Very high priority when very far from center or near corners
    if (distanceFromCenter > 300 || this.isNearCorner()) {
      priority = 'high';
    }
    
    return {
      shouldMoveToCenter: true,
      position: safeCenterPosition,
      priority: priority
    };
  }

  /**
   * Find a safe position near the screen center
   */
  findSafeCenterPosition(idealCenter, threats, collisionPredictions) {
    // Test positions in expanding rings around center
    const testPositions = [idealCenter];
    
    // Add positions in a small radius around center
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      for (let radius = 50; radius <= 150; radius += 50) {
        testPositions.push({
          x: idealCenter.x + Math.cos(angle) * radius,
          y: idealCenter.y + Math.sin(angle) * radius
        });
      }
    }
    
    // Find safest valid position
    let bestPosition = idealCenter;
    let bestSafety = 0;
    
    for (const pos of testPositions) {
      // Ensure position is within screen bounds
      if (pos.x < 80 || pos.x > window.innerWidth - 80 || 
          pos.y < 80 || pos.y > window.innerHeight - 80) {
        continue;
      }
      
      const safety = this.calculatePositionSafetyForTarget(pos, threats, collisionPredictions);
      if (safety > bestSafety) {
        bestSafety = safety;
        bestPosition = pos;
      }
    }
    
    return bestPosition;
  }

  /**
   * Calculate safety score for a target position considering predicted threats
   */
  calculatePositionSafetyForTarget(position, threats, collisionPredictions) {
    let safetyScore = 1.0;
    const dangerRadius = 120;
    
    // Check current threat positions
    for (const threat of threats) {
      const distance = Math.sqrt(
        (threat.entity.x - position.x) ** 2 + 
        (threat.entity.y - position.y) ** 2
      );
      
      if (distance < dangerRadius) {
        const proximityFactor = 1 - (distance / dangerRadius);
        safetyScore *= (1 - proximityFactor * 0.4 * threat.priority);
      }
    }
    
    // Check predicted collision zones
    for (const prediction of collisionPredictions) {
      if (prediction.timeToCollision < 90) {
        const futureX = prediction.threat.entity.x + 
          (prediction.threat.entity.vx || prediction.threat.entity.dx/60 || 0) * prediction.timeToCollision;
        const futureY = prediction.threat.entity.y + 
          (prediction.threat.entity.vy || prediction.threat.entity.dy/60 || 0) * prediction.timeToCollision;
          
        const distance = Math.sqrt((futureX - position.x) ** 2 + (futureY - position.y) ** 2);
        if (distance < dangerRadius) {
          const proximityFactor = 1 - (distance / dangerRadius);
          const timeFactor = 1 - (prediction.timeToCollision / 90);
          safetyScore *= (1 - proximityFactor * timeFactor * 0.3);
        }
      }
    }
    
    return Math.max(0, safetyScore);
  }

  /**
   * Check if player is near a corner of the screen
   */
  isNearCorner(margin = 100) {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    const nearLeft = this.player.x < margin;
    const nearRight = this.player.x > screenWidth - margin;
    const nearTop = this.player.y < margin;
    const nearBottom = this.player.y > screenHeight - margin;
    
    // Return true if near any corner (both horizontal AND vertical edge)
    return (nearLeft || nearRight) && (nearTop || nearBottom);
  }

  /**
   * Check if player is near any edge of the screen
   */
  isNearEdge(margin = 120) {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    return this.player.x < margin || 
           this.player.x > screenWidth - margin ||
           this.player.y < margin ||
           this.player.y > screenHeight - margin;
  }

  /**
   * Find the safest powerup to collect based on distance and threat analysis
   */
  findSafestPowerup(powerups, threats, collisionPredictions) {
    let bestPowerup = null;
    let bestScore = -1;
    
    for (const powerup of powerups) {
      const distance = Math.sqrt((powerup.x - this.player.x) ** 2 + (powerup.y - this.player.y) ** 2);
      
      // Increased search range for more aggressive powerup collection
      if (distance > 600) continue;
      
      // Calculate safety score for this powerup
      const safetyScore = this.calculatePowerupSafety(powerup, threats, collisionPredictions);
      if (safetyScore < 0.2) continue; // More aggressive - lower safety threshold
      
      // Calculate value score for this powerup
      const valueScore = this.getPowerupValueScore(powerup);
      
      // Enhanced scoring: higher weight for valuable powerups
      const proximityScore = Math.max(0, 1 - distance / 600);
      const totalScore = safetyScore * 0.3 + valueScore * 0.5 + proximityScore * 0.2;
      
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestPowerup = { powerup, distance, safetyScore, totalScore };
      }
    }
    
    return bestPowerup;
  }

  /**
   * Calculate how safe it is to collect a specific powerup
   */
  calculatePowerupSafety(powerup, threats, collisionPredictions) {
    let safetyScore = 1.0;
    const dangerRadius = 150; // Radius within which threats are considered dangerous
    
    // Check proximity to threats
    for (const threat of threats) {
      const threatDistance = Math.sqrt(
        (threat.entity.x - powerup.x) ** 2 + 
        (threat.entity.y - powerup.y) ** 2
      );
      
      if (threatDistance < dangerRadius) {
        const proximityFactor = 1 - (threatDistance / dangerRadius);
        safetyScore *= (1 - proximityFactor * 0.7 * threat.priority);
      }
    }
    
    // Check if path to powerup crosses predicted collision zones
    const pathToTarget = this.calculatePathToTarget(this.player.x, this.player.y, powerup.x, powerup.y);
    for (const prediction of collisionPredictions) {
      if (prediction.timeToCollision < 120) { // Within 2 seconds
        const pathIntersection = this.doesPathIntersectThreat(pathToTarget, prediction.threat);
        if (pathIntersection) {
          safetyScore *= 0.5; // Significant safety penalty
        }
      }
    }
    
    // Check screen boundaries - avoid powerups too close to edges
    const edgeMargin = 80;
    const edgePenalty = Math.min(
      Math.min(powerup.x - edgeMargin, window.innerWidth - powerup.x - edgeMargin) / edgeMargin,
      Math.min(powerup.y - edgeMargin, window.innerHeight - powerup.y - edgeMargin) / edgeMargin
    );
    if (edgePenalty < 1) {
      safetyScore *= Math.max(0.3, edgePenalty);
    }
    
    return Math.max(0, safetyScore);
  }

  /**
   * Calculate a simple path vector to target
   */
  calculatePathToTarget(startX, startY, targetX, targetY) {
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return {
      startX, startY, targetX, targetY,
      directionX: dx / distance,
      directionY: dy / distance,
      distance
    };
  }

  /**
   * Check if a path intersects with a threat's projected position
   */
  doesPathIntersectThreat(path, threat) {
    // Simple check: does the threat entity cross near the direct path line
    const threatX = threat.entity.x + (threat.entity.dx || 0) * 0.5; // Projected position
    const threatY = threat.entity.y + (threat.entity.dy || 0) * 0.5;
    
    // Calculate distance from threat to line
    const A = path.targetY - path.startY;
    const B = path.startX - path.targetX;
    const C = path.targetX * path.startY - path.startX * path.targetY;
    
    const distance = Math.abs(A * threatX + B * threatY + C) / Math.sqrt(A * A + B * B);
    const threatRadius = threat.radius || 30;
    
    return distance < threatRadius + 40; // Add safety margin
  }

  /**
   * Get value score for different powerup types
   */
  getPowerupValueScore(powerup) {
    const powerupValues = {
      'shield': 0.9,      // Very valuable
      'bomb': 0.8,        // High value
      'weaponUpgrade': 0.7,  // Good value
      'mainWeapon': 0.7,  // Good value
      'sideWeapon': 0.6,  // Moderate value
      'secondShip': 0.5,  // Lower value
      'rainbowStar': 1.0, // Maximum value
      'timeSlow': 0.8     // High value
    };
    
    return powerupValues[powerup.type] || 0.4; // Default value for unknown types
  }

  /**
   * Determine if a powerup is particularly valuable
   */
  isPowerupValuable(powerup) {
    const valuablePowerups = ['shield', 'bomb', 'rainbowStar', 'weaponUpgrade', 'mainWeapon'];
    return valuablePowerups.includes(powerup.type);
  }

  /**
   * Apply fluidity system to prevent jerky movement
   * Now includes collision-free movement validation
   */
  applyFluiditySystem(movementGoal, threats, collisionPredictions, slowdownFactor, primaryThreat) {
    this.goalTimer++;
    
    // Check if we should set a new movement goal
    if (this.shouldSetNewMovementGoal(movementGoal, threats, collisionPredictions)) {
      this.currentMovementGoal = movementGoal;
      this.goalTimer = 0;
    }
    
    // Calculate movement towards current goal
    let proposedMovement = { x: 0, y: 0 };
    if (this.currentMovementGoal) {
      proposedMovement = this.calculateMovementToGoal(this.currentMovementGoal, threats, collisionPredictions, slowdownFactor);
    } else if (primaryThreat) {
      // Fallback to immediate threat avoidance
      proposedMovement = this.calculateAvoidanceVector(primaryThreat.threat.entity, slowdownFactor);
    }
    
    // CRITICAL: Validate that the proposed movement is collision-free
    // Generate alternative movement candidates if needed
    const movementCandidates = this.generateMovementCandidates(proposedMovement, threats, slowdownFactor);
    
    // Use CollisionPredictor to select the safest movement
    const safeMovement = this.collisionPredictor.selectSafestMovement(
      movementCandidates, 
      threats, 
      slowdownFactor
    );
    
    return safeMovement;
  }

  /**
   * Determine if we should set a new movement goal
   */
  shouldSetNewMovementGoal(newGoal, threats, collisionPredictions) {
    // Always set initial goal
    if (!this.currentMovementGoal) return true;
    
    // Set new goal if priority increased
    if (newGoal.priority === 'high' && this.currentMovementGoal.priority !== 'high') {
      return true;
    }
    
    // Re-evaluate periodically
    if (this.goalTimer > this.goalRevaluationThreshold) {
      return true;
    }
    
    // Goal completed or no longer valid
    if (!this.isMovementGoalStillValid(this.currentMovementGoal, threats)) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if current movement goal is still valid
   */
  isMovementGoalStillValid(goal, threats) {
    if (!goal) return false;
    
    // Check if target still exists
    if (goal.type === 'collect' && !goal.target) {
      return false;
    }
    
    // Check if goal is reachable
    if (goal.target) {
      const distance = Math.sqrt(
        (goal.target.x - this.player.x) ** 2 + 
        (goal.target.y - this.player.y) ** 2
      );
      
      if (distance > this.maxGoalDistance) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Calculate movement towards current goal
   */
  calculateMovementToGoal(goal, threats, collisionPredictions, slowdownFactor) {
    // Handle different goal types
    switch (goal.type) {
      case 'maintain':
        return this.calculateMaintainPositionMovement(threats, collisionPredictions, slowdownFactor);
      
      case 'boundary-avoid':
      case 'boss-avoid':
        return this.calculateAvoidanceMovement(goal, threats, collisionPredictions, slowdownFactor);
      
      case 'dodge':
        return this.calculateDodgeMovement(goal, threats, collisionPredictions, slowdownFactor);
      
      case 'collect':
        return this.calculateCollectMovement(goal, threats, collisionPredictions, slowdownFactor);
      
      case 'center':
        return this.calculateCenterMovement(goal, threats, collisionPredictions, slowdownFactor);
      
      case 'dodge-with-center':
        return this.calculateDodgeWithCenterMovement(goal, threats, collisionPredictions, slowdownFactor);
      
      default:
        return { x: 0, y: 0 };
    }
  }
  
  /**
   * Calculate movement for maintaining current position (minimal movement, only threat avoidance)
   */
  calculateMaintainPositionMovement(threats, collisionPredictions, slowdownFactor) {
    // Only move if there are threats to avoid
    let avoidanceVector = { x: 0, y: 0 };
    
    for (const prediction of collisionPredictions) {
      if (prediction.timeToCollision < 90) {
        const avoid = this.calculateAvoidanceVector(prediction.threat.entity, slowdownFactor);
        const weight = 1.0 - (prediction.timeToCollision / 90);
        avoidanceVector.x += avoid.x * weight;
        avoidanceVector.y += avoid.y * weight;
      }
    }
    
    // Apply slight dampening to avoid excessive movement
    return {
      x: avoidanceVector.x * 0.6,
      y: avoidanceVector.y * 0.6
    };
  }
  
  /**
   * Calculate movement for boundary or boss avoidance
   */
  calculateAvoidanceMovement(goal, threats, collisionPredictions, slowdownFactor) {
    if (!goal.target) return { x: 0, y: 0 };
    
    const toGoal = {
      x: goal.target.x - this.player.x,
      y: goal.target.y - this.player.y
    };
    
    const distance = Math.sqrt(toGoal.x * toGoal.x + toGoal.y * toGoal.y);
    if (distance === 0) return { x: 0, y: 0 };
    
    const normalized = {
      x: toGoal.x / distance,
      y: toGoal.y / distance
    };
    
    // Prioritize avoidance movement
    return {
      x: normalized.x * 1.2,
      y: normalized.y * 1.2
    };
  }
  
  /**
   * Calculate movement for active dodging
   */
  calculateDodgeMovement(goal, threats, collisionPredictions, slowdownFactor) {
    let avoidanceVector = { x: 0, y: 0 };
    
    for (const prediction of collisionPredictions) {
      if (prediction.timeToCollision < 60) {
        const avoid = this.calculateAvoidanceVector(prediction.threat.entity, slowdownFactor);
        const weight = 1.0 - (prediction.timeToCollision / 60);
        avoidanceVector.x += avoid.x * weight;
        avoidanceVector.y += avoid.y * weight;
      }
    }
    
    return avoidanceVector;
  }
  
  /**
   * Calculate movement for collecting powerups
   */
  calculateCollectMovement(goal, threats, collisionPredictions, slowdownFactor) {
    if (!goal.target) return { x: 0, y: 0 };
    
    const toGoal = {
      x: goal.target.x - this.player.x,
      y: goal.target.y - this.player.y
    };
    
    const distance = Math.sqrt(toGoal.x * toGoal.x + toGoal.y * toGoal.y);
    if (distance === 0) return { x: 0, y: 0 };
    
    const normalized = {
      x: toGoal.x / distance,
      y: toGoal.y / distance
    };
    
    // Apply threat avoidance modifications
    let avoidanceVector = { x: 0, y: 0 };
    for (const prediction of collisionPredictions) {
      if (prediction.timeToCollision < 60) {
        const avoid = this.calculateAvoidanceVector(prediction.threat.entity, slowdownFactor);
        const weight = 1.0 - (prediction.timeToCollision / 60);
        avoidanceVector.x += avoid.x * weight;
        avoidanceVector.y += avoid.y * weight;
      }
    }
    
    // Balanced approach: pursue powerup but avoid threats
    const goalWeight = 0.4;
    const avoidanceWeight = 0.6;
    
    return {
      x: normalized.x * goalWeight + avoidanceVector.x * avoidanceWeight,
      y: normalized.y * goalWeight + avoidanceVector.y * avoidanceWeight
    };
  }

  /**
   * Calculate movement for center bias (moving toward screen center)
   * Enhanced to be more persistent and prevent corner-pushing
   */
  calculateCenterMovement(goal, threats, collisionPredictions, slowdownFactor) {
    if (!goal.target) return { x: 0, y: 0 };
    
    const toCenter = {
      x: goal.target.x - this.player.x,
      y: goal.target.y - this.player.y
    };
    
    const distance = Math.sqrt(toCenter.x * toCenter.x + toCenter.y * toCenter.y);
    if (distance === 0) return { x: 0, y: 0 };
    
    const normalized = {
      x: toCenter.x / distance,
      y: toCenter.y / distance
    };
    
    // Apply threat avoidance - safety first
    let avoidanceVector = { x: 0, y: 0 };
    for (const prediction of collisionPredictions) {
      if (prediction.timeToCollision < 90) {
        const avoid = this.calculateAvoidanceVector(prediction.threat.entity, slowdownFactor);
        const weight = 1.0 - (prediction.timeToCollision / 90);
        avoidanceVector.x += avoid.x * weight;
        avoidanceVector.y += avoid.y * weight;
      }
    }
    
    // Enhanced center bias - stronger weighting to prevent corner-pushing
    // Increase center weight when near corners or edges
    const distanceFromCenter = distance;
    const cornerBonus = this.isNearCorner() ? 0.3 : 0.0;
    const edgeBonus = this.isNearEdge() ? 0.2 : 0.0;
    
    let centerWeight = 0.4 + cornerBonus + edgeBonus; // Base increased from 0.3 to 0.4
    let avoidanceWeight = 0.6 - cornerBonus - edgeBonus;
    
    // When very far from center, prioritize center movement even more
    if (distanceFromCenter > 250) {
      centerWeight = Math.min(0.7, centerWeight + 0.2);
      avoidanceWeight = Math.max(0.3, avoidanceWeight - 0.2);
    }
    
    return {
      x: normalized.x * centerWeight + avoidanceVector.x * avoidanceWeight,
      y: normalized.y * centerWeight + avoidanceVector.y * avoidanceWeight
    };
  }

  /**
   * Calculate movement that combines dodging with center bias
   * Prevents corner-pushing during high-threat situations
   */
  calculateDodgeWithCenterMovement(goal, threats, collisionPredictions, slowdownFactor) {
    // Primary dodge movement
    let dodgeVector = { x: 0, y: 0 };
    for (const prediction of collisionPredictions) {
      if (prediction.timeToCollision < 60) {
        const avoid = this.calculateAvoidanceVector(prediction.threat.entity, slowdownFactor);
        const weight = 1.0 - (prediction.timeToCollision / 60);
        dodgeVector.x += avoid.x * weight;
        dodgeVector.y += avoid.y * weight;
      }
    }
    
    // Center bias component
    let centerVector = { x: 0, y: 0 };
    if (goal.centerTarget) {
      const toCenter = {
        x: goal.centerTarget.x - this.player.x,
        y: goal.centerTarget.y - this.player.y
      };
      
      const distance = Math.sqrt(toCenter.x * toCenter.x + toCenter.y * toCenter.y);
      if (distance > 0) {
        centerVector = {
          x: toCenter.x / distance,
          y: toCenter.y / distance
        };
      }
    }
    
    // Combine dodge and center with stronger center bias when near corners
    const cornerBonus = this.isNearCorner() ? 0.4 : 0.0;
    const edgeBonus = this.isNearEdge() ? 0.2 : 0.0;
    
    const dodgeWeight = 0.7 - cornerBonus - edgeBonus;
    const centerWeight = 0.3 + cornerBonus + edgeBonus;
    
    return {
      x: dodgeVector.x * dodgeWeight + centerVector.x * centerWeight,
      y: dodgeVector.y * dodgeWeight + centerVector.y * centerWeight
    };
  }

  /**
   * Generate alternative movement candidates for safety validation
   */
  generateMovementCandidates(primaryMovement, threats, slowdownFactor) {
    const candidates = [primaryMovement];
    
    // Add directional alternatives
    const directions = [
      { x: 1, y: 0 },   // Right
      { x: -1, y: 0 },  // Left
      { x: 0, y: 1 },   // Down
      { x: 0, y: -1 },  // Up
      { x: 0.7, y: 0.7 },   // Diagonal down-right
      { x: -0.7, y: 0.7 },  // Diagonal down-left
      { x: 0.7, y: -0.7 },  // Diagonal up-right
      { x: -0.7, y: -0.7 }  // Diagonal up-left
    ];
    
    for (const dir of directions) {
      candidates.push({
        x: dir.x * 0.8,
        y: dir.y * 0.8
      });
    }
    
    // Add modified versions of primary movement (reduced intensity)
    if (primaryMovement.x !== 0 || primaryMovement.y !== 0) {
      candidates.push({
        x: primaryMovement.x * 0.5,
        y: primaryMovement.y * 0.5
      });
      candidates.push({
        x: primaryMovement.x * 0.8,
        y: primaryMovement.y * 0.8
      });
    }
    
    return candidates;
  }
}