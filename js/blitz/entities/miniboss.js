// MiniBoss entity for BlitzRain
import { Enemy } from "./enemy.js";

export class MiniBoss extends Enemy {
  constructor(x, y, isPortrait, canvasWidth = 700, game = null) {
    super(x, y, isPortrait, 0.5); // Call Enemy constructor with speed 0.5
    this.type = "miniboss"; // Generic miniboss type
    this.game = game; // Store reference to game for SVG loading
    
    // Get level manager config
    const config = game && game.level ? game.level.config : null;
    
    // Use level manager constants with fallbacks
    this.size = config?.miniBossSize || 90;
    this.maxHealth = config?.miniBossMaxHealth || 100;
    this.health = this.maxHealth;
    this.frameCount = 0;
    this.angle = isPortrait ? Math.PI / 2 : 0;
    
    // Custom sprite properties
    this.customSprite = null; // SVG path for custom sprite
    this.spriteScale = 1; // Scale factor for sprite
    this.spriteColor = "#ff4444"; // Default color
    this.svgAssetName = null; // Name of SVG asset to load
    
    // New configurable attack system
    this.attackPatterns = []; // Array of attack patterns from config
    this.attackStates = new Map(); // Map of pattern index to state

    // Movement pattern - use level manager constants
    this.movePattern = "entering"; // Start with entering phase
    this.patrolDirection = 1;
    this.patrolRange = config?.miniBossPatrolRange || 150;
    this.startY = y;
    this.startX = x;
    this.targetY = isPortrait ? (config?.miniBossTargetYPortrait || 150) : y;
    this.targetX = isPortrait ? x : canvasWidth - (config?.miniBossTargetXLandscape || 150);

    // Legacy weapon support (will be removed)
    this.primaryWeaponTimer = 0;
    this.secondaryWeaponTimer = 0;
    this.circularWeaponTimer = 0;
    this.burstWeaponTimer = 0;
    this.primaryWeaponCooldown = config?.miniBossPrimaryWeaponCooldown || 60;
    this.secondaryWeaponCooldown = config?.miniBossSecondaryWeaponCooldown || 90;
    this.circularWeaponCooldown = config?.miniBossCircularWeaponCooldown || 120;
    this.burstWeaponCooldown = config?.miniBossBurstWeaponCooldown || 90;

    // Projectile color alternating counter for vibe shift
    this.projectileColorCounter = 0;

    // Shield system
    this.invulnerable = true; // Start invulnerable
    this.invulnerableTimer = 0;
    this.invulnerableDuration = config?.miniBossInvulnerableDuration || 180;
    this.shield = config?.miniBossShield || 50;
    this.maxShield = config?.miniBossMaxShield || 50;

    // Visual effects
    this.hitFlash = 0;
    this.damageGlow = 0; // Red glow effect when taking damage
    this.chargingSecondary = 0;
    this.playerRef = null; // To store player reference for aiming
    this.enemySpawnTimer = 0;
    this.enemySpawnCooldown = config?.miniBossEnemySpawnCooldown || 200;

    // Enhanced death effect system
    this.dying = false;
    this.deathTimer = 0;
    this.deathDuration = config?.miniBossDeathDuration || 300; // 5 seconds - increased duration
    this.deathExplosionTimer = 0;
    this.deathExplosionInterval = config?.miniBossDeathExplosionInterval || 6; // More frequent explosions
    this.finalExplosionTriggered = false;
    this.deathBlinkTimer = 0;
    this.deathBlinkInterval = 4; // Faster blinking for more dramatic effect
    this.showRedFlash = false;
    this.opacity = 1.0;
    this.fadeOutStarted = false;
    this.deathSoundTimer = 0;
    this.deathSoundInterval = 30; // Play death sound every 0.5 seconds
    this.deathExplosionCount = 0;
    this.maxDeathExplosions = 20; // More explosions for dramatic effect
    this.isDefeated = false; // Add isDefeated property for consistency with boss

    // Velocity tracking (dx/dy per second)
    this.dx = 0;
    this.dy = 0;
  }

  // Set custom sprite (legacy method)
  setCustomSprite(svgPath, scale = 1, color = "#ff4444") {
    this.customSprite = svgPath;
    this.spriteScale = scale;
    this.spriteColor = color;
  }
  
  // Set custom SVG sprite from asset loader
  async setCustomSVGSprite(assetName, scale = 1, color = "#ff4444") {
    this.svgAssetName = assetName;
    this.spriteScale = scale;
    this.spriteColor = color;
    
    // Get the SVG from entity manager if available
    if (this.game && this.game.entities) {
      try {
        const svgAsset = await this.game.entities.getSVGAsset(assetName);
        if (svgAsset) {
          this.customSprite = this.game.entities.svgToPath2D(svgAsset);
        }
      } catch (error) {
        console.warn(`Failed to load SVG sprite: ${assetName}`, error);
      }
    }
  }

