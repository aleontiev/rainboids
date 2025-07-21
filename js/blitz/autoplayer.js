// Removed constants import - using defaults
import { ThreatAssessment } from "./autoplayer/threat-assessment.js";
import { MovementCalculator } from "./autoplayer/movement-calculator.js";
import { AbilityManager } from "./autoplayer/ability-manager.js";
import { CollisionPredictor } from "./autoplayer/collision-predictor.js";
import { AutoplayerUtils } from "./autoplayer/utils.js";

/**
 * Autoplayer class - refactored to use modular components
 * Maintains full compatibility with existing codebase while improving code organization
 */
export class Autoplayer {
  constructor(player) {
    this.player = player;
    
    // Initialize specialized modules
    this.threatAssessment = new ThreatAssessment(player);
    this.movementCalculator = new MovementCalculator(player, {
      goalDuration: 60,
      goalRevaluationThreshold: 30,
      maxGoalDistance: 100
    });
    this.abilityManager = new AbilityManager(player, this);
    this.collisionPredictor = new CollisionPredictor(player);
    
    // Expose timer properties for external access (maintain compatibility)
    this.autoplayMovementTimer = 0;
  }

  // Expose all timer properties via getters/setters for compatibility
  get autoplayShieldTimer() { return this.abilityManager.autoplayShieldTimer; }
  set autoplayShieldTimer(value) { this.abilityManager.autoplayShieldTimer = value; }
  
  get autoplaySlowTimer() { return this.abilityManager.autoplaySlowTimer; }
  set autoplaySlowTimer(value) { this.abilityManager.autoplaySlowTimer = value; }
  
  get autoplayBombTimer() { return this.abilityManager.autoplayBombTimer; }
  set autoplayBombTimer(value) { this.abilityManager.autoplayBombTimer = value; }
  
  
  
  get currentMovementGoal() { return this.movementCalculator.currentMovementGoal; }
  set currentMovementGoal(value) { this.movementCalculator.currentMovementGoal = value; }
  
  get goalTimer() { return this.movementCalculator.goalTimer; }
  set goalTimer(value) { this.movementCalculator.goalTimer = value; }
  
  get goalDuration() { return this.movementCalculator.goalDuration; }
  set goalDuration(value) { this.movementCalculator.goalDuration = value; }
  
  get goalRevaluationThreshold() { return this.movementCalculator.goalRevaluationThreshold; }
  set goalRevaluationThreshold(value) { this.movementCalculator.goalRevaluationThreshold = value; }
  
  get maxGoalDistance() { return this.movementCalculator.maxGoalDistance; }
  set maxGoalDistance(value) { this.movementCalculator.maxGoalDistance = value; }

  // PRIMARY PUBLIC METHODS - Called from external code

  /**
   * Handle strategic ability usage for autoplay
   */
  handleAutoplayAbilities(collidables, keys, powerups = [], game = null) {
    return this.abilityManager.handleAutoplayAbilities(collidables, keys, powerups, game);
  }

  /**
   * Calculate movement vector for dodging threats
   */
  calculateDodgeVector(collidables, powerups = [], timeSlowActive = false) {
    this.autoplayMovementTimer++;
    return this.movementCalculator.calculateDodgeVector(collidables, powerups, timeSlowActive);
  }

  /**
   * Check if there are valid targets to shoot at
   */
  hasValidTargets(collidables) {
    const enemies = collidables.filter(c => c.collidableType === 'enemy');
    const asteroids = collidables.filter(c => c.collidableType === 'asteroid');
    const boss = collidables.find(c => c.collidableType === 'boss');
    
    return enemies.length > 0 || asteroids.length > 0 || (boss && !boss.isDefeated);
  }

  // THREAT ASSESSMENT METHODS

  /**
   * Calculate overall threat level (0.0 = safe, 1.0 = extreme danger)
   */
  calculateThreatLevel(collidables) {
    return this.threatAssessment.calculateThreatLevel(collidables);
  }

  /**
   * Map all threats to unified interface
   */
  mapAllThreats(collidables, slowdownFactor = 1.0) {
    return this.collisionPredictor.mapAllThreats(collidables, slowdownFactor);
  }

  /**
   * Predict all collisions with threats
   */
  predictAllCollisions(allThreats, slowdownFactor = 1.0) {
    return this.collisionPredictor.predictAllCollisions(allThreats, slowdownFactor);
  }

