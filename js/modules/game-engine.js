// Main game engine and state management
import { GAME_CONFIG, GAME_STATES } from './constants.js';
import { random, collision, triggerHapticFeedback } from './utils.js';
import { PoolManager } from './pool-manager.js';
import { Player } from './entities/player.js';
import { Bullet } from './entities/bullet.js';
import { Asteroid } from './entities/asteroid.js';
import { Particle } from './entities/particle.js';
import { Star } from './entities/star.js';
import { LineDebris } from './entities/line-debris.js';

export const PLAYER_STATES = {
    NORMAL: 'normal',
    CRITICAL: 'critical',
    RAPID_RECHARGE: 'rapid_recharge',
};

export class GameEngine {
    constructor(canvas, uiManager, audioManager, inputHandler) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.uiManager = uiManager;
        this.audioManager = audioManager;
        this.inputHandler = inputHandler;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.game = {
            score: 0,
            highScore: 0,
            currentWave: 0,
            state: GAME_STATES.TITLE_SCREEN,
            lastState: GAME_STATES.TITLE_SCREEN,
            screenShakeDuration: 0,
            screenShakeMagnitude: 0
        };
        this.initializePools();
        this.setupEventListeners();
        this.playerCanFire = true;
        this.previousFire = false;
        this.maxThrust = 100;
        this.playerThrust = this.maxThrust;
        this.thrustDepleteRate = this.maxThrust / 5 / 60; // 5 seconds to empty at 60fps
        this.thrustRegenRate = this.maxThrust / 30 / 60;  // 30 seconds to full at 60fps
        this.thrustDepleted = false;
        this.thrustDepletedTimer = 0;
        this.criticalTimer = 0;
        this.criticalActive = false;
        this.criticalJustActivated = false;
        this.criticalAlarmCounter = 0;
        this.energyRegenRapid = false;
        this.energyRegenTarget = 99;
        this.prevEnergyValue = 99;
        this.playerState = PLAYER_STATES.NORMAL;
    }
    
    initializePools() {
        this.player = new Player();
        
        this.bulletPool = new PoolManager(Bullet, 20);
        this.particlePool = new PoolManager(Particle, 200);
        this.lineDebrisPool = new PoolManager(LineDebris, 100);
        this.asteroidPool = new PoolManager(Asteroid, 20);
        this.starPool = new PoolManager(Star, GAME_CONFIG.STAR_COUNT + 100);
    }
    
    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
            this.uiManager.checkOrientation();
        });
        
        // Handle orientation change
        window.addEventListener('orientationchange', () => {
            this.uiManager.checkOrientation();
        });
        
        // Handle pause
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                this.togglePause();
            }
        });
        
        this.uiManager.elements.mobilePauseButton.addEventListener('click', () => {
            this.togglePause();
        });
        
        // Handle game restart
        window.addEventListener('click', () => {
            if (this.game.state === GAME_STATES.GAME_OVER) {
                this.init();
            }
        });
        
        window.addEventListener('touchstart', () => {
            if (this.game.state === GAME_STATES.GAME_OVER) {
                this.init();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Enter' && this.game.state === GAME_STATES.GAME_OVER) {
                this.init();
            }
        });
    }
    
    init() {
        this.game.score = 0;
        this.game.currentWave = 0;
        this.game.state = GAME_STATES.PLAYING;
        // Reset player
        this.player = new Player();
        // Reset energy and CRITICAL state
        this.playerThrust = this.maxThrust;
        this.criticalActive = false;
        this.criticalJustActivated = false;
        this.criticalTimer = 0;
        this.criticalAlarmCounter = 0;
        this.energyRegenRapid = false;
        this.thrustDepleted = false;
        this.thrustDepletedTimer = 0;
        // Clear all pools
        this.bulletPool.activeObjects = [];
        this.particlePool.activeObjects = [];
        this.lineDebrisPool.activeObjects = [];
        this.asteroidPool.activeObjects = [];
        this.starPool.activeObjects = [];
        // Spawn initial stars
        for (let i = 0; i < GAME_CONFIG.STAR_COUNT; i++) {
            this.spawnStar();
        }
        this.startNextWave();
        this.uiManager.hideMessage();
    }
    
    startNextWave() {
        this.game.currentWave++;
        this.uiManager.updateWave(this.game.currentWave);
        this.uiManager.showMessage(`WAVE ${this.game.currentWave}`, '', 1500);
        this.game.state = GAME_STATES.WAVE_TRANSITION;
        // Always clear CRITICAL/rapid_recharge state at wave start
        this.playerState = PLAYER_STATES.NORMAL;
        this.criticalTimer = 0;
        this.criticalAlarmCounter = 0;
        this.hideCriticalOverlay();
        this.energyRegenRapid = false;
        const numAsteroids = GAME_CONFIG.INITIAL_AST_COUNT + (this.game.currentWave - 1) * 2;
        for (let i = 0; i < numAsteroids; i++) {
            this.spawnAsteroidOffscreen();
        }
        setTimeout(() => {
            if (this.game.state === GAME_STATES.WAVE_TRANSITION) {
                this.game.state = GAME_STATES.PLAYING;
            }
        }, 1500);
        // Only do rapid recharge for waves after the first
        if (this.game.currentWave > 1) {
            this.energyRegenRapid = true;
            this.playerThrust = 0;
        } else {
            this.playerThrust = this.maxThrust;
        }
    }
    
    spawnAsteroidOffscreen() {
        let x, y;
        const edge = Math.floor(random(0, 4));
        const r = random(30, 60);
        const spawnBuffer = r * 4;
        
        switch (edge) {
            case 0: x = random(0, this.width); y = -spawnBuffer; break;
            case 1: x = this.width + spawnBuffer; y = random(0, this.height); break;
            case 2: x = random(0, this.width); y = this.height + spawnBuffer; break;
            default: x = -spawnBuffer; y = random(0, this.height); break;
        }
        
        const newAst = this.asteroidPool.get(x, y, r);
        const tx = random(this.width * 0.3, this.width * 0.7);
        const ty = random(this.height * 0.3, this.height * 0.7);
        const ang = Math.atan2(ty - y, tx - x);
        const spd = Math.min(2.5, GAME_CONFIG.AST_SPEED + (this.game.currentWave - 1) * 0.1);
        newAst.vel = { x: Math.cos(ang) * spd, y: Math.sin(ang) * spd };
    }
    
    spawnStar() {
        let x, y, tooClose, attempts = 0;
        // On mobile, always use landscape dimensions for star spawning
        let spawnWidth = this.width;
        let spawnHeight = this.height;
        if (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse), (max-width: 768px)').matches) {
            spawnWidth = Math.max(window.innerWidth, window.innerHeight);
            spawnHeight = Math.max(window.innerWidth, window.innerHeight);
        }
        do {
            tooClose = false;
            x = random(0, spawnWidth);
            y = random(0, spawnHeight);
            if (this.starPool && this.starPool.activeObjects) {
                for (let o of this.starPool.activeObjects) {
                    if (Math.hypot(x - o.x, y - o.y) < GAME_CONFIG.MIN_STAR_DIST) {
                        tooClose = true;
                        break;
                    }
                }
            }
            attempts++;
            if (attempts > 100) break;
        } while (tooClose);
        if (!tooClose) {
            this.starPool.get(x, y, false);
        }
    }
    
    createDebris(ast) {
        for (let i = 0; i < 25; i++) {
            this.particlePool.get(ast.x, ast.y, 'explosion');
        }
        
        ast.edges.forEach(edge => {
            const p1 = ast.vertices3D[edge[0]];
            const p2 = ast.vertices3D[edge[1]];
            this.lineDebrisPool.get(ast.x, ast.y, p1, p2);
        });
    }
    
    createStarBurst(x, y) {
        for (let i = 0; i < 20; i++) {
            this.starPool.get(x, y, true);
        }
    }
    
    handleCollisions() {
        // Player vs Asteroids
        if (this.player.active) {
            for (const ast of this.asteroidPool.activeObjects) {
                if (collision(this.player, ast)) {
                    this.player.die(this.particlePool, this.audioManager, this.uiManager, this.game, this.triggerScreenShake.bind(this));
                    return;
                }
            }
        }
        
        // Bullets vs Asteroids
        for (let i = this.bulletPool.activeObjects.length - 1; i >= 0; i--) {
            const bullet = this.bulletPool.activeObjects[i];
            if (!bullet.active) continue;
            for (let j = this.asteroidPool.activeObjects.length - 1; j >= 0; j--) {
                const ast = this.asteroidPool.activeObjects[j];
                if (!ast.active) continue;
                if (collision(bullet, ast)) {
                    this.game.score += GAME_CONFIG.HIT_SCORE;
                    triggerHapticFeedback(20);
                    this.audioManager.playHit();
                    // More pronounced explosion for hit
                    this.particlePool.get(bullet.x, bullet.y, 'explosionPulse', ast.baseRadius * 1.0);
                    for (let p = 0; p < 14; p++) {
                        this.particlePool.get(bullet.x, bullet.y, 'explosionRedOrange');
                    }
                    this.particlePool.get(bullet.x, bullet.y, 'explosion');
                    // Light screen shake for asteroid hits
                    this.triggerScreenShake(3, 2, ast.baseRadius * 0.3);
                    if (ast.baseRadius <= (GAME_CONFIG.MIN_AST_RAD + 5)) {
                        this.game.score += GAME_CONFIG.DESTROY_SCORE;
                        this.audioManager.playExplosion();
                        // Multiple fiery shockwave pulses for destruction
                        const pulseCount = 4;
                        for (let n = 0; n < pulseCount; n++) {
                            setTimeout(() => {
                                this.particlePool.get(ast.x, ast.y, 'explosionPulse', ast.baseRadius * (1.2 + n * 0.5));
                                this.particlePool.get(ast.x, ast.y, 'fieryExplosionRing', ast.baseRadius * (1.1 + n * 0.2));
                            }, n * 80);
                        }
                        for (let p = 0; p < 54; p++) {
                            this.particlePool.get(ast.x, ast.y, 'explosionRedOrange');
                        }
                        this.createDebris(ast);
                        this.createStarBurst(ast.x, ast.y);
                        this.asteroidPool.release(ast);
                        this.triggerScreenShake(15, 8, ast.baseRadius);
                    } else {
                        const count = Math.random() < 0.5 ? 2 : 3;
                        const newR = ast.baseRadius / Math.sqrt(count);
                        const totalMass = ast.mass + bullet.mass;
                        const v_com_x = (ast.vel.x * ast.mass + bullet.vel.x * bullet.mass) / totalMass;
                        const v_com_y = (ast.vel.y * ast.mass + bullet.vel.y * bullet.mass) / totalMass;
                        
                        if (newR < GAME_CONFIG.MIN_AST_RAD) {
                            this.game.score += GAME_CONFIG.DESTROY_SCORE;
                            this.audioManager.playExplosion();
                            // Large explosion pulse and many particles for destruction
                            this.particlePool.get(ast.x, ast.y, 'explosionPulse', ast.baseRadius * 1.2);
                            for (let p = 0; p < 18; p++) {
                                this.particlePool.get(ast.x, ast.y, 'explosionRedOrange');
                            }
                            this.createDebris(ast);
                            this.createStarBurst(ast.x, ast.y);
                            this.triggerScreenShake(12, 6, ast.baseRadius);
                        } else {
                            // Additional screen shake for asteroid splitting
                            this.triggerScreenShake(8, 4, ast.baseRadius * 0.5);
                            
                            for (let k = 0; k < count; k++) {
                                const newAst = this.asteroidPool.get(
                                    ast.x + random(-2, 2),
                                    ast.y + random(-2, 2),
                                    newR
                                );
                                const angle = (k / count) * (2 * Math.PI) + random(-0.2, 0.2);
                                const kick_x = Math.cos(angle) * 1;
                                const kick_y = Math.sin(angle) * 1;
                                newAst.vel.x = v_com_x + kick_x;
                                newAst.vel.y = v_com_y + kick_y;
                            }
                        }
                        this.asteroidPool.release(ast);
                    }
                    this.bulletPool.release(bullet);
                    break;
                }
            }
        }
        
        // Asteroid vs Asteroid collisions
        const activeAsteroids = this.asteroidPool.activeObjects;
        for (let i = 0; i < activeAsteroids.length; i++) {
            for (let j = i + 1; j < activeAsteroids.length; j++) {
                let a1 = activeAsteroids[i], a2 = activeAsteroids[j];
                if (!a1.active || !a2.active) continue;
                if (collision(a1, a2)) {
                    let dx = a2.x - a1.x, dy = a2.y - a1.y, dist = Math.hypot(dx, dy);
                    if (dist === 0) continue;
                    
                    // Play explosion sound
                    this.audioManager.playExplosion();
                    // Spawn rocky debris particles at collision point
                    const debrisCount = Math.floor(random(10, 18));
                    const cx = (a1.x + a2.x) / 2;
                    const cy = (a1.y + a2.y) / 2;
                    for (let d = 0; d < debrisCount; d++) {
                        this.particlePool.get(cx, cy, 'asteroidCollisionDebris');
                    }
                    
                    let nx = dx / dist, ny = dy / dist, tx = -ny, ty = nx;
                    let dpTan1 = a1.vel.x * tx + a1.vel.y * ty, dpTan2 = a2.vel.x * tx + a2.vel.y * ty;
                    let dpNorm1 = a1.vel.x * nx + a1.vel.y * ny, dpNorm2 = a2.vel.x * nx + a2.vel.y * ny;
                    let m1 = (dpNorm1 * (a1.mass - a2.mass) + 2 * a2.mass * dpNorm2) / (a1.mass + a2.mass);
                    let m2 = (dpNorm2 * (a2.mass - a1.mass) + 2 * a1.mass * dpNorm1) / (a1.mass + a2.mass);
                    
                    a1.vel = { x: tx * dpTan1 + nx * m1, y: ty * dpTan1 + ny * m1 };
                    a2.vel = { x: tx * dpTan2 + nx * m2, y: ty * dpTan2 + ny * m2 };
                    
                    let overlap = 0.5 * (a1.radius + a2.radius - dist + 1);
                    a1.x -= overlap * nx; a1.y -= overlap * ny;
                    a2.x += overlap * nx; a2.y += overlap * ny;
                }
            }
        }
        
        // Player vs Stars
        if (this.player && this.player.active) {
            for (let i = this.starPool.activeObjects.length - 1; i >= 0; i--) {
                const star = this.starPool.activeObjects[i];
                if (collision(this.player, star)) {
                    this.game.score += star.isBurst ? GAME_CONFIG.BURST_STAR_SCORE : GAME_CONFIG.STAR_SCORE;
                    this.audioManager.playCoin();
                    this.particlePool.get(star.x, star.y, 'pickupPulse');
                    // Add 1 energy if not in CRITICAL, up to max 99
                    if (this.playerState !== PLAYER_STATES.CRITICAL) {
                        let percent = this.playerThrust / this.maxThrust;
                        let value = Math.round(percent * 99);
                        if (value < 99) {
                            value = Math.min(99, value + 1);
                            this.playerThrust = (value / 99) * this.maxThrust;
                        }
                    }
                    if (!star.isBurst) this.spawnStar();
                    this.starPool.release(star);
                }
            }
        }
    }
    
    update() {
        if (this.game.state === GAME_STATES.PLAYING || this.game.state === GAME_STATES.WAVE_TRANSITION) {
            const input = this.inputHandler.getInput();
            const energyBar = document.getElementById('energy-bar');
            const energyValue = document.getElementById('energy-value');
            let percent = this.playerThrust / this.maxThrust;
            let value = Math.round(percent * 99);
            if (value < 0) value = 0;
            if (value > 99) value = 99;
            // State transitions
            // Only go CRITICAL if in PLAYING state
            if (this.game.state === GAME_STATES.PLAYING && value === 0 && this.prevEnergyValue > 0 && this.playerState !== PLAYER_STATES.CRITICAL) {
                this.playerState = PLAYER_STATES.CRITICAL;
                this.criticalTimer = 300; // 5 seconds at 60fps
                this.criticalAlarmCounter = 0;
                this.showCriticalOverlay();
            }
            if (this.playerState === PLAYER_STATES.CRITICAL) {
                this.criticalTimer--;
                this.criticalAlarmCounter++;
                if (this.criticalAlarmCounter % 120 === 1) {
                    this.playCriticalAlarm();
                }
                if (this.criticalTimer <= 0) {
                    this.playerState = PLAYER_STATES.RAPID_RECHARGE;
                    this.hideCriticalOverlay();
                }
            }
            if (this.playerState === PLAYER_STATES.RAPID_RECHARGE) {
                this.energyRegenRapid = true;
            }
            // End rapid recharge when full
            if (this.energyRegenRapid) {
                this.playerThrust += 6;
                if (this.playerThrust >= this.maxThrust) {
                    this.playerThrust = this.maxThrust;
                    this.energyRegenRapid = false;
                    this.playerState = PLAYER_STATES.NORMAL;
                }
            }
            this.prevEnergyValue = value;
            let canAct = value > 0 && this.playerState === PLAYER_STATES.NORMAL;
            let usingThrust = canAct && (input.up || (typeof input.joystickY === 'number' && input.joystickY < -0.3)) && this.playerThrust > 0;
            // Energy logic
            if (usingThrust && !this.thrustDepleted && this.playerState === PLAYER_STATES.NORMAL) {
                this.playerThrust -= this.thrustDepleteRate;
                if (this.playerThrust <= 0) {
                    this.playerThrust = 0;
                    this.thrustDepleted = true;
                    this.thrustDepletedTimer = 300;
                }
            } else if (this.thrustDepleted) {
                this.thrustDepletedTimer--;
                if (this.thrustDepletedTimer <= 0) {
                    this.thrustDepleted = false;
                }
            } else if (this.playerThrust < this.maxThrust && this.playerState === PLAYER_STATES.NORMAL) {
                this.playerThrust += this.thrustRegenRate;
                if (this.playerThrust > this.maxThrust) this.playerThrust = this.maxThrust;
            }
            // Update simple energy bar UI
            if (energyBar && energyValue) {
                percent = this.playerThrust / this.maxThrust;
                value = Math.round(percent * 99);
                if (value < 0) value = 0;
                if (value > 99) value = 99;
                energyBar.style.width = `${Math.max(0, percent * 180)}px`;
                let color;
                if (percent > 0.66) {
                    const t = (percent - 0.66) / 0.34;
                    color = `rgb(${255 * (1-t)},255,0)`;
                } else if (percent > 0.33) {
                    const t = (percent - 0.33) / 0.33;
                    color = `rgb(255,${165 + 90*t},0)`;
                } else {
                    const t = percent / 0.33;
                    color = `rgb(255,${t*165},0)`;
                }
                energyBar.style.background = color;
                energyValue.style.color = color;
                energyValue.textContent = value.toString().padStart(2, '0');
                if (value === 0) {
                    energyValue.classList.add('flashing-red');
                } else {
                    energyValue.classList.remove('flashing-red');
                }
            }
            // Only fire if playerCanFire is true, input.fire is true, and in normal state
            if (input.fire && this.playerCanFire && canAct) {
                this.player.fire(this.bulletPool, this.audioManager);
                this.playerThrust -= 2;
                if (this.playerThrust < 0) this.playerThrust = 0;
                this.playerCanFire = false;
            }
            if (!input.fire && this.previousFire) {
                this.playerCanFire = true;
            }
            this.previousFire = input.fire;
            // Prevent player from moving when not in normal state
            if (this.playerState === PLAYER_STATES.NORMAL) {
                this.player.update(input, this.particlePool, this.bulletPool, this.audioManager);
            } else if (this.playerState === PLAYER_STATES.CRITICAL) {
                // Allow only turning, preserve momentum, disable thrust/shoot
                const turnOnlyInput = {
                    ...input,
                    up: false,
                    down: false,
                    fire: false,
                    space: false,
                };
                this.player.update(turnOnlyInput, this.particlePool, this.bulletPool, this.audioManager);
            }
            this.bulletPool.updateActive(this.particlePool, this.asteroidPool);
            this.particlePool.updateActive();
            this.lineDebrisPool.updateActive();
            this.asteroidPool.updateActive();
            this.starPool.activeObjects.forEach(s => s.update(this.player.vel, this.player));
            
            this.handleCollisions();
            
            if (this.game.state === GAME_STATES.PLAYING && this.asteroidPool.activeObjects.length === 0) {
                this.game.state = GAME_STATES.WAVE_TRANSITION;
                setTimeout(() => this.startNextWave(), 2000);
            }
            
            this.uiManager.updateScore(this.game.score);
        } else if (this.game.state === GAME_STATES.GAME_OVER || this.game.state === GAME_STATES.PAUSED) {
            // Remove CRITICAL overlay if still active
            if (this.playerState === PLAYER_STATES.CRITICAL || this.playerState === PLAYER_STATES.RAPID_RECHARGE) {
                this.hideCriticalOverlay();
                this.playerState = PLAYER_STATES.NORMAL;
            }
            this.particlePool.updateActive();
            this.lineDebrisPool.updateActive();
        }
    }
    
    draw() {
        // Clear with semi-transparent black for trail effect
        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        if (this.game.state !== GAME_STATES.TITLE_SCREEN) {
            this.starPool.drawActive(this.ctx);
            this.lineDebrisPool.drawActive(this.ctx);
            this.particlePool.drawActive(this.ctx);
            this.asteroidPool.drawActive(this.ctx);
            this.bulletPool.drawActive(this.ctx);
            this.player.draw(this.ctx);
        }
    }
    
    gameLoop() {
        this.update();
        
        this.ctx.save();
        if (this.game.screenShakeDuration > 0) {
            // Enhanced shake algorithm with multiple frequencies and smooth decay
            const time = Date.now() * 0.01;
            const shakeIntensity = this.game.screenShakeMagnitude * (this.game.screenShakeDuration / this.game.originalShakeMagnitude);
            
            // Combine multiple sine waves for more natural shake
            const dx = Math.sin(time * 15) * shakeIntensity * 0.3 + 
                      Math.sin(time * 7) * shakeIntensity * 0.2 + 
                      (Math.random() - 0.5) * shakeIntensity * 0.5;
            const dy = Math.cos(time * 13) * shakeIntensity * 0.3 + 
                      Math.cos(time * 5) * shakeIntensity * 0.2 + 
                      (Math.random() - 0.5) * shakeIntensity * 0.5;
            
            this.ctx.translate(dx, dy);
            this.game.screenShakeDuration--;
            
            // Smooth decay of shake magnitude
            if (this.game.screenShakeDuration > 0) {
                this.game.screenShakeMagnitude = Math.max(0, this.game.screenShakeMagnitude - this.game.shakeDecayRate);
            } else {
                this.game.screenShakeMagnitude = 0;
            }
        }
        
        this.draw();
        this.ctx.restore();
        
        if (this.game.state === GAME_STATES.GAME_OVER) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    togglePause() {
        if (this.game.state === GAME_STATES.PLAYING || this.game.state === GAME_STATES.WAVE_TRANSITION) {
            this.game.state = GAME_STATES.PAUSED;
            this.uiManager.togglePause();
            if (this.player && this.player.isThrusting) {
                this.audioManager.playThruster();
            }
        } else if (this.game.state === GAME_STATES.PAUSED) {
            this.game.state = GAME_STATES.PLAYING;
            this.uiManager.togglePause();
        }
    }
    
    triggerScreenShake(duration, magnitude, asteroidSize = 0) {
        // Enhanced screen shake based on asteroid size
        const baseMagnitude = magnitude;
        const sizeMultiplier = Math.max(1, asteroidSize / 30); // Larger asteroids = more shake
        const enhancedMagnitude = baseMagnitude * sizeMultiplier;
        
        // Add some randomness to make it feel more natural
        const randomDuration = duration + Math.floor(Math.random() * 5);
        const randomMagnitude = enhancedMagnitude + Math.random() * 3;
        
        this.game.screenShakeDuration = randomDuration;
        this.game.screenShakeMagnitude = randomMagnitude;
        
        // Store the original values for smooth decay
        this.game.originalShakeMagnitude = randomMagnitude;
        this.game.shakeDecayRate = randomMagnitude / randomDuration;
    }
    
    loadHighScore() {
        this.game.highScore = parseInt(localStorage.getItem('rainboidsHighScore')) || 0;
    }
    
    checkHighScore() {
        if (this.game.score > this.game.highScore) {
            this.game.highScore = this.game.score;
            localStorage.setItem('rainboidsHighScore', this.game.highScore);
        }
    }
    
    start() {
        this.loadHighScore();
        this.uiManager.checkOrientation();
        this.uiManager.setupTitleScreen();
        this.uiManager.showTitleScreen();
        this.uiManager.updateHighScore(this.game.highScore);
        this.inputHandler.setupTouchControls();
        this.gameLoop();
    }

    showCriticalOverlay() {
        let overlay = document.getElementById('critical-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'critical-overlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100vw';
            overlay.style.height = '100vh';
            overlay.style.background = 'rgba(255,0,0,0.18)';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.zIndex = '9999';
            overlay.style.pointerEvents = 'none';
            overlay.innerHTML = '<span class="critical-flash-text">CRITICAL</span>';
            document.body.appendChild(overlay);
        } else {
            overlay.style.display = 'flex';
        }
    }
    playCriticalAlarm() {
        // Play a simple alarm sound using the AudioManager or a beep
        if (this.audioManager && this.audioManager.playAlarm) {
            this.audioManager.playAlarm();
        } else {
            // Fallback: use Web Audio API beep
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = 'square';
                o.frequency.value = 440;
                g.gain.value = 0.15;
                o.connect(g); g.connect(ctx.destination);
                o.start();
                setTimeout(() => { o.stop(); ctx.close(); }, 180);
            } catch (e) {}
        }
    }
    hideCriticalOverlay() {
        const overlay = document.getElementById('critical-overlay');
        if (overlay) overlay.style.display = 'none';
    }
} 