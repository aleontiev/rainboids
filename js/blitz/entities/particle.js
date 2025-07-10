export class Particle {
  constructor(x, y, scale = 1) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 6 * scale;
    this.vy = (Math.random() - 0.5) * 6 * scale;
    this.life = 30;
    this.maxLife = 30;
    this.scale = scale;
  }

  update(slowdownFactor = 1.0) {
    this.x += this.vx * slowdownFactor;
    this.y += this.vy * slowdownFactor;
    this.vx *= 0.95;
    this.vy *= 0.95;
    this.life -= slowdownFactor;
  }

  render(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
    const size = 4 * this.scale;
    ctx.fillRect(this.x - size / 2, this.y - size / 2, size, size);
  }
}

export class Debris {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = (Math.random() - 0.5) * 8;
    this.angle = Math.random() * Math.PI * 2;
    this.angularVelocity = (Math.random() - 0.5) * 0.2;
    this.size = 2 + Math.random() * 4;
    this.life = 40;
    this.maxLife = 40;
    this.color = color;
  }

  update(slowdownFactor = 1.0) {
    this.x += this.vx * slowdownFactor;
    this.y += this.vy * slowdownFactor;
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.angle += this.angularVelocity * slowdownFactor;
    this.life -= slowdownFactor;
  }

  render(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-this.size, 0);
    ctx.lineTo(this.size, 0);
    ctx.moveTo(0, -this.size);
    ctx.lineTo(0, this.size);
    ctx.stroke();
    ctx.restore();
  }
}

export class RainbowParticle {
  constructor(x, y, scale = 1) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 4 * scale;
    this.vy = (Math.random() - 0.5) * 4 * scale;
    this.life = 60;
    this.maxLife = 60;
    this.scale = scale;
    this.angle = Math.random() * Math.PI * 2;
    this.angularVelocity = (Math.random() - 0.5) * 0.1;
    this.size = 3 + Math.random() * 2;
    this.colors = [
      "#ff0000",
      "#ff8800",
      "#ffff00",
      "#00ff00",
      "#0088ff",
      "#4400ff",
      "#ff00ff",
    ];
    this.colorIndex = Math.floor(Math.random() * this.colors.length);
  }

  update(slowdownFactor = 1.0) {
    this.x += this.vx * slowdownFactor;
    this.y += this.vy * slowdownFactor;
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.angle += this.angularVelocity * slowdownFactor;
    this.life -= slowdownFactor;

    // Cycle through rainbow colors
    if (Math.floor(this.life / slowdownFactor) % 8 === 0) {
      this.colorIndex = (this.colorIndex + 1) % this.colors.length;
    }
  }

  render(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.colors[this.colorIndex];
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

export class TextParticle {
  constructor(x, y, text, color = "#ffffff", size = 20, life = 60) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.vy = -0.5; // Move upwards
    this.vx = (Math.random() - 0.5) * 0.5; // Slight horizontal drift
  }

  update(slowdownFactor = 1.0) {
    this.x += this.vx * slowdownFactor;
    this.y += this.vy * slowdownFactor;
    this.life -= slowdownFactor;
  }

  render(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.font = `${this.size}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}
