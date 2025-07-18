// Removed constants import - using defaults

/**
 * Autoaimer class - handles all auto-aiming functionality for the player
 * Includes target selection, predictive aiming, and intercept calculations
 */
export class Autoaimer {
  constructor(player) {
    this.player = player;
  }

  // Calculate intercept solution for ballistics prediction
  calculateInterceptSolution(
    playerX,
    playerY,
    playerVx,
    playerVy,
    targetX,
    targetY,
    targetVx,
    targetVy,
    bulletSpeed
  ) {
    // Relative position and velocity
    const relativeX = targetX - playerX;
    const relativeY = targetY - playerY;
    const relativeVx = targetVx - playerVx;
    const relativeVy = targetVy - playerVy;

    // Quadratic equation coefficients for intercept calculation
    // We solve: |relativePos + relativeVel * t| = bulletSpeed * t
    const a = relativeVx * relativeVx + relativeVy * relativeVy - bulletSpeed * bulletSpeed;
    const b = 2 * (relativeX * relativeVx + relativeY * relativeVy);
    const c = relativeX * relativeX + relativeY * relativeY;

    const discriminant = b * b - 4 * a * c;

    // No real solution if discriminant is negative
    if (discriminant < 0) {
      return null;
    }

    // Calculate the two potential solutions
    const sqrtDiscriminant = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDiscriminant) / (2 * a);
    const t2 = (-b + sqrtDiscriminant) / (2 * a);

    // Choose the positive solution with smallest time
    let interceptTime = null;
    if (t1 > 0 && t2 > 0) {
      interceptTime = Math.min(t1, t2);
    } else if (t1 > 0) {
      interceptTime = t1;
    } else if (t2 > 0) {
      interceptTime = t2;
    }

    if (interceptTime === null || interceptTime <= 0) {
      return null;
    }

    // Calculate intercept position
    const interceptX = targetX + targetVx * interceptTime;
    const interceptY = targetY + targetVy * interceptTime;

    // Calculate angle to intercept point
    const dx = interceptX - playerX;
    const dy = interceptY - playerY;
    const angle = Math.atan2(dy, dx);

