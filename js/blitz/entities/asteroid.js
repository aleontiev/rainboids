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
        this.godMode = false;
        this.invulnerable = false;
        
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
    }

    takeDamage(damage) {
        this.health -= damage;
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

    // Check if this asteroid can be targeted by auto-aim
    isVulnerableToAutoAim() {
        return !this.godMode && !this.invulnerable;
    }
    
    update(slowdownFactor = 1.0) {
        this.x += this.vx * slowdownFactor;
        this.y += this.vy * slowdownFactor;
        this.angle += this.rotationSpeed * slowdownFactor;
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        ctx.fillStyle = '#333'; // Dark grey fill
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
        ctx.fill(); // Fill the asteroid with black
        ctx.stroke();
        
        // Draw interior lines for detail
        this.interiorLines.forEach(line => {
            ctx.beginPath();
            ctx.moveTo(line.start.x, line.start.y);
            ctx.lineTo(line.end.x, line.end.y);
            ctx.stroke();
        });
        
        ctx.restore();
    }
}
