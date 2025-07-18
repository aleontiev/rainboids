import { MiniBoss } from "./miniboss.js";
import { ContinuousLaserBeam } from "./continuous-laser-beam.js";

export class Boss extends MiniBoss {
  constructor(x, y, isPortrait, canvasWidth, canvasHeight) {
    super(x, y, isPortrait, canvasWidth); // Call MiniBoss constructor
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.type = "boss"; // Override miniboss type
    this.speed = 1; // Override miniboss speed
    this.size = 120; // Very large boss
    this.maxHealth = 1000; // Main body health
    this.health = this.maxHealth;
    this.frameCount = 0;

    // Movement
    this.movePattern = "entering";
    this.targetX = isPortrait ? canvasWidth / 2 : canvasWidth - 200;
    this.targetY = isPortrait ? 200 : canvasHeight / 2;
    this.patrolDirection = 1;
    this.patrolRange = 150;
    this.startX = this.targetX;
    this.startY = this.targetY;

    // Robot head animation
    this.headOffsetX = 0;
    this.headOffsetY = 0;
    this.headMoveTime = 0;
    this.eyeOffsetX = 0;
    this.eyeOffsetY = 0;
    this.eyeMoveTime = 0;
    this.mouthState = 0; // 0 = closed, 1 = open
    this.mouthTimer = 0;

    // Boss has 3 distinct parts: left arm, body, right arm
    this.leftArm = {
      health: 500,
      maxHealth: 500,
      destroyed: false,
      type: "laser",
      cooldown: 0,
      maxCooldown: 120, // 2 seconds
      laserCharging: false,
      laserChargeTime: 0,
      shoulderAngle: 0, // Angle of shoulder joint
      coreAngle: 0,     // Angle of weapon core
      x: 0,             // Calculated position
      y: 0,
      shoulderRadius: 25,
      coreWidth: 40,
      coreHeight: 20,
      coreLength: 60,
      invulnerable: false,
      // Sweeping laser properties
      sweepState: "inactive", // inactive, charging, sweeping
      sweepAngle: 0, // Will be set when laser starts
      sweepDirection: 1, // Start clockwise
      sweepSpeed: 0.008, // Slower radians per frame
      sweepChargeTime: 0,
      sweepMaxChargeTime: 120, // 2 seconds charge time
      sweepDuration: 0,
      sweepMaxDuration: 720, // 12 seconds for bi-directional sweep (2 full sweeps)
      activeLaser: null, // Current laser beam
      isVulnerableToAutoAim: function() { return !this.destroyed && !this.invulnerable; }
    };
    
    this.rightArm = {
      health: 500,
      maxHealth: 500,
      destroyed: false,
      type: "missiles", 
      cooldown: 0,
      maxCooldown: 90, // 1.5 seconds
      burstCooldown: 0,
      shoulderAngle: 0, // Angle of shoulder joint
      coreAngle: 0,     // Angle of weapon core
      x: 0,             // Calculated position
      y: 0,
      shoulderRadius: 25,
      coreWidth: 45,
      coreHeight: 25,
      coreLength: 70,
      invulnerable: false,
      isVulnerableToAutoAim: function() { return !this.destroyed && !this.invulnerable; }
    };
    
    // Initialize arm positions
    this.updateArm(this.leftArm);
    this.updateArm(this.rightArm);

    // Final phase when both arms destroyed
    this.finalPhase = false;
    this.shield = 0;
    this.maxShield = 1000;
    this.enraged = false;
    this.enemySpawnTimer = 0;
    this.enemySpawnCooldown = 180; // 3 seconds

    // Visual effects
    this.hitFlash = 0;
    this.bodyAngle = 0; // Initialize body angle
    this.invulnerable = false; // For consistency with base enemy class

    // Death sequence
    this.isDefeated = false;
    this.deathTimer = 0;
    this.explosionTimer = 0;
  }

  // Check if this boss can be targeted by auto-aim
  isVulnerableToAutoAim() {
    // Boss body is only vulnerable in final phase
    return this.finalPhase && !this.invulnerable;
  }

