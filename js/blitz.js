// Rainboids: Blitz - A bullet hell space shooter
import { Player } from './blitz/entities/player.js';
import { Enemy, Bullet, Laser, PulseCircle, HomingMissile } from './blitz/entities/enemy.js';
import { Asteroid } from './blitz/entities/asteroid.js';
import { InputHandler } from './blitz/input.js';

class BlitzGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        this.gameState = 'TITLE';
        this.score = 0;
        this.lives = 1;
        
        let playerX, playerY;
        if (this.isPortrait) {
            playerX = this.canvas.width / 2;
            playerY = this.canvas.height - 100; // Bottom center
        } else {
            playerX = 100; // Left side
            playerY = this.canvas.height / 2; // Center
        }
        this.player = new Player(playerX, playerY);
        this.bullets = [];
        this.enemyBullets = [];
        this.enemyLasers = [];
        this.enemyPulseCircles = [];
        this.asteroids = [];
        this.enemies = [];
        this.particles = [];
        
        this.inputHandler = new InputHandler(this.canvas);
        this.isMobile = this.detectMobile();
        this.touchActive = false;
        this.touchX = 0;
        this.touchY = 0;
        this.gameTime = 0;
        this.lastGameTimeSeconds = 0;
        
        this.asteroidSpawnTimer = 0;
        this.enemySpawnTimer = 0;
        
        this.backgroundStars = [];
        this.powerups = [];
        this.explosions = [];
        this.powerupSpawnTimer = 0;
        this.textParticles = []; // For score popups
        
        this.setupBackgroundStars();
        this.setupAudio();
        this.setupEventListeners();
        this.setupCheatButtons();
        window.blitzGame = this; // Make game accessible for sound effects
        this.gameLoop();
    }
    
    detectMobile() {
        return window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse), (max-width: 768px)').matches;
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.isPortrait = this.canvas.height > this.canvas.width;
    }
    
    setupAudio() {
        // Initialize audio
        this.audioReady = false;
        this.sounds = {
            shoot: this.generateSound('laserShoot'),
            hit: this.generateSound('hitHurt'),
            explosion: this.generateSound('explosion'),
            dash: this.generateSound('powerUp')
        };
        
        // Background music
        this.backgroundMusic = new Audio('bgm.mp3');
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = 0.3;
    }
    
    generateSound(type) {
        // Simple sound generation (placeholder - would use sfxr in real implementation)
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        return {
            play: () => {
                if (!this.audioReady) return;
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                
                osc.connect(gain);
                gain.connect(audioContext.destination);
                
                switch(type) {
                    case 'laserShoot':
                        osc.frequency.setValueAtTime(800, audioContext.currentTime);
                        osc.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
                        break;
                    case 'hitHurt':
                        osc.frequency.setValueAtTime(400, audioContext.currentTime);
                        osc.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.2);
                        break;
                    case 'explosion':
                        osc.type = 'noise';
                        osc.frequency.setValueAtTime(200, audioContext.currentTime);
                        break;
                    case 'powerUp':
                        osc.frequency.setValueAtTime(400, audioContext.currentTime);
                        osc.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.2);
                        break;
                }
                
                gain.gain.setValueAtTime(0.1, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                
                osc.start();
                osc.stop(audioContext.currentTime + 0.2);
            }
        };
    }
    
    setupEventListeners() {
        // Click/Touch to start
        document.addEventListener('click', () => {
            if (this.gameState === 'TITLE') {
                this.startGame();
            } else if (this.gameState === 'GAME_OVER') {
                this.restartGame();
            }
        });
        
        document.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.gameState === 'TITLE') {
                this.startGame();
            } else if (this.gameState === 'GAME_OVER') {
                this.restartGame();
            }
        }, { passive: false });

        // Any key to start/restart
        document.addEventListener('keydown', (e) => {
            if (this.gameState === 'TITLE') {
                this.startGame();
            } else if (this.gameState === 'GAME_OVER') {
                this.restartGame();
            }
        });
        
        // Resize handler
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });

        // Pause button
        const pauseButton = document.getElementById('pause-button');
        if (pauseButton) {
            pauseButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.gameState === 'PLAYING') {
                    this.pauseGame();
                } else if (this.gameState === 'PAUSED') {
                    this.resumeGame();
                }
            });
            pauseButton.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                e.preventDefault(); // Prevent default touch behavior like scrolling
                if (this.gameState === 'PLAYING') {
                    this.pauseGame();
                } else if (this.gameState === 'PAUSED') {
                    this.resumeGame();
                }
            }, { passive: false });
        }

        // Help button (top-left UI)
        const uiElement = document.getElementById('ui');
        if (uiElement) {
            uiElement.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.gameState === 'PLAYING') {
                    this.showHelp();
                }
            });
        }

        // Toggle pause with 'X' or 'Escape' key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'x' || e.key === 'X' || e.key === 'Escape') {
                if (this.gameState === 'PLAYING') {
                    this.pauseGame();
                } else if (this.gameState === 'PAUSED') {
                    this.resumeGame();
                }
            }
        });

        // Toggle pause with 'X' button click
        const pauseCloseButton = document.getElementById('pause-close-button');
        if (pauseCloseButton) {
            pauseCloseButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.gameState === 'PAUSED') { // Only resume if already paused
                    this.resumeGame();
                }
            });
            pauseCloseButton.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (this.gameState === 'PAUSED') {
                    this.resumeGame();
                }
            }, { passive: false });
        }

        // Volume button
        const volumeButton = document.getElementById('volume-button');
        if (volumeButton) {
            volumeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.backgroundMusic.muted = !this.backgroundMusic.muted;
                volumeButton.textContent = this.backgroundMusic.muted ? '🔇' : '🔊';
            });
            volumeButton.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.backgroundMusic.muted = !this.backgroundMusic.muted;
                volumeButton.textContent = this.backgroundMusic.muted ? '🔇' : '🔊';
            }, { passive: false });
        }
    }
    
    showHelp() {
        this.gameState = 'PAUSED';
        document.getElementById('pause-overlay').style.display = 'flex';
        document.body.style.cursor = 'default'; // Show cursor
    }

    hideHelp() {
        this.gameState = 'PLAYING';
        document.getElementById('pause-overlay').style.display = 'none';
        document.body.style.cursor = 'none'; // Hide cursor
    }
    
    startGame() {
        this.gameState = 'PLAYING';
        document.getElementById('title-screen').style.display = 'none';
        document.getElementById('game-over').style.display = 'none';
        
        // Start audio
        this.audioReady = true;
        this.backgroundMusic.play().catch(e => console.log('Audio play failed:', e));
    }
    
    restartGame() {
        this.gameState = 'PLAYING';
        this.score = 0;
        this.lives = 1;
        
        let playerX, playerY;
        if (this.isPortrait) {
            playerX = this.canvas.width / 2;
            playerY = this.canvas.height - 100; // Bottom center
        } else {
            playerX = 100; // Left side
            playerY = this.canvas.height / 2; // Center
        }
        this.player = new Player(playerX, playerY);
        this.bullets = [];
        this.enemyBullets = [];
        this.enemyLasers = [];
        this.enemyPulseCircles = [];
        this.asteroids = [];
        this.enemies = [];
        this.particles = [];
        
        this.asteroidSpawnTimer = 0;
        this.enemySpawnTimer = 0;
        
        this.backgroundStars = [];
        this.powerups = [];
        this.explosions = [];
        this.powerupSpawnTimer = 0;
        this.setupBackgroundStars();
        
        document.getElementById('game-over').style.display = 'none';
        this.updateUI();
    }
    
    setupBackgroundStars() {
        const starColors = ['#a6b3ff', '#c3a6ff', '#f3a6ff', '#ffa6f8', '#ffa6c7', '#ff528e', '#d98cff', '#ff8c00', '#ffffff', '#ffff88'];
        const starShapes = ['point', 'diamond', 'star4', 'star8', 'plus', 'cross'];
        
        // Create static background stars
        for (let i = 0; i < 200; i++) {
            this.backgroundStars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: 1 + Math.random() * 3,
                color: starColors[Math.floor(Math.random() * starColors.length)],
                shape: starShapes[Math.floor(Math.random() * starShapes.length)],
                twinkle: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.01 + Math.random() * 0.02,
                opacity: 0.3 + Math.random() * 0.7
            });
        }
    }
    
    spawnPowerup() {
        let x, y;
        if (this.isPortrait) {
            x = Math.random() * this.canvas.width;
            y = -50;
        } else {
            x = this.canvas.width + 50;
            y = Math.random() * this.canvas.height;
        }
        const types = ['shield', 'mainWeapon', 'sideWeapon', 'secondShip', 'bomb'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        this.powerups.push(new Powerup(x, y, type, this.isPortrait));
    }
    
    gameOver() {
        this.gameState = 'GAME_OVER';
        document.getElementById('game-over').style.display = 'flex';
    }
    
    updateUI() {
        document.getElementById('score-value').textContent = this.score;
        const timerElement = document.getElementById('timer-value');
        if (timerElement && this.gameState !== 'PAUSED') {
            const currentSeconds = Math.floor(this.gameTime);
            if (currentSeconds !== this.lastGameTimeSeconds) {
                const minutes = Math.floor(currentSeconds / 60);
                const seconds = Math.floor(currentSeconds % 60);
                timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                this.lastGameTimeSeconds = currentSeconds;
            }
        }
    }
    
    spawnAsteroid(type = 'large', x = null, y = null, vx = null, vy = null) {
        let size;
        let speed;
        switch (type) {
            case 'large':
                size = 50 + Math.random() * 30;
                speed = 0.5 + Math.random() * 0.5;
                break;
            case 'medium':
                size = 30 + Math.random() * 15;
                speed = 1 + Math.random() * 0.5;
                break;
            case 'small':
                size = 15 + Math.random() * 10;
                speed = 1.5 + Math.random() * 0.5;
                break;
            default:
                size = 50; // Default size
                speed = 1; // Default speed
        }

        if (x === null) {
            if (this.isPortrait) {
                x = Math.random() * this.canvas.width;
                y = -50;
            } else {
                x = this.canvas.width + 50;
                y = Math.random() * this.canvas.height;
            }
        }
        this.asteroids.push(new Asteroid(x, y, type, this.isPortrait, size, speed, vx, vy));
    }
    
    spawnEnemy() {
        let x, y;
        if (this.isPortrait) {
            x = Math.random() * this.canvas.width;
            y = -50;
        } else {
            x = this.canvas.width + 50;
            y = Math.random() * this.canvas.height;
        }
        const types = ['straight', 'sine', 'zigzag', 'circle', 'dive', 'laser', 'pulse'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        this.enemies.push(new Enemy(x, y, type, this.isPortrait));
    }
    
    update(deltaTime) {
        if (this.gameState !== 'PLAYING') return;

        this.gameTime += deltaTime / 1000; // Convert ms to seconds
        
        const input = this.inputHandler.getInput();

        // Update player
        this.player.update(input, this.enemies, this.asteroids, this.isPortrait);
        
        // Player shooting
        if (input.fire) {
            this.player.shoot(this.bullets, this.sounds.shoot, Bullet, Laser, HomingMissile, this.isPortrait);
        }
        
        // Update bullets
        this.bullets = this.bullets.filter(bullet => {
            if (bullet instanceof HomingMissile) {
                return bullet.update(this.enemies);
            } else {
                bullet.update();
                if (this.isPortrait) {
                    return bullet.y < this.canvas.height + 50;
                } else {
                    return bullet.x < this.canvas.width + 50;
                }
            }
        });
        
        // Update enemy bullets
        this.enemyBullets = this.enemyBullets.filter(bullet => {
            bullet.update();
            
            // Special handling for pulse circles
            if (bullet.enemyType === 'pulse') {
                return bullet.life > 0;
            }
            
            return bullet.x > -50 && bullet.x < this.canvas.width + 50 && 
                   bullet.y > -50 && bullet.y < this.canvas.height + 50;
        });

        this.enemyLasers = this.enemyLasers.filter(laser => laser.update());

        this.enemyPulseCircles = this.enemyPulseCircles.filter(circle => circle.update());
        
        // Update asteroids
        this.asteroids = this.asteroids.filter(asteroid => {
            asteroid.update();
            if (this.isPortrait) {
                return asteroid.y < this.canvas.height + asteroid.size; // Keep if on screen or just off bottom
            } else {
                return asteroid.x > -asteroid.size; // Keep if on screen or just off left
            }
        });
        
        // Update enemies
        this.enemies = this.enemies.filter(enemy => {
            enemy.update(this.player.x, this.player.y, this.enemyBullets, this.enemyLasers, this.enemyPulseCircles);
            enemy.shoot(this.enemyBullets, this.player);
            return enemy.x > -50;
        });
        
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update();
            return particle.life > 0;
        });
        
        // Update background stars with subtle movement
        this.backgroundStars.forEach(star => {
            star.twinkle += star.twinkleSpeed;
            if (this.isPortrait) {
                star.y += 0.1; // Very slow downward movement
                // Wrap around screen
                if (star.y > this.canvas.height + 10) {
                    star.y = -10;
                    star.x = Math.random() * this.canvas.width;
                }
            } else {
                star.x -= 0.1; // Very slow leftward movement
                // Wrap around screen
                if (star.x < -10) {
                    star.x = this.canvas.width + 10;
                    star.y = Math.random() * this.canvas.height;
                }
            }
        });
        
        // Update powerups
        this.powerups = this.powerups.filter(powerup => {
            powerup.update();
            return powerup.x > -50;
        });
        
        // Update explosions
        this.explosions = this.explosions.filter(explosion => {
            explosion.update();
            return explosion.life > 0;
        });
        
        // Update text particles
        this.textParticles = this.textParticles.filter(particle => {
            particle.update();
            return particle.life > 0;
        });
        
        // Spawn powerups occasionally
        this.powerupSpawnTimer++;
        if (this.powerupSpawnTimer > 600 + Math.random() * 900) {
            this.spawnPowerup();
            this.powerupSpawnTimer = 0;
        }
        
        // Spawn asteroids
        this.asteroidSpawnTimer++;
        if (this.asteroidSpawnTimer > 120) { // Reduced frequency (every 2 seconds)
            const rand = Math.random();
            let type = 'medium';
            if (rand < 0.1) { // 10% large
                type = 'large';
            } else if (rand > 0.8) { // 20% small
                type = 'small';
            }
            this.spawnAsteroid(type);
            this.asteroidSpawnTimer = 0;
        }
        
        // Spawn enemies
        this.enemySpawnTimer++;
        if (this.enemySpawnTimer > 180) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }
        
        this.checkCollisions();
        this.updateUI(); // Update UI elements like timer
    }
    
    checkCollisions() {
        // Player bullets vs asteroids
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            for (let j = this.asteroids.length - 1; j >= 0; j--) {
                const bullet = this.bullets[i];
                const asteroid = this.asteroids[j];
                let collision = false;

                if (bullet instanceof Laser) {
                    collision = this.checkLaserCollision(bullet, asteroid);
                } else {
                    collision = this.checkCollision(bullet, asteroid);
                }

                if (collision) {
                    // For lasers, we don't remove the laser on hit, as it's continuous
                    if (!(bullet instanceof Laser)) {
                        this.bullets.splice(i, 1);
                    }
                    
                    const damageResult = asteroid.takeDamage(1);
                    this.createDebris(asteroid.x, asteroid.y, '#ffffff'); // Always create debris on hit
                    if (damageResult) {
                        this.asteroids.splice(j, 1);
                        this.score += 100;
                        this.updateUI();

                        if (damageResult === 'breakIntoMedium') {
                            const baseAngle = Math.atan2(asteroid.vy, asteroid.vx);
                            const spreadAngle = Math.PI / 6; // 30 degrees spread
                            const newSpeed = asteroid.speed * 1.5; // Faster than original
                            const mediumSize = 30 + Math.random() * 15;
                            const mediumSpeed = 1 + Math.random() * 0.5;

                            // Asteroid 1: slightly left
                            let angle1 = baseAngle - spreadAngle;
                            this.spawnAsteroid('medium', asteroid.x, asteroid.y, Math.cos(angle1) * newSpeed, Math.sin(angle1) * newSpeed, mediumSize, mediumSpeed);

                            // Asteroid 2: straight ahead
                            let angle2 = baseAngle;
                            this.spawnAsteroid('medium', asteroid.x, asteroid.y, Math.cos(angle2) * newSpeed, Math.sin(angle2) * newSpeed, mediumSize, mediumSpeed);

                            // Asteroid 3: slightly right
                            let angle3 = baseAngle + spreadAngle;
                            this.spawnAsteroid('medium', asteroid.x, asteroid.y, Math.cos(angle3) * newSpeed, Math.sin(angle3) * newSpeed, mediumSize, mediumSpeed);
                        } else if (damageResult === 'breakIntoSmall') {
                            const smallSize = 15 + Math.random() * 10;
                            const smallSpeed = 1.5 + Math.random() * 0.5;
                            for (let k = 0; k < 3; k++) {
                                this.spawnAsteroid('small', asteroid.x, asteroid.y, null, null, smallSize, smallSpeed);
                            }
                        } else if (damageResult === 'destroyed') {
                            // Debris already created above
                        }
                        this.sounds.explosion.play();
                    }
                    // If it's a laser, it can hit multiple targets, so don't break from inner loop
                    if (!(bullet instanceof Laser)) {
                        break; // Break from inner loop only if not a laser
                    }
                }
            }
        }
        
        // Player bullets vs enemies
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const bullet = this.bullets[i];
                const enemy = this.enemies[j];
                let collision = false;

                if (bullet instanceof Laser) {
                    collision = this.checkLaserCollision(bullet, enemy);
                } else {
                    collision = this.checkCollision(bullet, enemy);
                }

                if (collision) {
                    // For lasers, we don't remove the laser on hit, as it's continuous
                    if (!(bullet instanceof Laser)) {
                        this.bullets.splice(i, 1);
                    }

                    this.createEnemyExplosion(enemy.x, enemy.y);
                    this.sounds.hit.play();
                    this.enemies.splice(j, 1);
                    this.score += 200;
                    this.updateUI();
                    
                    // If it's a laser, it can hit multiple targets, so don't break from inner loop
                    if (!(bullet instanceof Laser)) {
                        break; // Break from inner loop only if not a laser
                    }
                }
            }
        }
        
        // Player vs asteroids (only if not dashing and not in godmode)
        if (!this.player.isDashing && !this.player.godMode) {
            for (let i = this.asteroids.length - 1; i >= 0; i--) {
                if (this.checkPlayerCollision(this.player, this.asteroids[i])) {
                    if (this.player.secondShip.length > 0) {
                        const destroyedShip = this.player.secondShip.pop(); // Remove one companion ship
                        this.createExplosion(destroyedShip.x, destroyedShip.y); // Explosion at companion ship's position
                        this.updateUI();
                    } else if (this.player.shield > 0) {
                        this.player.shield--;
                        this.createExplosion(this.player.x, this.player.y);
                        this.updateUI();
                    } else {
                        this.createExplosion(this.player.x, this.player.y);
                        this.gameOver();
                        return;
                    }
                }
            }
        }
        
        // Player vs enemies (only if not dashing and not in godmode)
        if (!this.player.isDashing && !this.player.godMode) {
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                if (this.checkPlayerCollision(this.player, this.enemies[i])) {
                    if (this.player.secondShip.length > 0) {
                        const destroyedShip = this.player.secondShip.pop();
                        this.createExplosion(destroyedShip.x, destroyedShip.y);
                        this.updateUI();
                    } else if (this.player.shield > 0) {
                        this.player.shield--;
                        this.createExplosion(this.player.x, this.player.y);
                        this.updateUI();
                    } else {
                        this.createExplosion(this.player.x, this.player.y);
                        this.gameOver();
                        return;
                    }
                }
            }
        }
        
        // Player vs enemy bullets (only if not dashing and not in godmode)
        if (!this.player.isDashing && !this.player.godMode) {
            for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
                if (this.checkPlayerCollision(this.player, this.enemyBullets[i])) {
                    if (this.player.secondShip.length > 0) {
                        const destroyedShip = this.player.secondShip.pop();
                        this.createExplosion(destroyedShip.x, destroyedShip.y);
                        this.enemyBullets.splice(i, 1); // Remove enemy bullet
                        this.updateUI();
                    } else if (this.player.shield > 0) {
                        this.player.shield--;
                        this.enemyBullets.splice(i, 1);
                        this.createExplosion(this.player.x, this.player.y);
                        this.updateUI();
                    } else {
                        this.createExplosion(this.player.x, this.player.y);
                        this.gameOver();
                        return;
                    }
                }
            }
        }

        // Player vs enemy lasers
        if (!this.player.isDashing && !this.player.godMode) {
            for (let i = this.enemyLasers.length - 1; i >= 0; i--) {
                if (this.checkPlayerLaserCollision(this.player, this.enemyLasers[i])) {
                    if (this.player.secondShip.length > 0) {
                        const destroyedShip = this.player.secondShip.pop();
                        this.createExplosion(destroyedShip.x, destroyedShip.y);
                        this.updateUI();
                    } else if (this.player.shield > 0) {
                        this.player.shield--;
                        this.createExplosion(this.player.x, this.player.y);
                        this.updateUI();
                    } else {
                        this.createExplosion(this.player.x, this.player.y);
                        this.gameOver();
                        return;
                    }
                }
            }
        }

        // Player vs enemy pulse circles
        if (!this.player.isDashing && !this.player.godMode) {
            for (let i = this.enemyPulseCircles.length - 1; i >= 0; i--) {
                if (this.checkPlayerCollision(this.player, this.enemyPulseCircles[i])) {
                    if (this.player.secondShip.length > 0) {
                        const destroyedShip = this.player.secondShip.pop();
                        this.createExplosion(destroyedShip.x, destroyedShip.y);
                        this.enemyPulseCircles.splice(i, 1); // Remove pulse circle
                        this.updateUI();
                    } else if (this.player.shield > 0) {
                        this.player.shield--;
                        this.enemyPulseCircles.splice(i, 1);
                        this.createExplosion(this.player.x, this.player.y);
                        this.updateUI();
                    } else {
                        this.createExplosion(this.player.x, this.player.y);
                        this.gameOver();
                        return;
                    }
                }
            }
        }
        
        // Player vs powerups
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            if (this.checkCollision(this.player, this.powerups[i])) {
                this.collectPowerup(this.powerups[i]);
                this.powerups.splice(i, 1);
            }
        }
    }
    
    checkCollision(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (obj1.size + obj2.size);
    }

    checkLaserCollision(laser, target) {
        const laserStartX = laser.x;
        const laserStartY = laser.y;
        const laserEndX = laser.x + Math.cos(laser.angle) * 200; // Laser length is 200
        const laserEndY = laser.y + Math.sin(laser.angle) * 200;

        const circleX = target.x;
        const circleY = target.y;
        const circleRadius = target.size;

        const dx = laserEndX - laserStartX;
        const dy = laserEndY - laserStartY;
        const lengthSq = dx * dx + dy * dy;
        let t = 0;
        if (lengthSq !== 0) {
            t = ((circleX - laserStartX) * dx + (circleY - laserStartY) * dy) / lengthSq;
            t = Math.max(0, Math.min(1, t)); // Clamp t between 0 and 1
        }

        const closestX = laserStartX + t * dx;
        const closestY = laserStartY + t * dy;

        const distDx = circleX - closestX;
        const distDy = circleY - closestY;
        const distance = Math.sqrt(distDx * distDx + distDy * distDy);

        return distance < (circleRadius + laser.width / 2);
    }

    checkPlayerLaserCollision(player, laser) {
        const dx = player.x - laser.x;
        const dy = player.y - laser.y;
        const laserAngle = laser.angle;
        const playerAngle = Math.atan2(dy, dx);
        const angleDiff = Math.abs(playerAngle - laserAngle);

        if (angleDiff < 0.1 || angleDiff > Math.PI * 2 - 0.1) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < laser.length) {
                return true;
            }
        }
        return false;
    }
    
    checkPlayerCollision(player, obj) {
        const dx = player.x - obj.x;
        const dy = player.y - obj.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (player.hitboxSize + obj.size);
    }
    
    createExplosion(x, y) {
        for (let i = 0; i < 8; i++) {
            this.particles.push(new Particle(x, y));
        }
    }
    
    createEnemyExplosion(x, y) {
        // Create bigger explosion for enemies
        for (let i = 0; i < 15; i++) {
            this.particles.push(new Particle(x, y, 2.5)); // Bigger particles
        }
        // Add extra debris for more visual impact
        for (let i = 0; i < 8; i++) {
            this.particles.push(new Debris(x, y, '#ff6666'));
        }
    }
    
    createDebris(x, y, color) {
        for (let i = 0; i < 6; i++) {
            this.particles.push(new Debris(x, y, color));
        }
    }
    
    createRainbowExplosion(x, y) {
        this.explosions.push(new RainbowExplosion(x, y));
    }
    
    collectPowerup(powerup) {
        switch (powerup.type) {
            case 'shield':
                this.player.shield = Math.min(this.player.shield + 1, 3); // Max 3 shields
                break;
            case 'mainWeapon':
                if (this.player.mainWeaponLevel >= 5) { // Max level reached
                    this.score += 1000;
                    this.textParticles.push(new TextParticle(powerup.x, powerup.y, '+1000', '#ffff00', 25, 45)); // Yellow, larger, faster fade
                } else {
                    this.player.mainWeaponLevel = Math.min(this.player.mainWeaponLevel + 1, 5); // Max level is 5
                }
                break;
            case 'sideWeapon':
                this.player.sideWeaponLevel = Math.min(this.player.sideWeaponLevel + 1, 2);
                break;
            case 'secondShip':
                if (this.player.secondShip.length < 2) { // Max 2 companion ships
                    const offset = (this.player.secondShip.length === 0) ? -40 : 40; // First one above, second below
                    this.player.secondShip.push({ 
                        x: this.player.x, 
                        y: this.player.y + offset, 
                        initialAngle: this.player.angle, // Store initial angle
                        offset: offset
                    });
                }
                break;
            case 'bomb':
                const bombRadius = 750; // 5x larger radius
                this.createRainbowExplosion(this.player.x, this.player.y, bombRadius);
                
                // Play bomb explosion sound
                this.sounds.explosion.play();
                
                // Destroy nearby enemies
                for (let i = this.enemies.length - 1; i >= 0; i--) {
                    const dx = this.enemies[i].x - this.player.x;
                    const dy = this.enemies[i].y - this.player.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < bombRadius) {
                        this.createExplosion(this.enemies[i].x, this.enemies[i].y);
                        this.createDebris(this.enemies[i].x, this.enemies[i].y, this.enemies[i].color);
                        this.enemies.splice(i, 1);
                        this.score += 200;
                    }
                }
                
                // Destroy nearby asteroids
                for (let i = this.asteroids.length - 1; i >= 0; i--) {
                    const dx = this.asteroids[i].x - this.player.x;
                    const dy = this.asteroids[i].y - this.player.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < bombRadius) {
                        this.createExplosion(this.asteroids[i].x, this.asteroids[i].y);
                        this.createDebris(this.asteroids[i].x, this.asteroids[i].y, '#888');
                        this.asteroids.splice(i, 1);
                        this.score += 100;
                    }
                }
                
                // Destroy nearby enemy bullets
                for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
                    const dx = this.enemyBullets[i].x - this.player.x;
                    const dy = this.enemyBullets[i].y - this.player.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < bombRadius) {
                        this.enemyBullets.splice(i, 1);
                    }
                }
                
                // Create secondary firework explosions at outer edge with staggered timing
                for (let delay = 0; delay < 6; delay++) {
                    setTimeout(() => {
                        for (let i = 0; i < 6; i++) {
                            const angle = (i / 6) * Math.PI * 2 + (delay * 0.4);
                            const edgeRadius = bombRadius * 0.6 + Math.random() * bombRadius * 0.4;
                            const x = this.player.x + Math.cos(angle) * edgeRadius;
                            const y = this.player.y + Math.sin(angle) * edgeRadius;
                            this.createRainbowExplosion(x, y, 200); // Smaller firework bursts
                        }
                    }, 200 + delay * 100);
                }
                
                this.updateUI();
                break;
        }
    }
    
    render() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background stars
        this.backgroundStars.forEach(star => {
            this.ctx.save();
            this.ctx.translate(star.x, star.y);
            
            const twinkleOpacity = star.opacity * (0.5 + 0.5 * Math.sin(star.twinkle));
            this.ctx.globalAlpha = twinkleOpacity;
            
            if (star.shape === 'point') {
                this.ctx.fillStyle = star.color;
                this.ctx.fillRect(-star.size/2, -star.size/2, star.size, star.size);
            } else if (star.shape === 'diamond') {
                this.ctx.strokeStyle = star.color;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(0, -star.size);
                this.ctx.lineTo(star.size, 0);
                this.ctx.lineTo(0, star.size);
                this.ctx.lineTo(-star.size, 0);
                this.ctx.closePath();
                this.ctx.stroke();
            } else if (star.shape === 'plus') {
                this.ctx.strokeStyle = star.color;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(0, -star.size);
                this.ctx.lineTo(0, star.size);
                this.ctx.moveTo(-star.size, 0);
                this.ctx.lineTo(star.size, 0);
                this.ctx.stroke();
            } else if (star.shape === 'star4') {
                this.ctx.strokeStyle = star.color;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                for (let i = 0; i < 8; i++) {
                    const a = i * Math.PI / 4;
                    const r = i % 2 === 0 ? star.size : star.size * 0.4;
                    if (i === 0) {
                        this.ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
                    } else {
                        this.ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                    }
                }
                this.ctx.closePath();
                this.ctx.stroke();
            } else if (star.shape === 'star8') {
                this.ctx.strokeStyle = star.color;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                for (let i = 0; i < 16; i++) {
                    const a = i * Math.PI / 8;
                    const r = i % 2 === 0 ? star.size : star.size * 0.6;
                    if (i === 0) {
                        this.ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
                    } else {
                        this.ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                    }
                }
                this.ctx.closePath();
                this.ctx.stroke();
            } else { // cross
                this.ctx.strokeStyle = star.color;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(-star.size, -star.size);
                this.ctx.lineTo(star.size, star.size);
                this.ctx.moveTo(star.size, -star.size);
                this.ctx.lineTo(-star.size, star.size);
                this.ctx.stroke();
            }
            
            this.ctx.restore();
        });
        if (this.gameState === 'PLAYING' || this.gameState === 'PAUSED') {
            // Draw powerups
            this.powerups.forEach(powerup => powerup.render(this.ctx));
            
            // Draw explosions
            this.explosions.forEach(explosion => explosion.render(this.ctx));
            
            // Draw text particles
            this.textParticles.forEach(particle => particle.render(this.ctx));
            
            // Draw game objects
            this.player.render(this.ctx);
            
            this.bullets.forEach(bullet => bullet.render(this.ctx));
            this.enemyBullets.forEach(bullet => bullet.render(this.ctx));
            this.enemyLasers.forEach(laser => laser.render(this.ctx));
            this.enemyPulseCircles.forEach(circle => circle.render(this.ctx));
            this.asteroids.forEach(asteroid => asteroid.render(this.ctx));
            this.enemies.forEach(enemy => enemy.render(this.ctx));
            this.particles.forEach(particle => particle.render(this.ctx));
        }
    }
    
    pauseGame() {
        this.gameState = 'PAUSED';
        document.getElementById('pause-overlay').style.display = 'flex';
        document.body.style.cursor = 'default';
    }
    
    resumeGame() {
        this.gameState = 'PLAYING';
        document.getElementById('pause-overlay').style.display = 'none';
        document.body.style.cursor = 'none';
    }
    
    setupCheatButtons() {
        document.getElementById('godmode-btn').addEventListener('click', () => {
            this.player.godMode = !this.player.godMode;
            this.updateCheatButtons();
        });
        
        document.getElementById('all-upgrades-btn').addEventListener('click', () => {
            this.player.shield = 3; // Max shields
            this.player.mainWeaponLevel = 5; // Max main weapon
            this.player.sideWeaponLevel = 2; // Max side weapon
            
            // Add two companion ships
            this.player.secondShip = []; // Clear existing to ensure max 2
            this.player.secondShip.push({
                x: this.player.x,
                y: this.player.y - 40,
                initialAngle: this.player.angle,
                offset: -40
            });
            this.player.secondShip.push({
                x: this.player.x,
                y: this.player.y + 40,
                initialAngle: this.player.angle,
                offset: 40
            });
            this.updateUI();
        });
        
        document.getElementById('spawn-bomb-btn').addEventListener('click', () => {
            this.powerups.push(new Powerup(this.player.x + 50, this.player.y, 'bomb'));
        });
    }
    
    updateCheatButtons() {
        const godmodeBtn = document.getElementById('godmode-btn');
        if (this.player.godMode) {
            godmodeBtn.textContent = 'Godmode: ON';
            godmodeBtn.style.background = '#44ff44';
        } else {
            godmodeBtn.textContent = 'Godmode: OFF';
            godmodeBtn.style.background = '#ff4444';
        }
    }
    
    
    
    gameLoop(currentTime) {
        if (!currentTime) currentTime = 0; // For the first call
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        if (this.gameState === 'PLAYING') {
            this.update(deltaTime);
        }
        this.render();
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }
}






