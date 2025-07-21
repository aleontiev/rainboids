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
      // Check if target is vulnerable
      if (
        target.isVulnerable &&
        typeof target.isVulnerable === "function"
      ) {
        return target.isVulnerable();
      }
      // For entities without isVulnerable method, check basic vulnerability
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

  // Enhanced target selection with threat prioritization
  selectBestTarget(allTargets, enemies, mainWeaponLevel) {
    const bulletSpeed = this.getCurrentBulletSpeed(mainWeaponLevel);
    
    // Get metal objects for bouncing calculations
    const metals = this.player.game?.entities?.metals || [];

    // Analyze all targets for threat levels
    const threatAnalysis = this.analyzeThreatLevels(allTargets, enemies, metals, bulletSpeed);

    // Priority 1: Collision threats - enemies about to collide with player
    const collisionThreats = threatAnalysis.filter(t => t.threatType === 'collision');
    if (collisionThreats.length > 0) {
      // Sort by time to collision (most urgent first)
      collisionThreats.sort((a, b) => a.timeToCollision - b.timeToCollision);
      return collisionThreats[0].target;
    }

    // Priority 2: Laser threats - enemies shooting lasers at player
    const laserThreats = threatAnalysis.filter(t => t.threatType === 'laser');
    if (laserThreats.length > 0) {
      // Sort by distance (closer threats first)
      laserThreats.sort((a, b) => a.distance - b.distance);
      return laserThreats[0].target;
    }

    // Priority 3: Bullet threats - enemies shooting bullets, prioritized by distance
    const bulletThreats = threatAnalysis.filter(t => t.threatType === 'bullet');
    if (bulletThreats.length > 0) {
      // Sort by distance (closer threats first)
      bulletThreats.sort((a, b) => a.distance - b.distance);
      return bulletThreats[0].target;
    }

    // Priority 4: Best hittable target considering bouncing trajectories
    const hittableTargets = threatAnalysis.filter(t => t.canHit);
    if (hittableTargets.length > 0) {
      // Sort by hit score (considering trajectory difficulty, metal bouncing, etc.)
      hittableTargets.sort((a, b) => b.hitScore - a.hitScore);
      return hittableTargets[0].target;
    }

    // Priority 5: Fallback to closest target
    let closestTarget = null;
    let closestDistance = Infinity;

    for (const target of allTargets) {
      if (this.isTargetInViewport(target)) {
        const dist = Math.sqrt(
          (target.x - this.player.x) ** 2 + (target.y - this.player.y) ** 2
        );
        if (dist < closestDistance) {
          closestDistance = dist;
          closestTarget = target;
        }
      }
    }

    return closestTarget;
  }

  // Analyze threat levels for all targets
  analyzeThreatLevels(allTargets, enemies, metals, bulletSpeed) {
    const analysis = [];

    for (const target of allTargets) {
      if (!this.isTargetInViewport(target)) continue;

      const distance = Math.sqrt(
        (target.x - this.player.x) ** 2 + (target.y - this.player.y) ** 2
      );

      const threatInfo = {
        target: target,
        distance: distance,
        threatType: 'none',
        timeToCollision: Infinity,
        canHit: false,
        hitScore: 0,
        trajectoryData: null
      };

      // Determine threat type based on enemy behavior
      if (target.collidableType === 'enemy' || enemies.includes(target)) {
        threatInfo.threatType = this.classifyEnemyThreat(target);
        threatInfo.timeToCollision = this.calculateTimeToCollision(target);
      }

      // Calculate if we can hit this target (including bouncing trajectories)
      const trajectoryAnalysis = this.analyzeTrajectoryToTarget(target, metals, bulletSpeed);
      threatInfo.canHit = trajectoryAnalysis.canHit;
      threatInfo.hitScore = trajectoryAnalysis.hitScore;
      threatInfo.trajectoryData = trajectoryAnalysis;

      analysis.push(threatInfo);
    }

    return analysis;
  }

  // Classify enemy threat type based on behavior
  classifyEnemyThreat(enemy) {
    // Check if enemy is on collision course
    const timeToCollision = this.calculateTimeToCollision(enemy);
    if (timeToCollision < 120) { // 2 seconds at 60fps
      return 'collision';
    }

    // Check enemy type for shooting behavior
    if (enemy.type === 'laser') {
      return 'laser';
    }

    // Check if enemy shoots bullets
    const shootingTypes = ['straight', 'sine', 'zigzag', 'circle', 'square', 'pulse'];
    if (shootingTypes.includes(enemy.type)) {
      return 'bullet';
    }

    return 'passive';
  }

  // Calculate time until enemy collides with player
  calculateTimeToCollision(enemy) {
    const enemyVx = enemy.vx !== undefined ? enemy.vx : (enemy.dx || 0) / 60;
    const enemyVy = enemy.vy !== undefined ? enemy.vy : (enemy.dy || 0) / 60;

    // If enemy isn't moving toward player, no collision threat
    const dx = this.player.x - enemy.x;
    const dy = this.player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return 0;

    // Check if enemy is moving toward player
    const relativeVx = enemyVx - (this.player.vx || 0);
    const relativeVy = enemyVy - (this.player.vy || 0);
    
    // Dot product to see if enemy is approaching
    const approachRate = (dx * relativeVx + dy * relativeVy) / distance;
    
    if (approachRate <= 0) return Infinity; // Not approaching

    // Calculate collision time with hitbox consideration
    const collisionDistance = distance - (enemy.size || 20) - (this.player.hitboxSize || 6);
    return Math.max(0, collisionDistance / approachRate);
  }

  // Analyze trajectory to target including metal bouncing
  analyzeTrajectoryToTarget(target, metals, bulletSpeed) {
    const directTrajectory = this.analyzeDirectTrajectory(target, bulletSpeed);
    
    // If direct shot works and no metals in the way, prefer it
    if (directTrajectory.canHit && !this.hasMetalObstruction(this.player, target, metals)) {
      return {
        canHit: true,
        hitScore: directTrajectory.hitScore * 1.2, // Bonus for direct shots
        bounceCount: 0,
        trajectory: directTrajectory
      };
    }

    // Try bouncing trajectories if direct shot is blocked
    const bounceTrajectories = this.calculateBounceTrajectories(target, metals, bulletSpeed);
    
    if (bounceTrajectories.length > 0) {
      // Sort by hit score and choose best
      bounceTrajectories.sort((a, b) => b.hitScore - a.hitScore);
      const best = bounceTrajectories[0];
      
      return {
        canHit: true,
        hitScore: best.hitScore * (1.0 - best.bounceCount * 0.1), // Penalty for bounces
        bounceCount: best.bounceCount,
        trajectory: best
      };
    }

    return {
      canHit: directTrajectory.canHit,
      hitScore: directTrajectory.hitScore * 0.5, // Penalty for blocked shots
      bounceCount: 0,
      trajectory: directTrajectory
    };
  }

  // Analyze direct trajectory to target
  analyzeDirectTrajectory(target, bulletSpeed) {
    const interceptSolution = this.calculateInterceptSolution(
      this.player.x,
      this.player.y,
      this.player.vx || 0,
      this.player.vy || 0,
      target.x,
      target.y,
      target.vx !== undefined ? target.vx : (target.dx || 0) / 60,
      target.vy !== undefined ? target.vy : (target.dy || 0) / 60,
      bulletSpeed
    );

    if (!interceptSolution) {
      return { canHit: false, hitScore: 0 };
    }

    const hitScore = this.calculateTargetHitScore(target, bulletSpeed, interceptSolution.distance);
    
    return {
      canHit: true,
      hitScore: hitScore,
      interceptPoint: { x: interceptSolution.x, y: interceptSolution.y },
      angle: interceptSolution.angle,
      time: interceptSolution.time
    };
  }

  // Check if metal objects obstruct line of sight
  hasMetalObstruction(from, to, metals) {
    for (const metal of metals) {
      const segments = metal.getRotatedSegments();
      
      for (const segment of segments) {
        if (this.lineIntersectsSegment(from.x, from.y, to.x, to.y, segment)) {
          return true;
        }
      }
    }
    return false;
  }

  // Check if line intersects with metal segment
  lineIntersectsSegment(x1, y1, x2, y2, segment) {
    const { x1: sx1, y1: sy1, x2: sx2, y2: sy2 } = segment;
    
    const denom = (x1 - x2) * (sy1 - sy2) - (y1 - y2) * (sx1 - sx2);
    if (Math.abs(denom) < 1e-10) return false; // Parallel lines
    
    const t = ((x1 - sx1) * (sy1 - sy2) - (y1 - sy1) * (sx1 - sx2)) / denom;
    const u = -((x1 - x2) * (y1 - sy1) - (y1 - y2) * (x1 - sx1)) / denom;
    
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  // Calculate possible bouncing trajectories
  calculateBounceTrajectories(target, metals, bulletSpeed, maxBounces = 2) {
    const trajectories = [];
    
    // For each metal object, try bouncing off it to reach the target
    for (const metal of metals) {
      const segments = metal.getRotatedSegments();
      
      for (const segment of segments) {
        const bounceTrajectory = this.calculateSingleBounceTrajectory(
          this.player, target, segment, bulletSpeed
        );
        
        if (bounceTrajectory && bounceTrajectory.canHit) {
          trajectories.push({
            ...bounceTrajectory,
            bounceCount: 1,
            bouncePoint: bounceTrajectory.bouncePoint
          });
        }
      }
    }

    // TODO: For maxBounces > 1, calculate multi-bounce trajectories
    // This would involve recursive calculation of bounce points
    
    return trajectories;
  }

  // Calculate trajectory that bounces off one metal segment
  calculateSingleBounceTrajectory(player, target, segment, bulletSpeed) {
    // Try different points along the metal segment as potential bounce points
    const numTestPoints = 10;
    let bestTrajectory = null;
    let bestScore = 0;

    for (let i = 0; i <= numTestPoints; i++) {
      const t = i / numTestPoints;
      const bounceX = segment.x1 + t * (segment.x2 - segment.x1);
      const bounceY = segment.y1 + t * (segment.y2 - segment.y1);

      // Calculate angle from player to bounce point
      const toBounceAngle = Math.atan2(bounceY - player.y, bounceX - player.x);
      
      // Simulate bullet hitting metal and bouncing
      const incomingVx = Math.cos(toBounceAngle) * bulletSpeed;
      const incomingVy = Math.sin(toBounceAngle) * bulletSpeed;
      
      // Calculate bounce direction using metal's bounce calculation
      const bounceResult = this.calculateBounceFromSegment(
        { vx: incomingVx, vy: incomingVy }, segment
      );
      
      if (!bounceResult) continue;

      // Check if bounced bullet can reach target
      const bounceToTargetTime = this.calculateInterceptTimeFromBounce(
        bounceX, bounceY, bounceResult.vx, bounceResult.vy, target
      );

      if (bounceToTargetTime > 0) {
        const totalDistance = 
          Math.sqrt((bounceX - player.x) ** 2 + (bounceY - player.y) ** 2) +
          Math.sqrt((target.x - bounceX) ** 2 + (target.y - bounceY) ** 2);
        
        const score = 1.0 / (1.0 + totalDistance / 200); // Shorter paths are better
        
        if (score > bestScore) {
          bestScore = score;
          bestTrajectory = {
            canHit: true,
            hitScore: score,
            bouncePoint: { x: bounceX, y: bounceY },
            initialAngle: toBounceAngle,
            bounceAngle: Math.atan2(bounceResult.vy, bounceResult.vx),
            totalTime: bounceToTargetTime
          };
        }
      }
    }

    return bestTrajectory;
  }

  // Calculate bounce direction from a segment (simplified metal bounce logic)
  calculateBounceFromSegment(velocity, segment) {
    const { x1, y1, x2, y2 } = segment;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return { vx: -velocity.vx, vy: -velocity.vy };
    
    // Normal vector to the line (perpendicular)
    const nx = -dy / length;
    const ny = dx / length;
    
    // Reflect the velocity
    const dot = velocity.vx * nx + velocity.vy * ny;
    const reflectedVx = velocity.vx - 2 * dot * nx;
    const reflectedVy = velocity.vy - 2 * dot * ny;
    
    return { vx: reflectedVx, vy: reflectedVy };
  }

  // Calculate if bounced bullet can intercept target
  calculateInterceptTimeFromBounce(bounceX, bounceY, bounceVx, bounceVy, target) {
    const targetVx = target.vx !== undefined ? target.vx : (target.dx || 0) / 60;
    const targetVy = target.vy !== undefined ? target.vy : (target.dy || 0) / 60;
    
    // Solve for when bullet reaches target position
    // bounceX + bounceVx * t = target.x + targetVx * t
    // bounceY + bounceVy * t = target.y + targetVy * t
    
    const relativeVx = bounceVx - targetVx;
    const relativeVy = bounceVy - targetVy;
    const relativeDx = target.x - bounceX;
    const relativeDy = target.y - bounceY;
    
    // For this simplified version, use distance-based approximation
    const distance = Math.sqrt(relativeDx * relativeDx + relativeDy * relativeDy);
    const relativeSpeed = Math.sqrt(relativeVx * relativeVx + relativeVy * relativeVy);
    
    return relativeSpeed > 0 ? distance / relativeSpeed : -1;
  }

  // Enhanced interceptive targeting that accounts for all velocity vectors
  calculatePredictiveAim(target, bulletSpeed) {
    // For very fast projectiles (lasers), aim directly at target since lead time is minimal
    const laserSpeed = this.player.getPlayerLaserSpeed();
    if (bulletSpeed === Infinity || bulletSpeed >= laserSpeed) {
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
    // Level 5 uses laser which is much faster
    if (level >= 5 || this.player.rainbowInvulnerable) {
      return this.player.getPlayerLaserSpeed(); // Usually 80
    }
    
    // Levels 1-4 use regular bullets
    return this.player.getBulletSpeed(); // Usually 8
  }
}

