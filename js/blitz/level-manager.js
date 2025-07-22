// Level- Handles game phases, spawning, and level progression
import level1Config from './levels/level1-config.js';

export class LevelManager {
  constructor(game) {
    this.game = game;

    // Phase tracking
    this.currentPhaseIndex = 0;
    this.phaseStartTime = 0;
    this.phaseTimer = 0;
    this.executedEvents = new Set(); // Track which events have been executed

    // Enhanced phase tracking for enemy management
    this.phaseEnemyTracking = new Map(); // Track enemies spawned and killed per phase
    this.totalEnemiesSpawned = 0;
    this.totalEnemiesKilled = 0;

    // Legacy cleanup phase tracking (for compatibility)
    this.cleanupPhaseTimer = 0;
    this.cleanupEnemiesExploded = false;
    this.cleanupPowerupsSpawned = false;

    this.powerupSpawnTimer = 0;
    this.metalSpawnTimer = 0;

    // Load level configuration
    this.config = level1Config;
  }

  reset() {
    this.currentPhaseIndex = 0;
    this.phaseStartTime = this.game.state.time;
    this.phaseTimer = 0;
    this.executedEvents.clear();
    
    // Reset enemy tracking
    this.phaseEnemyTracking.clear();
    this.totalEnemiesSpawned = 0;
    this.totalEnemiesKilled = 0;
    this.initializePhaseTracking();
    
    // Legacy compatibility
    this.cleanupPhaseTimer = 0;
    this.cleanupEnemiesExploded = false;
    this.cleanupPowerupsSpawned = false;
  }

  // Initialize tracking for all phases
  initializePhaseTracking() {
    for (let i = 0; i < this.config.phases.length; i++) {
      this.phaseEnemyTracking.set(i, {
        enemiesSpawned: 0,
        enemiesKilled: 0,
        minibossesSpawned: 0,
        minibossesKilled: 0
      });
    }
  }

  // Get enemy configuration with defaults merged in
  getEnemyConfig(enemyName) {
    const baseConfig = this.config.enemies[enemyName];
    if (!baseConfig) return null;
    
    // Merge with defaults
    return {
      ...this.config.enemies.defaults,
      ...baseConfig
    };
  }

  // Get player weapon configuration for a specific level
  getPlayerWeaponConfig(level) {
    // Clamp level between 1 and max available levels
    const clampedLevel = Math.max(1, Math.min(level, this.config.player.levels.length));
    const levelConfig = this.config.player.levels[clampedLevel - 1]; // Convert to 0-based index
    
    if (!levelConfig) {
      console.warn(`No weapon config found for level ${level}, using level 1`);
      return this.config.player.levels[0];
    }
    
    return levelConfig;
  }

  // Get player bullet speed for current weapon level (used by autoaimer)
  getPlayerBulletSpeed(level) {
    const weaponConfig = this.getPlayerWeaponConfig(level);
    const firstProjectile = weaponConfig.projectiles[0];
    return firstProjectile ? firstProjectile.speed : this.config.player.bulletSpeed;
  }

  // Get player fire rate for current weapon level
  getPlayerFireRate(level) {
    const weaponConfig = this.getPlayerWeaponConfig(level);
    return weaponConfig.fireRate || 15;
  }

  // Get player secondary weapon configuration for a specific level
  getPlayerSecondaryWeaponConfig(level) {
    // Clamp level between 0 and max available secondary levels
    const clampedLevel = Math.max(0, Math.min(level, this.config.player.secondaryLevels.length - 1));
    const levelConfig = this.config.player.secondaryLevels[clampedLevel]; // Already 0-based index
    
    if (!levelConfig) {
      console.warn(`No secondary weapon config found for level ${level}, using level 0`);
      return this.config.player.secondaryLevels[0];
    }
    
    return levelConfig;
  }

  // Get current phase configuration
  getCurrentPhase() {
    return this.config.phases[this.currentPhaseIndex] || this.config.phases[0];
  }

  // Get current phase number (1-based for compatibility)
  get phase() {
    return this.getCurrentPhase().id;
  }

  // Track enemy spawning
  trackEnemySpawned(enemyType) {
    const phaseTracking = this.phaseEnemyTracking.get(this.currentPhaseIndex);
    if (phaseTracking) {
      if (enemyType && (enemyType.includes('boss') || enemyType.includes('miniboss'))) {
        phaseTracking.minibossesSpawned++;
      } else {
        phaseTracking.enemiesSpawned++;
      }
    }
    this.totalEnemiesSpawned++;
  }

  // Track enemy death
  trackEnemyKilled(enemyType) {
    const phaseTracking = this.phaseEnemyTracking.get(this.currentPhaseIndex);
    if (phaseTracking) {
      if (enemyType && (enemyType.includes('boss') || enemyType.includes('miniboss'))) {
        phaseTracking.minibossesKilled++;
      } else {
        phaseTracking.enemiesKilled++;
      }
    }
    this.totalEnemiesKilled++;
  }

