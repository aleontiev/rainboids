export class DeathManager {
  // level manager
  constructor(game) {
    this.game = game;
    this.animationActive = false;
    this.animationTimer = null;
    this.animationDuration = 240; // 3 seconds at 60fps
    this.position = null;
    this.fadeOutStarted = false;
    this.fadeOutTimer = null;
  }

  startAnimation(x, y) {
    this.fadeOutStarted = false;
    this.fadeOutTimer = 0;
    this.animationActive = true;
    this.animationTimer = 0;
    this.position = { x: x, y: y };
  }
  updateAnimation() {
    this.animationTimer++;

    // After 3 seconds, start fading out everything and fade in game over simultaneously
    if (this.animationTimer >= this.animationDuration) {
      // Start fade out/in phase
      if (!this.fadeOutStarted) {
        this.fadeOutStarted = true;
        this.fadeOutTimer = 0;

        // Set up game over screen to start fading in simultaneously
        this.game.gameState = "GAME_OVER";
        
        // Pause background music when game ends
        this.game.audio.pauseBackgroundMusic();
        
        this.game.saveHighScore(this.score);
        document.getElementById("final-score-value").textContent =
          this.game.score.toLocaleString();
        document.getElementById("high-score-value").textContent =
          this.game.highScore.toLocaleString();

        const gameOverElement = document.getElementById("game-over");
        gameOverElement.style.display = "flex";
        gameOverElement.style.opacity = "0";
      }

      // Handle simultaneous fade out and fade in over 1 second (60 frames)
      this.fadeOutTimer++;
      const fadeProgress = this.fadeOutTimer / 60; // 1 second at 60fps
      this.game.sceneOpacity = Math.max(0, 1 - fadeProgress);

      // Fade in game over screen at the same time
      const gameOverElement = document.getElementById("game-over");
      gameOverElement.style.opacity = Math.min(1, fadeProgress);

      // After fade is complete, end death animation
      if (this.fadeOutTimer >= 60) {
        this.animationActive = false;
        this.game.sceneOpacity = 1.0;
      }
    } else {
      // During the first 3 seconds, keep scene fully visible
      this.game.sceneOpacity = 1.0;
    }
  }
  start() {
    // Play dramatic player explosion sound
    this.game.audio.playSound(this.game.audio.sounds.playerExplosion);

    // Create rainbow explosion where ship was
    this.game.effects.createRainbowExplosion(this.game.player.x, this.game.player.y);
    this.game.effects.createParticleExplosion(this.game.player.x, this.game.player.y);
    this.startAnimation(this.game.player.x, this.game.player.y);

    this.game.gameState = "DEATH_ANIMATION";
  }
}
