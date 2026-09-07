import { BalKandLevel1 } from '../levels/BalKandLevel1.js';
import { BalKandLevel2 } from '../levels/BalKandLevel2.js';
import { BalKandLevel3 } from '../levels/BalKandLevel3.js';
import { BalKandLevel4 } from '../levels/BalKandLevel4.js';
import { BalKandLevel5 } from '../levels/BalKandLevel5.js';
import { BalKandLevel6 } from '../levels/BalKandLevel6.js';
import { AssetManager } from './AssetManager.js';
import { InputManager } from './InputManager.js';
import * as THREE from 'three';

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xFFF9F0); 
    
    const app = document.getElementById('app');
    const width = app.clientWidth;
    const height = app.clientHeight;
    const aspect = width / height;
    let frustumWidth = 26; // Smaller width zooms in the elements for mobile
    let frustumHeight = frustumWidth / aspect;
    if (aspect > 1) {
      frustumHeight = 20;
      frustumWidth = frustumHeight * aspect;
    }
    this.camera = new THREE.OrthographicCamera(-frustumWidth / 2, frustumWidth / 2, frustumHeight / 2, -frustumHeight / 2, 0.1, 1000);
    this.camera.position.set(0, 0, 10);
    
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    
    this.inputManager = new InputManager();
    this.assetManager = new AssetManager(() => {
      this.showScreen('main-menu');
    });
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

    this.chapters = [
      { id: 1, name: 'BAL KAND', subtitle: 'The Beginning' },
      { id: 2, name: 'VANVAS', subtitle: 'The Forest Journey' }
    ];

    this.levels = [
      { id: 1, name: 'The First Arrow', hint: 'Watch where the arrow needs to go.', completed: true, chapter: 1 },
      { id: 2, name: 'The Training Target', hint: 'Look carefully at the target.', completed: true, chapter: 1 },
      { id: 3, name: 'The Sun and Hanuman', hint: 'Give Hanuman the fruit.', completed: true, chapter: 2 },
      { id: 4, name: 'Build the Bridge', hint: 'Not every stone belongs to the bridge.', completed: true, chapter: 2 },
      { id: 5, name: 'The Golden Deer', hint: 'Only one deer is your target.', completed: true, chapter: 2 },
      { id: 6, name: 'Ravan Vadh', hint: 'Ravan has a hidden weak point. Find it.', completed: false, current: true, chapter: 2 }
    ];
    this.currentChapter = 1;
    
    window.addEventListener('resize', () => this.onWindowResize());
  }
  
  onWindowResize() {
    const app = document.getElementById('app');
    const width = app.clientWidth;
    const height = app.clientHeight;
    const aspect = width / height;
    
    let frustumWidth = 26;
    let frustumHeight = frustumWidth / aspect;
    if (aspect > 1) {
      frustumHeight = 20;
      frustumWidth = frustumHeight * aspect;
    }
    
    this.camera.left = -frustumWidth / 2;
    this.camera.right = frustumWidth / 2;
    this.camera.top = frustumHeight / 2;
    this.camera.bottom = -frustumHeight / 2;
    
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  
  init() {
    this.setupUI();
    const loader = document.getElementById('loading-screen');
    if (loader) loader.classList.remove('active');
    
    // Splash screen transitions to main menu via setupUI timeout
    this.animate();
  }
  
  setupUI() {
    document.getElementById('btn-play')?.addEventListener('click', () => {
      this.startGame(1);
    });
    
    document.getElementById('btn-levels')?.addEventListener('click', () => {
      this.renderChapterSelect();
      this.showScreen('chapter-menu');
    });
    
    document.getElementById('btn-how')?.addEventListener('click', () => {
      this.showScreen('how-to-play');
    });

    document.getElementById('btn-back-chapters')?.addEventListener('click', () => {
      this.showScreen('main-menu');
    });

    document.getElementById('btn-back-levels')?.addEventListener('click', () => {
      this.renderChapterSelect();
      this.showScreen('chapter-menu');
    });

    document.getElementById('btn-back-how')?.addEventListener('click', () => {
      this.showScreen('main-menu');
    });

    const btnNextLevel = document.getElementById('btn-next-level');
    if (btnNextLevel) {
      btnNextLevel.addEventListener('click', () => {
        this.renderLevelSelect(this.currentChapter);
        this.showScreen('level-select-menu');
      });
    }
  }

  getChapterProgress(chapterId) {
    const chapterLevels = this.levels.filter(l => l.chapter === chapterId);
    if (chapterLevels.length === 0) return { completed: 0, total: 0, percentage: 0 };
    const completedCount = chapterLevels.filter(l => l.completed).length;
    return {
      completed: completedCount,
      total: chapterLevels.length,
      percentage: Math.round((completedCount / chapterLevels.length) * 100)
    };
  }

  renderChapterSelect() {
    const mapContainer = document.getElementById('chapter-journey-map');
    if (!mapContainer) return;
    mapContainer.innerHTML = '';

    this.chapters.forEach(chap => {
      const progress = this.getChapterProgress(chap.id);
      
      const el = document.createElement('div');
      el.className = 'journey-node';
      
      const isLocked = progress.total > 0 && chap.id > 1 && this.getChapterProgress(chap.id - 1).percentage < 100 && false; // For now keeping all unlocked for demo

      const dotClass = progress.percentage === 100 ? 'completed' : (progress.percentage > 0 || chap.id === 1 ? 'current' : 'locked');
      const dotContent = progress.percentage === 100 ? '✓' : (isLocked ? '🔒' : '');
      
      el.innerHTML = `
        <div class="node-content ${isLocked ? 'locked' : ''}">
          <h4>${chap.name}</h4>
          <p>${chap.subtitle}</p>
          <div class="node-progress">
            <span>${progress.completed} / ${progress.total} LEVELS</span>
            <span style="color:var(--gold);">${progress.percentage === 100 ? '★★★' : ''}</span>
          </div>
          <div class="bar-bg" style="margin-top: 8px; height: 6px; border-radius: 3px; overflow: hidden;">
            <div class="bar-fill" style="width:${progress.percentage}%; height: 100%; border-radius: 3px;"></div>
          </div>
        </div>
        <div class="node-dot ${dotClass}">${dotContent}</div>
      `;
      
      if (!isLocked) {
        el.addEventListener('click', () => {
          this.currentChapter = chap.id;
          this.renderLevelSelect(chap.id);
          this.showScreen('level-select-menu');
        });
      }
      
      mapContainer.appendChild(el);
    });
  }

  renderLevelSelect(chapterId = 1) {
    const mapContainer = document.getElementById('levels-journey-map');
    const titleEl = document.getElementById('level-menu-title');
    const subtitleEl = document.getElementById('level-menu-subtitle');
    const progressContainer = document.getElementById('level-progress-container');
    
    if (!mapContainer || !titleEl) return;
    
    const chapter = this.chapters.find(c => c.id === chapterId);
    if (chapter) {
      titleEl.textContent = chapter.name;
      subtitleEl.textContent = chapter.subtitle;
    }

    const progress = this.getChapterProgress(chapterId);
    if (progressContainer) {
      progressContainer.innerHTML = `
        <div style="display:flex; justify-content:space-between;">
          <span>PROGRESS</span>
          <span>${progress.percentage}%</span>
        </div>
        <div class="bar-bg">
          <div class="bar-fill" style="width:${progress.percentage}%;"></div>
        </div>
      `;
    }

    mapContainer.innerHTML = '';
    
    const chapterLevels = this.levels.filter(l => l.chapter === chapterId);
    
    chapterLevels.forEach((level, index) => {
      const el = document.createElement('div');
      el.className = 'journey-node';
      
      let dotClass = 'locked';
      let dotContent = '🔒';
      let contentClass = 'locked';
      
      if (level.completed) {
        dotClass = 'completed';
        dotContent = '✓';
        contentClass = '';
      } else if (level.current || (index === 0 && progress.completed === 0) || (index > 0 && chapterLevels[index-1].completed)) {
        // Unlock if it's the first level, or previous is completed, or explicitly marked current
        dotClass = 'current';
        dotContent = '';
        contentClass = '';
      }

      const stars = level.completed ? `<span style="color:var(--gold); font-size:1.2rem; letter-spacing:2px; text-shadow: 0 2px 0 rgba(0,0,0,0.1);">★★★</span>` : ``;
      
      el.innerHTML = `
        <div class="node-content ${contentClass}">
          <h4 style="font-size: 1.1rem; margin-bottom: 2px;">Level ${level.id}</h4>
          <p style="font-size: 1.3rem; color: var(--text-title); margin-bottom: 5px;">${level.name}</p>
          <div class="node-progress">
            <span>${dotClass === 'locked' ? 'Locked' : (dotClass === 'completed' ? 'Completed' : 'Current')}</span>
            ${stars}
          </div>
        </div>
        <div class="node-dot ${dotClass}">${dotContent}</div>
      `;
      
      if (contentClass !== 'locked') {
        el.addEventListener('click', () => {
          this.startGame(level.id);
        });
      }
      
      mapContainer.appendChild(el);
    });
  }
  
  startGame(levelId) {
    if (this.currentLevelObj && this.currentLevelObj.cleanup) this.currentLevelObj.cleanup();
    this.scene.children = this.scene.children.filter(c => !c.isLevelObject); // cleanup
    
    const config = this.levels.find(l => l.id === levelId) || this.levels[0];
    
    if (levelId === 6) this.currentLevelObj = new BalKandLevel6(this);
    else if (levelId === 5) this.currentLevelObj = new BalKandLevel5(this);
    else if (levelId === 4) this.currentLevelObj = new BalKandLevel4(this);
    else if (levelId === 3) this.currentLevelObj = new BalKandLevel3(this);
    else if (levelId === 2) this.currentLevelObj = new BalKandLevel2(this);
    else this.currentLevelObj = new BalKandLevel1(this);
    
    this.currentLevel = levelId;
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
    const levelId = this.currentLevel;
    const currentLevelConfig = this.levels.find(l => l.id === levelId);
    if (currentLevelConfig) {
      currentLevelConfig.completed = true;
      currentLevelConfig.current = false;
      
      // Update logic for next level unlocking
      const nextLevel = this.levels.find(l => l.id === levelId + 1);
      if (nextLevel) {
        nextLevel.locked = false;
        nextLevel.current = true;
      }
    }

    // Show elegant success overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.6)';
    overlay.style.backdropFilter = 'blur(4px)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '300';
    overlay.style.pointerEvents = 'auto';
    overlay.innerHTML = `
      <div class="wood-panel" style="animation: scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); text-align: center; padding: 40px 50px; width: 90%; max-width: 400px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
        <div style="font-size: 4rem; text-shadow: 0 4px 10px rgba(0,0,0,0.2); margin-bottom: 10px;">✨</div>
        <h2 style="color: var(--maroon); font-family: var(--font-display); font-size: 2.4rem; text-shadow: 1px 1px 0 rgba(255,255,255,0.8);">LEVEL COMPLETE!</h2>
        <p style="color: var(--text-title); font-size: 1.6rem; font-weight: 800; margin: 15px 0;">${currentLevelConfig ? currentLevelConfig.name : 'Success'}</p>
        <p style="color: var(--forest-green); font-size: 1.2rem; margin-bottom: 25px; font-weight: bold; background: rgba(255,255,255,0.5); padding: 5px 15px; border-radius: 20px; display: inline-block;">+20 Credits</p>
        <button id="btn-victory-next" class="btn-primary" style="width: 100%;"><span class="btn-title" style="font-size:1.4rem;">NEXT LEVEL ➔</span></button>
      </div>
      <style>@keyframes scaleIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }</style>
    `;
    document.getElementById('hud').appendChild(overlay);

    document.getElementById('btn-victory-next').addEventListener('click', () => {
      overlay.style.transition = 'opacity 0.4s ease';
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        this.goToNextLevel();
      }, 400);
    });
  }

  goToNextLevel() {
    const nextLevel = this.levels.find(l => l.id === this.currentLevel + 1);
    
    if (nextLevel) {
      if (nextLevel.chapter !== this.currentChapter) {
         this.currentChapter = nextLevel.chapter;
         this.renderChapterSelect();
         this.showScreen('chapter-menu');
      } else {
         this.startGame(nextLevel.id);
      }
    } else {
      // Game complete or last chapter complete
      if (this.currentLevelObj && this.currentLevelObj.cleanup) this.currentLevelObj.cleanup();
      this.scene.children = this.scene.children.filter(c => !c.isLevelObject);
      
      this.renderChapterSelect();
      this.showScreen('chapter-menu');
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
