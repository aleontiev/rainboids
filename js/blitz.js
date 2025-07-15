// Rainboids: Blitz - A bullet hell space shooter
import { Player } from "./blitz/entities/player.js";
import { Powerup } from "./blitz/entities/powerup.js";
import { Enemy } from "./blitz/entities/enemy.js";
import { Bullet } from "./blitz/entities/bullet.js";
import { Laser } from "./blitz/entities/laser.js";
import { SpreadingBullet } from "./blitz/entities/spreading-bullet.js";
import { MiniBoss } from "./blitz/entities/miniboss.js";
import { HomingMissile } from "./blitz/entities/homing-missile.js";
import { Boss } from "./blitz/entities/boss.js";
import { TextParticle, Debris } from "./blitz/entities/particle.js";
import { Asteroid } from "./blitz/entities/asteroid.js";
import { Metal } from "./blitz/entities/metal.js";
import { InputHandler } from "./blitz/input.js";
import { TitleScreen } from "./blitz/title-screen.js";
import { UIManager } from "./blitz/ui-manager.js";
import { EffectsManager } from "./blitz/effects-manager.js";
import { AudioManager } from "./blitz/audio-manager.js";
import { LevelManager } from "./blitz/level-manager.js";
import { CheatManager } from "./blitz/cheat-manager.js";
import { BackgroundManager } from "./blitz/background-manager.js";
import { DeathManager } from "./blitz/death-manager.js";
import { DialogManager } from "./blitz/dialog-manager.js";

