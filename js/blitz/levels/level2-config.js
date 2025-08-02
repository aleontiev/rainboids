// Level 2 Configuration - Boss Testing Level
// This level skips straight to the boss fight for testing purposes

import level1Config from './level1-config.js';

export const level2Config = {
  // Import all of level1 as base
  ...level1Config,
  
  // Override specific settings for boss testing
  levelId: 2,
  name: "Boss Battle Test",
  description: "Direct boss encounter for testing the generic boss system",
  startDelay: 1000, // Start boss fight quickly
  
  // Override world configuration with new background
  world: {
    // Keep all level1 world settings
    ...level1Config.world,
    
    // Override only the background settings for boss test theme
    background: {
      // Rich sunset gradient with multiple colors
      type: "gradient", // "solid", "gradient", "radial", "animated", "layered"
      color: "#ff6b35", // Fallback color
      
      // Simple 3-color sunset gradient
      gradient: {
        direction: "vertical", // "vertical", "horizontal", "diagonal"
        colors: [
          { color: "#ff6b35", stop: 0.0 },   // Orange-red at top
          { color: "#f7931e", stop: 0.5 },   // Golden yellow middle  
          { color: "#8B4513", stop: 1.0 }    // Brown at bottom
        ]
      },
      
      // Star field settings - more dramatic for boss fight
      stars: {
        enabled: true,
        
        // Star counts - fewer stars for boss fight atmosphere
        gameStarCount: 150,     // Fewer stars during boss fight
        titleStarCount: 200,    // Fewer on title too
        
        // Star appearance - slightly larger and brighter
        gameStarSize: { min: 1.0, max: 3.0 },
        titleStarSize: { min: 1.8, max: 5.0 },
        gameOpacity: { min: 0.2, max: 0.6 },
        titleOpacity: { min: 0.3, max: 0.9 },
        
        // Star colors - colors that work well with sunset background
        colors: [
          "#ffffff", "#ffffff", // White (most common)
          "#ffeeaa", "#ffffcc", // Light yellows
          "#ffdddd", "#ffcccc", // Light pinks/reds
          "#333333", "#444444", // Dark grays for contrast
          "#660000", "#440000", // Deep reds
          "#000080", "#000044", // Deep blues
          "#800080", "#440044", // Deep purples
        ],
        
        // Star shapes - more dramatic shapes
        gameShapes: ["star4", "star8", "diamond", "plus"],
        titleShapes: ["star8"], // 8-pointed stars for more drama
        
        // Animation settings - faster twinkling for intensity
        twinkleSpeed: { min: 0.015, max: 0.035 },
        pulseSpeed: { min: 0.020, max: 0.040 },
        rotationSpeed: { min: -0.020, max: 0.020 },
        
        // Movement settings - faster movement for dynamic feel
        gameMovementSpeed: 0.15,    // Faster stars for boss fight
        titleMovementSpeed: 1.0,    // Faster title screen movement
      }
    },
  },
  
  // Override phases to skip directly to boss fight
  phases: [
    {
      // Phase 1: Boss fight immediately
      id: 1,
      type: "boss",
      name: "Boss Battle Test",

      transitionCondition: "boss_defeated",
      transitionValue: null,

      asteroidSpawnRate: 999999, // No asteroids
      powerupSpawnRate: 200,
      metalSpawnRate: 999999, // No metals

      asteroidTypes: [],
      powerupEnabled: true,
      metalEnabled: false,

      enemies: {}, // No regular enemies during boss fight

      events: [
        {
          type: "spawn_enemy",
          enemyId: "mainBoss",
          condition: "phase_start",
          value: 1000, // Spawn boss 1 second after phase start
          onlyOnce: true,
        },
      ],
    },
  ],
};