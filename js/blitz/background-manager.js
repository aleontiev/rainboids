export class BackgroundManager {
  // level manager
  constructor(game) {
    this.game = game;
    this.stars = [];
    
    // Configurable star parameters
    this.starBrightness = 1.0; // 0.0 to 2.0 multiplier for opacity
    this.starSize = 1.0; // 0.0 to 2.0 multiplier for size
  }
  update() {
    this.stars.forEach((star) => {
      star.twinkle += star.twinkleSpeed;
      if (this.game.isPortrait) {
        star.y += 0.1; // Very slow downward movement
        // Wrap around screen
        if (star.y > this.game.canvas.height + 10) {
          star.y = -10;
          star.x = Math.random() * this.game.canvas.width;
        }
      } else {
        star.x -= 0.1; // Very slow leftward movement
        // Wrap around screen
        if (star.x < -10) {
          star.x = this.game.canvas.width + 10;
          star.y = Math.random() * this.game.canvas.height;
        }
      }
    });
  }
  setup() {
    this.stars = [];
    const starColors = [
      "#ffffff", // Pure white
      "#ffffff", // Pure white (more common)
      "#80ffff", // White-blue/cyan
      "#80fff0", // White-teal
      "#80ff80", // White-green
      "#a0ffff", // Light white-blue
      "#a0fff8", // Light white-teal
      "#a0ffa0", // Light white-green
      "#ffffff", // Pure white (even more common)
      "#c0ffff", // Very light white-blue
    ];
    const starShapes = ["point", "diamond", "star4", "star8", "plus", "cross"];

    // Create static background stars
    for (let i = 0; i < 200; i++) {
      this.stars.push({
        x: Math.random() * this.game.canvas.width,
        y: Math.random() * this.game.canvas.height,
        size: 0.8 + Math.random() * 1.7, // Slightly larger: 0.8-2.5 pixels
        color: starColors[Math.floor(Math.random() * starColors.length)],
        shape: starShapes[Math.floor(Math.random() * starShapes.length)],
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.01 + Math.random() * 0.02,
        opacity: 0.15 + Math.random() * 0.35, // More subtle: 0.15-0.5 instead of 0.3-1.0
      });
    }
  }
  render(ctx) {
    this.stars.forEach((star) => {
      ctx.save();
      ctx.translate(star.x, star.y);

      const twinkleOpacity =
        star.opacity * (0.5 + 0.5 * Math.sin(star.twinkle)) * this.starBrightness;
      ctx.globalAlpha = Math.min(1.0, twinkleOpacity);

      const effectiveSize = star.size * this.starSize;
      
      if (star.shape === "point") {
        ctx.fillStyle = star.color;
        ctx.fillRect(-effectiveSize / 2, -effectiveSize / 2, effectiveSize, effectiveSize);
      } else if (star.shape === "diamond") {
        ctx.strokeStyle = star.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -effectiveSize);
        ctx.lineTo(effectiveSize, 0);
        ctx.lineTo(0, effectiveSize);
        ctx.lineTo(-effectiveSize, 0);
        ctx.closePath();
        ctx.stroke();
      } else if (star.shape === "plus") {
        ctx.strokeStyle = star.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -effectiveSize);
        ctx.lineTo(0, effectiveSize);
        ctx.moveTo(-effectiveSize, 0);
        ctx.lineTo(effectiveSize, 0);
        ctx.stroke();
      } else if (star.shape === "star4") {
        ctx.strokeStyle = star.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          const r = i % 2 === 0 ? effectiveSize : effectiveSize * 0.4;
          if (i === 0) {
            ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          } else {
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
        }
        ctx.closePath();
        ctx.stroke();
      } else if (star.shape === "star8") {
        ctx.strokeStyle = star.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 16; i++) {
          const a = (i * Math.PI) / 8;
          const r = i % 2 === 0 ? effectiveSize : effectiveSize * 0.6;
          if (i === 0) {
            ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          } else {
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
        }
        ctx.closePath();
        ctx.stroke();
      } else {
        // cross
        ctx.strokeStyle = star.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-effectiveSize, -effectiveSize);
        ctx.lineTo(effectiveSize, effectiveSize);
        ctx.moveTo(effectiveSize, -effectiveSize);
        ctx.lineTo(-effectiveSize, effectiveSize);
        ctx.stroke();
      }

      ctx.restore();
    });
  }
}
