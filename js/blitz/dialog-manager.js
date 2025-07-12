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

    this.setupDialogElements();
  }

  setupDialogElements() {
    const bossDialog = document.getElementById("boss-dialog");
    const levelCleared = document.getElementById("level-cleared");

    if (bossDialog) {
      this.game.addHandler(bossDialog, () => this.advance());
    }

    if (levelCleared) {
      this.game.addHandler(levelCleared, () => this.game.restart());
    }
  }

  show() {
    this.dialogState = 1;
    this.isActive = true;
    this.timer = 0;
    this.game.gameState = "BOSS_DIALOG";

    const dialogElement = document.getElementById("boss-dialog");
    const textElement = document.getElementById("boss-text");

    if (dialogElement) {
      dialogElement.style.display = "block";
    }

    if (textElement) {
      textElement.textContent = this.dialogMessages[0];
    }
  }

  advance() {
    if (!this.isActive) return;

    this.dialogState++;
    const textElement = document.getElementById("boss-text");

    if (this.dialogState <= this.dialogMessages.length) {
      if (textElement) {
        textElement.textContent = this.dialogMessages[this.dialogState - 1];
      }
    } else {
      this.hide();
      this.game.spawnBoss();
    }
  }

  hide() {
    this.isActive = false;
    this.dialogState = 0;

    const dialogElement = document.getElementById("boss-dialog");
    if (dialogElement) {
      dialogElement.style.display = "none";
    }

    this.game.gameState = "PLAYING";
    this.game.gamePhase = 5; // Phase 5: Boss fight phase
  }

  update(deltaTime) {
    if (this.isActive) {
      this.timer += deltaTime;
    }
  }

  reset() {
    if (this.isActive) {
      this.hide();
    }
    this.dialogState = 0;
    this.isActive = false;
    this.timer = 0;
  }

  // Check if dialog should be triggered
  shouldTrigger(gamePhase, timer) {
    return gamePhase === 4 && timer >= 5000 && !this.isActive;
  }
}
