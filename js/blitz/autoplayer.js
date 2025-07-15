import { GAME_CONFIG } from "./constants.js";

/**
 * Autoplayer class - handles all autoplay functionality for the player
 * Includes movement calculation, threat assessment, and ability usage
 */
export class Autoplayer {
  constructor(player) {
    this.player = player;
    
    // Autoplay ability timers
    this.autoplayShieldTimer = 0;
    this.autoplaySlowTimer = 0;
    this.autoplayBombTimer = 0;
    this.autoplayMovementTimer = 0;
    
    // Boss phase tracking
    this.lastBossPhase = null;
    this.lastBossArmsDestroyed = null;
  }

  // Handle strategic ability usage for autoplay
  handleAutoplayAbilities(enemies, enemyBullets, enemyLasers, asteroids, boss, keys, powerups = []) {
    this.autoplayShieldTimer++;
    this.autoplaySlowTimer++;
    this.autoplayBombTimer++;
    
    // Calculate immediate threat level
    const threatLevel = this.calculateThreatLevel(enemies, enemyBullets, enemyLasers, asteroids, boss);
    
    // Check if there's a valuable powerup nearby that we might want to shield for
    let nearbyValuablePowerup = false;
    if (powerups && powerups.length > 0) {
      for (const powerup of powerups) {
        const distance = Math.sqrt((powerup.x - this.player.x) ** 2 + (powerup.y - this.player.y) ** 2);
        if (distance < 150 && (powerup.type === 'bomb' || powerup.type === 'rainbowStar' || powerup.type === 'shield')) {
          nearbyValuablePowerup = true;
          break;
        }
      }
    }
    
    // Enhanced shield usage - more aggressive about protecting against projectiles
    const projectileCount = enemyBullets.length + enemyLasers.length;
    const nearbyProjectiles = this.countNearbyProjectiles(enemyBullets, enemyLasers, 150);
    
    const shouldUseShield = (
      (threatLevel >= 0.3 || // Much more aggressive threshold
       nearbyProjectiles >= 2 || // 2+ projectiles nearby
       projectileCount >= 8 || // Fewer projectiles needed
       (boss && !boss.isDefeated) || // Any boss phase
       (nearbyValuablePowerup && threatLevel >= 0.2) || // Even lower threshold for powerups
       this.autoplayShieldTimer > 180) && // Use every 3 seconds if available
      !this.player.isShielding && // Not already shielding
      this.player.shieldCooldown <= 0 && // Shield is available
      this.autoplayShieldTimer > 30 // Reduced minimum time (0.5 seconds)
    );
    
    if (shouldUseShield) {
      keys.shield = true; // Trigger shield activation
      this.autoplayShieldTimer = 0; // Reset timer
    }
    
    // Enhanced time slow usage - more strategic about when to use
    const bossPhaseChange = this.detectBossPhaseChange(boss);
    const minibossPresent = enemies.some(enemy => enemy.type === 'miniboss' || enemy.isMiniboss);
    
    const shouldUseTimeSlow = (
      (threatLevel >= 0.4 || // Much more aggressive threshold
       nearbyProjectiles >= 3 || // 3+ nearby projectiles
       projectileCount >= 12 || // Fewer projectiles needed
       bossPhaseChange || // Boss phase transition
       minibossPresent || // Miniboss on screen
       (boss && !boss.isDefeated) || // Any boss phase
       this.autoplaySlowTimer > 300) && // Every 5 seconds if available
      this.autoplaySlowTimer > 60 // Minimum 1 second between slow considerations
    );
    
    if (shouldUseTimeSlow) {
      keys.f = true; // Trigger time slow
      this.autoplaySlowTimer = 0; // Reset timer
    }
    
    // Bomb usage - activate in extreme situations with cooldown
    const shouldUseBomb = (
      (threatLevel >= 0.9 || // Extreme threat level
       (enemyBullets.length > 25) || // Screen full of bullets
       (boss && !boss.isDefeated && boss.finalPhase && threatLevel >= 0.6) || // Boss final phase
       (enemies.length > 10 && threatLevel >= 0.7)) && // Many enemies with high threat
      this.autoplayBombTimer > 300 // Minimum 5 seconds between bomb considerations
    );
    
    if (shouldUseBomb) {
      keys.z = true; // Trigger bomb (game will check if bombs are available)
      this.autoplayBombTimer = 0; // Reset timer
    }
  }

