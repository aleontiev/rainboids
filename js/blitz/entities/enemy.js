// Enemy entities for Rainboids: Blitz
import { GAME_CONFIG, COLORS, ENEMY_TYPES } from '../constants.js';

export class Enemy {
    constructor(x, y, type, isPortrait) {
        this.x = x;
        this.y = y;
        this.type = type || ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
        this.size = GAME_CONFIG.ENEMY_SIZE;
        this.speed = GAME_CONFIG.ENEMY_SPEED;
        this.angle = isPortrait ? Math.PI / 2 : Math.PI; // Face down or left
        this.health = 1;
        this.shootCooldown = 0;
        this.time = 0;
        this.amplitude = 50;
        this.frequency = 0.02;
        this.initialX = x;
        this.initialY = y;
        this.pulseRadius = 0;
        this.pulseTime = 0;
        this.lastShot = 0;
        this.isPortrait = isPortrait;
        
        // Type-specific initialization
        switch(this.type) {
            case 'sine':
                this.amplitude = 30 + Math.random() * 40;
                this.frequency = 0.01 + Math.random() * 0.02;
                break;
            case 'zigzag':
                this.zigzagDirection = 1;
                this.zigzagTimer = 0;
                break;
            case 'circle':
                this.centerX = x;
                this.centerY = y;
                this.radius = 40 + Math.random() * 30;
                this.angularSpeed = 0.02 + Math.random() * 0.02;
                break;
            case 'dive':
                this.phase = 'approach';
                this.targetX = 0;
                this.targetY = 0;
                this.diveSpeed = 0;
                break;
            case 'laser':
                this.laserChargeTime = 0;
                this.laserFiring = false;
                this.laserBeam = null;
                break;
            case 'pulse':
                this.pulseInterval = 120 + Math.random() * 60;
                this.pulseTimer = 0;
                break;
        }
    }
    
