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

    // Only load audio in loadAllAssets
    async loadAllAssets() {
        this.loadedAssets = 0;
        this.loadingProgress = 0;

        try {
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

    // Check if all assets are loaded
    isEverythingLoaded() {
        return this.loadedAssets >= this.totalAssets;
    }
} 