// CollisionManager - Handles all collision detection and responses

import { MiniBoss } from "./entities/miniboss.js";
import { Boss } from "./entities/boss.js";

export class CollisionManager {
  constructor(game) {
    this.game = game;
    this.entities = game.entities;
  }

  // Main collision detection method
  update() {
    // Skip player collision detection if player is dying or dead
    const skipPlayerCollisions =
      this.game.state.state === "DYING" ||
      this.game.state.state === "GAME_OVER";

    // Collision detection is now working properly

    if (!skipPlayerCollisions) {
      // All player damage collisions
      this.handlePlayerCollisions();
    }

    // All enemy damage collisions
    this.handleEnemyCollisions();

    // All asteroid-related collisions
    this.handleAsteroidCollisions();

    // Metal bouncing collisions
    this.handleMetalBounceCollisions();

    // Metal physics collisions
    if (!skipPlayerCollisions) {
      this.handlePlayerMetalCollisions();
    }
    this.handleEnemyMetalCollisions();

    // Special collisions
    this.handlePlayerPowerupCollisions();
    this.handleContinuousLaserCollisions();
  }

  // Handle all collisions that can damage the player
  handlePlayerCollisions() {
    const player = this.game.player;
    if (!player) return;

    // Define all damage sources with their properties
    const damageSources = [
      { entities: this.entities.asteroids, damage: 1, type: "asteroid" },
      { entities: this.entities.enemies, damage: 1, type: "enemy" },
      { entities: this.entities.miniBosses, damage: 1, type: "miniBoss" },
      { entities: this.entities.bosses, damage: 1, type: "boss" },
      {
        entities: this.entities.enemyBullets,
        damage: 1,
        type: "enemyBullet",
        remove: true,
      },
      {
        entities: this.entities.enemyLasers,
        damage: 1,
        type: "enemyLaser",
        remove: true,
        isLaser: true,
      },
      {
        entities: this.entities.missiles.filter(missile => !missile.isPlayerMissile),
        damage: 2,
        type: "missile",
        remove: true,
      },
      {
        entities: this.entities.spreadingBullets,
        damage: 1,
        type: "spreadingBullet",
        remove: true,
      },
    ];

    // Check collisions with all damage sources
    for (const source of damageSources) {
      if (this.checkPlayerDamageCollisions(player, source)) {
        return; // Player can only take one hit per frame
      }
    }

    // Non-damaging collisions
    this.handlePlayerMetalCollisions();
  }

  // Handle all collisions that can damage enemies
  handleEnemyCollisions() {
    // Player bullets vs all enemy types
    this.checkBulletEnemyCollisions(
      this.entities.bullets,
      this.entities.enemies,
      1
    );
    this.checkBulletEnemyCollisions(
      this.entities.bullets,
      this.entities.miniBosses,
      1
    );
    this.checkBulletEnemyCollisions(
      this.entities.bullets,
      this.entities.bosses,
      1
    );
  }

  // Handle all asteroid-related collisions
  handleAsteroidCollisions() {
    const asteroids = this.entities.asteroids;
    if (!asteroids || asteroids.length === 0) return;

    // Check all potential collisions with asteroids
    for (let i = asteroids.length - 1; i >= 0; i--) {
      const asteroid = asteroids[i];
      // All asteroids in array are alive

      // Check asteroid vs all damage sources
      this.checkAsteroidCollisions(asteroid, i);
    }

    // Check asteroid-to-asteroid collisions (separate pass to avoid double processing)
    this.checkAsteroidToAsteroidCollisions();

    // All bullet/laser bouncing off metals
    this.handleMetalBounceCollisions();
  }
  
  // Check all possible collisions for a single asteroid
  checkAsteroidCollisions(asteroid, asteroidIndex) {
    // Define all potential collision sources
    const collisionSources = [
      { entities: this.entities.bullets, type: 'playerBullet', damage: 1, remove: true },
      { entities: this.entities.enemyBullets, type: 'enemyBullet', damage: 1, remove: true },
      { entities: this.entities.enemyLasers, type: 'enemyLaser', damage: 1, remove: true, isLaser: true },
      { entities: [this.game.player], type: 'player', damage: 1, remove: false },
      { entities: this.entities.enemies, type: 'enemy', damage: 1, remove: false },
      { entities: this.entities.miniBosses, type: 'miniBoss', damage: 2, remove: false },
      { entities: this.entities.bosses, type: 'boss', damage: 3, remove: false }
    ];

    for (const source of collisionSources) {
      if (this.checkAsteroidSourceCollisions(asteroid, asteroidIndex, source)) {
        return; // Asteroid was destroyed, no need to check further
      }
    }
  }
  
