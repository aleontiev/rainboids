// Laser entity for Rainboids: Blitz

export class Laser {
  constructor(
    x,
    y,
    angle,
    speed,
    color,
    game = null,
    isPlayerLaser = false,
    damage = null
  ) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed || game?.level?.config?.player?.laserSpeed || 50; // Use passed speed, level config, or default to 50
    this.color = color;
    this.game = game;
    this.isPlayerLaser = isPlayerLaser; // Flag to distinguish player lasers from enemy lasers
    // Use player laserWidth for player lasers, or world laserWidth for enemy lasers
    this.width = isPlayerLaser
      ? game?.level?.config?.player?.laserWidth || 8
      : game?.level?.config?.world?.laserWidth || 8;
    this.length = game?.level?.config?.player?.laserLength || 50; // Length of laser beam for collision detection
    this.life = game?.level?.config?.player?.laserLife || 60; // Longer life (1 second)
    this.colorIndex = 0;
    this.penetrationCount = 0; // Track how many targets this laser has hit
    this.maxPenetration = 3; // Maximum targets before laser is destroyed
    this.bounceCount = 0; // Track how many times this laser has bounced off metal
    this.maxBounces = 3; // Maximum bounces before laser is destroyed
    this.rainbowColors = [
      "#ff0000",
      "#ff8800",
      "#ffff00",
      "#00ff00",
      "#0088ff",
      "#4400ff",
      "#ff00ff",
    ];

    // Damage property - use custom damage or fallback to reduced power for player lasers
    this.damage = damage !== null ? damage : isPlayerLaser ? 0.33 : 1;

    // Velocity tracking (dx/dy per second)
    this.dx = 0;
    this.dy = 0;
  }

  update(slowdownFactor = 1.0) {
    // Store previous position for velocity calculation
    const prevX = this.x;
    const prevY = this.y;

    this.x += Math.cos(this.angle) * this.speed * slowdownFactor;
    this.y += Math.sin(this.angle) * this.speed * slowdownFactor;
    this.life -= slowdownFactor;

    // Calculate velocity (pixels per frame * 60 = pixels per second)
    this.dx = (this.x - prevX) * 60;
    this.dy = (this.y - prevY) * 60;

    if (this.color === "rainbow") {
      this.colorIndex = Math.floor(Math.random() * this.rainbowColors.length);
    }

    // Check screen boundaries with 50px buffer
    const withinBounds =
      this.x > -50 &&
      this.x < window.innerWidth + 50 &&
      this.y > -50 &&
      this.y < window.innerHeight + 50;

    return (
      this.life > 0 &&
      this.penetrationCount < this.maxPenetration &&
      this.bounceCount < this.maxBounces &&
      withinBounds
    );
  }

  // Called when laser hits a target
  registerHit() {
    this.penetrationCount++;
    return this.penetrationCount >= this.maxPenetration; // Return true if laser should be destroyed
  }

  // Called when laser bounces off metal
  registerBounce(newAngle) {
    this.bounceCount++;
    this.angle = newAngle;
    return this.bounceCount >= this.maxBounces; // Return true if laser should be destroyed
  }

  // Legacy render method for backward compatibility
  render(ctx) {
    // If ctx looks like a Canvas 2D context, use Canvas rendering
    if (ctx && ctx.fillStyle !== undefined) {
      return this.renderCanvas(ctx);
    } else if (ctx && ctx.scene !== undefined) {
      // If ctx has scene (WebGL context object), use WebGL rendering
      return this.renderWebGL(ctx.scene, ctx.materials);
    } else {
      // Fallback to Canvas with basic context
      return this.renderCanvas(ctx);
    }
  }

  renderCanvas(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Draw glow effect
    if (this.color === "rainbow") {
      ctx.globalAlpha = 0.4; // Slightly more opaque glow
      const glowGradient = ctx.createLinearGradient(
        0,
        -this.width * 1.5,
        0,
        this.width * 1.5
      );
      glowGradient.addColorStop(0, "red");
      glowGradient.addColorStop(1 / 6, "orange");
      glowGradient.addColorStop(2 / 6, "yellow");
      glowGradient.addColorStop(3 / 6, "green");
      glowGradient.addColorStop(4 / 6, "blue");
      glowGradient.addColorStop(5 / 6, "indigo");
      glowGradient.addColorStop(1, "violet");
      ctx.strokeStyle = glowGradient;
      ctx.lineWidth = this.width * 1.5; // Wider glow
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(this.length, 0);
      ctx.stroke();
    }

    ctx.globalAlpha = 1; // Reset alpha for the main laser
    if (this.color === "rainbow") {
      ctx.strokeStyle = this.rainbowColors[this.colorIndex];
    } else {
      ctx.strokeStyle = this.color;
    }
    ctx.lineWidth = this.width;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(this.length, 0); // Use configured laser length
    ctx.stroke();
    ctx.restore();
  }

  renderWebGL(scene, materials) {
    // Create unique mesh name for this laser
    const meshName = `laser_${this.id || Math.random().toString(36)}`;
    let laserMesh = scene.getObjectByName(meshName);
    
    if (!laserMesh) {
      // Create elongated laser beam geometry
      const geometry = new THREE.CylinderGeometry(this.width / 4, this.width / 4, this.length, 8, 1);
      
      // Determine laser color
      let laserColor = this.color;
      if (this.color === "rainbow") {
        laserColor = this.rainbowColors[this.colorIndex];
      }
      
      // Create material with laser color and glow
      const material = new THREE.MeshBasicMaterial({
        color: laserColor || '#ffffff',
        transparent: true,
        opacity: 0.8
      });
      
      laserMesh = new THREE.Mesh(geometry, material);
      laserMesh.name = meshName;
      laserMesh.userData = { isDynamic: true, entityType: 'laser' };
      
      // Rotate geometry to align with laser direction (cylinder is vertical by default)
      laserMesh.rotation.z = Math.PI / 2;
      
      scene.add(laserMesh);
    }
    
    // Update position and rotation
    // Position at center of laser beam
    const centerX = this.x + Math.cos(this.angle) * (this.length / 2);
    const centerY = this.y + Math.sin(this.angle) * (this.length / 2);
    laserMesh.position.set(centerX, -centerY, 0);
    laserMesh.rotation.z = -this.angle + Math.PI / 2; // Adjust for cylinder alignment
    
    // Update color for rainbow lasers
    if (this.color === "rainbow") {
      laserMesh.material.color.set(this.rainbowColors[this.colorIndex]);
    } else {
      laserMesh.material.color.set(this.color || '#ffffff');
    }
    
    // Make lasers glow
    laserMesh.material.emissive.copy(laserMesh.material.color);
    laserMesh.material.emissive.multiplyScalar(0.5);
    
    // Special rainbow glow effect
    if (this.color === "rainbow") {
      laserMesh.material.emissive.multiplyScalar(0.8);
    }
  }
}
