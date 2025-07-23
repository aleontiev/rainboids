import { MiniBoss } from "./miniboss.js";
import { ContinuousLaserBeam } from "./continuous-laser-beam.js";

export class Boss extends MiniBoss {
  constructor(x, y, isPortrait, canvasWidth, canvasHeight, game = null) {
    super(x, y, isPortrait, canvasWidth, game); // Call MiniBoss constructor with game
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.type = "boss"; // Override miniboss type
    this.speed = 1; // Override miniboss speed
    this.size = 120; // Very large boss
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

    // Phase system
    this.currentPhaseIndex = 0;
    this.phaseTimer = 0;
    this.phaseStartTime = 0;

    // Parts registry - all boss parts are stored here
    this.parts = new Map();

    // Visual effects
    this.hitFlash = 0;
    this.bodyAngle = 0; // Initialize body angle
    this.invulnerable = false; // For consistency with base enemy class

    // Enhanced death sequence
    this.isDefeated = false;
    this.deathTimer = 0;
    this.deathDuration = 400; // 6.67 seconds - longer than miniboss
    this.explosionTimer = 0;
    this.deathExplosionInterval = 5; // Very frequent explosions
    this.deathBlinkTimer = 0;
    this.deathBlinkInterval = 3; // Very rapid blinking
    this.showRedFlash = false;
    this.opacity = 1.0;
    this.fadeOutStarted = false;
    this.deathSoundTimer = 0;
    this.deathSoundInterval = 25; // More frequent sounds than miniboss
    this.deathExplosionCount = 0;
    this.maxDeathExplosions = 35; // Many more explosions for boss
    this.finalExplosionTriggered = false;

    // Initialize configuration
    this.initializeConfig();
    this.initializeParts();
  }

  initializeConfig() {
    this.config = {
      // Boss phases configuration
      phases: [
        {
          id: 1,
          type: "action",
          name: "Twin Arms Assault",
          
          // End condition: all non-invulnerable parts defeated
          endCondition: "parts_defeated",
          endValue: null,
          
          // Parts active in this phase
          activeParts: ["leftArm", "rightArm", "body"],
          
          // Part configurations for this phase
          partConfigs: {
            leftArm: {
              invulnerable: false,
              invulnerabilityDuration: 0,
              enabled: true,
              canAttack: true // Arms can attack in phase 1
            },
            rightArm: {
              invulnerable: false, 
              invulnerabilityDuration: 0,
              enabled: true,
              canAttack: true // Arms can attack in phase 1
            },
            body: {
              invulnerable: true, // Body is invulnerable in phase 1
              invulnerabilityDuration: 0,
              enabled: true, // Body is visible in phase 1
              canAttack: false // Body cannot attack in phase 1
            }
          },
          
          // Phase-specific behavior
          behavior: {
            partAttackRates: {
              leftArm: 120,   // 2 seconds
              rightArm: 90    // 1.5 seconds
            },
            enemySpawnRate: null     // No enemy spawning in phase 1
          }
        },
        {
          id: 2,
          type: "dialog",
          name: "Rage Awakens",
          
          endCondition: "time",
          endValue: 3000, // 3 seconds of dialog
          
          activeParts: ["body"],
          
          partConfigs: {
            body: {
              invulnerable: true,
              invulnerabilityDuration: 0,
              enabled: true
            }
          },
          
          behavior: {
            dialogText: "YOU DARE DESTROY MY ARMS?! I'LL CRUSH YOU WITH MY BARE HANDS!",
            partAttackRates: {},
            enemySpawnRate: null
          }
        },
        {
          id: 3,
          type: "action", 
          name: "Final Fury",
          
          endCondition: "parts_defeated",
          endValue: null,
          
          activeParts: ["body"],
          
          partConfigs: {
            body: {
              invulnerable: false, // Body becomes vulnerable
              invulnerabilityDuration: 0,
              enabled: true,
              canAttack: true, // Body can attack in phase 3
              hasShield: true,
              maxShield: 1000
            }
          },
          
          behavior: {
            partAttackRates: {
              body: 3  // Very fast rainbow spiral attacks
            },
            enemySpawnRate: 180, // Spawn enemies every 3 seconds
            enraged: true
          }
        }
      ],
      
      // Part definitions - templates for boss parts
      partDefinitions: {
        leftArm: {
          type: "laser_arm",
          health: 500,
          maxHealth: 500,
          size: 50,
          attackType: "sweeping_laser",
          svgAsset: null, // No custom SVG, use built-in rendering
          position: "left",
          weaponConfig: {
            cooldown: 120,
            chargeTime: 120,
            sweepDuration: 720,
            sweepSpeed: 0.008
          }
        },
        rightArm: {
          type: "missile_arm", 
          health: 500,
          maxHealth: 500,
          size: 50,
          attackType: "missile_barrage",
          svgAsset: null,
          position: "right",
          weaponConfig: {
            cooldown: 90,
            burstSize: 3,
            spreadAngle: 0.4
          }
        },
        body: {
          type: "core",
          health: 1000,
          maxHealth: 1000,
          size: 120,
          attackType: "rainbow_spiral",
          svgAsset: null,
          position: "center",
          weaponConfig: {
            spiralBullets: 10,
            spiralSpeed: 3.5,
            waveCount: 20,
            breakDuration: 60
          }
        }
      }
    };
  }

