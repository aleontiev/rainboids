// Removed constants import - using defaults
import { ThreatAssessment } from "./threat-assessment.js";

/**
 * CollisionPredictor - Handles collision prediction and avoidance calculations
 * Separated from movement calculator to improve code organization
 */
export class CollisionPredictor {
  constructor(player) {
    this.player = player;
    this.threatAssessment = new ThreatAssessment(player);
    
    // Enhanced safety buffer - 1.5x normal player hitbox for better collision avoidance
    this.PLAYER_HITBOX = 6; // Base player hitbox
    this.SAFETY_BUFFER = this.PLAYER_HITBOX * 1.5; // 9 pixels for enhanced safety
    
    // Conservative projectile speed multiplier - assume projectiles might accelerate
    this.PROJECTILE_SPEED_SAFETY_MARGIN = 1.1; // 10% faster than expected
  }

  /**
   * Map all threats to a unified interface
   * Enhanced to filter out distant non-laser threats
   */
  mapAllThreats(collidables, slowdownFactor) {
    return collidables.map(collidable => {
      const threatData = this.threatAssessment.getThreatProperties(collidable);
      if (!threatData) return null;
      
      // Filter out non-imminent threats (except lasers)
      if (!this.threatAssessment.isImminentThreat(collidable, slowdownFactor)) {
        return null;
      }
      
      return {
        entity: collidable,
        x: collidable.x,
        y: collidable.y,
        vx: (collidable.vx || collidable.dx/60 || 0) * slowdownFactor * this.PROJECTILE_SPEED_SAFETY_MARGIN,
        vy: (collidable.vy || collidable.dy/60 || 0) * slowdownFactor * this.PROJECTILE_SPEED_SAFETY_MARGIN,
        radius: threatData.radius,
        priority: threatData.priority,
        type: threatData.type,
        isMoving: threatData.isMoving,
        requiresImminencyCheck: threatData.requiresImminencyCheck
      };
    }).filter(threat => threat !== null);
  }

  /**
   * Predict collisions with all threats
   */
  predictAllCollisions(threats, slowdownFactor) {
    const predictions = [];
    
    for (const threat of threats) {
      const collisionTime = this.threatAssessment.calculateCollisionTime(threat.entity, slowdownFactor);
      if (collisionTime > 0) {
        predictions.push({
          threat: threat,
          timeToCollision: collisionTime,
          severity: this.threatAssessment.calculateThreatSeverity(
            Math.sqrt((threat.x - this.player.x) ** 2 + (threat.y - this.player.y) ** 2),
            collisionTime,
            threat.priority
          )
        });
      }
    }
    
    return predictions.sort((a, b) => a.timeToCollision - b.timeToCollision);
  }

  /**
   * Identify the primary threat to focus on
   */
  identifyPrimaryThreat(collisionPredictions, threats) {
    if (collisionPredictions.length === 0) return null;
    
    // Find the most urgent threat
    let primaryThreat = collisionPredictions[0];
    for (const prediction of collisionPredictions) {
      if (prediction.severity > primaryThreat.severity) {
        primaryThreat = prediction;
      }
    }
    
    return primaryThreat;
  }

  /**
   * Find unavoidable collisions that require abilities
   */
  findUnavoidableCollisions(collisionPredictions, threats) {
    const unavoidableCollisions = [];
    const playerSpeed = 2.0; // Maximum player speed
    
    for (const prediction of collisionPredictions) {
      const threat = prediction.threat;
      const timeToCollision = prediction.timeToCollision;
      
      // Calculate if player can move fast enough to avoid collision
      const distanceToThreat = Math.sqrt(
        (threat.x - this.player.x) ** 2 + 
        (threat.y - this.player.y) ** 2
      );
      
      const requiredSpeed = (distanceToThreat - threat.radius - this.SAFETY_BUFFER) / timeToCollision;
      
      if (requiredSpeed > playerSpeed) {
        unavoidableCollisions.push({
          prediction: prediction,
          requiredSpeed: requiredSpeed,
          availableSpeed: playerSpeed,
          deficit: requiredSpeed - playerSpeed
        });
      }
    }
    
    return unavoidableCollisions.sort((a, b) => b.deficit - a.deficit);
  }

