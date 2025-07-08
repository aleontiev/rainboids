// UI management for overlays, messages, and interface elements
import { checkOrientation } from './utils.js';

export class UIManager {
    constructor() {
        this.elements = {};
        this.initializeElements();
    }
    
    initializeElements() {
        // Get all UI elements
        this.elements = {
            score: document.getElementById('score'),
            waveDisplay: document.getElementById('wave-display'),
            pauseOverlay: document.getElementById('pause-overlay'),
            messageTitle: document.getElementById('message-title'),
            messageSubtitle: document.getElementById('message-subtitle'),
            mobilePauseButton: document.getElementById('mobile-pause-button'),
            mobileControls: document.getElementById('mobile-controls'),
            titleScreen: document.getElementById('title-screen'),
            gameTitle: document.getElementById('game-title'),
            orientationOverlay: document.getElementById('orientation-overlay'),
            highScoreDisplay: document.getElementById('high-score-display')
        };
    }
    
    setupEventListeners() {
        this.elements.mobilePauseButton.addEventListener('click', () => {
            // Let the game handle pause
        });
    }
    
    updateScore(score) {
        this.elements.score.textContent = score;
    }
    
    updateWave(wave) {
        this.elements.waveDisplay.textContent = `WAVE: ${wave}`;
    }
    
    showMessage(title, subtitle = '', duration = 0) {
        this.elements.messageTitle.textContent = title;
        this.elements.messageTitle.style.display = 'block';
        this.elements.messageSubtitle.innerHTML = subtitle.replace(/\n/g, '<br>');
        this.elements.messageSubtitle.style.display = subtitle ? 'block' : 'none';
        
        if (duration > 0) {
            setTimeout(() => this.hideMessage(), duration);
        }
    }
    
    hideMessage() {
        this.elements.messageTitle.style.display = 'none';
        this.elements.messageSubtitle.style.display = 'none';
    }
    
    togglePause() {
        const isPaused = this.elements.pauseOverlay.style.display === 'flex';
        if (isPaused) {
            this.elements.pauseOverlay.style.display = 'none';
            this.elements.mobilePauseButton.innerHTML = '||';
        } else {
            this.elements.pauseOverlay.style.display = 'flex';
            this.elements.mobilePauseButton.innerHTML = '▶';
        }
        return !isPaused;
    }
    
    showTitleScreen() {
        this.elements.titleScreen.style.display = 'flex';
    }
    
    hideTitleScreen() {
        this.elements.titleScreen.style.display = 'none';
    }
    
    setupTitleScreen() {
        const titleText = "RAINBOIDS";
        this.elements.gameTitle.innerHTML = '';
        titleText.split('').forEach((char, index) => {
            const span = document.createElement('span');
            span.textContent = char;
            span.className = 'title-char';
            span.style.animationDelay = `${index * 0.1}s`;
            this.elements.gameTitle.appendChild(span);
        });
    }
    
    updateHighScore(highScore) {
        this.elements.highScoreDisplay.textContent = `HIGH SCORE: ${highScore}`;
    }
    
    checkOrientation() {
        const needsOrientation = checkOrientation();
        if (needsOrientation) {
            this.elements.orientationOverlay.style.display = 'flex';
            return true;
        } else {
            this.elements.orientationOverlay.style.display = 'none';
            return false;
        }
    }
} 