  initializeParts() {
    // Create parts based on definitions
    for (const [partId, definition] of Object.entries(this.config.partDefinitions)) {
      const part = {
        id: partId,
        type: definition.type,
        health: definition.health,
        maxHealth: definition.maxHealth,
        size: definition.size,
        destroyed: false,
        invulnerable: false,
        invulnerabilityTimer: 0,
        enabled: false,
        
        // Position properties (calculated during update)
        x: this.x,
        y: this.y,
        
        // Weapon properties
        attackType: definition.attackType,
        cooldown: 0,
        maxCooldown: definition.weaponConfig.cooldown || 60,
        weaponConfig: { ...definition.weaponConfig },
        
        // Visual properties
        svgAsset: definition.svgAsset,
        position: definition.position,
        hitFlash: 0,
        
        // Type-specific properties
        ...(definition.type === "laser_arm" && {
          shoulderAngle: 0,
          coreAngle: 0,
          shoulderRadius: 25,
          coreWidth: 40,
          coreHeight: 20,
          coreLength: 60,
          sweepState: "inactive",
          sweepAngle: 0,
          sweepDirection: 1,
          sweepChargeTime: 0,
          sweepDuration: 0,
          activeLaser: null
        }),
        
        ...(definition.type === "missile_arm" && {
          shoulderAngle: 0,
          coreAngle: 0,
          shoulderRadius: 25,
          coreWidth: 45,
          coreHeight: 25,
          coreLength: 70,
          burstCooldown: 0
        }),
        
        ...(definition.type === "core" && {
          shield: 0,
          maxShield: 0,
          pulsePattern: {
            waveCount: 0,
            maxWaves: 20,
            inBreak: false,
            breakTimer: 0,
            breakDuration: 60,
            spiralOffset: Math.random() * Math.PI * 2
          },
          enemySpawnTimer: 0,
          enemySpawnCooldown: 180,
          enraged: false
        }),
        
        // Method to check if part is vulnerable
        isVulnerable: function() {
          return this.enabled && !this.destroyed && !this.invulnerable;
        }
      };
      
      this.parts.set(partId, part);
    }

    // Set up health tracking from body part
    const bodyPart = this.parts.get("body");
    this.health = bodyPart.health;
    this.maxHealth = bodyPart.maxHealth;

    // Initialize first phase
    this.transitionToPhase(0);
  }

  getCurrentPhase() {
    return this.config.phases[this.currentPhaseIndex] || this.config.phases[0];
  }

  transitionToPhase(phaseIndex) {
    if (phaseIndex >= this.config.phases.length) {
      this.isDefeated = true;
      return;
    }

    const oldPhase = this.getCurrentPhase();
    this.currentPhaseIndex = phaseIndex;
    const newPhase = this.getCurrentPhase();
    
    this.phaseTimer = 0;
    this.phaseStartTime = Date.now();
    
    
    // Configure parts for new phase
    this.configureParts(newPhase);
    
    // Debug: Ensure arms are properly configured for phase 0
    if (phaseIndex === 0) {
      const leftArm = this.parts.get("leftArm");
      const rightArm = this.parts.get("rightArm");
      if (leftArm) {
        leftArm.enabled = true;
        leftArm.invulnerable = false;
        leftArm.canAttack = true;
      }
      if (rightArm) {
        rightArm.enabled = true;
        rightArm.invulnerable = false;  
        rightArm.canAttack = true;
      }
    }
  }

