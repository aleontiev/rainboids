// EntityManager - Handles all entity lifecycle, spawning, and updates

import {
  Enemy,
  StraightEnemy,
  SineEnemy,
  ZigzagEnemy,
  CircleEnemy,
  DiveEnemy,
  LaserEnemy,
} from "./entities/enemy.js";
import { MiniBoss, AlphaMiniBoss, BetaMiniBoss } from "./entities/miniboss.js";
import { Boss } from "./entities/boss.js";
import { Asteroid } from "./entities/asteroid.js";
import { Metal } from "./entities/metal.js";
import { Powerup } from "./entities/powerup.js";
import { Bullet } from "./entities/bullet.js";
import { Laser } from "./entities/laser.js";
import { SpreadingBullet } from "./entities/spreading-bullet.js";
import { HomingMissile } from "./entities/homing-missile.js";

export class EntityManager {
  constructor(game) {
    this.game = game;

    // Entity arrays
    this.enemies = [];
    this.miniBosses = [];
    this.boss = null;
    this.allEnemies = []; // Unified enemy list for collision detection
    this.asteroids = [];
    this.metals = [];
    this.powerups = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.enemyLasers = [];
    this.missiles = [];
    this.spreadingBullets = [];
    this.particles = [];
    this.debris = [];

    // Spawn timers
    this.asteroidTimer = 0;
    this.enemyTimer = 0;
    this.powerupTimer = 0;
    this.metalTimer = 0;

    // State tracking
    this.miniBossesDefeated = false;

    // SVG asset loader
    this.svgAssets = {};
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

  getSVGAsset(name) {
    return this.svgAssets[name] || null;
  }

  // Convert SVG to Path2D for rendering
  svgToPath2D(svgText) {
    if (!svgText) return null;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, "image/svg+xml");
      const pathElement = doc.querySelector("path");

      if (pathElement) {
        const pathData = pathElement.getAttribute("d");
        return new Path2D(pathData);
      }
    } catch (error) {
      console.warn("Failed to parse SVG to Path2D:", error);
    }

