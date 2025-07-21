// Laser entity for Rainboids: Blitz

export class Laser {
  constructor(x, y, angle, speed, color, game = null, isPlayerLaser = false, damage = null) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed || game?.level?.config?.laserSpeed || 50; // Use passed speed, level config, or default to 50
    this.color = color;
    this.game = game;
    this.isPlayerLaser = isPlayerLaser; // Flag to distinguish player lasers from enemy lasers
    // Use player laserWidth for player lasers, or world laserWidth for enemy lasers
    this.width = isPlayerLaser 
      ? (game?.level?.config?.player?.laserWidth || 8)
      : (game?.level?.config?.world?.laserWidth || 8);
    this.length = game?.level?.config?.laserLength || 100; // Length of laser beam for collision detection
    this.life = game?.level?.config?.laserLife || 60; // Longer life (1 second)
    this.colorIndex = 0;
    this.penetrationCount = 0; // Track how many targets this laser has hit
    this.maxPenetration = 3; // Maximum targets before laser is destroyed
    this.bounceCount = 0; // Track how many times this laser has bounced off metal
    this.maxBounces = 3; // Maximum bounces before laser is destroyed
    this.rainbowColors = [
      "#ff0000",
      "#ff8800",
      "#ffff00",
      "#00ff00",
      "#0088ff",
      "#4400ff",
      "#ff00ff",
    ];
    
    // Damage property - use custom damage or fallback to reduced power for player lasers
    this.damage = damage !== null ? damage : (isPlayerLaser ? 0.33 : 1);
    
    // Velocity tracking (dx/dy per second)
    this.dx = 0;
    this.dy = 0;
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

    if (this.color === "rainbow") {
      this.colorIndex = Math.floor(Math.random() * this.rainbowColors.length);
    }

    // Check screen boundaries with 50px buffer
    const withinBounds = this.x > -50 && 
                        this.x < window.innerWidth + 50 && 
                        this.y > -50 && 
                        this.y < window.innerHeight + 50;

    return this.life > 0 && 
           this.penetrationCount < this.maxPenetration && 
           this.bounceCount < this.maxBounces && 
           withinBounds;
  }

  // Called when laser hits a target
  registerHit() {
    this.penetrationCount++;
    return this.penetrationCount >= this.maxPenetration; // Return true if laser should be destroyed
  }

  // Called when laser bounces off metal
  registerBounce(newAngle) {
    this.bounceCount++;
    this.angle = newAngle;
    return this.bounceCount >= this.maxBounces; // Return true if laser should be destroyed
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Draw glow effect
    if (this.color === "rainbow") {
      ctx.globalAlpha = 0.4; // Slightly more opaque glow
      const glowGradient = ctx.createLinearGradient(
        0,
        -this.width * 1.5,
        0,
        this.width * 1.5
      );
      glowGradient.addColorStop(0, "red");
      glowGradient.addColorStop(1 / 6, "orange");
      glowGradient.addColorStop(2 / 6, "yellow");
      glowGradient.addColorStop(3 / 6, "green");
      glowGradient.addColorStop(4 / 6, "blue");
      glowGradient.addColorStop(5 / 6, "indigo");
      glowGradient.addColorStop(1, "violet");
      ctx.strokeStyle = glowGradient;
      ctx.lineWidth = this.width * 1.5; // Wider glow
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(this.length, 0);
      ctx.stroke();
    }

    ctx.globalAlpha = 1; // Reset alpha for the main laser
    if (this.color === "rainbow") {
      ctx.strokeStyle = this.rainbowColors[this.colorIndex];
    } else {
      ctx.strokeStyle = this.color;
    }
    ctx.lineWidth = this.width;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(this.length, 0); // Use configured laser length
    ctx.stroke();
    ctx.restore();
  }
}