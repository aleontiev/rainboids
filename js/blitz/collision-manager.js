// CollisionManager - Handles all collision detection and responses
import { sweepLineDetector } from './sweep-line-collision.js';

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

    this.handleEnemyMetalCollisions();
    
    // Metal-to-metal collisions
    this.handleMetalToMetalCollisions();
    
    // Metal-to-asteroid collisions
    this.handleMetalAsteroidCollisions();

    // Special collisions
    this.handlePlayerPowerupCollisions();
    this.handleContinuousLaserCollisions();
  }

  // Handle all collisions that can damage the player
  handlePlayerCollisions() {
    const player = this.game.player;
    if (!player || player.isDefeated) return;
    
    // Skip all collisions if player is using active shield (noclip mode)
    if (player.isShielding) {
      return;
    }

    // Define all damage sources with their properties
    const damageSources = [
      { entities: this.entities.asteroids, damage: 1, type: "asteroid" },
      { entities: this.entities.enemies, damage: 1, type: "enemy" },
      { entities: this.entities.miniBosses, damage: 1, type: "miniBoss" },
      { entities: this.entities.boss ? [this.entities.boss] : [], damage: 1, type: "boss" },
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
        entities: this.entities.missiles.filter(
          (missile) => !missile.isPlayerMissile
        ),
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
    // Early exit if no bullets to process
    if (this.entities.bullets.length === 0 && this.entities.missiles.length === 0) {
      return;
    }

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
      this.entities.boss ? [this.entities.boss] : [],
      1
    );

    // Player homing missiles vs all enemy types (only if missiles exist)
    const playerMissiles = this.entities.missiles.filter(missile => missile.isPlayerMissile);
    if (playerMissiles.length > 0) {
      this.checkBulletEnemyCollisions(
        playerMissiles,
        this.entities.enemies,
        2 // Missiles do more damage than bullets
      );
      this.checkBulletEnemyCollisions(
        playerMissiles,
        this.entities.miniBosses,
        2
      );
      this.checkBulletEnemyCollisions(
        playerMissiles,
        this.entities.boss ? [this.entities.boss] : [],
        2
      );
    }
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

  }

  // Check all possible collisions for a single asteroid
  checkAsteroidCollisions(asteroid, asteroidIndex) {
    // Define all potential collision sources
    const collisionSources = [
      {
        entities: this.entities.bullets,
        type: "playerBullet",
        damage: 1,
        remove: true,
      },
      {
        entities: this.entities.missiles.filter(missile => missile.isPlayerMissile),
        type: "playerMissile",
        damage: 2,
        remove: true,
      },
      {
        entities: this.entities.enemyBullets,
        type: "enemyBullet",
        damage: 1,
        remove: true,
      },
      {
        entities: this.entities.enemyLasers,
        type: "enemyLaser",
        damage: 1,
        remove: true,
        isLaser: true,
      },
      {
        entities: [this.game.player],
        type: "player",
        damage: 1,
        remove: false,
      },
      {
        entities: this.entities.enemies,
        type: "enemy",
        damage: 1,
        remove: false,
      },
      {
        entities: this.entities.miniBosses,
        type: "miniBoss",
        damage: 2,
        remove: false,
      },
      {
        entities: this.entities.boss ? [this.entities.boss] : [],
        type: "boss",
        damage: 3,
        remove: false,
      },
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
        const dx = asteroid.x - entity.x;
        const dy = asteroid.y - entity.y;
        const distanceSquared = dx * dx + dy * dy;
        
        const asteroidRadius = asteroid.size;
        const entityRadius = entity.radius || entity.hitboxSize || entity.size || 10;
        const radiusSum = asteroidRadius + entityRadius;
        const radiusSumSquared = radiusSum * radiusSum;
        
        collision = distanceSquared < radiusSumSquared;
      }

      if (collision) {
        // Handle collision based on entity type
        if (source.type === "player") {
          // Player collision handled elsewhere, just damage asteroid
          return this.handleAsteroidDamage(
            asteroid,
            asteroidIndex,
            source.damage,
            entity.x,
            entity.y
          );
        } else if (
          source.type.includes("enemy") ||
          source.type.toLowerCase().includes("boss")
        ) {
          // Enemy collision - damage both
          this.handleEnemyAsteroidCollision(entity, asteroid, asteroidIndex);
          return false; // Don't destroy asteroid immediately, let damage system handle it
        } else {
          // Bullet/laser collision
          // Entity removal handled by caller via array splice
          return this.handleAsteroidDamage(
            asteroid,
            asteroidIndex,
            source.damage,
            entity.x,
            entity.y
          );
        }
      }
    }
    return false;
  }

  // Handle asteroid-to-asteroid collisions with physics
  checkAsteroidToAsteroidCollisions() {
    const asteroids = this.entities.asteroids;
    
    // Early exit if not enough asteroids for collisions
    if (asteroids.length < 2) return;

    for (let i = 0; i < asteroids.length - 1; i++) {
      const asteroid1 = asteroids[i];
      // All asteroids in array are alive

      for (let j = i + 1; j < asteroids.length; j++) {
        const asteroid2 = asteroids[j];
        // All asteroids in array are alive

        const dx = asteroid1.x - asteroid2.x;
        const dy = asteroid1.y - asteroid2.y;
        
        // Quick bounding box check first
        const radiusSum = asteroid1.radius + asteroid2.radius;
        
        if (Math.abs(dx) > radiusSum || Math.abs(dy) > radiusSum) {
          continue; // Skip expensive distance calculation
        }
        
        const distanceSquared = dx * dx + dy * dy;
        const radiusSumSquared = radiusSum * radiusSum;

        if (distanceSquared < radiusSumSquared) {
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
    const impulse1 = (impulse * mass2) / totalMass;
    const impulse2 = (impulse * mass1) / totalMass;

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
      this.handleAsteroidDamage(
        asteroid1,
        index1,
        damage,
        asteroid1.x,
        asteroid1.y
      );
      this.handleAsteroidDamage(
        asteroid2,
        index2,
        damage,
        asteroid2.x,
        asteroid2.y
      );
    }

    // Visual/audio effects
    this.game.effects.createAsteroidHitEffect(
      (asteroid1.x + asteroid2.x) / 2,
      (asteroid1.y + asteroid2.y) / 2
    );
    if (impactSpeed > 2) {
      this.game.audio.play(this.game.audio.sounds.hit);
    }
  }

  // Get asteroid mass for physics calculations
  getAsteroidMass(asteroid) {
    switch (asteroid.size || asteroid.type) {
      case "large":
        return 3;
      case "medium":
        return 2;
      case "small":
        return 1;
      default:
        return 2; // Default to medium
    }
  }

  // Handle enemy-asteroid collision
  handleEnemyAsteroidCollision(enemy, asteroid, asteroidIndex) {
    // Damage the enemy
    if (enemy.takeDamage) {
      const result = enemy.takeDamage(1, asteroid.x, asteroid.y);
      if (result === "destroyed") {
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
    const damageResult = asteroid.takeDamage
      ? asteroid.takeDamage(damage, impactX, impactY)
      : "destroyed";

    this.game.effects.createAsteroidHitEffect(impactX, impactY);

    if (damageResult && damageResult !== "damaged") {
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
      const speed =
        Math.sqrt(
          originalAsteroid.vx * originalAsteroid.vx +
            originalAsteroid.vy * originalAsteroid.vy
        ) *
        (0.8 + Math.random() * 0.4); // 80-120% of original speed

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
        // Shape-based collision detection: check if entity's actual shape intersects player's hitbox circle
        collision = this.shapeCircleCollision(entity, player);
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
    // Check for godmode
    if (player.godMode) {
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

    // Log what killed the player for debugging
    console.log(`Player killed by: ${type} (entity:`, sourceEntity, ')');
    
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

        let hasCollision = false;
        
        // Use generic collision detection for all entity types
        if (bullet.isPlayerLaser) {
          // Use laser collision detection
          hasCollision = this.checkLaserCollision(bullet, enemy);
        } else {
          // Use generic collision detection for all entities
          hasCollision = this.checkEntityCollision(bullet, enemy);
        }

        if (hasCollision) {
          // Damage enemy and get result
          const damageResult = this.game.handleEnemyDamage(
            enemy,
            damage,
            bullet.x,
            bullet.y
          );

          // Handle bullet/laser removal based on type and enemy type
          let shouldRemoveBullet = true;
          
          if (bullet.isPlayerLaser) {
            // Player lasers: stop after hitting boss/miniboss, can penetrate regular enemies
            const isBossOrMiniboss = enemy.type === "boss" || 
                                   enemy.type === "miniboss" || 
                                   enemy.constructor.name === "MiniBoss";
            
            if (isBossOrMiniboss) {
              // Laser stops at boss/miniboss
              shouldRemoveBullet = true;
            } else {
              // Laser can penetrate regular enemies
              if (bullet.registerHit && typeof bullet.registerHit === 'function') {
                shouldRemoveBullet = bullet.registerHit();
              } else {
                // Fallback if registerHit method doesn't exist
                shouldRemoveBullet = false;
              }
            }
          }
          // Regular bullets always get removed (shouldRemoveBullet defaults to true)

          if (shouldRemoveBullet) {
            bullets.splice(i, 1);
          }

          // Remove enemy if destroyed
          if (damageResult === "destroyed") {
            this.game.entities.removeDestroyedEnemy(enemy);
          }

          break; // Bullet can only hit one enemy per iteration
        }
      }
    }
  }

  // Helper for bullet-asteroid collisions
  checkBulletAsteroidCollisions(bullets, asteroids) {
    if (
      !bullets ||
      bullets.length === 0 ||
      !asteroids ||
      asteroids.length === 0
    ) {
      return;
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      // All bullets in array are alive

      for (let j = asteroids.length - 1; j >= 0; j--) {
        const asteroid = asteroids[j];
        // All asteroids in array are alive

        const dx = bullet.x - asteroid.x;
        const dy = bullet.y - asteroid.y;
        
        // Quick bounding box check first
        const radiusSum = bullet.radius + asteroid.radius;
        
        if (Math.abs(dx) > radiusSum || Math.abs(dy) > radiusSum) {
          continue; // Skip expensive distance calculation
        }
        
        const distanceSquared = dx * dx + dy * dy;
        const radiusSumSquared = radiusSum * radiusSum;

        if (distanceSquared < radiusSumSquared) {
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

  // Helper for bullet-metal bouncing using unified physics
  checkBulletMetalBouncing(bullets, metals) {
    // Early exit if no bullets or metals
    if (bullets.length === 0 || metals.length === 0) return;
    
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];

      for (const metal of metals) {
        // Use metal's proper collision detection method
        const hitSegment = metal.checkBulletCollision(bullet);
        if (hitSegment) {
          // Use metal's unified physics bounce calculation
          const bounceResult = metal.handleBulletCollision(bullet, hitSegment);
          if (bounceResult && bounceResult.newAngle !== undefined) {
            // Update bullet properties
            bullet.angle = bounceResult.newAngle;
            bullet.x = bounceResult.newPosition.x;
            bullet.y = bounceResult.newPosition.y;
            
            // Update bullet speed if velocity is provided
            if (bounceResult.newVelocity) {
              const vx = bounceResult.newVelocity.x;
              const vy = bounceResult.newVelocity.y;
              bullet.speed = Math.sqrt(vx * vx + vy * vy);
            }
          }
          break; // Only process one collision per bullet per frame
        }
      }
    }
  }

  // Helper for laser-metal bouncing (for projectile-style lasers)
  checkLaserMetalBouncing(lasers, metals) {
    // Early exit if no lasers or metals
    if (lasers.length === 0 || metals.length === 0) return;
    
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
          if (
            laser.registerBounce &&
            typeof laser.registerBounce === "function"
          ) {
            const shouldDestroy = laser.registerBounce(bounceResult.angle);
            if (shouldDestroy) {
              // Laser exceeded max bounces, remove it
              lasers.splice(i, 1);
            }
          } else {
            // For enemy lasers without bounce tracking, update angle and position
            laser.angle = bounceResult.angle;
            laser.x = bounceResult.x;
            laser.y = bounceResult.y;
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

  /**
   * Handles collisions between the player and rotating metal objects
   * using a 2D rigid body physics model for a realistic bounce effect.
   */
  handlePlayerMetalCollisions() {
    for (const metal of this.entities.metals) {
      const collisionSegment = metal.checkPlayerCollision(this.game.player);
      if (collisionSegment) {
        // 1. CALCULATE COLLISION GEOMETRY
        // ---------------------------------
        const player = this.game.player;
        const dx = collisionSegment.x2 - collisionSegment.x1;
        const dy = collisionSegment.y2 - collisionSegment.y1;
        const lengthSq = dx * dx + dy * dy;

        if (lengthSq > 0) {
          const length = Math.sqrt(lengthSq);

          // Find the closest point on the segment to the player's center
          const t = Math.max(
            0,
            Math.min(
              1,
              ((player.x - collisionSegment.x1) * dx +
                (player.y - collisionSegment.y1) * dy) /
                lengthSq
            )
          );
          const collisionPointX = collisionSegment.x1 + t * dx;
          const collisionPointY = collisionSegment.y1 + t * dy;

          // The collision normal should always point away from the metal towards the player
          let collisionNormalX = player.x - collisionPointX;
          let collisionNormalY = player.y - collisionPointY;
          const dist = Math.sqrt(
            collisionNormalX * collisionNormalX +
              collisionNormalY * collisionNormalY
          );

          if (dist > 0) {
            collisionNormalX /= dist;
            collisionNormalY /= dist;
          } else {
            // Edge case: player center is exactly on the line
            // Use the segment's perpendicular as a fallback
            collisionNormalX = -dy / length;
            collisionNormalY = dx / length;
          }

          // 2. RESOLVE PENETRATION (Avoids "Jumpy" Behavior)
          // ----------------------------------------------------
          const penetrationDepth =
            player.hitboxSize + metal.thickness / 2 - dist;
          if (penetrationDepth > 0) {
            // Push the player back along the normal by the exact overlap amount
            player.x += collisionNormalX * penetrationDepth;
            player.y += collisionNormalY * penetrationDepth;
          }

          // 3. BUMPER CARS COLLISION RESPONSE
          // ----------------------------------
          
          // Calculate relative velocity for impact intensity
          const relativeVx = player.vx - (metal.vx || 0);
          const relativeVy = player.vy - (metal.vy || 0);
          const relativeSpeed = Math.sqrt(relativeVx * relativeVx + relativeVy * relativeVy);
          
          // Base bounce strength - scales with impact speed
          const baseBounceStrength = Math.min(15, 8 + relativeSpeed * 0.3);
          
          // Calculate bounce velocities based on collision normal
          const playerBounceStrength = baseBounceStrength * 0.7; // Player gets moderate bounce
          const metalBounceStrength = baseBounceStrength * 1.2;  // Metal gets stronger bounce
          
          // Apply bouncy collision - both objects bounce away from collision point
          // Store collision velocity separately to avoid interfering with player input
          player.collisionVx = (player.collisionVx || 0) + collisionNormalX * playerBounceStrength;
          player.collisionVy = (player.collisionVy || 0) + collisionNormalY * playerBounceStrength;
          
          metal.vx = (metal.vx || 0) - collisionNormalX * metalBounceStrength;
          metal.vy = (metal.vy || 0) - collisionNormalY * metalBounceStrength;
          
          // Add some rotational spin to metal for fun physics
          const spinDirection = Math.sign(relativeVx * collisionNormalY - relativeVy * collisionNormalX);
          const spinStrength = Math.min(0.15, relativeSpeed * 0.02);
          metal.angularVelocity = (metal.angularVelocity || 0) + spinDirection * spinStrength;
          
          // Limit maximum velocities to prevent things flying off screen
          const maxPlayerSpeed = 12;
          const maxMetalSpeed = 20;
          
          const playerSpeed = Math.sqrt((player.collisionVx || 0) * (player.collisionVx || 0) + (player.collisionVy || 0) * (player.collisionVy || 0));
          if (playerSpeed > maxPlayerSpeed) {
            player.collisionVx = (player.collisionVx / playerSpeed) * maxPlayerSpeed;
            player.collisionVy = (player.collisionVy / playerSpeed) * maxPlayerSpeed;
          }
          
          const metalSpeed = Math.sqrt(metal.vx * metal.vx + metal.vy * metal.vy);
          if (metalSpeed > maxMetalSpeed) {
            metal.vx = (metal.vx / metalSpeed) * maxMetalSpeed;
            metal.vy = (metal.vy / metalSpeed) * maxMetalSpeed;
          }
          
          // Cap angular velocity to prevent crazy spinning
          if (Math.abs(metal.angularVelocity) > 0.3) {
            metal.angularVelocity = Math.sign(metal.angularVelocity) * 0.3;
          }
          
          // Visual and audio feedback for bumper cars effect
          this.game.effects.createExplosion(collisionPointX, collisionPointY, 3, 1.5);
          this.game.audio.play(this.game.audio.sounds.hit);
        }
        break; // Process only one collision per frame for stability
      }
    }
  }

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

            // Move laser away from metal to prevent sticking
            if (
              !bounced &&
              bounceResult.x !== undefined &&
              bounceResult.y !== undefined
            ) {
              bullet.x = bounceResult.x;
              bullet.y = bounceResult.y;
            }

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
            // Update bullet position to prevent sticking
            bullet.x = bounceResult.x;
            bullet.y = bounceResult.y;
          }

          break;
        }
      }
    }
  }

  // Legacy method - now handled by consolidated handleAsteroidCollisions()

  handleEnemyBulletMetalCollisions() {
    if (
      !this.entities.enemyBullets ||
      this.entities.enemyBullets.length === 0
    ) {
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
          // Update bullet position to prevent sticking
          bullet.x = bounceResult.x;
          bullet.y = bounceResult.y;

          break;
        }
      }
    }
  }

  // CONTINUOUS LASER BEAM COLLISIONS

  handleContinuousLaserCollisions() {
    // Check boss for active continuous laser beams
    if (this.entities.boss && this.entities.boss.type === "boss") {
      const boss = this.entities.boss;
      const activeLasers = boss.getActiveLasers ? boss.getActiveLasers() : [];
      
      for (const laser of activeLasers) {

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
              this.game.effects.createExplosion(
                this.game.player.x,
                this.game.player.y
              );
              // Log what killed the player for debugging
              console.log('Player killed by: continuous laser beam (boss laser)');
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
        // Check regular enemies
        for (let i = this.entities.enemies.length - 1; i >= 0; i--) {
          const enemy = this.entities.enemies[i];
          if (
            enemy !== boss &&
            laser.checkCollision(enemy.x, enemy.y, enemy.size)
          ) {
            this.entities.removeDestroyedEnemy(enemy);
            this.game.effects.createExplosion(enemy.x, enemy.y);
          }
        }
        
        // Check minibosses
        for (let i = this.entities.miniBosses.length - 1; i >= 0; i--) {
          const enemy = this.entities.miniBosses[i];
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

    // Use generic collision detection that supports different entity types
    return this.checkEntityCollision(obj1, obj2);
  }

  // Generic entity collision detection 
  checkEntityCollision(entity1, entity2) {
    // Handle multi-part entities (like bosses)
    if (entity2.parts && entity2.parts.size > 0) {
      // Check collision against each enabled part
      for (const part of entity2.parts.values()) {
        if (!part.enabled || part.destroyed) continue;
        
        if (this.checkCircleCollision(entity1, part)) {
          return true;
        }
      }
      return false;
    }
    
    if (entity1.parts && entity1.parts.size > 0) {
      // Check collision against each enabled part
      for (const part of entity1.parts.values()) {
        if (!part.enabled || part.destroyed) continue;
        
        if (this.checkCircleCollision(part, entity2)) {
          return true;
        }
      }
      return false;
    }
    
    // Both are single entities - use simple circle collision
    return this.checkCircleCollision(entity1, entity2);
  }

  // Standard circular collision between two entities
  checkCircleCollision(entity1, entity2) {
    // Basic validation
    if (!entity1 || !entity2 || 
        typeof entity1.x !== 'number' || typeof entity1.y !== 'number' ||
        typeof entity2.x !== 'number' || typeof entity2.y !== 'number') {
      return false;
    }
    
    const dx = entity1.x - entity2.x;
    const dy = entity1.y - entity2.y;
    const distanceSquared = dx * dx + dy * dy; // Avoid sqrt for performance
    
    // Get collision radius for each entity with sensible fallbacks
    let radius1, radius2;
    
    // Entity 1 radius
    if (entity1.getCollisionSize && typeof entity1.getCollisionSize === 'function') {
      radius1 = entity1.getCollisionSize();
    } else if (entity1.size) {
      radius1 = entity1.size;
    } else if (entity1.radius) {
      radius1 = entity1.radius;
    } else if (entity1.hitboxSize) {
      radius1 = entity1.hitboxSize;
    } else {
      radius1 = 15; // Default radius
    }
    
    // Entity 2 radius  
    if (entity2.getCollisionSize && typeof entity2.getCollisionSize === 'function') {
      radius2 = entity2.getCollisionSize();
    } else if (entity2.size) {
      radius2 = entity2.size;
    } else if (entity2.radius) {
      radius2 = entity2.radius;
    } else if (entity2.hitboxSize) {
      radius2 = entity2.hitboxSize;
    } else {
      radius2 = 15; // Default radius
    }
    
    // Ensure radii are positive numbers
    radius1 = Math.max(0, radius1 || 15);
    radius2 = Math.max(0, radius2 || 15);
    
    const radiusSum = radius1 + radius2;
    const radiusSumSquared = radiusSum * radiusSum;
    
    return distanceSquared < radiusSumSquared;
  }

  // Simple, reliable collision detection using circles
  checkShapeCollision(entity1, entity2) {
    // Use reliable circle collision for all entities
    return this.checkCircleCollision(entity1, entity2);
  }

  // Shape-based collision detection: check if entity's actual shape intersects with player's hitbox circle
  shapeCircleCollision(entity, player) {
    // Use sweep-line collision detection for bosses and minibosses with custom SVG paths
    if (this.shouldUseSweepLineCollision(entity)) {
      return this.sweepLineCollision(entity, player);
    }
    
    // Use traditional collision detection for other entities
    const entityBoundary = this.getEntityCollisionBoundary(entity);
    const playerCircle = { x: player.x, y: player.y, radius: player.hitboxSize };
    
    return this.intersectShapeWithCircle(entityBoundary, playerCircle);
  }

  // Determine if entity should use sweep-line collision detection
  shouldUseSweepLineCollision(entity) {
    // Use sweep-line for bosses and minibosses with custom SVG sprites
    if (entity.type === 'boss' || entity.type === 'miniboss' || 
        entity.constructor.name === 'Boss' || entity.constructor.name === 'MiniBoss') {
      
      // Check if entity has custom SVG sprite
      if (entity.svgAssetName || entity.customSprite) {
        return true;
      }
    }
    
    return false;
  }

  // Sweep-line collision detection for complex SVG shapes
  sweepLineCollision(entity, player) {
    const playerCircle = { x: player.x, y: player.y, radius: player.hitboxSize };
    
    // Try to get polygon from entity's SVG data
    let polygon = this.getEntitySVGPolygon(entity);
    
    if (!polygon || !polygon.segments || polygon.segments.length === 0) {
      // Fallback to circle collision if we can't get polygon data
      console.log('Sweep-line collision: falling back to circle collision for', entity.constructor.name);
      return this.checkCircleCollision(entity, player);
    }
    
    // Debug log for sweep-line usage
    if (Math.random() < 0.01) { // Log occasionally to avoid spam
      console.log('Using sweep-line collision for', entity.constructor.name, 'with', polygon.segments.length, 'segments');
    }
    
    // Use sweep-line algorithm for collision detection
    return sweepLineDetector.checkCirclePolygonCollision(playerCircle, polygon);
  }

  // Extract polygon data from entity's SVG information
  getEntitySVGPolygon(entity) {
    // For now, create a simple polygon based on entity shape as fallback
    // This can be extended to parse actual SVG paths when SVG asset data is available
    
    // Check if cached polygon is still valid (entity hasn't moved significantly)
    if (entity._cachedPolygon && 
        Math.abs(entity.x - (entity._lastPolygonX || 0)) < 1 &&
        Math.abs(entity.y - (entity._lastPolygonY || 0)) < 1 &&
        Math.abs((entity.angle || 0) - (entity._lastPolygonAngle || 0)) < 0.1) {
      return entity._cachedPolygon;
    }
    
    // Create simple polygon based on entity type and shape
    let polygon = null;
    
    if (entity.config && entity.config.shape) {
      const transform = {
        translateX: entity.x,
        translateY: entity.y,
        rotation: entity.angle || 0,
        scaleX: entity.spriteScale || 1,
        scaleY: entity.spriteScale || 1
      };
      
      // Create polygon from simple shape
      const SweepLineCollisionDetector = sweepLineDetector.constructor;
      polygon = SweepLineCollisionDetector.createSimplePolygon(
        entity.config.shape,
        entity.x,
        entity.y,
        entity.size || 50,
        entity.angle || 0
      );
      
      // Cache the polygon for performance (update when entity moves)
      entity._cachedPolygon = polygon;
      entity._lastPolygonX = entity.x;
      entity._lastPolygonY = entity.y;
      entity._lastPolygonAngle = entity.angle;
    }
    
    return polygon;
  }

  // Get collision boundary for any entity using common interface
  getEntityCollisionBoundary(entity) {
    // Check if entity provides its own collision boundary method
    if (entity.getCollisionBoundary && typeof entity.getCollisionBoundary === 'function') {
      return entity.getCollisionBoundary();
    }
    
    // Check if entity provides collision shape method  
    if (entity.getCollisionShape && typeof entity.getCollisionShape === 'function') {
      return entity.getCollisionShape();
    }
    
    // Fallback: generate boundary from entity properties
    return this.generateDefaultCollisionBoundary(entity);
  }

  // Generate default collision boundary for entities without custom collision methods
  generateDefaultCollisionBoundary(entity) {
    // Try to get collision size first
    let radius;
    if (entity.getCollisionSize && typeof entity.getCollisionSize === 'function') {
      radius = entity.getCollisionSize();
    } else {
      radius = entity.hitboxSize || entity.size || entity.radius || 15;
    }

    // Default to circle boundary
    return {
      type: 'circle',
      x: entity.x,
      y: entity.y,
      radius: radius
    };
  }

  // Universal shape-circle intersection method
  intersectShapeWithCircle(shape, circle) {
    switch (shape.type) {
      case 'circle':
        return this.circleCircleIntersection(shape, circle);
      case 'polygon':
        return this.polygonCircleIntersection(shape, circle);
      case 'path2d':
        return this.path2dCircleIntersection(shape, circle);
      case 'triangle':
        return this.triangleCircleCollision(shape, circle);
      case 'rectangle':
        return this.rectangleCircleCollision(shape, circle);
      default:
        // Unknown shape type - fallback to circle
        const distance = Math.sqrt(
          Math.pow(shape.x - circle.x, 2) + Math.pow(shape.y - circle.y, 2)
        );
        const shapeRadius = shape.radius || shape.size || 15;
        return distance < shapeRadius + circle.radius;
    }
  }

  // Triangle-circle collision detection
  triangleCircleCollision(triangle, circle) {
    // Transform triangle points to world coordinates
    const worldPoints = triangle.points.map(point => {
      const cos = Math.cos(triangle.angle);
      const sin = Math.sin(triangle.angle);
      return {
        x: triangle.x + point.x * cos - point.y * sin,
        y: triangle.y + point.x * sin + point.y * cos
      };
    });

    // Check if circle center is inside triangle
    if (this.pointInTriangle(circle.x, circle.y, worldPoints[0], worldPoints[1], worldPoints[2])) {
      return true;
    }

    // Check if circle intersects any triangle edge
    for (let i = 0; i < 3; i++) {
      const p1 = worldPoints[i];
      const p2 = worldPoints[(i + 1) % 3];
      if (this.lineSegmentCircleIntersection(p1, p2, circle.x, circle.y, circle.radius)) {
        return true;
      }
    }

    return false;
  }

  // Rectangle-circle collision detection
  rectangleCircleCollision(rect, circle) {
    // Get rectangle corners in world coordinates
    const cos = Math.cos(rect.angle);
    const sin = Math.sin(rect.angle);
    const halfWidth = rect.width / 2;
    const halfHeight = rect.height / 2;
    
    const corners = [
      { x: rect.x + (-halfWidth * cos - (-halfHeight) * sin), y: rect.y + (-halfWidth * sin + (-halfHeight) * cos) },
      { x: rect.x + (halfWidth * cos - (-halfHeight) * sin), y: rect.y + (halfWidth * sin + (-halfHeight) * cos) },
      { x: rect.x + (halfWidth * cos - halfHeight * sin), y: rect.y + (halfWidth * sin + halfHeight * cos) },
      { x: rect.x + (-halfWidth * cos - halfHeight * sin), y: rect.y + (-halfWidth * sin + halfHeight * cos) }
    ];

    // Check if circle center is inside rectangle
    if (this.pointInPolygon(circle.x, circle.y, corners)) {
      return true;
    }

    // Check if circle intersects any rectangle edge
    for (let i = 0; i < 4; i++) {
      const p1 = corners[i];
      const p2 = corners[(i + 1) % 4];
      if (this.lineSegmentCircleIntersection(p1, p2, circle.x, circle.y, circle.radius)) {
        return true;
      }
    }

    return false;
  }

  // Circle-circle collision detection (renamed for consistency)
  circleCircleIntersection(circle1, circle2) {
    const distance = Math.sqrt(
      Math.pow(circle1.x - circle2.x, 2) + Math.pow(circle1.y - circle2.y, 2)
    );
    return distance < circle1.radius + circle2.radius;
  }

  // Legacy method for backward compatibility
  circleCircleCollision(circle1, circle2) {
    return this.circleCircleIntersection(circle1, circle2);
  }

  // Polygon-circle intersection detection
  polygonCircleIntersection(polygon, circle) {
    // Transform polygon points to world coordinates if needed
    let worldPoints = polygon.points;
    if (polygon.x !== undefined || polygon.y !== undefined || polygon.angle !== undefined) {
      const cos = Math.cos(polygon.angle || 0);
      const sin = Math.sin(polygon.angle || 0);
      const offsetX = polygon.x || 0;
      const offsetY = polygon.y || 0;
      
      worldPoints = polygon.points.map(point => ({
        x: offsetX + point.x * cos - point.y * sin,
        y: offsetY + point.x * sin + point.y * cos
      }));
    }

    // Check if circle center is inside polygon
    if (this.pointInPolygon(circle.x, circle.y, worldPoints)) {
      return true;
    }

    // Check if circle intersects any polygon edge
    for (let i = 0; i < worldPoints.length; i++) {
      const p1 = worldPoints[i];
      const p2 = worldPoints[(i + 1) % worldPoints.length];
      if (this.lineSegmentCircleIntersection(p1, p2, circle.x, circle.y, circle.radius)) {
        return true;
      }
    }

    return false;
  }

  // Path2D-circle intersection detection (for SVG collision)
  path2dCircleIntersection(pathShape, circle) {
    // For Path2D collision, we need to sample points around the circle and test if they're inside the path
    // This is an approximation method for complex SVG shapes
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Transform the path to world coordinates
    ctx.save();
    ctx.translate(pathShape.x || 0, pathShape.y || 0);
    ctx.rotate(pathShape.angle || 0);
    ctx.scale(pathShape.scaleX || 1, pathShape.scaleY || 1);
    
    // Sample points around the circle's circumference
    const sampleCount = Math.max(8, Math.ceil(circle.radius / 2)); // More samples for larger circles
    for (let i = 0; i < sampleCount; i++) {
      const angle = (i / sampleCount) * Math.PI * 2;
      const sampleX = circle.x + Math.cos(angle) * circle.radius;
      const sampleY = circle.y + Math.sin(angle) * circle.radius;
      
      // Transform sample point to path coordinate system
      const localX = sampleX - (pathShape.x || 0);
      const localY = sampleY - (pathShape.y || 0);
      
      if (ctx.isPointInPath(pathShape.path, localX, localY)) {
        ctx.restore();
        return true;
      }
    }
    
    // Also check if circle center is inside the path
    const centerX = circle.x - (pathShape.x || 0);
    const centerY = circle.y - (pathShape.y || 0);
    const centerInside = ctx.isPointInPath(pathShape.path, centerX, centerY);
    
    ctx.restore();
    return centerInside;
  }

  // Check if a point is inside a triangle using barycentric coordinates
  pointInTriangle(px, py, p1, p2, p3) {
    const denom = (p2.y - p3.y) * (p1.x - p3.x) + (p3.x - p2.x) * (p1.y - p3.y);
    const a = ((p2.y - p3.y) * (px - p3.x) + (p3.x - p2.x) * (py - p3.y)) / denom;
    const b = ((p3.y - p1.y) * (px - p3.x) + (p1.x - p3.x) * (py - p3.y)) / denom;
    const c = 1 - a - b;
    return a >= 0 && b >= 0 && c >= 0;
  }

  // Check if a point is inside a polygon using ray casting
  pointInPolygon(px, py, vertices) {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      if (((vertices[i].y > py) !== (vertices[j].y > py)) &&
          (px < (vertices[j].x - vertices[i].x) * (py - vertices[i].y) / (vertices[j].y - vertices[i].y) + vertices[i].x)) {
        inside = !inside;
      }
    }
    return inside;
  }

  // Check if a line segment intersects with a circle
  lineSegmentCircleIntersection(lineStart, lineEnd, circleX, circleY, circleRadius) {
    // Vector from line start to line end
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    
    // Vector from line start to circle center
    const fx = lineStart.x - circleX;
    const fy = lineStart.y - circleY;
    
    // Quadratic formula coefficients for line-circle intersection
    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = (fx * fx + fy * fy) - circleRadius * circleRadius;
    
    const discriminant = b * b - 4 * a * c;
    
    // No intersection if discriminant is negative
    if (discriminant < 0) {
      return false;
    }
    
    // Calculate intersection parameters
    const sqrt_discriminant = Math.sqrt(discriminant);
    const t1 = (-b - sqrt_discriminant) / (2 * a);
    const t2 = (-b + sqrt_discriminant) / (2 * a);
    
    // Check if intersection occurs within the line segment (t between 0 and 1)
    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
  }


  // Transform a point from world coordinates to canvas coordinates
  transformPoint(worldX, worldY, entityX, entityY, canvasX, canvasY) {
    return {
      x: worldX - entityX + canvasX,
      y: worldY - entityY + canvasY
    };
  }

  // Helper to add rounded rectangle to path
  addRoundedRect(path, x, y, width, height, radius) {
    path.moveTo(x + radius, y);
    path.lineTo(x + width - radius, y);
    path.quadraticCurveTo(x + width, y, x + width, y + radius);
    path.lineTo(x + width, y + height - radius);
    path.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    path.lineTo(x + radius, y + height);
    path.quadraticCurveTo(x, y + height, x, y + height - radius);
    path.lineTo(x, y + radius);
    path.quadraticCurveTo(x, y, x + radius, y);
  }

  // Get the collision shape for an entity
  getEntityShape(entity) {
    // Handle bullets
    if (entity.constructor.name === 'Bullet' || entity.type === 'bullet') {
      if (entity.isPlayerBullet) {
        // Player bullets are triangular (pointy)
        const baseWidth = entity.size * 0.6;
        const height = entity.size * 1.8;
        return {
          type: 'triangle',
          x: entity.x,
          y: entity.y,
          angle: entity.angle,
          points: [
            { x: height * 0.9, y: 0 }, // Tip
            { x: 0, y: -baseWidth / 2 }, // Bottom left
            { x: 0, y: baseWidth / 2 }  // Bottom right
          ]
        };
      } else {
        // Enemy bullets are rectangular with rounded end
        const width = entity.size * 2;
        const height = entity.size;
        return {
          type: 'rectangle',
          x: entity.x,
          y: entity.y,
          angle: entity.angle,
          width: width,
          height: height
        };
      }
    }
    
    // Handle enemies
    if (entity.constructor.name === 'Enemy' || entity.type === 'enemy') {
      const shape = entity.config?.shape || 'triangle';
      
      switch (shape) {
        case 'circle':
          return {
            type: 'circle',
            x: entity.x,
            y: entity.y,
            radius: entity.size * 0.5
          };
          
        case 'square':
        case 'rounded-square':
          return {
            type: 'rectangle',
            x: entity.x,
            y: entity.y,
            angle: entity.angle || 0,
            width: entity.size * 1.2,
            height: entity.size * 1.2
          };
          
        case 'triangle':
        case 'equal-triangle':
        case 'sharp-triangle':
        default:
          // Standard triangle pointing right
          return {
            type: 'triangle',
            x: entity.x,
            y: entity.y,
            angle: entity.angle || 0,
            points: [
              { x: entity.size, y: 0 }, // Front tip
              { x: -entity.size * 0.5, y: -entity.size * 0.5 }, // Back top
              { x: -entity.size * 0.5, y: entity.size * 0.5 }   // Back bottom
            ]
          };
          
        case 'two-circles':
          // Treat as rectangle for collision purposes
          return {
            type: 'rectangle',
            x: entity.x,
            y: entity.y,
            angle: entity.angle || 0,
            width: entity.size * 1.2,
            height: entity.size * 2.4
          };
          
        case 'ring':
          return {
            type: 'circle',
            x: entity.x,
            y: entity.y,
            radius: entity.size * 0.8
          };
      }
    }
    
    // Handle minibosses and bosses - treat as circles for now (they have custom collision methods)
    if (entity.constructor.name === 'MiniBoss' || entity.type === 'miniboss' || entity.type === 'boss') {
      return {
        type: 'circle',
        x: entity.x,
        y: entity.y,
        radius: entity.size || 50
      };
    }
    
    // Default: treat as circle
    const radius = entity.size || entity.radius || entity.hitboxSize || 10;
    return {
      type: 'circle',
      x: entity.x,
      y: entity.y,
      radius: radius
    };
  }

  // Circle-Circle collision
  checkCircleCircleCollision(shape1, shape2) {
    const dx = shape1.x - shape2.x;
    const dy = shape1.y - shape2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < shape1.radius + shape2.radius;
  }

  // Rectangle-Rectangle collision (Axis-Aligned Bounding Box)
  checkRectangleRectangleCollision(shape1, shape2) {
    // For rotated rectangles, we'd need Oriented Bounding Box collision
    // For now, use expanded circle collision as approximation
    const dx = shape1.x - shape2.x;
    const dy = shape1.y - shape2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const radius1 = Math.sqrt(shape1.width * shape1.width + shape1.height * shape1.height) / 2;
    const radius2 = Math.sqrt(shape2.width * shape2.width + shape2.height * shape2.height) / 2;
    return distance < radius1 + radius2;
  }

  // Circle-Rectangle collision
  checkCircleRectangleCollision(shape1, shape2) {
    let circle, rect;
    if (shape1.type === 'circle') {
      circle = shape1;
      rect = shape2;
    } else {
      circle = shape2;
      rect = shape1;
    }
    
    // Simplified: treat rectangle as circle
    const dx = circle.x - rect.x;
    const dy = circle.y - rect.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const rectRadius = Math.sqrt(rect.width * rect.width + rect.height * rect.height) / 2;
    return distance < circle.radius + rectRadius;
  }

  // Triangle-Triangle collision (approximate using bounding circles)
  checkTriangleTriangleCollision(shape1, shape2) {
    // Calculate approximate radius for each triangle
    const radius1 = this.getTriangleBoundingRadius(shape1);
    const radius2 = this.getTriangleBoundingRadius(shape2);
    
    const dx = shape1.x - shape2.x;
    const dy = shape1.y - shape2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < radius1 + radius2;
  }

  // Circle-Triangle collision
  checkCircleTriangleCollision(shape1, shape2) {
    let circle, triangle;
    if (shape1.type === 'circle') {
      circle = shape1;
      triangle = shape2;
    } else {
      circle = shape2;
      triangle = shape1;
    }
    
    // Approximate triangle as circle
    const triangleRadius = this.getTriangleBoundingRadius(triangle);
    const dx = circle.x - triangle.x;
    const dy = circle.y - triangle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < circle.radius + triangleRadius;
  }

  // Rectangle-Triangle collision
  checkRectangleTriangleCollision(shape1, shape2) {
    let rect, triangle;
    if (shape1.type === 'rectangle') {
      rect = shape1;
      triangle = shape2;
    } else {
      rect = shape2;
      triangle = shape1;
    }
    
    // Approximate both as circles
    const rectRadius = Math.sqrt(rect.width * rect.width + rect.height * rect.height) / 2;
    const triangleRadius = this.getTriangleBoundingRadius(triangle);
    
    const dx = rect.x - triangle.x;
    const dy = rect.y - triangle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < rectRadius + triangleRadius;
  }

  // Calculate bounding radius for a triangle
  getTriangleBoundingRadius(triangle) {
    let maxDistance = 0;
    for (const point of triangle.points) {
      const distance = Math.sqrt(point.x * point.x + point.y * point.y);
      maxDistance = Math.max(maxDistance, distance);
    }
    return maxDistance;
  }

  checkLaserCollision(laser, target) {
    // For laser collision, we need line-to-shape collision detection
    if (target.parts && target.parts.size > 0) {
      // Multi-part entity: check laser against each part using part-specific collision detection
      for (const part of target.parts.values()) {
        if (!part.enabled || part.destroyed) continue;
        
        // Use the part's own laser collision method for accurate detection
        if (part.checkLaserCollision && typeof part.checkLaserCollision === 'function') {
          if (part.checkLaserCollision(laser)) {
            return true;
          }
        } else {
          // Fallback to generic line collision if part doesn't have specific method
          if (this.checkLaserLineCollision(laser, part)) {
            return true;
          }
        }
      }
      return false;
    }
    
    // Single entity: standard laser-circle collision
    return this.checkLaserLineCollision(laser, target);
  }

  // Check collision between a laser line and a circular entity
  checkLaserLineCollision(laser, target) {
    const laserStartX = laser.x;
    const laserStartY = laser.y;
    const laserEndX = laser.x + Math.cos(laser.angle) * laser.length;
    const laserEndY = laser.y + Math.sin(laser.angle) * laser.length;

    const circleX = target.x;
    const circleY = target.y;
    const circleRadius = target.size || target.radius || 10;

    const dx = laserEndX - laserStartX;
    const dy = laserEndY - laserStartY;
    const lengthSq = dx * dx + dy * dy;
    
    if (lengthSq === 0) {
      // Laser has no length, check point collision
      const distSq = (circleX - laserStartX) ** 2 + (circleY - laserStartY) ** 2;
      return distSq <= circleRadius ** 2;
    }
    
    let t = ((circleX - laserStartX) * dx + (circleY - laserStartY) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t)); // Clamp t between 0 and 1

    const closestX = laserStartX + t * dx;
    const closestY = laserStartY + t * dy;

    const distDx = circleX - closestX;
    const distDy = circleY - closestY;
    const distance = Math.sqrt(distDx * distDx + distDy * distDy);

    return distance < circleRadius + (laser.width || 2) / 2;
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
    const circleRadius =
      circleEntity.hitboxSize || circleEntity.radius || circleEntity.size || 10;

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
    const t = Math.max(
      0,
      Math.min(
        1,
        (toCircleX * lineVecX + toCircleY * lineVecY) / lineLengthSquared
      )
    );

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

  // Duplicate method removed - using bumper cars implementation above

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

  // Handle metal-to-metal collisions with optimized iterations
  handleMetalToMetalCollisions() {
    const metals = this.entities.metals;
    if (!metals || metals.length < 2) {
      return; // Need at least 2 metals for collision
    }

    // Limit iterations based on number of metals to prevent excessive computation
    const maxIterations = Math.min(3, Math.ceil(metals.length / 2));
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let collisionsFound = false;
      let totalSeparations = 0;
      
      // Check all pairs of metals for collisions
      for (let i = 0; i < metals.length - 1; i++) {
        const metal1 = metals[i];
        
        for (let j = i + 1; j < metals.length; j++) {
          const metal2 = metals[j];
          
          // Use proper metal-to-metal collision detection with contact points
          const collisionInfo = metal1.checkMetalCollision(metal2);
          if (collisionInfo) {
            // Process collision between the two metals
            metal1.handleMetalCollision(metal2, collisionInfo);
            collisionsFound = true;
            totalSeparations++;
            
            // Continue checking other pairs in this iteration
            // Don't break early to handle all simultaneous collisions
          }
        }
      }
      
      // If no collisions were found in this iteration, we can stop early
      if (!collisionsFound) {
        break;
      }
      
      // If we're making too many corrections in one iteration, 
      // spread the corrections over multiple frames for stability
      if (totalSeparations > metals.length * 2) {
        break; // Prevent oscillations from over-correction
      }
    }
  }

  // Handle metal-to-asteroid collisions
  handleMetalAsteroidCollisions() {
    const metals = this.entities.metals;
    const asteroids = this.entities.asteroids;
    
    if (!metals || metals.length === 0 || !asteroids || asteroids.length === 0) {
      return;
    }
    
    for (const metal of metals) {
      for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];
        
        // Check collision between metal and asteroid
        const collisionSegment = metal.checkPlayerCollision(asteroid); // Reuse circular collision detection
        if (collisionSegment) {
          // Apply physics collision to both objects
          const result = metal.handleAsteroidCollision(asteroid, collisionSegment);
          
          if (result && result.velocityChange) {
            // Apply velocity change to asteroid
            asteroid.vx = (asteroid.vx || 0) + result.velocityChange.x;
            asteroid.vy = (asteroid.vy || 0) + result.velocityChange.y;
          }
          
          // Create subtle visual effects for metal-asteroid collision
          if (result && result.contactPoint) {
            // Create a small, brief effect instead of the full asteroid hit effect
            this.game.effects.createDebris(
              result.contactPoint.x, 
              result.contactPoint.y, 
              "#888888", // Gray debris for metal collision
              3, // Small number of particles
              15 // Short duration
            );
          }
        }
      }
    }
  }
}
