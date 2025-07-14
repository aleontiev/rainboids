// BossPart - Base class for modular boss components with recursive structure
export class BossPart {
  constructor(name, x = 0, y = 0, health = 100) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.health = health;
    this.maxHealth = health;
    this.destroyed = false;
    this.vulnerable = true;
    this.invulnerable = false;
    
    // Visual properties
    this.angle = 0;
    this.hitFlash = 0;
    this.size = 50;
    this.color = "#666666";
    
    // Hierarchical structure
    this.subparts = new Map(); // name -> BossPart
    this.parent = null;
    
    // Combat properties
    this.weapons = [];
    this.cooldowns = new Map();
    
    // Animation properties
    this.animationTime = 0;
    this.targetAngle = 0;
  }

  // Add a subpart to this part
  addSubpart(subpart) {
    subpart.parent = this;
    this.subparts.set(subpart.name, subpart);
    return subpart;
  }

  // Remove a subpart
  removeSubpart(name) {
    const subpart = this.subparts.get(name);
    if (subpart) {
      subpart.parent = null;
      this.subparts.delete(name);
    }
    return subpart;
  }

  // Get a subpart by name (recursive search)
  getSubpart(name) {
    if (this.subparts.has(name)) {
      return this.subparts.get(name);
    }
    
    // Search recursively in subparts
    for (const subpart of this.subparts.values()) {
      const found = subpart.getSubpart(name);
      if (found) return found;
    }
    
    return null;
  }

  // Get all parts in this hierarchy (including self)
  getAllParts() {
    const parts = [this];
    for (const subpart of this.subparts.values()) {
      parts.push(...subpart.getAllParts());
    }
    return parts;
  }

  // Get world position (accounting for parent transformations)
  getWorldPosition() {
    if (!this.parent) {
      return { x: this.x, y: this.y };
    }
    
    const parentPos = this.parent.getWorldPosition();
    const cos = Math.cos(this.parent.angle);
    const sin = Math.sin(this.parent.angle);
    
    return {
      x: parentPos.x + this.x * cos - this.y * sin,
      y: parentPos.y + this.x * sin + this.y * cos
    };
  }

  // Update this part and all subparts
  update(playerX, playerY, slowdownFactor = 1.0) {
    this.animationTime += slowdownFactor * 0.05;
    
    // Update hit flash
    if (this.hitFlash > 0) {
      this.hitFlash -= slowdownFactor;
    }
    
    // Update angle towards target
    const angleDiff = this.targetAngle - this.angle;
    this.angle += angleDiff * 0.1 * slowdownFactor;
    
    // Update cooldowns
    for (const [key, cooldown] of this.cooldowns.entries()) {
      if (cooldown > 0) {
        this.cooldowns.set(key, Math.max(0, cooldown - slowdownFactor));
      }
    }
    
    // Update subparts
    for (const subpart of this.subparts.values()) {
      if (!subpart.destroyed) {
        subpart.update(playerX, playerY, slowdownFactor);
      }
    }
    
    // Custom update logic (override in subclasses)
    this.customUpdate(playerX, playerY, slowdownFactor);
  }

  // Override in subclasses for custom update logic
  customUpdate(playerX, playerY, slowdownFactor) {
    // Default implementation does nothing
  }

  // Take damage and return damage info
  takeDamage(damage, bulletX, bulletY) {
    if (this.destroyed || this.invulnerable) {
      return { damaged: false, destroyed: false };
    }

    this.health -= damage;
    this.hitFlash = 10;
    
    if (this.health <= 0) {
      this.health = 0;
      this.destroyed = true;
      return { damaged: true, destroyed: true };
    }
    
    return { damaged: true, destroyed: false };
  }

  // Check if point is within this part's hitbox
  containsPoint(x, y) {
    const worldPos = this.getWorldPosition();
    const dx = x - worldPos.x;
    const dy = y - worldPos.y;
    return Math.sqrt(dx * dx + dy * dy) < this.size;
  }

  // Find which part (including subparts) contains the given point
  getPartAtPoint(x, y) {
    // Check subparts first (they take priority)
    for (const subpart of this.subparts.values()) {
      if (!subpart.destroyed) {
        const hit = subpart.getPartAtPoint(x, y);
        if (hit) return hit;
      }
    }
    
    // Check this part
    if (this.containsPoint(x, y)) {
      return this;
    }
    
    return null;
  }

  // Render this part and all subparts
  render(ctx) {
    if (this.destroyed) return;
    
    const worldPos = this.getWorldPosition();
    
    ctx.save();
    ctx.translate(worldPos.x, worldPos.y);
    ctx.rotate(this.angle);
    
    // Apply hit flash
    if (this.hitFlash > 0) {
      ctx.globalAlpha = 0.7;
    }
    
    // Custom rendering (override in subclasses)
    this.customRender(ctx);
    
    ctx.restore();
    
    // Render subparts
    for (const subpart of this.subparts.values()) {
      subpart.render(ctx);
    }
  }

  // Override in subclasses for custom rendering
  customRender(ctx) {
    // Default rendering - simple circle
    ctx.fillStyle = this.color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Invulnerability indicator
    if (this.invulnerable) {
      ctx.strokeStyle = "#ffcc00"; // Gold stroke
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8 + Math.sin(this.animationTime * 5) * 0.2;
      ctx.beginPath();
      ctx.arc(0, 0, this.size + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // Get all vulnerable parts (for targeting)
  getVulnerableParts() {
    const vulnerable = [];
    
    if (!this.destroyed && !this.invulnerable && this.vulnerable) {
      vulnerable.push(this);
    }
    
    for (const subpart of this.subparts.values()) {
      vulnerable.push(...subpart.getVulnerableParts());
    }
    
    return vulnerable;
  }

  // Check if this part hierarchy is completely destroyed
  isCompletelyDestroyed() {
    if (!this.destroyed) return false;
    
    for (const subpart of this.subparts.values()) {
      if (!subpart.isCompletelyDestroyed()) {
        return false;
      }
    }
    
    return true;
  }

  // Set invulnerability for this part and optionally subparts
  setInvulnerable(invulnerable, recursive = false) {
    this.invulnerable = invulnerable;
    
    if (recursive) {
      for (const subpart of this.subparts.values()) {
        subpart.setInvulnerable(invulnerable, true);
      }
    }
  }
}