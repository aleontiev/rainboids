// DialogManager - Handles boss dialog system for Rainboids: Blitz

export class DialogManager {
  constructor(game) {
    this.game = game;
    this.dialogState = 0; // 0: hidden, 1: "...", 2: threat message, 3: closed
    this.isActive = false;
    this.timer = 0;

    this.dialogMessages = [
      "...",
      "......",
      "Who dares enter my space?!",
      "Prepare to die, humans!",
    ];
  }

  setup() {
    // Dialog display and interaction now handled by canvas renderer
    // Dialog clicks handled via canvas click detection
  }

  show() {
    this.isActive = true;
    this.dialogState = 0;
    this.timer = 0;
    this.updateDialog();
  }

  hide() {
    this.isActive = false;
    this.dialogState = 0;
  }

  updateDialog() {
    // All dialog rendering now handled by canvas renderer
    // Dialog text available via this.getCurrentMessage()
  }

  getCurrentMessage() {
    if (!this.isActive || this.dialogState >= this.dialogMessages.length) {
      return null;
    }
    return this.dialogMessages[this.dialogState];
  }

  advance() {
    if (!this.isActive) return;

    if (this.dialogState === 0) {
      // From "..." to "......"
      this.dialogState = 1;
      this.updateDialog();
    } else if (this.dialogState === 1) {
      // From "......" to threat message
      this.dialogState = 2;
      this.updateDialog();
    } else if (this.dialogState === 2) {
      // From threat message to second threat
      this.dialogState = 3;
      this.updateDialog();
    } else {
      // Close dialog and start boss fight
      this.hide();
      this.game.level.phase = 5; // Boss fight phase
      this.game.entities.spawnBoss();
    }
  }

  update() {
    if (!this.isActive) return;

    this.timer++;

    // Auto-advance after 2 seconds on first two states
    if ((this.dialogState === 0 || this.dialogState === 1) && this.timer >= 120) {
      this.advance();
      this.timer = 0;
    }
  }

  reset() {
    this.hide();
  }
}