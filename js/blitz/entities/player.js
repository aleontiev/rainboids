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
    this.sideWeaponCooldown = 0; // Separate cooldown for side weapons
    this.secondShipCooldown = 0; // Separate cooldown for second ship
    this.homingMissileCooldown = 0; // Cooldown for homing missiles based on level config
    this.isShielding = false;
    this.shieldFrames = 0;
    this.shield = 0;
    this.shieldCooldown = 0;
    this.shieldCooldownMax = 100;
    this.mainWeaponLevel = 1;
    this.sideWeaponLevel = 0;
    this.secondShip = []; // Change to an array
    this.godMode = false;
    this.rollAngle = 0; // Initialize rollAngle property

    // Rainbow invulnerability powerup
    this.rainbowInvulnerable = false;
    this.rainbowInvulnerableTimer = 0;

    // Velocity tracking for predictive aiming
    this.vx = 0;
    this.vy = 0;
    this.prevX = x;
    this.prevY = y;

    // Color animation
    this.colorTimer = 0;
    this.colorCycleSpeed = 0.003; // How fast to cycle through colors

    // Initialize autoplayer and autoaimer
    this.autoplayer = new Autoplayer(this);
    this.autoaimer = new Autoaimer(this);
  }

  // Create color gradient that cycles through purple->blue->teal->blue->purple
  createColorGradient(ctx, visualSize) {
    const gradient = ctx.createLinearGradient(-visualSize, -visualSize, visualSize, visualSize);
    
    // Create a smooth progression through cool colors only
    // Purple: 270°, Blue: 240°, Teal: 180°
    // Animation cycle: 0.0 -> 1.0 -> 0.0 (purple->teal->purple)
    const cycle = Math.sin(this.colorTimer * 2) * 0.5 + 0.5; // Oscillates between 0 and 1
    
    // Map cycle to hue range: Purple (270°) to Teal (180°) and back
    const hueRange = 90; // 270° to 180° = 90° range
    const baseHue = 270; // Start at purple
    const currentHue = baseHue - (cycle * hueRange); // 270° -> 180° -> 270°
    
    // Create gradient with complementary cool colors
    const hue1 = currentHue;
    const hue2 = currentHue - 30; // Slightly shifted for depth
    const hue3 = currentHue + 30; // Slightly shifted for variety
    
    gradient.addColorStop(0, `hsl(${hue1}, 80%, 55%)`);
    gradient.addColorStop(0.5, `hsl(${hue2}, 85%, 50%)`);
    gradient.addColorStop(1, `hsl(${hue3}, 80%, 55%)`);
    
    return gradient;
  }

  update(
    keys,
    enemies,
    miniBosses,
    boss,
    asteroids,
    isPortrait,
    autoaimEnabled = true,
    mainWeaponLevel = 1,
    timeSlowActive = false,
    autoplayEnabled = false,
    enemyBullets = [],
    enemyLasers = [],
    powerups = []
  ) {
    // Store time slow state for rendering
    this.timeSlowActive = timeSlowActive;

    // Handle shield timing - apply time slow effect
    if (this.isShielding) {
      const shieldDecrement = timeSlowActive ? 0.3 : 1.0;
      this.shieldFrames -= shieldDecrement;
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

    // Get current speed (decreased during shield, time slow, or manual slow)
    let currentSpeed = this.speed;
    if (this.isShielding) {
      currentSpeed *= 0.5; // 50% speed during shield
    }
    if (timeSlowActive) {
      currentSpeed *= 0.5; // 50% speed during time slow
    }
    // Manual slow movement when holding shift but shield is not available
    if (keys.shift && !this.isShielding && this.shield <= 0) {
      currentSpeed *= 0.5; // 50% speed when holding shift without shield
    }

    // Handle movement - autoplay overrides manual input
    if (autoplayEnabled) {
      // Autoplay: automatically dodge threats and collect powerups
      const dodgeVector = this.autoplayer.calculateDodgeVector(
        enemies,
        miniBosses,
        boss,
        enemyBullets,
        enemyLasers,
        asteroids,
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

    // Handle screen boundary bouncing
    const margin = 20;
    const bounceMultiplier = 0.7; // Reduce bounce velocity by 30%
    
    if (this.x < margin) {
      this.x = margin;
      this.vx = Math.abs(this.vx) * bounceMultiplier; // Bounce right
    } else if (this.x > window.innerWidth - margin) {
      this.x = window.innerWidth - margin;
      this.vx = -Math.abs(this.vx) * bounceMultiplier; // Bounce left
    }
    
    if (this.y < margin) {
      this.y = margin;
      this.vy = Math.abs(this.vy) * bounceMultiplier; // Bounce down
    } else if (this.y > window.innerHeight - margin) {
      this.y = window.innerHeight - margin;
      this.vy = -Math.abs(this.vy) * bounceMultiplier; // Bounce up
    }

    // Update velocity tracking for predictive aiming
    this.vx = this.x - this.prevX;
    this.vy = this.y - this.prevY;
    this.prevX = this.x;
    this.prevY = this.y;

    // Update color animation timer
    this.colorTimer += this.colorCycleSpeed;

    // Autoplay strategic ability usage
    if (autoplayEnabled) {
      this.autoplayer.handleAutoplayAbilities(
        enemies,
        miniBosses,
        boss,
        enemyBullets,
        enemyLasers,
        asteroids,
        keys,
        powerups
      );
    }

    // Handle aiming using the Autoaimer class
    const aimResult = this.autoaimer.calculateAimAngle(
      enemies,
      miniBosses,
      boss,
      asteroids,
      keys,
      autoaimEnabled,
      autoplayEnabled,
      mainWeaponLevel,
      isPortrait
    );
    
    this.angle = aimResult.angle;
    this.shouldAutoFire = aimResult.shouldFire;

    // Player shoots at normal speed even during time slow
    if (this.shootCooldown > 0) {
      this.shootCooldown -= 1.0; // Always normal speed
    }

    // Apply time slow effect to homing missile cooldown
    const cooldownDecrement = timeSlowActive ? 0.3 : 1.0;
    if (this.homingMissileCooldown > 0) {
      this.homingMissileCooldown -= cooldownDecrement;
    }

    // Update secondary weapon cooldowns at normal speed (not affected by time slow)
    if (this.sideWeaponCooldown > 0) {
      this.sideWeaponCooldown -= 1.0;
    }
    if (this.secondShipCooldown > 0) {
      this.secondShipCooldown -= 1.0;
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
      // Get weapon configuration for current level (or level 5 during rainbow)
      const effectiveLevel = this.rainbowInvulnerable ? 5 : this.mainWeaponLevel;
      const weaponConfig = this.game?.level?.getPlayerWeaponConfig(effectiveLevel);
      
      if (!weaponConfig) {
        console.error("No weapon config found for level", effectiveLevel);
        return null;
      }

      // Fire all projectiles defined in the weapon config
      let weaponType = "bullet"; // Default weapon type
      
      for (const projectileConfig of weaponConfig.projectiles) {
        for (let i = 0; i < projectileConfig.count; i++) {
          // Calculate angle for this projectile
          let angle = this.angle;
          if (projectileConfig.count > 1 && projectileConfig.angleOffset > 0) {
            // Spread projectiles evenly across the angle range
            const spreadRange = projectileConfig.angleOffset * 2;
            const angleStep = spreadRange / (projectileConfig.count - 1);
            angle += -projectileConfig.angleOffset + (i * angleStep);
          }
          
          // Calculate position for this projectile
          const posX = this.x + (projectileConfig.positionOffset?.x || 0);
          const posY = this.y + (projectileConfig.positionOffset?.y || 0);
          
          // Create the projectile based on type
          if (projectileConfig.type === "laser") {
            bullets.push(new LaserClass(
              posX,
              posY,
              angle,
              projectileConfig.speed,
              projectileConfig.color,
              this.game,
              true, // isPlayerLaser
              projectileConfig.damage
            ));
            weaponType = "laser";
          } else {
            bullets.push(new BulletClass(
              posX,
              posY,
              angle,
              projectileConfig.size,
              projectileConfig.color,
              isPortrait,
              projectileConfig.speed,
              true, // isPlayerBullet
              this.game,
              projectileConfig.damage
            ));
            weaponType = "bullet";
          }
        }
      }

      // Set cooldown from weapon config
      this.shootCooldown = weaponConfig.fireRate;
      
      // Handle secondary weapons (pass weapon type to control firing)
      this.handleSecondaryWeapons(bullets, missiles, BulletClass, HomingMissileClass, isPortrait, weaponType);
      
      return weaponType;
    }

    return null; // No shot fired
  }


  // Handle secondary weapons (side weapons, second ship)
  handleSecondaryWeapons(bullets, missiles, BulletClass, HomingMissileClass, isPortrait, primaryWeaponType = "bullet") {
    // Get secondary weapon configuration for current level
    const secondaryConfig = this.game?.level?.getPlayerSecondaryWeaponConfig(this.sideWeaponLevel);
    
    if (!secondaryConfig || this.sideWeaponLevel === 0) {
      return; // No secondary weapons at level 0 or if config missing
    }

    // Fire secondary projectiles if cooldown is ready
    if (this.sideWeaponCooldown <= 0) {
      // Fire all projectiles defined in the secondary weapon config
      for (const projectileConfig of secondaryConfig.projectiles) {
        for (let i = 0; i < projectileConfig.count; i++) {
          // Calculate angle for this projectile
          let angle = this.angle + projectileConfig.angleOffset;
          
          // Calculate position for this projectile
          const posX = this.x + (projectileConfig.positionOffset?.x || 0);
          const posY = this.y + (projectileConfig.positionOffset?.y || 0);
          
          // Create the projectile
          bullets.push(new BulletClass(
            posX,
            posY,
            angle,
            projectileConfig.size,
            projectileConfig.color,
            isPortrait,
            projectileConfig.speed,
            true, // isPlayerBullet
            this.game,
            projectileConfig.damage
          ));
        }
      }
      
      // Set secondary weapon cooldown
      this.sideWeaponCooldown = secondaryConfig.fireRate;
    }

    // Handle homing missiles if enabled in config
    if (secondaryConfig.homingMissiles?.enabled && this.homingMissileCooldown <= 0) {
      const missileConfig = secondaryConfig.homingMissiles;
      
      for (let i = 0; i < missileConfig.count; i++) {
        // Calculate angle spread for this missile
        const spreadStep = i < 2 ? missileConfig.angleSpread * (i === 0 ? 1 : -1) :
                          missileConfig.angleSpread * (i % 2 === 0 ? 1 : -1) * (Math.floor(i / 2) + 1);
        
        missiles.push(
          new HomingMissileClass(
            this.x,
            this.y,
            this.angle + spreadStep,
            missileConfig.size,
            missileConfig.color,
            true // isPlayerMissile = true
          )
        );
      }
      
      this.homingMissileCooldown = missileConfig.fireRate;
    }

    // Second ship shooting - only if primary weapon is not laser and cooldown is ready
    const secondShipFireRate = 20; // 0.33 seconds - faster than side weapons
    if (primaryWeaponType !== "laser" && this.secondShipCooldown <= 0 && this.secondShip.length > 0) {
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
            true,
            this.game,
            1
          )
        );
      });
      
      // Set second ship cooldown
      this.secondShipCooldown = secondShipFireRate;
    }
  }

  // Legacy render method for backward compatibility
  render(ctx) {
    // If ctx looks like a Canvas 2D context, use Canvas rendering
    if (ctx && ctx.fillStyle !== undefined) {
      return this.renderCanvas(ctx);
    } else if (ctx && ctx.scene !== undefined) {
      // If ctx has scene (WebGL context object), use WebGL rendering
      return this.renderWebGL(ctx.scene, ctx.materials);
    } else {
      // Fallback to Canvas with basic context
      return this.renderCanvas(ctx);
    }
  }

  renderCanvas(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + this.rollAngle);
    const visualSize = this.size * 2.5; // 2.5x larger visual size

    // Define ship shape path (used for both fill and stroke)
    const drawShipPath = () => {
      ctx.beginPath();
      ctx.moveTo(visualSize, 0); // Arrow tip
      ctx.lineTo(-visualSize / 2, -visualSize / 2); // Top left
      ctx.lineTo(-visualSize / 4, 0); // Middle left
      ctx.lineTo(-visualSize / 2, visualSize / 2); // Bottom left
      ctx.closePath();
    };

    if (this.isShielding) {
      // SHIELDING MODE: Only render thick gold stroke outline - nothing else
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#ffd700"; // Gold stroke
      ctx.lineWidth = 5; // Thick stroke

      drawShipPath();
      ctx.stroke();
      
    } else {
      // NORMAL MODE: Render full ship with all effects
      
      // Draw filled ship body
      ctx.globalAlpha = 1;
      
      // Draw filled arrow with different colors based on state
      if (this.rainbowInvulnerable) {
        // Fast rainbow gradient when invulnerable
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
      } else if (this.timeSlowActive) {
        ctx.fillStyle = "#00ff00"; // Bright green during time slow
      } else {
        // Default: slowly cycling color gradient
        ctx.fillStyle = this.createColorGradient(ctx, visualSize);
      }

      drawShipPath();
      ctx.fill();

      // Draw shield if active (passive shield powerup)
      if (this.shield > 0) {
        // Draw blue stroke around the player ship outline
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = "#0099ff"; // Bright blue
        ctx.lineWidth = 3;

        drawShipPath();
        ctx.stroke();

        // Additional shield strokes for multiple shields
        if (this.shield > 1) {
          for (let i = 1; i < this.shield; i++) {
            ctx.globalAlpha = 0.6 - i * 0.15;
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
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = "#ffcc00"; // Bright gold
        ctx.lineWidth = 4;

        drawShipPath();
        ctx.stroke();

        // Additional golden shield layers
        ctx.globalAlpha = 0.7;
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
        ctx.globalAlpha = 0.5 * pulseIntensity;
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

      // Draw simple teal-green glow (only when not shielding)
      ctx.globalAlpha = 0.6;
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.hitboxSize);

      gradient.addColorStop(0, "#66ffcc"); // Center - bright teal-green
      gradient.addColorStop(0.4, "#44ccaa"); // Mid - darker teal
      gradient.addColorStop(0.8, "#22aa88"); // Outer - darker green
      gradient.addColorStop(1, "transparent"); // Fade to transparent

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, this.hitboxSize, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Draw second ships if active (only when not shielding)
    if (!this.isShielding) {
      this.secondShip.forEach((ship) => {
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.initialAngle); // Use initialAngle for rendering

        ctx.globalAlpha = 0.7;
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

  renderWebGL(scene, materials) {
    // Check if we already have a mesh for this player
    let playerMesh = scene.getObjectByName('player');
    
    if (!playerMesh) {
      // Create player mesh if it doesn't exist
      const geometry = new THREE.ConeGeometry(this.size * 2.5, this.size * 3.5, 3);
      let material;
      
      if (this.rainbowInvulnerable) {
        // Rainbow material for invulnerability
        material = new THREE.MeshLambertMaterial({ 
          color: 0xffffff,
          transparent: true,
          emissive: 0x333333
        });
      } else if (this.timeSlowActive) {
        // Green material for time slow
        material = new THREE.MeshLambertMaterial({ 
          color: 0x00ff00,
          transparent: true,
          emissive: 0x003300
        });
      } else {
        // Default player material
        material = materials.get('player') || new THREE.MeshLambertMaterial({ 
          color: 0x00ff88,
          transparent: true,
          emissive: 0x002200
        });
      }
      
      playerMesh = new THREE.Mesh(geometry, material);
      playerMesh.name = 'player';
      playerMesh.userData = { isDynamic: true, entityType: 'player' };
      scene.add(playerMesh);
    }
    
    // Update position and rotation
    playerMesh.position.set(this.x, -this.y, 0); // Flip Y for screen coordinates
    playerMesh.rotation.z = -(this.angle + this.rollAngle); // Flip rotation for screen coordinates
    
    // Update material properties based on current state
    if (this.isShielding) {
      // Gold shield effect
      playerMesh.material.color.setHex(0xffd700);
      playerMesh.material.emissive.setHex(0x333300);
    } else if (this.rainbowInvulnerable) {
      // Animate rainbow effect
      const time = Date.now() * 0.005;
      const hue = (time * 60) % 360;
      playerMesh.material.color.setHSL(hue / 360, 1, 0.5);
    } else {
      // Default colors
      playerMesh.material.color.setHex(0x00ff88);
      playerMesh.material.emissive.setHex(0x002200);
    }
    
    // Handle shield visualization
    let shieldMesh = scene.getObjectByName('playerShield');
    if (this.shield > 0 && !this.isShielding) {
      if (!shieldMesh) {
        const shieldGeometry = new THREE.SphereGeometry(this.size * 4, 16, 12);
        const shieldMaterial = new THREE.MeshLambertMaterial({
          color: 0x00aaff,
          transparent: true,
          opacity: 0.3,
          emissive: 0x001133
        });
        shieldMesh = new THREE.Mesh(shieldGeometry, shieldMaterial);
        shieldMesh.name = 'playerShield';
        shieldMesh.userData = { isDynamic: true, entityType: 'playerShield' };
        scene.add(shieldMesh);
      }
      
      shieldMesh.position.copy(playerMesh.position);
      shieldMesh.visible = true;
    } else if (shieldMesh) {
      shieldMesh.visible = false;
    }
    
    // Handle second ships in 3D
    this.secondShip.forEach((ship, index) => {
      const shipName = `secondShip${index}`;
      let secondShipMesh = scene.getObjectByName(shipName);
      
      if (!secondShipMesh) {
        const geometry = new THREE.ConeGeometry(this.size * 1.5, this.size * 2.5, 3);
        const material = new THREE.MeshLambertMaterial({ 
          color: 0x00ff88,
          transparent: true,
          opacity: 0.8
        });
        secondShipMesh = new THREE.Mesh(geometry, material);
        secondShipMesh.name = shipName;
        secondShipMesh.userData = { isDynamic: true, entityType: 'secondShip' };
        scene.add(secondShipMesh);
      }
      
      secondShipMesh.position.set(ship.x, -ship.y, -0.5);
      secondShipMesh.rotation.z = -ship.initialAngle;
      secondShipMesh.visible = !this.isShielding;
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
    this.rainbowInvulnerableTimer = this.getRainbowInvulnerableTime();
  }


  // Helper methods to get player config values
  getPlayerSize() {
    try {
      return this.game?.level?.config?.player?.size || 10;
    } catch (e) {
      return 10;
    }
  }

  getPlayerHitbox() {
    try {
      return this.game?.level?.config?.player?.hitbox || 6;
    } catch (e) {
      return 6;
    }
  }

  getPlayerSpeed() {
    try {
      return this.game?.level?.config?.player?.speed || 6;
    } catch (e) {
      return 6;
    }
  }

  getBulletSpeed(level = null) {
    try {
      const weaponLevel = level || this.mainWeaponLevel;
      return this.game?.level?.getPlayerBulletSpeed(weaponLevel) || 8;
    } catch (e) {
      return 8;
    }
  }

  getPlayerBulletSize() {
    try {
      const baseSize = this.game?.level?.config?.player?.bulletSize || 15;
      return baseSize; // Already 1.25x in config
    } catch (e) {
      return 15;
    }
  }

  getPlayerLaserSpeed() {
    try {
      return this.game?.level?.config?.player?.laserSpeed || 50;
    } catch (e) {
      return 50;
    }
  }

  // Fire rate getters now use the new level configuration system
  getPlayerFireRate(level = null) {
    const weaponLevel = level || this.mainWeaponLevel;
    return this.game?.level?.getPlayerFireRate(weaponLevel) || 15;
  }

  // Deprecated methods - keeping for backward compatibility
  getPlayerLevel1FireRate() { return this.getPlayerFireRate(1); }
  getPlayerLevel2FireRate() { return this.getPlayerFireRate(2); }
  getPlayerLevel3FireRate() { return this.getPlayerFireRate(3); }
  getPlayerLevel4FireRate() { return this.getPlayerFireRate(4); }
  getPlayerLevel5FireRate() { return this.getPlayerFireRate(5); }


  getPlayerShieldCooldownMax() {
    try {
      return this.game?.level?.config?.player?.shieldCooldownMax || 300;
    } catch (e) {
      return 300;
    }
  }

  getRainbowInvulnerableTime() {
    try {
      return this.game?.level?.config?.world?.powerupConfigs?.rainbowStar?.duration || 360;
    } catch (e) {
      return 360;
    }
  }

  getShieldDuration() {
    try {
      return this.game?.level?.config?.player?.shieldDuration || 60;
    } catch (e) {
      return 60;
    }
  }
}
