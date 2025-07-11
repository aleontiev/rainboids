export class Boss {
  constructor(x, y, isPortrait, canvasWidth, canvasHeight) {
    this.x = x;
    this.y = y;
    this.isPortrait = isPortrait;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.size = 120; // Very large boss
    this.maxHealth = 1000; // Main body health
    this.health = this.maxHealth;
    this.frameCount = 0;

    // Movement
    this.movePattern = "entering";
    this.targetX = isPortrait ? canvasWidth / 2 : canvasWidth - 200;
    this.targetY = isPortrait ? 200 : canvasHeight / 2;
    this.speed = 1;
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

    // Boss arms system with articulation
    this.leftArm = {
      health: 500,
      maxHealth: 500,
      destroyed: false,
      type: "laser",
      cooldown: 0,
      maxCooldown: 120, // 2 seconds
      laserCharging: false,
      laserChargeTime: 0,
      segments: [
        { x: 0, y: 0, angle: Math.PI, length: 35 }, // First segment points left
        { x: 0, y: 0, angle: 0, length: 30 }
      ],
      targetAngles: [Math.PI, 0],
      animationTime: 0,
      baseX: -this.size * 0.35, // Left side of body
      baseY: 0
    };
    
    this.rightArm = {
      health: 500,
      maxHealth: 500,
      destroyed: false,
      type: "missiles",
      cooldown: 0,
      maxCooldown: 90, // 1.5 seconds
      burstCooldown: 0,
      segments: [
        { x: 0, y: 0, angle: 0, length: 35 }, // First segment points right
        { x: 0, y: 0, angle: 0, length: 30 }
      ],
      targetAngles: [0, 0],
      animationTime: 0,
      baseX: this.size * 0.35, // Right side of body
      baseY: 0
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
    this.angle = 0; // No rotation

    // Death sequence
    this.isDefeated = false;
    this.deathTimer = 0;
    this.explosionTimer = 0;
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

    // Animate robot head movement
    this.headMoveTime += 0.02;
    this.headOffsetX = Math.sin(this.headMoveTime) * 15;
    this.headOffsetY = Math.cos(this.headMoveTime * 0.7) * 10;

    // Animate eyes
    this.eyeMoveTime += 0.05;
    this.eyeOffsetX = Math.sin(this.eyeMoveTime) * 3;
    this.eyeOffsetY = Math.cos(this.eyeMoveTime * 1.3) * 2;

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
    
    arm.animationTime += 0.03;
    
    // Calculate angle to player for weapon targeting
    const armWorldX = this.x + arm.baseX;
    const armWorldY = this.y + arm.baseY;
    const angleToPlayer = Math.atan2(playerY - armWorldY, playerX - armWorldX);
    
    // Generate target angles for organic movement based on arm type
    if (arm.type === "laser") {
      // Laser arm moves more deliberately, but aims toward player
      arm.targetAngles[0] = angleToPlayer + Math.sin(arm.animationTime * 0.8) * 0.2;
      arm.targetAngles[1] = Math.sin(arm.animationTime * 1.2) * 0.3;
    } else {
      // Missile arm moves more aggressively, tracking player
      arm.targetAngles[0] = angleToPlayer + Math.sin(arm.animationTime) * 0.3;
      arm.targetAngles[1] = Math.sin(arm.animationTime * 1.5) * 0.2;
    }
    
    // Smoothly interpolate current angles toward targets
    for (let i = 0; i < arm.segments.length; i++) {
      const diff = arm.targetAngles[i] - arm.segments[i].angle;
      arm.segments[i].angle += diff * 0.1;
    }
    
    // Calculate segment positions
    let currentX = arm.baseX;
    let currentY = arm.baseY;
    
    for (let i = 0; i < arm.segments.length; i++) {
      const segment = arm.segments[i];
      segment.x = currentX;
      segment.y = currentY;
      
      // Calculate next position
      currentX += Math.cos(segment.angle) * segment.length;
      currentY += Math.sin(segment.angle) * segment.length;
    }
    
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
    const relativeX = bulletX - this.x;
    const relativeY = bulletY - this.y;
    
    // Check left arm (articulated segments)
    if (!this.leftArm.destroyed) {
      for (let i = 0; i < this.leftArm.segments.length; i++) {
        const segment = this.leftArm.segments[i];
        const segmentX = segment.x;
        const segmentY = segment.y;
        
        if (Math.abs(relativeX - segmentX) < 18 && 
            Math.abs(relativeY - segmentY) < 18) {
          return 'leftArm';
        }
      }
    }

    // Check right arm (articulated segments)
    if (!this.rightArm.destroyed) {
      for (let i = 0; i < this.rightArm.segments.length; i++) {
        const segment = this.rightArm.segments[i];
        const segmentX = segment.x;
        const segmentY = segment.y;
        
        if (Math.abs(relativeX - segmentX) < 18 && 
            Math.abs(relativeY - segmentY) < 18) {
          return 'rightArm';
        }
      }
    }

    // Check body (rectangle-ish)
    if (Math.abs(relativeX) < this.size * 0.4 && 
        Math.abs(relativeY) < this.size * 0.6) {
      return 'body';
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
      // Can only damage body in final phase or if both arms destroyed
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
      }
    }
    
    return false;
  }

  // Fire left arm lasers and homing missiles
  fireLeftArm(playerX, playerY) {
    if (this.leftArm.destroyed || this.leftArm.cooldown > 0) return [];
    
    const projectiles = [];
    
    // Get firing position from end of arm
    const lastSegment = this.leftArm.segments[this.leftArm.segments.length - 1];
    const armX = this.x + lastSegment.x;
    const armY = this.y + lastSegment.y;
    
    // Main laser (like laser enemy)
    if (Math.random() < 0.3) { // 30% chance for main laser
      this.leftArm.laserCharging = true;
      this.leftArm.laserChargeTime = 0;
      this.leftArm.cooldown = this.leftArm.maxCooldown;
      
      // Fire main laser after charging
      setTimeout(() => {
        const angle = Math.atan2(playerY - armY, playerX - armX);
        projectiles.push({
          type: "laser",
          x: armX,
          y: armY,
          angle: angle,
          speed: 1.5,
          color: "#ff8800", // Orange laser
          width: 8,
          length: 400
        });
      }, 1000);
    }
    
    // Side shooter homing missiles
    if (Math.random() < 0.7) { // 70% chance for side missiles
      const sideOffsets = [-15, 15]; // Left and right sides
      for (const offset of sideOffsets) {
        const sideAngle = Math.atan2(playerY - armY, playerX - armX) + Math.PI/2;
        const sideX = armX + Math.cos(sideAngle) * offset;
        const sideY = armY + Math.sin(sideAngle) * offset;
        
        projectiles.push({
          type: "homing",
          x: sideX,
          y: sideY,
          vx: Math.cos(Math.atan2(playerY - sideY, playerX - sideX)) * 2,
          vy: Math.sin(Math.atan2(playerY - sideY, playerX - sideX)) * 2,
          targetX: playerX,
          targetY: playerY,
          homingStrength: 0.05,
          color: "#ff4400", // Red-orange missiles
          size: 6
        });
      }
    }
    
    this.leftArm.cooldown = this.leftArm.maxCooldown;
    return projectiles;
  }

  // Fire right arm missiles and bullet spreads
  fireRightArm(playerX, playerY) {
    if (this.rightArm.destroyed || this.rightArm.cooldown > 0) return [];
    
    const projectiles = [];
    
    // Get firing position from end of arm
    const lastSegment = this.rightArm.segments[this.rightArm.segments.length - 1];
    const armX = this.x + lastSegment.x;
    const armY = this.y + lastSegment.y;
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
    
    // Colorful bullet spray
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + this.frameCount * 0.05;
      const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"];
      bullets.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * 4,
        vy: Math.sin(angle) * 4,
        size: 6,
        color: colors[i % colors.length],
        type: "boss"
      });
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
    ctx.translate(this.x, this.y);

    // Apply hit flash
    if (this.hitFlash > 0) {
      ctx.globalAlpha = 0.5;
    }

    // Draw main rectangle-ish body
    ctx.fillStyle = "#444444";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    
    // Main body (rectangle with rounded corners)
    const bodyWidth = this.size * 0.8;
    const bodyHeight = this.size * 1.2;
    this.drawRoundedRect(ctx, -bodyWidth/2, -bodyHeight/2, bodyWidth, bodyHeight, 15);
    ctx.fill();
    ctx.stroke();

    // Draw articulated left arm
    if (!this.leftArm.destroyed) {
      this.drawArticulatedArm(ctx, this.leftArm, "#ff8800");
    }

    // Draw articulated right arm
    if (!this.rightArm.destroyed) {
      this.drawArticulatedArm(ctx, this.rightArm, "#ff0000");
    }

    // Draw moving robot head (rounded rectangle)
    const headWidth = this.size * 0.5;
    const headHeight = this.size * 0.4;
    const headX = this.headOffsetX;
    const headY = this.headOffsetY - this.size * 0.1;
    
    ctx.fillStyle = "#666666";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    
    ctx.save();
    ctx.translate(headX, headY);
    this.drawRoundedRect(ctx, -headWidth/2, -headHeight/2, headWidth, headHeight, 10);
    ctx.fill();
    ctx.stroke();

    // Draw angry eyes
    ctx.fillStyle = "#ff0000";
    const eyeSize = this.size * 0.06;
    
    // Left eye (angled downward for anger)
    ctx.beginPath();
    ctx.ellipse(-headWidth * 0.25 + this.eyeOffsetX, -headHeight * 0.15 + this.eyeOffsetY, eyeSize, eyeSize * 0.7, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Right eye (angled downward for anger)
    ctx.beginPath();
    ctx.ellipse(headWidth * 0.25 + this.eyeOffsetX, -headHeight * 0.15 + this.eyeOffsetY, eyeSize, eyeSize * 0.7, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Angry eyebrows
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Left eyebrow
    ctx.moveTo(-headWidth * 0.35 + this.eyeOffsetX, -headHeight * 0.25 + this.eyeOffsetY);
    ctx.lineTo(-headWidth * 0.15 + this.eyeOffsetX, -headHeight * 0.2 + this.eyeOffsetY);
    // Right eyebrow
    ctx.moveTo(headWidth * 0.15 + this.eyeOffsetX, -headHeight * 0.2 + this.eyeOffsetY);
    ctx.lineTo(headWidth * 0.35 + this.eyeOffsetX, -headHeight * 0.25 + this.eyeOffsetY);
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

  drawArticulatedArm(ctx, arm, color) {
    ctx.save();
    
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.fillStyle = color;
    
    // Draw segments and joints
    for (let i = 0; i < arm.segments.length; i++) {
      const segment = arm.segments[i];
      
      // Draw joint at segment start
      ctx.save();
      ctx.translate(segment.x, segment.y);
      
      // Round joint
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#888888";
      ctx.fill();
      ctx.stroke();
      
      // Draw segment cylinder
      ctx.rotate(segment.angle);
      const segmentWidth = segment.length;
      const segmentHeight = 14 - i * 2; // Taper the arm
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.rect(0, -segmentHeight/2, segmentWidth, segmentHeight);
      ctx.fill();
      ctx.stroke();
      
      // Add segment details
      ctx.strokeStyle = "#cccccc";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(segmentWidth * 0.3, -segmentHeight/2 + 2);
      ctx.lineTo(segmentWidth * 0.3, segmentHeight/2 - 2);
      ctx.moveTo(segmentWidth * 0.7, -segmentHeight/2 + 2);
      ctx.lineTo(segmentWidth * 0.7, segmentHeight/2 - 2);
      ctx.stroke();
      
      ctx.restore();
    }
    
    // Draw weapon at end of arm
    const lastSegment = arm.segments[arm.segments.length - 1];
    const weaponX = lastSegment.x + Math.cos(lastSegment.angle) * lastSegment.length;
    const weaponY = lastSegment.y + Math.sin(lastSegment.angle) * lastSegment.length;
    
    ctx.save();
    ctx.translate(weaponX, weaponY);
    ctx.rotate(lastSegment.angle);
    
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    
    if (arm.type === "laser") {
      // Laser weapon with side shooters
      ctx.fillStyle = color;
      
      // Main laser housing
      ctx.beginPath();
      ctx.rect(0, -10, 25, 20);
      ctx.fill();
      ctx.stroke();
      
      // Main laser barrel
      ctx.beginPath();
      ctx.rect(25, -3, 20, 6);
      ctx.fill();
      ctx.stroke();
      
      // Side shooters for homing missiles
      ctx.fillStyle = "#ff4400";
      ctx.beginPath();
      ctx.rect(15, -15, 8, 5);
      ctx.rect(15, 10, 8, 5);
      ctx.fill();
      ctx.stroke();
      
      // Charging effect
      if (arm.laserCharging) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4 + Math.sin(arm.laserChargeTime * 0.3) * 2;
        ctx.beginPath();
        ctx.rect(0, -10, 25, 20);
        ctx.stroke();
      }
    } else {
      // Massive missile launcher
      ctx.fillStyle = color;
      
      // Main launcher body
      ctx.beginPath();
      ctx.rect(0, -15, 35, 30);
      ctx.fill();
      ctx.stroke();
      
      // Missile tubes
      const tubePositions = [
        {x: 35, y: -8, size: 4},
        {x: 35, y: 0, size: 5},
        {x: 35, y: 8, size: 4},
        {x: 30, y: -4, size: 3},
        {x: 30, y: 4, size: 3}
      ];
      
      ctx.fillStyle = "#333333";
      for (const tube of tubePositions) {
        ctx.beginPath();
        ctx.arc(tube.x, tube.y, tube.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      
      // Launcher details
      ctx.strokeStyle = "#cccccc";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(5, -15);
      ctx.lineTo(5, 15);
      ctx.moveTo(15, -15);
      ctx.lineTo(15, 15);
      ctx.moveTo(25, -15);
      ctx.lineTo(25, 15);
      ctx.stroke();
    }
    
    ctx.restore();
    ctx.restore();
  }

  renderHealthBars(ctx) {
    const barWidth = 100;
    const barHeight = 12;
    const barSpacing = 5;
    let currentY = this.y - this.size - 80;

    // Left arm health
    if (!this.leftArm.destroyed) {
      const barX = this.x - barWidth / 2;
      ctx.fillStyle = "#333333";
      ctx.fillRect(barX, currentY, barWidth, barHeight);

      const healthPercent = this.leftArm.health / this.leftArm.maxHealth;
      ctx.fillStyle = "#ff8800";
      ctx.fillRect(barX, currentY, barWidth * healthPercent, barHeight);

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, currentY, barWidth, barHeight);

      ctx.fillStyle = "#ffffff";
      ctx.font = '10px "Press Start 2P"';
      ctx.textAlign = "center";
      ctx.fillText("LEFT ARM", this.x, currentY + 10);

      currentY += barHeight + barSpacing;
    }

    // Right arm health
    if (!this.rightArm.destroyed) {
      const barX = this.x - barWidth / 2;
      ctx.fillStyle = "#333333";
      ctx.fillRect(barX, currentY, barWidth, barHeight);

      const healthPercent = this.rightArm.health / this.rightArm.maxHealth;
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(barX, currentY, barWidth * healthPercent, barHeight);

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, currentY, barWidth, barHeight);

      ctx.fillStyle = "#ffffff";
      ctx.font = '10px "Press Start 2P"';
      ctx.textAlign = "center";
      ctx.fillText("RIGHT ARM", this.x, currentY + 10);

      currentY += barHeight + barSpacing;
    }

    // Shield bar (final phase)
    if (this.finalPhase && this.shield > 0) {
      const barX = this.x - barWidth / 2;
      ctx.fillStyle = "#333333";
      ctx.fillRect(barX, currentY, barWidth, barHeight);

      const shieldPercent = this.shield / this.maxShield;
      ctx.fillStyle = "#00ffff";
      ctx.fillRect(barX, currentY, barWidth * shieldPercent, barHeight);

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, currentY, barWidth, barHeight);

      ctx.fillStyle = "#ffffff";
      ctx.font = '10px "Press Start 2P"';
      ctx.textAlign = "center";
      ctx.fillText("SHIELD", this.x, currentY + 10);

      currentY += barHeight + barSpacing;
    }

    // Main health bar
    if (this.finalPhase || (this.leftArm.destroyed && this.rightArm.destroyed)) {
      const barX = this.x - barWidth / 2;
      ctx.fillStyle = "#333333";
      ctx.fillRect(barX, currentY, barWidth, barHeight);

      const healthPercent = this.getHealthPercentage();
      ctx.fillStyle = healthPercent > 0.5 ? "#00ff00" : healthPercent > 0.25 ? "#ffff00" : "#ff0000";
      ctx.fillRect(barX, currentY, barWidth * healthPercent, barHeight);

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, currentY, barWidth, barHeight);

      ctx.fillStyle = "#ffffff";
      ctx.font = '10px "Press Start 2P"';
      ctx.textAlign = "center";
      ctx.fillText("CORE", this.x, currentY + 10);
    }

    // Boss name
    ctx.fillStyle = "#ffffff";
    ctx.font = '16px "Press Start 2P"';
    ctx.textAlign = "center";
    ctx.fillText("MECHANICAL OVERLORD", this.x, this.y - this.size - 100);
  }
}