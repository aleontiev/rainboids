// Particle effects system
import { random } from '../utils.js';

export class Particle {
    constructor() {
        this.active = false;
    }
    
    reset(x, y, type, ...args) {
        this.x = x;
        this.y = y;
        this.active = true;
        this.type = type;
        
        switch (type) {
            case 'explosion':
                this.radius = random(1, 3);
                this.vel = { x: random(-3, 3), y: random(-3, 3) };
                this.life = 1;
                this.color = `hsl(${random(0, 360)}, 100%, 70%)`;
                break;
                
            case 'playerExplosion':
                this.life = 1;
                this.radius = 0;
                this.maxRadius = 150;
                this.color = '#0ff';
                break;
                
            case 'thrust':
                const [angle] = args;
                const cols = ['#ff4500', '#ff8c00', '#ffa500'];
                this.color = cols[Math.floor(random(0, cols.length))];
                const a = angle + random(-0.26, 0.26);
                const s = random(1.5, 3);
                this.radius = random(1, 2.5);
                this.vel = { x: Math.cos(a) * s, y: Math.sin(a) * s };
                this.life = 1;
                break;
                
            case 'phantom':
                const [color, radius] = args;
                this.color = color;
                this.radius = radius * 0.8;
                this.life = 0.5;
                this.vel = { x: 0, y: 0 };
                break;
                
            case 'pickupPulse':
                this.life = 1;
                this.radius = 0;
                this.maxRadius = 30;
                this.color = 'white';
                break;
        }
    }
    
    update() {
        if (!this.active) return;
        
        switch (this.type) {
            case 'explosion':
            case 'thrust':
                this.x += this.vel.x;
                this.y += this.vel.y;
                this.life -= 0.02;
                break;
                
            case 'phantom':
                this.life -= 0.05;
                break;
                
            case 'playerExplosion':
                this.life -= 0.02;
                this.radius = (1 - this.life ** 2) * this.maxRadius;
                break;
                
            case 'pickupPulse':
                this.life -= 0.04;
                this.radius = (1 - this.life) * this.maxRadius;
                break;
        }
        
        if (this.life <= 0) {
            this.active = false;
        }
    }
    
    draw(ctx) {
        if (!this.active) return;
        
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        
        switch (this.type) {
            case 'explosion':
            case 'thrust':
            case 'phantom':
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
                ctx.fill();
                break;
                
            case 'playerExplosion':
            case 'pickupPulse':
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
                ctx.stroke();
                break;
        }
        
        ctx.restore();
    }
} 