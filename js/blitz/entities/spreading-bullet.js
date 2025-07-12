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
  }

  update(slowdownFactor = 1.0, addEnemyBulletCallback) {
    if (this.exploded) return false; // Already exploded, remove

    this.x += Math.cos(this.angle) * this.speed * slowdownFactor;
    this.y += Math.sin(this.angle) * this.speed * slowdownFactor;
    this.life -= slowdownFactor;
    this.time += slowdownFactor;

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
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;

    // Draw a large, slightly transparent circle
    ctx.globalAlpha = 0.7; // Slightly transparent
    ctx.beginPath();
    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw a pulsing inner circle to indicate impending explosion
    const pulse = Math.sin(this.time * 0.2) * 0.2 + 0.8; // Pulsing effect
    ctx.globalAlpha = pulse; // Pulsing transparency
    ctx.fillStyle = "#ff0000"; // Red pulse
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}