// UI Renderer - Handles all canvas-based UI rendering
export class UIRenderer {
  constructor(game) {
    this.game = game;
    this.mousePosition = { x: 0, y: 0 };
    this.buttons = new Map();
    this.hoveredButton = null;
    this.clickedButton = null;
    this.animationFrame = 0;
  }

  updateMousePosition(x, y) {
    this.mousePosition.x = x;
    this.mousePosition.y = y;
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

  isPointInButton(x, y, button) {
    return x >= button.x && x <= button.x + button.width &&
           y >= button.y && y <= button.y + button.height;
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

  render(ctx) {
    const state = this.game.state.state;
    this.animationFrame++;
    
    // Always render canvas UI over existing HTML
    switch (state) {
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
      this.renderText(ctx, "PAUSED", 
        ctx.canvas.width / 2, pausedY, 24, "#ffffff", "center");
    }

    // Large centered play button - adjust position based on layout
    const playSize = 80;
    const playY = isPortrait ? (isPaused ? centerY - 10 : centerY + 10) : (isPaused ? centerY + 10 : centerY - 20);
    this.renderPlayButton(ctx, 
      ctx.canvas.width / 2 - playSize / 2, playY, playSize, playSize,
      () => this.game.startGame());

    // Bottom control buttons - organized in two rows (5 buttons max per row)
    const buttonSize = 50;
    const buttonSpacing = 70;
    const rowSpacing = 65; // Vertical spacing between rows
    const buttonsPerRow = 5;
    
    // Row 1: First 5 buttons
    const row1ButtonCount = Math.min(5, 7);
    const row1Width = (row1ButtonCount - 1) * buttonSpacing;
    const row1StartX = ctx.canvas.width / 2 - row1Width / 2;
    const row1Y = ctx.canvas.height - 130;
    
    // Row 2: Remaining buttons
    const row2ButtonCount = Math.max(0, 7 - row1ButtonCount);
    const row2Width = (row2ButtonCount - 1) * buttonSpacing;
    const row2StartX = ctx.canvas.width / 2 - row2Width / 2;
    const row2Y = row1Y + rowSpacing;
    
    // Row 1 - Music, Sound, God mode, Upgrades, Auto aim
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
      "rgba(200, 100, 255, 0.2)", "rgba(200, 100, 255, 0.3)", false, this.game.cheats?.allUpgrades || false);
    
    this.renderIconButton(ctx, "autoaim", "crosshair", 
      row1StartX + buttonSpacing * 4, row1Y, buttonSize, buttonSize,
      () => this.game.toggleAutoAim(),
      "rgba(255, 100, 100, 0.2)", "rgba(255, 100, 100, 0.3)", false, this.game.autoaimEnabled || false);
    
    // Row 2 - Auto player, Help
    this.renderIconButton(ctx, "autoplayer", "bot", 
      row2StartX, row2Y, buttonSize, buttonSize,
      () => this.game.toggleAutoPlayer(),
      "rgba(255, 150, 100, 0.2)", "rgba(255, 150, 100, 0.3)", false, this.game.autoplayEnabled || false);
    
    this.renderIconButton(ctx, "help", "help", 
      row2StartX + buttonSpacing, row2Y, buttonSize, buttonSize,
      () => this.game.showHelp(),
      "rgba(150, 150, 150, 0.2)", "rgba(150, 150, 150, 0.3)", false, false);
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
    
    // Play button - positioned relative to scores
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
    
    // Pause button (top right)
    this.renderPauseButton(ctx);
    
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
    const timer = this.game.state.timer || 0;
    
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
    const buttonSize = 50;
    const spacing = 10;
    const rightMargin = 20;
    const topMargin = 20;
    
    const x = ctx.canvas.width - rightMargin - buttonSize;
    
    // Bomb button
    this.renderActionButton(ctx, "bomb", "B", 
      x, topMargin, buttonSize, buttonSize,
      () => this.game.useBomb(),
      this.game.state.bombCooldown || 0);
    
    // Shield button  
    this.renderActionButton(ctx, "shield", "S", 
      x, topMargin + buttonSize + spacing, buttonSize, buttonSize,
      () => this.game.useShield(),
      this.game.state.shieldCooldown || 0);
    
    // Time slow button
    this.renderActionButton(ctx, "timeslow", "T", 
      x, topMargin + (buttonSize + spacing) * 2, buttonSize, buttonSize,
      () => this.game.useTimeSlow(),
      this.game.state.timeSlowCooldown || 0);
  }

  renderActionButton(ctx, id, text, x, y, width, height, onClick, cooldown = 0) {
    const button = {
      id,
      x,
      y,
      width,
      height,
      text,
      onClick,
      cooldown,
      enabled: cooldown <= 0,
      isHovered: false
    };
    
    this.buttons.set(id, button);
    
    // Modern flat button styling
    ctx.save();
    
    // Determine if this is a square icon button or rectangular text button
    const isIconButton = width === height;
    const cornerRadius = isIconButton ? width / 2 : height / 3;
    
    // Draw rounded rectangle/circle background
    ctx.beginPath();
    if (isIconButton) {
      // Perfect circle for icon buttons
      ctx.arc(x + width/2, y + height/2, width/2, 0, Math.PI * 2);
    } else {
      // Rounded rectangle for text buttons
      this.roundRect(ctx, x, y, width, height, cornerRadius);
    }
    
    // Fill with subtle gradient
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    if (button.enabled) {
      if (button.isHovered) {
        gradient.addColorStop(0, "rgba(100, 150, 255, 0.3)");
        gradient.addColorStop(1, "rgba(60, 110, 255, 0.4)");
      } else {
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.08)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0.12)");
      }
    } else {
      gradient.addColorStop(0, "rgba(100, 100, 100, 0.1)");
      gradient.addColorStop(1, "rgba(100, 100, 100, 0.15)");
    }
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Add subtle glow on hover
    if (button.enabled && button.isHovered) {
      ctx.shadowColor = "rgba(100, 150, 255, 0.5)";
      ctx.shadowBlur = 15;
      ctx.fill();
    }
    
