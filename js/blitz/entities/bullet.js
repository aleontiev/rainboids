// Bullet entity for Rainboids: Blitz
import { GAME_CONFIG } from "../constants.js";

export class Bullet {
  constructor(
    x,
    y,
    angle,
    size,
    color,
    isPortrait,
    speed = GAME_CONFIG.BULLET_SPEED,
    isPlayerBullet = false
  ) {
    this.isPlayerBullet = isPlayerBullet;
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
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;

    if (this.isPlayerBullet) {
      // Player bullet: triangle with rounded tips (more pointy)
      const tipRadius = this.size * 0.1; // Smaller radius for pointier tip
      const baseWidth = this.size * 0.6; // Narrower base
      const height = this.size * 1.8; // Longer triangle

      ctx.beginPath();
      // Top tip
      ctx.arc(height - tipRadius, 0, tipRadius, -Math.PI / 2, Math.PI / 2, false);
      // Bottom line
      ctx.lineTo(0, baseWidth / 2);
      // Left tip
      ctx.arc(tipRadius, baseWidth / 2, tipRadius, Math.PI / 2, Math.PI, false);
      // Top line
      ctx.lineTo(tipRadius, -baseWidth / 2);
      // Right tip
      ctx.arc(tipRadius, -baseWidth / 2, tipRadius, Math.PI, Math.PI * 1.5, false);
      ctx.closePath();
    } else {
      // Enemy bullet: rounded tip (head) and less rounded end (tail)
      const headRadius = this.size * 0.5; // Radius for the rounded head
      const tailLength = this.size * 1.2; // Length of the less rounded tail
      const tailWidth = this.size * 0.6; // Width of the tail

      ctx.beginPath();
      // Rounded head
      ctx.arc(0, 0, headRadius, -Math.PI / 2, Math.PI / 2, false);
      // Tail lines
      ctx.lineTo(tailLength, tailWidth / 2);
      ctx.lineTo(tailLength, -tailWidth / 2);
      ctx.closePath();
    }

    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}