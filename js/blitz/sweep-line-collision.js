// Sweep-line collision detection for complex polygon shapes
// Optimized for real-time game collision detection between circles and custom SVG paths
// Based on concepts from Bentley-Ottmann algorithm but simplified for performance

export class SweepLineCollisionDetector {
  constructor() {
    // Event queue for sweep line events
    this.eventQueue = [];
    // Active segments currently intersecting sweep line
    this.activeSegments = new Set();
  }

  // Main method: Check if a circle intersects with a polygon defined by line segments
  checkCirclePolygonCollision(circle, polygon) {
    // Early exit for simple cases
    if (!polygon.segments || polygon.segments.length === 0) {
      return false;
    }

    // Use AABB (Axis-Aligned Bounding Box) pre-check for performance
    if (!this.checkAABBIntersection(circle, polygon.boundingBox)) {
      return false;
    }

    // For small polygons (< 8 segments), use traditional method for better performance
    if (polygon.segments.length < 8) {
      return this.checkCirclePolygonTraditional(circle, polygon.segments);
    }

    // Use sweep-line algorithm for complex polygons
    return this.checkCirclePolygonSweepLine(circle, polygon);
  }

  // Check if circle's AABB intersects with polygon's AABB
  checkAABBIntersection(circle, boundingBox) {
    if (!boundingBox) return true; // No bounding box, assume intersection possible

    const circleLeft = circle.x - circle.radius;
    const circleRight = circle.x + circle.radius;
    const circleTop = circle.y - circle.radius;
    const circleBottom = circle.y + circle.radius;

    return !(circleRight < boundingBox.minX || 
             circleLeft > boundingBox.maxX || 
             circleBottom < boundingBox.minY || 
             circleTop > boundingBox.maxY);
  }

  // Traditional O(n) collision detection for small polygons
  checkCirclePolygonTraditional(circle, segments) {
    // Check if circle center is inside polygon using ray casting
    if (this.pointInPolygon(circle.x, circle.y, segments)) {
      return true;
    }

    // Check if circle intersects any segment
    for (const segment of segments) {
      if (this.circleSegmentIntersection(circle, segment)) {
        return true;
      }
    }

    return false;
  }

  // Sweep-line collision detection for complex polygons
  checkCirclePolygonSweepLine(circle, polygon) {
    // Create sweep line events from circle bounds and polygon segments
    this.initializeSweepLine(circle, polygon.segments);

    // Sweep from left to right
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      
      if (this.processSweepEvent(event, circle)) {
        return true; // Collision detected
      }
    }

