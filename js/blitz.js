// Rainboids: Blitz - A bullet hell space shooter
import { Player } from "./blitz/entities/player.js";
import {
  Enemy,
  Bullet,
  Laser,
  PulseCircle,
  HomingMissile,
  MiniBoss,
  Level1Boss,
} from "./blitz/entities/enemy.js";
import { Asteroid } from "./blitz/entities/asteroid.js";
import { InputHandler } from "./blitz/input.js";

class BlitzGame {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.resizeCanvas();

    this.gameState = "TITLE";
    this.score = 0;
    this.lives = 1;
    this.highScore = this.loadHighScore();
    
    // Death animation properties
    this.deathAnimationActive = false;
    this.deathAnimationTimer = 0;
    this.deathAnimationDuration = 180; // 3 seconds at 60fps
    this.sceneOpacity = 1.0;
    this.gameOverOpacity = 0.0;
    this.deathPosition = { x: 0, y: 0 };
    this.fadeOutStarted = false;
    this.fadeOutTimer = 0;

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

    this.inputHandler = new InputHandler(this.canvas);
    this.isMobile = this.detectMobile();
    
    // Set up audio initialization callback for mobile
    this.inputHandler.onFirstTouch = () => {
      this.initializeAudioOnFirstTouch();
    };
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
    this.level1Boss = null;
    
    // Boss dialog system
    this.bossDialogState = 0; // 0: hidden, 1: "...", 2: threat message, 3: closed
    this.bossDialogActive = false;
    this.bossDialogTimer = 0;

    this.backgroundStars = [];
    this.powerups = [];
    this.explosions = [];
    this.powerupSpawnTimer = 0;
    this.textParticles = []; // For score popups

    // Cheat toggles
    this.autoaimEnabled = false; // Default off
    this.allUpgradesState = null; // Store state before all upgrades
    
    // Audio state
    this.firstGameStart = true; // Track if this is the first game start
    this.musicEnabled = true; // Default music on
    this.soundEnabled = true; // Default sound on

    // New game phase system
    this.miniBossesDefeated = false;
    this.miniBossGodModeTimer = 0;
    this.cleanupPhaseTimer = 0;
    this.cleanupPowerupsSpawned = false;
    this.bossDialogActive = false;
    this.gamePhase = 1;

    // Title screen stars
    this.titleScreenStars = [];
    this.shootingStars = [];