  /**
   * Calculate precise collision trajectory using vector math
   */
  calculatePreciseCollisionTrajectory(threat, slowdownFactor) {
    const threatVx = (threat.vx || threat.dx/60 || 0) * slowdownFactor;
    const threatVy = (threat.vy || threat.dy/60 || 0) * slowdownFactor;
    
    const relativeX = threat.x - this.player.x;
    const relativeY = threat.y - this.player.y;
    const relativeVx = threatVx - (this.player.vx || 0);
    const relativeVy = threatVy - (this.player.vy || 0);
    
    const threatData = this.threatAssessment.getThreatProperties(threat);
    const collisionRadius = this.SAFETY_BUFFER + threatData.radius;
    
    // Calculate intersection point
    const timeToCollision = this.threatAssessment.calculateCollisionTime(threat, slowdownFactor);
    if (timeToCollision <= 0) return null;
    
    const intersectionX = threat.x + threatVx * timeToCollision;
    const intersectionY = threat.y + threatVy * timeToCollision;
    
    return {
      timeToCollision: timeToCollision,
      intersectionX: intersectionX,
      intersectionY: intersectionY,
      threat: threat,
      collisionRadius: collisionRadius,
      relativeVelocity: {
        x: relativeVx,
        y: relativeVy
      }
    };
  }

  /**
   * CRITICAL: Validate that a movement vector will not result in any collisions
   * This is the core safety check that ensures every move is collision-free
   */
  validateMovementSafety(movementVector, allThreats, slowdownFactor, playerSpeed = 3) {
    if (!movementVector || (movementVector.x === 0 && movementVector.y === 0)) {
      return true; // No movement is always safe
    }

    // Calculate where player will be after applying this movement
    const futurePlayerX = this.player.x + movementVector.x * playerSpeed;
    const futurePlayerY = this.player.y + movementVector.y * playerSpeed;

    // Check multiple frames ahead to ensure the movement path is safe
    const framesToCheck = 10; // Check 10 frames ahead for safety
    
    for (let frame = 1; frame <= framesToCheck; frame++) {
      const frameProgress = frame / framesToCheck;
      const checkX = this.player.x + (futurePlayerX - this.player.x) * frameProgress;
      const checkY = this.player.y + (futurePlayerY - this.player.y) * frameProgress;

      // Check collision with all threats at this future frame
      for (const threat of allThreats) {
        // Predict where threat will be at this frame (using conservative speed)
        const futureThreatX = threat.x + threat.vx * frame;
        const futureThreatY = threat.y + threat.vy * frame;

        // Calculate distance between future player and future threat positions
        const distance = Math.sqrt(
          (checkX - futureThreatX) ** 2 + 
          (checkY - futureThreatY) ** 2
        );

        // Check if collision would occur (with enhanced safety buffer)
        const collisionRadius = this.SAFETY_BUFFER + threat.radius;
        if (distance < collisionRadius) {
          return false; // Movement would result in collision
        }
      }
    }

    // Also check that the final position is within screen bounds
    const margin = 40;
    if (futurePlayerX < margin || futurePlayerX > window.innerWidth - margin ||
        futurePlayerY < margin || futurePlayerY > window.innerHeight - margin) {
      return false; // Movement would go out of bounds
    }

    return true; // Movement is safe
  }

  /**
   * Find the safest movement direction from a set of candidates
   */
  selectSafestMovement(movementCandidates, allThreats, slowdownFactor, playerSpeed = 3) {
    let safestMovement = { x: 0, y: 0 };
    let bestSafetyScore = 0;

    // Always include "no movement" as an option
    const candidates = [{ x: 0, y: 0 }, ...movementCandidates];

    for (const candidate of candidates) {
      // First check if this movement is fundamentally safe
      if (!this.validateMovementSafety(candidate, allThreats, slowdownFactor, playerSpeed)) {
        continue; // Skip unsafe movements
      }

      // Calculate safety score for this movement
      const futureX = this.player.x + candidate.x * playerSpeed;
      const futureY = this.player.y + candidate.y * playerSpeed;
      const safetyScore = this.calculatePositionSafety(futureX, futureY, allThreats);

      if (safetyScore > bestSafetyScore) {
        bestSafetyScore = safetyScore;
        safestMovement = candidate;
      }
    }

    return safestMovement;
  }

