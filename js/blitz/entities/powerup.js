export class Powerup {
  constructor(x, y, type, isPortrait, game = null) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.game = game;
    this.size = game?.level?.config?.powerupSize || 20;
    this.speed = game?.level?.config?.powerupSpeed || 1;
    this.pulseTimer = 0;
    this.isPortrait = isPortrait;
    
    // Velocity tracking (dx/dy per second)
    this.dx = 0;
    this.dy = 0;
    this.colors = game?.level?.config?.powerupColors || {
      shield: "#4488ff", // Blue
      mainWeapon: "#44ff44", // green
      sideWeapon: "#44ff44", // green
      secondShip: "#aa44ff", // purple
      bomb: "#ff4444", // red
      rainbowStar: "#ff0000", // Will be overridden with rainbow gradient
    };
  }

  update() {
    // Store previous position for velocity calculation
    const prevX = this.x;
    const prevY = this.y;
    
    if (this.isPortrait) {
      this.y += this.speed;
    } else {
      this.x -= this.speed;
    }
    this.pulseTimer += 0.1;
    
    // Calculate velocity (pixels per frame * 60 = pixels per second)
    this.dx = (this.x - prevX) * 60;
    this.dy = (this.y - prevY) * 60;
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

    const pulse = 0.8 + 0.2 * Math.sin(this.pulseTimer);

    if (this.type === "rainbowStar") {
      // Rainbow gradient for rainbow star
      const gradient = ctx.createLinearGradient(-this.size, -this.size, this.size, this.size);
      const time = Date.now() * 0.005;
      gradient.addColorStop(0, `hsl(${(time * 60) % 360}, 100%, 50%)`);
      gradient.addColorStop(0.25, `hsl(${(time * 60 + 90) % 360}, 100%, 50%)`);
      gradient.addColorStop(0.5, `hsl(${(time * 60 + 180) % 360}, 100%, 50%)`);
      gradient.addColorStop(0.75, `hsl(${(time * 60 + 270) % 360}, 100%, 50%)`);
      gradient.addColorStop(1, `hsl(${(time * 60 + 360) % 360}, 100%, 50%)`);
      
      // Draw glowing outer circle
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4;
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.stroke();

      // Draw inner glow circle
      ctx.globalAlpha = pulse * 0.6;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Regular powerup rendering
      const color = this.colors[this.type];
      
      // Draw outer circle
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = pulse;
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.stroke();

      // Draw inner circle
      ctx.globalAlpha = pulse * 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw icon
    ctx.globalAlpha = 1;
    if (this.type === "rainbowStar") {
      // Use rainbow gradient for the star icon
      const gradient = ctx.createLinearGradient(-this.size, -this.size, this.size, this.size);
      const time = Date.now() * 0.005;
      gradient.addColorStop(0, `hsl(${(time * 60) % 360}, 100%, 50%)`);
      gradient.addColorStop(0.25, `hsl(${(time * 60 + 90) % 360}, 100%, 50%)`);
      gradient.addColorStop(0.5, `hsl(${(time * 60 + 180) % 360}, 100%, 50%)`);
      gradient.addColorStop(0.75, `hsl(${(time * 60 + 270) % 360}, 100%, 50%)`);
      gradient.addColorStop(1, `hsl(${(time * 60 + 360) % 360}, 100%, 50%)`);
      ctx.strokeStyle = gradient;
    } else {
      ctx.strokeStyle = this.colors[this.type];
    }
    ctx.lineWidth = 2;

    switch (this.type) {
      case "shield":
        // Shield icon (Lucide style)
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 0.4);
        ctx.lineTo(this.size * 0.3, -this.size * 0.2);
        ctx.lineTo(this.size * 0.3, this.size * 0.2);
        ctx.lineTo(0, this.size * 0.4);
        ctx.lineTo(-this.size * 0.3, this.size * 0.2);
        ctx.lineTo(-this.size * 0.3, -this.size * 0.2);
        ctx.closePath();
        ctx.stroke();
        break;

      case "mainWeapon":
        // Flame icon (Lucide style)
        ctx.beginPath();
        ctx.moveTo(0, this.size * 0.4);
        ctx.quadraticCurveTo(
          -this.size * 0.2,
          this.size * 0.1,
          -this.size * 0.1,
          -this.size * 0.1
        );
        ctx.quadraticCurveTo(
          -this.size * 0.05,
          -this.size * 0.3,
          0,
          -this.size * 0.4
        );
        ctx.quadraticCurveTo(
          this.size * 0.05,
          -this.size * 0.3,
          this.size * 0.1,
          -this.size * 0.1
        );
        ctx.quadraticCurveTo(
          this.size * 0.2,
          this.size * 0.1,
          0,
          this.size * 0.4
        );
        ctx.stroke();
        // Inner flame
        ctx.beginPath();
        ctx.moveTo(0, this.size * 0.2);
        ctx.quadraticCurveTo(
          -this.size * 0.1,
          this.size * 0.05,
          0,
          -this.size * 0.2
        );
        ctx.quadraticCurveTo(
          this.size * 0.1,
          this.size * 0.05,
          0,
          this.size * 0.2
        );
        ctx.stroke();
        break;

      case "sideWeapon":
        // Triangle icon (Lucide style)
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 0.3);
        ctx.lineTo(this.size * 0.3, this.size * 0.3);
        ctx.lineTo(-this.size * 0.3, this.size * 0.3);
        ctx.closePath();
        ctx.stroke();
        break;

      case "secondShip":
        // Rocket icon (Lucide style)
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 0.4);
        ctx.lineTo(this.size * 0.1, -this.size * 0.2);
        ctx.lineTo(this.size * 0.2, this.size * 0.2);
        ctx.lineTo(this.size * 0.1, this.size * 0.4);
        ctx.lineTo(-this.size * 0.1, this.size * 0.4);
        ctx.lineTo(-this.size * 0.2, this.size * 0.2);
        ctx.lineTo(-this.size * 0.1, -this.size * 0.2);
        ctx.closePath();
        ctx.stroke();
        // Rocket fins
        ctx.beginPath();
        ctx.moveTo(-this.size * 0.2, this.size * 0.2);
        ctx.lineTo(-this.size * 0.3, this.size * 0.3);
        ctx.moveTo(this.size * 0.2, this.size * 0.2);
        ctx.lineTo(this.size * 0.3, this.size * 0.3);
        ctx.stroke();
        break;

      case "bomb":
        // Bomb icon (keep existing design)
        ctx.beginPath();
        ctx.arc(0, this.size * 0.1, this.size * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        // Fuse
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 0.2);
        ctx.lineTo(-this.size * 0.1, -this.size * 0.4);
        ctx.lineTo(this.size * 0.1, -this.size * 0.3);
        ctx.stroke();
        break;

      case "rainbowStar":
        // 5-pointed star icon
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const x = Math.cos(angle) * this.size * 0.3;
          const y = Math.sin(angle) * this.size * 0.3;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.stroke();
        break;
    }

    ctx.restore();
  }

  renderWebGL(scene, materials) {
    // Create unique mesh name for this powerup
    const meshName = `powerup_${this.type}_${this.x.toFixed(0)}_${this.y.toFixed(0)}`;
    let powerupMesh = scene.getObjectByName(meshName);
    
    if (!powerupMesh) {
      // Create box geometry for powerup
      const geometry = new THREE.BoxGeometry(this.size * 0.8, this.size * 0.8, this.size * 0.8);
      
      // Get powerup color based on type
      let color;
      const pulse = 0.8 + 0.2 * Math.sin(this.pulseTimer);
      
      if (this.type === "rainbowStar") {
        // Rainbow effect - use HSL cycling color
        const time = Date.now() * 0.005;
        const hue = (time * 60) % 360;
        color = new THREE.Color().setHSL(hue / 360, 1.0, 0.5);
      } else {
        // Convert hex color to Three.js color
        const hexColor = this.colors[this.type] || "#ffffff";
        color = new THREE.Color(hexColor);
      }
      
      // Create emissive material that pulses
      const material = new THREE.MeshLambertMaterial({
        color: color,
        transparent: true,
        opacity: pulse * 0.8,
        emissive: color,
        emissiveIntensity: pulse * 0.3
      });
      
      powerupMesh = new THREE.Mesh(geometry, material);
      powerupMesh.name = meshName;
      scene.add(powerupMesh);
    }
    
    // Update position
    powerupMesh.position.set(this.x, -this.y, 0); // Negative Y for WebGL coordinate system
    
    // Rotate the powerup for visual appeal
    const rotationSpeed = 0.02;
    powerupMesh.rotation.x += rotationSpeed;
    powerupMesh.rotation.y += rotationSpeed * 0.7;
    powerupMesh.rotation.z += rotationSpeed * 0.5;
    
    // Update pulsing effect
    const pulse = 0.8 + 0.2 * Math.sin(this.pulseTimer);
    powerupMesh.material.opacity = pulse * 0.8;
    powerupMesh.material.emissiveIntensity = pulse * 0.3;
    
    // Update rainbow color for rainbow star
    if (this.type === "rainbowStar") {
      const time = Date.now() * 0.005;
      const hue = (time * 60) % 360;
      const newColor = new THREE.Color().setHSL(hue / 360, 1.0, 0.5);
      powerupMesh.material.color = newColor;
      powerupMesh.material.emissive = newColor;
    }
  }
}
