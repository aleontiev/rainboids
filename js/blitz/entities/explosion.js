export class RainbowExplosion {
  constructor(x, y, maxRadius = 150) {
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.maxRadius = maxRadius;
    this.growthRate = maxRadius > 500 ? 8 : 3; // Faster growth for big explosions
    this.life = maxRadius > 500 ? 120 : 60; // Longer life for big explosions
    this.colors = [
      "#ff0000",
      "#ff8800",
      "#ffff00",
      "#00ff00",
      "#0088ff",
      "#4400ff",
      "#ff00ff",
    ];
    this.sparks = [];
    this.isFirework = maxRadius > 500;

    // Create sparks for dramatic effect
    const sparkCount = maxRadius > 500 ? 50 : 20;
    for (let i = 0; i < sparkCount; i++) {
      const angle = (i / sparkCount) * Math.PI * 2;
      const speed = this.isFirework
        ? 3 + Math.random() * 6
        : 2 + Math.random() * 4;
      this.sparks.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        life: this.isFirework ? 90 : 60,
        maxLife: this.isFirework ? 90 : 60,
        size: this.isFirework ? 4 + Math.random() * 4 : 3 + Math.random() * 3,
        trail: [],
      });
    }

    // Add firework-specific effects
    if (this.isFirework) {
      // Create additional burst sparks
      for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 8 + Math.random() * 4;
        this.sparks.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: this.colors[Math.floor(Math.random() * this.colors.length)],
          life: 60,
          maxLife: 60,
          size: 2 + Math.random() * 2,
          trail: [],
        });
      }
    }
  }

  update(slowdownFactor = 1.0) {
    this.radius += this.growthRate * slowdownFactor;
    this.life -= slowdownFactor;

    if (this.radius >= this.maxRadius) {
      this.life = 0;
    }

    // Update sparks
    this.sparks = this.sparks.filter((spark) => {
      // Add to trail for firework effect
      spark.trail.push({
        x: spark.x,
        y: spark.y,
        opacity: spark.life / spark.maxLife,
      });
      if (spark.trail.length > (this.isFirework ? 8 : 4)) {
        spark.trail.shift();
      }

      spark.x += spark.vx * slowdownFactor;
      spark.y += spark.vy * slowdownFactor;

      // Add gravity for firework effect
      if (this.isFirework) {
        spark.vy += 0.1 * slowdownFactor; // Gravity
        spark.vx *= 0.995;
        spark.vy *= 0.995;
      } else {
        spark.vx *= 0.98;
        spark.vy *= 0.98;
      }

      spark.life -= slowdownFactor;
      return spark.life > 0;
    });
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

    const opacity = Math.max(0.1, this.life / (this.isFirework ? 120 : 60));

    // Draw rainbow rings with enhanced thickness for big explosions
    const ringWidth = this.isFirework ? 12 : 4;
    for (let i = 0; i < this.colors.length; i++) {
      const ringRadius = this.radius - i * (ringWidth * 1.5);
      if (ringRadius > 0) {
        ctx.globalAlpha = opacity * (1 - i * 0.1);
        ctx.strokeStyle = this.colors[i];
        ctx.lineWidth = ringWidth;
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Add inner glow for big explosions
        if (this.isFirework) {
          ctx.globalAlpha = opacity * 0.4;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = ringWidth / 3;
          ctx.beginPath();
          ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    ctx.restore();

    // Draw sparks with trails
    this.sparks.forEach((spark) => {
      const sparkOpacity = spark.life / spark.maxLife;

      // Draw trail
      spark.trail.forEach((point, index) => {
        ctx.save();
        ctx.globalAlpha = point.opacity * 0.3 * (index / spark.trail.length);
        ctx.fillStyle = spark.color;
        const size = spark.size * (index / spark.trail.length) * 0.5;
        ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size);
        ctx.restore();
      });

      // Draw main spark
      ctx.save();
      ctx.globalAlpha = sparkOpacity;
      ctx.fillStyle = spark.color;
      ctx.fillRect(
        spark.x - spark.size / 2,
        spark.y - spark.size / 2,
        spark.size,
        spark.size
      );

      // Add spark glow for fireworks
      if (this.isFirework) {
        ctx.globalAlpha = sparkOpacity * 0.5;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(
          spark.x - spark.size / 4,
          spark.y - spark.size / 4,
          spark.size / 2,
          spark.size / 2
        );
      }

      ctx.restore();
    });
  }

  renderWebGL(scene, materials) {
    // Create unique mesh name for this explosion
    const meshName = `explosion_${this.id || Math.random().toString(36)}`;
    let explosionGroup = scene.getObjectByName(meshName);
    
    if (!explosionGroup) {
      // Create a group to hold all explosion components
      explosionGroup = new THREE.Group();
      explosionGroup.name = meshName;
      explosionGroup.userData = { isDynamic: true, entityType: 'explosion' };
      scene.add(explosionGroup);
    }
    
    // Clear previous components
    while (explosionGroup.children.length > 0) {
      explosionGroup.remove(explosionGroup.children[0]);
    }
    
    const opacity = Math.max(0.1, this.life / (this.isFirework ? 120 : 60));
    
    // Create rainbow ring spheres
    const ringWidth = this.isFirework ? 12 : 4;
    for (let i = 0; i < this.colors.length; i++) {
      const ringRadius = this.radius - i * (ringWidth * 1.5);
      if (ringRadius > 0) {
        // Create ring geometry as a wireframe sphere
        const ringGeometry = new THREE.SphereGeometry(ringRadius, 16, 12);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: this.colors[i],
          transparent: true,
          opacity: opacity * (1 - i * 0.1),
          wireframe: true
        });
        
        const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
        ringMesh.position.set(this.x, -this.y, 0);
        
        // Add glow effect
        ringMaterial.emissive.set(this.colors[i]);
        ringMaterial.emissive.multiplyScalar(0.3);
        
        explosionGroup.add(ringMesh);
        
        // Add inner glow for big explosions
        if (this.isFirework && i < 3) {
          const glowGeometry = new THREE.SphereGeometry(ringRadius * 0.8, 8, 6);
          const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: opacity * 0.2
          });
          
          const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
          glowMesh.position.set(this.x, -this.y, 0);
          explosionGroup.add(glowMesh);
        }
      }
    }
    
    // Create spark particles
    this.sparks.forEach((spark, sparkIndex) => {
      const sparkOpacity = spark.life / spark.maxLife;
      
      // Create spark geometry
      const sparkGeometry = new THREE.BoxGeometry(spark.size, spark.size, spark.size);
      const sparkMaterial = new THREE.MeshBasicMaterial({
        color: spark.color,
        transparent: true,
        opacity: sparkOpacity
      });
      
      const sparkMesh = new THREE.Mesh(sparkGeometry, sparkMaterial);
      sparkMesh.position.set(spark.x, -spark.y, 0);
      
      // Add spark glow
      sparkMaterial.emissive.set(spark.color);
      sparkMaterial.emissive.multiplyScalar(0.5);
      
      // Add rotation for visual interest
      sparkMesh.rotation.x = sparkIndex * 0.5;
      sparkMesh.rotation.y = sparkIndex * 0.3;
      sparkMesh.rotation.z = sparkIndex * 0.7;
      
      explosionGroup.add(sparkMesh);
      
      // Create trail effect for fireworks
      if (this.isFirework && spark.trail.length > 0) {
        spark.trail.forEach((trailPoint, trailIndex) => {
          const trailSize = spark.size * (trailIndex / spark.trail.length) * 0.5;
          if (trailSize > 0.5) {
            const trailGeometry = new THREE.BoxGeometry(trailSize, trailSize, trailSize);
            const trailMaterial = new THREE.MeshBasicMaterial({
              color: spark.color,
              transparent: true,
              opacity: trailPoint.opacity * 0.3 * (trailIndex / spark.trail.length)
            });
            
            const trailMesh = new THREE.Mesh(trailGeometry, trailMaterial);
            trailMesh.position.set(trailPoint.x, -trailPoint.y, 0);
            
            explosionGroup.add(trailMesh);
          }
        });
      }
    });
  }
}