  // Check collisions between asteroid and a specific entity type
  checkAsteroidSourceCollisions(asteroid, asteroidIndex, source) {
    // Check if entities array exists and has items
    if (!source.entities || source.entities.length === 0) {
      return false;
    }
    
    for (let i = source.entities.length - 1; i >= 0; i--) {
      const entity = source.entities[i];
      if (!entity) continue;
      
      let collision = false;
      
      if (source.isLaser) {
        collision = this.lineCircleCollision(entity, asteroid);
      } else {
        const distance = Math.sqrt(
          Math.pow(asteroid.x - entity.x, 2) + Math.pow(asteroid.y - entity.y, 2)
        );
        collision = distance < asteroid.size + (entity.radius || entity.hitboxSize || entity.size || 10);
      }
      
      if (collision) {
        // Handle collision based on entity type
        if (source.type === 'player') {
          // Player collision handled elsewhere, just damage asteroid
          return this.handleAsteroidDamage(asteroid, asteroidIndex, source.damage, entity.x, entity.y);
        } else if (source.type.includes('enemy') || source.type.toLowerCase().includes('boss')) {
          // Enemy collision - damage both
          this.handleEnemyAsteroidCollision(entity, asteroid, asteroidIndex);
          return false; // Don't destroy asteroid immediately, let damage system handle it
        } else {
          // Bullet/laser collision
          // Entity removal handled by caller via array splice
          return this.handleAsteroidDamage(asteroid, asteroidIndex, source.damage, entity.x, entity.y);
        }
      }
    }
    return false;
  }
  
  // Handle asteroid-to-asteroid collisions with physics
  checkAsteroidToAsteroidCollisions() {
    const asteroids = this.entities.asteroids;
    
    for (let i = 0; i < asteroids.length - 1; i++) {
      const asteroid1 = asteroids[i];
      // All asteroids in array are alive
      
      for (let j = i + 1; j < asteroids.length; j++) {
        const asteroid2 = asteroids[j];
        // All asteroids in array are alive
        
        const distance = Math.sqrt(
          Math.pow(asteroid1.x - asteroid2.x, 2) + Math.pow(asteroid1.y - asteroid2.y, 2)
        );
        
        if (distance < asteroid1.radius + asteroid2.radius) {
          this.handleAsteroidToAsteroidCollision(asteroid1, asteroid2, i, j);
        }
      }
    }
  }
  
  // Handle collision between two asteroids
  handleAsteroidToAsteroidCollision(asteroid1, asteroid2, index1, index2) {
    // Calculate collision vector
    const dx = asteroid2.x - asteroid1.x;
    const dy = asteroid2.y - asteroid1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return; // Avoid division by zero
    
    // Normalize collision vector
    const nx = dx / distance;
    const ny = dy / distance;
    
    // Calculate relative velocity
    const dvx = asteroid2.vx - asteroid1.vx;
    const dvy = asteroid2.vy - asteroid1.vy;
    
    // Calculate relative velocity in collision normal direction
    const dvn = dvx * nx + dvy * ny;
    
    // Do not resolve if velocities are separating
    if (dvn > 0) return;
    
    // Calculate restitution (bounciness)
    const restitution = 0.8;
    
    // Calculate impulse scalar
    const impulse = -(1 + restitution) * dvn;
    
    // Calculate masses (based on size)
    const mass1 = this.getAsteroidMass(asteroid1);
    const mass2 = this.getAsteroidMass(asteroid2);
    const totalMass = mass1 + mass2;
    
    // Apply impulse
    const impulse1 = impulse * mass2 / totalMass;
    const impulse2 = impulse * mass1 / totalMass;
    
    // Update velocities
    asteroid1.vx -= impulse1 * nx;
    asteroid1.vy -= impulse1 * ny;
    asteroid2.vx += impulse2 * nx;
    asteroid2.vy += impulse2 * ny;
    
    // Separate asteroids to prevent overlap
    const overlap = asteroid1.radius + asteroid2.radius - distance;
    const separationDistance = overlap / 2 + 1;
    
    asteroid1.x -= nx * separationDistance;
    asteroid1.y -= ny * separationDistance;
    asteroid2.x += nx * separationDistance;
    asteroid2.y += ny * separationDistance;
    
    // Apply minor damage based on impact velocity
    const impactSpeed = Math.abs(dvn);
    const damage = Math.min(1, Math.floor(impactSpeed / 3)); // Minor damage for collisions
    
    if (damage > 0) {
      // Both asteroids take minor damage
      this.handleAsteroidDamage(asteroid1, index1, damage, asteroid1.x, asteroid1.y);
      this.handleAsteroidDamage(asteroid2, index2, damage, asteroid2.x, asteroid2.y);
    }
    
    // Visual/audio effects
    this.game.effects.createAsteroidHitEffect((asteroid1.x + asteroid2.x) / 2, (asteroid1.y + asteroid2.y) / 2);
    if (impactSpeed > 2) {
      this.game.audio.play(this.game.audio.sounds.hit);
    }
  }
  
  // Get asteroid mass for physics calculations
  getAsteroidMass(asteroid) {
    switch (asteroid.size || asteroid.type) {
      case 'large': return 3;
      case 'medium': return 2;
      case 'small': return 1;
      default: return 2; // Default to medium
    }
  }
  