  configureParts(phase) {
    // First, disable all parts
    for (const part of this.parts.values()) {
      part.enabled = false;
      part.invulnerable = true;
    }
    
    // Configure parts for this phase
    for (const partId of phase.activeParts) {
      const part = this.parts.get(partId);
      if (!part) continue;
      
      const partConfig = phase.partConfigs[partId];
      if (!partConfig) continue;
      
      part.enabled = partConfig.enabled;
      part.invulnerable = partConfig.invulnerable;
      part.invulnerabilityTimer = partConfig.invulnerabilityDuration || 0;
      part.canAttack = partConfig.canAttack !== false; // Default to true if not specified
      
      
      // Special configurations
      if (partConfig.hasShield && part.type === "core") {
        part.shield = partConfig.maxShield || 0;
        part.maxShield = partConfig.maxShield || 0;
      }
    }
    
    // Apply behavior config
    const behavior = phase.behavior;
    if (behavior) {
      // Update part attack rates
      if (behavior.partAttackRates) {
        for (const [partId, attackRate] of Object.entries(behavior.partAttackRates)) {
          const part = this.parts.get(partId);
          if (part) {
            part.maxCooldown = attackRate;
          }
        }
      }
      
      // Update enemy spawn rate for core parts
      if (behavior.enemySpawnRate) {
        for (const part of this.parts.values()) {
          if (part.type === "core") {
            part.enemySpawnCooldown = behavior.enemySpawnRate;
          }
        }
      }
      
      // Update enraged status for core parts
      if (behavior.enraged !== undefined) {
        for (const part of this.parts.values()) {
          if (part.type === "core") {
            part.enraged = behavior.enraged;
          }
        }
      }
    }
  }

  checkPhaseTransition() {
    const currentPhase = this.getCurrentPhase();
    let shouldTransition = false;
    
    switch (currentPhase.endCondition) {
      case "time":
        shouldTransition = this.phaseTimer >= currentPhase.endValue;
        break;
      case "parts_defeated":
        // Check if all non-invulnerable active parts are defeated
        const activeParts = currentPhase.activeParts
          .map(partId => this.parts.get(partId))
          .filter(part => part && part.enabled && !part.invulnerable);
        shouldTransition = activeParts.every(part => part.destroyed || part.health <= 0.01);
        break;
      case "health_threshold":
        shouldTransition = this.health <= currentPhase.endValue;
        break;
    }
    
    if (shouldTransition) {
      this.transitionToPhase(this.currentPhaseIndex + 1);
    }
  }

  // Check if this boss is vulnerable
  isVulnerable() {
    // Body is only vulnerable if enabled and not invulnerable
    const bodyPart = this.parts.get("body");
    return bodyPart && bodyPart.enabled && !bodyPart.invulnerable && !bodyPart.destroyed;
  }

  // Get all targetable parts for auto-aim
  getTargetableParts() {
    const targets = [];
    
    for (const part of this.parts.values()) {
      if (!part.isVulnerable()) continue;
      
      let targetType, armType;
      switch (part.type) {
        case "laser_arm":
          targetType = "bossArm";
          armType = "laser";
          break;
        case "missile_arm":
          targetType = "bossArm";
          armType = "missiles";
          break;
        case "core":
          targetType = "bossBody";
          break;
        default:
          continue;
      }
      
      targets.push({
        x: part.x,
        y: part.y,
        type: targetType,
        armType: armType,
        health: part.health,
        size: part.size,
        boss: this,
        arm: part.position,
        partId: part.id
      });
    }
    
    return targets;
  }

