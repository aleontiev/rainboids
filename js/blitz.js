// BlitzRain - A bullet hell space shooter
import { Player } from "./blitz/entities/player.js";
import { InputHandler } from "./blitz/input.js";
import { ProgressView } from "./blitz/progress-view.js";
import { ActionsView } from "./blitz/actions-view.js";
import { EffectsManager } from "./blitz/effects-manager.js";
import { AudioManager } from "./blitz/audio-manager.js";
import { LevelManager } from "./blitz/level-manager.js";
import { CheatManager } from "./blitz/cheat-manager.js";
import { BackgroundManager } from "./blitz/background-manager.js";
import { DeathManager } from "./blitz/death-manager.js";
import { DialogManager } from "./blitz/dialog-manager.js";
import { EntityManager } from "./blitz/entity-manager.js";
import { CollisionManager } from "./blitz/collision-manager.js";
import { GameLoopManager } from "./blitz/game-loop-manager.js";
import { PowerupManager } from "./blitz/powerup-manager.js";
import { RendererFactory } from "./blitz/renderers/renderer-factory.js";
import { SettingsManager } from "./blitz/settings-manager.js";
// UIRenderer functionality moved to Renderer
import { PlayerManager } from "./blitz/player-manager.js";
import { ControlManager } from "./blitz/control-manager.js";
import { IconManager } from "./blitz/icon-manager.js";
import { State } from "./blitz/game-state.js";

class BlitzGame {
  constructor() {
    window.blitz = this; // Make game accessible for sound effects

    // Initialize settings manager first
    this.settings = new SettingsManager();

    // Get canvas element - all other UI is now canvas-based
    this.canvas = document.getElementById("gameCanvas");
    
    // Initialize renderer using factory
    try {
      this.renderer = RendererFactory.createRenderer(this, this.canvas, this.settings);
      this.ctx = this.renderer.getContext(); // Get appropriate context from renderer
      console.log(`Game initialized with ${this.renderer.type} renderer`);
    } catch (error) {
      console.error('Failed to initialize renderer:', error);
      // Fallback to emergency Canvas renderer
      this.ctx = this.canvas.getContext("2d");
      console.warn('Using emergency fallback Canvas context');
    }
    
    this.input = new InputHandler(this.canvas, this);
    this.progress = new ProgressView(this);
    this.actions = new ActionsView(this);
    // Check URL parameters for level selection
    const urlParams = new URLSearchParams(window.location.search);
    const levelNumber = parseInt(urlParams.get('level')) || 1;
    this.level = new LevelManager(this, levelNumber);
    this.death = new DeathManager(this);
    this.background = new BackgroundManager(this);
    this.cheats = new CheatManager(this);
    this.effects = new EffectsManager(this);
    this.audio = new AudioManager(this);
    this.dialog = new DialogManager(this);
    this.entities = new EntityManager(this);
    this.collisions = new CollisionManager(this);
    this.gameLoop = new GameLoopManager(this);
    this.powerup = new PowerupManager(this);
    // UI functionality now handled by renderer
    this.playerManager = new PlayerManager(this);
    this.state = new State(this);
    this.controls = new ControlManager(this);
    this.icons = new IconManager(this);
    this.resize();

    this.icons.setup();
    this.controls.setup();
    this.background.setup();
    this.audio.setup();
    this.cheats.setup();
    this.dialog.setup();
    this.reset();
    this.gameLoop.start();
    this.audio.ready();
  }

  reset() {
    document.body.classList.add("game-ready");
    document.body.style.display = "block";
    this.state.reset();
    this.opacity = 1.0;
    this.cheats.used = false; // Reset cheat tracking for new game

    let playerX, playerY;
    if (this.isPortrait) {
      playerX = this.canvas.width / 2;
      playerY = this.canvas.height - 100; // Bottom center
    } else {
      playerX = 100; // Left side
      playerY = this.canvas.height / 2; // Center
    }
    this.player = new Player(playerX, playerY, this);

    // Reset all cheat states
    this.cheats.reset();

    // Reset entity manager
    this.entities.reset();

    // Reset level progression
    this.level.reset();

    this.isMobile = this.detectMobile();

    // Initialize modules
    this.touchActive = false;
    this.touchX = 0;
    this.touchY = 0;

    this.asteroidSpawnTimer = 0;
    this.enemySpawnTimer = 0;

    // Game progression
    // Boss dialog system handled by DialogManager
    this.explosions = [];
    this.textParticles = []; // For score popups

    // New game phase system (miniBossesDefeated removed - now determined dynamically)
    this.miniBossGodModeTimer = 0;
    this.cleanupPhaseTimer = 0;
    this.cleanupPowerupsSpawned = false;
    this.dialog.reset();
  }

