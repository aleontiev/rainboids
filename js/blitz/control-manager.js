export class ControlManager {
  constructor(game) {
    this.game = game;
  }

  setup() {
    const state = this.game.state;
    const game = this.game;

    // All UI controls are now handled by canvas renderer and input manager
    // This class now only manages global keyboard/window events
    
    // Resize handler
    window.addEventListener("resize", () => game.resize());

    // Global keyboard events
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        // Handle modal dismissal or pause
        if (game.renderer.helpModalVisible) {
          game.renderer.helpModalVisible = false;
        } else {
          state.pause(true); // toggle style pause
        }
      }
    });

    // Auto-pause on window focus loss
    document.addEventListener("visibilitychange", () => state.pause());
    window.addEventListener("blur", () => state.pause());
  }
}