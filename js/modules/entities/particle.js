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
            case 'explosionPulse':
                this.life = 0.5;
                this.radius = 0;
                this.maxRadius = args[0] || 60;
                this.color = 'rgba(255,80,0,1)';
                break;
            case 'explosionRedOrange':
                this.radius = random(4, 8); // larger
                this.vel = { x: random(-5, 5), y: random(-5, 5) };
                this.life = random(0.7, 1.2); // longer-lived
                this.hue = random(10, 45); // wider fiery range
                this.sat = random(95, 100); // more saturated
                this.light = random(55, 70); // lighter
                break;
            case 'asteroidCollisionDebris':
                this.radius = random(2, 8); // More size variation
                const debrisSpeed = random(2, 6); // Initial speed
                const debrisAngle = random(0, Math.PI * 2);
                this.vel = { x: Math.cos(debrisAngle) * debrisSpeed, y: Math.sin(debrisAngle) * debrisSpeed };
                this.life = random(0.4, 0.8);
                const gray = Math.floor(random(80, 180));
                this.color = `rgb(${gray},${gray},${gray})`;
                break;
            case 'fieryExplosionRing':
                this.life = 0.9; // longer visible
                this.radius = 0;
                this.maxRadius = args[0] || 60;
                // Randomize start and end colors in red-orange range
                this.startHue = random(10, 20); // deeper red-orange
                this.endHue = random(25, 45);   // more orange
                this.sat = random(95, 100);     // more saturated
                this.light = random(55, 70);    // lighter
                break;
        }
    }
    
    update() {
        if (!this.active) return;
        
        switch (this.type) {
            case 'explosion':
            case 'thrust':
            case 'phantom':
            case 'explosionRedOrange':
                this.x += this.vel?.x || 0;
                this.y += this.vel?.y || 0;
                this.life -= 0.04;
                if (this.type === 'explosionRedOrange') {
                    this.hue += random(-2, 2); // animate color
                }
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
            case 'explosionPulse':
                this.life -= 0.06;
                this.radius = (1 - this.life) * this.maxRadius;
                break;
            case 'asteroidCollisionDebris':
                this.x += this.vel.x;
                this.y += this.vel.y;
                // Apply velocity dampening to slow down
                this.vel.x *= 0.92;
                this.vel.y *= 0.92;
                this.life -= 0.03;
                break;
            case 'fieryExplosionRing':
                this.radius = (1 - this.life) * this.maxRadius;
                this.life -= 0.025;
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
            case 'explosionRedOrange':
                ctx.fillStyle = `hsl(${this.hue}, ${this.sat}%, ${this.light}%)`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
                ctx.fill();
                break;
            case 'explosionPulse':
                ctx.strokeStyle = 'rgba(255,80,0,0.7)';
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
                ctx.stroke();
                break;
                
            case 'playerExplosion':
            case 'pickupPulse':
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
                ctx.stroke();
                break;
            case 'asteroidCollisionDebris':
                ctx.save();
                ctx.globalAlpha = Math.max(0, this.life);
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
                ctx.fill();
                ctx.restore();
                break;
            case 'fieryExplosionRing': {
                ctx.save();
                // Animate hue from start to end
                const t = 1 - this.life / 0.9;
                const hue = this.startHue + (this.endHue - this.startHue) * t;
                ctx.globalAlpha = Math.max(0, this.life * 1.7); // higher alpha
                ctx.strokeStyle = `hsl(${hue}, ${this.sat}%, ${this.light}%)`;
                ctx.lineWidth = 12 * (this.life + 0.2); // thicker ring
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.restore();
                break;
            }
        }
        
        ctx.restore();
    }
} 