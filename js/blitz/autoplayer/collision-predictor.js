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
  }

  /**
   * Map all threats to a unified interface
   */
  mapAllThreats(collidables, slowdownFactor) {
    return collidables.map(collidable => {
      const threatData = this.threatAssessment.getThreatProperties(collidable);
      if (!threatData) return null;
      
      return {
        entity: collidable,
        x: collidable.x,
        y: collidable.y,
        vx: (collidable.vx || collidable.dx/60 || 0) * slowdownFactor,
        vy: (collidable.vy || collidable.dy/60 || 0) * slowdownFactor,
        radius: threatData.radius,
        priority: threatData.priority,
        type: threatData.type,
        isMoving: threatData.isMoving
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
      
      const requiredSpeed = (distanceToThreat - threat.radius - 6) / timeToCollision;
      
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
    const collisionRadius = 6 + threatData.radius;
    
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
        const safeDistance = threatData.radius + 6 + 20;
        
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
        const dangerRadius = threatData.radius + 6 + 40;
        
        if (threatDistance < dangerRadius) {
          const proximityFactor = 1.0 - (threatDistance / dangerRadius);
          safetyScore *= (1.0 - proximityFactor * 0.5 * threatData.priority);
        }
      }
    }
    
    return Math.max(0, safetyScore);
  }
}