// Game constants and configuration for Rainboids: Blitz
export const GAME_STATES = {
    TITLE: 'TITLE',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER'
};

export const RENDERER_TYPES = {
    CANVAS_2D: 'canvas2d',
    WEBGL_3D: 'webgl3d'
};

export const RENDERER_SETTINGS = {
    DEFAULT_WEBGL_ENABLED: false, // Start with canvas as default
    FALLBACK_TO_2D: true,
    STORAGE_KEY: 'rainboids-settings'
};

