// Bullet projectile entity
import { GAME_CONFIG } from '../constants.js';
import { wrap } from '../utils.js';

export class Bullet {
    constructor() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.active = false;
    }
    
    reset(x, y, angle) {
        this.x = x + Math.cos(angle) * (GAME_CONFIG.SHIP_SIZE / 1.5);
        this.y = y + Math.sin(angle) * (GAME_CONFIG.SHIP_SIZE / 1.5);
        this.radius = 3;
        this.angle = angle;
        this.vel = {
            x: Math.cos(angle) * GAME_CONFIG.BULLET_SPEED,
            y: Math.sin(angle) * GAME_CONFIG.BULLET_SPEED
        };
        this.life = 0;
        this.waveAmp = 4;
        this.active = true;
        this.mass = 1;
    }
    
    update(particlePool, asteroidPool) {
        if (!this.active) return;
        
        this.life++;
        
        // Add wave motion
        const perp = this.angle + Math.PI / 2;
        const off = Math.sin(this.life * 0.2) * this.waveAmp;
        
        this.x += this.vel.x + Math.cos(perp) * off;
        this.y += this.vel.y + Math.sin(perp) * off;
        
        // Homing effect: curve toward nearest asteroid if close
        if (asteroidPool && asteroidPool.activeObjects && asteroidPool.activeObjects.length > 0) {
            let nearest = null;
            let minDist = 99999;
            for (const ast of asteroidPool.activeObjects) {
                if (!ast.active) continue;
                const dx = ast.x - this.x;
                const dy = ast.y - this.y;
                const dist = Math.hypot(dx, dy);
                if (dist < minDist && dist < 120) {
                    minDist = dist;
                    nearest = ast;
                }
            }
            if (nearest) {
                const dx = nearest.x - this.x;
                const dy = nearest.y - this.y;
                const angleToAst = Math.atan2(dy, dx);
                // Interpolate current velocity angle toward target, but clamp max turn
                const curAngle = Math.atan2(this.vel.y, this.vel.x);
                let angleDiff = angleToAst - curAngle;
                // Normalize angleDiff to [-PI, PI]
                angleDiff = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;
                // Clamp to max 30 degrees (PI/6 radians) per frame
                const maxTurn = Math.PI / 6;
                if (angleDiff > maxTurn) angleDiff = maxTurn;
                if (angleDiff < -maxTurn) angleDiff = -maxTurn;
                const newAngle = curAngle + angleDiff * 0.5; // still interpolate, but limited
                const speed = Math.hypot(this.vel.x, this.vel.y);
                this.vel.x = Math.cos(newAngle) * speed;
                this.vel.y = Math.sin(newAngle) * speed;
            }
        }
        
        // Create phantom particles
        if (this.life % 2 === 0) {
            const currentColor = `hsl(${this.life * 5 % 360}, 100%, 50%)`;
            particlePool.get(this.x, this.y, 'phantom', currentColor, this.radius);
        }
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.fillStyle = `hsl(${this.life * 5 % 360}, 100%, 50%)`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.fill();
    }
}