  // Handle enemy-asteroid collision
  handleEnemyAsteroidCollision(enemy, asteroid, asteroidIndex) {
    // Damage the enemy
    if (enemy.takeDamage) {
      const result = enemy.takeDamage(1, asteroid.x, asteroid.y);
      if (result === 'destroyed') {
        this.game.handleEnemyDamage(enemy, 1, asteroid.x, asteroid.y);
      }
    }
    
    // Damage the asteroid
    this.handleAsteroidDamage(asteroid, asteroidIndex, 1, enemy.x, enemy.y);
    
    // Visual effects
    this.game.effects.createExplosion(asteroid.x, asteroid.y, 5, 2);
  }
  
  // Unified asteroid damage handler
  handleAsteroidDamage(asteroid, asteroidIndex, damage, impactX, impactY) {
    const damageResult = asteroid.takeDamage ? asteroid.takeDamage(damage, impactX, impactY) : 'destroyed';
    
    this.game.effects.createAsteroidHitEffect(impactX, impactY);
    
    if (damageResult && damageResult !== 'damaged') {
      // Asteroid destroyed - remove and handle breakup
      this.entities.asteroids.splice(asteroidIndex, 1);
      this.game.effects.createDebris(asteroid.x, asteroid.y, "#ffffff");
      this.game.audio.play(this.game.audio.sounds.asteroidExplosion);
      this.game.state.addScore(50);
      
      // Handle breakup
      if (damageResult === "breakIntoMedium") {
        this.createAsteroidBreakup(asteroid, "medium", 2);
      } else if (damageResult === "breakIntoSmall") {
        this.createAsteroidBreakup(asteroid, "small", 2);
      }
      
      return true; // Asteroid was destroyed
    }
    
    return false; // Asteroid still alive
  }
  
  // Create asteroid breakup fragments
  createAsteroidBreakup(originalAsteroid, newSize, count) {
    for (let k = 0; k < count; k++) {
      const baseAngle = Math.atan2(originalAsteroid.vy, originalAsteroid.vx);
      const splitAngle = baseAngle + (k === 0 ? -0.3 : 0.3); // ±17 degrees
      const speed = Math.sqrt(
        originalAsteroid.vx * originalAsteroid.vx + originalAsteroid.vy * originalAsteroid.vy
      ) * (0.8 + Math.random() * 0.4); // 80-120% of original speed
      
      this.entities.spawnAsteroid(
        newSize,
        originalAsteroid.x + (Math.random() - 0.5) * 40,
        originalAsteroid.y + (Math.random() - 0.5) * 40,
        Math.cos(splitAngle) * speed,
        Math.sin(splitAngle) * speed
      );
    }
  }

  // COLLISION HELPER METHODS

  // Check if player collides with damage sources
  checkPlayerDamageCollisions(player, source) {
    // Check if entities array exists and has items
    if (!source.entities || source.entities.length === 0) {
      return false;
    }
    
    for (let i = source.entities.length - 1; i >= 0; i--) {
      const entity = source.entities[i];
      // Entities in arrays are alive - no need to check alive property

      let collision = false;

      if (source.isLaser) {
        // Laser collision (line-circle)
        collision = this.lineCircleCollision(entity, player);
      } else {
        // Standard circular collision
        const distance = Math.sqrt(
          Math.pow(player.x - entity.x, 2) + Math.pow(player.y - entity.y, 2)
        );
        collision = distance < player.hitboxSize + (entity.radius || entity.size || 10);
        
        // Collision detection working properly
      }

      if (collision) {
        // Handle player damage
        this.applyPlayerDamage(player, source.damage, source.type, entity);

        // Remove entity if specified
        if (source.remove) {
          source.entities.splice(i, 1);
        }

        return true; // Player took damage
      }
    }
    return false; // No collision
  }

  // Apply damage to player
  applyPlayerDamage(player, damage, type, sourceEntity) {
    console.log(`🎯 Player hit by ${type}! Current shields: ${player.shield}, godMode: ${player.godMode}, isShielding: ${player.isShielding}, rainbowInvulnerable: ${player.rainbowInvulnerable}`);
    
    // Check for godmode
    if (player.godMode) {
      console.log("⚡ Damage blocked by god mode");
      return; // God mode blocks all damage
    }
    
    // Check for rainbow invulnerability
    if (player.rainbowInvulnerable) {
      return; // Rainbow invulnerability blocks damage
    }
    
    // Check for active shielding
    if (player.isShielding) {
      return; // Active shield blocks damage
    }

    // Check if player has second ship - destroy that first
    if (player.secondShip && player.secondShip.length > 0) {
      const destroyedShip = player.secondShip.pop();
      this.game.effects.createExplosion(destroyedShip.x, destroyedShip.y);
      this.game.progress.update();
      
      // Audio and visual feedback
      this.game.audio.play(this.game.audio.sounds.hit);
      return; // Second ship absorbed the hit
    }

    // Check if player has shield power - use that
    if (player.shield > 0) {
      player.shield -= damage;
      this.game.effects.createExplosion(player.x, player.y);
      this.game.progress.update();
      
      // Audio and visual feedback
      this.game.audio.play(this.game.audio.sounds.hit);
      return; // Shield absorbed the hit
    }

    // No protection - player dies
    console.log("🔥 PLAYER DEATH: No shields left", {
      type: type,
      sourceEntity: {
        x: sourceEntity.x,
        y: sourceEntity.y,
        size: sourceEntity.size || sourceEntity.radius,
      }
    });
    
    this.game.death.start();
  }