    return null;
  }

  reset() {
    // Clear all entity arrays
    this.enemies = [];
    this.miniBosses = [];
    this.boss = null;
    this.allEnemies = [];
    this.asteroids = [];
    this.metals = [];
    this.powerups = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.enemyLasers = [];
    this.missiles = [];
    this.spreadingBullets = [];
    this.particles = [];
    this.debris = [];

    // Reset timers
    this.asteroidTimer = 0;
    this.enemyTimer = 0;
    this.powerupTimer = 0;
    this.metalTimer = 0;

    // Reset state
    this.miniBossesDefeated = false;

    // SVG assets are preserved across resets
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
    this.asteroids.push(asteroid);
    return asteroid;
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

    const enemyTypes = [
      "straight",
      "sine",
      "zigzag",
      "circle",
      "dive",
      "laser",
    ];
    const randomType =
      enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

    // Create the appropriate enemy type
    let enemy;
    switch (randomType) {
      case "straight":
        enemy = new StraightEnemy(
          spawnX,
          spawnY,
          this.game.isPortrait,
          null,
          false,
          this.game
        );
        break;
      case "sine":
        enemy = new SineEnemy(
          spawnX,
          spawnY,
          this.game.isPortrait,
          null,
          false,
          this.game
        );
        break;
      case "zigzag":
        enemy = new ZigzagEnemy(
          spawnX,
          spawnY,
          this.game.isPortrait,
          null,
          false,
          this.game
        );
        break;
      case "circle":
        enemy = new CircleEnemy(
          spawnX,
          spawnY,
          this.game.isPortrait,
          null,
          false,
          this.game
        );
        break;
      case "dive":
        enemy = new DiveEnemy(
          spawnX,
          spawnY,
          this.game.isPortrait,
          null,
          false,
          this.game
        );
        break;
      case "laser":
        enemy = new LaserEnemy(
          spawnX,
          spawnY,
          this.game.isPortrait,
          null,
          false,
          this.game
        );
        break;
      default:
        enemy = new StraightEnemy(
          spawnX,
          spawnY,
          this.game.isPortrait,
          null,
          false,
          this.game
        );
        break;
    }

    console.log(
      `Spawned enemy type: ${randomType}, class: ${
        enemy.constructor.name
      }, has shoot method: ${typeof enemy.shoot === "function"}`
    );
    this.enemies.push(enemy);
    this.updateAllEnemiesList();
    return enemy;
  }

  spawnPowerup() {
    const canvas = this.game.canvas;
    let spawnX, spawnY;

    if (this.game.isPortrait) {
      spawnX = Math.random() * canvas.width;
      spawnY = -50;
    } else {
      spawnX = canvas.width + 50; // Fixed: was -50, should spawn from right edge
      spawnY = Math.random() * canvas.height;
    }

    // Weighted powerup selection
    const powerupWeights = {
      shield: 25,
      bomb: 15,
      mainWeapon: 30,
      sideWeapon: 20,
      secondShip: 10,
      rainbowStar: 5,
    };

    const totalWeight = Object.values(powerupWeights).reduce(
      (sum, weight) => sum + weight,
      0
    );
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

    const metal = new Metal(
      spawnX,
      spawnY,
      "l",
      this.game.isPortrait,
      this.game
    );
    this.metals.push(metal);
    return metal;
  }

  spawnMiniBosses() {
    const canvas = this.game.canvas;

    // Spawn Alpha miniboss
    const alphaX = this.game.isPortrait
      ? canvas.width / 2 - 100
      : canvas.width - 150;
    const alphaY = this.game.isPortrait ? 150 : canvas.height / 2 - 100;
    const alphaMiniBoss = new AlphaMiniBoss(
      alphaX,
      alphaY,
      this.game.isPortrait,
      canvas.width,
      this.game
    );
    this.miniBosses.push(alphaMiniBoss);

    // Spawn Beta miniboss
    const betaX = this.game.isPortrait
      ? canvas.width / 2 + 100
      : canvas.width - 150;
    const betaY = this.game.isPortrait ? 150 : canvas.height / 2 + 100;
    const betaMiniBoss = new BetaMiniBoss(
      betaX,
      betaY,
      this.game.isPortrait,
      canvas.width,
      this.game
    );
    this.miniBosses.push(betaMiniBoss);

    this.updateAllEnemiesList();
  }

  spawnBoss() {
    const canvas = this.game.canvas;
    const bossX = this.game.isPortrait ? canvas.width / 2 : canvas.width - 200;
    const bossY = this.game.isPortrait ? 200 : canvas.height / 2;

    this.boss = new Boss(
      bossX,
      bossY,
      this.game.isPortrait,
      canvas.width,
      canvas.height
    );
    this.updateAllEnemiesList();
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
        this.game
      );
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
      this.enemyBullets.push(bullet);
    }
  }

  // UPDATE METHODS

  updateAllEnemiesList() {
    this.allEnemies = [...this.enemies, ...this.miniBosses];
    if (this.boss) {
      this.allEnemies.push(this.boss);
    }
  }

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
      if (bullet.constructor.name === 'HomingMissile') {
        // HomingMissile needs enemies array - this shouldn't happen but handle gracefully
        console.warn('HomingMissile found in bullets array instead of missiles array');
        shouldRemove = !bullet.update(this.allEnemies, slowdownFactor);
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
      if (bullet.constructor.name === 'SpreadingBullet') {
        const addEnemyBulletCallback = (enemyBullet) => {
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
      // Homing missiles need access to all enemies for targeting
      if (!missile.update(this.allEnemies, slowdownFactor)) {
        this.missiles.splice(i, 1);
      }
    }
  }

  updateSpreadingBullets(slowdownFactor) {
    for (let i = this.spreadingBullets.length - 1; i >= 0; i--) {
      const bullet = this.spreadingBullets[i];
      // Provide callback to add enemy bullets when spreading bullet explodes
      const addEnemyBulletCallback = (enemyBullet) => {
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
        this.enemies.push(newEnemy);
        this.updateAllEnemiesList();
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
        this.updateAllEnemiesList();
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
        this.updateAllEnemiesList();

        // Check if all minibosses are defeated
        if (this.miniBosses.length === 0) {
          this.miniBossesDefeated = true;
        }
      } else if (result === "rain_explosion") {
        this.game.effects.createExplosion(
          miniBoss.x + (Math.random() - 0.5) * miniBoss.size,
          miniBoss.y + (Math.random() - 0.5) * miniBoss.size,
          5,
          2.0
        );
        this.game.audio.play(this.game.audio.sounds.enemyExplosion);
      } else if (result && typeof result === 'object' && result.type === 'death_explosion') {
        // Handle new death explosion format
        this.game.effects.createRainbowExplosion(result.x, result.y, result.size);
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
      this.updateAllEnemiesList();
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
    if (enemy instanceof Boss) {
      this.handleBossWeapons(enemy);
    } else if (enemy instanceof MiniBoss) {
      this.handleMiniBossWeapons(enemy);
    } else if (enemy instanceof Enemy) {
      this.handleNormalEnemyWeapons(enemy);
    }
  }

  handleBossWeapons(boss) {
    // Fire left arm lasers (now handles continuous laser beam)
    const leftArmLasers = boss.fireLeftArm(
      this.game.player.x,
      this.game.player.y
    );
    leftArmLasers.forEach((data) => {
      this.enemyLasers.push(
        new Laser(data.x, data.y, data.angle, data.speed, data.color, this.game)
      );
    });

    // Update continuous laser beam if active
    if (boss.leftArm && boss.leftArm.activeLaser) {
      // Keep laser aligned with cannon position
      boss.leftArm.activeLaser.updateOrigin(boss.leftArm.x, boss.leftArm.y);

      const stillActive = boss.leftArm.activeLaser.update(
        1.0,
        this.metals,
        this.game.player.x,
        this.game.player.y
      );
      if (!stillActive) {
        boss.leftArm.activeLaser = null;
      }
    }

    // Fire right arm bullets
    const rightArmBullets = boss.fireRightArm(
      this.game.player.x,
      this.game.player.y
    );
    rightArmBullets.forEach((bulletData) => {
      this.createEnemyBullet(bulletData);
    });

    // Fire final phase attacks
    const finalPhaseData = boss.fireFinalPhase(
      this.game.player.x,
      this.game.player.y
    );
    finalPhaseData.bullets.forEach((bulletData) => {
      this.createEnemyBullet(bulletData);
    });

    // Spawn enemies in final phase
    finalPhaseData.enemies.forEach((enemyData) => {
      this.enemies.push(
        new Enemy(
          enemyData.x,
          enemyData.y,
          enemyData.type,
          this.game.isPortrait,
          null,
          false,
          this.game
        )
      );
    });

    if (finalPhaseData.enemies.length > 0) {
      this.updateAllEnemiesList();
    }
  }

  handleMiniBossWeapons(miniBoss) {
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

    // Enemy spawning
    if (miniBoss.canSpawnEnemy()) {
      const enemy = miniBoss.spawnEnemy(this.game.player.x, this.game.player.y);
      if (enemy) {
        this.enemies.push(
          new Enemy(
            enemy.x,
            enemy.y,
            enemy.type,
            this.game.isPortrait,
            null,
            false,
            this.game
          )
        );
        this.updateAllEnemiesList();
      }
    }
  }

  handleNormalEnemyWeapons(enemy) {
    // Normal enemies use the shoot method
    if (enemy && typeof enemy.shoot === "function") {
      const bulletCountBefore = this.enemyBullets.length;
      enemy.shoot(this.enemyBullets, this.game.player);
      const bulletCountAfter = this.enemyBullets.length;
      if (bulletCountAfter > bulletCountBefore) {
        console.log(
          `Enemy ${enemy.type} shot ${
            bulletCountAfter - bulletCountBefore
          } bullets`
        );
      }
    } else {
      console.error("Enemy missing shoot method:", enemy);
    }
  }

  // CLEANUP METHODS

  removeDestroyedEnemy(enemy) {
    // Remove from appropriate array
    let removed = false;

    // Check enemies array
    const enemyIndex = this.enemies.indexOf(enemy);
    if (enemyIndex !== -1) {
      this.enemies.splice(enemyIndex, 1);
      removed = true;
    }

    // Check minibosses array
    const miniBossIndex = this.miniBosses.indexOf(enemy);
    if (miniBossIndex !== -1) {
      this.miniBosses.splice(miniBossIndex, 1);
      removed = true;

      // Check if all minibosses defeated
      if (this.miniBosses.length === 0) {
        this.miniBossesDefeated = true;
      }
    }

    // Check if it's the boss
    if (this.boss === enemy) {
      this.boss = null;
      removed = true;
    }

    if (removed) {
      this.updateAllEnemiesList();
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
