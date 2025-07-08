// Asset loading system with progress tracking
export class AssetLoader {
    constructor() {
        this.loadingProgress = 0;
        this.totalAssets = 0;
        this.loadedAssets = 0;
        this.onProgress = null;
    }

    setProgressCallback(callback) {
        this.onProgress = callback;
    }

    updateProgress() {
        this.loadedAssets++;
        this.loadingProgress = (this.loadedAssets / this.totalAssets) * 100;
        if (this.onProgress) {
            this.onProgress(this.loadingProgress);
        }
    }

    // Load fonts with blocking behavior
    async loadFonts() {
        const fonts = [
            {
                family: 'Press Start 2P',
                src: 'url(../fonts/PressStart2P-Regular.ttf) format("truetype")'
            }
        ];

        this.totalAssets += fonts.length;

        const fontPromises = fonts.map(font => {
            return new Promise((resolve, reject) => {
                try {
                    const fontFace = new FontFace(font.family, font.src);
                    
                    fontFace.load().then(() => {
                        document.fonts.add(fontFace);
                        this.updateProgress();
                        resolve(fontFace);
                    }).catch((error) => {
                        console.warn('Font loading failed:', error);
                        this.updateProgress();
                        resolve(null); // Resolve anyway to not block the game
                    });
                } catch (error) {
                    console.warn('FontFace not supported:', error);
                    this.updateProgress();
                    resolve(null);
                }
            });
        });

        return Promise.all(fontPromises);
    }

    // Load audio with blocking behavior
    async loadAudio() {
        const audioElements = [
            document.getElementById('background-music')
        ].filter(el => el); // Remove null elements

        this.totalAssets += audioElements.length;

        const audioPromises = audioElements.map(audio => {
            return new Promise((resolve, reject) => {
                if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
                    this.updateProgress();
                    resolve(audio);
                } else {
                    const timeout = setTimeout(() => {
                        console.warn('Audio loading timeout');
                        this.updateProgress();
                        resolve(audio); // Resolve anyway to not block the game
                    }, 10000); // 10 second timeout
                    
                    audio.addEventListener('canplaythrough', () => {
                        clearTimeout(timeout);
                        this.updateProgress();
                        resolve(audio);
                    }, { once: true });
                    
                    audio.addEventListener('error', (e) => {
                        clearTimeout(timeout);
                        console.warn('Audio loading failed:', e);
                        this.updateProgress();
                        resolve(audio); // Resolve anyway to not block the game
                    }, { once: true });

                    // Start loading
                    audio.load();
                }
            });
        });

        return Promise.all(audioPromises);
    }

    // Load all assets
    async loadAllAssets() {
        this.loadedAssets = 0;
        this.loadingProgress = 0;

        try {
            // Load fonts first (blocking)
            await this.loadFonts();
            
            // Load audio
            await this.loadAudio();
            
            // Small delay to ensure everything is properly initialized
            await new Promise(resolve => setTimeout(resolve, 100));
            
            return true;
        } catch (error) {
            console.error('Asset loading failed:', error);
            return false;
        }
    }

    // Check if all assets are loaded
    isEverythingLoaded() {
        return this.loadedAssets >= this.totalAssets;
    }
} 