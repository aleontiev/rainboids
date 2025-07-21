// ContinuousLaserBeam entity for Rainboids: Blitz
// A continuous sweeping laser beam that extends to screen edges and reflects off metal

export class ContinuousLaserBeam {
  constructor(x, y, initialAngle, isPortrait) {
    // Origin point (boss arm position) - will be updated each frame
    this.originX = x;
    this.originY = y;
    
    // Screen orientation
    this.isPortrait = isPortrait;
    
    // Movement pattern properties - clockwise bi-directional sweep
    this.sweepDirection = 1; // Start clockwise (+1)
    this.startAngle = isPortrait ? 0 : Math.PI/2; // Start pointing right (portrait) or down (landscape)
    this.endAngle = isPortrait ? Math.PI : -Math.PI/2; // End pointing left (portrait) or up (landscape)
    this.angle = this.startAngle; // Start at initial angle
    this.rotationSpeed = 0.004; // Sweep speed (reduced from 0.008 for slower movement)
    this.totalSweepAngle = isPortrait ? Math.PI : Math.PI; // 180 degree sweep
    this.sweepProgress = 0; // 0 to 1 progress through current sweep
    this.currentSweep = 1; // Track which sweep we're on (1 or 2)
    this.maxSweeps = 2; // Total number of sweeps before ending
    
    // Periodic on/off pattern (in degrees) - longer off intervals
    this.firePattern = [
      { type: "on", degrees: 8 },
      { type: "off", degrees: 20 },
      { type: "on", degrees: 10 },
      { type: "off", degrees: 18 },
      { type: "on", degrees: 6 },
      { type: "off", degrees: 22 },
      { type: "on", degrees: 12 },
      { type: "off", degrees: 16 },
      { type: "on", degrees: 8 },
      { type: "off", degrees: 24 },
      { type: "on", degrees: 10 },
      { type: "off", degrees: 20 },
      { type: "on", degrees: 14 },
      { type: "off", degrees: 18 },
      { type: "on", degrees: 6 },
      { type: "off", degrees: 22 },
      { type: "on", degrees: 10 },
      { type: "off", degrees: 26 },
      { type: "on", degrees: 12 },
      { type: "off", degrees: 20 },
      { type: "on", degrees: 8 },
      { type: "off", degrees: 24 },
      { type: "on", degrees: 16 },
      { type: "off", degrees: 18 }
    ];
    this.currentPatternIndex = 0;
    this.degreesInCurrentSegment = 0;
    this.totalDegreesSinceStart = 0;
    
    // Beam visual properties
    this.width = 16;
    this.color = "#ff4400";
    this.glowColor = "#ff8800";
    this.intensity = 1.0;
    
    // State management
    this.state = "charging"; // charging, sweeping
    this.chargeTime = 0;
    this.maxChargeTime = 120; // 2 seconds at 60fps
    this.isLaserActive = false; // Whether laser is currently firing
    this.isLaserCharging = false; // Whether laser is about to fire
    
    // Warning system for laser firing
    this.warningTimer = 0;
    this.warningDuration = 30; // 0.5 seconds warning before firing
    this.warningActive = false;
    
    // Beam segments (for collision and rendering)
    this.segments = [];
    this.maxLength = Math.max(window.innerWidth, window.innerHeight) * 1.5;
    
    // Collision tracking
    this.hitEntities = new Set(); // Track entities hit this frame to avoid multiple hits
    
    // Visual effects
    this.chargeIntensity = 0;
    this.glowPulse = 0;
  }

  getCurrentPatternSegment() {
    return this.firePattern[this.currentPatternIndex];
  }

  getUpcomingPatternSegment() {
    const nextIndex = (this.currentPatternIndex + 1) % this.firePattern.length;
    return this.firePattern[nextIndex];
  }

  updateOrigin(x, y) {
    // Update the laser origin to match the cannon position
    this.originX = x;
    this.originY = y;
  }

