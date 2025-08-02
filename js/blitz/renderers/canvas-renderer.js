import { BaseRenderer } from './base-renderer.js';
import { RENDERER_TYPES } from '../constants.js';

/**
 * Canvas 2D Renderer implementation
 * Handles all 2D canvas-based rendering for the game
 */
export class CanvasRenderer extends BaseRenderer {
  constructor(game, canvas) {
    super(game, canvas);
    this.type = RENDERER_TYPES.CANVAS_2D;
    this.ctx = null;
    
    // Canvas-specific properties
    this.hoveredButton = null;
    this.clickedButton = null;
    this.animationFrame = 0;
    this.helpModalVisible = false;
  }
  
  initialize() {
    // Initialize 2D canvas context
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      throw new Error('Failed to initialize 2D canvas context');
    }
    
    // Set initial canvas properties
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    
    return true;
  }
  
  getContext() {
    return this.ctx;
  }
  
  supportsFeature(feature) {
    const supportedFeatures = [
      'text-rendering',
      'gradient-effects',
      'alpha-blending',
      'basic-shapes'
    ];
    return supportedFeatures.includes(feature);
  }
  
  updateMousePosition(x, y) {
    super.updateMousePosition(x, y);
    this.updateButtonStates();
  }

  updateButtonStates() {
    this.hoveredButton = null;
    for (const [id, button] of this.buttons) {
      const isHovered = this.isPointInButton(this.mousePosition.x, this.mousePosition.y, button);
      button.isHovered = isHovered;
      if (isHovered) {
        this.hoveredButton = button;
      }
    }
  }

  handleClick(x, y) {
    for (const [id, button] of this.buttons) {
      if (this.isPointInButton(x, y, button) && button.enabled) {
        this.clickedButton = button;
        if (button.onClick) {
          button.onClick();
        }
        return true;
      }
    }
    return false;
  }

  render() {
    const ctx = this.ctx;
    const entities = this.game.entities;
    const state = this.game.state;
    const renderer = (x) => this.renderEntity(x);
    this.animationFrame++;
    this.incrementFrame();
    
    // Reset alpha and clear screen with configurable background
    ctx.globalAlpha = 1.0;
    this.renderConfigurableBackground(ctx);

    // Draw background
    this.game.background.render(ctx);

    if (state.state === "PLAYING" || state.state === "DYING") {
      // Apply time slow effect
      if (state.timeSlowActive) {
        ctx.globalAlpha = 0.6; // Fade other elements
      }

      // Draw game entities in layer order
      entities.particles.forEach(renderer);
      entities.debris.forEach(renderer);
      entities.asteroids.forEach(renderer);
      entities.metals.forEach(renderer);
      entities.powerups.forEach(renderer);
      entities.bullets.forEach(renderer);
      entities.enemyBullets.forEach(renderer);
      entities.enemyLasers.forEach(renderer);
      entities.missiles.forEach(renderer);
      entities.spreadingBullets.forEach(renderer);
      entities.enemies.forEach(renderer);
      entities.miniBosses.forEach(renderer);
      if (entities.boss) {
        renderer(entities.boss);
      }

      // Draw player (on top of everything except UI)
      if (state.state !== "DYING") {
        renderer(this.game.player);
      }

      // Draw explosions (on top of everything)
      this.game.explosions.forEach(renderer);

      // Draw floating score text
      this.game.effects.renderFloatingTexts(ctx);

      // Draw text particles (score popups, etc.)
      this.game.textParticles.forEach(renderer);

      // Reset alpha after game elements
      ctx.globalAlpha = 1.0;

      // Handle scene opacity (level transitions) - apply after game elements
      if (this.game.opacity < 1) {
        ctx.fillStyle = `rgba(0, 0, 0, ${1 - this.game.opacity})`;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }

    // Render UI based on game state
    switch (state.state) {
      case "TITLE":
      case "PAUSED":
        this.renderTitleScreen(ctx);
        break;
      case "GAME_OVER":
        this.renderGameOverScreen(ctx);
        break;
      case "PLAYING":
      case "DYING":
        this.renderGameplayUI(ctx);
        break;
    }
    
    // Render modals on top
    if (this.helpModalVisible) {
      this.renderHelpModal(ctx);
    }

    // Draw target indicator for mouse position (desktop only) - always on top
    // Reset alpha to ensure crosshair is always fully visible
    ctx.globalAlpha = 1.0;
    this.renderCrosshair();
  }
  
  renderEntity(entity) {
    // Support both old and new entity render methods
    if (entity.renderCanvas) {
      entity.renderCanvas(this.ctx);
    } else if (entity.render) {
      entity.render(this.ctx);
    }
  }
  
  resize(width, height) {
    // Canvas automatically resizes, just need to update context properties
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }
  
  dispose() {
    // Clean up canvas-specific resources
    this.ctx = null;
    this.buttons.clear();
  }

  // All the existing rendering methods from the original renderer
  // (Keeping them for now but could be refactored later)
  
  renderCrosshair() {
    const input = this.game.input.getInput();
    const ctx = this.ctx;
    const entities = this.game.entities;
    const state = this.game.state;
    
    // Only show crosshair during gameplay and on desktop
    if (!this.game.isMobile && (state.state === "PLAYING" || state.state === "DYING") && input.mousePosition) {
      const { x: mouseX, y: mouseY } = input.mousePosition;
      ctx.save();
      
      // Ensure crosshair is fully visible regardless of game opacity
      ctx.globalAlpha = 1.0;

      // Check if mouse is over any targetable object
      let isOverTarget = false;

      // Check enemies
      const checkEnemy = (enemy) => {
        const dist = Math.sqrt(
          (mouseX - enemy.x) ** 2 + (mouseY - enemy.y) ** 2
        );
        if (dist < enemy.size + 20) {
          isOverTarget = true;
        }
      };
      
      entities.enemies.forEach(checkEnemy);
      entities.miniBosses.forEach(checkEnemy);
      if (entities.boss) checkEnemy(entities.boss);

      // Check asteroids
      entities.asteroids.forEach((asteroid) => {
        const dist = Math.sqrt(
          (mouseX - asteroid.x) ** 2 + (mouseY - asteroid.y) ** 2
        );
        if (dist < asteroid.size + 15) {
          // Add 15px margin for easier targeting
          isOverTarget = true;
        }
      });

      // Check level 1 boss if not already over a target
      if (!isOverTarget && entities.boss) {
        const dist = Math.sqrt(
          (mouseX - entities.boss.x) ** 2 + (mouseY - entities.boss.y) ** 2
        );
        if (dist < entities.boss.size + 10) {
          // Add 10px margin for easier targeting
          isOverTarget = true;
        }
      }

      // Set crosshair color based on whether it's over a target and background color
      if (isOverTarget) {
        ctx.strokeStyle = "#ff6666"; // Red when over target
        ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = this.getDynamicCrosshairColor(); // Dynamic color based on background
        ctx.lineWidth = 2;
      }

      // Draw crosshair
      const size = 15;
      ctx.beginPath();

      // Horizontal line
      ctx.moveTo(mouseX - size, mouseY);
      ctx.lineTo(mouseX - size / 3, mouseY);
      ctx.moveTo(mouseX + size / 3, mouseY);
      ctx.lineTo(mouseX + size, mouseY);

      // Vertical line
      ctx.moveTo(mouseX, mouseY - size);
      ctx.lineTo(mouseX, mouseY - size / 3);
      ctx.moveTo(mouseX, mouseY + size / 3);
      ctx.lineTo(mouseX, mouseY + size);

      ctx.stroke();

      // Draw center dot
      ctx.fillStyle = isOverTarget ? "#ff6666" : "#ffffff";
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
  
  renderTitleScreen(ctx) {
    const isPaused = this.game.state.state === "PAUSED";
    const isPortrait = ctx.canvas.height > ctx.canvas.width;
    
    // Clear button registry for this screen
    this.buttons.clear();
    
    // Centered title with animated gradients
    const centerY = ctx.canvas.height / 2;
    const titleY = isPortrait ? centerY - 140 : centerY - 120;
    this.renderAnimatedTitle(ctx, ctx.canvas.width / 2, titleY);
    
    if (isPaused) {
      const pausedY = isPortrait ? titleY + 80 : titleY + 60;
      const gameTime = this.game.state.time || 0;
      const minutes = Math.floor(gameTime / 60);
      const seconds = (gameTime % 60).toFixed(1);
      const timeText = `${minutes}:${seconds.padStart(4, '0')}`;
      this.renderText(ctx, timeText, 
        ctx.canvas.width / 2, pausedY, 24, "#ffffff", "center");
    }

    // Large centered play button - adjust position based on layout
    const playSize = 240; // 3x larger than before (was 80)
    const playY = isPortrait ? (isPaused ? centerY - 10 : centerY + 10) : (isPaused ? centerY + 10 : centerY - 20);
    this.renderPlayButton(ctx, 
      ctx.canvas.width / 2 - playSize / 2, playY, playSize, playSize,
      () => this.game.startGame());

    // Bottom control buttons
    const buttonSize = 50;
    const buttonSpacing = 70;
    
    if (isPortrait) {
      // Mobile: 2 rows layout
      const row1Y = ctx.canvas.height - 120; // First row higher up
      const row2Y = ctx.canvas.height - 60;  // Second row
      
      // Row 1: 4 buttons (music, sound, godmode, upgrades)
      const row1ButtonsCount = 4;
      const row1TotalWidth = (row1ButtonsCount - 1) * buttonSpacing;
      const row1StartX = ctx.canvas.width / 2 - row1TotalWidth / 2;
      
      // Row 2: 3 buttons (autoaim, autoplayer, help)
      const row2ButtonsCount = 3;
      const row2TotalWidth = (row2ButtonsCount - 1) * buttonSpacing;
      const row2StartX = ctx.canvas.width / 2 - row2TotalWidth / 2;
      
      // Row 1 buttons
      this.renderIconButton(ctx, "music", "music", 
        row1StartX, row1Y, buttonSize, buttonSize,
        () => this.game.audio.toggleMusic(),
        "rgba(100, 150, 255, 0.2)", "rgba(100, 150, 255, 0.3)", false, !this.game.audio.musicMuted);
      
      this.renderIconButton(ctx, "sound", "volume", 
        row1StartX + buttonSpacing, row1Y, buttonSize, buttonSize,
        () => this.game.audio.toggleSound(),
        "rgba(100, 150, 255, 0.2)", "rgba(100, 150, 255, 0.3)", false, !this.game.audio.soundMuted);
      
      this.renderIconButton(ctx, "godmode", "shield", 
        row1StartX + buttonSpacing * 2, row1Y, buttonSize, buttonSize,
        () => this.game.toggleGodMode(),
        "rgba(255, 200, 50, 0.2)", "rgba(255, 200, 50, 0.3)", false, this.game.player?.godMode || false);
      
      this.renderIconButton(ctx, "upgrades", "upgrade", 
        row1StartX + buttonSpacing * 3, row1Y, buttonSize, buttonSize,
        () => this.game.toggleUpgrades(),
        "rgba(200, 100, 255, 0.2)", "rgba(200, 100, 255, 0.3)", false, this.game.cheats?.allUprades !== null);
      
      // Row 2 buttons
      this.renderIconButton(ctx, "autoaim", "crosshair", 
        row2StartX, row2Y, buttonSize, buttonSize,
        () => this.game.toggleAutoAim(),
        "rgba(255, 100, 100, 0.2)", "rgba(255, 100, 100, 0.3)", false, this.game.cheats?.autoaim || false);
      
      this.renderIconButton(ctx, "autoplayer", "bot", 
        row2StartX + buttonSpacing, row2Y, buttonSize, buttonSize,
        () => this.game.toggleAutoPlayer(),
        "rgba(255, 150, 100, 0.2)", "rgba(255, 150, 100, 0.3)", false, this.game.cheats?.autoplay || false);
      
      this.renderIconButton(ctx, "help", "help", 
        row2StartX + buttonSpacing * 2, row2Y, buttonSize, buttonSize,
        () => { this.helpModalVisible = true; },
        "rgba(150, 150, 150, 0.2)", "rgba(150, 150, 150, 0.3)", false, false);
        
    } else {
      // Desktop: single row layout (original)
      const bottomY = ctx.canvas.height - 80;
      const buttonsCount = 7;
      const totalWidth = (buttonsCount - 1) * buttonSpacing;
      const startX = ctx.canvas.width / 2 - totalWidth / 2;
      
      this.renderIconButton(ctx, "music", "music", 
        startX, bottomY, buttonSize, buttonSize,
        () => this.game.audio.toggleMusic(),
        "rgba(100, 150, 255, 0.2)", "rgba(100, 150, 255, 0.3)", false, !this.game.audio.musicMuted);
      
      this.renderIconButton(ctx, "sound", "volume", 
        startX + buttonSpacing, bottomY, buttonSize, buttonSize,
        () => this.game.audio.toggleSound(),
        "rgba(100, 150, 255, 0.2)", "rgba(100, 150, 255, 0.3)", false, !this.game.audio.soundMuted);
      
      this.renderIconButton(ctx, "godmode", "shield", 
        startX + buttonSpacing * 2, bottomY, buttonSize, buttonSize,
        () => this.game.toggleGodMode(),
        "rgba(255, 200, 50, 0.2)", "rgba(255, 200, 50, 0.3)", false, this.game.player?.godMode || false);
      
      this.renderIconButton(ctx, "upgrades", "upgrade", 
        startX + buttonSpacing * 3, bottomY, buttonSize, buttonSize,
        () => this.game.toggleUpgrades(),
        "rgba(200, 100, 255, 0.2)", "rgba(200, 100, 255, 0.3)", false, this.game.cheats?.allUprades !== null);
      
      this.renderIconButton(ctx, "autoaim", "crosshair", 
        startX + buttonSpacing * 4, bottomY, buttonSize, buttonSize,
        () => this.game.toggleAutoAim(),
        "rgba(255, 100, 100, 0.2)", "rgba(255, 100, 100, 0.3)", false, this.game.cheats?.autoaim || false);
      
      this.renderIconButton(ctx, "autoplayer", "bot", 
        startX + buttonSpacing * 5, bottomY, buttonSize, buttonSize,
        () => this.game.toggleAutoPlayer(),
        "rgba(255, 150, 100, 0.2)", "rgba(255, 150, 100, 0.3)", false, this.game.cheats?.autoplay || false);
      
      this.renderIconButton(ctx, "help", "help", 
        startX + buttonSpacing * 6, bottomY, buttonSize, buttonSize,
        () => { this.helpModalVisible = true; },
        "rgba(150, 150, 150, 0.2)", "rgba(150, 150, 150, 0.3)", false, false);
    }
  }

  renderGameOverScreen(ctx) {
    this.buttons.clear();
    
    // Calculate proper center positions
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    
    // Calculate the total height of all elements to center the group
    const titleHeight = 48;
    const scoreHeight = 24 + 20; // Final score + high score text heights
    const playButtonSize = 120;
    const spacing = 35; // Space between sections
    const totalContentHeight = titleHeight + spacing + scoreHeight + spacing + playButtonSize;
    
    // Start Y position to center the entire group
    const startY = centerY - (totalContentHeight / 2);
    
    // Game Over title - centered as a group
    this.renderRainbowText(ctx, "GAME OVER", 
      centerX, startY + titleHeight/2, 48, "center");
    
    // Score display - positioned relative to title
    const score = this.game.state.score || 0;
    const highScore = this.game.state.highScore || 0;
    
    const scoresY = startY + titleHeight + spacing;
    this.renderText(ctx, `Score: ${score.toLocaleString()}`, 
      centerX, scoresY, 24, "#ffffff", "center");
    
    this.renderText(ctx, `High Score: ${highScore.toLocaleString()}`, 
      centerX, scoresY + 30, 20, "#ffff66", "center");
    
    // Play button (same as title screen) - positioned relative to scores
    const playButtonY = scoresY + 60;
    this.renderPlayButton(ctx, 
      centerX - playButtonSize / 2, 
      playButtonY, 
      playButtonSize, playButtonSize,
      () => this.game.restartGame());
  }

  renderGameplayUI(ctx) {
    this.buttons.clear();
    
    // Progress view (top left)
    this.renderProgressView(ctx);
    
    // Actions view (right side)
    this.renderActionsView(ctx);
    
    // Pause button (top right) - only show during active gameplay
    if (this.game.state.state === "PLAYING" || this.game.state.state === "DYING") {
      this.renderPauseButton(ctx);
    }
    
    // Dialog system (center screen when active)
    this.renderDialog(ctx);
  }
  
  renderPauseButton(ctx) {
    const size = 50;
    const margin = 20;
    const x = ctx.canvas.width - size - margin;
    const y = margin;
    
    this.renderIconButton(ctx, "pause", "pause", 
      x, y, size, size,
      () => this.game.state.pause(true),
      "rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.2)", false);
  }

  renderProgressView(ctx) {
    const padding = 20;
    const level = this.game.state.level || 1;
    const phase = this.game.state.phase || 1;
    const score = this.game.state.score || 0;
    const timer = this.game.state.time || 0; // Fixed from .timer to .time
    
    // Level/Phase
    this.renderText(ctx, `LVL ${level}-${phase}`, 
      padding, padding + 20, 18, "#ffffff");
    
    // Score
    this.renderText(ctx, `SCORE: ${score.toLocaleString()}`, 
      padding, padding + 45, 16, "#ffff66");
    
    // Timer
    const minutes = Math.floor(timer / 60);
    const seconds = (timer % 60).toFixed(1);
    this.renderText(ctx, `⏱ ${minutes}:${seconds.padStart(4, '0')}`, 
      padding, padding + 70, 16, "#66ffff");
  }

  renderActionsView(ctx) {
    const buttonSize = 62; // 1.25x larger (50 * 1.25 = 62.5, rounded to 62)
    const spacing = 12;
    const margin = 20;
    const isPortrait = ctx.canvas.height > ctx.canvas.width;
    
    if (isPortrait) {
      // Portrait mode: vertical layout in bottom right corner
      const x = ctx.canvas.width - margin - buttonSize;
      const baseY = ctx.canvas.height - margin - buttonSize;
      
      // Time slow button (bottom)
      this.renderActionButton(ctx, "timeslow", "clock", 
        x, baseY, buttonSize, buttonSize,
        () => this.game.useTimeSlow(),
        this.game.state.timeSlowCooldown || 0,
        this.game.state.timeSlowCooldownMax || 900);
      
      // Shield button (middle)
      this.renderActionButton(ctx, "shield", "shield", 
        x, baseY - buttonSize - spacing, buttonSize, buttonSize,
        () => this.game.useShield(),
        this.game.player?.shieldCooldown || 0,
        this.game.level?.config?.player?.shieldCooldownMax || 300);
      
      // Bomb button (top)
      this.renderActionButton(ctx, "bomb", "bomb", 
        x, baseY - (buttonSize + spacing) * 2, buttonSize, buttonSize,
        () => this.game.useBomb(),
        this.game.state.bombCooldown || 0,
        this.game.state.bombCooldownMax || 300);
    } else {
      // Landscape mode: horizontal layout in bottom right corner
      const baseX = ctx.canvas.width - margin - buttonSize;
      const y = ctx.canvas.height - margin - buttonSize;
      
      // Time slow button (right)
      this.renderActionButton(ctx, "timeslow", "clock", 
        baseX, y, buttonSize, buttonSize,
        () => this.game.useTimeSlow(),
        this.game.state.timeSlowCooldown || 0,
        this.game.state.timeSlowCooldownMax || 900);
      
      // Shield button (center)
      this.renderActionButton(ctx, "shield", "shield", 
        baseX - buttonSize - spacing, y, buttonSize, buttonSize,
        () => this.game.useShield(),
        this.game.player?.shieldCooldown || 0,
        this.game.level?.config?.player?.shieldCooldownMax || 300);
      
      // Bomb button (left)
      this.renderActionButton(ctx, "bomb", "bomb", 
        baseX - (buttonSize + spacing) * 2, y, buttonSize, buttonSize,
        () => this.game.useBomb(),
        this.game.state.bombCooldown || 0,
        this.game.state.bombCooldownMax || 300);
    }
  }

  // ... (Include other rendering methods from original renderer)
  // I'll include the key ones but truncate for brevity
  
  renderAnimatedTitle(ctx, x, y) {
    ctx.save();
    
    // Check orientation
    const isPortrait = ctx.canvas.height > ctx.canvas.width;
    const fontSize = isPortrait ? 36 : 48;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Render RAIN with tricolor gradient animation and rain overlay
    const rainText = "RAIN";
    const blitzText = "BLITZ";
    
    if (isPortrait) {
      // Portrait mode: stack vertically
      const lineSpacing = fontSize + 10;
      
      // RAIN on first line with smooth tricolor gradient
      const tricolorOffset = (this.animationFrame * 0.1) % 3; // Much slower animation
      const gradient1 = ctx.createLinearGradient(x - 150, y - lineSpacing/2, x + 150, y - lineSpacing/2);
      const colors = this.getTricolorRainColors(tricolorOffset);
      colors.forEach((color, i) => {
        gradient1.addColorStop(i / (colors.length - 1), color);
      });
      
      ctx.fillStyle = gradient1;
      ctx.fillText(rainText, x, y - lineSpacing/2);
      
      // Add subtle rain overlay effect in front of text
      this.renderRainOverlay(ctx, x, y - lineSpacing/2, rainText, fontSize);
      
      // BLITZ on second line with fast per-letter animation
      const letters = blitzText.split('');
      const blitzWidth = ctx.measureText(blitzText).width;
      let currentX = x - blitzWidth/2;
      
      letters.forEach((letter, i) => {
        const letterOffset = (this.animationFrame * 5 + i * 60) % 360;
        ctx.fillStyle = this.hslToHex(letterOffset, 100, 50);
        ctx.fillText(letter, currentX, y + lineSpacing/2);
        currentX += ctx.measureText(letter).width;
      });
      
    } else {
      // Desktop mode: "RAIN:" and "BLITZ" as separate elements with letter-sized gap
      const rainText = "RAIN:";
      const blitzText = "BLITZ";
      const rainWidth = ctx.measureText(rainText).width;
      const blitzWidth = ctx.measureText(blitzText).width;
      const letterWidth = ctx.measureText("M").width; // Single letter width as gap
      const totalWidth = rainWidth + letterWidth + blitzWidth;
      
      // RAIN: with smooth animated tricolor gradient
      const tricolorOffset = (this.animationFrame * 0.1) % 3; // Much slower animation
      const gradient1 = ctx.createLinearGradient(x - totalWidth/2, y, x - totalWidth/2 + rainWidth, y);
      const colors = this.getTricolorRainColors(tricolorOffset);
      colors.forEach((color, i) => {
        gradient1.addColorStop(i / (colors.length - 1), color);
      });
      
      ctx.fillStyle = gradient1;
      ctx.fillText(rainText, x - totalWidth/2 + rainWidth/2, y);
      
      // Add subtle rain overlay effect in front of text
      this.renderRainOverlay(ctx, x - totalWidth/2 + rainWidth/2, y, rainText, fontSize);
      
      // BLITZ with fast per-letter color animation
      const blitzStartX = x - totalWidth/2 + rainWidth + letterWidth;
      const letters = blitzText.split('');
      let currentX = blitzStartX;
      
      letters.forEach((letter, i) => {
        const letterOffset = (this.animationFrame * 5 + i * 60) % 360;
        ctx.fillStyle = this.hslToHex(letterOffset, 100, 50);
        ctx.fillText(letter, currentX, y);
        currentX += ctx.measureText(letter).width;
      });
    }
    
    ctx.restore();
  }
  
  getTricolorRainColors(offset) {
    // Teal, blue, green cycling colors (as requested)
    const baseColors = [
      "#20B2AA", // Teal
      "#4A90E2", // Blue
      "#50C878"  // Green
    ];
    
    // Create smooth transition between colors based on offset
    const colorIndex = Math.floor(offset);
    const colorMix = offset - colorIndex;
    
    // Generate gradient colors with smooth transitions
    const colors = [];
    for (let i = 0; i < 4; i++) {
      const baseIndex = (colorIndex + i) % baseColors.length;
      const nextIndex = (baseIndex + 1) % baseColors.length;
      
      // Mix current and next color based on animation offset
      const currentColor = baseColors[baseIndex];
      const nextColor = baseColors[nextIndex];
      const mixedColor = this.mixColors(currentColor, nextColor, colorMix);
      
      colors.push(mixedColor);
    }
    
    return colors;
  }
  
  mixColors(color1, color2, ratio) {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return color1;
    
    const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * ratio);
    const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * ratio);
    const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * ratio);
    
    return this.rgbToHex(r, g, b);
  }
  
  renderRainOverlay(ctx, textX, textY, text, fontSize) {
    // Initialize rain drops if not exists
    if (!this.rainDrops) {
      this.rainDrops = [];
    }
    
    // Get text dimensions for rain area
    const textWidth = ctx.measureText(text).width;
    const textHeight = fontSize;
    
    // Add new raindrops less frequently for subtlety
    if (this.animationFrame % 15 === 0) {
      this.rainDrops.push({
        x: textX - textWidth/2 + Math.random() * textWidth,
        y: textY - textHeight/2 - 30,
        speed: 1 + Math.random() * 2, // Slower speed
        size: 0.5 + Math.random() * 1, // Smaller size
        opacity: 0.15 + Math.random() * 0.2 // More subtle opacity
      });
    }
    
    // Update and render raindrops in front of text (no blend mode)
    ctx.save();
    // No globalCompositeOperation - render normally in front of text
    
    for (let i = this.rainDrops.length - 1; i >= 0; i--) {
      const drop = this.rainDrops[i];
      
      // Update position
      drop.y += drop.speed;
      drop.opacity -= 0.003; // Slower fade
      
      // Remove if off screen or faded
      if (drop.y > textY + textHeight/2 + 30 || drop.opacity <= 0) {
        this.rainDrops.splice(i, 1);
        continue;
      }
      
      // Render drops across entire text area (not just within bounds)
      if (drop.x >= textX - textWidth/2 - 10 && drop.x <= textX + textWidth/2 + 10) {
        
        ctx.fillStyle = `rgba(0, 0, 0, ${drop.opacity})`;
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, drop.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Very subtle rain streak
        ctx.fillRect(drop.x - 0.3, drop.y + drop.size, 0.6, drop.size * 2);
      }
    }
    
    ctx.restore();
  }
  
  getRainbowColors(offset) {
    return [
      this.hslToHex((0 + offset) % 360, 100, 50),
      this.hslToHex((60 + offset) % 360, 100, 50),
      this.hslToHex((120 + offset) % 360, 100, 50),
      this.hslToHex((180 + offset) % 360, 100, 50),
      this.hslToHex((240 + offset) % 360, 100, 50),
      this.hslToHex((300 + offset) % 360, 100, 50)
    ];
  }
  
  hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }
  
  renderText(ctx, text, x, y, size, color, align = "left") {
    ctx.save();
    ctx.font = `${size}px Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  renderRainbowText(ctx, text, x, y, size, align = "center") {
    ctx.save();
    ctx.font = `bold ${size}px Arial, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    
    const letters = text.split('');
    const totalWidth = ctx.measureText(text).width;
    let currentX = align === "center" ? x - totalWidth/2 : x;
    
    letters.forEach((letter, i) => {
      const hue = (this.animationFrame * 2 + i * 30) % 360;
      ctx.fillStyle = this.hslToHex(hue, 100, 60);
      ctx.fillText(letter, currentX, y);
      currentX += ctx.measureText(letter).width;
    });
    
    ctx.restore();
  }
  
  renderSVGIcon(ctx, icon, x, y, size, color = "#ffffff") {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.06;
    
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const scale = size * 0.6;
    
    switch (icon) {
      case "play":
        ctx.beginPath();
        ctx.moveTo(centerX - scale * 0.2, centerY - scale * 0.3);
        ctx.lineTo(centerX + scale * 0.3, centerY);
        ctx.lineTo(centerX - scale * 0.2, centerY + scale * 0.3);
        ctx.closePath();
        ctx.fill();
        break;
        
      case "pause":
        const barWidth = scale * 0.2;
        const barHeight = scale * 0.6;
        const barSpacing = scale * 0.15;
        ctx.fillRect(centerX - barSpacing - barWidth, centerY - barHeight/2, barWidth, barHeight);
        ctx.fillRect(centerX + barSpacing, centerY - barHeight/2, barWidth, barHeight);
        break;
        
      case "music":
        ctx.beginPath();
        ctx.arc(centerX - scale * 0.1, centerY + scale * 0.2, scale * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(centerX + scale * 0.05, centerY - scale * 0.3, scale * 0.08, scale * 0.5);
        break;
        
      case "volume":
        ctx.beginPath();
        ctx.moveTo(centerX - scale * 0.3, centerY - scale * 0.15);
        ctx.lineTo(centerX - scale * 0.1, centerY - scale * 0.15);
        ctx.lineTo(centerX + scale * 0.05, centerY - scale * 0.25);
        ctx.lineTo(centerX + scale * 0.05, centerY + scale * 0.25);
        ctx.lineTo(centerX - scale * 0.1, centerY + scale * 0.15);
        ctx.lineTo(centerX - scale * 0.3, centerY + scale * 0.15);
        ctx.closePath();
        ctx.fill();
        for (let i = 1; i <= 2; i++) {
          ctx.beginPath();
          ctx.arc(centerX + scale * 0.05, centerY, scale * 0.15 * i, -Math.PI/4, Math.PI/4);
          ctx.stroke();
        }
        break;
        
      case "crosshair":
        ctx.beginPath();
        ctx.arc(centerX, centerY, scale * 0.25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(centerX, centerY, scale * 0.1, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - scale * 0.4);
        ctx.lineTo(centerX, centerY - scale * 0.15);
        ctx.moveTo(centerX, centerY + scale * 0.15);
        ctx.lineTo(centerX, centerY + scale * 0.4);
        ctx.moveTo(centerX - scale * 0.4, centerY);
        ctx.lineTo(centerX - scale * 0.15, centerY);
        ctx.moveTo(centerX + scale * 0.15, centerY);
        ctx.lineTo(centerX + scale * 0.4, centerY);
        ctx.stroke();
        break;
        
      case "bot":
        const rectSize = scale * 0.5;
        const rectX = centerX - rectSize/2;
        const rectY = centerY - rectSize/2;
        ctx.fillRect(rectX, rectY, rectSize, rectSize);
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(centerX - scale * 0.1, centerY - scale * 0.05, scale * 0.05, 0, Math.PI * 2);
        ctx.arc(centerX + scale * 0.1, centerY - scale * 0.05, scale * 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.fillRect(centerX - scale * 0.02, centerY - scale * 0.4, scale * 0.04, scale * 0.2);
        ctx.beginPath();
        ctx.arc(centerX, centerY - scale * 0.4, scale * 0.04, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case "shield":
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - scale * 0.3);
        ctx.quadraticCurveTo(centerX - scale * 0.25, centerY - scale * 0.2, centerX - scale * 0.25, centerY);
        ctx.quadraticCurveTo(centerX - scale * 0.25, centerY + scale * 0.2, centerX, centerY + scale * 0.3);
        ctx.quadraticCurveTo(centerX + scale * 0.25, centerY + scale * 0.2, centerX + scale * 0.25, centerY);
        ctx.quadraticCurveTo(centerX + scale * 0.25, centerY - scale * 0.2, centerX, centerY - scale * 0.3);
        ctx.fill();
        break;
        
      case "upgrade":
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - scale * 0.3);
        ctx.lineTo(centerX - scale * 0.15, centerY - scale * 0.1);
        ctx.lineTo(centerX - scale * 0.07, centerY - scale * 0.1);
        ctx.lineTo(centerX - scale * 0.07, centerY + scale * 0.3);
        ctx.lineTo(centerX + scale * 0.07, centerY + scale * 0.3);
        ctx.lineTo(centerX + scale * 0.07, centerY - scale * 0.1);
        ctx.lineTo(centerX + scale * 0.15, centerY - scale * 0.1);
        ctx.closePath();
        ctx.fill();
        break;
        
      case "help":
        ctx.font = `bold ${scale * 0.8}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("?", centerX, centerY);
        break;
    }
    
    ctx.restore();
  }

  renderIconButton(ctx, id, icon, x, y, size, _, onClick, bgColor = "rgba(255, 255, 255, 0.1)", hoverColor = "rgba(255, 255, 255, 0.2)", isPlayButton = false, isToggled = false) {
    const button = {
      id,
      x,
      y,
      width: size,
      height: size,
      text: icon,
      onClick,
      cooldown: 0,
      enabled: true,
      isHovered: false,
      isToggled
    };
    
    this.buttons.set(id, button);
    
    // Update hover state
    button.isHovered = this.isPointInButton(this.mousePosition.x, this.mousePosition.y, button);
    
    ctx.save();
    
    // Animation for toggle state changes
    const time = Date.now() * 0.003;
    const pulseIntensity = 0.9 + 0.1 * Math.sin(time * 2);
    
    // Draw circle background
    ctx.beginPath();
    ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
    
    // Different visual states based on toggle and hover
    let fillStyle, strokeStyle, shadowColor;
    
    if (isToggled) {
      // ON state - bright green background
      fillStyle = button.isHovered ? "rgba(50, 255, 50, 0.8)" : "rgba(50, 255, 50, 0.7)";
      strokeStyle = `rgba(50, 255, 50, ${pulseIntensity})`;
      shadowColor = "#50ff50";
    } else {
      // OFF state - original colors
      fillStyle = button.isHovered ? hoverColor : bgColor;
      strokeStyle = button.isHovered ? (isPlayButton ? "rgba(80, 255, 80, 0.8)" : "rgba(0, 255, 136, 0.6)") : "transparent";
      shadowColor = isPlayButton ? "#50ff50" : "#00ff88";
    }
    
    ctx.fillStyle = fillStyle;
    ctx.fill();
    
    // Add glow effects
    if (button.isHovered || isToggled) {
      ctx.save();
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = isToggled ? 15 * pulseIntensity : 25;
      ctx.lineWidth = isToggled ? 2 : 3;
      ctx.strokeStyle = strokeStyle;
      ctx.stroke();
      ctx.restore();
    }
    
    // Render SVG icon or text
    const iconColor = isToggled ? "#ffffff" : (button.isHovered ? "#ffffff" : "rgba(255, 255, 255, 0.9)");
    if (icon === "▶" || ['play', 'pause', 'music', 'volume', 'crosshair', 'bot', 'shield', 'upgrade', 'help'].includes(icon)) {
      this.renderSVGIcon(ctx, icon === "▶" ? 'play' : icon, x, y, size, iconColor);
    } else {
      // Fallback to text
      ctx.fillStyle = iconColor;
      ctx.font = `${size * 0.5}px Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(icon, x + size/2, y + size/2);
    }
    
    // Add strikethrough for muted audio states (when toggled = enabled but showing muted state)
    if ((icon === "music" && this.game.audio.musicMuted) || (icon === "volume" && this.game.audio.soundMuted)) {
      this.renderStrikethrough(ctx, x, y, size);
    }
    
    ctx.restore();
  }

  renderStrikethrough(ctx, x, y, size) {
    ctx.save();
    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    
    // Draw diagonal line from top-left to bottom-right
    const offset = size * 0.3;
    ctx.beginPath();
    ctx.moveTo(x - offset, y - offset);
    ctx.lineTo(x + offset, y + offset);
    ctx.stroke();
    
    ctx.restore();
  }

  renderActionButton(ctx, id, iconType, x, y, width, height, onClick, cooldown = 0, maxCooldown = 100) {
    const button = {
      id,
      x,
      y,
      width,
      height,
      iconType,
      onClick,
      cooldown,
      maxCooldown,
      enabled: cooldown <= 0,
      isHovered: false
    };
    
    this.buttons.set(id, button);
    
    // Update hover state
    button.isHovered = this.isPointInButton(this.mousePosition.x, this.mousePosition.y, button);
    
    const centerX = x + width/2;
    const centerY = y + height/2;
    const radius = width/2;
    
    ctx.save();
    
    // Draw circular background
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    
    // Fill with subtle gradient
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    if (button.enabled) {
      if (button.isHovered) {
        gradient.addColorStop(0, "rgba(100, 150, 255, 0.4)");
        gradient.addColorStop(1, "rgba(60, 110, 255, 0.6)");
      } else {
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.15)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0.25)");
      }
    } else {
      gradient.addColorStop(0, "rgba(100, 100, 100, 0.2)");
      gradient.addColorStop(1, "rgba(100, 100, 100, 0.3)");
    }
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Add subtle glow on hover
    if (button.enabled && button.isHovered) {
      ctx.shadowColor = "rgba(100, 150, 255, 0.8)";
      ctx.shadowBlur = 20;
      ctx.fill();
    }
    
    // Draw icon
    const iconColor = button.enabled ? 
      (button.isHovered ? "#ffffff" : "rgba(255, 255, 255, 0.9)") : 
      "rgba(255, 255, 255, 0.4)";
    
    this.drawActionIcon(ctx, iconType, centerX, centerY, radius * 0.6, iconColor);
    
    // Draw cooldown ring
    if (cooldown > 0 && maxCooldown > 0) {
      const cooldownPercent = Math.min(cooldown / maxCooldown, 1);
      const startAngle = -Math.PI / 2; // Start at top
      const endAngle = startAngle + (Math.PI * 2 * cooldownPercent);
      
      ctx.save();
      ctx.strokeStyle = "rgba(255, 100, 100, 0.8)";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 2, startAngle, endAngle);
      ctx.stroke();
      ctx.restore();
      
      // Add darker overlay on icon when on cooldown
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    ctx.restore();
  }

  drawActionIcon(ctx, iconType, centerX, centerY, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    switch (iconType) {
      case "bomb":
        // Draw bomb icon
        ctx.beginPath();
        // Main bomb body (circle)
        ctx.arc(centerX, centerY + size * 0.1, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Fuse
        ctx.strokeStyle = "#ffaa00";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX - size * 0.2, centerY - size * 0.4);
        ctx.lineTo(centerX - size * 0.1, centerY - size * 0.6);
        ctx.lineTo(centerX + size * 0.1, centerY - size * 0.5);
        ctx.stroke();
        
        // Spark
        ctx.fillStyle = "#ffff00";
        ctx.beginPath();
        ctx.arc(centerX + size * 0.1, centerY - size * 0.5, size * 0.08, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case "shield":
        // Draw shield icon
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - size * 0.7);
        ctx.lineTo(centerX + size * 0.5, centerY - size * 0.3);
        ctx.lineTo(centerX + size * 0.5, centerY + size * 0.2);
        ctx.lineTo(centerX, centerY + size * 0.7);
        ctx.lineTo(centerX - size * 0.5, centerY + size * 0.2);
        ctx.lineTo(centerX - size * 0.5, centerY - size * 0.3);
        ctx.closePath();
        ctx.fill();
        
        // Shield cross
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - size * 0.4);
        ctx.lineTo(centerX, centerY + size * 0.4);
        ctx.moveTo(centerX - size * 0.3, centerY);
        ctx.lineTo(centerX + size * 0.3, centerY);
        ctx.stroke();
        break;
        
      case "clock":
        // Draw clock icon for time slow
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Clock face
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.45, 0, Math.PI * 2);
        ctx.fill();
        
        // Clock hands
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Hour hand (pointing up)
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX, centerY - size * 0.25);
        // Minute hand (pointing right)
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + size * 0.35, centerY);
        ctx.stroke();
        
        // Center dot
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.08, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    
    ctx.restore();
  }

  renderPlayButton(ctx, x, y, width, height, onClick) {
    const button = {
      id: "playButton",
      x,
      y,
      width,
      height,
      onClick,
      cooldown: 0,
      enabled: true,
      isHovered: this.isPointInButton(this.mousePosition.x, this.mousePosition.y, {x, y, width, height})
    };
    
    this.buttons.set("playButton", button);
    
    ctx.save();
    
    const centerX = x + width/2;
    const centerY = y + height/2;
    const scale = width * 0.4; // Smaller icon
    
    // Define larger triangular play icon path with tighter bounds
    const playPath = new Path2D();
    playPath.moveTo(centerX - scale * 0.15, centerY - scale * 0.25);
    playPath.lineTo(centerX + scale * 0.25, centerY);
    playPath.lineTo(centerX - scale * 0.15, centerY + scale * 0.25);
    playPath.closePath();
    
    // Create flowing green-teal gradient (similar to RAINBOIDS style)
    const time = this.animationFrame * 0.3; // Slower flowing animation
    let fillStyle;
    
    if (button.isHovered) {
      // On hover: flowing green-teal gradient like RAINBOIDS
      const gradientOffset = time % 360;
      const gradient = ctx.createLinearGradient(
        centerX - scale * 0.3, centerY - scale * 0.3,
        centerX + scale * 0.3, centerY + scale * 0.3
      );
      
      // Green to teal gradient range (120° to 180°)
      gradient.addColorStop(0, this.hslToHex((120 + gradientOffset) % 360, 100, 50));
      gradient.addColorStop(0.25, this.hslToHex((140 + gradientOffset) % 360, 100, 55));
      gradient.addColorStop(0.5, this.hslToHex((160 + gradientOffset) % 360, 100, 60));
      gradient.addColorStop(0.75, this.hslToHex((180 + gradientOffset) % 360, 100, 55));
      gradient.addColorStop(1, this.hslToHex((200 + gradientOffset) % 360, 100, 50));
      
      fillStyle = gradient;
      
      // Add flowing glow effect
      ctx.save();
      ctx.shadowColor = this.hslToHex((150 + gradientOffset) % 360, 100, 60);
      ctx.shadowBlur = 20;
      ctx.fillStyle = fillStyle;
      ctx.fill(playPath);
      ctx.restore();
    } else {
      // Default: subtle blue-purple gradient (like original)
      const gradient = ctx.createLinearGradient(
        centerX - scale * 0.3, centerY - scale * 0.3,
        centerX + scale * 0.3, centerY + scale * 0.3
      );
      gradient.addColorStop(0, this.hslToHex(240, 100, 60)); // Blue
      gradient.addColorStop(0.5, this.hslToHex(280, 100, 65)); // Purple
      gradient.addColorStop(1, this.hslToHex(320, 100, 60)); // Red-purple
      
      fillStyle = gradient;
    }
    
    // Render play icon with gradient
    ctx.fillStyle = fillStyle;
    ctx.fill(playPath);
    
    ctx.restore();
  }

  renderHelpModal(ctx) {
    // Semi-transparent background
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Modal box
    const modalWidth = Math.min(600, ctx.canvas.width * 0.9);
    const modalHeight = Math.min(500, ctx.canvas.height * 0.8);
    const modalX = (ctx.canvas.width - modalWidth) / 2;
    const modalY = (ctx.canvas.height - modalHeight) / 2;
    
    // Modal background
    ctx.fillStyle = "rgba(20, 20, 30, 0.95)";
    ctx.beginPath();
    this.roundRect(ctx, modalX, modalY, modalWidth, modalHeight, 20);
    ctx.fill();
    
    // Modal border
    ctx.strokeStyle = "#4444aa";
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Title
    this.renderText(ctx, "HELP", modalX + modalWidth/2, modalY + 50, 32, "#ffffff", "center");
    
    // Help content
    const helpText = [
      "CONTROLS:",
      "• Mouse/Touch - Move ship",
      "• Click/Tap - Shoot",
      "• ESC - Pause game",
      "",
      "POWER-UPS:",
      "• Shield - Temporary invincibility",
      "• Bomb - Clear screen explosion",
      "• Time Slow - Slow down time",
      "",
      "SCORING:",
      "• Enemies: 200 points",
      "• Mini-bosses: 1000 points", 
      "• Asteroids: 50 points",
      "• No score if cheats used",
      "",
      "Press ESC to close"
    ];
    
    let textY = modalY + 100;
    for (const line of helpText) {
      const fontSize = line.startsWith("•") ? 16 : (line === "" ? 10 : 18);
      const color = line.endsWith(":") ? "#66aaff" : "#ffffff";
      this.renderText(ctx, line, modalX + 40, textY, fontSize, color, "left");
      textY += line === "" ? 10 : 25;
    }
  }

  renderDialog(ctx) {
    // Check if dialog is active
    const dialogMessage = this.game.dialog?.getCurrentMessage();
    if (!dialogMessage) return;
    
    ctx.save();
    
    // Dialog background - semi-transparent dark overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Dialog box - center of screen
    const dialogWidth = Math.min(600, ctx.canvas.width * 0.8);
    const dialogHeight = 150;
    const dialogX = (ctx.canvas.width - dialogWidth) / 2;
    const dialogY = (ctx.canvas.height - dialogHeight) / 2;
    
    // Dialog background
    ctx.fillStyle = "rgba(20, 20, 40, 0.95)";
    ctx.fillRect(dialogX, dialogY, dialogWidth, dialogHeight);
    
    // Dialog border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(dialogX, dialogY, dialogWidth, dialogHeight);
    
    // Dialog text
    ctx.fillStyle = "#ffffff";
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(dialogMessage, ctx.canvas.width / 2, ctx.canvas.height / 2);
    
    // "Press SPACE or ENTER to continue" hint (for states 2 and 3)
    const dialogState = this.game.dialog?.dialogState;
    if (dialogState >= 2) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = "14px Arial";
      ctx.fillText("Press SPACE or ENTER to continue", ctx.canvas.width / 2, ctx.canvas.height / 2 + 40);
    }
    
    // Make the entire dialog area clickable
    this.buttons.set("dialog", {
      x: dialogX,
      y: dialogY,
      width: dialogWidth,
      height: dialogHeight,
      onClick: () => this.game.dialog?.advance(),
      enabled: true,
      isVisible: true,
      isClickable: true
    });
    
    ctx.restore();
  }
  
  roundRect(ctx, x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  renderConfigurableBackground(ctx) {
    // Get the current background config (including any ongoing transitions)
    const backgroundConfig = this.game.background?.getCurrentTransitionedBackground() || 
                            this.game.level?.config?.world?.background || {
      type: "solid",
      color: "#000000"
    };
    
    switch (backgroundConfig.type) {
      case "gradient":
        this.renderGradientBackground(ctx, backgroundConfig);
        break;
      case "radial":
        this.renderRadialBackground(ctx, backgroundConfig);
        break;
      case "animated":
        this.renderAnimatedBackground(ctx, backgroundConfig);
        break;
      case "layered":
        this.renderLayeredBackground(ctx, backgroundConfig);
        break;
      case "solid":
      default:
        ctx.fillStyle = backgroundConfig.color || "#000000";
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        break;
    }
  }
  
  renderGradientBackground(ctx, config) {
    const gradient = ctx.createLinearGradient(
      config.gradient.direction === "horizontal" ? 0 : 0,
      config.gradient.direction === "vertical" ? 0 : config.gradient.direction === "diagonal" ? 0 : 0,
      config.gradient.direction === "horizontal" ? this.canvas.width : config.gradient.direction === "diagonal" ? this.canvas.width : 0,
      config.gradient.direction === "vertical" ? this.canvas.height : config.gradient.direction === "diagonal" ? this.canvas.height : 0
    );
    
    // Support multicolor gradients
    if (config.gradient.colors && Array.isArray(config.gradient.colors)) {
      // Multicolor gradient with explicit stops
      config.gradient.colors.forEach((colorStop, index) => {
        if (typeof colorStop === 'object' && colorStop.color && colorStop.stop !== undefined) {
          gradient.addColorStop(colorStop.stop, colorStop.color);
        } else {
          // Auto-distribute colors evenly
          const stop = index / (config.gradient.colors.length - 1);
          gradient.addColorStop(stop, typeof colorStop === 'string' ? colorStop : colorStop.color);
        }
      });
    } else {
      // Legacy two-color gradient
      gradient.addColorStop(0, config.gradient.start);
      gradient.addColorStop(1, config.gradient.end);
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  renderRadialBackground(ctx, config) {
    const centerX = config.gradient.centerX !== undefined ? config.gradient.centerX * this.canvas.width : this.canvas.width / 2;
    const centerY = config.gradient.centerY !== undefined ? config.gradient.centerY * this.canvas.height : this.canvas.height / 2;
    const radius = config.gradient.radius !== undefined ? config.gradient.radius : Math.max(this.canvas.width, this.canvas.height) / 2;
    
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    
    // Support multicolor radial gradients
    if (config.gradient.colors && Array.isArray(config.gradient.colors)) {
      config.gradient.colors.forEach((colorStop, index) => {
        if (typeof colorStop === 'object' && colorStop.color && colorStop.stop !== undefined) {
          gradient.addColorStop(colorStop.stop, colorStop.color);
        } else {
          const stop = index / (config.gradient.colors.length - 1);
          gradient.addColorStop(stop, typeof colorStop === 'string' ? colorStop : colorStop.color);
        }
      });
    } else {
      // Legacy two-color gradient
      gradient.addColorStop(0, config.gradient.start);
      gradient.addColorStop(1, config.gradient.end);
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  renderAnimatedBackground(ctx, config) {
    const time = Date.now() * 0.001; // Current time in seconds
    const animConfig = config.animation || {};
    
    // Create base gradient
    let gradient;
    if (config.gradient.type === "radial") {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      const radius = Math.max(this.canvas.width, this.canvas.height) / 2;
      gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    } else {
      gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    }
    
    // Animate colors by shifting hue or interpolating between color sets
    if (config.gradient.colors && Array.isArray(config.gradient.colors)) {
      const speed = animConfig.speed || 0.5;
      const offset = (time * speed) % 1;
      
      config.gradient.colors.forEach((colorStop, index) => {
        let color = typeof colorStop === 'string' ? colorStop : colorStop.color;
        const stop = typeof colorStop === 'object' ? colorStop.stop : index / (config.gradient.colors.length - 1);
        
        // Apply hue shift animation
        if (animConfig.type === "hue_shift") {
          color = this.shiftHue(color, offset * 360);
        } else if (animConfig.type === "pulse") {
          // Pulse brightness
          const brightness = 0.8 + 0.4 * Math.sin(time * (animConfig.pulseSpeed || 2) + index);
          color = this.adjustBrightness(color, brightness);
        }
        
        gradient.addColorStop(stop, color);
      });
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Add animated overlays
    if (animConfig.overlays) {
      this.renderAnimatedOverlays(ctx, animConfig.overlays, time);
    }
  }

  renderLayeredBackground(ctx, config) {
    const layers = config.layers || [];
    
    layers.forEach(layer => {
      ctx.save();
      ctx.globalAlpha = layer.opacity || 1.0;
      
      switch (layer.type) {
        case "gradient":
          this.renderGradientBackground(ctx, { gradient: layer.gradient });
          break;
        case "radial":
          this.renderRadialBackground(ctx, { gradient: layer.gradient });
          break;
        case "nebula":
          this.renderNebulaLayer(ctx, layer);
          break;
        case "particles":
          this.renderParticleLayer(ctx, layer);
          break;
      }
      
      ctx.restore();
    });
  }

  renderNebulaLayer(ctx, layer) {
    const time = Date.now() * 0.001;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // Create multiple overlapping radial gradients for nebula effect
    const nebulaCount = layer.count || 3;
    for (let i = 0; i < nebulaCount; i++) {
      const angle = (i / nebulaCount) * Math.PI * 2 + time * (layer.rotationSpeed || 0.1);
      const distance = (layer.distance || 0.3) * Math.min(this.canvas.width, this.canvas.height);
      
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      const radius = (layer.radius || 0.4) * Math.min(this.canvas.width, this.canvas.height);
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      const colors = layer.colors || ["rgba(255,100,100,0.3)", "rgba(100,100,255,0.2)", "transparent"];
      
      colors.forEach((color, index) => {
        gradient.addColorStop(index / (colors.length - 1), color);
      });
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  renderParticleLayer(ctx, layer) {
    // Simple particle effect overlay
    const particleCount = layer.count || 50;
    const time = Date.now() * 0.001;
    
    ctx.fillStyle = layer.color || "rgba(255,255,255,0.1)";
    
    for (let i = 0; i < particleCount; i++) {
      const seed = i * 1234.5; // Consistent seed for each particle
      const x = ((seed * 123.456) % 1) * this.canvas.width;
      const y = ((seed * 789.012) % 1) * this.canvas.height;
      const size = 1 + ((seed * 345.678) % 1) * (layer.maxSize || 3);
      const speed = layer.speed || 0.1;
      
      // Animate position
      const animatedY = (y + time * speed * this.canvas.height) % (this.canvas.height + 20);
      
      ctx.beginPath();
      ctx.arc(x, animatedY, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderAnimatedOverlays(ctx, overlays, time) {
    overlays.forEach(overlay => {
      ctx.save();
      ctx.globalAlpha = overlay.opacity || 0.5;
      
      if (overlay.type === "wave") {
        this.renderWaveOverlay(ctx, overlay, time);
      } else if (overlay.type === "shimmer") {
        this.renderShimmerOverlay(ctx, overlay, time);
      }
      
      ctx.restore();
    });
  }

  renderWaveOverlay(ctx, overlay, time) {
    const amplitude = overlay.amplitude || 20;
    const frequency = overlay.frequency || 0.01;
    const speed = overlay.speed || 1;
    
    ctx.strokeStyle = overlay.color || "rgba(255,255,255,0.1)";
    ctx.lineWidth = overlay.width || 2;
    
    ctx.beginPath();
    for (let x = 0; x <= this.canvas.width; x += 2) {
      const y = this.canvas.height / 2 + Math.sin(x * frequency + time * speed) * amplitude;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  renderShimmerOverlay(ctx, overlay, time) {
    const gradient = ctx.createLinearGradient(0, 0, this.canvas.width, 0);
    const shimmerPos = (time * (overlay.speed || 0.5)) % 2 - 1; // -1 to 1
    
    gradient.addColorStop(Math.max(0, shimmerPos - 0.1), "transparent");
    gradient.addColorStop(Math.max(0, shimmerPos), overlay.color || "rgba(255,255,255,0.3)");
    gradient.addColorStop(Math.min(1, shimmerPos + 0.1), "transparent");
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Utility methods for color manipulation
  shiftHue(hexColor, degrees) {
    const rgb = this.hexToRgb(hexColor);
    if (!rgb) return hexColor;
    
    const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
    hsl.h = (hsl.h + degrees / 360) % 1;
    const newRgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
    
    return this.rgbToHex(newRgb.r, newRgb.g, newRgb.b);
  }

  adjustBrightness(hexColor, brightness) {
    const rgb = this.hexToRgb(hexColor);
    if (!rgb) return hexColor;
    
    const newRgb = {
      r: Math.min(255, Math.max(0, Math.round(rgb.r * brightness))),
      g: Math.min(255, Math.max(0, Math.round(rgb.g * brightness))),
      b: Math.min(255, Math.max(0, Math.round(rgb.b * brightness)))
    };
    
    return this.rgbToHex(newRgb.r, newRgb.g, newRgb.b);
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h, s, l };
  }

  hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  getDynamicCrosshairColor() {
    // Get the current background config (including any ongoing transitions)
    const backgroundConfig = this.game.background?.getCurrentTransitionedBackground() || 
                            this.game.level?.config?.world?.background || {
      type: "solid",
      color: "#000000"
    };
    
    // Determine the dominant background color
    let backgroundColor;
    switch (backgroundConfig.type) {
      case "gradient":
      case "radial":
        // Handle both old format (start/end) and new multicolor format
        if (backgroundConfig.gradient.colors && Array.isArray(backgroundConfig.gradient.colors)) {
          // New multicolor format - get the average of all colors
          backgroundColor = this.getMultiColorAverage(backgroundConfig.gradient.colors);
        } else if (backgroundConfig.gradient.start && backgroundConfig.gradient.end) {
          // Legacy two-color format
          backgroundColor = this.getAverageColor(backgroundConfig.gradient.start, backgroundConfig.gradient.end);
        } else {
          // Fallback
          backgroundColor = "#000000";
        }
        break;
      case "animated":
      case "layered":
        // For complex backgrounds, use a neutral approach
        backgroundColor = "#444444"; // Medium gray
        break;
      case "solid":
      default:
        backgroundColor = backgroundConfig.color || "#000000";
        break;
    }
    
    // Calculate brightness of background color
    const brightness = this.getColorBrightness(backgroundColor);
    
    // Return black crosshair for light backgrounds, white for dark backgrounds
    // Threshold of 0.5 (50% brightness) - adjust as needed
    return brightness > 0.5 ? "#000000" : "#ffffff";
  }

  getMultiColorAverage(colors) {
    if (!colors || colors.length === 0) return "#000000";
    
    let totalR = 0, totalG = 0, totalB = 0;
    let validColors = 0;
    
    colors.forEach(colorStop => {
      const color = typeof colorStop === 'string' ? colorStop : colorStop.color;
      const rgb = this.hexToRgb(color);
      if (rgb) {
        totalR += rgb.r;
        totalG += rgb.g;
        totalB += rgb.b;
        validColors++;
      }
    });
    
    if (validColors === 0) return "#000000";
    
    const avgR = Math.round(totalR / validColors);
    const avgG = Math.round(totalG / validColors);
    const avgB = Math.round(totalB / validColors);
    
    return this.rgbToHex(avgR, avgG, avgB);
  }

  getAverageColor(color1, color2) {
    // Convert hex colors to RGB
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return "#000000"; // Fallback
    
    // Calculate average RGB values
    const avgR = Math.round((rgb1.r + rgb2.r) / 2);
    const avgG = Math.round((rgb1.g + rgb2.g) / 2);
    const avgB = Math.round((rgb1.b + rgb2.b) / 2);
    
    // Convert back to hex
    return this.rgbToHex(avgR, avgG, avgB);
  }

  getColorBrightness(hexColor) {
    const rgb = this.hexToRgb(hexColor);
    if (!rgb) return 0; // Fallback for invalid color
    
    // Calculate relative luminance using the standard formula
    // https://en.wikipedia.org/wiki/Relative_luminance
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Handle 3-digit hex colors
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    
    if (hex.length !== 6) return null;
    
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }

  rgbToHex(r, g, b) {
    const toHex = (n) => {
      const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
}