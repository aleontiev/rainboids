// Enemy entities for Rainboids: Blitz
import { GAME_CONFIG, COLORS, ENEMY_TYPES } from "../constants.js";

export class Enemy {
  constructor(
    x,
    y,
    type,
    isPortrait,
    speed = GAME_CONFIG.ENEMY_SPEED,
    isClone = false
  ) {
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

    // Assign random color to each enemy
    this.color =
      COLORS.ENEMY_RANDOM_COLORS[
        Math.floor(Math.random() * COLORS.ENEMY_RANDOM_COLORS.length)
      ];

    // Handle clone fade-in effect
    this.isClone = isClone;
    this.fadeInTimer = isClone ? 0 : 60; // Clones start invisible and fade in over 1 second

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
        this.angularSpeed = 0.04 + Math.random() * 0.02;
        this.cloneTimer = 0;
        this.cloneInterval = 120;
        this.opacity = 1.0; // For fade-in effect
        break;
      case "dive":
        this.phase = "approach";
        this.lockTimer = 0;
        this.lockDuration = 60; // 1 second lock-on time
        this.targetX = 0;
        this.targetY = 0;
        this.diveSpeed = 8; // Fast dive speed
        this.diveAngle = 0;
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
        this.size = GAME_CONFIG.ENEMY_SIZE * 1.4; // Make pulse enemy 40% larger
        break;
      case "square":
        this.cornerTimer = 0;
        this.cornerCooldown = 60; // 1 second cooldown for all corners
        this.rotationSpeed = 0.1; // Quick spinning
        this.visualRotation = 0; // Track visual rotation separate from angle
        this.moveTimer = 0;
        this.movementPhase = Math.random() * Math.PI * 2; // Random starting phase
        this.sideSpeed = 2 + Math.random() * 2; // Side-to-side movement speed
        this.amplitude = 30 + Math.random() * 40; // Movement amplitude
        break;
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
    if (this.isClone && this.fadeInTimer < 60) {
      this.fadeInTimer += slowdownFactor;
      this.opacity = Math.min(1.0, this.fadeInTimer / 60);
    }

    // Make enemies face the player
    this.angle = Math.atan2(playerY - this.y, playerX - this.x);

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

          // Handle cloning
          this.cloneTimer += slowdownFactor;
          if (this.cloneTimer >= this.cloneInterval && addEnemyCallback) {
            this.cloneTimer = 0; // Reset timer to clone again in 3 seconds

            // Create a clone near the current position
            const offsetDistance = 50 + Math.random() * 50;
            const offsetAngle = Math.random() * Math.PI * 2;
            const cloneX = this.x + Math.cos(offsetAngle) * offsetDistance;
            const cloneY = this.y + Math.sin(offsetAngle) * offsetDistance;

            const clone = new Enemy(
              cloneX,
              cloneY,
              "circle",
              this.isPortrait,
              this.speed,
              true
            );
            clone.color = this.color; // Clone inherits parent's color
            addEnemyCallback(clone);
          }
          break;
        case "dive":
          if (this.phase === "approach") {
            this.y += this.speed * slowdownFactor;
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
            this.x +=
              Math.cos(this.diveAngle) * this.diveSpeed * slowdownFactor;
            this.y +=
              Math.sin(this.diveAngle) * this.diveSpeed * slowdownFactor;
            this.angle = this.diveAngle;
          }
          break;
        case "laser":
          this.y += this.speed * 0.8 * slowdownFactor;

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
                // Add 30px radius targeting inaccuracy
                const offsetX = (Math.random() - 0.5) * 60; // -30 to +30px
                const offsetY = (Math.random() - 0.5) * 60; // -30 to +30px
                this.laserAngle = Math.atan2(
                  playerY + offsetY - this.y,
                  playerX + offsetX - this.x
                );
              }
              break;