  // Calculate overall threat level (0.0 = safe, 1.0 = extreme danger)
  calculateThreatLevel(enemies, enemyBullets, enemyLasers, asteroids, boss) {
    let threatScore = 0;
    const dangerRadius = 150; // Radius to consider threats
    
    // Count nearby enemy bullets (highest threat)
    let nearbyBullets = 0;
    for (const bullet of enemyBullets) {
      const distance = Math.sqrt((bullet.x - this.player.x) ** 2 + (bullet.y - this.player.y) ** 2);
      if (distance < dangerRadius) {
        // Closer bullets are more dangerous
        const proximityFactor = Math.max(0, (dangerRadius - distance) / dangerRadius);
        nearbyBullets += proximityFactor;
      }
    }
    threatScore += Math.min(nearbyBullets * 0.15, 0.6); // Cap bullet threat at 0.6
    
    // Count nearby enemy lasers
    let nearbyLasers = 0;
    for (const laser of enemyLasers) {
      const distance = Math.sqrt((laser.x - this.player.x) ** 2 + (laser.y - this.player.y) ** 2);
      if (distance < dangerRadius) {
        nearbyLasers++;
      }
    }
    threatScore += Math.min(nearbyLasers * 0.2, 0.4); // Cap laser threat at 0.4
    
    // Count charging laser enemies (special threat)
    let chargingLasers = 0;
    for (const enemy of enemies) {
      if (enemy.type === 'laser' && (enemy.laserState === 'charging' || enemy.laserState === 'preview')) {
        const distance = Math.sqrt((enemy.x - this.player.x) ** 2 + (enemy.y - this.player.y) ** 2);
        if (distance < dangerRadius * 1.5) {
          chargingLasers++;
        }
      }
    }
    threatScore += Math.min(chargingLasers * 0.25, 0.5); // Cap charging laser threat at 0.5
    
    // Count nearby dangerous enemies
    let nearbyEnemies = 0;
    for (const enemy of enemies) {
      const distance = Math.sqrt((enemy.x - this.player.x) ** 2 + (enemy.y - this.player.y) ** 2);
      if (distance < dangerRadius) {
        if (enemy.type === 'dive') {
          nearbyEnemies += 2; // Dive enemies are more dangerous
        } else {
          nearbyEnemies += 1;
        }
      }
    }
    threatScore += Math.min(nearbyEnemies * 0.1, 0.3); // Cap enemy threat at 0.3
    
    // Count nearby asteroids
    let nearbyAsteroids = 0;
    for (const asteroid of asteroids) {
      const distance = Math.sqrt((asteroid.x - this.player.x) ** 2 + (asteroid.y - this.player.y) ** 2);
      if (distance < dangerRadius * 0.8) { // Smaller radius for asteroids
        nearbyAsteroids++;
      }
    }
    threatScore += Math.min(nearbyAsteroids * 0.05, 0.2); // Cap asteroid threat at 0.2
    
    // Boss proximity threat
    if (boss && !boss.isDefeated) {
      const distance = Math.sqrt((boss.x - this.player.x) ** 2 + (boss.y - this.player.y) ** 2);
      if (distance < 300) {
        const proximityFactor = Math.max(0, (300 - distance) / 300);
        threatScore += proximityFactor * 0.3; // Boss proximity adds up to 0.3
      }
    }
    
    return Math.min(threatScore, 1.0); // Cap at 1.0
  }

  // Enhanced movement calculation with comprehensive threat avoidance
  calculateDodgeVector(enemies, enemyBullets, enemyLasers, asteroids, boss, powerups = []) {
    if (!this.autoplayMovementTimer) this.autoplayMovementTimer = 0;
    this.autoplayMovementTimer += 1;

    // Step 1: Determine current point objective
    const objective = this.calculatePointObjective(enemies, enemyBullets, enemyLasers, asteroids, boss, powerups);
    
    // Step 2: Create comprehensive threat map
    const allThreats = this.mapAllThreats(enemies, enemyBullets, enemyLasers, asteroids, boss);
    
    // Step 3: Find safe path to objective
    const safeMovement = this.calculateSafeMovement(objective, allThreats);
    
    return safeMovement;
  }

  // Determine the best point objective based on current situation
  calculatePointObjective(enemies, enemyBullets, enemyLasers, asteroids, boss, powerups) {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // Check for laser target zones first - extremely high priority
    const laserThreat = this.findLaserTargetThreat(enemies);
    if (laserThreat) {
      return {
        type: 'laser_dodge',
        x: laserThreat.x,
        y: laserThreat.y,
        priority: 2.5 // Highest priority - above bullets
      };
    }
    
    // Check for safe powerups first
    if (powerups && powerups.length > 0) {
      for (const powerup of powerups) {
        const distance = Math.sqrt((powerup.x - this.player.x) ** 2 + (powerup.y - this.player.y) ** 2);
        if (distance < 300 && this.isPathSafe(this.player.x, this.player.y, powerup.x, powerup.y, enemies, enemyBullets, enemyLasers, asteroids, boss)) {
          return {
            type: 'powerup',
            x: powerup.x,
            y: powerup.y,
            priority: this.getPowerupPriority(powerup)
          };
        }
      }
    }
    
    // Check for immediate bullet threats first - highest priority
    const immediateBulletThreat = this.findImmediateBulletThreat(enemyBullets, enemyLasers);
    if (immediateBulletThreat) {
      return {
        type: 'dodge',
        x: immediateBulletThreat.x,
        y: immediateBulletThreat.y,
        priority: 2.0 // Highest priority
      };
    }

    // Check if we need to escape from dense threat clusters
    const threatDensity = this.calculateThreatDensity(this.player.x, this.player.y, enemies, enemyBullets, enemyLasers, asteroids);
    if (threatDensity > 0.4) { // Lower threshold for earlier escape
      // Find the safest escape direction
      const escapePoint = this.findBestEscapePoint(enemies, enemyBullets, enemyLasers, asteroids, boss);
      return {
        type: 'escape',
        x: escapePoint.x,
        y: escapePoint.y,
        priority: 1.5
      };
    }
    
    // Enhanced center-seeking with distance-based priority
    const distanceFromCenter = Math.sqrt((this.player.x - centerX) ** 2 + (this.player.y - centerY) ** 2);
    const maxDistanceFromCenter = Math.sqrt((centerX ** 2) + (centerY ** 2));
    const centerPriority = 0.2 + (distanceFromCenter / maxDistanceFromCenter) * 0.8; // Higher priority when further from center
    
    return {
      type: 'center',
      x: centerX,
      y: centerY,
      priority: centerPriority
    };
  }

