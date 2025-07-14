// BossPhase - Manages different phases of boss fights
export class BossPhase {
  constructor(name, parts = [], onEnter = null, onExit = null) {
    this.name = name;
    this.parts = new Map(); // name -> BossPart
    this.onEnter = onEnter; // Callback when phase starts
    this.onExit = onExit;   // Callback when phase ends
    this.active = false;
    this.completed = false;
    
    // Add initial parts
    parts.forEach(part => this.addPart(part));
  }

  addPart(part) {
    this.parts.set(part.name, part);
  }

  removePart(name) {
    this.parts.delete(name);
  }

  getPart(name) {
    return this.parts.get(name);
  }

  getAllParts() {
    const allParts = [];
    for (const part of this.parts.values()) {
      allParts.push(...part.getAllParts());
    }
    return allParts;
  }

  // Get all vulnerable parts in this phase
  getVulnerableParts() {
    const vulnerable = [];
    for (const part of this.parts.values()) {
      vulnerable.push(...part.getVulnerableParts());
    }
    return vulnerable;
  }

  // Check if this phase is complete (all parts destroyed)
  isComplete() {
    for (const part of this.parts.values()) {
      if (!part.isCompletelyDestroyed()) {
        return false;
      }
    }
    return true;
  }

  // Activate this phase
  enter() {
    this.active = true;
    this.completed = false;
    
    if (this.onEnter) {
      this.onEnter(this);
    }
  }

  // Deactivate this phase
  exit() {
    this.active = false;
    this.completed = true;
    
    if (this.onExit) {
      this.onExit(this);
    }
  }

  // Update all parts in this phase
  update(playerX, playerY, slowdownFactor = 1.0) {
    if (!this.active) return;
    
    for (const part of this.parts.values()) {
      part.update(playerX, playerY, slowdownFactor);
    }
  }

  // Render all parts in this phase
  render(ctx) {
    if (!this.active) return;
    
    for (const part of this.parts.values()) {
      part.render(ctx);
    }
  }

  // Find which part was hit by a point
  getPartAtPoint(x, y) {
    if (!this.active) return null;
    
    for (const part of this.parts.values()) {
      const hit = part.getPartAtPoint(x, y);
      if (hit) return hit;
    }
    
    return null;
  }
}

// BossPhaseManager - Manages the sequence of boss phases
export class BossPhaseManager {
  constructor() {
    this.phases = [];
    this.currentPhaseIndex = -1;
    this.currentPhase = null;
    this.transitioning = false;
    this.transitionTimer = 0;
    this.transitionDuration = 60; // 1 second transition
  }

  addPhase(phase) {
    this.phases.push(phase);
  }

  // Start the first phase
  start() {
    if (this.phases.length > 0) {
      this.currentPhaseIndex = 0;
      this.currentPhase = this.phases[0];
      this.currentPhase.enter();
    }
  }

  // Move to next phase
  nextPhase() {
    if (this.transitioning) return;
    
    if (this.currentPhase) {
      this.currentPhase.exit();
    }
    
    this.currentPhaseIndex++;
    
    if (this.currentPhaseIndex < this.phases.length) {
      this.transitioning = true;
      this.transitionTimer = this.transitionDuration;
    } else {
      // All phases complete
      this.currentPhase = null;
      this.currentPhaseIndex = -1;
    }
  }

  // Update current phase and handle transitions
  update(playerX, playerY, slowdownFactor = 1.0) {
    if (this.transitioning) {
      this.transitionTimer -= slowdownFactor;
      if (this.transitionTimer <= 0) {
        this.transitioning = false;
        this.currentPhase = this.phases[this.currentPhaseIndex];
        this.currentPhase.enter();
      }
      return;
    }
    
    if (this.currentPhase) {
      this.currentPhase.update(playerX, playerY, slowdownFactor);
      
      // Check if current phase is complete
      if (this.currentPhase.isComplete()) {
        this.nextPhase();
      }
    }
  }

  // Render current phase
  render(ctx) {
    if (this.currentPhase && !this.transitioning) {
      this.currentPhase.render(ctx);
    }
  }

  // Get all vulnerable parts from current phase
  getVulnerableParts() {
    if (this.currentPhase && !this.transitioning) {
      return this.currentPhase.getVulnerableParts();
    }
    return [];
  }

  // Find which part was hit
  getPartAtPoint(x, y) {
    if (this.currentPhase && !this.transitioning) {
      return this.currentPhase.getPartAtPoint(x, y);
    }
    return null;
  }

  // Check if all phases are complete
  isComplete() {
    return this.currentPhaseIndex >= this.phases.length && !this.transitioning;
  }

  // Get current phase info
  getCurrentPhase() {
    return this.currentPhase;
  }

  getCurrentPhaseIndex() {
    return this.currentPhaseIndex;
  }

  isTransitioning() {
    return this.transitioning;
  }
}