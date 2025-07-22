export class BackgroundManager {
  // level manager
  constructor(game) {
    this.game = game;
    this.stars = [];
    this.shootingStars = [];
    
    // Configurable star parameters
    this.starBrightness = 1.0; // 0.0 to 2.0 multiplier for opacity
    this.starSize = 1.0; // 0.0 to 2.0 multiplier for size
    
    // Cursor tracking for star movement direction
    this.cursorX = 0;
    this.cursorY = 0;
    this.setupCursorTracking();
  }
  
  setupCursorTracking() {
    // Track mouse movement
    window.addEventListener('mousemove', (e) => {
      this.cursorX = e.clientX;
      this.cursorY = e.clientY;
    });
    
    // Track touch movement
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this.cursorX = e.touches[0].clientX;
        this.cursorY = e.touches[0].clientY;
      }
    });
  }
  update() {
    const state = this.game.state.state;
    const isTitleScreen = (state === "TITLE" || state === "PAUSED");
    
    this.stars.forEach((star) => {
      star.twinkle += star.twinkleSpeed;
      
      if (isTitleScreen) {
        // Title screen: stars move based on cursor position
        star.rotation += star.rotationSpeed;
        star.pulsePhase += star.pulseSpeed;
        
        const isPortrait = this.game.canvas.height > this.game.canvas.width;
        let directionX, directionY;
        
        if (isPortrait) {
          // Portrait mode: stars come from top, direction based on cursor X position
          const cursorNormalizedX = (this.cursorX / this.game.canvas.width) - 0.5; // -0.5 to 0.5
          directionX = cursorNormalizedX * 2; // -1 to 1
          directionY = 1; // Always moving downward
        } else {
          // Landscape mode: stars come from right, direction based on cursor Y position
          const cursorNormalizedY = (this.cursorY / this.game.canvas.height) - 0.5; // -0.5 to 0.5
          directionX = -1; // Always moving leftward (right to left)
          directionY = cursorNormalizedY * 2; // -1 to 1
        }
        
        // Normalize direction
        const dirLength = Math.sqrt(directionX * directionX + directionY * directionY);
        if (dirLength > 0) {
          directionX /= dirLength;
          directionY /= dirLength;
        }
        
        // Move stars based on calculated direction
        const speed = 0.3 + star.size * 0.05; // Larger stars move slightly faster for depth
        star.x += directionX * speed;
        star.y += directionY * speed;
        
        // Wrap around based on orientation
        if (isPortrait) {
          if (star.y > this.game.canvas.height + 20) {
            star.y = -20 - Math.random() * 50;
            star.x = Math.random() * this.game.canvas.width;
          }
          if (star.x < -20) {
            star.x = this.game.canvas.width + 20;
          } else if (star.x > this.game.canvas.width + 20) {
            star.x = -20;
          }
        } else {
          // Landscape: respawn on right edge
          if (star.x < -20) {
            star.x = this.game.canvas.width + 20 + Math.random() * 50;
            star.y = Math.random() * this.game.canvas.height;
          }
          if (star.y < -20) {
            star.y = this.game.canvas.height + 20;
          } else if (star.y > this.game.canvas.height + 20) {
            star.y = -20;
          }
        }
      } else {
        // Game background: slowly moving stars
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
      }
    });

    // Update shooting stars (only for title screen)
    if (isTitleScreen) {
      this.updateShootingStars();
    }
  }
  setup() {
    this.stars = [];
    this.shootingStars = [];
    
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

    // Use title screen style stars (more, larger, with extra effects) if on title screen
    const state = this.game.state.state;
    const isTitleScreen = (state === "TITLE" || state === "PAUSED");
    
    if (isTitleScreen) {
      // Title screen stars: larger, more numerous, with twinkling and pulsing
      for (let i = 0; i < 300; i++) {
        this.stars.push({
          x: Math.random() * this.game.canvas.width,
          y: Math.random() * this.game.canvas.height,
          size: 1.5 + Math.random() * 3.0, // Larger stars: 1.5-4.5 pixels
          opacity: 0.25 + Math.random() * 0.55, // Brighter: 0.25-0.8 opacity range
          twinkle: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.008 + Math.random() * 0.015, // Slower twinkling
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.012, // Slower rotation
          color: starColors[Math.floor(Math.random() * starColors.length)],
          pulsePhase: Math.random() * Math.PI * 2, // Additional pulsing effect
          pulseSpeed: 0.012 + Math.random() * 0.018, // Slower pulsing
          shape: "star4" // Use 4-pointed star for title screen
        });
      }
    } else {
      // Game background stars: smaller, fewer, simpler shapes
      const starShapes = ["point", "diamond", "star4", "star8", "plus", "cross"];
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
  }
  render(ctx) {
    const state = this.game.state.state;
    const isTitleScreen = (state === "TITLE" || state === "PAUSED");
    
    this.stars.forEach((star) => {
      ctx.save();
      ctx.translate(star.x, star.y);

      let twinkleOpacity;
      let effectiveSize = star.size * this.starSize;
      
      if (isTitleScreen && star.pulsePhase !== undefined) {
        // Title screen style: enhanced twinkling with pulsing
        twinkleOpacity = star.opacity * (0.5 + 0.5 * Math.sin(star.twinkle)) * this.starBrightness;
        const pulseSizeMultiplier = 0.85 + 0.2 * Math.sin(star.pulsePhase);
        effectiveSize *= pulseSizeMultiplier;
        
        // Add rotation for title screen
        if (star.rotation !== undefined) {
          ctx.rotate(star.rotation);
        }
        
        // Add glow effect for larger stars
        if (star.size > 3) {
          ctx.shadowColor = star.color;
          ctx.shadowBlur = star.size * 2;
        }
      } else {
        // Game background style: simple twinkling
        twinkleOpacity = star.opacity * (0.5 + 0.5 * Math.sin(star.twinkle)) * this.starBrightness;
      }
      
      ctx.globalAlpha = Math.min(1.0, twinkleOpacity);
      
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
    
    // Render shooting stars for title screen
    if (isTitleScreen) {
      this.renderShootingStars(ctx);
    }
  }

  spawnShootingStar(isLarge = false) {
    const isPortrait = this.game.canvas.height > this.game.canvas.width;
    const margin = 100;
    let x, y;
    
    if (isPortrait) {
      // Portrait: spawn from top
      x = Math.random() * (this.game.canvas.width + 2 * margin) - margin;
      y = -margin - Math.random() * 50;
    } else {
      // Landscape: spawn from right edge
      x = this.game.canvas.width + margin + Math.random() * 50;
      y = Math.random() * (this.game.canvas.height + 2 * margin) - margin;
    }
    
    // Calculate direction based on cursor position
    let directionX, directionY;
    
    if (isPortrait) {
      // Portrait mode: direction based on cursor X
      const cursorNormalizedX = (this.cursorX / this.game.canvas.width) - 0.5;
      directionX = cursorNormalizedX * 2;
      directionY = 1;
    } else {
      // Landscape mode: direction based on cursor Y
      const cursorNormalizedY = (this.cursorY / this.game.canvas.height) - 0.5;
      directionX = -1; // Always leftward
      directionY = cursorNormalizedY * 2;
    }
    
    // Normalize direction
    const dirLength = Math.sqrt(directionX * directionX + directionY * directionY);
    if (dirLength > 0) {
      directionX /= dirLength;
      directionY /= dirLength;
    }
    
    // Size based on "distance" - closer stars are bigger
    const apparentDistance = isLarge ? 0.1 + Math.random() * 0.3 : 0.2 + Math.random() * 0.8;
    
    // Speed based on apparent distance - closer stars move faster (realistic depth effect)
    // Closer stars (apparentDistance closer to 0) should move faster
    // Distant stars (apparentDistance closer to 1) should move slower
    const speedMultiplier = 1.5 - apparentDistance; // Range: 0.5 to 1.5
    const baseSpeed = isLarge ? 
      (8 + Math.random() * 6) * speedMultiplier :  // Large stars: 4-21 speed
      (3 + Math.random() * 4) * speedMultiplier;   // Normal stars: 1.5-10.5 speed
    
    // Apply direction to velocity
    const vx = directionX * baseSpeed;
    const vy = directionY * baseSpeed;
    const size = isLarge ? 
      (1 - apparentDistance) * 30 + 10 : // 10-40 pixels for large stars
      (1 - apparentDistance) * 15 + 2;   // 2-17 pixels for normal stars
    
    // Much higher opacity based on size and distance - larger stars almost opaque
    const baseOpacity = 0.4 + (1 - apparentDistance) * 0.6; // Range: 0.4 to 1.0
    const sizeBoost = isLarge ? 0.2 : 0; // Large stars get extra opacity boost
    const brightness = Math.min(1.0, baseOpacity + sizeBoost);
    
    const colors = [
      `rgba(255, 255, 255, ${brightness})`,
      `rgba(64, 128, 255, ${brightness})`,
      `rgba(64, 255, 128, ${brightness})`,
      `rgba(255, 64, 128, ${brightness})`,
      `rgba(255, 255, 0, ${brightness})`,
      `rgba(0, 255, 255, ${brightness})`,
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];

    this.shootingStars.push({
      x: x,
      y: y,
      vx: vx,
      vy: vy,
      size: size,
      color: color,
      life: 1.0,
      fadeSpeed: 0.003 + Math.random() * 0.004, // Much faster overall fade
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      apparentDistance: apparentDistance,
      wobble: Math.random() * Math.PI * 2, // For ship movement effect
      wobbleSpeed: 0.02 + Math.random() * 0.03,
      wobbleAmount: 0.5 + Math.random() * 1.5
    });
  }

  updateShootingStars() {
    // Spawn more shooting stars for denser star field effect
    if (Math.random() < 0.5) {
      // 50% chance per frame for very dense star field
      this.spawnShootingStar();
    }
    
    // Occasionally spawn a larger "closer" star
    if (Math.random() < 0.1) {
      // 10% chance for large star
      this.spawnShootingStar(true); // Pass flag for large star
    }

    // Calculate focal point (play button center)
    const focalX = this.game.canvas.width / 2;
    const focalY = this.game.canvas.height / 2;
    
    // Simulate ship movement (subtle sway as if navigating through space)
    const time = Date.now() * 0.001;
    const shipTurnX = Math.sin(time * 0.3) * 2; // Gentle horizontal sway
    const shipTurnY = Math.cos(time * 0.4) * 1; // Slight vertical movement

    // Update shooting stars
    this.shootingStars.forEach((star, index) => {
      // Update wobble for individual star movement
      star.wobble += star.wobbleSpeed;
      
      // Add ship movement effect to star velocity
      const wobbleX = Math.sin(star.wobble) * star.wobbleAmount;
      const wobbleY = Math.cos(star.wobble * 1.3) * star.wobbleAmount * 0.5;
      
      // Update position with ship movement influence
      star.x += star.vx + shipTurnX + wobbleX;
      star.y += star.vy + shipTurnY * 0.5 + wobbleY;
      
      // Accelerate stars as they get closer (perspective effect)
      const distToFocal = Math.sqrt(Math.pow(star.x - focalX, 2) + Math.pow(star.y - focalY, 2));
      const maxDist = Math.sqrt(Math.pow(this.game.canvas.width, 2) + Math.pow(this.game.canvas.height, 2)) * 0.5;
      const accelerationFactor = 1 + (1 - distToFocal / maxDist) * 0.5;
      
      star.vx *= accelerationFactor;
      star.vy *= accelerationFactor;

      // Update rotation
      star.rotation += star.rotationSpeed;

      // Fade out as stars approach edges
      const edgeFade = 100;
      if (star.x < edgeFade || star.x > this.game.canvas.width - edgeFade ||
          star.y > this.game.canvas.height - edgeFade) {
        star.life -= star.fadeSpeed * 3; // Fade faster near edges
      } else {
        star.life -= star.fadeSpeed;
      }

      // Remove if faded out or far off screen
      const margin = 150;
      if (
        star.life <= 0 ||
        star.x < -margin ||
        star.x > this.game.canvas.width + margin ||
        star.y < -margin ||
        star.y > this.game.canvas.height + margin
      ) {
        this.shootingStars.splice(index, 1);
      }
    });
  }

  renderShootingStars(ctx) {
    // Sort stars by apparent distance (render far stars first)
    const sortedStars = [...this.shootingStars].sort((a, b) => b.apparentDistance - a.apparentDistance);
    
    sortedStars.forEach((star) => {
      const speed = Math.sqrt(star.vx * star.vx + star.vy * star.vy);
      const isCloseToForeground = star.apparentDistance < 0.6; // Closer stars get enhanced effects
      

      // Draw main star with white stroke for foreground stars
      ctx.save();
      ctx.translate(star.x, star.y);
      
      // Scale based on apparent distance for depth effect
      const depthScale = 1 - star.apparentDistance * 0.5;
      ctx.scale(depthScale, depthScale);
      
      ctx.rotate(star.rotation);
      ctx.globalAlpha = star.life;
      
      // Enhanced glow for closer stars using star color
      if (isCloseToForeground) {
        ctx.shadowColor = star.color;
        ctx.shadowBlur = star.size * 3 * (1 - star.apparentDistance);
      } else if (star.apparentDistance < 0.8) {
        ctx.shadowColor = star.color;
        ctx.shadowBlur = star.size * (1 - star.apparentDistance);
      }
      
      const size = star.size;
      
      if (isCloseToForeground) {
        // Foreground stars: colored core without stroke
        ctx.fillStyle = star.color;
        
        if (star.apparentDistance < 0.4) {
          // Close stars: detailed 4-pointed star
          ctx.beginPath();
          ctx.moveTo(0, -size);
          ctx.lineTo(size * 0.3, -size * 0.3);
          ctx.lineTo(size, 0);
          ctx.lineTo(size * 0.3, size * 0.3);
          ctx.lineTo(0, size);
          ctx.lineTo(-size * 0.3, size * 0.3);
          ctx.lineTo(-size, 0);
          ctx.lineTo(-size * 0.3, -size * 0.3);
          ctx.closePath();
          ctx.fill();
        } else {
          // Medium-close stars: circle
          ctx.beginPath();
          ctx.arc(0, 0, size, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Background stars: just colored fill, no stroke
        ctx.fillStyle = star.color;
        if (star.apparentDistance < 0.8) {
          // Medium distance: 4-pointed star
          ctx.beginPath();
          ctx.moveTo(0, -size);
          ctx.lineTo(size * 0.3, -size * 0.3);
          ctx.lineTo(size, 0);
          ctx.lineTo(size * 0.3, size * 0.3);
          ctx.lineTo(0, size);
          ctx.lineTo(-size * 0.3, size * 0.3);
          ctx.lineTo(-size, 0);
          ctx.lineTo(-size * 0.3, -size * 0.3);
          ctx.closePath();
          ctx.fill();
        } else {
          // Far stars: simple circle
          ctx.beginPath();
          ctx.arc(0, 0, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    });
  }
}
