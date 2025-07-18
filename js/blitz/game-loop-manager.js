// GameLoopManager - Handles main game update loop and timing
export class GameLoopManager {
  constructor(game) {
    this.game = game;
    this.lastTime = performance.now();
  }

  // Main update method
  update(deltaTime, slowdownFactor = 1.0) {
    if (
      ["PLAYING", "DYING"].indexOf(this.game.state.state) === -1
    ) {
      // only playing and dying trigger
      return;
    }

    this.game.death.update();

    this.game.state.update(deltaTime);

    // Update background
    this.game.background.update();

    // Update dialog system
    this.game.dialog.update(deltaTime);

    // Update UI cooldown visuals
    this.game.actions.update();

    // Update cheat manager (for cursor hiding and button states)
    this.game.cheats.update();

    // Update player
    if (this.game.state.state !== 'DYING') {
        this.game.playerManager.update(deltaTime, slowdownFactor);
    }

    // Update game entities
    this.game.entities.update(deltaTime, slowdownFactor);

    // Update level progression
    this.game.level.update(deltaTime);

    // Update effects and explosions
    this.game.effects.updateExplosions(slowdownFactor);

    // Check collisions
    this.game.collisions.update();

    this.game.progress.update(); // Update UI elements like timer
  }

  // Main game loop
  loop(currentTime) {
    const state = this.game.state;
    if (!currentTime) currentTime = 0; // For the first call

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Update title screen animations if visible
    if (state.state === "TITLE" || state.state === "PAUSED") {
      this.game.title.update();
    }

    // Update game logic only when playing or during death animation
    if (state.state === "PLAYING") {
      const slowdownFactor = state.timeSlowActive ? 0.2 : 1.0;
      this.update(deltaTime, slowdownFactor);
    } else if (state.state === "DYING") {
      this.update(deltaTime, 0.2); // Update even during death animation
    }

    // Render everything
    this.game.render();

    // Request next frame
    requestAnimationFrame((timestamp) => this.loop(timestamp));
  }

  // Start the main game loop
  start() {
    this.lastTime = performance.now();
    this.loop();
  }
}
