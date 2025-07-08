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
            this.uiManager.loadCustomControls();
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
        
        const numAsteroids = GAME_CONFIG.INITIAL_AST_COUNT + (this.game.currentWave - 1) * 2;
        for (let i = 0; i < numAsteroids; i++) {
            this.spawnAsteroidOffscreen();
        }
        
        setTimeout(() => {
            if (this.game.state === GAME_STATES.WAVE_TRANSITION) {
                this.game.state = GAME_STATES.PLAYING;
            }
        }, 1500);
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
        do {
            tooClose = false;
            x = random(0, this.width);
            y = random(0, this.height);
            
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
            for (let j = this.asteroidPool.activeObjects.length - 1; j >= 0; j--) {
                const ast = this.asteroidPool.activeObjects[j];
                if (collision(bullet, ast)) {
                    this.game.score += GAME_CONFIG.HIT_SCORE;
                    triggerHapticFeedback(20);
                    this.audioManager.playHit();
                    // Small explosion pulse and particles for hit
                    this.particlePool.get(bullet.x, bullet.y, 'explosionPulse', ast.baseRadius * 0.7);
                    for (let p = 0; p < 7; p++) {
                        this.particlePool.get(bullet.x, bullet.y, 'explosionRedOrange');
                    }
                    this.particlePool.get(bullet.x, bullet.y, 'explosion');
                    // Light screen shake for asteroid hits
                    this.triggerScreenShake(3, 2, ast.baseRadius * 0.3);
                    if (ast.baseRadius <= (GAME_CONFIG.MIN_AST_RAD + 5)) {
                        this.game.score += GAME_CONFIG.DESTROY_SCORE;
                        this.audioManager.playExplosion();
                        // Large explosion pulse and many particles for destruction
                        this.particlePool.get(ast.x, ast.y, 'explosionPulse', ast.baseRadius * 1.5);
                        for (let p = 0; p < 24; p++) {
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
                if (collision(a1, a2)) {
                    let dx = a2.x - a1.x, dy = a2.y - a1.y, dist = Math.hypot(dx, dy);
                    if (dist === 0) continue;
                    
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
                    if (!star.isBurst) this.spawnStar();
                    this.starPool.release(star);
                }
            }
        }
    }
    
    update() {
        if (this.game.state === GAME_STATES.PLAYING || this.game.state === GAME_STATES.WAVE_TRANSITION) {
            const input = this.inputHandler.getInput();
            this.player.update(input, this.particlePool, this.bulletPool, this.audioManager);
            this.bulletPool.updateActive(this.particlePool);
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
        this.uiManager.loadCustomControls();
        this.gameLoop();
    }
} 