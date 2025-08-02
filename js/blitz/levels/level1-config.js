// Level 1 Configuration - Complete game configuration for BlitzRain
export default {
  // Player configuration
  player: {
    // Visual appearance - can be "arrow", "triangle", "circle", or SVG URL
    shape:
      "https://api.iconize.ai/storage/v1/object/public/generated_icons/09bbe4b7-96af-4067-b943-9b9590ec5171/edited-1753821397071.svg",

    // Movement and physics
    speed: 10,
    size: 10,
    hitbox: 6,
    shieldCooldownMax: 600,
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
        fireRate: 8,
        projectiles: [
          {
            type: "bullet",
            count: 1,
            size: 15, // Increased from 10 to 15 (1.5x)
            speed: 8,
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
        fireRate: 7,
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
        fireRate: 6,
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
        fireRate: 2,
        projectiles: [
          {
            type: "laser",
            count: 1,
            size: 15,
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

  // Audio configuration
  audio: {
    // Background music settings
    backgroundMusic: {
      file: "music/bgm.mp3", // Path to music file
      offset: 0, // Start position in seconds (0 = from beginning)
      loop: true, // Whether to loop the music
      volume: 0.7, // Volume level (0.0 to 1.0)
    },

    // Sound effects configuration
    soundEffects: {
      volume: 1.0, // Master volume for all sound effects
      enabled: true, // Global sound effects toggle
    },
  },

  // World settings
  world: {
    // Game timing and performance
    gameSpeed: 2.0, // Global speed multiplier (2.0 = 2x faster than normal)

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
    floatingTextColor: "#00ff00", // Green score popup text
    floatingTextSize: 24, // Base font size for score popups
    bulletLife: 20000,

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

    // Bullet visual settings
    bulletStrokeColor: "#ffffff", // White stroke for all bullets
    bulletStrokeWidth: 1,

    // Background settings
    background: {
      // Base background (can be solid color or gradient)
      type: "gradient", // "solid", "gradient", "radial"
      color: "#000000", // Solid color (if type is "solid")

      // Gradient settings (if type is "gradient" or "radial") - matches Phase 1 (Sunset)
      gradient: {
        start: "#ff7f50", // Coral/orange sunset sky (matches Phase 1)
        end: "#ff6347", // Tomato red sunset (matches Phase 1)
        direction: "vertical", // "vertical", "horizontal", "diagonal"
      },

      // Star field settings
      stars: {
        enabled: true,

        // Star counts - matches Phase 1 (Sunset)
        gameStarCount: 160, // Doubled stars for sunset (matches Phase 1)
        titleStarCount: 300, // Stars on title screen

        // Star appearance - matches Phase 1 (Sunset)
        gameStarSize: { min: 0.5, max: 1.5 }, // Medium stars for sunset (matches Phase 1)
        titleStarSize: { min: 1.5, max: 4.5 },
        gameOpacity: { min: 0.5, max: 0.7 }, // Much brighter stars for sunset (matches Phase 1)
        titleOpacity: { min: 0.25, max: 0.8 },

        // Star colors - matches Phase 1 (Sunset)
        colors: [
          "#ffffff",
          "#fffacd",
          "#ffd700",
          "#ffa500", // White to golden stars for sunset (matches Phase 1)
        ],

        // Star shapes - matches Phase 1 (Sunset)
        gameShapes: ["point", "diamond", "star4"], // More variety for sunset (matches Phase 1)
        titleShapes: ["star4"], // Title screen uses only 4-pointed stars

        // Animation settings - matches Phase 1 (Sunset)
        twinkleSpeed: { min: 0.006, max: 0.016 }, // Moderate twinkling for sunset (matches Phase 1)
        pulseSpeed: { min: 0.012, max: 0.03 },
        rotationSpeed: { min: -0.012, max: 0.012 },

        // Movement settings - matches Phase 1 (Sunset)
        gameMovementSpeed: 0.08, // Moderate movement for sunset (matches Phase 1)
        titleMovementSpeed: 0.8, // How fast stars move on title screen
      },
    },

    // Audio settings
    audioVolume: 0.1,
    musicVolume: 0.3,

    // Colors
    starColors: [
      "#ffffff",
      "#ffffff",
      "#ffffff",
      "#ffffff",
      "#ffffff",
      "#ffffff",
      "#ffffff",
      "#ffffff",
      "#ffffff",
      "#ffffff",
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
        bullet: {
          type: "normal", // normal, circular, spreading, laser
          size: 6,
          speed: 3,
          color: null, // Uses enemy color if null
          damage: 1,
          // For spreading bullets only:
          // delay: 1000, // Time before splitting (replaces spreadExplosionTime)
          // bullet: { ... } // Recursive structure for bullets that spawn from spreading
        },
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
      rotation: 0, // No rotation for pointy triangle
      movement: {
        type: "straight",
      },
      attack: {
        pattern: "simple",
        cooldown: 150,
        bullet: {
          type: "normal",
          size: 10,
          color: "#ff4444",
        },
      },
    },

    sineBasic: {
      name: "Wave Rider",
      shape: "two-circles",
      color: "#ff6644",
      rotation: 0.05, // Slow rotation for round shape
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
        bullet: {
          type: "normal",
          size: 10,
          speed: 5,
          color: "#ff6644",
        },
      },
    },

    zigzagBasic: {
      name: "Zigzag Bomber",
      shape: "triangle",
      color: "#ff8844",
      rotation: 0, // No rotation for pointy triangle
      movement: {
        type: "zigzag",
        zigzagTimer: 30,
        zigzagSpeed: 2,
      },
      attack: {
        pattern: "spreading",
        cooldown: 300,
        bullet: {
          type: "spreading",
          size: 15,
          speed: 1.5,
          color: "#ff8844",
          delay: 120, // Replaces spreadExplosionTime
          count: 8, // Replaces spreadBulletCount
          bullet: {
            type: "normal",
            size: 13, // Replaces spreadBulletSize
            speed: 3, // Replaces spreadBulletSpeed
            color: "#ff8844",
          },
        },
      },
    },

    circleBasic: {
      name: "Orbital Cloner",
      shape: "ring",
      color: "#ffaa44",
      size: 24,
      rotation: 0.08, // Medium rotation for ring shape
      movement: {
        type: "circle",
        radius: { min: 40, max: 70 },
        angularSpeed: { min: 0.04, max: 0.06 },
        driftSpeed: 0.5,
      },
      attack: {
        pattern: "simple",
        cooldown: 300,
        bullet: {
          type: "normal",
          size: 10,
          speed: 5,
          color: "#ffaa44",
        },
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
      rotation: 0, // No rotation for pointy sharp-triangle
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
      rotation: 0.03, // Slow rotation for circle shape
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
        bullet: {
          type: "laser",
          color: "#ffaa44",
        },
      },
    },

    pulseBasic: {
      name: "Pulse Ring",
      shape: "ring",
      color: "#ffcc44",
      size: 33.6, // 1.4x normal size
      speed: 1.5,
      rotation: 0.06, // Medium rotation for ring shape
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
        bullet: {
          type: "circular",
          size: 8,
          speed: 3,
          color: "#ffcc44",
        },
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
        bullet: {
          type: "circular",
          size: 8, // Reduced from 12 to 8
          speed: 4,
          color: "#ff6644",
        },
      },
      rotation: 0.1, // Spinning square rotation speed
    },

    // Variations - demonstrate different configurations
    zigzagFast: {
      name: "Speed Bomber",
      shape: "triangle",
      color: "#ff8844",
      speed: 3.5,
      size: 20,
      fadeInTime: 30,
      rotation: 0, // No rotation for pointy triangle
      movement: {
        type: "zigzag",
        zigzagTimer: 20,
        zigzagSpeed: 3,
      },
      attack: {
        pattern: "spreading",
        cooldown: 250,
        bullet: {
          type: "spreading",
          size: 12,
          speed: 2.5,
          color: "#ff8844",
          delay: 90, // Replaces spreadExplosionTime
          count: 12, // Replaces spreadBulletCount
          bullet: {
            type: "normal",
            size: 8, // Replaces spreadBulletSize (increased from 4 to 8)
            speed: 4, // Replaces spreadBulletSpeed
            color: "#ff8844",
          },
        },
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
        bullet: {
          type: "circular",
          size: 10, // Reduced from 15 to 10
          speed: 4,
          color: "#ff4444",
        },
      },
      rotation: 0.1, // Spinning square rotation speed
    },

    // Boss-level enemies (minibosses and bosses use different system)
    alphaMiniBoss: {
      type: "miniboss",
      sprite:
        "https://api.iconize.ai/storage/v1/object/public/generated_icons/09bbe4b7-96af-4067-b943-9b9590ec5171/e274a015-4c85-45fd-8362-fd05080c728e.svg",
      spriteScale: 1,
      spriteColor: "#ff6644",
      health: 100,
      shield: 100,
      speed: 0.5,
      size: 110,
      // New configurable attack system
      attacks: [
        {
          pattern: "single",
          rate: 70,
          damage: 1,
          bullet: {
            speed: 2,
            size: 8,
            color: "#ff6644",
          },
        },
        {
          pattern: "spread",
          rate: 120,
          count: 3,
          spreadAngle: 0.3,
          damage: 1,
          bullet: {
            speed: 1.8,
            size: 7,
            color: "#ff8844",
          },
        },
      ],
    },

    betaMiniBoss: {
      type: "miniboss",
      sprite:
        "https://api.iconize.ai/storage/v1/object/public/generated_icons/generated_icons/af4d7337-9ce5-4aaa-81a5-229ccd610bbe.svg",
      spriteScale: 1,
      spriteColor: "#ffaa44",
      health: 100,
      shield: 100,
      speed: 0.8,
      size: 90,
      // New configurable attack system
      attacks: [
        {
          pattern: "double",
          rate: 60,
          damage: 1,
          bullet: {
            speed: 2.5,
            size: 8,
            color: "#ffaa44",
          },
        },
        {
          pattern: "circular",
          rate: 180,
          numBullets: 8,
          damage: 1,
          cooldown: {
            start: 2000,
            pause: 3000,
          },
          bullet: {
            speed: 1.2,
            size: 6,
            color: "#ffcc44",
          },
        },
      ],
    },

    gammaMiniBoss: {
      type: "miniboss",
      sprite:
        "https://api.iconize.ai/storage/v1/object/public/generated_icons/generated_icons/af4d7337-9ce5-4aaa-81a5-229ccd610bbe.svg",
      spriteScale: 1,
      spriteColor: "#ff88aa", // Different color to distinguish from beta
      health: 100,
      shield: 100,
      speed: 0.8,
      size: 90,
      // New configurable attack system - most aggressive pattern
      attacks: {
        pattern: "spread",
        rate: 45,
        count: 5,
        spreadAngle: 0.6,
        damage: 1,
        cooldown: {
          start: 4000,
          pause: 1000,
        },
        bullet: {
          speed: 2.2,
          size: 8,
          color: "#ff88aa",
        },
      },
    },

    mainBoss: {
      type: "boss",
      health: 2000,
      size: 120,

      // Movement pattern for the core part
      movement: {
        type: "oscillate",
        amplitude: 80,
        frequency: 0.015,
      },

      // Boss part definitions with skeleton/anchoring system
      parts: {
        body: {
          isCore: true,
          shape: "rectangle",
          width: 80,
          height: 60,
          color: "#666666",
          health: 800,
        },

        head: {
          shape: "circle",
          size: 40,
          color: "#ff4444",
          health: 400,
          anchor: {
            from: "head.bottom",
            to: "body.top",
          },
        },

        leftArm: {
          shape: "rectangle",
          width: 20,
          height: 50,
          color: "#888888",
          health: 300,
          anchor: {
            from: "leftArm.right",
            to: "body.left",
          },
        },

        rightArm: {
          shape: "rectangle",
          width: 20,
          height: 50,
          color: "#888888",
          health: 300,
          anchor: {
            from: "rightArm.left",
            to: "body.right",
          },
        },

        leftLeg: {
          shape: "rectangle",
          width: 18,
          height: 45,
          color: "#777777",
          health: 250,
          anchor: {
            from: "leftLeg.top",
            to: "body.bottom-left",
          },
        },

        rightLeg: {
          shape: "rectangle",
          width: 18,
          height: 45,
          color: "#777777",
          health: 250,
          anchor: {
            from: "rightLeg.top",
            to: "body.bottom-right",
          },
        },
      },
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

      // Phase 1: Sunset background
      background: {
        type: "gradient",
        gradient: {
          start: "#ff7f50", // Coral/orange sunset sky
          end: "#ff6347", // Tomato red sunset
          direction: "vertical",
        },
        stars: {
          enabled: true,
          gameStarCount: 160, // Doubled stars for sunset
          gameStarSize: { min: 0.5, max: 1.5 },
          gameOpacity: { min: 0.5, max: 0.7 }, // Much brighter stars
          colors: ["#ffffff", "#fffacd", "#ffd700", "#ffa500"], // White to golden stars
          gameShapes: ["point", "diamond", "star4"],
          twinkleSpeed: { min: 0.006, max: 0.016 },
          gameMovementSpeed: 0.08,
        },
      },
      backgroundTransitionDuration: 3000, // 3 second transition

      // Phase-specific audio (optional override of level defaults)
      audio: {
        // backgroundMusic: {
        //   file: "music/phase1.mp3", // Override music for this phase
        //   offset: 0,
        //   loop: true,
        //   volume: 0.8,
        // },
      },

      // Phase-specific spawn rates and settings
      asteroidSpawnRate: 999999, // No asteroids in phase 1
      powerupSpawnRate: 500,
      metalSpawnRate: 999999, // No metal in phase 1

      asteroidTypes: [], // No asteroids in phase 1
      powerupEnabled: true,
      metalEnabled: false, // No metal in phase 1

      // Phase-specific powerup weights
      powerups: {
        shield: { weight: 25 },
        bomb: { weight: 15 },
        mainWeapon: { weight: 25 },
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
          weight: 0.3, // 30% of enemy spawns
          color: "#330000", // Dark red for early phase
          attack: {
            bullet: {
              color: "#660000", // Dark red bullets
            },
          },
        },
        sineBasic: {
          spawnRate: {
            base: 400,
            variance: 50,
          },
          weight: 0.25, // 25% of enemy spawns
          color: "#441100", // Dark red-orange for early phase
          attack: {
            bullet: {
              color: "#771100", // Dark orange bullets
            },
          },
        },
        zigzagBasic: {
          spawnRate: {
            base: 400,
            variance: 60,
          },
          weight: 0.2, // 20% of enemy spawns
          color: "#220000", // Very dark red for early phase
          attack: {
            bullet: {
              color: "#440000", // Very dark red bullets
            },
          },
        },
        diveBasic: {
          spawnRate: {
            base: 100,
            variance: 80,
          },
          weight: 0.1, // 10% of enemy spawns
          color: "#553311", // Dark brown-orange for early phase
          attack: {
            bullet: {
              color: "#664422", // Dark brown bullets
            },
          },
        },
        squareBasic: {
          spawnRate: {
            base: 500,
            variance: 100,
          },
          weight: 0.15, // 15% of enemy spawns
          color: "#331100", // Dark orange-brown for early phase
          attack: {
            bullet: {
              color: "#662200", // Dark orange-brown bullets
            },
          },
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

      // Phase 2: Late sunset
      background: {
        type: "gradient",
        gradient: {
          start: "#ff4500", // Orange red
          end: "#dc143c", // Crimson
          direction: "vertical",
        },
        stars: {
          enabled: true,
          gameStarCount: 240,
          gameStarSize: { min: 0.6, max: 1.8 },
          gameOpacity: { min: 0.6, max: 0.75 }, // Much brighter stars
          colors: ["#ffffff", "#fffacd", "#ffd700"],
          gameShapes: ["point", "diamond", "star4"],
          twinkleSpeed: { min: 0.008, max: 0.018 },
          gameMovementSpeed: 0.1,
        },
      },
      backgroundTransitionDuration: 4000,

      asteroidSpawnRate: 999999, // No asteroids in phase 2
      powerupSpawnRate: 300,
      metalSpawnRate: 999999, // No metal in phase 2

      asteroidTypes: [], // No asteroids in phase 2
      powerupEnabled: true,
      metalEnabled: false, // No metal in phase 2

      // Phase 2: Increased shield and bomb weights for miniboss fight
      powerups: {
        shield: { weight: 35 },
        bomb: { weight: 25 },
        mainWeapon: { weight: 10 },
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
          color: "#442211", // Phase 2-3: Dark but slightly brighter
          attack: {
            bullet: {
              color: "#772233", // Phase 2-3: Dark red-brown bullets
            },
          },
        },
        sineBasic: {
          spawnRate: {
            base: 600,
            variance: 120,
          },
          weight: 0.3,
          color: "#553322", // Phase 2: Dark brown
          attack: {
            bullet: {
              color: "#884444", // Phase 2: Dark red bullets
            },
          },
        },
        zigzagBasic: {
          spawnRate: {
            base: 700,
            variance: 140,
          },
          weight: 0.2,
          color: "#331111", // Phase 2: Very dark red
          attack: {
            bullet: {
              color: "#662222", // Phase 2: Dark red bullets
            },
          },
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

      // Phase 3: Early twilight
      background: {
        type: "gradient",
        gradient: {
          start: "#8b008b", // Dark magenta
          end: "#4b0082", // Indigo
          direction: "vertical",
        },
        stars: {
          enabled: true,
          gameStarCount: 320,
          gameStarSize: { min: 0.7, max: 2.0 },
          gameOpacity: { min: 0.65, max: 0.8 }, // Much brighter stars
          colors: ["#ffffff", "#e6e6fa", "#dda0dd"],
          gameShapes: ["point", "diamond", "star4", "star8"],
          twinkleSpeed: { min: 0.01, max: 0.02 },
          gameMovementSpeed: 0.12,
        },
      },
      backgroundTransitionDuration: 4000,

      // Phase-specific audio (optional override of level defaults)
      audio: {
        backgroundMusic: {
          file: "music/bgm.orig.mp3", // Original background music for miniboss
          offset: 0,
          loop: true,
          volume: 0.8,
        },
      },

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
        mainWeapon: { weight: 18 },
        sideWeapon: { weight: 25 },
        secondShip: { weight: 8 },
        rainbowStar: { weight: 7 },
      },

      // No enemies during asteroid storm
      enemies: {},

      events: [],
    },
    {
      // Phase 4: Triple minibosses - three minibosses spawn
      id: 4,
      type: "basic",
      name: "Triple Guardians",

      transitionCondition: "miniboss_defeated",
      transitionValue: null,

      // Phase 4: Deep twilight
      background: {
        type: "gradient",
        gradient: {
          start: "#191970", // Midnight blue
          end: "#000080", // Navy blue
          direction: "vertical",
        },
        stars: {
          enabled: true,
          gameStarCount: 400,
          gameStarSize: { min: 0.9, max: 2.4 },
          gameOpacity: { min: 0.7, max: 0.85 }, // Much brighter stars
          colors: ["#ffffff", "#add8e6", "#87ceeb"], // White and light blue stars
          gameShapes: ["point", "diamond", "star4", "star8", "plus"],
          twinkleSpeed: { min: 0.012, max: 0.024 },
          gameMovementSpeed: 0.14,
        },
      },
      backgroundTransitionDuration: 5000,

      // Phase-specific audio for triple miniboss fight (optional override of level defaults)
      audio: {
        // backgroundMusic: {
        //   file: "music/phase4-triple-miniboss.mp3", // Epic music for triple miniboss battle
        //   offset: 0,
        //   loop: true,
        //   volume: 0.9,
        // },
      },

      asteroidSpawnRate: 300,
      powerupSpawnRate: 250,
      metalSpawnRate: 1800, // Enable metal starting phase 4

      asteroidTypes: ["small", "medium"],
      powerupEnabled: true,
      metalEnabled: true, // Enable metal starting phase 4

      // Phase 4: Heavy defensive focus for triple miniboss fight
      powerups: {
        shield: { weight: 40 },
        bomb: { weight: 30 },
        mainWeapon: { weight: 8 },
        sideWeapon: { weight: 10 },
        secondShip: { weight: 3 },
        rainbowStar: { weight: 5 },
      },

      // Minimal enemy spawning during triple miniboss fight
      enemies: {
        straightBasic: {
          spawnRate: {
            base: 600,
            variance: 120,
          },
          weight: 0.7,
          color: "#cc4444", // Phase 4: Medium brightness
          attack: {
            bullet: {
              color: "#ff6666", // Phase 4: Medium red bullets
            },
          },
        },
        circleBasic: {
          spawnRate: {
            base: 800,
            variance: 160,
          },
          weight: 0.3,
          color: "#dd6633", // Phase 4: Medium orange-red
          attack: {
            bullet: {
              color: "#ff7744", // Phase 4: Medium orange bullets
            },
          },
        },
      },

      events: [
        {
          type: "spawn_enemy",
          enemyId: "alphaMiniBoss",
          condition: "time",
          value: 2000, // 2 seconds into phase
          onlyOnce: true,
        },
        {
          type: "spawn_enemy",
          enemyId: "betaMiniBoss",
          condition: "time",
          value: 3000, // 4 seconds into phase
          onlyOnce: true,
        },
        {
          type: "spawn_enemy",
          enemyId: "gammaMiniBoss",
          condition: "time",
          value: 4000, // 4 seconds into phase (same as beta)
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

      // Phase 5: Early night
      background: {
        type: "gradient",
        gradient: {
          start: "#000080", // Navy blue
          end: "#000040", // Very dark blue
          direction: "vertical",
        },
        stars: {
          enabled: true,
          gameStarCount: 480,
          gameStarSize: { min: 1.0, max: 2.8 },
          gameOpacity: { min: 0.75, max: 0.9 }, // Very bright stars
          colors: ["#ffffff", "#e0e6ff", "#b0c4de"], // White and pale blue stars
          gameShapes: ["point", "diamond", "star4", "star8", "plus", "cross"],
          twinkleSpeed: { min: 0.014, max: 0.026 },
          gameMovementSpeed: 0.16,
        },
      },
      backgroundTransitionDuration: 4000,

      audio: {
        backgroundMusic: {
          file: "music/bgm.mp3", // Return to main BGM but starting 1:30 in
          offset: 90, // Start 1 minute 30 seconds (90 seconds) into the song
          loop: true,
          volume: 0.7,
        },
      },
      audio: {
        // backgroundMusic: {
        //   file: "music/phase5-final-storm.mp3", // Climactic music for final storm
        //   offset: 0,
        //   loop: true,
        //   volume: 0.9,
        // },
      },

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
        mainWeapon: { weight: 15 },
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

      // Phase 6: Deep night
      background: {
        type: "gradient",
        gradient: {
          start: "#000040", // Very dark blue
          end: "#000020", // Almost black blue
          direction: "vertical",
        },
        stars: {
          enabled: true,
          gameStarCount: 560,
          gameStarSize: { min: 1.2, max: 3.2 },
          gameOpacity: { min: 0.8, max: 0.95 }, // Maximum brightness stars
          colors: ["#ffffff", "#f0f8ff", "#e6e6fa"], // Pure white and light stars
          gameShapes: ["point", "diamond", "star4", "star8", "plus", "cross"],
          twinkleSpeed: { min: 0.016, max: 0.03 },
          gameMovementSpeed: 0.18,
        },
      },
      backgroundTransitionDuration: 5000,

      // Phase-specific audio for cleanup phase (optional override of level defaults)
      audio: {
        // backgroundMusic: {
        //   file: "music/phase6-preparation.mp3", // Calm preparation music
        //   offset: 0,
        //   loop: true,
        //   volume: 0.7,
        // },
      },

      asteroidSpawnRate: 999999, // No asteroids during cleanup
      powerupSpawnRate: 100,
      metalSpawnRate: 1200, // Enable metal during cleanup

      asteroidTypes: [],
      powerupEnabled: true,
      metalEnabled: true, // Enable metal during cleanup

      // Phase 6: Prepare for boss with equal powerup distribution
      powerups: {
        shield: { weight: 20 },
        bomb: { weight: 20 },
        mainWeapon: { weight: 10 },
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

      // Phase 7: Pre-midnight
      background: {
        type: "gradient",
        gradient: {
          start: "#000020", // Almost black blue
          end: "#000010", // Nearly black
          direction: "vertical",
        },
        stars: {
          enabled: true,
          gameStarCount: 640,
          gameStarSize: { min: 1.3, max: 3.5 },
          gameOpacity: { min: 0.85, max: 1.0 }, // Maximum star brightness
          colors: ["#ffffff", "#ffffff", "#f8f8ff"], // Pure bright white stars
          gameShapes: ["point", "diamond", "star4", "star8", "plus", "cross"],
          twinkleSpeed: { min: 0.018, max: 0.032 },
          gameMovementSpeed: 0.2,
        },
      },
      backgroundTransitionDuration: 6000,

      // Phase-specific audio for boss dialog (optional override of level defaults)
      audio: {
        // backgroundMusic: {
        //   file: "music/phase7-boss-dialog.mp3", // Dramatic dialog music
        //   offset: 0,
        //   loop: true,
        //   volume: 0.6,
        // },
      },

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

      // Phase 8: Midnight (darkest) - Boss fight
      background: {
        type: "gradient",
        gradient: {
          start: "#000010", // Nearly black
          end: "#000000", // Pure black
          direction: "vertical",
        },
        stars: {
          enabled: true,
          gameStarCount: 800,
          gameStarSize: { min: 1.5, max: 4.0 },
          gameOpacity: { min: 0.9, max: 1.0 }, // Maximum brilliant stars against black sky
          colors: ["#ffffff", "#ffffff", "#f8f8ff"], // Pure bright white stars
          gameShapes: ["point", "diamond", "star4", "star8", "plus", "cross"],
          twinkleSpeed: { min: 0.022, max: 0.035 },
          gameMovementSpeed: 0.22, // Fastest for maximum drama
        },
      },
      backgroundTransitionDuration: 8000, // Longest transition for climax

      // Phase-specific audio for boss fight (optional override of level defaults)
      audio: {
        // backgroundMusic: {
        //   file: "music/phase8-boss-fight.mp3", // Ultimate boss battle music
        //   offset: 0,
        //   loop: true,
        //   volume: 1.0,
        // },
      },

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