  update(playerX, playerY) {
    this.frameCount++;
    this.phaseTimer++;
    
    if (this.isDefeated) {
      this.deathTimer++;
      this.explosionTimer++;
      this.deathBlinkTimer++;
      this.deathSoundTimer++;

      // Handle rapid red blinking effect
      if (this.deathBlinkTimer >= this.deathBlinkInterval) {
        this.deathBlinkTimer = 0;
        this.showRedFlash = !this.showRedFlash;
      }

      // Start fade out in the last third of death sequence
      if (this.deathTimer >= this.deathDuration * 0.66 && !this.fadeOutStarted) {
        this.fadeOutStarted = true;
      }

      // Fade out gradually
      if (this.fadeOutStarted) {
        const fadeProgress = (this.deathTimer - this.deathDuration * 0.66) / (this.deathDuration * 0.34);
        this.opacity = Math.max(0, 1 - fadeProgress);
      }

      // Play cascading boss death sounds
      if (this.deathSoundTimer >= this.deathSoundInterval && this.deathExplosionCount < this.maxDeathExplosions) {
        this.deathSoundTimer = 0;
        return {
          type: "death_sound",
          soundType: "bossExplosion"
        };
      }

      // Trigger massive final explosion when death timer is complete
      if (
        this.deathTimer >= this.deathDuration &&
        !this.finalExplosionTriggered
      ) {
        this.finalExplosionTriggered = true;
        return {
          type: "final_boss_explosion",
          x: this.x,
          y: this.y,
          size: this.size * 4, // Massive final explosion
          soundType: "megaBossExplosion"
        };
      }

      // Create intense explosion pattern around the boss
      if (this.explosionTimer >= this.deathExplosionInterval && this.deathExplosionCount < this.maxDeathExplosions) {
        this.explosionTimer = 0;
        this.deathExplosionCount++;
        
        // Create escalating explosion pattern with multiple explosions per cycle
        const explosionsThisCycle = Math.min(3, Math.floor(1 + this.deathExplosionCount / 10)); // More explosions as death progresses
        const explosions = [];
        
        for (let i = 0; i < explosionsThisCycle; i++) {
          const explosionAngle = Math.random() * Math.PI * 2;
          const baseDistance = this.size * 0.3;
          const maxDistance = this.size * 2.0;
          const progressFactor = this.deathExplosionCount / this.maxDeathExplosions;
          const explosionDistance = baseDistance + (maxDistance - baseDistance) * progressFactor * Math.random();
          
          const explosionX = this.x + Math.cos(explosionAngle) * explosionDistance;
          const explosionY = this.y + Math.sin(explosionAngle) * explosionDistance;
          
          // Much larger explosions as death progresses
          const baseSize = 50;
          const maxSize = 120;
          const explosionSize = baseSize + (maxSize - baseSize) * progressFactor + Math.random() * 30;
          
          explosions.push({
            x: explosionX,
            y: explosionY,
            size: explosionSize,
            intensity: progressFactor
          });
        }
        
        return {
          type: "boss_death_explosions",
          explosions: explosions
        };
      }

      return "dying";
    }

    // Check for phase transitions
    this.checkPhaseTransition();

    // Update parts
    this.updateParts(playerX, playerY);

    // Animate robot head movement (subtle movement around center)
    this.headMoveTime += 0.02;
    this.headOffsetX = Math.sin(this.headMoveTime) * 8;
    this.headOffsetY = Math.cos(this.headMoveTime * 0.7) * 5;

    // Calculate eye tracking toward player
    const eyeTrackRange = 8;
    const eyeToPlayerX = playerX - this.x;
    const eyeToPlayerY = playerY - this.y;
    const eyeDistance = Math.sqrt(eyeToPlayerX * eyeToPlayerX + eyeToPlayerY * eyeToPlayerY);
    
    if (eyeDistance > 0) {
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

    // Movement logic
    this.updateMovement();

    // Hit flash
    if (this.hitFlash > 0) {
      this.hitFlash--;
    }

    // Sync health and shield from body part
    const bodyPart = this.parts.get("body");
    if (bodyPart) {
      this.health = bodyPart.health;
      this.shield = bodyPart.shield || 0;
      this.maxShield = bodyPart.maxShield || 0;
      this.finalPhase = bodyPart.enabled && !bodyPart.invulnerable;
      this.enraged = bodyPart.enraged || false;
    }
  }

  updateParts(playerX, playerY) {
    for (const part of this.parts.values()) {
      if (!part.enabled) continue;
      
      // Update invulnerability timer
      if (part.invulnerabilityTimer > 0) {
        part.invulnerabilityTimer--;
        if (part.invulnerabilityTimer <= 0) {
          part.invulnerable = false;
        }
      }
      
      // Update cooldowns
      if (part.cooldown > 0) {
        part.cooldown--;
      }
      
      // Update hit flash
      if (part.hitFlash > 0) {
        part.hitFlash--;
      }
      
      // Update position based on part type
      this.updatePartPosition(part, playerX, playerY);
      
      // Type-specific updates
      if (part.type === "core" && part.enemySpawnTimer > 0) {
        part.enemySpawnTimer--;
      }
    }
  }

  updatePartPosition(part, playerX, playerY) {
    const angleToPlayer = Math.atan2(playerY - this.y, playerX - this.x);
    this.bodyAngle = angleToPlayer;
    
    switch (part.position) {
      case "left":
        const armDistance = this.size * 0.8;
        if (this.isPortrait) {
          part.x = this.x + Math.cos(this.bodyAngle - Math.PI/2) * armDistance;
          part.y = this.y + Math.sin(this.bodyAngle - Math.PI/2) * armDistance;
        } else {
          part.x = this.x + Math.cos(this.bodyAngle - Math.PI/3) * armDistance;
          part.y = this.y + Math.sin(this.bodyAngle - Math.PI/3) * armDistance;
        }
        part.shoulderAngle = angleToPlayer + (Math.random() - 0.5) * 0.3;
        part.coreAngle = angleToPlayer + Math.sin(this.frameCount * 0.05) * 0.1;
        break;
        
      case "right":
        const armDistance2 = this.size * 0.8;
        if (this.isPortrait) {
          part.x = this.x + Math.cos(this.bodyAngle + Math.PI/2) * armDistance2;
          part.y = this.y + Math.sin(this.bodyAngle + Math.PI/2) * armDistance2;
        } else {
          part.x = this.x + Math.cos(this.bodyAngle + Math.PI/3) * armDistance2;
          part.y = this.y + Math.sin(this.bodyAngle + Math.PI/3) * armDistance2;
        }
        part.shoulderAngle = angleToPlayer + (Math.random() - 0.5) * 0.3;
        part.coreAngle = angleToPlayer + Math.sin(this.frameCount * 0.05) * 0.1;
        break;
        
      case "center":
        part.x = this.x;
        part.y = this.y;
        break;
    }
  }

  updateMovement() {
    if (this.movePattern === "entering") {
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
  }

  // Get which part was hit (returns part object or null)
  getHitPart(bulletX, bulletY) {
    // Check all enabled parts in order of priority (arms first, then body)
    const checkOrder = ["leftArm", "rightArm", "body"];
    
    for (const partId of checkOrder) {
      const part = this.parts.get(partId);
      if (!part || !part.enabled || part.destroyed) continue;
      
      const distance = Math.sqrt((bulletX - part.x) ** 2 + (bulletY - part.y) ** 2);
      const hitRadius = part.type === "core" ? part.size * 0.6 : 50;
      
      if (distance < hitRadius) {
        return part;
      }
    }
    
    return null;
  }

  takeDamage(damage, bulletX, bulletY) {
    const hitPart = this.getHitPart(bulletX, bulletY);
    
    if (!hitPart) return null; // No collision detected
    
    // Always apply visual hit flash when any part is hit (stops laser and shows feedback)
    this.hitFlash = 10;
    hitPart.hitFlash = 10;
    
    // If part is invulnerable, return early but still show visual feedback
    if (hitPart.invulnerable) return "invulnerable";

    // Apply damage only to vulnerable parts
    if (hitPart.type === "core" && hitPart.shield > 0) {
      hitPart.shield -= damage;
      if (hitPart.shield < 0) {
        hitPart.health += hitPart.shield; // Overflow damage to health
        hitPart.shield = 0;
      }
    } else {
      hitPart.health -= damage;
    }
    
    // Check if part is destroyed (handle floating point precision)
    if (hitPart.health <= 0.01) {
      hitPart.health = 0;
      hitPart.destroyed = true;
      
      // Special cleanup for specific part types
      if (hitPart.type === "laser_arm" && hitPart.activeLaser) {
        hitPart.activeLaser = null;
        hitPart.sweepState = "inactive";
      }
      
      if (hitPart.type === "core") {
        this.isDefeated = true;
        return "destroyed";
      }
      
    }
    
    return "damaged";
  }

  // Fire weapon for a specific part
  firePartWeapon(partId, playerX, playerY) {
    const part = this.parts.get(partId);
    if (!part || !part.enabled || part.destroyed) return { projectiles: [], lasers: [] };
    
    // Handle based on attack type
    if (part.attackType === "sweeping_laser") {
      return this.handleSweepingLaser(part, playerX, playerY);
    } else if (part.attackType === "missile_barrage") {
      return this.handleMissileBarrage(part, playerX, playerY);
    } else if (part.attackType === "rainbow_spiral") {
      return this.handleRainbowSpiral(part, playerX, playerY);
    }
    
    return { projectiles: [], lasers: [] };
  }
  
  handleSweepingLaser(part, playerX, playerY) {
    // Handle sweeping laser state machine
    switch (part.sweepState) {
      case "inactive":
        if (part.cooldown <= 0) {
          part.sweepState = "charging";
          part.sweepChargeTime = 0;
          part.sweepAngle = this.isPortrait ? 0 : Math.PI/2;
          
          part.activeLaser = new ContinuousLaserBeam(
            part.x,
            part.y,
            part.sweepAngle,
            this.isPortrait
          );
        }
        break;
        
      case "charging":
        if (part.destroyed) {
          part.sweepState = "inactive";
          part.activeLaser = null;
          return { projectiles: [], lasers: [] };
        }
        
        part.sweepChargeTime++;
        part.coreAngle = part.sweepAngle;
        
        if (part.sweepChargeTime >= part.weaponConfig.chargeTime) {
          part.sweepState = "sweeping";
          part.sweepDuration = 0;
          part.sweepDirection = 1;
        }
        break;
        
      case "sweeping":
        if (part.destroyed) {
          part.sweepState = "inactive";
          part.activeLaser = null;
          return { projectiles: [], lasers: [] };
        }
        
        part.sweepDuration++;
        
        if (part.activeLaser) {
          part.coreAngle = part.activeLaser.angle;
        }
        
        if (part.sweepDuration >= part.weaponConfig.sweepDuration) {
          part.sweepState = "inactive";
          part.cooldown = part.maxCooldown * 2;
          part.activeLaser = null;
        }
        break;
    }
    
    return { projectiles: [], lasers: [] };
  }

  handleMissileBarrage(part, playerX, playerY) {
    if (part.cooldown > 0) return { projectiles: [], lasers: [] };
    
    const projectiles = [];
    const armX = part.x;
    const armY = part.y;
    const angleToPlayer = Math.atan2(playerY - armY, playerX - armX);
    
    // Use weapon config for attack patterns
    const burstSize = part.weaponConfig.burstSize || 3;
    const spreadAngle = part.weaponConfig.spreadAngle || 0.4;
    
    const attackType = Math.random();
    
    if (attackType < 0.4) {
      // Homing missiles
      for (let i = 0; i < burstSize; i++) {
        const angle = angleToPlayer + (i - Math.floor(burstSize/2)) * spreadAngle;
        projectiles.push({
          type: "homing",
          x: armX,
          y: armY,
          vx: Math.cos(angle) * 1.5,
          vy: Math.sin(angle) * 1.5,
          targetX: playerX,
          targetY: playerY,
          homingStrength: 0.03,
          color: "#ff0000",
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
          color: "#ff4400",
          type: "boss"
        });
      }
    } else {
      // Heavy missiles
      for (let i = -1; i <= 1; i++) {
        const angle = angleToPlayer + i * 0.5;
        projectiles.push({
          x: armX,
          y: armY,
          vx: Math.cos(angle) * 3,
          vy: Math.sin(angle) * 3,
          size: 12,
          color: "#cc0000",
          type: "boss"
        });
      }
    }
    
    part.cooldown = part.maxCooldown;
    return { projectiles, lasers: [] };
  }

  handleRainbowSpiral(part, playerX, playerY) {
    const projectiles = [];
    const enemies = [];
    
    // Initialize pulse pattern if not already done
    if (!part.pulsePattern) {
      part.pulsePattern = {
        waveCount: 0,
        maxWaves: part.weaponConfig.waveCount || 20,
        inBreak: false,
        breakTimer: 0,
        breakDuration: part.weaponConfig.breakDuration || 60,
        spiralOffset: Math.random() * Math.PI * 2
      };
    }
    
    // Handle pulsing pattern
    if (!part.pulsePattern.inBreak) {
      if (this.frameCount % 3 === 0) {
        const bulletCount = part.weaponConfig.spiralBullets || 10;
        const speed = part.weaponConfig.spiralSpeed || 3.5;
        
        for (let i = 0; i < bulletCount; i++) {
          const angle = (i / bulletCount) * Math.PI * 2 + this.frameCount * 0.04 + part.pulsePattern.spiralOffset;
          const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff", "#ffa500", "#ff69b4"];
          projectiles.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 6,
            color: colors[i % colors.length],
            type: "boss"
          });
        }
        part.pulsePattern.waveCount++;
      }
      
      if (part.pulsePattern.waveCount >= part.pulsePattern.maxWaves) {
        part.pulsePattern.inBreak = true;
        part.pulsePattern.breakTimer = 0;
        part.pulsePattern.waveCount = 0;
        part.pulsePattern.maxWaves = (part.weaponConfig.waveCount || 20) + Math.floor(Math.random() * 6);
        part.pulsePattern.breakDuration = (part.weaponConfig.breakDuration || 60) + Math.floor(Math.random() * 30);
        part.pulsePattern.spiralOffset = Math.random() * Math.PI * 2;
      }
    } else {
      part.pulsePattern.breakTimer++;
      if (part.pulsePattern.breakTimer >= part.pulsePattern.breakDuration) {
        part.pulsePattern.inBreak = false;
      }
    }
    
    // Spawn enemies
    if (part.enemySpawnTimer <= 0) {
      part.enemySpawnTimer = part.enemySpawnCooldown;
      
      const enemyTypes = ["straight", "sine", "zigzag"];
      for (let i = 0; i < 3; i++) {
        enemies.push({
          type: enemyTypes[Math.floor(Math.random() * enemyTypes.length)],
          x: this.isPortrait ? Math.random() * this.canvasWidth : this.canvasWidth,
          y: this.isPortrait ? 0 : Math.random() * this.canvasHeight
        });
      }
    }
    
    return { projectiles, lasers: [], enemies };
  }