  /**
   * Find collisions that cannot be avoided by movement alone
   */
  findUnavoidableCollisions(collisionPredictions, allThreats) {
    return this.collisionPredictor.findUnavoidableCollisions(collisionPredictions, allThreats);
  }

  /**
   * Identify immediate lethal threats
   */
  identifyLethalThreats(collidables, slowdownFactor) {
    return this.threatAssessment.identifyLethalThreats(collidables, slowdownFactor);
  }

  /**
   * Get standardized threat properties
   */
  getThreatProperties(collidable) {
    return this.threatAssessment.getThreatProperties(collidable);
  }

  /**
   * Calculate threat severity
   */
  calculateThreatSeverity(distance, collisionTime, priority) {
    return this.threatAssessment.calculateThreatSeverity(distance, collisionTime, priority);
  }

  /**
   * Calculate threat urgency
   */
  calculateThreatUrgency(timeToCollision, threatPriority) {
    return this.collisionPredictor.calculateThreatUrgency({ timeToCollision, priority: threatPriority }, 1.0);
  }

  // MOVEMENT CALCULATION METHODS

  /**
   * Determine movement goal based on current situation
   */
  determineMovementGoal(collidables, powerups, allThreats, collisionPredictions, primaryThreat = null) {
    return this.movementCalculator.determineMovementGoal(collidables, powerups, allThreats, collisionPredictions, primaryThreat);
  }

  /**
   * Calculate active dodge movement (aggressive threat avoidance)
   */
  calculateActiveDodgeMovement(allThreats, collisionPredictions, slowdownFactor = 1.0, primaryThreat = null) {
    // Delegate to movement calculator's threat avoidance logic
    if (primaryThreat) {
      return this.movementCalculator.calculateAvoidanceVector(primaryThreat.threat?.entity || primaryThreat, slowdownFactor);
    }
    
    // Calculate combined avoidance from all threats
    let avoidanceVector = { x: 0, y: 0 };
    for (const prediction of collisionPredictions.slice(0, 3)) { // Top 3 threats
      if (prediction.timeToCollision < 60) {
        const avoid = this.movementCalculator.calculateAvoidanceVector(prediction.threat.entity, slowdownFactor);
        const weight = 1.0 - (prediction.timeToCollision / 60);
        avoidanceVector.x += avoid.x * weight;
        avoidanceVector.y += avoid.y * weight;
      }
    }
    
    return avoidanceVector;
  }

  /**
   * Calculate passive dodge movement (objective-focused with threat awareness)
   */
  calculatePassiveDodgeMovement(objective, allThreats, collisionPredictions, slowdownFactor = 1.0, primaryThreat = null) {
    const goalWeight = 0.7;
    const avoidanceWeight = 0.3;
    
    // Calculate movement towards objective
    const toObjective = {
      x: objective.x - this.player.x,
      y: objective.y - this.player.y
    };
    const distance = Math.sqrt(toObjective.x * toObjective.x + toObjective.y * toObjective.y);
    const normalizedObjective = distance > 0 ? 
      { x: toObjective.x / distance, y: toObjective.y / distance } : 
      { x: 0, y: 0 };
    
    // Calculate threat avoidance
    const avoidanceVector = this.calculateActiveDodgeMovement(allThreats, collisionPredictions, slowdownFactor, primaryThreat);
    
    return {
      x: normalizedObjective.x * goalWeight + avoidanceVector.x * avoidanceWeight,
      y: normalizedObjective.y * goalWeight + avoidanceVector.y * avoidanceWeight
    };
  }

  /**
   * Apply fluidity system for smooth movement
   */
  applyFluiditySystem(movementGoal, allThreats, collisionPredictions, slowdownFactor, primaryThreat) {
    return this.movementCalculator.applyFluiditySystem(movementGoal, allThreats, collisionPredictions, slowdownFactor, primaryThreat);
  }

