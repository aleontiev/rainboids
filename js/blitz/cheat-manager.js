export class CheatManager {
  constructor(game) {
    this.game = game;
  }
  setup() {
    // Godmode button with touch support
    const godmodeBtn = document.getElementById("godmode-btn");
    const toggleGodmode = () => {
      this.game.player.godMode = !this.game.player.godMode;
      this.update();
    };
    godmodeBtn.addEventListener("click", toggleGodmode);
    godmodeBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      toggleGodmode();
    });

    // All upgrades toggle button with touch support
    const allUpgradesBtn = document.getElementById("all-upgrades-btn");
    const toggleAllUpgrades = () => {
      if (this.game.allUpgradesState === null) {
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

      this.ui.updateUI();
      this.update();
    };
    allUpgradesBtn.addEventListener("click", toggleAllUpgrades);
    allUpgradesBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      toggleAllUpgrades();
    });

    // Autoaim toggle button with touch support
    const autoaimBtn = document.getElementById("autoaim-btn");
    const toggleAutoaim = () => {
      this.game.autoaim = !this.game.autoaim;
      this.update();
    };
    autoaimBtn.addEventListener("click", toggleAutoaim);
    autoaimBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      toggleAutoaim();
    });

    // Music toggle button with touch support
    const musicBtn = document.getElementById("music-btn");
    const toggleMusic = () => {
      this.game.musicEnabledd = !this.game.musicEnabledd;
      this.update();
    };
    musicBtn.addEventListener("click", toggleMusic);
    musicBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      toggleMusic();
    });

    // Volume toggle button with touch support
    const volumeBtn = document.getElementById("volume-btn");
    const toggleVolume = () => {
      this.game.soundEnabled = !this.game.soundEnabled;
      this.update();
    };
    volumeBtn.addEventListener("click", toggleVolume);
    volumeBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      toggleVolume();
    });
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

    // Music button
    const musicBtn = document.getElementById("music-btn");
    if (musicBtn) {
      musicBtn.classList.toggle("active", this.game.musicEnabledd);
      musicBtn.classList.toggle("muted", !this.game.musicEnabledd);
    }

    // Volume button
    const volumeBtn = document.getElementById("volume-btn");
    if (volumeBtn) {
      volumeBtn.classList.toggle("active", this.game.soundEnabled);
      volumeBtn.classList.toggle("muted", !this.game.soundEnabled);
    }
  }
}