  update(slowdownFactor = 1.0, metals = [], playerX = 0, playerY = 0) {
    this.glowPulse += 0.1 * slowdownFactor;
    
    switch (this.state) {
      case "charging":
        this.chargeTime += slowdownFactor;
        this.chargeIntensity = Math.min(1.0, this.chargeTime / this.maxChargeTime);
        
        if (this.chargeTime >= this.maxChargeTime) {
          this.state = "sweeping";
          this.currentPatternIndex = 0;
          this.degreesInCurrentSegment = 0;
          this.totalDegreesSinceStart = 0;
        }
        break;
        
      case "sweeping":
        // Smooth bi-directional rotation
        const rotationThisFrame = this.rotationSpeed * this.sweepDirection * slowdownFactor;
        this.angle += rotationThisFrame;
        
        // Convert rotation to degrees for pattern tracking
        const degreesThisFrame = Math.abs(rotationThisFrame) * (180 / Math.PI);
        this.degreesInCurrentSegment += degreesThisFrame;
        this.totalDegreesSinceStart += degreesThisFrame;
        
        // Check if we've reached the boundary of current sweep
        let reachedBoundary = false;
        
        if (this.sweepDirection === 1) {
          // Moving clockwise - check if we've reached the end
          if (this.isPortrait) {
            // Portrait: clockwise from 0 (right) to π (left)
            reachedBoundary = this.angle >= this.endAngle;
          } else {
            // Landscape: clockwise from π/2 (down) through 0 to -π/2 (up)
            // Since we cross from positive to negative, check if angle has wrapped around
            reachedBoundary = this.angle <= this.endAngle && this.angle < this.startAngle;
          }
        } else {
          // Moving counter-clockwise - check if we've reached the start
          if (this.isPortrait) {
            // Portrait: counter-clockwise from π (left) back to 0 (right)
            reachedBoundary = this.angle <= this.startAngle;
          } else {
            // Landscape: counter-clockwise from -π/2 (up) through 0 back to π/2 (down)
            reachedBoundary = this.angle >= this.startAngle;
          }
        }
        
        if (reachedBoundary) {
          // Clamp angle to boundary
          if (this.sweepDirection === 1) {
            this.angle = this.endAngle;
          } else {
            this.angle = this.startAngle;
          }
          
          // Check if we've completed all sweeps
          if (this.currentSweep >= this.maxSweeps) {
            // All sweeps complete, laser should expire
            return false;
          } else {
            // Reverse direction for next sweep
            this.sweepDirection *= -1;
            this.currentSweep++;
            console.log(`Boss laser starting sweep ${this.currentSweep} of ${this.maxSweeps}, direction: ${this.sweepDirection > 0 ? 'clockwise' : 'counter-clockwise'}`);
          }
        }
        
        // Update pattern state
        this.updatePatternState();
        
        // Update beam segments only if laser is active
        if (this.isLaserActive) {
          this.calculateBeamSegments(metals);
          this.intensity = 1.0;
        } else {
          this.segments = []; // Clear segments when laser is off
          this.intensity = 0.0;
        }
        
        break;
    }
    
    return true; // Continue existing
  }

  updatePatternState() {
    const currentSegment = this.getCurrentPatternSegment();
    
    // Check if we've completed the current pattern segment
    if (this.degreesInCurrentSegment >= currentSegment.degrees) {
      // Move to next pattern segment
      this.currentPatternIndex = (this.currentPatternIndex + 1) % this.firePattern.length;
      this.degreesInCurrentSegment = 0;
      
      // Reset warning state when transitioning
      this.warningActive = false;
      this.warningTimer = 0;
    }
    
    // Update laser state based on current pattern
    const newSegment = this.getCurrentPatternSegment();
    this.isLaserActive = (newSegment.type === "on");
    
    // Handle warning system for upcoming "on" segments
    if (!this.isLaserActive) {
      const upcomingSegment = this.getUpcomingPatternSegment();
      const remainingDegrees = newSegment.degrees - this.degreesInCurrentSegment;
      const warningThreshold = 3; // Start warning 3 degrees before firing
      
      if (upcomingSegment.type === "on" && remainingDegrees <= warningThreshold) {
        this.warningActive = true;
        this.warningTimer += 1;
      }
    }
  }


  normalizeAngle(angle) {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }

