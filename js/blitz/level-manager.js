// Level- Handles game phases, spawning, and level progression
export class LevelManager {
  constructor(game) {
    this.game = game;

    // Phase tracking
    this.currentPhaseIndex = 0;
    this.phaseStartTime = 0;
    this.phaseTimer = 0;
    this.executedEvents = new Set(); // Track which events have been executed

    // Legacy cleanup phase tracking (for compatibility)
    this.cleanupPhaseTimer = 0;
    this.cleanupEnemiesExploded = false;
    this.cleanupPowerupsSpawned = false;

    this.powerupSpawnTimer = 0;
    this.metalSpawnTimer = 0;

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
      powerupSpawnRate: 1000,
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

      // Configurable game phases
      phases: [
        {
          // Phase 1: Early game - basic enemies and asteroids
          id: 1,
          type: "basic",
          name: "Initial Assault",
          
          transitionCondition: "time",
          transitionValue: 20000, // 20 seconds
          
          enemySpawnRate: {
            base: 150,
            variance: 30,
            timeModifier: {
              enabled: true,
              startTime: 0,
              endTime: 20000,
              startRate: 150,
              endRate: 90
            }
          },
          asteroidSpawnRate: 120,
          powerupSpawnRate: 500,
          metalSpawnRate: 1800,
          
          enemyTypes: ["straight", "sine", "zigzag", "dive"],
          asteroidTypes: ["small", "medium", "large"],
          powerupEnabled: true,
          metalEnabled: true,
          
          events: []
        },
        {
          // Phase 2: First miniboss - single miniboss encounter
          id: 2,
          type: "basic",
          name: "First Guardian",
          
          transitionCondition: "miniboss_defeated",
          transitionValue: null,
          
          enemySpawnRate: {
            base: 400, // Slower enemy spawns during miniboss
            variance: 50
          },
          asteroidSpawnRate: 200,
          powerupSpawnRate: 300,
          metalSpawnRate: 1800,
          
          enemyTypes: ["straight", "sine", "zigzag"],
          asteroidTypes: ["small", "medium", "large"],
          powerupEnabled: true,
          metalEnabled: true,
          
          events: [
            {
              type: "spawn_single_miniboss",
              condition: "time",
              value: 3000, // 3 seconds into phase
              onlyOnce: true
            }
          ]
        },
        {
          // Phase 3: Asteroid storm - lots of asteroids, no enemies
          id: 3,
          type: "basic",
          name: "Asteroid Storm",
          
          transitionCondition: "time",
          transitionValue: 15000, // 15 seconds of asteroid storm
          
          enemySpawnRate: {
            base: 999999 // No enemies
          },
          asteroidSpawnRate: 40, // Very fast asteroid spawning
          powerupSpawnRate: 200,
          metalSpawnRate: 999999,
          
          enemyTypes: [],
          asteroidTypes: ["small", "medium", "large"],
          powerupEnabled: true,
          metalEnabled: false,
          
          events: []
        },
        {
          // Phase 4: Dual minibosses - both minibosses spawn
          id: 4,
          type: "basic",
          name: "Twin Guardians",
          
          transitionCondition: "miniboss_defeated",
          transitionValue: null,
          
          enemySpawnRate: {
            base: 500, // Very slow enemy spawns during dual miniboss fight
            variance: 100
          },
          asteroidSpawnRate: 300,
          powerupSpawnRate: 250,
          metalSpawnRate: 2000,
          
          enemyTypes: ["straight", "circle"],
          asteroidTypes: ["small", "medium"],
          powerupEnabled: true,
          metalEnabled: true,
          
          events: [
            {
              type: "spawn_miniboss",
              condition: "time",
              value: 3000, // 3 seconds into phase
              onlyOnce: true
            }
          ]
        },
        {
          // Phase 5: Second asteroid storm
          id: 5,
          type: "basic",
          name: "Final Storm",
          
          transitionCondition: "time",
          transitionValue: 12000, // 12 seconds of final asteroid storm
          
          enemySpawnRate: {
            base: 999999 // No enemies
          },
          asteroidSpawnRate: 35, // Even faster asteroids
          powerupSpawnRate: 150,
          metalSpawnRate: 999999,
          
          enemyTypes: [],
          asteroidTypes: ["small", "medium", "large"],
          powerupEnabled: true,
          metalEnabled: false,
          
          events: []
        },
        {
          // Phase 6: Cleanup phase
          id: 6,
          type: "cleanup", 
          name: "Preparation",
          
          transitionCondition: "time",
          transitionValue: 6000,
          
          enemySpawnRate: {
            base: 999999
          },
          asteroidSpawnRate: 999999, // No asteroids during cleanup
          powerupSpawnRate: 100,
          metalSpawnRate: 999999,
          
          enemyTypes: [],
          asteroidTypes: [],
          powerupEnabled: true,
          metalEnabled: false,
          
          events: [
            {
              type: "explode_remaining_enemies",
              condition: "phase_start",
              value: 0,
              onlyOnce: true
            },
            {
              type: "spawn_powerups",
              condition: "time",
              value: 2000,
              onlyOnce: true
            }
          ]
        },
        {
          // Phase 7: Boss dialog
          id: 7,
          type: "dialog",
          name: "Boss Approaches",
          
          transitionCondition: "dialog_complete",
          transitionValue: null,
          
          enemySpawnRate: {
            base: 999999
          },
          asteroidSpawnRate: 999999,
          powerupSpawnRate: 999999,
          metalSpawnRate: 999999,
          
          enemyTypes: [],
          asteroidTypes: [],
          powerupEnabled: false,
          metalEnabled: false,
          
          events: [
            {
              type: "trigger_dialog",
              condition: "enemies_cleared",
              value: 0,
              onlyOnce: true
            }
          ]
        },
        {
          // Phase 8: Boss fight
          id: 8,
          type: "boss",
          name: "Final Confrontation",
          
          transitionCondition: "boss_defeated",
          transitionValue: null,
          
          enemySpawnRate: {
            base: 999999
          },
          asteroidSpawnRate: 999999,
          powerupSpawnRate: 200,
          metalSpawnRate: 999999,
          
          enemyTypes: [],
          asteroidTypes: [],
          powerupEnabled: true,
          metalEnabled: false,
          
          events: [
            {
              type: "spawn_boss",
              condition: "phase_start",
              value: 0,
              onlyOnce: true
            }
          ]
        }
      ],
    };
  }

  reset() {
    this.currentPhaseIndex = 0;
    this.phaseStartTime = this.game.state.time;
    this.phaseTimer = 0;
    this.executedEvents.clear();
    
    // Legacy compatibility
    this.cleanupPhaseTimer = 0;
    this.cleanupEnemiesExploded = false;
    this.cleanupPowerupsSpawned = false;
  }

  // Get current phase configuration
  getCurrentPhase() {
    return this.config.phases[this.currentPhaseIndex] || this.config.phases[0];
  }

  // Get current phase number (1-based for compatibility)
  get phase() {
    return this.getCurrentPhase().id;
  }

  update(deltaTime) {
    // Update phase timer
    this.phaseTimer += deltaTime;
    const currentPhase = this.getCurrentPhase();

    // Handle phase events
    this.handlePhaseEvents();

    // Handle spawning based on current phase configuration
    this.handleSpawning();

    // Check for phase transitions
    this.checkPhaseTransitions();

    // Handle special phase logic
    this.handleSpecialPhaseLogic(deltaTime);
  }

  handlePhaseEvents() {
    const currentPhase = this.getCurrentPhase();
    
    for (const event of currentPhase.events) {
      const eventKey = `${this.currentPhaseIndex}-${event.type}-${event.condition}-${event.value}`;
      
      // Skip if already executed and marked as onlyOnce
      if (event.onlyOnce && this.executedEvents.has(eventKey)) {
        continue;
      }

      let shouldExecute = false;

      switch (event.condition) {
        case "phase_start":
          shouldExecute = this.phaseTimer >= event.value;
          break;
        case "time":
          shouldExecute = this.phaseTimer >= event.value;
          break;
        case "enemies_cleared":
          shouldExecute = this.game.entities.getEnemyCount() === 0 &&
                         this.game.entities.enemyBullets.length === 0 &&
                         this.game.entities.enemyLasers.length === 0;
          break;
      }

      if (shouldExecute) {
        this.executeEvent(event);
        if (event.onlyOnce) {
          this.executedEvents.add(eventKey);
        }
      }
    }
  }

  executeEvent(event) {
    console.log(`Executing event: ${event.type} in phase ${this.phase}`);
    
    switch (event.type) {
      case "spawn_single_miniboss":
        if (this.game.entities.getMiniBossCount() === 0 && !this.game.entities.miniBossesDefeated) {
          this.game.entities.spawnSingleMiniBoss();
        }
        break;
      case "spawn_miniboss":
        if (this.game.entities.getMiniBossCount() === 0 && !this.game.entities.miniBossesDefeated) {
          this.game.entities.spawnMiniBosses();
        }
        break;
      case "explode_remaining_enemies":
        this.explodeRemainingEnemies();
        break;
      case "spawn_powerups":
        this.spawnCleanupPowerups();
        break;
      case "trigger_dialog":
        this.game.dialog.show();
        break;
      case "spawn_boss":
        this.game.entities.spawnBoss();
        break;
    }
  }

  handleSpawning() {
    const currentPhase = this.getCurrentPhase();

    // Spawn powerups
    if (currentPhase.powerupEnabled) {
      this.powerupSpawnTimer++;
      if (this.powerupSpawnTimer > currentPhase.powerupSpawnRate + Math.random() * this.config.powerupSpawnVariance) {
        this.game.entities.spawnPowerup();
        this.powerupSpawnTimer = 0;
      }
    }

    // Spawn metals
    if (currentPhase.metalEnabled) {
      this.metalSpawnTimer++;
      if (this.metalSpawnTimer > currentPhase.metalSpawnRate + Math.random() * this.config.metalSpawnVariance) {
        this.game.entities.spawnMetal();
        this.metalSpawnTimer = 0;
      }
    }

    // Spawn asteroids
    if (currentPhase.asteroidTypes.length > 0) {
      this.game.asteroidSpawnTimer++;
      if (this.game.asteroidSpawnTimer > currentPhase.asteroidSpawnRate) {
        const types = currentPhase.asteroidTypes;
        const type = types[Math.floor(Math.random() * types.length)];
        this.game.entities.spawnAsteroid(type);
        this.game.asteroidSpawnTimer = 0;
      }
    }

    // Spawn enemies
    if (currentPhase.enemyTypes.length > 0) {
      this.game.enemySpawnTimer++;
      const enemySpawnRate = this.calculateEnemySpawnRate();
      if (this.game.enemySpawnTimer > enemySpawnRate) {
        console.log(`Spawning enemy: phase=${this.phase}, timer=${this.game.enemySpawnTimer}, rate=${enemySpawnRate}`);
        this.game.entities.spawnEnemy();
        this.game.enemySpawnTimer = 0;
      }
    }
  }

  calculateEnemySpawnRate() {
    const currentPhase = this.getCurrentPhase();
    const spawnConfig = currentPhase.enemySpawnRate;
    
    let rate = spawnConfig.base;
    
    // Apply variance
    if (spawnConfig.variance) {
      rate += (Math.random() - 0.5) * spawnConfig.variance * 2;
    }
    
    // Apply time modifier
    if (spawnConfig.timeModifier && spawnConfig.timeModifier.enabled) {
      const tm = spawnConfig.timeModifier;
      const progress = Math.min(1, this.phaseTimer / (tm.endTime - tm.startTime));
      rate = tm.startRate + (tm.endRate - tm.startRate) * progress;
    }
    
    return Math.max(1, Math.floor(rate));
  }

  checkPhaseTransitions() {
    const currentPhase = this.getCurrentPhase();
    let shouldTransition = false;

    switch (currentPhase.transitionCondition) {
      case "time":
        shouldTransition = this.phaseTimer >= currentPhase.transitionValue;
        break;
      case "enemies_cleared":
        shouldTransition = this.game.entities.getEnemyCount() === 0;
        break;
      case "miniboss_defeated":
        shouldTransition = this.game.entities.miniBossesDefeated;
        break;
      case "boss_defeated":
        shouldTransition = this.game.entities.boss && this.game.entities.boss.health <= 0;
        break;
      case "dialog_complete":
        shouldTransition = this.game.dialog && !this.game.dialog.isActive;
        break;
    }

    if (shouldTransition && this.currentPhaseIndex < this.config.phases.length - 1) {
      this.transitionToNextPhase();
    }
  }

  transitionToNextPhase() {
    const oldPhase = this.getCurrentPhase();
    this.currentPhaseIndex++;
    const newPhase = this.getCurrentPhase();
    
    this.phaseTimer = 0;
    this.phaseStartTime = this.game.state.time;
    
    console.log(`Phase transition: ${oldPhase.name} (${oldPhase.id}) → ${newPhase.name} (${newPhase.id})`);
  }

  handleSpecialPhaseLogic(deltaTime) {
    const currentPhase = this.getCurrentPhase();
    
    if (currentPhase.type === "cleanup") {
      this.handleCleanupPhase(deltaTime);
    }
  }

  // Helper methods for event execution
  explodeRemainingEnemies() {
    if (!this.cleanupEnemiesExploded) {
      this.cleanupEnemiesExploded = true;
      for (let i = this.game.entities.getEnemyCount() - 1; i >= 0; i--) {
        const enemy = this.game.entities.enemies[i];
        this.game.effects.createEnemyExplosion(enemy.x, enemy.y);
        this.game.effects.createDebris(enemy.x, enemy.y, "#ffaa00", 15);
      }
      // Clear all enemies immediately
      this.game.entities.enemies.length = 0;
      this.game.entities.updateAllEnemiesList();
    }
  }

  spawnCleanupPowerups() {
    if (!this.cleanupPowerupsSpawned) {
      this.game.entities.spawnPowerup();
      this.game.entities.spawnPowerup();
      this.cleanupPowerupsSpawned = true;
    }
  }

  handleCleanupPhase(deltaTime) {
    this.cleanupPhaseTimer += deltaTime;
    // Legacy method - most cleanup logic is now handled by the configurable phase system
  }
}