  getHealthPercentage() {
    return this.health / this.maxHealth;
  }

  render(ctx) {
    ctx.save();
    
    // Apply death effects
    if (this.isDefeated) {
      // Apply opacity for fade out
      ctx.globalAlpha = this.opacity;
      
      // Death glow effect (intense red glow when dying)
      const glowIntensity = 0.8 + Math.sin(this.frameCount * 0.4) * 0.2; // Pulsing glow
      ctx.fillStyle = "#ff0000";
      const prevAlpha = ctx.globalAlpha;
      ctx.globalAlpha = prevAlpha * glowIntensity * 0.7;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size + 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = prevAlpha;
    }

    // Apply red flash overlay if dying and flashing
    if (this.isDefeated && this.showRedFlash) {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = "#ff0000";
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size + 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    // Apply hit flash
    if (this.hitFlash > 0) {
      ctx.globalAlpha = 0.5;
    }

    // Render enabled parts
    for (const part of this.parts.values()) {
      if (!part.enabled || part.destroyed) continue;
      
      switch (part.type) {
        case "laser_arm":
          this.drawArm(ctx, part, "#ff8800");
          break;
        case "missile_arm":
          this.drawArm(ctx, part, "#ff0000");
          break;
        case "core":
          this.drawBody(ctx, part);
          break;
      }
    }

    // Draw continuous laser beams for any parts with active lasers
    for (const part of this.parts.values()) {
      if (part.activeLaser && !part.destroyed) {
        part.activeLaser.render(ctx);
      }
    }

    // Draw robot head
    this.drawHead(ctx);

    ctx.restore();

    // Draw health bars
    this.renderHealthBars(ctx);
  }

  drawBody(ctx, bodyPart) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.bodyAngle || 0);
    
