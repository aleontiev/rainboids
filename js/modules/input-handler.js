// Input handling for keyboard and touch controls
import { triggerHapticFeedback } from './utils.js';

export class InputHandler {
    constructor() {
        this.input = {
            up: false,
            down: false,
            fire: false,
            firePressed: false,
            rotation: 0,
            joystickX: 0,
            joystickY: 0,
            space: false
        };
        
        this.joystickActive = false;
        this.joystickMaxDist = 0;
        
        this.setupKeyboardControls();
        this.setupTouchControls();
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
                if (!this.input.fire) {
                    this.input.firePressed = true;
                }
                this.input.fire = true;
                break;
            case 'Space':
                this.input.space = true;
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
            if (key === 'fire' && !this.input.fire) {
                this.input.firePressed = true;
            }
            this.input[key] = true;
            // Add .pressed class for visual feedback
            if (key === 'fire') touchFire.classList.add('pressed');
            if (key === 'up') touchThrust.classList.add('pressed');
            if (key === 'space') touchTractor.classList.add('pressed');
        };
        
        const handleTouchEnd = (e, key) => {
            e.preventDefault();
            this.input[key] = false;
            // Remove .pressed class
            if (key === 'fire') touchFire.classList.remove('pressed');
            if (key === 'up') touchThrust.classList.remove('pressed');
            if (key === 'space') touchTractor.classList.remove('pressed');
        };
        
        touchFire.addEventListener('touchstart', (e) => handleTouchStart(e, 'fire'), { passive: false });
        touchFire.addEventListener('touchend', (e) => handleTouchEnd(e, 'fire'), { passive: false });
        
        // Enhanced joystick handlers for movement and rotation
        joystickArea.addEventListener('touchstart', e => {
            e.preventDefault();
            triggerHapticFeedback(20);
            this.joystickActive = true;
            this.joystickMaxDist = joystickArea.clientWidth / 2.5;
        }, { passive: false });
        
        joystickArea.addEventListener('touchend', e => {
            e.preventDefault();
            this.joystickActive = false;
            this.input.rotation = 0;
            this.input.joystickX = 0;
            this.input.joystickY = 0;
            this.input.up = false;
            joystickHandle.style.transform = `translate(0px, 0px) translate(-50%, -50%)`;
        }, { passive: false });
        
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
        }, { passive: false });
        // Thrust button handlers
        const touchThrust = document.getElementById('touch-thrust');
        const touchTractor = document.getElementById('touch-tractor');
        touchThrust.addEventListener('touchstart', (e) => handleTouchStart(e, 'up'), { passive: false });
        touchThrust.addEventListener('touchend', (e) => handleTouchEnd(e, 'up'), { passive: false });
        // Tractor button handlers
        touchTractor.addEventListener('touchstart', (e) => handleTouchStart(e, 'space'), { passive: false });
        touchTractor.addEventListener('touchend', (e) => handleTouchEnd(e, 'space'), { passive: false });
    }
    
    getInput() {
        const inputCopy = { ...this.input };
        this.input.firePressed = false;
        return inputCopy;
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