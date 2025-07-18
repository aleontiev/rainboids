// Timer/score (progress) for blitz

export class ProgressView {
  constructor(game) {
    this.game = game;
  }

  update() {
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
}