  /**
   * Calculate safety score for a position considering all threats
   */
  calculatePositionSafety(x, y, allThreats) {
    let safetyScore = 1.0;

    for (const threat of allThreats) {
      const distance = Math.sqrt((threat.x - x) ** 2 + (threat.y - y) ** 2);
      const dangerRadius = threat.radius + this.SAFETY_BUFFER + 40;
      
      if (distance < dangerRadius) {
        const proximityFactor = 1.0 - (distance / dangerRadius);
        safetyScore *= (1.0 - proximityFactor * 0.5 * threat.priority);
      }
    }

    return Math.max(0, safetyScore);
  }

  /**
   * Predict entity movement path
   */
  predictEntityPath(entity, frames = 60) {
    const path = [];
    const vx = entity.vx || entity.dx/60 || 0;
    const vy = entity.vy || entity.dy/60 || 0;
    
    for (let i = 0; i < frames; i++) {
      path.push({
        x: entity.x + vx * i,
        y: entity.y + vy * i,
        frame: i
      });
    }
    
    return path;
  }

  /**
   * Calculate threat urgency based on collision time and distance
   */
  calculateThreatUrgency(threat, slowdownFactor) {
    const distance = Math.sqrt(
      (threat.x - this.player.x) ** 2 + 
      (threat.y - this.player.y) ** 2
    );
    
    const collisionTime = this.threatAssessment.calculateCollisionTime(threat, slowdownFactor);
    if (collisionTime <= 0) return 0;
    
    const threatData = this.threatAssessment.getThreatProperties(threat);
    const distanceScore = Math.max(0, 1.0 - distance / 200);
    const timeScore = Math.max(0, 1.0 - collisionTime / 120);
    
    return (distanceScore * 0.3 + timeScore * 0.7) * threatData.priority;
  }

  /**
   * Check if a path between two points is clear of threats
   */
  isPathClear(startX, startY, endX, endY, threats, timeBuffer = 30) {
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return true;
    
    const steps = Math.ceil(distance / 10); // Check every 10 pixels
    const stepX = dx / steps;
    const stepY = dy / steps;
    
    for (let i = 0; i <= steps; i++) {
      const checkX = startX + stepX * i;
      const checkY = startY + stepY * i;
      
      for (const threat of threats) {
        const threatDistance = Math.sqrt(
          (threat.x - checkX) ** 2 + 
          (threat.y - checkY) ** 2
        );
        
        const threatData = this.threatAssessment.getThreatProperties(threat.entity);
        const safeDistance = threatData.radius + this.SAFETY_BUFFER + 20;
        
        if (threatDistance < safeDistance) {
          // Check if threat will be in this position when we arrive
          const timeToReach = (i / steps) * timeBuffer;
          const threatX = threat.x + (threat.vx || 0) * timeToReach;
          const threatY = threat.y + (threat.vy || 0) * timeToReach;
          
          const futureThreatDistance = Math.sqrt(
            (threatX - checkX) ** 2 + 
            (threatY - checkY) ** 2
          );
          
          if (futureThreatDistance < safeDistance) {
            return false;
          }
        }
      }
    }
    
    return true;
  }

  /**
   * Assess the safety of a potential movement path
   */
  assessPathSafety(startX, startY, endX, endY, threats, timeBuffer = 30) {
    let safetyScore = 1.0;
    
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return safetyScore;
    
    const steps = Math.ceil(distance / 15); // Check every 15 pixels
    const stepX = dx / steps;
    const stepY = dy / steps;
    
    for (let i = 0; i <= steps; i++) {
      const checkX = startX + stepX * i;
      const checkY = startY + stepY * i;
      const timeToReach = (i / steps) * timeBuffer;
      
      for (const threat of threats) {
        const threatX = threat.x + (threat.vx || 0) * timeToReach;
        const threatY = threat.y + (threat.vy || 0) * timeToReach;
        
        const threatDistance = Math.sqrt(
          (threatX - checkX) ** 2 + 
          (threatY - checkY) ** 2
        );
        
        const threatData = this.threatAssessment.getThreatProperties(threat.entity);
        const dangerRadius = threatData.radius + this.SAFETY_BUFFER + 40;
        
        if (threatDistance < dangerRadius) {
          const proximityFactor = 1.0 - (threatDistance / dangerRadius);
          safetyScore *= (1.0 - proximityFactor * 0.5 * threatData.priority);
        }
      }
    }
    
    return Math.max(0, safetyScore);
  }
}