    update(playerX, playerY, bullets, lasers, pulseCircles) {
        this.time++;
        
        if (this.isPortrait) {
            // Portrait mode movement
            switch(this.type) {
                case 'straight':
                    this.y += this.speed;
                    break;
                case 'sine':
                    this.y += this.speed;
                    this.x = this.initialX + Math.sin(this.time * this.frequency) * this.amplitude;
                    break;
                case 'zigzag':
                    this.y += this.speed;
                    this.zigzagTimer++;
                    if (this.zigzagTimer > 30) {
                        this.zigzagDirection *= -1;
                        this.zigzagTimer = 0;
                    }
                    this.x += this.zigzagDirection * 2;
                    break;
                case 'circle':
                    this.y += this.speed * 0.5;
                    this.centerY += this.speed * 0.5;
                    const angle = this.time * this.angularSpeed;
                    this.x = this.centerX + Math.cos(angle) * this.radius;
                    this.y = this.centerY + Math.sin(angle) * this.radius;
                    break;
                case 'dive':
                    if (this.phase === 'approach') {
                        this.y += this.speed;
                        if (this.y > window.innerHeight * 0.3) {
                            this.phase = 'target';
                            this.targetX = playerX;
                            this.targetY = playerY;
                        }
                    } else if (this.phase === 'target') {
                        const dx = this.targetX - this.x;
                        const dy = this.targetY - this.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 5) {
                            this.diveSpeed = Math.min(this.diveSpeed + 0.2, 6);
                            this.x += (dx / dist) * this.diveSpeed;
                            this.y += (dy / dist) * this.diveSpeed;
                            this.angle = Math.atan2(dy, dx);
                        }
                    }
                    break;
                case 'laser':
                    this.y += this.speed * 0.8;
                    this.laserChargeTime++;
                    if (this.laserChargeTime > 90 && !this.laserFiring) {
                        this.laserFiring = true;
                        this.laserChargeTime = 0;
                        // Create laser beam
                        lasers.push(new Laser(this.x, this.y, Math.atan2(playerY - this.y, playerX - this.x)));
                    }
                    if (this.laserFiring) {
                        this.laserChargeTime++;
                        if (this.laserChargeTime > 60) {
                            this.laserFiring = false;
                            this.laserChargeTime = 0;
                        }
                    }
                    break;
                case 'pulse':
                    this.y += this.speed * 0.6;
                    this.pulseTimer++;
                    if (this.pulseTimer > this.pulseInterval) {
                        this.pulseTimer = 0;
                        pulseCircles.push(new PulseCircle(this.x, this.y));
                    }
                    break;
            }
        } else {
            // Update based on type
            switch(this.type) {
                case 'straight':
                    this.x -= this.speed;
                    break;
                    
                case 'sine':
                    this.x -= this.speed;
                    this.y = this.initialY + Math.sin(this.time * this.frequency) * this.amplitude;
                    break;
                    
                case 'zigzag':
                    this.x -= this.speed;
                    this.zigzagTimer++;
                    if (this.zigzagTimer > 30) {
                        this.zigzagDirection *= -1;
                        this.zigzagTimer = 0;
                    }
                    this.y += this.zigzagDirection * 2;
                    break;
                    
                case 'circle':
                    this.x -= this.speed * 0.5;
                    this.centerX -= this.speed * 0.5;
                    const angle = this.time * this.angularSpeed;
                    this.x = this.centerX + Math.cos(angle) * this.radius;
                    this.y = this.centerY + Math.sin(angle) * this.radius;
                    break;
                    
                case 'dive':
                    if (this.phase === 'approach') {
                        this.x -= this.speed;
                        if (this.x < window.innerWidth * 0.7) {
                            this.phase = 'target';
                            this.targetX = playerX;
                            this.targetY = playerY;
                        }
                    } else if (this.phase === 'target') {
                        const dx = this.targetX - this.x;
                        const dy = this.targetY - this.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 5) {
                            this.diveSpeed = Math.min(this.diveSpeed + 0.2, 6);
                            this.x += (dx / dist) * this.diveSpeed;
                            this.y += (dy / dist) * this.diveSpeed;
                            this.angle = Math.atan2(dy, dx);
                        }
                    }
                    break;
                    
                case 'laser':
                    this.x -= this.speed * 0.8;
                    this.laserChargeTime++;
                    if (this.laserChargeTime > 90 && !this.laserFiring) {
                        this.laserFiring = true;
                        this.laserChargeTime = 0;
                        // Create laser beam
                        lasers.push(new Laser(this.x, this.y, Math.atan2(playerY - this.y, playerX - this.x)));
                    }
                    if (this.laserFiring) {
                        this.laserChargeTime++;
                        if (this.laserChargeTime > 60) {
                            this.laserFiring = false;
                            this.laserChargeTime = 0;
                        }
                    }
                    break;
                    
                case 'pulse':
                    this.x -= this.speed * 0.6;
                    this.pulseTimer++;
                    if (this.pulseTimer > this.pulseInterval) {
                        this.pulseTimer = 0;
                        pulseCircles.push(new PulseCircle(this.x, this.y));
                    }
                    break;
            }
        }
        
        // Remove if off screen
        if (this.isPortrait) {
            return this.y < window.innerHeight + 50;
        } else {
            return this.x > -50;
        }
    }

    shoot(bullets, player) {
        if (['straight', 'sine', 'zigzag'].includes(this.type)) {
            this.shootCooldown++;
            if (this.shootCooldown > 60 + Math.random() * 60) {
                this.shootCooldown = 0;
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                bullets.push(new Bullet(this.x, this.y, angle, this.type));
            }
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Get color based on type
        const color = COLORS.ENEMY_COLORS[this.type] || '#ff6666';
        
        // Draw based on type
        switch(this.type) {
            case 'laser':
                // Draw charging effect
                if (this.laserChargeTime > 0 && !this.laserFiring) {
                    const charge = this.laserChargeTime / 90;
                    ctx.strokeStyle = `rgba(255, 0, 0, ${charge})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size * (1 + charge * 0.5), 0, Math.PI * 2);
                    ctx.stroke();
                }
                break;
                
            case 'pulse':
                // Draw pulse indicator
                if (this.pulseTimer > this.pulseInterval - 30) {
                    const pulse = (this.pulseTimer - (this.pulseInterval - 30)) / 30;
                    ctx.strokeStyle = `rgba(255, 153, 153, ${1 - pulse})`;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size * (1 + pulse * 2), 0, Math.PI * 2);
                    ctx.stroke();
                }
                break;
        }
        
        // Draw main ship body
        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        
        // Draw ship shape (triangle pointing left)
        ctx.beginPath();
        ctx.moveTo(this.size, 0);
        ctx.lineTo(-this.size * 0.8, -this.size * 0.6);
        ctx.lineTo(-this.size * 0.5, 0);
        ctx.lineTo(-this.size * 0.8, this.size * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw engine glow
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(-this.size * 0.5, 0, this.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

export class Bullet {
    constructor(x, y, angle, size, color, isPortrait) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = GAME_CONFIG.BULLET_SPEED;
        this.size = size;
        this.color = color;
        this.life = 300;
        this.isPortrait = isPortrait;
    }
    
    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.life--;
        
        // Remove if off screen or life expired
        if (this.isPortrait) {
            return this.y > -50 && this.y < window.innerHeight + 50 && this.life > 0;
        } else {
            return this.x > -50 && this.x < window.innerWidth + 50 && this.life > 0;
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

export class Laser {
    constructor(x, y, angle, speed, color) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.color = color;
        this.width = 5;
        this.life = 20;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.life--;
        return this.life > 0;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        if (this.color === 'rainbow') {
            const gradient = ctx.createLinearGradient(-100, 0, 100, 0);
            gradient.addColorStop(0, 'red');
            gradient.addColorStop(1 / 6, 'orange');
            gradient.addColorStop(2 / 6, 'yellow');
            gradient.addColorStop(3 / 6, 'green');
            gradient.addColorStop(4 / 6, 'blue');
            gradient.addColorStop(5 / 6, 'indigo');
            gradient.addColorStop(1, 'violet');
            ctx.strokeStyle = gradient;
        } else {
            ctx.strokeStyle = this.color;
        }
        ctx.lineWidth = this.width;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(100, 0);
        ctx.stroke();
        ctx.restore();
    }
}

export class PulseCircle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.maxRadius = 100;
        this.life = 120;
        this.maxLife = 120;
        this.speed = 2;
    }
    
    update() {
        this.radius += this.speed;
        this.life--;
        
        if (this.radius > this.maxRadius) {
            this.radius = this.maxRadius;
        }
        
        return this.life > 0;
    }
    
    render(ctx) {
        const alpha = this.life / this.maxLife;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#ff9999';
        ctx.lineWidth = 4;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
}

export class HomingMissile {
    constructor(x, y, angle, speed, color) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.color = color;
        this.size = 10;
        this.turnSpeed = 0.05;
        this.life = 200;
        this.target = null;
    }

    update(enemies) {
        if (!this.target || !enemies.includes(this.target)) {
            let closestEnemy = null;
            let closestDist = Infinity;
            for (const enemy of enemies) {
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestEnemy = enemy;
                }
            }
            this.target = closestEnemy;
        }

        if (this.target) {
            const targetAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
            let angleDiff = targetAngle - this.angle;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            if (Math.abs(angleDiff) < this.turnSpeed) {
                this.angle = targetAngle;
            } else {
                this.angle += Math.sign(angleDiff) * this.turnSpeed;
            }
        }

        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.life--;
        return this.life > 0;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.size, 0);
        ctx.lineTo(-this.size / 2, -this.size / 2);
        ctx.lineTo(-this.size / 2, this.size / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}