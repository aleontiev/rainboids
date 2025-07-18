export class ControlManager {
  constructor(game) {
    this.game = game;
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

  setup() {
    const elements = this.game.elements;
    const state = this.game.state;
    const game = this.game;

    const startBtn = elements.startBtn;
    const restartBtn = elements.restartBtn;
    const timeSlowButton = elements.timeSlowButton;
    const pauseButton = elements.pauseButton;
    const shieldButton = elements.shieldButton;
    const bombButton = elements.bombButton;

    const play = () => state.play();
    const pause = () => state.pause();
    const resize = () => game.resize();
    this.addHandler(startBtn, () => {
      this.game.audio.ready();
      play();
    });
    this.addHandler(restartBtn, play);

    // Resize handler
    window.addEventListener("resize", resize);

    this.addHandler(pauseButton, pause);

    this.addHandler(shieldButton, () => {
      if (state.state === "PLAYING") {
        game.powerup.activateShield();
      }
    });

    this.addHandler(timeSlowButton, () => {
      if (state.state === "PLAYING") {
        game.powerup.activateTimeSlow();
      }
    });

    this.addHandler(bombButton, () => {
      if (state.state === "PLAYING") {
        game.powerup.activateBomb();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        state.pause(true); // toggle style pause
      }
    });

    // New: Lore and Credits buttons
    this.addHandler(elements.loreBtn, () => {
      elements.loreModal.style.display = "flex";
    });

    this.addHandler(elements.creditsBtn, () => {
      elements.creditsModal.style.display = "flex";
    });

    this.addHandler(elements.helpBtn, () => {
      elements.helpModal.style.display = "flex";
    });

    // New: Close buttons for modals
    this.addHandler(elements.loreCloseBtn, () => {
      elements.loreModal.style.display = "none";
    });

    this.addHandler(elements.creditsCloseBtn, () => {
      elements.creditsModal.style.display = "none";
    });

    this.addHandler(elements.helpCloseBtn, () => {
      elements.helpModal.style.display = "none";
    });

    // Close modals on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (elements.loreModal.style.display === "flex") {
          elements.loreModal.style.display = "none";
        } else if (elements.creditsModal.style.display === "flex") {
          elements.creditsModal.style.display = "none";
        } else if (elements.helpModal.style.display === "flex") {
          elements.helpModal.style.display = "none";
        }
      }
    });

    document.addEventListener("visibilitychange", () => state.pause());
    window.addEventListener("blur", () => state.pause());
  }
}
