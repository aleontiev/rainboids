/**
 * ThreatAssessment - Handles all threat detection and analysis for the autoplayer
 */
export class ThreatAssessment {
  constructor(player) {
    this.player = player;
    
    // Enhanced safety buffer - 1.5x normal player hitbox for better collision avoidance
    this.PLAYER_HITBOX = 6; // Base player hitbox
    this.SAFETY_BUFFER = this.PLAYER_HITBOX * 1.5; // 9 pixels for enhanced safety
    
    // Conservative projectile speed multiplier - assume projectiles might accelerate
    this.PROJECTILE_SPEED_SAFETY_MARGIN = 1.1; // 10% faster than expected
  }

  /**
   * Calculate overall threat level (0.0 = safe, 1.0 = extreme danger)
   * Enhanced to focus on imminent threats while maintaining laser sensitivity
   */
  calculateThreatLevel(collidables) {
    let threatScore = 0;
    const dangerRadius = 150;
    
    let nearbyBullets = 0;
    let nearbyLasers = 0;
    let chargingLasers = 0;
    let nearbyEnemies = 0;
    let nearbyAsteroids = 0;
    
    for (const collidable of collidables) {
      const distance = Math.sqrt((collidable.x - this.player.x) ** 2 + (collidable.y - this.player.y) ** 2);
      
      // Only consider imminent threats unless they're lasers
      const isImminentOrLaser = this.isImminentThreat(collidable, 1.0) || 
                               this.hasLaserIndicators(collidable) ||
                               collidable.collidableType === 'enemyLaser';
      
      if (!isImminentOrLaser) {
        continue; // Skip distant non-laser threats
      }
      
      if (collidable.collidableType === 'enemyBullet') {
        if (distance < dangerRadius) {
          const proximityFactor = Math.max(0, (dangerRadius - distance) / dangerRadius);
          nearbyBullets += proximityFactor;
        }
      } else if (collidable.collidableType === 'enemyLaser') {
        if (distance < dangerRadius) {
          nearbyLasers++;
        }
      } else if (collidable.collidableType === 'enemy') {
        // Use environment data instead of hardcoded types
        if (this.hasLaserIndicators(collidable)) {
          if (distance < dangerRadius * 1.5) {
            chargingLasers++;
          }
        }
        if (distance < dangerRadius) {
          // Weight enemies by their environmental threat level
          if (this.hasHighVelocity(collidable)) {
            nearbyEnemies += 2; // Fast moving enemies count double
          } else {
            nearbyEnemies += 1;
          }
        }
      } else if (collidable.collidableType === 'asteroid') {
        if (distance < dangerRadius * 0.8) {
          nearbyAsteroids++;
        }
      } else if (collidable.collidableType === 'boss') {
        if (distance < 300) {
          const proximityFactor = Math.max(0, (300 - distance) / 300);
          let bossBaseThreat = 0.3;
          
          // Check for laser threats from boss parts
          if (collidable.parts && Array.isArray(collidable.parts)) {
            for (const part of collidable.parts) {
              if (part.activeLaser && !part.destroyed) {
                const laser = part.activeLaser;
                if (laser.state === 'charging' || laser.warningActive) {
                  bossBaseThreat = 0.6; // Double threat for charging lasers
                  break;
                } else if (laser.isLaserActive) {
                  bossBaseThreat = 0.8; // Very high threat for active lasers
                  break;
                }
              }
            }
          }
          
          threatScore += proximityFactor * bossBaseThreat;
        }
      }
    }
    
    threatScore += Math.min(nearbyBullets * 0.15, 0.6);
    threatScore += Math.min(nearbyLasers * 0.2, 0.4);
    threatScore += Math.min(chargingLasers * 0.25, 0.5);
    threatScore += Math.min(nearbyEnemies * 0.1, 0.3);
    threatScore += Math.min(nearbyAsteroids * 0.05, 0.2);
    
    return Math.min(threatScore, 1.0);
  }

