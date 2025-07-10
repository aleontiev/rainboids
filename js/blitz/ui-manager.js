// UI and cooldown management for Rainboids: Blitz

export class UIManager {
  constructor(game) {
    this.game = game;
  }

  updateCooldownVisuals() {
    // Update shield button cooldown
    const shieldButton = document.getElementById("shield-button");
    if (shieldButton) {
      const wasCooldown = this.game.shieldCooldown > 1;
      if (this.game.shieldCooldown > 0) {
        shieldButton.classList.add("on-cooldown");
        const circle = shieldButton.querySelector(".cooldown-circle");
        if (circle) {
          const progress =
            this.game.shieldCooldown / this.game.shieldCooldownMax;
          circle.style.strokeDashoffset = (157 * progress).toString();
        }
      } else {
        shieldButton.classList.remove("on-cooldown");
        // Trigger flash when coming off cooldown
        if (wasCooldown && this.game.shieldCooldown <= 0) {
          this.game.shieldFlashTimer = 30; // Flash for 0.5 seconds at 60fps
        }
      }

      // Handle flash effect
      if (this.game.shieldFlashTimer > 0) {
        this.game.shieldFlashTimer--;
        const flashIntensity =
          Math.sin(this.game.shieldFlashTimer * 0.3) * 0.5 + 0.5;
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
      const wasCooldown = this.game.timeSlowCooldown > 1;
      if (this.game.timeSlowCooldown > 0) {
        timeSlowButton.classList.add("on-cooldown");
        const circle = timeSlowButton.querySelector(".cooldown-circle");
        if (circle) {
          const progress =
            this.game.timeSlowCooldown / this.game.timeSlowCooldownMax;
          circle.style.strokeDashoffset = (157 * progress).toString();
        }
      } else {
        timeSlowButton.classList.remove("on-cooldown");
        // Trigger flash when coming off cooldown
        if (wasCooldown && this.game.timeSlowCooldown <= 0) {
          this.game.timeSlowFlashTimer = 30; // Flash for 0.5 seconds at 60fps
        }
      }

      // Handle flash effect
      if (this.game.timeSlowFlashTimer > 0) {
        this.game.timeSlowFlashTimer--;
        const flashIntensity =
          Math.sin(this.game.timeSlowFlashTimer * 0.3) * 0.5 + 0.5;
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
      if (this.game.bombCount > 0) {
        bombButton.style.display = "flex";

        // Show count if 2 or more bombs
        let countDisplay = bombButton.querySelector(".bomb-count");
        if (this.game.bombCount >= 2) {
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
          countDisplay.textContent = this.game.bombCount.toString();
        } else if (countDisplay) {
          countDisplay.remove();
        }
      } else {
        bombButton.style.display = "none";
      }
    }
  }

  update() {
    // Update score display
    const scoreElement = document.getElementById("score-value");
    if (scoreElement) {
      scoreElement.textContent = this.game.score.toString();
    }

    // Update timer display
    const timerElement = document.getElementById("timer-value");
    if (timerElement) {
      const seconds = Math.floor(this.game.gameTime / 60);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      timerElement.textContent = `${minutes}:${remainingSeconds
        .toString()
        .padStart(2, "0")}`;
    }

    // Update high score displays
    const highScoreElement = document.getElementById("high-score-value");
    if (highScoreElement) {
      highScoreElement.textContent = this.game.highScore.toString();
    }

    const finalScoreElement = document.getElementById("final-score-value");
    if (finalScoreElement) {
      finalScoreElement.textContent = this.game.score.toString();
    }
  }
}
