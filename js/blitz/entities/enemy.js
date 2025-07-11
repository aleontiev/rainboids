// Enemy entities for Rainboids: Blitz
import { GAME_CONFIG, COLORS, ENEMY_TYPES } from "../constants.js";

export class Enemy {
  constructor(x, y, type, isPortrait, speed = GAME_CONFIG.ENEMY_SPEED) {
    this.x = x;
    this.y = y;
    this.type =
      type || ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
    this.size = GAME_CONFIG.ENEMY_SIZE;
    this.speed = speed; // Use passed speed or default
    this.angle = isPortrait ? Math.PI / 2 : Math.PI; // Face down or left
    this.health = 1;
    this.shootCooldown = 0;
    this.time = 0;
    this.amplitude = 50;
    this.frequency = 0.02;
    this.initialX = x;
    this.initialY = y;
    this.pulseRadius = 0;
    this.pulseTime = 0;
    this.lastShot = 0;
    this.isPortrait = isPortrait;

    // Type-specific initialization
    switch (this.type) {
      case "sine":
        this.amplitude = 30 + Math.random() * 40;
        this.frequency = 0.01 + Math.random() * 0.02;
        break;
      case "zigzag":
        this.zigzagDirection = 1;
        this.zigzagTimer = 0;
        break;
      case "circle":
        this.centerX = x;
        this.centerY = y;
        this.radius = 40 + Math.random() * 30;
        this.angularSpeed = 0.02 + Math.random() * 0.02;
        break;
      case "dive":
        this.phase = "approach";
        this.targetX = 0;
        this.targetY = 0;
        this.diveSpeed = 0;
        break;
      case "laser":
        this.laserChargeTime = 0;
        this.laserFiring = false;
        this.laserBeam = null;
        this.laserCooldown = 0;
        this.laserState = "cooldown"; // cooldown, charging, firing
        break;
      case "pulse":
        this.pulseInterval = 240 + Math.random() * 120;
        this.pulseTimer = 0;
        break;
    }
  }

