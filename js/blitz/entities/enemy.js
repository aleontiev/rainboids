// Enemy entities for Rainboids: Blitz
import { GAME_CONFIG, COLORS, ENEMY_TYPES } from '../constants.js';

export class Enemy {
    constructor(x, y, type, isPortrait, speed = GAME_CONFIG.ENEMY_SPEED) {
        this.x = x;
        this.y = y;
        this.type = type || ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
        this.size = GAME_CONFIG.ENEMY_SIZE;
        this.speed = speed; // Use passed speed or default
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
                this.pulseInterval = 240 + Math.random() * 120;
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
                
                // Choose a random warm color
                const warmColors = ['#ff4500', '#ffa500', '#ffd700']; // OrangeRed, Orange, Gold
                const randomColor = warmColors[Math.floor(Math.random() * warmColors.length)];
                
                bullets.push(new Bullet(this.x, this.y, angle, 6, randomColor, this.isPortrait)); // Size 6, random warm color
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
        
        this.drawShip(ctx, color);
        
        ctx.restore();
    }

    drawShip(ctx, color) {
        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        switch (this.type) {
            case 'straight':
                // Fighter - sleek triangular fighter with wings
                ctx.beginPath();
                ctx.moveTo(this.size, 0);
                ctx.lineTo(-this.size * 0.6, -this.size * 0.4);
                ctx.lineTo(-this.size * 0.8, -this.size * 0.7);
                ctx.lineTo(-this.size * 0.9, -this.size * 0.7);
                ctx.lineTo(-this.size * 0.4, -this.size * 0.2);
                ctx.lineTo(-this.size * 0.4, 0);
                ctx.lineTo(-this.size * 0.4, this.size * 0.2);
                ctx.lineTo(-this.size * 0.9, this.size * 0.7);
                ctx.lineTo(-this.size * 0.8, this.size * 0.7);
                ctx.lineTo(-this.size * 0.6, this.size * 0.4);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                
                // Cockpit detail
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(this.size * 0.3, 0, this.size * 0.15, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'sine':
                // Interceptor - diamond-shaped with side fins
                ctx.beginPath();
                ctx.moveTo(this.size * 0.8, 0);
                ctx.lineTo(this.size * 0.2, -this.size * 0.8);
                ctx.lineTo(-this.size * 0.2, -this.size * 0.5);
                ctx.lineTo(-this.size * 0.8, -this.size * 0.3);
                ctx.lineTo(-this.size * 0.8, this.size * 0.3);
                ctx.lineTo(-this.size * 0.2, this.size * 0.5);
                ctx.lineTo(this.size * 0.2, this.size * 0.8);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                
                // Wing stripes
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(this.size * 0.1, -this.size * 0.4);
                ctx.lineTo(-this.size * 0.1, -this.size * 0.2);
                ctx.moveTo(this.size * 0.1, this.size * 0.4);
                ctx.lineTo(-this.size * 0.1, this.size * 0.2);
                ctx.stroke();
                break;
                
            case 'zigzag':
                // Assault Ship - angular predator design
                ctx.beginPath();
                ctx.moveTo(this.size, 0);
                ctx.lineTo(this.size * 0.3, -this.size * 0.5);
                ctx.lineTo(-this.size * 0.2, -this.size * 0.9);
                ctx.lineTo(-this.size * 0.6, -this.size * 0.6);
                ctx.lineTo(-this.size * 0.9, -this.size * 0.2);
                ctx.lineTo(-this.size * 0.5, 0);
                ctx.lineTo(-this.size * 0.9, this.size * 0.2);
                ctx.lineTo(-this.size * 0.6, this.size * 0.6);
                ctx.lineTo(-this.size * 0.2, this.size * 0.9);
                ctx.lineTo(this.size * 0.3, this.size * 0.5);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                
                // Weapon ports
                ctx.fillStyle = '#ff4444';
                ctx.beginPath();
                ctx.arc(this.size * 0.1, -this.size * 0.3, this.size * 0.1, 0, Math.PI * 2);
                ctx.arc(this.size * 0.1, this.size * 0.3, this.size * 0.1, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'circle':
                // Orbital Ship - circular main body with rotating elements
                ctx.beginPath();
                ctx.arc(0, 0, this.size * 0.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                // Rotating orbital rings
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, this.size * 0.9, 0, Math.PI * 2);
                ctx.stroke();
                
                // Directional thrusters
                const thrusterAngle = this.frameCount * 0.1;
                for (let i = 0; i < 3; i++) {
                    const angle = (i * Math.PI * 2 / 3) + thrusterAngle;
                    const x = Math.cos(angle) * this.size * 0.9;
                    const y = Math.sin(angle) * this.size * 0.9;
                    ctx.fillStyle = '#00ddff';
                    ctx.beginPath();
                    ctx.arc(x, y, this.size * 0.15, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
                
            case 'dive':
                // Bomber - heavy triangular craft with bomb bay
                ctx.beginPath();
                ctx.moveTo(this.size * 0.2, this.size * 0.8);
                ctx.lineTo(-this.size * 0.9, -this.size * 0.3);
                ctx.lineTo(-this.size * 0.5, -this.size * 0.6);
                ctx.lineTo(this.size * 0.8, -this.size * 0.6);
                ctx.lineTo(this.size * 0.9, -this.size * 0.3);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                
                // Bomb bay doors
                ctx.fillStyle = '#444444';
                ctx.beginPath();
                ctx.rect(-this.size * 0.3, this.size * 0.1, this.size * 0.6, this.size * 0.4);
                ctx.fill();
                ctx.stroke();
                
                // Wing details
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-this.size * 0.6, -this.size * 0.1);
                ctx.lineTo(-this.size * 0.3, -this.size * 0.3);
                ctx.moveTo(this.size * 0.6, -this.size * 0.1);
                ctx.lineTo(this.size * 0.3, -this.size * 0.3);
                ctx.stroke();
                break;
                
            case 'laser':
                // Battleship - elongated heavy cruiser
                ctx.beginPath();
                ctx.rect(-this.size * 0.9, -this.size * 0.3, this.size * 1.8, this.size * 0.6);
                ctx.fill();
                ctx.stroke();
                
                // Command bridge
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.rect(-this.size * 0.2, -this.size * 0.5, this.size * 0.6, this.size * 1.0);
                ctx.fill();
                ctx.stroke();
                
                // Main cannon
                ctx.fillStyle = '#ff4444';
                ctx.beginPath();
                ctx.rect(this.size * 0.9, -this.size * 0.1, this.size * 0.4, this.size * 0.2);
                ctx.fill();
                ctx.stroke();
                
                // Hull details
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-this.size * 0.7, -this.size * 0.2);
                ctx.lineTo(this.size * 0.7, -this.size * 0.2);
                ctx.moveTo(-this.size * 0.7, this.size * 0.2);
                ctx.lineTo(this.size * 0.7, this.size * 0.2);
                ctx.stroke();
                break;
                
            case 'pulse':
                // Destroyer - square main body with weapon arrays
                ctx.beginPath();
                ctx.rect(-this.size * 0.4, -this.size * 0.4, this.size * 0.8, this.size * 0.8);
                ctx.fill();
                ctx.stroke();
                
                // Weapon arrays on corners
                ctx.fillStyle = '#ffaa00';
                const weaponSize = this.size * 0.25;
                ctx.beginPath();
                ctx.rect(-this.size * 0.7, -this.size * 0.7, weaponSize, weaponSize);
                ctx.rect(this.size * 0.45, -this.size * 0.7, weaponSize, weaponSize);
                ctx.rect(-this.size * 0.7, this.size * 0.45, weaponSize, weaponSize);
                ctx.rect(this.size * 0.45, this.size * 0.45, weaponSize, weaponSize);
                ctx.fill();
                ctx.stroke();
                
                // Central power core
                ctx.fillStyle = '#00ff88';
                ctx.beginPath();
                ctx.arc(0, 0, this.size * 0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                // Pulse indicator
                if (this.pulseCharge > 0.5) {
                    ctx.strokeStyle = '#00ff88';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size * 0.3 + (this.pulseCharge * this.size * 0.3), 0, Math.PI * 2);
                    ctx.stroke();
                }
                break;
        }

        // Draw engine glow (common to all, but varied by ship type)
        ctx.fillStyle = '#ffaa00';
        switch (this.type) {
            case 'straight':
                // Twin engines
                ctx.beginPath();
                ctx.arc(-this.size * 0.6, -this.size * 0.3, this.size * 0.2, 0, Math.PI * 2);
                ctx.arc(-this.size * 0.6, this.size * 0.3, this.size * 0.2, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'laser':
                // Multiple engine ports
                ctx.beginPath();
                ctx.arc(-this.size * 0.9, -this.size * 0.15, this.size * 0.15, 0, Math.PI * 2);
                ctx.arc(-this.size * 0.9, this.size * 0.15, this.size * 0.15, 0, Math.PI * 2);
                ctx.arc(-this.size * 0.9, 0, this.size * 0.1, 0, Math.PI * 2);
                ctx.fill();
                break;
            default:
                // Single main engine
                ctx.beginPath();
                ctx.arc(-this.size * 0.6, 0, this.size * 0.25, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
    }
}

export class MiniBoss {
    constructor(x, y, type, isPortrait, canvasWidth = 800) {
        this.x = x;
        this.y = y;
        this.type = type; // 'alpha' or 'beta'
        this.isPortrait = isPortrait;
        this.size = 90; // Much larger than regular enemies (was 60)
        this.speed = 0.5; // Slower movement (was 1)
        this.maxHealth = 1800; // 18x more health than regular enemies (6x from 300)
        this.health = this.maxHealth;
        this.frameCount = 0;
        this.angle = isPortrait ? Math.PI / 2 : 0; // Add this line for rotation
        
        // Movement pattern
        this.movePattern = 'entering'; // Start with entering phase
        this.patrolDirection = 1;
        this.patrolRange = 150; // Reduced range for slower movement
        this.startY = y;
        this.startX = x;
        this.targetY = isPortrait ? 150 : y; // In portrait, move to 150px from top
        this.targetX = isPortrait ? x : canvasWidth - 150; // In landscape, move to 150px from right
        
        // Weapons
        this.primaryWeaponTimer = 0;
        this.secondaryWeaponTimer = 0;
        this.primaryWeaponCooldown = 45; // 0.75 seconds at 60fps (2x faster)
        this.secondaryWeaponCooldown = 120; // 2 seconds at 60fps (2x faster)
        
        // Visual effects
        this.hitFlash = 0;
        this.chargingSecondary = 0;
        this.playerRef = null; // To store player reference for aiming
        this.diveSpawnTimer = 0;
        this.diveSpawnCooldown = 300; // 5 seconds cooldown for spawning divers
    }
    
    update(playerX, playerY) {
        this.frameCount++;
        
        // Movement logic
        if (this.movePattern === 'entering') {
            // Move to target position
            if (this.isPortrait) {
                // Portrait: move down from top
                if (this.y < this.targetY) {
                    this.y += this.speed;
                } else {
                    this.movePattern = 'patrol';
                    this.startY = this.y;
                    this.startX = this.x;
                }
            } else {
                // Landscape: move left from right
                if (this.x > this.targetX) {
                    this.x -= this.speed;
                } else {
                    this.movePattern = 'patrol';
                    this.startY = this.y;
                    this.startX = this.x;
                }
            }
        } else if (this.movePattern === 'patrol') {
            // Patrol movement
            if (this.isPortrait) {
                this.x += this.patrolDirection * this.speed;
                if (Math.abs(this.x - this.startX) > this.patrolRange) {
                    this.patrolDirection *= -1;
                }
            } else {
                this.y += this.patrolDirection * this.speed;
                if (Math.abs(this.y - this.startY) > this.patrolRange) {
                    this.patrolDirection *= -1;
                }
            }
        }
        
        // Weapon timers
        this.primaryWeaponTimer++;
        this.secondaryWeaponTimer++;
        this.diveSpawnTimer++; // Increment dive spawn timer
        
        // Reduce hit flash
        if (this.hitFlash > 0) {
            this.hitFlash--;
        }
        
        // Secondary weapon charging effect
        if (this.secondaryWeaponTimer > this.secondaryWeaponCooldown - 60) {
            this.chargingSecondary = Math.min(this.chargingSecondary + 0.1, 1);
        } else {
            this.chargingSecondary = 0;
        }

        // Spawn dive enemy periodically
        if (this.canFireDiveEnemy()) {
            // This will be handled in BlitzGame.update()
            // We just reset the timer here
            this.diveSpawnTimer = 0;
        }
    }
    
    takeDamage(damage) {
        this.health -= damage;
        this.hitFlash = 10;
        if (this.health <= 0) {
            return 'destroyed';
        }
        return 'damaged';
    }
    
    canFirePrimary() {
        return this.primaryWeaponTimer >= this.primaryWeaponCooldown;
    }
    
    canFireSecondary() {
        return this.secondaryWeaponTimer >= this.secondaryWeaponCooldown;
    }
    
    firePrimary(playerX, playerY) { // Added playerX, playerY
        this.primaryWeaponTimer = 0;
        const angleToPlayer = Math.atan2(playerY - this.y, playerX - this.x); // Calculate angle to player
        const bulletSpeed = 5; // Adjust as needed
        // Return bullet data for the main game to create
        return {
            x: this.x, // Fire from center of miniboss
            y: this.y, // Fire from center of miniboss
            vx: Math.cos(angleToPlayer) * bulletSpeed, // Aim at player
            vy: Math.sin(angleToPlayer) * bulletSpeed, // Aim at player
            size: 8, // Larger size
            color: '#ff0000', // Red color
            type: 'miniBossPrimary'
        };
    }
    
    fireSecondary(playerX, playerY) { // Added playerX, playerY
        this.secondaryWeaponTimer = 0;
        this.chargingSecondary = 0;
        const bullets = [];
        const angleToPlayer = Math.atan2(playerY - this.y, playerX - this.x); // Calculate angle to player
        const bulletSpeed = 4; // Slightly slower for spread
        const spreadAngle = 0.3; // Angle between bullets in spread

        for (let i = -2; i <= 2; i++) {
            const angle = angleToPlayer + i * spreadAngle; // Spread around player angle
            bullets.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * bulletSpeed,
                vy: Math.sin(angle) * bulletSpeed,
                size: 8, // Larger size
                color: '#ff0000', // Red color
                type: 'miniBossSecondary'
            });
        }
        return bullets;
    }

    canFireDiveEnemy() {
        return this.diveSpawnTimer >= this.diveSpawnCooldown;
    }
    
    fireDiveEnemy(playerX, playerY) {
        this.diveSpawnTimer = 0;
        // Spawn a faster dive enemy
        const fasterDiveSpeed = 3; // Adjust as needed
        return {
            x: this.x,
            y: this.y,
            type: 'dive',
            isPortrait: this.isPortrait,
            speed: fasterDiveSpeed,
            targetX: playerX, // Pass player's current position as target
            targetY: playerY
        };
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle); // Add this line for rotation
        
        // Hit flash effect
        if (this.hitFlash > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(0, 0, this.size + 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        // Draw mini-boss ship based on type
        if (this.type === 'alpha') {
            this.drawAlphaShip(ctx);
        } else {
            this.drawBetaShip(ctx);
        }
        
        // Draw health bar
        this.drawHealthBar(ctx);
        
        // Secondary weapon charging effect
        if (this.chargingSecondary > 0 && this.size > 0) {
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 3;
            ctx.globalAlpha = this.chargingSecondary;
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(1, this.size + 10), 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        
        ctx.restore();
    }
    
    drawAlphaShip(ctx) {
        // Alpha mini-boss - Heavy Cruiser design
        ctx.fillStyle = '#ff4444';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        
        // Main hull
        ctx.beginPath();
        ctx.rect(-this.size * 0.8, -this.size * 0.3, this.size * 1.6, this.size * 0.6);
        ctx.fill();
        ctx.stroke();
        
        // Command tower
        ctx.fillStyle = '#ffaaaa';
        ctx.beginPath();
        ctx.rect(-this.size * 0.2, -this.size * 0.5, this.size * 0.6, this.size * 1.0);
        ctx.fill();
        ctx.stroke();
        
        // Weapon arrays
        ctx.fillStyle = '#ff6666';
        ctx.beginPath();
        ctx.rect(this.size * 0.5, -this.size * 0.4, this.size * 0.3, this.size * 0.2);
        ctx.rect(this.size * 0.5, this.size * 0.2, this.size * 0.3, this.size * 0.2);
        ctx.fill();
        ctx.stroke();
        
        // Engine glow
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(-this.size * 0.8, -this.size * 0.15, this.size * 0.1, 0, Math.PI * 2);
        ctx.arc(-this.size * 0.8, this.size * 0.15, this.size * 0.1, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawBetaShip(ctx) {
        // Beta mini-boss - Carrier design
        ctx.fillStyle = '#4444ff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        
        // Main hull - elongated
        ctx.beginPath();
        ctx.rect(-this.size * 0.9, -this.size * 0.25, this.size * 1.8, this.size * 0.5);
        ctx.fill();
        ctx.stroke();
        
        // Flight deck
        ctx.fillStyle = '#6666ff';
        ctx.beginPath();
        ctx.rect(-this.size * 0.7, -this.size * 0.4, this.size * 1.4, this.size * 0.15);
        ctx.rect(-this.size * 0.7, this.size * 0.25, this.size * 1.4, this.size * 0.15);
        ctx.fill();
        ctx.stroke();
        
        // Hangar bays
        ctx.fillStyle = '#222222';
        ctx.beginPath();
        ctx.rect(-this.size * 0.1, -this.size * 0.35, this.size * 0.4, this.size * 0.1);
        ctx.rect(-this.size * 0.1, this.size * 0.25, this.size * 0.4, this.size * 0.1);
        ctx.fill();
        
        // Engine array
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(-this.size * 0.9, -this.size * 0.1, this.size * 0.08, 0, Math.PI * 2);
        ctx.arc(-this.size * 0.9, 0, this.size * 0.08, 0, Math.PI * 2);
        ctx.arc(-this.size * 0.9, this.size * 0.1, this.size * 0.08, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawHealthBar(ctx) {
        const barWidth = this.size * 1.8; // Slightly wider for larger mini-bosses
        const barHeight = 8; // Slightly taller for better visibility
        const barY = -this.size - 20; // Further from the ship
        
        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);
        
        // Health bar
        const healthPercent = Math.max(0, this.health / this.maxHealth);
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
        const healthBarWidth = Math.max(0, barWidth * healthPercent);
        ctx.fillRect(-barWidth / 2, barY, healthBarWidth, barHeight);
        
        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight);
    }
}

export class Asteroid {
    constructor(x, y, type, isPortrait, size, speed, initialVx = null, initialVy = null) {
        this.x = x;
        this.y = y;
        this.type = type; // 'large', 'medium', 'small'
        this.isPortrait = isPortrait;
        this.size = size;
        this.speed = speed;
        this.health = Math.floor(size / 10);
        
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
            if (this.type === 'large') {
                return 'medium';
            } else if (this.type === 'medium') {
                return 'small';
            } else {
                return 'destroyed'; // Indicates final destruction
            }
        }
        return null; // Not destroyed yet
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.rotationSpeed;
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        
        // Draw based on size/type
        if (this.type === 'small') {
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else {
            // Draw using pre-generated vertices
            ctx.beginPath();
            this.vertices.forEach((vertex, i) => {
                if (i === 0) {
                    ctx.moveTo(vertex.x, vertex.y);
                } else {
                    ctx.lineTo(vertex.x, vertex.y);
                }
            });
            ctx.closePath();
            ctx.stroke();
            
            // Draw interior lines for detail
            this.interiorLines.forEach(line => {
                ctx.beginPath();
                ctx.moveTo(line.start.x, line.start.y);
                ctx.lineTo(line.end.x, line.end.y);
                ctx.stroke();
            });
        }
        
        ctx.restore();
    }
}

export class Bullet {
    constructor(x, y, angle, size, color, isPortrait, speed = GAME_CONFIG.BULLET_SPEED) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed; // Use passed speed or default
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
        // Safety check to prevent negative radius errors
        if (this.size <= 0) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.max(1, this.size), Math.max(0.4, this.size * 0.4), 0, 0, Math.PI * 2);
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
        this.speed = speed || 50; // Use passed speed or default to 50
        this.color = color;
        this.width = 20; // Thicker laser
        this.life = 60; // Longer life (1 second)
        this.colorIndex = 0;
        this.rainbowColors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#4400ff', '#ff00ff'];
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.life--;

        if (this.color === 'rainbow') {
            this.colorIndex = Math.floor(Math.random() * this.rainbowColors.length);
        }

        return this.life > 0;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Draw glow effect
        if (this.color === 'rainbow') {
            ctx.globalAlpha = 0.4; // Slightly more opaque glow
            const glowGradient = ctx.createLinearGradient(0, -this.width * 1.5, 0, this.width * 1.5);
            glowGradient.addColorStop(0, 'red');
            glowGradient.addColorStop(1 / 6, 'orange');
            glowGradient.addColorStop(2 / 6, 'yellow');
            glowGradient.addColorStop(3 / 6, 'green');
            glowGradient.addColorStop(4 / 6, 'blue');
            glowGradient.addColorStop(5 / 6, 'indigo');
            glowGradient.addColorStop(1, 'violet');
            ctx.strokeStyle = glowGradient;
            ctx.lineWidth = this.width * 1.5; // Wider glow
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(200, 0);
            ctx.stroke();
        }

        ctx.globalAlpha = 1; // Reset alpha for the main laser
        if (this.color === 'rainbow') {
            ctx.strokeStyle = this.rainbowColors[this.colorIndex];
        } else {
            ctx.strokeStyle = this.color;
        }
        ctx.lineWidth = this.width;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(200, 0); // Make it longer
        ctx.stroke();
        ctx.restore();
    }
}

export class PulseCircle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.maxRadius = 300; // 1.5x larger
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
        // Safety check to prevent negative radius errors
        if (this.radius <= 0) return;
        
        const alpha = this.life / this.maxLife;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#ff9999';
        ctx.lineWidth = 4;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(1, this.radius), 0, Math.PI * 2);
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
        // Safety check to prevent negative size errors
        if (this.size <= 0) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(Math.max(1, this.size), 0);
        ctx.lineTo(-Math.max(0.5, this.size / 2), -Math.max(0.5, this.size / 2));
        ctx.lineTo(-Math.max(0.5, this.size / 2), Math.max(0.5, this.size / 2));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

export class Level1Boss {
    constructor(x, y, isPortrait, canvasWidth, canvasHeight) {
        this.x = x;
        this.y = y;
        this.isPortrait = isPortrait;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.size = 120; // Very large boss
        this.maxHealth = 2000; // Very high health
        this.health = this.maxHealth;
        this.frameCount = 0;
        
        // Movement
        this.movePattern = 'entering';
        this.targetX = isPortrait ? canvasWidth / 2 : canvasWidth - 200;
        this.targetY = isPortrait ? 200 : canvasHeight / 2;
        this.speed = 1;
        this.patrolDirection = 1;
        this.patrolRange = 150;
        this.startX = this.targetX;
        this.startY = this.targetY;
        
        // Attack phases
        this.phase = 1; // Phase 1-4, different attack patterns
        this.phaseTimer = 0;
        this.phaseDuration = 600; // 10 seconds per phase
        
        // Weapons
        this.primaryWeaponTimer = 0;
        this.secondaryWeaponTimer = 0;
        this.specialWeaponTimer = 0;
        this.spiralWeaponTimer = 0; // New timer for spiral attack
        this.primaryCooldown = 30; // Rapid fire
        this.secondaryCooldown = 120; // 2 seconds
        this.specialCooldown = 300; // 5 seconds
        this.spiralWeaponCooldown = 180; // 3 seconds for spiral attack
        this.laserSpeed = 5; // Speed for slow lasers
        
        // Visual effects
        this.hitFlash = 0;
        this.angle = 0;
        this.rotationSpeed = 0.02;
        
        // Death sequence
        this.isDefeated = false;
        this.deathTimer = 0;
        this.explosionTimer = 0;
    }
    
    update() {
        this.frameCount++;
        this.angle += this.rotationSpeed;
        
        if (this.isDefeated) {
            this.deathTimer++;
            return;
        }
        
        // Movement logic
        if (this.movePattern === 'entering') {
            // Move to target position
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) {
                this.x += (dx / distance) * this.speed;
                this.y += (dy / distance) * this.speed;
            } else {
                this.movePattern = 'patrol';
                this.startX = this.x;
                this.startY = this.y;
            }
        } else if (this.movePattern === 'patrol') {
            // Patrol movement
            if (this.isPortrait) {
                this.x += this.patrolDirection * 0.5;
                if (Math.abs(this.x - this.startX) > this.patrolRange) {
                    this.patrolDirection *= -1;
                }
            } else {
                this.y += this.patrolDirection * 0.5;
                if (Math.abs(this.y - this.startY) > this.patrolRange) {
                    this.patrolDirection *= -1;
                }
            }
        }
        
        // Phase management
        this.phaseTimer++;
        if (this.phaseTimer > this.phaseDuration) {
            this.phase = Math.min(this.phase + 1, 4);
            this.phaseTimer = 0;
        }
        
        // Weapon timers
        this.primaryWeaponTimer++;
        this.secondaryWeaponTimer++;
        this.specialWeaponTimer++;
        this.spiralWeaponTimer++; // Increment spiral weapon timer
        
        // Hit flash
        if (this.hitFlash > 0) {
            this.hitFlash--;
        }
    }
    
    canFirePrimary() {
        return this.primaryWeaponTimer >= this.primaryCooldown;
    }
    
    firePrimary() {
        if (!this.canFirePrimary()) return [];
        this.primaryWeaponTimer = 0;
        
        const bullets = [];
        const angleToPlayer = Math.atan2(0 - this.y, 0 - this.x); // Aim at approximate player area
        
        // Phase 1: Single bullets
        if (this.phase === 1) {
            bullets.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angleToPlayer) * 4,
                vy: Math.sin(angleToPlayer) * 4,
                type: 'boss'
            });
        }
        // Phase 2: Triple shot
        else if (this.phase === 2) {
            for (let i = -1; i <= 1; i++) {
                const angle = angleToPlayer + i * 0.3;
                bullets.push({
                    x: this.x,
                    y: this.y,
                    vx: Math.cos(angle) * 4,
                    vy: Math.sin(angle) * 4,
                    type: 'boss'
                });
            }
        }
        // Phase 3: Spread shot
        else if (this.phase === 3) {
            for (let i = -2; i <= 2; i++) {
                const angle = angleToPlayer + i * 0.4;
                bullets.push({
                    x: this.x,
                    y: this.y,
                    vx: Math.cos(angle) * 5,
                    vy: Math.sin(angle) * 5,
                    size: 10, // Larger size for powerful attack
                    type: 'boss'
                });
            }
        }
        // Phase 4: Circle shot
        else if (this.phase === 4) {
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                bullets.push({
                    x: this.x,
                    y: this.y,
                    vx: Math.cos(angle) * 3,
                    vy: Math.sin(angle) * 3,
                    size: 12, // Even larger size for ultimate attack
                    type: 'boss'
                });
            }
        }
        
