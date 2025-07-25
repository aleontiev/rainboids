// Enemy entities for Rainboids: Blitz - Data-driven configuration system
import { Bullet } from "./bullet.js";
import { Laser } from "./laser.js";
import { CircularBullet } from "./circular-bullet.js";
import { SpreadingBullet } from "./spreading-bullet.js";

// Data-driven Enemy Class - handles all enemy types through configuration
export class Enemy {
  constructor(
    x,
    y,
    isPortrait,
    config = null,
    isClone = false,
    generation = 0,
    game = null
  ) {
    this.x = x;
    this.y = y;
    this.isPortrait = isPortrait;
    this.game = game;
    this.isClone = isClone;
    this.generation = generation;
    this.time = 0;
    this.initialX = x;
    this.initialY = y;

    // Apply configuration with defaults
    this.config = this.mergeWithDefaults(config);

    // Core properties from config
    this.health = this.config.health;
    this.size = this.config.size;
    this.speed = this.config.speed;
    this.color = this.config.color;
    this.angle = isPortrait ? Math.PI / 2 : Math.PI; // Face down or left

    // Attack properties (support both old and new format)
    this.shootCooldown = 0;
    this.canShoot = this.config.attack?.canShoot ?? this.config.canShoot ?? true;

    // Handle clone fade-in effect
    this.fadeInTimer = isClone ? 0 : this.config.fadeInTime;
    this.opacity = isClone ? 0 : 1.0;

    // Vulnerability properties (used for auto-aim filtering)
    this.invulnerable = this.config.invulnerable;

    // Velocity tracking (dx/dy per second)
    this.dx = 0;
    this.dy = 0;
    this.lastX = x;
    this.lastY = y;

    // Initialize movement-specific properties
    this.initializeMovementProperties();

    // Initialize attack-specific properties
    this.initializeAttackProperties();

    // Initialize cloning properties
    this.initializeCloningProperties();
  }

  // Merge provided config with defaults
  mergeWithDefaults(config) {
    const defaults = this.game?.level?.getEnemyConfig("*");

    return {
      ...defaults,
      ...config,
    };
  }

  // Check if this enemy is vulnerable
  isVulnerable() {
    return !this.invulnerable;
  }

  // Initialize movement-specific properties based on pattern
  initializeMovementProperties() {
    // Use nested config structure
    const movement = this.config.movement || {};
    const pattern = movement.type || "straight";
    const movementConfig = movement || {};

    // Store the pattern for other parts of the code
    this.movementPattern = pattern;

    switch (pattern) {
      case "sine":
        this.amplitude = this.randomizeValue(movementConfig.amplitude, 50);
        this.frequency = this.randomizeValue(movementConfig.frequency, 0.02);
        break;

      case "zigzag":
        this.zigzagDirection = 1;
        this.zigzagTimer = 0;
        this.zigzagTimerMax = movementConfig.zigzagTimer || 30;
        this.zigzagSpeed = movementConfig.zigzagSpeed || 2;
        break;

      case "circle":
        this.centerX = this.x;
        this.centerY = this.y;
        this.radius = this.randomizeValue(movementConfig.radius, 55);
        this.angularSpeed = this.randomizeValue(
          movementConfig.angularSpeed,
          0.05
        );
        this.driftSpeed = movementConfig.driftSpeed || 0.5;
        break;

      case "dive":
        this.phase = "approach";
        this.lockTimer = 0;
        this.lockDuration = movementConfig.lockDuration || 60;
        this.targetX = 0;
        this.targetY = 0;
        this.diveSpeed = movementConfig.diveSpeed || 8;
        this.diveAngle = 0;
        break;
    }
  }