  update(
    playerX,
    playerY,
    bullets,
    lasers,
    pulseCircles,
    slowdownFactor = 1.0
  ) {
    this.time += slowdownFactor;

    if (this.isPortrait) {
      // Portrait mode movement
      switch (this.type) {
        case "straight":
          this.y += this.speed * slowdownFactor;
          break;
        case "sine":
          this.y += this.speed * slowdownFactor;
          this.x =
            this.initialX +
            Math.sin(this.time * this.frequency) * this.amplitude;
          break;
        case "zigzag":
          this.y += this.speed * slowdownFactor;
          this.zigzagTimer += slowdownFactor;
          if (this.zigzagTimer > 30) {
            this.zigzagDirection *= -1;
            this.zigzagTimer = 0;
          }
          this.x += this.zigzagDirection * 2 * slowdownFactor;
          break;
        case "circle":
          this.y += this.speed * 0.5 * slowdownFactor;
          this.centerY += this.speed * 0.5 * slowdownFactor;
          const angle = this.time * this.angularSpeed;
          this.x = this.centerX + Math.cos(angle) * this.radius;
          this.y = this.centerY + Math.sin(angle) * this.radius;
          break;
        case "dive":
          if (this.phase === "approach") {
            this.y += this.speed * slowdownFactor;
            if (this.y > window.innerHeight * 0.3) {
              this.phase = "target";
              this.targetX = playerX;
              this.targetY = playerY;
            }
          } else if (this.phase === "target") {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 5) {
              this.diveSpeed = Math.min(
                this.diveSpeed + 0.2 * slowdownFactor,
                6
              );
              this.x += (dx / dist) * this.diveSpeed * slowdownFactor;
              this.y += (dy / dist) * this.diveSpeed * slowdownFactor;
              this.angle = Math.atan2(dy, dx);
            }
          }
          break;
        case "laser":
          this.y += this.speed * 0.8 * slowdownFactor;
          
          // Handle laser state machine
          switch (this.laserState) {
            case "cooldown":
              this.laserCooldown += slowdownFactor;
              if (this.laserCooldown > 60) { // 1 second cooldown
                this.laserState = "charging";
                this.laserChargeTime = 0;
              }
              break;
              
            case "charging":
              this.laserChargeTime += slowdownFactor;
              if (this.laserChargeTime > 120) { // 2 seconds charge time
                this.laserState = "firing";
                this.laserChargeTime = 0;
                // Create laser beam
                lasers.push(
                  new Laser(
                    this.x,
                    this.y,
                    Math.atan2(playerY - this.y, playerX - this.x)
                  )
                );
              }
              break;
              
            case "firing":
              this.laserChargeTime += slowdownFactor;
              if (this.laserChargeTime > 60) { // 1 second firing duration
                this.laserState = "cooldown";
                this.laserCooldown = 0;
              }
              break;
          }
          break;
        case "pulse":
          this.y += this.speed * 0.6 * slowdownFactor;
          this.pulseTimer += slowdownFactor;
          if (this.pulseTimer > this.pulseInterval) {
            this.pulseTimer = 0;
            // Create ring of bullets instead of pulse circle
            this.firePulseRing(bullets);
          }
          break;
      }
    } else {
      // Update based on type
      switch (this.type) {
        case "straight":
          this.x -= this.speed * slowdownFactor;
          break;

        case "sine":
          this.x -= this.speed * slowdownFactor;
          this.y =
            this.initialY +
            Math.sin(this.time * this.frequency) * this.amplitude;
          break;

        case "zigzag":
          this.x -= this.speed * slowdownFactor;
          this.zigzagTimer += slowdownFactor;
          if (this.zigzagTimer > 30) {
            this.zigzagDirection *= -1;
            this.zigzagTimer = 0;
          }
          this.y += this.zigzagDirection * 2 * slowdownFactor;
          break;

        case "circle":
          this.x -= this.speed * 0.5 * slowdownFactor;
          this.centerX -= this.speed * 0.5 * slowdownFactor;
          const angle = this.time * this.angularSpeed;
          this.x = this.centerX + Math.cos(angle) * this.radius;
          this.y = this.centerY + Math.sin(angle) * this.radius;
          break;

        case "dive":
          if (this.phase === "approach") {
            this.x -= this.speed;
            if (this.x < window.innerWidth * 0.7) {
              this.phase = "target";
              this.targetX = playerX;
              this.targetY = playerY;
            }
          } else if (this.phase === "target") {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 5) {
              this.diveSpeed = Math.min(this.diveSpeed + 0.2, 6);
              this.x += (dx / dist) * this.diveSpeed;
              this.y += (dy / dist) * this.diveSpeed;
              this.angle = Math.atan2(dy, dx);
            }
          }
          break;

        case "laser":
          this.x -= this.speed * 0.8;
          
          // Handle laser state machine
          switch (this.laserState) {
            case "cooldown":
              this.laserCooldown++;
              if (this.laserCooldown > 60) { // 1 second cooldown
                this.laserState = "charging";
                this.laserChargeTime = 0;
              }
              break;
              
            case "charging":
              this.laserChargeTime++;
              if (this.laserChargeTime > 120) { // 2 seconds charge time
                this.laserState = "firing";
                this.laserChargeTime = 0;
                // Create laser beam
                lasers.push(
                  new Laser(
                    this.x,
                    this.y,
                    Math.atan2(playerY - this.y, playerX - this.x)
                  )
                );
              }
              break;
              
            case "firing":
              this.laserChargeTime++;
              if (this.laserChargeTime > 60) { // 1 second firing duration
                this.laserState = "cooldown";
                this.laserCooldown = 0;
              }
              break;
          }
          break;

        case "pulse":
          this.x -= this.speed * 0.6;
          this.pulseTimer++;
          if (this.pulseTimer > this.pulseInterval) {
            this.pulseTimer = 0;
            // Create ring of bullets instead of pulse circle
            this.firePulseRing(bullets);
          }
          break;
      }
    }

    // Remove if off screen
    if (this.isPortrait) {
      return this.y < window.innerHeight + 50;
    } else {
      return this.x > -50;
    }
  }

  shoot(bullets, player) {
    if (["straight", "sine", "zigzag"].includes(this.type)) {
      this.shootCooldown++;
      if (this.shootCooldown > 60 + Math.random() * 60) {
        this.shootCooldown = 0;
        const angle = Math.atan2(player.y - this.y, player.x - this.x);

        // Choose a random enemy bullet color
        const enemyColors = [
          "#ff0000",
          "#800080",
          "#0000ff",
          "#ffa500",
          "#ffff00",
        ]; // Red, Purple, Blue, Orange, Yellow
        const randomColor =
          enemyColors[Math.floor(Math.random() * enemyColors.length)];

        bullets.push(
          new Bullet(
            this.x,
            this.y,
            angle,
            7.5,
            randomColor,
            this.isPortrait,
            6.4
          )
        ); // Size 7.5, random warm color, speed 6.4
      }
    }
  }

  firePulseRing(bullets) {
    // Create a ring of bullets shooting outward in all directions
    const numBullets = 12; // Number of bullets in the ring
    const bulletSpeed = 3;
    const bulletSize = 8;
    const bulletColor = "#800080"; // Purple color for pulse bullets

    for (let i = 0; i < numBullets; i++) {
      const angle = (i / numBullets) * Math.PI * 2; // Evenly spaced around circle
      bullets.push(
        new Bullet(
          this.x,
          this.y,
          angle,
          bulletSize,
          bulletColor,
          this.isPortrait,
          bulletSpeed
        )
      );
    }
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Get color based on type
    const color = COLORS.ENEMY_COLORS[this.type] || "#ff6666";

    // Draw based on type
    switch (this.type) {
      case "laser":
        // Draw energy gathering animation based on state
        if (this.laserState === "charging") {
          const charge = this.laserChargeTime / 120; // 2 seconds charge time
          const intensity = Math.min(1, charge);
          
          // Pulsing energy circle
          const pulseSize = 0.3 + Math.sin(this.laserChargeTime * 0.2) * 0.1;
          ctx.strokeStyle = `rgba(255, 100, 100, ${intensity})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(this.size * 0.8, 0, this.size * pulseSize * intensity, 0, Math.PI * 2);
          ctx.stroke();
          
          // Inner energy core
          ctx.fillStyle = `rgba(255, 200, 200, ${intensity * 0.6})`;
          ctx.beginPath();
          ctx.arc(this.size * 0.8, 0, this.size * 0.15 * intensity, 0, Math.PI * 2);
          ctx.fill();
          
          // Energy sparks
          if (charge > 0.5) {
            for (let i = 0; i < 6; i++) {
              const sparkAngle = (i / 6) * Math.PI * 2 + this.laserChargeTime * 0.1;
              const sparkX = this.size * 0.8 + Math.cos(sparkAngle) * this.size * 0.4 * intensity;
              const sparkY = Math.sin(sparkAngle) * this.size * 0.4 * intensity;
              
              ctx.fillStyle = `rgba(255, 255, 100, ${intensity * 0.8})`;
              ctx.beginPath();
              ctx.arc(sparkX, sparkY, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        break;

      case "pulse":
        // Draw pulse indicator
        if (this.pulseTimer > this.pulseInterval - 30) {
          const pulse = (this.pulseTimer - (this.pulseInterval - 30)) / 30;
          ctx.strokeStyle = `rgba(255, 153, 153, ${1 - pulse})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, this.size * (1 + pulse * 2), 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
    }

    this.drawShip(ctx, color);

    ctx.restore();
  }

  drawShip(ctx, color) {
    ctx.fillStyle = color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

    switch (this.type) {
      case "straight":
        // Fighter - sleek triangular fighter with wings
        ctx.beginPath();
        ctx.moveTo(this.size, 0);
        ctx.lineTo(-this.size * 0.6, -this.size * 0.4);
        ctx.lineTo(-this.size * 0.8, -this.size * 0.7);
        ctx.lineTo(-this.size * 0.9, -this.size * 0.7);
        ctx.lineTo(-this.size * 0.4, -this.size * 0.2);
        ctx.lineTo(-this.size * 0.4, 0);
        ctx.lineTo(-this.size * 0.4, this.size * 0.2);
        ctx.lineTo(-this.size * 0.9, this.size * 0.7);
        ctx.lineTo(-this.size * 0.8, this.size * 0.7);
        ctx.lineTo(-this.size * 0.6, this.size * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cockpit detail
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(this.size * 0.3, 0, this.size * 0.15, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "sine":
        // Interceptor - diamond-shaped with side fins
        ctx.beginPath();
        ctx.moveTo(this.size * 0.8, 0);
        ctx.lineTo(this.size * 0.2, -this.size * 0.8);
        ctx.lineTo(-this.size * 0.2, -this.size * 0.5);
        ctx.lineTo(-this.size * 0.8, -this.size * 0.3);
        ctx.lineTo(-this.size * 0.8, this.size * 0.3);
        ctx.lineTo(-this.size * 0.2, this.size * 0.5);
        ctx.lineTo(this.size * 0.2, this.size * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Wing stripes
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.size * 0.1, -this.size * 0.4);
        ctx.lineTo(-this.size * 0.1, -this.size * 0.2);
        ctx.moveTo(this.size * 0.1, this.size * 0.4);
        ctx.lineTo(-this.size * 0.1, this.size * 0.2);
        ctx.stroke();
        break;

      case "zigzag":
        // Assault Ship - angular predator design
        ctx.beginPath();
        ctx.moveTo(this.size, 0);
        ctx.lineTo(this.size * 0.3, -this.size * 0.5);
        ctx.lineTo(-this.size * 0.2, -this.size * 0.9);
        ctx.lineTo(-this.size * 0.6, -this.size * 0.6);
        ctx.lineTo(-this.size * 0.9, -this.size * 0.2);
        ctx.lineTo(-this.size * 0.5, 0);
        ctx.lineTo(-this.size * 0.9, this.size * 0.2);
        ctx.lineTo(-this.size * 0.6, this.size * 0.6);
        ctx.lineTo(-this.size * 0.2, this.size * 0.9);
        ctx.lineTo(this.size * 0.3, this.size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Weapon ports
        ctx.fillStyle = "#ff4444";
        ctx.beginPath();
        ctx.arc(
          this.size * 0.1,
          -this.size * 0.3,
          this.size * 0.1,
          0,
          Math.PI * 2
        );
        ctx.arc(
          this.size * 0.1,
          this.size * 0.3,
          this.size * 0.1,
          0,
          Math.PI * 2
        );
        ctx.fill();
        break;

      case "circle":
        // Orbital Ship - circular main body with rotating elements
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Rotating orbital rings
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.9, 0, Math.PI * 2);
        ctx.stroke();

        // Directional thrusters
        const thrusterAngle = this.frameCount * 0.1;
        for (let i = 0; i < 3; i++) {
          const angle = (i * Math.PI * 2) / 3 + thrusterAngle;
          const x = Math.cos(angle) * this.size * 0.9;
          const y = Math.sin(angle) * this.size * 0.9;
          ctx.fillStyle = "#00ddff";
          ctx.beginPath();
          ctx.arc(x, y, this.size * 0.15, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case "dive":
        // Bomber - heavy triangular craft with bomb bay
        ctx.beginPath();
        ctx.moveTo(this.size * 0.2, this.size * 0.8);
        ctx.lineTo(-this.size * 0.9, -this.size * 0.3);
        ctx.lineTo(-this.size * 0.5, -this.size * 0.6);
        ctx.lineTo(this.size * 0.8, -this.size * 0.6);
        ctx.lineTo(this.size * 0.9, -this.size * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Bomb bay doors
        ctx.fillStyle = "#444444";
        ctx.beginPath();
        ctx.rect(
          -this.size * 0.3,
          this.size * 0.1,
          this.size * 0.6,
          this.size * 0.4
        );
        ctx.fill();
        ctx.stroke();

        // Wing details
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-this.size * 0.6, -this.size * 0.1);
        ctx.lineTo(-this.size * 0.3, -this.size * 0.3);
        ctx.moveTo(this.size * 0.6, -this.size * 0.1);
        ctx.lineTo(this.size * 0.3, -this.size * 0.3);
        ctx.stroke();
        break;

      case "laser":
        // Battleship - elongated heavy cruiser
        ctx.beginPath();
        ctx.rect(
          -this.size * 0.9,
          -this.size * 0.3,
          this.size * 1.8,
          this.size * 0.6
        );
        ctx.fill();
        ctx.stroke();

        // Command bridge
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.rect(
          -this.size * 0.2,
          -this.size * 0.5,
          this.size * 0.6,
          this.size * 1.0
        );
        ctx.fill();
        ctx.stroke();

        // Main cannon
        ctx.fillStyle = "#ff4444";
        ctx.beginPath();
        ctx.rect(
          this.size * 0.9,
          -this.size * 0.1,
          this.size * 0.4,
          this.size * 0.2
        );
        ctx.fill();
        ctx.stroke();

        // Hull details
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-this.size * 0.7, -this.size * 0.2);
        ctx.lineTo(this.size * 0.7, -this.size * 0.2);
        ctx.moveTo(-this.size * 0.7, this.size * 0.2);
        ctx.lineTo(this.size * 0.7, this.size * 0.2);
        ctx.stroke();
        break;

      case "pulse":
        // Destroyer - square main body with weapon arrays
        ctx.beginPath();
        ctx.rect(
          -this.size * 0.4,
          -this.size * 0.4,
          this.size * 0.8,
          this.size * 0.8
        );
        ctx.fill();
        ctx.stroke();

        // Weapon arrays on corners
        ctx.fillStyle = "#ffaa00";
        const weaponSize = this.size * 0.25;
        ctx.beginPath();
        ctx.rect(-this.size * 0.7, -this.size * 0.7, weaponSize, weaponSize);
        ctx.rect(this.size * 0.45, -this.size * 0.7, weaponSize, weaponSize);
        ctx.rect(-this.size * 0.7, this.size * 0.45, weaponSize, weaponSize);
        ctx.rect(this.size * 0.45, this.size * 0.45, weaponSize, weaponSize);
        ctx.fill();
        ctx.stroke();

        // Central power core
        ctx.fillStyle = "#00ff88";
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pulse indicator
        if (this.pulseCharge > 0.5) {
          ctx.strokeStyle = "#00ff88";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(
            0,
            0,
            this.size * 0.3 + this.pulseCharge * this.size * 0.3,
            0,
            Math.PI * 2
          );
          ctx.stroke();
        }
        break;
    }

    // Draw engine glow (common to all, but varied by ship type)
    ctx.fillStyle = "#ffaa00";
    switch (this.type) {
      case "straight":
        // Twin engines
        ctx.beginPath();
        ctx.arc(
          -this.size * 0.6,
          -this.size * 0.3,
          this.size * 0.2,
          0,
          Math.PI * 2
        );
        ctx.arc(
          -this.size * 0.6,
          this.size * 0.3,
          this.size * 0.2,
          0,
          Math.PI * 2
        );
        ctx.fill();
        break;
      case "laser":
        // Multiple engine ports
        ctx.beginPath();
        ctx.arc(
          -this.size * 0.9,
          -this.size * 0.15,
          this.size * 0.15,
          0,
          Math.PI * 2
        );
        ctx.arc(
          -this.size * 0.9,
          this.size * 0.15,
          this.size * 0.15,
          0,
          Math.PI * 2
        );
        ctx.arc(-this.size * 0.9, 0, this.size * 0.1, 0, Math.PI * 2);
        ctx.fill();
        break;
      default:
        // Single main engine
        ctx.beginPath();
        ctx.arc(-this.size * 0.6, 0, this.size * 0.25, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }
}

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
    this.godModeDuration = 1000; // 5 seconds at 60fps
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

export class Asteroid {
  constructor(
    x,
    y,
    type,
    isPortrait,
    size,
    speed,
    initialVx = null,
    initialVy = null
  ) {
    this.x = x;
    this.y = y;
    this.type = type; // 'large', 'medium', 'small'
    this.isPortrait = isPortrait;
    this.size = size;
    this.speed = speed;
    this.health = Math.floor(size / 10);

    // Generate more vertices for detailed shape
    this.vertices = [];
    const numVertices = 12 + Math.floor(Math.random() * 8); // 12-20 vertices

    for (let i = 0; i < numVertices; i++) {
      const angle = (i / numVertices) * Math.PI * 2;
      const radius = this.size * (0.7 + Math.random() * 0.6); // Vary radius
      this.vertices.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }

    // Generate interior lines for detail
    this.interiorLines = [];
    const numInteriorLines = 3 + Math.floor(Math.random() * 4); // 3-6 interior lines

    for (let i = 0; i < numInteriorLines; i++) {
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI * 2;
      const radius1 = this.size * (0.2 + Math.random() * 0.5);
      const radius2 = this.size * (0.2 + Math.random() * 0.5);

      this.interiorLines.push({
        start: {
          x: Math.cos(angle1) * radius1,
          y: Math.sin(angle1) * radius1,
        },
        end: {
          x: Math.cos(angle2) * radius2,
          y: Math.sin(angle2) * radius2,
        },
      });
    }
  }

  takeDamage(damage) {
    this.health -= damage;
    if (this.health <= 0) {
      if (this.type === "large") {
        return "medium";
      } else if (this.type === "medium") {
        return "small";
      } else {
        return "destroyed"; // Indicates final destruction
      }
    }
    return null; // Not destroyed yet
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.rotationSpeed;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.strokeStyle = "#888";
    ctx.lineWidth = 2;

    // Draw based on size/type
    if (this.type === "small") {
      ctx.fillStyle = "#666";
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // Draw using pre-generated vertices
      ctx.beginPath();
      this.vertices.forEach((vertex, i) => {
        if (i === 0) {
          ctx.moveTo(vertex.x, vertex.y);
        } else {
          ctx.lineTo(vertex.x, vertex.y);
        }
      });
      ctx.closePath();
      ctx.stroke();

      // Draw interior lines for detail
      this.interiorLines.forEach((line) => {
        ctx.beginPath();
        ctx.moveTo(line.start.x, line.start.y);
        ctx.lineTo(line.end.x, line.end.y);
        ctx.stroke();
      });
    }

    ctx.restore();
  }
}

export class Bullet {
  constructor(
    x,
    y,
    angle,
    size,
    color,
    isPortrait,
    speed = GAME_CONFIG.BULLET_SPEED
  ) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed; // Use passed speed or default
    this.size = size;
    this.color = color;
    this.life = 300;
    this.isPortrait = isPortrait;
  }

  update(slowdownFactor = 1.0) {
    this.x += Math.cos(this.angle) * this.speed * slowdownFactor;
    this.y += Math.sin(this.angle) * this.speed * slowdownFactor;
    this.life -= slowdownFactor;

    // Remove if off screen or life expired
    if (this.isPortrait) {
      return this.y > -50 && this.y < window.innerHeight + 50 && this.life > 0;
    } else {
      return this.x > -50 && this.x < window.innerWidth + 50 && this.life > 0;
    }
  }

  render(ctx) {
    // Safety check to prevent negative radius errors
    if (this.size <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      Math.max(1, this.size),
      Math.max(0.4, this.size * 0.4),
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

export class Laser {
  constructor(x, y, angle, speed, color) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed || 50; // Use passed speed or default to 50
    this.color = color;
    this.width = 20; // Thicker laser
    this.life = 60; // Longer life (1 second)
    this.colorIndex = 0;
    this.rainbowColors = [
      "#ff0000",
      "#ff8800",
      "#ffff00",
      "#00ff00",
      "#0088ff",
      "#4400ff",
      "#ff00ff",
    ];
  }

  update(slowdownFactor = 1.0) {
    this.x += Math.cos(this.angle) * this.speed * slowdownFactor;
    this.y += Math.sin(this.angle) * this.speed * slowdownFactor;
    this.life -= slowdownFactor;

    if (this.color === "rainbow") {
      this.colorIndex = Math.floor(Math.random() * this.rainbowColors.length);
    }

    return this.life > 0;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Draw glow effect
    if (this.color === "rainbow") {
      ctx.globalAlpha = 0.4; // Slightly more opaque glow
      const glowGradient = ctx.createLinearGradient(
        0,
        -this.width * 1.5,
        0,
        this.width * 1.5
      );
      glowGradient.addColorStop(0, "red");
      glowGradient.addColorStop(1 / 6, "orange");
      glowGradient.addColorStop(2 / 6, "yellow");
      glowGradient.addColorStop(3 / 6, "green");
      glowGradient.addColorStop(4 / 6, "blue");
      glowGradient.addColorStop(5 / 6, "indigo");
      glowGradient.addColorStop(1, "violet");
      ctx.strokeStyle = glowGradient;
      ctx.lineWidth = this.width * 1.5; // Wider glow
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(200, 0);
      ctx.stroke();
    }

    ctx.globalAlpha = 1; // Reset alpha for the main laser
    if (this.color === "rainbow") {
      ctx.strokeStyle = this.rainbowColors[this.colorIndex];
    } else {
      ctx.strokeStyle = this.color;
    }
    ctx.lineWidth = this.width;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(200, 0); // Make it longer
    ctx.stroke();
    ctx.restore();
  }
}

export class PulseCircle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 5;
    this.maxRadius = 300; // 1.5x larger
    this.life = 120;
    this.maxLife = 120;
    this.speed = 2;
  }

  update(slowdownFactor = 1.0) {
    this.radius += this.speed * slowdownFactor;
    this.life -= slowdownFactor;

    if (this.radius > this.maxRadius) {
      this.radius = this.maxRadius;
    }

    return this.life > 0;
  }

  render(ctx) {
    // Safety check to prevent negative radius errors
    if (this.radius <= 0) return;

    const alpha = this.life / this.maxLife;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#ff9999";
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(1, this.radius), 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

export class HomingMissile {
  constructor(x, y, angle, speed, color) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed;
    this.color = color;
    this.size = 10;
    this.turnSpeed = 0.05;
    this.life = 200;
    this.target = null;
  }

  update(enemies, slowdownFactor = 1.0) {
    if (!this.target || !enemies.includes(this.target)) {
      let closestEnemy = null;
      let closestDist = Infinity;
      for (const enemy of enemies) {
        // Only target enemies within viewport
        if (
          enemy.x >= 0 &&
          enemy.x <= window.innerWidth &&
          enemy.y >= 0 &&
          enemy.y <= window.innerHeight
        ) {
          const dx = enemy.x - this.x;
          const dy = enemy.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < closestDist) {
            closestDist = dist;
            closestEnemy = enemy;
          }
        }
      }
      this.target = closestEnemy;
    }

    if (this.target) {
      const targetAngle = Math.atan2(
        this.target.y - this.y,
        this.target.x - this.x
      );
      let angleDiff = targetAngle - this.angle;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      if (Math.abs(angleDiff) < this.turnSpeed) {
        this.angle = targetAngle;
      } else {
        this.angle += Math.sign(angleDiff) * this.turnSpeed * slowdownFactor;
      }
    }

    this.x += Math.cos(this.angle) * this.speed * slowdownFactor;
    this.y += Math.sin(this.angle) * this.speed * slowdownFactor;
    this.life -= slowdownFactor;
    return this.life > 0;
  }

  render(ctx) {
    // Safety check to prevent negative size errors
    if (this.size <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(Math.max(1, this.size), 0);
    ctx.lineTo(-Math.max(0.5, this.size / 2), -Math.max(0.5, this.size / 2));
    ctx.lineTo(-Math.max(0.5, this.size / 2), Math.max(0.5, this.size / 2));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

export class Boss {
  constructor(x, y, isPortrait, canvasWidth, canvasHeight) {
    this.x = x;
    this.y = y;
    this.isPortrait = isPortrait;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.size = 120; // Very large boss
    this.maxHealth = 2000; // 10x increased health (was 200)
    this.health = this.maxHealth;
    this.frameCount = 0;

    // Movement
    this.movePattern = "entering";
    this.targetX = isPortrait ? canvasWidth / 2 : canvasWidth - 200;
    this.targetY = isPortrait ? 200 : canvasHeight / 2;
    this.speed = 1;
    this.patrolDirection = 1;
    this.patrolRange = 150;
    this.startX = this.targetX;
    this.startY = this.targetY;

    // Shield system - 2 shields of 1000 each (10x increased)
    this.shield = 2000; // Total shield: 1000 + 1000
    this.maxShield = 2000;
    this.shieldPhase1 = 1000; // First shield (10x increased)
    this.shieldPhase2 = 1000; // Second shield (10x increased)

    // Attack phases - now correspond to shield destruction
    this.phase = 1; // Phase 1: First shield, Phase 2: Second shield, Phase 3: Health
    this.phaseTimer = 0;
    this.phaseDuration = 600; // 10 seconds per phase

    // Weapons
    this.primaryWeaponTimer = 0;
    this.secondaryWeaponTimer = 0;
    this.specialWeaponTimer = 0;
    this.spiralWeaponTimer = 0; // New timer for spiral attack
    this.primaryCooldown = 30; // Rapid fire
    this.secondaryCooldown = 120; // 2 seconds
    this.specialCooldown = 300; // 5 seconds
    this.spiralWeaponCooldown = 180; // 3 seconds for spiral attack
    this.laserSpeed = 5; // Speed for slow lasers

    // Visual effects
    this.hitFlash = 0;
    this.angle = 0;
    this.rotationSpeed = 0.02;

    // Death sequence
    this.isDefeated = false;
    this.deathTimer = 0;
    this.explosionTimer = 0;
  }

  update() {
    this.frameCount++;
    this.angle += this.rotationSpeed;

    if (this.isDefeated) {
      this.deathTimer++;
      return;
    }

    // Movement logic
    if (this.movePattern === "entering") {
      // Move to target position
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5) {
        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;
      } else {
        this.movePattern = "patrol";
        this.startX = this.x;
        this.startY = this.y;
      }
    } else if (this.movePattern === "patrol") {
      // Patrol movement
      if (this.isPortrait) {
        this.x += this.patrolDirection * 0.5;
        if (Math.abs(this.x - this.startX) > this.patrolRange) {
          this.patrolDirection *= -1;
        }
      } else {
        this.y += this.patrolDirection * 0.5;
        if (Math.abs(this.y - this.startY) > this.patrolRange) {
          this.patrolDirection *= -1;
        }
      }
    }

    // Phase management
    this.phaseTimer++;
    if (this.phaseTimer > this.phaseDuration) {
      this.phase = Math.min(this.phase + 1, 4);
      this.phaseTimer = 0;
    }

    // Weapon timers
    this.primaryWeaponTimer++;
    this.secondaryWeaponTimer++;
    this.specialWeaponTimer++;
    this.spiralWeaponTimer++; // Increment spiral weapon timer

    // Hit flash
    if (this.hitFlash > 0) {
      this.hitFlash--;
    }
  }

  canFirePrimary() {
    return this.primaryWeaponTimer >= this.primaryCooldown;
  }

  firePrimary(playerX, playerY) {
    if (!this.canFirePrimary()) return [];
    this.primaryWeaponTimer = 0;

    const bullets = [];
    const angleToPlayer = Math.atan2(playerY - this.y, playerX - this.x); // Aim at actual player position

    // Phase 1: Precision single shots (First Shield Phase)
    if (this.phase === 1) {
      bullets.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angleToPlayer) * 6, // Faster bullets
        vy: Math.sin(angleToPlayer) * 6,
        size: 10, // Larger bullets
        color: "#ff0000", // Red
        type: "boss",
      });
    }
    // Phase 2: Triple shot
    else if (this.phase === 2) {
      for (let i = -1; i <= 1; i++) {
        const angle = angleToPlayer + i * 0.3;
        bullets.push({
          x: this.x,
          y: this.y,
          vx: Math.cos(angle) * 4,
          vy: Math.sin(angle) * 4,
          size: 7.5, // At least as large as normal enemy bullets
          type: "boss",
        });
      }
    }
    // Phase 3: Spread shot
    else if (this.phase === 3) {
      for (let i = -2; i <= 2; i++) {
        const angle = angleToPlayer + i * 0.4;
        bullets.push({
          x: this.x,
          y: this.y,
          vx: Math.cos(angle) * 5,
          vy: Math.sin(angle) * 5,
          size: 12.5, // Larger size for powerful attack (1.25x of 10)
          type: "boss",
        });
      }
    }
    // Phase 4: Circle shot
    else if (this.phase === 4) {
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        bullets.push({
          x: this.x,
          y: this.y,
          vx: Math.cos(angle) * 3,
          vy: Math.sin(angle) * 3,
          size: 15, // Even larger size for ultimate attack (1.25x of 12)
          type: "boss",
        });
      }
    }

    return bullets;
  }

  canFireSecondary() {
    return this.secondaryWeaponTimer >= this.secondaryCooldown;
  }

  fireSecondary(playerX, playerY) {
    if (!this.canFireSecondary()) return [];
    this.secondaryWeaponTimer = 0;

    const bullets = [];

    // Laser attacks in later phases
    if (this.phase >= 2) {
      // Create laser data (will be handled by game engine)
      return [
        {
          type: "laser",
          x: this.x,
          y: this.y,
          angle: Math.atan2(playerY - this.y, playerX - this.x),
          speed: this.laserSpeed, // Pass the new speed
          length: 400,
          color: "#ff0000",
        },
      ];
    }

    return bullets;
  }

  canFireSpecial() {
    return this.specialWeaponTimer >= this.specialCooldown && this.phase >= 3;
  }

  fireSpecial() {
    if (!this.canFireSpecial()) return [];
    this.specialWeaponTimer = 0;

    // Pulse circle attack
    return [
      {
        type: "pulse",
        x: this.x,
        y: this.y,
        maxRadius: 300,
        color: "#800080",
      },
    ];
  }

  canFireSpiral() {
    return this.spiralWeaponTimer >= this.spiralWeaponCooldown;
  }

  fireSpiral() {
    this.spiralWeaponTimer = 0;
    const bullets = [];
    const numBullets = 12; // Number of bullets in one wave
    const baseAngle = this.frameCount * 0.05; // Rotate the spiral over time

    for (let i = 0; i < numBullets; i++) {
      const angle = baseAngle + (i / numBullets) * Math.PI * 2;
      bullets.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * 2, // Slower bullet speed
        vy: Math.sin(angle) * 2,
        size: 8, // Larger size
        type: "boss",
      });
    }
    return bullets;
  }

  takeDamage(damage) {
    // Shield absorbs damage first
    if (this.shield > 0) {
      this.shield -= damage;
      this.hitFlash = 10;

      // Check phase transitions based on shield remaining
      if (this.shield <= 100 && this.phase === 1) {
        this.phase = 2; // Enter phase 2 when first shield (100) is destroyed
        return "phase_transition";
      } else if (this.shield <= 0) {
        this.shield = 0;
        this.phase = 3; // Enter phase 3 when all shields are destroyed
        return "shield_destroyed";
      }
      return "shield_damaged";
    }

    // Damage health if no shield (phase 3)
    this.health -= damage;
    this.hitFlash = 10;

    if (this.health <= 0) {
      this.isDefeated = true;
      this.deathTimer = 0;
      return "defeated";
    }

    return "hit";
  }

  getHealthPercentage() {
    return this.health / this.maxHealth;
  }

  render(ctx) {
    if (this.size <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Flash effect when hit
    if (this.hitFlash > 0) {
      ctx.globalAlpha = 0.5;
    }

    // Draw giant miniboss-style ship (scaled up Alpha design)
    this.drawGiantMiniBoss(ctx);

    // Pulsing effect based on phase
    if (this.phase >= 2) {
      ctx.globalAlpha = 0.3 + 0.2 * Math.sin(this.frameCount * 0.1);
      ctx.strokeStyle = "#ff00ff";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, this.size + 20, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    // Health bar
    this.renderHealthBar(ctx);
  }

  drawGiantMiniBoss(ctx) {
    // Giant Alpha mini-boss design with angry eyes
    const baseColor = this.isDefeated ? "#666666" : "#ff4444";
    const lightColor = this.isDefeated ? "#999999" : "#ffaaaa";
    const weaponColor = this.isDefeated ? "#444444" : "#ff6666";

    ctx.fillStyle = baseColor;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;

    // Main hull (scaled up from miniboss)
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
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.rect(
      -this.size * 0.2,
      -this.size * 0.5,
      this.size * 0.6,
      this.size * 1.0
    );
    ctx.fill();
    ctx.stroke();

    // Weapon arrays (larger and more menacing)
    ctx.fillStyle = weaponColor;
    ctx.beginPath();
    ctx.rect(
      this.size * 0.5,
      -this.size * 0.5,
      this.size * 0.4,
      this.size * 0.25
    );
    ctx.rect(
      this.size * 0.5,
      this.size * 0.25,
      this.size * 0.4,
      this.size * 0.25
    );
    ctx.rect(
      -this.size * 0.9,
      -this.size * 0.4,
      this.size * 0.3,
      this.size * 0.2
    );
    ctx.rect(
      -this.size * 0.9,
      this.size * 0.2,
      this.size * 0.3,
      this.size * 0.2
    );
    ctx.fill();
    ctx.stroke();

    // Additional armor plating
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.rect(
      -this.size * 0.6,
      -this.size * 0.7,
      this.size * 0.4,
      this.size * 0.15
    );
    ctx.rect(
      -this.size * 0.6,
      this.size * 0.55,
      this.size * 0.4,
      this.size * 0.15
    );
    ctx.fill();
    ctx.stroke();

    // Engine glow (larger)
    ctx.fillStyle = "#ffaa00";
    ctx.beginPath();
    ctx.arc(
      -this.size * 0.8,
      -this.size * 0.2,
      this.size * 0.15,
      0,
      Math.PI * 2
    );
    ctx.arc(
      -this.size * 0.8,
      this.size * 0.2,
      this.size * 0.15,
      0,
      Math.PI * 2
    );
    ctx.arc(-this.size * 0.8, 0, this.size * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // ANGRY EYES on the command tower
    this.drawAngryEyes(ctx);
  }

  drawAngryEyes(ctx) {
    const eyeColor = this.isDefeated ? "#444444" : "#ff0000";
    const pupilColor = this.isDefeated ? "#222222" : "#000000";

    // Left angry eye
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.ellipse(
      -this.size * 0.1,
      -this.size * 0.15,
      this.size * 0.08,
      this.size * 0.06,
      -0.3,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Left pupil
    ctx.fillStyle = pupilColor;
    ctx.beginPath();
    ctx.arc(
      -this.size * 0.12,
      -this.size * 0.12,
      this.size * 0.03,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Right angry eye
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.ellipse(
      this.size * 0.1,
      -this.size * 0.15,
      this.size * 0.08,
      this.size * 0.06,
      0.3,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Right pupil
    ctx.fillStyle = pupilColor;
    ctx.beginPath();
    ctx.arc(
      this.size * 0.12,
      -this.size * 0.12,
      this.size * 0.03,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Angry eyebrows
    ctx.strokeStyle = this.isDefeated ? "#666666" : "#ff0000";
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Left eyebrow (angled down toward center)
    ctx.moveTo(-this.size * 0.18, -this.size * 0.25);
    ctx.lineTo(-this.size * 0.05, -this.size * 0.22);
    // Right eyebrow (angled down toward center)
    ctx.moveTo(this.size * 0.18, -this.size * 0.25);
    ctx.lineTo(this.size * 0.05, -this.size * 0.22);
    ctx.stroke();

    // Angry mouth/grille
    ctx.strokeStyle = this.isDefeated ? "#666666" : "#ff4444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Downward curved mouth
    ctx.moveTo(-this.size * 0.12, this.size * 0.05);
    ctx.quadraticCurveTo(
      0,
      this.size * 0.15,
      this.size * 0.12,
      this.size * 0.05
    );
    ctx.stroke();

    // Additional anger lines on the hull
    ctx.strokeStyle = this.isDefeated ? "#555555" : "#ff6666";
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Diagonal anger marks
    ctx.moveTo(-this.size * 0.25, -this.size * 0.4);
    ctx.lineTo(-this.size * 0.15, -this.size * 0.3);
    ctx.moveTo(this.size * 0.25, -this.size * 0.4);
    ctx.lineTo(this.size * 0.15, -this.size * 0.3);
    ctx.stroke();
  }

  renderHealthBar(ctx) {
    const barWidth = 300;
    const barHeight = 20;
    const barX = this.x - barWidth / 2;
    let currentY = this.y - this.size - 40;

    // Phase 1 Shield (100 points)
    if (this.phase >= 1) {
      ctx.fillStyle = "#333333";
      ctx.fillRect(barX, currentY, barWidth, barHeight);

      if (this.shield > 100) {
        // Phase 1 shield is full
        ctx.fillStyle = "#0088ff";
        ctx.fillRect(barX, currentY, barWidth, barHeight);
      } else if (this.shield > 0 && this.phase === 1) {
        // Phase 1 shield is partially damaged
        const phase1Percent = (this.shield - 100) / 100;
        ctx.fillStyle = "#0088ff";
        ctx.fillRect(barX, currentY, barWidth * phase1Percent, barHeight);
      }

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, currentY, barWidth, barHeight);

      ctx.fillStyle = "#ffffff";
      ctx.font = '12px "Press Start 2P"';
      ctx.textAlign = "center";
      ctx.fillText("SHIELD 1", this.x, currentY + 14);

      currentY += barHeight + 5;
    }

    // Phase 2 Shield (100 points)
    if (this.phase >= 2) {
      ctx.fillStyle = "#333333";
      ctx.fillRect(barX, currentY, barWidth, barHeight);

      if (this.shield > 0 && this.phase === 2) {
        // Phase 2 shield is active
        const phase2Percent = this.shield / 100;
        ctx.fillStyle = "#0088ff";
        ctx.fillRect(barX, currentY, barWidth * phase2Percent, barHeight);
      }

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, currentY, barWidth, barHeight);

      ctx.fillStyle = "#ffffff";
      ctx.font = '12px "Press Start 2P"';
      ctx.textAlign = "center";
      ctx.fillText("SHIELD 2", this.x, currentY + 14);

      currentY += barHeight + 5;
    }

    // Phase 3 Health (200 points)
    if (this.phase >= 3) {
      ctx.fillStyle = "#333333";
      ctx.fillRect(barX, currentY, barWidth, barHeight);

      const healthPercent = this.getHealthPercentage();
      ctx.fillStyle =
        healthPercent > 0.5
          ? "#00ff00"
          : healthPercent > 0.25
          ? "#ffff00"
          : "#ff0000";
      ctx.fillRect(barX, currentY, barWidth * healthPercent, barHeight);

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, currentY, barWidth, barHeight);

      ctx.fillStyle = "#ffffff";
      ctx.font = '12px "Press Start 2P"';
      ctx.textAlign = "center";
      ctx.fillText("HEALTH", this.x, currentY + 14);

      currentY += barHeight + 5;
    }

    // Boss name
    ctx.fillStyle = "#ffffff";
    ctx.font = '16px "Press Start 2P"';
    ctx.textAlign = "center";
    ctx.fillText("SPACE OVERLORD", this.x, this.y - this.size - 60);
  }
}
