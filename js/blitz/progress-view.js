// Timer/score (progress) for blitz

export class ProgressView {
  constructor(game) {
    this.game = game;
    this.levelPhaseElement = document.getElementById('level-phase-value');
    this.currentLevel = 1;
    this.currentPhase = 1;
    this.currentPhaseName = "";
  }

  update() {
    // Update level and phase display
    this.updateLevelPhase();

    // Update score display - show 0 if cheats were used
    const scoreElement = this.game.elements.score;
    if (scoreElement) {
      const displayScore = this.game.cheats.used ? 0 : this.game.state.score;
      scoreElement.textContent = displayScore.toString();
    }

    // Update timer display
    const timerElement = this.game.elements.timer; 
    if (timerElement) {
      const totalSeconds = Math.floor(this.game.state.time);
      const minutes = Math.floor(totalSeconds / 60);
      const remainingSeconds = totalSeconds % 60;
      timerElement.textContent = `${minutes}:${remainingSeconds
        .toString()
        .padStart(2, "0")}`;
    }

    // Update high score displays
    const highScoreElement = this.game.elements.highScore;
    if (highScoreElement) {
      highScoreElement.textContent = this.game.state.highScore.toString();
    }

    const finalScoreElement = document.getElementById("final-score-value");
    if (finalScoreElement) {
      const displayScore = this.game.cheats.used ? 0 : this.game.state.score;
      finalScoreElement.textContent = displayScore.toString();
    }
  }

  updateLevelPhase() {
    if (this.game.level && this.game.level.getCurrentPhase) {
      const phaseConfig = this.game.level.getCurrentPhase();
      const newPhase = phaseConfig.id;
      const newPhaseName = phaseConfig.name;
      
      if (newPhase !== this.currentPhase || newPhaseName !== this.currentPhaseName) {
        this.currentPhase = newPhase;
        this.currentPhaseName = newPhaseName;
        
        if (this.levelPhaseElement) {
          this.levelPhaseElement.textContent = `Level ${this.currentLevel}: Phase ${this.currentPhase} (${this.currentPhaseName})`;
        }
      }
    }
  }
}