  // Initialize attack-specific properties based on pattern
  initializeAttackProperties() {
    // Use nested config structure
    const attack = this.config.attack || {};
    const pattern = attack.pattern || "simple";
    const attackConfig = attack || {};

    // Store the pattern for other parts of the code
    this.attackPattern = pattern;

    switch (pattern) {
      case "laser":
        this.laserChargeTime = 0;
        this.laserFiring = false;
        this.laserBeam = null;
        this.laserCooldown = 0;
        this.laserState = "cooldown";
        this.laserAngle = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.chargeTime = attackConfig.chargeTime || 60;
        this.previewTime = attackConfig.previewTime || 90;
        this.firingTime = attackConfig.firingTime || 60;
        this.targetingAccuracy = attackConfig.targetingAccuracy || 30;
        break;

      case "pulse":
        this.pulseInterval = this.randomizeValue(
          attackConfig.pulseInterval,
          300
        );
        this.pulseTimer = 0;
        this.pulseBulletCount = attackConfig.pulseBulletCount || 8;
        this.warningTime = attackConfig.warningTime || 30;
        break;

      case "burst":
        this.burstCount = attackConfig.burstCount || 1;
        this.burstSpread = attackConfig.burstSpread || 0;
        this.shootFromMultiplePoints =
          attackConfig.shootFromMultiplePoints || false;
        this.shootPoints = attackConfig.shootPoints || [{ x: 0, y: 0 }];
        this.randomDirection = attackConfig.randomDirection || false;
        break;

      case "spreading":
        this.spreadBulletSize = attackConfig.spreadBulletSize || 8;
        this.spreadBulletSpeed = attackConfig.spreadBulletSpeed || 3;
        this.spreadBulletCount = attackConfig.spreadBulletCount || 8;
        this.spreadExplosionTime = attackConfig.spreadExplosionTime || 120;
        break;
    }
  }

  // Initialize cloning properties
  initializeCloningProperties() {
    // Use nested config structure
    const clone = this.config.clone || {};
    const canClone = clone.enabled ?? this.config.canClone ?? false;
    
    if (canClone) {
      this.cloneTimer = 0;
      this.clonesCreated = 0;
      const maxClones = clone.maxClones ?? this.config.maxClones ?? 3;
      const maxGenerations = clone.maxGenerations ?? this.config.maxGenerations ?? 4;
      const cloneInterval = clone.interval ?? this.config.cloneInterval ?? 90;
      
      this.maxClones = Math.max(0, maxClones - this.generation);
      this.maxGenerations = maxGenerations;
      this.cloneInterval = cloneInterval;
    }
  }

  // Helper to randomize values from config ranges
  randomizeValue(configValue, defaultValue) {
    if (!configValue) return defaultValue;
    if (typeof configValue === "number") return configValue;
    if (configValue.min !== undefined && configValue.max !== undefined) {
      return (
        configValue.min + Math.random() * (configValue.max - configValue.min)
      );
    }
    return defaultValue;
  }

  update(
    playerX,
    playerY,
    bullets,
    lasers,
    slowdownFactor = 1.0,
    addEnemyCallback = null
  ) {
    this.time += slowdownFactor;

    // Handle fade-in for clones
    if (this.isClone && this.fadeInTimer < this.config.fadeInTime) {
      this.fadeInTimer += slowdownFactor;
      this.opacity = Math.min(1.0, this.fadeInTimer / this.config.fadeInTime);
    }

    // Make enemies face the player (unless overridden by movement pattern)
    if (this.movementPattern !== "dive" || this.phase !== "dive") {
      this.angle = Math.atan2(playerY - this.y, playerX - this.x);
    }

    // Call config-driven update logic
    this.updateMovement(
      playerX,
      playerY,
      bullets,
      lasers,
      slowdownFactor,
      addEnemyCallback
    );

    // Check if enemy is still on screen
    return this.isOnScreen();
  }

  updateMovement(
    playerX,
    playerY,
    bullets,
    lasers,
    slowdownFactor,
    addEnemyCallback
  ) {
    // Store previous position for velocity calculation
    const prevX = this.x;
    const prevY = this.y;

    // Apply movement pattern based on configuration
    const movement = this.config.movement || {};
    const speedMultiplier = movement.speedMultiplier ?? movement.speed ?? this.config.movementSpeed ?? 1.0;
    const effectiveSpeed = this.speed * speedMultiplier;

    switch (this.movementPattern) {
      case "straight":
        this.updateStraightMovement(effectiveSpeed, slowdownFactor);
        break;

      case "sine":
        this.updateSineMovement(effectiveSpeed, slowdownFactor);
        break;

      case "zigzag":
        this.updateZigzagMovement(effectiveSpeed, slowdownFactor);
        break;

      case "circle":
        this.updateCircleMovement(
          effectiveSpeed,
          slowdownFactor,
          addEnemyCallback
        );
        break;

      case "dive":
        this.updateDiveMovement(
          playerX,
          playerY,
          effectiveSpeed,
          slowdownFactor
        );
        break;

      case "stationary":
        // No movement
        break;

      case "bouncing":
        this.updateBouncingMovement(slowdownFactor);
        break;

      default:
        this.updateStraightMovement(effectiveSpeed, slowdownFactor);
        break;
    }

    // Calculate velocity (pixels per frame * 60 = pixels per second)
    this.dx = (this.x - prevX) * 60;
    this.dy = (this.y - prevY) * 60;
  }

