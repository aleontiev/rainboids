import { RENDERER_TYPES } from '../constants.js';

/**
 * Abstract base class for all renderers
 * Defines the interface that both Canvas and WebGL renderers must implement
 */
export class BaseRenderer {
  constructor(game, canvas) {
    if (this.constructor === BaseRenderer) {
      throw new Error('BaseRenderer is abstract and cannot be instantiated directly');
    }
    
    this.game = game;
    this.canvas = canvas;
    this.type = null; // Must be set by subclasses
    
    // Common properties
    this.mousePosition = { x: 0, y: 0 };
    this.buttons = new Map();
    this.frameCount = 0;
  }
  
  /**
   * Initialize the renderer - must be implemented by subclasses
   */
  initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }
  
  /**
   * Main render method - must be implemented by subclasses
   */
  render() {
    throw new Error('render() must be implemented by subclass');
  }
  
  /**
   * Handle canvas resize - must be implemented by subclasses
   */
  resize(width, height) {
    throw new Error('resize() must be implemented by subclass');
  }
  
  /**
   * Clean up resources - must be implemented by subclasses
   */
  dispose() {
    throw new Error('dispose() must be implemented by subclass');
  }
  
  /**
   * Update mouse position (common functionality)
   */
  updateMousePosition(x, y) {
    this.mousePosition.x = x;
    this.mousePosition.y = y;
  }
  
  /**
   * Check if renderer supports a specific feature
   */
  supportsFeature(feature) {
    return false; // Override in subclasses
  }
  
  /**
   * Get renderer-specific context/scene object
   */
  getContext() {
    throw new Error('getContext() must be implemented by subclass');
  }
  
  /**
   * Common button management (used by both renderers)
   */
  isPointInButton(x, y, button) {
    return x >= button.x && x <= button.x + button.width &&
           y >= button.y && y <= button.y + button.height;
  }
  
  /**
   * Common frame counting
   */
  incrementFrame() {
    this.frameCount++;
  }
}