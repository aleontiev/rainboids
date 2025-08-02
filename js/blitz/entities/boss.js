// Modular Boss entity for BlitzRain with skeleton/anchoring system

export class Boss {
  constructor(x, y, bossConfig, game) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.config = bossConfig;
    
    // Boss properties
    this.health = bossConfig.health || 1000;
    this.maxHealth = this.health;
    this.size = bossConfig.size || 120;
    
    // Part system
    this.parts = new Map(); // Map of partName -> BossPart
    this.corePartName = null; // The core part that others anchor to
    this.anchorGraph = new Map(); // Map of partName -> anchor relationships
    
    // Movement system
    this.movementPattern = bossConfig.movement || { type: 'stationary' };
    this.frameCount = 0;
    
    // Initialize parts
    this.initializeParts();
    this.calculateAnchors();
  }
  
  initializeParts() {
    if (!this.config.parts) {
      console.error('Boss config missing parts definition');
      return;
    }
    
    // Create all parts
    for (const [partName, partConfig] of Object.entries(this.config.parts)) {
      const part = new BossPart(partName, partConfig, this.game);
      this.parts.set(partName, part);
      
      // Identify core part (the one with most incoming anchors)
      if (partConfig.isCore || !this.corePartName) {
        this.corePartName = partName;
      }
    }
    
    // Set initial positions - core at boss position, others relative
    const corePart = this.parts.get(this.corePartName);
    if (corePart) {
      corePart.x = this.x;
      corePart.y = this.y;
    }
  }
  
  calculateAnchors() {
    // Build anchor relationships and calculate relative positions
    for (const [partName, partConfig] of Object.entries(this.config.parts)) {
      if (partConfig.anchor && partName !== this.corePartName) {
        const anchor = partConfig.anchor;
        const fromPart = this.parts.get(partName);
        const toPart = this.parts.get(anchor.to.split('.')[0]);
        
        if (fromPart && toPart) {
          this.anchorGraph.set(partName, {
            fromAnchor: anchor.from,
            toAnchor: anchor.to,
            targetPart: anchor.to.split('.')[0]
          });
        }
      }
    }
    
    // Calculate initial relative positions
    this.updateAnchoredPositions();
  }
  
  updateAnchoredPositions() {
    const corePart = this.parts.get(this.corePartName);
    if (!corePart) return;
    
    // Update all anchored parts relative to their targets
    for (const [partName, anchorInfo] of this.anchorGraph.entries()) {
      const part = this.parts.get(partName);
      const targetPart = this.parts.get(anchorInfo.targetPart);
      
      if (part && targetPart) {
        // Calculate anchor points considering the target part's current rotation
        const toPoint = this.calculateRotatedAnchorPoint(targetPart, anchorInfo.toAnchor.split('.')[1]);
        const fromPoint = this.calculateAnchorPoint(part, anchorInfo.fromAnchor.split('.')[1]);
        
        // Position part so its anchor point aligns with target's rotated anchor point
        part.x = targetPart.x + toPoint.x - fromPoint.x;
        part.y = targetPart.y + toPoint.y - fromPoint.y;
      }
    }
  }
  
  calculateRotatedAnchorPoint(part, anchorType) {
    const bounds = part.getBounds();
    let localPoint;
    
    // Get the local anchor point (same as calculateAnchorPoint)
    switch (anchorType) {
      case 'center':
        localPoint = { x: 0, y: 0 };
        break;
      case 'top':
        localPoint = { x: 0, y: bounds.top };
        break;
      case 'bottom':
        localPoint = { x: 0, y: bounds.bottom };
        break;
      case 'left':
        localPoint = { x: bounds.left, y: 0 };
        break;
      case 'right':
        localPoint = { x: bounds.right, y: 0 };
        break;
      case 'top-left':
        localPoint = { x: bounds.left, y: bounds.top };
        break;
      case 'top-right':
        localPoint = { x: bounds.right, y: bounds.top };
        break;
      case 'bottom-left':
        localPoint = { x: bounds.left, y: bounds.bottom };
        break;
      case 'bottom-right':
        localPoint = { x: bounds.right, y: bounds.bottom };
        break;
      default:
        localPoint = { x: 0, y: 0 };
    }
    
    // Rotate the local point by the part's current angle
    const cos = Math.cos(part.angle || 0);
    const sin = Math.sin(part.angle || 0);
    
    return {
      x: localPoint.x * cos - localPoint.y * sin,
      y: localPoint.x * sin + localPoint.y * cos
    };
  }
  
  calculateAnchorPoint(part, anchorType) {
    const bounds = part.getBounds();
    
    switch (anchorType) {
      case 'center':
        return { x: 0, y: 0 };
      case 'top':
        return { x: 0, y: bounds.top };
      case 'bottom':
        return { x: 0, y: bounds.bottom };
      case 'left':
        return { x: bounds.left, y: 0 };
      case 'right':
        return { x: bounds.right, y: 0 };
      case 'top-left':
        return { x: bounds.left, y: bounds.top };
      case 'top-right':
        return { x: bounds.right, y: bounds.top };
      case 'bottom-left':
        return { x: bounds.left, y: bounds.bottom };
      case 'bottom-right':
        return { x: bounds.right, y: bounds.bottom };
      default:
        return { x: 0, y: 0 };
    }
  }
  
  update(playerX, playerY, slowdownFactor = 1.0) {
    this.frameCount += slowdownFactor;
    
    // Update core part position based on movement pattern
    this.updateMovement(slowdownFactor);
    
    // Make core part face the player (like minibosses do)
    const corePart = this.parts.get(this.corePartName);
    if (corePart && playerX !== undefined && playerY !== undefined) {
      corePart.angle = Math.atan2(playerY - corePart.y, playerX - corePart.x);
    }
    
    // Update all part positions based on anchoring
    this.updateAnchoredPositions();
    
    // Make individual parts try to face the player while maintaining anchors
    this.updatePartRotations(playerX, playerY);
    
    // Update individual parts (allows for part-specific logic)
    for (const [partName, part] of this.parts.entries()) {
      part.update(slowdownFactor, playerX, playerY);
    }
    
    // Check if boss is defeated
    if (this.health <= 0) {
      return "defeated";
    }
    
    return "active";
  }
  
  updateMovement(slowdownFactor) {
    const corePart = this.parts.get(this.corePartName);
    if (!corePart) return;
    
    switch (this.movementPattern.type) {
      case 'stationary':
        // No movement
        break;
        
      case 'oscillate':
        const amplitude = this.movementPattern.amplitude || 50;
        const frequency = this.movementPattern.frequency || 0.02;
        corePart.x = this.x + Math.sin(this.frameCount * frequency) * amplitude;
        break;
        
      case 'circle':
        const radius = this.movementPattern.radius || 30;
        const speed = this.movementPattern.speed || 0.01;
        corePart.x = this.x + Math.cos(this.frameCount * speed) * radius;
        corePart.y = this.y + Math.sin(this.frameCount * speed) * radius;
        break;
        
      default:
        break;
    }
  }
  
  updatePartRotations(playerX, playerY) {
    // Make each part try to face the player while respecting anchoring constraints
    for (const [partName, part] of this.parts.entries()) {
      if (partName === this.corePartName) continue; // Core already rotated
      
      if (playerX !== undefined && playerY !== undefined) {
        // Calculate angle to player from this part's position
        const angleToPlayer = Math.atan2(playerY - part.y, playerX - part.x);
        
        // Check if this part is anchored - if so, constrain rotation
        const anchorInfo = this.anchorGraph.get(partName);
        if (anchorInfo) {
          // Parts connected to the core can rotate more freely
          // Limb parts (arms, legs) should have some constraint based on their anchor
          const constrainedAngle = this.constrainPartRotation(part, anchorInfo, angleToPlayer);
          part.angle = constrainedAngle;
        } else {
          // Free-floating parts can rotate freely toward player
          part.angle = angleToPlayer;
        }
      }
    }
  }
  
  constrainPartRotation(part, anchorInfo, desiredAngle) {
    // Get the anchor target part
    const targetPart = this.parts.get(anchorInfo.targetPart);
    if (!targetPart) return desiredAngle;
    
    // Calculate the direction from anchor target to this part
    const anchorDirection = Math.atan2(part.y - targetPart.y, part.x - targetPart.x);
    
    // For arms and limbs, allow some rotation around the anchor point
    // but constrain it to feel natural (like a joint)
    const maxDeviationFromAnchor = Math.PI / 3; // 60 degrees max deviation
    
    // Calculate how much the desired angle deviates from the anchor direction
    let angleDiff = desiredAngle - anchorDirection;
    
    // Normalize angle difference to [-π, π]
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    
    // Clamp the deviation
    const clampedDiff = Math.max(-maxDeviationFromAnchor, 
                                Math.min(maxDeviationFromAnchor, angleDiff));
    
    return anchorDirection + clampedDiff;
  }
  
  render(ctx) {
    // Render all parts in order (core first, then others)
    const corePart = this.parts.get(this.corePartName);
    if (corePart) {
      corePart.render(ctx);
    }
    
    // Render other parts
    for (const [partName, part] of this.parts.entries()) {
      if (partName !== this.corePartName) {
        part.render(ctx);
      }
    }
    
    // Debug: Draw anchor points and connections
    if (this.game.debug) {
      this.renderDebugAnchors(ctx);
    }
  }
  
  renderDebugAnchors(ctx) {
    ctx.save();
    ctx.strokeStyle = '#ff0000';
    ctx.fillStyle = '#ff0000';
    ctx.lineWidth = 2;
    
    // Draw anchor connections
    for (const [partName, anchorInfo] of this.anchorGraph.entries()) {
      const part = this.parts.get(partName);
      const targetPart = this.parts.get(anchorInfo.targetPart);
      
      if (part && targetPart) {
        ctx.beginPath();
        ctx.moveTo(part.x, part.y);
        ctx.lineTo(targetPart.x, targetPart.y);
        ctx.stroke();
        
        // Draw anchor points
        ctx.beginPath();
        ctx.arc(part.x, part.y, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(targetPart.x, targetPart.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.restore();
  }
  
  takeDamage(damage, x, y) {
    this.health -= damage;
    if (this.health <= 0) {
      return 'destroyed';
    }
    return 'damaged';
  }
}

export class BossPart {
  constructor(name, config, game) {
    this.name = name;
    this.config = config;
    this.game = game;
    
    // Position (will be set by boss anchoring system)
    this.x = 0;
    this.y = 0;
    this.angle = 0; // Rotation angle for facing player
    
    // Part properties
    this.health = config.health || 100;
    this.maxHealth = this.health;
    this.size = config.size || 40;
    this.shape = config.shape || 'circle';
    
    // Rendering
    this.color = config.color || '#ff4444';
    this.svgPath = null;
    this.bounds = null;
    
    // Load SVG if shape is a URL
    if (this.shape.startsWith('http') || this.shape.endsWith('.svg')) {
      this.loadSVGShape();
    }
  }
  
  async loadSVGShape() {
    if (this.game?.entities?.svgAssetManager) {
      try {
        const svgContent = await this.game.entities.svgAssetManager.loadSVG(this.shape);
        if (svgContent) {
          this.svgPath = this.game.entities.svgToPath2D(svgContent);
          this.calculateBounds();
        }
      } catch (error) {
        console.warn(`Failed to load SVG for boss part ${this.name}:`, error);
      }
    }
  }
  
  calculateBounds() {
    if (this.svgPath) {
      // For SVG paths, calculate actual path bounds by sampling points
      this.bounds = this.calculateSVGPathBounds();
    } else {
      // For simple shapes, calculate based on shape type
      switch (this.shape) {
        case 'circle':
          this.bounds = {
            left: -this.size / 2,
            right: this.size / 2,
            top: -this.size / 2,
            bottom: this.size / 2
          };
          break;
        case 'rectangle':
          const width = this.config.width || this.size;
          const height = this.config.height || this.size;
          this.bounds = {
            left: -width / 2,
            right: width / 2,
            top: -height / 2,
            bottom: height / 2
          };
          break;
        default:
          this.bounds = {
            left: -this.size / 2,
            right: this.size / 2,
            top: -this.size / 2,
            bottom: this.size / 2
          };
      }
    }
  }
  
  calculateSVGPathBounds() {
    // Create a temporary canvas to analyze the path
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = this.size * 2;
    tempCanvas.height = this.size * 2;
    
    // Scale and center the path
    tempCtx.translate(this.size, this.size);
    const scale = this.size / 100;
    tempCtx.scale(scale, scale);
    tempCtx.translate(-50, -50); // Assuming SVG is roughly centered at (50,50)
    
    // Fill the path to create a bitmap we can analyze
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fill(this.svgPath);
    
    // Get image data to find actual bounds
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    
    let minX = tempCanvas.width, maxX = 0;
    let minY = tempCanvas.height, maxY = 0;
    
    // Scan for non-transparent pixels
    for (let y = 0; y < tempCanvas.height; y++) {
      for (let x = 0; x < tempCanvas.width; x++) {
        const index = (y * tempCanvas.width + x) * 4;
        const alpha = data[index + 3];
        
        if (alpha > 0) { // Non-transparent pixel
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    // Convert back to relative coordinates (centered at part position)
    const centerX = this.size;
    const centerY = this.size;
    
    return {
      left: minX - centerX,
      right: maxX - centerX,
      top: minY - centerY,
      bottom: maxY - centerY
    };
  }
  
  getBounds() {
    if (!this.bounds) {
      this.calculateBounds();
    }
    return this.bounds;
  }
  
  update(slowdownFactor, playerX, playerY) {
    // Allow independent rotation for non-core parts anchored on edges
    if (this.anchorPoint && this.anchorPoint !== 'center' && this.canRotateIndependently) {
      // Rotate independently while maintaining anchor point
      if (this.rotationSpeed) {
        this.angle += this.rotationSpeed * slowdownFactor;
      } else if (playerX !== undefined && playerY !== undefined) {
        // Face player by default for edge parts
        this.angle = Math.atan2(playerY - this.y, playerX - this.x);
      }
    }
    
    // Other part updates (animations, effects, etc.)
  }
  
  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle || 0); // Apply part rotation
    
    if (this.svgPath) {
      // Render SVG path
      const scale = this.size / 100; // Normalize SVG to size
      ctx.scale(scale, scale);
      ctx.fillStyle = this.color;
      ctx.fill(this.svgPath);
    } else {
      // Render simple shape
      ctx.fillStyle = this.color;
      
      switch (this.shape) {
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
          
        case 'rectangle':
          const width = this.config.width || this.size;
          const height = this.config.height || this.size;
          ctx.fillRect(-width / 2, -height / 2, width, height);
          break;
          
        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(0, -this.size / 2);
          ctx.lineTo(-this.size / 2, this.size / 2);
          ctx.lineTo(this.size / 2, this.size / 2);
          ctx.closePath();
          ctx.fill();
          break;
          
        default:
          // Default to circle
          ctx.beginPath();
          ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
          ctx.fill();
      }
    }
    
    ctx.restore();
  }
  
  takeDamage(damage) {
    this.health -= damage;
    return this.health <= 0 ? 'destroyed' : 'damaged';
  }
}

// Helper function to create L-shaped arm SVG paths
export function createLShapedArmPath(size = 100, thickness = 20, armLength = 80) {
  const path = new Path2D();
  
  // Create L-shape: vertical segment + horizontal segment
  // Vertical segment (upper arm)
  path.rect(-thickness/2, -armLength, thickness, armLength);
  
  // Horizontal segment (forearm)
  path.rect(-thickness/2, -thickness/2, armLength, thickness);
  
  return path;
}

// Helper function to create mirrored L-shaped arm (for left arm)
export function createMirroredLShapedArmPath(size = 100, thickness = 20, armLength = 80) {
  const path = new Path2D();
  
  // Create mirrored L-shape: vertical segment + horizontal segment pointing left
  // Vertical segment (upper arm)
  path.rect(-thickness/2, -armLength, thickness, armLength);
  
  // Horizontal segment (forearm) - pointing left
  path.rect(-armLength, -thickness/2, armLength, thickness);
  
  return path;
}