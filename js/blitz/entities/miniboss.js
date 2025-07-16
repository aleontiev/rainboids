// MiniBoss entity for Rainboids: Blitz
import { GAME_CONFIG, COLORS } from "../constants.js";
import { BaseEnemy } from "./enemy.js";

export class MiniBoss extends BaseEnemy {
  constructor(x, y, type, isPortrait, canvasWidth = 700) {
    super(x, y, isPortrait, 0.5); // Call BaseEnemy constructor with speed 0.5
    this.type = type; // 'alpha' or 'beta'
    this.size = 90; // Much larger than regular enemies (was 60)
    this.maxHealth = 100; // Reduced max health
    this.health = this.maxHealth;
    this.frameCount = 0;
    this.angle = isPortrait ? Math.PI / 2 : 0; // Add this line for rotation

    // Movement pattern
    this.movePattern = "entering"; // Start with entering phase
    this.patrolDirection = 1;
    this.patrolRange = 150; // Reduced range for slower movement
    this.startY = y;
    this.startX = x;
    this.targetY = isPortrait ? 150 : y; // In portrait, move to 150px from top
    this.targetX = isPortrait ? x : canvasWidth - 150; // In landscape, move to 150px from right

    // Weapons
    this.primaryWeaponTimer = 0;
    this.secondaryWeaponTimer = 0;
    this.circularWeaponTimer = 0;
    this.burstWeaponTimer = 0;
    this.primaryWeaponCooldown = 60; // 0.25 seconds at 60fps (even faster)
    this.secondaryWeaponCooldown = 90; // 0.75 seconds at 60fps (faster)
    this.circularWeaponCooldown = 120; // 2 seconds at 60fps (faster circular)
    this.burstWeaponCooldown = 90; // 1.5 seconds at 60fps (faster burst)

    // Shield system
    this.invulnerable = true; // Start invulnerable
    this.invulnerableTimer = 0;
    this.invulnerableDuration = 1000; // 5 seconds at 60fps
    this.shield = 50; // 50 shield after invulnerable period ends
    this.maxShield = 50;

    // Visual effects
    this.hitFlash = 0;
    this.chargingSecondary = 0;
    this.playerRef = null; // To store player reference for aiming
    this.enemySpawnTimer = 0;
    this.enemySpawnCooldown = 200; // 3.3 seconds cooldown for spawning enemies (faster than before)
    
    // Death effect system
    this.dying = false;
    this.deathTimer = 0;
    this.deathDuration = 30; // 0.5 seconds at 60fps
    this.deathExplosionTimer = 0;
    this.deathExplosionInterval = 3; // Explosions every 3 frames
    this.finalExplosionTriggered = false;
    
    // Velocity tracking (dx/dy per second)
    this.dx = 0;
    this.dy = 0;
  }

  // Check if this miniboss can be targeted by auto-aim
  isVulnerableToAutoAim() {
    return !this.invulnerable && !this.dying;
  }

  update(playerX, playerY, slowdownFactor = 1.0) {
    this.frameCount += slowdownFactor;

    // Make miniboss face the player (if not dying)
    if (!this.dying) {
      this.angle = Math.atan2(playerY - this.y, playerX - this.x);
    }

    // Handle death sequence
    if (this.dying) {
      this.deathTimer += slowdownFactor;
      this.deathExplosionTimer += slowdownFactor;
      
      // Trigger final explosion when death timer is complete
      if (this.deathTimer >= this.deathDuration && !this.finalExplosionTriggered) {
        this.finalExplosionTriggered = true;
        return "final_explosion";
      }
      
      // Check if we should trigger a rain explosion
      if (this.deathExplosionTimer >= this.deathExplosionInterval) {
        this.deathExplosionTimer = 0;
        return "rain_explosion";
      }
      
      return "dying";
    }

    // Handle invulnerable timer
    if (this.invulnerable) {
      this.invulnerableTimer += slowdownFactor;
      if (this.invulnerableTimer >= this.invulnerableDuration) {
        this.invulnerable = false;
      }
    }

    // Store previous position for velocity calculation
    const prevX = this.x;
    const prevY = this.y;
    
    // Movement logic
    if (this.movePattern === "entering") {
      // Move to target position
      if (this.isPortrait) {
        // Portrait: move down from top
        if (this.y < this.targetY) {
          this.y += this.speed * slowdownFactor;
        } else {
          this.movePattern = "patrol";
          this.startY = this.y;
          this.startX = this.x;
        }
      } else {
        // Landscape: move left from right
        if (this.x > this.targetX) {
          this.x -= this.speed * slowdownFactor;
        } else {
          this.movePattern = "patrol";
          this.startY = this.y;
          this.startX = this.x;
        }
      }
    } else if (this.movePattern === "patrol") {
      // Patrol movement
      if (this.isPortrait) {
        this.x += this.patrolDirection * this.speed * slowdownFactor;
        if (Math.abs(this.x - this.startX) > this.patrolRange) {
          this.patrolDirection *= -1;
        }
      } else {
        this.y += this.patrolDirection * this.speed * slowdownFactor;
        if (Math.abs(this.y - this.startY) > this.patrolRange) {
          this.patrolDirection *= -1;
        }
      }
    }
    
    // Calculate velocity (pixels per frame * 60 = pixels per second)
    this.dx = (this.x - prevX) * 60;
    this.dy = (this.y - prevY) * 60;

    // Weapon timers
    this.primaryWeaponTimer += slowdownFactor;
    this.secondaryWeaponTimer += slowdownFactor;
    this.circularWeaponTimer += slowdownFactor;
    this.burstWeaponTimer += slowdownFactor;
    this.enemySpawnTimer += slowdownFactor; // Increment enemy spawn timer

    // Reduce hit flash
    if (this.hitFlash > 0) {
      this.hitFlash -= slowdownFactor;
    }

    // Secondary weapon charging effect
    if (this.secondaryWeaponTimer > this.secondaryWeaponCooldown - 60) {
      this.chargingSecondary = Math.min(this.chargingSecondary + 0.1, 1);
    } else {
      this.chargingSecondary = 0;
    }

    // Spawn enemy periodically
    if (this.canSpawnEnemy()) {
      // This will be handled in BlitzGame.update()
      // We just reset the timer here
      this.enemySpawnTimer = 0;
    }
  }