  // Helper for bullet-enemy collisions
  checkBulletEnemyCollisions(bullets, enemies, damage) {
    if (!bullets || bullets.length === 0 || !enemies || enemies.length === 0) {
      return;
    }
    
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      // All bullets in array are alive

      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];
        // All enemies in array are alive

        const distance = Math.sqrt(
          Math.pow(bullet.x - enemy.x, 2) + Math.pow(bullet.y - enemy.y, 2)
        );

        if (distance < (bullet.size || bullet.radius || 5) + (enemy.radius || enemy.size || 10)) {
          // Damage enemy and get result
          const damageResult = this.game.handleEnemyDamage(enemy, damage, bullet.x, bullet.y);

          // Remove bullet
          bullets.splice(i, 1);

          // Remove enemy if destroyed
          if (damageResult === "destroyed") {
            this.game.entities.removeDestroyedEnemy(enemy);
          }

          break; // Bullet can only hit one enemy
        }
      }
    }
  }

  // Helper for bullet-asteroid collisions
  checkBulletAsteroidCollisions(bullets, asteroids) {
    if (!bullets || bullets.length === 0 || !asteroids || asteroids.length === 0) {
      return;
    }
    
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      // All bullets in array are alive

      for (let j = asteroids.length - 1; j >= 0; j--) {
        const asteroid = asteroids[j];
        // All asteroids in array are alive

        const distance = Math.sqrt(
          Math.pow(bullet.x - asteroid.x, 2) +
            Math.pow(bullet.y - asteroid.y, 2)
        );

        if (distance < bullet.radius + asteroid.radius) {
          // Handle asteroid destruction
          this.handleAsteroidDestruction(asteroid, bullet.x, bullet.y);

          // Remove bullet
          bullets.splice(i, 1);

          break;
        }
      }
    }
  }

  // Helper for laser-asteroid collisions
  checkLaserAsteroidCollisions(lasers, asteroids) {
    for (const laser of lasers) {
      // All lasers in array are alive

      for (let j = asteroids.length - 1; j >= 0; j--) {
        const asteroid = asteroids[j];
        // All asteroids in array are alive

        if (this.lineCircleCollision(laser, asteroid)) {
          this.handleAsteroidDestruction(asteroid, asteroid.x, asteroid.y);
        }
      }
    }
  }

  // Handle all metal bouncing collisions
  handleMetalBounceCollisions() {
    // Player bullets and lasers bouncing off metals (handled by specific method)
    this.handlePlayerBulletMetalCollisions();
    
    // Enemy bullets bouncing off metals
    this.checkBulletMetalBouncing(
      this.entities.enemyBullets,
      this.entities.metals
    );

    // Enemy lasers bouncing off metals
    this.checkLaserMetalBouncing(
      this.entities.enemyLasers,
      this.entities.metals
    );
  }

  // Helper for bullet-metal bouncing
  checkBulletMetalBouncing(bullets, metals) {
    for (const bullet of bullets) {
      // All bullets in array are alive

      for (const metal of metals) {
        // All metals in array are alive

        // Use metal's proper collision detection method
        const hitSegment = metal.checkBulletCollision(bullet);
        if (hitSegment) {
          // Use metal's bounce calculation method
          const bounceResult = metal.calculateBounceDirection(bullet, hitSegment);
          if (bounceResult) {
            // Update bullet angle and optionally position
            bullet.angle = bounceResult.angle;
            if (bounceResult.x !== undefined && bounceResult.y !== undefined) {
              bullet.x = bounceResult.x;
              bullet.y = bounceResult.y;
            }
          }
        }
      }
    }
  }

  // Helper for laser-metal bouncing (for projectile-style lasers)
  checkLaserMetalBouncing(lasers, metals) {
    for (let i = lasers.length - 1; i >= 0; i--) {
      const laser = lasers[i];
      // All lasers in array are alive

      for (const metal of metals) {
        // All metals in array are alive

        const collisionSegment = metal.checkBulletCollision(laser);
        if (collisionSegment) {
          // Handle laser bouncing off metal using metal's laser bounce calculation
          const bounceResult = metal.calculateLaserBounceDirection(
            laser,
            collisionSegment
          );
          
          // Check if laser has registerBounce method (like player lasers)
          if (laser.registerBounce && typeof laser.registerBounce === 'function') {
            const shouldDestroy = laser.registerBounce(bounceResult.angle);
            if (shouldDestroy) {
              // Laser exceeded max bounces, remove it
              lasers.splice(i, 1);
            }
          } else {
            // For enemy lasers without bounce tracking, just update angle
            laser.angle = bounceResult.angle;
            // Move laser away from metal to prevent multiple bounces
            laser.x += Math.cos(laser.angle) * laser.speed * 3;
            laser.y += Math.sin(laser.angle) * laser.speed * 3;
          }
          break;
        }
      }
    }
  }

  handlePlayerPowerupCollisions() {
    if (!this.entities.powerups || this.entities.powerups.length === 0) {
      return;
    }
    
    for (let i = this.entities.powerups.length - 1; i >= 0; i--) {
      if (this.checkCollision(this.game.player, this.entities.powerups[i])) {
        this.game.powerup.collect(this.entities.powerups[i]);
        this.entities.powerups.splice(i, 1);
      }
    }
  }

  handlePlayerMetalCollisions() {
    for (const metal of this.entities.metals) {
      const collisionSegment = metal.checkPlayerCollision(this.game.player);
      if (collisionSegment) {
        // Calculate segment properties
        const dx = collisionSegment.x2 - collisionSegment.x1;
        const dy = collisionSegment.y2 - collisionSegment.y1;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length > 0) {
          // Get perpendicular normal vector (pointing outward from metal)
          const nx = -dy / length;
          const ny = dx / length;

          // Determine which side of the line the player is on
          const playerRelativeX = this.game.player.x - collisionSegment.x1;
          const playerRelativeY = this.game.player.y - collisionSegment.y1;
          const side = playerRelativeX * nx + playerRelativeY * ny > 0 ? 1 : -1;

          // Calculate collision point on the segment
          const segmentFraction = Math.max(0, Math.min(1, 
            ((this.game.player.x - collisionSegment.x1) * dx + 
             (this.game.player.y - collisionSegment.y1) * dy) / (length * length)
          ));
          const collisionPointX = collisionSegment.x1 + segmentFraction * dx;
          const collisionPointY = collisionSegment.y1 + segmentFraction * dy;

          // Push player away from metal surface
          const pushDistance = this.game.player.hitboxSize + metal.thickness / 2 + 2;
          const collisionNormalX = nx * side;
          const collisionNormalY = ny * side;
          
          // Set player position to safe distance from metal
          this.game.player.x = collisionPointX + collisionNormalX * pushDistance;
          this.game.player.y = collisionPointY + collisionNormalY * pushDistance;

          // Physics-based collision with proper mass ratios
          // Ship mass = 0.5, Metal mass = 1.0 (ship weighs half as much as metal)
          const playerMass = 0.5;
          const metalMass = 1.0;
          const totalMass = playerMass + metalMass;

          // Calculate relative velocity at collision point
          const relativeVx = this.game.player.vx - metal.vx;
          const relativeVy = this.game.player.vy - metal.vy;

          // Component of relative velocity along collision normal
          const relativeNormalSpeed = relativeVx * collisionNormalX + relativeVy * collisionNormalY;

          // Only apply forces if objects are moving toward each other
          if (relativeNormalSpeed < 0) {
            // Restitution coefficient (bounciness) - reduced for more realistic feel
            const restitution = 0.3;
            
            // Calculate impulse magnitude
            const impulseMagnitude = -(1 + restitution) * relativeNormalSpeed / totalMass;
            
            // Apply impulse to velocities (conservation of momentum)
            const playerImpulse = impulseMagnitude * metalMass;
            const metalImpulse = impulseMagnitude * playerMass;
            
            this.game.player.vx += playerImpulse * collisionNormalX;
            this.game.player.vy += playerImpulse * collisionNormalY;
            
            metal.vx -= metalImpulse * collisionNormalX;
            metal.vy -= metalImpulse * collisionNormalY;

            // Calculate torque for metal spinning based on collision point
            // Distance from metal center to collision point
            const metalCenterX = metal.x;
            const metalCenterY = metal.y;
            const collisionOffsetX = collisionPointX - metalCenterX;
            const collisionOffsetY = collisionPointY - metalCenterY;
            
            // Cross product gives torque direction and magnitude
            // Torque = r × F (cross product of position vector and force)
            const forceX = metalImpulse * collisionNormalX;
            const forceY = metalImpulse * collisionNormalY;
            const torque = collisionOffsetX * forceY - collisionOffsetY * forceX;
            
            // Apply angular velocity (spin) - scale by metal's moment of inertia
            // For a rod: I = (1/12) * m * L^2, but we'll use a simpler approximation
            const momentOfInertia = metalMass * length * length / 12;
            const angularImpulse = torque / momentOfInertia;
            
            // Add spin to metal (ensure metal has angularVelocity property)
            if (metal.angularVelocity === undefined) {
              metal.angularVelocity = 0;
            }
            metal.angularVelocity += angularImpulse * 0.1; // Scale factor for playable spin rate
            
            // Add some friction to prevent metals from spinning forever
            metal.angularVelocity *= 0.98;
          }
        }
        break; // Only handle one collision per frame
      }
    }
  }

  // Legacy method - now handled by consolidated handleEnemyCollisions()

  // Legacy method - now handled by consolidated handleAsteroidCollisions()

  handlePlayerBulletMetalCollisions() {
    if (!this.entities.bullets || this.entities.bullets.length === 0) {
      return;
    }
    
    for (let i = this.entities.bullets.length - 1; i >= 0; i--) {
      const bullet = this.entities.bullets[i];

      if (!this.entities.metals) continue;
      
      for (const metal of this.entities.metals) {
        const collisionSegment = metal.checkBulletCollision(bullet);
        if (collisionSegment) {
          if (bullet.isPlayerLaser) {
            // Handle laser bouncing off metal
            const bounceResult = metal.calculateLaserBounceDirection(
              bullet,
              collisionSegment
            );
            const bounced = bullet.registerBounce(bounceResult.angle);

            if (bounced) {
              // Laser exceeded max bounces, remove it
              this.entities.bullets.splice(i, 1);
            }
          } else {
            // Handle regular bullet bouncing off metal
            const bounceResult = metal.calculateBounceDirection(
              bullet,
              collisionSegment
            );
            bullet.angle = bounceResult.angle;
            bullet.vx = bounceResult.vx;
            bullet.vy = bounceResult.vy;

            // Move bullet away from metal to prevent multiple bounces
            bullet.x += bullet.vx * 3;
            bullet.y += bullet.vy * 3;
          }

          break;
        }
      }
    }
  }

  // Legacy method - now handled by consolidated handleAsteroidCollisions()

  handleEnemyBulletMetalCollisions() {
    if (!this.entities.enemyBullets || this.entities.enemyBullets.length === 0) {
      return;
    }
    
    for (let i = this.entities.enemyBullets.length - 1; i >= 0; i--) {
      const bullet = this.entities.enemyBullets[i];

      if (!this.entities.metals) continue;
      
      for (const metal of this.entities.metals) {
        const collisionSegment = metal.checkBulletCollision(bullet);
        if (collisionSegment) {
          // Calculate bounce direction using metal's method
          const bounceResult = metal.calculateBounceDirection(
            bullet,
            collisionSegment
          );
          bullet.angle = bounceResult.angle;
          bullet.vx = bounceResult.vx;
          bullet.vy = bounceResult.vy;

          // Move bullet away from metal
          bullet.x += bullet.vx * 3;
          bullet.y += bullet.vy * 3;

          break;
        }
      }
    }
  }

  // CONTINUOUS LASER BEAM COLLISIONS

  handleContinuousLaserCollisions() {
    // Check all bosses for active continuous laser beams
    for (const enemy of this.entities.allEnemies) {
      if (!(enemy instanceof Boss)) continue;
      const boss = enemy;
      if (boss.leftArm && boss.leftArm.activeLaser) {
        const laser = boss.leftArm.activeLaser;

        // Player collision
        if (
          laser.checkCollision(
            this.game.player.x,
            this.game.player.y,
            this.game.player.hitboxSize
          )
        ) {
          if (this.game.player.godMode) {
            // In godmode, laser has no effect but continue checking other entities
          } else if (
            this.checkPlayerDamageCollision(this.game.player, {
              x: this.game.player.x,
              y: this.game.player.y,
              size: 0,
            })
          ) {
            if (this.game.player.secondShip.length > 0) {
              const destroyedShip = this.game.player.secondShip.pop();
              this.game.effects.createExplosion(
                destroyedShip.x,
                destroyedShip.y
              );
              this.game.progress.update();
            } else if (this.game.player.shield > 0) {
              this.game.player.shield--;
              this.game.effects.createExplosion(
                this.game.player.x,
                this.game.player.y
              );
              this.game.progress.update();
            } else {
              console.log(
                "🔥 PLAYER DEATH: Collision with CONTINUOUS LASER BEAM",
                {
                  laser: {
                    startX: laser.startX,
                    startY: laser.startY,
                    endX: laser.endX,
                    endY: laser.endY,
                    width: laser.width,
                    color: laser.color,
                  },
                  player: {
                    x: this.game.player.x,
                    y: this.game.player.y,
                    hitboxSize: this.game.player.hitboxSize,
                  },
                }
              );
              this.game.effects.createExplosion(
                this.game.player.x,
                this.game.player.y
              );
              this.game.death.start();
              return;
            }
          }
        }

        // Asteroid collisions
        for (let i = this.entities.asteroids.length - 1; i >= 0; i--) {
          const asteroid = this.entities.asteroids[i];
          if (laser.checkCollision(asteroid.x, asteroid.y, asteroid.size)) {
            this.entities.asteroids.splice(i, 1);
            this.game.effects.createDebris(asteroid.x, asteroid.y, "#ffffff");
            this.game.effects.createAsteroidHitEffect(asteroid.x, asteroid.y);
            this.game.audio.play(this.game.audio.sounds.asteroidExplosion);
          }
        }

        // Enemy collisions (friendly fire)
        for (let i = this.entities.allEnemies.length - 1; i >= 0; i--) {
          const enemy = this.entities.allEnemies[i];
          if (
            enemy !== boss &&
            laser.checkCollision(enemy.x, enemy.y, enemy.size)
          ) {
            this.entities.removeDestroyedEnemy(enemy);
            this.game.effects.createExplosion(enemy.x, enemy.y);
          }
        }

        // Player companion ship collisions
        for (let i = this.game.player.secondShip.length - 1; i >= 0; i--) {
          const ship = this.game.player.secondShip[i];
          if (laser.checkCollision(ship.x, ship.y, 15)) {
            this.game.player.secondShip.splice(i, 1);
            this.game.effects.createExplosion(ship.x, ship.y);
            this.game.progress.update();
          }
        }
      }
    }
  }

  // COLLISION DETECTION HELPER METHODS

  checkCollision(obj1, obj2) {
    if (!obj1 || !obj2) {
      return false;
    }

    // Special collision handling for boss - use precise hitbox detection
    if (obj2 instanceof Boss) {
      // Check if bullet hits any boss part using boss's getHitPart method
      return obj2.getHitPart(obj1.x, obj1.y) !== null;
    }

    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < obj1.size + obj2.size;
  }

  checkLaserCollision(laser, target) {
    // Special collision handling for boss - check if laser intersects boss parts
    if (target instanceof Boss) {
      const laserStartX = laser.x;
      const laserStartY = laser.y;
      const laserEndX = laser.x + Math.cos(laser.angle) * laser.length;
      const laserEndY = laser.y + Math.sin(laser.angle) * laser.length;

      // Check multiple points along the laser line
      const steps = 20;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const checkX = laserStartX + t * (laserEndX - laserStartX);
        const checkY = laserStartY + t * (laserEndY - laserStartY);

        if (target.getHitPart(checkX, checkY) !== null) {
          return true;
        }
      }
      return false;
    }

    const laserStartX = laser.x;
    const laserStartY = laser.y;
    const laserEndX = laser.x + Math.cos(laser.angle) * laser.length;
    const laserEndY = laser.y + Math.sin(laser.angle) * laser.length;

    const circleX = target.x;
    const circleY = target.y;
    const circleRadius = target.size;

    const dx = laserEndX - laserStartX;
    const dy = laserEndY - laserStartY;
    const lengthSq = dx * dx + dy * dy;
    let t = 0;
    if (lengthSq !== 0) {
      t =
        ((circleX - laserStartX) * dx + (circleY - laserStartY) * dy) /
        lengthSq;
      t = Math.max(0, Math.min(1, t)); // Clamp t between 0 and 1
    }

    const closestX = laserStartX + t * dx;
    const closestY = laserStartY + t * dy;

    const distDx = circleX - closestX;
    const distDy = circleY - closestY;
    const distance = Math.sqrt(distDx * distDx + distDy * distDy);

    return distance < circleRadius + laser.width / 2;
  }

  checkPlayerCollision(player, obj) {
    const dx = player.x - obj.x;
    const dy = player.y - obj.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < player.hitboxSize + obj.size;
  }

  checkPlayerDamageCollision(player, obj) {
    // Player is immune to damage while shielding or rainbow invulnerable
    // Note: godMode is handled separately to allow destruction behavior
    if (player.isShielding || player.rainbowInvulnerable) {
      return false;
    }

    const dx = player.x - obj.x;
    const dy = player.y - obj.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < player.hitboxSize + obj.size;
  }

  checkPlayerLaserCollision(player, laser) {
    // Line-to-circle collision detection
    const dx = player.x - laser.x;
    const dy = player.y - laser.y;

    // Calculate laser direction vector
    const laserDx = Math.cos(laser.angle);
    const laserDy = Math.sin(laser.angle);

    // Project player position onto laser line
    const projection = dx * laserDx + dy * laserDy;

    // Clamp projection to laser length
    const clampedProjection = Math.max(0, Math.min(laser.length, projection));

    // Find closest point on laser to player
    const closestX = laser.x + clampedProjection * laserDx;
    const closestY = laser.y + clampedProjection * laserDy;

    // Check distance from player to closest point on laser
    const distanceToLaser = Math.sqrt(
      (player.x - closestX) ** 2 + (player.y - closestY) ** 2
    );

    // Collision if distance is less than player hitbox + laser width
    return distanceToLaser < player.hitboxSize + laser.width / 2;
  }

  checkPlayerLaserDamageCollision(player, laser) {
    // Player is immune to damage while shielding or rainbow invulnerable
    // Note: godMode is handled separately to allow destruction behavior
    if (player.isShielding || player.rainbowInvulnerable) {
      return false;
    }

    // Line-to-circle collision detection
    const dx = player.x - laser.x;
    const dy = player.y - laser.y;

    // Calculate laser direction vector
    const laserDx = Math.cos(laser.angle);
    const laserDy = Math.sin(laser.angle);

    // Project player position onto laser line
    const projection = dx * laserDx + dy * laserDy;

    // Clamp projection to laser length
    const clampedProjection = Math.max(0, Math.min(laser.length, projection));

    // Find closest point on laser to player
    const closestX = laser.x + clampedProjection * laserDx;
    const closestY = laser.y + clampedProjection * laserDy;

    // Check distance from player to closest point on laser
    const distanceToLaser = Math.sqrt(
      (player.x - closestX) ** 2 + (player.y - closestY) ** 2
    );

    // Collision if distance is less than player hitbox + laser width
    return distanceToLaser < player.hitboxSize + laser.width / 2;
  }

  // LASER LINE INTERSECTION HELPER

  checkLaserLineIntersection(laser, segment) {
    // Get laser line endpoints
    const laserStartX = laser.x;
    const laserStartY = laser.y;
    const laserEndX = laser.x + Math.cos(laser.angle) * laser.length;
    const laserEndY = laser.y + Math.sin(laser.angle) * laser.length;

    // Check if laser line intersects with metal segment
    return this.lineIntersection(
      laserStartX,
      laserStartY,
      laserEndX,
      laserEndY,
      segment.x1,
      segment.y1,
      segment.x2,
      segment.y2
    );
  }

  // Line intersection algorithm
  lineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return false; // Lines are parallel

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  calculateLaserBounceDirection(laser, metal) {
    // Similar to bullet bounce
    const dx = laser.x - metal.x;
    const dy = laser.y - metal.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Hit left or right side
      return Math.atan2(Math.sin(laser.angle), -Math.cos(laser.angle));
    } else {
      // Hit top or bottom
      return Math.atan2(-Math.sin(laser.angle), Math.cos(laser.angle));
    }
  }

  // Check collision between a line (laser) and a circle (asteroid/player/metal)
  lineCircleCollision(laser, circleEntity) {
    // Get circle properties - handle different property names across entity types
    const circleX = circleEntity.x;
    const circleY = circleEntity.y;
    const circleRadius = circleEntity.hitboxSize || circleEntity.radius || circleEntity.size || 10;
    
    // Get laser line endpoints
    const laserStartX = laser.x;
    const laserStartY = laser.y;
    const laserLength = laser.length || 100; // Default laser length
    const laserEndX = laser.x + Math.cos(laser.angle) * laserLength;
    const laserEndY = laser.y + Math.sin(laser.angle) * laserLength;
    
    // Find the closest point on the line segment to the circle center
    const lineVecX = laserEndX - laserStartX;
    const lineVecY = laserEndY - laserStartY;
    const lineLengthSquared = lineVecX * lineVecX + lineVecY * lineVecY;
    
    // Handle degenerate case where laser has zero length
    if (lineLengthSquared === 0) {
      const distance = Math.sqrt(
        (circleX - laserStartX) * (circleX - laserStartX) + 
        (circleY - laserStartY) * (circleY - laserStartY)
      );
      return distance <= circleRadius;
    }
    
    // Calculate parameter t for the closest point on the line
    const toCircleX = circleX - laserStartX;
    const toCircleY = circleY - laserStartY;
    const t = Math.max(0, Math.min(1, (toCircleX * lineVecX + toCircleY * lineVecY) / lineLengthSquared));
    
    // Find the closest point on the line segment
    const closestX = laserStartX + t * lineVecX;
    const closestY = laserStartY + t * lineVecY;
    
    // Calculate distance from circle center to closest point
    const distance = Math.sqrt(
      (circleX - closestX) * (circleX - closestX) + 
      (circleY - closestY) * (circleY - closestY)
    );
    
    return distance <= circleRadius;
  }

  // Handle player-metal collisions with equal mass physics
  handlePlayerMetalCollisions() {
    for (const metal of this.entities.metals) {
      const collisionSegment = metal.checkPlayerCollision(this.game.player);
      if (collisionSegment) {
        // Use metal's new collision handling method
        metal.handlePlayerCollision(this.game.player, collisionSegment);
      }
    }
  }

  // Handle enemy-metal collisions with 50% dampened effect
  handleEnemyMetalCollisions() {
    for (const metal of this.entities.metals) {
      // Check collisions with regular enemies
      for (const enemy of this.entities.enemies) {
        const collisionSegment = metal.checkPlayerCollision(enemy); // Reuse player collision method
        if (collisionSegment) {
          metal.handleEnemyCollision(enemy, collisionSegment);
        }
      }
      
      // Check collisions with minibosses
      for (const miniBoss of this.entities.miniBosses) {
        const collisionSegment = metal.checkPlayerCollision(miniBoss); // Reuse player collision method
        if (collisionSegment) {
          metal.handleEnemyCollision(miniBoss, collisionSegment);
        }
      }
      
      // Check collisions with boss (if present)
      if (this.entities.boss) {
        const collisionSegment = metal.checkPlayerCollision(this.entities.boss); // Reuse player collision method
        if (collisionSegment) {
          metal.handleEnemyCollision(this.entities.boss, collisionSegment);
        }
      }
    }
  }
}
