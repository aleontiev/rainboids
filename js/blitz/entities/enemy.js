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
      case "square":
        this.cornerTimer = 0;
        this.cornerCooldown = 90; // 1.5 second cooldown
        this.currentCorner = 0; // Which corner to shoot from next
        break;
    }
  }

  update(
    playerX,
    playerY,
    bullets,
    lasers,
    slowdownFactor = 1.0
  ) {
    this.time += slowdownFactor;
    
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
              if (this.laserChargeTime > 60) { // 1 second charge time
                this.laserState = "preview";
                this.laserChargeTime = 0;
                // Add 30px radius targeting inaccuracy
                const offsetX = (Math.random() - 0.5) * 60; // -30 to +30px
                const offsetY = (Math.random() - 0.5) * 60; // -30 to +30px
                this.laserAngle = Math.atan2(playerY + offsetY - this.y, playerX + offsetX - this.x);
              }
              break;
              
            case "preview":
              this.laserChargeTime += slowdownFactor;
              if (this.laserChargeTime > 15) { // 0.25 seconds preview
                this.laserState = "firing";
                this.laserChargeTime = 0;
                // Create laser projectile
                lasers.push(
                  new Laser(
                    this.x,
                    this.y,
                    this.laserAngle,
                    this.laserSpeed, // Use the slower speed
                    COLORS.ENEMY_COLORS[this.type] || "#ff6666" // Use enemy color
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
        case "square":
          this.y += this.speed * 0.7 * slowdownFactor;
          this.cornerTimer += slowdownFactor;
          if (this.cornerTimer > this.cornerCooldown) {
            this.cornerTimer = 0;
            this.fireFromCorner(bullets);
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
              if (this.laserChargeTime > 60) { // 1 second charge time
                this.laserState = "preview";
                this.laserChargeTime = 0;
                // Add 30px radius targeting inaccuracy
                const offsetX = (Math.random() - 0.5) * 60; // -30 to +30px
                const offsetY = (Math.random() - 0.5) * 60; // -30 to +30px
                this.laserAngle = Math.atan2(playerY + offsetY - this.y, playerX + offsetX - this.x);
              }
              break;
              
            case "preview":
              this.laserChargeTime++;
              if (this.laserChargeTime > 15) { // 0.25 seconds preview
                this.laserState = "firing";
                this.laserChargeTime = 0;
                // Create laser projectile
                lasers.push(
                  new Laser(
                    this.x,
                    this.y,
                    this.laserAngle,
                    this.laserSpeed, // Use the slower speed
                    COLORS.ENEMY_COLORS[this.type] || "#ff6666" // Use enemy color
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
        case "square":
          this.x -= this.speed * 0.7;
          this.cornerTimer++;
          if (this.cornerTimer > this.cornerCooldown) {
            this.cornerTimer = 0;
            this.fireFromCorner(bullets);
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

        // Use the enemy's color for its bullets
        const bulletColor = COLORS.ENEMY_COLORS[this.type] || "#ff6666";

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

  fireFromCorner(bullets) {
    // Shoot from one of the four corners
    const bulletSpeed = 4;
    const bulletSize = 7;
    const bulletColor = COLORS.ENEMY_COLORS[this.type] || "#000000";
    
    // Define corner positions relative to ship center
    const corners = [
      { x: this.size * 0.7, y: -this.size * 0.7 }, // Top right
      { x: this.size * 0.7, y: this.size * 0.7 },  // Bottom right  
      { x: -this.size * 0.7, y: this.size * 0.7 }, // Bottom left
      { x: -this.size * 0.7, y: -this.size * 0.7 } // Top left
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
          const charge = this.laserChargeTime / 60; // 1 second charge time
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

      case "zigzag":
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
        // Very pointy needle/spear shape
        ctx.beginPath();
        ctx.moveTo(this.size * 1.0, 0); // Sharp front tip
        ctx.lineTo(this.size * 0.2, -this.size * 0.15); // Upper edge
        ctx.lineTo(-this.size * 0.8, -this.size * 0.1); // Upper back
        ctx.lineTo(-this.size * 1.0, 0); // Rear tip
        ctx.lineTo(-this.size * 0.8, this.size * 0.1); // Lower back
        ctx.lineTo(this.size * 0.2, this.size * 0.15); // Lower edge
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Central spine detail
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.size * 1.0, 0);
        ctx.lineTo(-this.size * 1.0, 0);
        ctx.stroke();
        break;

      case "laser":
        // Long cylinder laser ship
        // Add bright red glow when charging
        if (this.laserState === "charging") {
          const charge = this.laserChargeTime / 60; // 1 second charge time
          const intensity = Math.min(1, charge);
          const glowIntensity = 0.3 + Math.sin(this.laserChargeTime * 0.3) * 0.4;
          
          // Outer red glow
          ctx.shadowColor = `rgba(255, 0, 0, ${intensity * glowIntensity})`;
          ctx.shadowBlur = 15 + (intensity * 10);
          ctx.fillStyle = `rgba(255, ${100 - intensity * 50}, ${100 - intensity * 50}, 1)`;
        }
        
        // Draw long cylinder
        ctx.beginPath();
        ctx.rect(
          -this.size * 1.2, // Longer cylinder
          -this.size * 0.15, // Thinner cylinder
          this.size * 2.4,   // Very long
          this.size * 0.3    // Thin height
        );
        ctx.fill();
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;

        // Cylinder details - segments
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const segmentX = -this.size + (i * this.size * 0.6);
          ctx.beginPath();
          ctx.moveTo(segmentX, -this.size * 0.15);
          ctx.lineTo(segmentX, this.size * 0.15);
          ctx.stroke();
        }

        // Laser aperture at front
        ctx.fillStyle = "#ff0000";
        ctx.beginPath();
        ctx.arc(this.size * 1.2, 0, this.size * 0.08, 0, Math.PI * 2);
        ctx.fill();
        
        // Laser charging stroke effect
        if (this.laserState === "charging") {
          const charge = this.laserChargeTime / 60; // 1 second charge time
          const intensity = Math.min(1, charge);
          
          // Growing stroke around the cylinder (2x thicker)
          ctx.strokeStyle = `rgba(255, 255, 255, ${intensity * 0.8})`;
          ctx.lineWidth = 4 + intensity * 12; // Grows from 4px to 16px
          ctx.beginPath();
          ctx.rect(
            -this.size * 1.2,
            -this.size * 0.15,
            this.size * 2.4,
            this.size * 0.3
          );
          ctx.stroke();
        } else if (this.laserState === "firing") {
          // White flash when firing (2x thicker)
          const flashIntensity = 1 - (this.laserChargeTime / 60); // Fade out over firing duration
          ctx.strokeStyle = `rgba(255, 255, 255, ${flashIntensity})`;
          ctx.lineWidth = 16;
          ctx.beginPath();
          ctx.rect(
            -this.size * 1.2,
            -this.size * 0.15,
            this.size * 2.4,
            this.size * 0.3
          );
          ctx.stroke();
        }
        break;

      case "pulse":
        // Round ship that emits pulse rings
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Central core
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.3, 0, Math.PI * 2);
        ctx.fill();

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

      case "square":
        // Square ship with corner weapons
        ctx.beginPath();
        ctx.rect(
          -this.size * 0.6,
          -this.size * 0.6,
          this.size * 1.2,
          this.size * 1.2
        );
        ctx.fill();
        ctx.stroke();

        // Corner weapon ports
        ctx.fillStyle = "#ff4444";
        const weaponSize = this.size * 0.2;
        const corners = [
          { x: this.size * 0.5, y: -this.size * 0.5 }, // Top right
          { x: this.size * 0.5, y: this.size * 0.5 },  // Bottom right
          { x: -this.size * 0.5, y: this.size * 0.5 }, // Bottom left
          { x: -this.size * 0.5, y: -this.size * 0.5 } // Top left
        ];
        
        corners.forEach((corner, index) => {
          ctx.beginPath();
          ctx.rect(corner.x - weaponSize/2, corner.y - weaponSize/2, weaponSize, weaponSize);
          ctx.fill();
          ctx.stroke();
          
          // Highlight the active corner
          if (index === this.currentCorner) {
            ctx.strokeStyle = "#ffff00";
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
          }
        });
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

