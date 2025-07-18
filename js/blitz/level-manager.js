// Level- Handles game phases, spawning, and level progression
export class LevelManager {
  constructor(game) {
    this.game = game;

    // Cleanup phase tracking
    this.cleanupPhaseTimer = 0;
    this.cleanupEnemiesExploded = false;
    this.cleanupPowerupsSpawned = false;

    this.powerupSpawnTimer = 0;
    this.metalSpawnTimer = 0;

    this.phase = 1;

    // Game constants - configurable for dynamic difficulty
    this.config = {
      // Player settings
      dashDistance: 150,
      dashFrames: 40,

      // Enemy settings
      enemySpawnRate: 0.02,
      enemySpeed: 2,
      enemySize: 24,

      // Bullet settings
      fastBulletSpeed: 16,
      bulletSpeed: 8,
      laserSpeed: 80,
      bulletSize: 6,
      playerBulletSize: 15,
      playerLaserSize: 10,
      playerLaserSpeed: 80,
      playerSpeed: 6,
      playerSize: 10,
      playerHitbox: 6,

      // Laser entity settings
      laserWidth: 8,
      laserLength: 100,
      laserLife: 600,

      // Explosion settings
      explosionParticles: 12,
      explosionSpeed: 4,
      explosionLife: 80,
      enemyExplosionScale: 3,

      // Asteroid settings
      asteroidSpawnRate: 0.01,
      asteroidSpeed: 1,
      asteroidSize: 40,

      // Powerup settings
      powerupSize: 25,
      powerupSpeed: 1,

      // Metal settings
      metalSize: 60,
      metalThickness: 6,
      metalSpeed: 0.5,

      // Audio settings
      audioVolume: 0.1,
      musicVolume: 0.3,

      // Colors
      starColors: [
        "#a6b3ff",
        "#c3a6ff",
        "#f3a6ff",
        "#ffa6f8",
        "#ffa6c7",
        "#ff528e",
        "#d98cff",
        "#ff8c00",
        "#ffffff",
        "#ffff88",
      ],
      enemyRandomColors: [
        "#ffffff", // White
        "#ff0000", // Red
        "#800080", // Purple
        "#ff8800", // Orange
        "#ffff00", // Yellow
      ],
      powerupColors: {
        shield: "#00aaff",
        mainWeapon: "#8844ff",
        sideWeapon: "#00ccaa",
        secondShip: "#44ff44",
        bomb: "#ff4444",
      },

      // Enemy and powerup types
      enemyTypes: ["straight", "sine", "zigzag", "circle", "dive", "laser"],
      powerupTypes: [
        "shield",
        "mainWeapon",
        "sideWeapon",
        "secondShip",
        "bomb",
        "rainbowStar"
      ],
      // Spawn rates and timers
      powerupSpawnRate: 100,
      powerupSpawnVariance: 1800,
      metalSpawnRate: 1800,
      metalSpawnVariance: 2400,

      // Player weapon cooldowns
      playerHomingMissileCooldown: 60,
      playerShieldCooldownMax: 300,

      // Player weapon firing rates by level
      playerLevel1FireRate: 15,
      playerLevel2FireRate: 10,
      playerLevel3FireRate: 7,
      playerLevel4FireRate: 5,
      playerLevel5FireRate: 3,
      playerRainbowInvulnerableTime: 360,
      playerShieldDuration: 60,

      // Enemy shooting cooldowns
      enemyShootCooldown: 60,
      enemyLaserCooldown: 60,
      enemyCircleShootCooldown: 600,
      enemySquareCornerCooldown: 60,
      enemyZigzagShootCooldown: 180,

      // Enemy movement timers
      enemyZigzagTimer: 30,
      enemyFadeInTime: 60,
      enemyCloneInterval: 150,
      enemyDiveLockDuration: 60,
      enemyLaserChargeTime: 60,
      enemyLaserPreviewTime: 90,
      enemyLaserFiringTime: 60,
      enemyPulseInterval: 240,
      enemyPulseVariance: 120,

      // MiniBoss cooldowns
      miniBossPrimaryWeaponCooldown: 60,
      miniBossSecondaryWeaponCooldown: 90,
      miniBossCircularWeaponCooldown: 120,
      miniBossBurstWeaponCooldown: 90,
      miniBossEnemySpawnCooldown: 200,
      miniBossInvulnerableDuration: 180,
      miniBossDeathDuration: 30,
      miniBossDeathExplosionInterval: 3,
      miniBossSize: 90,
      miniBossMaxHealth: 100,
      miniBossShield: 50,
      miniBossMaxShield: 50,
      miniBossPatrolRange: 150,
      miniBossTargetYPortrait: 150,
      miniBossTargetXLandscape: 150,
      miniBossSecondaryWeaponChargeTime: 60,

      // Boss cooldowns
      bossEnemySpawnCooldown: 180,
      bossLeftArmCooldown: 120,
      bossRightArmCooldown: 90,
      bossMouthTimer: 60,
      bossLaserChargeTime: 60,
      bossLaserPreviewTime: 90,
      bossLaserSweepDuration: 360,
      bossSize: 120,
      bossPatrolRange: 150,
      bossLaserSweepMaxChargeTime: 120,
      bossCoreLength: 60,

      // State management timers
      timeSlowDuration: 300,
      timeSlowCooldownMax: 900,
      shieldFlashDuration: 30,
      timeSlowFlashDuration: 30,
      rainbowInvulnerableTime: 0,

      // Cleanup phase timers
      cleanupPhaseMinTime: 5000,
      cleanupPhaseMaxTime: 6000,

      // Autoplayer timers
      autoplayShieldTimer: 180,
      autoplaySlowTimer: 240,
      autoplayBombTimer: 180,
      autoplayShieldTimerBoss: 120,
      autoplaySlowTimerBoss: 180,

      // Death animation timers
      deathAnimationDuration: 240,
      deathFadeOutTime: 60,

      // Continuous laser beam timers
      laserWarningTime: 0,

      // Entity lifetimes and animation
      particleLife: 60,
      particleMaxLife: 60,
      floatingTextLife: 60,
      bulletLife: 2000,

      // Entity sizes and physics
      barWidth: 60,

      // Asteroid spawn rates by phase
      asteroidSpawnRates: {
        phase1: 120,
        phase2: 180,
        phase3: 80,
        phase4: 999999,
      },

      // Enemy spawn rates by phase
      enemySpawnRates: {
        phase1Early: 150,
        phase1Mid: 120,
        phase1Late: 90,
        phase1EarlyMultiplier: 1.25,
        phase2: 300,
        phase3: 999999,
        phase4: 90,
      },
    };
  }