    this.setupBackgroundStars();
    this.setupTitleScreenStars();
    this.setupAudio();
    this.setupEventListeners();
    this.setupCheatButtons();
    this.setupBossDialog();
    this.initializeLucideIcons();
    window.blitzGame = this; // Make game accessible for sound effects
    this.gameLoop();
  }

  loadHighScore() {
    try {
      return parseInt(localStorage.getItem('rainboids-high-score') || '0');
    } catch (e) {
      return 0;
    }
  }

  saveHighScore(score) {
    try {
      if (score > this.highScore) {
        this.highScore = score;
        localStorage.setItem('rainboids-high-score', score.toString());
      }
    } catch (e) {
      // localStorage not available
    }
  }

  detectMobile() {
    return (
      window.matchMedia &&
      window.matchMedia(
        "(hover: none) and (pointer: coarse), (max-width: 768px)"
      ).matches
    );
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    
    // Determine orientation: portrait if height > width
    // This works for both mobile and desktop
    this.isPortrait = this.canvas.height > this.canvas.width;
  }

  setupAudio() {
    // Initialize audio
    this.audioReady = false;
    this.sounds = {
      shoot: this.generateSfxrSound("laserShoot"),
      hit: this.generateSfxrSound("hitHurt"),
      explosion: this.generateSfxrSound("explosion"),
      enemyExplosion: this.generateSfxrSound("enemyExplosion"),
      asteroidExplosion: this.generateSfxrSound("asteroidExplosion"),
      playerExplosion: this.generateSfxrSound("playerExplosion"),
      dash: this.generateSfxrSound("powerUp"),
    };

    // Background music (will be initialized after user interaction)
    this.backgroundMusic = null;
    
    // Audio state tracking
    this.sfxMuted = false;
    this.musicMuted = false;
  }

  generateSfxrSound(type) {
    // Generate sound using sfxr.js for authentic retro game audio
    let synthdef;
    const params = new Params();

    switch (type) {
      case "laserShoot":
        // Simple, subtle laser sound
        synthdef = params.laserShoot();
        synthdef.p_base_freq = 0.5; // Higher pitch, less harsh
        synthdef.p_env_sustain = 0.03; // Very short duration
        synthdef.p_env_decay = 0.08; // Quick decay
        synthdef.p_freq_ramp = -0.2; // Gentle frequency drop
        synthdef.p_lpf_freq = 0.8; // Low pass filter for softer sound
        synthdef.sound_vol = 0.08; // Much lower volume
        break;
      case "hitHurt":
        synthdef = params.hitHurt();
        synthdef.sound_vol = 0.2; // Reduced volume
        synthdef.p_env_sustain = 0.1; // Shorter duration
        break;
      case "explosion":
        synthdef = params.explosion();
        synthdef.sound_vol = 0.12; // Further reduced volume
        synthdef.p_env_sustain = 0.08; // Shorter duration
        synthdef.p_env_decay = 0.15; // Quicker decay
        synthdef.p_lpf_freq = 0.6; // Low pass filter for smoother sound
        synthdef.p_hpf_freq = 0.1; // High pass filter to reduce harshness
        break;
      case "enemyExplosion":
        // Custom enemy explosion - shorter, higher pitch, very subtle
        synthdef = params.explosion();
        synthdef.p_base_freq = 0.4 + Math.random() * 0.2;
        synthdef.p_env_sustain = 0.04 + Math.random() * 0.03;
        synthdef.p_env_decay = 0.08 + Math.random() * 0.08;
        synthdef.p_lpf_freq = 0.7 + Math.random() * 0.2; // Smoother filtering
        synthdef.p_hpf_freq = 0.1; // Reduce low-end harshness
        synthdef.sound_vol = 0.08; // Much more subdued
        break;
      case "asteroidExplosion":
        // Custom asteroid explosion - deeper, but more subtle
        synthdef = params.explosion();
        synthdef.p_base_freq = 0.18 + Math.random() * 0.08;
        synthdef.p_env_sustain = 0.08 + Math.random() * 0.1;
        synthdef.p_env_decay = 0.15 + Math.random() * 0.2;
        synthdef.p_lpf_freq = 0.5 + Math.random() * 0.2; // Smoother filtering
        synthdef.p_hpf_freq = 0.05; // Reduce harshness
        synthdef.sound_vol = 0.1; // More subdued
        break;
      case "playerExplosion":
        // Custom player explosion - extremely subtle and soft
        synthdef = params.explosion();
        synthdef.p_base_freq = 0.1 + Math.random() * 0.05; // Even lower frequency
        synthdef.p_env_sustain = 0.4 + Math.random() * 0.1; // Longer sustain for smoothness
        synthdef.p_env_decay = 0.8 + Math.random() * 0.2; // Very long decay
        synthdef.p_repeat_speed = 0.02 + Math.random() * 0.02; // Much slower repeat
        synthdef.p_lpf_freq = 0.2 + Math.random() * 0.1; // Heavy low-pass filtering
        synthdef.sound_vol = 0.04; // Extremely subtle volume
        break;
      case "powerUp":
        synthdef = params.powerUp();
        synthdef.sound_vol = 0.18; // Reduced volume
        synthdef.p_env_sustain = 0.1; // Shorter duration
        break;
      default:
        synthdef = params.explosion();
        synthdef.sound_vol = 0.2;
    }

    return {
      play: () => {
        if (!this.audioReady || (this.backgroundMusic && this.backgroundMusic.muted)) return;
        try {
          sfxr.play(synthdef);
        } catch (e) {
          console.log("Audio play failed:", e);
        }
      },
    };
  }

  initializeAudioOnFirstTouch() {
    // Initialize audio context on first touch for mobile compatibility
    if (!this.audioReady) {
      this.audioReady = true;
      
      // Create background music object only if we're not on the title screen
      if (this.gameState !== "TITLE" && !this.backgroundMusic) {
        this.backgroundMusic = new Audio("bgm.mp3");
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = 0.3;
        
        // Apply current mute state if applicable
        if (this.musicMuted) {
          this.backgroundMusic.muted = true;
        }
        
        this.backgroundMusic
          .play()
          .catch((e) => console.log("Audio play failed:", e));
      }
    }
  }

  setupEventListeners() {
    // Click/Touch to start
    document.addEventListener("click", () => {
      if (this.gameState === "TITLE") {
        this.startGame();
      } else if (this.gameState === "GAME_OVER") {
        this.restartGame();
      }
    });

    // Start button
    const startBtn = document.getElementById("start-button");
    if (startBtn) {
      startBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.gameState === "TITLE") {
          this.startGame();
        }
      });
      startBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.gameState === "TITLE") {
          this.startGame();
        }
      });
    }

    // Restart button
    const restartBtn = document.getElementById("restart-btn");
    if (restartBtn) {
      restartBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.gameState === "GAME_OVER") {
          this.restartGame();
        }
      });
    }

    document.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        if (this.gameState === "TITLE") {
          this.startGame();
        } else if (this.gameState === "GAME_OVER") {
          this.restartGame();
        }
      },
      { passive: false }
    );

    // Any key to start/restart
    document.addEventListener("keydown", (e) => {
      if (this.gameState === "TITLE") {
        this.startGame();
      } else if (this.gameState === "GAME_OVER") {
        this.restartGame();
      }
    });

    // Resize handler
    window.addEventListener("resize", () => {
      this.resizeCanvas();
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

    // Toggle pause with 'X' or 'Escape' key
    document.addEventListener("keydown", (e) => {
      if (e.key === "x" || e.key === "X" || e.key === "Escape") {
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

    // Volume button
    // Setup audio controls in pause dialog
    this.setupAudioControls();
    
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

  setupAudioControls() {
    // Volume button (all sounds)
    const volumeButton = document.getElementById("volume-btn");
    if (volumeButton) {
      const updateVolumeIcon = () => {
        const icon = volumeButton.querySelector('i');
        if (icon) {
          icon.setAttribute('data-lucide', this.sfxMuted ? 'volume-x' : 'volume-2');
          if (typeof lucide !== 'undefined') {
            lucide.createIcons();
          }
        }
        volumeButton.classList.toggle('muted', this.sfxMuted);
      };
      
      volumeButton.addEventListener("click", (e) => {
        e.stopPropagation();
        this.sfxMuted = !this.sfxMuted;
        // Also mute/unmute music when all sounds are toggled
        this.musicMuted = this.sfxMuted;
        if (this.backgroundMusic) {
          this.backgroundMusic.muted = this.musicMuted;
        }
        updateVolumeIcon();
        updateMusicIcon();
      });
      
      updateVolumeIcon();
    }

    // Music button (music only)
    const musicButton = document.getElementById("music-btn");
    const updateMusicIcon = () => {
      const icon = musicButton.querySelector('i');
      if (icon) {
        icon.setAttribute('data-lucide', 'music');
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
      }
      musicButton.classList.toggle('muted', this.musicMuted);
    };
    
    if (musicButton) {
      musicButton.addEventListener("click", (e) => {
        e.stopPropagation();
        this.musicMuted = !this.musicMuted;
        if (this.backgroundMusic) {
          this.backgroundMusic.muted = this.musicMuted;
        }
        updateMusicIcon();
      });
      
      updateMusicIcon();
    }
  }

  playSound(sound) {
    if (!this.sfxMuted && sound && sound.play) {
      sound.play();
    }
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
      this.audioReady = true;
      
      // Create background music object now that user has interacted
      this.backgroundMusic = new Audio("bgm.mp3");
      this.backgroundMusic.loop = true;
      this.backgroundMusic.volume = 0.3;
      
      // Apply current mute state if applicable
      if (this.musicMuted) {
        this.backgroundMusic.muted = true;
      }
      
      this.backgroundMusic
        .play()
        .catch((e) => console.log("Audio play failed:", e));
      this.firstGameStart = false;
    }

    // Initialize skill indicator
    this.updateUI();
  }

  restartGame() {
    this.gameState = "PLAYING";
    this.score = 0;
    this.lives = 1;

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

    this.asteroidSpawnTimer = 0;
    this.enemySpawnTimer = 0;

    this.backgroundStars = [];
    this.powerups = [];
    this.explosions = [];
    this.powerupSpawnTimer = 0;
    this.setupBackgroundStars();

    document.getElementById("game-over").style.display = "none";
    
    // Reset boss and miniboss state
    this.miniBosses = []; // Clear minibosses
    this.level1Boss = null; // Clear boss
    this.gamePhase = 1; // Reset game phase to initial
    this.gameTime = 0; // Reset game time
    this.bossDialogTimer = 0; // Reset boss dialog timer
    this.bossDialogState = 0; // Reset boss dialog state
    this.bossDialogActive = false; // Reset boss dialog active flag

    // Resume audio if it was already initialized
    if (this.audioReady && this.backgroundMusic && this.backgroundMusic.paused) {
      this.backgroundMusic.play().catch((e) => console.log("Audio resume failed:", e));
    }
    
    this.updateUI();
  }

  setupBackgroundStars() {
    const starColors = [
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
    ];
    const starShapes = ["point", "diamond", "star4", "star8", "plus", "cross"];

    // Create static background stars
    for (let i = 0; i < 200; i++) {
      this.backgroundStars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: 1 + Math.random() * 3,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        shape: starShapes[Math.floor(Math.random() * starShapes.length)],
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.01 + Math.random() * 0.02,
        opacity: 0.3 + Math.random() * 0.7,
      });
    }
  }

  setupTitleScreenStars() {
    this.titleScreenStars = [];
    // Create small white twinkling stars for title screen
    for (let i = 0; i < 100; i++) {
      this.titleScreenStars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.8 + 0.2,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.03 + 0.01,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        color: "#ffffff"
      });
    }
  }

  spawnShootingStar() {
    // Spawn from top right area
    const x = this.canvas.width + Math.random() * 200;
    const y = -Math.random() * 200;
    const speed = 3 + Math.random() * 2;
    const angle = Math.PI * 1.25; // 225 degrees, towards bottom left
    
    this.shootingStars.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 2,
      color: `hsl(${Math.random() * 360}, 100%, 70%)`, // Random rainbow color
      life: 1.0,
      fadeSpeed: 0.005 + Math.random() * 0.01,
      trail: []
    });
  }

  updateTitleScreenStars() {
    // Update twinkling white stars
    this.titleScreenStars.forEach(star => {
      star.twinkle += star.twinkleSpeed;
      star.rotation += star.rotationSpeed;
    });

    // Spawn shooting stars occasionally
    if (Math.random() < 0.01) { // 1% chance per frame
      this.spawnShootingStar();
    }

    // Update shooting stars
    this.shootingStars.forEach((star, index) => {
      // Store current position in trail
      star.trail.push({ x: star.x, y: star.y, life: star.life });
      
      // Limit trail length
      if (star.trail.length > 15) {
        star.trail.shift();
      }
      
      // Update position
      star.x += star.vx;
      star.y += star.vy;
      
      // Fade out
      star.life -= star.fadeSpeed;
      
      // Remove if faded out or off screen
      if (star.life <= 0 || star.x < -100 || star.y > this.canvas.height + 100) {
        this.shootingStars.splice(index, 1);
      }
    });
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

  gameOver() {
    // Play dramatic player explosion sound
    this.playSound(this.sounds.playerExplosion);

    // Create rainbow explosion where ship was
    this.createDeathRainbowExplosion(this.player.x, this.player.y);

    // Start death animation sequence
    this.deathAnimationActive = true;
    this.deathAnimationTimer = 0;
    this.gameOverOpacity = 0.0;
    this.deathPosition = { x: this.player.x, y: this.player.y };
    this.fadeOutStarted = false;
    this.fadeOutTimer = 0;
    
    // Change game state to prevent normal game updates
    this.gameState = "DEATH_ANIMATION";
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

  updateUI() {
    document.getElementById("score-value").textContent = this.score;
    const timerElement = document.getElementById("timer-value");
    if (timerElement && this.gameState !== "PAUSED") {
      const currentSeconds = Math.floor(this.gameTime);
      if (currentSeconds !== this.lastGameTimeSeconds) {
        const minutes = Math.floor(currentSeconds / 60);
        const seconds = Math.floor(currentSeconds % 60);
        timerElement.textContent = `${minutes}:${seconds
          .toString()
          .padStart(2, "0")}`;
        this.lastGameTimeSeconds = currentSeconds;
      }
    }

    // Update skill level indicator
    this.updateSkillIndicator();
  }

  updateSkillIndicator() {
    const primaryLevel = document.getElementById("primary-level");
    const secondaryLevel = document.getElementById("secondary-level");
    const shipsLevel = document.getElementById("ships-level");
    const shieldsLevel = document.getElementById("shields-level");

    if (primaryLevel) primaryLevel.textContent = this.player.mainWeaponLevel;
    if (secondaryLevel)
      secondaryLevel.textContent = this.player.sideWeaponLevel;
    if (shipsLevel) shipsLevel.textContent = this.player.secondShip.length;
    if (shieldsLevel) shieldsLevel.textContent = this.player.shield;
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
      console.warn('Invalid canvas dimensions for enemy spawn:', this.canvas.width, this.canvas.height);
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
    if (this.gameState !== "PLAYING" && !this.deathAnimationActive) return;

    this.gameTime += deltaTime / 1000; // Convert ms to seconds

    const input = this.inputHandler.getInput();

    // Update player
    this.player.update(
      input,
      this.enemies,
      this.asteroids,
      this.isPortrait,
      this.autoaimEnabled,
      this.player.mainWeaponLevel // Pass mainWeaponLevel
    );

    // Player shooting (prevent firing during death animation)
    if (input.fire && !this.deathAnimationActive) {
      this.player.shoot(
        this.bullets,
        this.sounds.shoot,
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

    this.enemyLasers = this.enemyLasers.filter((laser) => laser.update(slowdownFactor));

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
    this.miniBosses.forEach((miniBoss, index) => {
      miniBoss.update(this.player.x, this.player.y, slowdownFactor); // Pass player coordinates

      // Mini-boss primary weapon
      if (miniBoss.canFirePrimary()) {
        const bulletData = miniBoss.firePrimary(this.player.x, this.player.y); // Pass player coordinates
        const angle = Math.atan2(bulletData.vy, bulletData.vx);
        const speed = Math.sqrt(bulletData.vx * bulletData.vx + bulletData.vy * bulletData.vy);
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
        const bulletsData = miniBoss.fireSecondary(this.player.x, this.player.y); // Pass player coordinates
        bulletsData.forEach((bulletData) => {
          const angle = Math.atan2(bulletData.vy, bulletData.vx);
          const speed = Math.sqrt(bulletData.vx * bulletData.vx + bulletData.vy * bulletData.vy);
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
          const speed = Math.sqrt(bulletData.vx * bulletData.vx + bulletData.vy * bulletData.vy);
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
          const speed = Math.sqrt(bulletData.vx * bulletData.vx + bulletData.vy * bulletData.vy);
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
    this.backgroundStars.forEach((star) => {
      star.twinkle += star.twinkleSpeed;
      if (this.isPortrait) {
        star.y += 0.1; // Very slow downward movement
        // Wrap around screen
        if (star.y > this.canvas.height + 10) {
          star.y = -10;
          star.x = Math.random() * this.canvas.width;
        }
      } else {
        star.x -= 0.1; // Very slow leftward movement
        // Wrap around screen
        if (star.x < -10) {
          star.x = this.canvas.width + 10;
          star.y = Math.random() * this.canvas.height;
        }
      }
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
    if (this.enemySpawnTimer > enemySpawnRate && this.gamePhase >= 1 && this.gamePhase <= 2) {
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
      console.log("Spawning mini-bosses at time:", this.gameTime);
      console.log("Method exists?", typeof this.spawnMiniBosses);
      console.log("this object:", this);
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

        console.log("Creating mini-bosses - Portrait mode:", this.isPortrait);
        console.log("Alpha mini-boss at:", alphaX, alphaY);
        console.log("Beta mini-boss at:", betaX, betaY);

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

        console.log("Mini-bosses spawned, total:", this.miniBosses.length);
        this.gamePhase = 2; // Mini-boss phase (phase 2 in the new system)
      } catch (error) {
        console.error("Error spawning mini-bosses:", error);
      }
    }

    // Handle Phase 3: Cleanup phase after minibosses are defeated
    if (this.gamePhase === 3) {
      this.cleanupPhaseTimer += deltaTime;
      console.log(`Cleanup phase running: timer=${this.cleanupPhaseTimer}, powerupsSpawned=${this.cleanupPowerupsSpawned}`);
      
      // Explode all remaining enemies immediately (only once)
      if (!this.cleanupEnemiesExploded) {
        this.cleanupEnemiesExploded = true;
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const enemy = this.enemies[i];
          this.createEnemyExplosion(enemy.x, enemy.y);
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
          console.log("Transitioning to Phase 4: Boss Dialog");
        }
      }
    }

    // Update boss fight
    if (this.gamePhase === 5) {
      this.updateBossFight(slowdownFactor);
    }
    
    // Handle boss dialog delay phase
    if (this.gamePhase === 'WAITING_FOR_BOSS_DIALOG') {
        // Check if all other enemies are cleared
        if (this.enemies.length === 0 &&
            this.asteroids.length === 0 &&
            this.enemyBullets.length === 0 &&
            this.enemyLasers.length === 0 &&
            this.enemyPulseCircles.length === 0) {

            this.bossDialogTimer += deltaTime; // Increment timer using deltaTime
            if (this.bossDialogTimer >= 5000) { // 5 seconds
                this.gamePhase = 5; // Transition to boss dialog phase
                this.showBossDialog();
                console.log("Boss dialog initiated after delay.");
            }
        }
    }
    
    // Only check collisions if not in death animation
    if (!this.deathAnimationActive) {
      this.checkCollisions();
      
      // Check boss collisions
      if (this.gamePhase === 5) {
        this.checkBossCollisions();
      }
    }
    
    this.updateUI(); // Update UI elements like timer
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
            this.updateUI();

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
            this.playSound(this.sounds.asteroidExplosion);
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

          this.createEnemyExplosion(enemy.x, enemy.y);
          this.playSound(this.sounds.enemyExplosion);
          this.enemies.splice(j, 1);
          this.score += 200;
          this.updateUI();

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
          } else if (result === "shield_damaged" || result === "shield_destroyed") {
            this.createEnemyExplosion(miniBoss.x, miniBoss.y);
            this.playSound(this.sounds.enemyExplosion);
          } else if (result === "damaged") {
            this.createEnemyExplosion(miniBoss.x, miniBoss.y);
            this.playSound(this.sounds.enemyExplosion);
          } else if (result === "destroyed") {
            this.miniBosses.splice(j, 1);
            this.score += 1000; // High score for mini-boss defeat
            this.updateUI();
            this.createEnemyExplosion(miniBoss.x, miniBoss.y);
            this.playSound(this.sounds.enemyExplosion);

            // Check if all mini-bosses are defeated
            if (this.miniBosses.length === 0) {
              this.miniBossesDefeated = true;
              this.cleanupPhaseTimer = 0;
              this.cleanupEnemiesExploded = false; // Flag to track if we've exploded enemies
              this.gamePhase = 3; // Transition to cleanup phase
              console.log("All mini-bosses defeated! Starting cleanup phase - transitioning to phase 3");
            }
          }

          // If it's a laser, it can hit multiple targets, so don't break from inner loop
          if (!(bullet instanceof Laser)) {
            break; // Break from inner loop only if not a laser
          }
        }
      }
    }

    // Player vs asteroids (only if not dashing and not in godmode)
    if (!this.player.isDashing && !this.player.godMode) {
      for (let i = this.asteroids.length - 1; i >= 0; i--) {
        if (this.checkPlayerCollision(this.player, this.asteroids[i])) {
          if (this.player.secondShip.length > 0) {
            const destroyedShip = this.player.secondShip.pop(); // Remove one companion ship
            this.createExplosion(destroyedShip.x, destroyedShip.y); // Explosion at companion ship's position
            this.updateUI();
          } else if (this.player.shield > 0) {
            this.player.shield--;
            this.createExplosion(this.player.x, this.player.y);
            this.updateUI();
          } else {
            this.createExplosion(this.player.x, this.player.y);
            this.gameOver();
            return;
          }
        }
      }
    }

    // Player vs enemies (only if not dashing and not in godmode)
    if (!this.player.isDashing && !this.player.godMode) {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        if (this.checkPlayerCollision(this.player, this.enemies[i])) {
          if (this.player.secondShip.length > 0) {
            const destroyedShip = this.player.secondShip.pop();
            this.createExplosion(destroyedShip.x, destroyedShip.y);
            this.updateUI();
          } else if (this.player.shield > 0) {
            this.player.shield--;
            this.createExplosion(this.player.x, this.player.y);
            this.updateUI();
          } else {
            this.createExplosion(this.player.x, this.player.y);
            this.gameOver();
            return;
          }
        }
      }

      // Player vs mini-bosses
      for (let i = this.miniBosses.length - 1; i >= 0; i--) {
        if (this.checkPlayerCollision(this.player, this.miniBosses[i])) {
          if (this.player.secondShip.length > 0) {
            const destroyedShip = this.player.secondShip.pop();
            this.createExplosion(destroyedShip.x, destroyedShip.y);
            this.updateUI();
          } else if (this.player.shield > 0) {
            this.player.shield--;
            this.createExplosion(this.player.x, this.player.y);
            this.updateUI();
          } else {
            this.createExplosion(this.player.x, this.player.y);
            this.gameOver();
            return;
          }
        }
      }
    }

    // Player vs enemy bullets (only if not dashing and not in godmode)
    if (!this.player.isDashing && !this.player.godMode) {
      for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
        if (this.checkPlayerCollision(this.player, this.enemyBullets[i])) {
          if (this.player.secondShip.length > 0) {
            const destroyedShip = this.player.secondShip.pop();
            this.createExplosion(destroyedShip.x, destroyedShip.y);
            this.enemyBullets.splice(i, 1); // Remove enemy bullet
            this.updateUI();
          } else if (this.player.shield > 0) {
            this.player.shield--;
            this.enemyBullets.splice(i, 1);
            this.createExplosion(this.player.x, this.player.y);
            this.updateUI();
          } else {
            this.createExplosion(this.player.x, this.player.y);
            this.gameOver();
            return;
          }
        }
      }
    }

    // Player vs enemy lasers
    if (!this.player.isDashing && !this.player.godMode) {
      for (let i = this.enemyLasers.length - 1; i >= 0; i--) {
        if (this.checkPlayerLaserCollision(this.player, this.enemyLasers[i])) {
          if (this.player.secondShip.length > 0) {
            const destroyedShip = this.player.secondShip.pop();
            this.createExplosion(destroyedShip.x, destroyedShip.y);
            this.updateUI();
          } else if (this.player.shield > 0) {
            this.player.shield--;
            this.createExplosion(this.player.x, this.player.y);
            this.updateUI();
          } else {
            this.createExplosion(this.player.x, this.player.y);
            this.gameOver();
            return;
          }
        }
      }
    }

    // Player vs enemy pulse circles
    if (!this.player.isDashing && !this.player.godMode) {
      for (let i = this.enemyPulseCircles.length - 1; i >= 0; i--) {
        if (this.checkPlayerCollision(this.player, this.enemyPulseCircles[i])) {
          if (this.player.secondShip.length > 0) {
            const destroyedShip = this.player.secondShip.pop();
            this.createExplosion(destroyedShip.x, destroyedShip.y);
            this.enemyPulseCircles.splice(i, 1); // Remove pulse circle
            this.updateUI();
          } else if (this.player.shield > 0) {
            this.player.shield--;
            this.enemyPulseCircles.splice(i, 1);
            this.createExplosion(this.player.x, this.player.y);
            this.updateUI();
          } else {
            this.createExplosion(this.player.x, this.player.y);
            this.gameOver();
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
    // Player is immune to damage while dashing
    if (player.isDashing) {
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

  createRainbowExplosion(x, y) {
    this.explosions.push(new RainbowExplosion(x, y));
  }

  createDeathRainbowExplosion(x, y) {
    // Create a medium-sized rainbow explosion similar to asteroids
    this.explosions.push(new RainbowExplosion(x, y, 120));
    
    // Add rainbow particles scattered around the explosion
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const distance = 30 + Math.random() * 40;
      const particleX = x + Math.cos(angle) * distance;
      const particleY = y + Math.sin(angle) * distance;
      
      // Create rainbow debris particles
      this.particles.push(new RainbowParticle(particleX, particleY));
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
        const bombRadius = 750; // 5x larger radius
        this.createRainbowExplosion(this.player.x, this.player.y, bombRadius);

        // Play bomb explosion sound
        this.playSound(this.sounds.playerExplosion);

        // Destroy nearby enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const dx = this.enemies[i].x - this.player.x;
          const dy = this.enemies[i].y - this.player.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < bombRadius) {
            this.createExplosion(this.enemies[i].x, this.enemies[i].y);
            this.createDebris(
              this.enemies[i].x,
              this.enemies[i].y,
              this.enemies[i].color
            );
            this.enemies.splice(i, 1);
            this.score += 200;
          }
        }

        // Destroy nearby asteroids
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
          const dx = this.asteroids[i].x - this.player.x;
          const dy = this.asteroids[i].y - this.player.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < bombRadius) {
            this.createExplosion(this.asteroids[i].x, this.asteroids[i].y);
            this.createDebris(this.asteroids[i].x, this.asteroids[i].y, "#888");
            this.asteroids.splice(i, 1);
            this.score += 100;
          }
        }

        // Destroy nearby enemy bullets
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
          const dx = this.enemyBullets[i].x - this.player.x;
          const dy = this.enemyBullets[i].y - this.player.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < bombRadius) {
            this.enemyBullets.splice(i, 1);
          }
        }

        // Create secondary firework explosions at outer edge with staggered timing
        for (let delay = 0; delay < 6; delay++) {
          setTimeout(() => {
            for (let i = 0; i < 6; i++) {
              const angle = (i / 6) * Math.PI * 2 + delay * 0.4;
              const edgeRadius =
                bombRadius * 0.6 + Math.random() * bombRadius * 0.4;
              const x = this.player.x + Math.cos(angle) * edgeRadius;
              const y = this.player.y + Math.sin(angle) * edgeRadius;
              this.createRainbowExplosion(x, y, 200); // Smaller firework bursts
            }
          }, 200 + delay * 100);
        }

        this.updateUI();
        break;
    }
  }

  render() {
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background stars
    this.backgroundStars.forEach((star) => {
      this.ctx.save();
      this.ctx.translate(star.x, star.y);

      const twinkleOpacity =
        star.opacity * (0.5 + 0.5 * Math.sin(star.twinkle));
      this.ctx.globalAlpha = twinkleOpacity;

      if (star.shape === "point") {
        this.ctx.fillStyle = star.color;
        this.ctx.fillRect(-star.size / 2, -star.size / 2, star.size, star.size);
      } else if (star.shape === "diamond") {
        this.ctx.strokeStyle = star.color;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -star.size);
        this.ctx.lineTo(star.size, 0);
        this.ctx.lineTo(0, star.size);
        this.ctx.lineTo(-star.size, 0);
        this.ctx.closePath();
        this.ctx.stroke();
      } else if (star.shape === "plus") {
        this.ctx.strokeStyle = star.color;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -star.size);
        this.ctx.lineTo(0, star.size);
        this.ctx.moveTo(-star.size, 0);
        this.ctx.lineTo(star.size, 0);
        this.ctx.stroke();
      } else if (star.shape === "star4") {
        this.ctx.strokeStyle = star.color;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          const r = i % 2 === 0 ? star.size : star.size * 0.4;
          if (i === 0) {
            this.ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          } else {
            this.ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
        }
        this.ctx.closePath();
        this.ctx.stroke();
      } else if (star.shape === "star8") {
        this.ctx.strokeStyle = star.color;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        for (let i = 0; i < 16; i++) {
          const a = (i * Math.PI) / 8;
          const r = i % 2 === 0 ? star.size : star.size * 0.6;
          if (i === 0) {
            this.ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          } else {
            this.ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
        }
        this.ctx.closePath();
        this.ctx.stroke();
      } else {
        // cross
        this.ctx.strokeStyle = star.color;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(-star.size, -star.size);
        this.ctx.lineTo(star.size, star.size);
        this.ctx.moveTo(star.size, -star.size);
        this.ctx.lineTo(-star.size, star.size);
        this.ctx.stroke();
      }

      this.ctx.restore();
    });

    // Draw title screen stars
    if (this.gameState === "TITLE") {
      this.renderTitleScreenStars();
    }

    if (this.gameState === "PLAYING" || this.gameState === "PAUSED" || this.gameState === "DEATH_ANIMATION") {
      // Draw powerups
      this.powerups.forEach((powerup) => powerup.render(this.ctx));

      // Draw explosions
      this.explosions.forEach((explosion) => explosion.render(this.ctx));

      // Draw text particles
      this.textParticles.forEach((particle) => particle.render(this.ctx));

      // Draw game objects (but not player during death animation)
      if (this.gameState !== "DEATH_ANIMATION") {
        this.player.render(this.ctx);
      }

      // Draw target indicator for mouse position (desktop only)
      this.renderTargetIndicator();

      this.bullets.forEach((bullet) => bullet.render(this.ctx));
      this.enemyBullets.forEach((bullet) => bullet.render(this.ctx));
      this.enemyLasers.forEach((laser) => laser.render(this.ctx));
      this.enemyPulseCircles.forEach((circle) => circle.render(this.ctx));
      this.asteroids.forEach((asteroid) => asteroid.render(this.ctx));
      this.enemies.forEach((enemy) => enemy.render(this.ctx));
      this.miniBosses.forEach((miniBoss) => miniBoss.render(this.ctx));
      
      // Render level 1 boss
      if (this.level1Boss) {
        this.level1Boss.render(this.ctx);
      }
      this.particles.forEach((particle) => particle.render(this.ctx));
    }
    
    // Render death animation effects
    if (this.deathAnimationActive) {
      // Draw explosions during death animation
      this.explosions.forEach((explosion) => explosion.render(this.ctx));
      this.particles.forEach((particle) => particle.render(this.ctx));
      
      // Apply scene fade effect
      if (this.sceneOpacity < 1) {
        this.ctx.fillStyle = `rgba(0, 0, 0, ${1 - this.sceneOpacity})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }

  renderTitleScreenStars() {
    // Render twinkling white stars
    this.titleScreenStars.forEach((star) => {
      this.ctx.save();
      this.ctx.translate(star.x, star.y);
      this.ctx.rotate(star.rotation);

      const twinkleOpacity = star.opacity * (0.5 + 0.5 * Math.sin(star.twinkle));
      this.ctx.globalAlpha = twinkleOpacity;
      
      // Draw rotating plus sign
      this.ctx.strokeStyle = star.color;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(0, -star.size);
      this.ctx.lineTo(0, star.size);
      this.ctx.moveTo(-star.size, 0);
      this.ctx.lineTo(star.size, 0);
      this.ctx.stroke();

      this.ctx.restore();
    });

    // Render shooting stars with trails
    this.shootingStars.forEach((star) => {
      // Draw trail
      for (let i = 0; i < star.trail.length; i++) {
        const trailPoint = star.trail[i];
        const trailOpacity = (i / star.trail.length) * trailPoint.life * 0.8;
        
        this.ctx.save();
        this.ctx.globalAlpha = trailOpacity;
        this.ctx.fillStyle = star.color;
        const trailSize = star.size * (i / star.trail.length) * 0.5;
        this.ctx.fillRect(trailPoint.x - trailSize/2, trailPoint.y - trailSize/2, trailSize, trailSize);
        this.ctx.restore();
      }
      
      // Draw main star
      this.ctx.save();
      this.ctx.globalAlpha = star.life;
      this.ctx.fillStyle = star.color;
      this.ctx.fillRect(star.x - star.size/2, star.y - star.size/2, star.size, star.size);
      
      // Add glow effect
      this.ctx.shadowColor = star.color;
      this.ctx.shadowBlur = 8;
      this.ctx.fillRect(star.x - star.size/2, star.y - star.size/2, star.size, star.size);
      
      this.ctx.restore();
    });
  }

  renderTargetIndicator() {
    const input = this.inputHandler.getInput();
    if (input.mousePosition) {
      const { x, y } = input.mousePosition;
      
      // Draw simple white crosshair
      this.ctx.save();
      this.ctx.strokeStyle = "#ffffff";
      this.ctx.lineWidth = 1;
      this.ctx.globalAlpha = 1.0;
      
      // Draw simple + crosshair (8px by 8px)
      const size = 4; // 4px from center = 8px total
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

  setupCheatButtons() {
    // Godmode button with touch support
    const godmodeBtn = document.getElementById("godmode-btn");
    const toggleGodmode = () => {
      this.player.godMode = !this.player.godMode;
      this.updateCheatButtons();
    };
    godmodeBtn.addEventListener("click", toggleGodmode);
    godmodeBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      toggleGodmode();
    });

    // All upgrades toggle button with touch support
    const allUpgradesBtn = document.getElementById("all-upgrades-btn");
    const toggleAllUpgrades = () => {
      if (this.allUpgradesState === null) {
        // Save current state and apply all upgrades
        this.allUpgradesState = {
          shield: this.player.shield,
          mainWeaponLevel: this.player.mainWeaponLevel,
          sideWeaponLevel: this.player.sideWeaponLevel,
          secondShip: [...this.player.secondShip], // Copy array
        };

        // Apply all upgrades
        this.player.shield = 3; // Max shields (0-3)
        this.player.mainWeaponLevel = 5; // Max main weapon (1-5)
        this.player.sideWeaponLevel = 4; // Max side weapon (0-4)

        // Add maximum companion ships (2)
        this.player.secondShip = []; // Clear existing
        if (this.isPortrait) {
          // Portrait mode: left/right positioning
          this.player.secondShip.push({
            x: this.player.x - 40,
            y: this.player.y,
            initialAngle: this.player.angle,
            offset: -40,
            isHorizontal: true,
          });
          this.player.secondShip.push({
            x: this.player.x + 40,
            y: this.player.y,
            initialAngle: this.player.angle,
            offset: 40,
            isHorizontal: true,
          });
        } else {
          // Landscape mode: above/below positioning
          this.player.secondShip.push({
            x: this.player.x,
            y: this.player.y - 40,
            initialAngle: this.player.angle,
            offset: -40,
            isHorizontal: false,
          });
          this.player.secondShip.push({
            x: this.player.x,
            y: this.player.y + 40,
            initialAngle: this.player.angle,
            offset: 40,
            isHorizontal: false,
          });
        }
      } else {
        // Restore previous state
        this.player.shield = this.allUpgradesState.shield;
        this.player.mainWeaponLevel = this.allUpgradesState.mainWeaponLevel;
        this.player.sideWeaponLevel = this.allUpgradesState.sideWeaponLevel;
        this.player.secondShip = [...this.allUpgradesState.secondShip];
        this.allUpgradesState = null;
      }

      this.updateUI();
      this.updateCheatButtons();
    };
    allUpgradesBtn.addEventListener("click", toggleAllUpgrades);
    allUpgradesBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      toggleAllUpgrades();
    });

    // Autoaim toggle button with touch support
    const autoaimBtn = document.getElementById("autoaim-btn");
    const toggleAutoaim = () => {
      this.autoaimEnabled = !this.autoaimEnabled;
      this.updateCheatButtons();
    };
    autoaimBtn.addEventListener("click", toggleAutoaim);
    autoaimBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      toggleAutoaim();
    });

    // Music toggle button with touch support
    const musicBtn = document.getElementById("music-btn");
    const toggleMusic = () => {
      this.musicEnabled = !this.musicEnabled;
      this.updateCheatButtons();
    };
    musicBtn.addEventListener("click", toggleMusic);
    musicBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      toggleMusic();
    });

    // Volume toggle button with touch support
    const volumeBtn = document.getElementById("volume-btn");
    const toggleVolume = () => {
      this.soundEnabled = !this.soundEnabled;
      this.updateCheatButtons();
    };
    volumeBtn.addEventListener("click", toggleVolume);
    volumeBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      toggleVolume();
    });
  }

  updateCheatButtons() {
    // Godmode button
    const godmodeBtn = document.getElementById("godmode-btn");
    if (godmodeBtn) {
      godmodeBtn.classList.toggle('active', this.player.godMode);
    }

    // All Upgrades button
    const allUpgradesBtn = document.getElementById("all-upgrades-btn");
    if (allUpgradesBtn) {
      allUpgradesBtn.classList.toggle('active', this.allUpgradesState !== null);
    }

    // Autoaim button
    const autoaimBtn = document.getElementById("autoaim-btn");
    if (autoaimBtn) {
      autoaimBtn.classList.toggle('active', this.autoaimEnabled);
    }

    // Music button
    const musicBtn = document.getElementById("music-btn");
    if (musicBtn) {
      musicBtn.classList.toggle('active', this.musicEnabled);
      musicBtn.classList.toggle('muted', !this.musicEnabled);
    }

    // Volume button
    const volumeBtn = document.getElementById("volume-btn");
    if (volumeBtn) {
      volumeBtn.classList.toggle('active', this.soundEnabled);
      volumeBtn.classList.toggle('muted', !this.soundEnabled);
    }
  }

  initializeLucideIcons() {
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  setupBossDialog() {
    const bossDialog = document.getElementById('boss-dialog');
    const levelCleared = document.getElementById('level-cleared');
    
    // Boss dialog click handler
    bossDialog.addEventListener('click', () => this.advanceBossDialog());
    bossDialog.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.advanceBossDialog();
    });
    
    // Level cleared click handler
    levelCleared.addEventListener('click', () => this.restartGame());
    levelCleared.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.restartGame();
    });
    
    // Space key handler for dialog
    document.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Space') {
        if (this.bossDialogActive) {
          e.preventDefault();
          this.advanceBossDialog();
        } else if (this.gameState === 'LEVEL_CLEARED') {
          e.preventDefault();
          this.restartGame();
        }
      }
    });
  }
  
  showBossDialog() {
    this.bossDialogState = 1;
    this.bossDialogActive = true;
    this.gameState = 'BOSS_DIALOG';
    document.getElementById('boss-dialog').style.display = 'block';
    document.getElementById('boss-text').textContent = '...';
    // Hide skill indicator during dialog
    document.getElementById('skill-indicator').style.display = 'none';
  }
  
  advanceBossDialog() {
    if (!this.bossDialogActive) return;
    
    this.bossDialogState++;
    
    if (this.bossDialogState === 2) {
      document.getElementById('boss-text').textContent = 'Who dares enter my space?';
    } else if (this.bossDialogState === 3) {
      document.getElementById('boss-text').textContent = 'Prepare to die, humans!';
    } else if (this.bossDialogState === 4) {
      this.hideBossDialog();
      this.spawnLevel1Boss();
    }
  }
  
  hideBossDialog() {
    this.bossDialogActive = false;
    document.getElementById('boss-dialog').style.display = 'none';
    this.gameState = 'PLAYING';
    this.gamePhase = 5; // Phase 5: Boss fight phase
    console.log("Transitioning to Phase 5: Boss Battle");
    // Show skill indicator again
    document.getElementById('skill-indicator').style.display = 'flex';
  }
  
  spawnLevel1Boss() {
    let bossX, bossY;
    
    if (this.isPortrait) {
      bossX = this.canvas.width / 2;
      bossY = -150; // Start above screen
    } else {
      bossX = this.canvas.width + 150; // Start off-screen right
      bossY = this.canvas.height / 2;
    }
    
    this.level1Boss = new Level1Boss(bossX, bossY, this.isPortrait, this.canvas.width, this.canvas.height);
    console.log('Level 1 Boss spawned at:', bossX, bossY);
  }
  
  updateBossFight(slowdownFactor = 1.0) {
    if (!this.level1Boss) return;
    
    this.level1Boss.update(slowdownFactor);
    
    // Boss weapons
    if (this.level1Boss.canFirePrimary()) {
      const bulletsData = this.level1Boss.firePrimary(this.player.x, this.player.y);
      bulletsData.forEach(bulletData => {
        this.enemyBullets.push(new Bullet(
          bulletData.x,
          bulletData.y,
          bulletData.vx,
          bulletData.vy,
          bulletData.type
        ));
      });
    }
    
    if (this.level1Boss.canFireSecondary()) {
      const weaponData = this.level1Boss.fireSecondary(this.player.x, this.player.y);
      weaponData.forEach(data => {
        if (data.type === 'laser') {
          this.enemyLasers.push(new Laser(data.x, data.y, data.angle, data.speed, data.color));
        }
      });
    }
    
    if (this.level1Boss.canFireSpecial()) {
      const weaponData = this.level1Boss.fireSpecial();
      weaponData.forEach(data => {
        if (data.type === 'pulse') {
          this.enemyPulseCircles.push(new PulseCircle(data.x, data.y, data.maxRadius, data.color));
        }
      });
    }

    // New: Spiral bullet attack
    if (this.level1Boss.canFireSpiral()) {
      const bulletsData = this.level1Boss.fireSpiral();
      bulletsData.forEach(bulletData => {
        this.enemyBullets.push(new Bullet(
          bulletData.x,
          bulletData.y,
          bulletData.vx,
          bulletData.vy,
          bulletData.type
        ));
      });
    }
  }
  
  checkBossCollisions() {
    if (!this.level1Boss || this.level1Boss.isDefeated) return;
    
    // Player bullets vs boss
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      let collision = false;
      
      if (bullet instanceof Laser) {
        collision = this.checkLaserCollision(bullet, this.level1Boss);
      } else {
        collision = this.checkCollision(bullet, this.level1Boss);
      }
      
      if (collision) {
        if (!(bullet instanceof Laser)) {
          this.bullets.splice(i, 1);
        }
        
        const result = this.level1Boss.takeDamage(5); // Boss takes reduced damage
        this.createEnemyExplosion(this.level1Boss.x, this.level1Boss.y);
        this.sounds.enemyExplosion.play();
        
        if (result === 'defeated') {
          this.startBossDeathSequence();
        }
        
        if (!(bullet instanceof Laser)) {
          break;
        }
      }
    }
    
    // Player vs boss collision
    if (!this.player.isDashing && !this.player.godMode) {
      if (this.checkPlayerCollision(this.player, this.level1Boss)) {
        if (this.player.secondShip.length > 0) {
          const destroyedShip = this.player.secondShip.pop();
          this.createExplosion(destroyedShip.x, destroyedShip.y);
          this.updateUI();
        } else if (this.player.shield > 0) {
          this.player.shield--;
          this.createExplosion(this.player.x, this.player.y);
          this.updateUI();
        } else {
          this.createExplosion(this.player.x, this.player.y);
          this.gameOver();
          return;
        }
      }
    }
  }
  
  startBossDeathSequence() {
    console.log('Boss defeated! Starting death sequence...');
    
    // Create multiple rainbow explosions on the boss
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const offsetX = (Math.random() - 0.5) * this.level1Boss.size * 2;
        const offsetY = (Math.random() - 0.5) * this.level1Boss.size * 2;
        this.createRainbowExplosion(
          this.level1Boss.x + offsetX,
          this.level1Boss.y + offsetY,
          200
        );
        
        // Play explosion sounds
        this.sounds.enemyExplosion.play();
      }, i * 200);
    }
    
    // Final large explosion and start zoom sequence
    setTimeout(() => {
      this.createRainbowExplosion(this.level1Boss.x, this.level1Boss.y, 400);
      this.playSound(this.sounds.playerExplosion);
      this.startPlayerZoomSequence();
    }, 1600);
  }
  
  startPlayerZoomSequence() {
    this.gameState = 'ZOOMING';
    
    // Zoom player towards boss position
    const zoomDuration = 2000; // 2 seconds
    const startTime = Date.now();
    const startX = this.player.x;
    const startY = this.player.y;
    const targetX = this.level1Boss.x;
    const targetY = this.level1Boss.y;
    
    const zoomInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / zoomDuration, 1);
      
      // Smooth easing
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      this.player.x = startX + (targetX - startX) * easedProgress;
      this.player.y = startY + (targetY - startY) * easedProgress;
      
      if (progress >= 1) {
        clearInterval(zoomInterval);
        this.fadeToLevelCleared();
      }
    }, 16); // 60fps
  }
  
  fadeToLevelCleared() {
    this.gameState = 'LEVEL_CLEARED';
    document.getElementById('level-cleared').style.display = 'flex';
    
    // Fade out the canvas
    const canvas = document.getElementById('gameCanvas');
    canvas.style.transition = 'opacity 1s';
    canvas.style.opacity = '0.1';
  }

  gameLoop(currentTime) {
    if (!currentTime) currentTime = 0; // For the first call
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    if (this.gameState === "TITLE") {
      this.updateTitleScreenStars();
    } else if (this.gameState === "PLAYING") {
      this.update(deltaTime);
    }
    
    // Handle death animation
    if (this.deathAnimationActive) {
      this.updateDeathAnimation();
      // Continue updating game objects during death animation with 4x slowdown
      this.update(deltaTime, 0.25); // 4x slower
    }
    
    this.render();
    requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
  }

  updateDeathAnimation() {
    this.deathAnimationTimer++;
    
    // After 3 seconds, start fading out everything and fade in game over simultaneously
    if (this.deathAnimationTimer >= this.deathAnimationDuration) {
      // Start fade out/in phase
      if (!this.fadeOutStarted) {
        this.fadeOutStarted = true;
        this.fadeOutTimer = 0;
        
        // Set up game over screen to start fading in simultaneously
        this.gameState = "GAME_OVER";
        this.saveHighScore(this.score);
        document.getElementById("final-score-value").textContent = this.score.toLocaleString();
        document.getElementById("high-score-value").textContent = this.highScore.toLocaleString();
        
        const gameOverElement = document.getElementById("game-over");
        gameOverElement.style.display = "flex";
        gameOverElement.style.opacity = "0";
      }
      
      // Handle simultaneous fade out and fade in over 1 second (60 frames)
      this.fadeOutTimer++;
      const fadeProgress = this.fadeOutTimer / 60; // 1 second at 60fps
      this.sceneOpacity = Math.max(0, 1 - fadeProgress);
      
      // Fade in game over screen at the same time
      const gameOverElement = document.getElementById("game-over");
      gameOverElement.style.opacity = Math.min(1, fadeProgress);
      
      // After fade is complete, end death animation
      if (this.fadeOutTimer >= 60) {
        this.deathAnimationActive = false;
      }
    } else {
      // During the first 3 seconds, keep scene fully visible
      this.sceneOpacity = 1.0;
    }
  }
}

class Powerup {
  constructor(x, y, type, isPortrait) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.size = 20;
    this.speed = 1;
    this.pulseTimer = 0;
    this.isPortrait = isPortrait;
    this.colors = {
      shield: "#4488ff", // Blue
      mainWeapon: "#ff4444", // Red
      sideWeapon: "#aa44ff", // Purple
      secondShip: "#44ff44", // Green
      bomb: "#aa44ff", // Cool purple
    };
  }

  update() {
    if (this.isPortrait) {
      this.y += this.speed;
    } else {
      this.x -= this.speed;
    }
    this.pulseTimer += 0.1;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const color = this.colors[this.type];
    const pulse = 0.8 + 0.2 * Math.sin(this.pulseTimer);

    // Draw outer circle
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
    ctx.stroke();

    // Draw inner circle
    ctx.globalAlpha = pulse * 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // Draw icon
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    switch (this.type) {
      case "shield":
        // Shield icon (Lucide style)
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 0.4);
        ctx.lineTo(this.size * 0.3, -this.size * 0.2);
        ctx.lineTo(this.size * 0.3, this.size * 0.2);
        ctx.lineTo(0, this.size * 0.4);
        ctx.lineTo(-this.size * 0.3, this.size * 0.2);
        ctx.lineTo(-this.size * 0.3, -this.size * 0.2);
        ctx.closePath();
        ctx.stroke();
        break;

      case "mainWeapon":
        // Flame icon (Lucide style)
        ctx.beginPath();
        ctx.moveTo(0, this.size * 0.4);
        ctx.quadraticCurveTo(-this.size * 0.2, this.size * 0.1, -this.size * 0.1, -this.size * 0.1);
        ctx.quadraticCurveTo(-this.size * 0.05, -this.size * 0.3, 0, -this.size * 0.4);
        ctx.quadraticCurveTo(this.size * 0.05, -this.size * 0.3, this.size * 0.1, -this.size * 0.1);
        ctx.quadraticCurveTo(this.size * 0.2, this.size * 0.1, 0, this.size * 0.4);
        ctx.stroke();
        // Inner flame
        ctx.beginPath();
        ctx.moveTo(0, this.size * 0.2);
        ctx.quadraticCurveTo(-this.size * 0.1, this.size * 0.05, 0, -this.size * 0.2);
        ctx.quadraticCurveTo(this.size * 0.1, this.size * 0.05, 0, this.size * 0.2);
        ctx.stroke();
        break;

      case "sideWeapon":
        // Triangle icon (Lucide style)
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 0.3);
        ctx.lineTo(this.size * 0.3, this.size * 0.3);
        ctx.lineTo(-this.size * 0.3, this.size * 0.3);
        ctx.closePath();
        ctx.stroke();
        break;

      case "secondShip":
        // Rocket icon (Lucide style)
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 0.4);
        ctx.lineTo(this.size * 0.1, -this.size * 0.2);
        ctx.lineTo(this.size * 0.2, this.size * 0.2);
        ctx.lineTo(this.size * 0.1, this.size * 0.4);
        ctx.lineTo(-this.size * 0.1, this.size * 0.4);
        ctx.lineTo(-this.size * 0.2, this.size * 0.2);
        ctx.lineTo(-this.size * 0.1, -this.size * 0.2);
        ctx.closePath();
        ctx.stroke();
        // Rocket fins
        ctx.beginPath();
        ctx.moveTo(-this.size * 0.2, this.size * 0.2);
        ctx.lineTo(-this.size * 0.3, this.size * 0.3);
        ctx.moveTo(this.size * 0.2, this.size * 0.2);
        ctx.lineTo(this.size * 0.3, this.size * 0.3);
        ctx.stroke();
        break;

      case "bomb":
        // Bomb icon (keep existing design)
        ctx.beginPath();
        ctx.arc(0, this.size * 0.1, this.size * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        // Fuse
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 0.2);
        ctx.lineTo(-this.size * 0.1, -this.size * 0.4);
        ctx.lineTo(this.size * 0.1, -this.size * 0.3);
        ctx.stroke();
        break;
    }

    ctx.restore();
  }
}

class RainbowExplosion {
  constructor(x, y, maxRadius = 150) {
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.maxRadius = maxRadius;
    this.growthRate = maxRadius > 500 ? 8 : 3; // Faster growth for big explosions
    this.life = maxRadius > 500 ? 120 : 60; // Longer life for big explosions
    this.colors = [
      "#ff0000",
      "#ff8800",
      "#ffff00",
      "#00ff00",
      "#0088ff",
      "#4400ff",
      "#ff00ff",
    ];
    this.sparks = [];
    this.isFirework = maxRadius > 500;

    // Create sparks for dramatic effect
    const sparkCount = maxRadius > 500 ? 50 : 20;
    for (let i = 0; i < sparkCount; i++) {
      const angle = (i / sparkCount) * Math.PI * 2;
      const speed = this.isFirework
        ? 3 + Math.random() * 6
        : 2 + Math.random() * 4;
      this.sparks.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        life: this.isFirework ? 90 : 60,
        maxLife: this.isFirework ? 90 : 60,
        size: this.isFirework ? 4 + Math.random() * 4 : 3 + Math.random() * 3,
        trail: [],
      });
    }

    // Add firework-specific effects
    if (this.isFirework) {
      // Create additional burst sparks
      for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 8 + Math.random() * 4;
        this.sparks.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: this.colors[Math.floor(Math.random() * this.colors.length)],
          life: 60,
          maxLife: 60,
          size: 2 + Math.random() * 2,
          trail: [],
        });
      }
    }
  }

  update(slowdownFactor = 1.0) {
    this.radius += this.growthRate * slowdownFactor;
    this.life -= slowdownFactor;

    if (this.radius >= this.maxRadius) {
      this.life = 0;
    }

    // Update sparks
    this.sparks = this.sparks.filter((spark) => {
      // Add to trail for firework effect
      spark.trail.push({
        x: spark.x,
        y: spark.y,
        opacity: spark.life / spark.maxLife,
      });
      if (spark.trail.length > (this.isFirework ? 8 : 4)) {
        spark.trail.shift();
      }

      spark.x += spark.vx * slowdownFactor;
      spark.y += spark.vy * slowdownFactor;

      // Add gravity for firework effect
      if (this.isFirework) {
        spark.vy += 0.1 * slowdownFactor; // Gravity
        spark.vx *= 0.995;
        spark.vy *= 0.995;
      } else {
        spark.vx *= 0.98;
        spark.vy *= 0.98;
      }

      spark.life -= slowdownFactor;
      return spark.life > 0;
    });
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const opacity = Math.max(0.1, this.life / (this.isFirework ? 120 : 60));

    // Draw rainbow rings with enhanced thickness for big explosions
    const ringWidth = this.isFirework ? 12 : 4;
    for (let i = 0; i < this.colors.length; i++) {
      const ringRadius = this.radius - i * (ringWidth * 1.5);
      if (ringRadius > 0) {
        ctx.globalAlpha = opacity * (1 - i * 0.1);
        ctx.strokeStyle = this.colors[i];
        ctx.lineWidth = ringWidth;
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Add inner glow for big explosions
        if (this.isFirework) {
          ctx.globalAlpha = opacity * 0.4;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = ringWidth / 3;
          ctx.beginPath();
          ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    ctx.restore();

    // Draw sparks with trails
    this.sparks.forEach((spark) => {
      const sparkOpacity = spark.life / spark.maxLife;

      // Draw trail
      spark.trail.forEach((point, index) => {
        ctx.save();
        ctx.globalAlpha = point.opacity * 0.3 * (index / spark.trail.length);
        ctx.fillStyle = spark.color;
        const size = spark.size * (index / spark.trail.length) * 0.5;
        ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size);
        ctx.restore();
      });

      // Draw main spark
      ctx.save();
      ctx.globalAlpha = sparkOpacity;
      ctx.fillStyle = spark.color;
      ctx.fillRect(
        spark.x - spark.size / 2,
        spark.y - spark.size / 2,
        spark.size,
        spark.size
      );

      // Add spark glow for fireworks
      if (this.isFirework) {
        ctx.globalAlpha = sparkOpacity * 0.5;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(
          spark.x - spark.size / 4,
          spark.y - spark.size / 4,
          spark.size / 2,
          spark.size / 2
        );
      }

      ctx.restore();
    });
  }
}

class Particle {
  constructor(x, y, scale = 1) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 6 * scale;
    this.vy = (Math.random() - 0.5) * 6 * scale;
    this.life = 30;
    this.maxLife = 30;
    this.scale = scale;
  }

  update(slowdownFactor = 1.0) {
    this.x += this.vx * slowdownFactor;
    this.y += this.vy * slowdownFactor;
    this.vx *= 0.95;
    this.vy *= 0.95;
    this.life -= slowdownFactor;
  }

  render(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
    const size = 4 * this.scale;
    ctx.fillRect(this.x - size / 2, this.y - size / 2, size, size);
  }
}

class Debris {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = (Math.random() - 0.5) * 8;
    this.angle = Math.random() * Math.PI * 2;
    this.angularVelocity = (Math.random() - 0.5) * 0.2;
    this.size = 2 + Math.random() * 4;
    this.life = 40;
    this.maxLife = 40;
    this.color = color;
  }

  update(slowdownFactor = 1.0) {
    this.x += this.vx * slowdownFactor;
    this.y += this.vy * slowdownFactor;
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.angle += this.angularVelocity * slowdownFactor;
    this.life -= slowdownFactor;
  }

  render(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-this.size, 0);
    ctx.lineTo(this.size, 0);
    ctx.moveTo(0, -this.size);
    ctx.lineTo(0, this.size);
    ctx.stroke();
    ctx.restore();
  }
}

class RainbowParticle {
  constructor(x, y, scale = 1) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 4 * scale;
    this.vy = (Math.random() - 0.5) * 4 * scale;
    this.life = 60;
    this.maxLife = 60;
    this.scale = scale;
    this.angle = Math.random() * Math.PI * 2;
    this.angularVelocity = (Math.random() - 0.5) * 0.1;
    this.size = 3 + Math.random() * 2;
    this.colors = [
      "#ff0000", "#ff8800", "#ffff00", "#00ff00", 
      "#0088ff", "#4400ff", "#ff00ff"
    ];
    this.colorIndex = Math.floor(Math.random() * this.colors.length);
  }

  update(slowdownFactor = 1.0) {
    this.x += this.vx * slowdownFactor;
    this.y += this.vy * slowdownFactor;
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.angle += this.angularVelocity * slowdownFactor;
    this.life -= slowdownFactor;
    
    // Cycle through rainbow colors
    if (Math.floor(this.life / slowdownFactor) % 8 === 0) {
      this.colorIndex = (this.colorIndex + 1) % this.colors.length;
    }
  }

  render(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.colors[this.colorIndex];
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

class TextParticle {
  constructor(x, y, text, color = "#ffffff", size = 20, life = 60) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.vy = -0.5; // Move upwards
    this.vx = (Math.random() - 0.5) * 0.5; // Slight horizontal drift
  }

  update(slowdownFactor = 1.0) {
    this.x += this.vx * slowdownFactor;
    this.y += this.vy * slowdownFactor;
    this.life -= slowdownFactor;
  }

  render(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.font = `${this.size}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// Start the game
new BlitzGame();
