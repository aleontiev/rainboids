/**
 * ThreatAssessment - Handles all threat detection and analysis for the autoplayer
 */
export class ThreatAssessment {
  constructor(player) {
    this.player = player;
  }

  /**
   * Calculate overall threat level (0.0 = safe, 1.0 = extreme danger)
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
        if (collidable.type === 'laser' && (collidable.laserState === 'charging' || collidable.laserState === 'preview')) {
          if (distance < dangerRadius * 1.5) {
            chargingLasers++;
          }
        }
        if (distance < dangerRadius) {
          if (collidable.type === 'dive') {
            nearbyEnemies += 2;
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
          threatScore += proximityFactor * 0.3;
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
   * Get standardized threat properties for any collidable
   */
  getThreatProperties(collidable) {
    const type = collidable.collidableType;
    
    switch (type) {
      case 'enemyBullet':
        return {
          type: 'bullet',
          radius: Math.max(collidable.size || 6, 6),
          priority: 1.0,
          isMoving: true
        };
      
      case 'enemyLaser':
        return {
          type: 'laser',
          radius: Math.max(collidable.size || 6, 6),
          priority: 1.0,
          isMoving: true
        };
      
      case 'enemy':
        let priority = 0.7;
        let radius = Math.max(collidable.size || 24, 15);
        
        if (collidable.type === 'dive') {
          priority = 0.9;
          radius += 15;
        } else if (collidable.type === 'laser') {
          priority = collidable.laserState === 'charging' || collidable.laserState === 'preview' ? 1.0 : 0.8;
          radius += collidable.laserState === 'charging' ? 60 : 25;
        }
        
        return {
          type: 'enemy',
          radius: radius,
          priority: priority,
          isMoving: true
        };
      
      case 'asteroid':
        return {
          type: 'asteroid',
          radius: Math.max(collidable.size || 40, 25),
          priority: 0.6,
          isMoving: true
        };
      
      case 'boss':
        return {
          type: 'boss',
          radius: Math.max(collidable.size || 120, 100),
          priority: 0.8,
          isMoving: true
        };
      
      default:
        return null;
    }
  }

  /**
   * Calculate accurate collision time for a specific threat
   */
  calculateCollisionTime(threat, slowdownFactor) {
    const threatVx = (threat.vx || threat.dx/60 || 0) * slowdownFactor;
    const threatVy = (threat.vy || threat.dy/60 || 0) * slowdownFactor;
    const playerVx = (this.player.vx || 0) * slowdownFactor;
    const playerVy = (this.player.vy || 0) * slowdownFactor;
    
    const relativeX = threat.x - this.player.x;
    const relativeY = threat.y - this.player.y;
    const relativeVx = threatVx - playerVx;
    const relativeVy = threatVy - playerVy;
    
    const threatData = this.getThreatProperties(threat);
    const collisionRadius = 6 + threatData.radius; // Player hitbox size + threat radius
    
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

  /**
   * Detect boss phase changes for strategic ability usage
   */
  detectBossPhaseChange(boss, lastBossPhase, lastBossArmsDestroyed) {
    if (!boss) return false;
    
    const currentPhase = boss.phase || 'normal';
    const currentArmsDestroyed = boss.armsDestroyed || 0;
    
    const phaseChanged = lastBossPhase !== null && lastBossPhase !== currentPhase;
    const armsChanged = lastBossArmsDestroyed !== null && lastBossArmsDestroyed !== currentArmsDestroyed;
    
    return phaseChanged || armsChanged;
  }
}