// Specific BossPart implementations for different boss components
import { BossPart } from './boss-part.js';

// Core body part of the boss
export class BossBody extends BossPart {
  constructor(x = 0, y = 0) {
    super("body", x, y, 1000);
    this.size = 60;
    this.color = "#444444";
    this.vulnerableColor = "#ff4444";
    this.width = 48;
    this.height = 64;
  }

  customUpdate(playerX, playerY, slowdownFactor) {
    // Body angles toward player
    const angleToPlayer = Math.atan2(playerY - this.getWorldPosition().y, playerX - this.getWorldPosition().x);
    this.targetAngle = angleToPlayer;
  }

  customRender(ctx) {
    // Body color changes when vulnerable
    ctx.fillStyle = this.vulnerable ? this.vulnerableColor : this.color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    
    // Draw rounded rectangle body
    this.drawRoundedRect(ctx, -this.width/2, -this.height/2, this.width, this.height, 15);
    ctx.fill();
    ctx.stroke();
    
    // Invulnerability indicator - gold stroke over the body itself
    if (this.invulnerable) {
      ctx.strokeStyle = "#ffcc00"; // Gold stroke
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.8 + Math.sin(this.animationTime * 5) * 0.2;
      this.drawRoundedRect(ctx, -this.width/2 - 3, -this.height/2 - 3, this.width + 6, this.height + 6, 18);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

// Boss head part
export class BossHead extends BossPart {
  constructor(x = 0, y = -30) {
    super("head", x, y, 500);
    this.size = 25;
    this.color = "#666666";
    this.width = 40;
    this.height = 32;
    this.eyeOffsetX = 0;
    this.eyeOffsetY = 0;
    this.mouthState = 0;
    this.mouthTimer = 0;
    
    // Movement properties (for phase 3)
    this.moveSpeed = 2;
    this.movePattern = "stationary"; // "stationary", "moving"
    this.targetX = 0;
    this.targetY = 0;
    this.patrolRadius = 150;
    this.laserCooldown = 0;
    this.pulseCooldown = 0;
  }

  customUpdate(playerX, playerY, slowdownFactor) {
    // Head looks at player
    const worldPos = this.getWorldPosition();
    const angleToPlayer = Math.atan2(playerY - worldPos.y, playerX - worldPos.x);
    this.targetAngle = angleToPlayer;
    
    // Update mouth animation
    this.mouthTimer += slowdownFactor;
    if (this.mouthTimer > 60) {
      this.mouthState = this.mouthState === 0 ? 1 : 0;
      this.mouthTimer = 0;
    }
    
    // Phase 3 movement (when head is independent)
    if (this.movePattern === "moving") {
      this.updateMovement(playerX, playerY, slowdownFactor);
    }
    
    // Update cooldowns
    this.laserCooldown = Math.max(0, this.laserCooldown - slowdownFactor);
    this.pulseCooldown = Math.max(0, this.pulseCooldown - slowdownFactor);
  }

  updateMovement(playerX, playerY, slowdownFactor) {
    // Erratic movement pattern
    if (Math.random() < 0.02) { // Change direction occasionally
      const angle = Math.random() * Math.PI * 2;
      this.targetX = this.x + Math.cos(angle) * this.patrolRadius;
      this.targetY = this.y + Math.sin(angle) * this.patrolRadius;
    }
    
    // Move toward target
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 5) {
      this.x += (dx / distance) * this.moveSpeed * slowdownFactor;
      this.y += (dy / distance) * this.moveSpeed * slowdownFactor;
    }
  }

  // Activate phase 3 behavior
  activatePhase3() {
    this.movePattern = "moving";
    this.health = 300; // Reduce health for final phase
    this.maxHealth = 300;
  }

  // Fire mouth laser
  canFireLaser() {
    return this.laserCooldown <= 0;
  }

  fireLaser(playerX, playerY) {
    if (!this.canFireLaser()) return null;
    
    this.laserCooldown = 120; // 2 second cooldown
    const worldPos = this.getWorldPosition();
    const angleToPlayer = Math.atan2(playerY - worldPos.y, playerX - worldPos.x);
    
    return {
      x: worldPos.x,
      y: worldPos.y,
      vx: Math.cos(angleToPlayer) * 2, // Slow laser
      vy: Math.sin(angleToPlayer) * 2,
      size: 8,
      color: "#ff0000",
      type: "bossLaser"
    };
  }

  // Fire rainbow pulse
  canFirePulse() {
    return this.pulseCooldown <= 0;
  }

  firePulse() {
    if (!this.canFirePulse()) return [];
    
    this.pulseCooldown = 180; // 3 second cooldown
    const worldPos = this.getWorldPosition();
    const bullets = [];
    const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"];
    
    // Short rainbow pulse (6 bullets in circle)
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      bullets.push({
        x: worldPos.x,
        y: worldPos.y,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        size: 6,
        color: colors[i],
        type: "bossPulse"
      });
    }
    
    return bullets;
  }

  customRender(ctx) {
    ctx.fillStyle = this.color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    
    // Draw head (rounded rectangle)
    this.drawRoundedRect(ctx, -this.width/2, -this.height/2, this.width, this.height, 10);
    ctx.fill();
    ctx.stroke();
    
    // Draw angry eyes
    ctx.fillStyle = "#ff0000";
    const eyeSize = 6;
    
    // Left eye (angled downward for anger)
    ctx.save();
    ctx.rotate(-0.3);
    ctx.beginPath();
    ctx.ellipse(-this.width * 0.25 + this.eyeOffsetX, -this.height * 0.15 + this.eyeOffsetY, eyeSize, eyeSize * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Right eye (angled downward for anger)
    ctx.save();
    ctx.rotate(0.3);
    ctx.beginPath();
    ctx.ellipse(this.width * 0.25 + this.eyeOffsetX, -this.height * 0.15 + this.eyeOffsetY, eyeSize, eyeSize * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Angry eyebrows
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Left eyebrow
    ctx.moveTo(-this.width * 0.35 + this.eyeOffsetX, -this.height * 0.25 + this.eyeOffsetY);
    ctx.lineTo(-this.width * 0.15 + this.eyeOffsetX, -this.height * 0.2 + this.eyeOffsetY);
    // Right eyebrow
    ctx.moveTo(this.width * 0.15 + this.eyeOffsetX, -this.height * 0.2 + this.eyeOffsetY);
    ctx.lineTo(this.width * 0.35 + this.eyeOffsetX, -this.height * 0.25 + this.eyeOffsetY);
    ctx.stroke();
    
    // Draw mouth
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 3;
    ctx.fillStyle = "#ff0000";
    ctx.beginPath();
    if (this.mouthState === 0) {
      // Angry frown (inverted arc)
      ctx.arc(0, this.height * 0.05, this.width * 0.2, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else {
      // Open mouth for shooting
      ctx.ellipse(0, this.height * 0.1, this.width * 0.15, this.height * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Invulnerability indicator - gold stroke over the head itself
    if (this.invulnerable) {
      ctx.strokeStyle = "#ffcc00"; // Gold stroke
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8 + Math.sin(this.animationTime * 5) * 0.2;
      this.drawRoundedRect(ctx, -this.width/2 - 2, -this.height/2 - 2, this.width + 4, this.height + 4, 12);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

// Boss arm components
export class BossArm extends BossPart {
  constructor(name, x, y, armType = "laser") {
    super(name, x, y, 500);
    this.armType = armType;
    this.size = 50;
    this.color = armType === "laser" ? "#ff8800" : "#ff0000";
    
    // Add subparts
    this.addSubpart(new ArmJoint(`${name}_joint`, 0, 0));
    this.addSubpart(new ArmCannon(`${name}_cannon`, 40, 0, armType));
  }

  customUpdate(playerX, playerY, slowdownFactor) {
    // Arm aims toward player
    const worldPos = this.getWorldPosition();
    const angleToPlayer = Math.atan2(playerY - worldPos.y, playerX - worldPos.x);
    this.targetAngle = angleToPlayer;
  }

  customRender(ctx) {
    // Arms don't render themselves, only their subparts
  }
}

export class ArmJoint extends BossPart {
  constructor(name, x, y) {
    super(name, x, y, 200);
    this.size = 25;
    this.color = "#666666";
    this.radius = 25;
  }

  customRender(ctx) {
    // Shoulder base (rectangle)
    ctx.fillStyle = this.color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-15, -this.radius, 30, this.radius * 2);
    ctx.fill();
    ctx.stroke();
    
    // Shoulder joint (half-circle)
    ctx.fillStyle = "#888888";
    ctx.beginPath();
    ctx.arc(15, 0, this.radius, -Math.PI/2, Math.PI/2);
    ctx.fill();
    ctx.stroke();
    
    // Invulnerability indicator - gold stroke over the joint
    if (this.invulnerable) {
      ctx.strokeStyle = "#ffcc00"; // Gold stroke
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8 + Math.sin(this.animationTime * 5) * 0.2;
      ctx.beginPath();
      ctx.rect(-18, -this.radius - 3, 36, this.radius * 2 + 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(15, 0, this.radius + 3, -Math.PI/2, Math.PI/2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

export class ArmCannon extends BossPart {
  constructor(name, x, y, cannonType = "laser") {
    super(name, x, y, 300);
    this.cannonType = cannonType;
    this.size = 35;
    this.color = cannonType === "laser" ? "#ff8800" : "#ff0000";
    this.width = cannonType === "laser" ? 60 : 70;
    this.height = cannonType === "laser" ? 20 : 25;
    this.cooldown = 0;
    this.maxCooldown = cannonType === "laser" ? 120 : 90;
    this.chargingEffect = false;
    this.chargeTime = 0;
  }

  customUpdate(playerX, playerY, slowdownFactor) {
    // Weapon aims directly at player
    const worldPos = this.getWorldPosition();
    const angleToPlayer = Math.atan2(playerY - worldPos.y, playerX - worldPos.x);
    this.targetAngle = angleToPlayer + Math.sin(this.animationTime * 2) * 0.1;
    
    // Update cooldowns
    this.cooldown = Math.max(0, this.cooldown - slowdownFactor);
    
    if (this.chargingEffect) {
      this.chargeTime += slowdownFactor;
      if (this.chargeTime >= 60) {
        this.chargingEffect = false;
        this.chargeTime = 0;
      }
    }
  }

  canFire() {
    return this.cooldown <= 0 && !this.destroyed;
  }

  fire(playerX, playerY) {
    if (!this.canFire()) return [];
    
    this.cooldown = this.maxCooldown;
    const worldPos = this.getWorldPosition();
    const angleToPlayer = Math.atan2(playerY - worldPos.y, playerX - worldPos.x);
    
    if (this.cannonType === "laser") {
      this.chargingEffect = true;
      this.chargeTime = 0;
      
      return [{
        x: worldPos.x + Math.cos(this.angle) * this.width,
        y: worldPos.y + Math.sin(this.angle) * this.width,
        vx: Math.cos(angleToPlayer) * 6,
        vy: Math.sin(angleToPlayer) * 6,
        size: 8,
        color: "#ffff00",
        type: "bossLaser"
      }];
    } else {
      // Missile launcher - fires burst
      const bullets = [];
      for (let i = 0; i < 3; i++) {
        const spreadAngle = angleToPlayer + (i - 1) * 0.2;
        bullets.push({
          x: worldPos.x + Math.cos(this.angle) * this.width,
          y: worldPos.y + Math.sin(this.angle) * this.width,
          vx: Math.cos(spreadAngle) * 4,
          vy: Math.sin(spreadAngle) * 4,
          size: 6,
          color: "#ff6666",
          type: "bossMissile"
        });
      }
      return bullets;
    }
  }

  customRender(ctx) {
    // Main weapon body
    ctx.fillStyle = this.color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    
    ctx.beginPath();
    ctx.rect(0, -this.height/2, this.width, this.height);
    ctx.fill();
    ctx.stroke();
    
    // Weapon details based on type
    if (this.cannonType === "laser") {
      // Laser cannon details
      ctx.fillStyle = "#ffff00";
      ctx.beginPath();
      ctx.rect(this.width - 10, -5, 15, 10);
      ctx.fill();
      
      // Charging effect
      if (this.chargingEffect) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.7 + Math.sin(this.chargeTime * 0.3) * 0.3;
        ctx.beginPath();
        ctx.rect(-5, -this.height/2 - 5, this.width + 10, this.height + 10);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    } else {
      // Missile launcher details
      ctx.fillStyle = "#ff6666";
      // Multiple missile tubes
      for (let i = 0; i < 3; i++) {
        const tubeY = (i - 1) * 8;
        ctx.beginPath();
        ctx.rect(this.width - 5, tubeY - 3, 10, 6);
        ctx.fill();
      }
    }
    
    // Invulnerability indicator - gold stroke over the cannon
    if (this.invulnerable) {
      ctx.strokeStyle = "#ffcc00"; // Gold stroke
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8 + Math.sin(this.animationTime * 5) * 0.2;
      ctx.beginPath();
      ctx.rect(-3, -this.height/2 - 3, this.width + 6, this.height + 6);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}
