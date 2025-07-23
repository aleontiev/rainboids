// PowerupManager - Handles powerup collection and player abilities
export class PowerupManager {
  constructor(game) {
    this.game = game;
  }

  collect(powerup) {
    switch (powerup.type) {
      case "shield":
        this.game.player.shield = Math.min(this.game.player.shield + 1, 5); // Max 5 shields
        this.game.audio.play(this.game.audio.sounds.powerup);
        this.game.state.addScore(25);
        break;

      case "mainWeapon":
        this.game.player.mainWeaponLevel = Math.min(
          this.game.player.mainWeaponLevel + 1,
          5
        );
        this.game.audio.play(this.game.audio.sounds.powerup);
        this.game.state.addScore(50);
        break;

      case "sideWeapon":
        this.game.player.sideWeaponLevel = Math.min(
          this.game.player.sideWeaponLevel + 1,
          3
        );
        this.game.audio.play(this.game.audio.sounds.powerup);
        this.game.state.addScore(50);
        break;

      case "secondShip":
        if (this.game.player.secondShip.length < 2) {
          // Max 2 companion ships
          const shipCount = this.game.player.secondShip.length;

          if (this.game.isPortrait) {
            // Portrait mode: left/right positioning
            const offset = shipCount === 0 ? -40 : 40;
            this.game.player.secondShip.push({
              x: this.game.player.x + offset,
              y: this.game.player.y,
              initialAngle: this.game.player.angle,
              offset: offset,
              isHorizontal: true,
            });
          } else {
            // Landscape mode: above/below positioning
            const offset = shipCount === 0 ? -40 : 40;
            this.game.player.secondShip.push({
              x: this.game.player.x,
              y: this.game.player.y + offset,
              initialAngle: this.game.player.angle,
              offset: offset,
              isHorizontal: false,
            });
          }

          this.game.audio.play(this.game.audio.sounds.powerup);
          this.game.state.addScore(100);
        }
        break;

      case "bomb":
        this.game.state.bombs = Math.min(this.game.state.bombs + 1, 3); // Max 3 bombs
        this.game.audio.play(this.game.audio.sounds.powerup);
        this.game.state.addScore(75);
        break;

      case "rainbowStar":
        // Special powerup - gives temporary invulnerability
        this.game.player.activateRainbowInvulnerability();
        break;
    }
  }

  activateShield() {
    // Use the same shield logic as the action buttons
    this.game.actions.useShield();
  }

  activateTimeSlow() {
    // Use the same time slow logic as the action buttons
    this.game.actions.useTimeSlow();
  }

  activateBomb() {
    // Only activate if player has bombs
    if (this.game.state.bombs <= 0) {
      return false; // No bombs available
    }

    this.game.state.bombs--;

    // Destroy all small enemies and asteroids
    for (let i = this.game.entities.getEnemyCount() - 1; i >= 0; i--) {
      this.game.effects.createEnemyExplosion(
        this.game.entities.enemies[i].x,
        this.game.entities.enemies[i].y
      );
      this.game.effects.createDebris(
        this.game.entities.enemies[i].x,
        this.game.entities.enemies[i].y,
        "#ffaa00",
        12
      );
      this.game.state.addScore(50);
    }

    // Clear all regular enemies
    this.game.entities.enemies.length = 0;

    // Clear all enemy bullets and lasers
    this.game.entities.enemyBullets.length = 0;
    this.game.entities.enemyLasers.length = 0;

    // Destroy all asteroids
    for (let i = this.game.entities.asteroids.length - 1; i >= 0; i--) {
      const asteroid = this.game.entities.asteroids[i];
      this.game.effects.createDebris(asteroid.x, asteroid.y, "#ffffff");
      this.game.effects.createExplosion(asteroid.x, asteroid.y);
      this.game.state.addScore(25);
    }
    this.game.entities.asteroids.length = 0;

    // Damage level 1 boss if present
    if (this.game.entities.boss) {
      this.game.handleEnemyDamage(
        this.game.entities.boss,
        100,
        this.game.entities.boss.x,
        this.game.entities.boss.y
      ); // Very high damage to boss
    }

    // Create massive explosion effect
    this.game.effects.createChainExplosion();
    this.game.actions.update();
    return true; // Bomb was used
  }
}
