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

      // Add maximum companion ships (5) using dynamic orbital positioning
      this.game.player.secondShip = []; // Clear existing
      const maxShips = 5;
      const radius = 60; // Distance from player
      
      for (let i = 0; i < maxShips; i++) {
        const angleStep = (Math.PI * 2) / maxShips; // Evenly distributed around full circle
        const baseAngle = i * angleStep;
        
        this.game.player.secondShip.push({
          x: this.game.player.x + Math.cos(baseAngle) * radius,
          y: this.game.player.y + Math.sin(baseAngle) * radius,
          initialAngle: this.game.player.angle,
          baseAngle: baseAngle, // Store the base angle for orbiting
          radius: radius, // Store radius for orbiting
          orbitSpeed: 0.02, // Rotation speed for orbiting
          currentOrbitAngle: baseAngle, // Current angle in orbit
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