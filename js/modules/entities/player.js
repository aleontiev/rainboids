// Player ship entity
import { GAME_CONFIG } from '../constants.js';
import { random, wrap } from '../utils.js';

export class Player {
    constructor() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.isThrusting = false;
        this.active = false;
        this.reset();
    }
    
    reset() {
        this.x = this.width / 2;
        this.y = this.height / 2;
        this.radius = GAME_CONFIG.SHIP_SIZE / 2;
        this.angle = -Math.PI / 2;
        this.vel = { x: 0, y: 0 };
        this.canShoot = true;
        this.active = true;
        this.isThrusting = false;
    }
    
    update(input, particlePool, bulletPool, audioManager) {
        if (!this.active) return;
        
        this.isThrusting = input.up;
        this.angle += GAME_CONFIG.TURN_SPEED * input.rotation;
        
        if (this.isThrusting) {
            this.vel.x += Math.cos(this.angle) * GAME_CONFIG.SHIP_THRUST;
            this.vel.y += Math.sin(this.angle) * GAME_CONFIG.SHIP_THRUST;
            
            // Create thrust particles
            const rear = this.angle + Math.PI;
            const dist = this.radius * 1.2;
            const spread = this.radius * 0.8;
            
            for (let i = 0; i < 4; i++) {
                const p_angle = rear + random(-0.3, 0.3);
                const p_dist = random(0, spread);
                const p_x = this.x + Math.cos(p_angle) * dist + Math.cos(p_angle + Math.PI/2) * p_dist;
                const p_y = this.y + Math.sin(p_angle) * dist + Math.sin(p_angle + Math.PI/2) * p_dist;
                particlePool.get(p_x, p_y, 'thrust', rear);
            }
        } else if (input.down) {
            this.vel.x *= GAME_CONFIG.SHIP_FRICTION * 0.95;
            this.vel.y *= GAME_CONFIG.SHIP_FRICTION * 0.95;
        } else {
            this.vel.x *= GAME_CONFIG.SHIP_FRICTION;
            this.vel.y *= GAME_CONFIG.SHIP_FRICTION;
        }
        
        if (this.isThrusting) {
            audioManager.playThruster();
        }
        
        // Limit velocity
        const mag = Math.hypot(this.vel.x, this.vel.y);
        if (mag > GAME_CONFIG.MAX_V) {
            this.vel.x = (this.vel.x / mag) * GAME_CONFIG.MAX_V;
            this.vel.y = (this.vel.y / mag) * GAME_CONFIG.MAX_V;
        }
        
        this.x += this.vel.x;
        this.y += this.vel.y;
        wrap(this, this.width, this.height);
        
        // Handle shooting
        if (input.space && this.canShoot) {
            audioManager.playShoot();
            bulletPool.get(this.x, this.y, this.angle);
            this.canShoot = false;
            setTimeout(() => this.canShoot = true, 200);
        }
    }
    
    draw(ctx) {
        if (!this.active) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI / 2);
        
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#0ff';
        ctx.shadowBlur = 15;
        ctx.globalCompositeOperation = 'lighter';
        
        const r = this.radius;
        const w = 1.15;
        
        // Draw ship body
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.96 * w, r * 0.9);
        ctx.lineTo(r * 0.6 * w, r * 0.9);
        ctx.lineTo(0, -r * 0.1);
        ctx.closePath();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(-r * 0.96 * w, r * 0.9);
        ctx.lineTo(-r * 0.6 * w, r * 0.9);
        ctx.lineTo(0, -r * 0.1);
        ctx.closePath();
        ctx.stroke();
        
        ctx.restore();
    }
    
    die(particlePool, audioManager, uiManager, game) {
        this.active = false;
        game.state = 'GAME_OVER';
        
        audioManager.playPlayerExplosion();
        particlePool.get(this.x, this.y, 'playerExplosion');
        
        // Show game over message
        const isMobile = window.matchMedia("(any-pointer: coarse)").matches;
        const restartPrompt = isMobile ? "Tap Screen to Restart" : "Press Enter to Restart";
        const subtitle = `YOUR SCORE: ${game.score}\nHIGH SCORE: ${game.highScore}\n\n${restartPrompt}`;
        uiManager.showMessage('GAME OVER', subtitle);
    }
} 