  // Create a comprehensive map of all threats with their danger zones
  mapAllThreats(enemies, enemyBullets, enemyLasers, asteroids, boss) {
    const threats = [];
    const futureFrames = 90;
    
    // Map all enemy bullets as high-priority threats
    for (const bullet of enemyBullets) {
      threats.push({
        entity: bullet,
        type: 'bullet',
        x: bullet.x,
        y: bullet.y,
        vx: (bullet.dx || 0) / 60,
        vy: (bullet.dy || 0) / 60,
        radius: 60, // Increased danger radius around bullet
        priority: 1.0,
        predictedPath: this.predictEntityPath(bullet, futureFrames)
      });
    }
    
    // Map all enemy lasers
    for (const laser of enemyLasers) {
      threats.push({
        entity: laser,
        type: 'laser',
        x: laser.x,
        y: laser.y,
        vx: (laser.dx || 0) / 60,
        vy: (laser.dy || 0) / 60,
        radius: 70, // Increased danger radius around laser
        priority: 0.95,
        predictedPath: this.predictEntityPath(laser, futureFrames)
      });
    }
    
    // Map all enemies with appropriate threat levels
    for (const enemy of enemies) {
      let radius = 50;
      let priority = 0.7;
      
      // Adjust threat parameters based on enemy type
      if (enemy.type === 'dive') {
        radius = 80;
        priority = 0.9;
      } else if (enemy.type === 'laser') {
        radius = 120;
        priority = 0.8;
        // Laser enemies charging are extremely dangerous
        if (enemy.laserState === 'charging' || enemy.laserState === 'preview') {
          priority = 1.0;
          radius = 200;
        }
      }
      
      threats.push({
        entity: enemy,
        type: 'enemy',
        x: enemy.x,
        y: enemy.y,
        vx: (enemy.dx || 0) / 60,
        vy: (enemy.dy || 0) / 60,
        radius: radius,
        priority: priority,
        predictedPath: this.predictEntityPath(enemy, futureFrames)
      });
    }
    
    // Map all asteroids
    for (const asteroid of asteroids) {
      threats.push({
        entity: asteroid,
        type: 'asteroid',
        x: asteroid.x,
        y: asteroid.y,
        vx: (asteroid.dx || 0) / 60,
        vy: (asteroid.dy || 0) / 60,
        radius: 60,
        priority: 0.6,
        predictedPath: this.predictEntityPath(asteroid, futureFrames)
      });
    }
    
    // Map boss if present
    if (boss && !boss.isDefeated) {
      threats.push({
        entity: boss,
        type: 'boss',
        x: boss.x,
        y: boss.y,
        vx: (boss.dx || 0) / 60,
        vy: (boss.dy || 0) / 60,
        radius: 150,
        priority: 0.8,
        predictedPath: this.predictEntityPath(boss, futureFrames)
      });
    }
    
    return threats;
  }

  // Calculate safe movement vector towards objective while avoiding all threats
  calculateSafeMovement(objective, allThreats) {
    const playerSpeed = GAME_CONFIG.PLAYER_SPEED;
    
    // Calculate direct vector to objective
    const directX = objective.x - this.player.x;
    const directY = objective.y - this.player.y;
    const directDistance = Math.sqrt(directX * directX + directY * directY);
    
    if (directDistance === 0) {
      return { x: 0, y: 0 };
    }
    
    // Normalize direct vector
    const directNormX = directX / directDistance;
    const directNormY = directY / directDistance;
    
    // Test multiple movement directions to find the safest path
    const testAngles = [];
    const baseAngle = Math.atan2(directY, directX);
    
    // Primary direction: towards objective
    testAngles.push(baseAngle);
    
    // Secondary directions: slight deviations from direct path
    for (let i = 1; i <= 8; i++) {
      const deviation = (Math.PI / 16) * i; // 11.25 degree increments
      testAngles.push(baseAngle + deviation);
      testAngles.push(baseAngle - deviation);
    }
    
    // Find the safest direction
    let bestDirection = null;
    let bestSafety = -1;
    
    for (const angle of testAngles) {
      const testX = Math.cos(angle);
      const testY = Math.sin(angle);
      
      // Calculate safety score for this direction
      const safety = this.calculateDirectionSafety(testX, testY, allThreats, playerSpeed);
      
      if (safety > bestSafety) {
        bestSafety = safety;
        bestDirection = { x: testX, y: testY };
      }
    }
    
    // If no safe direction found, use emergency avoidance
    if (bestSafety < 0.1) {
      return this.calculateEmergencyAvoidance(allThreats);
    }
    
    // Scale movement based on objective priority and safety
    const movementScale = Math.min(1.0, objective.priority * bestSafety);
    
    return {
      x: bestDirection.x * movementScale,
      y: bestDirection.y * movementScale
    };
  }

