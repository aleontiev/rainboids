import { Bullet } from "./bullet.js";

export class SpreadingBullet {
  constructor(
    x,
    y,
    angle,
    size,
    color,
    isPortrait,
    speed = 8, // Default bullet speed
    explosionTime = 120, // 2 seconds at 60fps
    game = null
  ) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed;
    this.size = size; // Initial size
    this.color = color;
    this.life = 300; // Standard bullet life
    this.isPortrait = isPortrait;
    this.explosionTime = explosionTime;
    this.time = 0;
    this.exploded = false;
    this.health = 1; // Can be damaged by player
    this.game = game;
    
    // Velocity tracking (dx/dy per second)
    this.dx = 0;
    this.dy = 0;
  }

  update(slowdownFactor = 1.0, addEnemyBulletCallback) {
    if (this.exploded) return false; // Already exploded, remove

    // Store previous position for velocity calculation
    const prevX = this.x;
    const prevY = this.y;
    
    this.x += Math.cos(this.angle) * this.speed * slowdownFactor;
    this.y += Math.sin(this.angle) * this.speed * slowdownFactor;
    this.life -= slowdownFactor;
    this.time += slowdownFactor;
    
    // Calculate velocity (pixels per frame * 60 = pixels per second)
    this.dx = (this.x - prevX) * 60;
    this.dy = (this.y - prevY) * 60;

    // Explode if time is up or health is 0
    if (this.time >= this.explosionTime || this.health <= 0) {
      console.log(`SpreadingBullet exploding: time=${this.time}/${this.explosionTime}, health=${this.health}, callback=${typeof addEnemyBulletCallback}`);
      if (typeof addEnemyBulletCallback === 'function') {
        this.explode(addEnemyBulletCallback);
      } else {
        console.warn('SpreadingBullet update called without valid callback, exploding without spawning bullets');
        this.exploded = true;
      }
      return false; // Remove this bullet after explosion
    }

    // Remove if off screen - check all boundaries with 50px buffer
    return this.x > -50 && 
           this.x < window.innerWidth + 50 && 
           this.y > -50 && 
           this.y < window.innerHeight + 50 && 
           this.life > 0;
  }

  explode(addEnemyBulletCallback) {
    this.exploded = true;
    console.log('SpreadingBullet explode() called, creating spread bullets');
    
    // Guard against missing callback
    if (typeof addEnemyBulletCallback !== 'function') {
      console.warn('SpreadingBullet explode called without valid callback function');
      return;
    }
    
    // Get config for spread bullets - fallback to zigzagBasic
    const config = this.game?.levelManager?.config?.enemies?.zigzagBasic;
    const numBullets = config?.spreadBulletCount || 8;
    const bulletSpeed = config?.spreadBulletSpeed || 4;
    const bulletSize = config?.spreadBulletSize || this.size * 0.3;

    for (let i = 0; i < numBullets; i++) {
      const angle = (i / numBullets) * Math.PI * 2; // Evenly spaced around circle
      const bullet = new Bullet(
        this.x,
        this.y,
        angle,
        bulletSize,
        this.color,
        this.isPortrait,
        bulletSpeed,
        false,
        this.game
      );
      console.log(`Creating spread bullet ${i}: angle=${angle.toFixed(2)}, size=${bulletSize}, speed=${bulletSpeed}`);
      addEnemyBulletCallback(bullet);
    }
    console.log('SpreadingBullet explosion complete, created', numBullets, 'bullets');
  }

  takeDamage(damage) {
    this.health -= damage;
    return this.health <= 0; // Return true if destroyed
  }

  render(ctx) {
    if (this.exploded) return; // Don't render if exploded

    // Safety check to prevent negative radius errors
    if (this.size <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Rotate based on time for spinning effect
    const spinSpeed = 0.1;
    ctx.rotate(this.time * spinSpeed);
    
    // Draw spiky ball
    const radius = this.size;
    const spikes = 8;
    const innerRadius = radius * 0.6;
    const outerRadius = radius;
    
    // Create gradient for depth
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, outerRadius);
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(0.7, this.color);
    gradient.addColorStop(1, "#440000"); // Darker edge
    
    ctx.fillStyle = gradient;
    
    // Draw spiky shape
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i * Math.PI) / spikes;
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
    
    // Add warning glow effect as it approaches explosion
    const timeRatio = this.time / this.explosionTime;
    if (timeRatio > 0.7) {
      ctx.save();
      ctx.globalAlpha = (timeRatio - 0.7) / 0.3; // Fade in during last 30%
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10 + (timeRatio - 0.7) * 20;
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }
}