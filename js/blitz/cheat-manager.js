export class CheatManager {
  constructor(game) {
    this.game = game;
    this.autoaim = false; // Default off
    this.autoplay = false; // Default off
    this.used = false; // Track if cheats have been used this session
    this.allUprades = null; // Store original state when all upgrades applied
  }

  setup() {
    // All cheat button handling is now done via canvas renderer
    // This class only manages the cheat state logic
  }

  toggleGodMode() {
    this.game.player.godMode = !this.game.player.godMode;
    if (this.game.player.godMode) {
      this.used = true; // Mark cheats as used
    }
    this.update();
  }

  toggleUpgrades() {
    if (this.allUprades === null) {
      // Mark cheats as used when activating all upgrades
      this.used = true;
      
      // Save current state and apply all upgrades
      this.allUprades = {
        shield: this.game.player.shield,
        mainWeaponLevel: this.game.player.mainWeaponLevel,
        sideWeaponLevel: this.game.player.sideWeaponLevel,
        secondShip: [...this.game.player.secondShip], // Copy array
      };

      // Apply all upgrades
      this.game.player.shield = 3; // Max shields (0-3)
      this.game.player.mainWeaponLevel = 5; // Max main weapon (1-5)
      this.game.player.sideWeaponLevel = 4; // Max side weapon (0-4)

      // Add maximum companion ships (2)
      this.game.player.secondShip = []; // Clear existing
      if (this.game.isPortrait) {
        // Portrait mode: left/right positioning
        this.game.player.secondShip.push({
          x: this.game.player.x - 30,
          y: this.game.player.y + 30,
          level: 5
        });
        this.game.player.secondShip.push({
          x: this.game.player.x + 30,
          y: this.game.player.y + 30,
          level: 5
        });
      } else {
        // Landscape mode: up/down positioning  
        this.game.player.secondShip.push({
          x: this.game.player.x - 30,
          y: this.game.player.y - 25,
          level: 5
        });
        this.game.player.secondShip.push({
          x: this.game.player.x - 30,
          y: this.game.player.y + 25,
          level: 5
        });
      }
    } else {
      // Restore original state
      this.game.player.shield = this.allUprades.shield;
      this.game.player.mainWeaponLevel = this.allUprades.mainWeaponLevel;
      this.game.player.sideWeaponLevel = this.allUprades.sideWeaponLevel;
      this.game.player.secondShip = [...this.allUprades.secondShip]; // Restore array
      this.allUprades = null; // Reset state
    }

    this.update();
  }

  toggleAutoAim() {
    this.autoaim = !this.autoaim;
    if (this.autoaim) {
      this.used = true; // Mark cheats as used
    }
    this.update();
  }

  toggleAutoPlayer() {
    this.autoplay = !this.autoplay;
    if (this.autoplay) {
      this.used = true; // Mark cheats as used
    }
    this.update();
  }

  update() {
    // All visual button state updates now handled by canvas renderer
    // Button states available via:
    // - this.game.player.godMode
    // - this.allUprades !== null (for upgrades toggle state)
    // - this.autoaim
    // - this.autoplay
  }

  reset() {
    // Called when game restarts
    this.used = false; // Don't reset cheat states, just usage tracking
  }
}