  /**
   * Identify immediate lethal threats that require emergency action
   * Enhanced to focus on imminent threats while always considering lasers
   */
  identifyLethalThreats(collidables, slowdownFactor) {
    const lethalThreats = [];
    const criticalDistance = 60;
    const criticalTime = 30;
    
    for (const collidable of collidables) {
      const distance = Math.sqrt(
        (collidable.x - this.player.x) ** 2 + 
        (collidable.y - this.player.y) ** 2
      );
      
      const threatData = this.getThreatProperties(collidable);
      if (!threatData) continue;
      
      // Only consider imminent threats unless they're lasers
      const isImminentOrLaser = this.isImminentThreat(collidable, slowdownFactor) || 
                               this.hasLaserIndicators(collidable) ||
                               collidable.collidableType === 'enemyLaser';
      
      if (!isImminentOrLaser) {
        continue; // Skip distant non-laser threats
      }
      
      if (distance <= criticalDistance) {
        if (threatData.isMoving) {
          const collisionTime = this.calculateCollisionTime(collidable, slowdownFactor);
          if (collisionTime > 0 && collisionTime <= criticalTime) {
            lethalThreats.push({
              entity: collidable,
              distance: distance,
              collisionTime: collisionTime,
              severity: this.calculateThreatSeverity(distance, collisionTime, threatData.priority),
              type: threatData.type
            });
          }
        } else {
          if (distance <= threatData.radius + 20) {
            lethalThreats.push({
              entity: collidable,
              distance: distance,
              collisionTime: 0,
              severity: 1.0 - (distance / (threatData.radius + 20)),
              type: threatData.type
            });
          }
        }
      }
    }
    
    return lethalThreats.sort((a, b) => b.severity - a.severity);
  }

  /**
   * Get standardized threat properties for any collidable using only environment data
   * Enhanced to focus on imminent threats unless they are lasers
   */
  getThreatProperties(collidable) {
    const type = collidable.collidableType;
    
    switch (type) {
      case 'enemyBullet':
        return {
          type: 'bullet',
          radius: Math.max(collidable.size || 6, 6),
          priority: 1.0,
          isMoving: this.hasMovement(collidable),
          requiresImminencyCheck: true // Non-laser projectiles need imminency check
        };
      
      case 'enemyLaser':
        return {
          type: 'laser',
          radius: Math.max(collidable.size || 6, 6),
          priority: 1.0,
          isMoving: this.hasMovement(collidable),
          requiresImminencyCheck: false // Lasers are always threats
        };
      
      case 'enemy':
        // Use environment data only - no hardcoded enemy type assumptions
        let priority = 0.7;
        let radius = Math.max(collidable.size || 24, 15);
        let requiresImminencyCheck = true;
        
        // Detect dangerous states through environment properties
        if (this.hasLaserIndicators(collidable)) {
          priority = 1.0; // Laser charging is extremely dangerous
          radius += 60; // Wide danger zone around laser charging
          requiresImminencyCheck = false; // Laser enemies are always threats
        } else if (this.hasHighVelocity(collidable)) {
          priority = 0.9; // Fast moving enemies are more dangerous
          radius += 15; // Extended danger zone for fast movers
        } else if (this.isNearPlayer(collidable, 100)) {
          priority = 0.8; // Close enemies are more threatening
        }
        
        return {
          type: 'enemy',
          radius: radius,
          priority: priority,
          isMoving: this.hasMovement(collidable),
          requiresImminencyCheck: requiresImminencyCheck
        };
      
      case 'asteroid':
        return {
          type: 'asteroid',
          radius: Math.max(collidable.size || 40, 25),
          priority: 0.6,
          isMoving: this.hasMovement(collidable),
          requiresImminencyCheck: true // Asteroids need imminency check
        };
      
      case 'boss':
        let bossPriority = 0.8;
        let bossRadius = Math.max(collidable.size || 120, 100);
        let bossRequiresImminencyCheck = true;
        
        // Check for active laser threats from boss parts
        if (collidable.parts && Array.isArray(collidable.parts)) {
          for (const part of collidable.parts) {
            if (part.activeLaser && !part.destroyed) {
              const laser = part.activeLaser;
              if (laser.state === 'charging' || laser.warningActive) {
                bossPriority = 1.0; // Maximum priority for laser charging boss
                bossRadius += 100; // Extend danger zone significantly
                bossRequiresImminencyCheck = false; // Laser bosses are always threats
                break;
              } else if (laser.isLaserActive) {
                bossPriority = 1.0; // Maximum priority for active laser boss
                bossRadius += 150; // Very large danger zone for active lasers
                bossRequiresImminencyCheck = false; // Active laser bosses are always threats
                break;
              }
            }
          }
        }
        
        return {
          type: 'boss',
          radius: bossRadius,
          priority: bossPriority,
          isMoving: this.hasMovement(collidable),
          requiresImminencyCheck: bossRequiresImminencyCheck
        };
      
      default:
        return null;
    }
  }