  detectMobile() {
    return (
      window.matchMedia &&
      window.matchMedia(
        "(hover: none) and (pointer: coarse), (max-width: 768px)"
      ).matches
    );
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    // Store previous orientation
    const previousOrientation = this.isPortrait;

    // Determine orientation: portrait if height > width
    // This works for both mobile and desktop
    this.isPortrait = this.canvas.height > this.canvas.width;

    // Update renderer with new dimensions
    if (this.renderer && this.renderer.resize) {
      this.renderer.resize(this.canvas.width, this.canvas.height);
    }

    // Reset boss and miniboss positions if orientation changed
    if (previousOrientation !== this.isPortrait) {
      this.repositionEnemies();
    }

    // Regenerate background stars to fill the new screen dimensions
    this.background.setup();
  }
  
  /**
   * Toggle between Canvas and WebGL rendering
   */
  toggleRenderer() {
    const currentWebGL = this.settings.isWebGLEnabled();
    const newWebGL = !currentWebGL;
    
    console.log(`Switching renderer from ${currentWebGL ? 'WebGL' : 'Canvas'} to ${newWebGL ? 'WebGL' : 'Canvas'}`);
    
    // Reset game state to prevent issues
    const wasPlaying = this.state.state === "PLAYING";
    const wasPaused = this.state.state === "PAUSED";
    
    // Stop background music if playing
    if (wasPlaying || wasPaused) {
      this.audio.pauseBackgroundMusic();
    }
    
    // Reset game to initial state
    this.reset();
    this.state.state = "TITLE";
    this.state.firstGameStart = true;
    
    // Hide action buttons for title screen
    this.actions.hide();
    
    try {
      // Update settings
      this.settings.setWebGLEnabled(newWebGL);
      
      // Dispose of current renderer
      if (this.renderer && this.renderer.dispose) {
        this.renderer.dispose();
      }
      
      // For WebGL, we need a fresh canvas since it can't share with 2D context
      if (newWebGL) {
        // Create new canvas for WebGL
        const newCanvas = document.createElement('canvas');
        newCanvas.id = 'gameCanvas';
        newCanvas.width = this.canvas.width;
        newCanvas.height = this.canvas.height;
        newCanvas.style.cssText = this.canvas.style.cssText;
        
        // Replace the old canvas
        this.canvas.parentNode.replaceChild(newCanvas, this.canvas);
        this.canvas = newCanvas;
        
        // Update input handler with new canvas
        this.input.canvas = newCanvas;
        this.input.setupEventListeners();
      } else {
        // Switching back to Canvas - canvas should be fine as-is since WebGL renderer created fresh canvas
        // But let's ensure we have a clean 2D context
        const context = this.canvas.getContext('2d');
        if (!context) {
          // If for some reason we can't get 2D context, create new canvas
          const newCanvas = document.createElement('canvas');
          newCanvas.id = 'gameCanvas';
          newCanvas.width = this.canvas.width;
          newCanvas.height = this.canvas.height;
          newCanvas.style.cssText = this.canvas.style.cssText;
          
          this.canvas.parentNode.replaceChild(newCanvas, this.canvas);
          this.canvas = newCanvas;
          
          // Update input handler with new canvas
          this.input.canvas = newCanvas;
          this.input.setupEventListeners();
        }
      }
      
      // Create new renderer with fresh canvas
      this.renderer = RendererFactory.createRenderer(this, this.canvas, this.settings);
      this.ctx = this.renderer.getContext();
      
      // Update renderer dimensions
      this.renderer.resize(this.canvas.width, this.canvas.height);
      
      // Ensure the background is properly set up for the new renderer
      this.background.setup();
      
      // Reset renderer frame counters and state
      if (this.renderer.animationFrame !== undefined) {
        this.renderer.animationFrame = 0;
      }
      
      // Force an immediate render to ensure the new renderer is working
      try {
        this.renderer.render();
        console.log(`Successfully switched to ${this.renderer.type} renderer`);
      } catch (renderError) {
        console.error('Renderer switch succeeded but render failed:', renderError);
        console.log('Renderer type:', this.renderer.type);
        console.log('Context available:', !!this.renderer.getContext());
      }
      
      return true;
    } catch (error) {
      console.error('Failed to toggle renderer:', error);
      
      // Revert settings on failure
      this.settings.setWebGLEnabled(currentWebGL);
      
      return false;
    }
  }

