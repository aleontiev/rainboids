export class DeathManager {
  // level manager
  constructor(game) {
    this.game = game;
    this.animationActive = false;
    this.animationTimer = null;
    this.position = null;
    this.fadeOutStarted = false;
    this.fadeOutTimer = null;
  }

  get animationDuration() {
    return this.game.level.config.deathAnimationDuration || 240;
  }

  get fadeOutTime() {
    return this.game.level.config.deathFadeOutTime || 60;
  }

  startAnimation(x, y) {
    console.log("Death animation starting at position:", x, y);
    this.fadeOutStarted = false;
    this.fadeOutTimer = 0;
    this.animationActive = true;
    this.animationTimer = 0;
    this.position = { x: x, y: y };
    console.log("Death animation initialized - active:", this.animationActive);
  }
  update() {
    if (!this.animationActive) {
      return;
    }
    this.animationTimer++;

    // Gradually fade out scene throughout the entire death animation
    const fadeProgress = this.animationTimer / this.animationDuration;
    this.game.opacity = Math.max(0.3, 1 - fadeProgress * 0.7); // Fade to 30% opacity

    // After 3 seconds, start fading out everything and fade in game over simultaneously
    if (this.animationTimer >= this.animationDuration) {
      // Start fade out/in phase
      if (!this.fadeOutStarted) {
        console.log("Starting fade out phase - setting up game over modal");
        this.fadeOutStarted = true;
        this.fadeOutTimer = 0;

        // Pause background music when game ends
        this.game.audio.pauseBackgroundMusic();

        // Update scores before showing game over
        this.game.state.saveHighScore(this.game.state.score);
        console.log(
          "Scores updated - final:",
          this.game.state.score,
          "high:",
          this.game.state.highScore
        );

        this.game.elements.finalScore.textContent =
          this.game.state.score.toLocaleString();
        this.game.elements.highScore.textContent =
          this.game.state.highScore.toLocaleString();

        // Check if game over element exists and debug its state
        const gameOverEl = this.game.elements.gameOver;

        // Ensure game over modal is properly set up
        gameOverEl.style.display = "flex";
        gameOverEl.style.opacity = "1"; // Start fully visible for testing
        gameOverEl.style.zIndex = "9999"; // Higher z-index
        gameOverEl.style.position = "fixed"; // Use fixed instead of absolute
        gameOverEl.style.top = "0";
        gameOverEl.style.left = "0";
        gameOverEl.style.width = "100%";
        gameOverEl.style.height = "100%";
        gameOverEl.style.backgroundColor = "rgba(0, 0, 0, 0.8)"; // Ensure background
        gameOverEl.style.visibility = "visible";
        gameOverEl.style.pointerEvents = "auto";

        // Set up game over screen state - do this after UI setup
        this.game.opacity = 1;
      }

      // Handle simultaneous fade out and fade in over 1 second (60 frames)
      this.fadeOutTimer++;
      const finalFadeProgress = Math.min(
        1,
        this.fadeOutTimer / this.fadeOutTime
      );

      // Keep game over modal fully visible (skip fade animation for now)
      this.game.elements.gameOver.style.opacity = "1";

      // After fade is complete, end death animation
      if (this.fadeOutTimer >= this.fadeOutTime) {
        this.game.state.state = "GAME_OVER";
        this.animationActive = false;
        this.game.opacity = 1.0;
        this.game.elements.gameOver.style.opacity = "1";

        // Final debugging to see if element is actually visible
        const gameOverEl = this.game.elements.gameOver;
        // Try to force visibility
        gameOverEl.style.visibility = "visible";
        gameOverEl.style.pointerEvents = "auto";
      } else {
        // Fade out game
        this.game.opacity = Math.max(0, 0.3 - finalFadeProgress * 0.3); // Fade from 30% to 0%
      }
    }
  }
  start() {
    // Prevent retriggering if already in progress
    if (
      this.animationActive ||
      this.game.state.state === "DYING" ||
      this.game.state.state === "GAME_OVER"
    ) {
      console.log(
        "Death animation already in progress, ignoring retrigger attempt"
      );
      return;
    }

    console.log("Starting death sequence");

    // Play dramatic player explosion sound
    this.game.audio.play(this.game.audio.sounds.playerExplosion);

    // Hide actions during death animation
    this.game.actions.hide();

    // Create rainbow explosion where ship was
    this.game.effects.createRainbowExplosion(
      this.game.player.x,
      this.game.player.y
    );
    this.game.effects.createParticleExplosion(
      this.game.player.x,
      this.game.player.y
    );
    this.startAnimation(this.game.player.x, this.game.player.y);

    this.game.state.state = "DYING";
  }
}
