// PlayerManager - Handles player input, updates, and shooting
import { Bullet } from "./entities/bullet.js";
import { Laser } from "./entities/laser.js";
import { HomingMissile } from "./entities/homing-missile.js";

export class PlayerManager {
  constructor(game) {
    this.game = game;
  }

  update(deltaTime, slowdownFactor) {
    const input = this.game.input.getInput();

    if (this.game.state.state === 'DYING') {
        return;
    }
    // Handle autoplay abilities BEFORE processing input
    if (this.game.autoplay) {
      const collidables = this.game.createCollidables(
        this.game.entities.allEnemies,
        this.game.entities.enemyBullets,
        this.game.entities.enemyLasers,
        this.game.entities.asteroids,
        this.game.entities.boss
      );
      this.game.player.autoplayer.handleAutoplayAbilities(
        collidables,
        input,
        this.game.entities.powerups,
        this.game // Pass game object for cooldown checks
      );
    }

    // Handle input (now includes autoplayer modifications)
    if (input.shift) {
      this.game.powerup.activateShield();
    }
    if (input.f) {
      this.game.powerup.activateTimeSlow();
    }
    if (input.z) {
      this.game.powerup.activateBomb();
    }

    // Update player
    this.game.player.update(
      input,
      this.game.entities.allEnemies,
      this.game.entities.asteroids,
      this.game.isPortrait,
      this.game.cheats.autoaim,
      this.game.player.mainWeaponLevel,
      this.game.state.timeSlowActive,
      this.game.entities.boss,
      this.game.cheats.autoplay,
      this.game.entities.enemyBullets,
      this.game.entities.enemyLasers,
      this.game.entities.powerups
    );

    // Player shooting (prevent firing during death animation)
    this.handlePlayerShooting(input);
  }

  handlePlayerShooting(input) {
    // For autoplay, only fire when there are valid targets on screen
    let shouldAutoplayFire = false;
    if (this.game.cheats.autoplay) {
      const collidables = this.game.createCollidables(
        this.game.entities.allEnemies,
        this.game.entities.enemyBullets,
        this.game.entities.enemyLasers,
        this.game.entities.asteroids,
        this.game.entities.boss
      );
      shouldAutoplayFire =
        this.game.player.autoplayer.hasValidTargets(collidables);
    }

    if (
      (input.fire || (this.game.cheats.autoplay && shouldAutoplayFire)) &&
      this.game.state.state !== "DYING"
    ) {
      const weaponType = this.game.player.shoot(
        this.game.entities.bullets,
        this.game.entities.missiles,
        Bullet,
        Laser,
        HomingMissile,
        this.game.isPortrait,
        true // isPlayerBullet
      );

      // Handle different weapon sounds
      if (weaponType === "laser") {
        this.game.audio.startContinuousLaser();
      } else if (weaponType === "bullet") {
        this.game.audio.play(this.game.audio.sounds.shoot);
      }
    } else {
      // Stop continuous laser sound when not firing
      this.game.audio.stopContinuousLaser();
    }
  }
}
