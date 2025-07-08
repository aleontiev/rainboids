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
    
    update(particlePool) {
        if (!this.active) return;
        
        this.life++;
        
        // Add wave motion
        const perp = this.angle + Math.PI / 2;
        const off = Math.sin(this.life * 0.2) * this.waveAmp;
        
        this.x += this.vel.x + Math.cos(perp) * off;
        this.y += this.vel.y + Math.sin(perp) * off;
        
        // Create phantom particles
        if (this.life % 2 === 0) {
            const currentColor = `hsl(${this.life * 5 % 360}, 100%, 50%)`;
            particlePool.get(this.x, this.y, 'phantom', currentColor, this.radius);
        }
        
        // Check bounds
        if (this.x < 0 || this.x > this.width || this.y < 0 || this.y > this.height) {
            this.active = false;
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