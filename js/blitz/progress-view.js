// Timer/score (progress) for blitz

export class ProgressView {
  constructor(game) {
    this.game = game;
    this.currentLevel = 1;
    this.currentPhase = 1;
    this.currentPhaseName = "";
  }

  update() {
    // Update level and phase display
    this.updateLevelPhase();

    // All progress display is now handled by canvas renderer
    // This class maintains the data that the renderer uses
    
    // Progress data is now available via:
    // - this.game.state.score (displayed score)
    // - this.game.state.time (timer)  
    // - this.game.state.highScore (high score)
    // - this.currentLevel, this.currentPhase, this.currentPhaseName (level info)
  }

  updateLevelPhase() {
    if (this.game.level && this.game.level.getCurrentPhase) {
      const phaseConfig = this.game.level.getCurrentPhase();
      const newPhase = phaseConfig.id;
      const newPhaseName = phaseConfig.name;
      
      if (newPhase !== this.currentPhase || newPhaseName !== this.currentPhaseName) {
        this.currentPhase = newPhase;
        this.currentPhaseName = newPhaseName;
        
        // Level/phase data now used by canvas renderer
        // (removed DOM element update)
      }
    }
  }
}