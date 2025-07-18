// Enemy entities for Rainboids: Blitz - Refactored with inheritance
import { Bullet } from "./bullet.js";
import { Laser } from "./laser.js";
import { CircularBullet } from "./circular-bullet.js";
import { SpreadingBullet } from "./spreading-bullet.js";

// Base Enemy Class
export class Enemy {
  constructor(
    x,
    y,
    isPortrait,
    speed = null,
    isClone = false,
    game = null
  ) {
    this.x = x;
    this.y = y;
    this.size = this.getEnemySize();
    this.speed = speed || this.getEnemySpeed();
    this.angle = isPortrait ? Math.PI / 2 : Math.PI; // Face down or left
    this.health = 1;
    this.shootCooldown = 0;
    this.time = 0;
    this.initialX = x;
    this.initialY = y;
    this.isPortrait = isPortrait;
    this.game = game;

    // Assign random color to each enemy
    this.color = this.getRandomEnemyColor();

    // Handle clone fade-in effect
    this.isClone = isClone;
    this.fadeInTimer = isClone ? 0 : this.getEnemyFadeInTime(); // Clones start invisible and fade in over 1 second
    this.opacity = isClone ? 0 : 1.0;
    
    // Vulnerability properties (used for auto-aim filtering)
    this.invulnerable = false;
    
    // Velocity tracking (dx/dy per second)
    this.dx = 0;
    this.dy = 0;
    this.lastX = x;
    this.lastY = y;
  }

  // Check if this enemy can be targeted by auto-aim
  isVulnerableToAutoAim() {
    return !this.invulnerable;
  }

  // Get enemy fade-in time from game config
  getEnemyFadeInTime() {
    // Try to access the game config, fall back to default if not available
    try {
      return this.game?.level?.config?.enemyFadeInTime || 60;
    } catch (e) {
      return 60;
    }
  }

  // Get enemy size from game config
  getEnemySize() {
    try {
      return this.game?.level?.config?.enemySize || 24;
    } catch (e) {
      return 24;
    }
  }

  // Get enemy speed from game config
  getEnemySpeed() {
    try {
      return this.game?.level?.config?.enemySpeed || 2;
    } catch (e) {
      return 2;
    }
  }

  // Get random enemy color from game config
  getRandomEnemyColor() {
    try {
      const colors = this.game?.level?.config?.enemyRandomColors || [
        '#ffffff', '#ff0000', '#800080', '#ff8800', '#ffff00'
      ];
      return colors[Math.floor(Math.random() * colors.length)];
    } catch (e) {
      const colors = ['#ffffff', '#ff0000', '#800080', '#ff8800', '#ffff00'];
      return colors[Math.floor(Math.random() * colors.length)];
    }
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
    const fadeInTime = this.getEnemyFadeInTime();
    if (this.isClone && this.fadeInTimer < fadeInTime) {
      this.fadeInTimer += slowdownFactor;
      this.opacity = Math.min(1.0, this.fadeInTimer / fadeInTime);
    }

    // Make enemies face the player
    this.angle = Math.atan2(playerY - this.y, playerX - this.x);

    // Call type-specific update logic
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
    
    // Base movement - move straight
    if (this.isPortrait) {
      this.y += this.speed * slowdownFactor;
    } else {
      this.x -= this.speed * slowdownFactor;
    }
    
    // Calculate velocity (pixels per frame * 60 = pixels per second)
    this.dx = (this.x - prevX) * 60;
    this.dy = (this.y - prevY) * 60;
  }

  isOnScreen() {
    if (this.isPortrait) {
      return this.y < window.innerHeight + 50;
    } else {
      return this.x > -50;
    }
  }

