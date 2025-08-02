export class BackgroundManager {
  // level manager
  constructor(game) {
    this.game = game;
    this.stars = [];
    this.shootingStars = [];
    
    // Configurable star parameters (can be overridden by level config)
    this.starBrightness = 1.0; // 0.0 to 2.0 multiplier for opacity
    this.starSize = 1.0; // 0.0 to 2.0 multiplier for size
    
    // Background transition system
    this.currentBackground = null;
    this.targetBackground = null;
    this.transitionProgress = 0;
    this.transitionDuration = 5000; // 5 seconds transition time
    this.isTransitioning = false;
    
    // Get background config from level
    this.getBackgroundConfig();
    
    // Cursor tracking for star movement direction
    this.cursorX = 0;
    this.cursorY = 0;
    this.setupCursorTracking();
  }
  
  getBackgroundConfig() {
    // Get background configuration from level config
    const defaultConfig = {
      type: "solid",
      color: "#000000",
      gradient: {
        start: "#000011",
        end: "#000000",
        direction: "vertical"
      },
      stars: {
        enabled: true,
        gameStarCount: 200,
        titleStarCount: 300,
        gameStarSize: { min: 0.8, max: 2.5 },
        titleStarSize: { min: 1.5, max: 4.5 },
        gameOpacity: { min: 0.15, max: 0.5 },
        titleOpacity: { min: 0.25, max: 0.8 },
        colors: [
          "#ffffff", "#ffffff", "#ffffff",
          "#80ffff", "#80fff0", "#80ff80",
          "#a0ffff", "#a0fff8", "#a0ffa0",
          "#c0ffff"
        ],
        gameShapes: ["point", "diamond", "star4", "star8", "plus", "cross"],
        titleShapes: ["star4"],
        twinkleSpeed: { min: 0.008, max: 0.023 },
        pulseSpeed: { min: 0.012, max: 0.030 },
        rotationSpeed: { min: -0.012, max: 0.012 },
        gameMovementSpeed: 0.1,
        titleMovementSpeed: 0.8
      }
    };
    
    this.backgroundConfig = this.game.level?.config?.world?.background || defaultConfig;
    this.currentBackground = { ...this.backgroundConfig };
    this.targetBackground = { ...this.backgroundConfig };
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
  
  // Start a transition to a new background configuration
  transitionToBackground(newBackgroundConfig, transitionDuration = 5000) {
    if (this.isTransitioning) {
      // If already transitioning, make current progress the new starting point
      this.currentBackground = this.getCurrentTransitionedBackground();
    }
    
    this.targetBackground = { ...newBackgroundConfig };
    this.transitionDuration = transitionDuration;
    this.transitionProgress = 0;
    this.isTransitioning = true;
    
    console.log("Background transition started:", {
      from: this.currentBackground.gradient,
      to: this.targetBackground.gradient,
      duration: transitionDuration
    });
  }
  
  // Get the current interpolated background during transition
  getCurrentTransitionedBackground() {
    if (!this.isTransitioning) {
      return this.currentBackground;
    }
    
    const progress = Math.min(1, this.transitionProgress / this.transitionDuration);
    const easeProgress = this.easeInOutCubic(progress);
    
    // Interpolate gradient colors
    const currentGradient = this.currentBackground.gradient;
    const targetGradient = this.targetBackground.gradient;
    
    const interpolatedBackground = {
      ...this.currentBackground,
      gradient: {
        start: this.interpolateColor(currentGradient.start, targetGradient.start, easeProgress),
        end: this.interpolateColor(currentGradient.end, targetGradient.end, easeProgress),
        direction: targetGradient.direction
      }
    };
    
    // Interpolate star properties if they exist
    if (this.currentBackground.stars && this.targetBackground.stars) {
      const currentStars = this.currentBackground.stars;
      const targetStars = this.targetBackground.stars;
      
      interpolatedBackground.stars = {
        ...currentStars,
        gameOpacity: {
          min: this.lerp(currentStars.gameOpacity.min, targetStars.gameOpacity.min, easeProgress),
          max: this.lerp(currentStars.gameOpacity.max, targetStars.gameOpacity.max, easeProgress)
        },
        colors: targetStars.colors // Transition star colors instantly for simplicity
      };
    }
    
    return interpolatedBackground;
  }
  
  // Smooth easing function
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  // Linear interpolation
  lerp(start, end, progress) {
    return start + (end - start) * progress;
  }
  
  // Interpolate between two hex colors
  interpolateColor(color1, color2, progress) {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substring(0, 2), 16);
    const g1 = parseInt(hex1.substring(2, 4), 16);
    const b1 = parseInt(hex1.substring(4, 6), 16);
    
    const r2 = parseInt(hex2.substring(0, 2), 16);
    const g2 = parseInt(hex2.substring(2, 4), 16);
    const b2 = parseInt(hex2.substring(4, 6), 16);
    
    const r = Math.round(this.lerp(r1, r2, progress));
    const g = Math.round(this.lerp(g1, g2, progress));
    const b = Math.round(this.lerp(b1, b2, progress));
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  update() {
    const state = this.game.state.state;
    const isTitleScreen = (state === "TITLE");
    const isPaused = (state === "PAUSED");
    
    // Update background transition
    if (this.isTransitioning) {
      this.transitionProgress += 16.67; // Assume ~60fps (16.67ms per frame)
      
      if (this.transitionProgress >= this.transitionDuration) {
        // Transition complete
        this.currentBackground = { ...this.targetBackground };
        this.isTransitioning = false;
        this.transitionProgress = 0;
        console.log("Background transition completed");
      }
    }
    
    // Only update stars if not paused
    if (!isPaused) {
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
          
          // Move stars based on calculated direction with configurable speed
          const baseSpeed = this.backgroundConfig.stars.titleMovementSpeed * 0.3;
          const speed = baseSpeed + star.size * 0.05; // Larger stars move slightly faster for depth
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
          // Game background: configurable speed stars
          const speed = this.backgroundConfig.stars.gameMovementSpeed;
          if (this.game.isPortrait) {
            star.y += speed; // Configurable downward movement
            // Wrap around screen
            if (star.y > this.game.canvas.height + 10) {
              star.y = -10;
              star.x = Math.random() * this.game.canvas.width;
            }
          } else {
            star.x -= speed; // Configurable leftward movement
            // Wrap around screen
            if (star.x < -10) {
              star.x = this.game.canvas.width + 10;
              star.y = Math.random() * this.game.canvas.height;
            }
          }
        }
      });
    }

    // Update shooting stars (only for title screen, not pause)
    if (isTitleScreen) {
      this.updateShootingStars();
    }
  }
  setup() {
    this.stars = [];
    this.shootingStars = [];
    
    const state = this.game.state.state;
    const isPaused = (state === "PAUSED");
    
    // Only refresh config if not paused (preserve current background during pause)
    if (!isPaused) {
      this.getBackgroundConfig();
    }
    
    // Get the appropriate background config
    const backgroundConfig = (isPaused || state === "PLAYING") ? this.getCurrentTransitionedBackground() : this.backgroundConfig;
    
    if (!backgroundConfig.stars.enabled) {
      return; // No stars if disabled
    }
    
    const starConfig = backgroundConfig.stars;
    const isTitleScreen = (state === "TITLE");
    
    if (isTitleScreen) {
      // Title screen stars: larger, more numerous, with twinkling and pulsing
      const starCount = starConfig.titleStarCount;
      const sizeRange = starConfig.titleStarSize;
      const opacityRange = starConfig.titleOpacity;
      const shapes = starConfig.titleShapes;
      
      for (let i = 0; i < starCount; i++) {
        this.stars.push({
          x: Math.random() * this.game.canvas.width,
          y: Math.random() * this.game.canvas.height,
          size: sizeRange.min + Math.random() * (sizeRange.max - sizeRange.min),
          opacity: opacityRange.min + Math.random() * (opacityRange.max - opacityRange.min),
          twinkle: Math.random() * Math.PI * 2,
          twinkleSpeed: starConfig.twinkleSpeed.min + Math.random() * (starConfig.twinkleSpeed.max - starConfig.twinkleSpeed.min),
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: starConfig.rotationSpeed.min + Math.random() * (starConfig.rotationSpeed.max - starConfig.rotationSpeed.min),
          color: starConfig.colors[Math.floor(Math.random() * starConfig.colors.length)],
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: starConfig.pulseSpeed.min + Math.random() * (starConfig.pulseSpeed.max - starConfig.pulseSpeed.min),
          shape: shapes[Math.floor(Math.random() * shapes.length)]
        });
      }
    } else {
      // Game background stars: configurable based on level
      const starCount = starConfig.gameStarCount;
      const sizeRange = starConfig.gameStarSize;
      const opacityRange = starConfig.gameOpacity;
      const shapes = starConfig.gameShapes;
      
      for (let i = 0; i < starCount; i++) {
        this.stars.push({
          x: Math.random() * this.game.canvas.width,
          y: Math.random() * this.game.canvas.height,
          size: sizeRange.min + Math.random() * (sizeRange.max - sizeRange.min),
          opacity: opacityRange.min + Math.random() * (opacityRange.max - opacityRange.min),
          color: starConfig.colors[Math.floor(Math.random() * starConfig.colors.length)],
          shape: shapes[Math.floor(Math.random() * shapes.length)],
          twinkle: Math.random() * Math.PI * 2,
          twinkleSpeed: starConfig.twinkleSpeed.min + Math.random() * (starConfig.twinkleSpeed.max - starConfig.twinkleSpeed.min),
        });
      }
    }
  }
  render(ctx) {
    const state = this.game.state.state;
    const isTitleScreen = (state === "TITLE");
    const isPaused = (state === "PAUSED");
    
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
        // Game/pause background style: simple twinkling (preserve current game appearance)
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
    
    // Render shooting stars for title screen only (not pause)
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