  updateStraightMovement(speed, slowdownFactor) {
    if (this.isPortrait) {
      this.y += speed * slowdownFactor;
    } else {
      this.x -= speed * slowdownFactor;
    }
  }

  updateSineMovement(speed, slowdownFactor) {
    if (this.isPortrait) {
      this.y += speed * slowdownFactor;
      this.x =
        this.initialX + Math.sin(this.time * this.frequency) * this.amplitude;
    } else {
      this.x -= speed * slowdownFactor;
      this.y =
        this.initialY + Math.sin(this.time * this.frequency) * this.amplitude;
    }
  }

  updateZigzagMovement(speed, slowdownFactor) {
    if (this.isPortrait) {
      this.y += speed * slowdownFactor;
      this.zigzagTimer += slowdownFactor;
      if (this.zigzagTimer > this.zigzagTimerMax) {
        this.zigzagDirection *= -1;
        this.zigzagTimer = 0;
      }
      this.x += this.zigzagDirection * this.zigzagSpeed * slowdownFactor;
    } else {
      this.x -= speed * slowdownFactor;
      this.zigzagTimer += slowdownFactor;
      if (this.zigzagTimer > this.zigzagTimerMax) {
        this.zigzagDirection *= -1;
        this.zigzagTimer = 0;
      }
      this.y += this.zigzagDirection * this.zigzagSpeed * slowdownFactor;
    }
  }

  updateCircleMovement(speed, slowdownFactor, addEnemyCallback) {
    // Update center position
    if (this.isPortrait) {
      this.centerY += this.driftSpeed * slowdownFactor;
    } else {
      this.centerX -= this.driftSpeed * slowdownFactor;
    }

    // Update orbital position
    const angle = this.time * this.angularSpeed;
    this.x = this.centerX + Math.cos(angle) * this.radius;
    this.y = this.centerY + Math.sin(angle) * this.radius;

    // Handle cloning (support both old and new config)
    const clone = this.config.clone || {};
    const canClone = clone.enabled ?? this.config.canClone ?? false;
    if (canClone && addEnemyCallback) {
      this.handleCloning(addEnemyCallback, slowdownFactor);
    }
  }

  updateDiveMovement(playerX, playerY, speed, slowdownFactor) {
    if (this.phase === "approach") {
      if (this.isPortrait) {
        this.y += speed * slowdownFactor;
      } else {
        this.x -= speed * slowdownFactor;
      }

      this.lockTimer += slowdownFactor;
      if (this.lockTimer >= this.lockDuration) {
        this.phase = "dive";
        this.targetX = playerX;
        this.targetY = playerY;
        this.diveAngle = Math.atan2(
          this.targetY - this.y,
          this.targetX - this.x
        );
      }
    } else if (this.phase === "dive") {
      this.x += Math.cos(this.diveAngle) * this.diveSpeed * slowdownFactor;
      this.y += Math.sin(this.diveAngle) * this.diveSpeed * slowdownFactor;
      this.angle = this.diveAngle;
    }
  }

