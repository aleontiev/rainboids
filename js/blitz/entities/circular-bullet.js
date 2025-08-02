// Circular bullet entity

export class CircularBullet {
  constructor(
    x,
    y,
    angle,
    size,
    color,
    isPortrait,
    speed = 8, // Default bullet speed
    isPlayerBullet = false,
    game = null // Optional game reference for level manager
  ) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed; // Use passed speed or default
    this.size = size;
    this.color = color;
    this.life = this.getBulletLife();
    this.isPortrait = isPortrait;
    this.game = game;
    
    // Velocity tracking (dx/dy per second)
    this.dx = 0;
    this.dy = 0;
  }

  getBulletLife() {
    try {
      return this.game?.level?.config?.world?.bulletLife || 90000; // Default to 25 minutes (effectively unlimited)
    } catch (e) {
      return 90000;
    }
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

    // Remove if off screen or life expired - check all boundaries with 50px buffer
    return this.x > -50 && 
           this.x < window.innerWidth + 50 && 
           this.y > -50 && 
           this.y < window.innerHeight + 50 && 
           this.life > 0;
  }

  // Get collision boundary for precise shape-based collision detection
  getCollisionBoundary() {
    return {
      type: 'circle',
      x: this.x,
      y: this.y,
      radius: this.size
    };
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
    // Safety check to prevent negative radius errors
    if (this.size <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.size, 0, Math.PI * 2); // Draw a perfect circle
    ctx.fill();
    
    // Add configurable stroke for circular bullets
    const strokeColor = this.game?.level?.config?.world?.bulletStrokeColor || "#ffffff";
    const strokeWidth = this.game?.level?.config?.world?.bulletStrokeWidth || 1;
    
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
    
    ctx.restore();
  }

  renderWebGL(scene, materials) {
    // Safety check
    if (this.size <= 0) return;
    
    // Create unique mesh name for this circular bullet
    const meshName = `circular_bullet_${this.id || Math.random().toString(36)}`;
    let bulletMesh = scene.getObjectByName(meshName);
    
    if (!bulletMesh) {
      // Create perfect sphere geometry for circular bullet
      const geometry = new THREE.SphereGeometry(this.size, 12, 8);
      
      // Create material with bullet color
      const material = new THREE.MeshBasicMaterial({
        color: this.color || '#ffffff',
        transparent: true,
        opacity: 1.0
      });
      
      bulletMesh = new THREE.Mesh(geometry, material);
      bulletMesh.name = meshName;
      bulletMesh.userData = { isDynamic: true, entityType: 'circular_bullet' };
      scene.add(bulletMesh);
    }
    
    // Update position and rotation
    bulletMesh.position.set(this.x, -this.y, 0);
    bulletMesh.rotation.z = -this.angle;
    
    // Update material color
    bulletMesh.material.color.set(this.color || '#ffffff');
    
    // Add slight glow effect for circular bullets
    bulletMesh.material.emissive.set(this.color || '#ffffff');
    bulletMesh.material.emissive.multiplyScalar(0.2);
    
    // Optional: Add slight rotation animation for visual interest
    bulletMesh.rotation.x += 0.02;
    bulletMesh.rotation.y += 0.03;
  }
}