  shoot(bullets, player) {
    // Base shooting logic - single bullet toward player
    this.shootCooldown++;
    if (this.shootCooldown > 60 + Math.random() * 60) {
      this.shootCooldown = 0;
      const angle = Math.atan2(player.y - this.y, player.x - this.x);

      bullets.push(
        new Bullet(
          this.x,
          this.y,
          angle,
          8, // Decreased size
          this.color,
          this.isPortrait,
          3, // Decreased speed
          false,
          this.game
        )
      );
    }
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Apply opacity for fade-in effect
    ctx.globalAlpha = this.opacity || 1.0;

    // Call type-specific rendering
    this.renderShape(ctx);

    ctx.restore();
  }

  renderShape(ctx) {
    // Base shape - simple triangle
    ctx.fillStyle = this.color;

    ctx.beginPath();
    ctx.moveTo(this.size, 0); // Tip pointing forward
    ctx.lineTo(-this.size * 0.5, -this.size * 0.5); // Top left
    ctx.lineTo(-this.size * 0.3, 0); // Middle left
    ctx.lineTo(-this.size * 0.5, this.size * 0.5); // Bottom left
    ctx.closePath();
    ctx.fill();
  }
}

// Straight Enemy
export class StraightEnemy extends Enemy {
  constructor(x, y, isPortrait, speed, isClone) {
    super(x, y, isPortrait, speed, isClone);
    this.type = "straight";
  }
}

// Sine Enemy
export class SineEnemy extends Enemy {
  constructor(x, y, isPortrait, speed, isClone) {
    super(x, y, isPortrait, speed, isClone);
    this.type = "sine";
    this.amplitude = 30 + Math.random() * 40;
    this.frequency = 0.01 + Math.random() * 0.02;
  }

  updateMovement(playerX, playerY, bullets, lasers, slowdownFactor) {
    // Store previous position for velocity calculation
    const prevX = this.x;
    const prevY = this.y;
    
    if (this.isPortrait) {
      this.y += this.speed * slowdownFactor;
      this.x =
        this.initialX + Math.sin(this.time * this.frequency) * this.amplitude;
    } else {
      this.x -= this.speed * slowdownFactor;
      this.y =
        this.initialY + Math.sin(this.time * this.frequency) * this.amplitude;
    }
    
    // Calculate velocity (pixels per frame * 60 = pixels per second)
    this.dx = (this.x - prevX) * 60;
    this.dy = (this.y - prevY) * 60;
  }

  shoot(bullets, player) {
    this.shootCooldown++;
    if (this.shootCooldown > 60 + Math.random() * 60) {
      this.shootCooldown = 0;
      const angle = Math.atan2(player.y - this.y, player.x - this.x);

      // Calculate positions of the two round halves of the figure-8
      const topHalfX = this.x;
      const topHalfY = this.y - this.size * 0.6; // Top circle center
      const bottomHalfX = this.x;
      const bottomHalfY = this.y + this.size * 0.6; // Bottom circle center

      // Shoot from top half
      bullets.push(
        new Bullet(
          topHalfX,
          topHalfY,
          angle,
          6,
          this.color,
          this.isPortrait,
          5,
          false
        )
      );

      // Shoot from bottom half
      bullets.push(
        new Bullet(
          bottomHalfX,
          bottomHalfY,
          angle,
          6,
          this.color,
          this.isPortrait,
          5,
          false
        )
      );
    }
  }