  // Get all targetable parts for auto-aim
  getTargetableParts() {
    const targets = [];
    
    // Add arms if they're vulnerable
    if (!this.leftArm.destroyed && this.leftArm.isVulnerableToAutoAim && this.leftArm.isVulnerableToAutoAim()) {
      targets.push({
        x: this.leftArm.x || (this.x + this.leftArm.baseX),
        y: this.leftArm.y || (this.y + this.leftArm.baseY),
        type: "bossArm",
        armType: "laser",
        health: this.leftArm.health,
        size: 50,
        boss: this,
        arm: "left"
      });
    }
    
    if (!this.rightArm.destroyed && this.rightArm.isVulnerableToAutoAim && this.rightArm.isVulnerableToAutoAim()) {
      targets.push({
        x: this.rightArm.x || (this.x + this.rightArm.baseX),
        y: this.rightArm.y || (this.y + this.rightArm.baseY),
        type: "bossArm",
        armType: "missiles",
        health: this.rightArm.health,
        size: 50,
        boss: this,
        arm: "right"
      });
    }
    
    // Add body if vulnerable
    if (this.isVulnerableToAutoAim()) {
      targets.push({
        x: this.x,
        y: this.y,
        type: "bossBody",
        health: this.health,
        size: this.size,
        boss: this
      });
    }
    
    return targets;
  }

  update(playerX, playerY) {
    this.frameCount++;
    // No rotation for new boss design

    if (this.isDefeated) {
      this.deathTimer++;
      return;
    }

    // Check if should enter final phase
    if (!this.finalPhase && this.leftArm.destroyed && this.rightArm.destroyed) {
      this.finalPhase = true;
      this.enraged = true;
      this.shield = this.maxShield;
    }

    // Animate robot head movement (subtle movement around center)
    this.headMoveTime += 0.02;
    this.headOffsetX = Math.sin(this.headMoveTime) * 8; // Reduced range
    this.headOffsetY = Math.cos(this.headMoveTime * 0.7) * 5; // Reduced range

    // Calculate eye tracking toward player
    const eyeTrackRange = 8; // Maximum eye movement range
    const eyeToPlayerX = playerX - this.x;
    const eyeToPlayerY = playerY - this.y;
    const eyeDistance = Math.sqrt(eyeToPlayerX * eyeToPlayerX + eyeToPlayerY * eyeToPlayerY);
    
    if (eyeDistance > 0) {
      // Normalize and scale eye movement
      this.eyeOffsetX = (eyeToPlayerX / eyeDistance) * eyeTrackRange;
      this.eyeOffsetY = (eyeToPlayerY / eyeDistance) * eyeTrackRange;
    } else {
      this.eyeOffsetX = 0;
      this.eyeOffsetY = 0;
    }

    // Animate mouth
    this.mouthTimer++;
    if (this.mouthTimer > 60) {
      this.mouthState = 1 - this.mouthState;
      this.mouthTimer = 0;
    }

    // Update articulated arms with player tracking
    this.updateArm(this.leftArm, playerX, playerY);
    this.updateArm(this.rightArm, playerX, playerY);

    // Movement logic
    if (this.movePattern === "entering") {
      // Move to target position
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5) {
        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;
      } else {
        this.movePattern = "patrol";
        this.startX = this.x;
        this.startY = this.y;
      }
    } else if (this.movePattern === "patrol") {
      // Patrol movement
      if (this.isPortrait) {
        this.x += this.patrolDirection * 0.5;
        if (Math.abs(this.x - this.startX) > this.patrolRange) {
          this.patrolDirection *= -1;
        }
      } else {
        this.y += this.patrolDirection * 0.5;
        if (Math.abs(this.y - this.startY) > this.patrolRange) {
          this.patrolDirection *= -1;
        }
      }
    }

    // Update arm cooldowns
    if (!this.leftArm.destroyed) {
      this.leftArm.cooldown = Math.max(0, this.leftArm.cooldown - 1);
    }
    if (!this.rightArm.destroyed) {
      this.rightArm.cooldown = Math.max(0, this.rightArm.cooldown - 1);
    }

