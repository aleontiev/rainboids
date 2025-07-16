// Player entity for Rainboids: Blitz
import { GAME_CONFIG } from "../constants.js";
import { Autoplayer } from "../autoplayer.js";
import { Autoaimer } from "../autoaimer.js";

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
    this.shieldCooldown = 0;
    this.shieldCooldownMax = 300;
    this.mainWeaponLevel = 1;
    this.sideWeaponLevel = 0;
    this.secondShip = []; // Change to an array
    this.godMode = false;
    this.rollAngle = 0; // Initialize rollAngle property

    // Rainbow invulnerability powerup
    this.rainbowInvulnerable = false;
    this.rainbowInvulnerableTimer = 0;
    this.rainbowInvulnerableDuration = 360; // 6 seconds at 60fps

    // Velocity tracking for predictive aiming
    this.vx = 0;
    this.vy = 0;
    this.prevX = x;
    this.prevY = y;

    // Initialize autoplayer and autoaimer
    this.autoplayer = new Autoplayer(this);
    this.autoaimer = new Autoaimer(this);
  }

  // Calculate exact intercept solution accounting for all velocity vectors
  calculateInterceptSolution(
    playerX,
    playerY,
    playerVx,
    playerVy,
    targetX,
    targetY,
    targetVx,
    targetVy,
    bulletSpeed
  ) {
    // Relative position and velocity
    const relativeX = targetX - playerX;
    const relativeY = targetY - playerY;
    const relativeVx = targetVx - playerVx;
    const relativeVy = targetVy - playerVy;

    // Quadratic equation coefficients for intercept calculation
    // We want to solve: |relative_pos + relative_vel * t| = bullet_speed * t
    // This gives us: (relativeX + relativeVx*t)² + (relativeY + relativeVy*t)² = (bulletSpeed*t)²

    const a =
      relativeVx * relativeVx +
      relativeVy * relativeVy -
      bulletSpeed * bulletSpeed;
    const b = 2 * (relativeX * relativeVx + relativeY * relativeVy);
    const c = relativeX * relativeX + relativeY * relativeY;

    const discriminant = b * b - 4 * a * c;

    // No solution if discriminant is negative
    if (discriminant < 0) {
      return null;
    }

    let interceptTime = 0;

    if (Math.abs(a) < 0.0001) {
      // Linear case: target and bullet speeds nearly cancel out
      if (Math.abs(b) > 0.0001) {
        interceptTime = -c / b;
      } else {
        // Target is already at the right position
        interceptTime = 0;
      }
    } else {
      // Quadratic case: solve for intercept time
      const sqrtDiscriminant = Math.sqrt(discriminant);
      const t1 = (-b - sqrtDiscriminant) / (2 * a);
      const t2 = (-b + sqrtDiscriminant) / (2 * a);

      // Choose the smallest positive time
      const validTimes = [t1, t2].filter((t) => t > 0.001); // Small epsilon to avoid division issues

      if (validTimes.length === 0) {
        return null;
      }

      interceptTime = Math.min(...validTimes);
    }

    // Calculate intercept position
    const interceptX = targetX + targetVx * interceptTime;
    const interceptY = targetY + targetVy * interceptTime;

    return {
      interceptX,
      interceptY,
      interceptTime,
    };
  }

  // Simple lead target calculation (fallback method)
  calculateSimpleLeadTarget(
    targetX,
    targetY,
    targetVx,
    targetVy,
    playerX,
    playerY,
    bulletSpeed
  ) {
    // Simple leading: assume player is stationary, calculate where target will be
    const distance = Math.sqrt(
      (targetX - playerX) ** 2 + (targetY - playerY) ** 2
    );

    if (distance === 0) {
      return { x: targetX, y: targetY };
    }

    // Estimate time for bullet to reach target's current position
    let timeToTarget = distance / bulletSpeed;

    // Iterative improvement for better accuracy (2 iterations usually sufficient)
    for (let i = 0; i < 3; i++) {
      const predictedX = targetX + targetVx * timeToTarget;
      const predictedY = targetY + targetVy * timeToTarget;
      const newDistance = Math.sqrt(
        (predictedX - playerX) ** 2 + (predictedY - playerY) ** 2
      );
      timeToTarget = newDistance / bulletSpeed;
    }

    return {
      x: targetX + targetVx * timeToTarget,
      y: targetY + targetVy * timeToTarget,
    };
  }

  // Calculate how likely we are to hit a target based on its movement pattern
  calculateTargetHitScore(target, bulletSpeed, distance) {
    // Get target velocity
    const targetVx =
      target.vx !== undefined ? target.vx : (target.dx || 0) / 60;
    const targetVy =
      target.vy !== undefined ? target.vy : (target.dy || 0) / 60;
    const targetSpeed = Math.sqrt(targetVx * targetVx + targetVy * targetVy);

    // Base score starts high
    let hitScore = 1.0;

    // Penalize fast-moving targets
    if (targetSpeed > 0) {
      const relativeSpeed = targetSpeed / bulletSpeed;
      hitScore *= Math.max(0.1, 1.0 - relativeSpeed * 0.5);
    }

    // Check if we can calculate a valid intercept
    const interceptSolution = this.calculateInterceptSolution(
      this.x,
      this.y,
      this.vx || 0,
      this.vy || 0,
      target.x,
      target.y,
      targetVx,
      targetVy,
      bulletSpeed
    );

    if (!interceptSolution) {
      hitScore *= 0.2; // Heavy penalty for no intercept solution
    } else {
      const { interceptTime } = interceptSolution;

      // Prefer targets that require less lead time
      if (interceptTime > 0) {
        hitScore *= Math.max(0.3, 1.0 - interceptTime / 120); // 2 seconds max lead time
      }
    }

    // Bonus for stationary or slow targets
    if (targetSpeed < 1.0) {
      hitScore *= 1.2; // 20% bonus for nearly stationary targets
    }

    // Penalty for targets moving perpendicular to our line of sight
    if (targetSpeed > 0) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const toTargetLength = Math.sqrt(dx * dx + dy * dy);

      if (toTargetLength > 0) {
        const toTargetX = dx / toTargetLength;
        const toTargetY = dy / toTargetLength;

        // Dot product of target velocity with direction to target
        const radialComponent = Math.abs(
          targetVx * toTargetX + targetVy * toTargetY
        );
        const tangentialComponent = targetSpeed - radialComponent;

        // Penalize high tangential movement (harder to hit)
        hitScore *= Math.max(
          0.4,
          1.0 - (tangentialComponent / bulletSpeed) * 0.8
        );
      }
    }

    return Math.max(0.1, Math.min(1.0, hitScore));
  }

  update(
    keys,
    enemies,
    asteroids,
    isPortrait,
    autoaimEnabled = true,
    mainWeaponLevel = 1,
    timeSlowActive = false,
    boss = null,
    autoplayEnabled = false,
    enemyBullets = [],
    enemyLasers = [],
    powerups = []
  ) {
    // Store time slow state for rendering
    this.timeSlowActive = timeSlowActive;

    // Handle shield timing
    if (this.isShielding) {
      this.shieldFrames--;
      if (this.shieldFrames <= 0) {
        this.isShielding = false;
      }
    }

    // Handle shield cooldown
    if (this.shieldCooldown > 0) {
      this.shieldCooldown--;
    }

    // Handle rainbow invulnerability timer
    if (this.rainbowInvulnerable) {
      this.rainbowInvulnerableTimer--;
      if (this.rainbowInvulnerableTimer <= 0) {
        this.rainbowInvulnerable = false;
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

    // Handle movement - autoplay overrides manual input
    if (autoplayEnabled) {
      // Create unified collidables array with consistent interface
      const collidables = this.createCollidablesArray(enemies, enemyBullets, enemyLasers, asteroids, boss);
      
      // Autoplay: automatically dodge threats and collect powerups
      const dodgeVector = this.autoplayer.calculateDodgeVector(
        collidables,
        powerups,
        timeSlowActive
      );
      this.x += dodgeVector.x * currentSpeed;
      this.y += dodgeVector.y * currentSpeed;
    } else if (keys.target) {
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

    // Autoplay strategic ability usage
    if (autoplayEnabled) {
      // Create unified collidables array with consistent interface
      const collidables = this.createCollidablesArray(enemies, enemyBullets, enemyLasers, asteroids, boss);
      
      this.autoplayer.handleAutoplayAbilities(
        collidables,
        keys,
        powerups
      );
    }

    // Handle aiming using the Autoaimer class
    this.angle = this.autoaimer.calculateAimAngle(
      enemies,
      asteroids,
      boss,
      keys,
      autoaimEnabled,
      autoplayEnabled,
      mainWeaponLevel,
      isPortrait
    );

    // Player shoots at normal speed even during time slow
    if (this.shootCooldown > 0) {
      this.shootCooldown -= 1.0; // Always normal speed
    }

    // Apply time slow effect to homing missile cooldown
    const cooldownDecrement = timeSlowActive ? 0.3 : 1.0;
    if (this.homingMissileCooldown > 0) {
      this.homingMissileCooldown -= cooldownDecrement;
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

  shoot(bullets, BulletClass, LaserClass, HomingMissileClass, isPortrait) {
    // Cannot shoot while shielding
    if (this.isShielding) {
      return null;
    }

    if (this.shootCooldown <= 0) {
      // Main weapon - use level 5 laser during rainbow invulnerability
      if (this.mainWeaponLevel >= 5 || this.rainbowInvulnerable) {
        // Rainbow laser beam
        bullets.push(new LaserClass(this.x, this.y, this.angle, 50, "rainbow"));
        this.shootCooldown = 2; // Half the firing rate to reduce damage
        return "laser"; // Return laser type for continuous sound
      } else if (this.mainWeaponLevel === 1) {
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle,
            10,
            "#00ff88",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED,
            true
          ) // Speed 8 (same as level 2)
        ); // Cool green
        this.shootCooldown = 30; // Half as often as level 2 (0.5 seconds at 60fps)
      } else if (this.mainWeaponLevel === 2) {
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle,
            10,
            "#00ff88",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED,
            true
          )
        ); // Same green as level 1, same size
        this.shootCooldown = 15; // Faster
      } else if (this.mainWeaponLevel === 3) {
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle + 0.05,
            10,
            "#00ff88",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED,
            true
          )
        ); // Green bullets with slight spread
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle - 0.05,
            10,
            "#00ff88",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED,
            true
          )
        );
        this.shootCooldown = 15; // Same as level 2
      } else if (this.mainWeaponLevel >= 4) {
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle,
            12,
            "#00ffcc",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED,
            true
          )
        ); // Teal, 3 bullets
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle + 0.05,
            12,
            "#00ffcc",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED,
            true
          )
        );
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle - 0.05,
            12,
            "#00ffcc",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED,
            true
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
            "#00ccaa",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED,
            true
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
            "#00ccaa",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED,
            true
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
            "#00ccaa",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED,
            true
          )
        );
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle - Math.PI / 6, // -30 degree
            8,
            "#00ccaa",
            isPortrait,
            GAME_CONFIG.BULLET_SPEED,
            true
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
            GAME_CONFIG.BULLET_SPEED,
            true
          )
        );
      });

      this.shootCooldown = 10;
      return "bullet"; // Return bullet type for normal sound
    }

    return null; // No shot fired
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + this.rollAngle);
    const shipOpacity = 1;

    ctx.globalAlpha = shipOpacity;

    const visualSize = this.size * 2.5; // 2.5x larger visual size

    // Draw filled arrow with different colors based on state
    let shipColor = "#00ff88"; // Default green
    if (this.timeSlowActive) {
      shipColor = "#00ff00"; // Bright green during time slow
    }
    if (this.isShielding) {
      shipColor = "#ffff00"; // Yellow when shielding
    }
    if (this.rainbowInvulnerable) {
      // Rainbow gradient when invulnerable
      const gradient = ctx.createLinearGradient(
        -visualSize,
        -visualSize,
        visualSize,
        visualSize
      );
      const time = Date.now() * 0.005;
      gradient.addColorStop(0, `hsl(${(time * 60) % 360}, 100%, 50%)`);
      gradient.addColorStop(0.25, `hsl(${(time * 60 + 90) % 360}, 100%, 50%)`);
      gradient.addColorStop(0.5, `hsl(${(time * 60 + 180) % 360}, 100%, 50%)`);
      gradient.addColorStop(0.75, `hsl(${(time * 60 + 270) % 360}, 100%, 50%)`);
      gradient.addColorStop(1, `hsl(${(time * 60 + 360) % 360}, 100%, 50%)`);
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = shipColor;
    }

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
      // Draw blue stroke around the player ship outline
      ctx.globalAlpha = 0.8 * shipOpacity;
      ctx.strokeStyle = "#0099ff"; // Bright blue
      ctx.lineWidth = 3;

      // Draw stroke around the ship shape
      ctx.beginPath();
      ctx.moveTo(visualSize, 0); // Arrow tip
      ctx.lineTo(-visualSize / 2, -visualSize / 2); // Top left
      ctx.lineTo(-visualSize / 4, 0); // Middle left
      ctx.lineTo(-visualSize / 2, visualSize / 2); // Bottom left
      ctx.closePath();
      ctx.stroke();

      // Additional shield strokes for multiple shields
      if (this.shield > 1) {
        for (let i = 1; i < this.shield; i++) {
          ctx.globalAlpha = (0.6 - i * 0.15) * shipOpacity;
          ctx.strokeStyle = "#0099ff";
          ctx.lineWidth = 3;

          // Draw larger outline for each additional shield
          const extraSize = visualSize + i * 3;
          ctx.beginPath();
          ctx.moveTo(extraSize, 0);
          ctx.lineTo(-extraSize / 2, -extraSize / 2);
          ctx.lineTo(-extraSize / 4, 0);
          ctx.lineTo(-extraSize / 2, extraSize / 2);
          ctx.closePath();
          ctx.stroke();
        }
      }
    }

    // Draw godmode golden shield
    if (this.godMode) {
      // Draw golden stroke around the player ship outline
      ctx.globalAlpha = 0.9 * shipOpacity;
      ctx.strokeStyle = "#ffcc00"; // Bright gold
      ctx.lineWidth = 4;

      // Draw stroke around the ship shape
      ctx.beginPath();
      ctx.moveTo(visualSize, 0); // Arrow tip
      ctx.lineTo(-visualSize / 2, -visualSize / 2); // Top left
      ctx.lineTo(-visualSize / 4, 0); // Middle left
      ctx.lineTo(-visualSize / 2, visualSize / 2); // Bottom left
      ctx.closePath();
      ctx.stroke();

      // Additional golden shield layers
      ctx.globalAlpha = 0.7 * shipOpacity;
      ctx.strokeStyle = "#ffdd44"; // Lighter gold
      ctx.lineWidth = 3;

      // Draw larger outline for second layer
      const extraSize = visualSize + 4;
      ctx.beginPath();
      ctx.moveTo(extraSize, 0);
      ctx.lineTo(-extraSize / 2, -extraSize / 2);
      ctx.lineTo(-extraSize / 4, 0);
      ctx.lineTo(-extraSize / 2, extraSize / 2);
      ctx.closePath();
      ctx.stroke();

      // Subtle pulsing outer layer
      const pulseIntensity = 0.7 + 0.3 * Math.sin(Date.now() * 0.005);
      ctx.globalAlpha = 0.5 * pulseIntensity * shipOpacity;
      ctx.strokeStyle = "#ffaa00"; // Deeper gold
      ctx.lineWidth = 5;

      // Draw even larger outline for third layer
      const outerSize = visualSize + 8;
      ctx.beginPath();
      ctx.moveTo(outerSize, 0);
      ctx.lineTo(-outerSize / 2, -outerSize / 2);
      ctx.lineTo(-outerSize / 4, 0);
      ctx.lineTo(-outerSize / 2, outerSize / 2);
      ctx.closePath();
      ctx.stroke();
    }

    // Draw visible hitbox (animated radial rainbow gradient)
    ctx.globalAlpha = shipOpacity;
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.hitboxSize);
    const time = Date.now() * 0.005; // Animate over time

    gradient.addColorStop(0, `hsl(${(time * 50) % 360}, 100%, 70%)`); // Center color
    gradient.addColorStop(0.3, `hsl(${(time * 50 + 60) % 360}, 100%, 60%)`);
    gradient.addColorStop(0.6, `hsl(${(time * 50 + 120) % 360}, 100%, 50%)`);
    gradient.addColorStop(1, `hsl(${(time * 50 + 180) % 360}, 100%, 40%)`); // Outer color

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.hitboxSize, 0, Math.PI * 2);
    ctx.fill();

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

  activateShield() {
    if (this.shieldCooldown <= 0 && !this.isShielding) {
      this.isShielding = true;
      this.shieldFrames = 60;
      this.shieldCooldown = this.shieldCooldownMax;
      return true;
    }
    return false;
  }

  activateRainbowInvulnerability() {
    this.rainbowInvulnerable = true;
    this.rainbowInvulnerableTimer = this.rainbowInvulnerableDuration;
  }

  // Create unified collidables array with consistent interface
  createCollidablesArray(enemies, enemyBullets, enemyLasers, asteroids, boss) {
    const collidables = [];
    
    // Add all enemies
    for (const enemy of enemies) {
      collidables.push({
        ...enemy,
        collidableType: 'enemy',
        // Ensure consistent velocity interface
        dx: enemy.dx || 0,
        dy: enemy.dy || 0
      });
    }
    
    // Add all enemy bullets
    for (const bullet of enemyBullets) {
      collidables.push({
        ...bullet,
        collidableType: 'enemyBullet',
        // Ensure consistent velocity interface
        dx: bullet.dx || 0,
        dy: bullet.dy || 0
      });
    }
    
    // Add all enemy lasers
    for (const laser of enemyLasers) {
      collidables.push({
        ...laser,
        collidableType: 'enemyLaser',
        // Ensure consistent velocity interface
        dx: laser.dx || 0,
        dy: laser.dy || 0
      });
    }
    
    // Add all asteroids
    for (const asteroid of asteroids) {
      collidables.push({
        ...asteroid,
        collidableType: 'asteroid',
        // Ensure consistent velocity interface
        dx: asteroid.dx || 0,
        dy: asteroid.dy || 0
      });
    }
    
    // Add boss if present
    if (boss && !boss.isDefeated) {
      collidables.push({
        ...boss,
        collidableType: 'boss',
        // Ensure consistent velocity interface
        dx: boss.dx || 0,
        dy: boss.dy || 0
      });
    }
    
    return collidables;
  }
}
