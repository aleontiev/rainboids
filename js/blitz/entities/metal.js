// Metal entity for Rainboids: Blitz
// Indestructible metal objects that bullets bounce off of and push the player

export class Metal {
  constructor(x, y, shape, isPortrait) {
    this.x = x;
    this.y = y;
    this.shape = shape; // "l" (long stick), "L" (capital L), or "T" (capital T)
    this.isPortrait = isPortrait;
    
    // Variable size - small, medium, or large (50% larger)
    this.sizeMultiplier = 0.75 + Math.random() * 1.5; // 0.75x to 2.25x size (50% larger)
    this.size = 60 * this.sizeMultiplier; // Base size for collision detection (50% larger)
    this.thickness = 6 + this.sizeMultiplier * 3; // Thinner lines (6-9 pixels, 50% larger)
    
    this.speed = 0.5 + Math.random() * 1; // Slow movement
    this.rotationSpeed = (Math.random() - 0.5) * 0.02; // Slow rotation
    this.rotation = Math.random() * Math.PI * 2;
    
    // Generate the actual line segments based on shape
    this.segments = this.generateSegments();
    
    // Movement direction
    if (isPortrait) {
      this.vx = (Math.random() - 0.5) * 0.5; // Slight horizontal drift
      this.vy = this.speed; // Move downward
    } else {
      this.vx = -this.speed; // Move leftward
      this.vy = (Math.random() - 0.5) * 0.5; // Slight vertical drift
    }
  }

  generateSegments() {
    const segmentLength = 45 * this.sizeMultiplier; // Scale with size (50% larger)
    const segments = [];
    
    switch (this.shape) {
      case "l":
        // Long stick - horizontal line (longer than old "line")
        segments.push({
          x1: -segmentLength * 1.5, y1: 0,
          x2: segmentLength * 1.5, y2: 0
        });
        break;
        
      case "L":
        // Capital L shape - horizontal and vertical line
        segments.push({
          x1: -segmentLength, y1: 0,
          x2: segmentLength, y2: 0
        });
        segments.push({
          x1: segmentLength, y1: 0,
          x2: segmentLength, y2: -segmentLength
        });
        break;
        
      case "T":
        // Capital T shape - horizontal line with vertical line in middle
        segments.push({
          x1: -segmentLength, y1: 0,
          x2: segmentLength, y2: 0
        });
        segments.push({
          x1: 0, y1: 0,
          x2: 0, y2: -segmentLength
        });
        break;
        
      default:
        // Default to long stick
        segments.push({
          x1: -segmentLength * 1.5, y1: 0,
          x2: segmentLength * 1.5, y2: 0
        });
    }
    
    return segments;
  }

  update(slowdownFactor = 1.0) {
    // Update position
    this.x += this.vx * slowdownFactor;
    this.y += this.vy * slowdownFactor;
    
    // Update rotation
    this.rotation += this.rotationSpeed * slowdownFactor;
    
    // Check if off screen for cleanup
    const margin = 100;
    if (this.isPortrait) {
      return this.y < window.innerHeight + margin;
    } else {
      return this.x > -margin;
    }
  }

  // Get rotated segments for collision detection
  getRotatedSegments() {
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    
    return this.segments.map(segment => ({
      x1: this.x + (segment.x1 * cos - segment.y1 * sin),
      y1: this.y + (segment.x1 * sin + segment.y1 * cos),
      x2: this.x + (segment.x2 * cos - segment.y2 * sin),
      y2: this.y + (segment.x2 * sin + segment.y2 * cos)
    }));
  }

  // Check collision with a point (bullet)
  checkBulletCollision(bullet) {
    const rotatedSegments = this.getRotatedSegments();
    
    for (const segment of rotatedSegments) {
      if (this.pointToLineDistance(bullet.x, bullet.y, segment) < bullet.size + this.thickness/2 + 2) {
        return segment; // Return the segment that was hit
      }
    }
    return null;
  }

  // Check collision with player (circular)
  checkPlayerCollision(player) {
    const rotatedSegments = this.getRotatedSegments();
    
    for (const segment of rotatedSegments) {
      if (this.pointToLineDistance(player.x, player.y, segment) < player.hitboxSize + this.thickness/2 + 3) {
        return segment;
      }
    }
    return null;
  }

  // Calculate distance from point to line segment
  pointToLineDistance(px, py, segment) {
    const { x1, y1, x2, y2 } = segment;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length)));
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    
    return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
  }

  // Calculate bounce direction for bullets
  calculateBounceDirection(bullet, segment) {
    const { x1, y1, x2, y2 } = segment;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Convert bullet angle/speed to velocity components
    const bulletVx = Math.cos(bullet.angle) * bullet.speed;
    const bulletVy = Math.sin(bullet.angle) * bullet.speed;
    
    if (length === 0) return { vx: -bulletVx, vy: -bulletVy };
    
    // Normal vector to the line (perpendicular)
    const nx = -dy / length;
    const ny = dx / length;
    
    // Reflect the bullet velocity
    const dot = bulletVx * nx + bulletVy * ny;
    const reflectedVx = bulletVx - 2 * dot * nx;
    const reflectedVy = bulletVy - 2 * dot * ny;
    
    return { 
      vx: reflectedVx, 
      vy: reflectedVy,
      angle: Math.atan2(reflectedVy, reflectedVx),
      speed: Math.sqrt(reflectedVx * reflectedVx + reflectedVy * reflectedVy)
    };
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    
    // Draw filled metal segments with bluish tint
    this.segments.forEach(segment => {
      // Calculate perpendicular vector for thickness
      const dx = segment.x2 - segment.x1;
      const dy = segment.y2 - segment.y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length > 0) {
        const perpX = (-dy / length) * (this.thickness / 2);
        const perpY = (dx / length) * (this.thickness / 2);
        
        // Create filled rectangle for each segment
        ctx.fillStyle = "#557799"; // More metallic bluish-gray color
        ctx.beginPath();
        ctx.moveTo(segment.x1 + perpX, segment.y1 + perpY);
        ctx.lineTo(segment.x2 + perpX, segment.y2 + perpY);
        ctx.lineTo(segment.x2 - perpX, segment.y2 - perpY);
        ctx.lineTo(segment.x1 - perpX, segment.y1 - perpY);
        ctx.closePath();
        ctx.fill();
        
        // Add darker outline for definition
        ctx.strokeStyle = "#334455";
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Add metallic highlight on top edge
        ctx.fillStyle = "#88bbdd"; // Lighter metallic blue highlight
        ctx.beginPath();
        ctx.moveTo(segment.x1 + perpX, segment.y1 + perpY);
        ctx.lineTo(segment.x2 + perpX, segment.y2 + perpY);
        ctx.lineTo(segment.x2 + perpX * 0.6, segment.y2 + perpY * 0.6);
        ctx.lineTo(segment.x1 + perpX * 0.6, segment.y1 + perpY * 0.6);
        ctx.closePath();
        ctx.fill();
      }
    });
    
    ctx.restore();
  }
}