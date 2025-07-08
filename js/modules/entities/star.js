// Star entity with various shapes and behaviors
import { GAME_CONFIG, NORMAL_STAR_COLORS, STAR_SHAPES } from '../constants.js';
import { random, wrap } from '../utils.js';

export class Star {
    constructor() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.active = false;
    }
    
    reset(x, y, burst = false) {
        this.x = x || random(0, this.width);
        this.y = y || random(0, this.height);
        
        const sizeRoll = Math.pow(Math.random(), 6);
        this.z = (1 - sizeRoll) * 4 + 0.5;
        this.radius = this.z;
        this.opacity = 0;
        this.opacityOffset = Math.random() * Math.PI * 2;
        this.twinkleSpeed = random(0.01, 0.05);
        
        this.shape = STAR_SHAPES[Math.floor(Math.random() * STAR_SHAPES.length)];
        this.points = Math.floor(random(4, 7)) * 2;
        this.innerRadiusRatio = random(0.4, 0.8);
        
        this.isBurst = burst;
        this.vel = { x: 0, y: 0 };
        this.active = true;
        
        if (burst) {
            const ang = random(0, 2 * Math.PI);
            const spd = random(2, 5);
            this.vel = { x: Math.cos(ang) * spd, y: Math.sin(ang) * spd };
            this.color = '#00ff7f';
            this.borderColor = '#ffd700';
            this.life = 300;
        } else {
            this.color = NORMAL_STAR_COLORS[Math.floor(Math.random() * NORMAL_STAR_COLORS.length)];
            this.borderColor = NORMAL_STAR_COLORS[Math.floor(Math.random() * NORMAL_STAR_COLORS.length)];
            this.life = -1;
        }
    }
    
    update(shipVel, playerPos) {
        if (!this.active) return;
        
        if (this.isBurst) {
            this.life--;
            if (this.life <= 0) {
                this.active = false;
                return;
            }
            
            this.vel.x *= GAME_CONFIG.STAR_FRIC;
            this.vel.y *= GAME_CONFIG.STAR_FRIC;
            this.x += this.vel.x;
            this.y += this.vel.y;
            
            this.opacity = Math.min(1, this.life / 120);
            
            // Attract to player
            const dx = playerPos.x - this.x;
            const dy = playerPos.y - this.y;
            const dist = Math.hypot(dx, dy);
            
            if (playerPos.active && dist < GAME_CONFIG.BURST_STAR_ATTRACT_DIST) {
                this.x += (dx / dist) * GAME_CONFIG.BURST_STAR_ATTR * this.z;
                this.y += (dy / dist) * GAME_CONFIG.BURST_STAR_ATTR * this.z;
            }
        } else {
            // Normal star behavior
            const dx = playerPos.x - this.x;
            const dy = playerPos.y - this.y;
            const dist = Math.hypot(dx, dy);
            
            if (playerPos.active && dist < 150) {
                this.x += (dx / dist) * GAME_CONFIG.STAR_ATTR * this.z;
                this.y += (dy / dist) * GAME_CONFIG.STAR_ATTR * this.z;
            }
            
            this.opacityOffset += this.twinkleSpeed;
            this.opacity = (Math.sin(this.opacityOffset) + 1) / 2 * 0.9 + 0.1;
        }
        
        // Parallax effect
        this.x -= shipVel.x / (6 - this.z);
        this.y -= shipVel.y / (6 - this.z);
        wrap(this, this.width, this.height);
    }
    
    draw(ctx) {
        if (!this.active) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = this.opacity * (this.z / 5);
        
        if (this.shape === 'point') {
            const borderSize = 1;
            ctx.fillStyle = this.borderColor;
            ctx.fillRect(
                -this.radius / 2 - borderSize,
                -this.radius / 2 - borderSize,
                this.radius + borderSize * 2,
                this.radius + borderSize * 2
            );
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.radius / 2, -this.radius / 2, this.radius, this.radius);
        } else {
            ctx.beginPath();
            
            switch (this.shape) {
                case 'diamond':
                    ctx.moveTo(0, -this.radius);
                    ctx.lineTo(this.radius * 0.7, 0);
                    ctx.lineTo(0, this.radius);
                    ctx.lineTo(-this.radius * 0.7, 0);
                    ctx.closePath();
                    break;
                    
                case 'plus':
                    ctx.moveTo(0, -this.radius);
                    ctx.lineTo(0, this.radius);
                    ctx.moveTo(-this.radius, 0);
                    ctx.lineTo(this.radius, 0);
                    break;
                    
                case 'star4':
                    for (let i = 0; i < 8; i++) {
                        const a = i * Math.PI / 4;
                        const r = i % 2 === 0 ? this.radius : this.radius * 0.4;
                        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                    }
                    ctx.closePath();
                    break;
                    
                case 'star8':
                    for (let i = 0; i < this.points * 2; i++) {
                        const a = i * Math.PI / this.points;
                        const r = i % 2 === 0 ? this.radius : this.innerRadiusRatio;
                        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                    }
                    ctx.closePath();
                    break;
                    
                default:
                    ctx.moveTo(-this.radius, -this.radius);
                    ctx.lineTo(this.radius, this.radius);
                    ctx.moveTo(this.radius, -this.radius);
                    ctx.lineTo(-this.radius, this.radius);
                    break;
            }
            
            ctx.strokeStyle = this.borderColor;
            ctx.lineWidth = 1;
            ctx.stroke();
            
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 0.5 + this.z / 5;
            ctx.stroke();
        }
        
        ctx.restore();
    }
} 