  reset() {
    this.phase = 1;
    this.cleanupPhaseTimer = 0;
    this.cleanupEnemiesExploded = false;
    this.cleanupPowerupsSpawned = false;
  }

  update(deltaTime) {
    // Spawn powerups occasionally
    this.powerupSpawnTimer++;
    if (
      this.powerupSpawnTimer >
      this.config.powerupSpawnRate +
        Math.random() * this.config.powerupSpawnVariance
    ) {
      this.game.entities.spawnPowerup();
      this.powerupSpawnTimer = 0;
    }

    // Spawn metals during phases 1 and 2
    if (this.phase >= 1 && this.phase <= 2) {
      this.metalSpawnTimer++;
      if (
        this.metalSpawnTimer >
        this.config.metalSpawnRate +
          Math.random() * this.config.metalSpawnVariance
      ) {
        // Less frequent than powerups
        this.game.entities.spawnMetal();
        this.metalSpawnTimer = 0;
      }
    }

    // Game progression phases
    this.updateGamePhase();

    // Spawn asteroids based on current phase
    this.game.asteroidSpawnTimer++;
    const asteroidSpawnRate = this.getAsteroidSpawnRate();
    if (this.game.asteroidSpawnTimer > asteroidSpawnRate) {
      const rand = Math.random();
      let type = "medium";
      if (rand < 0.1) {
        type = "large";
      } else if (rand > 0.8) {
        type = "small";
      }
      this.game.entities.spawnAsteroid(type);
      this.game.asteroidSpawnTimer = 0;
    }

    // Spawn enemies based on current phase
    this.game.enemySpawnTimer++;
    const enemySpawnRate = this.getEnemySpawnRate();
    if (
      this.game.enemySpawnTimer > enemySpawnRate &&
      this.phase >= 1 &&
      this.phase <= 2
    ) {
      console.log(
        `Spawning enemy: phase=${this.phase}, timer=${this.game.enemySpawnTimer}, rate=${enemySpawnRate}`
      );
      this.game.entities.spawnEnemy();
      this.game.enemySpawnTimer = 0;
    }

    // Check for mini-boss spawn at 30 seconds
    if (
      this.game.state.time >= 30 &&
      this.phase === 2 &&
      this.game.entities.getMiniBossCount() === 0 &&
      !this.game.entities.miniBossesDefeated
    ) {
      this.game.entities.spawnMiniBosses();
    }

    // Handle Phase 3: Cleanup phase after minibosses are defeated
    if (this.phase === 3) {
      this.handleCleanupPhase(deltaTime);
    }

    // Handle Phase 4: Boss dialog
    if (this.phase === 4) {
      // Wait for all enemies and projectiles to clear before starting boss dialog
      if (
        this.game.entities.getEnemyCount() === 0 &&
        this.game.entities.asteroids.length === 0 &&
        this.game.entities.enemyBullets.length === 0 &&
        this.game.entities.enemyLasers.length === 0
      ) {
        this.game.dialog.show();
      }
    }
  }

