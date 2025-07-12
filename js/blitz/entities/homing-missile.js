// HomingMissile entity for Rainboids: Blitz

export class HomingMissile {
  constructor(x, y, angle, speed, color) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed;
    this.color = color;
    this.size = 10;
    this.turnSpeed = 0.05;
    this.life = 200;
    this.target = null;
  }

  update(enemies, slowdownFactor = 1.0) {
    if (!this.target || !enemies.includes(this.target)) {
      let closestEnemy = null;
      let closestDist = Infinity;
      for (const enemy of enemies) {
        // Only target enemies within viewport
        if (
          enemy.x >= 0 &&
          enemy.x <= window.innerWidth &&
          enemy.y >= 0 &&
          enemy.y <= window.innerHeight
        ) {
          const dx = enemy.x - this.x;
          const dy = enemy.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < closestDist) {
            closestDist = dist;
            closestEnemy = enemy;
          }
        }
      }
      this.target = closestEnemy;
    }

    if (this.target) {
      const targetAngle = Math.atan2(
        this.target.y - this.y,
        this.target.x - this.x
      );
      let angleDiff = targetAngle - this.angle;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      if (Math.abs(angleDiff) < this.turnSpeed) {
        this.angle = targetAngle;
      } else {
        this.angle += Math.sign(angleDiff) * this.turnSpeed * slowdownFactor;
      }
    }

    this.x += Math.cos(this.angle) * this.speed * slowdownFactor;
    this.y += Math.sin(this.angle) * this.speed * slowdownFactor;
    this.life -= slowdownFactor;
    return this.life > 0;
  }

  render(ctx) {
    // Safety check to prevent negative size errors
    if (this.size <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(Math.max(1, this.size), 0);
    ctx.lineTo(-Math.max(0.5, this.size / 2), -Math.max(0.5, this.size / 2));
    ctx.lineTo(-Math.max(0.5, this.size / 2), Math.max(0.5, this.size / 2));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}