    // Cooldown overlay
    if (cooldown > 0) {
      ctx.save();
      ctx.clip();
      const cooldownPercent = Math.min(cooldown / 100, 1);
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(x, y + height * (1 - cooldownPercent), width, height * cooldownPercent);
      ctx.restore();
    }
    
    // Button text/icon
    const textColor = button.enabled ? 
      (button.isHovered ? "#ffffff" : "rgba(255, 255, 255, 0.9)") : 
      "rgba(255, 255, 255, 0.3)";
    
    // Adjust font size and positioning
    const fontSize = isIconButton ? 24 : (width > 100 ? 16 : 18);
    const textY = isIconButton ? y + height/2 + 2 : y + height/2 + 1;
    
    this.renderText(ctx, text, x + width/2, textY, fontSize, textColor, "center");
    
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
      isHovered: this.isPointInButton(this.mousePosition.x, this.mousePosition.y, {x, y, width: size, height: size}),
      isToggled
    };
    
    this.buttons.set(id, button);
    
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
    
    // Render SVG icon instead of text
    const iconColor = isToggled ? "#ffffff" : (button.isHovered ? "#ffffff" : "rgba(255, 255, 255, 0.9)");
    this.renderSVGIcon(ctx, icon, x, y, size, iconColor);
    
    // Add strikethrough for disabled audio states
    if ((icon === "music" || icon === "volume") && isToggled) {
      this.renderStrikethrough(ctx, x, y, size);
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
    
    // Draw green background only on hover
    if (button.isHovered) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, width/2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(50, 255, 50, 0.6)";
      ctx.fill();
    }
    
    // Define triangular play icon path
    const playPath = new Path2D();
    playPath.moveTo(centerX - scale * 0.2, centerY - scale * 0.3);
    playPath.lineTo(centerX + scale * 0.3, centerY);
    playPath.lineTo(centerX - scale * 0.2, centerY + scale * 0.3);
    playPath.closePath();
    
    // Animated rainbow gradient stroke following triangle shape
    const time = Date.now() * 0.003;
    const segments = 12;
    
    // Create rainbow stroke along triangle perimeter
    for (let i = 0; i < segments; i++) {
      const progress = i / segments;
      const hue = ((time * 60 + i * 30) % 360);
      
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
      ctx.lineCap = "round";
      
      // Draw segments of the triangle
      ctx.beginPath();
      if (progress < 0.33) {
        // Left edge
        const t = progress / 0.33;
        const startX = centerX - scale * 0.2;
        const startY = centerY - scale * 0.3;
        const endX = centerX + scale * 0.3;
        const endY = centerY;
        ctx.moveTo(startX + (endX - startX) * t, startY + (endY - startY) * t);
        ctx.lineTo(startX + (endX - startX) * Math.min(1, t + 0.08), startY + (endY - startY) * Math.min(1, t + 0.08));
      } else if (progress < 0.66) {
        // Right edge  
        const t = (progress - 0.33) / 0.33;
        const startX = centerX + scale * 0.3;
        const startY = centerY;
        const endX = centerX - scale * 0.2;
        const endY = centerY + scale * 0.3;
        ctx.moveTo(startX + (endX - startX) * t, startY + (endY - startY) * t);
        ctx.lineTo(startX + (endX - startX) * Math.min(1, t + 0.08), startY + (endY - startY) * Math.min(1, t + 0.08));
      } else {
        // Bottom edge
        const t = (progress - 0.66) / 0.34;
        const startX = centerX - scale * 0.2;
        const startY = centerY + scale * 0.3;
        const endX = centerX - scale * 0.2;
        const endY = centerY - scale * 0.3;
        ctx.moveTo(startX + (endX - startX) * t, startY + (endY - startY) * t);
        ctx.lineTo(startX + (endX - startX) * Math.min(1, t + 0.08), startY + (endY - startY) * Math.min(1, t + 0.08));
      }
      ctx.stroke();
      ctx.restore();
    }
    
    // Add glow effect on hover
    if (button.isHovered) {
      ctx.save();
      ctx.shadowColor = "#50ff50";
      ctx.shadowBlur = 25;
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(80, 255, 80, 0.8)";
      ctx.stroke(playPath);
      ctx.restore();
    }
    
    // Render play icon with smaller scale
    ctx.fillStyle = "#ffffff";
    ctx.fill(playPath);
    
    ctx.restore();
  }
  
  renderStrikethrough(ctx, x, y, size) {
    ctx.save();
    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = size * 0.08;
    ctx.lineCap = "round";
    
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const radius = size * 0.35;
    
    // Draw circle with line through it
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw diagonal line
    ctx.beginPath();
    ctx.moveTo(centerX - radius * 0.7, centerY - radius * 0.7);
    ctx.lineTo(centerX + radius * 0.7, centerY + radius * 0.7);
    ctx.stroke();
    
    ctx.restore();
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

  renderAnimatedTitle(ctx, x, y) {
    ctx.save();
    
    // Check orientation
    const isPortrait = ctx.canvas.height > ctx.canvas.width;
    const fontSize = isPortrait ? 36 : 48;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Render RAINBOIDS with slow gradient animation
    const rainboidsText = "RAINBOIDS";
    const blitzText = "BLITZ";
    
    if (isPortrait) {
      // Portrait mode: stack vertically
      const lineSpacing = fontSize + 10;
      
      // RAINBOIDS on first line
      const rainbowOffset = (this.animationFrame * 0.5) % 360;
      const gradient1 = ctx.createLinearGradient(x - 150, y - lineSpacing/2, x + 150, y - lineSpacing/2);
      const colors = this.getRainbowColors(rainbowOffset);
      colors.forEach((color, i) => {
        gradient1.addColorStop(i / (colors.length - 1), color);
      });
      
      ctx.fillStyle = gradient1;
      ctx.fillText(rainboidsText, x, y - lineSpacing/2);
      
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
      // Desktop mode: "RAINBOIDS:" and "BLITZ" as separate elements with letter-sized gap
      const rainboidsText = "RAINBOIDS:";
      const blitzText = "BLITZ";
      const rainboidsWidth = ctx.measureText(rainboidsText).width;
      const blitzWidth = ctx.measureText(blitzText).width;
      const letterWidth = ctx.measureText("M").width; // Single letter width as gap
      const totalWidth = rainboidsWidth + letterWidth + blitzWidth;
      
      // RAINBOIDS: with slow animated gradient
      const rainbowOffset = (this.animationFrame * 0.5) % 360;
      const gradient1 = ctx.createLinearGradient(x - totalWidth/2, y, x - totalWidth/2 + rainboidsWidth, y);
      const colors = this.getRainbowColors(rainbowOffset);
      colors.forEach((color, i) => {
        gradient1.addColorStop(i / (colors.length - 1), color);
      });
      
      ctx.fillStyle = gradient1;
      ctx.fillText(rainboidsText, x - totalWidth/2 + rainboidsWidth/2, y);
      
      // BLITZ with fast per-letter color animation
      const blitzStartX = x - totalWidth/2 + rainboidsWidth + letterWidth;
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
      action: () => this.game.dialog?.advance(),
      isVisible: true,
      isClickable: true
    });
    
    ctx.restore();
  }
}