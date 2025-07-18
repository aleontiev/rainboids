// Bullet entity for Rainboids: Blitz

export class Bullet {
  constructor(
    x,
    y,
    angle,
    size,
    color,
    isPortrait,
    speed = 8, // Default bullet speed
    isPlayerBullet = false,
    game = null, // Optional game reference for level manager
    damage = 1 // Default damage
  ) {
    this.isPlayerBullet = isPlayerBullet;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed; // Use passed speed or default
    this.size = size;
    this.color = color;
    this.game = game;
    this.damage = damage;
    
    // Use level manager bullet life if available, otherwise use large default
    this.life = this.getBulletLife();
    this.isPortrait = isPortrait;
    
    // Velocity tracking (dx/dy per second)
    this.dx = 0;
    this.dy = 0;
  }

  getBulletLife() {
    try {
      return this.game?.level?.config?.bulletLife || 90000; // Default to 25 minutes (effectively unlimited)
    } catch (e) {
      return 90000;
    }
  }

  update(slowdownFactor = 1.0) {
    // Store previous position for velocity calculation
    const prevX = this.x;
    const prevY = this.y;
    
    this.x += Math.cos(this.angle) * this.speed * slowdownFactor;
    this.y += Math.sin(this.angle) * this.speed * slowdownFactor;
    this.life -= slowdownFactor;
    
    // Calculate velocity (pixels per frame * 60 = pixels per second)
    this.dx = (this.x - prevX) * 60;
    this.dy = (this.y - prevY) * 60;

    // Remove if off screen or life expired - check all boundaries with 50px buffer
    return this.x > -50 && 
           this.x < window.innerWidth + 50 && 
           this.y > -50 && 
           this.y < window.innerHeight + 50 && 
           this.life > 0;
  }

  render(ctx) {
    // Safety check to prevent negative radius errors
    if (this.size <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;

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
      // Enemy bullet: rectangle with one rounded and one flat edge
      const width = this.size * 2;
      const height = this.size;

      ctx.beginPath();
      ctx.moveTo(-width / 2, -height / 2);
      ctx.lineTo(width / 2 - height / 2, -height / 2);
      ctx.arc(width / 2 - height / 2, 0, height / 2, -Math.PI / 2, Math.PI / 2, false);
      ctx.lineTo(-width / 2, height / 2);
      ctx.closePath();
    }

    ctx.fill();
    
    // Add white stroke for enemy bullets
    if (!this.isPlayerBullet) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    
    ctx.restore();
  }
}