    // Apply hit flash for body
    if (bodyPart.hitFlash > 0) {
      ctx.globalAlpha = 0.5;
    }
    
    // Body color changes when vulnerable
    ctx.fillStyle = bodyPart.enabled && !bodyPart.invulnerable ? "#ff4444" : "#444444";
    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 3;
    
    // Main body
    const bodyWidth = this.size * 0.6;
    const bodyHeight = this.size * 0.8;
    this.drawRoundedRect(ctx, -bodyWidth/2, -bodyHeight/2, bodyWidth, bodyHeight, 15);
    ctx.fill();
    ctx.stroke();
    
    // Shield indicator when invulnerable
    if (bodyPart.invulnerable) {
      ctx.strokeStyle = "#ffcc00";
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.8 + Math.sin(this.frameCount * 0.05) * 0.2;
      this.drawRoundedRect(ctx, -bodyWidth/2 - 3, -bodyHeight/2 - 3, bodyWidth + 6, bodyHeight + 6, 18);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    
    // Shield in final phase
    if (bodyPart.shield > 0) {
      const shieldIntensity = bodyPart.shield / bodyPart.maxShield;
      ctx.strokeStyle = `rgba(0, 255, 255, ${shieldIntensity * 0.8})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 0.8, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  drawHead(ctx) {
    const headWidth = this.size * 0.5;
    const headHeight = this.size * 0.4;
    const headX = this.x + this.headOffsetX;
    const headY = this.y + this.headOffsetY - this.size * 0.3;
    
    ctx.fillStyle = "#666666";
    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 2;
    
    ctx.save();
    ctx.translate(headX, headY);
    this.drawRoundedRect(ctx, -headWidth/2, -headHeight/2, headWidth, headHeight, 10);
    ctx.fill();
    ctx.stroke();

    // Draw angry eyes with tracking
    const eyeSocketSize = this.size * 0.08;
    const eyeballSize = this.size * 0.04;
    const leftEyeX = -headWidth * 0.25;
    const rightEyeX = headWidth * 0.25;
    const eyeY = -headHeight * 0.15;
    
    // Eye sockets
    ctx.fillStyle = "#333333";
    ctx.beginPath();
    ctx.ellipse(leftEyeX, eyeY, eyeSocketSize, eyeSocketSize * 0.7, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(rightEyeX, eyeY, eyeSocketSize, eyeSocketSize * 0.7, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Tracking eyeballs
    ctx.fillStyle = "#ff0000";
    const maxEyeMovement = eyeSocketSize * 0.3;
    const constrainedEyeX = Math.max(-maxEyeMovement, Math.min(maxEyeMovement, this.eyeOffsetX * 0.3));
    const constrainedEyeY = Math.max(-maxEyeMovement, Math.min(maxEyeMovement, this.eyeOffsetY * 0.3));
    
    ctx.beginPath();
    ctx.ellipse(leftEyeX + constrainedEyeX, eyeY + constrainedEyeY, eyeballSize, eyeballSize * 0.8, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(rightEyeX + constrainedEyeX, eyeY + constrainedEyeY, eyeballSize, eyeballSize * 0.8, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Angry eyebrows
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-headWidth * 0.35, -headHeight * 0.25);
    ctx.lineTo(-headWidth * 0.15, -headHeight * 0.2);
    ctx.moveTo(headWidth * 0.15, -headHeight * 0.2);
    ctx.lineTo(headWidth * 0.35, -headHeight * 0.25);
    ctx.stroke();
    
    // Angry mouth
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 3;
    ctx.fillStyle = "#ff0000";
    ctx.beginPath();
    if (this.mouthState === 0) {
      ctx.arc(0, headHeight * 0.05, headWidth * 0.2, 0.2, Math.PI - 0.2);
      ctx.stroke();
      
      // Teeth
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
      ctx.ellipse(0, headHeight * 0.15, headWidth * 0.18, headHeight * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Sharp teeth
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
  }

  drawArm(ctx, arm, color) {
    ctx.save();
    ctx.translate(arm.x, arm.y);
    
    // Apply hit flash
    if (arm.hitFlash > 0) {
      ctx.globalAlpha = 0.5;
    }
    
    // Draw shoulder joint
    ctx.save();
    ctx.rotate(arm.shoulderAngle);
    
    ctx.fillStyle = "#666666";
    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-15, -arm.shoulderRadius, 30, arm.shoulderRadius * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = "#888888";
    ctx.beginPath();
    ctx.arc(15, 0, arm.shoulderRadius, -Math.PI/2, Math.PI/2);
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
    
    // Draw weapon core
    ctx.save();
    ctx.rotate(arm.coreAngle);
    
    ctx.fillStyle = color;
    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 3;
    
    // Charging effects for laser arm
    if (arm.type === "laser_arm" && arm.sweepState === "charging") {
      const chargeProgress = arm.sweepChargeTime / arm.weaponConfig.chargeTime;
      const intensity = Math.min(1, chargeProgress);
      
      ctx.shadowColor = "#ff8800";
      ctx.shadowBlur = 15 + intensity * 20;
      ctx.strokeStyle = `rgba(255, 136, 0, ${intensity})`;
      ctx.lineWidth = 3 + intensity * 5;
    } else if (arm.type === "laser_arm" && arm.sweepState === "sweeping") {
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
    
    ctx.shadowBlur = 0;
    
    // Weapon details
    if (arm.type === "laser_arm") {
      ctx.fillStyle = "#ffff00";
      ctx.beginPath();
      ctx.rect(arm.coreLength - 10, -5, 15, 10);
      ctx.fill();
    } else if (arm.type === "missile_arm") {
      ctx.fillStyle = "#ff6666";
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

  renderHealthBars(ctx) {
    const barWidth = 60;
    const barHeight = 6;
    const barOffset = 25;
    
    // Render health bars for enabled parts
    for (const part of this.parts.values()) {
      if (!part.enabled || part.destroyed) continue;
      
      const barX = part.x - barWidth / 2;
      const barY = part.y - barOffset - (part.type === "core" && part.shield > 0 ? barHeight + 5 : 0);
      
      // Health bar
      ctx.fillStyle = "#333333";
      ctx.fillRect(barX, barY, barWidth, barHeight);
      const healthPercent = part.health / part.maxHealth;
      
      let healthColor;
      switch (part.type) {
        case "laser_arm":
          healthColor = "#ff8800";
          break;
        case "missile_arm":
          healthColor = "#ff0000";
          break;
        case "core":
          healthColor = healthPercent > 0.5 ? "#00ff00" : healthPercent > 0.25 ? "#ffff00" : "#ff0000";
          break;
        default:
          healthColor = "#ffffff";
      }
      
      ctx.fillStyle = healthColor;
      ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
      ctx.strokeStyle = "#ff4444";
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
      
      // Shield bar for core
      if (part.type === "core" && part.shield > 0) {
        const shieldBarY = barY + barHeight + 5;
        ctx.fillStyle = "#333333";
        ctx.fillRect(barX, shieldBarY, barWidth, barHeight);
        const shieldPercent = part.shield / part.maxShield;
        ctx.fillStyle = "#00ffff";
        ctx.fillRect(barX, shieldBarY, barWidth * shieldPercent, barHeight);
        ctx.strokeStyle = "#ff4444";
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, shieldBarY, barWidth, barHeight);
      }
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

// Robot Boss implementation - the current boss with articulated arms
export class RobotBoss extends Boss {
  constructor(x, y, isPortrait, canvasWidth, canvasHeight) {
    super(x, y, isPortrait, canvasWidth, canvasHeight);
    this.type = "robot_boss";
  }
}