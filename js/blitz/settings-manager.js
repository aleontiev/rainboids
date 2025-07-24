import { RENDERER_SETTINGS, RENDERER_TYPES } from './constants.js';

export class SettingsManager {
  constructor() {
    this.settings = {
      webglEnabled: RENDERER_SETTINGS.DEFAULT_WEBGL_ENABLED,
      audioVolume: 1.0,
      sfxVolume: 1.0
    };
    
    this.load();
  }
  
  load() {
    try {
      const stored = localStorage.getItem(RENDERER_SETTINGS.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.settings = { ...this.settings, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
      // Use defaults on error
    }
  }
  
  save() {
    try {
      localStorage.setItem(RENDERER_SETTINGS.STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save settings to localStorage:', error);
    }
  }
  
  get(key) {
    return this.settings[key];
  }
  
  set(key, value) {
    this.settings[key] = value;
    this.save();
  }
  
  getRendererType() {
    return this.settings.webglEnabled ? RENDERER_TYPES.WEBGL_3D : RENDERER_TYPES.CANVAS_2D;
  }
  
  setWebGLEnabled(enabled) {
    this.set('webglEnabled', enabled);
  }
  
  isWebGLEnabled() {
    return this.settings.webglEnabled;
  }
  
  // Check if WebGL is available in the browser
  isWebGLAvailable() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && 
               (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }
  
  // Get the final renderer type considering availability and fallback
  getFinalRendererType() {
    if (this.settings.webglEnabled && this.isWebGLAvailable()) {
      return RENDERER_TYPES.WEBGL_3D;
    }
    
    if (this.settings.webglEnabled && !this.isWebGLAvailable() && RENDERER_SETTINGS.FALLBACK_TO_2D) {
      console.warn('WebGL requested but not available, falling back to Canvas 2D');
    }
    
    return RENDERER_TYPES.CANVAS_2D;
  }
  
  reset() {
    this.settings = {
      webglEnabled: RENDERER_SETTINGS.DEFAULT_WEBGL_ENABLED,
      audioVolume: 1.0,
      sfxVolume: 1.0
    };
    this.save();
  }
}