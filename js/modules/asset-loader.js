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
        const audioElements = [
            document.getElementById('background-music')
        ].filter(el => el); // Remove null elements
        this.totalAssets += audioElements.length;
        const audioPromises = audioElements.map((audio, index) => {
            return new Promise((resolve, reject) => {
                if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
                    this.updateProgress();
                    resolve(audio);
                }
                const timeout = setTimeout(() => {
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
                    this.updateProgress();
                    resolve(audio); // Resolve anyway to not block the game
                }, { once: true });
                audio.load();
            });
        });
        const results = await Promise.all(audioPromises);
        return results;
    }

    // Only load audio in loadAllAssets
    async loadAllAssets() {
        this.loadedAssets = 0;
        this.loadingProgress = 0;

        try {
            // Load audio
            await this.loadAudio();
            
            // Small delay to ensure everything is properly initialized
            await new Promise(resolve => setTimeout(resolve, 100));
            
            return true;
        } catch (error) {
            return false;
        }
    }

    // Check if all assets are loaded
    isEverythingLoaded() {
        return this.loadedAssets >= this.totalAssets;
    }
} 