  repositionEnemies() {
    // Reposition minibosses (check if array exists first)
    if (this.entities.miniBosses && this.entities.getMiniBossCount() > 0) {
      this.entities.miniBosses.forEach((miniBoss, index) => {
        // Update miniboss orientation
        miniBoss.isPortrait = this.isPortrait;

        // Calculate spacing for multiple minibosses
        const spacing = 120; // Distance between minibosses
        const totalMinibosses = this.entities.getMiniBossCount();
        const offset = (index - (totalMinibosses - 1) / 2) * spacing;

        // Instantly snap to new position based on orientation with spacing
        if (this.isPortrait) {
          miniBoss.x = this.canvas.width / 2 + offset; // Center horizontally with spacing
          miniBoss.y = 150; // Top position
          miniBoss.targetX = miniBoss.x;
          miniBoss.targetY = miniBoss.y;
        } else {
          miniBoss.x = this.canvas.width - 150; // Right position
          miniBoss.y = this.canvas.height / 2 + offset; // Center vertically with spacing
          miniBoss.targetX = miniBoss.x;
          miniBoss.targetY = miniBoss.y;
        }

        // Set to patrol mode since we're already in position
        miniBoss.movePattern = "patrol";
        miniBoss.startX = miniBoss.x;
        miniBoss.startY = miniBoss.y;
      });
    }

    // Reposition boss
    if (this.entities.boss) {
      // Update boss orientation
      this.entities.boss.isPortrait = this.isPortrait;
      this.entities.boss.canvasWidth = this.canvas.width;
      this.entities.boss.canvasHeight = this.canvas.height;

      // Instantly snap to new position based on orientation
      if (this.isPortrait) {
        this.entities.boss.x = this.canvas.width / 2; // Center horizontally
        this.entities.boss.y = 200; // Top position
        this.entities.boss.targetX = this.entities.boss.x;
        this.entities.boss.targetY = this.entities.boss.y;
      } else {
        this.entities.boss.x = this.canvas.width - 200; // Right position
        this.entities.boss.y = this.canvas.height / 2; // Center vertically
        this.entities.boss.targetX = this.entities.boss.x;
        this.entities.boss.targetY = this.entities.boss.y;
      }

      // Set to patrol mode since we're already in position
      this.entities.boss.movePattern = "patrol";
      this.entities.boss.startX = this.entities.boss.x;
      this.entities.boss.startY = this.entities.boss.y;
    }
  }

  handleCleanupPhase(deltaTime) {
    this.cleanupPhaseTimer += deltaTime;

    // Explode all remaining enemies immediately (only once)
    if (!this.cleanupEnemiesExploded) {
      this.cleanupEnemiesExploded = true;
      for (let i = this.entities.getEnemyCount() - 1; i >= 0; i--) {
        const enemy = this.entities.enemies[i];
        this.effects.createEnemyExplosion(enemy.x, enemy.y);
        this.entities.enemies.splice(i, 1);
      }
      this.entities.enemyBullets = [];
      this.entities.enemyLasers = [];
    }

    // After 5 seconds, spawn 2 powerups and show boss dialog
    if (this.cleanupPhaseTimer >= 5000) {
      if (!this.cleanupPowerupsSpawned) {
        this.entities.spawnPowerup();
        this.entities.spawnPowerup();
        this.cleanupPowerupsSpawned = true;
      }

      if (this.cleanupPhaseTimer >= 6000) {
        this.level.phase = 4;
        this.dialog.show();
      }
    }
  }

