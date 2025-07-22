// Metal entity for Rainboids: Blitz
// Indestructible metal objects that bullets bounce off of and push the player

export class Metal {
  constructor(x, y, shape, isPortrait, game = null) {
    this.x = x;
    this.y = y;
    this.shape = shape; // "l" (long stick), "L" (capital L), or "T" (capital T)
    this.isPortrait = isPortrait;
    this.game = game;
    
    // Variable size - small, medium, or large (50% larger)
    this.sizeMultiplier = 0.75 + Math.random() * 1.5; // 0.75x to 2.25x size (50% larger)
    const baseSize = game?.levelManager?.config?.world?.metalSize || 60;
    this.size = baseSize * this.sizeMultiplier; // Base size for collision detection (50% larger)
    const baseThickness = game?.levelManager?.config?.world?.metalThickness || 6;
    this.thickness = baseThickness + this.sizeMultiplier * 3; // Thinner lines (6-9 pixels, 50% larger)
    
    const baseSpeed = game?.levelManager?.config?.world?.metalSpeed || 0.5;
    this.speed = baseSpeed + Math.random() * 1; // Slow movement
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
    
    // Velocity tracking (dx/dy per second) - initialize with current velocity
    this.dx = this.vx * 60;
    this.dy = this.vy * 60;
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
    // Store previous position for velocity calculation
    const prevX = this.x;
    const prevY = this.y;
    
    // Get player position for drift effect
    const player = this.game?.player;
    const edgeMargin = 50; // Distance from edge to trigger bounce
    const removalMargin = 200; // Distance beyond edge for removal
    
    if (this.isPortrait) {
      // Portrait mode: bounce off left/right edges
      
      // Check left edge
      if (this.x < edgeMargin) {
        this.x = edgeMargin;
        this.vx = Math.abs(this.vx) * 0.8; // Bounce right with damping
      }
      // Check right edge
      else if (this.x > window.innerWidth - edgeMargin) {
        this.x = window.innerWidth - edgeMargin;
        this.vx = -Math.abs(this.vx) * 0.8; // Bounce left with damping
      }
      
      // No artificial drift - metal follows physics only
      
      // Continue downward movement
      this.vy = this.speed;
      
    } else {
      // Landscape mode: bounce off top/bottom edges
      
      // Check top edge
      if (this.y < edgeMargin) {
        this.y = edgeMargin;
        this.vy = Math.abs(this.vy) * 0.8; // Bounce down with damping
      }
      // Check bottom edge
      else if (this.y > window.innerHeight - edgeMargin) {
        this.y = window.innerHeight - edgeMargin;
        this.vy = -Math.abs(this.vy) * 0.8; // Bounce up with damping
      }
      
      // No artificial drift - metal follows physics only
      
      // Continue leftward movement
      this.vx = -this.speed;
    }
    
    // Update position
    this.x += this.vx * slowdownFactor;
    this.y += this.vy * slowdownFactor;
    
    // Update rotation from both base rotation and angular velocity from collisions
    this.rotation += this.rotationSpeed * slowdownFactor;
    if (this.angularVelocity !== undefined) {
      this.rotation += this.angularVelocity * slowdownFactor;
    }
    
    // Calculate velocity (pixels per frame * 60 = pixels per second)
    this.dx = (this.x - prevX) * 60;
    this.dy = (this.y - prevY) * 60;
    
    // Check if far enough off screen for removal
    if (this.isPortrait) {
      // Remove if pushed far beyond top or bottom
      return this.y > -removalMargin && this.y < window.innerHeight + removalMargin;
    } else {
      // Remove if pushed far beyond left or right
      return this.x > -removalMargin && this.x < window.innerWidth + removalMargin;
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
    
    if (length === 0) return { 
      angle: bullet.angle + Math.PI,
      x: bullet.x + Math.cos(bullet.angle + Math.PI) * 5,
      y: bullet.y + Math.sin(bullet.angle + Math.PI) * 5
    };
    
    // Normal vector to the line (perpendicular)
    const nx = -dy / length;
    const ny = dx / length;
    
    // Make sure normal points away from incoming bullet
    const dotProduct = bulletVx * nx + bulletVy * ny;
    const normalX = dotProduct < 0 ? nx : -nx;
    const normalY = dotProduct < 0 ? ny : -ny;
    
    // Reflect the bullet velocity
    const dot = bulletVx * normalX + bulletVy * normalY;
    const reflectedVx = bulletVx - 2 * dot * normalX;
    const reflectedVy = bulletVy - 2 * dot * normalY;
    
    // Calculate new angle
    const newAngle = Math.atan2(reflectedVy, reflectedVx);
    
    // Push bullet away from the metal to prevent getting stuck
    const pushDistance = bullet.size + this.thickness/2 + 5;
    const newX = bullet.x + normalX * pushDistance;
    const newY = bullet.y + normalY * pushDistance;
    
    return { 
      angle: newAngle,
      x: newX,
      y: newY
    };
  }

  // Calculate bounce direction for lasers (similar to bullets but with laser-specific properties)
  calculateLaserBounceDirection(laser, segment) {
    const { x1, y1, x2, y2 } = segment;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Convert laser angle/speed to velocity components
    const laserVx = Math.cos(laser.angle) * laser.speed;
    const laserVy = Math.sin(laser.angle) * laser.speed;
    
    if (length === 0) return { vx: -laserVx, vy: -laserVy };
    
    // Normal vector to the line (perpendicular)
    const nx = -dy / length;
    const ny = dx / length;
    
    // Reflect the laser velocity
    const dot = laserVx * nx + laserVy * ny;
    const reflectedVx = laserVx - 2 * dot * nx;
    const reflectedVy = laserVy - 2 * dot * ny;
    
    return { 
      vx: reflectedVx, 
      vy: reflectedVy,
      angle: Math.atan2(reflectedVy, reflectedVx),
      speed: Math.sqrt(reflectedVx * reflectedVx + reflectedVy * reflectedVy)
    };
  }

  // Handle player collision with metal - proper momentum transfer physics
  handlePlayerCollision(player, segment) {
    const { x1, y1, x2, y2 } = segment;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return;
    
    // Normal vector to the line (perpendicular)
    const nx = -dy / length;
    const ny = dx / length;
    
    // Make sure normal points away from metal surface towards player
    const deltaX = player.x - this.x;
    const deltaY = player.y - this.y;
    const dotProduct = deltaX * nx + deltaY * ny;
    const normalX = dotProduct < 0 ? nx : -nx;
    const normalY = dotProduct < 0 ? ny : -ny;
    
    // Separate objects to prevent overlap
    const pushDistance = player.hitboxSize + this.thickness/2 + 3;
    player.x += normalX * pushDistance * 0.6; // Player moves less
    this.x -= normalX * pushDistance * 0.4; // Metal moves less
    
    // Get current velocities (convert player velocity from px/sec to px/frame)
    const playerVelX = player.dx / 60;
    const playerVelY = player.dy / 60;
    const metalVelX = this.vx;
    const metalVelY = this.vy;
    
    // Calculate relative velocity in collision normal direction
    const relativeVelX = playerVelX - metalVelX;
    const relativeVelY = playerVelY - metalVelY;
    const relativeNormalVel = relativeVelX * normalX + relativeVelY * normalY;
    
    // Don't resolve if objects are separating already
    if (relativeNormalVel > 0) return;
    
    // Find collision point on metal segment for torque calculation
    const t = Math.max(0, Math.min(1, 
      ((player.x - x1) * dx + (player.y - y1) * dy) / (length * length)
    ));
    const collisionPointX = x1 + t * dx;
    const collisionPointY = y1 + t * dy;
    
    // Physics constants - same mass for all entities
    const playerMass = 1.0; // Same mass as enemies and metal
    const metalMass = 1.0;
    const restitution = 0.3; // Some bounciness
    
    // Calculate impulse for elastic collision
    const impulse = -(1 + restitution) * relativeNormalVel / (playerMass + metalMass);
    
    // Apply momentum transfer - equal masses means equal and opposite changes
    const playerVelChangeX = impulse * metalMass * normalX / playerMass;
    const playerVelChangeY = impulse * metalMass * normalY / playerMass;
    const metalVelChangeX = -impulse * playerMass * normalX / metalMass;
    const metalVelChangeY = -impulse * playerMass * normalY / metalMass;
    
    // Update metal linear velocity
    this.vx += metalVelChangeX;
    this.vy += metalVelChangeY;
    
    // Calculate and apply torque to metal based on collision point
    const metalCenterX = this.x;
    const metalCenterY = this.y;
    const leverArmX = collisionPointX - metalCenterX;
    const leverArmY = collisionPointY - metalCenterY;
    
    // Force applied at collision point
    const forceX = -impulse * playerMass * normalX;
    const forceY = -impulse * playerMass * normalY;
    
    // Torque = lever arm × force (cross product in 2D)
    const torque = leverArmX * forceY - leverArmY * forceX;
    
    // Apply angular velocity (assuming metal has uniform density)
    const momentOfInertia = metalMass * length * length / 12; // Rod moment of inertia
    const angularImpulse = torque / Math.max(momentOfInertia, 1); // Prevent division by zero
    
    // Initialize angular velocity if not present
    if (this.angularVelocity === undefined) {
      this.angularVelocity = 0;
    }
    this.angularVelocity += angularImpulse * 0.1; // Scale for reasonable rotation
    
    // Apply angular damping
    this.angularVelocity *= 0.95;
    
    // Update player velocity by modifying dx/dy (converted back to px/sec)
    player.dx += playerVelChangeX * 60;
    player.dy += playerVelChangeY * 60;
    
    // Apply some velocity damping to prevent excessive speeds
    const metalSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (metalSpeed > 3.0) {
      this.vx = (this.vx / metalSpeed) * 3.0;
      this.vy = (this.vy / metalSpeed) * 3.0;
    }
  }

  // Handle enemy collision with metal - same physics as player collision
  handleEnemyCollision(enemy, segment) {
    const { x1, y1, x2, y2 } = segment;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return;
    
    // Normal vector to the line (perpendicular)
    const nx = -dy / length;
    const ny = dx / length;
    
    // Make sure normal points away from metal surface towards enemy
    const deltaX = enemy.x - this.x;
    const deltaY = enemy.y - this.y;
    const dotProduct = deltaX * nx + deltaY * ny;
    const normalX = dotProduct < 0 ? nx : -nx;
    const normalY = dotProduct < 0 ? ny : -ny;
    
    // Find collision point on metal segment for torque calculation
    const t = Math.max(0, Math.min(1, 
      ((enemy.x - x1) * dx + (enemy.y - y1) * dy) / (length * length)
    ));
    const collisionPointX = x1 + t * dx;
    const collisionPointY = y1 + t * dy;
    
    // Separate objects to prevent overlap
    const pushDistance = (enemy.size || enemy.hitboxSize || 15) + this.thickness/2 + 3;
    enemy.x += normalX * pushDistance * 0.6; // Enemy moves less
    this.x -= normalX * pushDistance * 0.4; // Metal moves less
    
    // Get current velocities - same mass for all entities
    const enemyVelX = (enemy.dx || 0) / 60; // Convert from pixels/second to pixels/frame
    const enemyVelY = (enemy.dy || 0) / 60;
    const metalVelX = this.vx;
    const metalVelY = this.vy;
    
    // Calculate relative velocity in collision normal direction
    const relativeVelX = enemyVelX - metalVelX;
    const relativeVelY = enemyVelY - metalVelY;
    const relativeNormalVel = relativeVelX * normalX + relativeVelY * normalY;
    
    // Don't resolve if objects are separating already
    if (relativeNormalVel > 0) return;
    
    // Physics constants - same mass for all entities
    const entityMass = 1.0; // Same mass for player, enemies, and metal
    const metalMass = 1.0;
    const restitution = 0.3; // Some bounciness
    
    // Calculate impulse for elastic collision
    const impulse = -(1 + restitution) * relativeNormalVel / (entityMass + metalMass);
    
    // Apply momentum transfer - equal masses means equal and opposite changes
    const entityVelChangeX = impulse * metalMass * normalX / entityMass;
    const entityVelChangeY = impulse * metalMass * normalY / entityMass;
    const metalVelChangeX = -impulse * entityMass * normalX / metalMass;
    const metalVelChangeY = -impulse * entityMass * normalY / metalMass;
    
    // Update metal linear velocity
    this.vx += metalVelChangeX;
    this.vy += metalVelChangeY;
    
    // Calculate and apply torque to metal based on collision point
    const metalCenterX = this.x;
    const metalCenterY = this.y;
    const leverArmX = collisionPointX - metalCenterX;
    const leverArmY = collisionPointY - metalCenterY;
    
    // Force applied at collision point
    const forceX = -impulse * entityMass * normalX;
    const forceY = -impulse * entityMass * normalY;
    
    // Torque = lever arm × force (cross product in 2D)
    const torque = leverArmX * forceY - leverArmY * forceX;
    
    // Apply angular velocity (assuming metal has uniform density)
    const momentOfInertia = metalMass * length * length / 12; // Rod moment of inertia
    const angularImpulse = torque / Math.max(momentOfInertia, 1); // Prevent division by zero
    
    // Initialize angular velocity if not present
    if (this.angularVelocity === undefined) {
      this.angularVelocity = 0;
    }
    this.angularVelocity += angularImpulse * 0.1; // Scale for reasonable rotation
    
    // Apply angular damping
    this.angularVelocity *= 0.95;
    
    // Update enemy velocity if it has dx/dy properties
    if (enemy.dx !== undefined && enemy.dy !== undefined) {
      enemy.dx += entityVelChangeX * 60;
      enemy.dy += entityVelChangeY * 60;
    }
    
    // Apply velocity damping to prevent excessive speeds
    const metalSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (metalSpeed > 3.0) {
      this.vx = (this.vx / metalSpeed) * 3.0;
      this.vy = (this.vy / metalSpeed) * 3.0;
    }
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
        ctx.fillStyle = "#666666"; // Grayscale metallic color
        ctx.beginPath();
        ctx.moveTo(segment.x1 + perpX, segment.y1 + perpY);
        ctx.lineTo(segment.x2 + perpX, segment.y2 + perpY);
        ctx.lineTo(segment.x2 - perpX, segment.y2 - perpY);
        ctx.lineTo(segment.x1 - perpX, segment.y1 - perpY);
        ctx.closePath();
        ctx.fill();
        
        // Add darker outline for definition
        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Add metallic highlight on top edge
        ctx.fillStyle = "#aaaaaa"; // Lighter grayscale highlight
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