  // Check if all enemies in current phase are cleared
  areEnemiesClearedForPhase() {
    const currentEnemyCount = this.game.entities.getEnemyCount();
    const currentMinibossCount = this.game.entities.getMiniBossCount();
    const phaseTracking = this.phaseEnemyTracking.get(this.currentPhaseIndex);
    const currentPhase = this.getCurrentPhase();
    
    // No enemies currently alive
    const noEnemiesAlive = currentEnemyCount === 0 && currentMinibossCount === 0;
    
    // Check if this phase is supposed to spawn enemies
    const phaseHasEnemies = Object.keys(currentPhase.enemies || {}).length > 0 || 
                           currentPhase.events.some(event => event.type === 'spawn_enemy');
    
    if (!phaseHasEnemies) {
      // Phase with no enemies - consider cleared if no enemies alive from previous phases
      return noEnemiesAlive;
    }
    
    // At least some enemies were spawned in this phase
    const enemiesWereSpawned = phaseTracking && 
      (phaseTracking.enemiesSpawned > 0 || phaseTracking.minibossesSpawned > 0);
    
    // No future enemy spawn events pending
    const noFutureSpawns = this.noFutureEnemySpawnsRemaining();
    
    return noEnemiesAlive && enemiesWereSpawned && noFutureSpawns;
  }

  // Check if there are any future enemy spawn events still to execute
  noFutureEnemySpawnsRemaining() {
    const currentPhase = this.getCurrentPhase();
    
    for (const event of currentPhase.events) {
      // Skip if already executed and marked as onlyOnce
      const eventKey = `${this.currentPhaseIndex}-${event.type}-${event.condition}-${event.value}-${event.enemyId || ''}`;
      if (event.onlyOnce && this.executedEvents.has(eventKey)) {
        continue;
      }

      // Check if this is a future enemy spawn event
      if (event.type === 'spawn_enemy') {
        let willExecute = false;
        
        switch (event.condition) {
          case "phase_start":
            willExecute = this.phaseTimer < event.value;
            break;
          case "time":
            willExecute = this.phaseTimer < event.value;
            break;
          case "enemies_cleared":
            // This type of event won't spawn enemies, so skip
            break;
        }
        
        if (willExecute) {
          return false; // Future enemy spawn found
        }
      }
    }
    
    return true; // No future enemy spawns
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
      const eventKey = `${this.currentPhaseIndex}-${event.type}-${event.condition}-${event.value}-${event.enemyId || ''}`;
      
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
          shouldExecute = this.areEnemiesClearedForPhase() &&
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
      case "spawn_enemy":
        if (event.enemyId) {
          this.game.entities.spawnCustomEnemy(event.enemyId, this.config.enemies[event.enemyId]);
          this.trackEnemySpawned(event.enemyId);
        }
        break;
      case "explode_enemies":
        this.explodeRemainingEnemies();
        break;
      case "spawn_powerups":
        this.spawnCleanupPowerups();
        break;
      case "trigger_dialog":
        this.game.dialog.show();
        break;
    }
  }

  handleSpawning() {
    const currentPhase = this.getCurrentPhase();

    // Spawn powerups
    if (currentPhase.powerupEnabled) {
      this.powerupSpawnTimer++;
      if (this.powerupSpawnTimer > currentPhase.powerupSpawnRate + Math.random() * this.config.world.powerupSpawnVariance) {
        this.game.entities.spawnPowerup(currentPhase);
        this.powerupSpawnTimer = 0;
      }
    }

    // Spawn metals
    if (currentPhase.metalEnabled) {
      this.metalSpawnTimer++;
      if (this.metalSpawnTimer > currentPhase.metalSpawnRate + Math.random() * this.config.world.metalSpawnVariance) {
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

    // Spawn enemies using new phase-specific enemy configuration
    this.handlePhaseEnemySpawning(currentPhase);
  }

  // Handle enemy spawning using phase-specific configurations
  handlePhaseEnemySpawning(currentPhase) {
    const phaseEnemies = Object.keys(currentPhase.enemies);
    if (phaseEnemies.length === 0) return;

    // Check each enemy type for spawning
    for (const enemyName of phaseEnemies) {
      const phaseEnemyConfig = currentPhase.enemies[enemyName];
      const spawnRate = this.calculatePhaseEnemySpawnRate(phaseEnemyConfig);
      
      if (!this.game[`${enemyName}SpawnTimer`]) {
        this.game[`${enemyName}SpawnTimer`] = 0;
      }
      
      this.game[`${enemyName}SpawnTimer`]++;
      
      if (this.game[`${enemyName}SpawnTimer`] > spawnRate) {
        // Check weight-based probability
        if (Math.random() < (phaseEnemyConfig.weight || 1.0)) {
          console.log(`Spawning phase enemy: ${enemyName}, timer=${this.game[`${enemyName}SpawnTimer`]}, rate=${spawnRate}`);
          this.trackEnemySpawned(enemyName);
          this.game.entities.spawnCustomEnemy(enemyName, this.getEnemyConfig(enemyName));
          this.game[`${enemyName}SpawnTimer`] = 0;
        }
      }
    }
  }

  calculatePhaseEnemySpawnRate(phaseEnemyConfig) {
    const spawnConfig = phaseEnemyConfig.spawnRate;
    if (!spawnConfig) return 150; // Default spawn rate
    
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
        shouldTransition = this.areEnemiesClearedForPhase();
        break;
      case "miniboss_defeated":
        // Use the same consolidated logic as enemies_cleared
        // This consolidates both miniboss_defeated and enemies_cleared conditions
        shouldTransition = this.areEnemiesClearedForPhase();
        break;
      case "boss_defeated":
        shouldTransition = this.game.entities.boss && this.game.entities.boss.isDefeated;
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