  renderShape(ctx) {
    ctx.fillStyle = this.color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

    // Figure-8 shape (number 8) - 2x larger
    ctx.beginPath();
    // Top circle of the 8
    ctx.arc(0, -this.size * 0.6, this.size * 0.6, 0, Math.PI * 2);
    ctx.moveTo(this.size * 0.6, this.size * 0.6);
    // Bottom circle of the 8
    ctx.arc(0, this.size * 0.6, this.size * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

// Zigzag Enemy
export class ZigzagEnemy extends Enemy {
  constructor(x, y, isPortrait, speed, isClone) {
    super(x, y, isPortrait, speed, isClone);
    this.type = "zigzag";
    this.zigzagDirection = 1;
    this.zigzagTimer = 0;
    this.shootCooldown = 0; // Initialize shootCooldown for ZigzagEnemy
  }

  updateMovement(playerX, playerY, bullets, lasers, slowdownFactor) {
    // Store previous position for velocity calculation
    const prevX = this.x;
    const prevY = this.y;
    
    if (this.isPortrait) {
      this.y += this.speed * slowdownFactor;
      this.zigzagTimer += slowdownFactor;
      if (this.zigzagTimer > 30) {
        this.zigzagDirection *= -1;
        this.zigzagTimer = 0;
      }
      this.x += this.zigzagDirection * 2 * slowdownFactor;
    } else {
      this.x -= this.speed * slowdownFactor;
      this.zigzagTimer += slowdownFactor;
      if (this.zigzagTimer > 30) {
        this.zigzagDirection *= -1;
        this.zigzagTimer = 0;
      }
      this.y += this.zigzagDirection * 2 * slowdownFactor;
    }
    
    // Calculate velocity (pixels per frame * 60 = pixels per second)
    this.dx = (this.x - prevX) * 60;
    this.dy = (this.y - prevY) * 60;
  }

  shoot(bullets, player) {
    this.shootCooldown++;
    if (this.shootCooldown > 180) {
      // Shoot every 3 seconds
      this.shootCooldown = 0;
      const angle = Math.atan2(player.y - this.y, player.x - this.x);
      bullets.push(
        new SpreadingBullet(
          this.x,
          this.y,
          angle,
          15, // Large initial size
          this.color,
          this.isPortrait,
          2, // Slow speed
          120, // Default explosion time
          this.game
        )
      );
    }
  }
}

// Circle Enemy
export class CircleEnemy extends Enemy {
  constructor(x, y, isPortrait, speed, isClone, generation = 0) {
    super(x, y, isPortrait, speed, isClone);
    this.type = "circle";
    this.centerX = x;
    this.centerY = y;
    this.radius = 40 + Math.random() * 30;
    this.angularSpeed = 0.04 + Math.random() * 0.02;
    this.cloneTimer = 0;
    this.cloneInterval = 150; // 2.5 seconds at 60fps
    this.clonesCreated = 0;
    this.generation = generation; // Track clone generation
    this.maxClones = Math.max(0, 3 - generation); // Original: 3, 1st gen: 2, 2nd gen: 1, 3rd gen: 0
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
    
    if (this.isPortrait) {
      this.y += this.speed * 0.5 * slowdownFactor;
      this.centerY += this.speed * 0.5 * slowdownFactor;
    } else {
      this.x -= this.speed * 0.5 * slowdownFactor;
      this.centerX -= this.speed * 0.5 * slowdownFactor;
    }

    const angle = this.time * this.angularSpeed;
    this.x = this.centerX + Math.cos(angle) * this.radius;
    this.y = this.centerY + Math.sin(angle) * this.radius;
    
    // Calculate velocity (pixels per frame * 60 = pixels per second)
    this.dx = (this.x - prevX) * 60;
    this.dy = (this.y - prevY) * 60;

    // Handle cloning - only if under the clone limit and on-screen
    this.cloneTimer += slowdownFactor;
    if (
      this.cloneTimer >= this.cloneInterval &&
      addEnemyCallback &&
      this.clonesCreated < this.maxClones &&
      this.isOnScreen()
    ) {
      console.log(`CircleEnemy cloning: timer=${this.cloneTimer}/${this.cloneInterval}, created=${this.clonesCreated}/${this.maxClones}, generation=${this.generation}`);
      this.cloneTimer = 0; // Reset timer to clone again in 5 seconds
      this.clonesCreated++; // Increment clone counter

      // Create a clone near the current position
      const offsetDistance = 50 + Math.random() * 50;
      const offsetAngle = Math.random() * Math.PI * 2;
      const cloneX = this.x + Math.cos(offsetAngle) * offsetDistance;
      const cloneY = this.y + Math.sin(offsetAngle) * offsetDistance;

      const clone = new CircleEnemy(
        cloneX,
        cloneY,
        this.isPortrait,
        this.speed,
        true,
        this.generation + 1 // Pass next generation
      );
      clone.color = this.color; // Clone inherits parent's color
      addEnemyCallback(clone);
      console.log(`CircleEnemy clone created at (${cloneX.toFixed(1)}, ${cloneY.toFixed(1)}) from parent at (${this.x.toFixed(1)}, ${this.y.toFixed(1)})`);
    }
  }

  shoot(bullets, player) {
    // Circle enemies shoot much slower - once every 5 seconds
    this.shootCooldown++;
    if (this.shootCooldown > 600) {
      this.shootCooldown = 0;
      const angle = Math.atan2(player.y - this.y, player.x - this.x);

      bullets.push(
        new Bullet(
          this.x,
          this.y,
          angle,
          6,
          this.color,
          this.isPortrait,
          5,
          false
        )
      );
    }
  }

  renderShape(ctx) {
    ctx.fillStyle = this.color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

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

// Dive Enemy
export class DiveEnemy extends Enemy {
  constructor(x, y, isPortrait, speed, isClone) {
    super(x, y, isPortrait, speed, isClone);
    this.type = "dive";
    this.phase = "approach";
    this.lockTimer = 0;
    this.lockDuration = 60; // 1 second lock-on time
    this.targetX = 0;
    this.targetY = 0;
    this.diveSpeed = 8; // Fast dive speed
    this.diveAngle = 0;
  }

  updateMovement(playerX, playerY, bullets, lasers, slowdownFactor) {
    // Store previous position for velocity calculation
    const prevX = this.x;
    const prevY = this.y;
    
    if (this.phase === "approach") {
      if (this.isPortrait) {
        this.y += this.speed * slowdownFactor;
      } else {
        this.x -= this.speed * slowdownFactor;
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
      // Dive straight at the locked target location
      this.x += Math.cos(this.diveAngle) * this.diveSpeed * slowdownFactor;
      this.y += Math.sin(this.diveAngle) * this.diveSpeed * slowdownFactor;
      this.angle = this.diveAngle;
    }
    
    // Calculate velocity (pixels per frame * 60 = pixels per second)
    this.dx = (this.x - prevX) * 60;
    this.dy = (this.y - prevY) * 60;
  }

  shoot(bullets, player) {
    // Dive enemies don't shoot - they only dive
  }

  renderShape(ctx) {
    ctx.fillStyle = this.color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

    // Much thicker triangle
    ctx.beginPath();
    ctx.moveTo(this.size * 1.2, 0); // Sharp front tip
    ctx.lineTo(-this.size * 0.8, -this.size * 0.4); // Upper edge - much thicker
    ctx.lineTo(-this.size * 0.8, this.size * 0.4); // Lower edge - much thicker
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

// Laser Enemy
export class LaserEnemy extends Enemy {
  constructor(x, y, isPortrait, speed, isClone) {
    super(x, y, isPortrait, speed, isClone);
    this.type = "laser";
    this.laserChargeTime = 0;
    this.laserFiring = false;
    this.laserBeam = null;
    this.laserCooldown = 0;
    this.laserState = "cooldown"; // cooldown, charging, firing
    this.laserAngle = 0;
    this.laserSpeed = 50;
    this.targetX = 0; // Store player's X at start of charge
    this.targetY = 0; // Store player's Y at start of charge
  }

  updateMovement(playerX, playerY, bullets, lasers, slowdownFactor) {
    // Store previous position for velocity calculation
    const prevX = this.x;
    const prevY = this.y;
    
    if (this.isPortrait) {
      this.y += this.speed * 0.8 * slowdownFactor;
    } else {
      this.x -= this.speed * 0.8 * slowdownFactor;
    }
    
    // Calculate velocity (pixels per frame * 60 = pixels per second)
    this.dx = (this.x - prevX) * 60;
    this.dy = (this.y - prevY) * 60;

    // Handle laser state machine
    switch (this.laserState) {
      case "cooldown":
        this.laserCooldown += slowdownFactor;
        if (this.laserCooldown > 60) {
          // 1 second cooldown
          this.laserState = "charging";
          this.laserChargeTime = 0;
        }
        break;

      case "charging":
        this.laserChargeTime += slowdownFactor;
        if (this.laserChargeTime > 60) {
          // 1 second charge time
          this.laserState = "preview";
          this.laserChargeTime = 0;
          // Capture player's exact location at the start of preview
          this.targetX = playerX;
          this.targetY = playerY;
        }
        break;

      case "preview":
        this.laserChargeTime += slowdownFactor;
        if (this.laserChargeTime > 90) {
          // 1.5 second preview warning
          this.laserState = "firing";
          this.laserChargeTime = 0;
          // Add 30px radius targeting inaccuracy to the captured target
          const offsetX = (Math.random() - 0.5) * 60; // -30 to +30px
          const offsetY = (Math.random() - 0.5) * 60; // -30 to +30px
          this.laserAngle = Math.atan2(
            this.targetY + offsetY - this.y,
            this.targetX + offsetX - this.x
          );
          // Create laser projectile
          lasers.push(
            new Laser(
              this.x,
              this.y,
              this.laserAngle,
              this.laserSpeed,
              this.color,
              this.game
            )
          );
        }
        break;

      case "firing":
        this.laserChargeTime += slowdownFactor;
        if (this.laserChargeTime > 60) {
          // 1 second firing duration
          this.laserState = "cooldown";
          this.laserCooldown = 0;
        }
        break;
    }
  }

  shoot(bullets, player) {
    // Laser enemies don't use regular shooting
  }

  render(ctx) {
    // Draw laser warning line BEFORE transformations (in world coordinates)
    if (this.laserState === "preview" && this.targetX !== undefined && this.targetY !== undefined) {
      ctx.save();
      
      // Calculate pulsing effect for warning line
      const pulseIntensity = 0.7 + 0.3 * Math.sin(Date.now() * 0.02); // Pulsing red line
      
      // Calculate full trajectory line across the screen
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const angle = Math.atan2(dy, dx);
      
      // Extend line from enemy towards target and beyond to screen edge
      const screenDiagonal = Math.sqrt(window.innerWidth * window.innerWidth + window.innerHeight * window.innerHeight);
      const startX = this.x; // Start at enemy position
      const startY = this.y; // Start at enemy position
      const endX = this.x + Math.cos(angle) * screenDiagonal; // Extend only forward
      const endY = this.y + Math.sin(angle) * screenDiagonal; // Extend only forward
      
      // Draw trajectory warning line from enemy towards target
      ctx.strokeStyle = `rgba(255, 0, 0, ${pulseIntensity * 0.8})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 6]); // Larger dashed line for better visibility
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash
      
      // Draw thicker laser tip indicator
      ctx.strokeStyle = `rgba(255, 0, 0, ${pulseIntensity})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + Math.cos(angle) * 40, this.y + Math.sin(angle) * 40);
      ctx.stroke();
      
      
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Apply opacity for fade-in effect
    ctx.globalAlpha = this.opacity || 1.0;

    // Draw charging effect - expanding white stroke
    if (this.laserState === "charging") {
      const charge = this.laserChargeTime / 60; // 1 second charge time
      const intensity = Math.min(1, charge);

      // Expanding white stroke around the entire enemy
      ctx.strokeStyle = `rgba(255, 255, 255, ${intensity * 0.8})`;
      ctx.lineWidth = 2 + intensity * 8; // Grows from 2px to 10px
      ctx.beginPath();
      ctx.arc(0, 0, this.size * (0.7 + intensity * 0.5), 0, Math.PI * 2);
      ctx.stroke();
    }

    this.renderShape(ctx);
    ctx.restore();
  }

  renderShape(ctx) {
    ctx.fillStyle = this.color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

    // Simple circle with laser cannon design
    // Main circular body
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Laser cannon - long thin rectangle
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.rect(
      this.size * 0.3, // Start from edge of circle
      -this.size * 0.08, // Thin height
      this.size * 0.8, // Long length
      this.size * 0.16 // Thin width
    );
    ctx.fill();
    ctx.stroke();

    // Cannon tip - slightly wider
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.rect(
      this.size * 1.05, // At the end of cannon
      -this.size * 0.1, // Slightly wider
      this.size * 0.1, // Short tip
      this.size * 0.2 // Wider than cannon
    );
    ctx.fill();
    ctx.stroke();
  }
}

// Pulse Enemy
export class PulseEnemy extends Enemy {
  constructor(x, y, isPortrait, speed, isClone) {
    super(x, y, isPortrait, speed, isClone);
    this.type = "pulse";
    this.size = GAME_CONFIG.ENEMY_SIZE * 1.4; // Make pulse enemy 40% larger
    this.pulseInterval = 240 + Math.random() * 120;
    this.pulseTimer = 0;
  }

  updateMovement(playerX, playerY, bullets, lasers, slowdownFactor) {
    // Store previous position for velocity calculation
    const prevX = this.x;
    const prevY = this.y;
    
    if (this.isPortrait) {
      this.y += this.speed * 0.6 * slowdownFactor;
    } else {
      this.x -= this.speed * 0.6 * slowdownFactor;
    }

    this.pulseTimer += slowdownFactor;
    if (this.pulseTimer > this.pulseInterval) {
      this.pulseTimer = 0;
      // Create ring of bullets instead of pulse circle
      this.firePulseRing(bullets);
    }
    
    // Calculate velocity (pixels per frame * 60 = pixels per second)
    this.dx = (this.x - prevX) * 60;
    this.dy = (this.y - prevY) * 60;
  }

  firePulseRing(bullets) {
    // Create a ring of bullets shooting outward in all directions
    const numBullets = 12; // Number of bullets in the ring
    const bulletSpeed = 3;
    const bulletSize = 6;
    const bulletColor = this.color; // Use enemy's individual color

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
          bulletSpeed,
          false
        )
      );
    }
  }

  shoot(bullets, player) {
    // Pulse enemies don't use regular shooting
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Apply opacity for fade-in effect
    ctx.globalAlpha = this.opacity || 1.0;

    // Draw pulse indicator
    if (this.pulseTimer > this.pulseInterval - 30) {
      const pulse = (this.pulseTimer - (this.pulseInterval - 30)) / 30;
      ctx.strokeStyle = `rgba(255, 153, 153, ${1 - pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * (1 + pulse * 2), 0, Math.PI * 2);
      ctx.stroke();
    }

    this.renderShape(ctx);
    ctx.restore();
  }

  renderShape(ctx) {
    ctx.fillStyle = this.color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

    // Solid filled ring design
    // Outer ring
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Inner hole (black) to create ring effect
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // White outline for definition
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// Square Enemy
export class SquareEnemy extends Enemy {
  constructor(x, y, isPortrait, speed, isClone) {
    super(x, y, isPortrait, speed, isClone);
    this.type = "square";
    this.cornerTimer = 0;
    this.cornerCooldown = 60; // 1 second cooldown for all corners
    this.rotationSpeed = 0.1; // Quick spinning
    this.visualRotation = 0; // Track visual rotation separate from angle
    this.moveTimer = 0;
    this.movementPhase = Math.random() * Math.PI * 2; // Random starting phase
    this.sideSpeed = 2 + Math.random() * 2; // Side-to-side movement speed
    this.amplitude = 30 + Math.random() * 40; // Movement amplitude
  }

  updateMovement(playerX, playerY, bullets, lasers, slowdownFactor) {
    // Store previous position for velocity calculation
    const prevX = this.x;
    const prevY = this.y;
    
    if (this.isPortrait) {
      this.y += this.speed * 0.7 * slowdownFactor;
      // Add dynamic side-to-side movement
      this.x +=
        Math.sin(this.moveTimer * 0.05 + this.movementPhase) *
        this.sideSpeed *
        slowdownFactor;
    } else {
      this.x -= this.speed * 0.7 * slowdownFactor;
      // Add dynamic up-and-down movement
      this.y +=
        Math.sin(this.moveTimer * 0.05 + this.movementPhase) *
        this.sideSpeed *
        slowdownFactor;
    }

    this.visualRotation += this.rotationSpeed * slowdownFactor;
    this.moveTimer += slowdownFactor;

    this.cornerTimer += slowdownFactor;
    if (this.cornerTimer > this.cornerCooldown) {
      this.cornerTimer = 0;
      this.fireFromAllCorners(bullets);
    }
    
    // Calculate velocity (pixels per frame * 60 = pixels per second)
    this.dx = (this.x - prevX) * 60;
    this.dy = (this.y - prevY) * 60;
  }

  fireFromAllCorners(bullets) {
    // Shoot from all four corners simultaneously
    const bulletSpeed = 4;
    const bulletSize = 6;
    const bulletColor = this.color;

    // Define corner positions relative to ship center
    const corners = [
      { x: this.size * 0.7, y: -this.size * 0.7 }, // Top right
      { x: this.size * 0.7, y: this.size * 0.7 }, // Bottom right
      { x: -this.size * 0.7, y: this.size * 0.7 }, // Bottom left
      { x: -this.size * 0.7, y: -this.size * 0.7 }, // Top left
    ];

    // Fire from all corners
    corners.forEach((corner) => {
      const cornerX = this.x + corner.x;
      const cornerY = this.y + corner.y;

      // Shoot in random directions for chaotic spread
      const angle = Math.random() * Math.PI * 2;

      bullets.push(
        new CircularBullet(
          cornerX,
          cornerY,
          angle,
          bulletSize,
          bulletColor,
          this.isPortrait,
          bulletSpeed
        )
      );
    });
  }

  shoot(bullets, player) {
    // Square enemies don't use regular shooting
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Apply opacity for fade-in effect
    ctx.globalAlpha = this.opacity || 1.0;

    // Apply spinning rotation
    ctx.rotate(this.visualRotation);

    this.renderShape(ctx);
    ctx.restore();
  }

  renderShape(ctx) {
    ctx.fillStyle = this.color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

    // Square ship with corner weapons - filled with enemy color
    ctx.beginPath();
    ctx.rect(
      -this.size * 0.6,
      -this.size * 0.6,
      this.size * 1.2,
      this.size * 1.2
    );
    ctx.fill();
    ctx.stroke();

    // No corner decorations - clean square design
  }
}

// Factory function to create enemies
export function createEnemy(type, x, y, isPortrait, speed, isClone = false) {
  switch (type) {
    case "straight":
      return new StraightEnemy(x, y, isPortrait, speed, isClone);
    case "sine":
      return new SineEnemy(x, y, isPortrait, speed, isClone);
    case "zigzag":
      return new ZigzagEnemy(x, y, isPortrait, speed, isClone);
    case "circle":
      return new CircleEnemy(x, y, isPortrait, speed, isClone);
    case "dive":
      return new DiveEnemy(x, y, isPortrait, speed, isClone);
    case "laser":
      return new LaserEnemy(x, y, isPortrait, speed, isClone);
    case "pulse":
      return new PulseEnemy(x, y, isPortrait, speed, isClone);
    case "square":
      return new SquareEnemy(x, y, isPortrait, speed, isClone);
    default:
      return new StraightEnemy(x, y, isPortrait, speed, isClone);
  }
}

// Legacy Enemy class for backward compatibility
export class LegacyEnemy extends Enemy {
  constructor(
    x,
    y,
    type,
    isPortrait,
    speed = GAME_CONFIG.ENEMY_SPEED,
    isClone = false
  ) {
    super(x, y, isPortrait, speed, isClone);

    // Return the appropriate derived class instead
    const enemyType =
      type || ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
    return createEnemy(enemyType, x, y, isPortrait, speed, isClone);
  }
}

// Re-export other classes for backward compatibility
export { Asteroid } from "./asteroid.js";

