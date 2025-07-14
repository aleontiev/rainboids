// Player entity for Rainboids: Blitz
import { GAME_CONFIG } from "../constants.js";

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = GAME_CONFIG.PLAYER_SIZE;
    this.hitboxSize = GAME_CONFIG.PLAYER_HITBOX;
    this.speed = GAME_CONFIG.PLAYER_SPEED;
    this.angle = 0;
    this.shootCooldown = 0;
    this.homingMissileCooldown = 0;
    this.isShielding = false;
    this.shieldFrames = 0;
    this.shield = 0;
    this.shieldCooldown = 0;
    this.shieldCooldownMax = 300;
    this.mainWeaponLevel = 1;
    this.sideWeaponLevel = 0;
    this.secondShip = []; // Change to an array
    this.godMode = false;
    this.rollAngle = 0; // Initialize rollAngle property
    
    // Rainbow invulnerability powerup
    this.rainbowInvulnerable = false;
    this.rainbowInvulnerableTimer = 0;
    this.rainbowInvulnerableDuration = 360; // 6 seconds at 60fps

    // Velocity tracking for predictive aiming
    this.vx = 0;
    this.vy = 0;
    this.prevX = x;
    this.prevY = y;
    
    // Autoplay movement timer
    this.autoplayMovementTimer = 0;
    
    // Autoplay ability timers
    this.autoplayShieldTimer = 0;
    this.autoplaySlowTimer = 0;
    this.autoplayBombTimer = 0;
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
        const distance = Math.sqrt((powerup.x - this.x) ** 2 + (powerup.y - this.y) ** 2);
        if (distance < 150 && (powerup.type === 'bomb' || powerup.type === 'rainbowStar' || powerup.type === 'shield')) {
          nearbyValuablePowerup = true;
          break;
        }
      }
    }
    
    // Shield usage - activate when in immediate danger, going for powerups, or shield is available
    const shouldUseShield = (
      (threatLevel >= 0.7 || // High threat level
       (nearbyValuablePowerup && threatLevel >= 0.4)) && // Moderate threat but valuable powerup nearby
      !this.isShielding && // Not already shielding
      this.shieldCooldown <= 0 && // Shield is available
      this.autoplayShieldTimer > 60 // Minimum 1 second between shield considerations
    );
    
    if (shouldUseShield) {
      keys.shield = true; // Trigger shield activation
      this.autoplayShieldTimer = 0; // Reset timer
    }
    
    // Time slow usage - activate when overwhelmed or facing boss
    const shouldUseTimeSlow = (
      (threatLevel >= 0.8 || // Very high threat level
       (boss && !boss.isDefeated) || // Boss fight
       enemyBullets.length > 15 || // Many bullets on screen
       this.autoplaySlowTimer > 600) && // Or every 10 seconds as strategic usage
      this.autoplaySlowTimer > 180 // Minimum 3 seconds between slow considerations
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
      const distance = Math.sqrt((bullet.x - this.x) ** 2 + (bullet.y - this.y) ** 2);
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
      const distance = Math.sqrt((laser.x - this.x) ** 2 + (laser.y - this.y) ** 2);
      if (distance < dangerRadius) {
        nearbyLasers++;
      }
    }
    threatScore += Math.min(nearbyLasers * 0.2, 0.4); // Cap laser threat at 0.4
    
    // Count charging laser enemies (special threat)
    let chargingLasers = 0;
    for (const enemy of enemies) {
      if (enemy.type === 'laser' && (enemy.laserState === 'charging' || enemy.laserState === 'preview')) {
        const distance = Math.sqrt((enemy.x - this.x) ** 2 + (enemy.y - this.y) ** 2);
        if (distance < dangerRadius * 1.5) {
          chargingLasers++;
        }
      }
    }
    threatScore += Math.min(chargingLasers * 0.25, 0.5); // Cap charging laser threat at 0.5
    
    // Count nearby dangerous enemies
    let nearbyEnemies = 0;
    for (const enemy of enemies) {
      const distance = Math.sqrt((enemy.x - this.x) ** 2 + (enemy.y - this.y) ** 2);
      if (distance < dangerRadius * 0.8) {
        nearbyEnemies++;
      }
    }
    threatScore += Math.min(nearbyEnemies * 0.05, 0.3); // Cap enemy threat at 0.3
    
    // Count nearby asteroids
    let nearbyAsteroids = 0;
    for (const asteroid of asteroids) {
      const distance = Math.sqrt((asteroid.x - this.x) ** 2 + (asteroid.y - this.y) ** 2);
      if (distance < dangerRadius * 0.6) {
        nearbyAsteroids++;
      }
    }
    threatScore += Math.min(nearbyAsteroids * 0.03, 0.2); // Cap asteroid threat at 0.2
    
    // Boss presence increases base threat
    if (boss && !boss.isDefeated) {
      threatScore += 0.2; // Base boss threat
      
      // Additional threat based on boss proximity and phase
      const bossDistance = Math.sqrt((boss.x - this.x) ** 2 + (boss.y - this.y) ** 2);
      if (bossDistance < dangerRadius * 1.2) {
        threatScore += 0.1;
      }
      
      if (boss.finalPhase) {
        threatScore += 0.1; // Final phase is more dangerous
      }
    }
    
    return Math.min(threatScore, 1.0); // Cap at 1.0
  }

  // Precise movement calculation for autoplay - only move when necessary
  calculateDodgeVector(enemies, enemyBullets, enemyLasers, asteroids, boss, powerups = []) {
    let dodgeX = 0;
    let dodgeY = 0;
    const avoidRadius = 100; // Reduced for more precise movement
    const futureFrames = 60; // Increased prediction time for better accuracy
    
    if (!this.autoplayMovementTimer) this.autoplayMovementTimer = 0;
    this.autoplayMovementTimer += 1;
    
    // Calculate immediate bullet threats with precise prediction
    let urgentThreatMovementX = 0;
    let urgentThreatMovementY = 0;
    let hasUrgentThreats = false;
    
    // Analyze bullet threats with precise collision prediction
    for (const bullet of enemyBullets) {
      const threatInfo = this.calculatePreciseThreatVector(bullet, avoidRadius, futureFrames);
      if (threatInfo.isUrgent) {
        hasUrgentThreats = true;
        urgentThreatMovementX += threatInfo.x * threatInfo.strength * 4.0;
        urgentThreatMovementY += threatInfo.y * threatInfo.strength * 4.0;
      }
    }
    
    // Analyze laser threats
    for (const laser of enemyLasers) {
      const threatInfo = this.calculatePreciseThreatVector(laser, avoidRadius * 1.5, futureFrames);
      if (threatInfo.isUrgent) {
        hasUrgentThreats = true;
        urgentThreatMovementX += threatInfo.x * threatInfo.strength * 3.0;
        urgentThreatMovementY += threatInfo.y * threatInfo.strength * 3.0;
      }
    }
    
    // Check for laser enemies about to fire (critical threat)
    let laserEnemyThreatX = 0;
    let laserEnemyThreatY = 0;
    let hasLaserEnemyThreat = false;
    
    // Check for moving enemies with collision trajectories
    let movingEnemyThreatX = 0;
    let movingEnemyThreatY = 0;
    let hasMovingEnemyThreat = false;
    
    for (const enemy of enemies) {
      if (enemy.type === 'laser') {
        const distance = Math.sqrt((enemy.x - this.x) ** 2 + (enemy.y - this.y) ** 2);
        
        // High priority for charging or preview state laser enemies
        if (enemy.laserState === 'charging' || enemy.laserState === 'preview') {
          if (distance < 400) { // Extended range for laser enemy threats
            hasLaserEnemyThreat = true;
            const threat = this.calculateOptimalEscapeVector(enemy, distance);
            laserEnemyThreatX += threat.x * 3.0;
            laserEnemyThreatY += threat.y * 3.0;
          }
        }
      }
      
      // Check all enemies for collision trajectories (dive enemies, moving enemies, etc.)
      const threatInfo = this.calculatePreciseThreatVector(enemy, avoidRadius * 1.2, futureFrames);
      if (threatInfo.isUrgent && threatInfo.strength > 0.3) {
        hasMovingEnemyThreat = true;
        movingEnemyThreatX += threatInfo.x * threatInfo.strength * 2.5;
        movingEnemyThreatY += threatInfo.y * threatInfo.strength * 2.5;
      }
    }
    
    // Check asteroids for collision avoidance (only if close)
    let asteroidThreatX = 0;
    let asteroidThreatY = 0;
    for (const asteroid of asteroids) {
      const threat = this.calculatePreciseThreatVector(asteroid, avoidRadius * 0.7, futureFrames);
      if (threat.isUrgent) {
        asteroidThreatX += threat.x * threat.strength * 2.0;
        asteroidThreatY += threat.y * threat.strength * 2.0;
      }
    }
    
    // Boss threat (only if close)
    let bossThreatX = 0;
    let bossThreatY = 0;
    if (boss && !boss.isDefeated) {
      const distance = Math.sqrt((boss.x - this.x) ** 2 + (boss.y - this.y) ** 2);
      if (distance < 200) {
        const threat = this.calculateOptimalEscapeVector(boss, distance);
        bossThreatX = threat.x * 1.5;
        bossThreatY = threat.y * 1.5;
      }
    }
    
    // Powerup collection - only if safe to do so
    let powerupMovementX = 0;
    let powerupMovementY = 0;
    
    // Only pursue powerups if there are no urgent threats
    if (!hasUrgentThreats && !hasLaserEnemyThreat && powerups && powerups.length > 0) {
      let closestPowerup = null;
      let closestDistance = Infinity;
      
      for (const powerup of powerups) {
        const distance = Math.sqrt((powerup.x - this.x) ** 2 + (powerup.y - this.y) ** 2);
        if (distance < closestDistance && distance < 250) { // Reduced range for safer collection
          closestDistance = distance;
          closestPowerup = powerup;
        }
      }
      
      if (closestPowerup && this.isPowerupSafeToCollect(closestPowerup, enemyBullets, enemyLasers)) {
        const powerupDx = closestPowerup.x - this.x;
        const powerupDy = closestPowerup.y - this.y;
        const powerupDistance = Math.sqrt(powerupDx * powerupDx + powerupDy * powerupDy);
        
        if (powerupDistance > 0) {
          const attractionStrength = Math.min(0.6, (250 - powerupDistance) / 250);
          powerupMovementX = (powerupDx / powerupDistance) * attractionStrength;
          powerupMovementY = (powerupDy / powerupDistance) * attractionStrength;
        }
      }
    }
    
    // Combine movement vectors with priority
    if (hasUrgentThreats) {
      // Priority 1: Immediate bullet/laser threats
      dodgeX = urgentThreatMovementX;
      dodgeY = urgentThreatMovementY;
    } else if (hasMovingEnemyThreat) {
      // Priority 2: Moving enemies on collision course (dive enemies, etc.)
      dodgeX = movingEnemyThreatX;
      dodgeY = movingEnemyThreatY;
    } else if (hasLaserEnemyThreat) {
      // Priority 3: Laser enemies about to fire
      dodgeX = laserEnemyThreatX;
      dodgeY = laserEnemyThreatY;
    } else {
      // Priority 4: Asteroids, boss, and powerup collection
      dodgeX = asteroidThreatX + bossThreatX + powerupMovementX;
      dodgeY = asteroidThreatY + bossThreatY + powerupMovementY;
    }
    
    // Apply movement only if significant enough to matter
    const dodgeLength = Math.sqrt(dodgeX * dodgeX + dodgeY * dodgeY);
    if (dodgeLength > 0.1) { // Minimum threshold to avoid tiny movements
      const movementMultiplier = hasUrgentThreats ? 1.0 : 0.7; // Full movement for urgent threats
      return {
        x: (dodgeX / dodgeLength) * movementMultiplier,
        y: (dodgeY / dodgeLength) * movementMultiplier
      };
    }
    
    // Stay perfectly still when no threats require movement
    return { x: 0, y: 0 };
  }

  // Calculate precise threat with collision trajectory analysis
  calculatePreciseThreatVector(entity, avoidRadius, futureFrames) {
    // Get entity velocity vector
    let entityVx = 0;
    let entityVy = 0;
    
    if (entity.vx !== undefined && entity.vy !== undefined) {
      entityVx = entity.vx;
      entityVy = entity.vy;
    } else if (entity.speed !== undefined && entity.angle !== undefined) {
      entityVx = Math.cos(entity.angle) * entity.speed;
      entityVy = Math.sin(entity.angle) * entity.speed;
    }
    
    // Check if entity is actually moving towards player using trajectory analysis
    const collisionInfo = this.calculateCollisionTrajectory(
      entity.x, entity.y, entityVx, entityVy,
      this.x, this.y, avoidRadius, futureFrames
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
  calculateCollisionTrajectory(entityX, entityY, entityVx, entityVy, playerX, playerY, safeRadius, maxFrames) {
    // If entity isn't moving, use simple distance check
    if (Math.abs(entityVx) < 0.1 && Math.abs(entityVy) < 0.1) {
      const distance = Math.sqrt((entityX - playerX) ** 2 + (entityY - playerY) ** 2);
      return {
        willCollide: distance < safeRadius,
        timeToCollision: distance < safeRadius ? 0 : Infinity,
        closestDistance: distance
      };
    }
    
    // Calculate relative position and velocity
    const relativeX = entityX - playerX;
    const relativeY = entityY - playerY;
    const relativeVx = entityVx; // Assuming player is stationary for prediction
    const relativeVy = entityVy;
    
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
      timeToCollision: willCollide ? timeToClosest : Infinity,
      closestDistance: closestDistance,
      closestX: closestX,
      closestY: closestY
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
      const toEntityX = entityX - this.x;
      const toEntityY = entityY - this.y;
      
      const dot1 = perpX1 * toEntityX + perpY1 * toEntityY;
      const dot2 = perpX2 * toEntityX + perpY2 * toEntityY;
      
      // Choose direction that moves away from entity
      if (dot1 < dot2) {
        return { x: perpX1, y: perpY1 };
      } else {
        return { x: perpX2, y: perpY2 };
      }
    }
    
    // Fallback: move away from entity's current position
    const toPlayerX = this.x - entityX;
    const toPlayerY = this.y - entityY;
    const distance = Math.sqrt(toPlayerX * toPlayerX + toPlayerY * toPlayerY);
    
    if (distance > 0) {
      return { x: toPlayerX / distance, y: toPlayerY / distance };
    }
    
    // Last fallback: random safe direction
    const safeAngle = this.findSafestDirection();
    return { x: Math.cos(safeAngle), y: Math.sin(safeAngle) };
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
    const basicAvoidX = (this.x - entity.x) / distance;
    const basicAvoidY = (this.y - entity.y) / distance;
    
    // Check if this direction would take us off-screen or into other dangers
    const testX = this.x + basicAvoidX * 50;
    const testY = this.y + basicAvoidY * 50;
    
    // Keep on screen
    if (testX < 50 || testX > window.innerWidth - 50 || 
        testY < 50 || testY > window.innerHeight - 50) {
      // Find alternative safe direction
      const safeAngle = this.findSafestDirection();
      return {
        x: Math.cos(safeAngle),
        y: Math.sin(safeAngle)
      };
    }
    
    return {
      x: basicAvoidX,
      y: basicAvoidY
    };
  }

  // Find the safest direction to move (away from most threats)
  findSafestDirection() {
    const testAngles = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4];
    let safestAngle = 0;
    let lowestThreat = Infinity;
    
    for (const angle of testAngles) {
      const testX = this.x + Math.cos(angle) * 60;
      const testY = this.y + Math.sin(angle) * 60;
      
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
    const safetyRadius = 80;
    
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

  // Calculate threat from a single entity
  calculateThreatVector(entity, avoidRadius, futureFrames) {
    // Predict entity position
    let futureX = entity.x;
    let futureY = entity.y;
    
    if (entity.vx !== undefined && entity.vy !== undefined) {
      // Entity has velocity, predict future position
      futureX += entity.vx * futureFrames;
      futureY += entity.vy * futureFrames;
    } else if (entity.speed !== undefined && entity.angle !== undefined) {
      // Entity has speed and angle
      futureX += Math.cos(entity.angle) * entity.speed * futureFrames;
      futureY += Math.sin(entity.angle) * entity.speed * futureFrames;
    }
    
    // Calculate distance to predicted position
    const dx = futureX - this.x;
    const dy = futureY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > avoidRadius) {
      return { x: 0, y: 0, strength: 0 }; // Not a threat
    }
    
    // Calculate avoidance strength (stronger when closer)
    const strength = Math.max(0, (avoidRadius - distance) / avoidRadius);
    
    // Return normalized avoidance vector (away from threat)
    if (distance > 0) {
      return {
        x: -dx / distance, // Move away from threat
        y: -dy / distance,
        strength: strength
      };
    }
    
    // If exactly on top, move in random direction
    const randomAngle = Math.random() * Math.PI * 2;
    return {
      x: Math.cos(randomAngle),
      y: Math.sin(randomAngle),
      strength: 1.0
    };
  }

  update(
    keys,
    enemies,
    asteroids,
    isPortrait,
    autoaimEnabled = true,
    mainWeaponLevel = 1,
    timeSlowActive = false,
    boss = null,
    autoplayEnabled = false,
    enemyBullets = [],
    enemyLasers = [],
    powerups = []
  ) {
    // Store time slow state for rendering
    this.timeSlowActive = timeSlowActive;
    
    // Handle shield timing
    if (this.isShielding) {
      this.shieldFrames--;
      if (this.shieldFrames <= 0) {
        this.isShielding = false;
      }
    }
    
    // Handle shield cooldown
    if (this.shieldCooldown > 0) {
      this.shieldCooldown--;
    }
    
    // Handle rainbow invulnerability timer
    if (this.rainbowInvulnerable) {
      this.rainbowInvulnerableTimer--;
      if (this.rainbowInvulnerableTimer <= 0) {
        this.rainbowInvulnerable = false;
      }
    }

    // Get current speed (decreased during shield and time slow)
    let currentSpeed = this.speed;
    if (this.isShielding) {
      currentSpeed *= 0.5; // 50% speed during shield
    }
    if (timeSlowActive) {
      currentSpeed *= 0.5; // 50% speed during time slow
    }

    // Handle movement - autoplay overrides manual input
    if (autoplayEnabled) {
      // Autoplay: automatically dodge threats and collect powerups
      const dodgeVector = this.calculateDodgeVector(enemies, enemyBullets, enemyLasers, asteroids, boss, powerups);
      this.x += dodgeVector.x * currentSpeed;
      this.y += dodgeVector.y * currentSpeed;
    } else if (keys.target) {
      // Touch controls - move toward target
      const dx = keys.target.x - this.x;
      const dy = keys.target.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 1) {
        this.x += (dx / distance) * currentSpeed;
        this.y += (dy / distance) * currentSpeed;
      }
    } else {
      // Keyboard movement (WASD)
      if (keys.up) this.y -= currentSpeed;
      if (keys.down) this.y += currentSpeed;
      if (keys.left) this.x -= currentSpeed;
      if (keys.right) this.x += currentSpeed;
    }

    // Keep player on screen
    this.x = Math.max(20, Math.min(this.x, window.innerWidth - 20));
    this.y = Math.max(20, Math.min(this.y, window.innerHeight - 20));

    // Update velocity tracking for predictive aiming
    this.vx = this.x - this.prevX;
    this.vy = this.y - this.prevY;
    this.prevX = this.x;
    this.prevY = this.y;

    // Autoplay strategic ability usage
    if (autoplayEnabled) {
      this.handleAutoplayAbilities(enemies, enemyBullets, enemyLasers, asteroids, boss, keys, powerups);
    }

    // Handle aiming - autoaim/autoplay overrides mouse input
    if (!autoaimEnabled && !autoplayEnabled && keys.mousePosition) {
      // Desktop: aim toward mouse cursor only if autoaim/autoplay is disabled
      const dx = keys.mousePosition.x - this.x;
      const dy = keys.mousePosition.y - this.y;
      this.angle = Math.atan2(dy, dx);
    } else if (!autoaimEnabled && !autoplayEnabled) {
      // Mobile: use default orientation when not using autoaim/autoplay
      if (isPortrait) {
        this.angle = -Math.PI / 2; // Face up
      } else {
        this.angle = 0; // Face right
      }
    }
    // If autoaim or autoplay is enabled, angle will be set by the autoaim logic below

    // Helper function to check if target is within viewport
    const isTargetInViewport = (target) => {
      return (
        target.x >= 0 &&
        target.x <= window.innerWidth &&
        target.y >= 0 &&
        target.y <= window.innerHeight
      );
    };

    // Helper function to get current bullet speed based on weapon level
    const getCurrentBulletSpeed = (level) => {
      if (level === 5) return Infinity; // Laser beam is instant
      return GAME_CONFIG.BULLET_SPEED; // All other levels use standard speed (8)
    };

    // Advanced predictive aiming that considers both player and target velocity
    const calculatePredictiveAim = (target, bulletSpeed) => {
      if (bulletSpeed === Infinity) {
        // For laser, aim directly at target
        return Math.atan2(target.y - this.y, target.x - this.x);
      }

      // Get target velocity (some targets may not have velocity)
      const targetVx = target.vx || 0;
      const targetVy = target.vy || 0;

      // Calculate relative velocity (target velocity minus player velocity)
      const relativeVx = targetVx - this.vx;
      const relativeVy = targetVy - this.vy;

      // Calculate relative position
      const relativeX = target.x - this.x;
      const relativeY = target.y - this.y;

      // Solve for intercept time using quadratic formula
      // |target_pos + target_vel * t - player_pos - player_vel * t| = bulletSpeed * t
      const a =
        relativeVx * relativeVx +
        relativeVy * relativeVy -
        bulletSpeed * bulletSpeed;
      const b = 2 * (relativeX * relativeVx + relativeY * relativeVy);
      const c = relativeX * relativeX + relativeY * relativeY;

      let interceptTime = 0;

      if (Math.abs(a) < 0.001) {
        // Linear case: solve bt + c = 0
        if (Math.abs(b) > 0.001) {
          interceptTime = -c / b;
        }
      } else {
        // Quadratic case
        const discriminant = b * b - 4 * a * c;
        if (discriminant >= 0) {
          const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
          const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);

          // Choose the smallest positive time
          const validTimes = [t1, t2].filter((t) => t > 0);
          if (validTimes.length > 0) {
            interceptTime = Math.min(...validTimes);
          }
        }
      }

      // Calculate predicted intercept position
      const predictedX = target.x + targetVx * interceptTime;
      const predictedY = target.y + targetVy * interceptTime;

      // Return angle to predicted position
      return Math.atan2(predictedY - this.y, predictedX - this.x);
    };

    // Enhanced predictive aim with priority system
    // Only use autoaim if no mouse position (mobile) or if autoaim is explicitly enabled
    
    // Build complete target list, filter out invulnerable targets using standard method
    const allTargets = [...enemies, ...asteroids].filter(target => 
      target.isVulnerableToAutoAim && target.isVulnerableToAutoAim()
    );
    
    // Add boss targetable parts if boss exists
    if (boss && !boss.isDefeated && boss.getTargetableParts) {
      allTargets.push(...boss.getTargetableParts());
    }
    
    if (
      (autoaimEnabled || autoplayEnabled || !keys.mousePosition) &&
      allTargets.length > 0
    ) {
      let target = null;
      const bulletSpeed = getCurrentBulletSpeed(mainWeaponLevel);
      const shootingEnemyTypes = ["straight", "sine", "zigzag"];

      // Priority 1: Very close targets (within 200px) - any enemy or asteroid
      let closestNearbyTarget = null;
      let closestNearbyDistance = Infinity;

      for (const t of allTargets) {
        if (isTargetInViewport(t)) {
          const dist = Math.sqrt((t.x - this.x) ** 2 + (t.y - this.y) ** 2);
          if (dist < 200 && dist < closestNearbyDistance) {
            closestNearbyDistance = dist;
            closestNearbyTarget = t;
          }
        }
      }

      if (closestNearbyTarget) {
        target = closestNearbyTarget;
      } else {
        // Priority 2: Shooting enemies (nearby ones first)
        let closestShootingEnemy = null;
        let closestShootingDistance = Infinity;

        for (const enemy of enemies) {
          if (
            shootingEnemyTypes.includes(enemy.type) &&
            isTargetInViewport(enemy)
          ) {
            const dist = Math.sqrt(
              (enemy.x - this.x) ** 2 + (enemy.y - this.y) ** 2
            );
            if (dist < closestShootingDistance) {
              closestShootingDistance = dist;
              closestShootingEnemy = enemy;
            }
          }
        }

        if (closestShootingEnemy) {
          target = closestShootingEnemy;
        } else {
          // Priority 3: Any enemies (nearby ones first)
          let closestEnemy = null;
          let closestEnemyDistance = Infinity;

          for (const enemy of enemies) {
            if (isTargetInViewport(enemy)) {
              const dist = Math.sqrt(
                (enemy.x - this.x) ** 2 + (enemy.y - this.y) ** 2
              );
              if (dist < closestEnemyDistance) {
                closestEnemyDistance = dist;
                closestEnemy = enemy;
              }
            }
          }

          if (closestEnemy) {
            target = closestEnemy;
          } else {
            // Priority 4: Asteroids (if no enemies available)
            let closestAsteroid = null;
            let closestAsteroidDistance = Infinity;

            for (const asteroid of asteroids) {
              if (isTargetInViewport(asteroid)) {
                const dist = Math.sqrt(
                  (asteroid.x - this.x) ** 2 + (asteroid.y - this.y) ** 2
                );
                if (dist < closestAsteroidDistance) {
                  closestAsteroidDistance = dist;
                  closestAsteroid = asteroid;
                }
              }
            }

            if (closestAsteroid) {
              target = closestAsteroid;
            }
          }
        }
      }

      // Apply advanced predictive aiming to the selected target
      if (target) {
        this.angle = calculatePredictiveAim(target, bulletSpeed);
      }
    }

    // Player shoots at normal speed even during time slow
    if (this.shootCooldown > 0) {
      this.shootCooldown -= 1.0; // Always normal speed
    }

    // Apply time slow effect to homing missile cooldown
    const cooldownDecrement = timeSlowActive ? 0.3 : 1.0;
    if (this.homingMissileCooldown > 0) {
      this.homingMissileCooldown -= cooldownDecrement;
    }

    // Update second ship positions (above/below or left/right based on orientation)
    this.secondShip.forEach((ship) => {
      if (ship.isHorizontal) {
        // Portrait mode: left/right positioning
        ship.x = this.x + (ship.offset || 40);
        ship.y = this.y;
      } else {
        // Landscape mode: above/below positioning
        ship.x = this.x;
        ship.y = this.y + (ship.offset || 40);
      }
      ship.initialAngle = this.angle; // Make companion ship face same direction as player
    });
  }

  shoot(
    bullets,
    BulletClass,
    LaserClass,
    HomingMissileClass,
    isPortrait
  ) {
    // Cannot shoot while shielding
    if (this.isShielding) {
      return null;
    }

    if (this.shootCooldown <= 0) {
      // Main weapon - use level 5 laser during rainbow invulnerability
      if (this.mainWeaponLevel >= 5 || this.rainbowInvulnerable) {
        // Rainbow laser beam
        bullets.push(new LaserClass(this.x, this.y, this.angle, 50, "rainbow"));
        this.shootCooldown = 2; // Half the firing rate to reduce damage
        return "laser"; // Return laser type for continuous sound
      } else if (this.mainWeaponLevel === 1) {
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle,
            10,
            "#00ff88",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED,
            true
          ) // Speed 8 (same as level 2)
        ); // Cool green
        this.shootCooldown = 30; // Half as often as level 2 (0.5 seconds at 60fps)
      } else if (this.mainWeaponLevel === 2) {
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle,
            14,
            "#00ffcc",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED,
            true
          )
        ); // Teal, faster
        this.shootCooldown = 15; // Faster
      } else if (this.mainWeaponLevel === 3) {
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle,
            14,
            "#00ffff",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED,
            true
          )
        ); // Cyan
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle + 0.1,
            14,
            "#00ffff",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED,
            true
          )
        );
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle - 0.1,
            14,
            "#00ffff",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED,
            true
          )
        );
        this.shootCooldown = 15; // Same as level 2
      } else if (this.mainWeaponLevel >= 4) {
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle,
            18,
            "#4488ff",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED,
            true
          )
        ); // Cool blue, fast
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle + 0.1,
            18,
            "#4488ff",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED,
            true
          )
        );
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle - 0.1,
            18,
            "#4488ff",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED,
            true
          )
        );
        this.shootCooldown = 8; // Very fast
      }

      // Secondary weapon system (0-4 levels)
      // Level 0: Nothing (handled by if condition)

      if (this.sideWeaponLevel >= 1) {
        // Level 1: 1 missile moving off to diagonal
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle + Math.PI / 4, // 45 degree diagonal
            8,
            "#8844ff",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED,
            true
          )
        );
      }

      if (this.sideWeaponLevel >= 2) {
        // Level 2: 2 missiles going to both diagonals
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle - Math.PI / 4, // -45 degree diagonal
            8,
            "#8844ff",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED,
            true
          )
        );
      }

      if (this.sideWeaponLevel >= 2) {
        // Level 2: 2 missiles + 2 homing missiles (green, 1.5x larger)
        if (this.homingMissileCooldown <= 0) {
          bullets.push(
            new HomingMissileClass(
              this.x,
              this.y,
              this.angle + 0.2,
              9,
              "#00ff44"
            )
          );
          bullets.push(
            new HomingMissileClass(
              this.x,
              this.y,
              this.angle - 0.2,
              9,
              "#00ff44"
            )
          );
          this.homingMissileCooldown = 60; // 1 second cooldown
        }
      }

      if (this.sideWeaponLevel >= 3) {
        // Level 3: 2 missiles + 4 homing missiles total
        if (this.homingMissileCooldown <= 0) {
          // Add 2 more homing missiles (total 4)
          bullets.push(
            new HomingMissileClass(
              this.x,
              this.y,
              this.angle + 0.4,
              9,
              "#00ff44"
            )
          );
          bullets.push(
            new HomingMissileClass(
              this.x,
              this.y,
              this.angle - 0.4,
              9,
              "#00ff44"
            )
          );
        }
      }

      if (this.sideWeaponLevel >= 4) {
        // Level 4: 4 missiles total + 6 homing missiles total (ultimate level)
        // Add third and fourth missiles (we already have 2 from levels 1-2)
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle + Math.PI / 6, // 30 degree
            8,
            "#8844ff",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED,
            true
          )
        );
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle - Math.PI / 6, // -30 degree
            8,
            "#8844ff",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED,
            true
          )
        );

        // Add 2 more homing missiles (total 6)
        if (this.homingMissileCooldown <= 0) {
          bullets.push(
            new HomingMissileClass(
              this.x,
              this.y,
              this.angle + 0.6,
              9,
              "#00ff44"
            )
          );
          bullets.push(
            new HomingMissileClass(
              this.x,
              this.y,
              this.angle - 0.6,
              9,
              "#00ff44"
            )
          );
        }
      }

      // Second ship shooting
      this.secondShip.forEach((ship) => {
        let secondShipBulletColor = "#4488ff"; // Always blue
        bullets.push(
          new BulletClass(
            ship.x,
            ship.y,
            ship.initialAngle, // Use initialAngle
            8,
            secondShipBulletColor,
            isPortrait,
            GAME_CONFIG.BULLET_SPEED,
            true
          )
        );
      });

      this.shootCooldown = 10;
      return "bullet"; // Return bullet type for normal sound
    }
    
    return null; // No shot fired
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + this.rollAngle);
    const shipOpacity = 1;

    ctx.globalAlpha = shipOpacity;

    const visualSize = this.size * 2.5; // 2.5x larger visual size

    // Draw filled arrow with different colors based on state
    let shipColor = "#00ff88"; // Default green
    if (this.timeSlowActive) {
      shipColor = "#00ff00"; // Bright green during time slow
    }
    if (this.isShielding) {
      shipColor = "#ffff00"; // Yellow when shielding
    }
    if (this.rainbowInvulnerable) {
      // Rainbow gradient when invulnerable
      const gradient = ctx.createLinearGradient(-visualSize, -visualSize, visualSize, visualSize);
      const time = Date.now() * 0.005;
      gradient.addColorStop(0, `hsl(${(time * 60) % 360}, 100%, 50%)`);
      gradient.addColorStop(0.25, `hsl(${(time * 60 + 90) % 360}, 100%, 50%)`);
      gradient.addColorStop(0.5, `hsl(${(time * 60 + 180) % 360}, 100%, 50%)`);
      gradient.addColorStop(0.75, `hsl(${(time * 60 + 270) % 360}, 100%, 50%)`);
      gradient.addColorStop(1, `hsl(${(time * 60 + 360) % 360}, 100%, 50%)`);
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = shipColor;
    }

    // Simple arrow shape
    ctx.beginPath();
    ctx.moveTo(visualSize, 0); // Arrow tip
    ctx.lineTo(-visualSize / 2, -visualSize / 2); // Top left
    ctx.lineTo(-visualSize / 4, 0); // Middle left
    ctx.lineTo(-visualSize / 2, visualSize / 2); // Bottom left
    ctx.closePath();
    ctx.fill();

    // Dash trail effect removed for cleaner dash visual

    // Draw shield if active
    if (this.shield > 0) {
      // Draw blue stroke around the player ship outline
      ctx.globalAlpha = 0.8 * shipOpacity;
      ctx.strokeStyle = "#0099ff"; // Bright blue
      ctx.lineWidth = 3;
      
      // Draw stroke around the ship shape
      ctx.beginPath();
      ctx.moveTo(visualSize, 0); // Arrow tip
      ctx.lineTo(-visualSize / 2, -visualSize / 2); // Top left
      ctx.lineTo(-visualSize / 4, 0); // Middle left
      ctx.lineTo(-visualSize / 2, visualSize / 2); // Bottom left
      ctx.closePath();
      ctx.stroke();

      // Additional shield strokes for multiple shields
      if (this.shield > 1) {
        for (let i = 1; i < this.shield; i++) {
          ctx.globalAlpha = (0.6 - i * 0.15) * shipOpacity;
          ctx.strokeStyle = "#0099ff";
          ctx.lineWidth = 3;
          
          // Draw larger outline for each additional shield
          const extraSize = visualSize + i * 3;
          ctx.beginPath();
          ctx.moveTo(extraSize, 0);
          ctx.lineTo(-extraSize / 2, -extraSize / 2);
          ctx.lineTo(-extraSize / 4, 0);
          ctx.lineTo(-extraSize / 2, extraSize / 2);
          ctx.closePath();
          ctx.stroke();
        }
      }
    }

    // Draw godmode golden shield
    if (this.godMode) {
      // Draw golden stroke around the player ship outline
      ctx.globalAlpha = 0.9 * shipOpacity;
      ctx.strokeStyle = "#ffcc00"; // Bright gold
      ctx.lineWidth = 4;
      
      // Draw stroke around the ship shape
      ctx.beginPath();
      ctx.moveTo(visualSize, 0); // Arrow tip
      ctx.lineTo(-visualSize / 2, -visualSize / 2); // Top left
      ctx.lineTo(-visualSize / 4, 0); // Middle left
      ctx.lineTo(-visualSize / 2, visualSize / 2); // Bottom left
      ctx.closePath();
      ctx.stroke();

      // Additional golden shield layers
      ctx.globalAlpha = 0.7 * shipOpacity;
      ctx.strokeStyle = "#ffdd44"; // Lighter gold
      ctx.lineWidth = 3;
      
      // Draw larger outline for second layer
      const extraSize = visualSize + 4;
      ctx.beginPath();
      ctx.moveTo(extraSize, 0);
      ctx.lineTo(-extraSize / 2, -extraSize / 2);
      ctx.lineTo(-extraSize / 4, 0);
      ctx.lineTo(-extraSize / 2, extraSize / 2);
      ctx.closePath();
      ctx.stroke();

      // Subtle pulsing outer layer
      const pulseIntensity = 0.7 + 0.3 * Math.sin(Date.now() * 0.005);
      ctx.globalAlpha = 0.5 * pulseIntensity * shipOpacity;
      ctx.strokeStyle = "#ffaa00"; // Deeper gold
      ctx.lineWidth = 5;
      
      // Draw even larger outline for third layer
      const outerSize = visualSize + 8;
      ctx.beginPath();
      ctx.moveTo(outerSize, 0);
      ctx.lineTo(-outerSize / 2, -outerSize / 2);
      ctx.lineTo(-outerSize / 4, 0);
      ctx.lineTo(-outerSize / 2, outerSize / 2);
      ctx.closePath();
      ctx.stroke();
    }

    // Draw visible hitbox (animated radial rainbow gradient)
    ctx.globalAlpha = shipOpacity;
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.hitboxSize);
    const time = Date.now() * 0.005; // Animate over time

    gradient.addColorStop(0, `hsl(${(time * 50) % 360}, 100%, 70%)`); // Center color
    gradient.addColorStop(0.3, `hsl(${(time * 50 + 60) % 360}, 100%, 60%)`);
    gradient.addColorStop(0.6, `hsl(${(time * 50 + 120) % 360}, 100%, 50%)`);
    gradient.addColorStop(1, `hsl(${(time * 50 + 180) % 360}, 100%, 40%)`); // Outer color

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.hitboxSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw second ships if active
    this.secondShip.forEach((ship) => {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.initialAngle); // Use initialAngle for rendering

      ctx.globalAlpha = 0.7 * shipOpacity;
      ctx.strokeStyle = "#8844ff"; // Cool purple
      ctx.lineWidth = 2;

      // Simplified second ship design (using same visual size scaling)
      const secondShipVisualSize = this.size * 2.5 * 0.8; // Same scaling as main ship
      ctx.beginPath();
      ctx.moveTo(secondShipVisualSize, 0);
      ctx.lineTo(-secondShipVisualSize, -secondShipVisualSize / 2.4);
      ctx.lineTo(-secondShipVisualSize * 0.5, 0);
      ctx.lineTo(-secondShipVisualSize, secondShipVisualSize / 2.4);
      ctx.closePath();
      ctx.stroke();

      ctx.restore();
    });
  }

  activateShield() {
    if (this.shieldCooldown <= 0 && !this.isShielding) {
      this.isShielding = true;
      this.shieldFrames = 60;
      this.shieldCooldown = this.shieldCooldownMax;
      return true;
    }
    return false;
  }

  activateRainbowInvulnerability() {
    this.rainbowInvulnerable = true;
    this.rainbowInvulnerableTimer = this.rainbowInvulnerableDuration;
  }
}