  /**
   * Calculate repositioning during time slow
   */
  calculateTimeSlowRepositioning(movementGoal, allThreats, collisionPredictions, slowdownFactor, primaryThreat) {
    // Enhanced positioning during time slow - move to optimal position
    const center = AutoplayerUtils.getScreenCenter();
    const safeZone = AutoplayerUtils.getSafeZoneBounds(100);
    
    // Target safe center area
    const targetX = AutoplayerUtils.clamp(this.player.x, safeZone.left, safeZone.right);
    const targetY = AutoplayerUtils.clamp(this.player.y, safeZone.top, safeZone.bottom);
    
    const toTarget = {
      x: targetX - this.player.x,
      y: targetY - this.player.y
    };
    
    const distance = Math.sqrt(toTarget.x * toTarget.x + toTarget.y * toTarget.y);
    if (distance === 0) return { x: 0, y: 0 };
    
    const normalized = { x: toTarget.x / distance, y: toTarget.y / distance };
    
    // Apply threat avoidance
    const avoidanceVector = this.calculateActiveDodgeMovement(allThreats, collisionPredictions, slowdownFactor, primaryThreat);
    
    return {
      x: normalized.x * 0.6 + avoidanceVector.x * 0.4,
      y: normalized.y * 0.6 + avoidanceVector.y * 0.4
    };
  }

  // COLLISION PREDICTION METHODS

  /**
   * Calculate precise collision trajectory
   */
  calculatePreciseCollisionTrajectory(threat, maxFrames, playerRadius, slowdownFactor) {
    return this.collisionPredictor.calculatePreciseCollisionTrajectory(threat, slowdownFactor);
  }

  /**
   * Calculate collision time
   */
  calculateCollisionTime(threat, slowdownFactor) {
    return this.threatAssessment.calculateCollisionTime(threat, slowdownFactor);
  }

  /**
   * Calculate collision trajectory between entities
   */
  calculateCollisionTrajectory(entityX, entityY, entityVx, entityVy, playerX, playerY, safeRadius, maxFrames, playerVx = 0, playerVy = 0) {
    // Create temporary threat object for calculation
    const tempThreat = {
      x: entityX, y: entityY, 
      vx: entityVx, vy: entityVy,
      size: safeRadius,
      collidableType: 'enemyBullet'
    };
    
    const trajectory = this.collisionPredictor.calculatePreciseCollisionTrajectory(tempThreat, 1.0);
    return trajectory ? {
      willCollide: true,
      timeToCollision: trajectory.timeToCollision,
      intersectionX: trajectory.intersectionX,
      intersectionY: trajectory.intersectionY
    } : { willCollide: false };
  }

  /**
   * Check if movement would intersect with collision paths
   */
  wouldMoveIntoCollisionPath(dirX, dirY, allThreats, playerSpeed, slowdownFactor) {
    const futureX = this.player.x + dirX * playerSpeed * 30; // 30 frames ahead
    const futureY = this.player.y + dirY * playerSpeed * 30;
    
    return !this.collisionPredictor.isPathClear(this.player.x, this.player.y, futureX, futureY, allThreats, 30);
  }

  // SAFETY & POSITION METHODS

  /**
   * Check if position is safe from threats
   */
  isPositionSafe(x, y, collidables, slowdownFactor) {
    return this.movementCalculator.isPositionSafe(x, y, collidables, slowdownFactor);
  }

  /**
   * Calculate position safety score
   */
  calculatePositionSafety(x, y, collidables, slowdownFactor) {
    return this.movementCalculator.calculatePositionSafety(x, y, collidables, slowdownFactor);
  }

  /**
   * Calculate safety of moving in a direction
   */
  calculateDirectionSafety(dirX, dirY, allThreats, playerSpeed, slowdownFactor = 1.0) {
    const testDistance = playerSpeed * 45; // Test 45 frames ahead
    const testX = this.player.x + dirX * testDistance;
    const testY = this.player.y + dirY * testDistance;
    
    return this.collisionPredictor.assessPathSafety(this.player.x, this.player.y, testX, testY, allThreats, 45);
  }

  /**
   * Calculate direction safety with collision predictions
   */
  calculateDirectionSafetyWithPredictions(dirX, dirY, collisionPredictions, playerSpeed, slowdownFactor) {
    let safetyScore = 1.0;
    const testDistance = playerSpeed * 30;
    const testX = this.player.x + dirX * testDistance;
    const testY = this.player.y + dirY * testDistance;
    
    for (const prediction of collisionPredictions) {
      if (prediction.timeToCollision < 60) {
        const threat = prediction.threat;
        const futureDistance = AutoplayerUtils.calculateDistance(
          testX, testY, 
          threat.x + threat.vx * prediction.timeToCollision,
          threat.y + threat.vy * prediction.timeToCollision
        );
        
        const safeDistance = threat.radius + 9 + 30; // Using enhanced safety buffer (1.5x hitbox)
        if (futureDistance < safeDistance) {
          const proximityFactor = 1.0 - (futureDistance / safeDistance);
          safetyScore *= (1.0 - proximityFactor * 0.8);
        }
      }
    }
    
    return Math.max(0, safetyScore);
  }

