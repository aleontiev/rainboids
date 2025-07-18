// Renderer - Handles all game rendering
export class Renderer {
  constructor(game) {
    this.game = game;
  }

  render() {
    const ctx = this.game.ctx;
    const entities = this.game.entities;
    const state = this.game.state;
    const renderer = (x) => x.render(ctx);
    // Reset alpha and clear screen first
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);

    // Draw background
    this.game.background.render(ctx);

    if (state.state === "PLAYING" || state.state === "DYING") {
      // Apply time slow effect
      if (state.timeSlowActive) {
        ctx.globalAlpha = 0.6; // Fade other elements
      }

      // Draw particles first (behind everything)
      entities.particles.forEach(renderer);

      // Draw debris
      entities.debris.forEach(renderer);

      // Draw asteroids
      entities.asteroids.forEach(renderer);

      // Draw metals
      entities.metals.forEach(renderer);

      // Draw powerups
      entities.powerups.forEach(renderer);

      // Draw bullets
      entities.bullets.forEach(renderer);

      // Draw enemy bullets
      entities.enemyBullets.forEach(renderer);

      // Draw enemy lasers
      entities.enemyLasers.forEach(renderer);

      // Draw missiles
      entities.missiles.forEach(renderer);

      // Draw spreading bullets
      entities.spreadingBullets.forEach(renderer);

      // Draw enemies
      entities.enemies.forEach(renderer);
      entities.miniBosses.forEach(renderer);
      if (entities.boss) {
        renderer(entities.boss);
      }
      entities.particles.forEach(renderer);

      // Draw player (on top of everything except UI)
      if (state.state !== "DYING") {
        renderer(this.game.player);
      }

      // Draw explosions (on top of everything)
      this.game.explosions.forEach(renderer);

      // Draw text particles (score popups, etc.)
      this.game.textParticles.forEach(renderer);

      // Reset alpha after game elements
      ctx.globalAlpha = 1.0;

      // Handle scene opacity (level transitions) - apply after game elements
      if (this.game.opacity < 1) {
        ctx.fillStyle = `rgba(0, 0, 0, ${1 - this.game.opacity})`;
        ctx.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
      }
    }

    // Draw title screen if visible
    if (state.state === "TITLE" || state.state === "PAUSED") {
      this.game.title.render();
    }

    // Draw target indicator for mouse position (desktop only) - always on top
    // Reset alpha to ensure crosshair is always fully visible
    ctx.globalAlpha = 1.0;
    this.renderCrosshair();
  }

  renderCrosshair() {
    const input = this.game.input.getInput();
    const ctx = this.game.ctx;
    const entities = this.game.entities;
    const state = this.game.state;
    
    // Only show crosshair during gameplay and on desktop
    if (!this.game.isMobile && (state.state === "PLAYING" || state.state === "DYING") && input.mousePosition) {
      const { x: mouseX, y: mouseY } = input.mousePosition;
      ctx.save();
      
      // Ensure crosshair is fully visible regardless of game opacity
      ctx.globalAlpha = 1.0;

      // Check if mouse is over any targetable object
      let isOverTarget = false;

      // Check enemies
      entities.allEnemies.forEach((enemy) => {
        const dist = Math.sqrt(
          (mouseX - enemy.x) ** 2 + (mouseY - enemy.y) ** 2
        );
        if (dist < enemy.size + 20) {
          // Add 20px margin for easier targeting
          isOverTarget = true;
        }
      });

      // Check asteroids
      entities.asteroids.forEach((asteroid) => {
        const dist = Math.sqrt(
          (mouseX - asteroid.x) ** 2 + (mouseY - asteroid.y) ** 2
        );
        if (dist < asteroid.size + 15) {
          // Add 15px margin for easier targeting
          isOverTarget = true;
        }
      });

      // Check level 1 boss if not already over a target
      if (!isOverTarget && entities.boss) {
        const dist = Math.sqrt(
          (mouseX - entities.boss.x) ** 2 + (mouseY - entities.boss.y) ** 2
        );
        if (dist < entities.boss.size + 10) {
          // Add 10px margin for easier targeting
          isOverTarget = true;
        }
      }

      // Set crosshair color based on whether it's over a target
      if (isOverTarget) {
        ctx.strokeStyle = "#ff6666"; // Red when over target
        ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = "#ffffff"; // White when not over target
        ctx.lineWidth = 2;
      }

      // Draw crosshair
      const size = 15;
      ctx.beginPath();

      // Horizontal line
      ctx.moveTo(mouseX - size, mouseY);
      ctx.lineTo(mouseX - size / 3, mouseY);
      ctx.moveTo(mouseX + size / 3, mouseY);
      ctx.lineTo(mouseX + size, mouseY);

      // Vertical line
      ctx.moveTo(mouseX, mouseY - size);
      ctx.lineTo(mouseX, mouseY - size / 3);
      ctx.moveTo(mouseX, mouseY + size / 3);
      ctx.lineTo(mouseX, mouseY + size);

      ctx.stroke();

      // Draw center dot
      ctx.fillStyle = isOverTarget ? "#ff6666" : "#ffffff";
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
}
