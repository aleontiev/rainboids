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
    this.dashCooldown = 0;
    this.dashDistance = GAME_CONFIG.DASH_DISTANCE;
    this.isDashing = false;
    this.dashFrames = 0;
    this.dashVx = 0;
    this.dashVy = 0;
    this.maxDashFrames = GAME_CONFIG.DASH_FRAMES;
    this.shield = 0;
    this.mainWeaponLevel = 1;
    this.sideWeaponLevel = 0;
    this.secondShip = []; // Change to an array
    this.godMode = false;
    this.rollAngle = 0; // Initialize rollAngle property
  }

  update(keys, enemies, asteroids, isPortrait) {
    // Handle dash
    if (this.isDashing) {
      this.x += this.dashVx;
      this.y += this.dashVy;
      this.dashFrames--;

      if (this.dashFrames <= 0) {
        this.isDashing = false;
      }
    } else if (keys.target) {
      const dx = keys.target.x - this.x;
      const dy = keys.target.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 1) {
        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;
      }
    } else {
      // Normal movement
      if (keys.up) this.y -= this.speed;
      if (keys.down) this.y += this.speed;
      if (keys.left) this.x -= this.speed;
      if (keys.right) this.x += this.speed;
    }

    // Keep player on screen
    this.x = Math.max(20, Math.min(this.x, window.innerWidth - 20));
    this.y = Math.max(20, Math.min(this.y, window.innerHeight - 20));

    if (isPortrait) {
      this.angle = -Math.PI / 2; // Face up
    } else {
      this.angle = 0; // Face right
    }

    // Predictive aim
    if (keys.fire && (enemies.length > 0 || asteroids.length > 0)) {
      let closestTarget = null;
      let minDistance = Infinity;

      // Combine enemies and asteroids for targeting
      const targets = [...enemies, ...asteroids];

      for (const target of targets) {
        const dist = Math.sqrt(
          (target.x - this.x) ** 2 + (target.y - this.y) ** 2
        );
        if (dist < minDistance) {
          minDistance = dist;
          closestTarget = target;
        }
      }

      if (closestTarget) {
        const bulletSpeed = 10; // Assuming a bullet speed, adjust as needed
        const timeToTarget = minDistance / bulletSpeed;

        const predictedX = closestTarget.x + (closestTarget.vx || 0) * timeToTarget;
        const predictedY = closestTarget.y + (closestTarget.vy || 0) * timeToTarget;

        this.angle = Math.atan2(predictedY - this.y, predictedX - this.x);
      }
    }

    // Dash mechanic - dash in movement direction
    if (keys.shift && this.dashCooldown <= 0 && !this.isDashing) {
      // Determine dash direction based on movement keys
      let dashDirX = 0;
      let dashDirY = 0;

      if (keys.up) dashDirY = -1;
      if (keys.down) dashDirY = 1;
      if (keys.left) dashDirX = -1;
      if (keys.right) dashDirX = 1;

      // If no movement keys, dash forward
      if (dashDirX === 0 && dashDirY === 0) {
        dashDirX = Math.cos(this.angle);
        dashDirY = Math.sin(this.angle);
      } else {
        // Normalize diagonal movement
        const length = Math.sqrt(dashDirX * dashDirX + dashDirY * dashDirY);
        if (length > 0) {
          dashDirX /= length;
          dashDirY /= length;
        }
      }

      this.isDashing = true;
      this.dashFrames = this.maxDashFrames + 30;
      this.dashVx = dashDirX * (this.dashDistance / this.maxDashFrames);
      this.dashVy = dashDirY * (this.dashDistance / this.maxDashFrames);
      this.dashCooldown = 120; // 2 seconds at 60fps
    }

    if (this.dashCooldown > 0) {
      this.dashCooldown--;
    }

    if (this.shootCooldown > 0) {
      this.shootCooldown--;
    }

    if (this.homingMissileCooldown > 0) {
      this.homingMissileCooldown--;
    }

    // Update second ship positions (above or below player)
    this.secondShip.forEach(ship => {
      ship.x = this.x;
      ship.y = this.y + (ship.offset || 40); // Default to below
      ship.initialAngle = this.angle; // Make companion ship face same direction as player
    });
  }

  shoot(
    bullets,
    shootSound,
    BulletClass,
    LaserClass,
    HomingMissileClass,
    isPortrait
  ) {
    if (this.shootCooldown <= 0) {
      // Main weapon
      if (this.mainWeaponLevel >= 5) {
        // Rainbow laser beam
        bullets.push(
          new LaserClass(this.x, this.y, this.angle, 50, "rainbow")
        );
        this.shootCooldown = 1; // Allow continuous firing
      } else if (this.mainWeaponLevel === 1) {
        bullets.push(
          new BulletClass(this.x, this.y, this.angle, 10, "#00ff88", isPortrait)
        ); // Cool green
        this.shootCooldown = 30; // Slow
      } else if (this.mainWeaponLevel === 2) {
        bullets.push(
          new BulletClass(this.x, this.y, this.angle, 14, "#00ffcc", isPortrait)
        ); // Teal, faster
        this.shootCooldown = 15; // Faster
      } else if (this.mainWeaponLevel === 3) {
        bullets.push(
          new BulletClass(this.x, this.y, this.angle, 14, "#00ffff", isPortrait)
        ); // Cyan
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle + 0.1,
            14,
            "#00ffff",
            isPortrait
          )
        );
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle - 0.1,
            14,
            "#00ffff",
            isPortrait
          )
        );
        this.shootCooldown = 15; // Same as level 2
      } else if (this.mainWeaponLevel >= 4) {
        bullets.push(
          new BulletClass(this.x, this.y, this.angle, 18, "#4488ff", isPortrait)
        ); // Cool blue, fast
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle + 0.1,
            18,
            "#4488ff",
            isPortrait
          )
        );
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle - 0.1,
            18,
            "#4488ff",
            isPortrait
          )
        );
        this.shootCooldown = 8; // Very fast
      }

      // Side weapons
      if (this.sideWeaponLevel >= 1) {
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle + Math.PI / 4,
            8,
            "#8844ff",
            isPortrait
          )
        ); // Cool purple
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle - Math.PI / 4,
            8,
            "#8844ff",
            isPortrait
          )
        );
      }
      if (this.sideWeaponLevel >= 2) {
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle + Math.PI / 2,
            8,
            "#8844ff",
            isPortrait
          )
        );
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle - Math.PI / 2,
            8,
            "#8844ff",
            isPortrait
          )
        );
      }
      if (this.sideWeaponLevel >= 3) {
        if (this.homingMissileCooldown <= 0) {
          // Level 3: 1 homing missile, perpendicular to player
          bullets.push(
            new HomingMissileClass(this.x, this.y, this.angle + Math.PI / 2, 6, "#ff00ff")
          );
          this.homingMissileCooldown = 60; // 1 second cooldown
        }
      }
      if (this.sideWeaponLevel >= 4) {
        if (this.homingMissileCooldown <= 0) {
          // Level 4: 2 homing missiles, spread out
          bullets.push(
            new HomingMissileClass(this.x, this.y, this.angle + Math.PI / 2 - 0.2, 6, "#ff00ff")
          );
          bullets.push(
            new HomingMissileClass(this.x, this.y, this.angle + Math.PI / 2 + 0.2, 6, "#ff00ff")
          );
          this.homingMissileCooldown = 60; // 1 second cooldown
        }
      }
      if (this.sideWeaponLevel >= 5) {
        if (this.homingMissileCooldown <= 0) {
          // Level 5: 5 homing missiles, spread out
          bullets.push(
            new HomingMissileClass(this.x, this.y, this.angle + Math.PI / 2, 6, "#ff00ff")
          );
          bullets.push(
            new HomingMissileClass(this.x, this.y, this.angle + Math.PI / 2 - 0.4, 6, "#ff00ff")
          );
          bullets.push(
            new HomingMissileClass(this.x, this.y, this.angle + Math.PI / 2 + 0.4, 6, "#ff00ff")
          );
          bullets.push(
            new HomingMissileClass(this.x, this.y, this.angle + Math.PI / 2 - 0.8, 6, "#ff00ff")
          );
          bullets.push(
            new HomingMissileClass(this.x, this.y, this.angle + Math.PI / 2 + 0.8, 6, "#ff00ff")
          );
          this.homingMissileCooldown = 60; // 1 second cooldown
        }
      }

      // Second ship shooting
      this.secondShip.forEach(ship => {
        let secondShipBulletColor = '#4488ff'; // Always blue
        bullets.push(
          new BulletClass(
            ship.x,
            ship.y,
            ship.initialAngle, // Use initialAngle
            8,
            secondShipBulletColor,
            isPortrait
          )
        );
      });

      this.shootCooldown = 10;
      if (shootSound) {
        shootSound.play();
      }
    }
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + this.rollAngle);

    // Dash fade effect - fade to completely invisible and back
    let shipOpacity = 1;
    if (this.isDashing) {
      const dashProgress =
        (this.maxDashFrames - this.dashFrames) / this.maxDashFrames;
      if (dashProgress < 0.5) {
        // Fade out in first half (1.0 -> 0.0)
        shipOpacity = 1 - dashProgress * 2;
      } else {
        // Fade in during second half (0.0 -> 1.0)
        shipOpacity = (dashProgress - 0.5) * 2;
      }

      // Ensure complete invisibility at the midpoint
      if (Math.abs(dashProgress - 0.5) < 0.1) {
        shipOpacity = 0;
      }
    }

    ctx.globalAlpha = shipOpacity;

    // Draw intricate ship design
    ctx.strokeStyle = this.isDashing ? "#44ffff" : "#00ff88"; // Cool cyan when dashing, cool green normally
    ctx.lineWidth = 2;

    // Main hull
    ctx.beginPath();
    ctx.moveTo(this.size, 0);
    ctx.lineTo(-this.size, -this.size / 2);
    ctx.lineTo(-this.size / 2, 0);
    ctx.lineTo(-this.size, this.size / 2);
    ctx.closePath();
    ctx.stroke();

    // Wing details
    ctx.beginPath();
    ctx.moveTo(-this.size / 2, -this.size / 3);
    ctx.lineTo(-this.size / 4, -this.size / 4);
    ctx.lineTo(0, -this.size / 6);
    ctx.moveTo(-this.size / 2, this.size / 3);
    ctx.lineTo(-this.size / 4, this.size / 4);
    ctx.lineTo(0, this.size / 6);
    ctx.stroke();

    // Cockpit
    ctx.beginPath();
    ctx.arc(this.size / 3, 0, this.size / 6, 0, Math.PI * 2);
    ctx.stroke();

    // Engine exhausts
    ctx.beginPath();
    ctx.moveTo(-this.size, -this.size / 4);
    ctx.lineTo(-this.size * 1.2, -this.size / 4);
    ctx.moveTo(-this.size, this.size / 4);
    ctx.lineTo(-this.size * 1.2, this.size / 4);
    ctx.stroke();

    // Nose cone detail
    ctx.beginPath();
    ctx.moveTo(this.size, 0);
    ctx.lineTo(this.size / 2, -this.size / 8);
    ctx.lineTo(this.size / 2, this.size / 8);
    ctx.closePath();
    ctx.stroke();

    // Draw dash trail effect
    if (this.isDashing) {
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = "#44ffff"; // Cool cyan
      ctx.lineWidth = 6;

      // Create multiple trail lines for effect
      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 0.6 / i;
        ctx.beginPath();
        ctx.moveTo(-this.dashVx * i * 2, -this.dashVy * i * 2);
        ctx.lineTo(-this.dashVx * i * 4, -this.dashVy * i * 4);
        ctx.stroke();
      }
    }

    // Draw shield if active
    if (this.shield > 0) {
      ctx.globalAlpha = 0.6 * shipOpacity;
      ctx.strokeStyle = "#00aaff"; // Cool blue
      ctx.lineWidth = 4; // Thicker shield
      ctx.beginPath();
      ctx.arc(0, 0, this.size + 10, 0, Math.PI * 2); // Slightly larger
      ctx.stroke();

      // Inner shield glow
      ctx.globalAlpha = 0.3 * shipOpacity;
      ctx.strokeStyle = "#88ccff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.size + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw godmode indicator
    if (this.godMode) {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "#ffff00"; // Golden glow
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.size + 15, 0, Math.PI * 2);
      ctx.stroke();

      // Pulsing effect
      ctx.globalAlpha = 0.3 + 0.2 * Math.sin(Date.now() * 0.01);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, this.size + 17, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw small hitbox for debugging (optional)
    ctx.globalAlpha = shipOpacity * 0.5;
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, this.hitboxSize, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // Draw second ships if active
    this.secondShip.forEach(ship => {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.initialAngle); // Use initialAngle for rendering

      ctx.globalAlpha = 0.7 * shipOpacity;
      ctx.strokeStyle = "#8844ff"; // Cool purple
      ctx.lineWidth = 2;

      // Simplified second ship design
      ctx.beginPath();
      ctx.moveTo(this.size * 0.8, 0);
      ctx.lineTo(-this.size * 0.8, -this.size / 3);
      ctx.lineTo(-this.size * 0.4, 0);
      ctx.lineTo(-this.size * 0.8, this.size / 3);
      ctx.closePath();
      ctx.stroke();

      ctx.restore();
    });
  }
}

