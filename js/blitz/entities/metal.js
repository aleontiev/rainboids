// Metal entity for Rainboids: Blitz
// Indestructible metal objects that bullets bounce off of and push the player

export class Metal {
  constructor(x, y, shape, isPortrait, game = null) {
    this.x = x;
    this.y = y;
    this.shape = shape; // "l" (long stick), "L" (capital L), or "T" (capital T)
    this.isPortrait = isPortrait;
    this.game = game;
    
    // Cache for rotated segments to avoid recomputation
    this._cachedRotatedSegments = null;
    this._lastRotation = null;
    this._lastX = null;
    this._lastY = null;
    
    // Variable size - small, medium, or large (50% larger)
    this.sizeMultiplier = 0.75 + Math.random() * 1.5; // 0.75x to 2.25x size (50% larger)
    const baseSize = game?.level?.config?.world?.metalSize || 60;
    this.size = baseSize * this.sizeMultiplier; // Base size for collision detection (50% larger)
    const baseThickness = game?.level?.config?.world?.metalThickness || 6;
    this.thickness = baseThickness + this.sizeMultiplier * 3; // Thinner lines (6-9 pixels, 50% larger)
    
    const baseSpeed = game?.level?.config?.world?.metalSpeed || 0.5;
    this.speed = baseSpeed + Math.random() * 1; // Slow movement
    this.rotationSpeed = (Math.random() - 0.5) * 0.02; // Slow rotation
    this.rotation = Math.random() * Math.PI * 2;
    
    // Generate the actual line segments based on shape
    this.segments = this.generateSegments();
    
    // Initial movement direction towards player side
    if (isPortrait) {
      this.vx = (Math.random() - 0.5) * 0.3; // Slight horizontal variation
      this.vy = this.speed; // Initial movement downward towards player
    } else {
      this.vx = -this.speed; // Initial movement leftward towards player
      this.vy = (Math.random() - 0.5) * 0.3; // Slight vertical variation
    }
    
    // Store initial movement as the base vector (no longer forced after impacts)
    this.baseMovementEnabled = true;
    
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
      
      // Apply initial movement only if no impacts have occurred
      if (this.baseMovementEnabled) {
        this.vy = this.speed; // Continue initial downward movement
      }
      
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
      
      // Apply initial movement only if no impacts have occurred
      if (this.baseMovementEnabled) {
        this.vx = -this.speed; // Continue initial leftward movement
      }
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

  // Get rotated segments for collision detection (cached)
  getRotatedSegments() {
    // Use cache if rotation and position haven't changed
    if (this._cachedRotatedSegments && 
        this._lastRotation === this.rotation && 
        this._lastX === this.x && 
        this._lastY === this.y) {
      return this._cachedRotatedSegments;
    }
    
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    
    this._cachedRotatedSegments = this.segments.map(segment => ({
      x1: this.x + (segment.x1 * cos - segment.y1 * sin),
      y1: this.y + (segment.x1 * sin + segment.y1 * cos),
      x2: this.x + (segment.x2 * cos - segment.y2 * sin),
      y2: this.y + (segment.x2 * sin + segment.y2 * cos)
    }));
    
    this._lastRotation = this.rotation;
    this._lastX = this.x;
    this._lastY = this.y;
    return this._cachedRotatedSegments;
  }

  // Check collision with a point (bullet) or line (laser)
  checkBulletCollision(bullet) {
    // Quick bounding box check first
    const bulletRadius = (bullet.size || 3) + this.thickness/2 + 2;
    const dx = Math.abs(bullet.x - this.x);
    const dy = Math.abs(bullet.y - this.y);
    const metalBounds = this.size + bulletRadius;
    
    if (dx > metalBounds || dy > metalBounds) {
      return null; // Skip expensive segment checks
    }
    
    const rotatedSegments = this.getRotatedSegments();
    
    for (const segment of rotatedSegments) {
      // Special handling for lasers - check if the laser line intersects with metal
      if (bullet.isPlayerLaser && bullet.length && bullet.length > 0) {
        // Calculate laser end point
        const laserEndX = bullet.x + Math.cos(bullet.angle) * bullet.length;
        const laserEndY = bullet.y + Math.sin(bullet.angle) * bullet.length;
        
        // Check if laser line intersects with metal segment
        if (this.lineIntersection(bullet.x, bullet.y, laserEndX, laserEndY, segment.x1, segment.y1, segment.x2, segment.y2)) {
          return segment;
        }
        
        // Also check for near-miss with laser width
        const laserWidth = bullet.width || 8;
        if (this.lineToLineDistance(bullet.x, bullet.y, laserEndX, laserEndY, segment.x1, segment.y1, segment.x2, segment.y2) < laserWidth/2 + this.thickness/2) {
          return segment;
        }
      } else {
        // Regular bullet collision (point-based)
        if (this.pointToLineDistance(bullet.x, bullet.y, segment) < (bullet.size || 3) + this.thickness/2 + 2) {
          return segment; // Return the segment that was hit
        }
      }
      
      // For fast-moving bullets (especially lasers), check continuous collision using trajectory
      if (bullet.dx !== undefined && bullet.dy !== undefined && (Math.abs(bullet.dx) > 0.1 || Math.abs(bullet.dy) > 0.1)) {
        // Calculate previous position based on velocity (dx/dy are pixels per second, so convert to per-frame)
        const frameVelocityX = bullet.dx / 60; // Convert from per-second to per-frame
        const frameVelocityY = bullet.dy / 60;
        const prevX = bullet.x - frameVelocityX;
        const prevY = bullet.y - frameVelocityY;
        
        // Check if the trajectory line intersects the metal segment
        if (this.lineIntersection(prevX, prevY, bullet.x, bullet.y, segment.x1, segment.y1, segment.x2, segment.y2)) {
          // Calculate intersection point to check if it's within bullet size tolerance
          const intersection = this.getLineIntersectionPoint(prevX, prevY, bullet.x, bullet.y, segment.x1, segment.y1, segment.x2, segment.y2);
          if (intersection) {
            // Check if intersection point is close enough considering bullet size
            const distanceToIntersection = Math.sqrt(
              Math.pow(bullet.x - intersection.x, 2) + Math.pow(bullet.y - intersection.y, 2)
            );
            if (distanceToIntersection <= bullet.size + this.thickness/2 + 2) {
              return segment;
            }
          }
        }
      }
    }
    return null;
  }

  // Check collision with player (circular)
  checkPlayerCollision(player) {
    const rotatedSegments = this.getRotatedSegments();
    
    for (const segment of rotatedSegments) {
      // Support both player (hitboxSize) and enemy (size) collision detection
      const entitySize = player.hitboxSize || player.size || player.radius || 10;
      if (this.pointToLineDistance(player.x, player.y, segment) < entitySize + this.thickness/2 + 3) {
        return segment;
      }
    }
    return null;
  }

  // Check collision with another metal object using segment-to-segment collision
  checkMetalCollision(otherMetal) {
    const mySegments = this.getRotatedSegments();
    const otherSegments = otherMetal.getRotatedSegments();
    
    let closestCollision = null;
    let minDistance = Infinity;
    
    // Check all segment pairs for collisions
    for (const mySegment of mySegments) {
      for (const otherSegment of otherSegments) {
        // Check if segments intersect
        const intersection = this.getLineIntersectionPoint(
          mySegment.x1, mySegment.y1, mySegment.x2, mySegment.y2,
          otherSegment.x1, otherSegment.y1, otherSegment.x2, otherSegment.y2
        );
        
        if (intersection) {
          return {
            segment: mySegment,
            otherSegment: otherSegment,
            distance: 0,
            intersecting: true,
            contactPoint: intersection,
            myContactPoint: intersection,
            otherContactPoint: intersection
          };
        }
        
        // Find closest contact points between segments
        const contactInfo = this.findContactPoints(mySegment, otherSegment);
        const collisionThreshold = (this.thickness + otherMetal.thickness) / 2 + 4; // Increased buffer
        
        if (contactInfo.distance < collisionThreshold && contactInfo.distance < minDistance) {
          minDistance = contactInfo.distance;
          closestCollision = {
            segment: mySegment,
            otherSegment: otherSegment,
            distance: contactInfo.distance,
            intersecting: false,
            myContactPoint: contactInfo.point1,
            otherContactPoint: contactInfo.point2,
            contactPoint: {
              x: (contactInfo.point1.x + contactInfo.point2.x) / 2,
              y: (contactInfo.point1.y + contactInfo.point2.y) / 2
            }
          };
        }
      }
    }
    
    return closestCollision;
  }

  // Find the closest contact points between two line segments
  findContactPoints(seg1, seg2) {
    // Find closest points on each segment to the other segment
    const point1OnSeg1 = this.getClosestPointOnSegment(seg1, (seg2.x1 + seg2.x2) / 2, (seg2.y1 + seg2.y2) / 2);
    const point2OnSeg2 = this.getClosestPointOnSegment(seg2, (seg1.x1 + seg1.x2) / 2, (seg1.y1 + seg1.y2) / 2);
    
    // Now find the actual closest points by checking all combinations
    const combinations = [
      { p1: this.getClosestPointOnSegment(seg1, seg2.x1, seg2.y1), p2: { x: seg2.x1, y: seg2.y1 } },
      { p1: this.getClosestPointOnSegment(seg1, seg2.x2, seg2.y2), p2: { x: seg2.x2, y: seg2.y2 } },
      { p1: { x: seg1.x1, y: seg1.y1 }, p2: this.getClosestPointOnSegment(seg2, seg1.x1, seg1.y1) },
      { p1: { x: seg1.x2, y: seg1.y2 }, p2: this.getClosestPointOnSegment(seg2, seg1.x2, seg1.y2) }
    ];
    
    let minDistance = Infinity;
    let bestP1 = point1OnSeg1;
    let bestP2 = point2OnSeg2;
    
    for (const combo of combinations) {
      const dx = combo.p1.x - combo.p2.x;
      const dy = combo.p1.y - combo.p2.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minDistance) {
        minDistance = distance;
        bestP1 = combo.p1;
        bestP2 = combo.p2;
      }
    }
    
    return {
      point1: bestP1,
      point2: bestP2,
      distance: minDistance
    };
  }