            case "preview":
              this.laserChargeTime += slowdownFactor;
              if (this.laserChargeTime > 15) {
                // 0.25 seconds preview
                this.laserState = "firing";
                this.laserChargeTime = 0;
                // Create laser projectile
                lasers.push(
                  new Laser(
                    this.x,
                    this.y,
                    this.laserAngle,
                    this.laserSpeed, // Use the slower speed
                    this.color // Use enemy's individual color
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
        case "square":
          this.y += this.speed * 0.7 * slowdownFactor;
          this.visualRotation += this.rotationSpeed * slowdownFactor;
          this.moveTimer += slowdownFactor;

          // Add dynamic side-to-side movement
          this.x +=
            Math.sin(this.moveTimer * 0.05 + this.movementPhase) *
            this.sideSpeed *
            slowdownFactor;

          this.cornerTimer += slowdownFactor;
          if (this.cornerTimer > this.cornerCooldown) {
            this.cornerTimer = 0;
            this.fireFromAllCorners(bullets);
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

          // Handle cloning
          this.cloneTimer += slowdownFactor;
          if (this.cloneTimer >= this.cloneInterval && addEnemyCallback) {
            this.cloneTimer = 0; // Reset timer to clone again in 3 seconds

            // Create a clone near the current position
            const offsetDistance = 60 + Math.random() * 40; // 60-100 pixels away
            const offsetAngle = Math.random() * Math.PI * 2;
            const cloneX = this.x + Math.cos(offsetAngle) * offsetDistance;
            const cloneY = this.y + Math.sin(offsetAngle) * offsetDistance;

            const clone = new Enemy(
              cloneX,
              cloneY,
              "circle",
              this.isPortrait,
              this.speed,
              true
            );
            clone.color = this.color; // Clone inherits parent's color
            addEnemyCallback(clone);
          }
          break;

        case "dive":
          if (this.phase === "approach") {
            this.x -= this.speed;
            this.lockTimer++;
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
            this.x += Math.cos(this.diveAngle) * this.diveSpeed;
            this.y += Math.sin(this.diveAngle) * this.diveSpeed;
            this.angle = this.diveAngle;
          }
          break;

        case "laser":
          this.x -= this.speed * 0.8;

          // Handle laser state machine
          switch (this.laserState) {
            case "cooldown":
              this.laserCooldown++;
              if (this.laserCooldown > 60) {
                // 1 second cooldown
                this.laserState = "charging";
                this.laserChargeTime = 0;
              }
              break;

            case "charging":
              this.laserChargeTime++;
              if (this.laserChargeTime > 60) {
                // 1 second charge time
                this.laserState = "preview";
                this.laserChargeTime = 0;
                // Add 30px radius targeting inaccuracy
                const offsetX = (Math.random() - 0.5) * 60; // -30 to +30px
                const offsetY = (Math.random() - 0.5) * 60; // -30 to +30px
                this.laserAngle = Math.atan2(
                  playerY + offsetY - this.y,
                  playerX + offsetX - this.x
                );
              }
              break;

            case "preview":
              this.laserChargeTime++;
              if (this.laserChargeTime > 15) {
                // 0.25 seconds preview
                this.laserState = "firing";
                this.laserChargeTime = 0;
                // Create laser projectile
                lasers.push(
                  new Laser(
                    this.x,
                    this.y,
                    this.laserAngle,
                    this.laserSpeed, // Use the slower speed
                    this.color // Use enemy's individual color
                  )
                );
              }
              break;

            case "firing":
              this.laserChargeTime++;
              if (this.laserChargeTime > 60) {
                // 1 second firing duration
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
        case "square":
          this.x -= this.speed * 0.7;
          this.visualRotation += this.rotationSpeed;
          this.moveTimer++;

          // Add dynamic up-and-down movement
          this.y +=
            Math.sin(this.moveTimer * 0.05 + this.movementPhase) *
            this.sideSpeed;

          this.cornerTimer++;
          if (this.cornerTimer > this.cornerCooldown) {
            this.cornerTimer = 0;
            this.fireFromAllCorners(bullets);
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
    if (["straight", "zigzag"].includes(this.type)) {
      this.shootCooldown++;
      if (this.shootCooldown > 60 + Math.random() * 60) {
        this.shootCooldown = 0;
        const angle = Math.atan2(player.y - this.y, player.x - this.x);

        // Use the enemy's individual color for its bullets
        const bulletColor = this.color;

        bullets.push(
          new Bullet(
            this.x,
            this.y,
            angle,
            7.5,
            bulletColor,
            this.isPortrait,
            6.4
          )
        ); // Size 7.5, random warm color, speed 6.4
      }
    } else if (this.type === "sine") {
      this.shootFromSineHalves(bullets, player);
    }
  }

  shootFromSineHalves(bullets, player) {
    this.shootCooldown++;
    if (this.shootCooldown > 60 + Math.random() * 60) {
      this.shootCooldown = 0;
      const angle = Math.atan2(player.y - this.y, player.x - this.x);
      const bulletColor = this.color;

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
          7.5,
          bulletColor,
          this.isPortrait,
          6.4
        )
      );

      // Shoot from bottom half
      bullets.push(
        new Bullet(
          bottomHalfX,
          bottomHalfY,
          angle,
          7.5,
          bulletColor,
          this.isPortrait,
          6.4
        )
      );
    }
  }

  firePulseRing(bullets) {
    // Create a ring of bullets shooting outward in all directions
    const numBullets = 12; // Number of bullets in the ring
    const bulletSpeed = 3;
    const bulletSize = 8;
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
          bulletSpeed
        )
      );
    }
  }

  fireFromCorner(bullets) {
    // Shoot from one of the four corners
    const bulletSpeed = 4;
    const bulletSize = 7;
    const bulletColor = this.color;

    // Define corner positions relative to ship center
    const corners = [
      { x: this.size * 0.7, y: -this.size * 0.7 }, // Top right
      { x: this.size * 0.7, y: this.size * 0.7 }, // Bottom right
      { x: -this.size * 0.7, y: this.size * 0.7 }, // Bottom left
      { x: -this.size * 0.7, y: -this.size * 0.7 }, // Top left
    ];

    const corner = corners[this.currentCorner];
    const cornerX = this.x + corner.x;
    const cornerY = this.y + corner.y;

    // Shoot towards player from this corner
    const angle = Math.atan2(
      // Add some randomness for interesting patterns
      (Math.random() - 0.5) * 100,
      this.isPortrait ? -100 : -200 // Shoot towards movement direction
    );

    bullets.push(
      new Bullet(
        cornerX,
        cornerY,
        angle,
        bulletSize,
        bulletColor,
        this.isPortrait,
        bulletSpeed
      )
    );

    // Move to next corner
    this.currentCorner = (this.currentCorner + 1) % 4;
  }

  fireFromAllCorners(bullets) {
    // Shoot from all four corners simultaneously
    const bulletSpeed = 4;
    const bulletSize = 7;
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
        new Bullet(
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

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Apply opacity for fade-in effect
    ctx.globalAlpha = this.opacity || 1.0;

    // Use enemy's individual color
    const color = this.color;

    // Draw based on type
    switch (this.type) {
      case "laser":
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
        // Simple triangle (like player ship)
        ctx.beginPath();
        ctx.moveTo(this.size, 0); // Tip pointing forward
        ctx.lineTo(-this.size * 0.5, -this.size * 0.5); // Top left
        ctx.lineTo(-this.size * 0.3, 0); // Middle left
        ctx.lineTo(-this.size * 0.5, this.size * 0.5); // Bottom left
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case "sine":
        // Figure-8 shape (number 8) - 2x larger
        ctx.beginPath();
        // Top circle of the 8
        ctx.arc(0, -this.size * 0.6, this.size * 0.6, 0, Math.PI * 2);
        ctx.moveTo(this.size * 0.6, this.size * 0.6);
        // Bottom circle of the 8
        ctx.arc(0, this.size * 0.6, this.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;

      case "zigzag":
        // 5-pointed star shape
        ctx.beginPath();
        const outerRadius = this.size;
        const innerRadius = this.size * 0.4;
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5;
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const x = Math.cos(angle - Math.PI / 2) * radius;
          const y = Math.sin(angle - Math.PI / 2) * radius;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
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
        // Much thicker triangle
        ctx.beginPath();
        ctx.moveTo(this.size * 1.2, 0); // Sharp front tip
        ctx.lineTo(-this.size * 0.8, -this.size * 0.4); // Upper edge - much thicker
        ctx.lineTo(-this.size * 0.8, this.size * 0.4); // Lower edge - much thicker
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case "laser":
        // Simple circle with laser cannon design
        ctx.fillStyle = color;

        // Main circular body
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Laser cannon - long thin rectangle
        ctx.fillStyle = color;
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
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.rect(
          this.size * 1.05, // At the end of cannon
          -this.size * 0.1, // Slightly wider
          this.size * 0.1, // Short tip
          this.size * 0.2 // Wider than cannon
        );
        ctx.fill();
        ctx.stroke();
        break;

      case "pulse":
        // Solid filled ring design
        ctx.fillStyle = color;

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
        break;

      case "square":
        // Apply spinning rotation
        ctx.rotate(this.visualRotation);

        // Square ship with corner weapons - filled with enemy color
        ctx.fillStyle = color;
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
        break;
    }

    // Engine glow removed for cleaner design
  }
}

// MiniBoss moved to separate file

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
    this.width = 8; // Very thin laser for enemy lasers
    this.length = 100; // Length of laser beam for collision detection
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

// HomingMissile moved to separate file
