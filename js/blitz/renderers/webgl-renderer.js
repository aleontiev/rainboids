import { BaseRenderer } from "./base-renderer.js";
import { RENDERER_TYPES } from "../constants.js";

/**
 * WebGL Three.js Renderer implementation
 * Handles all 3D WebGL-based rendering for the game
 */
export class WebGLRenderer extends BaseRenderer {
  constructor(game, canvas) {
    super(game, canvas);
    this.type = RENDERER_TYPES.WEBGL_3D;
    
    // UUID counter for generating unique IDs
    this.uuidCounter = 0;

    // Three.js specific properties
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.materials = new Map();
    this.meshes = new Map();

    // Text rendering utilities for WebGL
    this.textCanvas = document.createElement("canvas");
    this.textCtx = this.textCanvas.getContext("2d");

    // WebGL specific properties
    this.animationFrame = 0;
    this.helpModalVisible = false;

    // UI interaction properties (matching Canvas renderer)
    this.hoveredButton = null;
    this.clickedButton = null;

    // Animation time for effects
    this.time = 0;

    // Cursor trail system
    this.cursorTrails = [];
    this.lastCursorPosition = { x: 0, y: 0 };
    this.trailGeometry = null;
    this.trailMaterial = null;

    // Object pooling for performance
    this.meshPool = {
      bullets: [],
      particles: [],
      enemies: [],
      asteroids: [],
      metals: [],
      powerups: [],
      explosions: [],
      stars: [],
      player: [],
    };
    this.availableObjects = new Map(); // Track which objects are available for reuse
    this.activeObjects = new Set(); // Track currently active objects
    
    // Entity-to-mesh mapping for proper lifecycle tracking
    this.entityMeshMap = new Map(); // Maps entity ID to its dedicated mesh
    
    // Performance optimization: Track rainbow objects to avoid scene traversal
    this.rainbowObjects = new Set(); // Set of meshes with rainbow materials
    this.frameCount = 0; // Frame counter for performance optimizations
    
    // Performance monitoring
    this.lastPerformanceLog = 0; // Timestamp of last performance log
    this.performanceLogInterval = 1000; // Log every 1 second (1000ms)
    
  }

  // Generate a unique ID for entities
  generateUniqueId() {
    return `webgl_${this.uuidCounter++}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }


  // Generate stable seed for asteroid shape based on entity properties
  getAsteroidSeed(entity) {
    // Use entity position and size to create a deterministic seed
    const x = Math.floor(entity.x || 0);
    const y = Math.floor(entity.y || 0);
    const size = Math.floor(entity.size || 15);
    
    // Simple hash function to create seed from coordinates
    let seed = x * 73856093 + y * 19349663 + size * 83492791;
    seed = Math.abs(seed) % 1000000; // Keep it reasonable
    return seed;
  }

  initialize() {
    // Check if Three.js is available
    if (typeof THREE === "undefined") {
      console.warn("Three.js not available, cannot initialize WebGL renderer");
      return false;
    }

    try {
      // Initialize Three.js components
      this.initializeThreeJS();
      this.initializeScene();
      this.initializeMaterials();

      return true;
    } catch (error) {
      console.error("Failed to initialize WebGL renderer:", error);
      return false;
    }
  }

  initializeThreeJS() {
    // Create Three.js renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });

    this.renderer.setSize(this.canvas.width, this.canvas.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x000000, 1.0);

    // Enable features we might need
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  initializeScene() {
    // Create scene
    this.scene = new THREE.Scene();

    // Create orthographic camera for 2D game coordinates
    // Use screen coordinates directly (0,0 at top-left)
    // For proper 2D screen coordinates, we need to set up the camera differently
    this.camera = new THREE.OrthographicCamera(
      -this.canvas.width / 2,
      this.canvas.width / 2, // left, right (centered)
      this.canvas.height / 2,
      -this.canvas.height / 2, // top, bottom (Y flipped)
      0.1,
      1000 // near, far
    );

    // Position camera at origin looking down the Z axis
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);

    // Add ambient lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Add directional light for shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 0, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
  }

  initializeMaterials() {
    // Create common materials
    this.materials.set(
      "player",
      new THREE.MeshLambertMaterial({
        color: 0x00ff88,
        transparent: true,
      })
    );

    this.materials.set(
      "enemy",
      new THREE.MeshLambertMaterial({
        color: 0xff4444,
        transparent: true,
      })
    );

    this.materials.set(
      "bullet",
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
      })
    );

    this.materials.set(
      "powerup",
      new THREE.MeshLambertMaterial({
        color: 0xffff00,
        transparent: true,
        emissive: 0x333300,
      })
    );

    this.materials.set(
      "asteroid",
      new THREE.MeshLambertMaterial({
        color: 0x888888,
        transparent: true,
      })
    );

    // Create rainbow glow shader material
    this.createRainbowGlowMaterial();

    // Create cursor trail material
    this.createCursorTrailMaterial();
  }

  createRainbowGlowMaterial() {
    // Rainbow glow vertex shader
    const vertexShader = `
      varying vec2 vUv;
      varying vec3 vPosition;
      
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    // Rainbow glow fragment shader with multiple animation modes
    const fragmentShader = `
      uniform float time;
      uniform float letterIndex;
      uniform float animationMode;
      uniform sampler2D textTexture;
      varying vec2 vUv;
      varying vec3 vPosition;
      
      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }
      
      void main() {
        vec4 textColor = texture2D(textTexture, vUv);
        
        if (textColor.a < 0.1) {
          discard;
        }
        
        float hue = 0.0;
        float intensity = 1.0;
        
        // Animation Mode 0: Sequential color wave
        if (animationMode < 1.0) {
          hue = mod(letterIndex * 0.15 + time * 0.8, 1.0);
          intensity = 1.0 + 0.3 * sin(time * 4.0 + letterIndex * 0.5);
        }
        // Animation Mode 1: Synchronized gradient sweep
        else if (animationMode < 2.0) {
          float gradientPhase = sin(time * 0.7);
          hue = mod(0.5 + gradientPhase * 0.4 + letterIndex * 0.08, 1.0);
          intensity = 1.0 + 0.4 * sin(time * 3.0);
        }
        // Animation Mode 2: Pulsing rainbow waves
        else if (animationMode < 3.0) {
          float wave = sin(time * 2.0 + letterIndex * 0.8);
          hue = mod(0.7 + wave * 0.3, 1.0);
          intensity = 1.0 + 0.5 * abs(wave);
        }
        // Animation Mode 3: Fire-like flicker
        else if (animationMode < 4.0) {
          float flicker1 = sin(time * 8.0 + letterIndex * 1.2);
          float flicker2 = sin(time * 12.0 + letterIndex * 0.7);
          hue = mod(0.05 + (flicker1 + flicker2) * 0.1, 1.0); // Red to yellow range
          intensity = 1.2 + 0.6 * (flicker1 * 0.5 + flicker2 * 0.3);
        }
        // Animation Mode 4: Electric blue pulse
        else {
          float pulse = sin(time * 6.0 + letterIndex * 1.5);
          hue = 0.55 + pulse * 0.1; // Blue to cyan range
          intensity = 1.5 + 0.8 * abs(pulse);
        }
        
        vec3 rainbow = hsv2rgb(vec3(hue, 0.9, intensity));
        
        // Add extra glow for dramatic effect
        float glow = 1.0 + 0.3 * sin(time * 2.5 + letterIndex);
        vec3 finalColor = rainbow * glow;
        
        gl_FragColor = vec4(finalColor, textColor.a);
      }
    `;

    this.rainbowGlowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        letterIndex: { value: 0.0 },
        animationMode: { value: 0.0 },
        textTexture: { value: null },
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }

  createCursorTrailMaterial() {
    // Cursor trail vertex shader
    const vertexShader = `
      attribute float age;
      attribute float size;
      varying float vAge;
      
      void main() {
        vAge = age;
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (1.2 - age * 0.2); // Larger base size, slower shrinking
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    // Cursor trail fragment shader with rainbow fade
    const fragmentShader = `
      varying float vAge;
      
      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }
      
