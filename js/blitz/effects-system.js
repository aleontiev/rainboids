// Effects and explosion system for Rainboids: Blitz

export class EffectsSystem {
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
          if (x >= -100 && x <= this.game.canvas.width + 100 && 
              y >= -100 && y <= this.game.canvas.height + 100) {
            const explosionSize = 150 + Math.random() * 100;
            this.game.createRainbowExplosion(x, y, explosionSize);
          }
        }
        
        // Play additional explosion sounds for dramatic effect
        if (wave < 4 && this.game.audioContext && this.game.soundEnabled) {
          this.game.playSound(this.game.sounds.explosion);
        }
      }, wave * 120); // 120ms between each wave
    }
  }

  createDebris(x, y, color) {
    // Create debris particles with physics
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      const size = 2 + Math.random() * 3;
      
      this.game.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: size,
        color: color,
        life: 60 + Math.random() * 120, // 1-3 seconds
        maxLife: 60 + Math.random() * 120,
        gravity: 0.1
      });
    }
  }

  updateParticles() {
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

  renderParticles(ctx) {
    // Render debris particles
    this.game.particles.forEach(particle => {
      const opacity = particle.life / particle.maxLife;
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x - particle.size/2, particle.y - particle.size/2, particle.size, particle.size);
      ctx.restore();
    });
  }

  createExplosion(x, y, size = 30) {
    // Create a basic explosion at the specified location
    this.game.explosions.push({
      x: x,
      y: y,
      size: size,
      maxSize: size,
      life: 30,
      maxLife: 30,
      color: `hsl(${Math.random() * 60 + 15}, 100%, 50%)` // Orange/red/yellow
    });
  }

  createEnemyExplosion(x, y) {
    // Create colorful enemy explosion
    for (let i = 0; i < 3; i++) {
      this.game.explosions.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        size: 15 + Math.random() * 20,
        maxSize: 15 + Math.random() * 20,
        life: 20 + Math.random() * 20,
        maxLife: 20 + Math.random() * 20,
        color: `hsl(${Math.random() * 360}, 100%, 60%)`
      });
    }
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
    this.game.explosions.forEach(explosion => {
      const progress = 1 - (explosion.life / explosion.maxLife);
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