// Audio management for Rainboids: Blitz

export class AudioManager {
  constructor() {
    this.audioReady = false;
    this.sounds = {};
    this.backgroundMusic = null;
    this.sfxMuted = false;
    this.musicMuted = false;
    this.audioContext = null;
    this.soundEnabled = true;
    this.musicEnabled = true;
  }

  setupAudio() {
    // Initialize audio
    this.audioReady = false;
    this.sounds = {
      shoot: this.generateSfxrSound("laserShoot"),
      hit: this.generateSfxrSound("hitHurt"),
      explosion: this.generateSfxrSound("explosion"),
      enemyExplosion: this.generateSfxrSound("enemyExplosion"),
      asteroidExplosion: this.generateSfxrSound("asteroidExplosion"),
      playerExplosion: this.generateSfxrSound("playerExplosion"),
      dash: this.generateSfxrSound("powerUp"), // TODO: rename to shield
    };

    // Background music (will be initialized after user interaction)
    this.backgroundMusic = null;
  }

  generateSfxrSound(presetName) {
    try {
      let params;
      switch (presetName) {
        case "laserShoot":
          params = [3, , 0.15, , 0.1, 0.3, , 0.3, , , , , , 0.6, , , , , 1, , , 0.1, , 0.5];
          break;
        case "hitHurt":
          params = [3, , 0.16, , 0.18, 0.47, , -0.46, , , , , , 0.63, , , , , 1, , , , , 0.5];
          break;
        case "explosion":
          params = [3, , 0.3, 0.5, 0.3, 0.1, , -0.3, , , , 0.3, 0.3, , , , , , 1, , , , , 0.5];
          break;
        case "enemyExplosion":
          params = [3, , 0.25, 0.4, 0.25, 0.15, , -0.25, , , , 0.25, 0.25, , , , , , 1, , , , , 0.5];
          break;
        case "asteroidExplosion":
          params = [3, , 0.2, 0.3, 0.2, 0.2, , -0.2, , , , 0.2, 0.2, , , , , , 1, , , , , 0.5];
          break;
        case "playerExplosion":
          params = [3, , 0.4, 0.6, 0.4, 0.05, , -0.4, , , , 0.4, 0.4, , , , , , 1, , , , , 0.5];
          break;
        case "powerUp":
          params = [0, , 0.15, , 0.3, 0.6, , 0.3, , , , , , 0.4, , , , , 1, , , , , 0.5];
          break;
        default:
          params = [0, , 0.1, , 0.1, 0.3, , , , , , , , , , , , , 1, , , , , 0.5];
      }

      const sound = new SfxrParams(params);
      return sound;
    } catch (error) {
      console.warn(`Failed to generate sound ${presetName}:`, error);
      return null;
    }
  }

  initializeAudioOnFirstTouch() {
    if (this.audioReady) return;

    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Resume audio context if suspended (required on some browsers)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      // Initialize background music
      if (this.musicEnabled) {
        this.initializeBackgroundMusic();
      }

      this.audioReady = true;
      console.log("Audio initialized successfully");
    } catch (error) {
      console.warn("Failed to initialize audio:", error);
      this.audioReady = false;
    }
  }

  initializeBackgroundMusic() {
    try {
      // Only initialize if we don't already have music and audio is ready
      if (!this.backgroundMusic && this.audioContext) {
        // Create a simple background drone/music
        this.backgroundMusic = {
          oscillator: null,
          gainNode: null,
          isPlaying: false
        };
        
        // Start background music if enabled
        if (this.musicEnabled) {
          this.startBackgroundMusic();
        }
      }
    } catch (error) {
      console.warn("Failed to initialize background music:", error);
    }
  }

  startBackgroundMusic() {
    try {
      if (!this.audioContext || !this.musicEnabled || this.musicMuted) return;
      
      if (this.backgroundMusic && !this.backgroundMusic.isPlaying) {
        // Create a simple ambient tone
        this.backgroundMusic.oscillator = this.audioContext.createOscillator();
        this.backgroundMusic.gainNode = this.audioContext.createGain();
        
        this.backgroundMusic.oscillator.type = 'sine';
        this.backgroundMusic.oscillator.frequency.setValueAtTime(110, this.audioContext.currentTime); // Low A
        this.backgroundMusic.gainNode.gain.setValueAtTime(0.02, this.audioContext.currentTime); // Very quiet
        
        this.backgroundMusic.oscillator.connect(this.backgroundMusic.gainNode);
        this.backgroundMusic.gainNode.connect(this.audioContext.destination);
        
        this.backgroundMusic.oscillator.start();
        this.backgroundMusic.isPlaying = true;
      }
    } catch (error) {
      console.warn("Failed to start background music:", error);
    }
  }

  stopBackgroundMusic() {
    try {
      if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
        if (this.backgroundMusic.oscillator) {
          this.backgroundMusic.oscillator.stop();
          this.backgroundMusic.oscillator.disconnect();
        }
        this.backgroundMusic.isPlaying = false;
        this.backgroundMusic.oscillator = null;
      }
    } catch (error) {
      console.warn("Failed to stop background music:", error);
    }
  }

  playSound(sound) {
    if (!this.audioReady || !sound || this.sfxMuted || !this.soundEnabled) {
      return;
    }

    try {
      const audioBuffer = sound.synth(this.audioContext);
      if (audioBuffer) {
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);
        source.start();
      }
    } catch (error) {
      console.warn("Failed to play sound:", error);
    }
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    this.musicMuted = !this.musicEnabled;
    
    if (this.musicEnabled) {
      this.startBackgroundMusic();
    } else {
      this.stopBackgroundMusic();
    }
    
    return this.musicEnabled;
  }

  toggleSounds() {
    this.soundEnabled = !this.soundEnabled;
    this.sfxMuted = !this.soundEnabled;
    return this.soundEnabled;
  }
}