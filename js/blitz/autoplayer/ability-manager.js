// Removed constants import - using defaults
import { ThreatAssessment } from "./threat-assessment.js";

/**
 * AbilityManager - Handles all ability usage decisions for the autoplayer
 * Manages shield, bomb, and time slow abilities with sophisticated threat assessment
 */
export class AbilityManager {
  constructor(player, autoplayer) {
    this.player = player;
    this.autoplayer = autoplayer;
    this.threatAssessment = new ThreatAssessment(player);

    // Ability timers
    this.autoplayShieldTimer = 0;
    this.autoplaySlowTimer = 0;
    this.autoplayBombTimer = 0;

    // Boss phase tracking
    this.lastBossPhase = null;
    this.lastBossArmsDestroyed = null;
  }

  /**
   * Handle strategic ability usage for autoplay
   */
  handleAutoplayAbilities(collidables, keys, powerups = [], game = null) {
    this.autoplayShieldTimer++;
    this.autoplaySlowTimer++;
    this.autoplayBombTimer++;

    // Extract different types of collidables for threat assessment
    const enemies = collidables.filter((c) => c.collidableType === "enemy");
    const enemyBullets = collidables.filter(
      (c) => c.collidableType === "enemyBullet"
    );
    const enemyLasers = collidables.filter(
      (c) => c.collidableType === "enemyLaser"
    );
    const boss = collidables.find((c) => c.collidableType === "boss");

    // Calculate immediate threat level and collision predictions
    const threatLevel = this.autoplayer.calculateThreatLevel(collidables);
    const allThreats = this.autoplayer.mapAllThreats(collidables, 1.0);
    const collisionPredictions = this.autoplayer.predictAllCollisions(
      allThreats,
      1.0
    );

    // Check if movement alone can avoid all imminent collisions
    const unavoidableCollisions = this.autoplayer.findUnavoidableCollisions(
      collisionPredictions,
      allThreats
    );

    // Enhanced threat assessment
    const projectileCount = enemyBullets.length + enemyLasers.length;
    const nearbyProjectiles = this.countNearbyProjectiles(
      enemyBullets,
      enemyLasers,
      120
    );
    const veryCloseProjectiles = this.countNearbyProjectiles(
      enemyBullets,
      enemyLasers,
      50
    );
    const nearCornerShield = this.isNearCorner(60);
    const isBossActive = boss && !boss.isDefeated;
    const isMinibossActive = enemies.some(
      (enemy) => enemy.type === "miniboss" || enemy.isMiniboss
    );

    // More aggressive thresholds during boss fights
    const bossModifier = isBossActive || isMinibossActive ? 0.7 : 1.0;

    // Enhanced shield usage logic with collision prediction
    const shouldUseShield =
      (unavoidableCollisions.length > 0 &&
        unavoidableCollisions[0].prediction.timeToCollision < 45) || // Unavoidable collision imminent
      threatLevel >= 0.8 * bossModifier || // High threat level
      (nearbyProjectiles >= Math.floor(6 * bossModifier) &&
        veryCloseProjectiles >= 2) || // Many close projectiles
      (nearCornerShield &&
        nearbyProjectiles >= Math.floor(4 * bossModifier) &&
        threatLevel >= 0.6 * bossModifier) || // Cornered with threats
      (isBossActive && nearbyProjectiles >= 4 && threatLevel >= 0.5) || // Boss-specific
      (isMinibossActive && nearbyProjectiles >= 3 && threatLevel >= 0.4) || // Miniboss-specific
      (projectileCount >= Math.floor(25 * bossModifier) &&
        nearbyProjectiles >= Math.floor(5 * bossModifier)); // Screen overwhelmed

    if (
      shouldUseShield &&
      !this.player.isShielding &&
      this.player.shieldCooldown <= 0 &&
      this.autoplayShieldTimer > (isBossActive || isMinibossActive ? 120 : 180)
    ) {
      keys.shift = true;
      this.autoplayShieldTimer = 0;
    }

    // Enhanced time slow usage with collision prediction
    const bossPhaseChange = this.detectBossPhaseChange(boss);
    const nearCornerSlow = this.isNearCorner(60);

    const shouldUseTimeSlow =
      unavoidableCollisions.length > 1 || // Multiple unavoidable collisions
      threatLevel >= 0.9 * bossModifier || // Very high threat
      (nearbyProjectiles >= Math.floor(8 * bossModifier) &&
        veryCloseProjectiles >= Math.floor(3 * bossModifier)) || // Many close projectiles
      (nearCornerSlow &&
        nearbyProjectiles >= Math.floor(6 * bossModifier) &&
        threatLevel >= 0.7 * bossModifier) || // Cornered
      (bossPhaseChange && threatLevel >= 0.6 * bossModifier) || // Boss phase change
      (isBossActive && nearbyProjectiles >= 6 && threatLevel >= 0.6) || // Boss-specific
      (isMinibossActive && nearbyProjectiles >= 4 && threatLevel >= 0.5) || // Miniboss-specific
      (projectileCount >= Math.floor(30 * bossModifier) &&
        nearbyProjectiles >= Math.floor(7 * bossModifier)); // Screen overwhelmed

    if (
      shouldUseTimeSlow &&
      this.autoplaySlowTimer > (isBossActive || isMinibossActive ? 180 : 240) &&
      game &&
      game.state.timeSlowCooldown <= 0 &&
      !game.state.timeSlowActive
    ) {
      keys.f = true;
      this.autoplaySlowTimer = 0;
    }

    // Enhanced bomb usage with collision prediction
    const nearCorner = this.isNearCorner(80);
    const manyNearbyBullets = nearbyProjectiles >= 5;

    const shouldUseBomb =
      unavoidableCollisions.length > 2 || // Multiple unavoidable collisions
      threatLevel >= 0.9 || // Extreme threat
      enemyBullets.length > 25 || // Screen full of bullets
      (boss && !boss.isDefeated && boss.finalPhase && threatLevel >= 0.6) || // Boss final phase
      (enemies.length > 10 && threatLevel >= 0.7) || // Many enemies
      (nearCorner && manyNearbyBullets && threatLevel >= 0.5) || // Cornered with bullets
      (nearCorner && projectileCount >= 15 && threatLevel >= 0.4); // Cornered with many projectiles

    if (
      shouldUseBomb &&
      this.autoplayBombTimer > 180 &&
      game &&
      game.state.bombs > 0
    ) {
      keys.z = true;
      this.autoplayBombTimer = 0;
    }
  }

