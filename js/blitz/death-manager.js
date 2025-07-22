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

        // Game over UI is now handled by canvas renderer
        // Scores are available via this.game.state.score and this.game.state.highScore

        // Set up game over screen state - do this after UI setup
        this.game.opacity = 1;
      }

      // Handle simultaneous fade out and fade in over 1 second (60 frames)
      this.fadeOutTimer++;
      const finalFadeProgress = Math.min(
        1,
        this.fadeOutTimer / this.fadeOutTime
      );

      // Game over rendering handled by canvas renderer

      // After fade is complete, end death animation
      if (this.fadeOutTimer >= this.fadeOutTime) {
        this.game.state.state = "GAME_OVER";
        this.animationActive = false;
        this.game.opacity = 1.0;
        // Game over state is now handled by canvas renderer
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