class Powerup {
    constructor(x, y, type, isPortrait) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.size = 20;
        this.speed = 1;
        this.pulseTimer = 0;
        this.isPortrait = isPortrait;
        this.colors = {
            shield: '#00aaff', // Blue
            mainWeapon: '#8844ff', // Purple
            sideWeapon: '#00ff88', // Green
            secondShip: '#4488ff', // Cool blue
            bomb: '#aa44ff' // Cool purple
        };
    }
    
    update() {
        if (this.isPortrait) {
            this.y += this.speed;
        } else {
            this.x -= this.speed;
        }
        this.pulseTimer += 0.1;
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const color = this.colors[this.type];
        const pulse = 0.8 + 0.2 * Math.sin(this.pulseTimer);
        
        // Draw outer circle
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw inner circle
        ctx.globalAlpha = pulse * 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw icon
        ctx.globalAlpha = 1;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        
        switch (this.type) {
            case 'shield':
                // Shield icon
                ctx.beginPath();
                ctx.arc(0, 0, this.size * 0.4, 0, Math.PI, true);
                ctx.lineTo(-this.size * 0.4, this.size * 0.3);
                ctx.lineTo(0, this.size * 0.5);
                ctx.lineTo(this.size * 0.4, this.size * 0.3);
                ctx.closePath();
                ctx.stroke();
                break;
                
            case 'mainWeapon':
                // Arrow pointing right
                ctx.beginPath();
                ctx.moveTo(-this.size * 0.3, -this.size * 0.2);
                ctx.lineTo(this.size * 0.3, 0);
                ctx.lineTo(-this.size * 0.3, this.size * 0.2);
                ctx.moveTo(-this.size * 0.1, -this.size * 0.2);
                ctx.lineTo(-this.size * 0.1, this.size * 0.2);
                ctx.stroke();
                break;
                
            case 'sideWeapon':
                // Double arrows
                ctx.beginPath();
                ctx.moveTo(-this.size * 0.2, -this.size * 0.3);
                ctx.lineTo(this.size * 0.2, -this.size * 0.1);
                ctx.lineTo(-this.size * 0.2, this.size * 0.1);
                ctx.moveTo(-this.size * 0.2, this.size * 0.1);
                ctx.lineTo(this.size * 0.2, this.size * 0.3);
                ctx.lineTo(-this.size * 0.2, this.size * 0.5);
                ctx.stroke();
                break;
                
            case 'secondShip':
                // Two small ships
                ctx.beginPath();
                ctx.moveTo(-this.size * 0.3, -this.size * 0.2);
                ctx.lineTo(this.size * 0.1, -this.size * 0.2);
                ctx.lineTo(0, -this.size * 0.1);
                ctx.lineTo(this.size * 0.1, 0);
                ctx.lineTo(-this.size * 0.3, 0);
                ctx.closePath();
                ctx.moveTo(-this.size * 0.3, this.size * 0.2);
                ctx.lineTo(this.size * 0.1, this.size * 0.2);
                ctx.lineTo(0, this.size * 0.3);
                ctx.lineTo(this.size * 0.1, this.size * 0.4);
                ctx.lineTo(-this.size * 0.3, this.size * 0.4);
                ctx.closePath();
                ctx.stroke();
                break;
                
            case 'bomb':
                // Bomb icon
                ctx.beginPath();
                ctx.arc(0, this.size * 0.1, this.size * 0.3, 0, Math.PI * 2);
                ctx.stroke();
                // Fuse
                ctx.beginPath();
                ctx.moveTo(0, -this.size * 0.2);
                ctx.lineTo(-this.size * 0.1, -this.size * 0.4);
                ctx.lineTo(this.size * 0.1, -this.size * 0.3);
                ctx.stroke();
                break;
        }
        
        ctx.restore();
    }
}