class BlitzGame {
  constructor() {
    window.blitz = this; // Make game accessible for sound effects

    // Cache all HTML elements
    this.elements = {
      gameCanvas: document.getElementById("gameCanvas"),
      titleCanvas: document.getElementById("titleCanvas"),
      titleScreen: document.getElementById("title-screen"),
      titleContent: document.getElementById("title-content"), // New: for title screen specific content
      pauseContent: document.getElementById("pause-content"), // New: for pause screen specific content
      gameOver: document.getElementById("game-over"),
      restartBtn: document.getElementById("restart-btn"),
      timeSlowButton: document.getElementById("time-slow-button"),
      pauseButton: document.getElementById("pause-button"),
      shieldButton: document.getElementById("shield-button"),
      bombButton: document.getElementById("bomb-button"),
      levelCleared: document.getElementById("level-cleared"),
      loreModal: document.getElementById("lore-modal"),
      creditsModal: document.getElementById("credits-modal"),
      helpModal: document.getElementById("help-modal"),
      loreBtn: document.getElementById("lore-btn"),
      creditsBtn: document.getElementById("credits-btn"),
      helpBtn: document.getElementById("help-btn"),
      loreCloseBtn: document.querySelector("#lore-modal .close-button"),
      creditsCloseBtn: document.querySelector("#credits-modal .close-button"),
      helpCloseBtn: document.querySelector("#help-modal .close-button"),
    };

    this.canvas = this.elements.gameCanvas;
    this.ctx = this.canvas.getContext("2d");
    this.titleCanvas = this.elements.titleCanvas;
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
    this.dialog = new DialogManager(this);
    this.highScore = this.loadHighScore();

    this.autoaim = false; // Default off
    this.autoplay = false; // Default off
    this.allUpgradesState = null; // Store state before all upgrades
    this.cheatsUsed = false; // Track if cheats have been used this session

    this.resize();

    this.gameState = "TITLE";
    // one time setup
    this.setupEventListeners();
    this.initializeLucideIcons();
    this.background.setup();
    this.audio.setup();
    this.cheats.setup();

    this.reset();
    document.body.classList.add("game-ready");
    document.body.style.display = "block";
    this.lastTime = performance.now();
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
      // Don't save high score if cheats were used
      if (!this.cheatsUsed && score > this.highScore) {
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
    this.cheatsUsed = false; // Reset cheat tracking for new game

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
    this.asteroids = [];
    this.enemies = [];
    this.allEnemies = []; // Unified enemy list for collision detection
    this.metals = []; // Indestructible metal objects
    this.particles = [];

    this.isMobile = this.detectMobile();

    // Initialize modules
    this.touchActive = false;
    this.touchX = 0;
    this.touchY = 0;
    this.gameTime = 0;

    this.asteroidSpawnTimer = 0;
    this.enemySpawnTimer = 0;

    // Game progression
    this.gamePhase = 1; // 1: asteroids and enemies (0-30s), 2: miniboss spawn/battle, 3: cleanup phase, 4: boss dialog, 5: boss fight
    this.miniBosses = [];
    this.boss = null;

    // Boss dialog system handled by DialogManager

    this.powerups = [];
    this.explosions = [];
    this.powerupSpawnTimer = 0;
    this.metalSpawnTimer = 0;
    this.textParticles = []; // For score popups

    // Audio state
    this.firstGameStart = true; // Track if this is the first game start

    // Time slow functionality
    this.timeSlowActive = false;
    this.timeSlowDuration = 300; // 5 seconds at 60fps
    this.timeSlowTimer = 0;
    this.timeSlowCooldown = 0;
    this.timeSlowCooldownMax = 900; // 15 seconds cooldown

    // Shield cooldown tracking removed - now handled by player

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
    this.dialog.reset();
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

    // Store previous orientation
    const previousOrientation = this.isPortrait;
    
    // Determine orientation: portrait if height > width
    // This works for both mobile and desktop
    this.isPortrait = this.canvas.height > this.canvas.width;
    
    // Reset boss and miniboss positions if orientation changed
    if (previousOrientation !== this.isPortrait) {
      this.repositionBossesOnOrientationChange();
    }
    
    this.titleScreen.resize(window.innerWidth, window.innerHeight);
  }

  repositionBossesOnOrientationChange() {
    // Reposition minibosses (check if array exists first)
    if (this.miniBosses && this.miniBosses.length > 0) {
      this.miniBosses.forEach((miniBoss, index) => {
        // Update miniboss orientation
        miniBoss.isPortrait = this.isPortrait;
        
        // Calculate spacing for multiple minibosses
        const spacing = 120; // Distance between minibosses
        const totalMinibosses = this.miniBosses.length;
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
    if (this.boss) {
      // Update boss orientation
      this.boss.isPortrait = this.isPortrait;
      this.boss.canvasWidth = this.canvas.width;
      this.boss.canvasHeight = this.canvas.height;
      
      // Instantly snap to new position based on orientation
      if (this.isPortrait) {
        this.boss.x = this.canvas.width / 2; // Center horizontally
        this.boss.y = 200; // Top position
        this.boss.targetX = this.boss.x;
        this.boss.targetY = this.boss.y;
      } else {
        this.boss.x = this.canvas.width - 200; // Right position
        this.boss.y = this.canvas.height / 2; // Center vertically
        this.boss.targetX = this.boss.x;
        this.boss.targetY = this.boss.y;
      }
      
      // Set to patrol mode since we're already in position
      this.boss.movePattern = "patrol";
      this.boss.startX = this.boss.x;
      this.boss.startY = this.boss.y;
    }
  }

  // DRY helper for adding both click and touchstart events
  addHandler(element, handler) {
    if (!element) return;

    element.addEventListener("click", (e) => {
      e.stopPropagation();
      handler(e);
    });

    element.addEventListener(
      "touchstart",
      (e) => {
        e.stopPropagation();
        e.preventDefault();
        handler(e);
      },
      { passive: false }
    );
  }

  setupEventListeners() {
    const restartBtn = this.elements.restartBtn;
    const timeSlowButton = this.elements.timeSlowButton;
    const pauseButton = this.elements.pauseButton;
    const shieldButton = this.elements.shieldButton;
    const bombButton = this.elements.bombButton;
    const starter = () => {
      if (this.gameState === "TITLE") {
        this.startGame();
      } else if (this.gameState === "GAME_OVER") {
        this.restart();
      } else if (this.gameState === "PAUSED") {
        this.resumeGame();
      }
    };

    this.addHandler(document.getElementById('start-button'), () => starter());
    this.addHandler(restartBtn, () => starter());

    // Resize handler
    window.addEventListener("resize", () => {
      this.resize();
    });

    this.addHandler(pauseButton, () => {
      if (this.gameState === "PLAYING") {
        this.pauseGame();
      } else if (this.gameState === "PAUSED") {
        this.resumeGame();
      }
    });

    this.addHandler(shieldButton, () => {
      if (this.gameState === "PLAYING") {
        this.activateShield();
      }
    });

    this.addHandler(timeSlowButton, () => {
      if (this.gameState === "PLAYING") {
        this.activateTimeSlow();
      }
    });

    this.addHandler(bombButton, () => {
      if (this.gameState === "PLAYING") {
        this.activateBomb();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (this.gameState === "PLAYING") {
          this.pauseGame();
        } else if (this.gameState === "PAUSED") {
          this.resumeGame();
        }
      }
    });

    // New: Lore and Credits buttons
    this.addHandler(this.elements.loreBtn, () => {
      this.elements.loreModal.style.display = "flex";
    });

    this.addHandler(this.elements.creditsBtn, () => {
      this.elements.creditsModal.style.display = "flex";
    });

    this.addHandler(this.elements.helpBtn, () => {
      this.elements.helpModal.style.display = "flex";
    });

    // New: Close buttons for modals
    this.addHandler(this.elements.loreCloseBtn, () => {
      this.elements.loreModal.style.display = "none";
    });

    this.addHandler(this.elements.creditsCloseBtn, () => {
      this.elements.creditsModal.style.display = "none";
    });

    this.addHandler(this.elements.helpCloseBtn, () => {
      this.elements.helpModal.style.display = "none";
    });

    // Close modals on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (this.elements.loreModal.style.display === "flex") {
          this.elements.loreModal.style.display = "none";
        } else if (this.elements.creditsModal.style.display === "flex") {
          this.elements.creditsModal.style.display = "none";
        } else if (this.elements.helpModal.style.display === "flex") {
          this.elements.helpModal.style.display = "none";
        }
      }
    });

    this.audio.setupControls();

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.gameState === "PLAYING") {
        this.pauseGame();
      }
    });

    window.addEventListener("blur", () => {
      if (this.gameState === "PLAYING") {
        this.pauseGame();
      }
    });
  }

  startGame() {
    this.gameState = "PLAYING";
    this.elements.titleScreen.style.display = "none";
    this.elements.gameOver.style.display = "none";
    this.elements.titleContent.style.display = "none";
    this.elements.pauseContent.style.display = "none";
    document.body.style.cursor = "none";
    document.body.classList.remove("custom-cursor");

    // Initialize and start audio only on first game start (after user interaction)
    if (this.firstGameStart) {
      this.firstGameStart = false;
      this.audio.ready();
      this.audio.initBackgroundMusic(); // Initialize music only once
    }

    // Start background music when game starts
    this.audio.startBackgroundMusic();

    // Initialize skill indicator
    this.ui.update();
  }

  restart() {
    this.reset();
    this.background.setup();
    this.elements.gameOver.style.display = "none";
    this.gameState = "PLAYING";

    // Show power buttons again
    this.death.showPowerButtons();

    // Restart background music from beginning
    this.audio.restartBackgroundMusic();

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
    // Weighted powerup selection - rainbow spawns 33% as often as others
    const regularTypes = [
      "shield",
      "mainWeapon",
      "sideWeapon",
      "secondShip",
      "bomb",
    ];
    const random = Math.random();

    let type;
    if (random < 9) {
      type = regularTypes[Math.floor(Math.random() * regularTypes.length)];
    } else {
      type = "rainbowStar";
    }

    this.powerups.push(new Powerup(x, y, type, this.isPortrait));
  }

  spawnMetal() {
    let x, y;
    if (this.isPortrait) {
      x = Math.random() * this.canvas.width;
      y = -100; // Start above screen
    } else {
      x = this.canvas.width + 100; // Start to the right
      y = Math.random() * this.canvas.height;
    }

    const shapes = ["l", "L", "T"];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];

    this.metals.push(new Metal(x, y, shape, this.isPortrait));
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
    let baseRate;
    switch (this.gamePhase) {
      case 1:
        if (this.gameTime < 10) {
          baseRate = 150;
        } else if (this.gameTime < 20) {
          baseRate = 120;
        } else {
          baseRate = 90;
        }
        // Reduce spawn rate by 20% for the first 30 seconds
        if (this.gameTime < 30) {
          return baseRate * 1.25; // Increase interval by 25% to reduce spawns by 20%
        } else {
          return baseRate;
        }
      case 2:
        return 300;
      case 3:
        return 999999;
      case 4:
        return 90;
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
      "square",
      "pulse",
      "sine",
      "circle",
      "zigzag",
      "dive",
      "laser",
      "pulse",
    ];
    const type = types[Math.floor(Math.random() * types.length)];

    this.enemies.push(new Enemy(x, y, type, this.isPortrait));
  }

  update(deltaTime, slowdownFactor = 1.0) {
    if (this.gameState !== "PLAYING" && !this.death.animationActive) return;

    // Update core game state
    this.updateGameState(deltaTime);

    // Update managers
    this.updateManagers(deltaTime, slowdownFactor);

    // Update game entities
    this.updateEntities(deltaTime, slowdownFactor);

    // Update level progression
    this.updateLevelProgression(deltaTime);

    // Check collisions if not in death animation
    if (!this.death.animationActive) {
      this.checkCollisions();

      // Boss collisions are now handled in the unified collision system
    }

    this.ui.update(); // Update UI elements like timer
  }

  updateGameState(deltaTime) {
    // Only update game time if not in death animation
    if (!this.death.animationActive) {
      this.gameTime += deltaTime / 1000; // Convert ms to seconds
    }

    // Update time slow
    if (this.timeSlowActive) {
      this.timeSlowTimer -= 1;
      if (this.timeSlowTimer <= 0) {
        this.timeSlowActive = false;
      }
    }

    // Update cooldowns
    if (this.timeSlowCooldown > 0) {
      this.timeSlowCooldown -= 1;
    }
  }

  updateManagers(deltaTime, slowdownFactor) {
    // Update background
    this.background.update();

    // Update dialog system
    this.dialog.update(deltaTime);

    // Update UI cooldown visuals
    this.ui.updateCooldownVisuals();

    // Update cheat manager (for cursor hiding and button states)
    this.cheats.update();
  }

  updateEntities(deltaTime, slowdownFactor) {
    const input = this.inputHandler.getInput();

    // Handle autoplay abilities BEFORE processing input
    if (this.autoplay) {
      this.player.autoplayer.handleAutoplayAbilities(
        this.allEnemies, 
        this.enemyBullets, 
        this.enemyLasers, 
        this.asteroids, 
        this.boss, 
        input, 
        this.powerups,
        this // Pass game object for cooldown checks
      );
    }

    // Handle input (now includes autoplayer modifications)
    if (input.shift) {
      this.activateShield();
    }
    if (input.f) {
      this.activateTimeSlow();
    }
    if (input.z) {
      this.activateBomb();
    }

    // Update player
    this.player.update(
      input,
      this.allEnemies,
      this.asteroids,
      this.isPortrait,
      this.autoaim,
      this.player.mainWeaponLevel,
      this.timeSlowActive,
      this.boss,
      this.autoplay,
      this.enemyBullets,
      this.enemyLasers,
      this.powerups
    );

    // Player shooting (prevent firing during death animation)
    // For autoplay, only fire when there are valid targets on screen
    let shouldAutoplayFire = false;
    if (this.autoplay) {
      shouldAutoplayFire = this.player.autoplayer.hasValidTargets(this.allEnemies, this.asteroids, this.boss);
    }
    
    if ((input.fire || (this.autoplay && shouldAutoplayFire)) && !this.death.animationActive) {
      const weaponType = this.player.shoot(
          this.bullets,
          Bullet,
          Laser,
          HomingMissile,
          this.isPortrait,
          true // isPlayerBullet
        );

      // Handle different weapon sounds
      if (weaponType === "laser") {
        this.audio.startContinuousLaser();
      } else if (weaponType === "bullet") {
        this.audio.playSound(this.audio.sounds.shoot);
      }
    } else {
      // Stop continuous laser sound when not firing
      this.audio.stopContinuousLaser();
    }

    // Update bullets
    this.bullets = this.bullets.filter((bullet) => {
      if (bullet instanceof HomingMissile) {
        return bullet.update(this.allEnemies, slowdownFactor);
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
    const newEnemyBullets = [];
    this.enemyBullets = this.enemyBullets.filter((bullet) => {
      if (bullet instanceof SpreadingBullet) {
        return bullet.update(slowdownFactor, (newBullet) => {
          newEnemyBullets.push(newBullet);
        });
      } else {
        bullet.update(slowdownFactor);
        if (bullet.enemyType === "pulse") {
          return bullet.life > 0;
        }
        return (
          bullet.x > -50 &&
          bullet.x < this.canvas.width + 50 &&
          bullet.y > -50 &&
          bullet.y < this.canvas.height + 50
        );
      }
    });
    this.enemyBullets.push(...newEnemyBullets);
    this.enemyLasers = this.enemyLasers.filter((laser) =>
      laser.update(slowdownFactor)
    );

    // Update metals
    this.metals = this.metals.filter((metal) => metal.update(slowdownFactor));

    // Update asteroids
    this.asteroids = this.asteroids.filter((asteroid) => {
      asteroid.update(slowdownFactor);
      if (this.isPortrait) {
        return asteroid.y < this.canvas.height + asteroid.size;
      } else {
        return asteroid.x > -asteroid.size;
      }
    });

    // Update all enemies uniformly
    this.updateAllEnemies(slowdownFactor);

    // Update particles
    this.particles = this.particles.filter((particle) => {
      particle.update(slowdownFactor);
      return particle.life > 0;
    });

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
  }

  updateAllEnemies(slowdownFactor) {
    // Rebuild unified enemy list
    this.allEnemies = [...this.enemies, ...this.miniBosses];
    if (this.boss) {
      this.allEnemies.push(this.boss);
    }

    // Update regular enemies
    const clonedEnemies = [];
    this.enemies = this.enemies.filter((enemy) => {
      enemy.update(
        this.player.x,
        this.player.y,
        this.enemyBullets,
        this.enemyLasers,
        slowdownFactor,
        (enemy) => clonedEnemies.push(enemy)
      );
      enemy.shoot(this.enemyBullets, this.player);
      if (this.isPortrait) {
        return enemy.y > -50;
      } else {
        return enemy.x > -50;
      }
    });
    // add any recently cloned ones
    this.enemies.push(...clonedEnemies);

    // Update mini-bosses
    this.miniBosses.forEach((miniBoss) => {
      const updateResult = miniBoss.update(
        this.player.x,
        this.player.y,
        slowdownFactor
      );

      if (updateResult === "rain_explosion") {
        // Create random explosion around the miniboss
        const explosionRadius = 100;
        const randomAngle = Math.random() * Math.PI * 2;
        const randomDistance = Math.random() * explosionRadius;
        const explosionX = miniBoss.x + Math.cos(randomAngle) * randomDistance;
        const explosionY = miniBoss.y + Math.sin(randomAngle) * randomDistance;

        this.effects.createRainbowExplosion(explosionX, explosionY);
        this.audio.playSound(this.audio.sounds.enemyExplosion);
      } else if (updateResult === "final_explosion") {
        // Create large final explosion and award score
        this.effects.createRainbowExplosion(miniBoss.x, miniBoss.y, true); // Large explosion
        this.effects.createChainExplosion(miniBoss.x, miniBoss.y, 5); // Chain explosion
        this.audio.playSound(this.audio.sounds.enemyExplosion);

        // Award score
        this.score += 1000;
        this.ui.update();

        // Mark for removal
        miniBoss.readyToRemove = true;
      } else if (!miniBoss.dying) {
        // Only handle weapons if not dying
        this.handleEnemyWeapons(miniBoss);

        // Handle mini-boss specific spawning
        if (miniBoss.canSpawnEnemy && miniBoss.canSpawnEnemy()) {
          const enemyData = miniBoss.spawnEnemy(this.player.x, this.player.y);
          this.enemies.push(
            new Enemy(
              enemyData.x,
              enemyData.y,
              enemyData.type,
              enemyData.isPortrait,
              enemyData.speed
            )
          );
        }
      }
    });

    // Remove minibosses that are ready to be removed
    this.miniBosses = this.miniBosses.filter((miniBoss) => {
      if (miniBoss.readyToRemove) {
        // Check if all mini-bosses are defeated
        if (this.miniBosses.length === 1) {
          // Will be 0 after filtering
          this.miniBossesDefeated = true;
          this.cleanupPhaseTimer = 0;
          this.cleanupEnemiesExploded = false;
          this.gamePhase = 3;
        }
        return false;
      }
      return true;
    });

    // Update boss
    if (this.boss) {
      this.boss.update(this.player.x, this.player.y);
      this.handleEnemyWeapons(this.boss);
    }
  }

  handleEnemyWeapons(enemy) {
    // Handle new boss system
    if (enemy instanceof Boss) {
      // Fire left arm lasers
      const leftArmLasers = enemy.fireLeftArm(this.player.x, this.player.y);
      leftArmLasers.forEach((data) => {
        this.enemyLasers.push(
          new Laser(data.x, data.y, data.angle, data.speed, data.color)
        );
      });

      // Fire right arm bullets
      const rightArmBullets = enemy.fireRightArm(this.player.x, this.player.y);
      rightArmBullets.forEach((bulletData) => {
        this.createEnemyBullet(bulletData);
      });

      // Fire final phase attacks
      const finalPhaseData = enemy.fireFinalPhase(this.player.x, this.player.y);
      finalPhaseData.bullets.forEach((bulletData) => {
        this.createEnemyBullet(bulletData);
      });

      // Spawn enemies in final phase
      finalPhaseData.enemies.forEach((enemyData) => {
        this.enemies.push(
          new Enemy(enemyData.x, enemyData.y, enemyData.type, this.isPortrait)
        );
      });
    } else {
      // Handle other enemies (old system)
      // Handle primary weapon
      if (enemy.canFirePrimary && enemy.canFirePrimary()) {
        const weaponData = enemy.firePrimary(this.player.x, this.player.y);
        if (Array.isArray(weaponData)) {
          weaponData.forEach((bulletData) => {
            this.createEnemyBullet(bulletData);
          });
        } else {
          this.createEnemyBullet(weaponData);
        }
      }

      // Handle secondary weapon
      if (enemy.canFireSecondary && enemy.canFireSecondary()) {
        const weaponData = enemy.fireSecondary(this.player.x, this.player.y);
        if (Array.isArray(weaponData)) {
          weaponData.forEach((data) => {
            if (data.type === "laser") {
              this.enemyLasers.push(
                new Laser(data.x, data.y, data.angle, data.speed, data.color)
              );
            } else {
              this.createEnemyBullet(data);
            }
          });
        } else {
          this.createEnemyBullet(weaponData);
        }
      }
    }

    // Handle other weapon types
    if (enemy.canFireCircular && enemy.canFireCircular()) {
      const bulletsData = enemy.fireCircular(this.player.x, this.player.y);
      bulletsData.forEach((bulletData) => {
        this.createEnemyBullet(bulletData);
      });
    }

    if (enemy.canFireBurst && enemy.canFireBurst()) {
      const bulletsData = enemy.fireBurst(this.player.x, this.player.y);
      bulletsData.forEach((bulletData) => {
        this.createEnemyBullet(bulletData);
      });
    }

    if (enemy.canFireSpecial && enemy.canFireSpecial()) {
      const weaponData = enemy.fireSpecial();
      weaponData.forEach((data) => {
        // Pulse circles removed from game
      });
    }

    if (enemy.canFireSpiral && enemy.canFireSpiral()) {
      const bulletsData = enemy.fireSpiral();
      bulletsData.forEach((bulletData) => {
        this.createEnemyBullet(bulletData);
      });
    }
  }

  createEnemyBullet(bulletData) {
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

  updateLevelProgression(deltaTime) {
    // Spawn powerups occasionally
    this.powerupSpawnTimer++;
    if (this.powerupSpawnTimer > 1200 + Math.random() * 1800) {
      this.spawnPowerup();
      this.powerupSpawnTimer = 0;
    }

    // Spawn metals during phases 1 and 2
    if (this.gamePhase >= 1 && this.gamePhase <= 2) {
      this.metalSpawnTimer++;
      if (this.metalSpawnTimer > 1800 + Math.random() * 2400) {
        // Less frequent than powerups
        this.spawnMetal();
        this.metalSpawnTimer = 0;
      }
    }

    // Game progression phases
    this.updateGamePhase();

    // Spawn asteroids based on current phase
    this.asteroidSpawnTimer++;
    const asteroidSpawnRate = this.getAsteroidSpawnRate();
    if (this.asteroidSpawnTimer > asteroidSpawnRate) {
      const rand = Math.random();
      let type = "medium";
      if (rand < 0.1) {
        type = "large";
      } else if (rand > 0.8) {
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
      this.spawnMiniBosses();
    }

    // Handle Phase 3: Cleanup phase after minibosses are defeated
    if (this.gamePhase === 3) {
      this.handleCleanupPhase(deltaTime);
    }

    // Handle boss dialog delay phase
    if (this.gamePhase === "WAITING_FOR_BOSS_DIALOG") {
      if (
        this.enemies.length === 0 &&
        this.asteroids.length === 0 &&
        this.enemyBullets.length === 0 &&
        this.enemyLasers.length === 0
      ) {
        this.bossDialogTimer += deltaTime;
        if (this.bossDialogTimer >= 5000) {
          this.gamePhase = 5;
          this.dialog.show();
        }
      }
    }
  }

  spawnMiniBosses() {
    try {
      let alphaX, alphaY, betaX, betaY;

      if (this.isPortrait) {
        const centerX = this.canvas.width / 2;
        const spacing = 120;
        alphaX = centerX - spacing;
        alphaY = -100;
        betaX = centerX + spacing;
        betaY = -100;
      } else {
        const centerY = this.canvas.height / 2;
        const spacing = 150;
        alphaX = this.canvas.width + 100;
        alphaY = centerY - spacing;
        betaX = this.canvas.width + 100;
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

      this.spawnPowerup();
      this.gamePhase = 2;
    } catch (error) {
      console.error("Error spawning mini-bosses:", error);
    }
  }

  handleCleanupPhase(deltaTime) {
    this.cleanupPhaseTimer += deltaTime;

    // Explode all remaining enemies immediately (only once)
    if (!this.cleanupEnemiesExploded) {
      this.cleanupEnemiesExploded = true;
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        this.effects.createEnemyExplosion(enemy.x, enemy.y);
        this.enemies.splice(i, 1);
      }
      this.enemyBullets = [];
      this.enemyLasers = [];
    }

    // After 5 seconds, spawn 2 powerups and show boss dialog
    if (this.cleanupPhaseTimer >= 5000) {
      if (!this.cleanupPowerupsSpawned) {
        this.spawnPowerup();
        this.spawnPowerup();
        this.cleanupPowerupsSpawned = true;
      }

      if (this.cleanupPhaseTimer >= 6000) {
        this.gamePhase = 4;
        this.dialog.show();
      }
    }
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
          let shouldRemoveBullet = false;
          let damage = 1;

          if (bullet instanceof Laser) {
            // Laser does reduced damage (0.5) and tracks penetration
            damage = 0.5;
            if (bullet.registerHit()) {
              shouldRemoveBullet = true; // Remove laser if penetration limit reached
            }
          } else {
            shouldRemoveBullet = true; // Regular bullets are destroyed on hit
          }

          // Remove bullet if needed
          if (shouldRemoveBullet) {
            this.bullets.splice(i, 1);
          }

          const damageResult = asteroid.takeDamage(damage);
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
          // If bullet was removed, break from inner loop
          if (shouldRemoveBullet) {
            break;
          }
        }
      }
    }

    // Player bullets vs all enemies (unified)
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      for (let j = this.allEnemies.length - 1; j >= 0; j--) {
        const bullet = this.bullets[i];
        const enemy = this.allEnemies[j];
        let collision = false;

        if (bullet instanceof Laser) {
          collision = this.checkLaserCollision(bullet, enemy);
        } else {
          collision = this.checkCollision(bullet, enemy);
        }

        if (collision) {
          let shouldRemoveBullet = false;
          let damage = 1;

          if (bullet instanceof Laser) {
            // Laser does reduced damage (0.5) and tracks penetration
            damage = 0.5;
            if (bullet.registerHit()) {
              shouldRemoveBullet = true; // Remove laser if penetration limit reached
            }
          } else {
            shouldRemoveBullet = true; // Regular bullets are destroyed on hit
          }

          // Remove bullet if needed
          if (shouldRemoveBullet) {
            this.bullets.splice(i, 1);
          }

          const result = this.handleEnemyDamage(enemy, damage, bullet.x, bullet.y);
          if (result === "destroyed") {
            this.removeDestroyedEnemy(enemy);
          }

          // If bullet was removed, break from inner loop
          if (shouldRemoveBullet) {
            break;
          }
        }
      }
    }

    // Player bullets vs enemy bullets (specifically SpreadingBullet)
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      for (let j = this.enemyBullets.length - 1; j >= 0; j--) {
        const playerBullet = this.bullets[i];
        const enemyBullet = this.enemyBullets[j];

        if (enemyBullet instanceof SpreadingBullet) {
          if (this.checkCollision(playerBullet, enemyBullet)) {
            // Damage the spreading bullet
            const destroyed = enemyBullet.takeDamage(1);
            if (destroyed) {
              // If destroyed, it will explode in its update method
              // We don't remove it here, its update will handle removal after explosion
            }
            this.bullets.splice(i, 1); // Remove player bullet
            break; // Only hit one spreading bullet per player bullet
          }
        }
      }
    }

    // Player bullets vs metals (bounce off)
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      for (let j = this.metals.length - 1; j >= 0; j--) {
        const bullet = this.bullets[i];
        const metal = this.metals[j];

        if (bullet instanceof Laser) {
          // Lasers are destroyed by metal
          const hitSegment = metal.checkBulletCollision(bullet);
          if (hitSegment) {
            this.bullets.splice(i, 1);
            break;
          }
          continue;
        }

        const hitSegment = metal.checkBulletCollision(bullet);
        if (hitSegment) {
          // Bounce the bullet
          const bounceResult = metal.calculateBounceDirection(
            bullet,
            hitSegment
          );
          bullet.angle = bounceResult.angle;
          bullet.speed = bounceResult.speed;

          // Move bullet slightly away from metal to prevent multiple collisions
          bullet.x += Math.cos(bullet.angle) * 5;
          bullet.y += Math.sin(bullet.angle) * 5;

          break; // Only bounce once per frame
        }
      }
    }

    // Enemy bullets vs metals (bounce off)
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      for (let j = this.metals.length - 1; j >= 0; j--) {
        const bullet = this.enemyBullets[i];
        const metal = this.metals[j];

        const hitSegment = metal.checkBulletCollision(bullet);
        if (hitSegment) {
          // Bounce the bullet
          const bounceResult = metal.calculateBounceDirection(
            bullet,
            hitSegment
          );
          bullet.angle = bounceResult.angle;
          bullet.speed = bounceResult.speed;

          // Move bullet slightly away from metal to prevent multiple collisions
          bullet.x += Math.cos(bullet.angle) * 5;
          bullet.y += Math.sin(bullet.angle) * 5;

          break; // Only bounce once per frame
        }
      }
    }

    // Enemy lasers vs metals (destroyed by metal)
    for (let i = this.enemyLasers.length - 1; i >= 0; i--) {
      for (let j = this.metals.length - 1; j >= 0; j--) {
        const laser = this.enemyLasers[i];
        const metal = this.metals[j];

        const hitSegment = metal.checkBulletCollision(laser);
        if (hitSegment) {
          // Destroy the laser
          this.enemyLasers.splice(i, 1);
          break;
        }
      }
    }

    // Player vs metals (push player along with metal movement)
    for (let i = this.metals.length - 1; i >= 0; i--) {
      const metal = this.metals[i];
      const hitSegment = metal.checkPlayerCollision(this.player);
      if (hitSegment) {
        // Push player along with metal movement
        this.player.x += metal.vx;
        this.player.y += metal.vy;

        // Keep player on screen
        this.player.x = Math.max(
          20,
          Math.min(this.player.x, window.innerWidth - 20)
        );
        this.player.y = Math.max(
          20,
          Math.min(this.player.y, window.innerHeight - 20)
        );

        break; // Only push once per frame
      }
    }

    // Player vs asteroids (only if not shielding, not in godmode, and not rainbow invulnerable)
    if (
      !this.player.isShielding &&
      !this.player.godMode &&
      !this.player.rainbowInvulnerable
    ) {
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

    // Player vs all enemies (unified)
    if (
      !this.player.isShielding &&
      !this.player.godMode &&
      !this.player.rainbowInvulnerable
    ) {
      for (let i = this.allEnemies.length - 1; i >= 0; i--) {
        if (this.checkPlayerCollision(this.player, this.allEnemies[i])) {
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

    // Player vs enemy bullets (only if not shielding, not in godmode, and not rainbow invulnerable)
    if (
      !this.player.isShielding &&
      !this.player.godMode &&
      !this.player.rainbowInvulnerable
    ) {
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
    if (
      !this.player.isShielding &&
      !this.player.godMode &&
      !this.player.rainbowInvulnerable
    ) {
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
    
    // Special collision handling for boss - use precise hitbox detection
    if (obj2 instanceof Boss) {
      // Check if bullet hits any boss part using boss's getHitPart method
      return obj2.getHitPart(obj1.x, obj1.y) !== null;
    }
    
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < obj1.size + obj2.size;
  }

  checkLaserCollision(laser, target) {
    // Special collision handling for boss - check if laser intersects boss parts
    if (target instanceof Boss) {
      const laserStartX = laser.x;
      const laserStartY = laser.y;
      const laserEndX = laser.x + Math.cos(laser.angle) * 200; // Laser length is 200
      const laserEndY = laser.y + Math.sin(laser.angle) * 200;
      
      // Check multiple points along the laser line
      const steps = 20;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const checkX = laserStartX + t * (laserEndX - laserStartX);
        const checkY = laserStartY + t * (laserEndY - laserStartY);
        
        if (target.getHitPart(checkX, checkY) !== null) {
          return true;
        }
      }
      return false;
    }

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
    // Line-to-circle collision detection
    const dx = player.x - laser.x;
    const dy = player.y - laser.y;

    // Calculate laser direction vector
    const laserDx = Math.cos(laser.angle);
    const laserDy = Math.sin(laser.angle);

    // Project player position onto laser line
    const projection = dx * laserDx + dy * laserDy;

    // Clamp projection to laser length
    const clampedProjection = Math.max(0, Math.min(laser.length, projection));

    // Find closest point on laser to player
    const closestX = laser.x + clampedProjection * laserDx;
    const closestY = laser.y + clampedProjection * laserDy;

    // Check distance from player to closest point on laser
    const distanceToLaser = Math.sqrt(
      (player.x - closestX) ** 2 + (player.y - closestY) ** 2
    );

    // Collision if distance is less than player hitbox + laser width
    return distanceToLaser < player.hitboxSize + laser.width / 2;
  }

  checkPlayerCollision(player, obj) {
    // Player is immune to damage while shielding, in god mode, or rainbow invulnerable
    if (player.isShielding || player.godMode || player.rainbowInvulnerable) {
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
      case "rainbowStar":
        this.player.activateRainbowInvulnerability();
        break;
    }
  }

  render() {
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.background.render(this.ctx);

    if (this.gameState === "TITLE" || this.gameState === "PAUSED") {
      this.titleScreen.render();
    }

    if (
      this.gameState === "PLAYING" ||
      this.gameState === "PAUSED" ||
      this.gameState === "DEATH_ANIMATION"
    ) {
      // Apply fade effect to all non-player elements during time slow
      if (this.timeSlowActive) {
        this.ctx.globalAlpha = 0.6; // Fade other elements
      }

      this.powerups.forEach((powerup) => powerup.render(this.ctx));
      this.explosions.forEach((explosion) => explosion.render(this.ctx));
      this.textParticles.forEach((particle) => particle.render(this.ctx));

      // Reset alpha for player (keep player at full opacity)
      if (this.timeSlowActive) {
        this.ctx.globalAlpha = 1.0;
      }

      if (this.gameState !== "DEATH_ANIMATION") {
        this.player.render(this.ctx);
      }

      // Apply fade effect to other elements again
      if (this.timeSlowActive) {
        this.ctx.globalAlpha = 0.6;
      }

      this.bullets.forEach((bullet) => bullet.render(this.ctx));
      this.enemyBullets.forEach((bullet) => bullet.render(this.ctx));
      this.enemyLasers.forEach((laser) => laser.render(this.ctx));
      this.asteroids.forEach((asteroid) => asteroid.render(this.ctx));
      this.metals.forEach((metal) => metal.render(this.ctx));
      this.enemies.forEach((enemy) => enemy.render(this.ctx));
      this.miniBosses.forEach((miniBoss) => miniBoss.render(this.ctx));
      if (this.boss) {
        this.boss.render(this.ctx);
      }
      this.particles.forEach((particle) => particle.render(this.ctx));

      // Reset alpha after rendering all elements
      this.ctx.globalAlpha = 1.0;
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

  loop() {
    // Calculate deltaTime for smooth animations
    const now = performance.now();
    const deltaTime = now - this.lastTime;
    this.lastTime = now;

    // Update title screen animations if visible
    if (this.gameState === "TITLE" || this.gameState === "PAUSED") {
      this.titleScreen.update();
    }

    // Update game logic only when playing or during death animation
    if (this.gameState === "PLAYING") {
      const slowdownFactor = this.timeSlowActive ? 0.2 : 1.0;
      this.update(deltaTime, slowdownFactor);
    } else if (this.death.animationActive) {
      this.update(deltaTime, 1.0); // Update even during death animation
    }

    // Render everything
    this.render();

    // Request next frame
    requestAnimationFrame(() => this.loop());
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
        if (dist < enemy.size + 10) {
          // Add 10px margin for easier targeting
          isOverTarget = true;
          break;
        }
      }

      // Check asteroids if not already over an enemy
      if (!isOverTarget) {
        for (let asteroid of this.asteroids) {
          const dist = Math.sqrt((x - asteroid.x) ** 2 + (y - asteroid.y) ** 2);
          if (dist < asteroid.size + 10) {
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
          if (dist < miniBoss.size + 10) {
            // Add 10px margin for easier targeting
            isOverTarget = true;
            break;
          }
        }
      }

      // Check level 1 boss if not already over a target
      if (!isOverTarget && this.boss) {
        const dist = Math.sqrt((x - this.boss.x) ** 2 + (y - this.boss.y) ** 2);
        if (dist < this.boss.size + 10) {
          // Add 10px margin for easier targeting
          isOverTarget = true;
        }
      }

      // Draw crosshair with appropriate color
      this.ctx.save();
      this.ctx.strokeStyle = isOverTarget ? "#00ff00" : "#ffffff"; // Green if over target, white otherwise
      this.ctx.lineWidth = 2;
      this.ctx.globalAlpha = 1.0;

      const size = 15;
      this.ctx.beginPath();
      // Vertical line - perfect plus sign with gap in center
      this.ctx.moveTo(x, y - size);
      this.ctx.lineTo(x, y - 3);
      this.ctx.moveTo(x, y + 3);
      this.ctx.lineTo(x, y + size);
      // Horizontal line - perfect plus sign with gap in center
      this.ctx.moveTo(x - size, y);
      this.ctx.lineTo(x - 3, y);
      this.ctx.moveTo(x + 3, y);
      this.ctx.lineTo(x + size, y);
      this.ctx.stroke();

      this.ctx.restore();
    }
  }

  pauseGame() {
    this.gameState = "PAUSED";
    this.elements.titleScreen.style.display = "flex";
    this.elements.titleContent.style.display = "flex";
    this.elements.pauseContent.style.display = "flex";
    document.body.style.cursor = "default";
    const startButton = document.getElementById("start-button");
    if (startButton) {
      startButton.style.display = "block";
    }

    // Pause background music when game is paused
    this.audio.pauseBackgroundMusic();
  }

  resumeGame() {
    this.gameState = "PLAYING";
    this.elements.titleScreen.style.display = "none";
    this.elements.pauseContent.style.display = "none";
    const startButton = document.getElementById("start-button");
    if (startButton) {
      startButton.style.display = "none";
    }
    document.body.style.cursor = "none";

    // Resume background music when game resumes
    this.audio.resumeBackgroundMusic();
  }

  activateShield() {
    // Trigger the player's shield ability
    if (this.player && this.player.activateShield()) {
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
      this.handleEnemyDamage(this.boss, 100, this.boss.x, this.boss.y); // Very high damage to boss
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

  // Boss fight logic is now handled in updateAllEnemies and handleEnemyWeapons

  handleEnemyDamage(enemy, damage, bulletX = enemy.x, bulletY = enemy.y) {
    // Handle damage based on enemy type
    if (enemy instanceof Boss) {
      // New boss system with bullet coordinates
      const result = enemy.takeDamage(damage, bulletX, bulletY);
      if (result) {
        this.effects.createEnemyExplosion(bulletX, bulletY);
        this.audio.playSound(this.audio.sounds.enemyExplosion);

        if (enemy.isDefeated) {
          this.startBossDeathSequence();
          return "destroyed";
        }
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
        this.audio.playSound(this.audio.sounds.enemyExplosion);
        return result;
      } else if (result === "destroyed" || result === "defeated") {
        this.effects.createEnemyExplosion(enemy.x, enemy.y);
        this.audio.playSound(this.audio.sounds.enemyExplosion);

        // Award score based on enemy type
        if (enemy.maxHealth > 1000) {
          // Boss
          this.startBossDeathSequence();
        } else if (enemy.maxHealth > 50) {
          // Mini-boss
          this.score += 1000;
        } else {
          // Regular enemy
          this.score += 200;
        }

        this.ui.update();
        return "destroyed";
      } else if (result === "dying") {
        // Mini-boss is starting death sequence
        this.audio.playSound(this.audio.sounds.enemyExplosion);
        return "dying";
      }
    } else {
      // Regular enemy without takeDamage method
      this.effects.createEnemyExplosion(enemy.x, enemy.y);
      this.audio.playSound(this.audio.sounds.enemyExplosion);
      this.score += 200;
      this.ui.update();
      return "destroyed";
    }

    return null;
  }

  removeDestroyedEnemy(enemy) {
    // Remove from appropriate array
    const enemyIndex = this.enemies.indexOf(enemy);
    if (enemyIndex !== -1) {
      this.enemies.splice(enemyIndex, 1);
      return;
    }

    const miniBossIndex = this.miniBosses.indexOf(enemy);
    if (miniBossIndex !== -1) {
      this.miniBosses.splice(miniBossIndex, 1);

      // Check if all mini-bosses are defeated
      if (this.miniBosses.length === 0) {
        this.miniBossesDefeated = true;
        this.cleanupPhaseTimer = 0;
        this.cleanupEnemiesExploded = false;
        this.gamePhase = 3;
      }
      return;
    }

    if (this.boss === enemy) {
      this.boss = null;
      return;
    }
  }

  checkBossCollisions() {
    // Boss collisions are now handled in the unified collision system
    // This method is kept for compatibility but does nothing
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
    this.elements.levelCleared.style.display = "flex";

    // Fade out the canvas
    this.elements.gameCanvas.style.transition = "opacity 1s";
    this.elements.gameCanvas.style.opacity = "0.1";
  }

  loop(currentTime) {
    if (!currentTime) currentTime = 0; // For the first call
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    if (this.gameState === "TITLE" || this.gameState === 'PAUSED') {
      this.titleScreen.update();
    } else if (this.gameState === "PLAYING") {
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