  updateGamePhase() {
    // Only auto-advance to phase 2 at 30 seconds if still in phase 1
    if (this.game.state.time < 30 && this.phase === 1) {
      // Stay in phase 1: 0-30s asteroids and enemies
    } else if (this.game.state.time >= 30 && this.phase === 1) {
      // Auto-advance to phase 2 only if we're still in phase 1
      this.phase = 2; // Phase 2: Time to spawn minibosses
    }
    // All other phase transitions are handled manually in other parts of code
  }

  getAsteroidSpawnRate() {
    switch (this.phase) {
      case 1:
        return this.config.asteroidSpawnRates.phase1;
      case 2:
        return this.config.asteroidSpawnRates.phase2;
      case 3:
        return this.config.asteroidSpawnRates.phase3;
      case 4:
        return this.config.asteroidSpawnRates.phase4;
      default:
        return this.config.asteroidSpawnRates.phase1;
    }
  }

  getEnemySpawnRate() {
    let baseRate;
    switch (this.phase) {
      case 1:
        if (this.game.state.time < 10) {
          baseRate = this.config.enemySpawnRates.phase1Early;
        } else if (this.game.state.time < 20) {
          baseRate = this.config.enemySpawnRates.phase1Mid;
        } else {
          baseRate = this.config.enemySpawnRates.phase1Late;
        }
        // Reduce spawn rate by 20% for the first 30 seconds
        if (this.game.state.time < 30) {
          return baseRate * this.config.enemySpawnRates.phase1EarlyMultiplier;
        } else {
          return baseRate;
        }
      case 2:
        return this.config.enemySpawnRates.phase2;
      case 3:
        return this.config.enemySpawnRates.phase3;
      case 4:
        return this.config.enemySpawnRates.phase4;
      default:
        return this.config.enemySpawnRates.phase1Mid;
    }
  }

  handleCleanupPhase(deltaTime) {
    this.cleanupPhaseTimer += deltaTime;

    // Explode all remaining enemies once at the start of cleanup
    if (!this.cleanupEnemiesExploded) {
      this.cleanupEnemiesExploded = true;
      for (let i = this.game.entities.getEnemyCount() - 1; i >= 0; i--) {
        const enemy = this.game.entities.enemies[i];
        this.game.effects.createEnemyExplosion(enemy.x, enemy.y);
        this.game.effects.createDebris(
          enemy.x,
          enemy.y,
          "#ffaa00",
          15 // More debris for enemies
        );
      }
      // Clear all enemies immediately
      this.game.entities.enemies.length = 0;
      this.game.entities.updateAllEnemiesList();
    }

    // Spawn powerups for the cleanup phase
    if (this.cleanupPhaseTimer >= this.config.cleanupPhaseMinTime) {
      if (!this.cleanupPowerupsSpawned) {
        this.game.entities.spawnPowerup();
        this.game.entities.spawnPowerup();
        this.cleanupPowerupsSpawned = true;
      }
      if (this.cleanupPhaseTimer >= this.config.cleanupPhaseMaxTime) {
        this.phase = 4; // Move to boss dialog phase
      }
    }
  }
}