  takeDamage(damage) {
    // Invulnerable prevents all damage
    if (this.invulnerable) {
      return "invulnerable";
    }

    // Already dying, ignore further damage
    if (this.dying) {
      return "dying";
    }

    // Shield absorbs damage first
    if (this.shield > 0) {
      this.shield -= damage;
      this.hitFlash = 10;
      if (this.shield <= 0) {
        this.shield = 0;
        return "shield_destroyed";
      }
      return "shield_damaged";
    }

    // Damage health if no shield
    this.health -= damage;
    this.hitFlash = 10;
    if (this.health <= 0) {
      this.dying = true;
      this.deathTimer = 0;
      return "dying";
    }
    return "damaged";
  }

  canFirePrimary() {
    return this.primaryWeaponTimer >= this.primaryWeaponCooldown;
  }

  canFireSecondary() {
    return this.secondaryWeaponTimer >= this.secondaryWeaponCooldown;
  }

  firePrimary(playerX, playerY) {
    // Added playerX, playerY
    this.primaryWeaponTimer = 0;
    const angleToPlayer = Math.atan2(playerY - this.y, playerX - this.x); // Calculate angle to player
    const bulletSpeed = 2; // Further reduced speed
    // Return bullet data for the main game to create
    return {
      x: this.x, // Fire from center of miniboss
      y: this.y, // Fire from center of miniboss
      vx: Math.cos(angleToPlayer) * bulletSpeed, // Aim at player
      vy: Math.sin(angleToPlayer) * bulletSpeed, // Aim at player
      size: 8, // Smaller projectiles
      color: "#ff0000", // Red color
      type: "miniBossPrimary",
    };
  }

  fireSecondary(playerX, playerY) {
    // Added playerX, playerY
    this.secondaryWeaponTimer = 0;
    this.chargingSecondary = 0;
    const bullets = [];
    const angleToPlayer = Math.atan2(playerY - this.y, playerX - this.x); // Calculate angle to player
    const bulletSpeed = 1.8; // Further reduced speed for spread

    if (this.type === "alpha") {
      // Alpha: Further reduced spread of 3 bullets
      const spreadAngle = 0.2; // Tighter spread
      for (let i = -1; i <= 1; i++) {
        const angle = angleToPlayer + i * spreadAngle;
        bullets.push({
          x: this.x,
          y: this.y,
          vx: Math.cos(angle) * bulletSpeed,
          vy: Math.sin(angle) * bulletSpeed,
          size: 7, // Smaller projectiles for spread
          color: "#ff0000", // Red color
          type: "miniBossSecondary",
        });
      }
    } else {
      // Beta: Alternating dual shots
      const sideOffset = 30; // Distance from center
      for (let side = -1; side <= 1; side += 2) {
        const offsetX =
          Math.cos(angleToPlayer + Math.PI / 2) * sideOffset * side;
        const offsetY =
          Math.sin(angleToPlayer + Math.PI / 2) * sideOffset * side;
        bullets.push({
          x: this.x + offsetX,
          y: this.y + offsetY,
          vx: Math.cos(angleToPlayer) * bulletSpeed,
          vy: Math.sin(angleToPlayer) * bulletSpeed,
          size: 8, // Smaller projectiles
          color: "#ffff00", // Yellow color for beta
          type: "miniBossSecondary",
        });
      }
    }
    return bullets;
  }

  canSpawnEnemy() {
    return this.enemySpawnTimer >= this.enemySpawnCooldown;
  }

