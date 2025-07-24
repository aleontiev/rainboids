export class Asteroid {
    constructor(x, y, type, isPortrait, size, speed, vx = null, vy = null) {
        this.x = x;
        this.y = y;
        this.type = type; // Store type
        this.isPortrait = isPortrait;
        this.size = size;
        this.speed = speed;

        if (vx === null || vy === null) {
            if (this.isPortrait) {
                this.vx = 0;
                this.vy = this.speed;
            } else {
                this.vx = -this.speed;
                this.vy = 0;
            }
        } else {
            this.vx = vx;
            this.vy = vy;
        }

        this.angle = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02; // Slower rotation
        this.health = Math.floor(size / 10);
        
        // Vulnerability properties (for consistency with auto-aim system)
        this.invulnerable = false;
        
        // Velocity tracking (dx/dy per second) - initialize with current velocity
        this.dx = this.vx * 60;
        this.dy = this.vy * 60;
        
        // Generate more vertices for detailed shape
        this.vertices = [];
        const numVertices = 12 + Math.floor(Math.random() * 8); // 12-20 vertices
        
        for (let i = 0; i < numVertices; i++) {
            const angle = (i / numVertices) * Math.PI * 2;
            const radius = this.size * (0.7 + Math.random() * 0.6); // Vary radius
            this.vertices.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius
            });
        }
        
        
        // Generate interior lines for detail
        this.interiorLines = [];
        const numInteriorLines = 3 + Math.floor(Math.random() * 4); // 3-6 interior lines
        
        for (let i = 0; i < numInteriorLines; i++) {
            const angle1 = Math.random() * Math.PI * 2;
            const angle2 = Math.random() * Math.PI * 2;
            const radius1 = this.size * (0.2 + Math.random() * 0.5);
            const radius2 = this.size * (0.2 + Math.random() * 0.5);
            
            this.interiorLines.push({
                start: {
                    x: Math.cos(angle1) * radius1,
                    y: Math.sin(angle1) * radius1
                },
                end: {
                    x: Math.cos(angle2) * radius2,
                    y: Math.sin(angle2) * radius2
                }
            });
        }
        
        // Track crater count for visual darkening
        this.craterCount = 0;
    }

    takeDamage(damage, impactX = null, impactY = null) {
        this.health -= damage;
        
        // Create crater damage if impact coordinates are provided
        if (impactX !== null && impactY !== null) {
            this.createCrater(impactX, impactY, damage);
        }
        
        if (this.health <= 0) {
            if (this.size >= 50) { // Large asteroid
                return 'breakIntoMedium';
            } else if (this.size >= 30) { // Medium asteroid
                return 'breakIntoSmall';
            } else { // Small asteroid
                return 'destroyed';
            }
        }
        return false;
    }

    createCrater(impactX, impactY, damage) {
        // Convert world coordinates to local coordinates
        const localX = impactX - this.x;
        const localY = impactY - this.y;
        
        // Rotate coordinates to asteroid's local space
        const cos = Math.cos(-this.angle);
        const sin = Math.sin(-this.angle);
        const rotatedX = localX * cos - localY * sin;
        const rotatedY = localX * sin + localY * cos;
        
        
        // Calculate crater size based on damage
        const craterRadius = Math.min(this.size * 0.5, 15 + damage * 4);
        const craterDepth = 0.5 + damage * 0.2; // Deeper craters for more visibility
        
        this.craterCount++;
        
        // Find the impact point on the edge
        const impactAngle = Math.atan2(rotatedY, rotatedX);
        const edgeDistance = Math.sqrt(rotatedX * rotatedX + rotatedY * rotatedY);
        
        // Create new vertices around the impact point for more detailed crater
        const newVertices = [];
        const craterVertices = 5; // Number of vertices to add for crater detail
        
        for (let i = 0; i < this.vertices.length; i++) {
            const vertex = this.vertices[i];
            const vertexAngle = Math.atan2(vertex.y, vertex.x);
            
            // Calculate angular distance to impact
            let angleDiff = vertexAngle - impactAngle;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            
            const angularDistance = Math.abs(angleDiff);
            const craterAngularSize = craterRadius / this.size;
            
            if (angularDistance < craterAngularSize) {
                // This vertex is affected by the crater
                const influenceFactor = 1 - (angularDistance / craterAngularSize);
                const currentRadius = Math.sqrt(vertex.x ** 2 + vertex.y ** 2);
                
                // Create a more dramatic inward deformation
                const deformation = influenceFactor * craterDepth;
                const newRadius = currentRadius * (1 - deformation * 0.7);
                
                // Also add some inward displacement toward the impact center
                const towardsCenterX = rotatedX * influenceFactor * 0.2;
                const towardsCenterY = rotatedY * influenceFactor * 0.2;
                
                vertex.x = Math.cos(vertexAngle) * newRadius + towardsCenterX;
                vertex.y = Math.sin(vertexAngle) * newRadius + towardsCenterY;
            }
            
            newVertices.push(vertex);
        }
        
        this.vertices = newVertices;
        
        // Add jagged edges and cracks
        this.addCrackLines(rotatedX, rotatedY, craterRadius);
    }
    
    addCrackLines(impactX, impactY, craterRadius) {
        // Add crack lines radiating from impact
        const numCracks = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < numCracks; i++) {
            const angle = (i / numCracks) * Math.PI * 2 + Math.random() * 0.5;
            const length = craterRadius * (1.5 + Math.random() * 0.5);
            
            this.interiorLines.push({
                start: {
                    x: impactX,
                    y: impactY
                },
                end: {
                    x: impactX + Math.cos(angle) * length,
                    y: impactY + Math.sin(angle) * length
                },
                isCrack: true
            });
        }
    }

    // Check if this asteroid is vulnerable
    isVulnerable() {
        return !this.invulnerable;
    }
    
    update(slowdownFactor = 1.0) {
        // Store previous position for velocity calculation
        const prevX = this.x;
        const prevY = this.y;
        
        this.x += this.vx * slowdownFactor;
        this.y += this.vy * slowdownFactor;
        this.angle += this.rotationSpeed * slowdownFactor;
        
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
        ctx.rotate(this.angle);
        
        // Base fill color changes based on damage
        const damageRatio = Math.max(0, 1 - (this.craterCount * 0.1));
        const grayValue = Math.floor(51 * damageRatio + 20); // From #333 to darker
        ctx.fillStyle = `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
        ctx.strokeStyle = '#AAA'; // Lighter grey stroke
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        // Draw using pre-generated vertices
        this.vertices.forEach((vertex, i) => {
            if (i === 0) {
                ctx.moveTo(vertex.x, vertex.y);
            } else {
                ctx.lineTo(vertex.x, vertex.y);
            }
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw crater shadows for depth effect
        if (this.craterCount > 0) {
            ctx.save();
            
            // Create clipping mask for asteroid shape
            ctx.beginPath();
            this.vertices.forEach((vertex, i) => {
                if (i === 0) {
                    ctx.moveTo(vertex.x, vertex.y);
                } else {
                    ctx.lineTo(vertex.x, vertex.y);
                }
            });
            ctx.closePath();
            ctx.clip();
            
            // Draw shadows inside craters
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 3;
            
            // Find and shade concave areas
            for (let i = 0; i < this.vertices.length; i++) {
                const vertex = this.vertices[i];
                const prevVertex = this.vertices[(i - 1 + this.vertices.length) % this.vertices.length];
                const nextVertex = this.vertices[(i + 1) % this.vertices.length];
                
                const currentRadius = Math.sqrt(vertex.x ** 2 + vertex.y ** 2);
                const expectedRadius = this.size * 0.85;
                
                // If this vertex is significantly inward, it's part of a crater
                if (currentRadius < expectedRadius * 0.75) {
                    // Draw shadow gradient from this vertex
                    const gradient = ctx.createRadialGradient(
                        vertex.x, vertex.y, 0,
                        vertex.x, vertex.y, 20
                    );
                    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(vertex.x, vertex.y, 20, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Draw crater edge line
                    ctx.beginPath();
                    ctx.moveTo(prevVertex.x, prevVertex.y);
                    ctx.lineTo(vertex.x, vertex.y);
                    ctx.lineTo(nextVertex.x, nextVertex.y);
                    ctx.stroke();
                }
            }
            
            ctx.restore();
        }
        
        // Draw interior lines and cracks
        this.interiorLines.forEach(line => {
            ctx.beginPath();
            ctx.moveTo(line.start.x, line.start.y);
            ctx.lineTo(line.end.x, line.end.y);
            
            if (line.isCrack) {
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
            } else {
                ctx.strokeStyle = '#AAA';
                ctx.lineWidth = 2;
            }
            
            ctx.stroke();
        });
        
        
        ctx.restore();
    }

    renderWebGL(scene, materials) {
        // Create unique mesh name for this asteroid
        const meshName = `asteroid_${this.id || Math.random().toString(36)}`;
        let asteroidMesh = scene.getObjectByName(meshName);
        
        if (!asteroidMesh) {
            // Create irregular geometry for asteroid
            const geometry = new THREE.DodecahedronGeometry(this.size * 0.7);
            
            // Apply some randomness to vertices for more irregular shape
            const vertices = geometry.attributes.position.array;
            for (let i = 0; i < vertices.length; i += 3) {
                const factor = 0.8 + Math.random() * 0.4; // Random scale factor
                vertices[i] *= factor;     // x
                vertices[i + 1] *= factor; // y  
                vertices[i + 2] *= factor; // z
            }
            geometry.attributes.position.needsUpdate = true;
            
            // Create material with damage-based coloring
            const damageRatio = Math.max(0, 1 - (this.craterCount * 0.1));
            const grayValue = damageRatio * 0.2 + 0.08; // Darker in WebGL
            
            const material = new THREE.MeshLambertMaterial({
                color: new THREE.Color(grayValue, grayValue, grayValue),
                transparent: true,
                opacity: 1.0
            });
            
            asteroidMesh = new THREE.Mesh(geometry, material);
            asteroidMesh.name = meshName;
            asteroidMesh.userData = { isDynamic: true, entityType: 'asteroid' };
            scene.add(asteroidMesh);
        }
        
        // Update position and rotation
        asteroidMesh.position.set(this.x, -this.y, 0); // Flip Y for screen coordinates
        asteroidMesh.rotation.set(this.angle, this.angle * 0.7, this.angle * 0.3); // Multi-axis rotation
        
        // Update material color based on damage
        const damageRatio = Math.max(0, 1 - (this.craterCount * 0.1));
        const grayValue = damageRatio * 0.2 + 0.08;
        asteroidMesh.material.color.setRGB(grayValue, grayValue, grayValue);
    }
}