  // Configure attack patterns from level config
  configureAttacks(attacksConfig) {
    // Handle both single attack and array of attacks
    if (Array.isArray(attacksConfig)) {
      this.attackPatterns = attacksConfig;
    } else if (attacksConfig) {
      this.attackPatterns = [attacksConfig];
    } else {
      this.attackPatterns = [];
    }
    
    // Initialize attack states for each pattern
    this.attackStates.clear();
    for (let i = 0; i < this.attackPatterns.length; i++) {
      const pattern = this.attackPatterns[i];
      this.attackStates.set(i, {
        timer: 0,
        cooldownPhase: 'firing', // 'firing' or 'paused'
        cooldownTimer: 0
      });
    }
  }
  
  // Legacy method for backwards compatibility
  addAttack(attackType, attackConfig) {
    // Convert legacy attack to new format if needed
    console.warn('addAttack is deprecated, use configureAttacks instead');
  }

  // Check if this miniboss is vulnerable
  isVulnerable() {
    return !this.invulnerable && !this.dying;
  }

  // Get the effective collision size, accounting for SVG image scaling
  getCollisionSize() {
    // For all minibosses (including SVG sprites), use a consistent collision radius
    // that's smaller than the visual size to be more forgiving to the player
    return this.size * 0.6; // 60% of visual size for more forgiving collision
  }

  // Get precise collision boundary for shape-based collision detection
  getCollisionBoundary() {
    // For SVG sprites, use circle collision to avoid complex Path2D collision issues
    // The Path2D collision detection is unreliable and causes collision mismatches
    return {
      type: 'circle',
      x: this.x,
      y: this.y,
      radius: this.getCollisionSize()
    };
  }

  update(playerX, playerY, slowdownFactor = 1.0) {
    this.frameCount += slowdownFactor;

    // Make miniboss face the player (if not dying)
    if (!this.dying) {
      this.angle = Math.atan2(playerY - this.y, playerX - this.x);
    }

    // Handle enhanced death sequence (only if not yet defeated)
    if (this.dying && !this.isDefeated) {
      this.deathTimer += slowdownFactor;
      this.deathExplosionTimer += slowdownFactor;
      this.deathBlinkTimer += slowdownFactor;
      this.deathSoundTimer += slowdownFactor;

      // Handle rapid red blinking effect
      if (this.deathBlinkTimer >= this.deathBlinkInterval) {
        this.deathBlinkTimer = 0;
        this.showRedFlash = !this.showRedFlash;
      }

      // Start fade out in the last third of death sequence
      if (this.deathTimer >= this.deathDuration * 0.66 && !this.fadeOutStarted) {
        this.fadeOutStarted = true;
      }

      // Fade out gradually
      if (this.fadeOutStarted) {
        const fadeProgress = (this.deathTimer - this.deathDuration * 0.66) / (this.deathDuration * 0.34);
        this.opacity = Math.max(0, 1 - fadeProgress);
      }

      // Play cascading death sounds
      if (this.deathSoundTimer >= this.deathSoundInterval && this.deathExplosionCount < this.maxDeathExplosions) {
        this.deathSoundTimer = 0;
        return {
          type: "death_sound",
          soundType: "miniBossExplosion"
        };
      }

      // Trigger final mega explosion when death timer is complete
      if (
        this.deathTimer >= this.deathDuration &&
        !this.finalExplosionTriggered
      ) {
        this.finalExplosionTriggered = true;
        // Create the final explosion effect
        if (this.game && this.game.effects) {
          this.game.effects.createExplosion(this.x, this.y, this.size * 3, 3.0);
        }
        if (this.game && this.game.audio) {
          this.game.audio.play(this.game.audio.sounds.megaExplosion || this.game.audio.sounds.explosion);
        }
        // Mark as defeated and return the string that entity manager expects for removal
        this.isDefeated = true;
        return "final_explosion";
      }

      // Create more frequent and varied explosions around the miniboss
      if (this.deathExplosionTimer >= this.deathExplosionInterval && this.deathExplosionCount < this.maxDeathExplosions) {
        this.deathExplosionTimer = 0;
        this.deathExplosionCount++;
        
        // Create escalating explosion pattern
        const explosionAngle = Math.random() * Math.PI * 2;
        const baseDistance = this.size * 0.5;
        const maxDistance = this.size * 1.5;
        const progressFactor = this.deathExplosionCount / this.maxDeathExplosions;
        const explosionDistance = baseDistance + (maxDistance - baseDistance) * progressFactor;
        
        const explosionX = this.x + Math.cos(explosionAngle) * explosionDistance;
        const explosionY = this.y + Math.sin(explosionAngle) * explosionDistance;
        
        // Larger explosions as death progresses
        const baseSize = 30;
        const maxSize = 80;
        const explosionSize = baseSize + (maxSize - baseSize) * progressFactor + Math.random() * 20;
        
        return {
          type: "death_explosion",
          x: explosionX,
          y: explosionY,
          size: explosionSize,
          intensity: progressFactor // For visual effects scaling
        };
      }

      return "dying";
    }

    // Handle invulnerable timer
    if (this.invulnerable) {
      this.invulnerableTimer += slowdownFactor;
      if (this.invulnerableTimer >= this.invulnerableDuration) {
        this.invulnerable = false;
      }
    }

    // Store previous position for velocity calculation
    const prevX = this.x;
    const prevY = this.y;

    // Movement logic
    if (this.movePattern === "entering") {
      // Move to target position
      if (this.isPortrait) {
        // Portrait: move down from top
        if (this.y < this.targetY) {
          this.y += this.speed * slowdownFactor;
        } else {
          this.movePattern = "patrol";
          this.startY = this.y;
          this.startX = this.x;
        }
      } else {
        // Landscape: move left from right
        if (this.x > this.targetX) {
          this.x -= this.speed * slowdownFactor;
        } else {
          this.movePattern = "patrol";
          this.startY = this.y;
          this.startX = this.x;
        }
      }
    } else if (this.movePattern === "patrol") {
      // Patrol movement
      if (this.isPortrait) {
        this.x += this.patrolDirection * this.speed * slowdownFactor;
        if (Math.abs(this.x - this.startX) > this.patrolRange) {
          this.patrolDirection *= -1;
        }
      } else {
        this.y += this.patrolDirection * this.speed * slowdownFactor;
        if (Math.abs(this.y - this.startY) > this.patrolRange) {
          this.patrolDirection *= -1;
        }
      }
    }

    // Calculate velocity (pixels per frame * 60 = pixels per second)
    this.dx = (this.x - prevX) * 60;
    this.dy = (this.y - prevY) * 60;

    // Update new attack system timers
    this.updateAttackTimers(slowdownFactor);
    
    // Legacy weapon timers (for backwards compatibility)
    this.primaryWeaponTimer += slowdownFactor;
    this.secondaryWeaponTimer += slowdownFactor;
    this.circularWeaponTimer += slowdownFactor;
    this.burstWeaponTimer += slowdownFactor;
    this.enemySpawnTimer += slowdownFactor; // Increment enemy spawn timer

    // Reduce hit flash
    if (this.hitFlash > 0) {
      this.hitFlash -= slowdownFactor;
    }
    
    // Reduce damage glow
    if (this.damageGlow > 0) {
      this.damageGlow -= slowdownFactor;
    }

    // Secondary weapon charging effect
    if (this.secondaryWeaponTimer > this.secondaryWeaponCooldown - 60) {
      this.chargingSecondary = Math.min(this.chargingSecondary + 0.1, 1);
    } else {
      this.chargingSecondary = 0;
    }

    // Spawn enemy periodically
    if (this.canSpawnEnemy()) {
      // This will be handled in BlitzGame.update()
      // We just reset the timer here
      this.enemySpawnTimer = 0;
    }
  }

