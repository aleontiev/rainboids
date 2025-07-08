// Line debris from destroyed asteroids
import { random } from '../utils.js';

export class LineDebris {
    constructor() {
        this.active = false;
    }
    
    reset(x, y, p1, p2) {
        this.x = x;
        this.y = y;
        this.life = 1;
        this.p1 = p1;
        this.p2 = p2;
        this.active = true;
        
        // Calculate velocity based on midpoint
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const ang = Math.atan2(midY, midX);
        const spd = random(1, 3);
        
        this.vel = { x: Math.cos(ang) * spd, y: Math.sin(ang) * spd };
        this.rot = 0;
        this.rotVel = random(-0.1, 0.1);
    }
    
    update() {
        if (!this.active) return;
        
        this.x += this.vel.x;
        this.y += this.vel.y;
        this.rot += this.rotVel;
        this.life -= 0.02;
        
        if (this.life <= 0) {
            this.active = false;
        }
    }
    
    draw(ctx) {
        if (!this.active) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        ctx.moveTo(this.p1.x, this.p1.y);
        ctx.lineTo(this.p2.x, this.p2.y);
        ctx.stroke();
        
        ctx.restore();
    }
} 