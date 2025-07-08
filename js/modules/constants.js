// Game constants and configuration
export const GAME_CONFIG = {
    SHIP_SIZE: 30,
    SHIP_THRUST: 0.15,
    SHIP_FRICTION: 0.985,
    MAX_V: 6,
    TURN_SPEED: 0.06,
    BULLET_SPEED: 8,
    INITIAL_AST_COUNT: 3,
    AST_SPEED: 1.2,
    STAR_COUNT: 150,
    MIN_STAR_DIST: 30,
    STAR_ATTR: 0.05,
    STAR_FRIC: 0.98,
    HIT_SCORE: 10,
    DESTROY_SCORE: 500,
    STAR_SCORE: 4,
    BURST_STAR_SCORE: 7,
    BURST_STAR_ATTRACT_DIST: 350,
    BURST_STAR_ATTR: 0.3,
    MIN_AST_RAD: 15,
    SAFE_ZONE: 250
};

export const NORMAL_STAR_COLORS = [
    '#a6b3ff', '#c3a6ff', '#f3a6ff', '#ffa6f8', 
    '#ffa6c7', '#ff528e', '#d98cff', '#ff8c00'
];

export const GAME_STATES = {
    TITLE_SCREEN: 'TITLE_SCREEN',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER',
    WAVE_TRANSITION: 'WAVE_TRANSITION',
    ORIENTATION_LOCK: 'ORIENTATION_LOCK'
};

export const PARTICLE_TYPES = {
    EXPLOSION: 'explosion',
    PLAYER_EXPLOSION: 'playerExplosion',
    THRUST: 'thrust',
    PHANTOM: 'phantom',
    PICKUP_PULSE: 'pickupPulse'
};

export const STAR_SHAPES = ['point', 'point', 'point', 'point', 'point', 'point', 'point', 'diamond', 'star4', 'star8', 'plus']; 