  updateBouncingMovement(slowdownFactor) {
    // Handle bouncing movement after hitting metal
    if (this.bounceTimer > 0 && this.bounceVelocityX !== undefined && this.bounceVelocityY !== undefined) {
      // Apply bounce velocity (already in px/sec)
      this.x += (this.bounceVelocityX / 60) * slowdownFactor;
      this.y += (this.bounceVelocityY / 60) * slowdownFactor;
      
      // Decay the bounce velocity over time
      this.bounceVelocityX *= this.bounceDecay;
      this.bounceVelocityY *= this.bounceDecay;
      
      // Update bounce timer
      this.bounceTimer -= slowdownFactor;
      
      // When bounce timer expires, restore original movement
      if (this.bounceTimer <= 0) {
        this.movementPattern = this.originalMovementPattern || "straight";
        this.speed = this.originalSpeed || this.speed;
        
        // Clean up bounce properties
        delete this.bounceVelocityX;
        delete this.bounceVelocityY;
        delete this.bounceTimer;
        delete this.bounceDecay;
        delete this.originalMovementPattern;
        delete this.originalSpeed;
      }
    } else {
      // Fallback to original movement if bounce data is missing
      this.movementPattern = this.originalMovementPattern || "straight";
    }
  }

  handleCloning(addEnemyCallback, slowdownFactor) {
    this.cloneTimer += slowdownFactor;
    if (
      this.cloneTimer >= this.cloneInterval &&
      this.clonesCreated < this.maxClones &&
      this.isOnScreen() &&
      this.generation < this.maxGenerations
    ) {
      this.cloneTimer = 0;
      this.clonesCreated++;

      const offsetDistance = 50 + Math.random() * 50;
      const offsetAngle = Math.random() * Math.PI * 2;
      const cloneX = this.x + Math.cos(offsetAngle) * offsetDistance;
      const cloneY = this.y + Math.sin(offsetAngle) * offsetDistance;

      const clone = new Enemy(
        cloneX,
        cloneY,
        this.isPortrait,
        this.config,
        true,
        this.generation + 1,
        this.game
      );

      addEnemyCallback(clone);
    }
  }

  isOnScreen() {
    if (this.isPortrait) {
      return this.y < window.innerHeight + 50;
    } else {
      return this.x > -50;
    }
  }

  shoot(bullets, lasers, player) {
    // Skip shooting if disabled or in fade-in
    if (!this.canShoot || (this.isClone && this.opacity < 1.0)) {
      return;
    }

    // Handle different attack patterns
    switch (this.attackPattern) {
      case "simple":
        this.handleSimpleAttack(bullets, player);
        break;

      case "burst":
        this.handleBurstAttack(bullets, player);
        break;

      case "circular":
        this.handleCircularAttack(bullets, player);
        break;

      case "spreading":
        this.handleSpreadingAttack(bullets, player);
        break;

      case "laser":
        this.handleLaserAttack(lasers, player);
        break;

      case "pulse":
        this.handlePulseAttack(bullets, player);
        break;

      case "none":
        // No shooting
        break;

      default:
        this.handleSimpleAttack(bullets, player);
        break;
    }
  }

  handleSimpleAttack(bullets, player) {
    this.shootCooldown++;
    const attack = this.config.attack || {};
    const cooldown = attack.cooldown ?? this.config.shootCooldown ?? 60;
    
    if (this.shootCooldown > cooldown) {
      this.shootCooldown = 0;
      const angle = Math.atan2(player.y - this.y, player.x - this.x);

      this.createBullet(bullets, this.x, this.y, angle);
    }
  }

