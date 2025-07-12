// MiniBoss entity for Rainboids: Blitz
import { GAME_CONFIG, COLORS } from "../constants.js";

export class MiniBoss {
  constructor(x, y, type, isPortrait, canvasWidth = 700) {
    this.x = x;
    this.y = y;
    this.type = type; // 'alpha' or 'beta'
    this.isPortrait = isPortrait;
    this.size = 90; // Much larger than regular enemies (was 60)
    this.speed = 0.5; // Slower movement (was 1)
    this.maxHealth = 100; // Reduced max health
    this.health = this.maxHealth;
    this.frameCount = 0;
    this.angle = isPortrait ? Math.PI / 2 : 0; // Add this line for rotation

    // Movement pattern
    this.movePattern = "entering"; // Start with entering phase
    this.patrolDirection = 1;
    this.patrolRange = 150; // Reduced range for slower movement
    this.startY = y;
    this.startX = x;
    this.targetY = isPortrait ? 150 : y; // In portrait, move to 150px from top
    this.targetX = isPortrait ? x : canvasWidth - 150; // In landscape, move to 150px from right

    // Weapons
    this.primaryWeaponTimer = 0;
    this.secondaryWeaponTimer = 0;
    this.circularWeaponTimer = 0;
    this.burstWeaponTimer = 0;
    this.primaryWeaponCooldown = 60; // 0.25 seconds at 60fps (even faster)
    this.secondaryWeaponCooldown = 90; // 0.75 seconds at 60fps (faster)
    this.circularWeaponCooldown = 120; // 2 seconds at 60fps (faster circular)
    this.burstWeaponCooldown = 90; // 1.5 seconds at 60fps (faster burst)

    // Shield system
    this.godMode = true; // Start with god mode (invincible)
    this.godModeTimer = 0;
    this.godModeDuration = 500; // 2.5 seconds at 60fps
    this.shield = 50; // 50 shield after god mode ends
    this.maxShield = 50;

    // Visual effects
    this.hitFlash = 0;
    this.chargingSecondary = 0;
    this.playerRef = null; // To store player reference for aiming
    this.enemySpawnTimer = 0;
    this.enemySpawnCooldown = 200; // 3.3 seconds cooldown for spawning enemies (faster than before)
    
    // Death effect system
    this.dying = false;
    this.deathTimer = 0;
    this.deathDuration = 30; // 0.5 seconds at 60fps
    this.deathExplosionTimer = 0;
    this.deathExplosionInterval = 3; // Explosions every 3 frames
    this.finalExplosionTriggered = false;
  }

