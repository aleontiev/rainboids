// actions / cooldown management for Rainboids: Blitz
export class ActionsView {
  constructor(game) {
    this.game = game;
  }

  update() {
    // Update shield button cooldown
    const shieldButton = document.getElementById("shield-button");
    if (shieldButton && this.game.player) {
      const wasCooldown = this.game.player.shieldCooldown > 1;
      if (this.game.player.shieldCooldown > 0) {
        shieldButton.classList.add("on-cooldown");
        const circle = shieldButton.querySelector(".cooldown-circle");
        if (circle) {
          const progress =
            this.game.player.shieldCooldown /
            this.game.player.shieldCooldownMax;
          circle.style.strokeDashoffset = (157 * progress).toString();
        }
      } else {
        shieldButton.classList.remove("on-cooldown");
        // Trigger flash when coming off cooldown
        if (wasCooldown && this.game.player.shieldCooldown <= 0) {
          this.game.state.shieldFlashTimer = 30; // Flash for 0.5 seconds at 60fps
        }
      }

      // Handle ready ring - bright yellow when shield is ready
      const readyRing = shieldButton.querySelector(".ready-ring circle");
      if (readyRing) {
        if (
          this.game.player.shieldCooldown <= 0 &&
          !this.game.player.isShielding
        ) {
          readyRing.style.stroke = "#ffff00"; // Bright yellow
          readyRing.parentElement.style.opacity = "1";
        } else {
          readyRing.parentElement.style.opacity = "0";
        }
      }

      // Handle cooldown ring progress
      const cooldownRing = shieldButton.querySelector(".cooldown-ring");
      if (cooldownRing) {
        const circle = cooldownRing.querySelector(".cooldown-circle");
        if (circle) {
          const progress =
            this.game.player.shieldCooldown /
            this.game.player.shieldCooldownMax;
          circle.style.strokeDashoffset = (144 * progress).toString();
        }
      }

      // Handle flash effect
      if (this.game.state.shieldFlashTimer > 0) {
        this.game.state.shieldFlashTimer--;
        const flashIntensity =
          Math.sin(this.game.state.shieldFlashTimer * 0.3) * 0.5 + 0.5;
        shieldButton.style.backgroundColor = `rgba(0, 255, 136, ${
          flashIntensity * 0.3
        })`;
        shieldButton.style.borderColor = `rgba(0, 255, 136, ${
          flashIntensity * 0.8
        })`;
      } else {
        shieldButton.style.backgroundColor = "";
        shieldButton.style.borderColor = "";
      }
    }

    // Update time slow button cooldown
    const timeSlowButton = document.getElementById("time-slow-button");
    if (timeSlowButton) {
      const wasCooldown = this.game.state.timeSlowCooldown > 1;
      if (this.game.state.timeSlowCooldown > 0) {
        timeSlowButton.classList.add("on-cooldown");
        const circle = timeSlowButton.querySelector(".cooldown-circle");
        if (circle) {
          const progress =
            this.game.state.timeSlowCooldown /
            this.game.state.timeSlowCooldownMax;
          circle.style.strokeDashoffset = (157 * progress).toString();
        }
      } else {
        timeSlowButton.classList.remove("on-cooldown");
        // Trigger flash when coming off cooldown
        if (wasCooldown && this.game.state.timeSlowCooldown <= 0) {
          this.game.state.timeSlowFlashTimer = 30; // Flash for 0.5 seconds at 60fps
        }
      }

      // Handle ready ring - bright green when time slow is ready
      const readyRing = timeSlowButton.querySelector(".ready-ring circle");
      if (readyRing) {
        if (
          this.game.state.timeSlowCooldown <= 0 &&
          !this.game.state.timeSlowActive
        ) {
          readyRing.style.stroke = "#00ff00"; // Bright green
          readyRing.parentElement.style.opacity = "1";
        } else {
          readyRing.parentElement.style.opacity = "0";
        }
      }

      // Handle cooldown ring progress
      const cooldownRing = timeSlowButton.querySelector(".cooldown-ring");
      if (cooldownRing) {
        const circle = cooldownRing.querySelector(".cooldown-circle");
        if (circle) {
          const progress =
            this.game.state.timeSlowCooldown /
            this.game.state.timeSlowCooldownMax;
          circle.style.strokeDashoffset = (144 * progress).toString();
        }
      }

      // Handle flash effect
      if (this.game.state.timeSlowFlashTimer > 0) {
        this.game.state.timeSlowFlashTimer--;
        const flashIntensity =
          Math.sin(this.game.state.timeSlowFlashTimer * 0.3) * 0.5 + 0.5;
        timeSlowButton.style.backgroundColor = `rgba(136, 136, 255, ${
          flashIntensity * 0.3
        })`;
        timeSlowButton.style.borderColor = `rgba(136, 136, 255, ${
          flashIntensity * 0.8
        })`;
      } else {
        timeSlowButton.style.backgroundColor = "";
        timeSlowButton.style.borderColor = "";
      }
    }

    // Update bomb button visibility and count
    const bombButton = document.getElementById("bomb-button");
    if (bombButton) {
      if (this.game.state.bombs > 0) {
        bombButton.style.display = "flex";

        // Handle ready ring - bright red when bomb is available
        const readyRing = bombButton.querySelector(".ready-ring circle");
        if (readyRing) {
          readyRing.style.stroke = "#ff0000"; // Bright red
          readyRing.parentElement.style.opacity = "1";
        }

        // Show count if 2 or more bombs
        let countDisplay = bombButton.querySelector(".bomb-count");
        if (this.game.state.bombs >= 2) {
          if (!countDisplay) {
            countDisplay = document.createElement("div");
            countDisplay.className = "bomb-count";
            countDisplay.style.cssText = `
              position: absolute;
              bottom: -5px;
              right: -5px;
              background: #ff4444;
              color: white;
              border-radius: 50%;
              width: 20px;
              height: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: bold;
              border: 2px solid white;
            `;
            bombButton.appendChild(countDisplay);
          }
          countDisplay.textContent = this.game.state.bombs.toString();
        } else if (countDisplay) {
          countDisplay.remove();
        }
      } else {
        bombButton.style.display = "none";
        // Hide the ring when no bombs available
        const readyRing = bombButton.querySelector(".ready-ring");
        if (readyRing) {
          readyRing.style.opacity = "0";
        }
      }
    }
  }
  hide() {
    const buttons = ["shield-button", "bomb-button", "time-slow-button"];

    buttons.forEach((buttonId) => {
      const button = document.getElementById(buttonId);
      if (button) {
        button.style.display = "none";
      }
    });
  }

  show() {
    const buttons = ["shield-button", "bomb-button", "time-slow-button"];

    buttons.forEach((buttonId) => {
      const button = document.getElementById(buttonId);
      if (button) {
        button.style.display = "block";
      }
    });
  }
}
