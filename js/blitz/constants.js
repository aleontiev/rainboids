// Game constants and configuration for Rainboids: Blitz
export const GAME_STATES = {
    TITLE: 'TITLE',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER'
};

export const COLORS = {
    STAR_COLORS: ['#a6b3ff', '#c3a6ff', '#f3a6ff', '#ffa6f8', '#ffa6c7', '#ff528e', '#d98cff', '#ff8c00', '#ffffff', '#ffff88'],
    ENEMY_COLORS: {
        straight: '#ff6666',
        sine: '#ff8866',
        zigzag: '#ffaa66',
        circle: '#ffcc66',
        dive: '#ffee66',
        laser: '#ff4444',
        pulse: '#ff9999'
    },
    POWERUP_COLORS: {
        shield: '#00aaff',
        mainWeapon: '#8844ff',
        sideWeapon: '#00ff88',
        secondShip: '#4488ff',
        bomb: '#aa44ff'
    }
};

export const GAME_CONFIG = {
    // Player settings
    PLAYER_SPEED: 6,
    PLAYER_SIZE: 11,
    PLAYER_HITBOX: 3,
    DASH_DISTANCE: 150,
    DASH_FRAMES: 40,
    
    // Enemy settings
    ENEMY_SPAWN_RATE: 0.02,
    ENEMY_SPEED: 2,
    ENEMY_SIZE: 24, // 3x larger than original
    
    // Bullet settings
    BULLET_SPEED: 8,
    BULLET_SIZE: 6, // 2x larger than original
    
    // Explosion settings
    EXPLOSION_PARTICLES: 8,
    EXPLOSION_SPEED: 4,
    EXPLOSION_LIFE: 60,
    ENEMY_EXPLOSION_SCALE: 2.5, // Make enemy explosions bigger
    
    // Asteroid settings
    ASTEROID_SPAWN_RATE: 0.01,
    ASTEROID_SPEED: 1,
    ASTEROID_SIZE: 40,
    
    // Powerup settings
    POWERUP_SPAWN_RATE: 0.01,
    POWERUP_SIZE: 20,
    
    // Audio settings
    AUDIO_VOLUME: 0.1,
    MUSIC_VOLUME: 0.3
};

export const ENEMY_TYPES = ['straight', 'sine', 'zigzag', 'circle', 'dive', 'laser', 'pulse'];
export const POWERUP_TYPES = ['shield', 'mainWeapon', 'sideWeapon', 'secondShip', 'bomb'];
export const STAR_SHAPES = ['point', 'diamond', 'star4', 'star8', 'plus', 'cross'];