  /**
   * Detect if entity has movement based on velocity properties
   */
  hasMovement(entity) {
    const vx = entity.vx || entity.dx/60 || 0;
    const vy = entity.vy || entity.dy/60 || 0;
    return Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1;
  }

  /**
   * Detect laser indicators or charging states through environment properties
   * Enhanced to check boss parts for activeLaser warnings
   */
  hasLaserIndicators(entity) {
    // Check for laser-related states or indicators on entity itself
    if (entity.laserState === 'charging' || 
        entity.laserState === 'preview' ||
        entity.isChargingLaser === true ||
        entity.laserChargeTime > 0 ||
        entity.state === 'charging' ||
        entity.warningActive === true ||
        (entity.activeLaser && entity.activeLaser.state === 'charging')) {
      return true;
    }

    // Check boss parts for activeLaser warnings
    if (entity.parts && Array.isArray(entity.parts)) {
      for (const part of entity.parts) {
        if (part.activeLaser && !part.destroyed) {
          const laser = part.activeLaser;
          if (laser.state === 'charging' || laser.warningActive) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Get laser line information for avoidance calculations
   * Enhanced to detect boss part activeLaser properties
   */
  getLaserLineInfo(entity) {
    // Check for continuous laser beam attached to entity
    if (entity.activeLaser) {
      const laser = entity.activeLaser;
      return {
        originX: laser.originX,
        originY: laser.originY,
        angle: laser.angle,
        width: laser.width || 16,
        isCharging: laser.state === 'charging',
        isActive: laser.isLaserActive,
        warningActive: laser.warningActive,
        maxLength: laser.maxLength || Math.max(window.innerWidth, window.innerHeight) * 1.5
      };
    }

    // Check for boss parts with activeLaser properties
    if (entity.parts && Array.isArray(entity.parts)) {
      for (const part of entity.parts) {
        if (part.activeLaser && !part.destroyed) {
          const laser = part.activeLaser;
          return {
            originX: laser.originX || part.x,
            originY: laser.originY || part.y,
            angle: laser.angle,
            width: laser.width || 16,
            isCharging: laser.state === 'charging',
            isActive: laser.isLaserActive,
            warningActive: laser.warningActive,
            maxLength: laser.maxLength || Math.max(window.innerWidth, window.innerHeight) * 1.5
          };
        }
      }
    }

    // Check for entity with laser properties
    if (entity.laserAngle !== undefined || entity.angle !== undefined) {
      return {
        originX: entity.x,
        originY: entity.y,
        angle: entity.laserAngle || entity.angle || 0,
        width: entity.laserWidth || 16,
        isCharging: this.hasLaserIndicators(entity),
        isActive: entity.laserState === 'active' || entity.isLaserActive,
        warningActive: entity.warningActive || false,
        maxLength: Math.max(window.innerWidth, window.innerHeight) * 1.5
      };
    }

    return null;
  }

  /**
   * Check if a position is in the path of a laser line
   */
  isPositionInLaserPath(x, y, laserInfo, safetyBuffer = 30) {
    if (!laserInfo) return false;

    const dx = Math.cos(laserInfo.angle);
    const dy = Math.sin(laserInfo.angle);
    
    // Calculate distance from point to laser line
    const toPointX = x - laserInfo.originX;
    const toPointY = y - laserInfo.originY;
    
    // Project point onto laser direction to check if it's in the laser's forward path
    const projectionLength = toPointX * dx + toPointY * dy;
    if (projectionLength < 0 || projectionLength > laserInfo.maxLength) {
      return false; // Point is behind laser or beyond its range
    }
    
    // Calculate perpendicular distance from point to laser line
    const perpendicularDistance = Math.abs(toPointX * dy - toPointY * dx);
    const dangerZone = laserInfo.width / 2 + safetyBuffer;
    
    return perpendicularDistance < dangerZone;
  }

  /**
   * Detect high velocity movement patterns
   */
  hasHighVelocity(entity) {
    const vx = entity.vx || entity.dx/60 || 0;
    const vy = entity.vy || entity.dy/60 || 0;
    const speed = Math.sqrt(vx * vx + vy * vy);
    return speed > 3.0; // Threshold for "high velocity"
  }

  /**
   * Check if entity is near player within given distance
   */
  isNearPlayer(entity, distance) {
    const dx = entity.x - this.player.x;
    const dy = entity.y - this.player.y;
    return Math.sqrt(dx * dx + dy * dy) < distance;
  }

  /**
   * Calculate accurate collision time for a specific threat with conservative speed estimation
   */
  calculateCollisionTime(threat, slowdownFactor) {
    // Use conservative speed estimation - assume projectiles might move 1.1x faster
    const threatVx = (threat.vx || threat.dx/60 || 0) * slowdownFactor * this.PROJECTILE_SPEED_SAFETY_MARGIN;
    const threatVy = (threat.vy || threat.dy/60 || 0) * slowdownFactor * this.PROJECTILE_SPEED_SAFETY_MARGIN;
    const playerVx = (this.player.vx || 0) * slowdownFactor;
    const playerVy = (this.player.vy || 0) * slowdownFactor;
    
    const relativeX = threat.x - this.player.x;
    const relativeY = threat.y - this.player.y;
    const relativeVx = threatVx - playerVx;
    const relativeVy = threatVy - playerVy;
    
    const threatData = this.getThreatProperties(threat);
    const collisionRadius = this.SAFETY_BUFFER + threatData.radius; // Enhanced safety buffer + threat radius
    
    const a = relativeVx * relativeVx + relativeVy * relativeVy;
    const b = 2 * (relativeX * relativeVx + relativeY * relativeVy);
    const c = relativeX * relativeX + relativeY * relativeY - collisionRadius * collisionRadius;
    
    const discriminant = b * b - 4 * a * c;
    
    if (discriminant < 0 || Math.abs(a) < 0.001) {
      return -1;
    }
    
    const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
    const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
    
    const validTimes = [t1, t2].filter(t => t > 0.1 && t < 120);
    return validTimes.length > 0 ? Math.min(...validTimes) : -1;
  }

  /**
   * Check if a threat will get within critical distance in the next few frames
   * For non-laser threats, this determines if they should be considered at all
   */
  isImminentThreat(collidable, slowdownFactor, framesToCheck = 60) {
    const threatData = this.getThreatProperties(collidable);
    if (!threatData) return false;
    
    // Lasers and laser-equipped entities are always considered threats
    if (!threatData.requiresImminencyCheck) {
      return true;
    }
    
    // For other threats, check if they'll get within critical distance
    const criticalDistance = this.SAFETY_BUFFER + threatData.radius + 5; // 5px buffer as requested
    
    // Current distance
    const currentDistance = Math.sqrt(
      (collidable.x - this.player.x) ** 2 + 
      (collidable.y - this.player.y) ** 2
    );
    
    // If already within critical distance, it's imminent
    if (currentDistance <= criticalDistance) {
      return true;
    }
    
    // If not moving, only consider if very close
    if (!threatData.isMoving) {
      return currentDistance <= criticalDistance + 20; // Small buffer for stationary threats
    }
    
    // Calculate where the threat will be in framesToCheck frames
    const threatVx = (collidable.vx || collidable.dx/60 || 0) * slowdownFactor * this.PROJECTILE_SPEED_SAFETY_MARGIN;
    const threatVy = (collidable.vy || collidable.dy/60 || 0) * slowdownFactor * this.PROJECTILE_SPEED_SAFETY_MARGIN;
    
    // Check multiple frames to see if threat gets close
    for (let frame = 1; frame <= framesToCheck; frame++) {
      const futureX = collidable.x + threatVx * frame;
      const futureY = collidable.y + threatVy * frame;
      
      const futureDistance = Math.sqrt(
        (futureX - this.player.x) ** 2 + 
        (futureY - this.player.y) ** 2
      );
      
      if (futureDistance <= criticalDistance) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Calculate threat severity (0.0 = no threat, 1.0 = imminent death)
   */
  calculateThreatSeverity(distance, collisionTime, priority) {
    const distanceScore = Math.max(0, 1.0 - distance / 100);
    const timeScore = collisionTime > 0 ? Math.max(0, 1.0 - collisionTime / 60) : 0;
    return (distanceScore * 0.4 + timeScore * 0.6) * priority;
  }

  /**
   * Count nearby projectiles within a given radius
   */
  countNearbyProjectiles(enemyBullets, enemyLasers, radius) {
    let count = 0;
    
    for (const bullet of enemyBullets) {
      const distance = Math.sqrt((bullet.x - this.player.x) ** 2 + (bullet.y - this.player.y) ** 2);
      if (distance < radius) count++;
    }
    
    for (const laser of enemyLasers) {
      const distance = Math.sqrt((laser.x - this.player.x) ** 2 + (laser.y - this.player.y) ** 2);
      if (distance < radius) count++;
    }
    
    return count;
  }

  /**
   * Calculate local space density around player
   */
  calculateLocalSpaceDensity(enemyBullets, enemyLasers, enemies) {
    const checkRadius = 120;
    const maxArea = Math.PI * checkRadius * checkRadius;
    let occupiedArea = 0;
    let threatCount = 0;
    
    for (const bullet of enemyBullets) {
      const distance = Math.sqrt((bullet.x - this.player.x) ** 2 + (bullet.y - this.player.y) ** 2);
      if (distance <= checkRadius) {
        const bulletSize = bullet.size || 6;
        occupiedArea += Math.PI * bulletSize * bulletSize;
        threatCount++;
      }
    }
    
    for (const laser of enemyLasers) {
      const distance = Math.sqrt((laser.x - this.player.x) ** 2 + (laser.y - this.player.y) ** 2);
      if (distance <= checkRadius) {
        const laserSize = laser.size || 8;
        occupiedArea += Math.PI * laserSize * laserSize;
        threatCount++;
      }
    }
    
    for (const enemy of enemies) {
      const distance = Math.sqrt((enemy.x - this.player.x) ** 2 + (enemy.y - this.player.y) ** 2);
      if (distance <= checkRadius) {
        const enemySize = enemy.size || 24;
        occupiedArea += Math.PI * enemySize * enemySize;
        threatCount++;
      }
    }
    
    const density = Math.min(1.0, occupiedArea / maxArea);
    return {
      density: density,
      threatCount: threatCount,
      occupiedArea: occupiedArea,
      maxArea: maxArea
    };
  }

  /**
   * Check if player is in a concentrated danger zone
   */
  isPlayerInDangerZone(nearbyBullets, nearbyLasers) {
    const dangerRadius = 80;
    let dangerScore = 0;
    
    for (const bullet of nearbyBullets) {
      const distance = Math.sqrt((bullet.x - this.player.x) ** 2 + (bullet.y - this.player.y) ** 2);
      if (distance < dangerRadius) {
        const bulletVx = (bullet.dx || 0) / 60;
        const bulletVy = (bullet.dy || 0) / 60;
        const toPlayerX = this.player.x - bullet.x;
        const toPlayerY = this.player.y - bullet.y;
        const dot = bulletVx * toPlayerX + bulletVy * toPlayerY;
        
        if (dot > 0) {
          dangerScore += (dangerRadius - distance) / dangerRadius;
        }
      }
    }
    
    for (const laser of nearbyLasers) {
      const distance = Math.sqrt((laser.x - this.player.x) ** 2 + (laser.y - this.player.y) ** 2);
      if (distance < dangerRadius) {
        dangerScore += (dangerRadius - distance) / dangerRadius * 1.2;
      }
    }
    
    return dangerScore > 2.0;
  }

}