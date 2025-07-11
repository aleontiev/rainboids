// Rainboids: Blitz - A bullet hell space shooter
import { Player } from "./blitz/entities/player.js";
import { Powerup } from "./blitz/entities/powerup.js";
import {
  Enemy,
  Bullet,
  Laser,
  PulseCircle,
  HomingMissile,
  MiniBoss,
  Boss,
} from "./blitz/entities/enemy.js";
import { TextParticle, Debris } from "./blitz/entities/particle.js";
import { Asteroid } from "./blitz/entities/asteroid.js";
import { InputHandler } from "./blitz/input.js";
import { TitleScreen } from "./blitz/title-screen.js";
import { UIManager } from "./blitz/ui-manager.js";
import { EffectsManager } from "./blitz/effects-manager.js";
import { AudioManager } from "./blitz/audio-manager.js";
import { LevelManager } from "./blitz/level-manager.js";
import { CheatManager } from "./blitz/cheat-manager.js";
import { BackgroundManager } from "./blitz/background-manager.js";
import { DeathManager } from "./blitz/death-manager.js";

class BlitzGame {
  constructor() {
    window.blitz = this; // Make game accessible for sound effects
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.titleCanvas = document.getElementById("titleCanvas");
    this.titleCtx = this.titleCanvas.getContext("2d");
    this.titleScreen = new TitleScreen(this.titleCanvas, this.titleCtx);
    this.inputHandler = new InputHandler(this.canvas);
    this.ui = new UIManager(this);
    this.level = new LevelManager(this);
    this.death = new DeathManager(this);
    this.background = new BackgroundManager(this);
    this.cheats = new CheatManager(this);
    this.effects = new EffectsManager(this);
    this.audio = new AudioManager(this);
    this.highScore = this.loadHighScore();

    this.autoaim = false; // Default off
    this.allUpgradesState = null; // Store state before all upgrades

    this.resize();

    this.gameState = "TITLE";

    // one time setup
    this.setupEventListeners();
    this.initializeLucideIcons();
    this.background.setup();
    this.audio.setup();
    this.cheats.setup();
    this.setupBossDialog();

    this.reset();
    this.loop();
  }

  loadHighScore() {
    try {
      return parseInt(localStorage.getItem("rainboids-high-score") || "0");
    } catch (e) {
      return 0;
    }
  }

  saveHighScore(score) {
    try {
      if (score > this.highScore) {
        this.highScore = score;
        localStorage.setItem("rainboids-high-score", score.toString());
      }
    } catch (e) {
      // localStorage not available
    }
  }

  reset() {
    this.score = 0;
    this.lives = 1;
    this.sceneOpacity = 1.0;

    let playerX, playerY;
    if (this.isPortrait) {
      playerX = this.canvas.width / 2;
      playerY = this.canvas.height - 100; // Bottom center
    } else {
      playerX = 100; // Left side
      playerY = this.canvas.height / 2; // Center
    }
    this.player = new Player(playerX, playerY);
    this.bullets = [];
    this.enemyBullets = [];
    this.enemyLasers = [];
    this.enemyPulseCircles = [];
    this.asteroids = [];
    this.enemies = [];
    this.particles = [];

    this.isMobile = this.detectMobile();

    // Initialize modules
    this.touchActive = false;
    this.touchX = 0;
    this.touchY = 0;
    this.gameTime = 0;
    this.lastGameTimeSeconds = 0;

    this.asteroidSpawnTimer = 0;
    this.enemySpawnTimer = 0;

    // Game progression
    this.gamePhase = 1; // 1: asteroids and enemies (0-30s), 2: miniboss spawn/battle, 3: cleanup phase, 4: boss dialog, 5: boss fight
    this.miniBosses = [];
    this.boss = null;

    // Boss dialog system
    this.bossDialogState = 0; // 0: hidden, 1: "...", 2: threat message, 3: closed
    this.bossDialogActive = false;
    this.bossDialogTimer = 0;

    this.powerups = [];
    this.explosions = [];
    this.powerupSpawnTimer = 0;
    this.textParticles = []; // For score popups

    // Audio state
    this.firstGameStart = true; // Track if this is the first game start

    // Time slow functionality
    this.timeSlowActive = false;
    this.timeSlowDuration = 300; // 5 seconds at 60fps
    this.timeSlowTimer = 0;
    this.timeSlowCooldown = 0;
    this.timeSlowCooldownMax = 600; // 10 seconds cooldown

    // Shield cooldown tracking
    this.shieldCooldown = 0;
    this.shieldCooldownMax = 180; // 3 second cooldown

    // Bomb system
    this.bombCount = 0; // Players start with no bombs

    // Flash states for abilities coming off cooldown
    this.shieldFlashTimer = 0;
    this.timeSlowFlashTimer = 0;

    // New game phase system
    this.miniBossesDefeated = false;
    this.miniBossGodModeTimer = 0;
    this.cleanupPhaseTimer = 0;
    this.cleanupPowerupsSpawned = false;
    this.bossDialogActive = false;
    this.gamePhase = 1;

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

    // Also resize title canvas
    if (this.titleCanvas) {
      this.titleCanvas.width = window.innerWidth;
      this.titleCanvas.height = window.innerHeight;
    }

    // Determine orientation: portrait if height > width
    // This works for both mobile and desktop
    this.isPortrait = this.canvas.height > this.canvas.width;
    this.titleScreen.resize(window.innerWidth, window.innerHeight);
  }