class RainbowExplosion {
    constructor(x, y, maxRadius = 150) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = maxRadius;
        this.growthRate = maxRadius > 500 ? 8 : 3; // Faster growth for big explosions
        this.life = maxRadius > 500 ? 120 : 60; // Longer life for big explosions
        this.colors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#4400ff', '#ff00ff'];
        this.sparks = [];
        this.isFirework = maxRadius > 500;
        
        // Create sparks for dramatic effect
        const sparkCount = maxRadius > 500 ? 50 : 20;
        for (let i = 0; i < sparkCount; i++) {
            const angle = (i / sparkCount) * Math.PI * 2;
            const speed = this.isFirework ? (3 + Math.random() * 6) : (2 + Math.random() * 4);
            this.sparks.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: this.colors[Math.floor(Math.random() * this.colors.length)],
                life: this.isFirework ? 90 : 60,
                maxLife: this.isFirework ? 90 : 60,
                size: this.isFirework ? (4 + Math.random() * 4) : (3 + Math.random() * 3),
                trail: []
            });
        }
        
        // Add firework-specific effects
        if (this.isFirework) {
            // Create additional burst sparks
            for (let i = 0; i < 25; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 8 + Math.random() * 4;
                this.sparks.push({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    color: this.colors[Math.floor(Math.random() * this.colors.length)],
                    life: 60,
                    maxLife: 60,
                    size: 2 + Math.random() * 2,
                    trail: []
                });
            }
        }
    }
    
    update() {
        this.radius += this.growthRate;
        this.life--;
        
        if (this.radius >= this.maxRadius) {
            this.life = 0;
        }
        
        // Update sparks
        this.sparks = this.sparks.filter(spark => {
            // Add to trail for firework effect
            spark.trail.push({ x: spark.x, y: spark.y, opacity: spark.life / spark.maxLife });
            if (spark.trail.length > (this.isFirework ? 8 : 4)) {
                spark.trail.shift();
            }
            
            spark.x += spark.vx;
            spark.y += spark.vy;
            
            // Add gravity for firework effect
            if (this.isFirework) {
                spark.vy += 0.1; // Gravity
                spark.vx *= 0.995; // Air resistance
                spark.vy *= 0.995;
            } else {
                spark.vx *= 0.98;
                spark.vy *= 0.98;
            }
            
            spark.life--;
            return spark.life > 0;
        });
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const opacity = Math.max(0.1, this.life / (this.isFirework ? 120 : 60));
        
        // Draw rainbow rings with enhanced thickness for big explosions
        const ringWidth = this.isFirework ? 12 : 4;
        for (let i = 0; i < this.colors.length; i++) {
            const ringRadius = this.radius - (i * (ringWidth * 1.5));
            if (ringRadius > 0) {
                ctx.globalAlpha = opacity * (1 - i * 0.1);
                ctx.strokeStyle = this.colors[i];
                ctx.lineWidth = ringWidth;
                ctx.beginPath();
                ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
                ctx.stroke();
                
                // Add inner glow for big explosions
                if (this.isFirework) {
                    ctx.globalAlpha = opacity * 0.4;
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = ringWidth / 3;
                    ctx.beginPath();
                    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        }
        
        ctx.restore();
        
        // Draw sparks with trails
        this.sparks.forEach(spark => {
            const sparkOpacity = spark.life / spark.maxLife;
            
            // Draw trail
            spark.trail.forEach((point, index) => {
                ctx.save();
                ctx.globalAlpha = point.opacity * 0.3 * (index / spark.trail.length);
                ctx.fillStyle = spark.color;
                const size = spark.size * (index / spark.trail.length) * 0.5;
                ctx.fillRect(point.x - size/2, point.y - size/2, size, size);
                ctx.restore();
            });
            
            // Draw main spark
            ctx.save();
            ctx.globalAlpha = sparkOpacity;
            ctx.fillStyle = spark.color;
            ctx.fillRect(spark.x - spark.size/2, spark.y - spark.size/2, spark.size, spark.size);
            
            // Add spark glow for fireworks
            if (this.isFirework) {
                ctx.globalAlpha = sparkOpacity * 0.5;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(spark.x - spark.size/4, spark.y - spark.size/4, spark.size/2, spark.size/2);
            }
            
            ctx.restore();
        });
    }
}



class Particle {
    constructor(x, y, scale = 1) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 6 * scale;
        this.vy = (Math.random() - 0.5) * 6 * scale;
        this.life = 30;
        this.maxLife = 30;
        this.scale = scale;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95;
        this.vy *= 0.95;
        this.life--;
    }
    
    render(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
        const size = 4 * this.scale;
        ctx.fillRect(this.x - size/2, this.y - size/2, size, size);
    }
}

class Debris {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.angle = Math.random() * Math.PI * 2;
        this.angularVelocity = (Math.random() - 0.5) * 0.2;
        this.size = 2 + Math.random() * 4;
        this.life = 40;
        this.maxLife = 40;
        this.color = color;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.angle += this.angularVelocity;
        this.life--;
    }
    
    render(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-this.size, 0);
        ctx.lineTo(this.size, 0);
        ctx.moveTo(0, -this.size);
        ctx.lineTo(0, this.size);
        ctx.stroke();
        ctx.restore();
    }
}

class TextParticle {
    constructor(x, y, text, color = '#ffffff', size = 20, life = 60) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.size = size;
        this.life = life;
        this.maxLife = life;
        this.vy = -0.5; // Move upwards
        this.vx = (Math.random() - 0.5) * 0.5; // Slight horizontal drift
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }

    render(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// Start the game
new BlitzGame();
