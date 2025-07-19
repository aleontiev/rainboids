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
    const skipPlayerCollisions = this.game.state.state === "DYING" || this.game.state.state === "GAME_OVER";
    
    if (!skipPlayerCollisions) {
      // Player vs asteroids
      this.handlePlayerAsteroidCollisions();

      // Player vs all enemies (unified)
      this.handlePlayerEnemyCollisions();

      // Player vs enemy bullets
      this.handlePlayerEnemyBulletCollisions();

      // Player vs enemy lasers
      this.handlePlayerEnemyLaserCollisions();

      // Player vs missiles
      this.handlePlayerMissileCollisions();

      // Player vs spreading bullets
      this.handlePlayerSpreadingBulletCollisions();

      // Player vs metals (non-damaging collision)
      this.handlePlayerMetalCollisions();
    }

    // Player bullets vs enemies
    this.handlePlayerBulletEnemyCollisions();

    // Player bullets vs asteroids
    this.handlePlayerBulletAsteroidCollisions();

    // Player bullets vs metals (bouncing)
    this.handlePlayerBulletMetalCollisions();

    // Enemy bullets vs asteroids
    this.handleEnemyBulletAsteroidCollisions();

    // Enemy bullets vs metals (bouncing)
    this.handleEnemyBulletMetalCollisions();

    // Enemy lasers vs metals (bouncing)
    this.handleEnemyLaserMetalCollisions();

    // Enemy lasers vs asteroids
    this.handleEnemyLaserAsteroidCollisions();

    // Player vs powerups
    this.handlePlayerPowerupCollisions();

    // Handle continuous laser beam collisions
    this.handleContinuousLaserCollisions();
  }

  // PLAYER COLLISIONS

  handlePlayerAsteroidCollisions() {
    for (let i = this.entities.asteroids.length - 1; i >= 0; i--) {
      if (
        this.checkPlayerCollision(this.game.player, this.entities.asteroids[i])
      ) {
        if (this.game.player.godMode) {
          // In godmode, destroy the asteroid instead of taking damage
          const asteroid = this.entities.asteroids[i];
          this.entities.asteroids.splice(i, 1);
          this.game.effects.createDebris(asteroid.x, asteroid.y, "#ffffff");
          this.game.audio.play(this.game.audio.sounds.asteroidExplosion);
          this.game.effects.createExplosion(
            this.game.player.x,
            this.game.player.y
          );
          continue;
        }

        // Check for damage collision (excludes godmode but includes shielding/rainbow)
        if (
          this.checkPlayerDamageCollision(
            this.game.player,
            this.entities.asteroids[i]
          )
        ) {
          if (this.game.player.secondShip.length > 0) {
            const destroyedShip = this.game.player.secondShip.pop();
            this.game.effects.createExplosion(destroyedShip.x, destroyedShip.y);
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
            this.game.death.start();
            return;
          }
        }
      }
    }
  }

  handlePlayerEnemyCollisions() {
    for (let i = this.entities.allEnemies.length - 1; i >= 0; i--) {
      if (
        this.checkPlayerCollision(this.game.player, this.entities.allEnemies[i])
      ) {
        const enemy = this.entities.allEnemies[i];

        if (this.game.player.godMode) {
          // In godmode, destroy regular enemies but not miniboss or boss
          if (!(enemy instanceof MiniBoss) && !(enemy instanceof Boss)) {
            this.entities.removeDestroyedEnemy(enemy);
            this.game.effects.createExplosion(enemy.x, enemy.y);
            continue;
          } else {
            // Miniboss and boss are immune to godmode destruction
            continue;
          }
        }

        // Check for damage collision (excludes godmode but includes shielding/rainbow)
        if (
          this.checkPlayerDamageCollision(
            this.game.player,
            this.entities.allEnemies[i]
          )
        ) {
          if (this.game.player.secondShip.length > 0) {
            const destroyedShip = this.game.player.secondShip.pop();
            this.game.effects.createExplosion(destroyedShip.x, destroyedShip.y);
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
            this.game.death.start();
            return;
          }
        }
      }
    }
  }

  handlePlayerEnemyBulletCollisions() {
    for (let i = this.entities.enemyBullets.length - 1; i >= 0; i--) {
      if (
        this.checkPlayerCollision(
          this.game.player,
          this.entities.enemyBullets[i]
        )
      ) {
        if (this.game.player.godMode) {
          // In godmode, destroy the enemy bullet instead of taking damage
          this.entities.enemyBullets.splice(i, 1);
          this.game.effects.createExplosion(
            this.game.player.x,
            this.game.player.y
          );
          continue;
        }

        // Check for damage collision (excludes godmode but includes shielding/rainbow)
        if (
          this.checkPlayerDamageCollision(
            this.game.player,
            this.entities.enemyBullets[i]
          )
        ) {
          if (this.game.player.secondShip.length > 0) {
            const destroyedShip = this.game.player.secondShip.pop();
            this.game.effects.createExplosion(destroyedShip.x, destroyedShip.y);
            this.entities.enemyBullets.splice(i, 1);
            this.game.progress.update();
          } else if (this.game.player.shield > 0) {
            this.game.player.shield--;
            this.entities.enemyBullets.splice(i, 1);
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
            this.game.death.start();
            return;
          }
        }
      }
    }
  }

  handlePlayerEnemyLaserCollisions() {
    for (let i = this.entities.enemyLasers.length - 1; i >= 0; i--) {
      if (
        this.checkPlayerLaserCollision(
          this.game.player,
          this.entities.enemyLasers[i]
        )
      ) {
        if (this.game.player.godMode) {
          // In godmode, destroy the enemy laser instead of taking damage
          this.entities.enemyLasers.splice(i, 1);
          this.game.effects.createExplosion(
            this.game.player.x,
            this.game.player.y
          );
          continue;
        }

        // Check for damage collision (excludes godmode but includes shielding/rainbow)
        if (
          this.checkPlayerLaserDamageCollision(
            this.game.player,
            this.entities.enemyLasers[i]
          )
        ) {
          if (this.game.player.secondShip.length > 0) {
            const destroyedShip = this.game.player.secondShip.pop();
            this.game.effects.createExplosion(destroyedShip.x, destroyedShip.y);
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
            this.game.death.start();
            return;
          }
        }
      }
    }
  }

  handlePlayerMissileCollisions() {
    for (let i = this.entities.missiles.length - 1; i >= 0; i--) {
      if (
        this.checkPlayerCollision(this.game.player, this.entities.missiles[i])
      ) {
        if (this.game.player.godMode) {
          // In godmode, destroy the missile instead of taking damage
          this.entities.missiles.splice(i, 1);
          this.game.effects.createExplosion(
            this.game.player.x,
            this.game.player.y
          );
          continue;
        }

        // Check for damage collision (excludes godmode but includes shielding/rainbow)
        if (
          this.checkPlayerDamageCollision(
            this.game.player,
            this.entities.missiles[i]
          )
        ) {
          if (this.game.player.secondShip.length > 0) {
            const destroyedShip = this.game.player.secondShip.pop();
            this.game.effects.createExplosion(destroyedShip.x, destroyedShip.y);
            this.entities.missiles.splice(i, 1);
            this.game.progress.update();
          } else if (this.game.player.shield > 0) {
            this.game.player.shield--;
            this.entities.missiles.splice(i, 1);
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
            this.game.death.start();
            return;
          }
        }
      }
    }
  }

  handlePlayerSpreadingBulletCollisions() {
    for (let i = this.entities.spreadingBullets.length - 1; i >= 0; i--) {
      for (const segment of this.entities.spreadingBullets[i].segments) {
        if (this.checkPlayerCollision(this.game.player, segment)) {
          if (this.game.player.godMode) {
            // In godmode, destroy the spreading bullet instead of taking damage
            this.entities.spreadingBullets.splice(i, 1);
            this.game.effects.createExplosion(
              this.game.player.x,
              this.game.player.y
            );
            break;
          }

          // Check for damage collision (excludes godmode but includes shielding/rainbow)
          if (this.checkPlayerDamageCollision(this.game.player, segment)) {
            if (this.game.player.secondShip.length > 0) {
              const destroyedShip = this.game.player.secondShip.pop();
              this.game.effects.createExplosion(
                destroyedShip.x,
                destroyedShip.y
              );
              this.entities.spreadingBullets.splice(i, 1);
              this.game.progress.update();
            } else if (this.game.player.shield > 0) {
              this.game.player.shield--;
              this.entities.spreadingBullets.splice(i, 1);
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
              this.game.death.start();
              return;
            }
            break;
          }
        }
      }
    }
  }

  handlePlayerPowerupCollisions() {
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
        // Calculate push direction - push player away from metal
        const metalDirection = {
          x: metal.vx,
          y: metal.vy,
        };

        // Calculate normal vector to the collision segment
        const dx = collisionSegment.x2 - collisionSegment.x1;
        const dy = collisionSegment.y2 - collisionSegment.y1;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length > 0) {
          // Get perpendicular normal vector
          const nx = -dy / length;
          const ny = dx / length;

          // Determine which side of the line the player is on
          const playerRelativeX = this.game.player.x - collisionSegment.x1;
          const playerRelativeY = this.game.player.y - collisionSegment.y1;
          const side = playerRelativeX * nx + playerRelativeY * ny > 0 ? 1 : -1;

          // Push player away from metal surface
          const pushDistance =
            this.game.player.hitboxSize + metal.thickness / 2 + 5;
          const pushX = nx * side * pushDistance;
          const pushY = ny * side * pushDistance;

          // Set player position to safe distance from metal
          this.game.player.x =
            collisionSegment.x1 +
            (collisionSegment.x2 - collisionSegment.x1) * 0.5 +
            pushX;
          this.game.player.y =
            collisionSegment.y1 +
            (collisionSegment.y2 - collisionSegment.y1) * 0.5 +
            pushY;

          // Add some velocity to push player away if metal is moving toward player
          const metalSpeed = Math.sqrt(
            metal.vx * metal.vx + metal.vy * metal.vy
          );
          if (metalSpeed > 0) {
            const dotProduct =
              (metal.vx * pushX + metal.vy * pushY) / pushDistance;
            if (dotProduct > 0) {
              // Metal is moving toward player
              this.game.player.vx += (pushX / pushDistance) * metalSpeed * 0.3;
              this.game.player.vy += (pushY / pushDistance) * metalSpeed * 0.3;
            }
          }
        }
        break; // Only handle one collision per frame
      }
    }
  }

  // PLAYER BULLET COLLISIONS

  handlePlayerBulletEnemyCollisions() {
    for (let i = this.entities.bullets.length - 1; i >= 0; i--) {
      const bullet = this.entities.bullets[i];
      let bulletHit = false;

      for (let j = this.entities.allEnemies.length - 1; j >= 0; j--) {
        const enemy = this.entities.allEnemies[j];

        // Use appropriate collision detection based on bullet type
        const isCollision = bullet.isPlayerLaser 
          ? this.checkLaserCollision(bullet, enemy)
          : this.checkCollision(bullet, enemy);

        if (isCollision) {
          // Handle hit
          const result = enemy.takeDamage
            ? enemy.takeDamage(bullet.damage, bullet.x, bullet.y)
            : "destroyed";

          if (result === "destroyed") {
            this.game.state.addScore(enemy.scoreValue || 100);
            this.game.effects.createExplosion(enemy.x, enemy.y);
            this.game.audio.play(this.game.audio.sounds.enemyExplosion);
            this.entities.removeDestroyedEnemy(enemy);
          } else if (result === "damaged") {
            this.game.effects.createExplosion(bullet.x, bullet.y, 3, 1.5);
            this.game.audio.play(this.game.audio.sounds.hit);
          }

          // For player lasers, register the hit but don't always destroy the laser
          if (bullet.isPlayerLaser && bullet.registerHit && bullet.registerHit()) {
            bulletHit = true; // Laser has reached max penetration
          } else if (!bullet.isPlayerLaser) {
            bulletHit = true; // Regular bullet always gets destroyed on hit
          }
          break;
        }
      }

      if (bulletHit) {
        this.entities.bullets.splice(i, 1);
      }
    }
  }

  handlePlayerBulletAsteroidCollisions() {
    for (let i = this.entities.bullets.length - 1; i >= 0; i--) {
      const bullet = this.entities.bullets[i];
      let bulletHit = false;

      for (let j = this.entities.asteroids.length - 1; j >= 0; j--) {
        const asteroid = this.entities.asteroids[j];

        // Use appropriate collision detection based on bullet type
        const isCollision = bullet.isPlayerLaser 
          ? this.checkLaserCollision(bullet, asteroid)
          : this.checkCollision(bullet, asteroid);

        if (isCollision) {
          // Use asteroid's health system with impact coordinates
          const damageResult = asteroid.takeDamage(1, bullet.x, bullet.y);
          this.game.effects.createAsteroidHitEffect(bullet.x, bullet.y);
          
          if (damageResult) {
            // Handle asteroid destruction based on damage result
            this.entities.asteroids.splice(j, 1);
            this.game.effects.createDebris(asteroid.x, asteroid.y, "#ffffff");
            this.game.audio.play(this.game.audio.sounds.asteroidExplosion);
            this.game.state.addScore(50);

            if (damageResult === 'breakIntoMedium') {
              // Large asteroid breaks into 2 medium asteroids
              for (let k = 0; k < 2; k++) {
                this.entities.spawnAsteroid(
                  "medium",
                  asteroid.x + (Math.random() - 0.5) * 40,
                  asteroid.y + (Math.random() - 0.5) * 40,
                  (Math.random() - 0.5) * 3,
                  (Math.random() - 0.5) * 3
                );
              }
            } else if (damageResult === 'breakIntoSmall') {
              // Medium asteroid breaks into 2 small asteroids
              for (let k = 0; k < 2; k++) {
                this.entities.spawnAsteroid(
                  "small",
                  asteroid.x + (Math.random() - 0.5) * 40,
                  asteroid.y + (Math.random() - 0.5) * 40,
                  (Math.random() - 0.5) * 3,
                  (Math.random() - 0.5) * 3
                );
              }
            }
            // If damageResult === 'destroyed', just remove asteroid (no breakup)
          }

          // For player lasers, register the hit but don't always destroy the laser
          if (bullet.isPlayerLaser && bullet.registerHit && bullet.registerHit()) {
            bulletHit = true; // Laser has reached max penetration
          } else if (!bullet.isPlayerLaser) {
            bulletHit = true; // Regular bullet always gets destroyed on hit
          }
          break;
        }
      }

      if (bulletHit) {
        this.entities.bullets.splice(i, 1);
      }
    }
  }

  handlePlayerBulletMetalCollisions() {
    for (let i = this.entities.bullets.length - 1; i >= 0; i--) {
      const bullet = this.entities.bullets[i];

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

  // ENEMY BULLET COLLISIONS

  handleEnemyBulletAsteroidCollisions() {
    for (let i = this.entities.enemyBullets.length - 1; i >= 0; i--) {
      const enemyBullet = this.entities.enemyBullets[i];

      for (let j = this.entities.asteroids.length - 1; j >= 0; j--) {
        const asteroid = this.entities.asteroids[j];

        if (this.checkCollision(enemyBullet, asteroid)) {
          this.entities.enemyBullets.splice(i, 1);

          const damageResult = asteroid.takeDamage(1);
          if (damageResult === "destroyed") {
            this.entities.asteroids.splice(j, 1);
            this.game.effects.createDebris(asteroid.x, asteroid.y, "#ffffff");
            this.game.effects.createAsteroidHitEffect(asteroid.x, asteroid.y);
            this.game.audio.play(this.game.audio.sounds.asteroidExplosion);

            // Create smaller asteroids if it was large
            if (asteroid.type === "large") {
              for (let k = 0; k < 2; k++) {
                this.entities.spawnAsteroid(
                  "small",
                  asteroid.x + (Math.random() - 0.5) * 40,
                  asteroid.y + (Math.random() - 0.5) * 40,
                  (Math.random() - 0.5) * 3,
                  (Math.random() - 0.5) * 3
                );
              }
            }
          }
          break;
        }
      }
    }
  }

  handleEnemyBulletMetalCollisions() {
    for (let i = this.entities.enemyBullets.length - 1; i >= 0; i--) {
      const bullet = this.entities.enemyBullets[i];

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

  // ENEMY LASER COLLISIONS

  handleEnemyLaserMetalCollisions() {
    for (let i = this.entities.enemyLasers.length - 1; i >= 0; i--) {
      const laser = this.entities.enemyLasers[i];

      for (const metal of this.entities.metals) {
        // Check if laser line intersects with metal segments
        const rotatedSegments = metal.getRotatedSegments();
        let collisionFound = false;

        for (const segment of rotatedSegments) {
          // Check if laser line intersects with metal segment
          if (this.checkLaserLineIntersection(laser, segment)) {
            // Calculate bounce direction using metal's method
            const bounceResult = metal.calculateLaserBounceDirection(
              laser,
              segment
            );
            const bounced = laser.registerBounce(bounceResult.angle);

            if (bounced) {
              this.entities.enemyLasers.splice(i, 1);
            }

            collisionFound = true;
            break;
          }
        }

        if (collisionFound) break;
      }
    }
  }

  handleEnemyLaserAsteroidCollisions() {
    for (let i = this.entities.enemyLasers.length - 1; i >= 0; i--) {
      const laser = this.entities.enemyLasers[i];

      for (let j = this.entities.asteroids.length - 1; j >= 0; j--) {
        const asteroid = this.entities.asteroids[j];

        if (this.checkLaserCollision(laser, asteroid)) {
          const hit = laser.registerHit();
          if (hit) {
            this.entities.enemyLasers.splice(i, 1);
          }

          const damageResult = asteroid.takeDamage(1);
          if (damageResult === "destroyed") {
            this.entities.asteroids.splice(j, 1);
            this.game.effects.createDebris(asteroid.x, asteroid.y, "#ffffff");
            this.game.effects.createAsteroidHitEffect(asteroid.x, asteroid.y);
            this.game.audio.play(this.game.audio.sounds.asteroidExplosion);
          }
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
}
