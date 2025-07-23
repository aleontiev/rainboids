// Level 1 Configuration - Complete game configuration for Rainboids: Blitz
export default {
  // Player configuration
  player: {
    // Movement and physics
    speed: 6,
    size: 10,
    hitbox: 6,
    shieldCooldownMax: 300,
    shieldDuration: 60,
    laserWidth: 15,
    laserSpeed: 50,
    laserLength: 48,
    laserLife: 2000,

    // Weapon level configurations - each level defines complete weapon behavior
    levels: [
      // Level 1: Single green bullet
      {
        id: 1,
        fireRate: 15,
        projectiles: [
          {
            type: "bullet",
            count: 1,
            size: 15, // Increased from 10 to 15 (1.5x)
            speed: 6,
            color: "#44ff44",
            damage: 1,
            angleOffset: 0,
            positionOffset: { x: 0, y: 0 },
          },
        ],
      },
      // Level 2: Single green bullet, faster firing
      {
        id: 2,
        fireRate: 10,
        projectiles: [
          {
            type: "bullet",
            count: 1,
            size: 15, // Increased from 12 to 15 (1.25x)
            speed: 7,
            color: "#44ff44",
            damage: 1,
            angleOffset: 0,
            positionOffset: { x: 0, y: 0 },
          },
        ],
      },
      // Level 3: Double bullets with slight spread
      {
        id: 3,
        fireRate: 7,
        projectiles: [
          {
            type: "bullet",
            count: 2,
            size: 19, // Increased from 15 to 19 (1.25x)
            speed: 8,
            color: "#44ff44",
            damage: 1,
            angleOffset: 0.05, // ±0.05 radians spread
            positionOffset: { x: 0, y: 0 },
          },
        ],
      },
      // Level 4: Triple bullets with spread
      {
        id: 4,
        fireRate: 5,
        projectiles: [
          {
            type: "bullet",
            count: 3,
            size: 19, // Increased from 15 to 19 (1.25x)
            speed: 10,
            color: "#44ff44",
            damage: 1,
            angleOffset: 0.1, // ±0.1 radians spread for outer bullets
            positionOffset: { x: 0, y: 0 },
          },
        ],
      },
      // Level 5: Rainbow laaaaaser
      {
        id: 5,
        fireRate: 3,
        projectiles: [
          {
            type: "laser",
            count: 1,
            size: 10,
            speed: 50,
            color: "rainbow",
            damage: 0.5,
            angleOffset: 0,
            positionOffset: { x: 0, y: 0 },
          },
        ],
      },
    ],

    // Secondary weapon level configurations - diagonal shots and homing missiles
    secondaryLevels: [
      // Level 0: No secondary weapons
      {
        id: 0,
        fireRate: 30,
        projectiles: [],
      },
      // Level 1: Two diagonal bullets
      {
        id: 1,
        fireRate: 30,
        projectiles: [
          {
            type: "bullet",
            count: 1,
            size: 15,
            speed: 6,
            color: "#00ccaa",
            damage: 1,
            angleOffset: 0.785, // 45 degrees in radians (Math.PI / 4)
            positionOffset: { x: 0, y: 0 },
          },
          {
            type: "bullet",
            count: 1,
            size: 15, // Increased from 12 to 15 (1.25x)
            speed: 6,
            color: "#00ccaa",
            damage: 1,
            angleOffset: -0.785, // 45 degrees in radians (Math.PI / 4)
            positionOffset: { x: 0, y: 0 },
          },
        ],
      },
      // Level 2: 4 diagonal bullets + 2 homing missiles
      {
        id: 2,
        fireRate: 30,
        projectiles: [
          {
            type: "bullet",
            count: 1,
            size: 15,
            speed: 6,
            color: "#00ccaa",
            damage: 1,
            angleOffset: 0.785, // 45 degrees
            positionOffset: { x: 0, y: 0 },
          },
          {
            type: "bullet",
            count: 1,
            size: 15,
            speed: 6,
            color: "#00ccaa",
            damage: 1,
            angleOffset: 0.524, 
            positionOffset: { x: 0, y: 0 },
          },
          {
            type: "bullet",
            count: 1,
            size: 15,
            speed: 6,
            color: "#00ccaa",
            damage: 1,
            angleOffset: -0.524, 
            positionOffset: { x: 0, y: 0 },
          },
          {
            type: "bullet",
            count: 1,
            size: 15,
            speed: 6,
            color: "#00ccaa",
            damage: 1,
            angleOffset: -0.785, // -45 degrees
            positionOffset: { x: 0, y: 0 },
          },
        ],
        homingMissiles: {
          enabled: true,
          count: 2,
          fireRate: 60,
          size: 17, // Increased from 13.5 to 17 (1.25x)
          color: "#00ff44",
          damage: 1,
          angleSpread: 0.2, // ±0.2 radians from primary angle
        },
      },
      // Level 3: Four diagonal bullets + 4 homing missiles
      {
        id: 3,
        fireRate: 30,
        projectiles: [
          {
            type: "bullet",
            count: 1,
            size: 15,
            speed: 6,
            color: "#00ccaa",
            damage: 1,
            angleOffset: 0.785, // 45 degrees
            positionOffset: { x: 0, y: 0 },
          },
          {
            type: "bullet",
            count: 1,
            size: 15,
            speed: 6,
            color: "#00ccaa",
            damage: 1,
            angleOffset: 0.524, // 60 degrees
            positionOffset: { x: 0, y: 0 },
          },
          {
            type: "bullet",
            count: 1,
            size: 15,
            speed: 6,
            color: "#00ccaa",
            damage: 1,
            angleOffset: -0.524, // 60 degrees
            positionOffset: { x: 0, y: 0 },
          },
          {
            type: "bullet",
            count: 1,
            size: 15,
            speed: 6,
            color: "#00ccaa",
            damage: 1,
            angleOffset: -0.785, // -45 degrees
            positionOffset: { x: 0, y: 0 },
          },
        ],
        homingMissiles: {
          enabled: true,
          count: 4,
          fireRate: 60,
          size: 17, // Increased from 13.5 to 17 (1.25x)
          color: "#00ff44",
          damage: 1,
          angleSpread: 0.4, // ±0.4 radians from primary angle
        },
      },
      // Level 4: Four diagonal bullets + 8 homing missiles (ultimate level)
      {
        id: 4,
        fireRate: 30,
        projectiles: [
          {
            type: "bullet",
            count: 1,
            size: 15, // Increased from 12 to 15 (1.25x)
            speed: 6,
            color: "#00ccaa",
            damage: 1,
            angleOffset: 0.785, // 45 degrees
            positionOffset: { x: 0, y: 0 },
          },
          {
            type: "bullet",
            count: 1,
            size: 15, // Increased from 12 to 15 (1.25x)
            speed: 6,
            color: "#00ccaa",
            damage: 1,
            angleOffset: -0.785, // -45 degrees
            positionOffset: { x: 0, y: 0 },
          },
          {
            type: "bullet",
            count: 1,
            size: 15, // Increased from 12 to 15 (1.25x)
            speed: 6,
            color: "#00ccaa",
            damage: 1,
            angleOffset: 0.524, // 30 degrees
            positionOffset: { x: 0, y: 0 },
          },
          {
            type: "bullet",
            count: 1,
            size: 15, // Increased from 12 to 15 (1.25x)
            speed: 6,
            color: "#00ccaa",
            damage: 1,
            angleOffset: -0.524, // -30 degrees
            positionOffset: { x: 0, y: 0 },
          },
        ],
        homingMissiles: {
          enabled: true,
          count: 8,
          fireRate: 60,
          size: 17, // Increased from 13.5 to 17 (1.25x)
          color: "#00ff44",
          damage: 1,
          angleSpread: 0.6, // ±0.6 radians from primary angle
        },
      },
    ],
  },

  // World settings
  world: {
    // Asteroid settings
    asteroidSpeed: 1,
    asteroidSize: 40,

    // Powerup settings
    powerupSize: 25,
    powerupSpeed: 1,
    powerupSpawnRate: 1000,
    powerupSpawnVariance: 1800,

    // Metal settings
    metalSize: 60,
    metalThickness: 6,
    metalSpeed: 0.5,
    metalSpawnRate: 1800,
    metalSpawnVariance: 2400,

    // Effects and particles
    explosionParticles: 12,
    explosionSpeed: 4,
    explosionLife: 80,
    enemyExplosionScale: 5,
    particleLife: 60,
    particleMaxLife: 100,
    floatingTextLife: 100,
    bulletLife: 2000,

    // Laser entity settings

    // State management timers
    timeSlowDuration: 300,
    timeSlowCooldownMax: 900,
    shieldFlashDuration: 30,
    timeSlowFlashDuration: 30,

    // Death animation timers
    deathAnimationDuration: 240,
    deathFadeOutTime: 60,

    // Autoplayer timers
    autoplayShieldTimer: 180,
    autoplaySlowTimer: 240,
    autoplayBombTimer: 180,
    autoplayShieldTimerBoss: 120,
    autoplaySlowTimerBoss: 180,

    // UI and visual
    barWidth: 60,

    // Audio settings
    audioVolume: 0.1,
    musicVolume: 0.3,

    // Colors
    starColors: [
      "#a6b3ff",
      "#c3a6ff",
      "#f3a6ff",
      "#ffa6f8",
      "#ffa6c7",
      "#ff528e",
      "#d98cff",
      "#ff8c00",
      "#ffffff",
      "#ffff88",
    ],
    powerupColors: {
      shield: "#00aaff",
      mainWeapon: "#8844ff",
      sideWeapon: "#00ccaa",
      secondShip: "#44ff44",
      bomb: "#ff4444",
      rainbowStar: "#ffaa00",
    },
    powerupTypes: [
      "shield",
      "mainWeapon",
      "sideWeapon",
      "secondShip",
      "bomb",
      "rainbowStar",
    ],

    // Powerup configurations - define behavior and properties for each powerup type
    powerupConfigs: {
      shield: {
        duration: 0, // Instant effect
      },
      mainWeapon: {
        duration: 0, // Instant effect
      },
      sideWeapon: {
        duration: 0, // Instant effect
      },
      secondShip: {
        duration: 0, // Instant effect
      },
      bomb: {
        duration: 0, // Instant effect
      },
      rainbowStar: {
        duration: 360, // 6 seconds of invulnerability (moved from player.rainbowInvulnerableTime)
      },
    },
  },

  // Enemy definitions - fully configurable data-driven enemies
  enemies: {
    // Base enemy defaults - inherited by all enemies
    "*": {
      // Core properties
      name: "Default Enemy",
      health: 1,
      size: 24,
      speed: 2,
      color: "#ffffff",
      fadeInTime: 60,

      // Visual appearance
      shape: "triangle", // triangle, circle, square, rounded-square, equal-triangle, sharp-triangle, two-circles, ring, or custom SVG path
      strokeColor: "#ff4444",
      strokeWidth: 3,

      // Movement configuration
      movement: {
        type: "straight", // straight, sine, zigzag, circle, dive, stationary
        speed: 1.0, // Multiplier for base speed
      },

      // Attack configuration
      attack: {
        pattern: "simple", // simple, burst, circular, spreading, laser, pulse, none
        cooldown: 60,
        canShoot: true,
        bulletType: "normal", // normal, circular, spreading, laser
        bulletSize: 6,
        bulletSpeed: 3,
        bulletColor: null, // Uses enemy color if null
        bulletDamage: 1,
      },

      // Clone configuration
      clone: {
        enabled: false,
        interval: 90,
        maxClones: 3,
        maxGenerations: 5,
      },

      // Rotation configuration
      rotation: 0, // Default rotation speed (0 = no rotation)

      // Physics
      invulnerable: false,
      invulnerabilityDuration: 0,
    },

    // Regular enemy types - fully data-driven configurations
    straightBasic: {
      name: "Basic Fighter",
      shape: "triangle",
      color: "#ff4444",
      movement: {
        type: "straight",
      },
      attack: {
        pattern: "simple",
        cooldown: 150,
        bulletType: "normal",
        bulletSize: 10,
        bulletColor: "#ff4444",
      },
    },

    sineBasic: {
      name: "Wave Rider",
      shape: "two-circles",
      color: "#ff6644",
      movement: {
        type: "sine",
        amplitude: { min: 30, max: 70 },
        frequency: { min: 0.01, max: 0.03 },
      },
      attack: {
        pattern: "burst",
        cooldown: 150,
        burstCount: 2,
        burstSpread: 0,
        shootFromMultiplePoints: true,
        shootPoints: [
          { x: 0, y: -0.6 }, // Top circle
          { x: 0, y: 0.6 }, // Bottom circle
        ],
        bulletType: "normal",
        bulletSize: 10,
        bulletSpeed: 5,
        bulletColor: "#ff6644",
      },
    },

    zigzagBasic: {
      name: "Zigzag Bomber",
      shape: "triangle",
      color: "#ff8844",
      movement: {
        type: "zigzag",
        zigzagTimer: 30,
        zigzagSpeed: 2,
      },
      attack: {
        pattern: "spreading",
        cooldown: 300,
        bulletType: "spreading",
        bulletSize: 15,
        bulletSpeed: 1.5,
        bulletColor: "#ff8844",
        spreadBulletSize: 13, 
        spreadBulletSpeed: 3,
        spreadBulletCount: 8,
        spreadExplosionTime: 120,
      },
    },

    circleBasic: {
      name: "Orbital Cloner",
      shape: "ring",
      color: "#ffaa44",
      size: 24,
      movement: {
        type: "circle",
        radius: { min: 40, max: 70 },
        angularSpeed: { min: 0.04, max: 0.06 },
        driftSpeed: 0.5,
      },
      attack: {
        pattern: "simple",
        cooldown: 300,
        bulletType: "normal",
        bulletSize: 10,
        bulletSpeed: 5,
        bulletColor: "#ffaa44",
      },
      clone: {
        enabled: true,
        interval: 90,
        maxClones: 3,
        maxGenerations: 5,
      },
    },

    diveBasic: {
      name: "Dive Bomber",
      shape: "sharp-triangle",
      color: "#ffcc44",
      size: 24,
      movement: {
        type: "dive",
        lockDuration: 60,
        diveSpeed: 8,
      },
      attack: {
        pattern: "none",
        canShoot: false,
      },
    },

    laserBasic: {
      name: "Laser Sniper",
      shape: "circle", // Will have custom laser cannon rendering
      color: "#ffaa44",
      speed: 1,
      movement: {
        type: "straight",
        speedMultiplier: 0.8,
      },
      attack: {
        pattern: "laser",
        cooldown: 400, // Total cycle time
        chargeTime: 60,
        previewTime: 90,
        firingTime: 60,
        laserSpeed: 80,
        targetingAccuracy: 30, // 30px radius inaccuracy
        bulletType: "laser",
        bulletColor: "#ffaa44",
      },
    },

    pulseBasic: {
      name: "Pulse Ring",
      shape: "ring",
      color: "#ffcc44",
      size: 33.6, // 1.4x normal size
      speed: 1.5,
      movement: {
        type: "straight",
        speedMultiplier: 0.6,
      },
      attack: {
        pattern: "pulse",
        pulseInterval: { min: 240, max: 360 },
        pulseBulletCount: 8,
        pulseRadius: 0, // Shoots from center
        warningTime: 30, // Warning effect before pulse
        bulletType: "circular",
        bulletSize: 8,
        bulletSpeed: 3,
        bulletColor: "#ffcc44",
      },
    },

    squareBasic: {
      name: "Corner Gunner",
      shape: "square",
      color: "#ff6644",
      size: 30,
      speed: 1,
      movement: {
        type: "sine",
        amplitude: { min: 30, max: 40 },
        frequency: 0.05,
        speedMultiplier: 0.7,
      },
      attack: {
        pattern: "burst",
        cooldown: 150,
        burstCount: 4,
        burstSpread: 0,
        shootFromMultiplePoints: true,
        shootPoints: [
          { x: 0.7, y: -0.7 }, // Top right
          { x: 0.7, y: 0.7 }, // Bottom right
          { x: -0.7, y: 0.7 }, // Bottom left
          { x: -0.7, y: -0.7 }, // Top left
        ],
        randomDirection: true, // Each corner shoots in random direction
        bulletType: "circular",
        bulletSize: 12,
        bulletSpeed: 4,
        bulletColor: "#ff6644",
      },
      visualConfig: {
        rotationSpeed: 0.1, // Spinning square
      },
    },

    // Variations - demonstrate different configurations
    zigzagFast: {
      name: "Speed Bomber",
      shape: "triangle",
      color: "#ff8844",
      speed: 3.5,
      size: 20,
      fadeInTime: 30,
      movement: {
        type: "zigzag",
        zigzagTimer: 20,
        zigzagSpeed: 3,
      },
      attack: {
        pattern: "spreading",
        cooldown: 250,
        spreadBulletSize: 8, // Increased from 4 to 8 (2x)
        spreadBulletSpeed: 4,
        spreadBulletCount: 12,
        spreadExplosionTime: 90,
        bulletType: "spreading",
        bulletSize: 12,
        bulletSpeed: 2.5,
        bulletColor: "#ff8844",
      },
    },

    squareHeavy: {
      name: "Heavy Gunner",
      shape: "square",
      color: "#ff4444",
      health: 2,
      speed: 0.7,
      size: 40,
      fadeInTime: 90,
      movement: {
        type: "sine",
        amplitude: { min: 30, max: 40 },
        frequency: 0.05,
        speedMultiplier: 0.7,
      },
      attack: {
        pattern: "burst",
        cooldown: 120,
        burstCount: 4,
        burstSpread: 0,
        shootFromMultiplePoints: true,
        shootPoints: [
          { x: 0.7, y: -0.7 },
          { x: 0.7, y: 0.7 },
          { x: -0.7, y: 0.7 },
          { x: -0.7, y: -0.7 },
        ],
        bulletType: "circular",
        bulletSize: 15,
        bulletSpeed: 4,
        bulletColor: "#ff4444",
      },
      visualConfig: {
        rotationSpeed: 0.1,
      },
    },

    // Boss-level enemies (minibosses and bosses use different system)
    alphaMiniBoss: {
      type: "miniboss",
      sprite: "alpha-miniboss",
      spriteScale: 1,
      spriteColor: "#ff6644",
      health: 100,
      shield: 50,
      speed: 0.5,
      size: 90,
      // Weapon configurations
      primaryWeaponCooldown: 70,
      secondaryWeaponCooldown: 80,
      circularWeaponCooldown: 120,
      burstWeaponCooldown: 100,
      enemySpawnCooldown: 200,
      invulnerableDuration: 180,
      deathDuration: 30,
      deathExplosionInterval: 3,
      patrolRange: 150,
      targetYPortrait: 150,
      targetXLandscape: 150,
      secondaryWeaponChargeTime: 60,
    },

    betaMiniBoss: {
      type: "miniboss",
      sprite: "beta-miniboss",
      spriteScale: 1,
      spriteColor: "#ffaa44",
      spriteRotation: Math.PI / 2,
      health: 100,
      shield: 50,
      speed: 0.5,
      size: 90,
      // Same miniboss timings as alpha
      primaryWeaponCooldown: 60,
      secondaryWeaponCooldown: 90,
      circularWeaponCooldown: 120,
      burstWeaponCooldown: 90,
      enemySpawnCooldown: 200,
      invulnerableDuration: 180,
      deathDuration: 30,
      deathExplosionInterval: 3,
      patrolRange: 150,
      targetYPortrait: 150,
      targetXLandscape: 150,
      secondaryWeaponChargeTime: 60,
    },

    mainBoss: {
      type: "boss",
      spriteColor: "#ffdd44", // Red/orange/yellow for boss
    },
  },

  // Configurable game phases with phase-specific enemy configs
  phases: [
    {
      // Phase 1: Early game - basic enemies and asteroids
      id: 1,
      type: "basic",
      name: "Initial Assault",

      transitionCondition: "time",
      transitionValue: 20000, // 20 seconds

      // Phase-specific spawn rates and settings
      asteroidSpawnRate: 120,
      powerupSpawnRate: 500,
      metalSpawnRate: 1000,

      asteroidTypes: ["small", "medium", "large"],
      powerupEnabled: true,
      metalEnabled: true,

      // Phase-specific powerup weights
      powerups: {
        shield: { weight: 25 },
        bomb: { weight: 15 },
        mainWeapon: { weight: 50 },
        sideWeapon: { weight: 20 },
        secondShip: { weight: 10 },
        rainbowStar: { weight: 5 },
      },

      // Phase-specific enemy configurations
      enemies: {
        straightBasic: {
          spawnRate: {
            base: 300,
            variance: 40,
            timeModifier: {
              enabled: true,
              startTime: 0,
              endTime: 20000,
              startRate: 200,
              endRate: 120,
            },
          },
          weight: 0.4, // 40% of enemy spawns
        },
        sineBasic: {
          spawnRate: {
            base: 400,
            variance: 50,
          },
          weight: 0.3, // 30% of enemy spawns
        },
        zigzagBasic: {
          spawnRate: {
            base: 400,
            variance: 60,
          },
          weight: 0.2, // 20% of enemy spawns
        },
        diveBasic: {
          spawnRate: {
            base: 100,
            variance: 80,
          },
          weight: 0.1, // 10% of enemy spawns
        },
      },

      events: [],
    },
    {
      // Phase 2: First miniboss - single miniboss encounter
      id: 2,
      type: "basic",
      name: "First Guardian",

      transitionCondition: "miniboss_defeated",
      transitionValue: null,

      asteroidSpawnRate: 200,
      powerupSpawnRate: 300,
      metalSpawnRate: 99900,

      asteroidTypes: ["small", "medium", "large"],
      powerupEnabled: true,
      metalEnabled: true,

      // Phase 2: Increased shield and bomb weights for miniboss fight
      powerups: {
        shield: { weight: 35 },
        bomb: { weight: 25 },
        mainWeapon: { weight: 20 },
        sideWeapon: { weight: 15 },
        secondShip: { weight: 5 },
        rainbowStar: { weight: 3 },
      },

      // Reduced enemy spawning during miniboss fight
      enemies: {
        straightBasic: {
          spawnRate: {
            base: 500,
            variance: 100,
          },
          weight: 0.5,
        },
        sineBasic: {
          spawnRate: {
            base: 600,
            variance: 120,
          },
          weight: 0.3,
        },
        zigzagBasic: {
          spawnRate: {
            base: 700,
            variance: 140,
          },
          weight: 0.2,
        },
      },

      events: [
        {
          type: "spawn_enemy",
          enemyId: "alphaMiniBoss",
          condition: "time",
          value: 3000, // 3 seconds into phase
          onlyOnce: true,
        },
      ],
    },
    {
      // Phase 3: Asteroid storm - lots of asteroids, no enemies
      id: 3,
      type: "basic",
      name: "Asteroid Storm",

      transitionCondition: "time",
      transitionValue: 15000, // 15 seconds of asteroid storm

      asteroidSpawnRate: 40, // Very fast asteroid spawning
      powerupSpawnRate: 200,
      metalSpawnRate: 999999,

      asteroidTypes: ["small", "medium", "large"],
      powerupEnabled: true,
      metalEnabled: false,

      // Phase 3: Higher weapon powerup rates during asteroid storm
      powerups: {
        shield: { weight: 20 },
        bomb: { weight: 10 },
        mainWeapon: { weight: 35 },
        sideWeapon: { weight: 25 },
        secondShip: { weight: 8 },
        rainbowStar: { weight: 7 },
      },

      // No enemies during asteroid storm
      enemies: {},

      events: [],
    },
    {
      // Phase 4: Dual minibosses - both minibosses spawn
      id: 4,
      type: "basic",
      name: "Twin Guardians",

      transitionCondition: "miniboss_defeated",
      transitionValue: null,

      asteroidSpawnRate: 300,
      powerupSpawnRate: 250,
      metalSpawnRate: 999999,

      asteroidTypes: ["small", "medium"],
      powerupEnabled: true,
      metalEnabled: true,

      // Phase 4: Heavy defensive focus for dual miniboss fight
      powerups: {
        shield: { weight: 40 },
        bomb: { weight: 30 },
        mainWeapon: { weight: 15 },
        sideWeapon: { weight: 10 },
        secondShip: { weight: 3 },
        rainbowStar: { weight: 5 },
      },

      // Minimal enemy spawning during dual miniboss fight
      enemies: {
        straightBasic: {
          spawnRate: {
            base: 600,
            variance: 120,
          },
          weight: 0.7,
        },
        circleBasic: {
          spawnRate: {
            base: 800,
            variance: 160,
          },
          weight: 0.3,
        },
      },

      events: [
        {
          type: "spawn_enemy",
          enemyId: "alphaMiniBoss",
          condition: "time",
          value: 3000, // 3 seconds into phase
          onlyOnce: true,
        },
        {
          type: "spawn_enemy",
          enemyId: "betaMiniBoss",
          condition: "time",
          value: 3000, // 3 seconds into phase
          onlyOnce: true,
        },
      ],
    },
    {
      // Phase 5: Second asteroid storm
      id: 5,
      type: "basic",
      name: "Final Storm",

      transitionCondition: "time",
      transitionValue: 12000, // 12 seconds of final asteroid storm

      asteroidSpawnRate: 35, // Even faster asteroids
      powerupSpawnRate: 150,
      metalSpawnRate: 999999,

      asteroidTypes: ["small", "medium", "large"],
      powerupEnabled: true,
      metalEnabled: false,

      // Phase 5: More weapons and rainbowStar for final storm
      powerups: {
        shield: { weight: 15 },
        bomb: { weight: 10 },
        mainWeapon: { weight: 30 },
        sideWeapon: { weight: 25 },
        secondShip: { weight: 10 },
        rainbowStar: { weight: 15 },
      },

      enemies: {}, // No enemies

      events: [],
    },
    {
      // Phase 6: Cleanup phase
      id: 6,
      type: "cleanup",
      name: "Preparation",

      transitionCondition: "time",
      transitionValue: 6000,

      asteroidSpawnRate: 999999, // No asteroids during cleanup
      powerupSpawnRate: 100,
      metalSpawnRate: 999999,

      asteroidTypes: [],
      powerupEnabled: true,
      metalEnabled: false,

      // Phase 6: Prepare for boss with equal powerup distribution
      powerups: {
        shield: { weight: 20 },
        bomb: { weight: 20 },
        mainWeapon: { weight: 20 },
        sideWeapon: { weight: 20 },
        secondShip: { weight: 15 },
        rainbowStar: { weight: 10 },
      },

      enemies: {}, // No enemies

      events: [
        {
          type: "explode_enemies",
          condition: "phase_start",
          value: 0,
          onlyOnce: true,
        },
        {
          type: "spawn_powerups",
          condition: "time",
          value: 2000,
          onlyOnce: true,
        },
      ],
    },
    {
      // Phase 7: Boss dialog
      id: 7,
      type: "dialog",
      name: "Boss Approaches",

      transitionCondition: "dialog_complete",
      transitionValue: null,

      asteroidSpawnRate: 999999,
      powerupSpawnRate: 999999,
      metalSpawnRate: 999999,

      asteroidTypes: [],
      powerupEnabled: false,
      metalEnabled: false,

      // Phase 7: No powerups during dialog (powerupEnabled: false)
      powerups: {
        shield: { weight: 0 },
        bomb: { weight: 0 },
        mainWeapon: { weight: 0 },
        sideWeapon: { weight: 0 },
        secondShip: { weight: 0 },
        rainbowStar: { weight: 0 },
      },

      enemies: {}, // No enemies

      events: [
        {
          type: "trigger_dialog",
          condition: "enemies_cleared",
          value: 0,
          onlyOnce: true,
        },
      ],
    },
    {
      // Phase 8: Boss fight
      id: 8,
      type: "boss",
      name: "Final Confrontation",

      transitionCondition: "boss_defeated",
      transitionValue: null,

      asteroidSpawnRate: 999999,
      powerupSpawnRate: 200,
      metalSpawnRate: 999999,

      asteroidTypes: [],
      powerupEnabled: true,
      metalEnabled: false,

      enemies: {}, // No regular enemies during boss fight

      events: [
        {
          type: "spawn_enemy",
          enemyId: "mainBoss",
          condition: "phase_start",
          value: 0,
          onlyOnce: true,
        },
      ],
    },
  ],
};
