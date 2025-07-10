export class Powerup {
  constructor(x, y, type, isPortrait) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.size = 20;
    this.speed = 1;
    this.pulseTimer = 0;
    this.isPortrait = isPortrait;
    this.colors = {
      shield: "#4488ff", // Blue
      mainWeapon: "#ff4444", // Red
      sideWeapon: "#aa44ff", // Purple
      secondShip: "#44ff44", // Green
      bomb: "#aa44ff", // Cool purple
    };
  }

  update() {
    if (this.isPortrait) {
      this.y += this.speed;
    } else {
      this.x -= this.speed;
    }
    this.pulseTimer += 0.1;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const color = this.colors[this.type];
    const pulse = 0.8 + 0.2 * Math.sin(this.pulseTimer);

    // Draw outer circle
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
    ctx.stroke();

    // Draw inner circle
    ctx.globalAlpha = pulse * 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // Draw icon
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    switch (this.type) {
      case "shield":
        // Shield icon (Lucide style)
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 0.4);
        ctx.lineTo(this.size * 0.3, -this.size * 0.2);
        ctx.lineTo(this.size * 0.3, this.size * 0.2);
        ctx.lineTo(0, this.size * 0.4);
        ctx.lineTo(-this.size * 0.3, this.size * 0.2);
        ctx.lineTo(-this.size * 0.3, -this.size * 0.2);
        ctx.closePath();
        ctx.stroke();
        break;

      case "mainWeapon":
        // Flame icon (Lucide style)
        ctx.beginPath();
        ctx.moveTo(0, this.size * 0.4);
        ctx.quadraticCurveTo(
          -this.size * 0.2,
          this.size * 0.1,
          -this.size * 0.1,
          -this.size * 0.1
        );
        ctx.quadraticCurveTo(
          -this.size * 0.05,
          -this.size * 0.3,
          0,
          -this.size * 0.4
        );
        ctx.quadraticCurveTo(
          this.size * 0.05,
          -this.size * 0.3,
          this.size * 0.1,
          -this.size * 0.1
        );
        ctx.quadraticCurveTo(
          this.size * 0.2,
          this.size * 0.1,
          0,
          this.size * 0.4
        );
        ctx.stroke();
        // Inner flame
        ctx.beginPath();
        ctx.moveTo(0, this.size * 0.2);
        ctx.quadraticCurveTo(
          -this.size * 0.1,
          this.size * 0.05,
          0,
          -this.size * 0.2
        );
        ctx.quadraticCurveTo(
          this.size * 0.1,
          this.size * 0.05,
          0,
          this.size * 0.2
        );
        ctx.stroke();
        break;

      case "sideWeapon":
        // Triangle icon (Lucide style)
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 0.3);
        ctx.lineTo(this.size * 0.3, this.size * 0.3);
        ctx.lineTo(-this.size * 0.3, this.size * 0.3);
        ctx.closePath();
        ctx.stroke();
        break;

      case "secondShip":
        // Rocket icon (Lucide style)
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 0.4);
        ctx.lineTo(this.size * 0.1, -this.size * 0.2);
        ctx.lineTo(this.size * 0.2, this.size * 0.2);
        ctx.lineTo(this.size * 0.1, this.size * 0.4);
        ctx.lineTo(-this.size * 0.1, this.size * 0.4);
        ctx.lineTo(-this.size * 0.2, this.size * 0.2);
        ctx.lineTo(-this.size * 0.1, -this.size * 0.2);
        ctx.closePath();
        ctx.stroke();
        // Rocket fins
        ctx.beginPath();
        ctx.moveTo(-this.size * 0.2, this.size * 0.2);
        ctx.lineTo(-this.size * 0.3, this.size * 0.3);
        ctx.moveTo(this.size * 0.2, this.size * 0.2);
        ctx.lineTo(this.size * 0.3, this.size * 0.3);
        ctx.stroke();
        break;

      case "bomb":
        // Bomb icon (keep existing design)
        ctx.beginPath();
        ctx.arc(0, this.size * 0.1, this.size * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        // Fuse
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 0.2);
        ctx.lineTo(-this.size * 0.1, -this.size * 0.4);
        ctx.lineTo(this.size * 0.1, -this.size * 0.3);
        ctx.stroke();
        break;
    }

    ctx.restore();
  }
}
