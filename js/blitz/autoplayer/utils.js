import { GAME_CONFIG } from "../constants.js";

/**
 * AutoplayerUtils - Common utility functions for the autoplayer system
 */
export class AutoplayerUtils {
  /**
   * Calculate distance between two points
   */
  static calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  /**
   * Normalize a vector
   */
  static normalizeVector(x, y) {
    const magnitude = Math.sqrt(x * x + y * y);
    if (magnitude === 0) return { x: 0, y: 0 };
    return { x: x / magnitude, y: y / magnitude };
  }

  /**
   * Calculate angle between two points
   */
  static calculateAngle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
  }

  /**
   * Check if a point is within screen bounds
   */
  static isWithinScreenBounds(x, y, margin = 0) {
    return x >= margin && 
           x <= window.innerWidth - margin && 
           y >= margin && 
           y <= window.innerHeight - margin;
  }

  /**
   * Clamp a value between min and max
   */
  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Linear interpolation between two values
   */
  static lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * Check if two circles intersect
   */
  static circlesIntersect(x1, y1, r1, x2, y2, r2) {
    const distance = this.calculateDistance(x1, y1, x2, y2);
    return distance <= (r1 + r2);
  }

  /**
   * Get the perpendicular vector to a given vector
   */
  static getPerpendicularVector(x, y) {
    return { x: -y, y: x };
  }

  /**
   * Calculate dot product of two vectors
   */
  static dotProduct(x1, y1, x2, y2) {
    return x1 * x2 + y1 * y2;
  }

  /**
   * Calculate cross product of two vectors (2D)
   */
  static crossProduct(x1, y1, x2, y2) {
    return x1 * y2 - y1 * x2;
  }

  /**
   * Rotate a vector by an angle
   */
  static rotateVector(x, y, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: x * cos - y * sin,
      y: x * sin + y * cos
    };
  }

  /**
   * Get screen center position
   */
  static getScreenCenter() {
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    };
  }

  /**
   * Get safe zone boundaries (area away from screen edges)
   */
  static getSafeZoneBounds(margin = 80) {
    return {
      left: margin,
      right: window.innerWidth - margin,
      top: margin,
      bottom: window.innerHeight - margin
    };
  }

  /**
   * Check if a point is in a corner of the screen
   */
  static isInCorner(x, y, cornerSize = 100) {
    const nearLeft = x < cornerSize;
    const nearRight = x > window.innerWidth - cornerSize;
    const nearTop = y < cornerSize;
    const nearBottom = y > window.innerHeight - cornerSize;
    
    return (nearLeft || nearRight) && (nearTop || nearBottom);
  }

  /**
   * Get the closest point on a line segment to a given point
   */
  static getClosestPointOnLineSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return { x: x1, y: y1 };
    
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length)));
    
    return {
      x: x1 + t * dx,
      y: y1 + t * dy
    };
  }

  /**
   * Generate random direction vector
   */
  static getRandomDirection() {
    const angle = Math.random() * Math.PI * 2;
    return {
      x: Math.cos(angle),
      y: Math.sin(angle)
    };
  }

  /**
   * Smoothly interpolate between two angles
   */
  static lerpAngle(a, b, t) {
    let diff = b - a;
    
    // Take the shorter path around the circle
    if (diff > Math.PI) {
      diff -= 2 * Math.PI;
    } else if (diff < -Math.PI) {
      diff += 2 * Math.PI;
    }
    
    return a + diff * t;
  }

  /**
   * Calculate the reflection of a vector off a surface with given normal
   */
  static reflect(vx, vy, nx, ny) {
    const dot = 2 * (vx * nx + vy * ny);
    return {
      x: vx - dot * nx,
      y: vy - dot * ny
    };
  }

  /**
   * Calculate weighted average of multiple vectors
   */
  static weightedVectorAverage(vectors) {
    if (vectors.length === 0) return { x: 0, y: 0 };
    
    let totalWeight = 0;
    let weightedX = 0;
    let weightedY = 0;
    
    for (const vector of vectors) {
      const weight = vector.weight || 1;
      totalWeight += weight;
      weightedX += vector.x * weight;
      weightedY += vector.y * weight;
    }
    
    if (totalWeight === 0) return { x: 0, y: 0 };
    
    return {
      x: weightedX / totalWeight,
      y: weightedY / totalWeight
    };
  }

  /**
   * Check if a point is inside a polygon (using ray casting algorithm)
   */
  static isPointInPolygon(x, y, polygon) {
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  /**
   * Calculate the area of a polygon
   */
  static calculatePolygonArea(polygon) {
    let area = 0;
    
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      area += polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
    }
    
    return Math.abs(area) / 2;
  }

  /**
   * Get the centroid of a polygon
   */
  static getPolygonCentroid(polygon) {
    let x = 0;
    let y = 0;
    
    for (const point of polygon) {
      x += point.x;
      y += point.y;
    }
    
    return {
      x: x / polygon.length,
      y: y / polygon.length
    };
  }

  /**
   * Generate a spiral pattern of points
   */
  static generateSpiralPattern(centerX, centerY, radius, points) {
    const pattern = [];
    const angleStep = (Math.PI * 2) / points;
    
    for (let i = 0; i < points; i++) {
      const angle = i * angleStep;
      const spiralRadius = radius * (i / points);
      
      pattern.push({
        x: centerX + Math.cos(angle) * spiralRadius,
        y: centerY + Math.sin(angle) * spiralRadius
      });
    }
    
    return pattern;
  }

  /**
   * Calculate bezier curve point
   */
  static calculateBezierPoint(t, p0, p1, p2, p3) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;
    
    return {
      x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
      y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
    };
  }

  /**
   * Convert degrees to radians
   */
  static degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert radians to degrees
   */
  static radiansToDegrees(radians) {
    return radians * (180 / Math.PI);
  }

  /**
   * Generate a hash code for a string
   */
  static hashCode(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash;
  }

  /**
   * Format a number with leading zeros
   */
  static padNumber(num, digits) {
    return num.toString().padStart(digits, '0');
  }

  /**
   * Deep copy an object
   */
  static deepCopy(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepCopy(item));
    if (typeof obj === 'object') {
      const copy = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          copy[key] = this.deepCopy(obj[key]);
        }
      }
      return copy;
    }
  }
}