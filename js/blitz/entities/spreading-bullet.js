import { GAME_CONFIG } from "../constants.js";
import { Bullet } from "./bullet.js";

export class SpreadingBullet {
  constructor(
    x,
    y,
    angle,
    size,
    color,
    isPortrait,
    speed = GAME_CONFIG.BULLET_SPEED,
    explosionTime = 120 // 2 seconds at 60fps
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
      this.explode(addEnemyBulletCallback);
      return false; // Remove this bullet after explosion
    }

    // Remove if off screen
    if (this.isPortrait) {
      return this.y > -50 && this.y < window.innerHeight + 50 && this.life > 0;
    } else {
      return this.x > -50 && this.x < window.innerWidth + 50 && this.life > 0;
    }
  }

  explode(addEnemyBulletCallback) {
    this.exploded = true;
    const numBullets = 8; // Number of bullets in the ring
    const bulletSpeed = 4; // Speed of the spreading bullets
    const bulletSize = this.size * 0.5; // Smaller bullets

    for (let i = 0; i < numBullets; i++) {
      const angle = (i / numBullets) * Math.PI * 2; // Evenly spaced around circle
      addEnemyBulletCallback(
        new Bullet(
          this.x,
          this.y,
          angle,
          bulletSize,
          this.color,
          this.isPortrait,
          bulletSpeed,
          false
        )
      );
    }
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
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;

    // Draw a large missile shape
    const missileLength = this.size * 2.5;
    const missileWidth = this.size * 0.8;
    const tipLength = this.size * 0.7;
    const finWidth = this.size * 0.6;
    const finLength = this.size * 0.8;

    ctx.beginPath();
    // Main body
    ctx.rect(-missileLength / 2, -missileWidth / 2, missileLength, missileWidth);
    ctx.fill();
    
    // Add white stroke for enemy bullets
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pointed tip
    ctx.beginPath();
    ctx.moveTo(missileLength / 2, -missileWidth / 2);
    ctx.lineTo(missileLength / 2 + tipLength, 0);
    ctx.lineTo(missileLength / 2, missileWidth / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Fins
    ctx.beginPath();
    // Top fin
    ctx.moveTo(-missileLength / 2 + finLength, -missileWidth / 2);
    ctx.lineTo(-missileLength / 2, -missileWidth / 2 - finWidth);
    ctx.lineTo(-missileLength / 2, -missileWidth / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    // Bottom fin
    ctx.moveTo(-missileLength / 2 + finLength, missileWidth / 2);
    ctx.lineTo(-missileLength / 2, missileWidth / 2 + finWidth);
    ctx.lineTo(-missileLength / 2, missileWidth / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}