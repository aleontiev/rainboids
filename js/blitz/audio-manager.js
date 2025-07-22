// Audio management for Rainboids: Blitz

export class AudioManager {
  constructor(game) {
    this.game = game;
    this.audioReady = false;
    this.sounds = {};
    this.backgroundMusic = null;
    this.musicMuted = false;
    this.soundMuted = false;
    this.continuousLaserSound = null;
    this.laserSoundPlaying = false;
  }

  setup() {
    // Initialize audio
    this.sounds = {
      shoot: this.generateSfxrSound("laserShoot"),
      hit: this.generateSfxrSound("hitHurt"),
      explosion: this.generateSfxrSound("explosion"),
      bombExplosion: this.generateSfxrSound("bombExplosion"),
      enemyExplosion: this.generateSfxrSound("enemyExplosion"),
      asteroidExplosion: this.generateSfxrSound("asteroidExplosion"),
      playerExplosion: this.generateSfxrSound("playerExplosion"),
      shield: this.generateSfxrSound("laserShield"),
      timeSlow: this.generateSfxrSound("timeSlow"),
      powerUp: this.generateSfxrSound("pickupCoin"),
      continuousLaser: this.generateSfxrSound("continuousLaser"),
      miniBossExplosion: this.generateSfxrSound("miniBossExplosion"),
      bossExplosion: this.generateSfxrSound("bossExplosion"),
      megaExplosion: this.generateSfxrSound("megaExplosion"),
      megaBossExplosion: this.generateSfxrSound("megaBossExplosion"),
    };
    // Music/volume button state is now handled by canvas renderer
    // Button states available via this.musicMuted and this.soundMuted
    // Button clicks handled via this.toggleMusic() and this.toggleSound() methods
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
        // Similar to asteroid explosion but with more emphasis and metallic quality
        synthdef = params.explosion();
        synthdef.p_base_freq = 0.15 + Math.random() * 0.05; // Lower than asteroid for more impact
        synthdef.p_env_sustain = 0.06 + Math.random() * 0.04; // Shorter than asteroid for punch
        synthdef.p_env_decay = 0.12 + Math.random() * 0.08; // Quicker decay
        synthdef.p_lpf_freq = 0.6 + Math.random() * 0.2; // Smoother filtering like asteroid
        synthdef.p_hpf_freq = 0.08; // Slight high-pass to clean up
        synthdef.p_repeat_speed = 0.4; // Faster repeat for metallic texture
        synthdef.p_pha_offset = 0.2; // Add phaser for metallic quality
        synthdef.p_pha_ramp = -0.1; // Phaser sweep
        synthdef.sound_vol = 0.14; // Louder than asteroid hit for emphasis
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
      case "continuousLaser":
        // Pleasant yet powerful continuous laser sound
        synthdef = new Params(); // Start fresh
        synthdef.wave_type = 2; // SINE wave for clean, pleasant sound
        synthdef.p_base_freq = 0.45; // Mid-range frequency, not too high or low
        synthdef.p_env_attack = 0.05; // Quick attack for immediate response
        synthdef.p_env_sustain = 0.7; // Long sustain for continuous effect
        synthdef.p_env_decay = 0.3; // Moderate decay
        synthdef.p_freq_ramp = -0.2; // Slight downward sweep for power
        synthdef.p_vib_strength = 0.08; // Slight vibrato for richness
        synthdef.p_vib_speed = 0.5; // Moderate vibrato speed
        synthdef.p_lpf_freq = 0.8; // Light filtering to smooth harsh edges
        synthdef.sound_vol = 0.06; // Audible but not overwhelming
        break;
      case "bombExplosion":
        // Dramatic bomb explosion - bigger, louder, more impactful
        synthdef = params.explosion();
        synthdef.sound_vol = 0.25; // Louder for dramatic effect
        synthdef.p_env_sustain = 0.15; // Longer duration
        synthdef.p_env_decay = 0.25; // Slower decay for lasting impact
        synthdef.p_base_freq = 0.3; // Lower frequency for deeper boom
        synthdef.p_freq_ramp = -0.3; // Deeper downward sweep
        synthdef.p_lpf_freq = 0.7; // More filtering for smoother sound
        synthdef.p_hpf_freq = 0.05; // Keep some low end
        synthdef.p_pha_offset = 0.2; // Add some phaser for richness
        synthdef.p_pha_ramp = -0.1; // Phaser sweep
        break;
      case "miniBossExplosion":
        // Enhanced miniboss explosion - more dramatic than regular enemies
        synthdef = params.explosion();
        synthdef.sound_vol = 0.18; // Moderate volume for cascading effect
        synthdef.p_env_sustain = 0.12; // Medium duration
        synthdef.p_env_decay = 0.2; // Good decay for impact
        synthdef.p_base_freq = 0.25 + Math.random() * 0.1; // Varied frequency
        synthdef.p_freq_ramp = -0.25; // Downward sweep
        synthdef.p_lpf_freq = 0.65; // Smooth filtering
        synthdef.p_hpf_freq = 0.03; // Some low end
        synthdef.p_repeat_speed = 0.05 + Math.random() * 0.03; // Slight variation
        break;
      case "bossExplosion":
        // Boss explosion - deeper and more powerful than miniboss
        synthdef = params.explosion();
        synthdef.sound_vol = 0.22; // Higher volume for boss
        synthdef.p_env_sustain = 0.18; // Longer duration
        synthdef.p_env_decay = 0.3; // Extended decay
        synthdef.p_base_freq = 0.2 + Math.random() * 0.08; // Lower, varied frequency
        synthdef.p_freq_ramp = -0.35; // Deeper downward sweep
        synthdef.p_lpf_freq = 0.6; // More filtering for smoothness
        synthdef.p_hpf_freq = 0.02; // Keep low end for power
        synthdef.p_pha_offset = 0.15 + Math.random() * 0.1; // Varied phaser
        synthdef.p_pha_ramp = -0.08; // Phaser sweep
        break;
      case "megaExplosion":
        // Mega explosion for final miniboss death
        synthdef = params.explosion();
        synthdef.sound_vol = 0.35; // Very loud
        synthdef.p_env_sustain = 0.25; // Long duration
        synthdef.p_env_decay = 0.4; // Very long decay
        synthdef.p_base_freq = 0.15; // Very low frequency
        synthdef.p_freq_ramp = -0.4; // Deep downward sweep
        synthdef.p_lpf_freq = 0.5; // Heavy filtering
        synthdef.p_hpf_freq = 0.01; // Keep all low end
        synthdef.p_pha_offset = 0.3; // Strong phaser effect
        synthdef.p_pha_ramp = -0.15; // Long phaser sweep
        synthdef.p_repeat_speed = 0.02; // Very slow repeat for rumble
        break;
      case "megaBossExplosion":
        // Ultimate boss explosion - the most dramatic
        synthdef = params.explosion();
        synthdef.sound_vol = 0.4; // Maximum volume
        synthdef.p_env_sustain = 0.3; // Very long duration
        synthdef.p_env_decay = 0.5; // Extremely long decay
        synthdef.p_base_freq = 0.12; // Extremely low frequency
        synthdef.p_freq_ramp = -0.45; // Massive downward sweep
        synthdef.p_lpf_freq = 0.45; // Heavy low-pass filtering
        synthdef.p_hpf_freq = 0.005; // Keep all the bass
        synthdef.p_pha_offset = 0.35; // Maximum phaser effect
        synthdef.p_pha_ramp = -0.2; // Very long phaser sweep
        synthdef.p_repeat_speed = 0.015; // Slowest repeat for deep rumble
        synthdef.p_arp_speed = 0.1; // Add arpeggio for complexity
        break;
      case "laserShield":
        // Crisp laser shield activation - "shiiiiiing" sound
        synthdef = new Params(); // Start fresh for custom shield sound
        synthdef.wave_type = 2; // SINE wave for clean, crisp sound
        synthdef.p_base_freq = 0.8; // High frequency for crisp start
        synthdef.p_env_attack = 0.001; // Instant attack for crisp activation
        synthdef.p_env_sustain = 0.15; // Medium sustain for the "shiiiing"
        synthdef.p_env_decay = 0.4; // Long decay for trailing off
        synthdef.p_freq_ramp = -0.3; // Downward frequency sweep for "shiiiing" effect
        synthdef.p_lpf_freq = 0.9; // High-pass most frequencies for clarity
        synthdef.p_lpf_resonance = 0.4; // Some resonance for metallic quality
        synthdef.p_hpf_freq = 0.2; // Cut low frequencies for crispness
        synthdef.p_vib_strength = 0.1; // Slight vibrato for laser quality
        synthdef.p_vib_speed = 0.8; // Fast vibrato
        synthdef.sound_vol = 0.18; // Clear but not overwhelming
        break;
      case "timeSlow":
        // Deep boom effect that slows down - sudden impact transitioning to slow motion
        synthdef = new Params(); // Start fresh for custom time slow sound
        synthdef.wave_type = 0; // SQUARE wave for punchy boom start
        synthdef.p_base_freq = 0.3; // Lower frequency for deeper boom
        synthdef.p_env_attack = 0.01; // Very quick attack for sudden boom
        synthdef.p_env_sustain = 0.2; // Short sustain for initial boom
        synthdef.p_env_decay = 0.9; // Very long decay for slow-down effect
        synthdef.p_freq_ramp = -0.7; // Strong downward frequency sweep for dramatic slowing
        synthdef.p_freq_dramp = -0.3; // Additional frequency drop acceleration
        synthdef.p_lpf_freq = 0.8; // Start with less filtering for initial boom clarity
        synthdef.p_lpf_ramp = -0.5; // Strong filter sweep down for muffling effect
        synthdef.p_hpf_freq = 0.05; // Minimal high-pass to keep the deep bass
        synthdef.p_vib_strength = 0.2; // More vibrato for texture
        synthdef.p_vib_speed = 0.8; // Start with faster vibrato that slows with frequency
        synthdef.p_pha_offset = 0.4; // Strong phaser for spatial/time effect
        synthdef.p_pha_ramp = -0.25; // Phaser sweep for warping effect
        synthdef.p_repeat_speed = 0.1; // Slight repeat for rumble texture
        synthdef.sound_vol = 0.2; // Louder for more impact
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

  initBackgroundMusic() {
    if (!this.backgroundMusic) {
      this.backgroundMusic = new Audio("bgm.mp3");
      this.backgroundMusic.loop = true;
      this.backgroundMusic.volume = 0.3;
      this.toggleBackgroundMusic(this.musicMuted);
    }
  }

  startBackgroundMusic() {
    // Only play if not muted
    if (this.backgroundMusic && !this.backgroundMusic.muted) {
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
    if (
      this.backgroundMusic &&
      this.backgroundMusic.paused &&
      !this.backgroundMusic.muted
    ) {
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

  play(sound) {
    if (!this.soundMuted && sound && sound.play) {
      sound.play();
    }
  }

  startContinuousLaser() {
    if (!this.laserSoundPlaying && !this.soundMuted) {
      this.laserSoundPlaying = true;
      this.continuousLaserLoop();
    }
  }

  stopContinuousLaser() {
    this.laserSoundPlaying = false;
  }

  continuousLaserLoop() {
    if (this.laserSoundPlaying && !this.soundMuted) {
      this.play(this.sounds.continuousLaser);
      // Schedule next laser sound to create continuous effect
      setTimeout(() => {
        this.continuousLaserLoop();
      }, 250); // Responsive interval for smooth continuous sound
    }
  }

  toggleMusic() {
    this.musicMuted = !this.musicMuted;
    if (this.backgroundMusic) {
      this.backgroundMusic.muted = this.musicMuted;
    }
  }

  toggleSound() {
    this.soundMuted = !this.soundMuted;
    if (this.laserSoundPlaying && this.soundMuted) {
      this.stopContinuousLaser();
    }
  }
}
