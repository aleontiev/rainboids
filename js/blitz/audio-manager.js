// Audio management for Rainboids: Blitz

export class AudioManager {
  constructor(game) {
    this.game = game;
    this.audioReady = false;
    this.sounds = {};
    this.backgroundMusic = null;
    this.musicMuted = false;
    this.soundMuted = false;
    document.addEventListener("touchend", this.startBackgroundMusic.bind(this));
    document.addEventListener("click", this.startBackgroundMusic.bind(this));
  }

  setupControls() {
    // Music button (music only)
    const musicButton = document.getElementById("music-btn");
    const volumeButton = document.getElementById("volume-btn");
    const updateMusicIcon = () => {
      musicButton.classList.toggle("muted", this.musicMuted);
    };
    const updateVolumeIcon = () => {
      volumeButton.classList.toggle("muted", this.soundMuted);
    };

    const musicButtonClicked = (e) => {
      e.stopPropagation();
      this.musicMuted = !this.musicMuted;
      if (this.backgroundMusic) {
        this.backgroundMusic.muted = this.musicMuted || this.soundMuted;
      }
      updateMusicIcon();
    };
    const volumeButtonClicked = (e) => {
      e.stopPropagation();
      this.soundMuted = !this.soundMuted;
      if (this.backgroundMusic) {
        this.backgroundMusic.muted = this.soundMuted || this.musicMuted;
      }
      updateVolumeIcon();
    };
    if (musicButton) {
      if (this.game.isMobile) {
        musicButton.addEventListener("touchend", musicButtonClicked);
      } else {
        musicButton.addEventListener("click", musicButtonClicked);
      }
      updateMusicIcon();
    }

    if (volumeButton) {
      if (this.game.isMobile) {
        volumeButton.addEventListener("touchend", volumeButtonClicked);
      } else {
        volumeButton.addEventListener("click", volumeButtonClicked);
      }
      updateVolumeIcon();
    }
  }

  setup() {
    // Initialize audio
    this.sounds = {
      shoot: this.generateSfxrSound("laserShoot"),
      hit: this.generateSfxrSound("hitHurt"),
      explosion: this.generateSfxrSound("explosion"),
      enemyExplosion: this.generateSfxrSound("enemyExplosion"),
      asteroidExplosion: this.generateSfxrSound("asteroidExplosion"),
      playerExplosion: this.generateSfxrSound("playerExplosion"),
      shield: this.generateSfxrSound("jump"),
      powerUp: this.generateSfxrSound("pickupCoin"),
    };
  }
  ready() {
    this.audioReady = true;
  }

  generateSfxrSound(type) {
    // Generate sound using sfxr.js for authentic retro game audio
    let synthdef;
    const params = new Params();

    switch (type) {
      case "laserShoot":
        // High-pitched pYOO pYOO laser sound
        synthdef = params.laserShoot();
        synthdef.sound_vol = 0.05; // More audible
        break;
      case "hitHurt":
        synthdef = params.hitHurt();
        synthdef.sound_vol = 0.2; // Reduced volume
        synthdef.p_env_sustain = 0.1; // Shorter duration
        break;
      case "explosion":
        synthdef = params.explosion();
        synthdef.sound_vol = 0.12; // Further reduced volume
        synthdef.p_env_sustain = 0.08; // Shorter duration
        synthdef.p_env_decay = 0.15; // Quicker decay
        synthdef.p_lpf_freq = 0.6; // Low pass filter for smoother sound
        synthdef.p_hpf_freq = 0.1; // High pass filter to reduce harshness
        break;
      case "enemyExplosion":
        // Custom enemy explosion - shorter, higher pitch, very subtle
        synthdef = params.explosion();
        synthdef.p_base_freq = 0.4 + Math.random() * 0.2;
        synthdef.p_env_sustain = 0.04 + Math.random() * 0.03;
        synthdef.p_env_decay = 0.08 + Math.random() * 0.08;
        synthdef.p_lpf_freq = 0.7 + Math.random() * 0.2; // Smoother filtering
        synthdef.p_hpf_freq = 0.1; // Reduce low-end harshness
        synthdef.sound_vol = 0.08; // Much more subdued
        break;
      case "asteroidExplosion":
        // Custom asteroid explosion - deeper, but more subtle
        synthdef = params.explosion();
        synthdef.p_base_freq = 0.18 + Math.random() * 0.08;
        synthdef.p_env_sustain = 0.08 + Math.random() * 0.1;
        synthdef.p_env_decay = 0.15 + Math.random() * 0.2;
        synthdef.p_lpf_freq = 0.5 + Math.random() * 0.2; // Smoother filtering
        synthdef.p_hpf_freq = 0.05; // Reduce harshness
        synthdef.sound_vol = 0.1; // More subdued
        break;
      case "playerExplosion":
        // Custom player explosion - extremely subtle and soft
        synthdef = params.explosion();
        synthdef.p_base_freq = 0.1 + Math.random() * 0.05; // Even lower frequency
        synthdef.p_env_sustain = 0.4 + Math.random() * 0.1; // Longer sustain for smoothness
        synthdef.p_env_decay = 0.8 + Math.random() * 0.2; // Very long decay
        synthdef.p_repeat_speed = 0.02 + Math.random() * 0.02; // Much slower repeat
        synthdef.p_lpf_freq = 0.2 + Math.random() * 0.1; // Heavy low-pass filtering
        synthdef.sound_vol = 0.04; // Extremely subtle volume
        break;
      case "powerUp":
        synthdef = params.powerUp();
        synthdef.sound_vol = 0.18; // Reduced volume
        synthdef.p_env_sustain = 0.1; // Shorter duration
        break;
      default:
        synthdef = params.explosion();
        synthdef.sound_vol = 0.2;
    }

    return {
      play: () => {
        if (!this.audioReady) return;
        try {
          sfxr.play(synthdef);
        } catch (e) {
          console.log("Sfx: audio play failed:", e);
        }
      },
    };
  }

  toggleBackgroundMusic(force = null) {
    if (force !== null) {
      this.backgroundMusic.muted = force;
    } else {
      this.backgroundMusic.muted = !this.backgroundMusic.muted;
    }
  }

  startBackgroundMusic() {
    // Create background music object now that user has interacted
    if (!this.backgroundMusic) {
      this.backgroundMusic = new Audio("bgm.mp3");
      this.backgroundMusic.loop = true;
      this.backgroundMusic.volume = 0.3;

      this.toggleBackgroundMusic(this.musicMuted);
    }
    
    // Only play if not muted
    if (!this.backgroundMusic.muted) {
      this.backgroundMusic
        .play()
        .catch((e) => console.log("Background: audio play failed:", e));
    }
  }

  pauseBackgroundMusic() {
    if (this.backgroundMusic && !this.backgroundMusic.paused) {
      this.backgroundMusic.pause();
    }
  }

  resumeBackgroundMusic() {
    if (this.backgroundMusic && this.backgroundMusic.paused && !this.backgroundMusic.muted) {
      this.backgroundMusic
        .play()
        .catch((e) => console.log("Background: audio resume failed:", e));
    }
  }

  restartBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.currentTime = 0; // Reset to beginning
      if (!this.backgroundMusic.muted) {
        this.backgroundMusic
          .play()
          .catch((e) => console.log("Background: audio restart failed:", e));
      }
    }
  }

  playSound(sound) {
    if (!this.soundMuted && sound && sound.play) {
      sound.play();
    }
  }
}
