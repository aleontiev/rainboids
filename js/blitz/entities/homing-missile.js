// HomingMissile entity for Rainboids: Blitz

export class HomingMissile {
  constructor(x, y, angle, speed, color, isPlayerMissile = false) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed;
    this.color = color;
    this.size = 15;
    this.turnSpeed = 0.05;
    this.life = 200;
    this.target = null;
    this.isPlayerMissile = isPlayerMissile; // Flag to identify player missiles
  }

  update(enemies, slowdownFactor = 1.0) {
    if (!this.target || !enemies.includes(this.target)) {
      let closestEnemy = null;
      let closestDist = Infinity;
      for (const enemy of enemies) {
        // Only target enemies within viewport
        if (
          enemy.x >= 0 &&
          enemy.x <= window.innerWidth &&
          enemy.y >= 0 &&
          enemy.y <= window.innerHeight
        ) {
          const dx = enemy.x - this.x;
          const dy = enemy.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < closestDist) {
            closestDist = dist;
            closestEnemy = enemy;
          }
        }
      }
      this.target = closestEnemy;
    }

    if (this.target) {
      const targetAngle = Math.atan2(
        this.target.y - this.y,
        this.target.x - this.x
      );
      let angleDiff = targetAngle - this.angle;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      if (Math.abs(angleDiff) < this.turnSpeed) {
        this.angle = targetAngle;
      } else {
        this.angle += Math.sign(angleDiff) * this.turnSpeed * slowdownFactor;
      }
    }

    this.x += Math.cos(this.angle) * this.speed * slowdownFactor;
    this.y += Math.sin(this.angle) * this.speed * slowdownFactor;
    this.life -= slowdownFactor;
    
    // Check screen boundaries with 50px buffer
    const withinBounds = this.x > -50 && 
                        this.x < window.innerWidth + 50 && 
                        this.y > -50 && 
                        this.y < window.innerHeight + 50;
    
    return this.life > 0 && withinBounds;
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

  // Get collision boundary for precise shape-based collision detection
  getCollisionBoundary() {
    // Homing missiles are elongated rectangles
    const width = this.size * 3;
    const height = this.size;
    return {
      type: 'rectangle',
      x: this.x,
      y: this.y,
      angle: this.angle,
      width: width,
      height: height
    };
  }

  renderCanvas(ctx) {
    // Safety check to prevent negative size errors
    if (this.size <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(Math.max(1, this.size), 0);
    ctx.lineTo(-Math.max(0.5, this.size / 2), -Math.max(0.5, this.size / 2));
    ctx.lineTo(-Math.max(0.5, this.size / 2), Math.max(0.5, this.size / 2));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  renderWebGL(scene, materials) {
    // Safety check
    if (this.size <= 0) return;
    
    // Create unique mesh name for this homing missile
    const meshName = `homing_missile_${this.id || Math.random().toString(36)}`;
    let missileMesh = scene.getObjectByName(meshName);
    
    if (!missileMesh) {
      // Create cone/rocket geometry for missile
      const geometry = new THREE.ConeGeometry(this.size * 0.4, this.size * 2, 6);
      
      // Create material with missile color
      const material = new THREE.MeshBasicMaterial({
        color: this.color || '#ff0000',
        transparent: true,
        opacity: 1.0
      });
      
      missileMesh = new THREE.Mesh(geometry, material);
      missileMesh.name = meshName;
      missileMesh.userData = { isDynamic: true, entityType: 'homing_missile' };
      scene.add(missileMesh);
    }
    
    // Update position and rotation
    missileMesh.position.set(this.x, -this.y, 0);
    // Cone points in +Y direction by default, missile travels in angle direction
    missileMesh.rotation.z = -this.angle - Math.PI / 2;
    
    // Update material color
    missileMesh.material.color.set(this.color || '#ff0000');
    
    // Add missile glow/exhaust effect
    missileMesh.material.emissive.set(this.color || '#ff0000');
    missileMesh.material.emissive.multiplyScalar(0.4);
    
    // Add slight pulsing effect for homing missiles
    const pulseIntensity = 0.5 + 0.3 * Math.sin(Date.now() * 0.01);
    missileMesh.material.emissive.multiplyScalar(pulseIntensity);
  }
}
