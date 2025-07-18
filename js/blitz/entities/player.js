// Player entity for Rainboids: Blitz
import { Autoplayer } from "../autoplayer.js";
import { Autoaimer } from "../autoaimer.js";

export class Player {
  constructor(x, y, game = null) {
    this.x = x;
    this.y = y;
    this.game = game;
    this.size = this.getPlayerSize();
    this.hitboxSize = this.getPlayerHitbox();
    this.speed = this.getPlayerSpeed();
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
      const collidables = this.createCollidables(
        enemies,
        enemyBullets,
        enemyLasers,
        asteroids,
        boss
      );

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
      const collidables = this.createCollidables(
        enemies,
        enemyBullets,
        enemyLasers,
        asteroids,
        boss
      );

      this.autoplayer.handleAutoplayAbilities(collidables, keys, powerups);
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

  shoot(bullets, missiles, BulletClass, LaserClass, HomingMissileClass, isPortrait) {
    // Cannot shoot while shielding
    if (this.isShielding) {
      return null;
    }

    if (this.shootCooldown <= 0) {
      // Main weapon - use level 5 laser during rainbow invulnerability
      if (this.mainWeaponLevel >= 5 || this.rainbowInvulnerable) {
        // Rainbow laser beam - pass player laser speed and game reference
        bullets.push(new LaserClass(this.x, this.y, this.angle, this.getPlayerLaserSpeed(), "rainbow", this.game, true));
        this.shootCooldown = this.getPlayerLevel5FireRate();
        return "laser"; // Return laser type for continuous sound
      } else if (this.mainWeaponLevel === 1) {
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle,
            this.getPlayerBulletSize(),
            "#00ff88",
            isPortrait,
            this.getBulletSpeed(),
            true,
            this.game
          ) // Speed 8 (same as level 2)
        ); // Cool green
        this.shootCooldown = this.getPlayerLevel1FireRate();
      } else if (this.mainWeaponLevel === 2) {
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle,
            this.getPlayerBulletSize(),
            "#00ff88",
            isPortrait,
            this.getBulletSpeed(),
            true,
            this.game
          )
        ); // Same green as level 1, same size
        this.shootCooldown = this.getPlayerLevel2FireRate();
      } else if (this.mainWeaponLevel === 3) {
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle + 0.05,
            this.getPlayerBulletSize(),
            "#00ff88",
            isPortrait,
            this.getBulletSpeed(),
            true
          )
        ); // Green bullets with slight spread
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle - 0.05,
            this.getPlayerBulletSize(),
            "#00ff88",
            isPortrait,
            this.getBulletSpeed(),
            true
          )
        );
        this.shootCooldown = this.getPlayerLevel3FireRate();
      } else if (this.mainWeaponLevel >= 4) {
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle,
            this.getPlayerBulletSize() * 1.5,
            "#00ffcc",
            isPortrait,
            this.getBulletSpeed(),
            true
          )
        ); // Teal, 3 bullets
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle + 0.05,
            this.getPlayerBulletSize() * 1.5,
            "#00ffcc",
            isPortrait,
            this.getBulletSpeed(),
            true
          )
        );
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle - 0.05,
            this.getPlayerBulletSize() * 1.5,
            "#00ffcc",
            isPortrait,
            this.getBulletSpeed(),
            true
          )
        );
        this.shootCooldown = this.getPlayerLevel4FireRate();
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
            this.getPlayerBulletSize() * 0.8,
            "#00ccaa",
            isPortrait,
            this.getBulletSpeed(),
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
            this.getPlayerBulletSize() * 0.8,
            "#00ccaa",
            isPortrait,
            this.getBulletSpeed(),
            true
          )
        );
      }

      if (this.sideWeaponLevel >= 2) {
        // Level 2: 2 missiles + 2 homing missiles (green, 1.5x larger)
        if (this.homingMissileCooldown <= 0) {
          missiles.push(
            new HomingMissileClass(
              this.x,
              this.y,
              this.angle + 0.2,
              this.getPlayerBulletSize() * 0.9,
              "#00ff44"
            )
          );
          missiles.push(
            new HomingMissileClass(
              this.x,
              this.y,
              this.angle - 0.2,
              this.getPlayerBulletSize() * 0.9,
              "#00ff44"
            )
          );
          this.homingMissileCooldown = this.getPlayerHomingMissileCooldown();
        }
      }

      if (this.sideWeaponLevel >= 3) {
        // Level 3: 2 missiles + 4 homing missiles total
        if (this.homingMissileCooldown <= 0) {
          // Add 2 more homing missiles (total 4)
          missiles.push(
            new HomingMissileClass(
              this.x,
              this.y,
              this.angle + 0.4,
              this.getPlayerBulletSize() * 0.9,
              "#00ff44"
            )
          );
          missiles.push(
            new HomingMissileClass(
              this.x,
              this.y,
              this.angle - 0.4,
              this.getPlayerBulletSize() * 0.9,
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
            this.getPlayerBulletSize() * 0.8,
            "#00ccaa",
            isPortrait,
            this.getBulletSpeed(),
            true
          )
        );
        bullets.push(
          new BulletClass(
            this.x,
            this.y,
            this.angle - Math.PI / 6, // -30 degree
            this.getPlayerBulletSize() * 0.8,
            "#00ccaa",
            isPortrait,
            this.getBulletSpeed(),
            true
          )
        );

        // Add 2 more homing missiles (total 6)
        if (this.homingMissileCooldown <= 0) {
          missiles.push(
            new HomingMissileClass(
              this.x,
              this.y,
              this.angle + 0.6,
              this.getPlayerBulletSize() * 0.9,
              "#00ff44"
            )
          );
          missiles.push(
            new HomingMissileClass(
              this.x,
              this.y,
              this.angle - 0.6,
              this.getPlayerBulletSize() * 0.9,
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
            this.getPlayerBulletSize() * 0.8,
            secondShipBulletColor,
            isPortrait,
            this.getBulletSpeed(),
            true
          )
        );
      });

      this.shootCooldown = this.getPlayerLevel1FireRate();
      return "bullet"; 
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
      this.shieldFrames = this.getShieldDuration();
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
  createCollidables(enemies, enemyBullets, enemyLasers, asteroids, boss) {
    const collidables = [];

    // Add all enemies
    for (const enemy of enemies) {
      collidables.push({
        ...enemy,
        collidableType: "enemy",
        // Ensure consistent velocity interface
        dx: enemy.dx || 0,
        dy: enemy.dy || 0,
      });
    }

    // Add all enemy bullets
    for (const bullet of enemyBullets) {
      collidables.push({
        ...bullet,
        collidableType: "enemyBullet",
        // Ensure consistent velocity interface
        dx: bullet.dx || 0,
        dy: bullet.dy || 0,
      });
    }

    // Add all enemy lasers
    for (const laser of enemyLasers) {
      collidables.push({
        ...laser,
        collidableType: "enemyLaser",
        // Ensure consistent velocity interface
        dx: laser.dx || 0,
        dy: laser.dy || 0,
      });
    }

    // Add all asteroids
    for (const asteroid of asteroids) {
      collidables.push({
        ...asteroid,
        collidableType: "asteroid",
        // Ensure consistent velocity interface
        dx: asteroid.dx || 0,
        dy: asteroid.dy || 0,
      });
    }

    // Add boss if present
    if (boss && !boss.isDefeated) {
      collidables.push({
        ...boss,
        collidableType: "boss",
        // Ensure consistent velocity interface
        dx: boss.dx || 0,
        dy: boss.dy || 0,
      });
    }

    return collidables;
  }

  // Helper methods to get player config values
  getPlayerSize() {
    try {
      return this.game?.level?.config?.playerSize || 10;
    } catch (e) {
      return 10;
    }
  }

  getPlayerHitbox() {
    try {
      return this.game?.level?.config?.playerHitbox || 6;
    } catch (e) {
      return 6;
    }
  }

  getPlayerSpeed() {
    try {
      return this.game?.level?.config?.playerSpeed || 6;
    } catch (e) {
      return 6;
    }
  }

  getBulletSpeed() {
    try {
      return this.game?.level?.config?.bulletSpeed || 8;
    } catch (e) {
      return 8;
    }
  }

  getPlayerBulletSize() {
    try {
      return this.game?.level?.config?.playerBulletSize || 8;
    } catch (e) {
      return 8;
    }
  }

  getPlayerLaserSize() {
    try {
      return this.game?.level?.config?.playerLaserSize || 6;
    } catch (e) {
      return 6;
    }
  }

  getPlayerLaserSpeed() {
    try {
      return this.game?.level?.config?.playerLaserSpeed || 80;
    } catch (e) {
      return 80;
    }
  }

  getPlayerLevel5FireRate() {
      return this.game?.level?.config?.playerLevel5FireRate;
  }

  getPlayerLevel1FireRate() {
      return this.game?.level?.config?.playerLevel1FireRate;
  }

  getPlayerLevel2FireRate() {
      return this.game?.level?.config?.playerLevel2FireRate;
  }

  getPlayerLevel3FireRate() {
      return this.game?.level?.config?.playerLevel3FireRate;
  }

  getPlayerLevel4FireRate() {
      return this.game?.level?.config?.playerLevel4FireRate;
  }

  getPlayerHomingMissileCooldown() {
    try {
      return this.game?.level?.config?.playerHomingMissileCooldown || 10;
    } catch (e) {
      return 10;
    }
  }

  getPlayerShieldCooldownMax() {
    try {
      return this.game?.level?.config?.playerShieldCooldownMax || 300;
    } catch (e) {
      return 300;
    }
  }

  getRainbowInvulnerableTime() {
    try {
      return this.game?.level?.config?.playerRainbowInvulnerableTime || 360;
    } catch (e) {
      return 360;
    }
  }

  getShieldDuration() {
    try {
      return this.game?.level?.config?.playerShieldDuration || 60;
    } catch (e) {
      return 60;
    }
  }
}
