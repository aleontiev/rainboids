// StateManager: handles game state
export class State {
  constructor(game) {
    this.game = game;
    this.firstGameStart = "INITIAL";
    this.state = "TITLE";
    // Track if this is the first game start
    this.firstGameStart = true;
    this.reset();
  }
  reset() {
    this.bombs = 0;
    this.time = 0;
    this.timeSlowActive = false;
    this.timeSlowDuration = 300; // 5 seconds at 60fps
    this.timeSlowTimer = 0;
    this.timeSlowCooldown = 0;
    this.timeSlowCooldownMax = 900; // 15 seconds cooldown
    this.bombs = 0; // Players start with no bombs
    this.shieldFlashTimer = 0;
    this.timeSlowFlashTimer = 0;
    this.highScore = this.loadHighScore();

    this.lives = 1;
    this.score = 0;
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
      if (!this.game.cheats.used && score > this.highScore) {
        this.highScore = score;
        localStorage.setItem("rainboids-high-score", score.toString());
      }
    } catch (e) {
      // localStorage not available
    }
  }

  update(deltaTime) {
    const state = this;
    if (state.state !== "DYING") {
      state.time += deltaTime / 1000; // Convert ms to seconds
    }

    // Time slow functionality
    if (state.timeSlowActive) {
      state.timeSlowTimer += 1;
      if (state.timeSlowTimer >= state.timeSlowDuration) {
        state.timeSlowActive = false;
        state.timeSlowTimer = 0;
      }
    }

    // Cooldown management
    if (state.timeSlowCooldown > 0) {
      state.timeSlowCooldown -= 1;
    }
  }

  play() {
    if (this.state === "TITLE") {
      this.start();
    } else if (this.state === "GAME_OVER") {
      this.restart();
    } else if (this.state === "PAUSED") {
      this.resume();
    }
  }

  start() {
    this.state = "PLAYING";
    this.game.elements.titleScreen.style.display = "none";

    // Hide pause content when starting game
    this.game.elements.pauseContent.style.display = "none";

    // Show power buttons
    this.game.actions.show();

    // Start background music
    if (this.firstGameStart) {
      this.game.audio.initBackgroundMusic();
      this.game.audio.startBackgroundMusic();
      this.firstGameStart = false;
    } else {
      this.game.audio.resumeBackgroundMusic();
    }

    // Initialize skill indicator
    this.game.progress.update();
  }

  restart() {
    this.game.reset();
    this.game.background.setup();
    this.game.elements.gameOver.style.display = "none";
    this.state = "PLAYING";

    // Show power buttons again
    this.game.actions.show();

    // Restart background music from beginning
    this.game.audio.restartBackgroundMusic();
    this.game.progress.update();
  }

  pause(toggle) {
    if (this.state === "PLAYING") {
      this.state = "PAUSED";
      this.game.elements.titleScreen.style.display = "flex";

      // Show title content (includes start button), show pause content
      this.game.elements.titleContent.style.display = "flex";
      this.game.elements.pauseContent.style.display = "block";

      // Hide power buttons during pause
      this.game.actions.hide();

      // Pause background music when game is paused
      this.game.audio.pauseBackgroundMusic();
    } else if (toggle && this.state === "PAUSED") {
      // resume if double paused
      this.resume();
    }
  }

  resume() {
    this.state = "PLAYING";
    this.game.elements.titleScreen.style.display = "none";

    // Hide pause content when resuming
    this.game.elements.pauseContent.style.display = "none";

    // Show power buttons again
    this.game.actions.show();

    // Resume background music when game resumes
    this.game.audio.resumeBackgroundMusic();
  }

  fadeToLevelCleared() {
    this.state = "LEVEL_CLEARED";
    this.game.elements.levelCleared.style.display = "block";

    // Fade out the canvas
    this.game.elements.gameCanvas.style.transition = "opacity 1s";
    this.game.elements.gameCanvas.style.opacity = "0.1";
  }

  startBossDeathSequence() {
    // Create multiple rainbow explosions on the boss
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const offsetX =
          (Math.random() - 0.5) * this.game.entities.boss.size * 2;
        const offsetY =
          (Math.random() - 0.5) * this.game.entities.boss.size * 2;
        this.game.effects.createRainbowExplosion(
          this.game.entities.boss.x + offsetX,
          this.game.entities.boss.y + offsetY,
          200
        );
        this.game.audio.play(this.game.audio.sounds.enemyExplosion);
      }, i * 200);
    }

    // Final large explosion and start zoom sequence
    setTimeout(() => {
      this.game.effects.createRainbowExplosion(
        this.game.entities.boss.x,
        this.game.entities.boss.y,
        400
      );
      this.game.audio.play(this.game.audio.sounds.playerExplosion);
    }, 1600);

    // Fade to level cleared after 3 seconds
    setTimeout(() => {
      this.fadeToLevelCleared();
    }, 3000);
  }
  addScore(points) {
    if (!this.game.cheats.used) {
      this.score += points;
      this.game.progress.update();
    }
  }
}
