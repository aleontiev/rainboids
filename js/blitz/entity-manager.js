// EntityManager - Controls movement of all entities in Rainboids: Blitz
import { Player } from "./entities/player.js";
import { Powerup } from "./entities/powerup.js";
import {
  Enemy,
  Bullet,
  Laser,
} from "./entities/enemy.js";
import { MiniBoss } from "./entities/miniboss.js";
import { HomingMissile } from "./entities/homing-missile.js";
import { Boss } from "./entities/boss.js";
import { TextParticle, Debris } from "./entities/particle.js";
import { Asteroid } from "./entities/asteroid.js";
import { Metal } from "./entities/metal.js";
import { GAME_CONFIG, COLORS, ENEMY_TYPES } from "./constants.js";

export class EntityManager {
  constructor(canvas, isPortrait) {
    this.canvas = canvas;
    this.isPortrait = isPortrait;
    
    // Initialize all entity arrays
    this.player = null;
    this.bullets = [];
    this.enemyBullets = [];
    this.enemyLasers = [];
    this.asteroids = [];
    this.enemies = [];
    this.allEnemies = []; // Unified enemy list for collision detection
    this.metals = []; // Indestructible metal objects
    this.particles = [];
    this.powerups = [];
    this.homingMissiles = [];
    this.miniBosses = [];
    this.boss = null;
    this.lasers = [];
  }
  
  // Initialize player
  initializePlayer() {
    let playerX, playerY;
    if (this.isPortrait) {
      playerX = this.canvas.width / 2;
      playerY = this.canvas.height - 100; // Bottom center
    } else {
      playerX = 100; // Left side
      playerY = this.canvas.height / 2; // Center
    }
    this.player = new Player(playerX, playerY);
  }
  
  // Reset all entities
  reset() {
    this.bullets = [];
    this.enemyBullets = [];
    this.enemyLasers = [];
    this.asteroids = [];
    this.enemies = [];
    this.allEnemies = [];
    this.metals = [];
    this.particles = [];
    this.powerups = [];
    this.homingMissiles = [];
    this.miniBosses = [];
    this.boss = null;
    this.lasers = [];
    this.initializePlayer();
  }
  
  // Update all entities
  update(input, autoaim, timeSlowActive, slowdownFactor = 1.0) {
    // Update unified enemy list
    this.allEnemies = [...this.enemies, ...this.miniBosses];
    if (this.boss) {
      this.allEnemies.push(this.boss);
    }
    
    // Update player
    if (this.player) {
      this.player.update(
        input,
        this.allEnemies,
        this.asteroids,
        this.isPortrait,
        autoaim,
        this.player.mainWeaponLevel,
        timeSlowActive,
        this.boss
      );
    }
    
    // Update enemies
    this.enemies = this.enemies.filter(enemy => {
      enemy.update(
        this.player?.x || 0,
        this.player?.y || 0,
        this.enemyBullets,
        this.enemyLasers,
        slowdownFactor,
        (newEnemy) => this.enemies.push(newEnemy) // Callback to add new enemies
      );
      
      // Remove enemies that are off-screen
      if (this.isPortrait) {
        return enemy.y < this.canvas.height + 100;
      } else {
        return enemy.x > -100;
      }
    });
    
    // Update minibosses
    this.miniBosses = this.miniBosses.filter(miniBoss => {
      const result = miniBoss.update(this.player?.x || 0, this.player?.y || 0, slowdownFactor);
      return result !== "final_explosion" && !miniBoss.finalExplosionTriggered;
    });
    
    // Update boss
    if (this.boss) {
      this.boss.update(this.player?.x || 0, this.player?.y || 0);
    }
    
    // Update bullets
    this.bullets = this.bullets.filter(bullet => bullet.update(slowdownFactor));
    this.enemyBullets = this.enemyBullets.filter(bullet => bullet.update(slowdownFactor));
    this.enemyLasers = this.enemyLasers.filter(laser => laser.update(slowdownFactor));
    this.lasers = this.lasers.filter(laser => laser.update(slowdownFactor));
    
    // Update homing missiles
    this.homingMissiles = this.homingMissiles.filter(missile => 
      missile.update(this.allEnemies, slowdownFactor)
    );
    
    // Update asteroids
    this.asteroids = this.asteroids.filter(asteroid => {
      asteroid.update(slowdownFactor);
      
      // Remove asteroids that are off-screen
      if (this.isPortrait) {
        return asteroid.y < this.canvas.height + 100;
      } else {
        return asteroid.x > -100;
      }
    });
    
    // Update powerups
    this.powerups = this.powerups.filter(powerup => {
      powerup.update();
      
      // Remove powerups that are off-screen
      if (this.isPortrait) {
        return powerup.y < this.canvas.height + 100;
      } else {
        return powerup.x > -100;
      }
    });
    
    // Update particles
    this.particles = this.particles.filter(particle => particle.update(slowdownFactor));
  }
  
