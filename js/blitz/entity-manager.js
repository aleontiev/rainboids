// EntityManager - Handles all entity lifecycle, spawning, and updates

import { Enemy, createEnemyFromConfig } from "./entities/enemy.js";
import { MiniBoss } from "./entities/miniboss.js";
import { Boss } from "./entities/boss.js";
import { Asteroid } from "./entities/asteroid.js";
import { Metal } from "./entities/metal.js";
import { Powerup } from "./entities/powerup.js";
import { Bullet } from "./entities/bullet.js";
import { Laser } from "./entities/laser.js";
import { SpreadingBullet } from "./entities/spreading-bullet.js";
import { HomingMissile } from "./entities/homing-missile.js";
import { SVGAssetManager } from "./svg-asset-manager.js";

export class EntityManager {
  constructor(game) {
    this.game = game;

    // Global entity ID counter for unique entity identification
    this.nextEntityId = 1;

    // Entity arrays with auto-ID assignment
    this.enemies = this.createEntityArray();
    this.miniBosses = this.createEntityArray();
    this.boss = null;
    this.asteroids = this.createEntityArray();
    this.metals = this.createEntityArray();
    this.powerups = this.createEntityArray();
    this.bullets = this.createEntityArray();
    this.enemyBullets = this.createEntityArray();
    this.enemyLasers = this.createEntityArray();
    this.missiles = this.createEntityArray();
    this.spreadingBullets = this.createEntityArray();
    this.particles = this.createEntityArray();
    this.debris = this.createEntityArray();

    // Spawn timers
    this.asteroidTimer = 0;
    this.enemyTimer = 0;
    this.powerupTimer = 0;
    this.metalTimer = 0;

    // State tracking (removed miniBossesDefeated - now determined dynamically)

    // SVG asset loader
    this.svgAssets = {};
    this.svgAssetManager = new SVGAssetManager();
    this.loadSVGAssets();
  }

  // SVG ASSET LOADING

  async loadSVGAssets() {
    const svgFiles = {
      "alpha-miniboss": "svg/alpha-miniboss.svg",
      "beta-miniboss": "svg/beta-miniboss.svg",
    };

    for (const [name, path] of Object.entries(svgFiles)) {
      try {
        const response = await fetch(path);
        const svgText = await response.text();
        this.svgAssets[name] = svgText;
      } catch (error) {
        console.warn(`Failed to load SVG asset: ${path}`, error);
        this.svgAssets[name] = null;
      }
    }
  }

  async getSVGAsset(identifier) {
    // Check if it's a URL
    if (this.svgAssetManager.isURL(identifier)) {
      // Load from URL using the asset manager
      try {
        return await this.svgAssetManager.loadSVG(identifier);
      } catch (error) {
        console.warn(`Failed to load SVG from URL: ${identifier}`, error);
        return null;
      }
    }
    
    // Check local assets first
    return this.svgAssets[identifier] || null;
  }

  // Preload SVG assets for a level configuration
  async preloadLevelSVGs(levelConfig) {
    const svgUrls = this.extractSVGUrls(levelConfig);
    if (svgUrls.length > 0) {
      console.log(`Preloading ${svgUrls.length} SVG assets for level...`);
      await this.svgAssetManager.preloadSVGs(svgUrls);
      console.log('Level SVG preloading complete');
    }
  }

  // Extract all SVG URLs from level configuration
  extractSVGUrls(levelConfig) {
    const urls = [];
    
    if (levelConfig && levelConfig.enemies) {
      for (const [enemyId, enemyDef] of Object.entries(levelConfig.enemies)) {
        if (enemyDef.sprite && this.svgAssetManager.isURL(enemyDef.sprite)) {
          urls.push(enemyDef.sprite);
        }
      }
    }
    
    return [...new Set(urls)]; // Remove duplicates
  }

  // Convert SVG to Path2D for rendering
  svgToPath2D(svgText) {
    if (!svgText) return null;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, "image/svg+xml");
      
      // Look for all path elements, including those inside groups
      const pathElements = doc.querySelectorAll("path");
      
      if (pathElements.length > 0) {
        const combinedPath = new Path2D();
        
        // Add all paths to create a union when filled
        pathElements.forEach(pathElement => {
          const pathData = pathElement.getAttribute("d");
          if (pathData) {
            const singlePath = new Path2D(pathData);
            combinedPath.addPath(singlePath);
          }
        });
        
        return combinedPath;
      }
      