  takeDamage(damage = 1, collisionX = null, collisionY = null) {

    // Validate damage parameter
    if (typeof damage !== 'number' || isNaN(damage)) {
      console.warn(`MiniBoss ${this.type} received invalid damage: ${damage}, defaulting to 1`);
      damage = 1;
    }

    // Invulnerable prevents all damage
    if (this.invulnerable) {
      return "invulnerable";
    }

    // Already dying, ignore further damage
    if (this.dying) {
      return "dying";
    }

    // Create damage effects when taking damage
    const damageX = collisionX !== null ? collisionX : this.x;
    const damageY = collisionY !== null ? collisionY : this.y;
    
    // Create particle explosion at damage point
    if (this.game && this.game.effects) {
      this.game.effects.createImpactParticles(damageX, damageY, damage);
    }

    // Shield absorbs damage first
    if (this.shield > 0) {
      this.shield -= damage;
      // Fix NaN shield values
      if (isNaN(this.shield)) {
        console.warn(`MiniBoss ${this.type} shield became NaN, setting to 0`);
        this.shield = 0;
      }
      this.hitFlash = 20; // Increased for more visible effect
      this.damageGlow = 30; // Add red glow effect
      if (this.shield <= 0) {
        this.shield = 0;
        return "shield_destroyed";
      }
      return "shield_damaged";
    }

    // Damage health if no shield
    this.health -= damage;
    // Fix NaN health values
    if (isNaN(this.health)) {
      console.warn(`MiniBoss ${this.type} health became NaN, setting to 0`);
      this.health = 0;
    }
    this.hitFlash = 20; // Increased for more visible effect
    this.damageGlow = 30; // Add red glow effect
    if (this.health <= 0 || isNaN(this.health)) {
      this.dying = true;
      this.deathTimer = 0;
      return "dying";
    }
    return "damaged";
  }

  canFirePrimary() {
    return this.primaryWeaponTimer >= this.primaryWeaponCooldown && !this.dying;
  }

  canFireSecondary() {
    return (
      this.secondaryWeaponTimer >= this.secondaryWeaponCooldown && !this.dying
    );
  }