      void main() {
        // Create circular particle shape
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        if (dist > 0.5) discard;
        
        // Color progression: indigo -> blue -> green -> yellow -> orange -> red
        float hue;
        if (vAge < 0.2) {
          hue = mix(0.75, 0.67, vAge / 0.2); // Indigo to blue
        } else if (vAge < 0.4) {
          hue = mix(0.67, 0.33, (vAge - 0.2) / 0.2); // Blue to green
        } else if (vAge < 0.6) {
          hue = mix(0.33, 0.17, (vAge - 0.4) / 0.2); // Green to yellow
        } else if (vAge < 0.8) {
          hue = mix(0.17, 0.08, (vAge - 0.6) / 0.2); // Yellow to orange
        } else {
          hue = mix(0.08, 0.0, (vAge - 0.8) / 0.2); // Orange to red
        }
        
        // Much higher saturation and brightness for extreme prominence
        float saturation = 1.0;
        float brightness = 2.5 - vAge * 0.8; // Much brighter, slower fade
        
        vec3 rainbowColor = hsv2rgb(vec3(hue, saturation, brightness));
        
        // White glow that fades out rapidly as color progresses
        float whiteIntensity = max(0.0, 1.0 - vAge * 4.0); // Fades out in first 25% of lifetime
        float whiteCore = (1.0 - dist * 3.0) * whiteIntensity;
        whiteCore = max(0.0, whiteCore);
        
        // Mix rainbow color with diminishing white core
        vec3 color = mix(rainbowColor, vec3(3.0), whiteCore * 0.7);
        
        // Much more rapid overall fading - twice as fast
        float rapidFade = 1.0 - vAge * vAge * 3.0; // Quadratic fade, twice as fast as before
        
        // Enhanced glow with rapid falloff
        float innerGlow = (1.0 - dist * 1.5) * rapidFade;
        float outerGlow = (1.0 - dist * 0.8) * rapidFade * 0.6;
        float combinedGlow = max(innerGlow, outerGlow);
        
        // White halo that disappears quickly
        float whiteHalo = (1.0 - dist * 0.5) * whiteIntensity * 0.4;
        
        float alpha = max(combinedGlow, whiteHalo) * rapidFade;
        
        gl_FragColor = vec4(color, alpha);
      }
    `;

    this.cursorTrailMaterial = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending, // Additive blending for glow effect
      depthWrite: false,
    });
  }

  /**
   * Create a texture from text for WebGL rendering
   */
  createTextTexture(text, font = "24px Arial", fillStyle = "#ffffff") {
    // Size the text canvas
    this.textCtx.font = font;
    const metrics = this.textCtx.measureText(text);
    const width = Math.ceil(metrics.width) + 20; // Add padding
    const height = 40; // Standard height for text

    this.textCanvas.width = width;
    this.textCanvas.height = height;

    // Re-set font after canvas resize
    this.textCtx.font = font;
    this.textCtx.fillStyle = fillStyle;
    this.textCtx.textAlign = "center";
    this.textCtx.textBaseline = "middle";

    // Clear and draw text
    this.textCtx.clearRect(0, 0, width, height);
    this.textCtx.fillText(text, width / 2, height / 2);

    // Create Three.js texture from canvas
    const texture = new THREE.CanvasTexture(this.textCanvas);
    texture.needsUpdate = true;

    return { texture, width, height };
  }

  getContext() {
    // Return an object with WebGL context for entity rendering
    return {
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      materials: this.materials,
    };
  }

  supportsFeature(feature) {
    const supportedFeatures = [
      "3d-rendering",
      "hardware-acceleration",
      "shaders",
      "lighting",
      "shadows",
      "particle-systems",
    ];
    return supportedFeatures.includes(feature);
  }

  /**
   * Handle mouse clicks for UI interactions
   */
  handleClick(x, y) {
    for (const [id, button] of this.buttons) {
      if (this.isPointInButton(x, y, button) && button.enabled) {
        this.clickedButton = button;
        if (button.onClick) {
          button.onClick();
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Update mouse position and button states
   */
  updateMousePosition(x, y) {
    super.updateMousePosition(x, y);
    this.updateButtonStates();
  }

  /**
   * Update button hover states
   */
  updateButtonStates() {
    this.hoveredButton = null;
    for (const [id, button] of this.buttons) {
      const isHovered = this.isPointInButton(
        this.mousePosition.x,
        this.mousePosition.y,
        button
      );
      button.isHovered = isHovered;
      if (isHovered) {
        this.hoveredButton = button;
      }
    }
  }

  /**
   * Log performance metrics every 1 second for debugging lag issues
   */
  logPerformanceMetrics(entities) {
    const now = Date.now();
    if (now - this.lastPerformanceLog < this.performanceLogInterval) {
      return; // Not time to log yet
    }
    this.lastPerformanceLog = now;

    // Count entities by type
    const entityCounts = {
      player: 1,
      enemies: (entities.enemies?.length || 0) + (entities.miniBosses?.length || 0) + (entities.boss ? 1 : 0),
      enemyBullets: (entities.enemyBullets?.length || 0) + (entities.enemyLasers?.length || 0),
      playerBullets: (entities.bullets?.length || 0) + (entities.missiles?.length || 0) + (entities.spreadingBullets?.length || 0),
      asteroids: entities.asteroids?.length || 0,
      metals: entities.metals?.length || 0,
      powerups: entities.powerups?.length || 0,
      particles: (entities.particles?.length || 0) + (entities.debris?.length || 0),
      explosions: this.game.explosions?.length || 0,
      stars: this.game.background?.stars?.length || 0
    };

    // Count active meshes
    const meshCount = this.entityMeshMap.size;
    const rainbowObjectCount = this.rainbowObjects.size;

    // Calculate total entities
    const totalEntities = Object.values(entityCounts).reduce((sum, count) => sum + count, 0);

    console.log(`[WebGL Performance] Frame ${this.frameCount} | Entities: ${totalEntities} | Meshes: ${meshCount} | Rainbow: ${rainbowObjectCount}`);
    console.log(`[WebGL Performance] Breakdown - Enemies: ${entityCounts.enemies}, Enemy Bullets: ${entityCounts.enemyBullets}, Player Bullets: ${entityCounts.playerBullets}, Asteroids: ${entityCounts.asteroids}, Metals: ${entityCounts.metals}, Powerups: ${entityCounts.powerups}, Particles: ${entityCounts.particles}, Explosions: ${entityCounts.explosions}, Stars: ${entityCounts.stars}`);
  }

  render() {
    if (!this.scene) {
      return;
    }
    const entities = this.game.entities;
    const state = this.game.state;
    this.animationFrame++;
    this.incrementFrame();
    this.frameCount++;

    // Update animation time for effects
    this.time += 0.016; // Approximate 16ms per frame for 60fps
    
    // Performance logging (every 1 second)
    this.logPerformanceMetrics(entities);

    // Dynamic object management now handled efficiently in renderEntities

    // Background rendering now handled by main entity system

    if (state.state === "PLAYING" || state.state === "DYING") {
      // Render 3D game entities
      this.renderEntities(entities);

      // Apply post-processing effects if needed
      if (state.timeSlowActive) {
        this.applyTimeSlowEffect();
      }

      // Handle scene opacity for transitions
      if (this.game.opacity < 1) {
        this.applySceneTransition();
      }
    }

    // Update rainbow materials with current time
    this.updateRainbowEffects();

    // Update cursor trail (only on title screen)
    if (state.state === "TITLE" || state.state === "PAUSED") {
      this.updateCursorTrail();
    } else if (this.cursorTrails.length > 0) {
      // Clear trails when not on title screen
      this.cursorTrails = [];
      this.updateTrailGeometry(); // One last update to remove the mesh
    }

    // Render UI elements in WebGL
    this.renderUI();

    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  // updateDynamicObjects removed - replaced with efficient entity-to-mesh mapping

  // Old mesh pooling system removed - now using direct entity-to-mesh mapping

  clearScene() {
    // Safety check to ensure scene is initialized
    if (!this.scene) {
      return;
    }

    // Remove dynamic game objects and stars, keep UI elements and lights
    const objectsToRemove = [];
    this.scene.traverse((child) => {
      if (child.userData && child.userData.isDynamic) {
        // Keep UI elements (except cursor trails), remove everything else including stars
        if (
          child.userData.entityType !== "ui" ||
          child.userData.entityType === "cursorTrail"
        ) {
          objectsToRemove.push(child);
        }
      }
    });

    objectsToRemove.forEach((obj) => this.scene.remove(obj));
  }

  renderBackground() {
    // For WebGL, we need to render background stars as 3D objects
    // The background manager expects a 2D context, so we'll create our own star system
    this.renderBackgroundStars();
  }

  renderBackgroundStars() {
    // Access the background manager's stars
    if (this.game.background && this.game.background.stars) {
      this.game.background.stars.forEach((star, index) => {
        this.renderStar3D(star, false, index);
      });

      // Render shooting stars if on title screen
      if (
        (this.game.state.state === "TITLE" ||
          this.game.state.state === "PAUSED") &&
        this.game.background.shootingStars
      ) {
        this.game.background.shootingStars.forEach((star, index) => {
          this.renderStar3D(star, true, index + 10000); // Offset ID to avoid conflicts
        });
      }
    }
  }

  renderStar3D(star, isShootingStar = false, starId) {
    // Check if this star already has a dedicated mesh
    let mesh = this.entityMeshMap.get(starId);
    
    if (!mesh) {
      // Create a new mesh for this star
      // Create geometry and material only once
      const size = star.size * (this.game.background.starSize || 1);
      let geometry;

      switch (star.shape) {
        case "diamond":
          geometry = this.createDiamondStarGeometry(size);
          break;
        case "star4":
          geometry = this.createStarGeometry(size, 4);
          break;
        case "star8":
          geometry = this.createStarGeometry(size, 8);
          break;
        case "plus":
          geometry = this.createPlusGeometry(size);
          break;
        case "cross":
          geometry = this.createCrossGeometry(size);
          break;
        default: // 'point'
          geometry = new THREE.PlaneGeometry(size * 2, size * 2);
      }

      // Parse color carefully to avoid alpha component warnings
      let colorValue = star.color || "#ffffff";
      if (typeof colorValue === "string" && colorValue.startsWith("rgba")) {
        const rgbMatch = colorValue.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
          colorValue = `rgb(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]})`;
        }
      }

      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(colorValue),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { isDynamic: true, entityType: 'stars', entityId: starId };
      this.scene.add(mesh);
      this.entityMeshMap.set(starId, mesh);
    }

    // Update position and properties
    const centerX = star.x - this.canvas.width / 2;
    const centerY = -(star.y - this.canvas.height / 2);
    mesh.position.set(centerX, centerY, -10 + (Math.random() - 0.5) * 2);

    // Update material opacity
    const opacity = this.calculateStarOpacity(star, isShootingStar);
    mesh.material.opacity = opacity;

    // Update rotation
    if (star.rotation !== undefined) {
      mesh.rotation.z = star.rotation;
    }
  }

  createDiamondStarGeometry(size) {
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      0,
      size,
      0, // top
      -size,
      0,
      0, // left
      0,
      -size,
      0, // bottom
      size,
      0,
      0, // right
    ]);
    const indices = [0, 1, 2, 0, 2, 3];

    geometry.setIndex(indices);
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    return geometry;
  }

  createStarGeometry(size, points) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];

    // Create star points
    for (let i = 0; i < points * 2; i++) {
      const angle = (i / (points * 2)) * Math.PI * 2;
      const radius = i % 2 === 0 ? size : size * 0.4; // Alternating outer/inner radius
      vertices.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    }

    // Create triangular faces from center
    vertices.push(0, 0, 0); // Center vertex
    const centerIndex = vertices.length / 3 - 1;

    for (let i = 0; i < points * 2; i++) {
      const next = (i + 1) % (points * 2);
      indices.push(centerIndex, i, next);
    }

    geometry.setIndex(indices);
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(vertices), 3)
    );
    return geometry;
  }

  createPlusGeometry(size) {
    const geometry = new THREE.BufferGeometry();
    const thickness = size * 0.2;
    const vertices = new Float32Array([
      // Horizontal bar
      -size,
      -thickness,
      0,
      size,
      -thickness,
      0,
      size,
      thickness,
      0,
      -size,
      thickness,
      0,
      // Vertical bar
      -thickness,
      -size,
      0,
      thickness,
      -size,
      0,
      thickness,
      size,
      0,
      -thickness,
      size,
      0,
    ]);
    const indices = [
      0,
      1,
      2,
      0,
      2,
      3, // horizontal
      4,
      5,
      6,
      4,
      6,
      7, // vertical
    ];

    geometry.setIndex(indices);
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    return geometry;
  }

  createCrossGeometry(size) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];

    // Create X-shaped cross
    const points = [
      [-size, -size],
      [size, size],
      [size * 0.2, size * 0.2],
      [-size * 0.2, -size * 0.2],
      [size, -size],
      [-size, size],
      [-size * 0.2, size * 0.2],
      [size * 0.2, -size * 0.2],
    ];

    points.forEach(([x, y]) => vertices.push(x, y, 0));

    // Create triangular faces
    indices.push(0, 1, 2, 0, 2, 3); // First diagonal
    indices.push(4, 5, 6, 4, 6, 7); // Second diagonal

    geometry.setIndex(indices);
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(vertices), 3)
    );
    return geometry;
  }

  calculateStarOpacity(star, isShootingStar) {
    const baseOpacity = star.opacity || 1;
    const brightness = this.game.background.starBrightness || 1;

    if (isShootingStar) {
      return baseOpacity * brightness;
    }

    // Apply twinkling effect
    const twinkleEffect = star.twinkle ? 0.5 + 0.5 * Math.sin(star.twinkle) : 1;

    // Apply pulsing for title screen
    let pulseEffect = 1;
    if (
      (this.game.state.state === "TITLE" ||
        this.game.state.state === "PAUSED") &&
      star.pulsePhase !== undefined
    ) {
      pulseEffect = 0.85 + 0.2 * Math.sin(star.pulsePhase);
    }

    return Math.min(
      1.0,
      baseOpacity * twinkleEffect * pulseEffect * brightness
    );
  }

  createAsteroidGeometry(size, seed = 12345) {
    // Seeded random function for deterministic asteroid shapes
    let currentSeed = seed;
    const seededRandom = () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };

    // Create irregular, roundish asteroid-like geometry with surface detail
    const vertices = [];
    const indices = [];
    const vertexCount = 24; // Even more vertices for smoother, more detailed shape
    
    // Generate irregular vertices in a more circular pattern with surface bumps
    for (let i = 0; i < vertexCount; i++) {
      const angle = (i / vertexCount) * Math.PI * 2;
      
      // Create some larger variations for crater-like indentations
      let radiusVariation = 0.85 + seededRandom() * 0.3; // Base variation
      
      // Add some larger crater-like variations
      if (seededRandom() > 0.7) {
        radiusVariation *= 0.7; // Create deeper indentations
      }
      
      const radius = size * radiusVariation;
      
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      // More varied depth for realistic rocky surface
      const z = (seededRandom() - 0.5) * size * 0.35;
      
      vertices.push(x, y, z);
    }
    
    // Add center vertex with slight random offset
    vertices.push(
      (seededRandom() - 0.5) * size * 0.1, 
      (seededRandom() - 0.5) * size * 0.1, 
      (seededRandom() - 0.5) * size * 0.15
    );
    const centerIndex = vertexCount;
    
    // Create triangular faces from center to perimeter
    for (let i = 0; i < vertexCount; i++) {
      const nextIndex = (i + 1) % vertexCount;
      indices.push(centerIndex, i, nextIndex);
    }
    
    // Add more connecting faces for a more solid, realistic rocky appearance
    for (let i = 0; i < vertexCount; i++) {
      const nextIndex = (i + 1) % vertexCount;
      const nextNextIndex = (i + 2) % vertexCount;
      // Add more connecting triangles for surface detail
      if (seededRandom() > 0.5) {
        indices.push(i, nextIndex, nextNextIndex);
      }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geometry.computeVertexNormals();
    
    return geometry;
  }

  createAsteroidMaterial(entity) {
    // Create realistic asteroid material with damage-based darkening
    const craterCount = entity.craterCount || 0;
    const damageRatio = Math.max(0, 1 - (craterCount * 0.1));
    const grayValue = Math.floor(100 * damageRatio + 40); // From lighter to darker gray
    
    // Convert to normalized RGB (0-1 range)
    const normalizedGray = grayValue / 255;
    
    return new THREE.MeshLambertMaterial({
      color: new THREE.Color(normalizedGray, normalizedGray * 0.9, normalizedGray * 0.8), // Slightly brownish tint
      transparent: true,
      opacity: 0.95,
      // Add some roughness simulation
      emissive: new THREE.Color(0x111111), // Very subtle self-illumination for depth
    });
  }

  createMetalGeometry(entity) {
    // Create long thin metallic beam geometry
    const size = entity.size || 40;
    const length = size * 3; // Long metal beam
    const width = size * 0.3; // Thin width
    const height = size * 0.2; // Even thinner height
    
    // Create the main metal beam
    const geometry = new THREE.BoxGeometry(length, width, height);
    
    return geometry;
  }

  createMetalMaterial() {
    // Create metallic material with reflective properties
    return new THREE.MeshPhongMaterial({
      color: 0x666666, // Dark gray metal
      specular: 0xffffff, // White specular highlights
      shininess: 100, // High shininess for metallic look
      transparent: true,
      opacity: 0.9,
    });
  }

  renderPlayButtonWebGL(x, y, size, onClick) {
    // Register button for click handling (convert to screen coordinates)
    const screenX = x + this.canvas.width / 2;
    const screenY = -y + this.canvas.height / 2;

    const button = {
      id: "playButton",
      x: screenX - size / 2,
      y: screenY - size / 2,
      width: size,
      height: size,
      onClick,
      enabled: true,
      isHovered: false,
    };

    // Check hover state
    const input = this.game.input.getInput();
    if (input.mousePosition) {
      button.isHovered = this.isPointInButton(
        input.mousePosition.x,
        input.mousePosition.y,
        button
      );
    }

    this.buttons.set("playButton", button);

    // No background - just like canvas version

    // Create play triangle shape
    const triangleGeometry = new THREE.BufferGeometry();
    const scale = size * 0.3;
    const vertices = new Float32Array([
      x - scale * 0.3,
      y - scale * 0.5,
      1.1, // left top
      x + scale * 0.5,
      y,
      1.1, // right center
      x - scale * 0.3,
      y + scale * 0.5,
      1.1, // left bottom
    ]);

    triangleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(vertices, 3)
    );
    triangleGeometry.setIndex([0, 1, 2]);

    // Animated play button color
    const playColor = button.isHovered ? 0x50ff50 : 0x00ff88;
    const playMaterial = new THREE.MeshBasicMaterial({
      color: playColor,
      transparent: true,
      opacity: button.isHovered ? 1.0 : 0.8,
    });

    const playMesh = new THREE.Mesh(triangleGeometry, playMaterial);
    playMesh.userData = { isDynamic: true, entityType: "ui" };
    this.scene.add(playMesh);

    // No glow effect - just color change like canvas version
  }

  renderEntities(entities) {
    // Keep track of which entities are rendered this frame
    const renderedEntityIds = new Set();
    const entityCounts = {};

    // Define entity type mappings to avoid array creation
    const entityTypeMappings = [
      { entities: entities.particles, poolType: "particles", idPrefix: "particle_" },
      { entities: entities.debris, poolType: "particles", idPrefix: "debris_" },
      { entities: entities.asteroids, poolType: "asteroids", idPrefix: "asteroid_" },
      { entities: entities.metals, poolType: "metals", idPrefix: "metal_" },
      { entities: entities.powerups, poolType: "powerups", idPrefix: "powerup_" },
      { entities: entities.bullets, poolType: "bullets", idPrefix: "bullet_" },
      { entities: entities.enemyBullets, poolType: "bullets", idPrefix: "enemyBullet_" },
      { entities: entities.enemyLasers, poolType: "bullets", idPrefix: "enemyLaser_" },
      { entities: entities.missiles, poolType: "bullets", idPrefix: "missile_" },
      { entities: entities.spreadingBullets, poolType: "bullets", idPrefix: "spreadBullet_" },
      { entities: entities.enemies, poolType: "enemies", idPrefix: "enemy_" },
      { entities: entities.miniBosses, poolType: "enemies", idPrefix: "miniboss_" },
      { entities: this.game.explosions, poolType: "explosions", idPrefix: "explosion_" },
    ];

    // Add background stars (optimized: only if playing and not paused)
    if (this.game.background && this.game.background.stars && 
        (this.game.state.state === "PLAYING" || this.game.state.state === "TITLE")) {
      entityTypeMappings.push({
        entities: this.game.background.stars,
        poolType: "stars",
        idPrefix: "star_"
      });
    }

    // Process each entity type directly without creating arrays
    entityTypeMappings.forEach(({ entities: entityArray, poolType, idPrefix }) => {
      if (entityArray && entityArray.length > 0) {
        entityCounts[poolType] = (entityCounts[poolType] || 0) + entityArray.length;
        
        entityArray.forEach((entity, index) => {
          const id = `${idPrefix}${entity.id}`;
          this.renderEntity3D(entity, poolType, id);
          renderedEntityIds.add(id);
        });
      }
    });

    // Add boss if exists
    if (entities.boss) {
      entityCounts.enemies = (entityCounts.enemies || 0) + 1;
      const bossId = `boss_${entities.boss.id}`;
      this.renderEntity3D(entities.boss, "enemies", bossId);
      renderedEntityIds.add(bossId);
    }

    // Add player if not dying (player doesn't have an ID, use hardcoded)
    if (this.game.state.state !== "DYING") {
      entityCounts.player = 1;
      this.renderEntity3D(this.game.player, "player", "player");
      renderedEntityIds.add("player");
    }

    // Debug logging removed for performance - only log on demand

    // Optimized cleanup: batch operations and early exit if no cleanup needed
    if (this.entityMeshMap.size === renderedEntityIds.size) {
      // Quick check: if sizes match, likely no cleanup needed
      return;
    }
    
    const meshesToRemove = [];
    this.entityMeshMap.forEach((mesh, entityId) => {
      if (!renderedEntityIds.has(entityId)) {
        meshesToRemove.push({ mesh, entityId });
      }
    });
    
    if (meshesToRemove.length === 0) return; // Early exit if nothing to clean
    
    // Batch removal operations
    meshesToRemove.forEach(({ mesh, entityId }) => {
      this.scene.remove(mesh);
      
      // Remove from rainbow tracking if applicable
      if (mesh.userData?.isRainbow) {
        this.rainbowObjects.delete(mesh);
      }
      
      // Dispose resources
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }
      this.entityMeshMap.delete(entityId);
    });
  }

  renderEntity3D(entity, poolType, entityId) {
    // Check if this entity already has a dedicated mesh
    let mesh = this.entityMeshMap.get(entityId);
    
    if (!mesh) {
      // Create a new mesh for this entity
      mesh = this.createBasic3DRepresentation(entity, poolType);
      mesh.userData = { isDynamic: true, entityType: poolType, entityId };
      this.scene.add(mesh);
      this.entityMeshMap.set(entityId, mesh);
      
      // Enemy mesh creation debug removed for performance
    }

    // Optimized position/rotation updates with change detection
    if (mesh) {
      const centerX = (entity.x || 0) - this.canvas.width / 2;
      const centerY = -((entity.y || 0) - this.canvas.height / 2);
      
      // Set Z position based on entity type (cached to avoid repeated calculations)
      let zPosition = 0;
      if (poolType === 'enemies') zPosition = 1;
      else if (poolType === 'bullets') zPosition = 2;
      else if (poolType === 'stars') zPosition = -10;
      
      // Only update position if it changed (avoid unnecessary GPU uploads)
      if (mesh.position.x !== centerX || mesh.position.y !== centerY || mesh.position.z !== zPosition) {
        mesh.position.set(centerX, centerY, zPosition);
      }

      // Only update rotation if entity has angle and it changed
      if (entity.angle !== undefined) {
        let targetRotation = -entity.angle; // Flip Y coordinate system
        
        // Add coordinate system conversion offset
        if (poolType === 'bullets' && mesh.userData.bulletIdentity) {
          // For bullets, use the stored coordinate system offset
          targetRotation = mesh.userData.bulletIdentity.rotation + (-entity.angle);
          
          // Debug logging for bullets
          if (entity.isPlayerBullet && Math.random() < 0.01) { // Log 1% of player bullets
            console.log(`[DEBUG] Player Bullet Rotation:`, {
              entityAngle: entity.angle,
              negatedAngle: -entity.angle,
              baseRotation: mesh.userData.bulletIdentity.rotation,
              targetRotation: targetRotation,
              currentRotation: mesh.rotation.z
            });
          }
        } else if (mesh.userData.coordinateSystemOffset !== undefined) {
          // For other entities (enemies, asteroids, etc.), add the offset
          targetRotation = mesh.userData.coordinateSystemOffset + (-entity.angle);
        }
        
        // Only update if rotation changed
        if (Math.abs(mesh.rotation.z - targetRotation) > 0.001) {
          mesh.rotation.z = targetRotation;
        }
      }

      // Optimized material updates (only when necessary)
      if (entity.opacity !== undefined && mesh.material) {
        if (Math.abs(mesh.material.opacity - entity.opacity) > 0.001) {
          if (mesh.isGroup) {
            mesh.children.forEach(child => {
              if (child.material) child.material.opacity = entity.opacity;
            });
          } else {
            mesh.material.opacity = entity.opacity;
          }
        }
      }
      
      // Special handling for stars (opacity calculations) - skip if minimal change
      if (poolType === 'stars' && mesh.material && (this.frameCount % 3 === 0)) { // Only update every 3rd frame
        const opacity = this.calculateStarOpacity(entity, false);
        if (Math.abs(mesh.material.opacity - opacity) > 0.01) { // Less sensitive threshold
          mesh.material.opacity = opacity;
        }
      }
    }
    
    return entityId;
  }

  createBasic3DRepresentation(entity, entityType) {
    let geometry, material, enemyConfig, shape, mesh;

    // Create appropriate geometry based on entity type
    switch (entityType) {
      case "player":
        const playerGroup = new THREE.Group();

        // Arrow-like ship body
        const shipShape = new THREE.Shape();
        shipShape.moveTo(0, -15);
        shipShape.lineTo(10, 10);
        shipShape.lineTo(0, 0);
        shipShape.lineTo(-10, 10);
        shipShape.closePath();
        const shipGeometry = new THREE.ShapeGeometry(shipShape);
        const shipMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
        const shipMesh = new THREE.Mesh(shipGeometry, shipMaterial);
        shipMesh.rotation.z = Math.PI / 2; // Rotate to face up (towards cursor)
        playerGroup.add(shipMesh);

        // Glowing rainbow ball for hitbox
        const hitboxGeometry = new THREE.SphereGeometry(
          entity.hitbox || 4,
          16,
          12
        );
        const hitboxMaterial = this.rainbowGlowMaterial.clone();
        hitboxMaterial.uniforms.time.value = this.time;
        const hitboxMesh = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
        hitboxMesh.userData = { isRainbow: true }; // For animation updates
        this.rainbowObjects.add(hitboxMesh); // Track for efficient updates
        playerGroup.add(hitboxMesh);

        return playerGroup;

      case "bullets":
        const bulletConfig = entity.config || {};
        const bulletType = bulletConfig.type || "normal";
        
        // Determine bullet's initial properties that NEVER change
        const initialBulletColor = bulletConfig.color || entity.color || "#ffffff";
        const initialIsPlayerBullet = entity.source === 'player' || 
                                    (initialBulletColor && (initialBulletColor.includes('#44ff44') || initialBulletColor.includes('#00ccaa')));
        
        // Create material with bullet's initial color
        const bulletMaterial = new THREE.MeshBasicMaterial({
          color: new THREE.Color(initialBulletColor),
          transparent: true,
        });
        
        switch (bulletType) {
          case "player":
            const arrowShape = new THREE.Shape();
            const arrowSize = entity.size || 10;
            // Arrow pointing RIGHT instead of UP
            arrowShape.moveTo(arrowSize, 0);  // tip points right
            arrowShape.lineTo(-arrowSize * 0.5, arrowSize * 0.5);  // bottom left
            arrowShape.lineTo(-arrowSize * 0.5, -arrowSize * 0.5); // top left
            arrowShape.closePath();
            geometry = new THREE.ShapeGeometry(arrowShape);
            mesh = new THREE.Mesh(geometry, bulletMaterial);
            mesh.rotation.z = 0; // No base rotation - handle in update logic
            // Store bullet's initial identity in userData
            mesh.userData.bulletIdentity = {
              color: initialBulletColor,
              isPlayerBullet: initialIsPlayerBullet,
              rotation: Math.PI // Test with 180° rotation to see if ANY rotation works
            };
            
            // Debug log for bullet creation
            console.log(`[DEBUG] Created player bullet with right-pointing geometry, base rotation: ${Math.PI}`);
            return mesh;
          case "spreading":
            geometry = new THREE.ConeGeometry(
              entity.size || 5,
              (entity.size || 5) * 2,
              4
            );
            mesh = new THREE.Mesh(geometry, bulletMaterial);
            mesh.rotation.z = 0; // No base rotation - handle in update logic
            mesh.userData.bulletIdentity = {
              color: initialBulletColor,
              isPlayerBullet: initialIsPlayerBullet,
              rotation: -Math.PI / 2 // Cone points up, needs -90° to point right
            };
            return mesh;
          case "circular":
            geometry = new THREE.SphereGeometry(entity.size || 3, 8, 6);
            mesh = new THREE.Mesh(geometry, bulletMaterial);
            mesh.rotation.z = 0; // No rotation needed for spheres
            mesh.userData.bulletIdentity = {
              color: initialBulletColor,
              isPlayerBullet: initialIsPlayerBullet,
              rotation: 0 // Spheres don't need rotation
            };
            return mesh;
          case "normal":
          default:
            const rectShape = new THREE.Shape();
            const w = (entity.size || 6) * 0.5;
            const h = (entity.size || 6) * 1.5;
            rectShape.moveTo(-w, -h / 2);
            rectShape.lineTo(w, -h / 2);
            rectShape.lineTo(w, h / 2 - w);
            rectShape.quadraticCurveTo(w, h / 2, 0, h / 2);
            rectShape.quadraticCurveTo(-w, h / 2, -w, h / 2 - w);
            rectShape.closePath();
            geometry = new THREE.ShapeGeometry(rectShape);
            mesh = new THREE.Mesh(geometry, bulletMaterial);
            mesh.rotation.z = 0; // No base rotation - handle in update logic
            mesh.userData.bulletIdentity = {
              color: initialBulletColor,
              isPlayerBullet: initialIsPlayerBullet,
              rotation: Math.PI / 2 // Rounded end points down, needs +90° to point right
            };
            return mesh;
        }
        break; // Important: prevent fall-through to enemies case
        
      case "enemies":
      case "miniboss":
      case "boss":
        enemyConfig = entity.config || {};
        shape = enemyConfig.shape || "triangle";
        
        // Create material first for all enemy types
        const enemyColorString = enemyConfig.color || "#ff4444";
        // Convert string hex color to number hex (e.g., "#ff4444" -> 0xff4444)
        const enemyColorHex = parseInt(enemyColorString.replace('#', ''), 16);
        material = new THREE.MeshLambertMaterial({
          color: new THREE.Color(enemyColorHex)
        });
        
        switch (shape) {
          case "two-circles":
            const twoCirclesGroup = new THREE.Group();
            const circleGeom = new THREE.CircleGeometry(entity.size * 0.6, 20);
            const topCircle = new THREE.Mesh(circleGeom, material.clone());
            topCircle.position.y = entity.size * 0.5;
            const bottomCircle = new THREE.Mesh(circleGeom, material.clone());
            bottomCircle.position.y = -entity.size * 0.5;
            twoCirclesGroup.add(topCircle, bottomCircle);
            // No base rotation - handle coordinate system in update logic
            twoCirclesGroup.rotation.z = 0;
            // Store coordinate system conversion info
            twoCirclesGroup.userData.coordinateSystemOffset = -Math.PI / 2;
            // Ensure group is visible
            twoCirclesGroup.visible = true;
            // Set normal scale
            twoCirclesGroup.scale.set(1, 1, 1);
            return twoCirclesGroup;
          case "ring":
            geometry = new THREE.RingGeometry(
              entity.size * 0.7,
              entity.size,
              32
            );
            break;
          case "sharp-triangle":
            const sharpTriangleShape = new THREE.Shape();
            sharpTriangleShape.moveTo(0, -entity.size);
            sharpTriangleShape.lineTo(entity.size * 0.5, entity.size);
            sharpTriangleShape.lineTo(-entity.size * 0.5, entity.size);
            sharpTriangleShape.closePath();
            geometry = new THREE.ShapeGeometry(sharpTriangleShape);
            break;
          case "rounded-square":
            const roundedRectShape = new THREE.Shape();
            const x = -entity.size / 2,
              y = -entity.size / 2,
              width = entity.size,
              height = entity.size,
              radius = entity.size * 0.2;
            roundedRectShape.moveTo(x, y + radius);
            roundedRectShape.lineTo(x, y + height - radius);
            roundedRectShape.quadraticCurveTo(
              x,
              y + height,
              x + radius,
              y + height
            );
            roundedRectShape.lineTo(x + width - radius, y + height);
            roundedRectShape.quadraticCurveTo(
              x + width,
              y + height,
              x + width - radius,
              y + height
            );
            roundedRectShape.lineTo(x + width, y + radius);
            roundedRectShape.quadraticCurveTo(
              x + width,
              y,
              x + width - radius,
              y
            );
            roundedRectShape.lineTo(x + radius, y);
            roundedRectShape.quadraticCurveTo(x, y, x, y + radius);
            geometry = new THREE.ShapeGeometry(roundedRectShape);
            break;
          case "square":
            geometry = new THREE.BoxGeometry(
              entity.size,
              entity.size,
              entity.size * 0.5
            );
            break;
          case "triangle":
          default:
            // Use ShapeGeometry like the player instead of ConeGeometry
            const triangleShape = new THREE.Shape();
            const size = entity.size || 24;
            triangleShape.moveTo(0, -size);
            triangleShape.lineTo(size * 0.5, size * 0.5);
            triangleShape.lineTo(-size * 0.5, size * 0.5);
            triangleShape.closePath();
            geometry = new THREE.ShapeGeometry(triangleShape);
            break;
        }
        mesh = new THREE.Mesh(geometry, material);
        // No base rotation - handle coordinate system in update logic
        mesh.rotation.z = 0;
        // Store coordinate system conversion info
        mesh.userData.coordinateSystemOffset = -Math.PI / 2; // Triangle points up, needs -90° to point right
        // Ensure mesh is visible
        mesh.visible = true;
        // Set normal scale
        mesh.scale.set(1, 1, 1);
        return mesh;
      case "asteroid":
      case "asteroids":
        // Create stable asteroid geometry using entity properties as seed
        const asteroidSeed = this.getAsteroidSeed(entity);
        geometry = this.createAsteroidGeometry(entity.size || 15, asteroidSeed);
        material = this.createAsteroidMaterial(entity);
        mesh = new THREE.Mesh(geometry, material);
        // No base rotation - handle coordinate system in update logic
        mesh.rotation.z = 0;
        // Store coordinate system conversion info for asteroids/metals/powerups
        mesh.userData.coordinateSystemOffset = -Math.PI / 2;
        return mesh;

      case "metal":
      case "metals":
        // Create long thin metallic geometry
        geometry = this.createMetalGeometry(entity);
        material = this.createMetalMaterial();
        mesh = new THREE.Mesh(geometry, material);
        // No base rotation - handle coordinate system in update logic
        mesh.rotation.z = 0;
        // Store coordinate system conversion info for asteroids/metals/powerups
        mesh.userData.coordinateSystemOffset = -Math.PI / 2;
        return mesh;

      case "powerup":
        geometry = new THREE.BoxGeometry(
          entity.size || 12,
          entity.size || 12,
          entity.size * 0.5 || 6
        );
        material = this.materials.get("powerup");
        mesh = new THREE.Mesh(geometry, material);
        // No base rotation - handle coordinate system in update logic
        mesh.rotation.z = 0;
        // Store coordinate system conversion info for asteroids/metals/powerups
        mesh.userData.coordinateSystemOffset = -Math.PI / 2;
        return mesh;
        
      case "stars":
        // Create star geometry
        const size = entity.size * (this.game.background.starSize || 1);
        switch (entity.shape) {
          case "diamond":
            geometry = this.createDiamondStarGeometry(size);
            break;
          case "star4":
            geometry = this.createStarGeometry(size, 4);
            break;
          case "star8":
            geometry = this.createStarGeometry(size, 8);
            break;
          case "plus":
            geometry = this.createPlusGeometry(size);
            break;
          case "cross":
            geometry = this.createCrossGeometry(size);
            break;
          default: // 'point'
            geometry = new THREE.PlaneGeometry(size * 2, size * 2);
        }
        
        // Parse color carefully to avoid alpha component warnings
        let colorValue = entity.color || "#ffffff";
        if (typeof colorValue === "string" && colorValue.startsWith("rgba")) {
          const rgbMatch = colorValue.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (rgbMatch) {
            colorValue = `rgb(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]})`;
          }
        }
        
        material = new THREE.MeshBasicMaterial({
          color: new THREE.Color(colorValue),
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        
        mesh = new THREE.Mesh(geometry, material);
        return mesh;
        
      case "explosions":
        // Create explosion particle system using multiple small spheres
        const explosionGroup = new THREE.Group();
        const explosionSize = entity.size || 20;
        const particleCount = 8; // Number of explosion particles
        
        for (let i = 0; i < particleCount; i++) {
          const particleGeometry = new THREE.SphereGeometry(explosionSize * 0.2, 6, 4);
          const particleMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(0.1 + Math.random() * 0.2, 1.0, 0.7), // Orange to yellow
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });
          
          const particle = new THREE.Mesh(particleGeometry, particleMaterial);
          
          // Random position within explosion radius
          const angle = (i / particleCount) * Math.PI * 2;
          const radius = explosionSize * (0.3 + Math.random() * 0.4);
          particle.position.set(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            (Math.random() - 0.5) * explosionSize * 0.2
          );
          
          explosionGroup.add(particle);
        }
        
        return explosionGroup;
    }

    // Create mesh and return it (don't add to scene here)
    mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  applyTimeSlowEffect() {
    // Could add post-processing effects here
    // For now, just modify material opacity
    this.materials.forEach((material) => {
      if (material.transparent) {
        material.opacity = 0.6;
      }
    });
  }

  applySceneTransition() {
    // Could add fade effects or other transitions
    // For now, use the UI overlay for fading
  }

  updateRainbowEffects() {
    // Early exit if no rainbow objects or skip frames for performance
    if (this.rainbowObjects.size === 0 || this.frameCount % 2 !== 0) {
      return; // Only update every 2nd frame
    }

    // Update uniforms for tracked rainbow objects only (no scene traversal!)
    const currentAnimationMode = Math.floor(this.time / 4.0) % 5; // Change mode every 4 seconds

    this.rainbowObjects.forEach((mesh) => {
      if (mesh.material && mesh.material.uniforms) {
        const uniforms = mesh.material.uniforms;
        if (uniforms.time) {
          uniforms.time.value = this.time;
        }
        if (uniforms.animationMode) {
          uniforms.animationMode.value = currentAnimationMode;
        }
        if (uniforms.letterIndex && mesh.userData.letterIndex !== undefined) {
          uniforms.letterIndex.value = mesh.userData.letterIndex;
        }
      }
    });
  }

  updateCursorTrail() {
    if (!this.scene) {
      return;
    }
    const input = this.game.input.getInput();
    if (!this.game.isMobile && input.mousePosition) {
      const { x: mouseX, y: mouseY } = input.mousePosition;

      // Convert screen coordinates to centered coordinate system
      const centerX = mouseX - this.canvas.width / 2;
      const centerY = -(mouseY - this.canvas.height / 2);

      // Only add trail points if mouse has moved significantly
      const dx = centerX - this.lastCursorPosition.x;
      const dy = centerY - this.lastCursorPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 2) {
        // Lower threshold for denser trails
        // Add multiple trail points for more prominence
        for (let i = 0; i < 3; i++) {
          this.cursorTrails.push({
            x: centerX + (Math.random() - 0.5) * 8, // Small random spread
            y: centerY + (Math.random() - 0.5) * 8,
            age: 0,
            maxAge: 1.5, // Much shorter lifetime for twice as fast fading
            size: 25 + Math.random() * 20, // Much larger size variation (25-45 pixels)
          });
        }

        this.lastCursorPosition = { x: centerX, y: centerY };
      }
    }

    // Update existing trail points
    for (let i = this.cursorTrails.length - 1; i >= 0; i--) {
      const trail = this.cursorTrails[i];
      trail.age += 0.016; // Approximate 16ms per frame

      // Remove old trails
      if (trail.age >= trail.maxAge) {
        this.cursorTrails.splice(i, 1);
      }
    }

    // Update trail geometry
    this.updateTrailGeometry();
  }

  updateTrailGeometry() {
    // Safety check to ensure scene is initialized
    if (!this.scene) {
      return;
    }

    // Remove existing trail mesh
    const trailsToRemove = [];
    this.scene.traverse((child) => {
      if (child.userData && child.userData.entityType === "cursorTrail") {
        trailsToRemove.push(child);
      }
    });
    trailsToRemove.forEach((trail) => this.scene.remove(trail));

    if (this.cursorTrails.length === 0) return;

    // Create new geometry for trail points
    const positions = new Float32Array(this.cursorTrails.length * 3);
    const ages = new Float32Array(this.cursorTrails.length);
    const sizes = new Float32Array(this.cursorTrails.length);

    this.cursorTrails.forEach((trail, i) => {
      positions[i * 3] = trail.x;
      positions[i * 3 + 1] = trail.y;
      positions[i * 3 + 2] = 0.5; // Slightly behind other UI elements

      ages[i] = trail.age / trail.maxAge; // Normalized age (0-1)
      sizes[i] = trail.size;
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("age", new THREE.BufferAttribute(ages, 1));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const mesh = new THREE.Points(geometry, this.cursorTrailMaterial);
    mesh.userData = { isDynamic: true, entityType: "cursorTrail" };
    this.scene.add(mesh);
  }

  renderUI() {
    const state = this.game.state;

    // Clear existing UI elements before adding new ones
    this.clearUIElements();

    // Render UI based on game state
    switch (state.state) {
      case "TITLE":
      case "PAUSED":
        this.renderTitleScreenUIWebGL();
        break;
      case "GAME_OVER":
        this.renderGameOverScreenUIWebGL();
        break;
      case "PLAYING":
      case "DYING":
        this.renderGameplayUIWebGL();
        break;
    }

    // Render modals
    if (this.helpModalVisible) {
      this.renderHelpModalUIWebGL();
    }

    // Render crosshair
    this.renderCrosshairUIWebGL();

    // Render text particles using WebGL
    this.renderTextParticlesWebGL();

    // Apply scene transition overlay
    if (this.game.opacity < 1) {
      this.renderFadeOverlayWebGL(1 - this.game.opacity);
    }
  }

  /**
   * Clear UI elements from the scene
   */
  clearUIElements() {
    // Safety check to ensure scene is initialized
    if (!this.scene) {
      return;
    }

    const uiObjectsToRemove = [];
    this.scene.traverse((child) => {
      if (child.userData && child.userData.entityType === "ui") {
        uiObjectsToRemove.push(child);
      }
    });

    uiObjectsToRemove.forEach((obj) => this.scene.remove(obj));
  }

  /**
   * Create a simple quad mesh for UI elements
   */
  createUIQuad(x, y, width, height, color = 0xffffff, opacity = 1.0) {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 1); // Z=1 to render in front of game objects
    mesh.userData = { isDynamic: true, entityType: "ui" };

    return mesh;
  }

  /**
   * Create text mesh for UI
   */
  createTextMesh(text, x, y, font = "24px Arial", color = "#ffffff") {
    const { texture, width, height } = this.createTextTexture(
      text,
      font,
      color
    );

    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 1); // Z=1 to render in front of game objects
    mesh.userData = { isDynamic: true, entityType: "ui" };

    return mesh;
  }

  /**
   * Create rainbow glowing text mesh for special effects
   */
  createRainbowTextMesh(text, x, y, font = "48px Arial") {
    const { texture, width, height } = this.createTextTexture(
      text,
      font,
      "#ffffff"
    );

    const geometry = new THREE.PlaneGeometry(width, height);

    // Clone the rainbow material and set the texture
    const material = this.rainbowGlowMaterial.clone();
    material.uniforms.textTexture.value = texture;
    material.uniforms.time.value = this.time;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 1); // Z=1 to render in front of game objects
    mesh.userData = { isDynamic: true, entityType: "ui", isRainbow: true };

    return mesh;
  }

  /**
   * Create individual letter mesh with rainbow effects
   */
  createRainbowLetterMesh(letter, x, y, letterIndex, font = "48px Arial") {
    // Create a dedicated canvas for each letter to avoid reuse issues
    const letterCanvas = document.createElement("canvas");
    const letterCtx = letterCanvas.getContext("2d");

    // Set font and measure text
    letterCtx.font = font;
    const metrics = letterCtx.measureText(letter);
    const width = Math.ceil(metrics.width) + 20; // Add padding
    const height = 60; // Standard height for letters

    letterCanvas.width = width;
    letterCanvas.height = height;

    // Re-set font after canvas resize
    letterCtx.font = font;
    letterCtx.fillStyle = "#ffffff";
    letterCtx.textAlign = "center";
    letterCtx.textBaseline = "middle";

    // Clear and draw letter
    letterCtx.clearRect(0, 0, width, height);
    letterCtx.fillText(letter, width / 2, height / 2);

    // Create Three.js texture from dedicated canvas
    const texture = new THREE.CanvasTexture(letterCanvas);
    texture.needsUpdate = true;

    const geometry = new THREE.PlaneGeometry(width, height);

    // Clone the rainbow material and set uniforms
    const material = this.rainbowGlowMaterial.clone();
    material.uniforms.textTexture.value = texture;
    material.uniforms.time.value = this.time;
    material.uniforms.letterIndex.value = letterIndex;
    material.uniforms.animationMode.value = Math.floor(this.time / 4.0) % 5; // Change mode every 4 seconds

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 1);
    mesh.userData = {
      isDynamic: true,
      entityType: "ui",
      isRainbow: true,
      letterIndex: letterIndex,
    };

    return mesh;
  }

  /**
   * Render RAINBLITZ as individual letters with advanced animations
   */
  renderRainblitzTitle(centerX, centerY) {
    const letters = "RAINBLITZ".split("");
    const font = "48px Arial";
    const letterSpacing = 45; // Spacing between letters

    // Calculate total width to center the text
    const totalWidth = (letters.length - 1) * letterSpacing;
    const startX = centerX - totalWidth / 2;

    letters.forEach((letter, index) => {
      const letterX = startX + index * letterSpacing;
      const letterMesh = this.createRainbowLetterMesh(
        letter,
        letterX,
        centerY,
        index,
        font
      );
      this.scene.add(letterMesh);
    });
  }

  renderTitleScreenUIWebGL() {
    // Clear button registry for this screen
    this.buttons.clear();

    // Background overlay (centered coordinate system)
    const overlay = this.createUIQuad(
      0, // Center X
      0, // Center Y
      this.canvas.width,
      this.canvas.height,
      0x000000,
      0.5
    );
    this.scene.add(overlay);

    // Title text with individual letter animations (centered coordinate system)
    this.renderRainblitzTitle(
      0, // Center X
      100 // Above center Y (now using screen logic: positive Y goes down)
    );

    // Timer for paused state
    if (this.game.state.state === "PAUSED") {
      const gameTime = this.game.state.time || 0;
      const minutes = Math.floor(gameTime / 60);
      const seconds = (gameTime % 60).toFixed(1);
      const timeText = `${minutes}:${seconds.padStart(4, "0")}`;

      const timerMesh = this.createTextMesh(
        timeText,
        0, // Center X
        50, // Below title (now using screen logic: positive Y goes down)
        "24px Arial",
        "#ffffff"
      );
      this.scene.add(timerMesh);
    }

    // Render Play button
    const playButtonSize = 80;
    const playButtonY = this.game.state.state === "PAUSED" ? 150 : 50;
    this.renderPlayButtonWebGL(
      0, // Center X
      playButtonY,
      playButtonSize,
      () => this.game.startGame()
    );
  }

  renderGameOverScreenUIWebGL() {
    // Background overlay (centered coordinate system)
    const overlay = this.createUIQuad(
      0, // Center X
      0, // Center Y
      this.canvas.width,
      this.canvas.height,
      0x000000,
      0.7
    );
    this.scene.add(overlay);

    // Game Over text (centered coordinate system)
    const gameOverMesh = this.createTextMesh(
      "GAME OVER",
      0, // Center X
      50, // Above center Y (now using screen logic: positive Y goes down)
      "48px Arial",
      "#ffffff"
    );
    this.scene.add(gameOverMesh);

    // Score text (centered coordinate system)
    const score = this.game.state.score || 0;
    const scoreMesh = this.createTextMesh(
      `Score: ${score.toLocaleString()}`,
      0, // Center X
      0, // Center Y
      "24px Arial",
      "#ffffff"
    );
    this.scene.add(scoreMesh);
  }

  renderGameplayUIWebGL() {
    // Clear button registry for this screen
    this.buttons.clear();

    // Render progress view (top left)
    this.renderProgressViewWebGL();

    // TODO: Add actions view (right side) when needed
    // TODO: Add pause button (top right) when needed
  }

  renderProgressViewWebGL() {
    const padding = 20;
    const level = this.game.state.level || 1;
    const phase = this.game.state.phase || 1;
    const score = this.game.state.score || 0;
    const timer = this.game.state.time || 0;

    // Convert to screen coordinates (top-left origin)
    const leftEdge = -this.canvas.width / 2;
    const topEdge = -this.canvas.height / 2;

    // Level/Phase text (top left)
    const levelMesh = this.createTextMesh(
      `LVL ${level}-${phase}`,
      leftEdge + padding,
      topEdge + padding + 20,
      "18px Arial",
      "#ffffff"
    );
    this.scene.add(levelMesh);

    // Score text (below level)
    const scoreMesh = this.createTextMesh(
      `SCORE: ${score.toLocaleString()}`,
      leftEdge + padding,
      topEdge + padding + 45,
      "18px Arial",
      "#ffffff"
    );
    this.scene.add(scoreMesh);

    // Timer text (below score)
    const minutes = Math.floor(timer / 60);
    const seconds = (timer % 60).toFixed(1);
    const timerMesh = this.createTextMesh(
      `⏱ ${minutes}:${seconds.padStart(4, "0")}`,
      leftEdge + padding,
      topEdge + padding + 70,
      "18px Arial",
      "#ffffff"
    );
    this.scene.add(timerMesh);
  }

  renderHelpModalUIWebGL() {
    // Background overlay (centered coordinate system)
    const overlay = this.createUIQuad(
      0, // Center X
      0, // Center Y
      this.canvas.width,
      this.canvas.height,
      0x000000,
      0.8
    );
    this.scene.add(overlay);

    // Help text (centered coordinate system)
    const helpMesh = this.createTextMesh(
      "HELP",
      0, // Center X
      0, // Center Y
      "32px Arial",
      "#ffffff"
    );
    this.scene.add(helpMesh);
  }

  renderCrosshairUIWebGL() {
    const input = this.game.input.getInput();
    if (input.mousePosition) {
      const { x: mouseX, y: mouseY } = input.mousePosition;
      const size = 15;

      // Convert screen coordinates to centered coordinate system
      // Flip Y coordinate since WebGL Y increases upward, screen Y increases downward
      const centerX = mouseX - this.canvas.width / 2;
      const centerY = -(mouseY - this.canvas.height / 2);

      // Create crosshair lines using thin rectangles
      const hLine = this.createUIQuad(
        centerX,
        centerY,
        size * 2,
        2,
        0xffffff,
        1.0
      );
      const vLine = this.createUIQuad(
        centerX,
        centerY,
        2,
        size * 2,
        0xffffff,
        1.0
      );

      this.scene.add(hLine);
      this.scene.add(vLine);
    }
  }

  renderTextParticlesWebGL() {
    // Render text particles using WebGL text meshes
    this.game.textParticles.forEach((particle) => {
      if (
        particle.text &&
        particle.x !== undefined &&
        particle.y !== undefined
      ) {
        // Convert screen coordinates to centered coordinate system
        // Flip Y coordinate since WebGL Y increases upward, screen Y increases downward
        const centerX = particle.x - this.canvas.width / 2;
        const centerY = -(particle.y - this.canvas.height / 2);

        const textMesh = this.createTextMesh(
          particle.text,
          centerX,
          centerY,
          "16px Arial",
          particle.color || "#ffffff"
        );

        // Apply opacity if available
        if (particle.opacity !== undefined) {
          textMesh.material.opacity = particle.opacity;
        }

        this.scene.add(textMesh);
      }
    });
  }

  renderFadeOverlayWebGL(opacity) {
    const overlay = this.createUIQuad(
      0, // Center X
      0, // Center Y
      this.canvas.width,
      this.canvas.height,
      0x000000,
      opacity
    );
    this.scene.add(overlay);
  }

  resize(width, height) {
    // Update Three.js renderer
    this.renderer.setSize(width, height);

    // Update camera for screen coordinates (centered coordinate system)
    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2; // Y flipped for screen coordinates
    this.camera.bottom = -height / 2; // Y flipped for screen coordinates
    this.camera.updateProjectionMatrix();

    // Keep camera at origin
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);

    // Update text canvas for text rendering
    if (this.textCanvas) {
      this.textCanvas.width = Math.min(width, 512); // Reasonable max size for text canvas
      this.textCanvas.height = Math.min(height, 512);
    }
  }

  dispose() {
    
    // Clean up all meshes in the scene first
    if (this.scene) {
      const objectsToRemove = [];
      this.scene.traverse((child) => {
        if (child.isMesh || child.isGroup) {
          objectsToRemove.push(child);
        }
      });
      
      objectsToRemove.forEach((obj) => {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(mat => mat.dispose());
          } else {
            obj.material.dispose();
          }
        }
        this.scene.remove(obj);
      });
    }

    // Clean up mesh pools
    Object.values(this.meshPool).forEach(pool => {
      pool.forEach(mesh => {
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(mat => mat.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
    });
    this.meshPool = {
      bullets: [], particles: [], enemies: [], asteroids: [], 
      metals: [], powerups: [], explosions: [], stars: [], player: []
    };

    // Clear object tracking
    this.availableObjects.clear();
    this.activeObjects.clear();
    this.entityMeshMap.clear();
    this.rainbowObjects.clear();

    // Clean up Three.js resources
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }

    // Clean up geometries and materials
    this.materials.forEach((material) => material.dispose());
    this.materials.clear();

    // Clean up special materials
    if (this.rainbowGlowMaterial) {
      this.rainbowGlowMaterial.dispose();
    }
    if (this.cursorTrailMaterial) {
      this.cursorTrailMaterial.dispose();
    }
    this.cursorTrails = [];

    // Clear text rendering resources
    if (this.textCanvas) {
      this.textCanvas = null;
      this.textCtx = null;
    }

    // Clear references
    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }
}

