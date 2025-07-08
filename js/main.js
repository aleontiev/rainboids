// Main entry point for the Rainboids game
import { AudioManager } from './modules/audio-manager.js';
import { InputHandler } from './modules/input-handler.js';
import { UIManager } from './modules/ui-manager.js';
import { GameEngine } from './modules/game-engine.js';

class RainboidsGame {
    constructor() {
        this.canvas = null;
        this.audioManager = null;
        this.inputHandler = null;
        this.uiManager = null;
        this.gameEngine = null;
    }
    
    async init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
        
        this.setupCanvas();
        this.setupAudio();
        this.setupManagers();
        this.setupGameEngine();
        this.setupStartHandlers();
        this.start();
    }
    
    setupCanvas() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            throw new Error('Canvas element not found');
        }
    }
    
    setupAudio() {
        this.audioManager = new AudioManager();
        const backgroundMusic = document.getElementById('background-music');
        if (backgroundMusic) {
            this.audioManager.setBackgroundMusic(backgroundMusic);
        }
    }
    
    setupManagers() {
        this.inputHandler = new InputHandler();
        this.uiManager = new UIManager();
    }
    
    setupGameEngine() {
        this.gameEngine = new GameEngine(
            this.canvas,
            this.uiManager,
            this.audioManager,
            this.inputHandler
        );
    }
    
    setupStartHandlers() {
        const startGame = () => {
            if (this.gameEngine.game.state !== 'TITLE_SCREEN') return;
            
            this.uiManager.hideTitleScreen();
            this.audioManager.initializeAudio();
            this.gameEngine.init();
            this.gameEngine.game.state = 'PLAYING';
            
            // Remove start event listeners
            window.removeEventListener('keydown', startGame);
            window.removeEventListener('click', startGame);
            window.removeEventListener('touchstart', startGame);
        };
        
        window.addEventListener('keydown', startGame);
        window.addEventListener('click', startGame);
        window.addEventListener('touchstart', startGame);
    }
    
    start() {
        this.gameEngine.start();
    }
}

// Initialize the game when the script loads
const game = new RainboidsGame();
game.init().catch(error => {
    console.error('Failed to initialize game:', error);
}); 