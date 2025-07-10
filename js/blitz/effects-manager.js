// Effects and explosion system for Rainboids: Blitz
import { Debris, RainbowParticle } from "./entities/particle.js";
import { RainbowExplosion } from "./entities/explosion.js";

export class EffectsManager {
  constructor(game) {
    this.game = game;
  }

  createChainExplosion() {
    // Create expanding wave of explosions across the screen
    const centerX = this.game.player.x;
    const centerY = this.game.player.y;
    const maxRadius = Math.max(this.game.canvas.width, this.game.canvas.height);

    for (let wave = 0; wave < 8; wave++) {
      setTimeout(() => {
        const waveRadius = (wave + 1) * (maxRadius / 8);
        const explosionsInWave = Math.min(24, 8 + wave * 2);

        for (let i = 0; i < explosionsInWave; i++) {
          const angle = (i / explosionsInWave) * Math.PI * 2 + wave * 0.3;
          const radius = waveRadius * (0.8 + Math.random() * 0.4);
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;

          // Create explosion if on screen
          if (
            x >= -100 &&
            x <= this.game.canvas.width + 100 &&
            y >= -100 &&
            y <= this.game.canvas.height + 100
          ) {
            const explosionSize = 150 + Math.random() * 100;
            this.createRainbowExplosion(x, y, explosionSize);
          }
        }

        // Play additional explosion sounds for dramatic effect
        if (wave < 4) {
          this.game.audio.playSound(this.game.audio.sounds.explosion);
        }
      }, wave * 120); // 120ms between each wave
    }
  }

  createDebris(x, y) {
    // Create debris particles with physics
    for (let i = 0; i < 8; i++) {
      this.game.particles.push(new Debris(x, y));
    }
  }

  update() {
    // Update debris particles
    for (let i = this.game.particles.length - 1; i >= 0; i--) {
      const particle = this.game.particles[i];

      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += particle.gravity; // Apply gravity

      // Reduce life
      particle.life--;

      // Remove if dead
      if (particle.life <= 0) {
        this.game.particles.splice(i, 1);
      }
    }
  }

  render(ctx) {
    // Render debris particles
    this.game.particles.forEach((particle) => {
      const opacity = particle.life / particle.maxLife;
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = particle.color;
      ctx.fillRect(
        particle.x - particle.size / 2,
        particle.y - particle.size / 2,
        particle.size,
        particle.size
      );
      ctx.restore();
    });
  }

  createRainbowExplosion(x, y) {
    this.game.explosions.push(new RainbowExplosion(x, y));
  }

  createParticleExplosion(x, y) {

    // Add rainbow particles scattered around the explosion
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const distance = 30 + Math.random() * 40;
      const particleX = x + Math.cos(angle) * distance;
      const particleY = y + Math.sin(angle) * distance;

      // Create rainbow debris particles
      this.game.particles.push(new RainbowParticle(particleX, particleY));
    }
  }

  createExplosion(x, y, size = 30) {
    // Create a basic explosion at the specified location
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const distance = 30 + Math.random() * 10;
      const particleX = x + Math.cos(angle) * distance;
      const particleY = y + Math.sin(angle) * distance;

      // Create rainbow debris particles
      this.game.particles.push(new RainbowParticle(particleX, particleY));
    }
  }

  createEnemyExplosion(x, y) {
    this.createExplosion(x, y);
  }

  updateExplosions() {
    // Update explosion animations
    for (let i = this.game.explosions.length - 1; i >= 0; i--) {
      const explosion = this.game.explosions[i];
      explosion.life--;

      if (explosion.life <= 0) {
        this.game.explosions.splice(i, 1);
      }
    }
  }

  renderExplosions(ctx) {
    // Render explosions
    this.game.explosions.forEach((explosion) => {
      const progress = 1 - explosion.life / explosion.maxLife;
      const currentSize = explosion.size * (0.5 + progress * 0.5);
      const opacity = explosion.life / explosion.maxLife;

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = explosion.color;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, currentSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
}
