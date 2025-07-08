# Rainboids - Modular JavaScript Refactor

<img width="928" alt="image" src="https://github.com/user-attachments/assets/f85765c7-a5ab-43eb-b239-cb8b67c861a1" />

<img width="1506" alt="image" src="https://github.com/user-attachments/assets/28b95aa1-11f1-429e-bb72-60c3aa264ea0" />


This is a refactored version of the Rainboids game, broken down into modular JavaScript components for better maintainability and organization.

## Project Structure

```
├── index.html              # Original monolithic version
├── index-modular.html      # New modular version
├── js/
│   ├── main.js            # Main entry point
│   └── modules/
│       ├── constants.js   # Game constants and configuration
│       ├── utils.js       # Utility functions
│       ├── pool-manager.js # Object pooling system
│       ├── audio-manager.js # Audio management
│       ├── input-handler.js # Input handling (keyboard/touch)
│       ├── ui-manager.js  # UI management and overlays
│       ├── game-engine.js # Main game engine
│       └── entities/      # Game entity classes
│           ├── player.js  # Player ship
│           ├── bullet.js  # Bullet projectiles
│           ├── asteroid.js # Asteroid entities
│           ├── particle.js # Particle effects
│           ├── star.js    # Star entities
│           └── line-debris.js # Line debris effects
└── bgm.mp3               # Background music
```

## Module Overview

### Core Modules

- **`main.js`**: Entry point that initializes all modules and starts the game
- **`constants.js`**: All game configuration values and constants
- **`utils.js`**: Helper functions like collision detection, random number generation, etc.
- **`pool-manager.js`**: Object pooling system for efficient memory management

### Management Modules

- **`audio-manager.js`**: Handles sound effects and background music
- **`input-handler.js`**: Manages keyboard and touch input
- **`ui-manager.js`**: Handles all UI elements, overlays, and messages
- **`game-engine.js`**: Main game loop, state management, and collision detection

### Entity Modules

- **`player.js`**: Player ship with movement, shooting, and collision
- **`bullet.js`**: Bullet projectiles with wave motion effects
- **`asteroid.js`**: 3D wireframe asteroids with physics
- **`particle.js`**: Particle effects system (explosions, thrust, etc.)
- **`star.js`**: Star entities with various shapes and behaviors
- **`line-debris.js`**: Line debris from destroyed asteroids

## Usage

### Running the Modular Version

1. Open `index-modular.html` in a web browser
2. The game will automatically initialize and show the title screen
3. Click or press any key to start playing

### Development

The modular structure makes it easy to:

- **Modify game mechanics**: Edit `constants.js` for game balance
- **Add new entities**: Create new classes in the `entities/` folder
- **Change UI behavior**: Modify `ui-manager.js`
- **Add new input methods**: Extend `input-handler.js`
- **Modify audio**: Update `audio-manager.js`

### Key Features

- **Object Pooling**: Efficient memory management for particles and entities
- **Modular Architecture**: Clean separation of concerns
- **ES6 Modules**: Modern JavaScript with import/export
- **Mobile Support**: Touch controls and responsive design
- **Audio Integration**: Sound effects and background music
- **State Management**: Clean game state handling

## Browser Compatibility

The modular version uses ES6 modules, which require:
- Modern browsers with ES6 module support
- HTTPS or localhost (modules don't work with `file://` protocol)

## Migration from Monolithic Version

The original `index.html` contains all code in a single file. The modular version:

1. Separates concerns into logical modules
2. Makes the codebase more maintainable
3. Enables easier testing and debugging
4. Provides better organization for future development

## Building for Production

For production deployment, you may want to:

1. Bundle all modules into a single file using a tool like Webpack or Rollup
2. Minify the JavaScript code
3. Optimize assets (images, audio)

## Contributing

When adding new features:

1. Create new modules in the appropriate directory
2. Follow the existing naming conventions
3. Use ES6 modules for imports/exports
4. Update this README if adding new modules 
