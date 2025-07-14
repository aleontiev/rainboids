// Enemy entities for Rainboids: Blitz - Refactored with inheritance
import { GAME_CONFIG, COLORS, ENEMY_TYPES } from "../constants.js";
import { Bullet } from "./bullet.js";
import { Laser } from "./laser.js";
import { CircularBullet } from "./circular-bullet.js";
import { SpreadingBullet } from "./spreading-bullet.js";

// Base Enemy Class
export class BaseEnemy {
  constructor(
    x,
    y,
    isPortrait,
    speed = GAME_CONFIG.ENEMY_SPEED,
    isClone = false
  ) {
    this.x = x;
    this.y = y;
    this.size = GAME_CONFIG.ENEMY_SIZE;
    this.speed = speed;
    this.angle = isPortrait ? Math.PI / 2 : Math.PI; // Face down or left
    this.health = 1;
    this.shootCooldown = 0;
    this.time = 0;
    this.initialX = x;
    this.initialY = y;
    this.isPortrait = isPortrait;

    // Assign random color to each enemy
    this.color =
      COLORS.ENEMY_RANDOM_COLORS[
        Math.floor(Math.random() * COLORS.ENEMY_RANDOM_COLORS.length)
      ];

    // Handle clone fade-in effect
    this.isClone = isClone;
    this.fadeInTimer = isClone ? 0 : 60; // Clones start invisible and fade in over 1 second
    this.opacity = isClone ? 0 : 1.0;
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
    if (this.isClone && this.fadeInTimer < 60) {
      this.fadeInTimer += slowdownFactor;
      this.opacity = Math.min(1.0, this.fadeInTimer / 60);
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
    // Base movement - move straight
    if (this.isPortrait) {
      this.y += this.speed * slowdownFactor;
    } else {
      this.x -= this.speed * slowdownFactor;
    }
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
          false
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
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(this.size, 0); // Tip pointing forward
    ctx.lineTo(-this.size * 0.5, -this.size * 0.5); // Top left
    ctx.lineTo(-this.size * 0.3, 0); // Middle left
    ctx.lineTo(-this.size * 0.5, this.size * 0.5); // Bottom left
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

// Straight Enemy
export class StraightEnemy extends BaseEnemy {
  constructor(x, y, isPortrait, speed, isClone) {
    super(x, y, isPortrait, speed, isClone);
    this.type = "straight";
  }
}

// Sine Enemy
export class SineEnemy extends BaseEnemy {
  constructor(x, y, isPortrait, speed, isClone) {
    super(x, y, isPortrait, speed, isClone);
    this.type = "sine";
    this.amplitude = 30 + Math.random() * 40;
    this.frequency = 0.01 + Math.random() * 0.02;
  }

  updateMovement(playerX, playerY, bullets, lasers, slowdownFactor) {
    if (this.isPortrait) {
      this.y += this.speed * slowdownFactor;
      this.x =
        this.initialX + Math.sin(this.time * this.frequency) * this.amplitude;
    } else {
      this.x -= this.speed * slowdownFactor;
      this.y =
        this.initialY + Math.sin(this.time * this.frequency) * this.amplitude;
    }
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
export class ZigzagEnemy extends BaseEnemy {
  constructor(x, y, isPortrait, speed, isClone) {
    super(x, y, isPortrait, speed, isClone);
    this.type = "zigzag";
    this.zigzagDirection = 1;
    this.zigzagTimer = 0;
    this.shootCooldown = 0; // Initialize shootCooldown for ZigzagEnemy
  }

  updateMovement(playerX, playerY, bullets, lasers, slowdownFactor) {
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
          2 // Slow speed
        )
      );
    }
  }
}

// Circle Enemy
export class CircleEnemy extends BaseEnemy {
  constructor(x, y, isPortrait, speed, isClone) {
    super(x, y, isPortrait, speed, isClone);
    this.type = "circle";
    this.centerX = x;
    this.centerY = y;
    this.radius = 40 + Math.random() * 30;
    this.angularSpeed = 0.04 + Math.random() * 0.02;
    this.cloneTimer = 0;
    this.cloneInterval = 150; // 2.5 seconds at 60fps
    this.clonesCreated = 0;
    this.maxClones = 3;
  }

  updateMovement(
    playerX,
    playerY,
    bullets,
    lasers,
    slowdownFactor,
    addEnemyCallback
  ) {
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

    // Handle cloning - only if under the clone limit and on-screen
    this.cloneTimer += slowdownFactor;
    if (
      this.cloneTimer >= this.cloneInterval &&
      addEnemyCallback &&
      this.clonesCreated < this.maxClones &&
      this.isOnScreen()
    ) {
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
        true
      );
      clone.color = this.color; // Clone inherits parent's color
      addEnemyCallback(clone);
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
export class DiveEnemy extends BaseEnemy {
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
export class LaserEnemy extends BaseEnemy {
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
    if (this.isPortrait) {
      this.y += this.speed * 0.8 * slowdownFactor;
    } else {
      this.x -= this.speed * 0.8 * slowdownFactor;
    }

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
        if (this.laserChargeTime > 15) {
          // 0.25 seconds preview
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
              this.color
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
export class PulseEnemy extends BaseEnemy {
  constructor(x, y, isPortrait, speed, isClone) {
    super(x, y, isPortrait, speed, isClone);
    this.type = "pulse";
    this.size = GAME_CONFIG.ENEMY_SIZE * 1.4; // Make pulse enemy 40% larger
    this.pulseInterval = 240 + Math.random() * 120;
    this.pulseTimer = 0;
  }

  updateMovement(playerX, playerY, bullets, lasers, slowdownFactor) {
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
export class SquareEnemy extends BaseEnemy {
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
export class Enemy extends BaseEnemy {
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