    return false;
  }

  // Initialize sweep line with events
  initializeSweepLine(circle, segments) {
    this.eventQueue = [];
    this.activeSegments.clear();

    const circleLeft = circle.x - circle.radius;
    const circleRight = circle.x + circle.radius;

    // Add circle boundary events
    this.eventQueue.push({
      x: circleLeft,
      type: 'circle_start',
      circle: circle
    });
    this.eventQueue.push({
      x: circleRight,
      type: 'circle_end',
      circle: circle
    });

    // Add segment events
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const leftX = Math.min(segment.x1, segment.x2);
      const rightX = Math.max(segment.x1, segment.x2);

      // Only process segments that could intersect with circle's X range
      if (rightX >= circleLeft && leftX <= circleRight) {
        this.eventQueue.push({
          x: leftX,
          type: 'segment_start',
          segment: segment,
          segmentIndex: i
        });
        this.eventQueue.push({
          x: rightX,
          type: 'segment_end',
          segment: segment,
          segmentIndex: i
        });
      }
    }

    // Sort events by x-coordinate
    this.eventQueue.sort((a, b) => {
      if (a.x !== b.x) return a.x - b.x;
      // Handle tie-breaking: process segment_start before circle, circle before segment_end
      const typeOrder = { 'segment_start': 0, 'circle_start': 1, 'circle_end': 2, 'segment_end': 3 };
      return typeOrder[a.type] - typeOrder[b.type];
    });
  }

  // Process a sweep line event
  processSweepEvent(event, circle) {
    switch (event.type) {
      case 'circle_start':
        // Circle starts - check all active segments for intersection
        for (const segment of this.activeSegments) {
          if (this.circleSegmentIntersection(circle, segment)) {
            return true;
          }
        }
        break;

      case 'circle_end':
        // Circle ends - no more intersection checks needed
        break;

      case 'segment_start':
        // Segment starts - add to active segments and check if circle is active
        this.activeSegments.add(event.segment);
        if (event.x >= circle.x - circle.radius && event.x <= circle.x + circle.radius) {
          if (this.circleSegmentIntersection(circle, event.segment)) {
            return true;
          }
        }
        break;

      case 'segment_end':
        // Segment ends - remove from active segments
        this.activeSegments.delete(event.segment);
        break;
    }

    return false;
  }

  // Check if a point is inside a polygon using ray casting algorithm
  pointInPolygon(px, py, segments) {
    let inside = false;
    
    for (const segment of segments) {
      const x1 = segment.x1, y1 = segment.y1;
      const x2 = segment.x2, y2 = segment.y2;
      
      if (((y1 > py) !== (y2 > py)) &&
          (px < (x2 - x1) * (py - y1) / (y2 - y1) + x1)) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  // Check if a circle intersects with a line segment
  circleSegmentIntersection(circle, segment) {
    const cx = circle.x, cy = circle.y, r = circle.radius;
    const x1 = segment.x1, y1 = segment.y1;
    const x2 = segment.x2, y2 = segment.y2;

    // Vector from segment start to end
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    // Vector from segment start to circle center
    const fx = x1 - cx;
    const fy = y1 - cy;
    
    // Quadratic equation coefficients for line-circle intersection
    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = (fx * fx + fy * fy) - r * r;
    
    const discriminant = b * b - 4 * a * c;
    
    // No intersection if discriminant is negative
    if (discriminant < 0) {
      return false;
    }
    
    // Calculate intersection parameters
    const sqrt_discriminant = Math.sqrt(discriminant);
    const t1 = (-b - sqrt_discriminant) / (2 * a);
    const t2 = (-b + sqrt_discriminant) / (2 * a);
    
    // Check if intersection occurs within the line segment (t between 0 and 1)
    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
  }

  // Convert Path2D to line segments for collision detection
  static pathToSegments(path2d, transform = null) {
    // This is a complex operation that would require parsing the Path2D
    // For now, we'll provide a method that can be extended later
    console.warn('Path2D to segments conversion not yet implemented');
    return { segments: [], boundingBox: null };
  }

  // Convert SVG path string to line segments
  static svgPathToSegments(pathString, transform = null) {
    const segments = [];
    let currentX = 0, currentY = 0;
    let startX = 0, startY = 0;
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    // Simple SVG path parser - handles M, L, H, V, Z commands
    const commands = pathString.match(/[MLHVZ][^MLHVZ]*/gi) || [];
    
    for (const command of commands) {
      const type = command[0].toUpperCase();
      const args = command.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
      
      switch (type) {
        case 'M': // Move to
          if (args.length >= 2) {
            currentX = args[0];
            currentY = args[1];
            startX = currentX;
            startY = currentY;
          }
          break;
          
        case 'L': // Line to
          if (args.length >= 2) {
            const newX = args[0];
            const newY = args[1];
            segments.push({
              x1: currentX, y1: currentY,
              x2: newX, y2: newY
            });
            currentX = newX;
            currentY = newY;
          }
          break;
          
        case 'H': // Horizontal line
          if (args.length >= 1) {
            const newX = args[0];
            segments.push({
              x1: currentX, y1: currentY,
              x2: newX, y2: currentY
            });
            currentX = newX;
          }
          break;
          
        case 'V': // Vertical line
          if (args.length >= 1) {
            const newY = args[0];
            segments.push({
              x1: currentX, y1: currentY,
              x2: currentX, y2: newY
            });
            currentY = newY;
          }
          break;
          
        case 'Z': // Close path
          if (currentX !== startX || currentY !== startY) {
            segments.push({
              x1: currentX, y1: currentY,
              x2: startX, y2: startY
            });
          }
          currentX = startX;
          currentY = startY;
          break;
      }
    }

    // Calculate bounding box from segments
    segments.forEach(segment => {
      minX = Math.min(minX, segment.x1, segment.x2);
      maxX = Math.max(maxX, segment.x1, segment.x2);
      minY = Math.min(minY, segment.y1, segment.y2);
      maxY = Math.max(maxY, segment.y1, segment.y2);
    });

    // Apply transform if provided
    if (transform) {
      segments.forEach(segment => {
        const p1 = this.applyTransform(segment.x1, segment.y1, transform);
        const p2 = this.applyTransform(segment.x2, segment.y2, transform);
        segment.x1 = p1.x; segment.y1 = p1.y;
        segment.x2 = p2.x; segment.y2 = p2.y;
      });
    }

    const boundingBox = {
      minX: minX === Infinity ? 0 : minX,
      maxX: maxX === -Infinity ? 0 : maxX,
      minY: minY === Infinity ? 0 : minY,
      maxY: maxY === -Infinity ? 0 : maxY
    };

    return { segments, boundingBox };
  }

  // Apply 2D transformation to a point
  static applyTransform(x, y, transform) {
    const { translateX = 0, translateY = 0, scaleX = 1, scaleY = 1, rotation = 0 } = transform;
    
    // Apply scaling
    let tx = x * scaleX;
    let ty = y * scaleY;
    
    // Apply rotation
    if (rotation !== 0) {
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const rotatedX = tx * cos - ty * sin;
      const rotatedY = tx * sin + ty * cos;
      tx = rotatedX;
      ty = rotatedY;
    }
    
    // Apply translation
    tx += translateX;
    ty += translateY;
    
    return { x: tx, y: ty };
  }

  // Create a polygon from a simple shape (for testing)
  static createSimplePolygon(shape, x, y, size, rotation = 0) {
    const segments = [];
    
    switch (shape) {
      case 'triangle':
        const points = [
          { x: size, y: 0 },
          { x: -size * 0.5, y: -size * 0.5 },
          { x: -size * 0.5, y: size * 0.5 }
        ];
        
        for (let i = 0; i < points.length; i++) {
          const current = points[i];
          const next = points[(i + 1) % points.length];
          
          // Apply rotation and translation
          const transform = { translateX: x, translateY: y, rotation };
          const p1 = this.applyTransform(current.x, current.y, transform);
          const p2 = this.applyTransform(next.x, next.y, transform);
          
          segments.push({
            x1: p1.x, y1: p1.y,
            x2: p2.x, y2: p2.y
          });
        }
        break;
        
      case 'rectangle':
        const halfWidth = size * 0.6;
        const halfHeight = size * 0.6;
        const corners = [
          { x: -halfWidth, y: -halfHeight },
          { x: halfWidth, y: -halfHeight },
          { x: halfWidth, y: halfHeight },
          { x: -halfWidth, y: halfHeight }
        ];
        
        for (let i = 0; i < corners.length; i++) {
          const current = corners[i];
          const next = corners[(i + 1) % corners.length];
          
          const transform = { translateX: x, translateY: y, rotation };
          const p1 = this.applyTransform(current.x, current.y, transform);
          const p2 = this.applyTransform(next.x, next.y, transform);
          
          segments.push({
            x1: p1.x, y1: p1.y,
            x2: p2.x, y2: p2.y
          });
        }
        break;
    }

    // Calculate bounding box
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    segments.forEach(segment => {
      minX = Math.min(minX, segment.x1, segment.x2);
      maxX = Math.max(maxX, segment.x1, segment.x2);
      minY = Math.min(minY, segment.y1, segment.y2);
      maxY = Math.max(maxY, segment.y1, segment.y2);
    });

    const boundingBox = {
      minX: minX === Infinity ? x - size : minX,
      maxX: maxX === -Infinity ? x + size : maxX,
      minY: minY === Infinity ? y - size : minY,
      maxY: maxY === -Infinity ? y + size : maxY
    };

    return { segments, boundingBox };
  }
}

// Create a singleton instance for global use
export const sweepLineDetector = new SweepLineCollisionDetector();