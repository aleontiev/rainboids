export class IconManager {
  constructor(game) {
    this.game = game;
  }
  setup() {
    // Initialize Lucide icons
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  }
}