  handleBurstAttack(bullets, player) {
    this.shootCooldown++;
    const attack = this.config.attack || {};
    const cooldown = attack.cooldown ?? this.config.shootCooldown ?? 60;
    
    if (this.shootCooldown > cooldown) {
      this.shootCooldown = 0;

      if (this.shootFromMultiplePoints && this.shootPoints) {
        // Shoot from multiple points
        this.shootPoints.forEach((point) => {
          const shootX = this.x + point.x * this.size;
          const shootY = this.y + point.y * this.size;

          for (let i = 0; i < this.burstCount; i++) {
            let angle;
            if (this.randomDirection) {
              angle = Math.random() * Math.PI * 2;
            } else {
              const baseAngle = Math.atan2(
                player.y - shootY,
                player.x - shootX
              );
              const spread = this.burstSpread;
              angle = baseAngle + (i - (this.burstCount - 1) / 2) * spread;
            }

            this.createBullet(bullets, shootX, shootY, angle);
          }
        });
      } else {
        // Shoot from center with burst spread
        const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);
        for (let i = 0; i < this.burstCount; i++) {
          const spread = this.burstSpread;
          const angle = baseAngle + (i - (this.burstCount - 1) / 2) * spread;
          this.createBullet(bullets, this.x, this.y, angle);
        }
      }
    }
  }

  handleCircularAttack(bullets, player) {
    this.shootCooldown++;
    const attack = this.config.attack || {};
    const cooldown = attack.cooldown ?? this.config.shootCooldown ?? 60;
    
    if (this.shootCooldown > cooldown) {
      this.shootCooldown = 0;

      // Create ring of bullets
      const numBullets = 8;
      for (let i = 0; i < numBullets; i++) {
        const angle = (i / numBullets) * Math.PI * 2;
        this.createBullet(bullets, this.x, this.y, angle);
      }
    }
  }

  handleSpreadingAttack(bullets, player) {
    this.shootCooldown++;
    const attack = this.config.attack || {};
    const cooldown = attack.cooldown ?? this.config.shootCooldown ?? 60;
    
    if (this.shootCooldown > cooldown) {
      this.shootCooldown = 0;
      const angle = Math.atan2(player.y - this.y, player.x - this.x);

      // Support both old and new config structure for bullet properties
      const bulletSize = attack.bulletSize ?? this.config.bulletSize ?? 6;
      const bulletSpeed = attack.bulletSpeed ?? this.config.bulletSpeed ?? 3;
      const bulletColor = attack.bulletColor ?? this.config.bulletColor ?? this.color;

      bullets.push(
        new SpreadingBullet(
          this.x,
          this.y,
          angle,
          bulletSize,
          bulletColor,
          this.isPortrait,
          bulletSpeed,
          this.spreadExplosionTime,
          this.game,
          {
            count: this.spreadBulletCount,
            speed: this.spreadBulletSpeed,
            size: this.spreadBulletSize,
          }
        )
      );
    }
  }

  handleLaserAttack(lasers, player) {
    // Handle laser state machine
    switch (this.laserState) {
      case "cooldown":
        this.laserCooldown += 1; // Normal speed increment
        if (this.laserCooldown > this.chargeTime) {
          this.laserState = "charging";
          this.laserChargeTime = 0;
        }
        break;

      case "charging":
        this.laserChargeTime += 1;
        if (this.laserChargeTime > this.chargeTime) {
          this.laserState = "preview";
          this.laserChargeTime = 0;
          this.targetX = player.x;
          this.targetY = player.y;
        }
        break;

      case "preview":
        this.laserChargeTime += 1;
        if (this.laserChargeTime > this.previewTime) {
          this.laserState = "firing";
          this.laserChargeTime = 0;

          // Add targeting inaccuracy
          const offsetX = (Math.random() - 0.5) * this.targetingAccuracy * 2;
          const offsetY = (Math.random() - 0.5) * this.targetingAccuracy * 2;
          this.laserAngle = Math.atan2(
            this.targetY + offsetY - this.y,
            this.targetX + offsetX - this.x
          );

          // Create laser projectile
          const attack = this.config.attack || {};
          const laserSpeed = attack.laserSpeed ?? 80;
          const bulletColor = attack.bulletColor ?? this.config.bulletColor ?? "#ff0000";
          
          lasers.push(
            new Laser(
              this.x,
              this.y,
              this.laserAngle,
              laserSpeed,
              bulletColor,
              this.game
            )
          );
        }
        break;

      case "firing":
        this.laserChargeTime += 1;
        if (this.laserChargeTime > this.firingTime) {
          this.laserState = "cooldown";
          this.laserCooldown = 0;
        }
        break;
    }
  }

  handlePulseAttack(bullets, player) {
    this.pulseTimer += 1;
    if (this.pulseTimer > this.pulseInterval) {
      this.pulseTimer = 0;

      // Create ring of bullets
      for (let i = 0; i < this.pulseBulletCount; i++) {
        const angle = (i / this.pulseBulletCount) * Math.PI * 2;
        this.createBullet(bullets, this.x, this.y, angle);
      }
    }
  }

  createBullet(bullets, x, y, angle) {
    // Support both old and new config structure for bullet properties
    const attack = this.config.attack || {};
    const bulletColor = attack.bulletColor ?? this.config.bulletColor ?? this.color;
    const bulletType = attack.bulletType ?? this.config.bulletType ?? "normal";
    const bulletSize = attack.bulletSize ?? this.config.bulletSize ?? 6;
    const bulletSpeed = attack.bulletSpeed ?? this.config.bulletSpeed ?? 3;
    const bulletDamage = attack.bulletDamage ?? this.config.bulletDamage ?? 1;

    switch (bulletType) {
      case "circular":
        bullets.push(
          new CircularBullet(
            x,
            y,
            angle,
            bulletSize,
            bulletColor,
            this.isPortrait,
            bulletSpeed
          )
        );
        break;

      case "normal":
      default:
        bullets.push(
          new Bullet(
            x,
            y,
            angle,
            bulletSize,
            bulletColor,
            this.isPortrait,
            bulletSpeed,
            false, // isPlayerBullet
            this.game,
            bulletDamage
          )
        );
        break;
    }
  }

  // Legacy render method for backward compatibility
  render(ctx) {
    // If ctx looks like a Canvas 2D context, use Canvas rendering
    if (ctx && ctx.fillStyle !== undefined) {
      return this.renderCanvas(ctx);
    } else if (ctx && ctx.scene !== undefined) {
      // If ctx has scene (WebGL context object), use WebGL rendering
      return this.renderWebGL(ctx.scene, ctx.materials);
    } else {
      // Fallback to Canvas with basic context
      return this.renderCanvas(ctx);
    }
  }

  renderCanvas(ctx) {
    // Draw laser warning line BEFORE transformations (for laser enemies)
    if (
      this.attackPattern === "laser" &&
      this.laserState === "preview"
    ) {
      this.renderLaserWarning(ctx);
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Apply opacity for fade-in effect
    ctx.globalAlpha = this.opacity || 1.0;

    // Apply visual rotation if configured
    if (this.config.visualConfig?.rotationSpeed) {
      ctx.rotate(this.time * this.config.visualConfig.rotationSpeed);
    }

    // Draw charging effects for laser enemies
    if (
      this.attackPattern === "laser" &&
      this.laserState === "charging"
    ) {
      this.renderChargingEffect(ctx);
    }

    // Draw pulse warning for pulse enemies
    if (
      this.attackPattern === "pulse" &&
      this.pulseTimer > this.pulseInterval - this.warningTime
    ) {
      this.renderPulseWarning(ctx);
    }

    // Call config-driven shape rendering
    this.renderShape(ctx);

    ctx.restore();
  }

  renderWebGL(scene, materials) {
    // Create unique mesh name for this enemy
    const meshName = `enemy_${this.id || Math.random().toString(36)}`;
    let enemyMesh = scene.getObjectByName(meshName);
    
    if (!enemyMesh) {
      // Create geometry based on enemy shape
      let geometry;
      const shape = this.config.visualConfig?.shape || 'triangle';
      
      switch (shape) {
        case 'circle':
          geometry = new THREE.SphereGeometry(this.size * 0.5, 12, 8);
          break;
        case 'square':
        case 'roundedSquare':
          geometry = new THREE.BoxGeometry(this.size * 1.2, this.size * 1.2, this.size * 0.5);
          break;
        case 'equalTriangle':
        case 'sharpTriangle':
        case 'triangle':
        default:
          geometry = new THREE.ConeGeometry(this.size * 0.8, this.size * 1.5, 3);
          break;
      }
      
      // Create material with enemy color
      const material = new THREE.MeshLambertMaterial({
        color: this.color || 0xff4444,
        transparent: true,
        opacity: this.opacity || 1.0
      });
      
      enemyMesh = new THREE.Mesh(geometry, material);
      enemyMesh.name = meshName;
      enemyMesh.userData = { isDynamic: true, entityType: 'enemy' };
      scene.add(enemyMesh);
    }
    
    // Update position and rotation
    enemyMesh.position.set(this.x, -this.y, 0); // Flip Y for screen coordinates
    enemyMesh.rotation.z = -this.angle; // Flip rotation for screen coordinates
    
    // Apply visual rotation if configured
    if (this.config.visualConfig?.rotationSpeed) {
      enemyMesh.rotation.z -= this.time * this.config.visualConfig.rotationSpeed;
    }
    
    // Update material properties
    enemyMesh.material.opacity = this.opacity || 1.0;
    enemyMesh.material.color.set(this.color || '#ff4444');
    
    // Handle charging effect for laser enemies
    if (this.attackPattern === "laser" && this.laserState === "charging") {
      const charge = this.laserChargeTime / this.chargeTime;
      const intensity = Math.min(1, charge);
      enemyMesh.material.emissive.setRGB(intensity * 0.5, 0, 0);
      enemyMesh.scale.setScalar(1 + intensity * 0.3);
    } else {
      enemyMesh.material.emissive.setRGB(0, 0, 0);
      enemyMesh.scale.setScalar(1);
    }
    
    // Handle pulse warning for pulse enemies
    if (this.attackPattern === "pulse" && this.pulseTimer > this.pulseInterval - this.warningTime) {
      const pulse = (this.pulseTimer - (this.pulseInterval - this.warningTime)) / this.warningTime;
      enemyMesh.material.emissive.setRGB(pulse * 0.8, pulse * 0.8, 0);
      enemyMesh.scale.setScalar(1 + pulse * 0.5);
    } else if (this.attackPattern !== "laser") {
      enemyMesh.material.emissive.setRGB(0, 0, 0);
      if (this.attackPattern !== "laser") {
        enemyMesh.scale.setScalar(1);
      }
    }
    
    // TODO: Handle laser warning lines in WebGL (would need line geometry)
    // For now, laser warnings will only show in Canvas mode
  }

  renderLaserWarning(ctx) {
    if (this.targetX === undefined || this.targetY === undefined) return;

    ctx.save();

    const pulseIntensity = 0.7 + 0.3 * Math.sin(Date.now() * 0.02);
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const angle = Math.atan2(dy, dx);

    const screenDiagonal = Math.sqrt(
      window.innerWidth * window.innerWidth +
        window.innerHeight * window.innerHeight
    );
    const endX = this.x + Math.cos(angle) * screenDiagonal;
    const endY = this.y + Math.sin(angle) * screenDiagonal;

    // Draw trajectory warning line
    ctx.strokeStyle = `rgba(255, 0, 0, ${pulseIntensity * 0.8})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 6]);
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw thicker laser tip indicator
    ctx.strokeStyle = `rgba(255, 0, 0, ${pulseIntensity})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + Math.cos(angle) * 40, this.y + Math.sin(angle) * 40);
    ctx.stroke();

    ctx.restore();
  }

  renderChargingEffect(ctx) {
    const charge = this.laserChargeTime / this.chargeTime;
    const intensity = Math.min(1, charge);

    ctx.strokeStyle = `rgba(255, 255, 255, ${intensity * 0.8})`;
    ctx.lineWidth = 2 + intensity * 8;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * (0.7 + intensity * 0.5), 0, Math.PI * 2);
    ctx.stroke();
  }

  renderPulseWarning(ctx) {
    const pulse =
      (this.pulseTimer - (this.pulseInterval - this.warningTime)) /
      this.warningTime;
    ctx.strokeStyle = `rgba(255, 153, 153, ${1 - pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * (1 + pulse * 2), 0, Math.PI * 2);
    ctx.stroke();
  }

  renderShape(ctx) {
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.config.strokeColor;
    ctx.lineWidth = this.config.strokeWidth;

    switch (this.config.shape) {
      case "triangle":
        this.renderTriangle(ctx);
        break;

      case "circle":
        this.renderCircle(ctx);
        break;

      case "square":
        this.renderSquare(ctx);
        break;

      case "rounded-square":
        this.renderRoundedSquare(ctx);
        break;

      case "equal-triangle":
        this.renderEqualTriangle(ctx);
        break;

      case "sharp-triangle":
        this.renderSharpTriangle(ctx);
        break;

      case "two-circles":
        this.renderTwoCircles(ctx);
        break;

      case "ring":
        this.renderRing(ctx);
        break;

      default:
        this.renderTriangle(ctx);
        break;
    }
  }

  renderTriangle(ctx) {
    ctx.beginPath();
    ctx.moveTo(this.size, 0);
    ctx.lineTo(-this.size * 0.5, -this.size * 0.5);
    ctx.lineTo(-this.size * 0.3, 0);
    ctx.lineTo(-this.size * 0.5, this.size * 0.5);
    ctx.closePath();
    ctx.fill();
    if (this.config.strokeWidth > 0) ctx.stroke();
  }

  renderCircle(ctx) {
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    if (this.config.strokeWidth > 0) ctx.stroke();

    // Add laser cannon for laser enemies
    if (this.attackPattern === "laser") {
      ctx.beginPath();
      ctx.rect(
        this.size * 0.3,
        -this.size * 0.08,
        this.size * 0.8,
        this.size * 0.16
      );
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.rect(
        this.size * 1.05,
        -this.size * 0.1,
        this.size * 0.1,
        this.size * 0.2
      );
      ctx.fill();
      ctx.stroke();
    }
  }

  renderSquare(ctx) {
    ctx.beginPath();
    ctx.rect(
      -this.size * 0.6,
      -this.size * 0.6,
      this.size * 1.2,
      this.size * 1.2
    );
    ctx.fill();
    if (this.config.strokeWidth > 0) ctx.stroke();
  }

  renderRoundedSquare(ctx) {
    const radius = this.size * 0.2;
    const x = -this.size * 0.6;
    const y = -this.size * 0.6;
    const width = this.size * 1.2;
    const height = this.size * 1.2;

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    if (this.config.strokeWidth > 0) ctx.stroke();
  }

  renderEqualTriangle(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, -this.size * 0.7);
    ctx.lineTo(-this.size * 0.6, this.size * 0.35);
    ctx.lineTo(this.size * 0.6, this.size * 0.35);
    ctx.closePath();
    ctx.fill();
    if (this.config.strokeWidth > 0) ctx.stroke();
  }

  renderSharpTriangle(ctx) {
    ctx.beginPath();
    ctx.moveTo(this.size * 1.2, 0);
    ctx.lineTo(-this.size * 0.8, -this.size * 0.4);
    ctx.lineTo(-this.size * 0.8, this.size * 0.4);
    ctx.closePath();
    ctx.fill();
    if (this.config.strokeWidth > 0) ctx.stroke();
  }

  renderTwoCircles(ctx) {
    // Top circle
    ctx.beginPath();
    ctx.arc(0, -this.size * 0.6, this.size * 0.6, 0, Math.PI * 2);
    ctx.fill();
    if (this.config.strokeWidth > 0) ctx.stroke();

    // Bottom circle
    ctx.beginPath();
    ctx.arc(0, this.size * 0.6, this.size * 0.6, 0, Math.PI * 2);
    ctx.fill();
    if (this.config.strokeWidth > 0) ctx.stroke();
  }

  renderRing(ctx) {
    // Outer ring
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Inner hole
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Stroke both rings
    if (this.config.strokeWidth > 0) {
      ctx.strokeStyle = this.config.strokeColor;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Add rotating orbital elements for circle enemies
    if (this.movementPattern === "circle") {
      const thrusterAngle = this.time * 0.1;
      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI * 2) / 3 + thrusterAngle;
        const x = Math.cos(angle) * this.size * 0.9;
        const y = Math.sin(angle) * this.size * 0.9;
        ctx.fillStyle = "#00ddff";
        ctx.beginPath();
        ctx.arc(x, y, this.size * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// Factory function to create enemies from configuration
export function createEnemyFromConfig(
  configName,
  x,
  y,
  isPortrait,
  game,
  isClone = false,
  generation = 0
) {
  const config = game?.level?.getEnemyConfig(configName);

  if (!config) {
    console.warn(`No config found for enemy: ${configName}, using default`);
    // Create a basic enemy with defaults if config is missing
    return new Enemy(x, y, isPortrait, null, isClone, generation, game);
  }

  return new Enemy(x, y, isPortrait, config, isClone, generation, game);
}

export { Asteroid } from "./asteroid.js";