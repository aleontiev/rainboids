// Input handling for keyboard and touch controls
import { triggerHapticFeedback } from './utils.js';

export class InputHandler {
    constructor() {
        this.input = {
            up: false,
            down: false,
            space: false,
            rotation: 0,
            joystickX: 0,
            joystickY: 0
        };
        
        this.joystickActive = false;
        this.joystickMaxDist = 0;
        this.setupKeyboardControls();
    }
    
    setupKeyboardControls() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
    }
    
    handleKeyDown(e) {
        if (e.code === 'Escape') {
            // Let the game handle pause
            return;
        }
        
        switch (e.code) {
            case 'ArrowUp':
                this.input.up = true;
                break;
            case 'ArrowDown':
                this.input.down = true;
                break;
            case 'ArrowLeft':
                this.input.rotation = -1;
                break;
            case 'ArrowRight':
                this.input.rotation = 1;
                break;
            case 'Space':
                if (window.gameEngine) window.gameEngine.fireQueued = true;
                break;
        }
    }
    
    handleKeyUp(e) {
        switch (e.code) {
            case 'ArrowUp':
                this.input.up = false;
                break;
            case 'ArrowDown':
                this.input.down = false;
                break;
            case 'ArrowLeft':
                if (this.input.rotation < 0) this.input.rotation = 0;
                break;
            case 'ArrowRight':
                if (this.input.rotation > 0) this.input.rotation = 0;
                break;
            case 'Space':
                this.input.space = false;
                break;
        }
    }
    
    setupTouchControls() {
        const touchFire = document.getElementById('touch-fire');
        const joystickArea = document.getElementById('joystick-area');
        const joystickHandle = document.getElementById('joystick-handle');
        
        // Touch button handlers
        const handleTouchStart = (e, key) => {
            e.preventDefault();
            triggerHapticFeedback();
            this.input[key] = true;
        };
        
        const handleTouchEnd = (e, key) => {
            e.preventDefault();
            this.input[key] = false;
        };
        
        touchFire.addEventListener('touchstart', (e) => handleTouchStart(e, 'space'), false);
        touchFire.addEventListener('touchend', (e) => handleTouchEnd(e, 'space'), false);
        
        // Enhanced joystick handlers for movement and rotation
        joystickArea.addEventListener('touchstart', e => {
            e.preventDefault();
            triggerHapticFeedback(20);
            this.joystickActive = true;
            this.joystickMaxDist = joystickArea.clientWidth / 2.5;
        }, false);
        
        joystickArea.addEventListener('touchend', e => {
            e.preventDefault();
            this.joystickActive = false;
            this.input.rotation = 0;
            this.input.joystickX = 0;
            this.input.joystickY = 0;
            this.input.up = false;
            joystickHandle.style.transform = `translate(0px, 0px)`;
        }, false);
        
        joystickArea.addEventListener('touchmove', e => {
            if (!this.joystickActive) return;
            e.preventDefault();
            
            const rect = joystickArea.getBoundingClientRect();
            const touch = e.targetTouches[0];
            const centerX = joystickArea.clientWidth / 2;
            const centerY = joystickArea.clientHeight / 2;
            
            let dx = touch.clientX - rect.left - centerX;
            let dy = touch.clientY - rect.top - centerY;
            const dist = Math.hypot(dx, dy);
            
            if (dist > this.joystickMaxDist) {
                dx = (dx / dist) * this.joystickMaxDist;
                dy = (dy / dist) * this.joystickMaxDist;
            }
            
            joystickHandle.style.transform = `translate(${dx}px, ${dy}px)`;
            
            // Normalize joystick values
            const normalizedX = dx / this.joystickMaxDist;
            const normalizedY = dy / this.joystickMaxDist;
            
            // Set rotation based on X-axis
            this.input.rotation = Math.max(-1, Math.min(1, normalizedX));
            
            // Set thrust based on Y-axis (negative Y = up/thrust)
            this.input.joystickX = normalizedX;
            this.input.joystickY = normalizedY;
            this.input.up = normalizedY < -0.3; // Thrust when joystick is pushed up
        }, false);
    }
    
    getInput() {
        return this.input;
    }
    
    reset() {
        this.input.up = false;
        this.input.down = false;
        this.input.space = false;
        this.input.rotation = 0;
        this.input.joystickX = 0;
        this.input.joystickY = 0;
    }
} 