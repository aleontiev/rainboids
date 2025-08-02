// Player entity for BlitzRain
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
    
    // Shape configuration
    this.shape = this.getPlayerShape();
    this.svgPath = null;
    this.svgImage = null;
    this.svgBounds = null;
    
    // Cached Path2D objects for performance
    this.cachedMainShipPath = null;
    this.cachedMainShipSize = 0;
    this.cachedCompanionShipPath = null;
    this.cachedCompanionShipSize = 0;
    
    // Load SVG if shape is a URL
    if (this.shape && (this.shape.startsWith('http') || this.shape.endsWith('.svg'))) {
      this.loadSVGShape();
    }
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

    // Powerup pickup pulsing effect
    this.powerupPulseActive = false;
    this.powerupPulseTimer = 0;
    this.powerupPulseMaxDuration = 60; // 1 second at 60fps

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

    // Handle powerup pulse effect timer
    if (this.powerupPulseActive) {
      this.powerupPulseTimer++;
      if (this.powerupPulseTimer >= this.powerupPulseMaxDuration) {
        this.powerupPulseActive = false;
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
    // Manual slow movement when holding shift (regardless of shield state)
    if (keys.shift) {
      currentSpeed *= 0.5; // 50% speed when holding shift
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

    // Apply collision velocity from bumper cars effect (stored from previous frame)
    this.x += this.collisionVx || 0;
    this.y += this.collisionVy || 0;
    
    // Apply drag to collision velocity
    this.collisionVx = (this.collisionVx || 0) * 0.85;
    this.collisionVy = (this.collisionVy || 0) * 0.85;
    
    // Clear very small velocities to prevent infinite drift
    if (Math.abs(this.collisionVx) < 0.1) this.collisionVx = 0;
    if (Math.abs(this.collisionVy) < 0.1) this.collisionVy = 0;

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
      if (ship.currentOrbitAngle !== undefined) {
        // New orbital system - ships orbit around the player
        ship.currentOrbitAngle += ship.orbitSpeed || 0.02;
        ship.x = this.x + Math.cos(ship.currentOrbitAngle) * ship.radius;
        ship.y = this.y + Math.sin(ship.currentOrbitAngle) * ship.radius;
        ship.initialAngle = this.angle; // Make companion ship face same direction as player
      } else {
        // Legacy positioning system for backwards compatibility
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
      }
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
    
    // Base visual size with powerup pulsing effect
    let visualSize = this.size * 2.5; // 2.5x larger visual size
    if (this.powerupPulseActive) {
      // Create pulsing effect - stronger at start, fading out
      const progress = this.powerupPulseTimer / this.powerupPulseMaxDuration;
      const pulseIntensity = (1 - progress) * 0.3; // Start at 30% extra size, fade to 0
      const pulseWave = Math.sin(this.powerupPulseTimer * 0.5) * pulseIntensity;
      visualSize *= (1 + pulseWave);
    }

    // Get cached ship path for performance
    const shipPath = this.getCachedMainShipPath(visualSize);

    if (this.isShielding) {
      // SHIELDING MODE: Only render thick stroke outline - nothing else
      ctx.globalAlpha = 1;
      ctx.strokeStyle = this.timeSlowActive ? "#00ff00" : "#ffd700"; // Green during time slow, gold otherwise
      ctx.lineWidth = 5; // Thick stroke

      this.renderShipShape(ctx, shipPath, visualSize, false, true);
      
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
      } else {
        // Default: slowly cycling color gradient
        ctx.fillStyle = this.createColorGradient(ctx, visualSize);
      }

      this.renderShipShape(ctx, shipPath, visualSize, true, false);

      // Add green stroke outline during time slow
      if (this.timeSlowActive) {
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = "#00ff00"; // Bright green stroke
        ctx.lineWidth = 3; // Medium stroke width
        this.renderShipShape(ctx, shipPath, visualSize, false, true);
      }

      // Draw shield if active (passive shield powerup)
      if (this.shield > 0) {
        // Draw blue stroke around the player ship outline
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = "#0099ff"; // Bright blue
        ctx.lineWidth = 3;

        this.renderShipShape(ctx, shipPath, visualSize, false, true);

        // Additional shield strokes for multiple shields
        if (this.shield > 1) {
          for (let i = 1; i < this.shield; i++) {
            ctx.globalAlpha = 0.6 - i * 0.15;
            ctx.strokeStyle = "#0099ff";
            ctx.lineWidth = 3;

            // Draw larger outline for each additional shield using ship shape
            const extraSize = visualSize + i * 3;
            const extraShipPath = this.getCachedMainShipPath(extraSize);
            this.renderShipShape(ctx, extraShipPath, extraSize, false, true);
          }
        }
      }

      // Draw godmode golden shield
      if (this.godMode) {
        // Draw golden stroke around the player ship outline
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = "#ffcc00"; // Bright gold
        ctx.lineWidth = 4;

        this.renderShipShape(ctx, shipPath, visualSize, false, true);

        // Additional golden shield layers
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = "#ffdd44"; // Lighter gold
        ctx.lineWidth = 3;

        // Draw larger outline for second layer using ship shape
        const extraSize = visualSize + 4;
        const extraShipPath = this.getCachedMainShipPath(extraSize);
        this.renderShipShape(ctx, extraShipPath, extraSize, false, true);

        // Subtle pulsing outer layer
        const pulseIntensity = 0.7 + 0.3 * Math.sin(Date.now() * 0.005);
        ctx.globalAlpha = 0.5 * pulseIntensity;
        ctx.strokeStyle = "#ffaa00"; // Deeper gold
        ctx.lineWidth = 5;

        // Draw even larger outline for third layer using ship shape
        const outerSize = visualSize + 8;
        const outerShipPath = this.getCachedMainShipPath(outerSize);
        this.renderShipShape(ctx, outerShipPath, outerSize, false, true);
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

        ctx.globalAlpha = 0.8;
        
        // Make companion ships filled style and wider to match player
        const secondShipVisualSize = this.size * 2.5; // Same full size as main ship
        
        // Get cached companion ship path for performance
        const companionShipPath = this.getCachedCompanionShipPath(secondShipVisualSize);
        
        // Fill the ship first
        ctx.fillStyle = "#6644cc"; // Slightly darker purple fill
        this.renderShipShape(ctx, companionShipPath, secondShipVisualSize, true, false);
        
        // Add a subtle stroke for definition
        ctx.strokeStyle = "#8844ff"; // Lighter purple stroke
        ctx.lineWidth = 1.5;
        this.renderShipShape(ctx, companionShipPath, secondShipVisualSize, false, true);

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

  getPlayerShape() {
    try {
      return this.game?.level?.config?.player?.shape || "arrow";
    } catch (e) {
      return "arrow";
    }
  }

  async loadSVGShape() {
    if (this.game?.entities?.svgAssetManager) {
      try {
        const svgContent = await this.game.entities.svgAssetManager.loadSVG(this.shape);
        if (svgContent) {
          // Create an Image object from SVG data URL for scaling calculations
          // Don't apply color override - keep original SVG colors
          const svgDataURL = await this.game.entities.svgAssetManager.getSVGDataURL(this.shape, null);
          if (svgDataURL) {
            this.svgImage = new Image();
            this.svgImage.src = svgDataURL;
            await new Promise((resolve) => {
              this.svgImage.onload = resolve;
              this.svgImage.onerror = resolve; // Don't fail on image load errors
            });
          }
          
          // Convert SVG to Path2D for collision detection
          this.svgPath = this.game.entities.svgToPath2D(svgContent);
          
          // Parse SVG viewBox for proper path scaling
          this.svgViewBox = this.parseSVGViewBox(svgContent);
          
          // Calculate the geometric center of the SVG paths
          this.svgShapeCenter = this.calculateSVGShapeCenter(svgContent);
        }
      } catch (error) {
        console.warn(`Failed to load SVG for player ship:`, error);
        // Fallback to default arrow shape
        this.shape = "arrow";
      }
    }
  }

  // Calculate the geometric center of SVG paths/shapes
  calculateSVGShapeCenter(svgContent) {
    try {
      // Parse the SVG content to find path elements and their bounding boxes
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
      const svgElement = svgDoc.querySelector('svg');
      
      if (!svgElement) {
        return { x: 0, y: 0 }; // Fallback to center
      }
      
      // Get all path and shape elements
      const shapeElements = svgElement.querySelectorAll('path, rect, circle, ellipse, polygon, polyline, g');
      
      if (shapeElements.length === 0) {
        return { x: 0, y: 0 }; // Fallback to center
      }
      
      // Create a temporary canvas to measure the bounding box of the shapes
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let hasValidBounds = false;
      
      // Calculate weighted center based on area of each element (visual center, not geometric center)
      let totalArea = 0;
      let weightedX = 0;
      let weightedY = 0;
      
      shapeElements.forEach(element => {
        const tagName = element.tagName.toLowerCase();
        let elementBounds = null;
        
        try {
          if (tagName === 'path') {
            const d = element.getAttribute('d');
            if (d) {
              elementBounds = this.updateBoundsFromPath(d);
            }
          } else if (tagName === 'rect') {
            const x = parseFloat(element.getAttribute('x') || 0);
            const y = parseFloat(element.getAttribute('y') || 0);
            const width = parseFloat(element.getAttribute('width') || 0);
            const height = parseFloat(element.getAttribute('height') || 0);
            
            elementBounds = { minX: x, minY: y, maxX: x + width, maxY: y + height };
          } else if (tagName === 'circle') {
            const cx = parseFloat(element.getAttribute('cx') || 0);
            const cy = parseFloat(element.getAttribute('cy') || 0);
            const r = parseFloat(element.getAttribute('r') || 0);
            
            elementBounds = { minX: cx - r, minY: cy - r, maxX: cx + r, maxY: cy + r };
          }
          
          // Calculate area-weighted center for this element
          if (elementBounds && elementBounds.minX < Infinity) {
            const width = elementBounds.maxX - elementBounds.minX;
            const height = elementBounds.maxY - elementBounds.minY;
            const area = width * height;
            
            if (area > 0) {
              const centerX = elementBounds.minX + width / 2;
              const centerY = elementBounds.minY + height / 2;
              
              totalArea += area;
              weightedX += centerX * area;
              weightedY += centerY * area;
              hasValidBounds = true;
              
              // Also update overall bounds for fallback
              minX = Math.min(minX, elementBounds.minX);
              minY = Math.min(minY, elementBounds.minY);
              maxX = Math.max(maxX, elementBounds.maxX);
              maxY = Math.max(maxY, elementBounds.maxY);
            }
          }
        } catch (e) {
          // Skip invalid elements
        }
      });
      
      if (hasValidBounds && totalArea > 0) {
        // Return the area-weighted center (visual center)
        return {
          x: weightedX / totalArea,
          y: weightedY / totalArea
        };
      } else if (hasValidBounds && minX < maxX && minY < maxY) {
        // Fallback to geometric center if area calculation fails
        return {
          x: (minX + maxX) / 2,
          y: (minY + maxY) / 2
        };
      }
      
      // Fallback: try to get viewBox center
      const viewBox = svgElement.getAttribute('viewBox');
      if (viewBox) {
        const [vx, vy, vw, vh] = viewBox.split(' ').map(Number);
        return {
          x: vx + vw / 2,
          y: vy + vh / 2
        };
      }
      
      // Final fallback
      return { x: 0, y: 0 };
      
    } catch (error) {
      console.warn('Failed to calculate SVG shape center:', error);
      return { x: 0, y: 0 };
    }
  }

  // Helper method to extract bounds from SVG path data (simplified)
  updateBoundsFromPath(pathData) {
    // Simple approach: extract coordinate pairs from path data
    const coords = pathData.match(/[-+]?[0-9]*\.?[0-9]+/g);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    if (coords) {
      for (let i = 0; i < coords.length; i += 2) {
        if (i + 1 < coords.length) {
          const x = parseFloat(coords[i]);
          const y = parseFloat(coords[i + 1]);
          if (!isNaN(x) && !isNaN(y)) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }
    }
    return { minX, minY, maxX, maxY };
  }

  // Get collision boundary for the player (using the rainbow circle hitbox)
  getCollisionBoundary() {
    return {
      type: 'circle',
      x: this.x,
      y: this.y,
      radius: this.hitboxSize
    };
  }

  getCachedMainShipPath(visualSize) {
    // Only recreate if size changed significantly (more than 5% difference) or path doesn't exist
    if (!this.cachedMainShipPath || Math.abs(visualSize - this.cachedMainShipSize) > visualSize * 0.05) {
      if (this.svgPath) {
        // For SVG shapes, use the existing SVG path
        this.cachedMainShipPath = this.svgPath;
      } else {
        // For built-in shapes, create cached Path2D
        const path = new Path2D();
        
        switch (this.shape) {
          case "triangle":
            path.moveTo(0, -visualSize);
            path.lineTo(-visualSize / 2, visualSize / 2);
            path.lineTo(visualSize / 2, visualSize / 2);
            path.closePath();
            break;
            
          case "circle":
            path.arc(0, 0, visualSize / 2, 0, Math.PI * 2);
            break;
            
          case "arrow":
          default:
            path.moveTo(visualSize, 0); // Arrow tip
            path.lineTo(-visualSize / 2, -visualSize / 2); // Top left
            path.lineTo(-visualSize / 4, 0); // Middle left
            path.lineTo(-visualSize / 2, visualSize / 2); // Bottom left
            path.closePath();
            break;
        }
        this.cachedMainShipPath = path;
      }
      this.cachedMainShipSize = visualSize;
    }
    return this.cachedMainShipPath;
  }

  getCachedCompanionShipPath(visualSize) {
    // Only recreate if size changed significantly (more than 5% difference) or path doesn't exist
    if (!this.cachedCompanionShipPath || Math.abs(visualSize - this.cachedCompanionShipSize) > visualSize * 0.05) {
      if (this.svgPath) {
        // For SVG shapes, use the existing SVG path
        this.cachedCompanionShipPath = this.svgPath;
      } else {
        // For built-in shapes, create cached Path2D
        const path = new Path2D();
        
        switch (this.shape) {
          case "triangle":
            path.moveTo(0, -visualSize);
            path.lineTo(-visualSize / 2, visualSize / 2);
            path.lineTo(visualSize / 2, visualSize / 2);
            path.closePath();
            break;
            
          case "circle":
            path.arc(0, 0, visualSize / 2, 0, Math.PI * 2);
            break;
            
          case "arrow":
          default:
            path.moveTo(visualSize, 0);
            path.lineTo(-visualSize / 2, -visualSize / 2);
            path.lineTo(-visualSize / 4, 0);
            path.lineTo(-visualSize / 2, visualSize / 2);
            path.closePath();
            break;
        }
        this.cachedCompanionShipPath = path;
      }
      this.cachedCompanionShipSize = visualSize;
    }
    return this.cachedCompanionShipPath;
  }

  renderShipShape(ctx, shipPath, visualSize, fill = true, stroke = false) {
    if (this.svgPath && this.svgImage) {
      // For SVG shapes, render as image to preserve original colors
      // Context is already translated to player position and rotated to player angle
      // We just need to draw the SVG centered at (0,0) with the right size
      
      if (fill) {
        // Calculate scale to match visualSize and make it 3x larger for better visibility
        const scale = (visualSize / Math.max(this.svgImage.width, this.svgImage.height)) * 3;
        
        // Rotate -90 degrees to fix orientation (ship facing right -> facing up)
        ctx.save();
        ctx.rotate(-Math.PI / 2);
        
        // Draw the SVG image centered at (0,0)
        const drawWidth = this.svgImage.width * scale;
        const drawHeight = this.svgImage.height * scale;
        
        ctx.drawImage(
          this.svgImage,
          -drawWidth / 2,   // Center horizontally
          -drawHeight / 2,  // Center vertically  
          drawWidth,
          drawHeight
        );
        
        ctx.restore();
      }
      
      if (stroke) {
        // Draw a simple ring effect around the player
        ctx.save();
        
        // Calculate ring size based on visual size
        const ringRadius = visualSize * 1.5; // Ring extends beyond ship
        const ringWidth = 8; // Ring thickness
        
        // Set ring properties
        ctx.strokeStyle = ctx.strokeStyle; // Use the shield color
        ctx.lineWidth = ringWidth;
        ctx.globalAlpha = 0.7; // Semi-transparent
        ctx.lineCap = 'round';
        
        // Draw the ring
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
      }
    } else {
      // For built-in shapes, just use the path directly
      if (fill) {
        ctx.fill(shipPath);
      }
      if (stroke) {
        ctx.stroke(shipPath);
      }
    }
  }

  parseSVGViewBox(svgContent) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, "image/svg+xml");
      const svgElement = doc.querySelector("svg");
      
      if (svgElement) {
        const viewBox = svgElement.getAttribute("viewBox");
        if (viewBox) {
          const [x, y, width, height] = viewBox.split(/\s+/).map(Number);
          return { x, y, width, height };
        }
        
        // Fallback to width/height attributes
        const width = parseFloat(svgElement.getAttribute("width")) || 100;
        const height = parseFloat(svgElement.getAttribute("height")) || 100;
        return { x: 0, y: 0, width, height };
      }
    } catch (error) {
      console.warn("Failed to parse SVG viewBox:", error);
    }
    
    return null;
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

  // Trigger pulsing effect when picking up powerup
  triggerPowerupPulse() {
    this.powerupPulseActive = true;
    this.powerupPulseTimer = 0;
  }
}
