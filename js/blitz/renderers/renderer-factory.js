import { RENDERER_TYPES, RENDERER_SETTINGS } from '../constants.js';
import { CanvasRenderer } from './canvas-renderer.js';
import { WebGLRenderer } from './webgl-renderer.js';

/**
 * Factory class for creating renderer instances
 * Handles renderer selection, fallback logic, and initialization
 */
export class RendererFactory {
  /**
   * Create a renderer based on settings and availability
   * @param {Object} game - The game instance
   * @param {HTMLCanvasElement} canvas - The canvas element
   * @param {SettingsManager} settings - The settings manager
   * @returns {BaseRenderer} The created renderer instance
   */
  static createRenderer(game, canvas, settings) {
    const requestedType = settings.getFinalRendererType();
    
    let renderer = null;
    let fallbackUsed = false;
    
    try {
      // Try to create the requested renderer
      switch (requestedType) {
        case RENDERER_TYPES.WEBGL_3D:
          renderer = this.createWebGLRenderer(game, canvas);
          if (!renderer.initialize()) {
            throw new Error('WebGL renderer initialization failed');
          }
          console.log('Successfully initialized WebGL renderer');
          break;
          
        case RENDERER_TYPES.CANVAS_2D:
        default:
          renderer = this.createCanvasRenderer(game, canvas);
          if (!renderer.initialize()) {
            throw new Error('Canvas renderer initialization failed');
          }
          console.log('Successfully initialized Canvas 2D renderer');
          break;
      }
      
      return renderer;
      
    } catch (error) {
      console.warn(`Failed to create ${requestedType} renderer:`, error);
      
      // Try fallback if enabled and we were trying WebGL
      if (requestedType === RENDERER_TYPES.WEBGL_3D && RENDERER_SETTINGS.FALLBACK_TO_2D) {
        console.log('Attempting fallback to Canvas 2D renderer...');
        
        try {
          // Clean up failed renderer
          if (renderer) {
            renderer.dispose();
          }
          
          // Create Canvas fallback
          renderer = this.createCanvasRenderer(game, canvas);
          if (!renderer.initialize()) {
            throw new Error('Canvas fallback renderer initialization failed');
          }
          
          console.log('Successfully fell back to Canvas 2D renderer');
          fallbackUsed = true;
          
          return renderer;
          
        } catch (fallbackError) {
          console.error('Fallback renderer also failed:', fallbackError);
          throw new Error('Both primary and fallback renderers failed to initialize');
        }
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Create a Canvas 2D renderer
   * @param {Object} game - The game instance
   * @param {HTMLCanvasElement} canvas - The canvas element
   * @returns {CanvasRenderer} The canvas renderer instance
   */
  static createCanvasRenderer(game, canvas) {
    return new CanvasRenderer(game, canvas);
  }
  
  /**
   * Create a WebGL renderer
   * @param {Object} game - The game instance
   * @param {HTMLCanvasElement} canvas - The canvas element
   * @returns {WebGLRenderer} The WebGL renderer instance
   */
  static createWebGLRenderer(game, canvas) {
    return new WebGLRenderer(game, canvas);
  }
  
  /**
   * Get available renderer types based on browser support
   * @returns {Array<string>} Array of supported renderer types
   */
  static getAvailableRendererTypes() {
    const available = [RENDERER_TYPES.CANVAS_2D]; // Canvas is always available
    
    // Check WebGL support
    if (this.isWebGLSupported()) {
      available.push(RENDERER_TYPES.WEBGL_3D);
    }
    
    return available;
  }
  
  /**
   * Check if WebGL is supported in the current browser
   * @returns {boolean} True if WebGL is supported
   */
  static isWebGLSupported() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!(window.WebGLRenderingContext && gl);
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Check if Three.js is available
   * @returns {boolean} True if Three.js is loaded
   */
  static isThreeJSAvailable() {
    return typeof THREE !== 'undefined';
  }
  
  /**
   * Get renderer capabilities for a given type
   * @param {string} rendererType - The renderer type
   * @returns {Object} Capabilities object
   */
  static getRendererCapabilities(rendererType) {
    const baseCapabilities = {
      type: rendererType,
      supported: false,
      features: [],
      limitations: []
    };
    
    switch (rendererType) {
      case RENDERER_TYPES.CANVAS_2D:
        return {
          ...baseCapabilities,
          supported: true,
          features: [
            'text-rendering',
            'gradient-effects',
            'alpha-blending',
            'basic-shapes',
            '2d-transformations'
          ],
          limitations: [
            'no-hardware-acceleration',
            'limited-particle-count',
            'no-3d-effects'
          ]
        };
        
      case RENDERER_TYPES.WEBGL_3D:
        return {
          ...baseCapabilities,
          supported: this.isWebGLSupported() && this.isThreeJSAvailable(),
          features: [
            '3d-rendering',
            'hardware-acceleration',
            'shaders',
            'lighting',
            'shadows',
            'particle-systems',
            'post-processing'
          ],
          limitations: [
            'requires-webgl-support',
            'higher-memory-usage',
            'complex-text-rendering'
          ]
        };
        
      default:
        return baseCapabilities;
    }
  }
  
  /**
   * Validate renderer configuration
   * @param {string} rendererType - The requested renderer type
   * @param {Object} settings - The settings object
   * @returns {Object} Validation result with success flag and messages
   */
  static validateRendererConfig(rendererType, settings) {
    const result = {
      success: true,
      warnings: [],
      errors: []
    };
    
    const capabilities = this.getRendererCapabilities(rendererType);
    
    if (!capabilities.supported) {
      result.errors.push(`Renderer type '${rendererType}' is not supported`);
      result.success = false;
    }
    
    // Check for WebGL specific requirements
    if (rendererType === RENDERER_TYPES.WEBGL_3D) {
      if (!this.isWebGLSupported()) {
        result.errors.push('WebGL is not supported in this browser');
        result.success = false;
      }
      
      if (!this.isThreeJSAvailable()) {
        result.errors.push('Three.js library is not loaded');
        result.success = false;
      }
      
      // Check for mobile limitations
      if (this.isMobileDevice()) {
        result.warnings.push('WebGL on mobile devices may have performance limitations');
      }
    }
    
    return result;
  }
  
  /**
   * Detect if running on a mobile device
   * @returns {boolean} True if mobile device detected
   */
  static isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  /**
   * Get recommended renderer type based on device capabilities
   * @returns {string} Recommended renderer type
   */
  static getRecommendedRendererType() {
    // For mobile devices, prefer Canvas for better compatibility
    if (this.isMobileDevice()) {
      return RENDERER_TYPES.CANVAS_2D;
    }
    
    // For desktop, prefer WebGL if available
    if (this.isWebGLSupported() && this.isThreeJSAvailable()) {
      return RENDERER_TYPES.WEBGL_3D;
    }
    
    // Fallback to Canvas
    return RENDERER_TYPES.CANVAS_2D;
  }
}