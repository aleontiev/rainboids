// MiniBoss entity for Rainboids: Blitz
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
    
    // Attack system - can have multiple concurrent attacks
    this.attacks = new Map(); // Map of attack types to attack objects
    this.attackCooldowns = new Map(); // Map of attack types to cooldowns

    // Movement pattern - use level manager constants
    this.movePattern = "entering"; // Start with entering phase
    this.patrolDirection = 1;
    this.patrolRange = config?.miniBossPatrolRange || 150;
    this.startY = y;
    this.startX = x;
    this.targetY = isPortrait ? (config?.miniBossTargetYPortrait || 150) : y;
    this.targetX = isPortrait ? x : canvasWidth - (config?.miniBossTargetXLandscape || 150);

    // Weapons
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
  setCustomSVGSprite(assetName, scale = 1, color = "#ff4444") {
    this.svgAssetName = assetName;
    this.spriteScale = scale;
    this.spriteColor = color;
    
    // Get the SVG from entity manager if available
    if (this.game && this.game.entities) {
      const svgAsset = this.game.entities.getSVGAsset(assetName);
      if (svgAsset) {
        this.customSprite = this.game.entities.svgToPath2D(svgAsset);
      }
    }
  }

  // Add attack to the attack system
  addAttack(attackType, attackConfig) {
    this.attacks.set(attackType, attackConfig);
    this.attackCooldowns.set(attackType, 0);
  }

  // Check if this miniboss is vulnerable
  isVulnerable() {
    return !this.invulnerable && !this.dying;
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

    // Weapon timers
    this.primaryWeaponTimer += slowdownFactor;
    this.secondaryWeaponTimer += slowdownFactor;
    this.circularWeaponTimer += slowdownFactor;
    this.burstWeaponTimer += slowdownFactor;
    this.enemySpawnTimer += slowdownFactor; // Increment enemy spawn timer

    // Reduce hit flash
    if (this.hitFlash > 0) {
      this.hitFlash -= slowdownFactor;
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

  takeDamage(damage = 1) {

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

    // Shield absorbs damage first
    if (this.shield > 0) {
      this.shield -= damage;
      // Fix NaN shield values
      if (isNaN(this.shield)) {
        console.warn(`MiniBoss ${this.type} shield became NaN, setting to 0`);
        this.shield = 0;
      }
      this.hitFlash = 10;
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
    this.hitFlash = 10;
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

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle); // Add this line for rotation

    // Apply death effects (only if not yet defeated)
    if (this.dying && !this.isDefeated) {
      // Apply opacity for fade out
      ctx.globalAlpha = this.opacity;
      
      // Death glow effect (red glow when dying)
      const glowIntensity = 0.7 + Math.sin(this.frameCount * 0.3) * 0.3; // Pulsing glow
      ctx.fillStyle = "#ff0000";
      const prevAlpha = ctx.globalAlpha;
      ctx.globalAlpha = prevAlpha * glowIntensity * 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.size + 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = prevAlpha;
    }

    // Apply red flash overlay if dying and flashing (only if not yet defeated)
    if (this.dying && this.showRedFlash && !this.isDefeated) {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = "#ff4444";
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, this.size + 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw mini-boss ship using custom sprite or fallback to default
    if (this.customSprite) {
      this.drawCustomSprite(ctx);
    } else {
      this.drawDefaultSprite(ctx);
    }

    ctx.restore();

    // Draw shield bar and health bar (outside of rotation transform)
    this.drawShieldAndHealthBar(ctx);

    // Invulnerable effect - gold stroke over the miniboss itself
    if (this.invulnerable) {
      ctx.strokeStyle = "#ffcc00"; // Gold stroke
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.8 + 0.2 * Math.sin(this.frameCount * 0.3);

      // Draw stroke around the ship shape
      if (this.svgAssetName && this.game && this.game.entities) {
        ctx.save();
        
        // Apply rotation if needed
        if (this.spriteRotation) {
          ctx.rotate(this.spriteRotation);
        }
        
        const scale = this.size / 512;
        ctx.scale(scale, scale);
        ctx.translate(-512, -512);
        ctx.lineWidth = 8 / scale; // Thicker stroke, adjusted for scale

        // Use the SVG asset
        const svgAsset = this.game.entities.getSVGAsset(this.svgAssetName);
        if (svgAsset) {
          const path = this.game.entities.svgToPath2D(svgAsset);
          ctx.stroke(path);
        }
        ctx.restore();
      } else {
        // Default invulnerable stroke
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }

    // Remove red charging outline effect

    ctx.restore();
  }

  drawCustomSprite(ctx) {
    // Custom SVG sprite rendering
    ctx.save();
    
    // Apply rotation if needed (for beta-style sprites)
    if (this.spriteRotation) {
      ctx.rotate(this.spriteRotation);
    }
    
    // Scale and position the SVG to fit the miniboss size
    const scale = (this.size / 512) * this.spriteScale;
    ctx.scale(scale, scale);
    ctx.translate(-512, -512); // Center the SVG
    
    // Set the fill color (brighter when hit)
    if (this.hitFlash > 0 && !this.dying) {
      ctx.fillStyle = this.brightenColor(this.spriteColor);
      ctx.shadowColor = this.spriteColor;
      ctx.shadowBlur = 20;
    } else {
      ctx.fillStyle = this.spriteColor;
    }
    
    // Draw the custom SVG path
    const path = new Path2D(this.customSprite);
    ctx.fill(path);
    
    // Reset shadow effect
    ctx.shadowBlur = 0;
    
    ctx.restore();
    
    // Add engine glow effects
    this.drawEngineGlow(ctx);
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
    
    // Add engine glow effects
    this.drawEngineGlow(ctx);
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
    const barWidth = this.size * 1.8;
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
        const shieldPercent = Math.max(0, this.shield / this.maxShield);
        ctx.fillStyle = "#0088ff";
        const shieldBarWidth = Math.max(0, barWidth * shieldPercent);
        ctx.fillRect(barX, barY, shieldBarWidth, barHeight);
      } else {
        // Health bar (green)
        const healthPercent = Math.max(0, this.health / this.maxHealth);
        ctx.fillStyle = "#00ff00";
        const healthBarWidth = Math.max(0, barWidth * healthPercent);
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
}

