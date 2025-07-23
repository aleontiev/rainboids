// actions / cooldown management for Rainboids: Blitz
export class ActionsView {
  constructor(game) {
    this.game = game;
  }

  update() {
    // All action button visual updates now handled by canvas renderer
    // This class maintains the cooldown logic that the renderer uses
    
    // Update shield cooldown tracking
    if (this.game.player && this.game.player.shieldCooldown > 0) {
      const wasCooldown = this.game.player.shieldCooldown > 1;
      if (wasCooldown && this.game.player.shieldCooldown <= 0) {
        this.game.state.shieldFlashTimer = 30; // Flash for 0.5 seconds at 60fps
      }
    }

    // Update time slow cooldown tracking  
    if (this.game.state.timeSlowCooldown > 0) {
      const wasCooldown = this.game.state.timeSlowCooldown > 1;
      if (wasCooldown && this.game.state.timeSlowCooldown <= 0) {
        this.game.state.timeSlowFlashTimer = 30; // Flash for 0.5 seconds at 60fps
      }
    }

    // Bomb cooldown is handled by game state
    // All cooldown data is now available for canvas renderer via:
    // - this.game.player.shieldCooldown / this.game.player.shieldCooldownMax
    // - this.game.state.timeSlowCooldown / this.game.state.timeSlowCooldownMax  
    // - this.game.state.bombCooldown / this.game.state.bombCooldownMax
    // - this.game.state.shieldFlashTimer, this.game.state.timeSlowFlashTimer
  }

  show() {
    // All UI visibility now handled by canvas renderer based on game state
    // Actions are shown when game state is PLAYING
  }

  hide() {
    // All UI visibility now handled by canvas renderer based on game state
    // Actions are hidden when game state is not PLAYING
  }

  // Action methods
  useBomb() {
    if (this.game.state.bombs > 0 && this.game.state.bombCooldown <= 0) {
      this.game.state.bombs--;
      this.game.state.bombCooldown = this.game.state.bombCooldownMax || 300;
      
      // Explode all enemies and enemy bullets
      const entities = this.game.entities;
      
      // Create explosion effects for all enemies
      entities.enemies.forEach(enemy => {
        this.game.effects.createEnemyExplosion(enemy.x, enemy.y);
        this.game.effects.createDebris(enemy.x, enemy.y, "#ffaa00", 15);
      });
      entities.miniBosses.forEach(enemy => {
        this.game.effects.createEnemyExplosion(enemy.x, enemy.y);
        this.game.effects.createDebris(enemy.x, enemy.y, "#ffaa00", 15);
      });
      if (entities.boss) {
        this.game.effects.createEnemyExplosion(entities.boss.x, entities.boss.y);
        this.game.effects.createDebris(entities.boss.x, entities.boss.y, "#ffaa00", 15);
      }
      
      // Clear all enemies
      entities.enemies.length = 0;
      entities.miniBosses.length = 0;
      entities.boss = null;
      
      // Clear all enemy projectiles
      entities.enemyBullets.length = 0;
      entities.enemyLasers.length = 0;
      
    }
  }

  useShield() {
    if (this.game.player && this.game.player.activateShield()) {
      // Player's activateShield() method handles isShielding, shieldFrames, and cooldown
      
      // Play shield sound if available
      this.game.audio.play(this.game.audio.sounds.shield);
    }
  }

  useTimeSlow() {
    if (this.game.state.timeSlowCooldown <= 0 && !this.game.state.timeSlowActive) {
      this.game.state.timeSlowActive = true;
      this.game.state.timeSlowTimer = 0;
      this.game.state.timeSlowCooldown = this.game.state.timeSlowCooldownMax;
      
      // Play time slow sound if available
      this.game.audio.play(this.game.audio.sounds.timeSlow);
      
    }
  }
}