  /**
   * Find safety pocket (safe area to move to)
   */
  findSafetyPocket(collidables) {
    const center = AutoplayerUtils.getScreenCenter();
    const testPositions = [
      center,
      { x: center.x - 100, y: center.y },
      { x: center.x + 100, y: center.y },
      { x: center.x, y: center.y - 100 },
      { x: center.x, y: center.y + 100 }
    ];
    
    let bestPosition = center;
    let bestSafety = 0;
    
    for (const pos of testPositions) {
      if (AutoplayerUtils.isWithinScreenBounds(pos.x, pos.y, 50)) {
        const safety = this.calculatePositionSafety(pos.x, pos.y, collidables, 1.0);
        if (safety > bestSafety) {
          bestSafety = safety;
          bestPosition = pos;
        }
      }
    }
    
    return bestPosition;
  }

  /**
   * Calculate safety of a pocket area
   */
  calculatePocketSafety(x, y, radius, collidables) {
    let safetyScore = 1.0;
    
    for (const collidable of collidables) {
      const distance = AutoplayerUtils.calculateDistance(x, y, collidable.x, collidable.y);
      const threatData = this.getThreatProperties(collidable);
      
      if (threatData && distance < radius + threatData.radius) {
        const proximityFactor = 1.0 - Math.max(0, distance - threatData.radius) / radius;
        safetyScore *= (1.0 - proximityFactor * 0.5 * threatData.priority);
      }
    }
    
    return Math.max(0, safetyScore);
  }

  // UTILITY METHODS

  /**
   * Check if player is in corner
   */
  isInCorner(cornerRadius) {
    return AutoplayerUtils.isInCorner(this.player.x, this.player.y, cornerRadius);
  }

  /**
   * Check if player is near screen edge
   */
  isNearEdge(edgeDistance) {
    return this.player.x < edgeDistance || 
           this.player.x > window.innerWidth - edgeDistance ||
           this.player.y < edgeDistance || 
           this.player.y > window.innerHeight - edgeDistance;
  }

  /**
   * Check if player is near corner
   */
  isNearCorner(cornerBuffer = 80) {
    return this.abilityManager.isNearCorner(cornerBuffer);
  }

  /**
   * Check if position would be in corner
   */
  wouldBeInCorner(x, y, cornerBuffer) {
    return AutoplayerUtils.isInCorner(x, y, cornerBuffer);
  }

  /**
   * Calculate penalty for being near corner
   */
  calculateCornerPenalty(x, y, edgeBuffer) {
    const safeZone = AutoplayerUtils.getSafeZoneBounds(edgeBuffer);
    let penalty = 0;
    
    if (x < safeZone.left || x > safeZone.right) penalty += 0.3;
    if (y < safeZone.top || y > safeZone.bottom) penalty += 0.3;
    
    return Math.min(1.0, penalty);
  }

