// GameLoopManager - Handles main game update loop and timing
export class GameLoopManager {
  constructor(game) {
    this.game = game;
    this.lastTime = performance.now();
  }

  // Main update method
  update(deltaTime, slowdownFactor = 1.0) {
    // Always update background for title screen animations
    this.game.background.update();

    if (
      ["PLAYING", "DYING"].indexOf(this.game.state.state) === -1
    ) {
      // only playing and dying trigger full game updates
      return;
    }

    this.game.death.update();

    this.game.state.update(deltaTime);

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
    this.game.effects.updateFloatingTexts(slowdownFactor);

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

    // Title screen animations now handled by background manager

    // Update game logic only when playing or during death animation
    if (state.state === "PLAYING") {
      // Get game speed multiplier from level config
      const gameSpeed = this.game.level?.config?.world?.gameSpeed || 1.0;
      const baseSpeed = state.timeSlowActive ? 0.2 : 1.0;
      const slowdownFactor = baseSpeed * gameSpeed;
      this.update(deltaTime, slowdownFactor);
    } else if (state.state === "DYING") {
      // Also apply game speed during death animation
      const gameSpeed = this.game.level?.config?.world?.gameSpeed || 1.0;
      const slowdownFactor = 0.2 * gameSpeed;
      this.update(deltaTime, slowdownFactor);
    } else {
      // Update background animations for title screen and other states
      this.game.background.update();
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
