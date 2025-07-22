// Input handling for keyboard and touch controls

export class InputHandler {
  constructor(canvas, game = null) {
    this.canvas = canvas;
    this.game = game;
    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      fire: false,
      firePressed: false,
      shift: false,
      alt: false,
      rightClick: false,
      z: false,
      f: false,
      joystickX: 0,
      joystickY: 0,
      target: null,
      mousePosition: null,
    };

    this.joystickActive = false;
    this.joystickMaxDist = 0;
    this.firstTouch = true;
    this.onFirstTouch = null;

    this.setupKeyboardControls();
    this.setupTouchControls();
    this.setupMouseControls();
  }

  setupKeyboardControls() {
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
    document.addEventListener("keyup", this.handleKeyUp.bind(this));
  }

  setupTouchControls() {
    this.canvas.addEventListener("touchstart", this.handleTouch.bind(this), {
      passive: false,
    });
    this.canvas.addEventListener("touchmove", this.handleTouch.bind(this), {
      passive: false,
    });
    this.canvas.addEventListener("touchend", this.handleTouchEnd.bind(this));
  }

  handleKeyDown(e) {
    if (e.code === "Escape") {
      // Let the game handle pause
      return;
    }

    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        this.input.up = true;
        break;
      case "KeyS":
      case "ArrowDown":
        this.input.down = true;
        break;
      case "KeyA":
      case "ArrowLeft":
        this.input.left = true;
        break;
      case "KeyD":
      case "ArrowRight":
        this.input.right = true;
        break;
      case "Space":
        // Check if dialog is active first
        if (this.game?.dialog?.getCurrentMessage()) {
          this.game.dialog.advance();
        } else {
          if (!this.input.fire) {
            this.input.firePressed = true;
          }
          this.input.fire = true;
        }
        break;
      case "Enter":
        // Enter key also advances dialog
        if (this.game?.dialog?.getCurrentMessage()) {
          this.game.dialog.advance();
        }
        break;
      case "ShiftLeft":
      case "ShiftRight":
        this.input.shift = true;
        break;
      case "AltLeft":
      case "AltRight":
        this.input.alt = true;
        break;
      case "KeyZ":
        this.input.z = true;
        break;
      case "KeyF":
        this.input.f = true;
        break;
    }
  }

  handleKeyUp(e) {
    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        this.input.up = false;
        break;
      case "KeyS":
      case "ArrowDown":
        this.input.down = false;
        break;
      case "KeyA":
      case "ArrowLeft":
        this.input.left = false;
        break;
      case "KeyD":
      case "ArrowRight":
        this.input.right = false;
        break;
      case "Space":
        this.input.fire = false;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        this.input.shift = false;
        break;
      case "AltLeft":
      case "AltRight":
        this.input.alt = false;
        break;
      case "KeyZ":
        this.input.z = false;
        break;
      case "KeyF":
        this.input.f = false;
        break;
    }
  }

  getTouchPos(evt) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: evt.touches[0].clientX - rect.left,
      y: evt.touches[0].clientY - rect.top,
    };
  }

  handleTouch(evt) {
    evt.preventDefault();

    // Initialize audio context on first touch (mobile requirement)
    if (this.firstTouch) {
      this.firstTouch = false;
      // Notify game that audio can be initialized
      if (this.onFirstTouch) {
        this.onFirstTouch();
      }
    }

    const touchPos = this.getTouchPos(evt);
    
    // Try UI click first, if handled don't fire weapons
    let uiHandled = false;
    if (this.game && this.game.renderer) {
      uiHandled = this.game.renderer.handleClick(touchPos.x, touchPos.y);
    }
    
    // If UI didn't handle the touch, treat it as gameplay input
    if (!uiHandled) {
      this.input.target = touchPos;
      this.input.fire = true;
    }
  }

  handleTouchEnd(evt) {
    this.input.fire = false;
    this.input.target = null;
  }

  setupMouseControls() {
    // Only enable mouse controls on desktop (non-touch devices)
    if (!("ontouchstart" in window)) {
      this.canvas.addEventListener(
        "mousemove",
        this.handleMouseMove.bind(this)
      );
      this.canvas.addEventListener(
        "mousedown",
        this.handleMouseDown.bind(this)
      );
      this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
      this.canvas.addEventListener(
        "mouseleave",
        this.handleMouseLeave.bind(this)
      );
      this.canvas.addEventListener("contextmenu", (e) => e.preventDefault()); // Prevent right-click context menu

      // Track mouse position even when off-screen for aiming
      document.addEventListener(
        "mousemove",
        this.handleDocumentMouseMove.bind(this)
      );
      document.addEventListener(
        "mouseup",
        this.handleDocumentMouseUp.bind(this)
      );
    }
  }

  handleMouseMove(evt) {
    const rect = this.canvas.getBoundingClientRect();
    this.input.mousePosition = {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top,
    };
    
    // Update renderer mouse position for hover states
    if (this.game && this.game.renderer) {
      this.game.renderer.updateMousePosition(
        this.input.mousePosition.x, 
        this.input.mousePosition.y
      );
    }
  }

  handleMouseDown(evt) {
    if (evt.button === 0) {
      // Left mouse button
      const rect = this.canvas.getBoundingClientRect();
      const x = evt.clientX - rect.left;
      const y = evt.clientY - rect.top;
      
      // Try UI click first, if handled don't fire weapons
      let uiHandled = false;
      if (this.game && this.game.renderer) {
        uiHandled = this.game.renderer.handleClick(x, y);
      }
      
      if (!uiHandled) {
        this.input.fire = true;
        this.input.firePressed = true;
      }
    }
    // Right-click functionality removed
  }

  handleMouseUp(evt) {
    if (evt.button === 0) {
      // Left mouse button
      this.input.fire = false;
    }
    // Right-click functionality removed
  }

  handleMouseLeave(evt) {
    // Don't stop firing when cursor leaves screen on desktop
    // Keep the last known mouse position for aiming
    // this.input.fire = false;  // Commented out to allow shooting off-screen
    // this.input.mousePosition = null;  // Keep last position for aiming
  }

  handleDocumentMouseMove(evt) {
    // Update mouse position even when cursor is outside canvas
    const rect = this.canvas.getBoundingClientRect();
    this.input.mousePosition = {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top,
    };
  }

  handleDocumentMouseUp(evt) {
    // Stop firing when mouse is released anywhere on the document
    if (evt.button === 0) {
      // Left mouse button
      this.input.fire = false;
    } else if (evt.button === 2) {
      // Right mouse button
      this.input.rightClick = false;
    }
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