  setupEventListeners() {
    // Click/Touch to start

    const starter = () => {
      if (this.gameState === "TITLE") {
        this.startGame();
      } else if (this.gameState === "GAME_OVER") {
        this.restart();
      }
    };
    document.addEventListener("click", starter);
    document.addEventListener("touchstart", starter);
    document.addEventListener("keydown", starter);

    // Restart button
    const restartBtn = document.getElementById("restart-btn");
    if (restartBtn) {
      restartBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        starter();
      });
    }

    // Resize handler
    window.addEventListener("resize", () => {
      this.resize();
    });

    // Pause button
    const pauseButton = document.getElementById("pause-button");
    if (pauseButton) {
      pauseButton.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.gameState === "PLAYING") {
          this.pauseGame();
        } else if (this.gameState === "PAUSED") {
          this.resumeGame();
        }
      });
      pauseButton.addEventListener(
        "touchstart",
        (e) => {
          e.stopPropagation();
          e.preventDefault(); // Prevent default touch behavior like scrolling
          if (this.gameState === "PLAYING") {
            this.pauseGame();
          } else if (this.gameState === "PAUSED") {
            this.resumeGame();
          }
        },
        { passive: false }
      );
    }

    // Shield button
    const shieldButton = document.getElementById("shield-button");
    if (shieldButton) {
      shieldButton.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.gameState === "PLAYING") {
          this.activateShield();
        }
      });
      shieldButton.addEventListener(
        "touchstart",
        (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (this.gameState === "PLAYING") {
            this.activateShield();
          }
        },
        { passive: false }
      );
    }

    // Time Slow button
    const timeSlowButton = document.getElementById("time-slow-button");
    if (timeSlowButton) {
      timeSlowButton.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.gameState === "PLAYING") {
          this.activateTimeSlow();
        }
      });
      timeSlowButton.addEventListener(
        "touchstart",
        (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (this.gameState === "PLAYING") {
            this.activateTimeSlow();
          }
        },
        { passive: false }
      );
    }

    // Bomb button
    const bombButton = document.getElementById("bomb-button");
    if (bombButton) {
      bombButton.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.gameState === "PLAYING") {
          this.activateBomb();
        }
      });
      bombButton.addEventListener(
        "touchstart",
        (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (this.gameState === "PLAYING") {
            this.activateBomb();
          }
        },
        { passive: false }
      );
    }

    // Help button (top-left UI)
    const uiElement = document.getElementById("ui");
    if (uiElement) {
      uiElement.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.gameState === "PLAYING") {
          this.showHelp();
        }
      });
    }

    // Toggle pause with 'Escape' key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (this.gameState === "PLAYING") {
          this.pauseGame();
        } else if (this.gameState === "PAUSED") {
          this.resumeGame();
        }
      }
    });

    // Toggle pause with 'X' button click
    const pauseCloseButton = document.getElementById("pause-close-button");
    if (pauseCloseButton) {
      pauseCloseButton.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.gameState === "PAUSED") {
          // Only resume if already paused
          this.resumeGame();
        }
      });
      pauseCloseButton.addEventListener(
        "touchstart",
        (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (this.gameState === "PAUSED") {
            this.resumeGame();
          }
        },
        { passive: false }
      );
    }

    this.audio.setupControls();

    // Auto-pause when user navigates away from page
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.gameState === "PLAYING") {
        this.pauseGame();
      }
    });

    // Also handle window blur/focus events for additional coverage
    window.addEventListener("blur", () => {
      if (this.gameState === "PLAYING") {
        this.pauseGame();
      }
    });
  }

  showHelp() {
    this.gameState = "PAUSED";
    document.getElementById("pause-overlay").style.display = "flex";
    document.body.style.cursor = "default"; // Show cursor
  }

  hideHelp() {
    this.gameState = "PLAYING";
    document.getElementById("pause-overlay").style.display = "none";
    document.body.style.cursor = "none"; // Hide cursor
  }

  startGame() {
    this.gameState = "PLAYING";
    document.getElementById("title-screen").style.display = "none";
    document.getElementById("game-over").style.display = "none";

    // Initialize and start audio only on first game start (after user interaction)
    if (this.firstGameStart) {
      this.firstGameStart = false;
      this.audio.ready();
    }

    // Initialize skill indicator
    this.ui.update();
  }

  restart() {
    this.reset();
    this.background.setup();
    document.getElementById("game-over").style.display = "none";
    this.gameState = "PLAYING";
    this.ui.update();
  }

  spawnPowerup() {
    let x, y;
    if (this.isPortrait) {
      x = Math.random() * this.canvas.width;
      y = -50;
    } else {
      x = this.canvas.width + 50;
      y = Math.random() * this.canvas.height;
    }
    const types = ["shield", "mainWeapon", "sideWeapon", "secondShip", "bomb"];
    const type = types[Math.floor(Math.random() * types.length)];

    this.powerups.push(new Powerup(x, y, type, this.isPortrait));
  }

  updateGamePhase() {
    // Only auto-advance to phase 2 at 30 seconds if still in phase 1
    if (this.gameTime < 30 && this.gamePhase === 1) {
      // Stay in phase 1: 0-30s asteroids and enemies
    } else if (this.gameTime >= 30 && this.gamePhase === 1) {
      // Auto-advance to phase 2 only if we're still in phase 1
      this.gamePhase = 2; // Phase 2: Time to spawn minibosses
    }
    // All other phase transitions are handled manually in other parts of code
  }

  getAsteroidSpawnRate() {
    switch (this.gamePhase) {
      case 1:
        return 120; // Phase 1: Every 2 seconds
      case 2:
        return 180; // Phase 2: Much less frequent during miniboss fight (every 3 seconds)
      case 3:
        return 80; // Phase 3: Cleanup phase
      case 4:
        return 999999; // Phase 4: No asteroids during boss
      default:
        return 120;
    }
  }

  getEnemySpawnRate() {
    switch (this.gamePhase) {
      case 1:
        return 180; // Phase 1: Every 3 seconds
      case 2:
        return 999999; // Phase 2: No enemies during miniboss fight
      case 3:
        return 999999; // Phase 3: No enemies during cleanup
      case 4:
        return 999999; // Phase 4: No enemies during boss
      default:
        return 180;
    }
  }

  spawnAsteroid(type = "large", x = null, y = null, vx = null, vy = null) {
    let size;
    let speed;
    switch (type) {
      case "large":
        size = 50 + Math.random() * 30;
        speed = 0.5 + Math.random() * 0.5;
        break;
      case "medium":
        size = 30 + Math.random() * 15;
        speed = 1 + Math.random() * 0.5;
        break;
      case "small":
        size = 15 + Math.random() * 10;
        speed = 1.5 + Math.random() * 0.5;
        break;
      default:
        size = 50; // Default size
        speed = 1; // Default speed
    }

    if (x === null) {
      if (this.isPortrait) {
        x = Math.random() * this.canvas.width;
        y = -50;
      } else {
        x = this.canvas.width + 50;
        y = Math.random() * this.canvas.height;
      }
    }
    this.asteroids.push(
      new Asteroid(x, y, type, this.isPortrait, size, speed, vx, vy)
    );
  }

  spawnEnemy() {
    let x, y;

    // Ensure canvas dimensions are valid
    if (this.canvas.width <= 0 || this.canvas.height <= 0) {
      console.warn(
        "Invalid canvas dimensions for enemy spawn:",
        this.canvas.width,
        this.canvas.height
      );
      return;
    }

    if (this.isPortrait) {
      // Portrait: spawn at top edge, move down
      x = Math.random() * this.canvas.width;
      y = -50;
    } else {
      // Landscape: spawn at right edge, move left
      x = this.canvas.width + 50;
      y = Math.random() * this.canvas.height;
    }

    const types = [
      "straight",
      "sine",
      "zigzag",
      "circle",
      "dive",
      "laser",
      "pulse",
    ];
    const type = types[Math.floor(Math.random() * types.length)];

    this.enemies.push(new Enemy(x, y, type, this.isPortrait));
  }

  update(deltaTime, slowdownFactor = 1.0) {
    if (this.gameState !== "PLAYING" && !this.death.animationActive) return;

    this.gameTime += deltaTime / 1000; // Convert ms to seconds

    // Update time slow
    if (this.timeSlowActive) {
      this.timeSlowTimer -= 1;
      if (this.timeSlowTimer <= 0) {
        this.timeSlowActive = false;
      }
    }

    // Update time slow cooldown
    if (this.timeSlowCooldown > 0) {
      this.timeSlowCooldown -= 1;
    }

    // Update shield cooldown
    if (this.shieldCooldown > 0) {
      this.shieldCooldown -= 1;
    }

    // Update button cooldown visuals
    this.ui.updateCooldownVisuals();

    const input = this.inputHandler.getInput();

    // Handle Shift key for time slow activation
    if (input.shift) {
      this.activateTimeSlow();
    }

    // Handle Right Click for shield activation
    if (input.rightClick) {
      this.activateShield();
    }

    // Update player
    this.player.update(
      input,
      this.enemies,
      this.asteroids,
      this.isPortrait,
      this.autoaim,
      this.player.mainWeaponLevel, // Pass mainWeaponLevel
      this.timeSlowActive // Pass time slow state
    );

    // Player shooting (prevent firing during death animation)
    if (input.fire && !this.death.animationActive) {
      this.player.shoot(
        this.bullets,
        this.audio.sounds.shoot,
        Bullet,
        Laser,
        HomingMissile,
        this.isPortrait
      );
    }

    // Update bullets
    this.bullets = this.bullets.filter((bullet) => {
      if (bullet instanceof HomingMissile) {
        return bullet.update(this.enemies, slowdownFactor);
      } else {
        bullet.update(slowdownFactor);
        if (this.isPortrait) {
          return bullet.y < this.canvas.height + 50;
        } else {
          return bullet.x < this.canvas.width + 50;
        }
      }
    });

    // Update enemy bullets
    this.enemyBullets = this.enemyBullets.filter((bullet) => {
      bullet.update(slowdownFactor);

      // Special handling for pulse circles
      if (bullet.enemyType === "pulse") {
        return bullet.life > 0;
      }

      return (
        bullet.x > -50 &&
        bullet.x < this.canvas.width + 50 &&
        bullet.y > -50 &&
        bullet.y < this.canvas.height + 50
      );
    });

    this.enemyLasers = this.enemyLasers.filter((laser) =>
      laser.update(slowdownFactor)
    );

    this.enemyPulseCircles = this.enemyPulseCircles.filter((circle) =>
      circle.update(slowdownFactor)
    );

    // Update asteroids
    this.asteroids = this.asteroids.filter((asteroid) => {
      asteroid.update(slowdownFactor);
      if (this.isPortrait) {
        return asteroid.y < this.canvas.height + asteroid.size; // Keep if on screen or just off bottom
      } else {
        return asteroid.x > -asteroid.size; // Keep if on screen or just off left
      }
    });

    // Update enemies
    this.enemies = this.enemies.filter((enemy) => {
      enemy.update(
        this.player.x,
        this.player.y,
        this.enemyBullets,
        this.enemyLasers,
        this.enemyPulseCircles,
        slowdownFactor
      );
      enemy.shoot(this.enemyBullets, this.player);
      return enemy.x > -50;
    });

    // Update mini-bosses
    this.miniBosses.forEach((miniBoss) => {
      miniBoss.update(this.player.x, this.player.y, slowdownFactor); // Pass player coordinates

      // Mini-boss primary weapon
      if (miniBoss.canFirePrimary()) {
        const bulletData = miniBoss.firePrimary(this.player.x, this.player.y); // Pass player coordinates
        const angle = Math.atan2(bulletData.vy, bulletData.vx);
        const speed = Math.sqrt(
          bulletData.vx * bulletData.vx + bulletData.vy * bulletData.vy
        );
        this.enemyBullets.push(
          new Bullet(
            bulletData.x,
            bulletData.y,
            angle,
            bulletData.size,
            bulletData.color,
            this.isPortrait,
            speed
          )
        );
      }

      // Mini-boss secondary weapon
      if (miniBoss.canFireSecondary()) {
        const bulletsData = miniBoss.fireSecondary(
          this.player.x,
          this.player.y
        ); // Pass player coordinates
        bulletsData.forEach((bulletData) => {
          const angle = Math.atan2(bulletData.vy, bulletData.vx);
          const speed = Math.sqrt(
            bulletData.vx * bulletData.vx + bulletData.vy * bulletData.vy
          );
          this.enemyBullets.push(
            new Bullet(
              bulletData.x,
              bulletData.y,
              angle,
              bulletData.size,
              bulletData.color,
              this.isPortrait,
              speed
            )
          );
        });
      }

      // Mini-boss circular weapon
      if (miniBoss.canFireCircular()) {
        const bulletsData = miniBoss.fireCircular(this.player.x, this.player.y);
        bulletsData.forEach((bulletData) => {
          const angle = Math.atan2(bulletData.vy, bulletData.vx);
          const speed = Math.sqrt(
            bulletData.vx * bulletData.vx + bulletData.vy * bulletData.vy
          );
          this.enemyBullets.push(
            new Bullet(
              bulletData.x,
              bulletData.y,
              angle,
              bulletData.size,
              bulletData.color,
              this.isPortrait,
              speed
            )
          );
        });
      }

      // Mini-boss burst weapon
      if (miniBoss.canFireBurst()) {
        const bulletsData = miniBoss.fireBurst(this.player.x, this.player.y);
        bulletsData.forEach((bulletData) => {
          const angle = Math.atan2(bulletData.vy, bulletData.vx);
          const speed = Math.sqrt(
            bulletData.vx * bulletData.vx + bulletData.vy * bulletData.vy
          );
          this.enemyBullets.push(
            new Bullet(
              bulletData.x,
              bulletData.y,
              angle,
              bulletData.size,
              bulletData.color,
              this.isPortrait,
              speed
            )
          );
        });
      }

      // Mini-boss small enemy spawn
      if (miniBoss.canSpawnEnemy()) {
        const enemyData = miniBoss.spawnEnemy(this.player.x, this.player.y); // Pass player coordinates
        this.enemies.push(
          new Enemy(
            enemyData.x,
            enemyData.y,
            enemyData.type,
            enemyData.isPortrait,
            enemyData.speed // Pass speed
          )
        );
      }
    });

    // Update particles
    this.particles = this.particles.filter((particle) => {
      particle.update(slowdownFactor);
      return particle.life > 0;
    });

    // Update background stars with subtle movement
    this.background.update();

    // Update powerups
    this.powerups = this.powerups.filter((powerup) => {
      powerup.update();
      return powerup.x > -50;
    });

    // Update explosions
    this.explosions = this.explosions.filter((explosion) => {
      explosion.update(slowdownFactor);
      return explosion.life > 0;
    });

    // Update text particles
    this.textParticles = this.textParticles.filter((particle) => {
      particle.update(slowdownFactor);
      return particle.life > 0;
    });

    // Spawn powerups occasionally
    this.powerupSpawnTimer++;
    if (this.powerupSpawnTimer > 1200 + Math.random() * 1800) {
      // 0.5x spawn rate (20-50 seconds)
      this.spawnPowerup();
      this.powerupSpawnTimer = 0;
    }

    // Spawn asteroids
    // Game progression phases based on time
    this.updateGamePhase();

    // Spawn asteroids based on current phase
    this.asteroidSpawnTimer++;
    const asteroidSpawnRate = this.getAsteroidSpawnRate();
    if (this.asteroidSpawnTimer > asteroidSpawnRate) {
      const rand = Math.random();
      let type = "medium";
      if (rand < 0.1) {
        // 10% large
        type = "large";
      } else if (rand > 0.8) {
        // 20% small
        type = "small";
      }
      this.spawnAsteroid(type);
      this.asteroidSpawnTimer = 0;
    }

    // Spawn enemies based on current phase
    this.enemySpawnTimer++;
    const enemySpawnRate = this.getEnemySpawnRate();
    if (
      this.enemySpawnTimer > enemySpawnRate &&
      this.gamePhase >= 1 &&
      this.gamePhase <= 2
    ) {
      this.spawnEnemy();
      this.enemySpawnTimer = 0;
    }

    // Check for mini-boss spawn at 30 seconds
    if (
      this.gameTime >= 30 &&
      this.gamePhase === 2 &&
      this.miniBosses.length === 0 &&
      !this.miniBossesDefeated
    ) {
      try {
        // Spawn two mini-bosses directly inline to avoid method call issues
        let alphaX, alphaY, betaX, betaY;

        if (this.isPortrait) {
          // Portrait mode: spawn at top of screen like other enemies
          const centerX = this.canvas.width / 2;
          const spacing = 120;

          // Alpha mini-boss (left side)
          alphaX = centerX - spacing;
          alphaY = -100; // Start above screen

          // Beta mini-boss (right side)
          betaX = centerX + spacing;
          betaY = -100; // Start above screen
        } else {
          // Landscape mode: spawn from right side like other enemies
          const centerY = this.canvas.height / 2;
          const spacing = 150;

          // Alpha mini-boss (top)
          alphaX = this.canvas.width + 100; // Start off-screen right
          alphaY = centerY - spacing;

          // Beta mini-boss (bottom)
          betaX = this.canvas.width + 100; // Start off-screen right
          betaY = centerY + spacing;
        }

        this.miniBosses.push(
          new MiniBoss(
            alphaX,
            alphaY,
            "alpha",
            this.isPortrait,
            this.canvas.width
          )
        );
        this.miniBosses.push(
          new MiniBoss(betaX, betaY, "beta", this.isPortrait, this.canvas.width)
        );

        // Spawn extra powerup when minibosses appear
        this.spawnPowerup();

        this.gamePhase = 2; // Mini-boss phase (phase 2 in the new system)
      } catch (error) {
        console.error("Error spawning mini-bosses:", error);
      }
    }

    // Handle Phase 3: Cleanup phase after minibosses are defeated
    if (this.gamePhase === 3) {
      this.cleanupPhaseTimer += deltaTime;

      // Explode all remaining enemies immediately (only once)
      if (!this.cleanupEnemiesExploded) {
        this.cleanupEnemiesExploded = true;
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const enemy = this.enemies[i];
          this.effects.createEnemyExplosion(enemy.x, enemy.y);
          this.enemies.splice(i, 1);
        }
        // Clear all enemy bullets
        this.enemyBullets = [];
        this.enemyLasers = [];
        this.enemyPulseCircles = [];
      }

      // After 5 seconds, spawn 2 powerups and show boss dialog
      if (this.cleanupPhaseTimer >= 5000) {
        if (!this.cleanupPowerupsSpawned) {
          this.spawnPowerup();
          this.spawnPowerup();
          this.cleanupPowerupsSpawned = true;
        }

        // Start boss dialog after powerups are spawned
        if (this.cleanupPhaseTimer >= 6000) {
          this.gamePhase = 4; // Transition to phase 4: boss dialog
          this.bossDialogActive = true;
          this.showBossDialog();
        }
      }
    }

    // Update boss fight
    if (this.gamePhase === 5) {
      this.updateBossFight(slowdownFactor);
    }

    // Handle boss dialog delay phase
    if (this.gamePhase === "WAITING_FOR_BOSS_DIALOG") {
      // Check if all other enemies are cleared
      if (
        this.enemies.length === 0 &&
        this.asteroids.length === 0 &&
        this.enemyBullets.length === 0 &&
        this.enemyLasers.length === 0 &&
        this.enemyPulseCircles.length === 0
      ) {
        this.bossDialogTimer += deltaTime; // Increment timer using deltaTime
        if (this.bossDialogTimer >= 5000) {
          // 5 seconds
          this.gamePhase = 5; // Transition to boss dialog phase
          this.showBossDialog();
        }
      }
    }

    // Only check collisions if not in death animation
    if (!this.death.animationActive) {
      this.checkCollisions();

      // Check boss collisions
      if (this.gamePhase === 5) {
        this.checkBossCollisions();
      }
    }

    this.ui.update(); // Update UI elements like timer
  }

  checkCollisions() {
    // Player bullets vs asteroids
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      for (let j = this.asteroids.length - 1; j >= 0; j--) {
        const bullet = this.bullets[i];
        const asteroid = this.asteroids[j];
        let collision = false;

        if (bullet instanceof Laser) {
          collision = this.checkLaserCollision(bullet, asteroid);
        } else {
          collision = this.checkCollision(bullet, asteroid);
        }

        if (collision) {
          // For lasers, we don't remove the laser on hit, as it's continuous
          if (!(bullet instanceof Laser)) {
            this.bullets.splice(i, 1);
          }

          const damageResult = asteroid.takeDamage(1);
          this.createDebris(asteroid.x, asteroid.y, "#ffffff"); // Always create debris on hit
          if (damageResult) {
            this.asteroids.splice(j, 1);
            this.score += 100;
            this.ui.update();

            if (damageResult === "breakIntoMedium") {
              const baseAngle = Math.atan2(asteroid.vy, asteroid.vx);
              const spreadAngle = Math.PI / 6; // 30 degrees spread
              const newSpeed = asteroid.speed * 1.5; // Faster than original
              const mediumSize = 30 + Math.random() * 15;
              const mediumSpeed = 1 + Math.random() * 0.5;

              // Asteroid 1: slightly left
              let angle1 = baseAngle - spreadAngle;
              this.spawnAsteroid(
                "medium",
                asteroid.x,
                asteroid.y,
                Math.cos(angle1) * newSpeed,
                Math.sin(angle1) * newSpeed,
                mediumSize,
                mediumSpeed
              );

              // Asteroid 2: straight ahead
              let angle2 = baseAngle;
              this.spawnAsteroid(
                "medium",
                asteroid.x,
                asteroid.y,
                Math.cos(angle2) * newSpeed,
                Math.sin(angle2) * newSpeed,
                mediumSize,
                mediumSpeed
              );

              // Asteroid 3: slightly right
              let angle3 = baseAngle + spreadAngle;
              this.spawnAsteroid(
                "medium",
                asteroid.x,
                asteroid.y,
                Math.cos(angle3) * newSpeed,
                Math.sin(angle3) * newSpeed,
                mediumSize,
                mediumSpeed
              );
            } else if (damageResult === "breakIntoSmall") {
              const smallSize = 15 + Math.random() * 10;
              const smallSpeed = 1.5 + Math.random() * 0.5;
              for (let k = 0; k < 3; k++) {
                this.spawnAsteroid(
                  "small",
                  asteroid.x,
                  asteroid.y,
                  null,
                  null,
                  smallSize,
                  smallSpeed
                );
              }
            } else if (damageResult === "destroyed") {
              // Debris already created above
            }
            this.audio.playSound(this.audio.sounds.asteroidExplosion);
          }
          // If it's a laser, it can hit multiple targets, so don't break from inner loop
          if (!(bullet instanceof Laser)) {
            break; // Break from inner loop only if not a laser
          }
        }
      }
    }

    // Player bullets vs enemies
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const bullet = this.bullets[i];
        const enemy = this.enemies[j];
        let collision = false;

        if (bullet instanceof Laser) {
          collision = this.checkLaserCollision(bullet, enemy);
        } else {
          collision = this.checkCollision(bullet, enemy);
        }

        if (collision) {
          // For lasers, we don't remove the laser on hit, as it's continuous
          if (!(bullet instanceof Laser)) {
            this.bullets.splice(i, 1);
          }

          this.effects.createEnemyExplosion(enemy.x, enemy.y);
          this.audio.playSound(this.audio.sounds.enemyExplosion);
          this.enemies.splice(j, 1);
          this.score += 200;
          this.ui.update();

          // If it's a laser, it can hit multiple targets, so don't break from inner loop
          if (!(bullet instanceof Laser)) {
            break; // Break from inner loop only if not a laser
          }
        }
      }
    }

    // Player bullets vs mini-bosses
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      for (let j = this.miniBosses.length - 1; j >= 0; j--) {
        const bullet = this.bullets[i];
        const miniBoss = this.miniBosses[j];
        let collision = false;

        if (bullet instanceof Laser) {
          collision = this.checkLaserCollision(bullet, miniBoss);
        } else {
          collision = this.checkCollision(bullet, miniBoss);
        }

        if (collision) {
          // For lasers, we don't remove the laser on hit, as it's continuous
          if (!(bullet instanceof Laser)) {
            this.bullets.splice(i, 1);
          }

          const result = miniBoss.takeDamage(1);

          // Handle different damage results
          if (result === "godmode") {
            // No effect, no explosion for god mode
            continue;
          } else if (
            result === "shield_damaged" ||
            result === "shield_destroyed"
          ) {
            this.effects.createEnemyExplosion(miniBoss.x, miniBoss.y);
            this.audio.playSound(this.audio.sounds.enemyExplosion);
          } else if (result === "damaged") {
            this.effects.createEnemyExplosion(miniBoss.x, miniBoss.y);
            this.audio.playSound(this.audio.sounds.enemyExplosion);
          } else if (result === "destroyed") {
            this.miniBosses.splice(j, 1);
            this.score += 1000; // High score for mini-boss defeat
            this.ui.update();
            this.effects.createEnemyExplosion(miniBoss.x, miniBoss.y);
            this.audio.playSound(this.audio.sounds.enemyExplosion);

            // Check if all mini-bosses are defeated
            if (this.miniBosses.length === 0) {
              this.miniBossesDefeated = true;
              this.cleanupPhaseTimer = 0;
              this.cleanupEnemiesExploded = false; // Flag to track if we've exploded enemies
              this.gamePhase = 3; // Transition to cleanup phase
            }
          }

          // If it's a laser, it can hit multiple targets, so don't break from inner loop
          if (!(bullet instanceof Laser)) {
            break; // Break from inner loop only if not a laser
          }
        }
      }
    }

    // Player vs asteroids (only if not shielding and not in godmode)
    if (!this.player.isShielding && !this.player.godMode) {
      for (let i = this.asteroids.length - 1; i >= 0; i--) {
        if (this.checkPlayerCollision(this.player, this.asteroids[i])) {
          if (this.player.secondShip.length > 0) {
            const destroyedShip = this.player.secondShip.pop(); // Remove one companion ship
            this.effects.createExplosion(destroyedShip.x, destroyedShip.y); // Explosion at companion ship's position
            this.ui.update();
          } else if (this.player.shield > 0) {
            this.player.shield--;
            this.effects.createExplosion(this.player.x, this.player.y);
            this.ui.update();
          } else {
            this.effects.createExplosion(this.player.x, this.player.y);
            this.death.start();
            return;
          }
        }
      }
    }

    // Player vs enemies (only if not shielding and not in godmode)
    if (!this.player.isShielding && !this.player.godMode) {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        if (this.checkPlayerCollision(this.player, this.enemies[i])) {
          if (this.player.secondShip.length > 0) {
            const destroyedShip = this.player.secondShip.pop();
            this.effects.createExplosion(destroyedShip.x, destroyedShip.y);
            this.ui.update();
          } else if (this.player.shield > 0) {
            this.player.shield--;
            this.effects.createExplosion(this.player.x, this.player.y);
            this.ui.update();
          } else {
            this.effects.createExplosion(this.player.x, this.player.y);
            this.death.start();
            return;
          }
        }
      }

      // Player vs mini-bosses
      for (let i = this.miniBosses.length - 1; i >= 0; i--) {
        if (this.checkPlayerCollision(this.player, this.miniBosses[i])) {
          if (this.player.secondShip.length > 0) {
            const destroyedShip = this.player.secondShip.pop();
            this.effects.createExplosion(destroyedShip.x, destroyedShip.y);
            this.ui.update();
          } else if (this.player.shield > 0) {
            this.player.shield--;
            this.effects.createExplosion(this.player.x, this.player.y);
            this.ui.update();
          } else {
            this.effects.createExplosion(this.player.x, this.player.y);
            this.death.start();
            return;
          }
        }
      }
    }

    // Player vs enemy bullets (only if not shielding and not in godmode)
    if (!this.player.isShielding && !this.player.godMode) {
      for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
        if (this.checkPlayerCollision(this.player, this.enemyBullets[i])) {
          if (this.player.secondShip.length > 0) {
            const destroyedShip = this.player.secondShip.pop();
            this.effects.createExplosion(destroyedShip.x, destroyedShip.y);
            this.enemyBullets.splice(i, 1); // Remove enemy bullet
            this.ui.update();
          } else if (this.player.shield > 0) {
            this.player.shield--;
            this.enemyBullets.splice(i, 1);
            this.effects.createExplosion(this.player.x, this.player.y);
            this.ui.update();
          } else {
            this.effects.createExplosion(this.player.x, this.player.y);
            this.death.start();
            return;
          }
        }
      }
    }

    // Player vs enemy lasers
    if (!this.player.isShielding && !this.player.godMode) {
      for (let i = this.enemyLasers.length - 1; i >= 0; i--) {
        if (this.checkPlayerLaserCollision(this.player, this.enemyLasers[i])) {
          if (this.player.secondShip.length > 0) {
            const destroyedShip = this.player.secondShip.pop();
            this.effects.createExplosion(destroyedShip.x, destroyedShip.y);
            this.ui.update();
          } else if (this.player.shield > 0) {
            this.player.shield--;
            this.effects.createExplosion(this.player.x, this.player.y);
            this.ui.update();
          } else {
            this.effects.createExplosion(this.player.x, this.player.y);
            this.death.start();
            return;
          }
        }
      }
    }

    // Player vs enemy pulse circles
    if (!this.player.isShielding && !this.player.godMode) {
      for (let i = this.enemyPulseCircles.length - 1; i >= 0; i--) {
        if (this.checkPlayerCollision(this.player, this.enemyPulseCircles[i])) {
          if (this.player.secondShip.length > 0) {
            const destroyedShip = this.player.secondShip.pop();
            this.effects.createExplosion(destroyedShip.x, destroyedShip.y);
            this.enemyPulseCircles.splice(i, 1); // Remove pulse circle
            this.ui.update();
          } else if (this.player.shield > 0) {
            this.player.shield--;
            this.enemyPulseCircles.splice(i, 1);
            this.effects.createExplosion(this.player.x, this.player.y);
            this.ui.update();
          } else {
            this.effects.createExplosion(this.player.x, this.player.y);
            this.death.start();
            return;
          }
        }
      }
    }

    // Player vs powerups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      if (this.checkCollision(this.player, this.powerups[i])) {
        this.collectPowerup(this.powerups[i]);
        this.powerups.splice(i, 1);
      }
    }
  }

  checkCollision(obj1, obj2) {
    if (!obj1 || !obj2) {
      return false;
    }
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < obj1.size + obj2.size;
  }

  checkLaserCollision(laser, target) {
    const laserStartX = laser.x;
    const laserStartY = laser.y;
    const laserEndX = laser.x + Math.cos(laser.angle) * 200; // Laser length is 200
    const laserEndY = laser.y + Math.sin(laser.angle) * 200;

    const circleX = target.x;
    const circleY = target.y;
    const circleRadius = target.size;

    const dx = laserEndX - laserStartX;
    const dy = laserEndY - laserStartY;
    const lengthSq = dx * dx + dy * dy;
    let t = 0;
    if (lengthSq !== 0) {
      t =
        ((circleX - laserStartX) * dx + (circleY - laserStartY) * dy) /
        lengthSq;
      t = Math.max(0, Math.min(1, t)); // Clamp t between 0 and 1
    }

    const closestX = laserStartX + t * dx;
    const closestY = laserStartY + t * dy;

    const distDx = circleX - closestX;
    const distDy = circleY - closestY;
    const distance = Math.sqrt(distDx * distDx + distDy * distDy);

    return distance < circleRadius + laser.width / 2;
  }

  checkPlayerLaserCollision(player, laser) {
    const dx = player.x - laser.x;
    const dy = player.y - laser.y;
    const laserAngle = laser.angle;
    const playerAngle = Math.atan2(dy, dx);
    const angleDiff = Math.abs(playerAngle - laserAngle);

    if (angleDiff < 0.1 || angleDiff > Math.PI * 2 - 0.1) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < laser.length) {
        return true;
      }
    }
    return false;
  }

  checkPlayerCollision(player, obj) {
    // Player is immune to damage while shielding
    if (player.isShielding) {
      return false;
    }

    const dx = player.x - obj.x;
    const dy = player.y - obj.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < player.hitboxSize + obj.size;
  }

  createExplosion(x, y) {
    for (let i = 0; i < 8; i++) {
      this.particles.push(new Particle(x, y));
    }
  }

  createEnemyExplosion(x, y) {
    // Create bigger explosion for enemies
    for (let i = 0; i < 15; i++) {
      this.particles.push(new Particle(x, y, 2.5)); // Bigger particles
    }
    // Add extra debris for more visual impact
    for (let i = 0; i < 8; i++) {
      this.particles.push(new Debris(x, y, "#ff6666"));
    }
  }

  createDebris(x, y, color) {
    for (let i = 0; i < 6; i++) {
      this.particles.push(new Debris(x, y, color));
    }
  }

  collectPowerup(powerup) {
    switch (powerup.type) {
      case "shield":
        this.player.shield = Math.min(this.player.shield + 1, 3); // Max 3 shields
        break;
      case "mainWeapon":
        if (this.player.mainWeaponLevel >= 5) {
          // Max level reached
          this.score += 1000;
          this.textParticles.push(
            new TextParticle(powerup.x, powerup.y, "+1000", "#ffff00", 25, 45)
          ); // Yellow, larger, faster fade
        } else {
          this.player.mainWeaponLevel = Math.min(
            this.player.mainWeaponLevel + 1,
            5
          ); // Max level is 5
        }
        break;
      case "sideWeapon":
        this.player.sideWeaponLevel = Math.min(
          this.player.sideWeaponLevel + 1,
          4
        );
        break;
      case "secondShip":
        if (this.player.secondShip.length < 2) {
          // Max 2 companion ships
          let offset;
          if (this.isPortrait) {
            // Portrait mode: left/right positioning
            offset = this.player.secondShip.length === 0 ? -40 : 40;
            this.player.secondShip.push({
              x: this.player.x + offset,
              y: this.player.y,
              initialAngle: this.player.angle,
              offset: offset,
              isHorizontal: true,
            });
          } else {
            // Landscape mode: above/below positioning
            offset = this.player.secondShip.length === 0 ? -40 : 40;
            this.player.secondShip.push({
              x: this.player.x,
              y: this.player.y + offset,
              initialAngle: this.player.angle,
              offset: offset,
              isHorizontal: false,
            });
          }
        }
        break;
      case "bomb":
        // Collect bomb instead of using it immediately
        this.bombCount = Math.min(this.bombCount + 1, 9); // Max 9 bombs for display purposes
        break;
    }
  }

  render() {
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.background.render(this.ctx);

    if (this.gameState === "TITLE") {
      this.titleScreen.render();
    }

    if (
      this.gameState === "PLAYING" ||
      this.gameState === "PAUSED" ||
      this.gameState === "DEATH_ANIMATION"
    ) {
      this.powerups.forEach((powerup) => powerup.render(this.ctx));
      this.explosions.forEach((explosion) => explosion.render(this.ctx));
      this.textParticles.forEach((particle) => particle.render(this.ctx));
      if (this.gameState !== "DEATH_ANIMATION") {
        this.player.render(this.ctx);
      }
      this.bullets.forEach((bullet) => bullet.render(this.ctx));
      this.enemyBullets.forEach((bullet) => bullet.render(this.ctx));
      this.enemyLasers.forEach((laser) => laser.render(this.ctx));
      this.enemyPulseCircles.forEach((circle) => circle.render(this.ctx));
      this.asteroids.forEach((asteroid) => asteroid.render(this.ctx));
      this.enemies.forEach((enemy) => enemy.render(this.ctx));
      this.miniBosses.forEach((miniBoss) => miniBoss.render(this.ctx));
      if (this.boss) {
        this.boss.render(this.ctx);
      }
      this.particles.forEach((particle) => particle.render(this.ctx));
    }

    // Render death animation effects
    if (this.death.animationActive) {
      // Draw explosions during death animation
      this.explosions.forEach((explosion) => explosion.render(this.ctx));
      this.particles.forEach((particle) => particle.render(this.ctx));
    }
    if (this.sceneOpacity < 1) {
      this.ctx.fillStyle = `rgba(0, 0, 0, ${1 - this.sceneOpacity})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Draw target indicator for mouse position (desktop only) - always on top
    this.renderCrosshair();
  }

  renderCrosshair() {
    const input = this.inputHandler.getInput();
    if (input.mousePosition) {
      const { x, y } = input.mousePosition;

      // Check if cursor is over any enemy or asteroid
      let isOverTarget = false;

      // Check enemies
      for (let enemy of this.enemies) {
        const dist = Math.sqrt((x - enemy.x) ** 2 + (y - enemy.y) ** 2);
        if (dist < enemy.radius + 10) {
          // Add 10px margin for easier targeting
          isOverTarget = true;
          break;
        }
      }

      // Check asteroids if not already over an enemy
      if (!isOverTarget) {
        for (let asteroid of this.asteroids) {
          const dist = Math.sqrt((x - asteroid.x) ** 2 + (y - asteroid.y) ** 2);
          if (dist < asteroid.radius + 10) {
            // Add 10px margin for easier targeting
            isOverTarget = true;
            break;
          }
        }
      }

      // Check minibosses if not already over a target
      if (!isOverTarget) {
        for (let miniBoss of this.miniBosses) {
          const dist = Math.sqrt((x - miniBoss.x) ** 2 + (y - miniBoss.y) ** 2);
          if (dist < miniBoss.radius + 10) {
            // Add 10px margin for easier targeting
            isOverTarget = true;
            break;
          }
        }
      }

      // Check level 1 boss if not already over a target
      if (!isOverTarget && this.boss) {
        const dist = Math.sqrt((x - this.boss.x) ** 2 + (y - this.boss.y) ** 2);
        if (dist < this.boss.radius + 10) {
          // Add 10px margin for easier targeting
          isOverTarget = true;
        }
      }

      // Draw crosshair with appropriate color
      this.ctx.save();
      this.ctx.strokeStyle = isOverTarget ? "#00ff00" : "#ffffff"; // Green if over target, white otherwise
      this.ctx.lineWidth = 1;
      this.ctx.globalAlpha = 1.0;

      const size = 10;
      this.ctx.beginPath();
      // Vertical line
      this.ctx.moveTo(x, y - size);
      this.ctx.lineTo(x, y + size);
      // Horizontal line
      this.ctx.moveTo(x - size, y);
      this.ctx.lineTo(x + size, y);
      this.ctx.stroke();

      this.ctx.restore();
    }
  }

  pauseGame() {
    this.gameState = "PAUSED";
    document.getElementById("pause-overlay").style.display = "flex";
    document.body.style.cursor = "default";
  }

  resumeGame() {
    this.gameState = "PLAYING";
    document.getElementById("pause-overlay").style.display = "none";
    document.body.style.cursor = "none";
  }

  activateShield() {
    // Trigger the player's shield ability
    if (this.player && this.shieldCooldown <= 0 && !this.player.isShielding) {
      this.player.isShielding = true;
      this.player.shieldFrames = 60;
      this.shieldCooldown = this.shieldCooldownMax;

      // Play shield sound if available
      this.audio.playSound(this.audio.sounds.shield);
    }
  }

  activateTimeSlow() {
    // Activate time slow if not on cooldown
    if (this.timeSlowCooldown <= 0 && !this.timeSlowActive) {
      this.timeSlowActive = true;
      this.timeSlowTimer = this.timeSlowDuration;
      this.timeSlowCooldown = this.timeSlowCooldownMax;

      // Play time slow sound if available
      this.audio.playSound(this.audio.sounds.powerUp);
      return true; // Ability was activated
    }
    return false; // Ability was on cooldown
  }

  activateBomb() {
    // Only activate if player has bombs
    if (this.bombCount <= 0) {
      return false; // No bombs available
    }

    // Use one bomb
    this.bombCount--;

    // Create massive explosion starting from player
    const bombRadius = 800; // Large initial radius
    this.effects.createRainbowExplosion(
      this.player.x,
      this.player.y,
      bombRadius
    );

    // Play bomb explosion sound
    this.audio.playSound(this.audio.sounds.playerExplosion);

    // Clear all enemy bullets
    this.enemyBullets = [];
    this.enemyLasers = [];
    this.enemyPulseCircles = [];

    // Destroy all small enemies and asteroids
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this.effects.createEnemyExplosion(this.enemies[i].x, this.enemies[i].y);
      this.createDebris(
        this.enemies[i].x,
        this.enemies[i].y,
        this.enemies[i].color
      );
      this.enemies.splice(i, 1);
      this.score += 200;
    }

    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      this.effects.createExplosion(this.asteroids[i].x, this.asteroids[i].y);
      this.createDebris(this.asteroids[i].x, this.asteroids[i].y, "#888");
      this.asteroids.splice(i, 1);
      this.score += 100;
    }

    // Damage mini-bosses significantly
    this.miniBosses.forEach((miniBoss) => {
      miniBoss.takeDamage(100); // Massive damage to mini-bosses
    });

    // Damage level 1 boss if present
    if (this.boss) {
      this.boss.takeDamage(100); // Very high damage to boss
    }

    // Create spectacular chain explosion effect covering entire screen
    this.effects.createChainExplosion();

    this.ui.update();
    return true; // Bomb was used
  }

  initializeLucideIcons() {
    // Initialize Lucide icons
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  }

  setupBossDialog() {
    const bossDialog = document.getElementById("boss-dialog");
    const levelCleared = document.getElementById("level-cleared");

    // Boss dialog click handler
    bossDialog.addEventListener("click", () => this.advanceBossDialog());
    bossDialog.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.advanceBossDialog();
    });

    // Level cleared click handler
    levelCleared.addEventListener("click", () => this.restart());
    levelCleared.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.restart();
    });

    // Space key handler for dialog
    document.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Space") {
        if (this.bossDialogActive) {
          e.preventDefault();
          this.advanceBossDialog();
        } else if (this.gameState === "LEVEL_CLEARED") {
          e.preventDefault();
          this.restart();
        }
      }
    });
  }

  showBossDialog() {
    this.bossDialogState = 1;
    this.bossDialogActive = true;
    this.gameState = "BOSS_DIALOG";
    document.getElementById("boss-dialog").style.display = "block";
    document.getElementById("boss-text").textContent = "...";
  }

  advanceBossDialog() {
    if (!this.bossDialogActive) return;

    this.bossDialogState++;

    if (this.bossDialogState === 2) {
      document.getElementById("boss-text").textContent =
        "Who dares enter my space?";
    } else if (this.bossDialogState === 3) {
      document.getElementById("boss-text").textContent =
        "Prepare to die, humans!";
    } else if (this.bossDialogState === 4) {
      this.hideBossDialog();
      this.spawnBoss();
    }
  }

  hideBossDialog() {
    this.bossDialogActive = false;
    document.getElementById("boss-dialog").style.display = "none";
    this.gameState = "PLAYING";
    this.gamePhase = 5; // Phase 5: Boss fight phase
  }

  spawnBoss() {
    let bossX, bossY;

    if (this.isPortrait) {
      bossX = this.canvas.width / 2;
      bossY = -150; // Start above screen
    } else {
      bossX = this.canvas.width + 150; // Start off-screen right
      bossY = this.canvas.height / 2;
    }

    this.boss = new Boss(
      bossX,
      bossY,
      this.isPortrait,
      this.canvas.width,
      this.canvas.height
    );
  }

  updateBossFight(slowdownFactor = 1.0) {
    if (!this.boss) return;

    this.boss.update(slowdownFactor);

    // Boss weapons
    if (this.boss.canFirePrimary()) {
      const bulletsData = this.boss.firePrimary(this.player.x, this.player.y);
      bulletsData.forEach((bulletData) => {
        this.enemyBullets.push(
          new Bullet(
            bulletData.x,
            bulletData.y,
            bulletData.vx,
            bulletData.vy,
            bulletData.type
          )
        );
      });
    }

    if (this.boss.canFireSecondary()) {
      const weaponData = this.boss.fireSecondary(this.player.x, this.player.y);
      weaponData.forEach((data) => {
        if (data.type === "laser") {
          this.enemyLasers.push(
            new Laser(data.x, data.y, data.angle, data.speed, data.color)
          );
        }
      });
    }

    if (this.boss.canFireSpecial()) {
      const weaponData = this.boss.fireSpecial();
      weaponData.forEach((data) => {
        if (data.type === "pulse") {
          this.enemyPulseCircles.push(
            new PulseCircle(data.x, data.y, data.maxRadius, data.color)
          );
        }
      });
    }

    // New: Spiral bullet attack
    if (this.boss.canFireSpiral()) {
      const bulletsData = this.boss.fireSpiral();
      bulletsData.forEach((bulletData) => {
        this.enemyBullets.push(
          new Bullet(
            bulletData.x,
            bulletData.y,
            bulletData.vx,
            bulletData.vy,
            bulletData.type
          )
        );
      });
    }
  }

  checkBossCollisions() {
    if (!this.boss || this.boss.isDefeated) return;

    // Player bullets vs boss
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      let collision = false;

      if (bullet instanceof Laser) {
        collision = this.checkLaserCollision(bullet, this.boss);
      } else {
        collision = this.checkCollision(bullet, this.boss);
      }

      if (collision) {
        if (!(bullet instanceof Laser)) {
          this.bullets.splice(i, 1);
        }

        const result = this.boss.takeDamage(5); // Boss takes reduced damage
        this.effects.createEnemyExplosion(this.boss.x, this.boss.y);
        this.audio.sounds.enemyExplosion.play();

        if (result === "defeated") {
          this.startBossDeathSequence();
        }

        if (!(bullet instanceof Laser)) {
          break;
        }
      }
    }

    // Player vs boss collision
    if (!this.player.isShielding && !this.player.godMode) {
      if (this.checkPlayerCollision(this.player, this.boss)) {
        if (this.player.secondShip.length > 0) {
          const destroyedShip = this.player.secondShip.pop();
          this.effects.createExplosion(destroyedShip.x, destroyedShip.y);
          this.ui.update();
        } else if (this.player.shield > 0) {
          this.player.shield--;
          this.effects.createExplosion(this.player.x, this.player.y);
          this.ui.update();
        } else {
          this.effects.createExplosion(this.player.x, this.player.y);
          this.death.start();
          return;
        }
      }
    }
  }

  startBossDeathSequence() {
    // Create multiple rainbow explosions on the boss
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const offsetX = (Math.random() - 0.5) * this.boss.size * 2;
        const offsetY = (Math.random() - 0.5) * this.boss.size * 2;
        this.effects.createRainbowExplosion(
          this.boss.x + offsetX,
          this.boss.y + offsetY,
          200
        );

        // Play explosion sounds
        this.audio.sounds.enemyExplosion.play();
      }, i * 200);
    }

    // Final large explosion and start zoom sequence
    setTimeout(() => {
      this.effects.createRainbowExplosion(this.boss.x, this.boss.y, 400);
      this.audio.playSound(this.audio.sounds.playerExplosion);
    }, 1600);
  }

  fadeToLevelCleared() {
    this.gameState = "LEVEL_CLEARED";
    document.getElementById("level-cleared").style.display = "flex";

    // Fade out the canvas
    const canvas = document.getElementById("gameCanvas");
    canvas.style.transition = "opacity 1s";
    canvas.style.opacity = "0.1";
  }

  loop(currentTime) {
    if (!currentTime) currentTime = 0; // For the first call
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    if (this.gameState === "TITLE") {
      this.titleScreen.update();
    } else if (this.gameState === "PLAYING") {
      // Calculate time slow factor
      let gameSlowdownFactor = 1.0;
      if (this.timeSlowActive) {
        gameSlowdownFactor = 0.3; // 3x slower for enemies and bullets
      }

      this.update(deltaTime, gameSlowdownFactor);
    }

    // Handle death animation
    if (this.death.animationActive) {
      this.death.updateAnimation();
      this.update(deltaTime, 0.2);
    }

    this.render();
    requestAnimationFrame((timestamp) => this.loop(timestamp));
  }
}

// Start the game
new BlitzGame();
