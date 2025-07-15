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
  handleAutoplayAbilities(enemies, enemyBullets, enemyLasers, asteroids, boss, keys, powerups = [], game = null) {
    this.autoplayShieldTimer++;
    this.autoplaySlowTimer++;
    this.autoplayBombTimer++;
    
    // Calculate immediate threat level
    const threatLevel = this.calculateThreatLevel(enemies, enemyBullets, enemyLasers, asteroids, boss);
    
    // Remove powerup-based shield usage - keep abilities for emergencies only
    
    // Shield usage - more aggressive during boss fights
    const projectileCount = enemyBullets.length + enemyLasers.length;
    const nearbyProjectiles = this.countNearbyProjectiles(enemyBullets, enemyLasers, 120);
    const veryCloseProjectiles = this.countNearbyProjectiles(enemyBullets, enemyLasers, 50);
    const nearCornerShield = this.isNearCorner(60);
    const isBossActive = boss && !boss.isDefeated;
    const isMinibossActive = enemies.some(enemy => enemy.type === 'miniboss' || enemy.isMiniboss);
    
    // More aggressive thresholds during boss fights
    const bossModifier = (isBossActive || isMinibossActive) ? 0.7 : 1.0; // 30% more aggressive
    
    const shouldUseShield = (
      (threatLevel >= (0.8 * bossModifier) || // Lower threshold during boss fights
       (nearbyProjectiles >= Math.floor(6 * bossModifier) && veryCloseProjectiles >= 2) || // Fewer projectiles needed during boss
       (nearCornerShield && nearbyProjectiles >= Math.floor(4 * bossModifier) && threatLevel >= (0.6 * bossModifier)) || // More aggressive when cornered during boss
       (isBossActive && nearbyProjectiles >= 4 && threatLevel >= 0.5) || // Boss-specific condition
       (isMinibossActive && nearbyProjectiles >= 3 && threatLevel >= 0.4) || // Miniboss-specific condition
       (projectileCount >= Math.floor(25 * bossModifier) && nearbyProjectiles >= Math.floor(5 * bossModifier))) && // Screen overwhelmed
      !this.player.isShielding && // Not already shielding
      this.player.shieldCooldown <= 0 && // Shield is available
      this.autoplayShieldTimer > (isBossActive || isMinibossActive ? 120 : 180) // Shorter cooldown during boss fights
    );
    
    if (shouldUseShield) {
      keys.shift = true; // Trigger shield activation (using correct input property)
      this.autoplayShieldTimer = 0; // Reset timer
      console.log('Autoplayer: Activating Shield! Threat:', threatLevel.toFixed(2), 'Nearby:', nearbyProjectiles, 'VeryClose:', veryCloseProjectiles, 'InCorner:', nearCornerShield, 'Boss:', isBossActive, 'Miniboss:', isMinibossActive, 'Total:', projectileCount);
    }
    
    // Time slow usage - more aggressive during boss fights
    const bossPhaseChange = this.detectBossPhaseChange(boss);
    const nearCornerSlow = this.isNearCorner(60);
    
    const shouldUseTimeSlow = (
      (threatLevel >= (0.9 * bossModifier) || // Lower threshold during boss fights
       (nearbyProjectiles >= Math.floor(8 * bossModifier) && veryCloseProjectiles >= Math.floor(3 * bossModifier)) || // Fewer projectiles needed during boss
       (nearCornerSlow && nearbyProjectiles >= Math.floor(6 * bossModifier) && threatLevel >= (0.7 * bossModifier)) || // More aggressive when cornered during boss
       (bossPhaseChange && threatLevel >= (0.6 * bossModifier)) || // Boss phase transition
       (isBossActive && nearbyProjectiles >= 6 && threatLevel >= 0.6) || // Boss-specific condition
       (isMinibossActive && nearbyProjectiles >= 4 && threatLevel >= 0.5) || // Miniboss-specific condition
       (projectileCount >= Math.floor(30 * bossModifier) && nearbyProjectiles >= Math.floor(7 * bossModifier))) && // Screen overwhelmed
      this.autoplaySlowTimer > (isBossActive || isMinibossActive ? 180 : 240) && // Shorter cooldown during boss fights
      game && game.timeSlowCooldown <= 0 && !game.timeSlowActive // Time slow is available
    );
    
    if (shouldUseTimeSlow) {
      keys.f = true; // Trigger time slow
      this.autoplaySlowTimer = 0; // Reset timer
      console.log('Autoplayer: Activating Time Slow! Threat:', threatLevel.toFixed(2), 'Nearby:', nearbyProjectiles, 'VeryClose:', veryCloseProjectiles, 'InCorner:', nearCornerSlow, 'Boss:', isBossActive, 'Miniboss:', isMinibossActive, 'Total:', projectileCount);
    }
    
    // Check if player is near a corner (within 80px of edges)
    const nearCorner = this.isNearCorner(80);
    const manyNearbyBullets = nearbyProjectiles >= 5; // 5+ bullets nearby
    
    // Bomb usage - activate in extreme situations, when cornered, or with many nearby bullets
    const shouldUseBomb = (
      (threatLevel >= 0.9 || // Extreme threat level
       (enemyBullets.length > 25) || // Screen full of bullets
       (boss && !boss.isDefeated && boss.finalPhase && threatLevel >= 0.6) || // Boss final phase
       (enemies.length > 10 && threatLevel >= 0.7) || // Many enemies with high threat
       (nearCorner && manyNearbyBullets && threatLevel >= 0.5) || // Cornered with many bullets
       (nearCorner && projectileCount >= 15 && threatLevel >= 0.4)) && // Cornered with screen full of bullets
      this.autoplayBombTimer > 180 && // Reduced to 3 seconds between bomb considerations
      game && game.bombCount > 0 // Only if bombs are available
    );
    
    if (shouldUseBomb) {
      keys.z = true; // Trigger bomb (game will check if bombs are available)
      this.autoplayBombTimer = 0; // Reset timer
      console.log('Autoplayer: Using Bomb! Threat level:', threatLevel.toFixed(2), 'In corner:', nearCorner, 'Nearby bullets:', nearbyProjectiles);
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
  calculateDodgeVector(enemies, enemyBullets, enemyLasers, asteroids, boss, powerups = [], timeSlowActive = false) {
    if (!this.autoplayMovementTimer) this.autoplayMovementTimer = 0;
    this.autoplayMovementTimer += 1;

    // Calculate slowdown factor for time slow mode
    const slowdownFactor = timeSlowActive ? 0.3 : 1.0;

    // Step 1: Determine current point objective
    const objective = this.calculatePointObjective(enemies, enemyBullets, enemyLasers, asteroids, boss, powerups);
    
    // Step 2: Create comprehensive threat map with slowdown factor
    const allThreats = this.mapAllThreats(enemies, enemyBullets, enemyLasers, asteroids, boss, slowdownFactor);
    
    // Step 3: Find safe path to objective accounting for time slow
    const safeMovement = this.calculateSafeMovement(objective, allThreats, slowdownFactor);
    
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
    
    // Check for powerups more aggressively - larger range, less strict safety requirements
    if (powerups && powerups.length > 0) {
      let bestPowerup = null;
      let bestScore = 0;
      
      for (const powerup of powerups) {
        const distance = Math.sqrt((powerup.x - this.player.x) ** 2 + (powerup.y - this.player.y) ** 2);
        // Increased range from 300 to 500 pixels
        if (distance < 500) {
          const powerupPriority = this.getPowerupPriority(powerup);
          // Calculate score based on priority and inverse distance
          const score = powerupPriority * (1.0 - distance / 500);
          
          // More lenient safety check - only avoid immediate threats
          const isReasonablySafe = this.isPowerupReasonablySafe(powerup, enemyBullets, enemyLasers);
          
          if (isReasonablySafe && score > bestScore) {
            bestScore = score;
            bestPowerup = powerup;
          }
        }
      }
      
      if (bestPowerup) {
        return {
          type: 'powerup',
          x: bestPowerup.x,
          y: bestPowerup.y,
          priority: 1.2 // Higher priority than most other objectives
        };
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
    
    // During boss/miniboss fights with many bullets, look for safety pockets
    const isBossActive = boss && !boss.isDefeated;
    const isMinibossActive = enemies.some(enemy => enemy.type === 'miniboss' || enemy.isMiniboss);
    const manyProjectiles = enemyBullets.length + enemyLasers.length >= 15;
    
    if ((isBossActive || isMinibossActive) && manyProjectiles) {
      const safetyPocket = this.findSafetyPocket(enemies, enemyBullets, enemyLasers, asteroids, boss);
      if (safetyPocket) {
        console.log('Autoplayer: Found safety pocket at', safetyPocket.x.toFixed(0), safetyPocket.y.toFixed(0), 'safety score:', safetyPocket.safety.toFixed(2));
        return {
          type: 'safety_pocket',
          x: safetyPocket.x,
          y: safetyPocket.y,
          priority: 1.2 // High priority for safety pockets
        };
      }
    }
    
    // Boss/miniboss distance prioritization - stay far but centered
    const miniboss = enemies.find(enemy => enemy.type === 'miniboss' || enemy.isMiniboss);
    
    if (isBossActive || miniboss) {
      const threat = isBossActive ? boss : miniboss;
      const isPortrait = window.innerHeight > window.innerWidth;
      
      let targetX, targetY;
      
      if (isPortrait) {
        // Portrait: stay centered horizontally, maximize vertical distance
        targetX = centerX;
        
        // Determine which end of screen is farther from threat
        const distanceToTop = Math.abs(threat.y - 50);
        const distanceToBottom = Math.abs(threat.y - (window.innerHeight - 50));
        
        if (distanceToTop > distanceToBottom) {
          targetY = 100; // Stay near top
        } else {
          targetY = window.innerHeight - 100; // Stay near bottom
        }
      } else {
        // Landscape: stay centered vertically, maximize horizontal distance
        targetY = centerY;
        
        // Determine which side of screen is farther from threat
        const distanceToLeft = Math.abs(threat.x - 50);
        const distanceToRight = Math.abs(threat.x - (window.innerWidth - 50));
        
        if (distanceToLeft > distanceToRight) {
          targetX = 100; // Stay near left
        } else {
          targetX = window.innerWidth - 100; // Stay near right
        }
      }
      
      return {
        type: 'boss_distance',
        x: targetX,
        y: targetY,
        priority: 1.0 // High priority during boss fights
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
  mapAllThreats(enemies, enemyBullets, enemyLasers, asteroids, boss, slowdownFactor = 1.0) {
    const threats = [];
    const futureFrames = 90;
    
    // Map all enemy bullets as high-priority threats
    for (const bullet of enemyBullets) {
      // Apply slowdown factor to bullet velocity (bullets slow down during time slow)
      const adjustedVx = ((bullet.dx || 0) / 60) * slowdownFactor;
      const adjustedVy = ((bullet.dy || 0) / 60) * slowdownFactor;
      
      threats.push({
        entity: bullet,
        type: 'bullet',
        x: bullet.x,
        y: bullet.y,
        vx: adjustedVx,
        vy: adjustedVy,
        radius: 60, // Increased danger radius around bullet
        priority: 1.0,
        predictedPath: this.predictEntityPath(bullet, futureFrames, slowdownFactor)
      });
    }
    
    // Map all enemy lasers
    for (const laser of enemyLasers) {
      // Apply slowdown factor to laser velocity 
      const adjustedVx = ((laser.dx || 0) / 60) * slowdownFactor;
      const adjustedVy = ((laser.dy || 0) / 60) * slowdownFactor;
      
      threats.push({
        entity: laser,
        type: 'laser',
        x: laser.x,
        y: laser.y,
        vx: adjustedVx,
        vy: adjustedVy,
        radius: 70, // Increased danger radius around laser
        priority: 0.95,
        predictedPath: this.predictEntityPath(laser, futureFrames, slowdownFactor)
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
  calculateSafeMovement(objective, allThreats, slowdownFactor = 1.0) {
    const playerSpeed = GAME_CONFIG.PLAYER_SPEED;
    
    // Check for immediate danger requiring quick dodging
    const immediateDanger = this.detectImmediateDanger(allThreats);
    if (immediateDanger) {
      // AGGRESSIVE DODGE: Move quickly away from immediate threats
      return this.calculateAggressiveDodge(immediateDanger, allThreats);
    }
    
    // Calculate direct vector to objective
    const directX = objective.x - this.player.x;
    const directY = objective.y - this.player.y;
    const directDistance = Math.sqrt(directX * directX + directY * directY);
    
    if (directDistance === 0) {
      return { x: 0, y: 0 };
    }
    
    // Test many more movement directions for better pathfinding
    const testAngles = [];
    const baseAngle = Math.atan2(directY, directX);
    
    // Primary direction: towards objective
    testAngles.push(baseAngle);
    
    // Secondary directions: more granular testing for better paths
    for (let i = 1; i <= 16; i++) {
      const deviation = (Math.PI / 32) * i; // Smaller 5.625 degree increments for precision
      testAngles.push(baseAngle + deviation);
      testAngles.push(baseAngle - deviation);
    }
    
    // Find the safest direction with enhanced scoring
    let bestDirection = null;
    let bestSafety = -1;
    
    for (const angle of testAngles) {
      const testX = Math.cos(angle);
      const testY = Math.sin(angle);
      
      const safety = this.calculateDirectionSafety(testX, testY, allThreats, playerSpeed, slowdownFactor);
      
      if (safety > bestSafety) {
        bestSafety = safety;
        bestDirection = { x: testX, y: testY };
      }
    }
    
    // If no safe direction found, use emergency avoidance
    if (bestSafety < 0.1) {
      return this.calculateEmergencyAvoidance(allThreats);
    }
    
    // More aggressive movement scaling - ship is fast, use it!
    let movementScale = 1.2; // Base aggressive multiplier
    
    // Scale based on objective priority and safety
    movementScale *= Math.max(0.6, objective.priority * bestSafety);
    
    // Boost movement when many threats are around (need to move quickly)
    const threatCount = allThreats.filter(t => 
      Math.sqrt((t.x - this.player.x) ** 2 + (t.y - this.player.y) ** 2) < 150
    ).length;
    
    if (threatCount > 5) {
      movementScale *= 1.3; // Even more aggressive when surrounded
    }
    
    // Only reduce speed slightly when very close to threats
    const proximityScale = this.calculateAggressiveProximityLimit(allThreats);
    movementScale *= proximityScale;
    
    return {
      x: bestDirection.x * movementScale,
      y: bestDirection.y * movementScale
    };
  }

  // Detect immediate threats requiring urgent evasion
  detectImmediateDanger(allThreats) {
    const immediateRadius = 80; // Threats within 80px are immediate danger
    const immediateDangers = [];
    
    for (const threat of allThreats) {
      const distance = Math.sqrt((threat.x - this.player.x) ** 2 + (threat.y - this.player.y) ** 2);
      
      // Check for immediate collision threats
      if (distance < immediateRadius) {
        // For bullets and lasers, also check their trajectory
        if (threat.type === 'bullet' || threat.type === 'laser') {
          const timeToImpact = this.calculateTimeToImpact(threat);
          if (timeToImpact > 0 && timeToImpact < 30) { // 0.5 seconds at 60fps
            immediateDangers.push({ threat, distance, timeToImpact });
          }
        } else {
          // Static threats like enemies and asteroids
          immediateDangers.push({ threat, distance, timeToImpact: 0 });
        }
      }
    }
    
    return immediateDangers.length > 0 ? immediateDangers : null;
  }

  // Calculate aggressive dodge movement for immediate threats
  calculateAggressiveDodge(immediateDangers, allThreats) {
    // Find the most urgent threat
    let mostUrgent = immediateDangers[0];
    for (const danger of immediateDangers) {
      if (danger.timeToImpact < mostUrgent.timeToImpact) {
        mostUrgent = danger;
      }
    }
    
    const threat = mostUrgent.threat;
    
    // Calculate escape vector - perpendicular to threat velocity
    let escapeX = 0;
    let escapeY = 0;
    
    if (threat.vx !== undefined && threat.vy !== undefined) {
      // For moving threats, escape perpendicular to their movement
      const threatSpeed = Math.sqrt(threat.vx * threat.vx + threat.vy * threat.vy);
      if (threatSpeed > 0) {
        // Perpendicular directions
        const perpX1 = -threat.vy / threatSpeed;
        const perpY1 = threat.vx / threatSpeed;
        const perpX2 = threat.vy / threatSpeed;
        const perpY2 = -threat.vx / threatSpeed;
        
        // Choose the perpendicular direction that moves toward center
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        const toCenterX = centerX - this.player.x;
        const toCenterY = centerY - this.player.y;
        
        const dot1 = perpX1 * toCenterX + perpY1 * toCenterY;
        const dot2 = perpX2 * toCenterX + perpY2 * toCenterY;
        
        if (dot1 > dot2) {
          escapeX = perpX1;
          escapeY = perpY1;
        } else {
          escapeX = perpX2;
          escapeY = perpY2;
        }
      }
    }
    
    if (escapeX === 0 && escapeY === 0) {
      // For static threats or if perpendicular calculation failed, move directly away
      const awayX = this.player.x - threat.x;
      const awayY = this.player.y - threat.y;
      const awayDistance = Math.sqrt(awayX * awayX + awayY * awayY);
      
      if (awayDistance > 0) {
        escapeX = awayX / awayDistance;
        escapeY = awayY / awayDistance;
      }
    }
    
    // Maximum aggressive movement - ship is fast!
    const aggressiveScale = 1.5;
    
    return {
      x: escapeX * aggressiveScale,
      y: escapeY * aggressiveScale
    };
  }

  // More aggressive proximity limit calculation
  calculateAggressiveProximityLimit(allThreats) {
    const proximityRadius = 40; // Slightly larger radius for aggressive movement
    const minMovementScale = 0.7; // Higher minimum - stay aggressive
    const maxMovementScale = 1.0;
    
    let closestThreatDistance = Infinity;
    let hasNearbyCollidableThreats = false;
    
    // Check distance to all threats
    for (const threat of allThreats) {
      const distance = Math.sqrt(
        (threat.x - this.player.x) ** 2 + (threat.y - this.player.y) ** 2
      );
      
      // Only consider very dangerous threats
      if (threat.type === 'bullet' || threat.type === 'laser' || 
          (threat.type === 'enemy' && distance < 25)) {
        
        if (distance <= proximityRadius) {
          hasNearbyCollidableThreats = true;
          closestThreatDistance = Math.min(closestThreatDistance, distance);
        }
      }
    }
    
    // If no nearby dangerous threats, allow full aggressive movement
    if (!hasNearbyCollidableThreats) {
      return maxMovementScale;
    }
    
    // Less severe slowdown for proximity
    const proximityRatio = closestThreatDistance / proximityRadius;
    return minMovementScale + (maxMovementScale - minMovementScale) * proximityRatio;
  }

  // Calculate time until threat will impact player position
  calculateTimeToImpact(threat) {
    // If threat has no velocity, it's not moving toward us
    if (!threat.vx && !threat.vy) {
      return Infinity;
    }
    
    const relativeX = this.player.x - threat.x;
    const relativeY = this.player.y - threat.y;
    const threatVx = threat.vx || 0;
    const threatVy = threat.vy || 0;
    
    // Calculate if threat is moving toward player
    const dotProduct = relativeX * threatVx + relativeY * threatVy;
    if (dotProduct <= 0) {
      // Threat is moving away from player
      return Infinity;
    }
    
    // Calculate closest approach using quadratic formula
    const a = threatVx * threatVx + threatVy * threatVy;
    const b = -2 * (relativeX * threatVx + relativeY * threatVy);
    const c = relativeX * relativeX + relativeY * relativeY;
    
    if (a === 0) return Infinity;
    
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return Infinity;
    
    const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
    const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
    
    // Return the smaller positive time
    const validTimes = [t1, t2].filter(t => t > 0);
    return validTimes.length > 0 ? Math.min(...validTimes) : Infinity;
  }

  // Calculate movement speed limit based on proximity to threats
  calculateProximityMovementLimit(allThreats) {
    const proximityRadius = 30; // 30px proximity check as requested
    const minMovementScale = 0.1; // Minimum movement scale (very slow)
    const maxMovementScale = 1.0; // Normal movement scale
    
    let closestThreatDistance = Infinity;
    let hasNearbyCollidableThreats = false;
    
    // Check distance to all threats
    for (const threat of allThreats) {
      const distance = Math.sqrt(
        (threat.x - this.player.x) ** 2 + (threat.y - this.player.y) ** 2
      );
      
      // Only consider collidable threats (enemies, asteroids, bullets, lasers)
      if (threat.type === 'enemy' || threat.type === 'asteroid' || 
          threat.type === 'bullet' || threat.type === 'laser') {
        
        if (distance <= proximityRadius) {
          hasNearbyCollidableThreats = true;
          closestThreatDistance = Math.min(closestThreatDistance, distance);
        }
      }
    }
    
    // If no nearby collidable threats, allow normal movement
    if (!hasNearbyCollidableThreats) {
      return maxMovementScale;
    }
    
    // Calculate movement scale based on closest threat distance
    // Closer threats = slower movement for precision
    const proximityRatio = closestThreatDistance / proximityRadius;
    
    // Apply exponential scaling: very slow when very close, normal when at edge
    const proximityScale = minMovementScale + 
      (maxMovementScale - minMovementScale) * (proximityRatio ** 2);
    
    // Extra slow movement if multiple threats are nearby
    let nearbyThreatCount = 0;
    for (const threat of allThreats) {
      const distance = Math.sqrt(
        (threat.x - this.player.x) ** 2 + (threat.y - this.player.y) ** 2
      );
      if (distance <= proximityRadius && 
          (threat.type === 'enemy' || threat.type === 'asteroid' || 
           threat.type === 'bullet' || threat.type === 'laser')) {
        nearbyThreatCount++;
      }
    }
    
    // Additional slowdown for multiple nearby threats
    if (nearbyThreatCount > 1) {
      const multiThreatPenalty = Math.max(0.1, 1.0 - (nearbyThreatCount - 1) * 0.2);
      return Math.min(proximityScale, proximityScale * multiThreatPenalty);
    }
    
    return proximityScale;
  }

  // Calculate safety score for a movement direction
  calculateDirectionSafety(dirX, dirY, allThreats, playerSpeed, slowdownFactor = 1.0) {
    let safetyScore = 1.0;
    const lookAheadFrames = 45; // Increased lookahead for better prediction
    
    // Player movement is also affected by slowdown factor
    const effectivePlayerSpeed = playerSpeed * slowdownFactor;
    
    // Test multiple points along the movement path
    for (let frame = 1; frame <= lookAheadFrames; frame++) {
      const futureX = this.player.x + dirX * effectivePlayerSpeed * frame;
      const futureY = this.player.y + dirY * effectivePlayerSpeed * frame;
      
      // Check safety at this future position
      for (const threat of allThreats) {
        // Threat velocities are already adjusted for slowdown factor in mapAllThreats
        const threatFutureX = threat.x + (threat.vx || 0) * frame;
        const threatFutureY = threat.y + (threat.vy || 0) * frame;
        
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
      
      // Corner avoidance - prevent getting trapped in actual corners
      const cornerBuffer = 50;
      const cornerPenalty = this.calculateCornerPenalty(futureX, futureY, cornerBuffer);
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
    
    // Remove individual edge penalties - only penalize actual corners
    // (Individual edges are fine, corners are dangerous)
    
    // Extra penalty for actual corners (two edges close simultaneously)
    const nearLeftEdge = distanceFromLeft < edgeBuffer;
    const nearRightEdge = distanceFromRight < edgeBuffer;
    const nearTopEdge = distanceFromTop < edgeBuffer;
    const nearBottomEdge = distanceFromBottom < edgeBuffer;
    
    const inActualCorner = (nearLeftEdge && nearTopEdge) ||
                          (nearRightEdge && nearTopEdge) ||
                          (nearLeftEdge && nearBottomEdge) ||
                          (nearRightEdge && nearBottomEdge);
    
    if (inActualCorner) {
      penalty += 2.0; // Heavy penalty for actual corners
    }
    
    return penalty;
  }

  // Check if player is near an actual corner of the screen (not just edges)
  isNearCorner(cornerBuffer = 80) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const distanceFromLeft = this.player.x;
    const distanceFromRight = width - this.player.x;
    const distanceFromTop = this.player.y;
    const distanceFromBottom = height - this.player.y;
    
    // Check if close to edges
    const nearLeftEdge = distanceFromLeft < cornerBuffer;
    const nearRightEdge = distanceFromRight < cornerBuffer;
    const nearTopEdge = distanceFromTop < cornerBuffer;
    const nearBottomEdge = distanceFromBottom < cornerBuffer;
    
    // Return true only if near TWO edges simultaneously (actual corner)
    return (nearLeftEdge && nearTopEdge) ||     // Top-left corner
           (nearRightEdge && nearTopEdge) ||    // Top-right corner
           (nearLeftEdge && nearBottomEdge) ||  // Bottom-left corner
           (nearRightEdge && nearBottomEdge);   // Bottom-right corner
  }

  // Check if a given position would be in a corner
  wouldBeInCorner(x, y, cornerBuffer) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const distanceFromLeft = x;
    const distanceFromRight = width - x;
    const distanceFromTop = y;
    const distanceFromBottom = height - y;
    
    const nearLeftEdge = distanceFromLeft < cornerBuffer;
    const nearRightEdge = distanceFromRight < cornerBuffer;
    const nearTopEdge = distanceFromTop < cornerBuffer;
    const nearBottomEdge = distanceFromBottom < cornerBuffer;
    
    return (nearLeftEdge && nearTopEdge) ||
           (nearRightEdge && nearTopEdge) ||
           (nearLeftEdge && nearBottomEdge) ||
           (nearRightEdge && nearBottomEdge);
  }

  // Find pockets of safety on the field during intense bullet patterns
  findSafetyPocket(enemies, enemyBullets, enemyLasers, asteroids, boss) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const cornerBuffer = 70; // Stay away from screen corners (but edges are OK)
    const safetyRadius = 80; // Size of safety pocket
    const gridSize = 40; // Test points every 40 pixels
    
    let bestSafetyScore = -1;
    let bestPocket = null;
    
    // Test grid points across the screen for safety (avoid corners but allow near edges)
    for (let x = cornerBuffer; x < width - cornerBuffer; x += gridSize) {
      for (let y = cornerBuffer; y < height - cornerBuffer; y += gridSize) {
        // Skip if this position would be in a corner
        const wouldBeInCorner = this.wouldBeInCorner(x, y, cornerBuffer);
        if (wouldBeInCorner) continue;
        const safetyScore = this.calculatePocketSafety(x, y, safetyRadius, 
          enemies, enemyBullets, enemyLasers, asteroids, boss);
        
        if (safetyScore > bestSafetyScore) {
          bestSafetyScore = safetyScore;
          bestPocket = { x, y, safety: safetyScore };
        }
      }
    }
    
    // Only return pocket if it's significantly safer than current position
    const currentSafety = this.calculatePocketSafety(this.player.x, this.player.y, safetyRadius,
      enemies, enemyBullets, enemyLasers, asteroids, boss);
    
    if (bestPocket && bestPocket.safety > currentSafety + 0.3) {
      return bestPocket;
    }
    
    return null;
  }

  // Calculate safety score for a potential pocket location
  calculatePocketSafety(x, y, radius, enemies, enemyBullets, enemyLasers, asteroids, boss) {
    let safetyScore = 1.0;
    const futureFrames = 90; // Look ahead 1.5 seconds
    
    // Check all projectiles and their future positions
    const allProjectiles = [...enemyBullets, ...enemyLasers];
    
    for (const projectile of allProjectiles) {
      for (let frame = 0; frame <= futureFrames; frame += 5) {
        const futureX = projectile.x + ((projectile.dx || 0) / 60) * frame;
        const futureY = projectile.y + ((projectile.dy || 0) / 60) * frame;
        
        const distance = Math.sqrt((x - futureX) ** 2 + (y - futureY) ** 2);
        
        if (distance < radius) {
          // Projectile will pass through this pocket
          const dangerLevel = (radius - distance) / radius;
          const timeFactor = 1.0 - (frame / futureFrames); // Nearer future = more dangerous
          safetyScore -= dangerLevel * timeFactor * 0.8;
        }
      }
    }
    
    // Check static threats (enemies, asteroids)
    const staticThreats = [...enemies, ...asteroids];
    if (boss) staticThreats.push(boss);
    
    for (const threat of staticThreats) {
      const distance = Math.sqrt((x - threat.x) ** 2 + (y - threat.y) ** 2);
      const threatRadius = (threat.size || 30) + 40; // Buffer around threats
      
      if (distance < threatRadius) {
        const dangerLevel = (threatRadius - distance) / threatRadius;
        safetyScore -= dangerLevel * 0.6;
      }
    }
    
    // Bonus for being closer to center
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const distanceFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    const maxDistance = Math.sqrt(centerX ** 2 + centerY ** 2);
    const centerBonus = (1.0 - distanceFromCenter / maxDistance) * 0.2;
    safetyScore += centerBonus;
    
    return Math.max(0, safetyScore);
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
    
    // Apply proximity-based movement limiting for emergency avoidance too
    const proximityScale = this.calculateProximityMovementLimit(allThreats);
    const emergencySpeed = 0.5 * proximityScale; // Even more cautious when near threats
    
    return {
      x: Math.cos(bestAngle) * emergencySpeed,
      y: Math.sin(bestAngle) * emergencySpeed
    };
  }

  // Helper methods for the new system
  predictEntityPath(entity, frames, slowdownFactor = 1.0) {
    const path = [];
    // Use already-adjusted velocities from threat mapping
    const vx = entity.vx !== undefined ? entity.vx : ((entity.dx || 0) / 60) * slowdownFactor;
    const vy = entity.vy !== undefined ? entity.vy : ((entity.dy || 0) / 60) * slowdownFactor;
    
    for (let i = 0; i <= frames; i += 5) {
      path.push({
        x: entity.x + vx * i,
        y: entity.y + vy * i,
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
    const trajectoryDangerRadius = 40; // Distance from trajectory line that's dangerous
    
    for (const enemy of enemies) {
      if (enemy.type === 'laser') {
        // Check if laser is in preview or firing phase (when target is locked)
        if (enemy.laserState === 'preview' || enemy.laserState === 'firing') {
          // Get the target position that the laser has locked onto
          const targetX = enemy.targetX;
          const targetY = enemy.targetY;
          
          if (targetX !== undefined && targetY !== undefined) {
            // Calculate distance from player to the laser trajectory line
            const distanceToTrajectory = this.distanceToLine(
              playerX, playerY,
              enemy.x, enemy.y,
              targetX, targetY
            );
            
            // Also check if player is in the trajectory path (not behind the laser)
            const isInTrajectoryPath = this.isPointInLaserPath(
              playerX, playerY,
              enemy.x, enemy.y,
              targetX, targetY
            );
            
            if (distanceToTrajectory < trajectoryDangerRadius && isInTrajectoryPath) {
              // Find safe escape point perpendicular to the laser trajectory
              const escapePoint = this.calculateLaserTrajectoryEscape(
                playerX, playerY,
                enemy.x, enemy.y,
                targetX, targetY,
                trajectoryDangerRadius
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

  // Calculate perpendicular distance from point to line
  distanceToLine(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      // Line has zero length
      return Math.sqrt(A * A + B * B);
    }
    
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

  // Check if point is in the laser's firing path (not behind the laser)
  isPointInLaserPath(px, py, laserX, laserY, targetX, targetY) {
    // Calculate vectors
    const laserToTarget = { x: targetX - laserX, y: targetY - laserY };
    const laserToPlayer = { x: px - laserX, y: py - laserY };
    
    // Dot product to see if player is in front of laser
    const dotProduct = laserToTarget.x * laserToPlayer.x + laserToTarget.y * laserToPlayer.y;
    
    // Player is in laser path if dot product is positive (same direction)
    return dotProduct > 0;
  }

  // Calculate safe escape point perpendicular to laser trajectory
  calculateLaserTrajectoryEscape(playerX, playerY, laserX, laserY, targetX, targetY, safeDistance) {
    // Calculate laser direction vector
    const dx = targetX - laserX;
    const dy = targetY - laserY;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) {
      // Fallback to center if no direction
      return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }
    
    // Normalized laser direction
    const dirX = dx / length;
    const dirY = dy / length;
    
    // Perpendicular directions to laser trajectory
    const perpX1 = -dirY;
    const perpY1 = dirX;
    const perpX2 = dirY;
    const perpY2 = -dirX;
    
    // Choose perpendicular direction that moves toward center
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const toCenterX = centerX - playerX;
    const toCenterY = centerY - playerY;
    
    const dot1 = perpX1 * toCenterX + perpY1 * toCenterY;
    const dot2 = perpX2 * toCenterX + perpY2 * toCenterY;
    
    const escapeDistance = safeDistance * 2; // Move well clear of trajectory
    let escapeX, escapeY;
    
    if (dot1 > dot2) {
      escapeX = playerX + perpX1 * escapeDistance;
      escapeY = playerY + perpY1 * escapeDistance;
    } else {
      escapeX = playerX + perpX2 * escapeDistance;
      escapeY = playerY + perpY2 * escapeDistance;
    }
    
    // Keep escape point on screen
    return {
      x: Math.max(50, Math.min(window.innerWidth - 50, escapeX)),
      y: Math.max(50, Math.min(window.innerHeight - 50, escapeY))
    };
  }

  // More lenient safety check for aggressive powerup collection
  isPowerupReasonablySafe(powerup, enemyBullets, enemyLasers) {
    const immediateRadius = 25; // Smaller safety radius for more aggressive collection
    
    // Only avoid bullets that are very close
    for (const bullet of enemyBullets) {
      const distance = Math.sqrt((bullet.x - powerup.x) ** 2 + (bullet.y - powerup.y) ** 2);
      if (distance < immediateRadius) {
        return false;
      }
    }
    
    // Only avoid lasers that are very close
    for (const laser of enemyLasers) {
      const distance = Math.sqrt((laser.x - powerup.x) ** 2 + (laser.y - powerup.y) ** 2);
      if (distance < immediateRadius) {
        return false;
      }
    }
    
    return true;
  }

  // Calculate optimal aim angle using autoaim logic
  calculateAutoAim(enemies, asteroids, boss, mainWeaponLevel, isPortrait, keys) {
    // Check if autoaim should be used
    const autoaimEnabled = keys.autoaimEnabled;
    const autoplayEnabled = keys.autoplayEnabled;
    
    // Handle manual aiming when autoaim/autoplay is disabled
    if (!autoaimEnabled && !autoplayEnabled && keys.mousePosition) {
      // Desktop: aim toward mouse cursor
      const dx = keys.mousePosition.x - this.player.x;
      const dy = keys.mousePosition.y - this.player.y;
      return Math.atan2(dy, dx);
    } else if (!autoaimEnabled && !autoplayEnabled) {
      // Mobile: use default orientation when not using autoaim/autoplay
      if (isPortrait) {
        return -Math.PI / 2; // Face up
      } else {
        return 0; // Face right
      }
    }

    // Build complete target list, filter out invulnerable targets
    const allTargets = [...enemies, ...asteroids].filter(target => 
      target.isVulnerableToAutoAim && target.isVulnerableToAutoAim()
    );
    
    // Add boss targetable parts if boss exists
    if (boss && !boss.isDefeated && boss.getTargetableParts) {
      allTargets.push(...boss.getTargetableParts());
    }
    
    if ((autoaimEnabled || autoplayEnabled || !keys.mousePosition) && allTargets.length > 0) {
      const target = this.selectBestTarget(allTargets, enemies, mainWeaponLevel);
      if (target) {
        return this.calculatePredictiveAim(target, mainWeaponLevel);
      }
    }
    
    // Default fallback angle
    return isPortrait ? -Math.PI / 2 : 0;
  }

  // Select the best target using priority system
  selectBestTarget(allTargets, enemies, mainWeaponLevel) {
    const bulletSpeed = this.getCurrentBulletSpeed(mainWeaponLevel);
    const shootingEnemyTypes = ["straight", "sine", "zigzag"];
    
    // Priority 1: Very close targets (within 200px) - any enemy or asteroid
    let closestNearbyTarget = null;
    let bestNearbyScore = -1;
    
    for (const target of allTargets) {
      if (this.isTargetInViewport(target)) {
        const dist = Math.sqrt((target.x - this.player.x) ** 2 + (target.y - this.player.y) ** 2);
        if (dist < 200) {
          // Calculate hit probability for this target
          const hitScore = this.calculateTargetHitScore(target, bulletSpeed, dist);
          const combinedScore = hitScore * (1.0 - dist / 200); // Closer = better
          
          if (combinedScore > bestNearbyScore) {
            bestNearbyScore = combinedScore;
            closestNearbyTarget = target;
          }
        }
      }
    }
    
    if (closestNearbyTarget) {
      return closestNearbyTarget;
    }
    
    // Priority 2: Shooting enemies (nearby ones first)
    let closestShootingEnemy = null;
    let closestShootingDistance = Infinity;
    
    for (const enemy of enemies) {
      if (shootingEnemyTypes.includes(enemy.type) && this.isTargetInViewport(enemy)) {
        const dist = Math.sqrt((enemy.x - this.player.x) ** 2 + (enemy.y - this.player.y) ** 2);
        if (dist < closestShootingDistance) {
          closestShootingDistance = dist;
          closestShootingEnemy = enemy;
        }
      }
    }
    
    if (closestShootingEnemy) {
      return closestShootingEnemy;
    }
    
    // Priority 3: Any enemies (nearby ones first)
    let closestEnemy = null;
    let closestEnemyDistance = Infinity;
    
    for (const enemy of enemies) {
      if (this.isTargetInViewport(enemy)) {
        const dist = Math.sqrt((enemy.x - this.player.x) ** 2 + (enemy.y - this.player.y) ** 2);
        if (dist < closestEnemyDistance) {
          closestEnemyDistance = dist;
          closestEnemy = enemy;
        }
      }
    }
    
    if (closestEnemy) {
      return closestEnemy;
    }
    
    // Priority 4: Asteroids (if no enemies available)
    let closestAsteroid = null;
    let closestAsteroidDistance = Infinity;
    
    for (const asteroid of allTargets) {
      if (asteroid.type === 'asteroid' && this.isTargetInViewport(asteroid)) {
        const dist = Math.sqrt((asteroid.x - this.player.x) ** 2 + (asteroid.y - this.player.y) ** 2);
        if (dist < closestAsteroidDistance) {
          closestAsteroidDistance = dist;
          closestAsteroid = asteroid;
        }
      }
    }
    
    return closestAsteroid;
  }

  // Helper function to check if target is within viewport
  isTargetInViewport(target) {
    return (
      target.x >= 0 &&
      target.x <= window.innerWidth &&
      target.y >= 0 &&
      target.y <= window.innerHeight
    );
  }

  // Get current bullet speed based on weapon level
  getCurrentBulletSpeed(level) {
    if (level === 5) return Infinity; // Laser beam is instant
    return 8; // GAME_CONFIG.BULLET_SPEED - all other levels use standard speed
  }

  // Enhanced interceptive targeting that accounts for all velocity vectors
  calculatePredictiveAim(target, mainWeaponLevel) {
    const bulletSpeed = this.getCurrentBulletSpeed(mainWeaponLevel);
    
    if (bulletSpeed === Infinity) {
      // For laser, aim directly at target
      return Math.atan2(target.y - this.player.y, target.x - this.player.x);
    }
    
    // Get target velocity
    const targetVx = target.vx !== undefined ? target.vx : (target.dx || 0) / 60;
    const targetVy = target.vy !== undefined ? target.vy : (target.dy || 0) / 60;
    
    // Get player velocity
    const playerVx = this.player.vx || 0;
    const playerVy = this.player.vy || 0;
    
    // Calculate intercept solution
    const interceptSolution = this.calculateInterceptSolution(
      this.player.x, this.player.y, playerVx, playerVy,
      target.x, target.y, targetVx, targetVy,
      bulletSpeed
    );
    
    if (interceptSolution && interceptSolution.isValid) {
      return Math.atan2(
        interceptSolution.interceptY - this.player.y,
        interceptSolution.interceptX - this.player.x
      );
    }
    
    // Fallback: direct aim
    return Math.atan2(target.y - this.player.y, target.x - this.player.x);
  }

  // Calculate intercept solution for moving targets
  calculateInterceptSolution(px, py, pvx, pvy, tx, ty, tvx, tvy, bulletSpeed) {
    // Relative position and velocity
    const rx = tx - px;
    const ry = ty - py;
    const rvx = tvx - pvx;
    const rvy = tvy - pvy;
    
    // Quadratic equation coefficients: a*t^2 + b*t + c = 0
    const a = rvx * rvx + rvy * rvy - bulletSpeed * bulletSpeed;
    const b = 2 * (rx * rvx + ry * rvy);
    const c = rx * rx + ry * ry;
    
    // Solve quadratic equation
    const discriminant = b * b - 4 * a * c;
    
    if (discriminant < 0) {
      return { isValid: false };
    }
    
    let t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
    let t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
    
    // Choose the smallest positive time
    let timeToIntercept = null;
    if (t1 > 0 && t2 > 0) {
      timeToIntercept = Math.min(t1, t2);
    } else if (t1 > 0) {
      timeToIntercept = t1;
    } else if (t2 > 0) {
      timeToIntercept = t2;
    }
    
    if (timeToIntercept === null || timeToIntercept < 0) {
      return { isValid: false };
    }
    
    // Calculate intercept point
    const interceptX = tx + tvx * timeToIntercept;
    const interceptY = ty + tvy * timeToIntercept;
    
    return {
      isValid: true,
      timeToIntercept,
      interceptX,
      interceptY
    };
  }

  // Calculate how likely we are to hit a target based on its movement pattern
  calculateTargetHitScore(target, bulletSpeed, distance) {
    // Get target velocity
    const targetVx = target.vx !== undefined ? target.vx : (target.dx || 0) / 60;
    const targetVy = target.vy !== undefined ? target.vy : (target.dy || 0) / 60;
    const targetSpeed = Math.sqrt(targetVx * targetVx + targetVy * targetVy);
    
    // Base score starts high
    let hitScore = 1.0;
    
    // Penalize fast-moving targets
    if (targetSpeed > 0) {
      const relativeSpeed = targetSpeed / bulletSpeed;
      hitScore *= Math.max(0.1, 1.0 - relativeSpeed * 0.5);
    }
    
    // Check if we can calculate a valid intercept
    const interceptSolution = this.calculateInterceptSolution(
      this.player.x, this.player.y, this.player.vx || 0, this.player.vy || 0,
      target.x, target.y, targetVx, targetVy,
      bulletSpeed
    );
    
    if (!interceptSolution.isValid) {
      hitScore *= 0.1; // Heavy penalty for untargetable enemies
    }
    
    // Bonus for targets moving predictably
    if (target.type === 'straight') {
      hitScore *= 1.2;
    } else if (target.type === 'sine') {
      hitScore *= 0.9; // Slightly harder to hit
    }
    
    return hitScore;
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