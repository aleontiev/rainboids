import { GAME_CONFIG } from "../constants.js";

export class CircularBullet {
  constructor(
    x,
    y,
    angle,
    size,
    color,
    isPortrait,
    speed = GAME_CONFIG.BULLET_SPEED
  ) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed; // Use passed speed or default
    this.size = size;
    this.color = color;
    this.life = 300;
    this.isPortrait = isPortrait;
  }

  update(slowdownFactor = 1.0) {
    this.x += Math.cos(this.angle) * this.speed * slowdownFactor;
    this.y += Math.sin(this.angle) * this.speed * slowdownFactor;
    this.life -= slowdownFactor;

    // Remove if off screen or life expired
    if (this.isPortrait) {
      return this.y > -50 && this.y < window.innerHeight + 50 && this.life > 0;
    } else {
      return this.x > -50 && this.x < window.innerWidth + 50 && this.life > 0;
    }
  }

  render(ctx) {
    // Safety check to prevent negative radius errors
    if (this.size <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.size, 0, Math.PI * 2); // Draw a perfect circle
    ctx.fill();
    
    // Add white stroke for enemy bullets
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.restore();
  }
}