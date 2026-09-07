import * as THREE from 'three';

export class AssetManager {
  constructor(onLoadCallback) {
    let callbackTriggered = false;
    const triggerCallback = () => {
      if (!callbackTriggered) {
        callbackTriggered = true;
        if (onLoadCallback) onLoadCallback();
      }
    };

    this.loadingManager = new THREE.LoadingManager(triggerCallback);
    this.loadingManager.onError = (url) => {
      console.warn('Asset loading notice for:', url);
    };

    // Splash safety fallback - guaranteed transition
    setTimeout(() => {
      triggerCallback();
    }, 1500);

    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
    this.textures = {};
    
    // Load individual assets
    this.loadTexture('arrow', '/assets/bal-kand/aero.png');
    this.loadTexture('background', '/assets/bal-kand/bacground.png');
    this.loadTexture('ram', '/assets/bal-kand/ram_side_anegle.png');
    this.loadTexture('bow', '/assets/bal-kand/training_bow.png');
    this.loadTexture('target', '/assets/bal-kand/training_target_wood.png');
    this.loadTexture('hanuman', '/assets/bal-kand/hanuman.png');
    this.loadTexture('sun', '/assets/bal-kand/sun.png');
    this.loadTexture('level3bg', '/assets/bal-kand/level_3_background.jpg');
    
    // Level 4 Assets
    this.loadTexture('ram_stone_1', '/assets/bal-kand/ram_stone_1.png');
    this.loadTexture('ram_stone_2', '/assets/bal-kand/ram_stone_2.png');
    this.loadTexture('simple_stone_1', '/assets/bal-kand/simple_stone_1.png');
    this.loadTexture('simple_stone_2', '/assets/bal-kand/simple_stone_2.png');
    this.loadTexture('water_river', '/assets/bal-kand/water_river.png');
    
    // Level 6 Assets
    this.loadTexture('ram_bow', '/assets/bal-kand/ram_with_bow_img.png');
    this.loadTexture('ravan', '/assets/bal-kand/rawna.png');

    // Level 5 Assets
    this.loadTexture('golden_deer', '/assets/bal-kand/level_5/golden_deer.png');
    this.loadTexture('cobra', '/assets/bal-kand/level_5/cobra-snake.png');
    this.loadTexture('monkey', '/assets/bal-kand/level_5/monkey.png');
    this.loadTexture('normal_deer', '/assets/bal-kand/level_5/normal_deer.png');
    this.loadTexture('peacock', '/assets/bal-kand/level_5/peacock.png');
    this.loadTexture('rabbit', '/assets/bal-kand/level_5/rabbit.png');
  }
  
  loadTexture(name, path) {
    let basePath = import.meta.env.BASE_URL || '/';
    if (!basePath.endsWith('/')) basePath += '/';
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const fullPath = basePath + cleanPath;
    
    this.textureLoader.load(
      fullPath,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        this.textures[name] = tex;
      },
      undefined,
      (err) => {
        console.warn(`Failed to load texture ${name} from ${fullPath}:`, err);
      }
    );
  }

  getTextureMaterial(name) {
    if (!this.textures[name]) {
      // Fallback if texture hasn't loaded yet
      return new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.5 });
    }
    
    return new THREE.MeshBasicMaterial({ 
      map: this.textures[name], 
      transparent: true,
      side: THREE.DoubleSide
    });
  }
}