  firePrimary(playerX, playerY) {
    this.primaryWeaponTimer = 0;
    
    // Check if we have a configured primary attack
    const primaryAttack = this.attacks.get("primary");
    if (primaryAttack) {
      return this.fireConfiguredWeapon(primaryAttack, playerX, playerY);
    }
    
    // Default primary attack
    const angleToPlayer = Math.atan2(playerY - this.y, playerX - this.x);
    const bulletSpeed = 2;
    return {
      x: this.x,
      y: this.y,
      vx: Math.cos(angleToPlayer) * bulletSpeed,
      vy: Math.sin(angleToPlayer) * bulletSpeed,
      size: 8,
      color: this.getProjectileColor(),
      type: "miniBossPrimary",
    };
  }

  // Get alternating bullet color (half sprite color, half white/red - no black for visibility)
  getProjectileColor() {
    this.projectileColorCounter++;
    if (this.projectileColorCounter % 2 === 0) {
      return this.spriteColor; // Use miniboss color
    } else {
      // Alternate between white and red (both visible against black background)
      return Math.random() < 0.5 ? "#ffffff" : "#ff4444";
    }
  }

  fireSecondary(playerX, playerY) {
    this.secondaryWeaponTimer = 0;
    this.chargingSecondary = 0;
    
    // Check if we have a configured secondary attack
    const secondaryAttack = this.attacks.get("secondary");
    if (secondaryAttack) {
      return this.fireConfiguredWeapon(secondaryAttack, playerX, playerY);
    }
    
    // Default secondary attack (spread)
    const bullets = [];
    const angleToPlayer = Math.atan2(playerY - this.y, playerX - this.x);
    const bulletSpeed = 1.8;
    const spreadAngle = 0.2;
    
    for (let i = -1; i <= 1; i++) {
      const angle = angleToPlayer + i * spreadAngle;
      bullets.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * bulletSpeed,
        vy: Math.sin(angle) * bulletSpeed,
        size: 7,
        color: this.getProjectileColor(),
        type: "miniBossSecondary",
      });
    }
    return bullets;
  }

  canSpawnEnemy() {
    return this.enemySpawnTimer >= this.enemySpawnCooldown && !this.dying;
  }

  spawnEnemy(playerX, playerY) {
    this.enemySpawnTimer = 0;

    // Randomly choose enemy type
    const enemyTypes = ["straight", "sine", "zigzag", "dive"];
    const randomType =
      enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

    // Adjust speed based on enemy type
    let speed = 2; // Base speed
    if (randomType === "dive") {
      speed = 3; // Faster dive enemies
    } else if (randomType === "straight") {
      speed = 2.5; // Slightly faster straight enemies
    }

    return {
      x: this.x,
      y: this.y,
      type: randomType,
      isPortrait: this.isPortrait,
      speed: speed,
      targetX: playerX, // Pass player's current position as target for dive enemies
      targetY: playerY,
    };
  }

  canFireCircular() {
    return (
      this.circularWeaponTimer >= this.circularWeaponCooldown && !this.dying
    );
  }

  fireCircular(playerX, playerY) {
    this.circularWeaponTimer = 0;
    
    // Check if we have a configured circular attack
    const circularAttack = this.attacks.get("circular");
    if (circularAttack) {
      return this.fireConfiguredWeapon(circularAttack, playerX, playerY);
    }
    
    // Default circular attack
    const bullets = [];
    const bulletSpeed = 1.5;
    const numBullets = 12;
    
    for (let i = 0; i < numBullets; i++) {
      const angle = (i / numBullets) * Math.PI * 2;
      bullets.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * bulletSpeed,
        vy: Math.sin(angle) * bulletSpeed,
        size: 7,
        color: this.getProjectileColor(),
        type: "miniBossCircular",
      });
    }
    return bullets;
  }

  canFireBurst() {
    return this.burstWeaponTimer >= this.burstWeaponCooldown && !this.dying;
  }

  fireBurst(playerX, playerY) {
    this.burstWeaponTimer = 0;
    const bullets = [];
    const angleToPlayer = Math.atan2(playerY - this.y, playerX - this.x);
    const bulletSpeed = 2.5; // Further reduced speed

    // Fire 2 bullets in rapid succession (simulated by slight angle variations)
    for (let i = 0; i < 2; i++) {
      const angleVariation = (Math.random() - 0.5) * 0.1; // Small random spread
      const angle = angleToPlayer + angleVariation;
      bullets.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * bulletSpeed,
        vy: Math.sin(angle) * bulletSpeed,
        size: 7, // Smaller burst projectiles
        color: this.getProjectileColor(), // Orange color for distinction
        type: "miniBossBurst",
      });
    }
    return bullets;
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
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle); // Add this line for rotation

    // Apply death effects (only if not yet defeated)
    if (this.dying && !this.isDefeated) {
      // Apply opacity for fade out
      ctx.globalAlpha = this.opacity;
    }


    // Apply damage ring effect when taking damage
    if (this.damageGlow > 0) {
      ctx.save();
      
      // Calculate ring size based on miniboss size
      const ringRadius = this.size * 1.8; // Ring extends beyond miniboss
      const ringWidth = 10; // Thick ring for damage
      
      // Set damage ring properties
      ctx.strokeStyle = "#ff0000"; // Red ring for damage
      ctx.lineWidth = ringWidth;
      ctx.globalAlpha = Math.min(0.9, this.damageGlow / 20); // Intense red glow
      ctx.lineCap = 'round';
      
      // Draw the damage ring
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.restore();
    }

    // Draw mini-boss ship using custom sprite or fallback to default
    if (this.customSprite) {
      this.drawCustomSprite(ctx);
    } else {
      // If we have an SVG asset name but no custom sprite, try to load it again
      if (this.svgAssetName && !this.svgLoadingAttempted) {
        this.svgLoadingAttempted = true;
        this.setCustomSVGSprite(this.svgAssetName, this.spriteScale, this.spriteColor)
          .catch(error => console.warn('Retry SVG load failed:', error));
      }
      this.drawDefaultSprite(ctx);
    }

    // Invulnerable effect - gold ring around the miniboss
    if (this.invulnerable) {
      ctx.save();
      
      // Calculate ring size and pulsing effect
      const baseRadius = this.size * 2.0; // Larger ring for invulnerability
      const pulseIntensity = 0.2 * Math.sin(this.frameCount * 0.3);
      const ringRadius = baseRadius * (1 + pulseIntensity);
      const ringWidth = 12; // Thick gold ring
      
      // Set invulnerable ring properties
      ctx.strokeStyle = "#ffcc00"; // Gold ring
      ctx.lineWidth = ringWidth;
      ctx.globalAlpha = 0.8 + 0.2 * Math.sin(this.frameCount * 0.3); // Pulsing opacity
      ctx.lineCap = 'round';
      
      // Draw the invulnerable ring
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.restore();
    }

    ctx.restore();

    // Draw shield bar and health bar (outside of rotation transform)
    this.drawShieldAndHealthBar(ctx);

    // Remove red charging outline effect

    ctx.restore();
  }

  renderWebGL(scene, materials) {
    // Create unique mesh name for this miniboss
    const meshName = `miniboss_${this.id || Math.random().toString(36)}`;
    let minibossMesh = scene.getObjectByName(meshName);
    
    if (!minibossMesh) {
      // Create larger enemy geometry with angular design
      const geometry = new THREE.OctahedronGeometry(this.size * 0.8, 1);
      
      // Create material with miniboss color
      const material = new THREE.MeshBasicMaterial({
        color: this.spriteColor || '#ff4444',
        transparent: true,
        opacity: this.opacity || 1.0
      });
      
      minibossMesh = new THREE.Mesh(geometry, material);
      minibossMesh.name = meshName;
      minibossMesh.userData = { isDynamic: true, entityType: 'miniboss' };
      scene.add(minibossMesh);
      
      // Add shield effect as child mesh
      if (this.shield > 0) {
        const shieldGeometry = new THREE.SphereGeometry(this.size * 1.2, 16, 12);
        const shieldMaterial = new THREE.MeshBasicMaterial({
          color: 0x0088ff,
          transparent: true,
          opacity: 0.3,
          wireframe: true
        });
        const shieldMesh = new THREE.Mesh(shieldGeometry, shieldMaterial);
        shieldMesh.name = `${meshName}_shield`;
        minibossMesh.add(shieldMesh);
      }
    }
    
    // Update position and rotation
    minibossMesh.position.set(this.x, -this.y, 0);
    minibossMesh.rotation.z = -this.angle;
    
    // Update material opacity for death effects
    if (this.dying && !this.isDefeated) {
      minibossMesh.material.opacity = this.opacity;
      
      // Add red death glow
      if (this.showRedFlash) {
        minibossMesh.material.color.setHex(0xff0000);
        minibossMesh.material.emissive.setHex(0xff0000);
        minibossMesh.material.emissive.multiplyScalar(0.5);
      }
    } else {
      minibossMesh.material.opacity = 1.0;
      minibossMesh.material.color.set(this.spriteColor || '#ff4444');
    }
    
    // Update shield visibility
    const shieldMesh = minibossMesh.getObjectByName(`${meshName}_shield`);
    if (shieldMesh) {
      shieldMesh.visible = this.shield > 0;
      if (this.shield > 0) {
        shieldMesh.material.opacity = 0.3 * (this.shield / this.maxShield);
      }
    }
    
    // Invulnerable effect - golden glow
    if (this.invulnerable) {
      const glowIntensity = 0.8 + 0.2 * Math.sin(this.frameCount * 0.3);
      minibossMesh.material.emissive.setHex(0xffcc00);
      minibossMesh.material.emissive.multiplyScalar(glowIntensity * 0.4);
    } else {
      minibossMesh.material.emissive.setHex(0x000000);
    }
    
    // Make it glow slightly
    if (!this.dying) {
      minibossMesh.material.emissive.addScalar(0.1);
    }
  }

  drawCustomSprite(ctx) {
    // Custom SVG sprite rendering
    ctx.save();
    
    // SVG sprites may have different natural orientation than the default diamond
    // Add -90 degrees to account for SVG sprites that naturally point upward
    ctx.rotate(-Math.PI / 2);
    
    // For custom SVG sprites from URLs, render as image to preserve original colors and paths
    if (this.svgAssetName && this.svgAssetName.startsWith('http')) {
      this.drawSVGAsImage(ctx);
    } else if (this.customSprite) {
      // Local sprite or legacy sprite - use Path2D approach with coloring
      this.drawSVGAsPath(ctx);
    }
    
    ctx.restore();
    
    // Remove engine glow effects - they look bad over custom sprites
    // this.drawEngineGlow(ctx);
  }
  
  async drawSVGAsImage(ctx) {
    try {
      // Get or create an image from the SVG
      if (!this.svgImage || this.svgImageLoading) {
        if (!this.svgImageLoading) {
          this.svgImageLoading = true;
          this.loadSVGAsImage();
        }
        // Fallback to default rendering while loading
        this.drawDefaultSprite(ctx);
        return;
      }
      
      // Calculate scale to fit the miniboss size
      const scale = (this.size * 2) / Math.max(this.svgImage.width, this.svgImage.height) * this.spriteScale;
      const width = this.svgImage.width * scale;
      const height = this.svgImage.height * scale;
      
      // Draw the SVG image centered
      ctx.drawImage(this.svgImage, -width / 2, -height / 2, width, height);
      
    } catch (error) {
      console.warn('Failed to draw SVG as image:', error);
      this.drawDefaultSprite(ctx);
    }
  }
  
  async loadSVGAsImage() {
    try {
      if (!this.game?.entities?.svgAssetManager) return;
      
      // Get the SVG content
      const svgContent = await this.game.entities.svgAssetManager.loadSVG(this.svgAssetName);
      if (!svgContent) return;
      
      // Create an Image from the SVG
      const img = new Image();
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        this.svgImage = img;
        this.svgImageLoading = false;
        URL.revokeObjectURL(url); // Clean up the object URL
      };
      
      img.onerror = () => {
        console.warn('Failed to load SVG as image');
        this.svgImageLoading = false;
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
      
    } catch (error) {
      console.warn('Error loading SVG as image:', error);
      this.svgImageLoading = false;
    }
  }
  
  drawSVGAsPath(ctx) {
    // Scale and position the SVG to fit the miniboss size
    const scale = (this.size / 512) * this.spriteScale;
    ctx.scale(scale, scale);
    ctx.translate(-512, -512); // Center the SVG
    
    // Apply coloring for local sprites
    if (this.hitFlash > 0 && !this.dying) {
      ctx.fillStyle = this.brightenColor(this.spriteColor);
      ctx.shadowColor = this.spriteColor;
      ctx.shadowBlur = 20;
    } else {
      ctx.fillStyle = this.spriteColor;
    }
    
    // Set fill rule to nonzero
    ctx.fillRule = 'nonzero';
    
    // Draw the custom SVG path
    const path = new Path2D(this.customSprite);
    ctx.fill(path, 'nonzero');
    
    // Reset shadow effect
    ctx.shadowBlur = 0;
  }

  drawDefaultSprite(ctx) {
    // Default miniboss sprite - simple geometric shape
    ctx.save();
    
    // Set the fill color
    if (this.hitFlash > 0 && !this.dying) {
      ctx.fillStyle = "#ff8888";
      ctx.shadowColor = "#ff0000";
      ctx.shadowBlur = 20;
    } else {
      ctx.fillStyle = "#ff4444";
    }
    
    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 3;
    
    // Draw a diamond shape as default
    ctx.beginPath();
    ctx.moveTo(this.size * 0.8, 0);
    ctx.lineTo(0, -this.size * 0.6);
    ctx.lineTo(-this.size * 0.8, 0);
    ctx.lineTo(0, this.size * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Reset shadow effect
    ctx.shadowBlur = 0;
    
    ctx.restore();
    
    // Remove engine glow effects - they look bad
    // this.drawEngineGlow(ctx);
  }

  brightenColor(color) {
    // Simple color brightening function
    if (color.startsWith("#")) {
      const hex = color.slice(1);
      const r = Math.min(255, parseInt(hex.slice(0, 2), 16) + 50);
      const g = Math.min(255, parseInt(hex.slice(2, 4), 16) + 50);
      const b = Math.min(255, parseInt(hex.slice(4, 6), 16) + 50);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    return color;
  }

  drawEngineGlow(ctx) {
    // Generic engine glow effects
    ctx.fillStyle = "#ffaa00";
    ctx.beginPath();
    ctx.arc(-this.size * 0.8, -this.size * 0.15, this.size * 0.1, 0, Math.PI * 2);
    ctx.arc(-this.size * 0.8, this.size * 0.15, this.size * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }


  drawShieldAndHealthBar(ctx) {
    const barWidth = 80; // Fixed width regardless of entity size or health
    const barHeight = 8;
    const barX = this.x - barWidth / 2;
    const barY = this.y - this.size - 20;

    // Single combined bar (shield takes priority over health)
    if (!this.invulnerable) {
      // Background
      ctx.fillStyle = "#333333";
      ctx.fillRect(barX, barY, barWidth, barHeight);

      if (this.shield > 0) {
        // Shield bar (blue)
        const shieldPercent = Math.max(0, Math.min(1, this.shield / this.maxShield)); // Clamp between 0 and 1
        ctx.fillStyle = "#0088ff";
        const shieldBarWidth = Math.max(0, Math.min(barWidth, barWidth * shieldPercent)); // Ensure doesn't exceed bar width
        ctx.fillRect(barX, barY, shieldBarWidth, barHeight);
      } else {
        // Health bar (green)
        const healthPercent = Math.max(0, Math.min(1, this.health / this.maxHealth)); // Clamp between 0 and 1
        ctx.fillStyle = "#00ff00";
        const healthBarWidth = Math.max(0, Math.min(barWidth, barWidth * healthPercent)); // Ensure doesn't exceed bar width
        ctx.fillRect(barX, barY, healthBarWidth, barHeight);
      }

      // Border
      ctx.strokeStyle = "#ff4444";
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    // Invulnerable indicator
    if (this.invulnerable) {
      ctx.fillStyle = "#00ffff";
      ctx.font = '12px "Press Start 2P"';
      ctx.textAlign = "center";
      ctx.fillText("INVINCIBLE", this.x, barY + 6);
    }
  }
  
  fireConfiguredWeapon(weaponConfig, playerX, playerY) {
    const angleToPlayer = Math.atan2(playerY - this.y, playerX - this.x);
    const bullets = [];
    
    switch (weaponConfig.type) {
      case "aimed":
        // Single aimed bullet
        return {
          x: this.x,
          y: this.y,
          vx: Math.cos(angleToPlayer) * weaponConfig.speed,
          vy: Math.sin(angleToPlayer) * weaponConfig.speed,
          size: weaponConfig.size || 8,
          color: this.getProjectileColor(),
          type: "miniBoss" + (weaponConfig.name || "Bullet")
        };
        
      case "spread":
        // Spread of bullets
        const spreadCount = weaponConfig.bullets || 3;
        const spreadAngle = weaponConfig.spreadAngle || 0.2;
        const halfSpread = Math.floor(spreadCount / 2);
        
        for (let i = 0; i < spreadCount; i++) {
          const offset = i - halfSpread;
          const angle = angleToPlayer + offset * spreadAngle;
          bullets.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(angle) * weaponConfig.speed,
            vy: Math.sin(angle) * weaponConfig.speed,
            size: weaponConfig.size || 7,
            color: this.getProjectileColor(),
            type: "miniBoss" + (weaponConfig.name || "Spread")
          });
        }
        return bullets;
        
      case "dual":
        // Dual side shots
        const sideOffset = weaponConfig.sideOffset || 30;
        for (let side = -1; side <= 1; side += 2) {
          const offsetX = Math.cos(angleToPlayer + Math.PI / 2) * sideOffset * side;
          const offsetY = Math.sin(angleToPlayer + Math.PI / 2) * sideOffset * side;
          bullets.push({
            x: this.x + offsetX,
            y: this.y + offsetY,
            vx: Math.cos(angleToPlayer) * weaponConfig.speed,
            vy: Math.sin(angleToPlayer) * weaponConfig.speed,
            size: weaponConfig.size || 8,
            color: this.getProjectileColor(),
            type: "miniBoss" + (weaponConfig.name || "Dual")
          });
        }
        return bullets;
        
      case "circular":
        // 360 degree circle
        const numBullets = weaponConfig.bullets || 12;
        for (let i = 0; i < numBullets; i++) {
          const angle = (i / numBullets) * Math.PI * 2;
          bullets.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(angle) * weaponConfig.speed,
            vy: Math.sin(angle) * weaponConfig.speed,
            size: weaponConfig.size || 7,
            color: this.getProjectileColor(),
            type: "miniBoss" + (weaponConfig.name || "Circular")
          });
        }
        return bullets;
        
      case "cross":
        // Rotating cross pattern
        const numArms = weaponConfig.arms || 4;
        const bulletsPerArm = weaponConfig.bulletsPerArm || 2;
        for (let arm = 0; arm < numArms; arm++) {
          const baseAngle = (arm / numArms) * Math.PI * 2 + this.frameCount * 0.05;
          for (let i = 0; i < bulletsPerArm; i++) {
            const distance = (i + 1) * 20;
            const x = this.x + Math.cos(baseAngle) * distance;
            const y = this.y + Math.sin(baseAngle) * distance;
            bullets.push({
              x: x,
              y: y,
              vx: Math.cos(baseAngle) * weaponConfig.speed,
              vy: Math.sin(baseAngle) * weaponConfig.speed,
              size: weaponConfig.size || 6,
              color: this.getProjectileColor(),
              type: "miniBoss" + (weaponConfig.name || "Cross")
            });
          }
        }
        return bullets;
        
      default:
        // Default to aimed shot
        return this.fireConfiguredWeapon({ ...weaponConfig, type: "aimed" }, playerX, playerY);
    }
  }
  
  // NEW CONFIGURABLE ATTACK SYSTEM
  
  updateAttackTimers(slowdownFactor) {
    for (const [patternIndex, state] of this.attackStates.entries()) {
      const pattern = this.attackPatterns[patternIndex];
      if (!pattern) continue;
      
      state.timer += slowdownFactor;
      
      // Handle cooldown phases if pattern has cooldown config
      if (pattern.cooldown) {
        state.cooldownTimer += slowdownFactor;
        
        if (state.cooldownPhase === 'firing' && state.cooldownTimer >= pattern.cooldown.start) {
          state.cooldownPhase = 'paused';
          state.cooldownTimer = 0;
        } else if (state.cooldownPhase === 'paused' && state.cooldownTimer >= pattern.cooldown.pause) {
          state.cooldownPhase = 'firing';
          state.cooldownTimer = 0;
        }
      }
    }
  }
  
  canFirePattern(patternIndex) {
    if (this.dying || patternIndex >= this.attackPatterns.length) return false;
    
    const pattern = this.attackPatterns[patternIndex];
    const state = this.attackStates.get(patternIndex);
    if (!pattern || !state) return false;
    
    // Check if we're in firing phase (if cooldown is configured)
    if (pattern.cooldown && state.cooldownPhase !== 'firing') {
      return false;
    }
    
    // Check rate timer
    return state.timer >= (pattern.rate || 60);
  }
  
  firePattern(patternIndex, playerX, playerY) {
    if (!this.canFirePattern(patternIndex)) return null;
    
    const pattern = this.attackPatterns[patternIndex];
    const state = this.attackStates.get(patternIndex);
    
    // Reset timer
    state.timer = 0;
    
    return this.createBulletsFromPattern(pattern, playerX, playerY);
  }
  
  createBulletsFromPattern(pattern, playerX, playerY) {
    const bullet = pattern.bullet || {};
    const bullets = [];
    
    switch (pattern.pattern) {
      case 'none':
        return null;
        
      case 'single':
        const angleToPlayer = Math.atan2(playerY - this.y, playerX - this.x);
        return {
          x: this.x,
          y: this.y,
          vx: Math.cos(angleToPlayer) * (bullet.speed || 2),
          vy: Math.sin(angleToPlayer) * (bullet.speed || 2),
          size: bullet.size || 8,
          color: bullet.color || this.getProjectileColor(),
          damage: pattern.damage || 1,
          type: "miniBossConfigured"
        };
        
      case 'double':
        const doubleAngle = Math.atan2(playerY - this.y, playerX - this.x);
        const sideOffset = 20;
        for (let side = -1; side <= 1; side += 2) {
          const offsetX = Math.cos(doubleAngle + Math.PI / 2) * sideOffset * side;
          const offsetY = Math.sin(doubleAngle + Math.PI / 2) * sideOffset * side;
          bullets.push({
            x: this.x + offsetX,
            y: this.y + offsetY,
            vx: Math.cos(doubleAngle) * (bullet.speed || 2),
            vy: Math.sin(doubleAngle) * (bullet.speed || 2),
            size: bullet.size || 8,
            color: bullet.color || this.getProjectileColor(),
            damage: pattern.damage || 1,
            type: "miniBossConfigured"
          });
        }
        return bullets;
        
      case 'spread':
        const spreadAngle = Math.atan2(playerY - this.y, playerX - this.x);
        const count = pattern.count || 3;
        const spreadWidth = pattern.spreadAngle || 0.4;
        const halfCount = Math.floor(count / 2);
        
        for (let i = 0; i < count; i++) {
          const offset = i - halfCount;
          const angle = spreadAngle + offset * (spreadWidth / count);
          bullets.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(angle) * (bullet.speed || 2),
            vy: Math.sin(angle) * (bullet.speed || 2),
            size: bullet.size || 7,
            color: bullet.color || this.getProjectileColor(),
            damage: pattern.damage || 1,
            type: "miniBossConfigured"
          });
        }
        return bullets;
        
      case 'circular':
        const numBullets = pattern.numBullets || 12;
        for (let i = 0; i < numBullets; i++) {
          const angle = (i / numBullets) * Math.PI * 2;
          bullets.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(angle) * (bullet.speed || 1.5),
            vy: Math.sin(angle) * (bullet.speed || 1.5),
            size: bullet.size || 7,
            color: bullet.color || this.getProjectileColor(),
            damage: pattern.damage || 1,
            type: "miniBossConfigured"
          });
        }
        return bullets;
        
      case 'homing':
        // TODO: Implement homing missiles
        return this.createBulletsFromPattern({...pattern, pattern: 'single'}, playerX, playerY);
        
      default:
        console.warn(`Unknown attack pattern: ${pattern.pattern}`);
        return null;
    }
  }
  
  // Method for entity manager to check and fire all configured attacks
  getReadyAttacks(playerX, playerY) {
    const readyAttacks = [];
    
    for (let i = 0; i < this.attackPatterns.length; i++) {
      if (this.canFirePattern(i)) {
        const bullets = this.firePattern(i, playerX, playerY);
        if (bullets) {
          readyAttacks.push(bullets);
        }
      }
    }
    
    return readyAttacks;
  }
}

