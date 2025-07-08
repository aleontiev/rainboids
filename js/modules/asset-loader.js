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
        console.log('AssetLoader: Starting font loading...');
        const fonts = [
            {
                family: 'Press Start 2P',
                src: 'url(../fonts/PressStart2P-Regular.ttf) format("truetype")'
            }
        ];

        this.totalAssets += fonts.length;
        console.log(`AssetLoader: Total assets to load: ${this.totalAssets}`);

        const fontPromises = fonts.map(font => {
            return new Promise((resolve, reject) => {
                console.log(`AssetLoader: Loading font: ${font.family} from ${font.src}`);
                try {
                    const fontFace = new FontFace(font.family, font.src);
                    
                    fontFace.load().then(() => {
                        console.log(`AssetLoader: Font loaded successfully: ${font.family}`);
                        document.fonts.add(fontFace);
                        this.updateProgress();
                        resolve(fontFace);
                    }).catch((error) => {
                        console.error('AssetLoader: Font loading failed:', error);
                        this.updateProgress();
                        resolve(null); // Resolve anyway to not block the game
                    });
                } catch (error) {
                    console.error('AssetLoader: FontFace not supported:', error);
                    this.updateProgress();
                    resolve(null);
                }
            });
        });

        const results = await Promise.all(fontPromises);
        console.log('AssetLoader: Font loading complete, results:', results);
        return results;
    }

    // Load audio with blocking behavior
    async loadAudio() {
        console.log('AssetLoader: Starting audio loading...');
        const audioElements = [
            document.getElementById('background-music')
        ].filter(el => el); // Remove null elements

        console.log('AssetLoader: Found audio elements:', audioElements.length);
        this.totalAssets += audioElements.length;

        const audioPromises = audioElements.map((audio, index) => {
            return new Promise((resolve, reject) => {
                console.log(`AssetLoader: Loading audio ${index + 1}, readyState: ${audio.readyState}, src: ${audio.src}`);
                
                if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
                    console.log(`AssetLoader: Audio ${index + 1} already loaded`);
                    this.updateProgress();
                    resolve(audio);
                } else {
                    const timeout = setTimeout(() => {
                        console.error(`AssetLoader: Audio ${index + 1} loading timeout`);
                        this.updateProgress();
                        resolve(audio); // Resolve anyway to not block the game
                    }, 10000); // 10 second timeout
                    
                    audio.addEventListener('canplaythrough', () => {
                        clearTimeout(timeout);
                        console.log(`AssetLoader: Audio ${index + 1} loaded successfully`);
                        this.updateProgress();
                        resolve(audio);
                    }, { once: true });
                    
                    audio.addEventListener('error', (e) => {
                        clearTimeout(timeout);
                        console.error(`AssetLoader: Audio ${index + 1} loading failed:`, e);
                        this.updateProgress();
                        resolve(audio); // Resolve anyway to not block the game
                    }, { once: true });

                    // Start loading
                    console.log(`AssetLoader: Starting audio ${index + 1} load`);
                    audio.load();
                }
            });
        });

        const results = await Promise.all(audioPromises);
        console.log('AssetLoader: Audio loading complete, results:', results);
        return results;
    }

    // Load all assets
    async loadAllAssets() {
        this.loadedAssets = 0;
        this.loadingProgress = 0;

        try {
            // Load fonts first (blocking)
            console.log('AssetLoader: Starting font loading...');
            const fontResults = await this.loadFonts();
            console.log('AssetLoader: Font loading results:', fontResults);
            
            // Verify font is actually loaded
            await this.verifyFontLoaded();
            
            // Load audio
            console.log('AssetLoader: Starting audio loading...');
            await this.loadAudio();
            
            // Small delay to ensure everything is properly initialized
            await new Promise(resolve => setTimeout(resolve, 100));
            
            console.log('AssetLoader: All assets loaded successfully');
            return true;
        } catch (error) {
            console.error('AssetLoader: Asset loading failed:', error);
            return false;
        }
    }

    // Verify that the font is actually loaded and available
    async verifyFontLoaded() {
        console.log('AssetLoader: Verifying font is loaded...');
        
        // Wait for fonts to be ready
        await document.fonts.ready;
        console.log('AssetLoader: Document fonts ready');
        
        // Check if our font is loaded
        const fontLoaded = document.fonts.check('12px "Press Start 2P"');
        console.log('AssetLoader: Font check result:', fontLoaded);
        
        if (!fontLoaded) {
            console.warn('AssetLoader: Font not loaded, waiting...');
            // Wait a bit more and try again
            await new Promise(resolve => setTimeout(resolve, 500));
            const fontLoaded2 = document.fonts.check('12px "Press Start 2P"');
            console.log('AssetLoader: Font check result after wait:', fontLoaded2);
        }
    }

    // Check if all assets are loaded
    isEverythingLoaded() {
        return this.loadedAssets >= this.totalAssets;
    }
} 