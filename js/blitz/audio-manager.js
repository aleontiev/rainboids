// Audio management for Rainboids: Blitz

export class AudioManager {
  constructor(game) {
    this.game = game;
    this.audioReady = false;
    this.sounds = {};
    this.backgroundMusic = null;
    this.musicMuted = false;
    this.audioContext = null;
    this.sfxMuted = false;
    this.soundEnabled = true;
    document.addEventListener("touchend", this.startBackgroundMusic);
  }

  setupControls() {
    // Volume button (all sounds)
    const volumeButton = document.getElementById("volume-btn");
    if (volumeButton) {
      const updateVolumeIcon = () => {
        const icon = volumeButton.querySelector("i");
        if (icon) {
          icon.setAttribute(
            "data-lucide",
            this.sfxMuted ? "volume-x" : "volume-2"
          );
          if (typeof lucide !== "undefined") {
            lucide.createIcons();
          }
        }
        volumeButton.classList.toggle("muted", this.sfxMuted);
      };

      volumeButton.addEventListener("click", (e) => {
        e.stopPropagation();
        this.sfxMuted = !this.sfxMuted;
        this.musicMuted = this.sfxMuted;
        if (this.backgroundMusic) {
          this.backgroundMusic.muted = this.musicMuted;
        }
        updateVolumeIcon();
        updateMusicIcon();
      });

      updateVolumeIcon();
    }

    // Music button (music only)
    const musicButton = document.getElementById("music-btn");
    const updateMusicIcon = () => {
      const icon = musicButton.querySelector("i");
      if (icon) {
        icon.setAttribute("data-lucide", "music");
        if (typeof lucide !== "undefined") {
          lucide.createIcons();
        }
      }
      musicButton.classList.toggle("muted", this.musicMuted);
    };

    if (musicButton) {
      musicButton.addEventListener("click", (e) => {
        e.stopPropagation();
        this.musicMuted = !this.musicMuted;
        if (this.backgroundMusic) {
          this.backgroundMusic.muted = this.musicMuted;
        }
        updateMusicIcon();
      });

      updateMusicIcon();
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
      shield: this.generateSfxrSound("powerUp"),
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
        // Simple, subtle laser sound
        synthdef = params.laserShoot();
        synthdef.p_base_freq = 0.5; // Higher pitch, less harsh
        synthdef.p_env_sustain = 0.03; // Very short duration
        synthdef.p_env_decay = 0.08; // Quick decay
        synthdef.p_freq_ramp = -0.2; // Gentle frequency drop
        synthdef.p_lpf_freq = 0.8; // Low pass filter for softer sound
        synthdef.sound_vol = 0.08; // Much lower volume
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

  startBackgroundMusic() {
    // Create background music object now that user has interacted
    if (!this.backgroundMusic) {
      this.backgroundMusic = new Audio("bgm.mp3");
      this.backgroundMusic.loop = true;
      this.backgroundMusic.volume = 0.3;

      // Apply current mute state if applicable
      if (this.musicMuted) {
        this.backgroundMusic.muted = true;
      }

      this.backgroundMusic
        .play()
        .catch((e) => console.log("Background: audio play failed:", e));
    }
  }
  unmuteBackgroundMusic() {
    this.backgroundMusic.muted = false;
  }

  muteBackgroundMusic() {
    this.backgroundMusic.muted = true;
  }

  playSound(sound) {
    if (!this.sfxMuted && sound && sound.play) {
      sound.play();
    }
  }
}