  // Calculate safety score for a movement direction
  calculateDirectionSafety(dirX, dirY, allThreats, playerSpeed) {
    let safetyScore = 1.0;
    const lookAheadFrames = 45; // Increased lookahead for better prediction
    
    // Test multiple points along the movement path
    for (let frame = 1; frame <= lookAheadFrames; frame++) {
      const futureX = this.player.x + dirX * playerSpeed * frame;
      const futureY = this.player.y + dirY * playerSpeed * frame;
      
      // Check safety at this future position
      for (const threat of allThreats) {
        const threatFutureX = threat.x + (threat.vx || ((threat.dx || 0) / 60)) * frame;
        const threatFutureY = threat.y + (threat.vy || ((threat.dy || 0) / 60)) * frame;
        
        const distance = Math.sqrt((futureX - threatFutureX) ** 2 + (futureY - threatFutureY) ** 2);
        const safeDistance = threat.radius;
        
        if (distance < safeDistance) {
          // Collision detected - heavily penalize this direction
          const danger = (safeDistance - distance) / safeDistance;
          let penalty = danger * threat.priority * (1.0 - frame / lookAheadFrames);
          
          // Extra penalty for bullets and lasers
          if (threat.type === 'bullet') {
            penalty *= 3.0; // Much higher penalty for bullets
          } else if (threat.type === 'laser') {
            penalty *= 2.5; // High penalty for lasers
          }
          
          safetyScore -= penalty;
        } else if (distance < safeDistance * 1.5) {
          // Near miss - small penalty to prefer safer routes
          const nearMiss = (safeDistance * 1.5 - distance) / (safeDistance * 0.5);
          let penalty = nearMiss * threat.priority * 0.2;
          
          if (threat.type === 'bullet' || threat.type === 'laser') {
            penalty *= 2.0; // Avoid getting close to projectiles
          }
          
          safetyScore -= penalty;
        }
      }
      
      // Strong corner avoidance - prevent getting within 50px of edges
      const edgeBuffer = 50;
      const cornerPenalty = this.calculateCornerPenalty(futureX, futureY, edgeBuffer);
      safetyScore -= cornerPenalty;
      
      // Penalize going off-screen completely
      if (futureX < 0 || futureX > window.innerWidth || 
          futureY < 0 || futureY > window.innerHeight) {
        safetyScore -= 2.0; // Heavy penalty for going off-screen
      }
    }
    
    // Add bonus for directions that move us closer to center
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const currentDistanceFromCenter = Math.sqrt((this.player.x - centerX) ** 2 + (this.player.y - centerY) ** 2);
    
    // Calculate where we'd be after this movement
    const futureX = this.player.x + dirX * playerSpeed * 15; // Look ahead 15 frames
    const futureY = this.player.y + dirY * playerSpeed * 15;
    const futureDistanceFromCenter = Math.sqrt((futureX - centerX) ** 2 + (futureY - centerY) ** 2);
    
    // Bonus for moving towards center, penalty for moving away
    if (futureDistanceFromCenter < currentDistanceFromCenter) {
      safetyScore += 0.2; // Bonus for moving toward center
    } else if (futureDistanceFromCenter > currentDistanceFromCenter) {
      safetyScore -= 0.1; // Small penalty for moving away from center
    }
    
    return Math.max(0, safetyScore);
  }

  // Calculate penalty for being near screen corners/edges
  calculateCornerPenalty(x, y, edgeBuffer) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    let penalty = 0;
    
    // Distance from each edge
    const distanceFromLeft = x;
    const distanceFromRight = width - x;
    const distanceFromTop = y;
    const distanceFromBottom = height - y;
    
    // Apply exponential penalty as we get closer to edges
    if (distanceFromLeft < edgeBuffer) {
      const ratio = 1 - (distanceFromLeft / edgeBuffer);
      penalty += ratio * ratio * 2.0; // Quadratic penalty
    }
    if (distanceFromRight < edgeBuffer) {
      const ratio = 1 - (distanceFromRight / edgeBuffer);
      penalty += ratio * ratio * 2.0;
    }
    if (distanceFromTop < edgeBuffer) {
      const ratio = 1 - (distanceFromTop / edgeBuffer);
      penalty += ratio * ratio * 2.0;
    }
    if (distanceFromBottom < edgeBuffer) {
      const ratio = 1 - (distanceFromBottom / edgeBuffer);
      penalty += ratio * ratio * 2.0;
    }
    
    // Extra penalty for corners (multiple edges close)
    const nearCorner = (distanceFromLeft < edgeBuffer || distanceFromRight < edgeBuffer) &&
                       (distanceFromTop < edgeBuffer || distanceFromBottom < edgeBuffer);
    if (nearCorner) {
      penalty += 1.0; // Extra corner penalty
    }
    