  spawnEnemy(playerX, playerY) {
    this.enemySpawnTimer = 0;

    // Randomly choose enemy type
    const enemyTypes = ["straight", "sine", "zigzag", "dive"];
    const randomType =
      enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

    // Adjust speed based on enemy type
    let speed = 2; // Base speed
    if (randomType === "dive") {
      speed = 3; // Faster dive enemies
    } else if (randomType === "straight") {
      speed = 2.5; // Slightly faster straight enemies
    }

    return {
      x: this.x,
      y: this.y,
      type: randomType,
      isPortrait: this.isPortrait,
      speed: speed,
      targetX: playerX, // Pass player's current position as target for dive enemies
      targetY: playerY,
    };
  }

  canFireCircular() {
    return this.circularWeaponTimer >= this.circularWeaponCooldown;
  }

  fireCircular(playerX, playerY) {
    this.circularWeaponTimer = 0;
    const bullets = [];
    const bulletSpeed = 1.5; // Further reduced speed

    if (this.type === "alpha") {
      // Alpha: Full 360 degree spiral
      const numBullets = 12; // Reduced bullets for alpha
      for (let i = 0; i < numBullets; i++) {
        const angle = (i / numBullets) * Math.PI * 2;
        bullets.push({
          x: this.x,
          y: this.y,
          vx: Math.cos(angle) * bulletSpeed,
          vy: Math.sin(angle) * bulletSpeed,
          size: 7, // Smaller projectiles
          color: "#ffa500", // Orange color
          type: "miniBossCircular",
        });
      }
    } else {
      // Beta: Reduced rotating cross pattern
      const numArms = 4;
      const bulletsPerArm = 2; // Reduced from 3 to 2
      for (let arm = 0; arm < numArms; arm++) {
        const baseAngle =
          (arm / numArms) * Math.PI * 2 + this.frameCount * 0.05; // Rotating
        for (let i = 0; i < bulletsPerArm; i++) {
          const distance = (i + 1) * 20; // Staggered distances
          const x = this.x + Math.cos(baseAngle) * distance;
          const y = this.y + Math.sin(baseAngle) * distance;
          bullets.push({
            x: x,
            y: y,
            vx: Math.cos(baseAngle) * bulletSpeed,
            vy: Math.sin(baseAngle) * bulletSpeed,
            size: 6, // Smaller for cross pattern
            color: "#ffff00", // Yellow color for beta
            type: "miniBossCircular",
          });
        }
      }
    }
    return bullets;
  }

  canFireBurst() {
    return this.burstWeaponTimer >= this.burstWeaponCooldown;
  }

