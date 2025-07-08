// Input handling for keyboard and touch controls
import { triggerHapticFeedback } from './utils.js';

export class InputHandler {
    constructor() {
        this.input = {
            up: false,
            down: false,
            fire: false,
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
            case 'KeyZ':
                this.input.fire = true;
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
            case 'KeyZ':
                this.input.fire = false;
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
        
        touchFire.addEventListener('touchstart', (e) => handleTouchStart(e, 'fire'), false);
        touchFire.addEventListener('touchend', (e) => handleTouchEnd(e, 'fire'), false);
        
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
            joystickHandle.style.transform = `translate(0px, 0px) translate(-50%, -50%)`;
        }, false);
        
        // Remove thrust from joystick: only set rotation
        joystickArea.addEventListener('touchmove', e => {
            if (!this.joystickActive) return;
            e.preventDefault();
            const rect = joystickArea.getBoundingClientRect();
            const touch = e.targetTouches[0];
            // Always use current width/height for center
            const centerX = joystickArea.offsetWidth / 2;
            const centerY = joystickArea.offsetHeight / 2;
            let dx = touch.clientX - rect.left - centerX;
            let dy = touch.clientY - rect.top - centerY;
            const dist = Math.hypot(dx, dy);
            if (dist > this.joystickMaxDist) {
                dx = (dx / dist) * this.joystickMaxDist;
                dy = (dy / dist) * this.joystickMaxDist;
            }
            // Move the handle, keeping it centered
            joystickHandle.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%)`;
            // Normalize joystick values
            const normalizedX = dx / this.joystickMaxDist;
            const normalizedY = dy / this.joystickMaxDist;
            // Only set rotation, not thrust
            this.input.rotation = Math.max(-1, Math.min(1, normalizedX));
            this.input.joystickX = normalizedX;
            this.input.joystickY = normalizedY;
        }, false);
        // Thrust button handlers
        const touchThrust = document.getElementById('touch-thrust');
        touchThrust.addEventListener('touchstart', (e) => handleTouchStart(e, 'up'), false);
        touchThrust.addEventListener('touchend', (e) => handleTouchEnd(e, 'up'), false);
    }
    
    getInput() {
        return this.input;
    }
    
    reset() {
        this.input.up = false;
        this.input.down = false;
        this.input.fire = false;
        this.input.rotation = 0;
        this.input.joystickX = 0;
        this.input.joystickY = 0;
    }
} 