    return penalty;
  }

  // Emergency avoidance when no safe direction found
  calculateEmergencyAvoidance(allThreats) {
    // Find the direction with the least immediate danger
    let bestAngle = 0;
    let minDanger = Infinity;
    
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const testX = this.player.x + Math.cos(angle) * 50;
      const testY = this.player.y + Math.sin(angle) * 50;
      
      let danger = 0;
      for (const threat of allThreats) {
        const distance = Math.sqrt((testX - threat.x) ** 2 + (testY - threat.y) ** 2);
        if (distance < threat.radius * 2) {
          danger += threat.priority * (1.0 - distance / (threat.radius * 2));
        }
      }
      
      if (danger < minDanger) {
        minDanger = danger;
        bestAngle = angle;
      }
    }
    
    return {
      x: Math.cos(bestAngle) * 0.5, // Cautious movement in emergency
      y: Math.sin(bestAngle) * 0.5
    };
  }

  // Helper methods for the new system
  predictEntityPath(entity, frames) {
    const path = [];
    for (let i = 0; i <= frames; i += 5) {
      path.push({
        x: entity.x + ((entity.vx !== undefined ? entity.vx : (entity.dx || 0) / 60)) * i,
        y: entity.y + ((entity.vy !== undefined ? entity.vy : (entity.dy || 0) / 60)) * i,
        frame: i
      });
    }
    return path;
  }

  calculateThreatDensity(x, y, enemies, enemyBullets, enemyLasers, asteroids) {
    const radius = 120; // Increased detection radius
    let threatCount = 0;
    
    for (const bullet of enemyBullets) {
      const distance = Math.sqrt((bullet.x - x) ** 2 + (bullet.y - y) ** 2);
      if (distance < radius) {
        // Weight bullets by proximity - closer bullets are much more dangerous
        const proximityFactor = Math.max(0, (radius - distance) / radius);
        threatCount += 3 * (1 + proximityFactor); // Much higher weight for bullets
      }
    }
    
    for (const laser of enemyLasers) {
      const distance = Math.sqrt((laser.x - x) ** 2 + (laser.y - y) ** 2);
      if (distance < radius) {
        const proximityFactor = Math.max(0, (radius - distance) / radius);
        threatCount += 2.5 * (1 + proximityFactor); // High weight for lasers
      }
    }
    
    for (const enemy of enemies) {
      const distance = Math.sqrt((enemy.x - x) ** 2 + (enemy.y - y) ** 2);
      if (distance < radius) threatCount += 1;
    }
    
    for (const asteroid of asteroids) {
      const distance = Math.sqrt((asteroid.x - x) ** 2 + (asteroid.y - y) ** 2);
      if (distance < radius) threatCount += 0.5;
    }
    
    return Math.min(1.0, threatCount / 8); // Lower denominator for higher sensitivity
  }

  findBestEscapePoint(enemies, enemyBullets, enemyLasers, asteroids, boss) {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const escapeRadius = 150;
    
    // Test points in a circle around current position
    let bestPoint = { x: centerX, y: centerY };
    let bestSafety = 0;
    
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const testX = this.player.x + Math.cos(angle) * escapeRadius;
      const testY = this.player.y + Math.sin(angle) * escapeRadius;
      
      // Ensure point is on screen
      if (testX < 50 || testX > window.innerWidth - 50 || 
          testY < 50 || testY > window.innerHeight - 50) {
        continue;
      }
      
      const safety = 1.0 - this.calculateThreatDensity(testX, testY, enemies, enemyBullets, enemyLasers, asteroids);
      
      if (safety > bestSafety) {
        bestSafety = safety;
        bestPoint = { x: testX, y: testY };
      }
    }
    
    return bestPoint;
  }

  isPathSafe(startX, startY, endX, endY, enemies, enemyBullets, enemyLasers, asteroids, boss) {
    const steps = 10;
    const dx = (endX - startX) / steps;
    const dy = (endY - startY) / steps;
    
    for (let i = 0; i <= steps; i++) {
      const x = startX + dx * i;
      const y = startY + dy * i;
      
      // Check if this point is too close to any threat
      const density = this.calculateThreatDensity(x, y, enemies, enemyBullets, enemyLasers, asteroids);
      if (density > 0.5) {
        return false;
      }
    }
    
    return true;
  }

  getPowerupPriority(powerup) {
    switch (powerup.type) {
      case 'bomb': return 0.9;
      case 'rainbowStar': return 0.95;
      case 'shield': return 0.8;
      case 'mainWeapon': return 0.7;
      case 'sideWeapon': return 0.6;
      default: return 0.5;
    }
  }

  // Find immediate bullet threats that require urgent dodging
  findImmediateBulletThreat(enemyBullets, enemyLasers) {
    const urgentRadius = 120; // Radius for immediate threat detection
    const playerX = this.player.x;
    const playerY = this.player.y;
    
    // Check all bullets for immediate threats
    for (const bullet of enemyBullets) {
      const distance = Math.sqrt((bullet.x - playerX) ** 2 + (bullet.y - playerY) ** 2);
      
      if (distance < urgentRadius) {
        // Calculate collision trajectory
        const bulletVx = bullet.vx !== undefined ? bullet.vx : (bullet.dx || 0) / 60;
        const bulletVy = bullet.vy !== undefined ? bullet.vy : (bullet.dy || 0) / 60;
        
        // Predict where bullet will be in next few frames
        const collisionFrames = this.predictCollisionTime(bullet, playerX, playerY);
        
        if (collisionFrames > 0 && collisionFrames < 60) {
          // Find perpendicular escape vector
          const escapeVector = this.calculatePerpendicularEscape(bullet, playerX, playerY);
          return escapeVector;
        }
      }
    }
    
    // Check all lasers for immediate threats
    for (const laser of enemyLasers) {
      const distance = Math.sqrt((laser.x - playerX) ** 2 + (laser.y - playerY) ** 2);
      
      if (distance < urgentRadius) {
        const collisionFrames = this.predictCollisionTime(laser, playerX, playerY);
        
        if (collisionFrames > 0 && collisionFrames < 60) {
          const escapeVector = this.calculatePerpendicularEscape(laser, playerX, playerY);
          return escapeVector;
        }
      }
    }
    
    return null;
  }

  // Predict when a projectile will collide with player
  predictCollisionTime(projectile, playerX, playerY) {
    const dx = projectile.x - playerX;
    const dy = projectile.y - playerY;
    const vx = projectile.vx !== undefined ? projectile.vx : (projectile.dx || 0) / 60;
    const vy = projectile.vy !== undefined ? projectile.vy : (projectile.dy || 0) / 60;
    
    // If projectile isn't moving towards player, no collision
    if (dx * vx + dy * vy >= 0) return -1;
    
    // Simple collision prediction
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed === 0) return -1;
    
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance / speed;
  }

  // Calculate perpendicular escape vector from a projectile
  calculatePerpendicularEscape(projectile, playerX, playerY) {
    const vx = projectile.vx !== undefined ? projectile.vx : (projectile.dx || 0) / 60;
    const vy = projectile.vy !== undefined ? projectile.vy : (projectile.dy || 0) / 60;
    const speed = Math.sqrt(vx * vx + vy * vy);
    
    if (speed === 0) {
      // If projectile isn't moving, escape away from it
      const dx = playerX - projectile.x;
      const dy = playerY - projectile.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist > 0 ? { x: dx / dist, y: dy / dist } : { x: 1, y: 0 };
    }
    
    // Calculate perpendicular vectors to projectile motion
    const perpX1 = -vy / speed;
    const perpY1 = vx / speed;
    const perpX2 = vy / speed;
    const perpY2 = -vx / speed;
    
    // Choose the perpendicular direction that moves away from projectile
    const toProjectileX = projectile.x - playerX;
    const toProjectileY = projectile.y - playerY;
    
    const dot1 = perpX1 * toProjectileX + perpY1 * toProjectileY;
    const dot2 = perpX2 * toProjectileX + perpY2 * toProjectileY;
    
    // Choose direction that moves away from projectile
    if (dot1 < dot2) {
      return { x: perpX1, y: perpY1 };
    } else {
      return { x: perpX2, y: perpY2 };
    }
  }

  // Find laser enemies that have locked onto the player's position
  findLaserTargetThreat(enemies) {
    const playerX = this.player.x;
    const playerY = this.player.y;
    const dangerRadius = 80; // Radius around locked target position that's dangerous
    
    for (const enemy of enemies) {
      if (enemy.type === 'laser') {
        // Check if laser is in preview or firing phase (when target is locked)
        if (enemy.laserState === 'preview' || enemy.laserState === 'firing') {
          // Get the target position that the laser has locked onto
          const targetX = enemy.targetX;
          const targetY = enemy.targetY;
          
          if (targetX !== undefined && targetY !== undefined) {
            // Check if player is currently near the laser's target zone
            const distanceToTarget = Math.sqrt(
              (playerX - targetX) ** 2 + (playerY - targetY) ** 2
            );
            
            if (distanceToTarget < dangerRadius) {
              // Find safe escape point away from the laser target zone
              const escapePoint = this.calculateLaserEscapePoint(
                targetX, targetY, enemy.x, enemy.y, dangerRadius
              );
              
              return escapePoint;
            }
          }
        }
        
        // Also check charging lasers to get ready to dodge
        if (enemy.laserState === 'charging') {
          // If we're close to the laser enemy, start moving away early
          const distanceToLaser = Math.sqrt(
            (playerX - enemy.x) ** 2 + (playerY - enemy.y) ** 2
          );
          
          if (distanceToLaser < 150) {
            // Pre-emptive dodge: move away from laser enemy
            const dx = playerX - enemy.x;
            const dy = playerY - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
              // Move to a position 100 pixels away from the laser
              const escapeDistance = 100;
              const escapeX = playerX + (dx / distance) * escapeDistance;
              const escapeY = playerY + (dy / distance) * escapeDistance;
              
              // Keep escape point on screen
              const clampedX = Math.max(50, Math.min(window.innerWidth - 50, escapeX));
              const clampedY = Math.max(50, Math.min(window.innerHeight - 50, escapeY));
              
              return { x: clampedX, y: clampedY };
            }
          }
        }
      }
    }
    
    return null;
  }

  // Calculate safe escape point away from laser target zone
  calculateLaserEscapePoint(targetX, targetY, laserX, laserY, dangerRadius) {
    const playerX = this.player.x;
    const playerY = this.player.y;
    
    // Calculate perpendicular directions to the laser beam
    const laserDx = targetX - laserX;
    const laserDy = targetY - laserY;
    const laserLength = Math.sqrt(laserDx * laserDx + laserDy * laserDy);
    
    if (laserLength > 0) {
      // Perpendicular vectors to laser direction
      const perpX1 = -laserDy / laserLength;
      const perpY1 = laserDx / laserLength;
      const perpX2 = laserDy / laserLength;
      const perpY2 = -laserDx / laserLength;
      
      // Test both perpendicular directions
      const escapeDistance = dangerRadius + 50; // Extra safety margin
      
      const option1X = targetX + perpX1 * escapeDistance;
      const option1Y = targetY + perpY1 * escapeDistance;
      const option2X = targetX + perpX2 * escapeDistance;
      const option2Y = targetY + perpY2 * escapeDistance;
      
      // Choose the option that's closer to player and on screen
      const dist1 = Math.sqrt((option1X - playerX) ** 2 + (option1Y - playerY) ** 2);
      const dist2 = Math.sqrt((option2X - playerX) ** 2 + (option2Y - playerY) ** 2);
      
      const onScreen1 = option1X >= 50 && option1X <= window.innerWidth - 50 && 
                       option1Y >= 50 && option1Y <= window.innerHeight - 50;
      const onScreen2 = option2X >= 50 && option2X <= window.innerWidth - 50 && 
                       option2Y >= 50 && option2Y <= window.innerHeight - 50;
      
      if (onScreen1 && (!onScreen2 || dist1 < dist2)) {
        return { x: option1X, y: option1Y };
      } else if (onScreen2) {
        return { x: option2X, y: option2Y };
      }
    }
    
    // Fallback: move directly away from target
    const dx = playerX - targetX;
    const dy = playerY - targetY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      const escapeDistance = dangerRadius + 50;
      const escapeX = targetX + (dx / distance) * escapeDistance;
      const escapeY = targetY + (dy / distance) * escapeDistance;
      
      return {
        x: Math.max(50, Math.min(window.innerWidth - 50, escapeX)),
        y: Math.max(50, Math.min(window.innerHeight - 50, escapeY))
      };
    }
    
    // Final fallback: move to center
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  // Count projectiles near the player
  countNearbyProjectiles(enemyBullets, enemyLasers, radius) {
    let count = 0;
    const playerX = this.player.x;
    const playerY = this.player.y;
    
    for (const bullet of enemyBullets) {
      const distance = Math.sqrt((bullet.x - playerX) ** 2 + (bullet.y - playerY) ** 2);
      if (distance < radius) count++;
    }
    
    for (const laser of enemyLasers) {
      const distance = Math.sqrt((laser.x - playerX) ** 2 + (laser.y - playerY) ** 2);
      if (distance < radius) count++;
    }
    
    return count;
  }

  // Detect boss phase changes to trigger defensive abilities
  detectBossPhaseChange(boss) {
    if (!boss || boss.isDefeated) {
      this.lastBossPhase = null;
      this.lastBossArmsDestroyed = null;
      return false;
    }

    let phaseChanged = false;

    // Check for phase transitions
    if (boss.finalPhase && this.lastBossPhase !== 'final') {
      this.lastBossPhase = 'final';
      phaseChanged = true;
    } else if (!boss.finalPhase && this.lastBossPhase === 'final') {
      this.lastBossPhase = 'normal';
      phaseChanged = true;
    }

    // Check for arm destruction (if boss has arms)
    if (boss.leftArm && boss.rightArm) {
      const armsDestroyed = (boss.leftArm.destroyed ? 1 : 0) + (boss.rightArm.destroyed ? 1 : 0);
      if (armsDestroyed !== this.lastBossArmsDestroyed) {
        this.lastBossArmsDestroyed = armsDestroyed;
        phaseChanged = true;
      }
    }

    return phaseChanged;
  }

  // Calculate precise threat with collision trajectory analysis
  calculatePreciseThreatVector(entity, avoidRadius, futureFrames) {
    // Get entity velocity vector
    let entityVx = 0;
    let entityVy = 0;
    
    if (entity.vx !== undefined && entity.vy !== undefined) {
      entityVx = entity.vx;
      entityVy = entity.vy;
    } else if (entity.dx !== undefined && entity.dy !== undefined) {
      entityVx = entity.dx / 60;
      entityVy = entity.dy / 60;
    } else if (entity.dx !== undefined && entity.dy !== undefined) {
      entityVx = entity.dx;
      entityVy = entity.dy;
    }
    
    // Calculate collision trajectory
    const collisionInfo = this.calculateCollisionTrajectory(
      entity.x, entity.y, entityVx, entityVy,
      this.player.x, this.player.y, 
      avoidRadius, futureFrames,
      (this.player.vx !== undefined ? this.player.vx : (this.player.dx || 0) / 60), 
      (this.player.vy !== undefined ? this.player.vy : (this.player.dy || 0) / 60)
    );
    
    if (!collisionInfo.willCollide) {
      return { x: 0, y: 0, strength: 0, isUrgent: false };
    }
    
    // Calculate urgency based on time to collision
    const isUrgent = collisionInfo.timeToCollision < futureFrames * 0.6; // Urgent if collision within 60% of prediction time
    const strength = Math.max(0, 1.0 - (collisionInfo.timeToCollision / futureFrames));
    
    // Calculate optimal dodge direction based on trajectory
    const dodgeVector = this.calculateTrajectoryDodgeVector(
      entity.x, entity.y, entityVx, entityVy,
      collisionInfo.timeToCollision
    );
    
    return {
      x: dodgeVector.x,
      y: dodgeVector.y,
      strength: strength,
      isUrgent: isUrgent
    };
  }

  // Calculate if and when a moving entity will collide with player
  calculateCollisionTrajectory(entityX, entityY, entityVx, entityVy, playerX, playerY, safeRadius, maxFrames, playerVx = 0, playerVy = 0) {
    // If entity isn't moving, use simple distance check
    if (Math.abs(entityVx) < 0.1 && Math.abs(entityVy) < 0.1) {
      const distance = Math.sqrt((entityX - playerX) ** 2 + (entityY - playerY) ** 2);
      return {
        willCollide: distance < safeRadius,
        timeToCollision: distance < safeRadius ? 0 : Infinity,
        closestDistance: distance
      };
    }
    
    // Calculate relative position and velocity (accounting for player movement)
    const relativeX = entityX - playerX;
    const relativeY = entityY - playerY;
    const relativeVx = entityVx - playerVx; // Account for player velocity
    const relativeVy = entityVy - playerVy;
    
    // Find closest approach using quadratic formula
    // Distance² = (relativeX + relativeVx * t)² + (relativeY + relativeVy * t)²
    // Minimize by taking derivative and setting to 0
    
    const a = relativeVx * relativeVx + relativeVy * relativeVy;
    const b = 2 * (relativeX * relativeVx + relativeY * relativeVy);
    const c = relativeX * relativeX + relativeY * relativeY;
    
    let timeToClosest = 0;
    if (Math.abs(a) > 0.001) {
      timeToClosest = -b / (2 * a);
      timeToClosest = Math.max(0, Math.min(maxFrames, timeToClosest)); // Clamp to valid range
    }
    
    // Calculate position at closest approach
    const closestX = entityX + entityVx * timeToClosest;
    const closestY = entityY + entityVy * timeToClosest;
    const closestDistance = Math.sqrt((closestX - playerX) ** 2 + (closestY - playerY) ** 2);
    
    // Check if trajectory will result in collision
    const willCollide = closestDistance < safeRadius && timeToClosest < maxFrames;
    
    return {
      willCollide: willCollide,
      timeToCollision: timeToClosest,
      closestDistance: closestDistance
    };
  }

  // Calculate optimal dodge direction based on entity trajectory
  calculateTrajectoryDodgeVector(entityX, entityY, entityVx, entityVy, timeToCollision) {
    // Predict where the entity will be at collision time
    const collisionX = entityX + entityVx * timeToCollision;
    const collisionY = entityY + entityVy * timeToCollision;
    
    // Calculate perpendicular vector to entity's motion
    const entitySpeed = Math.sqrt(entityVx * entityVx + entityVy * entityVy);
    if (entitySpeed > 0) {
      // Two perpendicular directions to entity motion
      const perpX1 = -entityVy / entitySpeed;
      const perpY1 = entityVx / entitySpeed;
      const perpX2 = entityVy / entitySpeed;
      const perpY2 = -entityVx / entitySpeed;
      
      // Choose the perpendicular direction that moves away from entity's current position
      const toEntityX = entityX - this.player.x;
      const toEntityY = entityY - this.player.y;
      
      const dot1 = perpX1 * toEntityX + perpY1 * toEntityY;
      const dot2 = perpX2 * toEntityX + perpY2 * toEntityY;
      
      // Choose direction that moves away from entity
      if (dot1 < dot2) {
        return { x: perpX1, y: perpY1 };
      } else {
        return { x: perpX2, y: perpY2 };
      }
    } else {
      // For stationary threats, dodge away from entity
      const dx = this.player.x - entityX;
      const dy = this.player.y - entityY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return {
        x: dist > 0 ? dx / dist : 1,
        y: dist > 0 ? dy / dist : 0
      };
    }
  }

  // Calculate the safest direction to move away from a threat
  calculateOptimalEscapeVector(entity, distance) {
    if (distance === 0) {
      // If exactly on top, choose a random safe direction
      const safeAngle = this.findSafestDirection();
      return {
        x: Math.cos(safeAngle),
        y: Math.sin(safeAngle)
      };
    }
    
    // Basic avoidance vector (away from threat)
    const basicAvoidX = (this.player.x - entity.x) / distance;
    const basicAvoidY = (this.player.y - entity.y) / distance;
    
    // Check if this direction would take us off-screen or into other dangers
    const testX = this.player.x + basicAvoidX * 50;
    const testY = this.player.y + basicAvoidY * 50;
    
    // Keep on screen
    if (testX < 50 || testX > window.innerWidth - 50 || 
        testY < 50 || testY > window.innerHeight - 50) {
      // Try moving towards center instead
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const toCenterX = centerX - this.player.x;
      const toCenterY = centerY - this.player.y;
      const toCenterDist = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);
      
      if (toCenterDist > 0) {
        return {
          x: toCenterX / toCenterDist,
          y: toCenterY / toCenterDist
        };
      } else {
        // Already centered, find safest escape
        const safeAngle = this.findSafestDirection();
        return {
          x: Math.cos(safeAngle),
          y: Math.sin(safeAngle)
        };
      }
    }
    
    return {
      x: basicAvoidX,
      y: basicAvoidY
    };
  }

  // Find the safest direction to move when surrounded or confused
  findSafestDirection() {
    // Test 8 directions and choose the one with least immediate danger
    const testAngles = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4];
    let safestAngle = 0;
    let lowestThreat = Infinity;
    
    for (const angle of testAngles) {
      const testX = this.player.x + Math.cos(angle) * 60;
      const testY = this.player.y + Math.sin(angle) * 60;
      
      // Check if this position is safe and on-screen
      if (testX >= 50 && testX <= window.innerWidth - 50 && 
          testY >= 50 && testY <= window.innerHeight - 50) {
        
        // This direction is valid, prefer it over going off-screen
        if (lowestThreat === Infinity) {
          safestAngle = angle;
          lowestThreat = 0;
        }
      }
    }
    
    return safestAngle;
  }

  // Check if a powerup is safe to collect
  isPowerupSafeToCollect(powerup, enemyBullets, enemyLasers) {
    const safetyRadius = 40;
    
    // Check for bullets near the powerup
    for (const bullet of enemyBullets) {
      const distance = Math.sqrt((bullet.x - powerup.x) ** 2 + (bullet.y - powerup.y) ** 2);
      if (distance < safetyRadius) {
        return false;
      }
    }
    
    // Check for lasers near the powerup
    for (const laser of enemyLasers) {
      const distance = Math.sqrt((laser.x - powerup.x) ** 2 + (laser.y - powerup.y) ** 2);
      if (distance < safetyRadius) {
        return false;
      }
    }
    
    return true;
  }

  // Check if there are valid targets for autoaim
  hasValidTargets(enemies, asteroids, boss) {
    // Check if there are any valid targets in viewport
    const hasEnemiesInView = enemies.some(enemy => 
      enemy.x >= 0 && enemy.x <= window.innerWidth &&
      enemy.y >= 0 && enemy.y <= window.innerHeight
    );
    const hasAsteroidsInView = asteroids.some(asteroid => 
      asteroid.x >= 0 && asteroid.x <= window.innerWidth &&
      asteroid.y >= 0 && asteroid.y <= window.innerHeight
    );
    const hasBossInView = boss && !boss.isDefeated &&
      boss.x >= -100 && boss.x <= window.innerWidth + 100 &&
      boss.y >= -100 && boss.y <= window.innerHeight + 100;
    
    return hasEnemiesInView || hasAsteroidsInView || hasBossInView;
  }
}