  fireBurst(playerX, playerY) {
    this.burstWeaponTimer = 0;
    const bullets = [];
    const angleToPlayer = Math.atan2(playerY - this.y, playerX - this.x);
    const bulletSpeed = 2.5; // Further reduced speed

    // Fire 2 bullets in rapid succession (simulated by slight angle variations)
    for (let i = 0; i < 2; i++) {
      const angleVariation = (Math.random() - 0.5) * 0.1; // Small random spread
      const angle = angleToPlayer + angleVariation;
      bullets.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * bulletSpeed,
        vy: Math.sin(angle) * bulletSpeed,
        size: 7, // Smaller burst projectiles
        color: "#ffa500", // Orange color for distinction
        type: "miniBossBurst",
      });
    }
    return bullets;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle); // Add this line for rotation

    // Death glow effect (red glow when dying)
    if (this.dying) {
      const glowIntensity = 0.7 + Math.sin(this.frameCount * 0.3) * 0.3; // Pulsing glow
      ctx.fillStyle = "#ff0000";
      ctx.globalAlpha = glowIntensity * 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.size + 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Hit flash effect (red blink when damaged)
    if (this.hitFlash > 0 && !this.dying) {
      ctx.fillStyle = "#ff0000";
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(0, 0, this.size + 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Draw mini-boss ship based on type
    if (this.type === "alpha") {
      this.drawAlphaShip(ctx);
    } else {
      this.drawBetaShip(ctx);
    }

    // Draw shield bar and health bar
    this.drawShieldAndHealthBar(ctx);

    // Invulnerable effect - gold stroke over the miniboss itself
    if (this.invulnerable) {
      ctx.strokeStyle = "#ffcc00"; // Gold stroke
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.8 + 0.2 * Math.sin(this.frameCount * 0.3);
      
      // Draw stroke around the actual ship shape based on type
      if (this.type === "alpha") {
        // Alpha ship outline
        ctx.beginPath();
        ctx.rect(-this.size * 0.8, -this.size * 0.3, this.size * 1.6, this.size * 0.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.rect(-this.size * 0.2, -this.size * 0.5, this.size * 0.6, this.size * 1.0);
        ctx.stroke();
      } else {
        // Beta ship outline
        ctx.beginPath();
        ctx.rect(-this.size * 0.9, -this.size * 0.25, this.size * 1.8, this.size * 0.5);
        ctx.stroke();
      }
      
      ctx.globalAlpha = 1;
    }

    // Remove red charging outline effect

    ctx.restore();
  }

  drawAlphaShip(ctx) {
    // Alpha mini-boss - Custom SVG design
    ctx.save();
    
    // Scale and position the SVG to fit the miniboss size
    const scale = this.size / 512; // Original SVG is 1024x1024, center at 512
    ctx.scale(scale, scale);
    ctx.translate(-512, -512); // Center the SVG
    
    // Set the fill color for the path (red theme for alpha)
    ctx.fillStyle = "#ff4444";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4 / scale; // Adjust line width for scaling
    
    // Draw the SVG path
    const path = new Path2D("M 345.360 136.081 C 338.413 138.753, 331.670 146.006, 329.575 153.058 C 328.216 157.635, 328 166.783, 328 219.682 L 328 281 356 281 L 384 281 384 219.182 C 384 150.001, 384.033 150.373, 377.194 142.781 C 369.703 134.467, 356.683 131.726, 345.360 136.081 M 656.500 136.358 C 650.198 139.306, 645.423 144.091, 642.387 150.500 L 640.020 155.500 640.010 218.250 L 640 281 668.035 281 L 696.071 281 695.785 217.750 L 695.500 154.500 693.108 149.206 C 687.175 136.075, 669.996 130.046, 656.500 136.358 M 461 206.935 C 452.682 209.475, 447.076 214.207, 442.702 222.384 C 440.613 226.289, 440.484 227.894, 440.191 253.750 L 439.882 281 511.941 281 L 584 281 584 255.178 C 584 224.617, 583.539 222.391, 575.574 214.474 C 566.959 205.912, 567.523 205.986, 511.635 206.086 C 485.161 206.133, 462.375 206.515, 461 206.935 M 281.656 313.970 C 265.858 319.030, 254.768 332.155, 252.060 349 C 250.617 357.975, 250.613 668.020, 252.055 676.910 C 254.241 690.379, 263.724 703.277, 275.820 709.232 L 282.458 712.500 511.979 712.500 L 741.500 712.500 747.500 709.569 C 759.605 703.655, 769.027 691.527, 771.870 678.201 C 772.684 674.385, 772.996 628.070, 772.985 512.701 C 772.969 336.469, 773.295 345.961, 766.850 333.870 C 762.942 326.538, 754.704 318.688, 747.253 315.196 L 741.500 312.500 514.500 312.299 C 295.139 312.105, 287.303 312.162, 281.656 313.970 M 342 391.099 C 334.668 393.704, 328.042 398.711, 324.147 404.592 C 318.149 413.647, 317.999 415.054, 318.013 461.932 C 318.025 499.543, 318.243 505.548, 319.890 513.500 C 323.784 532.303, 332.797 548.912, 345.714 561.086 C 357.860 572.533, 369.302 578.919, 386.095 583.625 L 395.690 586.314 394.413 592.407 C 390.461 611.272, 390.214 632.968, 393.834 643.267 C 397.946 654.968, 408.292 664.623, 419.260 666.994 C 423.009 667.805, 450.250 668.038, 515 667.814 C 602.517 667.510, 605.658 667.435, 610.286 665.521 C 619.063 661.892, 624.118 657.191, 628.500 648.581 L 632.500 640.723 632.407 623.612 C 632.334 610.072, 631.864 604.431, 630.157 596.591 C 628.971 591.141, 628 586.560, 628 586.412 C 628 586.263, 630.587 585.609, 633.750 584.957 C 649.845 581.641, 667.143 573.291, 677.470 563.853 C 691.300 551.213, 702.813 527.637, 705.964 505.500 C 707.282 496.242, 707.273 430.274, 705.953 422.138 C 704.018 410.215, 695.614 398.428, 684.761 392.415 L 679.500 389.500 513.500 389.323 C 351.123 389.150, 347.380 389.188, 342 391.099 M 123.715 392.364 C 115.686 395.100, 111.088 399.154, 107.816 406.382 C 105.678 411.107, 105.500 412.843, 105.500 429 C 105.500 448.281, 105.921 449.987, 112.362 456.838 C 120.403 465.390, 124.752 466, 177.684 466 L 221 466 221 428 L 221 390 175.750 390.026 C 131.120 390.051, 130.407 390.083, 123.715 392.364 M 803 428.016 L 803 466.124 850.250 465.768 C 892.488 465.450, 897.995 465.224, 902.163 463.642 C 908.245 461.332, 913.641 455.992, 916.889 449.067 C 919.352 443.816, 919.500 442.620, 919.500 428 C 919.500 414.309, 919.252 411.964, 917.377 407.911 C 914.540 401.776, 908.889 396.310, 902.086 393.120 L 896.500 390.500 849.750 390.204 L 803 389.908 803 428.016 M 351.828 422.301 L 347.500 425.601 347.238 463.307 C 346.942 505.932, 347.406 510.256, 353.642 523 C 356.392 528.619, 359.343 532.519, 365.406 538.547 C 374.533 547.621, 383.039 552.618, 394.996 555.932 C 406.715 559.179, 406.827 559.145, 413.223 550.250 C 432.157 523.922, 456.038 507.545, 485.441 500.727 C 492.670 499.051, 497.934 498.614, 511.500 498.564 C 529.284 498.499, 538.354 499.767, 551.500 504.160 C 574.056 511.696, 596.743 529.055, 610.430 549.250 C 617.163 559.184, 616.687 559.007, 628.590 556.006 C 651.357 550.266, 668.412 535.641, 674.912 516.282 C 676.900 510.360, 677 508.014, 677 467.120 L 677 424.178 673.923 421.589 L 670.847 419 513.501 419 L 356.155 419 351.828 422.301 M 494.056 529.137 C 465.910 533.804, 445.100 550.304, 431.940 578.387 C 425.016 593.162, 421 610.778, 421 626.372 C 421 630.661, 421.488 634.088, 422.200 634.800 C 423.115 635.715, 444.340 636, 511.629 636 C 590.503 636, 600.024 635.833, 601.429 634.429 C 604.312 631.545, 603.080 612.268, 598.971 595.976 C 594.721 579.127, 587.573 565.785, 576.554 554.135 C 564.301 541.179, 549.179 533.005, 531.140 529.585 C 522.063 527.864, 503.110 527.635, 494.056 529.137 M 128.479 561.113 C 119.224 562.243, 112.521 567.085, 107.874 576 C 105.761 580.054, 105.493 582.063, 105.176 596.266 C 104.884 609.355, 105.129 613.003, 106.624 617.754 C 109.181 625.886, 114.757 631.227, 123.509 633.930 C 129.869 635.894, 132.525 636, 175.605 636 L 221 636 221 598.250 L 221 560.500 177.250 560.500 C 153.188 560.500, 131.241 560.776, 128.479 561.113 M 802.999 598.295 L 803 636.091 850.750 635.789 C 893.656 635.518, 898.877 635.311, 902.213 633.746 C 910.731 629.750, 916.917 621.763, 918.901 612.201 C 920.541 604.294, 920.281 587.310, 918.425 581.058 C 916.508 574.604, 909.873 567.103, 903.152 563.792 C 898.547 561.523, 898.014 561.495, 850.749 561 L 802.999 560.500 802.999 598.295 M 328.010 775.750 C 328.019 808.002, 328.055 808.577, 330.366 813.538 C 333.140 819.496, 340.708 826.533, 346.069 828.139 L 349.849 829.271 350.174 853.886 C 350.453 874.924, 350.751 878.959, 352.230 881.662 C 359.249 894.489, 379.307 893.327, 385.898 879.711 C 387.843 875.693, 388 873.690, 388 852.868 L 388 830.368 393.512 828.084 C 400.250 825.291, 407.398 818.544, 410.320 812.220 C 412.393 807.732, 412.516 805.912, 412.824 775.250 L 413.147 743 370.574 743 L 328 743 328.010 775.750 M 612 774.318 C 612 808.795, 612.444 812.171, 617.976 819.808 C 620.956 823.922, 629.984 829.973, 633.169 829.991 C 634.671 829.999, 634.872 832.339, 635.173 853.250 C 635.486 875.015, 635.649 876.766, 637.731 880.666 C 641.630 887.969, 648.683 891.404, 657.062 890.079 C 663.605 889.045, 666.893 886.597, 670 880.448 C 672.413 875.672, 672.511 874.711, 672.817 852.808 L 673.134 830.116 677.926 828.524 C 684.485 826.346, 690.240 821.141, 693.108 814.794 C 695.454 809.603, 695.506 808.856, 695.800 776.250 L 696.100 743 654.050 743 L 612 743 612 774.318");
    
    ctx.fill(path);
    ctx.stroke(path);
    
    ctx.restore();
    
    // Engine glow effects in orange to maintain alpha theme
    ctx.fillStyle = "#ffaa00";
    ctx.beginPath();
    ctx.arc(
      -this.size * 0.8,
      -this.size * 0.15,
      this.size * 0.1,
      0,
      Math.PI * 2
    );
    ctx.arc(
      -this.size * 0.8,
      this.size * 0.15,
      this.size * 0.1,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  drawBetaShip(ctx) {
    // Beta mini-boss - New SVG design
    ctx.save();
    
    // Rotate 90 degrees counterclockwise to fix SVG orientation
    ctx.rotate(-Math.PI / 2);
    
    // Scale and position the SVG to fit the miniboss size
    const scale = this.size / 512; // Original SVG is 1024x1024, center at 512
    ctx.scale(scale, scale);
    ctx.translate(-512, -512); // Center the SVG
    
    // Set the fill color for the path (yellow theme for beta)
    ctx.fillStyle = "#ffdd44";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4 / scale; // Adjust line width for scaling
    
    // Draw the SVG path
    const path = new Path2D("M 342.463 99.591 C 332.532 103.118, 325.582 113.392, 325.689 124.389 C 325.759 131.459, 328.474 138.164, 333.040 142.539 L 336 145.374 336 184.939 L 336 224.503 331.482 226.900 C 325.926 229.848, 320.471 235.749, 317.637 241.878 C 315.565 246.358, 315.500 247.741, 315.500 287 L 315.500 327.500 318.146 332.500 C 324.235 344.007, 334.888 350.839, 348.161 351.749 L 356 352.286 356 379.643 L 356 407 348.750 407.031 C 339.711 407.069, 329.059 408.451, 322.440 410.442 C 315.588 412.504, 306.407 420.867, 302.473 428.632 C 299.705 434.095, 299.476 435.404, 299.155 447.603 L 298.811 460.706 264.655 480.554 C 245.870 491.471, 227.688 502.084, 224.250 504.139 L 218 507.876 217.978 479.188 C 217.958 452.505, 217.814 450.185, 215.921 446 C 213.645 440.965, 209.130 435.879, 204.250 432.852 L 201 430.837 201 407.629 C 201 377.262, 199.370 370.655, 189.192 359.774 C 180.965 350.979, 169.373 346, 157.121 346 C 138.822 346, 124.278 354.975, 116.610 371 L 113.500 377.500 113.190 404.255 L 112.881 431.010 110.190 432.423 C 106.274 434.479, 100.323 440.960, 98.639 445.003 C 97.399 447.979, 97.137 463.773, 96.898 550.003 C 96.637 644.371, 96.739 651.863, 98.362 656.671 C 100.543 663.128, 106.633 670.160, 112.511 673.005 L 117 675.178 117 696.408 C 117 720.668, 117.824 725.098, 123.590 731.834 C 125.589 734.169, 129.536 737.296, 132.362 738.781 C 137.270 741.362, 138.272 741.498, 154.744 741.824 C 168.713 742.100, 172.923 741.854, 176.914 740.529 C 183.408 738.372, 190.705 731.830, 193.634 725.538 C 195.877 720.723, 195.981 719.502, 195.990 697.911 L 196 675.321 198.750 674.093 C 206.422 670.667, 213.005 663.813, 214.554 657.640 C 215.311 654.625, 212.116 655.348, 252.500 649.048 C 270.100 646.302, 295.324 642.256, 308.554 640.057 L 332.608 636.058 338.554 641.663 C 345.687 648.387, 354.919 652.946, 368.598 656.500 C 374.024 657.910, 378.733 659.387, 379.063 659.782 C 379.393 660.177, 384.294 674.900, 389.954 692.500 C 395.615 710.100, 400.891 725.764, 401.679 727.310 C 407.109 737.950, 420.981 745.808, 434.799 746.070 C 442.584 746.218, 442.586 746.247, 435.986 759.864 C 427.176 778.039, 427.024 776.990, 442.402 804.397 C 449.222 816.554, 463.366 842.025, 473.832 861 C 498.487 905.701, 498.934 906.416, 503.878 908.938 C 511.126 912.635, 519.755 911.191, 525.178 905.373 C 526.651 903.793, 540.988 878.875, 557.037 850 C 573.086 821.125, 588.038 794.433, 590.262 790.684 C 596.758 779.736, 596.631 776.698, 589.019 760.881 C 585.582 753.740, 582.973 747.693, 583.222 747.445 C 583.471 747.196, 587.235 746.542, 591.587 745.991 C 602.123 744.658, 607.497 742.752, 613.461 738.233 C 621.797 731.918, 623.163 729.022, 634.748 693.103 C 641.191 673.127, 646.118 659.418, 647.010 658.989 C 647.829 658.595, 652.513 657.311, 657.419 656.137 C 670.290 653.055, 678.548 648.926, 685.472 642.110 L 691.340 636.334 746.420 645.623 C 776.714 650.732, 802.964 655.177, 804.753 655.502 C 807.257 655.956, 808.464 656.990, 809.995 659.990 C 812.590 665.077, 818.152 670.411, 823.623 673.059 L 828 675.178 828 696.408 C 828 720.668, 828.824 725.098, 834.590 731.834 C 841.879 740.350, 853.171 743.328, 874.500 742.359 C 885.954 741.838, 891.839 739.850, 897.808 734.483 C 906.692 726.495, 907.126 724.787, 907.039 698.164 L 906.964 675.196 911.460 673.019 C 917.683 670.007, 924.618 662.026, 926.490 655.721 C 928.772 648.037, 928.763 453.414, 926.480 446.944 C 924.501 441.334, 920.792 436.553, 915.919 433.328 L 912 430.734 912 409.051 C 912 397.125, 911.508 384.697, 910.907 381.434 C 909.446 373.507, 905.845 366.151, 900.565 360.308 C 882.220 340.009, 848.467 341.418, 832.468 363.151 C 824.919 373.405, 824 378.123, 824 406.630 L 824 431.050 821.552 431.980 C 817.816 433.401, 811.111 439.885, 808.678 444.432 C 806.622 448.272, 806.472 450.136, 806 477.658 L 805.500 506.816 798.500 502.761 C 794.650 500.531, 776.581 489.978, 758.347 479.310 L 725.194 459.914 724.841 446.707 C 724.509 434.290, 724.311 433.181, 721.542 428.171 C 717.592 421.025, 708.387 412.621, 702.296 410.599 C 696.274 408.600, 684.688 407.071, 675.250 407.031 L 668 407 668 379.632 L 668 352.263 675.255 351.797 C 688.832 350.926, 699.571 343.939, 705.684 332 L 708.500 326.500 708.500 286.500 C 708.500 247.752, 708.433 246.355, 706.363 241.878 C 703.529 235.749, 698.074 229.848, 692.518 226.900 L 688 224.503 688 185.655 L 688 146.807 691.925 142.348 C 701.115 131.908, 701.439 117.325, 692.702 107.399 C 686.678 100.555, 682.073 98.535, 672.500 98.535 C 663.441 98.535, 658.791 100.388, 653.362 106.162 C 648.003 111.863, 646.539 115.692, 646.545 124 C 646.549 130.162, 647.022 132.403, 649.197 136.563 C 650.653 139.347, 652.554 142.215, 653.422 142.935 C 654.812 144.089, 654.993 148.907, 654.942 183.372 L 654.885 222.500 652.598 217.500 C 641.752 193.787, 621.083 172.452, 595.330 158.387 C 549.646 133.437, 480.467 132.661, 432.871 156.565 C 406.830 169.643, 388.601 187.219, 373.300 214 L 369.015 221.500 369.007 182.924 L 369 144.349 371.419 142.076 C 372.750 140.826, 374.823 137.515, 376.026 134.719 C 382.090 120.622, 375.188 104.319, 361.128 99.528 C 355.627 97.653, 347.846 97.680, 342.463 99.591 M 487.538 174.586 C 474.141 176.668, 461.779 180.510, 449.500 186.409 C 421.835 199.698, 406.612 217.303, 396.672 247.500 C 390.506 266.236, 390.700 263.480, 390.282 338.250 L 389.898 407 411.449 407 L 433 407 433.006 392.750 C 433.009 384.913, 433.499 376.743, 434.095 374.595 C 435.554 369.342, 444.140 360.834, 449.616 359.216 C 455.329 357.528, 569.154 357.474, 574.101 359.156 C 580.314 361.270, 585.881 366.057, 588.609 371.633 C 591.005 376.531, 591.200 377.978, 591.344 391.945 L 591.500 406.983 613 406.992 L 634.500 407 634.322 342.750 C 634.124 271.137, 633.721 265.421, 627.533 246.530 C 621.656 228.589, 614.868 217.109, 603.369 205.662 C 586.653 189.022, 564.507 178.533, 537.683 174.550 C 524.850 172.645, 499.917 172.663, 487.538 174.586 M 412.824 254.665 C 407.644 266.375, 408.126 283.192, 413.995 295.489 C 427.579 323.952, 465.076 330.376, 486.504 307.911 C 492.351 301.781, 496.348 294.421, 495.814 290.768 C 495.561 289.031, 488.176 284.899, 457.500 269.330 C 436.600 258.722, 418.462 250.034, 417.194 250.022 C 415.402 250.005, 414.428 251.040, 412.824 254.665 M 566.500 269.301 C 523.914 290.817, 525.909 289.206, 530.425 298.437 C 537.804 313.518, 556.972 323.222, 574.893 320.950 C 602.951 317.393, 620.926 289.193, 613.449 260.460 C 611.498 252.961, 609.577 249.986, 606.727 250.051 C 605.502 250.078, 587.400 258.741, 566.500 269.301 M 151.014 380.752 C 145.374 383.580, 145.031 385.179, 145.015 408.750 L 145 430 156.500 430 L 168 430 168 409.065 C 168 397.551, 167.561 386.976, 167.025 385.566 C 165.865 382.515, 160.506 379.008, 157 379.005 C 155.625 379.004, 152.931 379.790, 151.014 380.752 M 862.315 380.464 C 856.553 382.969, 856 385.469, 856 408.982 L 856 430.063 867.578 429.782 L 879.156 429.500 879.041 408.018 C 878.914 384.170, 878.634 382.999, 872.454 380.416 C 868.288 378.676, 866.405 378.684, 862.315 380.464 M 467 398.500 L 467 407 481.500 407 L 496 407 496 398.500 L 496 390 481.500 390 L 467 390 467 398.500 M 528 398.500 L 528 407 542.500 407 L 557 407 557 398.500 L 557 390 542.500 390 L 528 390 528 398.500 M 332.015 463.250 C 332.047 506.777, 335.945 539.853, 345.563 578.195 C 353.176 608.548, 356.613 615.973, 365.038 620.273 C 376.510 626.129, 375.303 626.085, 516.610 625.779 L 645.500 625.500 652.087 623.260 C 667.384 618.059, 669.724 613.990, 678.986 576.500 C 688.211 539.157, 690.950 517.156, 691.713 474.250 L 692.287 442 512.143 442 L 332 442 332.015 463.250 M 128.999 553.750 L 129 643 157 643 L 185 643 185 554.030 L 185 465.061 156.999 464.780 L 128.999 464.500 128.999 553.750 M 839 553.750 L 839 643 867 643 L 895 643 895 553.750 L 895.001 464.500 867.001 464.500 L 839.001 464.500 839 553.750 M 506.684 481.449 C 501.701 483.226, 499.132 485.598, 496.881 490.500 C 495.203 494.153, 495.042 497.758, 495.022 532.038 C 495 569.002, 495.034 569.644, 497.250 574.030 C 500.950 581.354, 508.550 585.053, 516.750 583.522 C 521.423 582.650, 528.407 575.717, 529.346 571.018 C 529.706 569.220, 529.990 551.269, 529.978 531.125 C 529.958 497.731, 529.794 494.147, 528.119 490.500 C 527.109 488.300, 525.349 485.670, 524.207 484.655 C 521.860 482.567, 515.503 480.088, 512.500 480.088 C 511.400 480.088, 508.783 480.700, 506.684 481.449 M 724.505 505.750 C 721.300 538.819, 717.373 561.201, 709.998 588.427 C 707.774 596.637, 706.302 603.652, 706.727 604.015 C 707.152 604.379, 725.950 607.677, 748.500 611.345 C 803.742 620.329, 803.970 620.364, 804.494 619.839 C 804.747 619.587, 805.005 602.757, 805.068 582.440 L 805.184 545.500 765.842 522.263 C 744.204 509.483, 726.198 499.020, 725.830 499.013 C 725.461 499.006, 724.865 502.038, 724.505 505.750 M 257.989 522.895 L 218.500 545.789 218.500 582.312 C 218.500 602.400, 218.757 619.092, 219.071 619.406 C 219.786 620.119, 316.555 604.778, 317.538 603.796 C 317.701 603.633, 315.381 593.825, 312.382 582 C 306.313 558.066, 302.706 538.501, 301.043 520.500 C 299.486 503.635, 298.978 500, 298.178 500 C 297.793 500, 279.708 510.303, 257.989 522.895 M 414.246 660.250 C 414.499 660.938, 418.410 672.640, 422.938 686.256 L 431.170 711.012 512.705 710.756 L 594.241 710.500 602.048 686.500 C 606.343 673.300, 610.162 661.712, 610.535 660.750 C 611.179 659.091, 606.105 659, 512.500 659 C 433.950 659, 413.880 659.255, 414.246 660.250 M 149 692 L 149 707 157.250 706.999 L 165.500 706.998 165.500 691.999 L 165.500 677 157.250 677 L 149 677 149 692 M 859 692 L 859 707 868.107 707 C 876.001 707, 877.133 706.789, 876.607 705.418 C 876.273 704.548, 876 697.798, 876 690.418 L 876 677 867.500 677 L 859 677 859 692 M 482.870 745.721 C 478.937 746.139, 478.856 746.275, 467.979 770.708 L 464.770 777.915 468.262 784.208 C 470.183 787.668, 480.585 806.173, 491.377 825.329 C 502.170 844.485, 511 860.573, 511 861.079 C 511 861.586, 511.337 861.982, 511.750 861.960 C 512.443 861.922, 557.138 782.503, 558.500 778.889 C 558.849 777.964, 556.170 770.726, 552.209 761.889 C 545.954 747.936, 545.040 746.441, 542.405 745.868 C 539.314 745.196, 488.991 745.072, 482.870 745.721");
    
    ctx.fill(path);
    ctx.stroke(path);
    
    ctx.restore();
    
    // Add engine glow effects in yellow/orange to maintain beta theme
    ctx.fillStyle = "#ffaa00";
    ctx.beginPath();
    ctx.arc(
      -this.size * 0.8,
      -this.size * 0.1,
      this.size * 0.06,
      0,
      Math.PI * 2
    );
    ctx.arc(-this.size * 0.8, 0, this.size * 0.06, 0, Math.PI * 2);
    ctx.arc(
      -this.size * 0.8,
      this.size * 0.1,
      this.size * 0.06,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  drawShieldAndHealthBar(ctx) {
    const barWidth = this.size * 1.8;
    const barHeight = 8;
    const currentY = -this.size - 20;

    // Single combined bar (shield takes priority over health)
    if (!this.invulnerable) {
      // Background
      ctx.fillStyle = "#333333";
      ctx.fillRect(-barWidth / 2, currentY, barWidth, barHeight);

      if (this.shield > 0) {
        // Shield bar (blue)
        const shieldPercent = Math.max(0, this.shield / this.maxShield);
        ctx.fillStyle = "#0088ff";
        const shieldBarWidth = Math.max(0, barWidth * shieldPercent);
        ctx.fillRect(-barWidth / 2, currentY, shieldBarWidth, barHeight);
      } else {
        // Health bar (green)
        const healthPercent = Math.max(0, this.health / this.maxHealth);
        ctx.fillStyle = "#00ff00";
        const healthBarWidth = Math.max(0, barWidth * healthPercent);
        ctx.fillRect(-barWidth / 2, currentY, healthBarWidth, barHeight);
      }

      // Border
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(-barWidth / 2, currentY, barWidth, barHeight);
    }

    // Invulnerable indicator
    if (this.invulnerable) {
      ctx.fillStyle = "#00ffff";
      ctx.font = '12px "Press Start 2P"';
      ctx.textAlign = "center";
      ctx.fillText("INVINCIBLE", 0, currentY + 6);
    }
  }
}