  calculateBeamSegments(metals = []) {
    this.segments = [];
    
    let currentX = this.originX;
    let currentY = this.originY;
    let currentAngle = this.angle;
    let remainingLength = this.maxLength;
    let bounceCount = 0;
    const maxBounces = 5;
    
    while (remainingLength > 0 && bounceCount < maxBounces) {
      // Calculate end point of current segment
      const endX = currentX + Math.cos(currentAngle) * remainingLength;
      const endY = currentY + Math.sin(currentAngle) * remainingLength;
      
      // Check for metal intersections
      let closestIntersection = null;
      let closestDistance = remainingLength;
      let intersectedMetal = null;
      
      for (const metal of metals) {
        const intersection = this.calculateMetalIntersection(
          currentX, currentY, endX, endY, metal
        );
        
        if (intersection && intersection.distance < closestDistance) {
          closestDistance = intersection.distance;
          closestIntersection = intersection;
          intersectedMetal = metal;
        }
      }
      
      if (closestIntersection && intersectedMetal) {
        // Create segment up to metal
        this.segments.push({
          startX: currentX,
          startY: currentY,
          endX: closestIntersection.x,
          endY: closestIntersection.y,
          angle: currentAngle
        });
        
        // Calculate reflected angle
        const reflectedAngle = this.calculateReflection(currentAngle, intersectedMetal);
        
        // Update for next segment
        currentX = closestIntersection.x;
        currentY = closestIntersection.y;
        currentAngle = reflectedAngle;
        remainingLength -= closestDistance;
        bounceCount++;
      } else {
        // No intersection, extend to screen edge
        const screenIntersection = this.calculateScreenEdgeIntersection(
          currentX, currentY, currentAngle
        );
        
        this.segments.push({
          startX: currentX,
          startY: currentY,
          endX: screenIntersection.x,
          endY: screenIntersection.y,
          angle: currentAngle
        });
        break;
      }
    }
  }

  calculateMetalIntersection(x1, y1, x2, y2, metal) {
    // Simple line-rectangle intersection for metal objects
    // This is a simplified version - you might want to use the actual metal shape
    const metalLeft = metal.x - metal.width / 2;
    const metalRight = metal.x + metal.width / 2;
    const metalTop = metal.y - metal.height / 2;
    const metalBottom = metal.y + metal.height / 2;
    
    // Check intersection with each edge of the metal rectangle
    const intersections = [];
    
    // Top edge
    const topIntersection = this.lineIntersection(
      x1, y1, x2, y2,
      metalLeft, metalTop, metalRight, metalTop
    );
    if (topIntersection) intersections.push({ ...topIntersection, edge: 'top' });
    
    // Bottom edge
    const bottomIntersection = this.lineIntersection(
      x1, y1, x2, y2,
      metalLeft, metalBottom, metalRight, metalBottom
    );
    if (bottomIntersection) intersections.push({ ...bottomIntersection, edge: 'bottom' });
    
    // Left edge
    const leftIntersection = this.lineIntersection(
      x1, y1, x2, y2,
      metalLeft, metalTop, metalLeft, metalBottom
    );
    if (leftIntersection) intersections.push({ ...leftIntersection, edge: 'left' });
    
    // Right edge
    const rightIntersection = this.lineIntersection(
      x1, y1, x2, y2,
      metalRight, metalTop, metalRight, metalBottom
    );
    if (rightIntersection) intersections.push({ ...rightIntersection, edge: 'right' });
    
    // Return closest intersection
    if (intersections.length === 0) return null;
    
    return intersections.reduce((closest, current) => {
      const currentDist = Math.sqrt((current.x - x1) ** 2 + (current.y - y1) ** 2);
      const closestDist = Math.sqrt((closest.x - x1) ** 2 + (closest.y - y1) ** 2);
      current.distance = currentDist;
      if (!closest.distance) closest.distance = closestDist;
      return currentDist < closestDist ? current : closest;
    });
  }

  lineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null;
    
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

  calculateReflection(incomingAngle, metal) {
    // Simplified reflection - assumes rectangular metal pieces
    // You might want to implement more sophisticated reflection based on metal rotation
    const normalAngle = 0; // Assume horizontal surface for simplicity
    return 2 * normalAngle - incomingAngle;
  }

  calculateScreenEdgeIntersection(startX, startY, angle) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    
    // Calculate intersections with screen edges
    const intersections = [];
    
    // Left edge (x = 0)
    if (dx < 0) {
      const t = -startX / dx;
      const y = startY + t * dy;
      if (y >= 0 && y <= window.innerHeight) {
        intersections.push({ x: 0, y: y, distance: t });
      }
    }
    
    // Right edge (x = width)
    if (dx > 0) {
      const t = (window.innerWidth - startX) / dx;
      const y = startY + t * dy;
      if (y >= 0 && y <= window.innerHeight) {
        intersections.push({ x: window.innerWidth, y: y, distance: t });
      }
    }
    
    // Top edge (y = 0)
    if (dy < 0) {
      const t = -startY / dy;
      const x = startX + t * dx;
      if (x >= 0 && x <= window.innerWidth) {
        intersections.push({ x: x, y: 0, distance: t });
      }
    }
    
    // Bottom edge (y = height)
    if (dy > 0) {
      const t = (window.innerHeight - startY) / dy;
      const x = startX + t * dx;
      if (x >= 0 && x <= window.innerWidth) {
        intersections.push({ x: x, y: window.innerHeight, distance: t });
      }
    }
    
