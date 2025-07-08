// Main entry point for the Rainboids game
import { AssetLoader } from './modules/asset-loader.js';
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
        this.assetLoader = null;
        this.loadingScreen = null;
    }
    
    async init() {
        console.log('RainboidsGame: Starting initialization...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            console.log('RainboidsGame: DOM still loading, waiting...');
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
        console.log('RainboidsGame: DOM ready, readyState:', document.readyState);
        
        this.setupLoadingScreen();
        console.log('RainboidsGame: Loading screen setup complete');
        
        await this.loadAssets();
        console.log('RainboidsGame: Asset loading complete');
        
        this.hideLoadingScreen();
        console.log('RainboidsGame: Loading screen hidden');
        
        this.setupCanvas();
        console.log('RainboidsGame: Canvas setup complete');
        
        this.setupAudio();
        console.log('RainboidsGame: Audio setup complete');
        
        this.setupManagers();
        console.log('RainboidsGame: Managers setup complete');
        
        this.setupGameEngine();
        console.log('RainboidsGame: Game engine setup complete');
        
        this.setupStartHandlers();
        console.log('RainboidsGame: Start handlers setup complete');
        
        this.start();
        console.log('RainboidsGame: Game started');
    }
    
    setupLoadingScreen() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.assetLoader = new AssetLoader();
        
        // Set up progress callback
        this.assetLoader.setProgressCallback((progress) => {
            const progressBar = document.getElementById('loading-progress');
            const loadingText = document.getElementById('loading-text');
            
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
            
            if (loadingText) {
                loadingText.textContent = `Loading... ${Math.round(progress)}%`;
            }
        });
    }
    
    async loadAssets() {
        console.log('RainboidsGame: Loading assets...');
        const success = await this.assetLoader.loadAllAssets();
        
        if (!success) {
            console.warn('RainboidsGame: Some assets failed to load, but continuing...');
        }
        
        console.log('RainboidsGame: Asset loading complete');
        
        // Debug: Check if canvas exists and is visible
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            console.log('RainboidsGame: Canvas found after asset loading');
            console.log('RainboidsGame: Canvas dimensions:', canvas.width, 'x', canvas.height);
            console.log('RainboidsGame: Canvas style:', canvas.style.display, canvas.style.visibility);
            console.log('RainboidsGame: Canvas offset:', canvas.offsetWidth, 'x', canvas.offsetHeight);
        } else {
            console.error('RainboidsGame: Canvas not found after asset loading!');
        }
    }
    
    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'none';
        }
    }
    
    setupCanvas() {
        console.log('RainboidsGame: Setting up canvas...');
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            throw new Error('Canvas element not found');
        }
        console.log('RainboidsGame: Canvas found, dimensions:', this.canvas.width, 'x', this.canvas.height);
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