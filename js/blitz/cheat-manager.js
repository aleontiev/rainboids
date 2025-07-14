export class CheatManager {
  constructor(game) {
    this.game = game;
  }
  setup() {
    // Godmode button with touch support
    const godmodeBtn = document.getElementById("godmode-btn");
    const toggleGodmode = () => {
      this.game.player.godMode = !this.game.player.godMode;
      if (this.game.player.godMode) {
        this.game.cheatsUsed = true; // Mark cheats as used
      }
      this.update();
    };
    if (godmodeBtn) {
      godmodeBtn.addEventListener("click", toggleGodmode);
      godmodeBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        toggleGodmode();
      });
    }

    // All upgrades toggle button with touch support
    const allUpgradesBtn = document.getElementById("all-upgrades-btn");
    const toggleAllUpgrades = () => {
      if (this.game.allUpgradesState === null) {
        // Mark cheats as used when activating all upgrades
        this.game.cheatsUsed = true;
        
        // Save current state and apply all upgrades
        this.game.allUpgradesState = {
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
            x: this.game.player.x - 40,
            y: this.game.player.y,
            initialAngle: this.game.player.angle,
            offset: -40,
            isHorizontal: true,
          });
          this.game.player.secondShip.push({
            x: this.game.player.x + 40,
            y: this.game.player.y,
            initialAngle: this.game.player.angle,
            offset: 40,
            isHorizontal: true,
          });
        } else {
          // Landscape mode: above/below positioning
          this.game.player.secondShip.push({
            x: this.game.player.x,
            y: this.game.player.y - 40,
            initialAngle: this.game.player.angle,
            offset: -40,
            isHorizontal: false,
          });
          this.game.player.secondShip.push({
            x: this.game.player.x,
            y: this.game.player.y + 40,
            initialAngle: this.game.player.angle,
            offset: 40,
            isHorizontal: false,
          });
        }
      } else {
        // Restore previous state
        this.game.player.shield = this.game.allUpgradesState.shield;
        this.game.player.mainWeaponLevel =
          this.game.allUpgradesState.mainWeaponLevel;
        this.game.player.sideWeaponLevel =
          this.game.allUpgradesState.sideWeaponLevel;
        this.game.player.secondShip = [
          ...this.game.allUpgradesState.secondShip,
        ];
        this.game.allUpgradesState = null;
      }

      this.game.ui.update();
      this.update();
    };
    if (allUpgradesBtn) {
      allUpgradesBtn.addEventListener("click", toggleAllUpgrades);
      allUpgradesBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        toggleAllUpgrades();
      });
    }

    // Autoaim toggle button with touch support
    const autoaimBtn = document.getElementById("autoaim-btn");
    const toggleAutoaim = () => {
      this.game.autoaim = !this.game.autoaim;
      this.update();
    };
    if (autoaimBtn) {
      autoaimBtn.addEventListener("click", toggleAutoaim);
      autoaimBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        toggleAutoaim();
      });
    }
  }

  update() {
    // Godmode button
    const godmodeBtn = document.getElementById("godmode-btn");
    if (godmodeBtn) {
      godmodeBtn.classList.toggle("active", this.game.player.godMode);
    }

    // All Upgrades button
    const allUpgradesBtn = document.getElementById("all-upgrades-btn");
    if (allUpgradesBtn) {
      allUpgradesBtn.classList.toggle(
        "active",
        this.game.allUpgradesState !== null
      );
    }

    // Autoaim button
    const autoaimBtn = document.getElementById("autoaim-btn");
    if (autoaimBtn) {
      autoaimBtn.classList.toggle("active", this.game.autoaim);
    }
  }
}
