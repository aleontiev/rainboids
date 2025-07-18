// Effects and explosion system for Rainboids: Blitz
import { Debris, RainbowParticle, GrayParticle } from "./entities/particle.js";
import { RainbowExplosion } from "./entities/explosion.js";

export class EffectsManager {
  constructor(game) {
    this.game = game;
  }

  createChainExplosion() {
    // Create expanding wave of rainbow explosions across the screen
    const centerX = this.game.player.x;
    const centerY = this.game.player.y;
    const maxRadius = Math.max(this.game.canvas.width, this.game.canvas.height);

    for (let wave = 0; wave < 10; wave++) {
      setTimeout(() => {
        const waveRadius = (wave + 1) * (maxRadius / 10);
        const explosionsInWave = Math.min(24, 8 + wave * 3);

        for (let i = 0; i < explosionsInWave; i++) {
          const angle = (i / explosionsInWave) * Math.PI * 2 + wave * 0.4;
          const radius = waveRadius * (0.6 + Math.random() * 0.8);
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;

          // Create explosion if on screen (with larger buffer for dramatic effect)
          if (
            x >= -250 &&
            x <= this.game.canvas.width + 250 &&
            y >= -250 &&
            y <= this.game.canvas.height + 250
          ) {
            // Varied explosion sizes for more dramatic effect
            const explosionSize = 70 + Math.random() * 80;
            this.createRainbowExplosion(x, y, explosionSize);
          }
        }

        // Play improved explosion sound for more waves
        if (wave < 5) {
          this.game.audio.play(this.game.audio.sounds.bombExplosion);
        }
      }, wave * 100); // Slightly longer timing for more dramatic buildup
    }

    // Create central mega explosion for dramatic effect
    this.createRainbowExplosion(centerX, centerY, 200);
  }

  createDebris(x, y) {
    // Create debris particles with physics
    for (let i = 0; i < 8; i++) {
      this.game.entities.particles.push(new Debris(x, y));
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

  createRainbowExplosion(x, y, size) {
    this.game.explosions.push(new RainbowExplosion(x, y, size));
  }

  createParticleExplosion(x, y) {

    // Add rainbow particles scattered around the explosion
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const distance = 30 + Math.random() * 40;
      const particleX = x + Math.cos(angle) * distance;
      const particleY = y + Math.sin(angle) * distance;

      // Create rainbow debris particles
      this.game.entities.particles.push(new RainbowParticle(particleX, particleY));
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
      this.game.entities.particles.push(new RainbowParticle(particleX, particleY));
    }
  }

  createAsteroidHitEffect(x, y, size = 30) {
    // Create a gray explosion effect for asteroid hits
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const distance = 30 + Math.random() * 10;
      const particleX = x + Math.cos(angle) * distance;
      const particleY = y + Math.sin(angle) * distance;

      // Create gray debris particles
      this.game.entities.particles.push(new GrayParticle(particleX, particleY));
    }
  }

  createEnemyExplosion(x, y) {
    this.createExplosion(x, y);
  }

  updateExplosions(slowdownFactor = 1.0) {
    // Update explosion animations
    for (let i = this.game.explosions.length - 1; i >= 0; i--) {
      const explosion = this.game.explosions[i];
      
      // Call the explosion's update method if it exists
      if (explosion.update) {
        explosion.update(slowdownFactor);
      } else {
        // Fallback for simple explosions
        explosion.life--;
      }

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