  // Calculate minimum distance between two line segments
  segmentToSegmentDistance(seg1, seg2) {
    // Check all endpoint combinations
    const distances = [
      this.pointToLineDistance(seg1.x1, seg1.y1, seg2),
      this.pointToLineDistance(seg1.x2, seg1.y2, seg2),
      this.pointToLineDistance(seg2.x1, seg2.y1, seg1),
      this.pointToLineDistance(seg2.x2, seg2.y2, seg1)
    ];
    
    return Math.min(...distances);
  }

  // Calculate optimal separation vector between two metals
  calculateSeparationVector(otherMetal, collisionInfo) {
    if (!collisionInfo) return { x: 0, y: 0, distance: 0 };
    
    const { segment, otherSegment, distance, intersecting } = collisionInfo;
    
    if (intersecting) {
      // If segments are intersecting, separate based on center-to-center vector
      const dx = this.x - otherMetal.x;
      const dy = this.y - otherMetal.y;
      const centerDistance = Math.sqrt(dx * dx + dy * dy);
      
      if (centerDistance > 0) {
        return {
          x: dx / centerDistance,
          y: dy / centerDistance,
          distance: centerDistance
        };
      } else {
        // Fallback for exactly overlapping centers
        return { x: 1, y: 0, distance: 0 };
      }
    }
    
    // Find the closest points on both segments
    const closestPoint1 = this.getClosestPointOnSegment(segment, otherMetal.x, otherMetal.y);
    const closestPoint2 = this.getClosestPointOnSegment(otherSegment, this.x, this.y);
    
    // Calculate separation vector from the closest points
    const dx = closestPoint1.x - closestPoint2.x;
    const dy = closestPoint1.y - closestPoint2.y;
    const pointDistance = Math.sqrt(dx * dx + dy * dy);
    
    if (pointDistance > 0) {
      return {
        x: dx / pointDistance,
        y: dy / pointDistance,
        distance: pointDistance
      };
    }
    
    // Fallback to center-based separation
    const centerDx = this.x - otherMetal.x;
    const centerDy = this.y - otherMetal.y;
    const centerDistance = Math.sqrt(centerDx * centerDx + centerDy * centerDy);
    
    if (centerDistance > 0) {
      return {
        x: centerDx / centerDistance,
        y: centerDy / centerDistance,
        distance: centerDistance
      };
    }
    
    return { x: 1, y: 0, distance: 0 };
  }