  /**
   * Detect boss phase changes for strategic ability usage
   */
  detectBossPhaseChange(boss) {
    return this.threatAssessment.detectBossPhaseChange(
      boss,
      this.lastBossPhase,
      this.lastBossArmsDestroyed
    );
  }

  /**
   * Check if player is near screen corners (higher chance of being trapped)
   */
  isNearCorner(cornerBuffer = 80) {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const nearLeftEdge = this.player.x < cornerBuffer;
    const nearRightEdge = this.player.x > screenWidth - cornerBuffer;
    const nearTopEdge = this.player.y < cornerBuffer;
    const nearBottomEdge = this.player.y > screenHeight - cornerBuffer;

    // Return true if near any corner
    return (nearLeftEdge || nearRightEdge) && (nearTopEdge || nearBottomEdge);
  }

  /**
   * Count nearby projectiles within a given radius
   */
  countNearbyProjectiles(enemyBullets, enemyLasers, radius) {
    return this.threatAssessment.countNearbyProjectiles(
      enemyBullets,
      enemyLasers,
      radius
    );
  }

  /**
   * Get current ability timer values
   */
  getAbilityTimers() {
    return {
      shield: this.autoplayShieldTimer,
      slow: this.autoplaySlowTimer,
      bomb: this.autoplayBombTimer,
    };
  }

  /**
   * Reset all ability timers
   */
  resetAbilityTimers() {
    this.autoplayShieldTimer = 0;
    this.autoplaySlowTimer = 0;
    this.autoplayBombTimer = 0;
  }

  /**
   * Reset boss phase tracking
   */
  resetBossPhaseTracking() {
    this.lastBossPhase = null;
    this.lastBossArmsDestroyed = null;
  }
}