    // Update enemy spawn timer in final phase
    if (this.finalPhase) {
      this.enemySpawnTimer = Math.max(0, this.enemySpawnTimer - 1);
    }

    // Hit flash
    if (this.hitFlash > 0) {
      this.hitFlash--;
    }
  }

  updateArm(arm, playerX, playerY) {
    if (arm.destroyed) return;
    
    // Calculate angle to player for targeting
    const angleToPlayer = Math.atan2(playerY - this.y, playerX - this.x);
    
    // Update body angle to face player
    this.bodyAngle = angleToPlayer;
    
    // Position arms based on body orientation and portrait/landscape mode
    const armDistance = this.size * 0.8;
    
    if (arm.type === "laser") {
      // Left arm positioning
      if (this.isPortrait) {
        // In portrait: left arm appears to the left
        arm.x = this.x + Math.cos(this.bodyAngle - Math.PI/2) * armDistance;
        arm.y = this.y + Math.sin(this.bodyAngle - Math.PI/2) * armDistance;
      } else {
        // In landscape: left arm appears above
        arm.x = this.x + Math.cos(this.bodyAngle - Math.PI/3) * armDistance;
        arm.y = this.y + Math.sin(this.bodyAngle - Math.PI/3) * armDistance;
      }
    } else {
      // Right arm positioning
      if (this.isPortrait) {
        // In portrait: right arm appears to the right
        arm.x = this.x + Math.cos(this.bodyAngle + Math.PI/2) * armDistance;
        arm.y = this.y + Math.sin(this.bodyAngle + Math.PI/2) * armDistance;
      } else {
        // In landscape: right arm appears below
        arm.x = this.x + Math.cos(this.bodyAngle + Math.PI/3) * armDistance;
        arm.y = this.y + Math.sin(this.bodyAngle + Math.PI/3) * armDistance;
      }
    }
    
    // Shoulder joint aims somewhat toward player
    arm.shoulderAngle = angleToPlayer + (Math.random() - 0.5) * 0.3;
    
    // Weapon core aims directly at player with slight tracking variation
    arm.coreAngle = angleToPlayer + Math.sin(this.frameCount * 0.05) * 0.1;
    
    // Update laser charging for laser arm
    if (arm.type === "laser") {
      if (arm.laserCharging) {
        arm.laserChargeTime++;
        if (arm.laserChargeTime >= 60) { // 1 second charge
          arm.laserCharging = false;
          arm.laserChargeTime = 0;
        }
      }
    }
  }

  // Get which part was hit (returns 'leftArm', 'rightArm', or 'body')
  getHitPart(bulletX, bulletY) {
    // Check left arm
    if (!this.leftArm.destroyed) {
      const distToLeftArm = Math.sqrt((bulletX - this.leftArm.x) ** 2 + (bulletY - this.leftArm.y) ** 2);
      if (distToLeftArm < 50) { // Generous hit area for arms
        return 'leftArm';
      }
    }
    
    // Check right arm
    if (!this.rightArm.destroyed) {
      const distToRightArm = Math.sqrt((bulletX - this.rightArm.x) ** 2 + (bulletY - this.rightArm.y) ** 2);
      if (distToRightArm < 50) { // Generous hit area for arms
        return 'rightArm';
      }
    }
    
    // Check body (only vulnerable in final phase)
    if (this.finalPhase) {
      const distToBody = Math.sqrt((bulletX - this.x) ** 2 + (bulletY - this.y) ** 2);
      if (distToBody < this.size * 0.6) {
        return 'body';
      }
    }
    
    return null;
  }

  takeDamage(damage, bulletX, bulletY) {
    const hitPart = this.getHitPart(bulletX, bulletY);
    
    if (!hitPart) return false;

    this.hitFlash = 10;

    if (hitPart === 'leftArm' && !this.leftArm.destroyed) {
      this.leftArm.health -= damage;
      if (this.leftArm.health <= 0) {
        this.leftArm.destroyed = true;
        this.leftArm.health = 0;
        // Clean up active laser when arm is destroyed
        if (this.leftArm.activeLaser) {
          this.leftArm.activeLaser = null;
        }
        // Reset sweep state
        this.leftArm.sweepState = "inactive";
        console.log("Boss left arm destroyed - laser disabled");
      }
      return true;
    } else if (hitPart === 'rightArm' && !this.rightArm.destroyed) {
      this.rightArm.health -= damage;
      if (this.rightArm.health <= 0) {
        this.rightArm.destroyed = true;
        this.rightArm.health = 0;
      }
      return true;
    } else if (hitPart === 'body') {
      // Body is invulnerable until final phase - bullets pass through
      if (this.finalPhase || (this.leftArm.destroyed && this.rightArm.destroyed)) {
        if (this.shield > 0) {
          this.shield -= damage;
          if (this.shield < 0) {
            this.health += this.shield; // Overflow damage to health
            this.shield = 0;
          }
        } else {
          this.health -= damage;
        }
        
        if (this.health <= 0) {
          this.health = 0;
          this.isDefeated = true;
        }
        return true;
      } else {
        // Body is invulnerable during phases 1 and 2
        return false;
      }
    }
    
    return false;
  }

  // Fire left arm sweeping laser
  fireLeftArm(playerX, playerY) {
    if (this.leftArm.destroyed) return [];
    
    // Handle sweeping laser state machine
    switch (this.leftArm.sweepState) {
      case "inactive":
        // Start charging if cooldown is over
        if (this.leftArm.cooldown <= 0) {
          this.leftArm.sweepState = "charging";
          this.leftArm.sweepChargeTime = 0;
          // Set initial angle for counterclockwise sweep
          this.leftArm.sweepAngle = this.isPortrait ? 0 : Math.PI/2; // Right (portrait) or Down (landscape)
          
          // Create new continuous laser beam
          this.leftArm.activeLaser = new ContinuousLaserBeam(
            this.leftArm.x,
            this.leftArm.y,
            this.leftArm.sweepAngle,
            this.isPortrait
          );
        }
        break;
        
      case "charging":
        // Check if arm was destroyed during charging
        if (this.leftArm.destroyed) {
          this.leftArm.sweepState = "inactive";
          this.leftArm.activeLaser = null;
          return [];
        }
        
        this.leftArm.sweepChargeTime++;
        // Update arm angle to point at current sweep target
        this.leftArm.coreAngle = this.leftArm.sweepAngle;
        
        if (this.leftArm.sweepChargeTime >= this.leftArm.sweepMaxChargeTime) {
          // Start sweeping
          this.leftArm.sweepState = "sweeping";
          this.leftArm.sweepDuration = 0;
          this.leftArm.sweepDirection = 1; // Start clockwise
        }
        break;
        
      case "sweeping":
        // Check if arm was destroyed during sweeping
        if (this.leftArm.destroyed) {
          this.leftArm.sweepState = "inactive";
          this.leftArm.activeLaser = null;
          return [];
        }
        
        this.leftArm.sweepDuration++;
        
        // Update arm angle to match laser angle
        if (this.leftArm.activeLaser) {
          this.leftArm.coreAngle = this.leftArm.activeLaser.angle;
        }
        
        // End sweeping after max duration (laser lifecycle is managed by main game loop)
        if (this.leftArm.sweepDuration >= this.leftArm.sweepMaxDuration) {
          this.leftArm.sweepState = "inactive";
          this.leftArm.cooldown = this.leftArm.maxCooldown * 2; // Longer cooldown for powerful attack
          this.leftArm.activeLaser = null; // Clear laser reference
        }
        break;
    }
    
    return [];
  }

  // Fire right arm missiles and bullet spreads
  fireRightArm(playerX, playerY) {
    if (this.rightArm.destroyed || this.rightArm.cooldown > 0) return [];
    
    const projectiles = [];
    
    // Get firing position from arm position
    const armX = this.rightArm.x;
    const armY = this.rightArm.y;
    const angleToPlayer = Math.atan2(playerY - armY, playerX - armX);
    
    // Alternate between different attack patterns
    const attackType = Math.random();
    
    if (attackType < 0.4) {
      // Homing missiles (slow but tracking)
      for (let i = 0; i < 3; i++) {
        const spreadAngle = angleToPlayer + (i - 1) * 0.4;
        projectiles.push({
          type: "homing",
          x: armX,
          y: armY,
          vx: Math.cos(spreadAngle) * 1.5,
          vy: Math.sin(spreadAngle) * 1.5,
          targetX: playerX,
          targetY: playerY,
          homingStrength: 0.03,
          color: "#ff0000", // Red missiles
          size: 10
        });
      }
    } else if (attackType < 0.7) {
      // Fast bullet spread
      for (let i = -3; i <= 3; i++) {
        const angle = angleToPlayer + i * 0.2;
        projectiles.push({
          x: armX,
          y: armY,
          vx: Math.cos(angle) * 6,
          vy: Math.sin(angle) * 6,
          size: 6,
          color: "#ff4400", // Orange bullets
          type: "boss"
        });
      }
    } else {
      // Slow heavy missiles
      for (let i = -1; i <= 1; i++) {
        const angle = angleToPlayer + i * 0.5;
        projectiles.push({
          x: armX,
          y: armY,
          vx: Math.cos(angle) * 3,
          vy: Math.sin(angle) * 3,
          size: 12,
          color: "#cc0000", // Dark red heavy missiles
          type: "boss"
        });
      }
    }
    
    this.rightArm.cooldown = this.rightArm.maxCooldown;
    return projectiles;
  }

  // Fire final phase attacks
  fireFinalPhase(playerX, playerY) {
    if (!this.finalPhase) return { bullets: [], enemies: [] };
    
    const bullets = [];
    const enemies = [];
    
    // Initialize pulse pattern if not already done
    if (this.pulsePattern === undefined) {
      this.pulsePattern = {
        waveCount: 0,
        maxWaves: 18 + Math.floor(Math.random() * 6), // 18-23 waves (randomized)
        inBreak: false,
        breakTimer: 0,
        breakDuration: 60 + Math.floor(Math.random() * 30), // 1-1.5 second break (randomized)
        spiralOffset: Math.random() * Math.PI * 2 // Random starting spiral rotation
      };
    }
    
    // Handle pulsing pattern
    if (!this.pulsePattern.inBreak) {
      // Fire rainbow spiral if still in active phase
      if (this.frameCount % 3 === 0) { // Fire every 3 frames for spacing
        for (let i = 0; i < 10; i++) { // Reduced from 12 to 10 for more spacing
          const angle = (i / 10) * Math.PI * 2 + this.frameCount * 0.04 + this.pulsePattern.spiralOffset;
          const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff", "#ffa500", "#ff69b4"];
          bullets.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(angle) * 3.5, // Slightly slower
            vy: Math.sin(angle) * 3.5,
            size: 6,
            color: colors[i % colors.length],
            type: "boss"
          });
        }
        this.pulsePattern.waveCount++;
      }
      
      // Check if we've reached max waves
      if (this.pulsePattern.waveCount >= this.pulsePattern.maxWaves) {
        this.pulsePattern.inBreak = true;
        this.pulsePattern.breakTimer = 0;
        this.pulsePattern.waveCount = 0;
        // Randomize next cycle
        this.pulsePattern.maxWaves = 18 + Math.floor(Math.random() * 6);
        this.pulsePattern.breakDuration = 60 + Math.floor(Math.random() * 30);
        this.pulsePattern.spiralOffset = Math.random() * Math.PI * 2;
      }
    } else {
      // In break period
      this.pulsePattern.breakTimer++;
      if (this.pulsePattern.breakTimer >= this.pulsePattern.breakDuration) {
        this.pulsePattern.inBreak = false;
      }
    }
    
    // Spawn enemies
    if (this.enemySpawnTimer <= 0) {
      this.enemySpawnTimer = this.enemySpawnCooldown;
      
      // Spawn 3 enemies at once
      const enemyTypes = ["straight", "sine", "zigzag"];
      for (let i = 0; i < 3; i++) {
        enemies.push({
          type: enemyTypes[Math.floor(Math.random() * enemyTypes.length)],
          x: this.isPortrait ? Math.random() * this.canvasWidth : this.canvasWidth,
          y: this.isPortrait ? 0 : Math.random() * this.canvasHeight
        });
      }
    }
    
    return { bullets, enemies };
  }

  getHealthPercentage() {
    return this.health / this.maxHealth;
  }

  render(ctx) {
    ctx.save();
    
    // Apply hit flash
    if (this.hitFlash > 0) {
      ctx.globalAlpha = 0.5;
    }

    // Draw left arm
    if (!this.leftArm.destroyed) {
      this.drawNewArm(ctx, this.leftArm, "#ff8800");
    }

    // Draw right arm  
    if (!this.rightArm.destroyed) {
      this.drawNewArm(ctx, this.rightArm, "#ff0000");
    }

    // Draw continuous laser beam if active and arm is not destroyed
    if (this.leftArm.activeLaser && !this.leftArm.destroyed) {
      this.leftArm.activeLaser.render(ctx);
    }

    // Draw main body angled toward player
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.bodyAngle || 0);
    
    // Body color changes when vulnerable
    ctx.fillStyle = this.finalPhase ? "#ff4444" : "#444444";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    
    // Main body (rectangle with rounded corners)
    const bodyWidth = this.size * 0.6;
    const bodyHeight = this.size * 0.8;
    this.drawRoundedRect(ctx, -bodyWidth/2, -bodyHeight/2, bodyWidth, bodyHeight, 15);
    ctx.fill();
    ctx.stroke();
    
    // Gold shield indicator for invulnerable body (phases 1 and 2)
    if (!this.finalPhase) {
      ctx.strokeStyle = "#ffcc00"; // Gold stroke
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.8 + Math.sin(this.frameCount * 0.05) * 0.2;
      this.drawRoundedRect(ctx, -bodyWidth/2 - 3, -bodyHeight/2 - 3, bodyWidth + 6, bodyHeight + 6, 18);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    
    ctx.restore();

    // Draw moving robot head (rounded rectangle) - positioned relative to boss body
    const headWidth = this.size * 0.5;
    const headHeight = this.size * 0.4;
    const headX = this.x + this.headOffsetX; // Relative to boss body position
    const headY = this.y + this.headOffsetY - this.size * 0.3; // Positioned above body center
    
    ctx.fillStyle = "#666666";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    
    ctx.save();
    ctx.translate(headX, headY);
    this.drawRoundedRect(ctx, -headWidth/2, -headHeight/2, headWidth, headHeight, 10);
    ctx.fill();
    ctx.stroke();

    // Draw angry eyes with tracking eyeballs
    const eyeSocketSize = this.size * 0.08;
    const eyeballSize = this.size * 0.04;
    const leftEyeX = -headWidth * 0.25;
    const rightEyeX = headWidth * 0.25;
    const eyeY = -headHeight * 0.15;
    
    // Draw eye sockets (larger, angled for anger)
    ctx.fillStyle = "#333333";
    ctx.beginPath();
    ctx.ellipse(leftEyeX, eyeY, eyeSocketSize, eyeSocketSize * 0.7, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(rightEyeX, eyeY, eyeSocketSize, eyeSocketSize * 0.7, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw tracking eyeballs (constrained within sockets)
    ctx.fillStyle = "#ff0000";
    const maxEyeMovement = eyeSocketSize * 0.3; // Limit eyeball movement within socket
    const constrainedEyeX = Math.max(-maxEyeMovement, Math.min(maxEyeMovement, this.eyeOffsetX * 0.3));
    const constrainedEyeY = Math.max(-maxEyeMovement, Math.min(maxEyeMovement, this.eyeOffsetY * 0.3));
    
    // Left eyeball
    ctx.beginPath();
    ctx.ellipse(leftEyeX + constrainedEyeX, eyeY + constrainedEyeY, eyeballSize, eyeballSize * 0.8, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Right eyeball
    ctx.beginPath();
    ctx.ellipse(rightEyeX + constrainedEyeX, eyeY + constrainedEyeY, eyeballSize, eyeballSize * 0.8, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Angry eyebrows (fixed position, not following eyes)
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Left eyebrow (angled down toward center for anger)
    ctx.moveTo(-headWidth * 0.35, -headHeight * 0.25);
    ctx.lineTo(-headWidth * 0.15, -headHeight * 0.2);
    // Right eyebrow (angled down toward center for anger)
    ctx.moveTo(headWidth * 0.15, -headHeight * 0.2);
    ctx.lineTo(headWidth * 0.35, -headHeight * 0.25);
    ctx.stroke();
    
    // Draw angry mouth
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 3;
    ctx.fillStyle = "#ff0000";
    ctx.beginPath();
    if (this.mouthState === 0) {
      // Angry frown (inverted arc)
      ctx.arc(0, headHeight * 0.05, headWidth * 0.2, 0.2, Math.PI - 0.2);
      ctx.stroke();
      
      // Add angry teeth
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 5; i++) {
        const toothX = (i - 2) * headWidth * 0.08;
        const toothY = headHeight * 0.15;
        ctx.beginPath();
        ctx.moveTo(toothX, toothY);
        ctx.lineTo(toothX - 2, toothY + 6);
        ctx.lineTo(toothX + 2, toothY + 6);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // Open angry mouth (aggressive oval with teeth)
      ctx.ellipse(0, headHeight * 0.15, headWidth * 0.18, headHeight * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Sharp teeth around the mouth
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const toothX = Math.cos(angle) * headWidth * 0.15;
        const toothY = headHeight * 0.15 + Math.sin(angle) * headHeight * 0.1;
        ctx.beginPath();
        ctx.moveTo(toothX, toothY);
        ctx.lineTo(toothX + Math.cos(angle) * 4, toothY + Math.sin(angle) * 4);
        ctx.lineTo(toothX - Math.sin(angle) * 2, toothY + Math.cos(angle) * 2);
        ctx.closePath();
        ctx.fill();
      }
    }
    
    ctx.restore();

    // Draw shield in final phase
    if (this.finalPhase && this.shield > 0) {
      const shieldIntensity = this.shield / this.maxShield;
      ctx.strokeStyle = `rgba(0, 255, 255, ${shieldIntensity * 0.8})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 0.8, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    // Draw health bars
    this.renderHealthBars(ctx);
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

  // Old drawArticulatedArm method removed - now using drawNewArm instead

  renderHealthBars(ctx) {
    const barWidth = 60;  // Smaller, more compact bars
    const barHeight = 6;  // Thinner bars
    const barOffset = 25; // Distance above each component
    
    // Left arm health - positioned above the left arm
    if (!this.leftArm.destroyed) {
      const barX = this.leftArm.x - barWidth / 2;
      const barY = this.leftArm.y - barOffset;
      
      ctx.fillStyle = "#333333";
      ctx.fillRect(barX, barY, barWidth, barHeight);
      const healthPercent = this.leftArm.health / this.leftArm.maxHealth;
      ctx.fillStyle = "#ff8800";
      ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
    
    // Right arm health - positioned above the right arm
    if (!this.rightArm.destroyed) {
      const barX = this.rightArm.x - barWidth / 2;
      const barY = this.rightArm.y - barOffset;
      
      ctx.fillStyle = "#333333";
      ctx.fillRect(barX, barY, barWidth, barHeight);
      const healthPercent = this.rightArm.health / this.rightArm.maxHealth;
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
    
    // Shield bar (final phase) - positioned above the main body
    if (this.finalPhase && this.shield > 0) {
      const barX = this.x - barWidth / 2;
      const barY = this.y - this.size / 2 - barOffset;
      
      ctx.fillStyle = "#333333";
      ctx.fillRect(barX, barY, barWidth, barHeight);
      const shieldPercent = this.shield / this.maxShield;
      ctx.fillStyle = "#00ffff";
      ctx.fillRect(barX, barY, barWidth * shieldPercent, barHeight);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
    
    // Main health bar - positioned above the main body
    if (this.finalPhase || (this.leftArm.destroyed && this.rightArm.destroyed)) {
      const barX = this.x - barWidth / 2;
      const barY = this.y - this.size / 2 - barOffset - (this.finalPhase && this.shield > 0 ? barHeight + 5 : 0);
      
      ctx.fillStyle = "#333333";
      ctx.fillRect(barX, barY, barWidth, barHeight);
      const healthPercent = this.getHealthPercentage();
      ctx.fillStyle = healthPercent > 0.5 ? "#00ff00" : healthPercent > 0.25 ? "#ffff00" : "#ff0000";
      ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
  }

  drawNewArm(ctx, arm, color) {
    ctx.save();
    ctx.translate(arm.x, arm.y);
    
    // Draw shoulder joint (half-circle + rectangle)
    ctx.save();
    ctx.rotate(arm.shoulderAngle);
    
    // Shoulder base (rectangle)
    ctx.fillStyle = "#666666";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-15, -arm.shoulderRadius, 30, arm.shoulderRadius * 2);
    ctx.fill();
    ctx.stroke();
    
    // Shoulder joint (half-circle)
    ctx.fillStyle = "#888888";
    ctx.beginPath();
    ctx.arc(15, 0, arm.shoulderRadius, -Math.PI/2, Math.PI/2);
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
    
    // Draw weapon core angled toward player
    ctx.save();
    ctx.rotate(arm.coreAngle);
    
    // Weapon core with charging effects for sweeping laser
    ctx.fillStyle = color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    
    // Add charging effects for left arm sweeping laser
    if (arm.type === "laser" && arm.sweepState === "charging") {
      const chargeProgress = arm.sweepChargeTime / arm.sweepMaxChargeTime;
      const intensity = Math.min(1, chargeProgress);
      
      // Pulsing orange glow around weapon core
      ctx.shadowColor = "#ff8800";
      ctx.shadowBlur = 15 + intensity * 20;
      ctx.strokeStyle = `rgba(255, 136, 0, ${intensity})`;
      ctx.lineWidth = 3 + intensity * 5;
    } else if (arm.type === "laser" && arm.sweepState === "sweeping") {
      // Bright glow when actively sweeping
      ctx.shadowColor = "#ffaa00";
      ctx.shadowBlur = 25;
      ctx.strokeStyle = "#ffaa00";
      ctx.lineWidth = 6;
    }
    
    // Main weapon body
    ctx.beginPath();
    ctx.rect(0, -arm.coreHeight/2, arm.coreLength, arm.coreHeight);
    ctx.fill();
    ctx.stroke();
    
    // Reset shadow effects
    ctx.shadowBlur = 0;
    
    // Weapon details based on type
    if (arm.type === "laser") {
      // Laser cannon details
      ctx.fillStyle = "#ffff00";
      ctx.beginPath();
      ctx.rect(arm.coreLength - 10, -5, 15, 10);
      ctx.fill();
      
      // Charging effect
      if (arm.laserCharging) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.7 + Math.sin(arm.laserChargeTime * 0.3) * 0.3;
        ctx.beginPath();
        ctx.rect(-5, -arm.coreHeight/2 - 5, arm.coreLength + 10, arm.coreHeight + 10);
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
        ctx.rect(arm.coreLength - 5, tubeY - 3, 10, 6);
        ctx.fill();
      }
    }
    
    ctx.restore();
    ctx.restore();
  }
}

// Robot Boss implementation - the current boss with articulated arms
export class RobotBoss extends Boss {
  constructor(x, y, isPortrait, canvasWidth, canvasHeight) {
    super(x, y, isPortrait, canvasWidth, canvasHeight);
    this.type = "robot_boss";
    
    // This boss uses the existing robot design and logic
    // All the robot-specific rendering and behavior is already in the parent Boss class
  }
}