    // Return closest intersection
    return intersections.reduce((closest, current) => {
      return !closest || current.distance < closest.distance ? current : closest;
    }, null) || { x: startX, y: startY };
  }

  // Check collision with a point (for entities)
  checkCollision(entityX, entityY, entityRadius) {
    if (this.state !== "sweeping" || !this.isLaserActive) return false;
    
    for (const segment of this.segments) {
      const distance = this.distanceToLineSegment(
        entityX, entityY,
        segment.startX, segment.startY,
        segment.endX, segment.endY
      );
      
      if (distance < entityRadius + this.width / 2) {
        return true;
      }
    }
    
    return false;
  }

  distanceToLineSegment(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    
    const param = dot / lenSq;
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  render(ctx) {
    // Always render warning effects when active
    this.renderWarningEffects(ctx);
    
    if (this.state === "charging") {
      // Render charging effect
      this.renderChargingEffect(ctx);
    } else if (this.state === "sweeping") {
      // Render beam segments only if laser is active
      if (this.isLaserActive) {
        this.renderBeamSegments(ctx);
      }
      // Render cannon direction indicator (always visible during sweeping)
      this.renderCannonIndicator(ctx);
    }
  }

  renderChargingEffect(ctx) {
    ctx.save();
    
    // Draw charging indicator at origin
    const pulseSize = 15 + 8 * Math.sin(this.glowPulse);
    const alpha = this.chargeIntensity * 0.6;
    
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.glowColor;
    ctx.beginPath();
    ctx.arc(this.originX, this.originY, pulseSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw charging line pointing at starting edge
    ctx.globalAlpha = this.chargeIntensity * 0.4;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.width * this.chargeIntensity * 0.6;
    ctx.setLineDash([10, 5]); // Dashed line for charging effect
    ctx.beginPath();
    ctx.moveTo(this.originX, this.originY);
    
    // Draw preview line to screen edge
    const edgeIntersection = this.calculateScreenEdgeIntersection(this.originX, this.originY, this.angle);
    ctx.lineTo(edgeIntersection.x, edgeIntersection.y);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash
    
    ctx.restore();
  }

  renderBeamSegments(ctx) {
    ctx.save();
    
    for (const segment of this.segments) {
      // Draw glow effect
      ctx.globalAlpha = 0.3 * this.intensity;
      ctx.strokeStyle = this.glowColor;
      ctx.lineWidth = this.width * 2;
      ctx.beginPath();
      ctx.moveTo(segment.startX, segment.startY);
      ctx.lineTo(segment.endX, segment.endY);
      ctx.stroke();
      
      // Draw main beam
      ctx.globalAlpha = this.intensity;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.width;
      ctx.beginPath();
      ctx.moveTo(segment.startX, segment.startY);
      ctx.lineTo(segment.endX, segment.endY);
      ctx.stroke();
      
      // Draw core beam
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = this.width * 0.3;
      ctx.beginPath();
      ctx.moveTo(segment.startX, segment.startY);
      ctx.lineTo(segment.endX, segment.endY);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  renderWarningEffects(ctx) {
    if (!this.warningActive) return;
    
    ctx.save();
    
    // Pulsing red warning indicator at cannon
    const pulseIntensity = Math.sin(this.warningTimer * 0.3) * 0.5 + 0.5;
    const warningSize = 12 + pulseIntensity * 8;
    
    ctx.globalAlpha = 0.7 + pulseIntensity * 0.3;
    ctx.fillStyle = "#ff0000";
    ctx.beginPath();
    ctx.arc(this.originX, this.originY, warningSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Warning strobe effect
    ctx.globalAlpha = pulseIntensity * 0.6;
    ctx.fillStyle = "#ffff00";
    ctx.beginPath();
    ctx.arc(this.originX, this.originY, warningSize * 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  renderCannonIndicator(ctx) {
    ctx.save();
    
    // Draw subtle line showing cannon direction
    const alpha = this.isLaserActive ? 0.3 : 0.6;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = this.isLaserActive ? "#ffffff" : "#ffaa00";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]); // Dashed line
    
    ctx.beginPath();
    ctx.moveTo(this.originX, this.originY);
    
    // Short line indicating cannon direction
    const indicatorLength = 40;
    const endX = this.originX + Math.cos(this.angle) * indicatorLength;
    const endY = this.originY + Math.sin(this.angle) * indicatorLength;
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash
    
    ctx.restore();
  }
}