      // Fallback: try to find the first individual path
      const singlePath = doc.querySelector("path");
      if (singlePath) {
        const pathData = singlePath.getAttribute("d");
        return new Path2D(pathData);
      }
    } catch (error) {
      console.warn("Failed to parse SVG to Path2D:", error);
    }

    return null;
  }

  reset() {
    // Clear all entity arrays and recreate with auto-ID assignment
    this.enemies = this.createEntityArray();
    this.miniBosses = this.createEntityArray();
    this.boss = null;
    this.asteroids = this.createEntityArray();
    this.metals = this.createEntityArray();
    this.powerups = this.createEntityArray();
    this.bullets = this.createEntityArray();
    this.enemyBullets = this.createEntityArray();
    this.enemyLasers = this.createEntityArray();
    this.missiles = this.createEntityArray();
    this.spreadingBullets = this.createEntityArray();
    this.particles = this.createEntityArray();
    this.debris = this.createEntityArray();

    // Reset timers
    this.asteroidTimer = 0;
    this.enemyTimer = 0;
    this.powerupTimer = 0;
    this.metalTimer = 0;

    // Reset state (removed miniBossesDefeated - now determined dynamically)

    // SVG assets are preserved across resets
    // Reset entity ID counter
    this.nextEntityId = 1;
  }

  // ENTITY ID MANAGEMENT
  
  assignEntityId(entity) {
    if (!entity.id) {
      entity.id = this.nextEntityId++;
    }
    return entity;
  }

  // Create wrapper arrays that auto-assign IDs when entities are added
  createEntityArray() {
    const entityManager = this;
    const array = [];
    
    // Override push method to auto-assign IDs
    const originalPush = array.push;
    array.push = function(...entities) {
      entities.forEach(entity => entityManager.assignEntityId(entity));
      return originalPush.apply(this, entities);
    };
    
    return array;
  }

  // SPAWNING METHODS

  spawnAsteroid(type = "large", x = null, y = null, vx = null, vy = null) {
    const canvas = this.game.canvas;

    let spawnX, spawnY, spawnVx, spawnVy;

    if (x !== null && y !== null && vx !== null && vy !== null) {
      // Use provided values (for splitting asteroids)
      spawnX = x;
      spawnY = y;
      spawnVx = vx;
      spawnVy = vy;
    } else {
      // Default spawning logic
      if (this.game.isPortrait) {
        spawnX = Math.random() * canvas.width;
        spawnY = -50;
        spawnVx = (Math.random() - 0.5) * 2;
        spawnVy = 1 + Math.random() * 2;
      } else {
        spawnX = canvas.width + 50; // Fixed: was -50, should spawn from right edge
        spawnY = Math.random() * canvas.height;
        spawnVx = -(1 + Math.random() * 2); // Fixed: negative velocity to move left
        spawnVy = (Math.random() - 0.5) * 2;
      }
    }

    // Get asteroid size and speed based on type
    let size, speed;
    switch (type) {
      case "large":
        size = 60;
        speed = 1;
        break;
      case "medium":
        size = 40;
        speed = 1.5;
        break;
      case "small":
        size = 25;
        speed = 2;
        break;
      default:
        size = 60;
        speed = 1;
    }

    const asteroid = new Asteroid(
      spawnX,
      spawnY,
      type,
      this.game.isPortrait,
      size,
      speed,
      spawnVx,
      spawnVy
    );
    this.assignEntityId(asteroid);
    this.asteroids.push(asteroid);
    return asteroid;
  }

  createEnemyFromConfig(configName, x, y, isClone = false, generation = 0) {
    return createEnemyFromConfig(
      configName,
      x,
      y,
      this.game.isPortrait,
      this.game,
      isClone,
      generation
    );
  }

  spawnEnemy() {
    const canvas = this.game.canvas;
    let spawnX, spawnY;

    if (this.game.isPortrait) {
      spawnX = Math.random() * canvas.width;
      spawnY = -50;
    } else {
      spawnX = canvas.width + 50; // Fixed: was -50, should spawn from right edge
      spawnY = Math.random() * canvas.height;
    }

    // Get basic enemy config names (filter out minibosses and bosses)
    const enemyConfigs = this.game?.level?.config?.enemies;
    if (!enemyConfigs) {
      console.warn("No enemy configs found, falling back to default spawning");
      throw new Error("No enemies, bad level config");
    }

    const basicEnemyConfigs = Object.keys(enemyConfigs).filter((name) => {
      const config = enemyConfigs[name];
      return (
        config !== enemyConfigs["*"] &&
        !config.type?.toLowerCase().includes("boss")
      );
    });

    if (basicEnemyConfigs.length === 0) {
      console.warn("No basic enemy configs found spawning none");
      return null;
    }

    const randomConfigName =
      basicEnemyConfigs[Math.floor(Math.random() * basicEnemyConfigs.length)];

    // Create enemy using config system
    const enemy = this.createEnemyFromConfig(randomConfigName, spawnX, spawnY);

    if (enemy) {
      this.assignEntityId(enemy);
      this.enemies.push(enemy);
    } else {
      console.warn(`Failed to create enemy from config: ${randomConfigName}`);
    }
    return enemy;
  }

  spawnPowerup(phaseConfig = null) {
    const canvas = this.game.canvas;
    let spawnX, spawnY;

    if (this.game.isPortrait) {
      spawnX = Math.random() * canvas.width;
      spawnY = -50;
    } else {
      spawnX = canvas.width + 50; // Fixed: was -50, should spawn from right edge
      spawnY = Math.random() * canvas.height;
    }

    // Get powerup weights from phase config or use defaults
    let powerupWeights;
    if (phaseConfig && phaseConfig.powerups) {
      // Extract weights from phase config format { powerupType: { weight: number } }
      powerupWeights = {};
      for (const [type, config] of Object.entries(phaseConfig.powerups)) {
        powerupWeights[type] = config.weight || 0;
      }
    } else {
      // Fallback to default weights
      powerupWeights = {
        shield: 25,
        bomb: 15,
        mainWeapon: 30,
        sideWeapon: 20,
        secondShip: 10,
        rainbowStar: 5,
      };
    }

    const totalWeight = Object.values(powerupWeights).reduce(
      (sum, weight) => sum + weight,
      0
    );

    // If total weight is 0, don't spawn any powerups
    if (totalWeight <= 0) {
      return null;
    }
    const random = Math.random() * totalWeight;
    let currentWeight = 0;
    let selectedType = "shield";

    for (const [type, weight] of Object.entries(powerupWeights)) {
      currentWeight += weight;
      if (random <= currentWeight) {
        selectedType = type;
        break;
      }
    }

    const powerup = new Powerup(
      spawnX,
      spawnY,
      selectedType,
      this.game.isPortrait,
      this.game
    );
    this.assignEntityId(powerup);
    this.powerups.push(powerup);
    return powerup;
  }

  spawnMetal() {
    const canvas = this.game.canvas;
    let spawnX, spawnY;

    if (this.game.isPortrait) {
      spawnX = Math.random() * (canvas.width - 100) + 50;
      spawnY = -50;
    } else {
      spawnX = canvas.width + 50; // Fixed: was -50, should spawn from right edge
      spawnY = Math.random() * (canvas.height - 100) + 50;
    }

    // Randomly select metal type with weighted distribution
    const metalTypes = ["L", "T"];
    const metalWeights = [70, 30]; // L is more common, T is less common

    const totalWeight = metalWeights.reduce((sum, weight) => sum + weight, 0);
    const random = Math.random() * totalWeight;
    let currentWeight = 0;
    let selectedType = "L"; // Default fallback

    for (let i = 0; i < metalTypes.length; i++) {
      currentWeight += metalWeights[i];
      if (random <= currentWeight) {
        selectedType = metalTypes[i];
        break;
      }
    }

    const metal = new Metal(
      spawnX,
      spawnY,
      selectedType,
      this.game.isPortrait,
      this.game
    );
    this.assignEntityId(metal);
    this.metals.push(metal);
    return metal;
  }

  spawnCustomEnemy(enemyId, enemyDef) {
    if (!enemyDef) {
      console.error(`Enemy definition not found for ${enemyId}`);
      return;
    }

    const canvas = this.game.canvas;

    // Calculate spawn position based on enemy type and count
    let x, y;

    if (enemyDef.type === "miniboss") {
      // For minibosses, calculate spawn positions to avoid overlapping
      const minibossCount = this.getMiniBossCount();
      
      if (this.game.isPortrait) {
        // Portrait mode: spawn on opposite side (top), distribute left/right
        const centerX = canvas.width / 2;
        const centerY = 150;
        
        if (minibossCount === 0) {
          // First miniboss: center position
          x = centerX;
          y = centerY;
        } else if (minibossCount === 1) {
          // Second miniboss: left of center
          x = centerX - 150;
          y = centerY;
        } else if (minibossCount === 2) {
          // Third miniboss: right of center
          x = centerX + 150;
          y = centerY;
        } else {
          // Additional minibosses: spread further apart
          const angle = (minibossCount * (Math.PI * 2 / 5)) + Math.PI; // Start from top and spread
          const radius = 200 + (minibossCount - 3) * 50;
          x = centerX + Math.cos(angle) * radius;
          y = centerY + Math.sin(angle) * radius;
          // Keep within screen bounds
          x = Math.max(100, Math.min(canvas.width - 100, x));
          y = Math.max(100, Math.min(canvas.height - 200, y));
        }
      } else {
        // Landscape mode: spawn on opposite side (right), distribute top/bottom
        const centerX = canvas.width - 150;
        const centerY = canvas.height / 2;
        
        if (minibossCount === 0) {
          // First miniboss: center position
          x = centerX;
          y = centerY;
        } else if (minibossCount === 1) {
          // Second miniboss: above center
          x = centerX;
          y = centerY - 120;
        } else if (minibossCount === 2) {
          // Third miniboss: below center
          x = centerX;
          y = centerY + 120;
        } else {
          // Additional minibosses: spread further apart
          const angle = (minibossCount * (Math.PI * 2 / 5));
          const radius = 180 + (minibossCount - 3) * 40;
          x = centerX + Math.cos(angle) * radius;
          y = centerY + Math.sin(angle) * radius;
          // Keep within screen bounds
          x = Math.max(100, Math.min(canvas.width - 100, x));
          y = Math.max(100, Math.min(canvas.height - 100, y));
        }
      }

      // Create miniboss with configuration
      const miniBoss = new MiniBoss(
        x,
        y,
        this.game.isPortrait,
        canvas.width,
        this.game
      );

      // Apply enemy definition properties
      if (enemyDef.health) {
        miniBoss.health = enemyDef.health;
        // If maxHealth isn't explicitly set, use health as maxHealth
        if (!enemyDef.maxHealth) {
          miniBoss.maxHealth = enemyDef.health;
        }
      }
      if (enemyDef.maxHealth) miniBoss.maxHealth = enemyDef.maxHealth;
      if (enemyDef.shield) {
        miniBoss.shield = enemyDef.shield;
        // If maxShield isn't explicitly set, use shield as maxShield
        if (!enemyDef.maxShield) {
          miniBoss.maxShield = enemyDef.shield;
        }
      }
      if (enemyDef.maxShield) miniBoss.maxShield = enemyDef.maxShield;
      if (enemyDef.speed) miniBoss.speed = enemyDef.speed;
      if (enemyDef.size) miniBoss.size = enemyDef.size;

      // Set sprite if defined (async operation)
      if (enemyDef.sprite) {
        miniBoss.setCustomSVGSprite(
          enemyDef.sprite,
          enemyDef.spriteScale || 1,
          enemyDef.spriteColor || "#ff4444"
        ).catch(error => {
          console.warn(`Failed to set sprite for miniboss: ${enemyDef.sprite}`, error);
        });
        if (enemyDef.spriteRotation) {
          miniBoss.spriteRotation = enemyDef.spriteRotation;
        }
      }

      // Configure weapons (legacy)
      if (enemyDef.weapons) {
        this.configureMiniBossWeapons(miniBoss, enemyDef.weapons);
      }
      
      // Configure new attack patterns
      if (enemyDef.attacks) {
        miniBoss.configureAttacks(enemyDef.attacks);
      }

      this.assignEntityId(miniBoss);
      this.miniBosses.push(miniBoss);
    } else if (enemyDef.type === "boss") {
      // Spawn boss (reuse existing logic)
      if (this.boss && !this.boss.isDefeated) {
        console.warn("Boss already exists and is not defeated");
        return;
      }
      this.spawnBoss();
    } else {
      // Handle regular enemy types
      this.spawnEnemyWithConfig(enemyDef);
    }

  }

  // Spawn regular enemy with configuration
  spawnEnemyWithConfig(enemyDef) {
    const canvas = this.game.canvas;

    // Calculate spawn position
    let x, y;
    if (this.game.isPortrait) {
      x = Math.random() * (canvas.width - 100) + 50;
      y = -50;
    } else {
      x = canvas.width + 50;
      y = Math.random() * (canvas.height - 100) + 50;
    }

    // Create enemy using new data-driven system
    const enemy = new Enemy(
      x,
      y,
      this.game.isPortrait,
      enemyDef,
      false,
      0,
      this.game
    );

    if (enemy) {
      this.assignEntityId(enemy);
      this.enemies.push(enemy);
    }
  }

  configureMiniBossWeapons(miniBoss, weapons) {
    // Override the default weapon firing methods based on configuration
    weapons.forEach((weapon, index) => {
      miniBoss.addAttack(weapon.name || `weapon_${index}`, weapon);

      // Update cooldowns if specified
      if (weapon.name === "primary" && weapon.cooldown) {
        miniBoss.primaryWeaponCooldown = weapon.cooldown;
      } else if (weapon.name === "secondary" && weapon.cooldown) {
        miniBoss.secondaryWeaponCooldown = weapon.cooldown;
      } else if (weapon.name === "circular" && weapon.cooldown) {
        miniBoss.circularWeaponCooldown = weapon.cooldown;
      }
    });
  }

  spawnBoss() {
    // Get boss configuration from level config
    const bossConfig = this.game.level?.config?.enemies?.mainBoss;
    if (!bossConfig) {
      console.error("No boss configuration found in level config - cannot spawn boss");
      return null;
    }

    const canvas = this.game.canvas;
    const bossX = this.game.isPortrait ? canvas.width / 2 : canvas.width - 200;
    const bossY = this.game.isPortrait ? 200 : canvas.height / 2;

    // Create new skeleton/anchored boss
    this.boss = new Boss(bossX, bossY, bossConfig, this.game);
    this.assignEntityId(this.boss);

    console.log("Boss spawned with skeleton/anchoring system");
    return this.boss;
  }

  createEnemyBullet(bulletData) {
    if (bulletData.type === "spreading") {
      // Convert velocity components to angle and speed
      const angle = Math.atan2(bulletData.vy, bulletData.vx);
      const speed = Math.sqrt(
        bulletData.vx * bulletData.vx + bulletData.vy * bulletData.vy
      );

      const bullet = new SpreadingBullet(
        bulletData.x,
        bulletData.y,
        angle,
        bulletData.size,
        bulletData.color,
        this.game.isPortrait,
        speed,
        bulletData.explosionTime || 120, // Use provided explosion time or default
        this.game,
        {
          count: bulletData.spreadBulletCount || 8,
          speed: bulletData.spreadBulletSpeed || 4,
          size: bulletData.spreadBulletSize || bulletData.size * 0.3,
        }
      );
      this.assignEntityId(bullet);
      this.spreadingBullets.push(bullet);
    } else if (bulletData.type === "homingMissile") {
      const missile = new HomingMissile(
        bulletData.x,
        bulletData.y,
        bulletData.angle,
        bulletData.speed,
        bulletData.color,
        this.game.player
      );
      this.assignEntityId(missile);
      this.missiles.push(missile);
    } else {
      // Regular enemy bullet
      // Convert velocity components to angle and speed
      const angle = Math.atan2(bulletData.vy, bulletData.vx);
      const speed = Math.sqrt(
        bulletData.vx * bulletData.vx + bulletData.vy * bulletData.vy
      );

      const bullet = new Bullet(
        bulletData.x,
        bulletData.y,
        angle,
        bulletData.size,
        bulletData.color,
        this.game.isPortrait,
        speed,
        false,
        this.game,
        bulletData.damage || 1 // Pass damage or default to 1
      );
      this.assignEntityId(bullet);
      this.enemyBullets.push(bullet);
    }
  }

  // UPDATE METHODS


  update(deltaTime, slowdownFactor) {
    // Update player bullets
    this.updateBullets(slowdownFactor);

    // Update enemy bullets
    this.updateEnemyBullets(slowdownFactor);

    // Update enemy lasers
    this.updateEnemyLasers(slowdownFactor);

    // Update missiles
    this.updateMissiles(slowdownFactor);

    // Update spreading bullets
    this.updateSpreadingBullets(slowdownFactor);

    // Update enemies
    this.updateEnemies(slowdownFactor);

    // Update minibosses
    this.updateMiniBosses(slowdownFactor);

    // Update boss
    this.updateBoss(slowdownFactor);

    // Update environment
    this.updateAsteroids(slowdownFactor);
    this.updateMetals(slowdownFactor);
    this.updatePowerups(slowdownFactor);

    // Update particles
    this.updateParticles(slowdownFactor);
  }

  updateBullets(slowdownFactor) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];

      // Handle different bullet types with appropriate parameters
      let shouldRemove = false;
      if (bullet.constructor.name === "HomingMissile") {
        // HomingMissile needs enemies array - this shouldn't happen but handle gracefully
        console.warn(
          "HomingMissile found in bullets array instead of missiles array"
        );
        // This shouldn't happen, but pass a proper enemy array if needed
        const allEnemies = [...this.enemies, ...this.miniBosses];
        if (this.boss) allEnemies.push(this.boss);
        shouldRemove = !bullet.update(allEnemies, slowdownFactor);
      } else {
        // Regular bullets only need slowdownFactor
        shouldRemove = !bullet.update(slowdownFactor);
      }

      if (shouldRemove) {
        this.bullets.splice(i, 1);
      }
    }
  }

  updateEnemyBullets(slowdownFactor) {
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const bullet = this.enemyBullets[i];

      // Handle SpreadingBullet which needs a callback
      if (bullet.constructor.name === "SpreadingBullet") {
        const addEnemyBulletCallback = (enemyBullet) => {
          this.assignEntityId(enemyBullet);
          this.enemyBullets.push(enemyBullet);
        };
        if (!bullet.update(slowdownFactor, addEnemyBulletCallback)) {
          this.enemyBullets.splice(i, 1);
        }
      } else {
        // Regular enemy bullets
        if (!bullet.update(slowdownFactor)) {
          this.enemyBullets.splice(i, 1);
        }
      }
    }
  }

  updateEnemyLasers(slowdownFactor) {
    for (let i = this.enemyLasers.length - 1; i >= 0; i--) {
      const laser = this.enemyLasers[i];
      if (!laser.update(slowdownFactor)) {
        this.enemyLasers.splice(i, 1);
      }
    }
  }

  updateMissiles(slowdownFactor) {
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const missile = this.missiles[i];
      // Homing missiles need access to targetable enemies (excluding invulnerable parts)
      const targetableEnemies = this.getTargetableEnemies();
      if (!missile.update(targetableEnemies, slowdownFactor)) {
        this.missiles.splice(i, 1);
      }
    }
  }

  getTargetableEnemies() {
    // Filter out invulnerable enemies
    const vulnerableEnemies = [...this.enemies, ...this.miniBosses].filter(
      (enemy) => {
        if (enemy.isVulnerable && typeof enemy.isVulnerable === "function") {
          return enemy.isVulnerable();
        }
        return !enemy.godMode && !enemy.invulnerable;
      }
    );

    // Add boss targetable parts if boss exists
    if (this.boss && !this.boss.isDefeated && this.boss.getTargetableParts) {
      vulnerableEnemies.push(...this.boss.getTargetableParts());
    }

    return vulnerableEnemies;
  }

  updateSpreadingBullets(slowdownFactor) {
    for (let i = this.spreadingBullets.length - 1; i >= 0; i--) {
      const bullet = this.spreadingBullets[i];
      // Provide callback to add enemy bullets when spreading bullet explodes
      const addEnemyBulletCallback = (enemyBullet) => {
        this.assignEntityId(enemyBullet);
        this.enemyBullets.push(enemyBullet);
      };
      if (!bullet.update(slowdownFactor, addEnemyBulletCallback)) {
        this.spreadingBullets.splice(i, 1);
      }
    }
  }

  updateEnemies(slowdownFactor) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // Create callback for clone enemies to add new clones
      const addEnemyCallback = (newEnemy) => {
        this.assignEntityId(newEnemy);
        this.enemies.push(newEnemy);
      };

      enemy.update(
        this.game.player.x,
        this.game.player.y,
        this.enemyBullets,
        this.enemyLasers,
        slowdownFactor,
        addEnemyCallback
      );

      // Check if enemy is off-screen (with buffer) or has no health
      const buffer = 200; // Larger buffer for enemies to give them more time
      const canvas = this.game.canvas;
      const isOffScreen =
        enemy.x < -buffer ||
        enemy.x > canvas.width + buffer ||
        enemy.y < -buffer ||
        enemy.y > canvas.height + buffer;

      if (isOffScreen || enemy.health <= 0) {
        this.enemies.splice(i, 1);
      } else {
        // Handle enemy weapons
        this.handleEnemyWeapons(enemy);
      }
    }
  }

  updateMiniBosses(slowdownFactor) {
    for (let i = this.miniBosses.length - 1; i >= 0; i--) {
      const miniBoss = this.miniBosses[i];
      const result = miniBoss.update(
        this.game.player.x,
        this.game.player.y,
        slowdownFactor
      );

      if (result === "final_explosion") {
        this.game.effects.createExplosion(miniBoss.x, miniBoss.y, 15, 3.0);
        this.game.audio.play(this.game.audio.sounds.explosion);
        this.miniBosses.splice(i, 1);

        // Miniboss defeat state is now determined dynamically by checking this.miniBosses.length
      } else if (result === "rain_explosion") {
        this.game.effects.createExplosion(
          miniBoss.x + (Math.random() - 0.5) * miniBoss.size,
          miniBoss.y + (Math.random() - 0.5) * miniBoss.size,
          5,
          2.0
        );
        this.game.audio.play(this.game.audio.sounds.enemyExplosion);
      } else if (
        result &&
        typeof result === "object" &&
        result.type === "death_explosion"
      ) {
        // Handle new death explosion format
        this.game.effects.createRainbowExplosion(
          result.x,
          result.y,
          result.size
        );
        this.game.audio.play(this.game.audio.sounds.enemyExplosion);
      } else if (!miniBoss.dying) {
        // Handle miniboss weapons if not dying
        this.handleEnemyWeapons(miniBoss);
      }
    }
  }

  updateBoss(slowdownFactor) {
    if (!this.boss) return;

    const result = this.boss.update(
      this.game.player.x,
      this.game.player.y,
      slowdownFactor
    );

    if (result === "defeated") {
      this.game.startBossDeathSequence();
      this.boss = null;
    } else {
      // Handle boss weapons
      this.handleEnemyWeapons(this.boss);
    }
  }

  updateAsteroids(slowdownFactor) {
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const asteroid = this.asteroids[i];
      asteroid.update(slowdownFactor);

      // Check if asteroid is off-screen (with buffer)
      const buffer = 100;
      const canvas = this.game.canvas;
      if (
        asteroid.x < -buffer ||
        asteroid.x > canvas.width + buffer ||
        asteroid.y < -buffer ||
        asteroid.y > canvas.height + buffer
      ) {
        this.asteroids.splice(i, 1);
      }
    }
  }

  updateMetals(slowdownFactor) {
    for (let i = this.metals.length - 1; i >= 0; i--) {
      const metal = this.metals[i];
      metal.update(slowdownFactor);

      // Check if metal is off-screen (with buffer)
      const buffer = 100;
      const canvas = this.game.canvas;
      if (
        metal.x < -buffer ||
        metal.x > canvas.width + buffer ||
        metal.y < -buffer ||
        metal.y > canvas.height + buffer
      ) {
        this.metals.splice(i, 1);
      }
    }
  }

  updatePowerups(slowdownFactor) {
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const powerup = this.powerups[i];
      powerup.update(slowdownFactor);

      // Check if powerup is off-screen (with buffer)
      const buffer = 100;
      const canvas = this.game.canvas;
      if (
        powerup.x < -buffer ||
        powerup.x > canvas.width + buffer ||
        powerup.y < -buffer ||
        powerup.y > canvas.height + buffer
      ) {
        this.powerups.splice(i, 1);
      }
    }
  }

  updateParticles(slowdownFactor) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.update(slowdownFactor);

      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.debris.length - 1; i >= 0; i--) {
      const debris = this.debris[i];
      debris.update(slowdownFactor);

      if (debris.life <= 0) {
        this.debris.splice(i, 1);
      }
    }
  }

  // ENEMY WEAPON HANDLING

  handleEnemyWeapons(enemy) {
    if (enemy.type === "boss") {
      // Boss weapon handling will be rebuilt
      {
      }
    } else if (enemy instanceof MiniBoss) {
      this.handleMiniBossWeapons(enemy);
    } else if (enemy instanceof Enemy) {
      this.handleNormalEnemyWeapons(enemy);
    }
  }

  handleBossWeapons(boss) {
    // Don't attack during dialog phases
    const currentPhase = boss.getCurrentPhase();
    if (currentPhase && currentPhase.type === "dialog") {
      return;
    }
    
    // Fire weapons for all enabled parts
    for (const part of boss.parts.values()) {
      if (
        !part.enabled ||
        part.destroyed ||
        part.cooldown > 0 ||
        !part.canAttack
      )
        continue;

      const weaponData = boss.firePartWeapon(
        part.id,
        this.game.player.x,
        this.game.player.y
      );

      // Handle projectiles
      if (weaponData.projectiles) {
        weaponData.projectiles.forEach((bulletData) => {
          this.createEnemyBullet(bulletData);
        });
      }

      // Handle lasers
      if (weaponData.lasers) {
        weaponData.lasers.forEach((data) => {
          const laser = new Laser(
            data.x,
            data.y,
            data.angle,
            data.speed,
            data.color,
            this.game
          );
          this.assignEntityId(laser);
          this.enemyLasers.push(laser);
        });
      }

      // Handle enemy spawns
      if (weaponData.enemies) {
        weaponData.enemies.forEach((enemyData) => {
          const newEnemy = new Enemy(
            enemyData.x,
            enemyData.y,
            enemyData.type,
            this.game.isPortrait,
            null,
            false,
            this.game
          );
          this.assignEntityId(newEnemy);
          this.enemies.push(newEnemy);
        });

        if (weaponData.enemies.length > 0) {
          }
      }
    }

    // Update continuous laser beams for all parts
    for (const part of boss.parts.values()) {
      if (part.activeLaser && !part.destroyed) {
        // Keep laser aligned with part position
        part.activeLaser.updateOrigin(part.x, part.y);

        const stillActive = part.activeLaser.update(
          1.0,
          this.metals,
          this.game.player.x,
          this.game.player.y
        );
        if (!stillActive) {
          part.activeLaser = null;
        }
      } else if (part.activeLaser && part.destroyed) {
        // Clean up laser if part was destroyed
        part.activeLaser = null;
      }
    }
  }

  handleMiniBossWeapons(miniBoss) {
    // Use new configurable attack system if patterns are configured
    if (miniBoss.attackPatterns && miniBoss.attackPatterns.length > 0) {
      const readyAttacks = miniBoss.getReadyAttacks(
        this.game.player.x,
        this.game.player.y
      );
      
      for (const attack of readyAttacks) {
        if (Array.isArray(attack)) {
          // Multiple bullets
          attack.forEach((bulletData) => {
            this.createEnemyBullet(bulletData);
          });
        } else if (attack) {
          // Single bullet
          this.createEnemyBullet(attack);
        }
      }
    } else {
      // Fall back to legacy weapon system
      // Primary weapon
      if (miniBoss.canFirePrimary()) {
        const bulletData = miniBoss.firePrimary(
          this.game.player.x,
          this.game.player.y
        );
        if (bulletData) {
          this.createEnemyBullet(bulletData);
        }
      }

      // Secondary weapon
      if (miniBoss.canFireSecondary()) {
        const bullets = miniBoss.fireSecondary(
          this.game.player.x,
          this.game.player.y
        );
        bullets.forEach((bulletData) => {
          this.createEnemyBullet(bulletData);
        });
      }

      // Circular weapon
      if (miniBoss.canFireCircular()) {
        const bullets = miniBoss.fireCircular();
        bullets.forEach((bulletData) => {
          this.createEnemyBullet(bulletData);
        });
      }

      // Burst weapon
      if (miniBoss.canFireBurst()) {
        const bullets = miniBoss.fireBurst(
          this.game.player.x,
          this.game.player.y
        );
        bullets.forEach((bulletData) => {
          this.createEnemyBullet(bulletData);
        });
      }
    }

    // Enemy spawning
    if (miniBoss.canSpawnEnemy()) {
      const enemy = miniBoss.spawnEnemy(this.game.player.x, this.game.player.y);
      if (enemy) {
        const newEnemy = new Enemy(
          enemy.x,
          enemy.y,
          enemy.type,
          this.game.isPortrait,
          null,
          false,
          this.game
        );
        this.assignEntityId(newEnemy);
        this.enemies.push(newEnemy);
      }
    }
  }

  handleNormalEnemyWeapons(enemy) {
    // Normal enemies use the shoot method
    if (enemy && typeof enemy.shoot === "function") {
      enemy.shoot(this.enemyBullets, this.enemyLasers, this.game.player);
    }
  }

  // CLEANUP METHODS

  removeDestroyedEnemy(enemy) {
    // Remove from appropriate array
    let removed = false;
    let enemyType = "regular";

    // Check enemies array
    const enemyIndex = this.enemies.indexOf(enemy);
    if (enemyIndex !== -1) {
      this.enemies.splice(enemyIndex, 1);
      removed = true;
      enemyType = enemy.type || "regular";
    }

    // Check minibosses array
    const miniBossIndex = this.miniBosses.indexOf(enemy);
    if (miniBossIndex !== -1) {
      this.miniBosses.splice(miniBossIndex, 1);
      removed = true;
      enemyType = "miniboss";

      // Miniboss defeat state is now determined dynamically by checking this.miniBosses.length
    }

    // Check if it's the boss
    if (this.boss === enemy) {
      this.boss = null;
      removed = true;
      enemyType = "boss";
    }

    if (removed) {
      // Track enemy destruction in level manager
      if (this.game.level) {
        this.game.level.trackEnemyKilled(enemyType);
      }
      
      // Award score with popup at enemy position
      let points = 0;
      let isBoss = false;
      
      switch (enemyType) {
        case "regular":
          points = 100;
          break;
        case "miniboss":
          points = 500;
          break;
        case "boss":
          points = 1000;
          isBoss = true;
          break;
      }
      
      if (points > 0) {
        // Determine enemy color for floating text
        let enemyColor = "#00ff00"; // Default green for custom sprites  
        
        // Check if enemy has a color property (regular enemies)
        if (enemy.color && typeof enemy.color === 'string') {
          enemyColor = enemy.color;
        }
        // Check for miniboss/boss type - these should keep rainbow effect
        else if (enemyType === 'miniboss' || enemyType === 'boss') {
          enemyColor = null; // null indicates rainbow effect should be used
        }
        
        this.game.state.addScore(points, enemy.x, enemy.y, isBoss, enemyColor);
      }
    }

    return removed;
  }

  // GETTERS

  getEnemyCount() {
    return this.enemies.length;
  }

  getMiniBossCount() {
    return this.miniBosses.length;
  }

  hasBoss() {
    return this.boss !== null;
  }

  // Spawn enemy with specific type at specific position (used by boss attacks)
  spawnEnemyWithType(enemyType, x, y) {
    const enemy = new Enemy(
      x,
      y,
      this.game.isPortrait,
      null, // No specific config
      false, // Not player controlled
      0, // No metalPower
      this.game,
      enemyType
    );
    
    this.assignEntityId(enemy);
    this.enemies.push(enemy);
    return enemy;
  }

  getAllProjectiles() {
    return [
      ...this.bullets,
      ...this.enemyBullets,
      ...this.enemyLasers,
      ...this.missiles,
      ...this.spreadingBullets,
    ];
  }
}
