import { BaseRenderer } from './base-renderer.js';
import { RENDERER_TYPES } from '../constants.js';

/**
 * WebGL Three.js Renderer implementation
 * Handles all 3D WebGL-based rendering for the game
 */
export class WebGLRenderer extends BaseRenderer {
  constructor(game, canvas) {
    super(game, canvas);
    this.type = RENDERER_TYPES.WEBGL_3D;
    
    // Three.js specific properties
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.materials = new Map();
    this.meshes = new Map();
    
    // Text rendering utilities for WebGL
    this.textCanvas = document.createElement('canvas');
    this.textCtx = this.textCanvas.getContext('2d');
    
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
      powerups: [],
      explosions: [],
      stars: []
    };
    this.availableObjects = new Map(); // Track which objects are available for reuse
    this.activeObjects = new Set(); // Track currently active objects
  }
  
  initialize() {
    // Check if Three.js is available
    if (typeof THREE === 'undefined') {
      console.warn('Three.js not available, cannot initialize WebGL renderer');
      return false;
    }
    
    try {
      // Initialize Three.js components
      this.initializeThreeJS();
      this.initializeScene();
      this.initializeMaterials();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize WebGL renderer:', error);
      return false;
    }
  }
  
  initializeThreeJS() {
    // Create Three.js renderer
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: this.canvas,
      antialias: true,
      alpha: true
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
      -this.canvas.width / 2, this.canvas.width / 2,    // left, right (centered)
      this.canvas.height / 2, -this.canvas.height / 2,  // top, bottom (Y flipped)
      0.1, 1000                                          // near, far
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
    this.materials.set('player', new THREE.MeshLambertMaterial({ 
      color: 0x00ff88,
      transparent: true 
    }));
    
    this.materials.set('enemy', new THREE.MeshLambertMaterial({ 
      color: 0xff4444,
      transparent: true 
    }));
    
    this.materials.set('bullet', new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      transparent: true 
    }));
    
    this.materials.set('powerup', new THREE.MeshLambertMaterial({ 
      color: 0xffff00,
      transparent: true,
      emissive: 0x333300
    }));
    
    this.materials.set('asteroid', new THREE.MeshLambertMaterial({ 
      color: 0x888888,
      transparent: true 
    }));
    
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
        textTexture: { value: null }
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      side: THREE.DoubleSide
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
      depthWrite: false
    });
  }
  
  /**
   * Create a texture from text for WebGL rendering
   */
  createTextTexture(text, font = '24px Arial', fillStyle = '#ffffff') {
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
    this.textCtx.textAlign = 'center';
    this.textCtx.textBaseline = 'middle';
    
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
      materials: this.materials
    };
  }
  
  supportsFeature(feature) {
    const supportedFeatures = [
      '3d-rendering',
      'hardware-acceleration',
      'shaders',
      'lighting',
      'shadows',
      'particle-systems'
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
      const isHovered = this.isPointInButton(this.mousePosition.x, this.mousePosition.y, button);
      button.isHovered = isHovered;
      if (isHovered) {
        this.hoveredButton = button;
      }
    }
  }
  
  render() {
    const entities = this.game.entities;
    const state = this.game.state;
    this.animationFrame++;
    this.incrementFrame();
    
    // Update animation time for effects
    this.time += 0.016; // Approximate 16ms per frame for 60fps
    
    // Instead of clearing scene, manage object visibility and reuse
    this.updateDynamicObjects();
    
    // Render background (could be a skybox or particle system)
    this.renderBackground();
    
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
    } else {
      // Clear trails when not on title screen
      this.cursorTrails = [];
    }
    
    // Render UI elements in WebGL
    this.renderUI();
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }
  
  updateDynamicObjects() {
    // Safety check to ensure scene is initialized
    if (!this.scene || !this.activeObjects) {
      return;
    }
    
    // Instead of removing objects, mark all active objects as unused for this frame
    this.activeObjects.forEach(mesh => {
      if (mesh.userData && mesh.userData.isDynamic) {
        // Hide objects that weren't updated this frame
        mesh.visible = false;
        this.availableObjects.set(mesh.userData.entityType + '_' + mesh.userData.id, mesh);
      }
    });
    this.activeObjects.clear();
  }
  
  // Get or create a mesh from the pool
  getMeshFromPool(entityType, id, createFn) {
    const key = entityType + '_' + id;
    let mesh = this.availableObjects.get(key);
    
    if (mesh) {
      // Reuse existing mesh
      mesh.visible = true;
      this.availableObjects.delete(key);
      this.activeObjects.add(mesh);
      return mesh;
    }
    
    // Look for any available mesh of this type
    const availableMesh = this.meshPool[entityType].find(m => !this.activeObjects.has(m));
    if (availableMesh) {
      availableMesh.visible = true;
      availableMesh.userData.id = id;
      this.activeObjects.add(availableMesh);
      return availableMesh;
    }
    
    // Create new mesh if pool is empty
    mesh = createFn();
    mesh.userData = { isDynamic: true, entityType, id };
    this.meshPool[entityType].push(mesh);
    this.scene.add(mesh);
    this.activeObjects.add(mesh);
    return mesh;
  }
  
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
        if (child.userData.entityType !== 'ui' || child.userData.entityType === 'cursorTrail') {
          objectsToRemove.push(child);
        }
      }
    });
    
    objectsToRemove.forEach(obj => this.scene.remove(obj));
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
      if ((this.game.state.state === "TITLE" || this.game.state.state === "PAUSED") && 
          this.game.background.shootingStars) {
        this.game.background.shootingStars.forEach((star, index) => {
          this.renderStar3D(star, true, index + 10000); // Offset ID to avoid conflicts
        });
      }
    }
  }
  
  renderStar3D(star, isShootingStar = false, starId) {
    // Use object pooling for stars
    const mesh = this.getMeshFromPool('stars', starId, () => {
      // Create geometry and material only once
      const size = star.size * (this.game.background.starSize || 1);
      let geometry;
      
      switch (star.shape) {
        case 'diamond':
          geometry = this.createDiamondStarGeometry(size);
          break;
        case 'star4':
          geometry = this.createStarGeometry(size, 4);
          break;
        case 'star8':
          geometry = this.createStarGeometry(size, 8);
          break;
        case 'plus':
          geometry = this.createPlusGeometry(size);
          break;
        case 'cross':
          geometry = this.createCrossGeometry(size);
          break;
        default: // 'point'
          geometry = new THREE.PlaneGeometry(size * 2, size * 2);
      }
      
      // Parse color carefully to avoid alpha component warnings
      let colorValue = star.color || '#ffffff';
      if (typeof colorValue === 'string' && colorValue.startsWith('rgba')) {
        const rgbMatch = colorValue.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
          colorValue = `rgb(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]})`;
        }
      }
      
      const material = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color(colorValue),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      
      return new THREE.Mesh(geometry, material);
    });
    
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
      0, size, 0,      // top
      -size, 0, 0,     // left
      0, -size, 0,     // bottom
      size, 0, 0,      // right
    ]);
    const indices = [0, 1, 2, 0, 2, 3];
    
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    return geometry;
  }
  
  createStarGeometry(size, points) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    
    // Create star points
    for (let i = 0; i < points * 2; i++) {
      const angle = (i / (points * 2)) * Math.PI * 2;
      const radius = (i % 2 === 0) ? size : size * 0.4; // Alternating outer/inner radius
      vertices.push(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0
      );
    }
    
    // Create triangular faces from center
    vertices.push(0, 0, 0); // Center vertex
    const centerIndex = vertices.length / 3 - 1;
    
    for (let i = 0; i < points * 2; i++) {
      const next = (i + 1) % (points * 2);
      indices.push(centerIndex, i, next);
    }
    
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    return geometry;
  }
  
  createPlusGeometry(size) {
    const geometry = new THREE.BufferGeometry();
    const thickness = size * 0.2;
    const vertices = new Float32Array([
      // Horizontal bar
      -size, -thickness, 0,
      size, -thickness, 0,
      size, thickness, 0,
      -size, thickness, 0,
      // Vertical bar
      -thickness, -size, 0,
      thickness, -size, 0,
      thickness, size, 0,
      -thickness, size, 0,
    ]);
    const indices = [
      0, 1, 2, 0, 2, 3, // horizontal
      4, 5, 6, 4, 6, 7  // vertical
    ];
    
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    return geometry;
  }
  
  createCrossGeometry(size) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    
    // Create X-shaped cross
    const points = [
      [-size, -size], [size, size], [size * 0.2, size * 0.2], [-size * 0.2, -size * 0.2],
      [size, -size], [-size, size], [-size * 0.2, size * 0.2], [size * 0.2, -size * 0.2]
    ];
    
    points.forEach(([x, y]) => vertices.push(x, y, 0));
    
    // Create triangular faces
    indices.push(0, 1, 2, 0, 2, 3); // First diagonal
    indices.push(4, 5, 6, 4, 6, 7); // Second diagonal
    
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    return geometry;
  }
  
  calculateStarOpacity(star, isShootingStar) {
    const baseOpacity = star.opacity || 1;
    const brightness = this.game.background.starBrightness || 1;
    
    if (isShootingStar) {
      return baseOpacity * brightness;
    }
    
    // Apply twinkling effect
    const twinkleEffect = star.twinkle ? 
      (0.5 + 0.5 * Math.sin(star.twinkle)) : 1;
    
    // Apply pulsing for title screen
    let pulseEffect = 1;
    if ((this.game.state.state === "TITLE" || this.game.state.state === "PAUSED") && 
        star.pulsePhase !== undefined) {
      pulseEffect = 0.85 + 0.2 * Math.sin(star.pulsePhase);
    }
    
    return Math.min(1.0, baseOpacity * twinkleEffect * pulseEffect * brightness);
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
      isHovered: false
    };
    
    // Check hover state
    const input = this.game.input.getInput();
    if (input.mousePosition) {
      button.isHovered = this.isPointInButton(input.mousePosition.x, input.mousePosition.y, button);
    }
    
    this.buttons.set("playButton", button);
    
    // No background - just like canvas version
    
    // Create play triangle shape
    const triangleGeometry = new THREE.BufferGeometry();
    const scale = size * 0.3;
    const vertices = new Float32Array([
      x - scale * 0.3, y - scale * 0.5, 1.1,  // left top
      x + scale * 0.5, y, 1.1,                // right center
      x - scale * 0.3, y + scale * 0.5, 1.1   // left bottom
    ]);
    
    triangleGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    triangleGeometry.setIndex([0, 1, 2]);
    
    // Animated play button color
    const playColor = button.isHovered ? 0x50ff50 : 0x00ff88;
    const playMaterial = new THREE.MeshBasicMaterial({
      color: playColor,
      transparent: true,
      opacity: button.isHovered ? 1.0 : 0.8
    });
    
    const playMesh = new THREE.Mesh(triangleGeometry, playMaterial);
    playMesh.userData = { isDynamic: true, entityType: 'ui' };
    this.scene.add(playMesh);
    
    // No glow effect - just color change like canvas version
  }
  
  renderEntities(entities) {
    // Render game entities in 3D using object pooling
    entities.particles.forEach((entity, index) => this.renderEntity3D(entity, 'particles', `particle_${index}`));
    entities.debris.forEach((entity, index) => this.renderEntity3D(entity, 'particles', `debris_${index}`));
    entities.asteroids.forEach((entity, index) => this.renderEntity3D(entity, 'enemies', `asteroid_${index}`));
    entities.metals.forEach((entity, index) => this.renderEntity3D(entity, 'enemies', `metal_${index}`));
    entities.powerups.forEach((entity, index) => this.renderEntity3D(entity, 'powerups', `powerup_${index}`));
    entities.bullets.forEach((entity, index) => this.renderEntity3D(entity, 'bullets', `bullet_${index}`));
    entities.enemyBullets.forEach((entity, index) => this.renderEntity3D(entity, 'bullets', `enemyBullet_${index}`));
    entities.enemyLasers.forEach((entity, index) => this.renderEntity3D(entity, 'bullets', `enemyLaser_${index}`));
    entities.missiles.forEach((entity, index) => this.renderEntity3D(entity, 'bullets', `missile_${index}`));
    entities.spreadingBullets.forEach((entity, index) => this.renderEntity3D(entity, 'bullets', `spreadingBullet_${index}`));
    entities.enemies.forEach((entity, index) => this.renderEntity3D(entity, 'enemies', `enemy_${index}`));
    entities.miniBosses.forEach((entity, index) => this.renderEntity3D(entity, 'enemies', `miniboss_${index}`));
    
    if (entities.boss) {
      this.renderEntity3D(entities.boss, 'enemies', 'boss');
    }
    
    // Render player
    if (this.game.state.state !== "DYING") {
      this.renderEntity3D(this.game.player, 'enemies', 'player');
    }
    
    // Render explosions
    this.game.explosions.forEach((entity, index) => this.renderEntity3D(entity, 'explosions', `explosion_${index}`));
    
    // Text particles will be rendered in 2D overlay
  }
  
  renderEntity3D(entity, poolType, entityId) {
    // Check if entity has WebGL render method
    if (entity.renderWebGL) {
      entity.renderWebGL(this.scene, this.materials);
      return;
    }
    
    // Use object pooling for entities without custom renderWebGL
    const mesh = this.getMeshFromPool(poolType, entityId, () => {
      return this.createBasic3DRepresentation(entity, poolType);
    });
    
    // Update mesh position and rotation
    if (mesh) {
      mesh.position.set(entity.x || 0, -(entity.y || 0), 0);
      if (entity.angle !== undefined) {
        mesh.rotation.z = -entity.angle;
      }
    }
  }
  
  createBasic3DRepresentation(entity, entityType) {
    let geometry, material;
    
    // Create appropriate geometry based on entity type
    switch (entityType) {
      case 'player':
      case 'enemy':
      case 'miniboss':
      case 'boss':
        geometry = new THREE.ConeGeometry(entity.size || 10, entity.size * 1.5 || 15, 3);
        material = this.materials.get(entityType) || this.materials.get('enemy');
        break;
      
      case 'bullet':
      case 'enemyBullet':
        geometry = new THREE.SphereGeometry(entity.size || 3, 8, 6);
        material = this.materials.get('bullet');
        break;
      
      case 'asteroid':
        geometry = new THREE.DodecahedronGeometry(entity.size || 15);
        material = this.materials.get('asteroid');
        break;
      
      case 'powerup':
        geometry = new THREE.BoxGeometry(entity.size || 12, entity.size || 12, entity.size * 0.5 || 6);
        material = this.materials.get('powerup');
        break;
      
      default:
        geometry = new THREE.SphereGeometry(entity.size || 5, 8, 6);
        material = this.materials.get('bullet');
    }
    
    // Create mesh and return it (don't add to scene here)
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }
  
  applyTimeSlowEffect() {
    // Could add post-processing effects here
    // For now, just modify material opacity
    this.materials.forEach(material => {
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
    // Safety check to ensure scene is initialized
    if (!this.scene) {
      return;
    }
    
    // Update uniforms for all rainbow materials in the scene
    const currentAnimationMode = Math.floor(this.time / 4.0) % 5; // Change mode every 4 seconds
    
    this.scene.traverse((child) => {
      if (child.userData && child.userData.isRainbow && child.material) {
        const uniforms = child.material.uniforms;
        if (uniforms) {
          if (uniforms.time) {
            uniforms.time.value = this.time;
          }
          if (uniforms.animationMode) {
            uniforms.animationMode.value = currentAnimationMode;
          }
          if (uniforms.letterIndex && child.userData.letterIndex !== undefined) {
            uniforms.letterIndex.value = child.userData.letterIndex;
          }
        }
      }
    });
  }
  
  updateCursorTrail() {
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
      
      if (distance > 2) { // Lower threshold for denser trails
        // Add multiple trail points for more prominence
        for (let i = 0; i < 3; i++) {
          this.cursorTrails.push({
            x: centerX + (Math.random() - 0.5) * 8, // Small random spread
            y: centerY + (Math.random() - 0.5) * 8,
            age: 0,
            maxAge: 1.5, // Much shorter lifetime for twice as fast fading
            size: 25 + Math.random() * 20 // Much larger size variation (25-45 pixels)
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
    this.scene.traverse((child) => {
      if (child.userData && child.userData.entityType === 'cursorTrail') {
        this.scene.remove(child);
      }
    });
    
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
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('age', new THREE.BufferAttribute(ages, 1));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const mesh = new THREE.Points(geometry, this.cursorTrailMaterial);
    mesh.userData = { isDynamic: true, entityType: 'cursorTrail' };
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
      if (child.userData && child.userData.entityType === 'ui') {
        uiObjectsToRemove.push(child);
      }
    });
    
    uiObjectsToRemove.forEach(obj => this.scene.remove(obj));
  }
  
  /**
   * Create a simple quad mesh for UI elements
   */
  createUIQuad(x, y, width, height, color = 0xffffff, opacity = 1.0) {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 1); // Z=1 to render in front of game objects
    mesh.userData = { isDynamic: true, entityType: 'ui' };
    
    return mesh;
  }

  /**
   * Create text mesh for UI
   */
  createTextMesh(text, x, y, font = '24px Arial', color = '#ffffff') {
    const { texture, width, height } = this.createTextTexture(text, font, color);
    
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 1); // Z=1 to render in front of game objects
    mesh.userData = { isDynamic: true, entityType: 'ui' };
    
    return mesh;
  }
  
  /**
   * Create rainbow glowing text mesh for special effects
   */
  createRainbowTextMesh(text, x, y, font = '48px Arial') {
    const { texture, width, height } = this.createTextTexture(text, font, '#ffffff');
    
    const geometry = new THREE.PlaneGeometry(width, height);
    
    // Clone the rainbow material and set the texture
    const material = this.rainbowGlowMaterial.clone();
    material.uniforms.textTexture.value = texture;
    material.uniforms.time.value = this.time;
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 1); // Z=1 to render in front of game objects
    mesh.userData = { isDynamic: true, entityType: 'ui', isRainbow: true };
    
    return mesh;
  }
  
  /**
   * Create individual letter mesh with rainbow effects
   */
  createRainbowLetterMesh(letter, x, y, letterIndex, font = '48px Arial') {
    // Create a dedicated canvas for each letter to avoid reuse issues
    const letterCanvas = document.createElement('canvas');
    const letterCtx = letterCanvas.getContext('2d');
    
    // Set font and measure text
    letterCtx.font = font;
    const metrics = letterCtx.measureText(letter);
    const width = Math.ceil(metrics.width) + 20; // Add padding
    const height = 60; // Standard height for letters
    
    letterCanvas.width = width;
    letterCanvas.height = height;
    
    // Re-set font after canvas resize
    letterCtx.font = font;
    letterCtx.fillStyle = '#ffffff';
    letterCtx.textAlign = 'center';
    letterCtx.textBaseline = 'middle';
    
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
      entityType: 'ui', 
      isRainbow: true, 
      letterIndex: letterIndex 
    };
    
    return mesh;
  }
  
  /**
   * Render RAINBLITZ as individual letters with advanced animations
   */
  renderRainblitzTitle(centerX, centerY) {
    const letters = 'RAINBLITZ'.split('');
    const font = '48px Arial';
    const letterSpacing = 45; // Spacing between letters
    
    // Calculate total width to center the text
    const totalWidth = (letters.length - 1) * letterSpacing;
    const startX = centerX - totalWidth / 2;
    
    letters.forEach((letter, index) => {
      const letterX = startX + index * letterSpacing;
      const letterMesh = this.createRainbowLetterMesh(letter, letterX, centerY, index, font);
      this.scene.add(letterMesh);
    });
  }

  renderTitleScreenUIWebGL() {
    // Clear button registry for this screen
    this.buttons.clear();
    
    // Background overlay (centered coordinate system)
    const overlay = this.createUIQuad(
      0,  // Center X
      0,  // Center Y
      this.canvas.width, 
      this.canvas.height, 
      0x000000, 
      0.5
    );
    this.scene.add(overlay);
    
    // Title text with individual letter animations (centered coordinate system)
    this.renderRainblitzTitle(
      0,   // Center X
      100  // Above center Y (now using screen logic: positive Y goes down)
    );
    
    // Timer for paused state
    if (this.game.state.state === "PAUSED") {
      const gameTime = this.game.state.time || 0;
      const minutes = Math.floor(gameTime / 60);
      const seconds = (gameTime % 60).toFixed(1);
      const timeText = `${minutes}:${seconds.padStart(4, '0')}`;
      
      const timerMesh = this.createTextMesh(
        timeText,
        0,  // Center X
        50, // Below title (now using screen logic: positive Y goes down)
        '24px Arial',
        '#ffffff'
      );
      this.scene.add(timerMesh);
    }
    
    // Render Play button
    const playButtonSize = 80;
    const playButtonY = this.game.state.state === "PAUSED" ? 150 : 50;
    this.renderPlayButtonWebGL(
      0,  // Center X
      playButtonY,
      playButtonSize,
      () => this.game.startGame()
    );
  }
  
  renderGameOverScreenUIWebGL() {
    // Background overlay (centered coordinate system)
    const overlay = this.createUIQuad(
      0,  // Center X
      0,  // Center Y
      this.canvas.width, 
      this.canvas.height, 
      0x000000, 
      0.7
    );
    this.scene.add(overlay);
    
    // Game Over text (centered coordinate system)
    const gameOverMesh = this.createTextMesh(
      "GAME OVER",
      0,  // Center X
      50, // Above center Y (now using screen logic: positive Y goes down)
      '48px Arial',
      '#ffffff'
    );
    this.scene.add(gameOverMesh);
    
    // Score text (centered coordinate system)
    const score = this.game.state.score || 0;
    const scoreMesh = this.createTextMesh(
      `Score: ${score.toLocaleString()}`,
      0, // Center X
      0, // Center Y
      '24px Arial',
      '#ffffff'
    );
    this.scene.add(scoreMesh);
  }
  
  renderGameplayUIWebGL() {
    // Clear button registry for this screen
    this.buttons.clear();
    
    // Render progress view (top left) - equivalent to Canvas renderer
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
      '18px Arial',
      '#ffffff'
    );
    this.scene.add(levelMesh);
    
    // Score text (below level)
    const scoreMesh = this.createTextMesh(
      `SCORE: ${score.toLocaleString()}`,
      leftEdge + padding,
      topEdge + padding + 45,
      '18px Arial',
      '#ffffff'
    );
    this.scene.add(scoreMesh);
    
    // Timer text (below score)
    const minutes = Math.floor(timer / 60);
    const seconds = (timer % 60).toFixed(1);
    const timerMesh = this.createTextMesh(
      `⏱ ${minutes}:${seconds.padStart(4, '0')}`,
      leftEdge + padding,
      topEdge + padding + 70,
      '18px Arial',
      '#ffffff'
    );
    this.scene.add(timerMesh);
  }
  
  renderHelpModalUIWebGL() {
    // Background overlay (centered coordinate system)
    const overlay = this.createUIQuad(
      0,  // Center X
      0,  // Center Y
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
      '32px Arial',
      '#ffffff'
    );
    this.scene.add(helpMesh);
  }
  
  renderCrosshairUIWebGL() {
    const input = this.game.input.getInput();
    if (!this.game.isMobile && input.mousePosition) {
      const { x: mouseX, y: mouseY } = input.mousePosition;
      const size = 15;
      
      // Convert screen coordinates to centered coordinate system
      // Flip Y coordinate since WebGL Y increases upward, screen Y increases downward
      const centerX = mouseX - this.canvas.width / 2;
      const centerY = -(mouseY - this.canvas.height / 2);
      
      // Create crosshair lines using thin rectangles
      const hLine = this.createUIQuad(centerX, centerY, size * 2, 2, 0xffffff, 1.0);
      const vLine = this.createUIQuad(centerX, centerY, 2, size * 2, 0xffffff, 1.0);
      
      this.scene.add(hLine);
      this.scene.add(vLine);
    }
  }

  renderTextParticlesWebGL() {
    // Render text particles using WebGL text meshes
    this.game.textParticles.forEach(particle => {
      if (particle.text && particle.x !== undefined && particle.y !== undefined) {
        // Convert screen coordinates to centered coordinate system
        // Flip Y coordinate since WebGL Y increases upward, screen Y increases downward
        const centerX = particle.x - this.canvas.width / 2;
        const centerY = -(particle.y - this.canvas.height / 2);
        
        const textMesh = this.createTextMesh(
          particle.text,
          centerX,
          centerY,
          '16px Arial',
          particle.color || '#ffffff'
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
      0,  // Center X
      0,  // Center Y
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
    this.camera.top = height / 2;    // Y flipped for screen coordinates
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
    // Clean up Three.js resources
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    // Clean up geometries and materials
    this.materials.forEach(material => material.dispose());
    this.materials.clear();
    
    // Clean up cursor trail resources
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