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
    this.isShielding = false;
    this.shieldFrames = 0;
    this.shield = 0;
    this.mainWeaponLevel = 1;
    this.sideWeaponLevel = 0;
    this.secondShip = []; // Change to an array
    this.godMode = false;
    this.rollAngle = 0; // Initialize rollAngle property

    // Velocity tracking for predictive aiming
    this.vx = 0;
    this.vy = 0;
    this.prevX = x;
    this.prevY = y;
  }

  update(
    keys,
    enemies,
    asteroids,
    isPortrait,
    autoaimEnabled = true,
    mainWeaponLevel = 1,
    timeSlowActive = false
  ) {
    // Handle shield timing
    if (this.isShielding) {
      this.shieldFrames--;
      if (this.shieldFrames <= 0) {
        this.isShielding = false;
      }
    }

    // Get current speed (decreased during shield and time slow)
    let currentSpeed = this.speed;
    if (this.isShielding) {
      currentSpeed *= 0.5; // 50% speed during shield
    }
    if (timeSlowActive) {
      currentSpeed *= 0.5; // 50% speed during time slow
    }

    // Handle movement - prioritize touch for mobile, keyboard for desktop
    if (keys.target) {
      // Touch controls - move toward target
      const dx = keys.target.x - this.x;
      const dy = keys.target.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 1) {
        this.x += (dx / distance) * currentSpeed;
        this.y += (dy / distance) * currentSpeed;
      }
    } else {
      // Keyboard movement (WASD)
      if (keys.up) this.y -= currentSpeed;
      if (keys.down) this.y += currentSpeed;
      if (keys.left) this.x -= currentSpeed;
      if (keys.right) this.x += currentSpeed;
    }

    // Keep player on screen
    this.x = Math.max(20, Math.min(this.x, window.innerWidth - 20));
    this.y = Math.max(20, Math.min(this.y, window.innerHeight - 20));

    // Update velocity tracking for predictive aiming
    this.vx = this.x - this.prevX;
    this.vy = this.y - this.prevY;
    this.prevX = this.x;
    this.prevY = this.y;

    // Handle aiming - use mouse position for desktop, default angle for mobile
    if (keys.mousePosition) {
      // Desktop: aim toward mouse cursor (or last known position if off-screen)
      const dx = keys.mousePosition.x - this.x;
      const dy = keys.mousePosition.y - this.y;
      this.angle = Math.atan2(dy, dx);
    } else {
      // Mobile: use default orientation
      if (isPortrait) {
        this.angle = -Math.PI / 2; // Face up
      } else {
        this.angle = 0; // Face right
      }
    }

    // Helper function to check if target is within viewport
    const isTargetInViewport = (target) => {
      return (
        target.x >= 0 &&
        target.x <= window.innerWidth &&
        target.y >= 0 &&
        target.y <= window.innerHeight
      );
    };

    // Helper function to get current bullet speed based on weapon level
    const getCurrentBulletSpeed = (level) => {
      if (level === 5) return Infinity; // Laser beam is instant
      return GAME_CONFIG.BULLET_SPEED; // All other levels use standard speed (8)
    };

    // Advanced predictive aiming that considers both player and target velocity
    const calculatePredictiveAim = (target, bulletSpeed) => {
      if (bulletSpeed === Infinity) {
        // For laser, aim directly at target
        return Math.atan2(target.y - this.y, target.x - this.x);
      }

      // Get target velocity (some targets may not have velocity)
      const targetVx = target.vx || 0;
      const targetVy = target.vy || 0;

      // Calculate relative velocity (target velocity minus player velocity)
      const relativeVx = targetVx - this.vx;
      const relativeVy = targetVy - this.vy;

      // Calculate relative position
      const relativeX = target.x - this.x;
      const relativeY = target.y - this.y;

      // Solve for intercept time using quadratic formula
      // |target_pos + target_vel * t - player_pos - player_vel * t| = bulletSpeed * t
      const a =
        relativeVx * relativeVx +
        relativeVy * relativeVy -
        bulletSpeed * bulletSpeed;
      const b = 2 * (relativeX * relativeVx + relativeY * relativeVy);
      const c = relativeX * relativeX + relativeY * relativeY;

      let interceptTime = 0;

      if (Math.abs(a) < 0.001) {
        // Linear case: solve bt + c = 0
        if (Math.abs(b) > 0.001) {
          interceptTime = -c / b;
        }
      } else {
        // Quadratic case
        const discriminant = b * b - 4 * a * c;
        if (discriminant >= 0) {
          const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
          const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);

          // Choose the smallest positive time
          const validTimes = [t1, t2].filter((t) => t > 0);
          if (validTimes.length > 0) {
            interceptTime = Math.min(...validTimes);
          }
        }
      }

      // Calculate predicted intercept position
      const predictedX = target.x + targetVx * interceptTime;
      const predictedY = target.y + targetVy * interceptTime;

      // Return angle to predicted position
      return Math.atan2(predictedY - this.y, predictedX - this.x);
    };

    // Enhanced predictive aim with priority system
    // Only use autoaim if no mouse position (mobile) or if autoaim is explicitly enabled
    if (
      (autoaimEnabled || !keys.mousePosition) &&
      keys.fire &&
      (enemies.length > 0 || asteroids.length > 0)
    ) {
      let target = null;
      const bulletSpeed = getCurrentBulletSpeed(mainWeaponLevel);
      const allTargets = [...enemies, ...asteroids];
      const shootingEnemyTypes = ["straight", "sine", "zigzag"];

      // Priority 1: Very close targets (within 200px) - any enemy or asteroid
      let closestNearbyTarget = null;
      let closestNearbyDistance = Infinity;

      for (const t of allTargets) {
        if (isTargetInViewport(t)) {
          const dist = Math.sqrt((t.x - this.x) ** 2 + (t.y - this.y) ** 2);
          if (dist < 200 && dist < closestNearbyDistance) {
            closestNearbyDistance = dist;
            closestNearbyTarget = t;
          }
        }
      }

      if (closestNearbyTarget) {
        target = closestNearbyTarget;
      } else {
        // Priority 2: Shooting enemies (nearby ones first)
        let closestShootingEnemy = null;
        let closestShootingDistance = Infinity;

        for (const enemy of enemies) {
          if (
            shootingEnemyTypes.includes(enemy.type) &&
            isTargetInViewport(enemy)
          ) {
            const dist = Math.sqrt(
              (enemy.x - this.x) ** 2 + (enemy.y - this.y) ** 2
            );
            if (dist < closestShootingDistance) {
              closestShootingDistance = dist;
              closestShootingEnemy = enemy;
            }
          }
        }

        if (closestShootingEnemy) {
          target = closestShootingEnemy;
        } else {
          // Priority 3: Any enemies (nearby ones first)
          let closestEnemy = null;
          let closestEnemyDistance = Infinity;

          for (const enemy of enemies) {
            if (isTargetInViewport(enemy)) {
              const dist = Math.sqrt(
                (enemy.x - this.x) ** 2 + (enemy.y - this.y) ** 2
              );
              if (dist < closestEnemyDistance) {
                closestEnemyDistance = dist;
                closestEnemy = enemy;
              }
            }
          }

          if (closestEnemy) {
            target = closestEnemy;
          } else {
            // Priority 4: Asteroids (if no enemies available)
            let closestAsteroid = null;
            let closestAsteroidDistance = Infinity;

            for (const asteroid of asteroids) {
              if (isTargetInViewport(asteroid)) {
                const dist = Math.sqrt(
                  (asteroid.x - this.x) ** 2 + (asteroid.y - this.y) ** 2
                );
                if (dist < closestAsteroidDistance) {
                  closestAsteroidDistance = dist;
                  closestAsteroid = asteroid;
                }
              }
            }

            if (closestAsteroid) {
              target = closestAsteroid;
            }
          }
        }
      }

      // Apply advanced predictive aiming to the selected target
      if (target) {
        this.angle = calculatePredictiveAim(target, bulletSpeed);
      }
    }

    if (this.shootCooldown > 0) {
      this.shootCooldown--;
    }

    if (this.homingMissileCooldown > 0) {
      this.homingMissileCooldown--;
    }

    // Update second ship positions (above/below or left/right based on orientation)
    this.secondShip.forEach((ship) => {
      if (ship.isHorizontal) {
        // Portrait mode: left/right positioning
        ship.x = this.x + (ship.offset || 40);
        ship.y = this.y;
      } else {
        // Landscape mode: above/below positioning
        ship.x = this.x;
        ship.y = this.y + (ship.offset || 40);
      }
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
    // Cannot shoot while shielding
    if (this.isShielding) {
      return;
    }

    if (this.shootCooldown <= 0) {
      // Main weapon
      if (this.mainWeaponLevel >= 5) {
        // Rainbow laser beam
        bullets.push(new LaserClass(this.x, this.y, this.angle, 50, "rainbow"));
        this.shootCooldown = 1; // Allow continuous firing
      } else if (this.mainWeaponLevel === 1) {
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle,
            10,
            "#00ff88",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED
          ) // Speed 8 (same as level 2)
        ); // Cool green
        this.shootCooldown = 30; // Half as often as level 2 (0.5 seconds at 60fps)
      } else if (this.mainWeaponLevel === 2) {
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle,
            14,
            "#00ffcc",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED
          )
        ); // Teal, faster
        this.shootCooldown = 15; // Faster
      } else if (this.mainWeaponLevel === 3) {
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle,
            14,
            "#00ffff",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED
          )
        ); // Cyan
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle + 0.1,
            14,
            "#00ffff",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED
          )
        );
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle - 0.1,
            14,
            "#00ffff",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED
          )
        );
        this.shootCooldown = 15; // Same as level 2
      } else if (this.mainWeaponLevel >= 4) {
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle,
            18,
            "#4488ff",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED
          )
        ); // Cool blue, fast
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle + 0.1,
            18,
            "#4488ff",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED
          )
        );
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle - 0.1,
            18,
            "#4488ff",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED
          )
        );
        this.shootCooldown = 8; // Very fast
      }

      // Secondary weapon system (0-4 levels)
      // Level 0: Nothing (handled by if condition)

      if (this.sideWeaponLevel >= 1) {
        // Level 1: 1 missile moving off to diagonal
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle + Math.PI / 4, // 45 degree diagonal
            8,
            "#8844ff",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED
          )
        );
      }

      if (this.sideWeaponLevel >= 2) {
        // Level 2: 2 missiles going to both diagonals
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle - Math.PI / 4, // -45 degree diagonal
            8,
            "#8844ff",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED
          )
        );
      }

      if (this.sideWeaponLevel >= 2) {
        // Level 2: 2 missiles + 2 homing missiles (green, 1.5x larger)
        if (this.homingMissileCooldown <= 0) {
          bullets.push(
            new HomingMissileClass(
              this.x,
              this.y,
              this.angle + 0.2,
              9,
              "#00ff44"
            )
          );
          bullets.push(
            new HomingMissileClass(
              this.x,
              this.y,
              this.angle - 0.2,
              9,
              "#00ff44"
            )
          );
          this.homingMissileCooldown = 60; // 1 second cooldown
        }
      }

      if (this.sideWeaponLevel >= 3) {
        // Level 3: 2 missiles + 4 homing missiles total
        if (this.homingMissileCooldown <= 0) {
          // Add 2 more homing missiles (total 4)
          bullets.push(
            new HomingMissileClass(
              this.x,
              this.y,
              this.angle + 0.4,
              9,
              "#00ff44"
            )
          );
          bullets.push(
            new HomingMissileClass(
              this.x,
              this.y,
              this.angle - 0.4,
              9,
              "#00ff44"
            )
          );
        }
      }

      if (this.sideWeaponLevel >= 4) {
        // Level 4: 4 missiles total + 6 homing missiles total (ultimate level)
        // Add third and fourth missiles (we already have 2 from levels 1-2)
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle + Math.PI / 6, // 30 degree
            8,
            "#8844ff",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED
          )
        );
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle - Math.PI / 6, // -30 degree
            8,
            "#8844ff",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED
          )
        );

        // Add 2 more homing missiles (total 6)
        if (this.homingMissileCooldown <= 0) {
          bullets.push(
            new HomingMissileClass(
              this.x,
              this.y,
              this.angle + 0.6,
              9,
              "#00ff44"
            )
          );
          bullets.push(
            new HomingMissileClass(
              this.x,
              this.y,
              this.angle - 0.6,
              9,
              "#00ff44"
            )
          );
        }
      }

      // Second ship shooting
      this.secondShip.forEach((ship) => {
        let secondShipBulletColor = "#4488ff"; // Always blue
        bullets.push(
          new BulletClass(
            ship.x,
            ship.y,
            ship.initialAngle, // Use initialAngle
            8,
            secondShipBulletColor,
            isPortrait,
            GAME_CONFIG.BULLET_SPEED
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
    const shipOpacity = 1;

    ctx.globalAlpha = shipOpacity;

    // Draw filled green arrow (2.5x visual size)
    ctx.fillStyle = this.isShielding ? "#ffaa00" : "#00ff88"; // Gold when shielding, green normally

    const visualSize = this.size * 2.5; // 2.5x larger visual size

    // Simple arrow shape
    ctx.beginPath();
    ctx.moveTo(visualSize, 0); // Arrow tip
    ctx.lineTo(-visualSize / 2, -visualSize / 2); // Top left
    ctx.lineTo(-visualSize / 4, 0); // Middle left
    ctx.lineTo(-visualSize / 2, visualSize / 2); // Bottom left
    ctx.closePath();
    ctx.fill();

    // Dash trail effect removed for cleaner dash visual

    // Draw shield if active
    if (this.shield > 0) {
      const shieldThickness = 3 + this.shield * 2; // Thickness increases with shield count
      const shieldRadius = visualSize + 10 + this.shield * 2; // Radius also grows slightly

      // Outer bright blue shield
      ctx.globalAlpha = 0.8 * shipOpacity;
      ctx.strokeStyle = "#0099ff"; // Bright blue
      ctx.lineWidth = shieldThickness;
      ctx.beginPath();
      ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner shield glow
      ctx.globalAlpha = 0.4 * shipOpacity;
      ctx.strokeStyle = "#66ccff"; // Bright light blue
      ctx.lineWidth = Math.max(1, shieldThickness - 2);
      ctx.beginPath();
      ctx.arc(0, 0, shieldRadius - 2, 0, Math.PI * 2);
      ctx.stroke();

      // Additional shield rings for multiple shields
      if (this.shield > 1) {
        for (let i = 1; i < this.shield; i++) {
          ctx.globalAlpha = (0.4 - i * 0.1) * shipOpacity;
          ctx.strokeStyle = "#0099ff";
          ctx.lineWidth = Math.max(1, shieldThickness - i * 2);
          ctx.beginPath();
          ctx.arc(0, 0, shieldRadius + i * 5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // Draw godmode golden shield
    if (this.godMode) {
      // Golden shield effect
      ctx.globalAlpha = 0.9 * shipOpacity;
      ctx.strokeStyle = "#ffcc00"; // Bright gold
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, visualSize + 18, 0, Math.PI * 2);
      ctx.stroke();

      // Inner golden glow
      ctx.globalAlpha = 0.6 * shipOpacity;
      ctx.strokeStyle = "#ffdd44"; // Lighter gold
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, visualSize + 16, 0, Math.PI * 2);
      ctx.stroke();

      // Subtle pulsing outer ring
      const pulseIntensity = 0.7 + 0.3 * Math.sin(Date.now() * 0.005);
      ctx.globalAlpha = 0.4 * pulseIntensity * shipOpacity;
      ctx.strokeStyle = "#ffaa00"; // Deeper gold
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, visualSize + 20, 0, Math.PI * 2);
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
    this.secondShip.forEach((ship) => {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.initialAngle); // Use initialAngle for rendering

      ctx.globalAlpha = 0.7 * shipOpacity;
      ctx.strokeStyle = "#8844ff"; // Cool purple
      ctx.lineWidth = 2;

      // Simplified second ship design (using same visual size scaling)
      const secondShipVisualSize = this.size * 2.5 * 0.8; // Same scaling as main ship
      ctx.beginPath();
      ctx.moveTo(secondShipVisualSize, 0);
      ctx.lineTo(-secondShipVisualSize, -secondShipVisualSize / 2.4);
      ctx.lineTo(-secondShipVisualSize * 0.5, 0);
      ctx.lineTo(-secondShipVisualSize, secondShipVisualSize / 2.4);
      ctx.closePath();
      ctx.stroke();

      ctx.restore();
    });
  }
}
