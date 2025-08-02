// PlayerManager - Handles player input, updates, and shooting
import { Bullet } from "./entities/bullet.js";
import { Laser } from "./entities/laser.js";
import { HomingMissile } from "./entities/homing-missile.js";

export class PlayerManager {
  constructor(game) {
    this.game = game;
    // Track previous input states for detecting fresh key presses
    this.previousInput = {
      shift: false,
      f: false,
      z: false
    };
  }

  update(deltaTime, slowdownFactor) {
    const input = this.game.input.getInput();

    if (this.game.state.state === 'DYING') {
        return;
    }
    // Handle autoplay abilities BEFORE processing input
    if (this.game.autoplay) {
      this.game.player.autoplayer.handleAutoplayAbilities(
        this.game.entities.enemies,
        this.game.entities.miniBosses,
        this.game.entities.boss,
        this.game.entities.enemyBullets,
        this.game.entities.enemyLasers,
        this.game.entities.asteroids,
        input,
        this.game.entities.powerups,
        this.game // Pass game object for cooldown checks
      );
    }

    // Handle input (now includes autoplayer modifications)
    // Only trigger abilities on fresh key presses, not when held down
    if (input.shift && !this.previousInput.shift) {
      this.game.powerup.activateShield();
    }
    if (input.f && !this.previousInput.f) {
      this.game.powerup.activateTimeSlow();
    }
    if (input.z && !this.previousInput.z) {
      this.game.powerup.activateBomb();
    }

    // Update player
    this.game.player.update(
      input,
      this.game.entities.enemies,
      this.game.entities.miniBosses,
      this.game.entities.boss,
      this.game.entities.asteroids,
      this.game.isPortrait,
      this.game.cheats.autoaim,
      this.game.player.mainWeaponLevel,
      this.game.state.timeSlowActive,
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
      shouldAutoplayFire = this.game.player.autoplayer.hasValidTargets(
        this.game.entities.enemies,
        this.game.entities.miniBosses,
        this.game.entities.boss,
        this.game.entities.asteroids
      );
    }

    // Check if autoaim should suppress firing when no valid targets
    const shouldAutoaimSuppress = this.game.cheats.autoaim && !this.game.player.shouldAutoFire;
    
    if (
      (input.fire || (this.game.cheats.autoplay && shouldAutoplayFire)) &&
      this.game.state.state !== "DYING" &&
      !shouldAutoaimSuppress
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
        // Stop laser sound immediately if we switched from laser to bullet
        this.game.audio.stopContinuousLaser();
      }
    } else {
      // Stop continuous laser sound when not firing
      this.game.audio.stopContinuousLaser();
    }
    
    // Update previous input state for next frame's fresh key press detection
    this.previousInput.shift = input.shift;
    this.previousInput.f = input.f;
    this.previousInput.z = input.z;
  }
}
