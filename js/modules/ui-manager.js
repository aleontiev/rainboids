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
            customizeButton: document.getElementById('customize-button'),
            customizationOverlay: document.getElementById('customization-overlay'),
            saveLayoutButton: document.getElementById('save-layout-button'),
            mobileControls: document.getElementById('mobile-controls'),
            titleScreen: document.getElementById('title-screen'),
            gameTitle: document.getElementById('game-title'),
            orientationOverlay: document.getElementById('orientation-overlay'),
            highScoreDisplay: document.getElementById('high-score-display')
        };
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Mobile pause button
        this.elements.mobilePauseButton.addEventListener('click', () => {
            // Let the game handle pause
        });
        
        // Customization controls
        this.elements.customizeButton.addEventListener('click', () => {
            this.enableCustomization();
        });
        
        this.elements.saveLayoutButton.addEventListener('click', () => {
            this.disableCustomization(true);
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
    
    enableCustomization() {
        this.elements.customizationOverlay.style.display = 'flex';
        const draggableControls = this.elements.mobileControls.querySelectorAll('[data-control-id]');
        
        draggableControls.forEach(el => {
            el.classList.add('draggable');
        });
        
        this.setupDraggableControls();
    }
    
    disableCustomization(save = false) {
        if (save) {
            this.saveControlLayout();
        } else {
            this.loadCustomControls();
        }
        
        this.elements.customizationOverlay.style.display = 'none';
        const draggableControls = this.elements.mobileControls.querySelectorAll('[data-control-id]');
        draggableControls.forEach(el => {
            el.classList.remove('draggable');
        });
        
        this.removeDraggableControls();
    }
    
    setupDraggableControls() {
        const draggableControls = this.elements.mobileControls.querySelectorAll('[data-control-id]');
        let activeControl = null;
        let offsetX = 0;
        let offsetY = 0;
        
        const onDragStart = (e) => {
            e.preventDefault();
            activeControl = e.currentTarget;
            const touch = e.type === 'touchstart' ? e.touches[0] : e;
            const rect = activeControl.getBoundingClientRect();
            offsetX = touch.clientX - rect.left;
            offsetY = touch.clientY - rect.top;
        };
        
        const onDragMove = (e) => {
            if (!activeControl) return;
            e.preventDefault();
            const touch = e.type === 'touchmove' ? e.touches[0] : e;
            let newX = touch.clientX - offsetX;
            let newY = touch.clientY - offsetY;
            
            newX = Math.max(0, Math.min(newX, window.innerWidth - activeControl.clientWidth));
            newY = Math.max(0, Math.min(newY, window.innerHeight - activeControl.clientHeight));
            
            activeControl.style.left = `${newX}px`;
            activeControl.style.top = `${newY}px`;
        };
        
        const onDragEnd = () => {
            activeControl = null;
        };
        
        draggableControls.forEach(el => {
            el.addEventListener('mousedown', onDragStart, false);
            el.addEventListener('touchstart', onDragStart, false);
        });
        
        document.addEventListener('mousemove', onDragMove, false);
        document.addEventListener('touchmove', onDragMove, { passive: false });
        document.addEventListener('mouseup', onDragEnd, false);
        document.addEventListener('touchend', onDragEnd, false);
        
        // Store references for cleanup
        this.dragHandlers = { onDragStart, onDragMove, onDragEnd };
    }
    
    removeDraggableControls() {
        if (!this.dragHandlers) return;
        
        const draggableControls = this.elements.mobileControls.querySelectorAll('[data-control-id]');
        draggableControls.forEach(el => {
            el.removeEventListener('mousedown', this.dragHandlers.onDragStart, false);
            el.removeEventListener('touchstart', this.dragHandlers.onDragStart, false);
        });
        
        document.removeEventListener('mousemove', this.dragHandlers.onDragMove, false);
        document.removeEventListener('touchmove', this.dragHandlers.onDragMove);
        document.removeEventListener('mouseup', this.dragHandlers.onDragEnd, false);
        document.removeEventListener('touchend', this.dragHandlers.onDragEnd, false);
        
        this.dragHandlers = null;
    }
    
    saveControlLayout() {
        const layout = {};
        const draggableControls = this.elements.mobileControls.querySelectorAll('[data-control-id]');
        
        draggableControls.forEach(el => {
            const id = el.dataset.controlId;
            const x = (el.offsetLeft / window.innerWidth) * 100;
            const y = (el.offsetTop / window.innerHeight) * 100;
            layout[id] = { top: `${y}%`, left: `${x}%` };
        });
        
        localStorage.setItem('rainboidsControlLayout', JSON.stringify(layout));
    }
    
    loadCustomControls() {
        const savedLayout = localStorage.getItem('rainboidsControlLayout');
        if (savedLayout) {
            const layout = JSON.parse(savedLayout);
            for (const id in layout) {
                const el = document.querySelector(`[data-control-id="${id}"]`);
                if (el) {
                    el.style.top = layout[id].top;
                    el.style.left = layout[id].left;
                }
            }
        }
    }
} 