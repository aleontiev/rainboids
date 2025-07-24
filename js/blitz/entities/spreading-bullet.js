import { Bullet } from "./bullet.js";

export class SpreadingBullet {
  constructor(
    x,
    y,
    angle,
    size,
    color,
    isPortrait,
    speed = 8, // Default bullet speed
    explosionTime = 120, // 2 seconds at 60fps
    game = null,
    spreadConfig = null // Configuration for spread bullets when exploding
  ) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed;
    this.size = size; // Initial size
    this.color = color;
    this.life = 300; // Standard bullet life
    this.isPortrait = isPortrait;
    this.explosionTime = explosionTime;
    this.time = 0;
    this.exploded = false;
    this.health = 1; // Can be damaged by player
    this.game = game;
    this.spreadConfig = spreadConfig;
    
    // Velocity tracking (dx/dy per second)
    this.dx = 0;
    this.dy = 0;
  }

  update(slowdownFactor = 1.0, addEnemyBulletCallback) {
    if (this.exploded) return false; // Already exploded, remove

    // Store previous position for velocity calculation
    const prevX = this.x;
    const prevY = this.y;
    
    this.x += Math.cos(this.angle) * this.speed * slowdownFactor;
    this.y += Math.sin(this.angle) * this.speed * slowdownFactor;
    this.life -= slowdownFactor;
    this.time += slowdownFactor;
    
    // Calculate velocity (pixels per frame * 60 = pixels per second)
    this.dx = (this.x - prevX) * 60;
    this.dy = (this.y - prevY) * 60;

    // Explode if time is up or health is 0
    if (this.time >= this.explosionTime || this.health <= 0) {
      if (typeof addEnemyBulletCallback === 'function') {
        this.explode(addEnemyBulletCallback);
      } else {
        console.warn('SpreadingBullet update called without valid callback, exploding without spawning bullets');
        this.exploded = true;
      }
      return false; // Remove this bullet after explosion
    }

    // Remove if off screen - check all boundaries with 50px buffer
    return this.x > -50 && 
           this.x < window.innerWidth + 50 && 
           this.y > -50 && 
           this.y < window.innerHeight + 50 && 
           this.life > 0;
  }

  explode(addEnemyBulletCallback) {
    this.exploded = true;
    
    // Guard against missing callback
    if (typeof addEnemyBulletCallback !== 'function') {
      console.warn('SpreadingBullet explode called without valid callback function');
      return;
    }
    
    // Use provided spread config or defaults
    const numBullets = this.spreadConfig?.count || 8;
    const bulletSpeed = this.spreadConfig?.speed || 4;
    const bulletSize = this.spreadConfig?.size || this.size * 0.3;

    for (let i = 0; i < numBullets; i++) {
      const angle = (i / numBullets) * Math.PI * 2; // Evenly spaced around circle
      const bullet = new Bullet(
        this.x,
        this.y,
        angle,
        bulletSize,
        this.color,
        this.isPortrait,
        bulletSpeed,
        false,
        this.game
      );
      addEnemyBulletCallback(bullet);
    }
  }

  takeDamage(damage) {
    this.health -= damage;
    return this.health <= 0; // Return true if destroyed
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
    if (this.exploded) return; // Don't render if exploded

    // Safety check to prevent negative radius errors
    if (this.size <= 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Rotate based on time for spinning effect
    const spinSpeed = 0.1;
    ctx.rotate(this.time * spinSpeed);
    
    // Draw spiky ball
    const radius = this.size;
    const spikes = 8;
    const innerRadius = radius * 0.6;
    const outerRadius = radius;
    
    // Create gradient for depth
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, outerRadius);
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(0.7, this.color);
    gradient.addColorStop(1, "#440000"); // Darker edge
    
    ctx.fillStyle = gradient;
    
    // Draw spiky shape
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i * Math.PI) / spikes;
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
    
    // Add warning glow effect as it approaches explosion
    const timeRatio = this.time / this.explosionTime;
    if (timeRatio > 0.7) {
      ctx.save();
      ctx.globalAlpha = (timeRatio - 0.7) / 0.3; // Fade in during last 30%
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10 + (timeRatio - 0.7) * 20;
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  renderWebGL(scene, materials) {
    if (this.exploded) return; // Don't render if exploded
    
    // Safety check
    if (this.size <= 0) return;
    
    // Create unique mesh name for this spreading bullet
    const meshName = `spreading_bullet_${this.id || Math.random().toString(36)}`;
    let bulletMesh = scene.getObjectByName(meshName);
    
    if (!bulletMesh) {
      // Create spiky/dangerous looking geometry - dodecahedron with spikes
      const geometry = new THREE.DodecahedronGeometry(this.size * 0.8, 0);
      
      // Create material with bullet color
      const material = new THREE.MeshLambertMaterial({
        color: this.color || '#ff4444',
        transparent: true,
        opacity: 1.0,
        emissive: 0x000000
      });
      
      bulletMesh = new THREE.Mesh(geometry, material);
      bulletMesh.name = meshName;
      bulletMesh.userData = { isDynamic: true, entityType: 'spreading_bullet' };
      scene.add(bulletMesh);
    }
    
    // Update position and spinning rotation
    bulletMesh.position.set(this.x, -this.y, 0);
    
    // Apply spinning effect
    const spinSpeed = 0.1;
    bulletMesh.rotation.x = this.time * spinSpeed;
    bulletMesh.rotation.y = this.time * spinSpeed * 0.7;
    bulletMesh.rotation.z = this.time * spinSpeed * 0.3;
    
    // Update material color
    bulletMesh.material.color.set(this.color || '#ff4444');
    
    // Add warning glow effect as it approaches explosion
    const timeRatio = this.time / this.explosionTime;
    if (timeRatio > 0.7) {
      const glowIntensity = (timeRatio - 0.7) / 0.3; // Fade in during last 30%
      bulletMesh.material.emissive.set(this.color || '#ff4444');
      bulletMesh.material.emissive.multiplyScalar(glowIntensity * 0.8);
      
      // Pulsing effect
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 0.3);
      bulletMesh.material.emissive.multiplyScalar(pulse);
    } else {
      // Normal slight glow
      bulletMesh.material.emissive.set(this.color || '#ff4444');
      bulletMesh.material.emissive.multiplyScalar(0.2);
    }
  }
}
