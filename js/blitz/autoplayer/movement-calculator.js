import { GAME_CONFIG } from "../constants.js";
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
  calculateDodgeVector(collidables, powerups = [], timeSlowActive = false) {
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
   * Check if a position is safe from all threats
   */
  isPositionSafe(testX, testY, collidables, slowdownFactor) {
    const safetyMargin = 30;
    
    // Check screen bounds
    if (testX < safetyMargin || testX > window.innerWidth - safetyMargin ||
        testY < safetyMargin || testY > window.innerHeight - safetyMargin) {
      return false;
    }
    
    // Check for threat collisions
    for (const collidable of collidables) {
      const threatData = this.getThreatProperties(collidable);
      if (!threatData) continue;
      
      const distance = Math.sqrt((collidable.x - testX) ** 2 + (collidable.y - testY) ** 2);
      const requiredDistance = threatData.radius + GAME_CONFIG.PLAYER_HITBOX + safetyMargin;
      
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
   * Calculate position safety score (higher = safer)
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
    
    // Penalty for being near threats
    for (const collidable of collidables) {
      const distance = Math.sqrt((collidable.x - testX) ** 2 + (collidable.y - testY) ** 2);
      if (distance < dangerRadius) {
        const threatData = this.getThreatProperties(collidable);
        if (threatData) {
          const proximityFactor = 1.0 - (distance / dangerRadius);
          safetyScore *= (1.0 - proximityFactor * 0.3 * threatData.priority);
        }
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
    
    // Low threat: pursue objectives
    if (powerups.length > 0) {
      const nearestPowerup = powerups.reduce((nearest, powerup) => {
        const distance = Math.sqrt((powerup.x - this.player.x) ** 2 + (powerup.y - this.player.y) ** 2);
        if (!nearest || distance < nearest.distance) {
          return { powerup, distance };
        }
        return nearest;
      }, null);
      
      return {
        type: 'collect',
        target: nearestPowerup.powerup,
        priority: 'low'
      };
    }
    
    // Default: stay in safe center area
    return {
      type: 'position',
      target: {
        x: window.innerWidth / 2,
        y: window.innerHeight * 0.7
      },
      priority: 'low'
    };
  }

  /**
   * Apply fluidity system to prevent jerky movement
   */
  applyFluiditySystem(movementGoal, threats, collisionPredictions, slowdownFactor, primaryThreat) {
    this.goalTimer++;
    
    // Check if we should set a new movement goal
    if (this.shouldSetNewMovementGoal(movementGoal, threats, collisionPredictions)) {
      this.currentMovementGoal = movementGoal;
      this.goalTimer = 0;
    }
    
    // Calculate movement towards current goal
    if (this.currentMovementGoal) {
      return this.calculateMovementToGoal(this.currentMovementGoal, threats, collisionPredictions, slowdownFactor);
    }
    
    // Fallback to immediate threat avoidance
    if (primaryThreat) {
      return this.calculateAvoidanceVector(primaryThreat.threat.entity, slowdownFactor);
    }
    
    return { x: 0, y: 0 };
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
    
    // Blend goal-seeking with threat avoidance
    const goalWeight = goal.priority === 'high' ? 0.3 : 0.7;
    const avoidanceWeight = 1.0 - goalWeight;
    
    return {
      x: normalized.x * goalWeight + avoidanceVector.x * avoidanceWeight,
      y: normalized.y * goalWeight + avoidanceVector.y * avoidanceWeight
    };
  }
}