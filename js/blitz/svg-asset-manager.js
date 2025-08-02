// SVGAssetManager - Handles loading, caching, and rendering of custom SVG sprites
export class SVGAssetManager {
  constructor() {
    // Cache for loaded SVG content
    this.svgCache = new Map();
    // Cache for parsed SVG elements
    this.svgElementCache = new Map();
    // Loading promises to prevent duplicate downloads
    this.loadingPromises = new Map();
  }

  /**
   * Load an SVG from URL or local identifier
   * @param {string} spriteIdentifier - URL or local sprite name
   * @returns {Promise<string>} SVG content as string
   */
  async loadSVG(spriteIdentifier) {
    // Check if already cached
    if (this.svgCache.has(spriteIdentifier)) {
      return this.svgCache.get(spriteIdentifier);
    }

    // Check if already loading to prevent duplicate requests
    if (this.loadingPromises.has(spriteIdentifier)) {
      return this.loadingPromises.get(spriteIdentifier);
    }

    let loadPromise;

    if (this.isURL(spriteIdentifier)) {
      // Load from URL
      loadPromise = this.loadSVGFromURL(spriteIdentifier);
    } else {
      // Load local sprite (existing system)
      loadPromise = this.loadLocalSprite(spriteIdentifier);
    }

    // Cache the promise to prevent duplicate requests
    this.loadingPromises.set(spriteIdentifier, loadPromise);

    try {
      const svgContent = await loadPromise;
      // Cache the result
      this.svgCache.set(spriteIdentifier, svgContent);
      // Remove from loading promises
      this.loadingPromises.delete(spriteIdentifier);
      return svgContent;
    } catch (error) {
      // Remove failed promise from cache
      this.loadingPromises.delete(spriteIdentifier);
      console.error(`Failed to load SVG: ${spriteIdentifier}`, error);
      // Return a default fallback SVG
      return this.getDefaultSVG();
    }
  }

  /**
   * Load SVG from external URL
   * @param {string} url - SVG URL
   * @returns {Promise<string>} SVG content
   */
  async loadSVGFromURL(url) {
    console.log(`Loading SVG from URL: ${url}`);
    
    try {
      const response = await fetch(url, {
        mode: 'cors',
        headers: {
          'Accept': 'image/svg+xml,text/plain,*/*'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const svgContent = await response.text();
      
      // Validate that it's actually SVG content
      if (!svgContent.includes('<svg') && !svgContent.includes('SVG')) {
        throw new Error('Response does not contain valid SVG content');
      }

      console.log(`Successfully loaded SVG from ${url}`);
      return svgContent;
    } catch (error) {
      console.error(`Failed to fetch SVG from ${url}:`, error);
      throw error;
    }
  }

  /**
   * Load local sprite (fallback to existing system)
   * @param {string} spriteName - Local sprite identifier
   * @returns {Promise<string>} SVG content
   */
  async loadLocalSprite(spriteName) {
    // For now, return a placeholder - this can be extended to load from local assets
    console.log(`Loading local sprite: ${spriteName}`);
    return this.getDefaultSVG();
  }

  /**
   * Get a parsed SVG element for rendering
   * @param {string} spriteIdentifier - URL or local sprite name
   * @returns {Promise<SVGElement|null>} Parsed SVG element
   */
  async getSVGElement(spriteIdentifier) {
    // Check element cache first
    if (this.svgElementCache.has(spriteIdentifier)) {
      return this.svgElementCache.get(spriteIdentifier).cloneNode(true);
    }

    try {
      const svgContent = await this.loadSVG(spriteIdentifier);
      const svgElement = this.parseSVG(svgContent);
      
      if (svgElement) {
        // Cache the parsed element
        this.svgElementCache.set(spriteIdentifier, svgElement);
        return svgElement.cloneNode(true);
      }
    } catch (error) {
      console.error(`Failed to get SVG element for ${spriteIdentifier}:`, error);
    }

    return null;
  }

  /**
   * Parse SVG string into DOM element
   * @param {string} svgContent - SVG as string
   * @returns {SVGElement|null} Parsed SVG element
   */
  parseSVG(svgContent) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, 'image/svg+xml');
      
      // Check for parsing errors
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        console.error('SVG parsing error:', parserError.textContent);
        return null;
      }

      const svgElement = doc.querySelector('svg');
      if (!svgElement) {
        console.error('No SVG element found in content');
        return null;
      }

      // Ensure the SVG has proper dimensions
      if (!svgElement.hasAttribute('viewBox') && !svgElement.hasAttribute('width')) {
        svgElement.setAttribute('viewBox', '0 0 100 100');
      }

      return svgElement;
    } catch (error) {
      console.error('Error parsing SVG:', error);
      return null;
    }
  }

  /**
   * Create a data URL from SVG content for use in canvas
   * @param {string} spriteIdentifier - URL or local sprite name
   * @param {string} color - Optional color override
   * @returns {Promise<string>} Data URL for the SVG
   */
  async getSVGDataURL(spriteIdentifier, color = null) {
    try {
      let svgContent = await this.loadSVG(spriteIdentifier);
      
      // Apply color override if specified
      if (color) {
        svgContent = this.applySVGColorOverride(svgContent, color);
      }

      // Create data URL
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error(`Failed to create SVG data URL for ${spriteIdentifier}:`, error);
      return null;
    }
  }

  /**
   * Apply color override to SVG content
   * @param {string} svgContent - Original SVG content
   * @param {string} color - Color to apply
   * @returns {string} Modified SVG content
   */
  applySVGColorOverride(svgContent, color) {
    // Simple color override - replace fill and stroke attributes
    // This is a basic implementation that can be enhanced
    return svgContent
      .replace(/fill="[^"]*"/g, `fill="${color}"`)
      .replace(/stroke="[^"]*"/g, `stroke="${color}"`);
  }

  /**
   * Check if a string is a URL
   * @param {string} str - String to check
   * @returns {boolean} True if it's a URL
   */
  isURL(str) {
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Get default fallback SVG
   * @returns {string} Default SVG content
   */
  getDefaultSVG() {
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <polygon points="50,10 80,80 20,80" fill="#ff6644" stroke="#ff0000" stroke-width="2"/>
    </svg>`;
  }

  /**
   * Preload multiple SVGs (useful for level initialization)
   * @param {string[]} spriteIdentifiers - Array of URLs or sprite names
   * @returns {Promise<void>} Promise that resolves when all are loaded
   */
  async preloadSVGs(spriteIdentifiers) {
    console.log(`Preloading ${spriteIdentifiers.length} SVG assets...`);
    
    const loadPromises = spriteIdentifiers.map(async (identifier) => {
      try {
        await this.loadSVG(identifier);
        console.log(`✓ Preloaded: ${identifier}`);
      } catch (error) {
        console.warn(`✗ Failed to preload: ${identifier}`, error);
      }
    });

    await Promise.allSettled(loadPromises);
    console.log('SVG preloading complete');
  }

  /**
   * Clear all caches (useful for testing or memory management)
   */
  clearCache() {
    this.svgCache.clear();
    this.svgElementCache.clear();
    this.loadingPromises.clear();
    console.log('SVG caches cleared');
  }
}