  // Get closest point on a line segment to a given point (optimized)
  getClosestPointOnSegment(segment, px, py) {
    const { x1, y1, x2, y2 } = segment;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    
    if (lengthSquared === 0) return { x: x1, y: y1 };
    
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
    return {
      x: x1 + t * dx,
      y: y1 + t * dy
    };
  }

  // Line intersection algorithm (used for continuous collision detection)
  lineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return false; // Lines are parallel

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  // Get the actual intersection point between two line segments
  getLineIntersectionPoint(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null; // Lines are parallel

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1)
      };
    }
    return null;
  }

  // Calculate distance from point to line segment (optimized)
  pointToLineDistance(px, py, segment) {
    const { x1, y1, x2, y2 } = segment;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    
    if (lengthSquared === 0) {
      const distanceSquared = (px - x1) * (px - x1) + (py - y1) * (py - y1);
      return Math.sqrt(distanceSquared);
    }
    
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    
    const distanceSquared = (px - closestX) * (px - closestX) + (py - closestY) * (py - closestY);
    return Math.sqrt(distanceSquared);
  }

  // Calculate bounce direction for bullets and apply momentum transfer to metal (optimized)
  calculateBounceDirection(bullet, segment) {
    const { x1, y1, x2, y2 } = segment;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    
    // Convert bullet angle/speed to velocity components
    const bulletVx = Math.cos(bullet.angle) * bullet.speed;
    const bulletVy = Math.sin(bullet.angle) * bullet.speed;
    
    if (lengthSquared === 0) return { 
      angle: bullet.angle + Math.PI,
      x: bullet.x + Math.cos(bullet.angle + Math.PI) * 5,
      y: bullet.y + Math.sin(bullet.angle + Math.PI) * 5
    };
    
    // Normal vector to the line (perpendicular) - avoid sqrt by using lengthSquared
    const length = Math.sqrt(lengthSquared);
    const nx = -dy / length;
    const ny = dx / length;
    
    // Make sure normal points away from incoming bullet
    const dotProduct = bulletVx * nx + bulletVy * ny;
    const normalX = dotProduct < 0 ? nx : -nx;
    const normalY = dotProduct < 0 ? ny : -ny;
    
    // Use new unified bullet collision physics
    const bounceResult = this.handleBulletCollision(bullet, segment);
    if (bounceResult && bounceResult.newAngle !== undefined) {
      return {
        angle: bounceResult.newAngle,
        x: bounceResult.newPosition.x,
        y: bounceResult.newPosition.y
      };
    }
    
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

  // Calculate collision normal pointing away from metal towards entity
  getCollisionNormal(entityX, entityY, segment) {
    const { x1, y1, x2, y2 } = segment;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return null;
    
    // Normal vector to the line (perpendicular)
    const nx = -dy / length;
    const ny = dx / length;
    
    // Make sure normal points towards the entity
    const deltaX = entityX - this.x;
    const deltaY = entityY - this.y;
    const dotProduct = deltaX * nx + deltaY * ny;
    
    return {
      x: dotProduct > 0 ? nx : -nx,
      y: dotProduct > 0 ? ny : -ny
    };
  }

  // Unified physics collision engine for metal with any entity
  applyUnifiedCollisionPhysics(entity, segment, options = {}) {
    const {
      entityMass = 1,
      metalMass = this.sizeMultiplier || 1,
      restitution = 0.7,
      torqueScale = 0.1,
      momentumTransferEnabled = true,
      reflectEntity = false // For bullets/lasers that should bounce
    } = options;

    const { x1, y1, x2, y2 } = segment;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);
    
    if (segmentLength === 0) return null;
    
    // Calculate collision normal
    const normal = this.getCollisionNormal(entity.x, entity.y, segment);
    if (!normal) return null;
    
    // Find exact contact point
    const t = Math.max(0, Math.min(1, 
      ((entity.x - x1) * dx + (entity.y - y1) * dy) / (segmentLength * segmentLength)
    ));
    const contactPointX = x1 + t * dx;
    const contactPointY = y1 + t * dy;
    
    // Get current velocities
    const entityVelX = (entity.vx || entity.dx/60 || 0);
    const entityVelY = (entity.vy || entity.dy/60 || 0);
    const metalVelX = this.vx || 0;
    const metalVelY = this.vy || 0;
    
    // Calculate relative velocity
    const relativeVelX = entityVelX - metalVelX;
    const relativeVelY = entityVelY - metalVelY;
    const relativeVelNormal = relativeVelX * normal.x + relativeVelY * normal.y;
    
    // Only apply physics if objects are moving towards each other
    if (relativeVelNormal < 0) return null;
    
    // Calculate collision impulse
    const impulse = (1 + restitution) * relativeVelNormal / (1/entityMass + 1/metalMass);
    const impulseX = impulse * normal.x;
    const impulseY = impulse * normal.y;
    
    let entityResult = null;
    
    if (momentumTransferEnabled) {
      // Apply velocity changes
      const entityVelChangeX = -(impulseX / entityMass);
      const entityVelChangeY = -(impulseY / entityMass);
      const metalVelChangeX = (impulseX / metalMass);
      const metalVelChangeY = (impulseY / metalMass);
      
      // Update metal velocity
      this.vx = metalVelX + metalVelChangeX;
      this.vy = metalVelY + metalVelChangeY;
      
      // Calculate torque on metal
      const leverArmX = contactPointX - this.x;
      const leverArmY = contactPointY - this.y;
      const torque = leverArmX * impulseY - leverArmY * impulseX;
      
      if (this.angularVelocity === undefined) {
        this.angularVelocity = 0;
      }
      
      const momentOfInertia = (metalMass * segmentLength * segmentLength) / 12;
      this.angularVelocity += (torque / Math.max(momentOfInertia, 1)) * torqueScale;
      this.angularVelocity *= 0.97; // Angular damping
      
      // Disable base movement
      this.baseMovementEnabled = false;
      
      // Prepare entity result
      entityResult = {
        velocityChange: {
          x: entityVelChangeX,
          y: entityVelChangeY
        },
        contactPoint: {
          x: contactPointX,
          y: contactPointY
        },
        normal: normal
      };
      
      // Handle entity reflection for projectiles
      if (reflectEntity) {
        const newEntityVelX = entityVelX + entityVelChangeX;
        const newEntityVelY = entityVelY + entityVelChangeY;
        
        entityResult.newVelocity = {
          x: newEntityVelX,
          y: newEntityVelY
        };
        
        if (entity.angle !== undefined) {
          entityResult.newAngle = Math.atan2(newEntityVelY, newEntityVelX);
        }
        
        // Push entity away from metal to prevent sticking
        const entitySize = entity.size || entity.radius || entity.hitboxSize || 5;
        const pushDistance = entitySize + this.thickness/2 + 3;
        entityResult.newPosition = {
          x: entity.x + normal.x * pushDistance,
          y: entity.y + normal.y * pushDistance
        };
      }
    }
    
    return entityResult;
  }

  // Handle bullet collision using unified physics (with bounce)
  handleBulletCollision(bullet, segment) {
    // Use simple reflection for reliable bullet bouncing
    const result = this.handleSimpleBulletBounce(bullet, segment);
    if (result) {
      // Also apply some physics to the metal for visual feedback
      const bulletVx = Math.cos(bullet.angle) * bullet.speed;
      const bulletVy = Math.sin(bullet.angle) * bullet.speed;
      
      const bulletEntity = {
        x: bullet.x,
        y: bullet.y,
        vx: bulletVx,
        vy: bulletVy,
        size: bullet.size,
        angle: bullet.angle
      };
      
      // Apply minimal physics to metal without affecting bullet bounce
      this.applyUnifiedCollisionPhysics(bulletEntity, segment, {
        entityMass: 0.8, // Bullets impact metal
        metalMass: (this.sizeMultiplier || 1) * 3, // Metal heavier
        restitution: 0.3, // Less bouncy for metal movement
        torqueScale: 0.08, // Some rotation from bullets
        momentumTransferEnabled: true,
        reflectEntity: false // Don't reflect, we handle that separately
      });
    }
    
    return result; // Return bounce information for bullet update
  }

  // Simple, reliable bullet bounce using reflection formula
  handleSimpleBulletBounce(bullet, segment) {
    const normal = this.getCollisionNormal(bullet.x, bullet.y, segment);
    if (!normal) return null;

    // Current bullet velocity components
    const vx = Math.cos(bullet.angle) * bullet.speed;
    const vy = Math.sin(bullet.angle) * bullet.speed;
    
    // Reflect velocity using: v' = v - 2(v·n)n
    const dotProduct = vx * normal.x + vy * normal.y;
    const reflectedVx = vx - 2 * dotProduct * normal.x;
    const reflectedVy = vy - 2 * dotProduct * normal.y;
    
    // Calculate new angle and maintain speed
    const newAngle = Math.atan2(reflectedVy, reflectedVx);
    
    // Push bullet away from metal to prevent sticking
    const pushDistance = (bullet.size || 3) + this.thickness/2 + 2;
    const newX = bullet.x + normal.x * pushDistance;
    const newY = bullet.y + normal.y * pushDistance;
    
    return {
      newAngle: newAngle,
      newPosition: { x: newX, y: newY },
      newVelocity: { x: reflectedVx, y: reflectedVy }
    };
  }

  // Handle asteroid collision using unified physics
  handleAsteroidCollision(asteroid, segment) {
    // Calculate collision normal
    const normal = this.getCollisionNormal(asteroid.x, asteroid.y, segment);
    if (!normal) return null;
    
    // Get asteroid velocity
    const asteroidVx = asteroid.vx || 0;
    const asteroidVy = asteroid.vy || 0;
    const asteroidSpeed = Math.sqrt(asteroidVx * asteroidVx + asteroidVy * asteroidVy);
    
    // Separate asteroid from metal to prevent overlap
    const separationDistance = (asteroid.size || asteroid.radius || 20) + this.thickness/2 + 2;
    asteroid.x += normal.x * separationDistance;
    asteroid.y += normal.y * separationDistance;
    
    // Make asteroid bounce off metal cleanly with reflection
    if (asteroidSpeed > 0.1) {
      // Reflect asteroid velocity: v' = v - 2(v·n)n
      const dotProduct = asteroidVx * normal.x + asteroidVy * normal.y;
      const reflectedVx = asteroidVx - 2 * dotProduct * normal.x;
      const reflectedVy = asteroidVy - 2 * dotProduct * normal.y;
      
      // Apply bounce with some energy loss
      const restitution = 0.8; // Clean bounce with slight energy loss
      asteroid.vx = reflectedVx * restitution;
      asteroid.vy = reflectedVy * restitution;
    }
    
    // Apply minimal force to metal (asteroids are heavy but metal should move a bit)
    const metalForce = Math.min(asteroidSpeed * 0.3, 2.0);
    this.vx = (this.vx || 0) + normal.x * metalForce * 0.2;
    this.vy = (this.vy || 0) + normal.y * metalForce * 0.2;
    
    // Disable metal base movement
    this.baseMovementEnabled = false;
    
    // Return contact point for visual effects
    return {
      contactPoint: {
        x: asteroid.x - normal.x * separationDistance * 0.5,
        y: asteroid.y - normal.y * separationDistance * 0.5
      },
      velocityChange: {
        x: 0, // Don't apply additional velocity change
        y: 0
      }
    };
  }

  // Handle laser collision - apply reduced momentum transfer to metal
  handleLaserCollision(laser, segment) {
    const laserVx = Math.cos(laser.angle) * laser.speed;
    const laserVy = Math.sin(laser.angle) * laser.speed;
    
    const laserEntity = {
      x: laser.x,
      y: laser.y,
      vx: laserVx,
      vy: laserVy,
      size: laser.size || 5,
      angle: laser.angle
    };
    
    // Lasers are fast but light - reduced momentum transfer to metal
    const result = this.applyUnifiedCollisionPhysics(laserEntity, segment, {
      entityMass: 0.1, // Much lighter than bullets (0.8) - less metal movement
      metalMass: (this.sizeMultiplier || 1) * 2, // Metal acts heavier against lasers
      restitution: 0.4, // Reduced bounce for metal movement (vs 0.3 for bullets)
      torqueScale: 0.05, // Reduced rotation from lasers  
      momentumTransferEnabled: true,
      reflectEntity: false // Don't reflect here - we handle that in calculateLaserBounceDirection
    });
    
    return result;
  }

  // Calculate bounce direction for lasers using simple reflection (same as bullets)
  calculateLaserBounceDirection(laser, segment) {
    const normal = this.getCollisionNormal(laser.x, laser.y, segment);
    if (!normal) {
      // Fallback to simple reversal if no normal
      return {
        vx: -Math.cos(laser.angle) * laser.speed,
        vy: -Math.sin(laser.angle) * laser.speed,
        angle: laser.angle + Math.PI,
        x: laser.x,
        y: laser.y,
        speed: laser.speed
      };
    }

    // Current laser velocity components
    const vx = Math.cos(laser.angle) * laser.speed;
    const vy = Math.sin(laser.angle) * laser.speed;
    
    // Reflect velocity using: v' = v - 2(v·n)n (same formula as bullets)
    const dotProduct = vx * normal.x + vy * normal.y;
    const reflectedVx = vx - 2 * dotProduct * normal.x;
    const reflectedVy = vy - 2 * dotProduct * normal.y;
    
    // Calculate new angle and maintain speed
    const newAngle = Math.atan2(reflectedVy, reflectedVx);
    
    // Push laser away from metal to prevent sticking
    const pushDistance = (laser.size || 5) + this.thickness/2 + 2;
    const newX = laser.x + normal.x * pushDistance;
    const newY = laser.y + normal.y * pushDistance;
    
    return {
      vx: reflectedVx,
      vy: reflectedVy,
      angle: newAngle,
      x: newX,
      y: newY,
      speed: laser.speed
    };
  }

  // Handle player collision with metal - realistic physics with proper mass ratios
  handlePlayerCollision(player, segment) {
    const { x1, y1, x2, y2 } = segment;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return;
    
    // Calculate collision normal pointing away from metal towards player
    const normal = this.getCollisionNormal(player.x, player.y, segment);
    if (!normal) return;
    
    // Get velocities - player uses vx/vy (px/frame), others use dx/dy (px/sec)
    const playerVelX = player.vx || 0; // Player already stores velocity in px/frame
    const playerVelY = player.vy || 0;
    const metalVelX = this.vx || 0;
    const metalVelY = this.vy || 0;
    
    // Calculate relative velocity to determine collision type
    const relativeVelX = playerVelX - metalVelX;
    const relativeVelY = playerVelY - metalVelY;
    const relativeVelNormal = relativeVelX * normal.x + relativeVelY * normal.y;
    
    // IMPORTANT: Only move the metal away from the player, never move the player
    const separationDistance = player.hitboxSize + this.thickness/2 + 3;
    this.x -= normal.x * separationDistance;
    this.y -= normal.y * separationDistance;
    
    // Disable metal base movement on any collision
    this.baseMovementEnabled = false;
    
    // Determine collision type and apply appropriate bounce
    const playerSpeed = Math.sqrt(playerVelX * playerVelX + playerVelY * playerVelY);
    const metalSpeed = Math.sqrt(metalVelX * metalVelX + metalVelY * metalVelY);
    
    if (relativeVelNormal > 0.1) {
      // Player is moving toward metal (player hits metal) - BIG BOUNCE
      const bounceStrength = Math.min(playerSpeed * 3.0, 10.0); // Cap max bounce
      
      // Bounce metal away from player with high force
      this.vx = -normal.x * bounceStrength * 0.8;
      this.vy = -normal.y * bounceStrength * 0.8;
      
      // Add some rotational spin proportional to player velocity
      if (this.angularVelocity === undefined) {
        this.angularVelocity = 0;
      }
      
      // Calculate contact point for torque
      const t = Math.max(0, Math.min(1, 
        ((player.x - x1) * dx + (player.y - y1) * dy) / (length * length)
      ));
      const contactPointX = x1 + t * dx;
      const contactPointY = y1 + t * dy;
      const leverArmX = contactPointX - this.x;
      const leverArmY = contactPointY - this.y;
      
      // Apply rotational force based on player movement
      const crossProduct = playerVelX * leverArmY - playerVelY * leverArmX;
      this.angularVelocity += crossProduct * 0.15; // Strong rotation for player hits
      
    } else if (metalSpeed > 0.5) {
      // Metal is moving toward stationary/slow player (metal hits player) - MINOR BOUNCE
      
      // Minor bounce - metal just stops and bounces back slightly
      const bounceStrength = Math.min(metalSpeed * 0.3, 2.0); // Much smaller bounce
      
      // Reflect metal velocity with reduced magnitude
      this.vx = -metalVelX * 0.4 - normal.x * bounceStrength * 0.2;
      this.vy = -metalVelY * 0.4 - normal.y * bounceStrength * 0.2;
      
      // Minimal rotation for metal-initiated collisions
      if (this.angularVelocity === undefined) {
        this.angularVelocity = 0;
      }
      this.angularVelocity *= 0.5; // Dampen existing rotation
      
    } else {
      // Low-velocity collision - metal just stops
      this.vx *= 0.1;
      this.vy *= 0.1;
      
      if (this.angularVelocity !== undefined) {
        this.angularVelocity *= 0.3;
      }
    }
    
    // Apply damping to prevent excessive movement
    this.vx *= 0.95;
    this.vy *= 0.95;
    if (this.angularVelocity !== undefined) {
      this.angularVelocity *= 0.97;
    }
  }

  // Handle metal-to-metal collision using precise contact points
  handleMetalCollision(otherMetal, collisionInfo) {
    if (!collisionInfo) return;
    
    // Use contact points for precise collision response
    const contactPoint = collisionInfo.contactPoint;
    const myContactPoint = collisionInfo.myContactPoint;
    const otherContactPoint = collisionInfo.otherContactPoint;
    
    // Calculate separation vector from contact points
    let separationX, separationY;
    
    if (collisionInfo.intersecting) {
      // For intersecting segments, use center-to-center separation
      separationX = this.x - otherMetal.x;
      separationY = this.y - otherMetal.y;
      const centerDistance = Math.sqrt(separationX * separationX + separationY * separationY);
      if (centerDistance > 0) {
        separationX /= centerDistance;
        separationY /= centerDistance;
      } else {
        separationX = 1;
        separationY = 0;
      }
    } else {
      // Use contact point separation vector
      separationX = myContactPoint.x - otherContactPoint.x;
      separationY = myContactPoint.y - otherContactPoint.y;
      const contactDistance = Math.sqrt(separationX * separationX + separationY * separationY);
      if (contactDistance > 0) {
        separationX /= contactDistance;
        separationY /= contactDistance;
      } else {
        // Fallback to center-to-center
        separationX = this.x - otherMetal.x;
        separationY = this.y - otherMetal.y;
        const centerDistance = Math.sqrt(separationX * separationX + separationY * separationY);
        if (centerDistance > 0) {
          separationX /= centerDistance;
          separationY /= centerDistance;
        } else {
          separationX = 1;
          separationY = 0;
        }
      }
    }
    
    // Calculate required separation distance
    const requiredDistance = (this.thickness + otherMetal.thickness) / 2 + 6; // Extra buffer
    
    // Calculate overlap
    let overlap = 0;
    if (collisionInfo.intersecting) {
      overlap = requiredDistance; // Force full separation for intersecting segments
    } else {
      overlap = Math.max(0, requiredDistance - collisionInfo.distance);
    }
    
    // Only proceed if there's actual overlap
    if (overlap <= 0) return;
    
    // Get current velocities
    const metal1VelX = this.vx || 0;
    const metal1VelY = this.vy || 0;
    const metal2VelX = otherMetal.vx || 0;
    const metal2VelY = otherMetal.vy || 0;
    
    // Calculate masses based on size
    const mass1 = Math.max(0.1, this.sizeMultiplier || 1);
    const mass2 = Math.max(0.1, otherMetal.sizeMultiplier || 1);
    const totalMass = mass1 + mass2;
    
    // Position correction - separate objects proportional to inverse mass
    const separationRatio1 = mass2 / totalMass;
    const separationRatio2 = mass1 / totalMass;
    
    // Apply strong separation with large safety buffer
    const safetySeparation = 10; // Large buffer to prevent re-collision
    const totalSeparation = overlap + safetySeparation;
    
    // Apply position correction immediately
    this.x += separationX * totalSeparation * separationRatio1;
    this.y += separationY * totalSeparation * separationRatio1;
    otherMetal.x -= separationX * totalSeparation * separationRatio2;
    otherMetal.y -= separationY * totalSeparation * separationRatio2;
    
    // Velocity-based collision response
    const relativeVelX = metal1VelX - metal2VelX;
    const relativeVelY = metal1VelY - metal2VelY;
    const relativeVelNormal = relativeVelX * separationX + relativeVelY * separationY;
    
    // Only apply velocity impulse if objects are approaching each other
    if (relativeVelNormal > 0) {
      const restitution = 0.85; // High bounce for metal-to-metal collisions
      const impulse = (1 + restitution) * relativeVelNormal / (1/mass1 + 1/mass2);
      
      // Apply impulse to velocities
      const impulseX = impulse * separationX;
      const impulseY = impulse * separationY;
      
      this.vx = metal1VelX - (impulseX / mass1);
      this.vy = metal1VelY - (impulseY / mass1);
      otherMetal.vx = metal2VelX + (impulseX / mass2);
      otherMetal.vy = metal2VelY + (impulseY / mass2);
      
      // Ensure minimum separation velocity to prevent sticking
      const minSeparationVel = 1.5;
      
      // Check current separation velocities
      const newSeparationVel1 = this.vx * separationX + this.vy * separationY;
      const newSeparationVel2 = otherMetal.vx * (-separationX) + otherMetal.vy * (-separationY);
      
      // Add minimum velocity if needed
      if (newSeparationVel1 < minSeparationVel) {
        const velocityDeficit = minSeparationVel - newSeparationVel1;
        this.vx += separationX * velocityDeficit;
        this.vy += separationY * velocityDeficit;
      }
      
      if (newSeparationVel2 < minSeparationVel) {
        const velocityDeficit = minSeparationVel - newSeparationVel2;
        otherMetal.vx -= separationX * velocityDeficit;
        otherMetal.vy -= separationY * velocityDeficit;
      }
    } else {
      // Objects are separating or stationary - add minimum separation velocity
      const minVel = 0.8;
      this.vx += separationX * minVel * separationRatio1;
      this.vy += separationY * minVel * separationRatio1;
      otherMetal.vx -= separationX * minVel * separationRatio2;
      otherMetal.vy -= separationY * minVel * separationRatio2;
    }
    
    // Both metals stop following base movement after collision
    this.baseMovementEnabled = false;
    otherMetal.baseMovementEnabled = false;
  }

  // Handle enemy collision with metal - enemies bounce off like players but with different mass
  handleEnemyCollision(enemy, segment) {
    const { x1, y1, x2, y2 } = segment;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return;
    
    // Calculate collision normal pointing away from metal towards enemy
    const normal = this.getCollisionNormal(enemy.x, enemy.y, segment);
    if (!normal) return;
    
    // Prevent pass-through: separate overlapping objects much more aggressively
    const enemySize = enemy.hitboxSize || enemy.radius || enemy.size || 15;
    const separationDistance = enemySize + this.thickness/2 + 5; // Increased separation
    
    // Get velocities
    const enemyVelX = (enemy.dx || 0) / 60; // Convert from px/sec to px/frame
    const enemyVelY = (enemy.dy || 0) / 60;
    const metalVelX = this.vx || 0;
    const metalVelY = this.vy || 0;
    
    // Enemies are lighter than metal for easier pushing
    const enemyMass = 3;   // Medium weight
    const metalMass = 5;   // Heavier than enemies
    const totalMass = enemyMass + metalMass;
    
    // Separate objects based on mass ratio - give enemy more separation to prevent pass-through
    const enemySeparationRatio = 0.8; // Enemy moves away more
    const metalSeparationRatio = 0.2;  // Metal moves less
    
    enemy.x += normal.x * separationDistance * enemySeparationRatio;
    enemy.y += normal.y * separationDistance * enemySeparationRatio;
    this.x -= normal.x * separationDistance * metalSeparationRatio;
    this.y -= normal.y * separationDistance * metalSeparationRatio;
    
    // Calculate bounce velocity for enemy using reflection
    const speed = Math.sqrt(enemyVelX * enemyVelX + enemyVelY * enemyVelY);
    if (speed > 0) {
      // Reflect enemy velocity: v' = v - 2(v·n)n
      const dotProduct = enemyVelX * normal.x + enemyVelY * normal.y;
      const reflectedVx = enemyVelX - 2 * dotProduct * normal.x;
      const reflectedVy = enemyVelY - 2 * dotProduct * normal.y;
      
      // Store original movement pattern if not already bouncing
      if (!enemy.originalMovementPattern) {
        // Use nested config structure
        const movement = enemy.config.movement || {};
        enemy.originalMovementPattern = movement.type || "straight";
        enemy.originalSpeed = enemy.speed;
      }
      
      // Set up bounce state
      enemy.movementPattern = "bouncing";
      enemy.bounceVelocityX = reflectedVx * 60; // Convert back to px/sec
      enemy.bounceVelocityY = reflectedVy * 60;
      enemy.bounceTimer = Math.random() * 60 + 30; // 0.5-1.5 seconds of bouncing
      enemy.bounceDecay = 0.98; // Gradual slowdown during bounce
    }
    
    // Apply momentum transfer to metal
    const relativeVelX = enemyVelX - metalVelX;
    const relativeVelY = enemyVelY - metalVelY;
    const relativeVelNormal = relativeVelX * normal.x + relativeVelY * normal.y;
    
    if (relativeVelNormal > 0) {
      const restitution = 0.3; // Less bouncy for metal movement
      const impulse = (1 + restitution) * relativeVelNormal / (1/enemyMass + 1/metalMass);
      
      const impulseX = impulse * normal.x;
      const impulseY = impulse * normal.y;
      
      // Update metal velocity
      this.vx = metalVelX + (impulseX / metalMass) * 1.5; // Some responsiveness
      this.vy = metalVelY + (impulseY / metalMass) * 1.5;
    }
    
    // Metal stops following base movement after enemy collision
    this.baseMovementEnabled = false;
  }

  // Legacy render method for backward compatibility
  render(ctx) {
    // If ctx looks like a Canvas 2D context, use Canvas rendering
    if (ctx && ctx.fillStyle !== undefined) {
      return this.renderCanvas(ctx);
    } else if (ctx && ctx.scene !== undefined) {
      // If ctx has scene (WebGL context object), use WebGL rendering
      return this.renderWebGL(ctx.scene, ctx.materials);
    } else {
      // Fallback to Canvas with basic context
      return this.renderCanvas(ctx);
    }
  }

  renderCanvas(ctx) {
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

  renderWebGL(scene, materials) {
    // Create unique mesh name for this metal object
    const meshName = `metal_${this.id || Math.random().toString(36)}`;
    let metalGroup = scene.getObjectByName(meshName);
    
    if (!metalGroup) {
      // Create a group to hold all metal segments
      metalGroup = new THREE.Group();
      metalGroup.name = meshName;
      metalGroup.userData = { isDynamic: true, entityType: 'metal' };
      scene.add(metalGroup);
    }
    
    // Clear previous segments
    while (metalGroup.children.length > 0) {
      metalGroup.remove(metalGroup.children[0]);
    }
    
    // Create 3D geometry for each segment
    this.segments.forEach((segment, index) => {
      const dx = segment.x2 - segment.x1;
      const dy = segment.y2 - segment.y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length > 0) {
        // Create box geometry for each metal segment
        const geometry = new THREE.BoxGeometry(length, this.thickness, this.thickness);
        
        // Create metallic material with reflective properties
        const material = new THREE.MeshBasicMaterial({
          color: 0x666666,
          transparent: false,
          opacity: 1.0
        });
        
        const segmentMesh = new THREE.Mesh(geometry, material);
        
        // Position segment at its center
        const centerX = (segment.x1 + segment.x2) / 2;
        const centerY = (segment.y1 + segment.y2) / 2;
        
        // Calculate rotation angle for the segment
        const segmentAngle = Math.atan2(dy, dx);
        
        segmentMesh.position.set(centerX, -centerY, 0);
        segmentMesh.rotation.z = -segmentAngle;
        
        // Add metallic reflection effect
        material.emissive.setHex(0x111111);
        
        // Add slight animated shine effect
        const shinePhase = (Date.now() * 0.001 + index * 0.5) % (Math.PI * 2);
        const shineIntensity = 0.1 + 0.05 * Math.sin(shinePhase);
        material.emissive.addScalar(shineIntensity);
        
        metalGroup.add(segmentMesh);
      }
    });
    
    // Update position and rotation of the entire group
    metalGroup.position.set(this.x, -this.y, 0);
    metalGroup.rotation.z = -this.rotation;
  }

  // Helper method: Calculate minimum distance between two line segments
  lineToLineDistance(x1, y1, x2, y2, x3, y3, x4, y4) {
    // Calculate distance between two line segments
    // This is a simplified version - for precise collision we could use more complex algorithms
    
    // Check if lines intersect (distance = 0)
    if (this.lineIntersection(x1, y1, x2, y2, x3, y3, x4, y4)) {
      return 0;
    }
    
    // Calculate distances from each point to the other line
    const d1 = this.pointToLineSegmentDistance(x1, y1, x3, y3, x4, y4);
    const d2 = this.pointToLineSegmentDistance(x2, y2, x3, y3, x4, y4);
    const d3 = this.pointToLineSegmentDistance(x3, y3, x1, y1, x2, y2);
    const d4 = this.pointToLineSegmentDistance(x4, y4, x1, y1, x2, y2);
    
    return Math.min(d1, d2, d3, d4);
  }

  // Helper method: Calculate distance from a point to a line segment
  pointToLineSegmentDistance(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) {
      // Line segment is a point
      return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
    }
    
    // Calculate projection parameter
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length)));
    
    // Find closest point on line segment
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    
    // Return distance to closest point
    return Math.sqrt((px - closestX) * (px - closestX) + (py - closestY) * (py - closestY));
  }
}
