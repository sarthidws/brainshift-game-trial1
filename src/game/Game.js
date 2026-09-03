import { BalKandLevel1 } from '../levels/BalKandLevel1.js';
import { BalKandLevel2 } from '../levels/BalKandLevel2.js';
import { BalKandLevel3 } from '../levels/BalKandLevel3.js';
import { BalKandLevel4 } from '../levels/BalKandLevel4.js';
import { BalKandLevel5 } from '../levels/BalKandLevel5.js';
import { AssetManager } from './AssetManager.js';
import { InputManager } from './InputManager.js';
import * as THREE from 'three';

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xFFF9F0); 
    
    const aspect = window.innerWidth / window.innerHeight;
    const viewSize = 20;
    this.camera = new THREE.OrthographicCamera(-viewSize * aspect, viewSize * aspect, viewSize, -viewSize, 0.1, 1000);
    this.camera.position.set(0, 0, 10);
    
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    this.inputManager = new InputManager();
    this.assetManager = new AssetManager();
    this.clock = new THREE.Clock();
    
    // Minimal Player mock
    this.player = { mesh: new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()) };
    
    // Minimal GameState mock
    this.gameState = { wisdom: 0, unlockedLevels: 7, save: () => {}, currentLevel: 6 };
    
    // Light
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(10, 20, 10);
    this.scene.add(light);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    
    this.currentLevelObj = null;
    this.hintCredits = 20;

    this.levels = [
      { id: 1, name: 'The First Arrow', hint: 'Watch where the arrow needs to go.', completed: true },
      { id: 2, name: 'The Training Target', hint: 'Look carefully at the target.', completed: true },
      { id: 3, name: 'The Sun and Hanuman', hint: 'Give Hanuman the fruit.', completed: true },
      { id: 4, name: 'Build the Bridge', hint: 'Not every stone belongs to the bridge.', completed: true },
      { id: 5, name: 'The Golden Deer', hint: 'Only one deer is your target.', completed: false, current: true }
    ];
    
    window.addEventListener('resize', () => this.onWindowResize());
  }
  
  onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const viewSize = 20;
    this.camera.left = -viewSize * aspect;
    this.camera.right = viewSize * aspect;
    this.camera.top = viewSize;
    this.camera.bottom = -viewSize;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  init() {
    this.setupUI();
    const loader = document.getElementById('loading-screen');
    if (loader) loader.classList.remove('active');
    
    // Splash screen transitions to main menu via setupUI timeout
    this.animate();
  }
  
  setupUI() {
    setTimeout(() => {
      this.showScreen('main-menu');
    }, 2000);

    document.getElementById('btn-play').addEventListener('click', () => {
      this.startGame(1);
    });
    
    document.getElementById('btn-levels').addEventListener('click', () => {
      this.showScreen('chapter-menu');
    });
    
    document.getElementById('btn-how').addEventListener('click', () => {
      this.showScreen('how-to-play');
    });

    document.getElementById('btn-back-chapters').addEventListener('click', () => {
      this.showScreen('main-menu');
    });

    document.getElementById('btn-back-levels').addEventListener('click', () => {
      this.showScreen('chapter-menu');
    });

    document.getElementById('btn-back-how').addEventListener('click', () => {
      this.showScreen('main-menu');
    });

    const btnNextLevel = document.getElementById('btn-next-level');
    if (btnNextLevel) {
      btnNextLevel.addEventListener('click', () => {
        this.renderLevelSelect();
        this.showScreen('level-select-menu');
      });
    }

    document.getElementById('chap-1').addEventListener('click', () => {
      this.renderLevelSelect();
      this.showScreen('level-select-menu');
    });
  }

  renderLevelSelect() {
    const list = document.getElementById('levels-grid');
    list.innerHTML = '';
    
    this.levels.forEach(level => {
      const el = document.createElement('div');
      el.className = 'level-card';
      if (level.completed) el.classList.add('completed');
      if (level.current) el.classList.add('current');
      if (level.locked) el.classList.add('locked');
      
      el.innerHTML = `
        <div style="font-size: 1.5rem; font-family: var(--font-display);">${level.id}</div>
        <div style="font-size: 1rem; margin-top: 5px;">${level.completed ? '✓' : (level.locked ? '🔒' : '▶')}</div>
      `;
      
      if (!level.locked) {
        el.onclick = () => this.startGame(level.id);
      }
      
      list.appendChild(el);
    });
  }
  
  startGame(levelId) {
    if (this.currentLevelObj && this.currentLevelObj.cleanup) this.currentLevelObj.cleanup();
    this.scene.children = this.scene.children.filter(c => !c.isLevelObject); // cleanup
    
    const config = this.levels.find(l => l.id === levelId) || this.levels[0];
    
    if (levelId === 5) this.currentLevelObj = new BalKandLevel5(this);
    else if (levelId === 4) this.currentLevelObj = new BalKandLevel4(this);
    else if (levelId === 3) this.currentLevelObj = new BalKandLevel3(this);
    else if (levelId === 2) this.currentLevelObj = new BalKandLevel2(this);
    else this.currentLevelObj = new BalKandLevel1(this);
    
    this.gameState.currentLevel = levelId;
    this.currentLevelObj.init();
    this.buildHeader(config);
    this.showScreen('hud');
  }
  
  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    if (id) document.getElementById(id).classList.add('active');
  }
  
  buildHeader(config) {
    this.removeHeader();
    this.headerEl = document.createElement('header');
    this.headerEl.className = 'game-header wood-panel';
    
    // Header container styles for HUD
    this.headerEl.style.position = 'absolute';
    this.headerEl.style.top = 'env(safe-area-inset-top, 10px)';
    this.headerEl.style.left = '10px';
    this.headerEl.style.right = '10px';
    this.headerEl.style.display = 'flex';
    this.headerEl.style.justifyContent = 'space-between';
    this.headerEl.style.alignItems = 'center';
    this.headerEl.style.padding = '12px 15px';
    this.headerEl.style.zIndex = '100';
    this.headerEl.style.pointerEvents = 'auto';
    
    this.headerEl.innerHTML = `
        <button id="hud-back" class="icon-btn" style="width: 40px; height: 40px; font-size: 1.2rem; border-radius: 12px; margin: 0; padding: 0;">←</button>
        <div style="text-align: center; flex: 1;">
          <div style="font-size: 10px; font-weight: 700; color: var(--gold); letter-spacing: 1px;">LEVEL ${config.id}</div>
          <div style="font-size: 15px; font-weight: 700; color: var(--maroon); font-family: var(--font-display); text-transform: uppercase;">${config.name}</div>
        </div>
        <button id="hud-hint" class="btn-primary" style="padding: 5px 12px; width: auto; border-radius: 12px; border-width: 2px;">
          <span class="btn-title" style="font-size: 0.9rem;">💡 <span id="hud-hint-count">${this.hintCredits}</span></span>
        </button>
    `;
    
    document.getElementById('hud').appendChild(this.headerEl);
    
    // Hint Panel
    this.hintPanel = document.createElement('div');
    this.hintPanel.className = 'wood-panel';
    this.hintPanel.style.position = 'absolute';
    this.hintPanel.style.top = 'calc(env(safe-area-inset-top, 10px) + 80px)';
    this.hintPanel.style.left = '10px';
    this.hintPanel.style.right = '10px';
    this.hintPanel.style.padding = '15px';
    this.hintPanel.style.zIndex = '99';
    this.hintPanel.style.pointerEvents = 'auto';
    this.hintPanel.style.opacity = '0';
    this.hintPanel.style.visibility = 'hidden';
    this.hintPanel.style.transform = 'translateY(-10px)';
    this.hintPanel.style.transition = 'all 0.25s ease';
    
    this.hintPanel.innerHTML = `
      <div style="font-weight: bold; color: var(--saffron); font-size: 0.9rem; margin-bottom: 5px;">💡 HINT</div>
      <div style="color: var(--brown); font-weight: 500; font-size: 1rem;">${config.hint}</div>
    `;
    document.getElementById('hud').appendChild(this.hintPanel);

    document.getElementById('hud-back').addEventListener('click', () => {
      if (this.currentLevelObj && this.currentLevelObj.cleanup) {
        this.currentLevelObj.cleanup();
      }
      this.scene.children = this.scene.children.filter(c => !c.isLevelObject);
      this.showScreen('level-select-menu');
    });
    
    document.getElementById('hud-hint').addEventListener('click', () => {
      const isVisible = this.hintPanel.style.opacity === '1';
      if (!isVisible && this.hintCredits > 0) {
        if (!this.hintPanel.dataset.used) {
          this.hintCredits--;
          document.getElementById('hud-hint-count').textContent = this.hintCredits;
          this.hintPanel.dataset.used = 'true';
        }
        this.hintPanel.style.opacity = '1';
        this.hintPanel.style.visibility = 'visible';
        this.hintPanel.style.transform = 'translateY(0)';
      } else {
        this.hintPanel.style.opacity = '0';
        this.hintPanel.style.visibility = 'hidden';
        this.hintPanel.style.transform = 'translateY(-10px)';
      }
    });
  }
  
  removeHeader() {
    if (this.headerEl) {
      this.headerEl.remove();
      this.headerEl = null;
    }
    if (this.hintPanel) {
      this.hintPanel.remove();
      this.hintPanel = null;
    }
  }
  
  showSuccess() {
    // Show elegant success overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.4)';
    overlay.style.backdropFilter = 'blur(2px)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '200';
    overlay.style.pointerEvents = 'auto';
    overlay.innerHTML = `
      <div class="wood-panel" style="animation: scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); text-align: center; padding: 30px 40px;">
        <div style="font-size: 4rem; text-shadow: 0 4px 10px rgba(0,0,0,0.2);">✨</div>
        <h2 style="color: var(--maroon); font-family: 'Cinzel', serif; font-size: 2.2rem; text-shadow: 1px 1px 0 rgba(255,255,255,0.8); margin-top: 10px;">LEVEL COMPLETE</h2>
        <div style="color: var(--forest-green); font-size: 3.5rem; margin-top: 5px; text-shadow: 0 2px 5px rgba(0,0,0,0.1);">✓</div>
      </div>
      <style>@keyframes scaleIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }</style>
    `;
    document.getElementById('hud').appendChild(overlay);

    // Auto advance
    setTimeout(() => {
      overlay.style.transition = 'opacity 0.4s ease';
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        this.goToNextLevel();
      }, 400);
    }, 1500);
  }

  goToNextLevel() {
    const currentIndex = this.levels.findIndex(l => l.id === this.gameState.currentLevel);
    if (currentIndex !== -1) {
      this.levels[currentIndex].completed = true;
    }

    if (currentIndex !== -1 && currentIndex < this.levels.length - 1) {
      // Next level
      const nextLevel = this.levels[currentIndex + 1];
      nextLevel.locked = false;
      this.startGame(nextLevel.id);
    } else {
      // Chapter complete
      if (this.currentLevelObj && this.currentLevelObj.cleanup) this.currentLevelObj.cleanup();
      this.scene.children = this.scene.children.filter(c => !c.isLevelObject);
      
      const resultsScreen = document.getElementById('results-screen');
      document.getElementById('result-title').textContent = 'BAL KAND COMPLETE';
      this.showScreen('results-screen');
      
      const btnNextLevel = document.getElementById('btn-next-level');
      btnNextLevel.onclick = () => {
        this.renderLevelSelect();
        this.showScreen('chapter-menu');
      };
    }
  }
  
  updateHUD() {}
  
  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    if (this.currentLevelObj && this.currentLevelObj.update) {
      this.currentLevelObj.update(delta);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
