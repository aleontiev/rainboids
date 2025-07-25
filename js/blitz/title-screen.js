// Title screen management for Rainboids: Blitz

export class TitleScreen {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.stars = [];
    this.shootingStars = [];

    this.setupStars();
  }

  setupStars() {
    this.stars = [];
    // Don't create stars if canvas has no dimensions
    if (!this.canvas.width || !this.canvas.height) {
      return;
    }
    
    // Create background stars matching the game's star system
    const starColors = [
      "#ffffff", // Pure white (most common)
      "#ffffff", // Pure white
      "#80ffff", // White-blue/cyan
      "#80fff0", // White-teal
      "#80ff80", // White-green
      "#a0ffff", // Light white-blue
      "#a0fff8", // Light white-teal
      "#a0ffa0", // Light white-green
      "#ffffff", // Pure white
      "#c0ffff", // Very light white-blue
    ];

    for (let i = 0; i < 300; i++) {
      // More stars
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: 1.5 + Math.random() * 3.0, // Larger stars: 1.5-4.5 pixels
        opacity: 0.25 + Math.random() * 0.55, // Brighter: 0.25-0.8 opacity range
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.008 + Math.random() * 0.015, // Slower twinkling (was 0.015-0.05)
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.012, // Slower rotation (was 0.02)
        color: starColors[Math.floor(Math.random() * starColors.length)],
        pulsePhase: Math.random() * Math.PI * 2, // Additional pulsing effect
        pulseSpeed: 0.012 + Math.random() * 0.018, // Slower pulsing (was 0.02-0.05)
      });
    }
  }

  spawnShootingStar() {
    // Spawn from random edges around the viewport
    const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
    let x, y, targetX, targetY;

    // Spawn outside viewport, aim towards opposite side
    const margin = 100;
    switch (edge) {
      case 0: // Top edge
        x = Math.random() * (this.canvas.width + 2 * margin) - margin;
        y = -margin;
        targetX = Math.random() * this.canvas.width;
        targetY = this.canvas.height + margin;
        break;
      case 1: // Right edge
        x = this.canvas.width + margin;
        y = Math.random() * (this.canvas.height + 2 * margin) - margin;
        targetX = -margin;
        targetY = Math.random() * this.canvas.height;
        break;
      case 2: // Bottom edge
        x = Math.random() * (this.canvas.width + 2 * margin) - margin;
        y = this.canvas.height + margin;
        targetX = Math.random() * this.canvas.width;
        targetY = -margin;
        break;
      case 3: // Left edge
        x = -margin;
        y = Math.random() * (this.canvas.height + 2 * margin) - margin;
        targetX = this.canvas.width + margin;
        targetY = Math.random() * this.canvas.height;
        break;
    }

    // Calculate direction vector
    const dx = targetX - x;
    const dy = targetY - y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Generate size first, then calculate velocity based on size
    const size = 2 + Math.random() * 8; // Size range: 2-10 pixels

    // Larger stars have much higher velocity, smaller stars have lower velocity
    // Size 2-4: speed 1-3, Size 4-6: speed 3-7, Size 6-8: speed 7-12, Size 8-10: speed 12-18
    const baseSpeed = Math.pow(size / 2, 1.5); // Exponential relationship for more dramatic effect
    const speed = baseSpeed + Math.random() * baseSpeed * 0.5; // Add some randomness

    // Use white, blue, or green colors as requested
    const colors = [
      "#ffffff",
      "#4080ff",
      "#40ff80",
      "#ff4080",
      "#ffff00",
      "#00ffff",
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];

    this.shootingStars.push({
      x: x,
      y: y,
      vx: (dx / distance) * speed,
      vy: (dy / distance) * speed,
      size: size,
      color: color,
      life: 1.0,
      fadeSpeed: 0.0003 + Math.random() * 0.0007, // Slower fade for longer visibility
      trail: [],
      rotation: Math.random() * Math.PI * 2, // Initial rotation
      rotationSpeed: (Math.random() - 0.5) * 0.2, // Spin while moving
    });
  }

  update() {
    this.stars.forEach((star) => {
      star.twinkle += star.twinkleSpeed;
      star.rotation += star.rotationSpeed;
      star.pulsePhase += star.pulseSpeed; // Update pulsing effect
    });

    // Spawn shooting stars occasionally - increased for better visibility
    if (Math.random() < 0.15) {
      // 15% chance per frame for better visibility
      this.spawnShootingStar();
    }

    // Update shooting stars
    this.shootingStars.forEach((star, index) => {
      // Store current position in trail
      star.trail.push({ x: star.x, y: star.y, life: star.life });

      // Limit trail length
      if (star.trail.length > 20) {
        // Longer trail for better visibility
        star.trail.shift();
      }

      // Update trail fade
      star.trail.forEach((trailPoint) => {
        trailPoint.life *= 0.95; // Trail fades faster than star
      });

      // Update position
      star.x += star.vx;
      star.y += star.vy;

      // Update rotation
      star.rotation += star.rotationSpeed;

      // Fade out
      star.life -= star.fadeSpeed;

      // Remove if faded out or far off screen
      const margin = 150;
      if (
        star.life <= 0 ||
        star.x < -margin ||
        star.x > this.canvas.width + margin ||
        star.y < -margin ||
        star.y > this.canvas.height + margin
      ) {
        this.shootingStars.splice(index, 1);
      }
    });
  }

  render() {
    // Clear the title canvas
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Render background stars (like in game)
    if (this.stars.length === 0) {
      console.warn('No stars to render, trying to recreate them');
      this.setupStars();
    }
    
    this.stars.forEach((star) => {
      this.ctx.save();
      this.ctx.translate(star.x, star.y);
      this.ctx.rotate(star.rotation);

      // Enhanced effects: combine twinkling and pulsing (slightly toned down)
      const twinkleOpacity =
        star.opacity * (0.5 + 0.5 * Math.sin(star.twinkle)); // Less dramatic opacity change
      const pulseSizeMultiplier = 0.85 + 0.2 * Math.sin(star.pulsePhase); // Smaller size variation

      this.ctx.globalAlpha = twinkleOpacity;

      // Add glow effect for larger stars
      if (star.size > 3) {
        this.ctx.shadowColor = star.color;
        this.ctx.shadowBlur = star.size * 2;
      }

      // Draw 4-pointed star shape with pulsing size
      this.ctx.fillStyle = star.color;
      this.ctx.beginPath();
      const size = star.size * pulseSizeMultiplier;
      this.ctx.moveTo(0, -size);
      this.ctx.lineTo(size * 0.3, -size * 0.3);
      this.ctx.lineTo(size, 0);
      this.ctx.lineTo(size * 0.3, size * 0.3);
      this.ctx.lineTo(0, size);
      this.ctx.lineTo(-size * 0.3, size * 0.3);
      this.ctx.lineTo(-size, 0);
      this.ctx.lineTo(-size * 0.3, -size * 0.3);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.restore();
    });

    // Render shooting stars with trails
    this.shootingStars.forEach((star) => {
      // Draw trail
      for (let i = 0; i < star.trail.length; i++) {
        const trailPoint = star.trail[i];
        const trailOpacity = (i / star.trail.length) * trailPoint.life * 2;

        if (trailOpacity > 0.05) {
          // Only draw visible trail points
          this.ctx.save();
          this.ctx.globalAlpha = trailOpacity;
          this.ctx.fillStyle = star.color;
          const trailSize = star.size * (i / star.trail.length) * 0.8;

          // Draw 4-pointed star for trail too
          this.ctx.translate(trailPoint.x, trailPoint.y);
          this.ctx.beginPath();
          this.ctx.moveTo(0, -trailSize);
          this.ctx.lineTo(trailSize * 0.3, -trailSize * 0.3);
          this.ctx.lineTo(trailSize, 0);
          this.ctx.lineTo(trailSize * 0.3, trailSize * 0.3);
          this.ctx.lineTo(0, trailSize);
          this.ctx.lineTo(-trailSize * 0.3, trailSize * 0.3);
          this.ctx.lineTo(-trailSize, 0);
          this.ctx.lineTo(-trailSize * 0.3, -trailSize * 0.3);
          this.ctx.closePath();
          this.ctx.fill();

          this.ctx.restore();
        }
      }

      // Draw main shooting star
      this.ctx.save();
      this.ctx.translate(star.x, star.y);
      this.ctx.rotate(star.rotation);
      this.ctx.globalAlpha = star.life;
      this.ctx.fillStyle = star.color;

      // Draw larger 4-pointed star
      const size = star.size;
      this.ctx.beginPath();
      this.ctx.moveTo(0, -size);
      this.ctx.lineTo(size * 0.3, -size * 0.3);
      this.ctx.lineTo(size, 0);
      this.ctx.lineTo(size * 0.3, size * 0.3);
      this.ctx.lineTo(0, size);
      this.ctx.lineTo(-size * 0.3, size * 0.3);
      this.ctx.lineTo(-size, 0);
      this.ctx.lineTo(-size * 0.3, -size * 0.3);
      this.ctx.closePath();
      this.ctx.fill();

      // Add glow effect
      this.ctx.shadowColor = star.color;
      this.ctx.shadowBlur = 6;
      this.ctx.fill();

      this.ctx.restore();
    });
  }

  resize(width, height) {
    // Update canvas dimensions and recreate stars when canvas is resized
    if (width && height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.setupStars();
  }
}