  // Spawn enemy
  spawnEnemy() {
    let x, y;
    if (this.isPortrait) {
      x = Math.random() * this.canvas.width;
      y = -50;
    } else {
      x = this.canvas.width + 50;
      y = Math.random() * this.canvas.height;
    }
    
    const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
    this.enemies.push(new Enemy(x, y, type, this.isPortrait));
  }
  
  // Spawn asteroid
  spawnAsteroid() {
    let x, y;
    if (this.isPortrait) {
      x = Math.random() * this.canvas.width;
      y = -50;
    } else {
      x = this.canvas.width + 50;
      y = Math.random() * this.canvas.height;
    }
    this.asteroids.push(new Asteroid(x, y, this.isPortrait));
  }
  
  // Spawn powerup
  spawnPowerup() {
    let x, y;
    if (this.isPortrait) {
      x = Math.random() * this.canvas.width;
      y = -50;
    } else {
      x = this.canvas.width + 50;
      y = Math.random() * this.canvas.height;
    }
    
    // Weighted powerup selection - rainbow spawns 33% as often as others
    const regularTypes = ["shield", "mainWeapon", "sideWeapon", "secondShip", "bomb"];
    const random = Math.random();
    
    let type;
    if (random < 0.833) { // 83.3% chance for regular powerups (5/6 original chance)
      type = regularTypes[Math.floor(Math.random() * regularTypes.length)];
    } else { // 16.7% chance for rainbow (1/6 original chance, but 33% of individual regular type)
      type = "rainbowStar";
    }

    this.powerups.push(new Powerup(x, y, type, this.isPortrait));
  }
  
  // Spawn metal
  spawnMetal() {
    let x, y;
    if (this.isPortrait) {
      x = Math.random() * this.canvas.width;
      y = -50;
    } else {
      x = this.canvas.width + 50;
      y = Math.random() * this.canvas.height;
    }
    this.metals.push(new Metal(x, y, this.isPortrait));
  }
  
  // Spawn miniboss
  spawnMiniBoss(type = "alpha") {
    let x, y;
    if (this.isPortrait) {
      x = this.canvas.width / 2;
      y = -100;
    } else {
      x = this.canvas.width + 100;
      y = this.canvas.height / 2;
    }
    this.miniBosses.push(new MiniBoss(x, y, type, this.isPortrait, this.canvas.width));
  }
  
  // Spawn boss
  spawnBoss() {
    let x, y;
    if (this.isPortrait) {
      x = this.canvas.width / 2;
      y = -200;
    } else {
      x = this.canvas.width + 200;
      y = this.canvas.height / 2;
    }
    this.boss = new Boss(x, y, this.isPortrait, this.canvas.width, this.canvas.height);
  }
  
  // Add bullet
  addBullet(bullet) {
    this.bullets.push(bullet);
  }
  
  // Add enemy bullet
  addEnemyBullet(bullet) {
    this.enemyBullets.push(bullet);
  }
  
  // Add laser
  addLaser(laser) {
    this.lasers.push(laser);
  }
  
  // Add enemy laser
  addEnemyLaser(laser) {
    this.enemyLasers.push(laser);
  }
  
  // Add homing missile
  addHomingMissile(missile) {
    this.homingMissiles.push(missile);
  }
  
  // Add particle
  addParticle(particle) {
    this.particles.push(particle);
  }
  
  // Add text particle
  addTextParticle(x, y, text, color = "#ffffff") {
    this.particles.push(new TextParticle(x, y, text, color));
  }
  
  // Add debris particle
  addDebris(x, y, color = "#ffffff") {
    this.particles.push(new Debris(x, y, color));
  }
  
  // Render all entities
  render(ctx, sceneOpacity = 1.0) {
    ctx.globalAlpha = sceneOpacity;
    
    // Render background entities first
    this.asteroids.forEach(asteroid => asteroid.render(ctx));
    this.metals.forEach(metal => metal.render(ctx));
    
    // Render enemies and bosses
    this.enemies.forEach(enemy => enemy.render(ctx));
    this.miniBosses.forEach(miniBoss => miniBoss.render(ctx));
    if (this.boss) {
      this.boss.render(ctx);
    }
    
    // Render projectiles
    this.bullets.forEach(bullet => bullet.render(ctx));
    this.enemyBullets.forEach(bullet => bullet.render(ctx));
    this.lasers.forEach(laser => laser.render(ctx));
    this.enemyLasers.forEach(laser => laser.render(ctx));
    this.homingMissiles.forEach(missile => missile.render(ctx));
    
    // Render powerups
    this.powerups.forEach(powerup => powerup.render(ctx));
    
    // Render player
    if (this.player) {
      this.player.render(ctx);
    }
    
    // Render particles on top
    this.particles.forEach(particle => particle.render(ctx));
    
    ctx.globalAlpha = 1.0;
  }
  
  // Get entity counts for UI
  getCounts() {
    return {
      enemies: this.enemies.length,
      bullets: this.bullets.length,
      asteroids: this.asteroids.length,
      powerups: this.powerups.length,
      particles: this.particles.length,
      miniBosses: this.miniBosses.length,
      hasBoss: !!this.boss
    };
  }
}