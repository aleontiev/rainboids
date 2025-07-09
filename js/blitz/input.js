// Input handling for keyboard and touch controls

export class InputHandler {
  constructor(canvas) {
    this.canvas = canvas;
    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      fire: false,
      firePressed: false,
      shift: false,
      joystickX: 0,
      joystickY: 0,
      target: null,
    };

    this.joystickActive = false;
    this.joystickMaxDist = 0;

    this.setupKeyboardControls();
    this.setupTouchControls();
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
        if (!this.input.fire) {
          this.input.firePressed = true;
        }
        this.input.fire = true;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        this.input.shift = true;
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
    const touchPos = this.getTouchPos(evt);
    this.input.target = touchPos;
    this.input.fire = true;
  }

  handleTouchEnd(evt) {
    this.input.fire = false;
    this.input.target = null;
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