  /**
   * Calculate distance from point to line
   */
  distanceToLine(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    
    const param = dot / lenSq;
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Predict entity movement path
   */
  predictEntityPath(entity, frames, slowdownFactor = 1.0) {
    return this.collisionPredictor.predictEntityPath(entity, frames);
  }

  // AUTO-AIM METHODS

  /**
   * Calculate auto-aim for targeting
   */
  calculateAutoAim(enemies, asteroids, boss, mainWeaponLevel, isPortrait, keys) {
    const allTargets = [];
    
    // Add all enemies as targets
    enemies.forEach(enemy => {
      if (!enemy.isDefeated) {
        allTargets.push({
          entity: enemy,
          type: 'enemy',
          priority: enemy.type === 'dive' ? 1.2 : 1.0,
          distance: AutoplayerUtils.calculateDistance(this.player.x, this.player.y, enemy.x, enemy.y)
        });
      }
    });
    
    // Add asteroids as targets
    asteroids.forEach(asteroid => {
      allTargets.push({
        entity: asteroid,
        type: 'asteroid', 
        priority: 0.7,
        distance: AutoplayerUtils.calculateDistance(this.player.x, this.player.y, asteroid.x, asteroid.y)
      });
    });
    
    // Add boss as highest priority target
    if (boss && !boss.isDefeated) {
      allTargets.push({
        entity: boss,
        type: 'boss',
        priority: 2.0,
        distance: AutoplayerUtils.calculateDistance(this.player.x, this.player.y, boss.x, boss.y)
      });
    }
    
    if (allTargets.length === 0) return null;
    
    const bestTarget = this.selectBestTarget(allTargets, enemies, mainWeaponLevel);
    if (!bestTarget) return null;
    
    return this.calculatePredictiveAim(bestTarget, mainWeaponLevel);
  }

  /**
   * Select best target from available targets
   */
  selectBestTarget(allTargets, enemies, mainWeaponLevel) {
    const visibleTargets = allTargets.filter(target => this.isTargetInViewport(target.entity));
    if (visibleTargets.length === 0) return null;
    
    // Score targets based on priority, distance, and hit probability
    let bestTarget = null;
    let bestScore = 0;
    
    for (const target of visibleTargets) {
      const hitScore = this.calculateTargetHitScore(target, this.getCurrentBulletSpeed(mainWeaponLevel), target.distance);
      const score = target.priority * hitScore * (200 / (target.distance + 50));
      
      if (score > bestScore) {
        bestScore = score;
        bestTarget = target;
      }
    }
    
    return bestTarget;
  }

  /**
   * Calculate predictive aim for target
   */
  calculatePredictiveAim(target, mainWeaponLevel) {
    const bulletSpeed = this.getCurrentBulletSpeed(mainWeaponLevel);
    const entity = target.entity;
    
    const solution = this.calculateInterceptSolution(
      this.player.x, this.player.y, 0, 0,
      entity.x, entity.y, 
      entity.vx || entity.dx/60 || 0, 
      entity.vy || entity.dy/60 || 0,
      bulletSpeed
    );
    
    if (!solution) {
      // Fallback to direct aim
      return {
        x: entity.x,
        y: entity.y,
        target: entity
      };
    }
    
    return {
      x: solution.x,
      y: solution.y,
      target: entity,
      timeToHit: solution.time
    };
  }

  /**
   * Calculate intercept solution for moving target
   */
  calculateInterceptSolution(px, py, pvx, pvy, tx, ty, tvx, tvy, bulletSpeed) {
    const dx = tx - px;
    const dy = ty - py;
    const dvx = tvx - pvx;
    const dvy = tvy - pvy;
    
    const a = dvx * dvx + dvy * dvy - bulletSpeed * bulletSpeed;
    const b = 2 * (dx * dvx + dy * dvy);
    const c = dx * dx + dy * dy;
    
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;
    
    const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
    const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
    
    const t = t1 > 0 ? t1 : t2;
    if (t <= 0) return null;
    
    return {
      x: tx + tvx * t,
      y: ty + tvy * t,
      time: t
    };
  }

  /**
   * Calculate target hit score
   */
  calculateTargetHitScore(target, bulletSpeed, distance) {
    const entity = target.entity;
    const speed = Math.sqrt((entity.vx || 0) ** 2 + (entity.vy || 0) ** 2);
    const size = entity.size || 20;
    
    // Larger, slower, closer targets are easier to hit
    const sizeScore = Math.min(1.0, size / 50);
    const speedScore = Math.max(0.1, 1.0 - speed / 5);
    const distanceScore = Math.max(0.1, 1.0 - distance / 400);
    
    return sizeScore * speedScore * distanceScore;
  }

  /**
   * Check if target is in viewport
   */
  isTargetInViewport(target) {
    const margin = 50;
    return target.x >= -margin && 
           target.x <= window.innerWidth + margin &&
           target.y >= -margin && 
           target.y <= window.innerHeight + margin;
  }

  /**
   * Get current bullet speed based on weapon level
   */
  getCurrentBulletSpeed(level) {
    return 8 * (1 + level * 0.1);
  }

  // COMPATIBILITY METHODS

  /**
   * Count nearby projectiles
   */
  countNearbyProjectiles(enemyBullets, enemyLasers, radius) {
    return this.threatAssessment.countNearbyProjectiles(enemyBullets, enemyLasers, radius);
  }


  /**
   * Get ability timers
   */
  getAbilityTimers() {
    return this.abilityManager.getAbilityTimers();
  }

  /**
   * Reset all internal state
   */
  reset() {
    this.abilityManager.resetAbilityTimers();
    this.movementCalculator.currentMovementGoal = null;
    this.movementCalculator.goalTimer = 0;
    this.autoplayMovementTimer = 0;
  }
}