        return bullets;
    }
    
    canFireSecondary() {
        return this.secondaryWeaponTimer >= this.secondaryCooldown;
    }
    
    fireSecondary() {
        if (!this.canFireSecondary()) return [];
        this.secondaryWeaponTimer = 0;
        
        const bullets = [];
        
        // Laser attacks in later phases
        if (this.phase >= 2) {
            // Create laser data (will be handled by game engine)
            return [{
                type: 'laser',
                x: this.x,
                y: this.y,
                angle: Math.atan2(0 - this.y, 0 - this.x),
                speed: this.laserSpeed, // Pass the new speed
                length: 400,
                color: '#ff4444'
            }];
        }
        
        return bullets;
    }
    
    canFireSpecial() {
        return this.specialWeaponTimer >= this.specialCooldown && this.phase >= 3;
    }
    
    fireSpecial() {
        if (!this.canFireSpecial()) return [];
        this.specialWeaponTimer = 0;
        
        // Pulse circle attack
        return [{
            type: 'pulse',
            x: this.x,
            y: this.y,
            maxRadius: 300,
            color: '#ff00ff'
        }];
    }
    
    canFireSpiral() {
        return this.spiralWeaponTimer >= this.spiralWeaponCooldown;
    }
    
    fireSpiral() {
        this.spiralWeaponTimer = 0;
        const bullets = [];
        const numBullets = 12; // Number of bullets in one wave
        const baseAngle = this.frameCount * 0.05; // Rotate the spiral over time

        for (let i = 0; i < numBullets; i++) {
            const angle = baseAngle + (i / numBullets) * Math.PI * 2;
            bullets.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * 2, // Slower bullet speed
                vy: Math.sin(angle) * 2,
                size: 8, // Larger size
                type: 'boss'
            });
        }
        return bullets;
    }
    
    takeDamage(damage) {
        this.health -= damage;
        this.hitFlash = 10;
        
        if (this.health <= 0) {
            this.isDefeated = true;
            this.deathTimer = 0;
            return 'defeated';
        }
        
        return 'hit';
    }
    
    getHealthPercentage() {
        return this.health / this.maxHealth;
    }
    
    render(ctx) {
        if (this.size <= 0) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Flash effect when hit
        if (this.hitFlash > 0) {
            ctx.globalAlpha = 0.5;
        }
        
        // Main boss body - large menacing design
        ctx.strokeStyle = this.isDefeated ? '#666666' : '#ff4444';
        ctx.fillStyle = this.isDefeated ? '#333333' : '#cc2222';
        ctx.lineWidth = 4;
        
        // Core body
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Inner details
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        
        // Weapon hardpoints
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const x = Math.cos(angle) * this.size * 0.8;
            const y = Math.sin(angle) * this.size * 0.8;
            
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Central eye/core
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Pulsing effect based on phase
        if (this.phase >= 2) {
            ctx.globalAlpha = 0.3 + 0.2 * Math.sin(this.frameCount * 0.1);
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(0, 0, this.size + 20, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
        
        // Health bar
        this.renderHealthBar(ctx);
    }
    
    renderHealthBar(ctx) {
        const barWidth = 300;
        const barHeight = 20;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.size - 40;
        
        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health
        const healthPercent = this.getHealthPercentage();
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        // Boss name
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('SPACE OVERLORD', this.x, barY - 10);
    }
}