  render() {
    this.renderer.render();
    // UI rendering now handled within renderer.render()
  }

  loop(currentTime) {
    this.gameLoop.loop(currentTime);
  }

  handleEnemyDamage(enemy, damage, bulletX = enemy.x, bulletY = enemy.y) {
    // Handle damage based on enemy type
    if (enemy.type === "boss") {
      // New boss system with bullet coordinates
      const result = enemy.takeDamage(damage, bulletX, bulletY);
      
      if (result === null) {
        // No collision detected (shouldn't happen since collision manager already checked)
        return "no_damage";
      } else if (result === "invulnerable") {
        // Hit an invulnerable part - bullet should still be removed but no damage
        this.effects.createEnemyExplosion(bulletX, bulletY);
        this.audio.play(this.audio.sounds.hit); // Different sound for invulnerable hit
        return "invulnerable";
      } else if (result === "body_destroyed") {
        // Boss body destroyed, transitioning to head phase
        this.effects.createEnemyExplosion(bulletX, bulletY);
        this.audio.play(this.audio.sounds.enemyExplosion);
        return "body_destroyed";
      } else if (result === "destroyed") {
        // Boss is defeated (head destroyed)
        this.effects.createEnemyExplosion(bulletX, bulletY);
        this.audio.play(this.audio.sounds.enemyExplosion);
        this.state.startBossDeathSequence();
        return "destroyed";
      } else if (result === "damaged") {
        // Successfully damaged vulnerable part
        this.effects.createEnemyExplosion(bulletX, bulletY);
        this.audio.play(this.audio.sounds.enemyExplosion);
        return "damaged";
      }
      
      return "no_damage";
    } else if (enemy.takeDamage) {
      const result = enemy.takeDamage(damage);
      // Handle different damage results
      if (result === "godmode") {
        // No effect, no explosion for god mode
        return result;
      } else if (
        result === "shield_damaged" ||
        result === "shield_destroyed" ||
        result === "damaged"
      ) {
        this.effects.createEnemyExplosion(enemy.x, enemy.y);
        this.audio.play(this.audio.sounds.enemyExplosion);
        return result;
      } else if (result === "destroyed" || result === "defeated") {
        this.effects.createEnemyExplosion(enemy.x, enemy.y);
        this.audio.play(this.audio.sounds.enemyExplosion);

        // Award score based on enemy type
        if (enemy.maxHealth > 1000) {
          // Boss
          this.state.startBossDeathSequence();
        } else if (enemy.maxHealth > 50) {
          // Mini-boss
          if (!this.cheats.used) {
            this.score += 1000;
          }
        } else {
          // Regular enemy
          if (!this.cheats.used) {
            this.score += 200;
          }
        }

        this.progress.update();
        return "destroyed";
      } else if (result === "dying") {
        // Mini-boss is starting death sequence
        this.audio.play(this.audio.sounds.enemyExplosion);
        return "dying";
      }
    } else {
      // Regular enemy without takeDamage method
      this.effects.createEnemyExplosion(enemy.x, enemy.y);
      this.audio.play(this.audio.sounds.enemyExplosion);
      if (!this.cheats.used) {
        this.score += 200;
      }
      this.progress.update();
      return "destroyed";
    }

    return null;
  }


  // Convenience methods for UI renderer
  startGame() {
    this.state.play();
  }

  restartGame() {
    this.state.play();
  }

  toggleGodMode() {
    this.cheats.toggleGodMode();
  }

  toggleUpgrades() {
    this.cheats.toggleUpgrades();
  }

  toggleAutoAim() {
    this.cheats.toggleAutoAim();
  }

  toggleAutoPlayer() {
    this.cheats.toggleAutoPlayer();
  }

  showHelp() {
    // Help modal is now handled by canvas renderer
    this.renderer.helpModalVisible = true;
  }

  useBomb() {
    this.actions.useBomb();
  }

  useShield() {
    this.actions.useShield();
  }

  useTimeSlow() {
    this.actions.useTimeSlow();
  }
}

// Start the game
window.game = new BlitzGame();