  update(playerX, playerY, slowdownFactor = 1.0) {
    this.frameCount += slowdownFactor;

    // Make miniboss face the player (if not dying)
    if (!this.dying) {
      this.angle = Math.atan2(playerY - this.y, playerX - this.x);
    }

    // Handle death sequence
    if (this.dying) {
      this.deathTimer += slowdownFactor;
      this.deathExplosionTimer += slowdownFactor;
      
      // Trigger final explosion when death timer is complete
      if (this.deathTimer >= this.deathDuration && !this.finalExplosionTriggered) {
        this.finalExplosionTriggered = true;
        return "final_explosion";
      }
      
      // Check if we should trigger a rain explosion
      if (this.deathExplosionTimer >= this.deathExplosionInterval) {
        this.deathExplosionTimer = 0;
        return "rain_explosion";
      }
      
      return "dying";
    }

    // Handle god mode timer
    if (this.godMode) {
      this.godModeTimer += slowdownFactor;
      if (this.godModeTimer >= this.godModeDuration) {
        this.godMode = false;
      }
    }

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

  takeDamage(damage) {
    // God mode prevents all damage
    if (this.godMode) {
      return "godmode";
    }

    // Already dying, ignore further damage
    if (this.dying) {
      return "dying";
    }

    // Shield absorbs damage first
    if (this.shield > 0) {
      this.shield -= damage;
      this.hitFlash = 10;
      if (this.shield <= 0) {
        this.shield = 0;
        return "shield_destroyed";
      }
      return "shield_damaged";
    }

    // Damage health if no shield
    this.health -= damage;
    this.hitFlash = 10;
    if (this.health <= 0) {
      this.dying = true;
      this.deathTimer = 0;
      return "dying";
    }
    return "damaged";
  }

  canFirePrimary() {
    return this.primaryWeaponTimer >= this.primaryWeaponCooldown;
  }

  canFireSecondary() {
    return this.secondaryWeaponTimer >= this.secondaryWeaponCooldown;
  }

  firePrimary(playerX, playerY) {
    // Added playerX, playerY
    this.primaryWeaponTimer = 0;
    const angleToPlayer = Math.atan2(playerY - this.y, playerX - this.x); // Calculate angle to player
    const bulletSpeed = 2; // Further reduced speed
    // Return bullet data for the main game to create
    return {
      x: this.x, // Fire from center of miniboss
      y: this.y, // Fire from center of miniboss
      vx: Math.cos(angleToPlayer) * bulletSpeed, // Aim at player
      vy: Math.sin(angleToPlayer) * bulletSpeed, // Aim at player
      size: 12, // Smaller projectiles
      color: "#ff0000", // Red color
      type: "miniBossPrimary",
    };
  }

  fireSecondary(playerX, playerY) {
    // Added playerX, playerY
    this.secondaryWeaponTimer = 0;
    this.chargingSecondary = 0;
    const bullets = [];
    const angleToPlayer = Math.atan2(playerY - this.y, playerX - this.x); // Calculate angle to player
    const bulletSpeed = 1.8; // Further reduced speed for spread

    if (this.type === "alpha") {
      // Alpha: Further reduced spread of 3 bullets
      const spreadAngle = 0.2; // Tighter spread
      for (let i = -1; i <= 1; i++) {
        const angle = angleToPlayer + i * spreadAngle;
        bullets.push({
          x: this.x,
          y: this.y,
          vx: Math.cos(angle) * bulletSpeed,
          vy: Math.sin(angle) * bulletSpeed,
          size: 10, // Smaller projectiles for spread
          color: "#ff0000", // Red color
          type: "miniBossSecondary",
        });
      }
    } else {
      // Beta: Alternating dual shots
      const sideOffset = 30; // Distance from center
      for (let side = -1; side <= 1; side += 2) {
        const offsetX =
          Math.cos(angleToPlayer + Math.PI / 2) * sideOffset * side;
        const offsetY =
          Math.sin(angleToPlayer + Math.PI / 2) * sideOffset * side;
        bullets.push({
          x: this.x + offsetX,
          y: this.y + offsetY,
          vx: Math.cos(angleToPlayer) * bulletSpeed,
          vy: Math.sin(angleToPlayer) * bulletSpeed,
          size: 12, // Smaller projectiles
          color: "#0000ff", // Blue color for beta
          type: "miniBossSecondary",
        });
      }
    }
    return bullets;
  }

  canSpawnEnemy() {
    return this.enemySpawnTimer >= this.enemySpawnCooldown;
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
    return this.circularWeaponTimer >= this.circularWeaponCooldown;
  }

  fireCircular(playerX, playerY) {
    this.circularWeaponTimer = 0;
    const bullets = [];
    const bulletSpeed = 1.5; // Further reduced speed

    if (this.type === "alpha") {
      // Alpha: Full 360 degree spiral
      const numBullets = 12; // Reduced bullets for alpha
      for (let i = 0; i < numBullets; i++) {
        const angle = (i / numBullets) * Math.PI * 2;
        bullets.push({
          x: this.x,
          y: this.y,
          vx: Math.cos(angle) * bulletSpeed,
          vy: Math.sin(angle) * bulletSpeed,
          size: 10, // Smaller projectiles
          color: "#ffa500", // Orange color
          type: "miniBossCircular",
        });
      }
    } else {
      // Beta: Reduced rotating cross pattern
      const numArms = 4;
      const bulletsPerArm = 2; // Reduced from 3 to 2
      for (let arm = 0; arm < numArms; arm++) {
        const baseAngle =
          (arm / numArms) * Math.PI * 2 + this.frameCount * 0.05; // Rotating
        for (let i = 0; i < bulletsPerArm; i++) {
          const distance = (i + 1) * 20; // Staggered distances
          const x = this.x + Math.cos(baseAngle) * distance;
          const y = this.y + Math.sin(baseAngle) * distance;
          bullets.push({
            x: x,
            y: y,
            vx: Math.cos(baseAngle) * bulletSpeed,
            vy: Math.sin(baseAngle) * bulletSpeed,
            size: 8, // Smaller for cross pattern
            color: "#0000ff", // Blue color for beta
            type: "miniBossCircular",
          });
        }
      }
    }
    return bullets;
  }

  canFireBurst() {
    return this.burstWeaponTimer >= this.burstWeaponCooldown;
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
        size: 10, // Smaller burst projectiles
        color: "#ffa500", // Orange color for distinction
        type: "miniBossBurst",
      });
    }
    return bullets;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle); // Add this line for rotation

    // Death glow effect (red glow when dying)
    if (this.dying) {
      const glowIntensity = 0.7 + Math.sin(this.frameCount * 0.3) * 0.3; // Pulsing glow
      ctx.fillStyle = "#ff0000";
      ctx.globalAlpha = glowIntensity * 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.size + 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Hit flash effect (red blink when damaged)
    if (this.hitFlash > 0 && !this.dying) {
      ctx.fillStyle = "#ff0000";
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(0, 0, this.size + 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Draw mini-boss ship based on type
    if (this.type === "alpha") {
      this.drawAlphaShip(ctx);
    } else {
      this.drawBetaShip(ctx);
    }

    // Draw shield bar and health bar
    this.drawShieldAndHealthBar(ctx);

    // God mode effect
    if (this.godMode) {
      ctx.strokeStyle = "#00ffff";
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(this.frameCount * 0.2);
      ctx.beginPath();
      ctx.arc(0, 0, this.size + 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Remove red charging outline effect

    ctx.restore();
  }

  drawAlphaShip(ctx) {
    // Alpha mini-boss - Heavy Cruiser design
    ctx.fillStyle = "#ff4444";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;

    // Main hull
    ctx.beginPath();
    ctx.rect(
      -this.size * 0.8,
      -this.size * 0.3,
      this.size * 1.6,
      this.size * 0.6
    );
    ctx.fill();
    ctx.stroke();

    // Command tower
    ctx.fillStyle = "#ffaaaa";
    ctx.beginPath();
    ctx.rect(
      -this.size * 0.2,
      -this.size * 0.5,
      this.size * 0.6,
      this.size * 1.0
    );
    ctx.fill();
    ctx.stroke();

    // Weapon arrays
    ctx.fillStyle = "#ff6666";
    ctx.beginPath();
    ctx.rect(
      this.size * 0.5,
      -this.size * 0.4,
      this.size * 0.3,
      this.size * 0.2
    );
    ctx.rect(
      this.size * 0.5,
      this.size * 0.2,
      this.size * 0.3,
      this.size * 0.2
    );
    ctx.fill();
    ctx.stroke();

    // Engine glow
    ctx.fillStyle = "#ffaa00";
    ctx.beginPath();
    ctx.arc(
      -this.size * 0.8,
      -this.size * 0.15,
      this.size * 0.1,
      0,
      Math.PI * 2
    );
    ctx.arc(
      -this.size * 0.8,
      this.size * 0.15,
      this.size * 0.1,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  drawBetaShip(ctx) {
    // Beta mini-boss - Carrier design
    ctx.fillStyle = "#4444ff";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;

    // Main hull - elongated
    ctx.beginPath();
    ctx.rect(
      -this.size * 0.9,
      -this.size * 0.25,
      this.size * 1.8,
      this.size * 0.5
    );
    ctx.fill();
    ctx.stroke();

    // Flight deck
    ctx.fillStyle = "#6666ff";
    ctx.beginPath();
    ctx.rect(
      -this.size * 0.7,
      -this.size * 0.4,
      this.size * 1.4,
      this.size * 0.15
    );
    ctx.rect(
      -this.size * 0.7,
      this.size * 0.25,
      this.size * 1.4,
      this.size * 0.15
    );
    ctx.fill();
    ctx.stroke();

    // Hangar bays
    ctx.fillStyle = "#222222";
    ctx.beginPath();
    ctx.rect(
      -this.size * 0.1,
      -this.size * 0.35,
      this.size * 0.4,
      this.size * 0.1
    );
    ctx.rect(
      -this.size * 0.1,
      this.size * 0.25,
      this.size * 0.4,
      this.size * 0.1
    );
    ctx.fill();

    // Engine array
    ctx.fillStyle = "#ffaa00";
    ctx.beginPath();
    ctx.arc(
      -this.size * 0.9,
      -this.size * 0.1,
      this.size * 0.08,
      0,
      Math.PI * 2
    );
    ctx.arc(-this.size * 0.9, 0, this.size * 0.08, 0, Math.PI * 2);
    ctx.arc(
      -this.size * 0.9,
      this.size * 0.1,
      this.size * 0.08,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  drawShieldAndHealthBar(ctx) {
    const barWidth = this.size * 1.8;
    const barHeight = 8;
    const currentY = -this.size - 20;

    // Single combined bar (shield takes priority over health)
    if (!this.godMode) {
      // Background
      ctx.fillStyle = "#333333";
      ctx.fillRect(-barWidth / 2, currentY, barWidth, barHeight);

      if (this.shield > 0) {
        // Shield bar (blue)
        const shieldPercent = Math.max(0, this.shield / this.maxShield);
        ctx.fillStyle = "#0088ff";
        const shieldBarWidth = Math.max(0, barWidth * shieldPercent);
        ctx.fillRect(-barWidth / 2, currentY, shieldBarWidth, barHeight);
      } else {
        // Health bar (green)
        const healthPercent = Math.max(0, this.health / this.maxHealth);
        ctx.fillStyle = "#00ff00";
        const healthBarWidth = Math.max(0, barWidth * healthPercent);
        ctx.fillRect(-barWidth / 2, currentY, healthBarWidth, barHeight);
      }

      // Border
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(-barWidth / 2, currentY, barWidth, barHeight);
    }

    // God mode indicator
    if (this.godMode) {
      ctx.fillStyle = "#00ffff";
      ctx.font = '12px "Press Start 2P"';
      ctx.textAlign = "center";
      ctx.fillText("INVINCIBLE", 0, currentY + 6);
    }
  }
}