    return {
      time: interceptTime,
      x: interceptX,
      y: interceptY,
      angle: angle,
      distance: Math.sqrt(dx * dx + dy * dy)
    };
  }

  // Calculate simple lead target without considering player velocity
  calculateSimpleLeadTarget(
    targetX,
    targetY,
    targetVx,
    targetVy,
    playerX,
    playerY,
    bulletSpeed
  ) {
    // Calculate relative position
    const dx = targetX - playerX;
    const dy = targetY - playerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If target is stationary or very close, aim directly at it
    if (Math.abs(targetVx) < 0.1 && Math.abs(targetVy) < 0.1 || distance < 50) {
      return {
        angle: Math.atan2(dy, dx),
        distance: distance,
        x: targetX,
        y: targetY,
        time: distance / bulletSpeed
      };
    }

    // Calculate time to reach target (rough estimate)
    const targetSpeed = Math.sqrt(targetVx * targetVx + targetVy * targetVy);
    const timeToReach = distance / bulletSpeed;

    // Predict where target will be
    const predictedX = targetX + targetVx * timeToReach;
    const predictedY = targetY + targetVy * timeToReach;

    // Calculate angle to predicted position
    const leadDx = predictedX - playerX;
    const leadDy = predictedY - playerY;
    const leadAngle = Math.atan2(leadDy, leadDx);

    return {
      angle: leadAngle,
      distance: Math.sqrt(leadDx * leadDx + leadDy * leadDy),
      x: predictedX,
      y: predictedY,
      time: timeToReach
    };
  }

  // Calculate the aim angle for the player based on current targets
  calculateAimAngle(
    enemies,
    asteroids,
    boss,
    keys,
    autoaimEnabled,
    autoplayEnabled,
    mainWeaponLevel,
    isPortrait
  ) {
    // Handle manual aiming when autoaim/autoplay is disabled
    if (!autoaimEnabled && !autoplayEnabled && keys.mousePosition) {
      // Desktop: aim toward mouse cursor
      const dx = keys.mousePosition.x - this.player.x;
      const dy = keys.mousePosition.y - this.player.y;
      return Math.atan2(dy, dx);
    } else if (!autoaimEnabled && !autoplayEnabled) {
      // Mobile: use default orientation when not using autoaim/autoplay
      if (isPortrait) {
        return -Math.PI / 2; // Face up
      } else {
        return 0; // Face right
      }
    }

    // Build complete target list, filter out invulnerable targets
    const allTargets = [...enemies, ...asteroids].filter((target) => {
      // Check if target is vulnerable to auto-aim
      if (
        target.isVulnerableToAutoAim &&
        typeof target.isVulnerableToAutoAim === "function"
      ) {
        return target.isVulnerableToAutoAim();
      }
      // For entities without isVulnerableToAutoAim method (like asteroids), check basic vulnerability
      return !target.godMode && !target.invulnerable;
    });

    // Add boss targetable parts if boss exists
    if (boss && !boss.isDefeated && boss.getTargetableParts) {
      allTargets.push(...boss.getTargetableParts());
    }

    // Filter out offscreen targets
    const onScreenTargets = allTargets.filter((target) =>
      this.isTargetInViewport(target)
    );

    if (
      (autoaimEnabled || autoplayEnabled || !keys.mousePosition) &&
      onScreenTargets.length > 0
    ) {
      const target = this.selectBestTarget(
        onScreenTargets,
        enemies,
        mainWeaponLevel
      );
      if (target) {
        const bulletSpeed = this.getCurrentBulletSpeed(mainWeaponLevel);
        return this.calculatePredictiveAim(target, bulletSpeed);
      }
    }

    // Default fallback angle
    return isPortrait ? -Math.PI / 2 : 0;
  }

  // Select the best target using priority system
  selectBestTarget(allTargets, enemies, mainWeaponLevel) {
    const bulletSpeed = this.getCurrentBulletSpeed(mainWeaponLevel);
    const shootingEnemyTypes = ["straight", "sine", "zigzag"];

    // Count enemies in viewport and check for minibosses/bosses
    const enemiesInViewport = enemies.filter((enemy) =>
      this.isTargetInViewport(enemy)
    );
    const hasMinibossOrBoss = allTargets.some(
      (target) =>
        target.collidableType === "boss" ||
        target.maxHealth > 50 || // Miniboss typically has > 50 health
        (target.type &&
          (target.type.includes("boss") || target.type.includes("miniboss")))
    );

    // Special asteroid prioritization condition:
    // If there are no minibosses/bosses AND fewer than 3 enemies in viewport
    const shouldPrioritizeAsteroids =
      !hasMinibossOrBoss && enemiesInViewport.length < 3;

    // Priority 1: Very close targets (within 200px) - any enemy or asteroid
    // Enhanced to prefer targets we can actually hit
    let closestNearbyTarget = null;
    let bestNearbyScore = -1;

    for (const target of allTargets) {
      if (this.isTargetInViewport(target)) {
        const dist = Math.sqrt(
          (target.x - this.player.x) ** 2 + (target.y - this.player.y) ** 2
        );
        if (dist < 200) {
          // Calculate hit probability for this target
          const hitScore = this.calculateTargetHitScore(
            target,
            bulletSpeed,
            dist
          );
          const combinedScore = hitScore * (1.0 - dist / 200); // Closer = better

          if (combinedScore > bestNearbyScore) {
            bestNearbyScore = combinedScore;
            closestNearbyTarget = target;
          }
        }
      }
    }

    if (closestNearbyTarget) {
      return closestNearbyTarget;
    }

    // Priority 2: Asteroids (when conditions are met)
    if (shouldPrioritizeAsteroids) {
      let closestAsteroid = null;
      let closestAsteroidDistance = Infinity;

      for (const target of allTargets) {
        // Check if target is an asteroid (either by collidableType or by checking if it's not an enemy)
        const isAsteroid =
          target.collidableType === "asteroid" ||
          (!target.type &&
            !target.maxHealth &&
            target.size &&
            target.vx !== undefined);

        if (isAsteroid && this.isTargetInViewport(target)) {
          const dist = Math.sqrt(
            (target.x - this.player.x) ** 2 + (target.y - this.player.y) ** 2
          );
          if (dist < closestAsteroidDistance) {
            closestAsteroidDistance = dist;
            closestAsteroid = target;
          }
        }
      }

      if (closestAsteroid) {
        return closestAsteroid;
      }
    }

    // Priority 3: Shooting enemies (nearby ones first)
    let closestShootingEnemy = null;
    let closestShootingDistance = Infinity;

    for (const enemy of enemies) {
      if (
        shootingEnemyTypes.includes(enemy.type) &&
        this.isTargetInViewport(enemy)
      ) {
        const dist = Math.sqrt(
          (enemy.x - this.player.x) ** 2 + (enemy.y - this.player.y) ** 2
        );
        if (dist < closestShootingDistance) {
          closestShootingDistance = dist;
          closestShootingEnemy = enemy;
        }
      }
    }

    if (closestShootingEnemy) {
      return closestShootingEnemy;
    }

    // Priority 4: Any enemies (nearby ones first)
    let closestEnemy = null;
    let closestEnemyDistance = Infinity;

    for (const enemy of enemies) {
      if (this.isTargetInViewport(enemy)) {
        const dist = Math.sqrt(
          (enemy.x - this.player.x) ** 2 + (enemy.y - this.player.y) ** 2
        );
        if (dist < closestEnemyDistance) {
          closestEnemyDistance = dist;
          closestEnemy = enemy;
        }
      }
    }

    if (closestEnemy) {
      return closestEnemy;
    }

    // Priority 5: Asteroids (fallback if no enemies available)
    let closestAsteroid = null;
    let closestAsteroidDistance = Infinity;

    for (const target of allTargets) {
      const isAsteroid =
        target.collidableType === "asteroid" ||
        (!target.type &&
          !target.maxHealth &&
          target.size &&
          target.vx !== undefined);

      if (isAsteroid && this.isTargetInViewport(target)) {
        const dist = Math.sqrt(
          (target.x - this.player.x) ** 2 + (target.y - this.player.y) ** 2
        );
        if (dist < closestAsteroidDistance) {
          closestAsteroidDistance = dist;
          closestAsteroid = target;
        }
      }
    }

    return closestAsteroid;
  }

  // Enhanced interceptive targeting that accounts for all velocity vectors
  calculatePredictiveAim(target, bulletSpeed) {
    if (bulletSpeed === Infinity || bulletSpeed >= 80) {
      // For laser, aim directly at target
      return Math.atan2(target.y - this.player.y, target.x - this.player.x);
    }

    // Get target velocity (some targets may not have velocity)
    const targetVx =
      target.vx !== undefined ? target.vx : (target.dx || 0) / 60;
    const targetVy =
      target.vy !== undefined ? target.vy : (target.dy || 0) / 60;

    // Get player velocity
    const playerVx = this.player.vx || 0;
    const playerVy = this.player.vy || 0;

    // Initial positions
    const targetX = target.x;
    const targetY = target.y;
    const playerX = this.player.x;
    const playerY = this.player.y;

    // Calculate intercept solution using proper interceptive targeting math
    const interceptSolution = this.calculateInterceptSolution(
      playerX,
      playerY,
      playerVx,
      playerVy,
      targetX,
      targetY,
      targetVx,
      targetVy,
      bulletSpeed
    );

    if (interceptSolution) {
      const { interceptX, interceptY, interceptTime } = interceptSolution;

      // Validate the solution - make sure intercept point is reasonable
      const distanceToIntercept = Math.sqrt(
        (interceptX - playerX) ** 2 + (interceptY - playerY) ** 2
      );
      const maxReasonableDistance = bulletSpeed * 180; // 3 seconds at bullet speed

      if (
        interceptTime > 0 &&
        interceptTime < 180 &&
        distanceToIntercept < maxReasonableDistance
      ) {
        // Return angle to intercept point
        return Math.atan2(interceptY - playerY, interceptX - playerX);
      }
    }

    // Fallback: simple leading target (without player velocity consideration)
    const fallbackSolution = this.calculateSimpleLeadTarget(
      targetX,
      targetY,
      targetVx,
      targetVy,
      playerX,
      playerY,
      bulletSpeed
    );

    if (fallbackSolution) {
      return Math.atan2(
        fallbackSolution.y - playerY,
        fallbackSolution.x - playerX
      );
    }

    // Final fallback: direct aim
    return Math.atan2(targetY - playerY, targetX - playerX);
  }

  // Calculate how likely we are to hit a target based on its movement pattern
  calculateTargetHitScore(target, bulletSpeed, distance) {
    // Get target velocity
    const targetVx =
      target.vx !== undefined ? target.vx : (target.dx || 0) / 60;
    const targetVy =
      target.vy !== undefined ? target.vy : (target.dy || 0) / 60;
    const targetSpeed = Math.sqrt(targetVx * targetVx + targetVy * targetVy);

    // Base score starts high
    let hitScore = 1.0;

    // Penalize fast-moving targets
    if (targetSpeed > 0) {
      const relativeSpeed = targetSpeed / bulletSpeed;
      hitScore *= Math.max(0.1, 1.0 - relativeSpeed * 0.5);
    }

    // Check if we can calculate a valid intercept
    const interceptSolution = this.calculateInterceptSolution(
      this.player.x,
      this.player.y,
      this.player.vx || 0,
      this.player.vy || 0,
      target.x,
      target.y,
      targetVx,
      targetVy,
      bulletSpeed
    );

    if (!interceptSolution) {
      hitScore *= 0.2; // Heavy penalty for no intercept solution
    } else {
      const { interceptTime } = interceptSolution;

      // Prefer targets that require less lead time
      if (interceptTime > 0) {
        hitScore *= Math.max(0.3, 1.0 - interceptTime / 120); // 2 seconds max lead time
      }
    }

    // Bonus for stationary or slow targets
    if (targetSpeed < 1.0) {
      hitScore *= 1.2; // 20% bonus for nearly stationary targets
    }

    // Penalty for targets moving perpendicular to our line of sight
    if (targetSpeed > 0) {
      const dx = target.x - this.player.x;
      const dy = target.y - this.player.y;
      const toTargetLength = Math.sqrt(dx * dx + dy * dy);

      if (toTargetLength > 0) {
        const toTargetX = dx / toTargetLength;
        const toTargetY = dy / toTargetLength;

        // Dot product of target velocity with direction to target
        const radialComponent = Math.abs(
          targetVx * toTargetX + targetVy * toTargetY
        );
        const tangentialComponent = targetSpeed - radialComponent;

        // Penalize high tangential movement (harder to hit)
        hitScore *= Math.max(
          0.4,
          1.0 - (tangentialComponent / bulletSpeed) * 0.8
        );
      }
    }

    return Math.max(0.1, Math.min(1.0, hitScore));
  }

  // Helper function to check if target is within viewport
  isTargetInViewport(target) {
    return (
      target.x >= 0 &&
      target.x <= window.innerWidth &&
      target.y >= 0 &&
      target.y <= window.innerHeight
    );
  }

  // Helper function to get current bullet speed based on weapon level
  getCurrentBulletSpeed(level) {
    if (level === 5) return 80;
    if (level === 4) return 16;
    return 8;
  }
}

