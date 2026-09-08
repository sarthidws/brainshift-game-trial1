import { BalKandLevel1 } from '../levels/BalKandLevel1.js';
import { BalKandLevel2 } from '../levels/BalKandLevel2.js';
import { BalKandLevel3 } from '../levels/BalKandLevel3.js';
import { BalKandLevel4 } from '../levels/BalKandLevel4.js';
import { BalKandLevel5 } from '../levels/BalKandLevel5.js';
import { BalKandLevel6 } from '../levels/BalKandLevel6.js';
import { BalKandLevel7 } from '../levels/BalKandLevel7.js';
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
    
    this.webglDisabled = false;
    try {
      this.renderer = new THREE.WebGLRenderer({ 
        canvas: this.canvas, 
        antialias: true, 
        alpha: true,
        powerPreference: 'default'
      });
    } catch (e1) {
      console.warn('Primary WebGLRenderer creation failed, attempting low-power fallback...', e1);
      try {
        this.renderer = new THREE.WebGLRenderer({ 
          canvas: this.canvas, 
          antialias: false, 
          alpha: true,
          powerPreference: 'low-power',
          failIfMajorPerformanceCaveat: false
        });
      } catch (e2) {
        console.warn('WebGL is disabled or unavailable in this browser environment:', e2);
        this.webglDisabled = true;
        this.renderer = {
          setSize: () => {},
          render: () => {},
          domElement: this.canvas
        };
      }
    }

    if (this.renderer && this.renderer.setSize) {
      this.renderer.setSize(width, height);
    }
    
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
      { id: 1, name: 'VANVAS', subtitle: 'The Forest Journey', locked: false },
      { id: 2, name: 'BAL KAND', subtitle: 'The Beginning', locked: false }
    ];

    this.levels = [
      // Chapter 1 (VANVAS) - First chapter in order
      { id: 3, name: 'The Sun and Hanuman', hint: 'Give Hanuman the fruit.', completed: false, current: true, chapter: 1 },
      { id: 4, name: 'Build the Bridge', hint: 'Not every stone belongs to the bridge.', completed: false, chapter: 1 },
      { id: 5, name: 'The Golden Deer', hint: 'Only one deer is your target.', completed: false, chapter: 1 },
      { id: 6, name: 'Ravan Vadh', hint: 'Ravan has a hidden weak point. Find it.', completed: false, chapter: 1 },
      { id: 7, name: "Ahalya's Liberation", hint: "Bring Ram's sacred footprint to the stone.", completed: false, chapter: 1 },

      // Chapter 2 (BAL KAND) - Level 1 and Level 2 locked by default
      { id: 1, name: 'The First Arrow', hint: 'Watch where the arrow needs to go.', completed: false, lockedByDefault: true, chapter: 2 },
      { id: 2, name: 'The Training Target', hint: 'Look carefully at the target.', completed: false, lockedByDefault: true, chapter: 2 }
    ];
    this.currentChapter = 1;
    
    this.loadProgress();

    window.addEventListener('resize', () => this.onWindowResize());
  }
  
  loadProgress() {
    try {
      const saved = localStorage.getItem('ramayan_game_progress');
      if (saved) {
        const data = JSON.parse(saved);
        if (data && data.levels && Array.isArray(data.levels)) {
          data.levels.forEach(savedLevel => {
            const level = this.levels.find(l => l.id === savedLevel.id);
            if (level && typeof savedLevel.completed === 'boolean') {
              level.completed = savedLevel.completed;
            }
          });
        }
        if (data && typeof data.hintCredits === 'number') {
          this.hintCredits = data.hintCredits;
        }
      }
    } catch (e) {
      console.warn('LocalStorage not available or error loading:', e);
    }
  }

  saveProgress() {
    try {
      const data = {
        levels: this.levels.map(l => ({ id: l.id, completed: l.completed })),
        hintCredits: this.hintCredits
      };
      localStorage.setItem('ramayan_game_progress', JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage not available or error saving:', e);
    }
  }
  
  onWindowResize() {
    const app = document.getElementById('app');
    if (!app) return;
    const width = app.clientWidth || window.innerWidth;
    const height = app.clientHeight || window.innerHeight;
    const aspect = width / height;
    
    let frustumWidth = 26;
    let frustumHeight = frustumWidth / aspect;
    if (aspect > 1) {
      frustumHeight = 20;
      frustumWidth = frustumHeight * aspect;
    }
    
    if (this.camera) {
      this.camera.left = -frustumWidth / 2;
      this.camera.right = frustumWidth / 2;
      this.camera.top = frustumHeight / 2;
      this.camera.bottom = -frustumHeight / 2;
      this.camera.updateProjectionMatrix();
    }
    if (this.renderer && this.renderer.setSize) {
      this.renderer.setSize(width, height);
    }
  }
  
  init() {
    this.setupUI();
    const loader = document.getElementById('loading-screen');
    if (loader) loader.classList.remove('active');
    
    this.animate();
  }
  
  setupUI() {
    this.updateHintsDisplay();

    // Sound and Music States
    this.soundEnabled = true;
    this.musicEnabled = true;
    this.language = 'en';

    // Sidebar triggers
    document.getElementById('btn-menu')?.addEventListener('click', () => this.openSidebar());
    document.getElementById('btn-close-sidebar')?.addEventListener('click', () => this.closeSidebar());
    document.getElementById('sidebar-overlay')?.addEventListener('click', () => this.closeSidebar());

    // Sidebar navigation items
    document.getElementById('nav-home')?.addEventListener('click', () => {
      this.closeSidebar();
      this.showScreen('main-menu');
    });

    document.getElementById('nav-levels')?.addEventListener('click', () => {
      this.closeSidebar();
      this.renderChapterSelect();
      this.showScreen('chapter-menu');
    });

    document.getElementById('nav-hints')?.addEventListener('click', () => {
      this.closeSidebar();
      this.updateHintsDisplay();
      this.showScreen('hints-screen');
    });

    document.getElementById('nav-readme')?.addEventListener('click', () => {
      this.closeSidebar();
      this.showScreen('readme-screen');
    });

    document.getElementById('nav-settings')?.addEventListener('click', () => {
      this.closeSidebar();
      this.showScreen('settings-screen');
    });

    // Home buttons
    document.getElementById('btn-play')?.addEventListener('click', () => {
      this.renderChapterSelect();
      this.showScreen('chapter-menu');
    });
    
    document.getElementById('btn-levels')?.addEventListener('click', () => {
      this.renderChapterSelect();
      this.showScreen('chapter-menu');
    });
    
    document.getElementById('btn-how')?.addEventListener('click', () => {
      this.showScreen('how-to-play');
    });

    // Back buttons
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

    document.getElementById('btn-back-hints')?.addEventListener('click', () => {
      this.showScreen('main-menu');
    });

    document.getElementById('btn-back-readme')?.addEventListener('click', () => {
      this.showScreen('main-menu');
    });

    document.getElementById('btn-back-settings')?.addEventListener('click', () => {
      this.showScreen('main-menu');
    });

    // Sound toggle in top bar
    document.getElementById('btn-sound')?.addEventListener('click', () => {
      this.soundEnabled = !this.soundEnabled;
      const soundBtn = document.getElementById('btn-sound');
      if (soundBtn) soundBtn.textContent = this.soundEnabled ? '🔊' : '🔇';
      const toggleSound = document.getElementById('toggle-sound');
      if (toggleSound) {
        toggleSound.textContent = this.soundEnabled ? 'ON' : 'OFF';
        toggleSound.classList.toggle('active', this.soundEnabled);
      }
    });

    // Settings screen toggles
    document.getElementById('toggle-sound')?.addEventListener('click', () => {
      this.soundEnabled = !this.soundEnabled;
      const toggleSound = document.getElementById('toggle-sound');
      if (toggleSound) {
        toggleSound.textContent = this.soundEnabled ? 'ON' : 'OFF';
        toggleSound.classList.toggle('active', this.soundEnabled);
      }
      const soundBtn = document.getElementById('btn-sound');
      if (soundBtn) soundBtn.textContent = this.soundEnabled ? '🔊' : '🔇';
    });

    document.getElementById('toggle-music')?.addEventListener('click', () => {
      this.musicEnabled = !this.musicEnabled;
      const toggleMusic = document.getElementById('toggle-music');
      if (toggleMusic) {
        toggleMusic.textContent = this.musicEnabled ? 'ON' : 'OFF';
        toggleMusic.classList.toggle('active', this.musicEnabled);
      }
    });

    document.getElementById('select-language')?.addEventListener('change', (e) => {
      this.language = e.target.value;
    });

    // Reset Progress Modal Handlers
    const resetModal = document.getElementById('reset-confirm-modal');
    document.getElementById('btn-open-reset-modal')?.addEventListener('click', () => {
      if (resetModal) resetModal.classList.add('active');
    });

    document.getElementById('btn-cancel-reset')?.addEventListener('click', () => {
      if (resetModal) resetModal.classList.remove('active');
    });

    document.getElementById('btn-confirm-reset')?.addEventListener('click', () => {
      if (resetModal) resetModal.classList.remove('active');
      this.resetAllProgress();
    });

    const btnNextLevel = document.getElementById('btn-next-level');
    if (btnNextLevel) {
      btnNextLevel.addEventListener('click', () => {
        this.renderLevelSelect(this.currentChapter);
        this.showScreen('level-select-menu');
      });
    }
  }

  openSidebar() {
    this.updateHintsDisplay();
    document.getElementById('sidebar-overlay')?.classList.add('active');
    document.getElementById('sidebar-menu')?.classList.add('active');
  }

  closeSidebar() {
    document.getElementById('sidebar-overlay')?.classList.remove('active');
    document.getElementById('sidebar-menu')?.classList.remove('active');
  }

  updateHintsDisplay() {
    const hudCount = document.getElementById('hud-hint-count');
    if (hudCount) hudCount.textContent = this.hintCredits;

    const sidebarCount = document.getElementById('sidebar-hint-count');
    if (sidebarCount) sidebarCount.textContent = `${this.hintCredits}`;

    const hintsPageCount = document.getElementById('hints-page-credit-count');
    if (hintsPageCount) hintsPageCount.textContent = `${this.hintCredits}`;
  }

  resetAllProgress() {
    this.closeSidebar();
    this.levels.forEach(l => {
      l.completed = false;
      l.current = (l.id === 3);
      if (l.chapter === 2) {
        l.lockedByDefault = true;
      }
    });
    this.hintCredits = 20;
    this.saveProgress();
    this.updateHintsDisplay();
    this.showScreen('main-menu');
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
      
      const isLocked = !!chap.locked;

      const dotClass = isLocked ? 'locked' : (progress.percentage === 100 ? 'completed' : 'current');
      const dotContent = isLocked ? '🔒' : (progress.percentage === 100 ? '✓' : '');
      
      const subtitleText = chap.subtitle;
      const progressText = isLocked 
        ? `<span style="color:var(--text-light); font-weight:700;">LOCKED</span>`
        : `<span>${progress.completed} / ${progress.total} LEVELS</span>
           <span style="color:var(--gold);">${progress.percentage === 100 ? '★★★' : ''}</span>`;
      
      const progressBar = isLocked ? '' : `
        <div class="bar-bg" style="margin-top: 8px; height: 6px; border-radius: 3px; overflow: hidden;">
          <div class="bar-fill" style="width:${progress.percentage}%; height: 100%; border-radius: 3px;"></div>
        </div>
      `;

      el.innerHTML = `
        <div class="node-content ${isLocked ? 'locked' : ''}">
          <h4>${chap.name}</h4>
          <p>${subtitleText}</p>
          <div class="node-progress">
            ${progressText}
          </div>
          ${progressBar}
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
      } else if (!level.lockedByDefault && (level.current || (index === 0 && progress.completed === 0) || (index > 0 && chapterLevels[index-1].completed))) {
        // Unlock if it's the first level, or previous is completed, or explicitly marked current
        dotClass = 'current';
        dotContent = '';
        contentClass = '';
      }

      const stars = level.completed ? `<span style="color:var(--gold); font-size:1.2rem; letter-spacing:2px; text-shadow: 0 2px 0 rgba(0,0,0,0.1);">★★★</span>` : ``;
      
      el.innerHTML = `
        <div class="node-content ${contentClass}">
          <h4 style="font-size: 1.1rem; margin-bottom: 2px;">Level ${index + 1}</h4>
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
    
    if (levelId === 7) this.currentLevelObj = new BalKandLevel7(this);
    else if (levelId === 6) this.currentLevelObj = new BalKandLevel6(this);
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
    
    const chapterLevels = this.levels.filter(l => l.chapter === config.chapter);
    const levelNumber = chapterLevels.findIndex(l => l.id === config.id) + 1;

    this.headerEl.innerHTML = `
        <button id="hud-back" class="icon-btn" style="width: 40px; height: 40px; font-size: 1.2rem; border-radius: 12px; margin: 0; padding: 0;" aria-label="Back">←</button>
        <div style="text-align: center; flex: 1; margin: 0 10px;">
          <div style="font-size: 11px; font-weight: 800; color: var(--gold); letter-spacing: 1px;">LEVEL ${levelNumber > 0 ? levelNumber : config.id}</div>
          <div style="font-size: 15px; font-weight: 800; color: var(--maroon); font-family: var(--font-display); text-transform: uppercase;">${config.name}</div>
        </div>
        <button id="hud-hint" class="btn-primary" style="padding: 6px 14px; width: auto; border-radius: 14px; border-width: 2px;" aria-label="Hint">
          <span class="btn-title" style="font-size: 0.95rem; display: flex; align-items: center; gap: 4px;">💡 <span id="hud-hint-count">${this.hintCredits}</span></span>
        </button>
    `;
    
    document.getElementById('hud').appendChild(this.headerEl);
    
    // Hint Panel Container (Solid & Independent)
    this.hintContainer = document.createElement('div');
    this.hintContainer.className = 'hint-panel-container';
    
    this.hintContainer.innerHTML = `
      <div id="game-hint-card" class="game-hint-card">
        <div class="hint-card-header">
          <div class="hint-title-group">
            <span class="hint-badge-icon">💡</span>
            <span class="hint-title-text">HINT</span>
          </div>
          <button id="btn-close-hint" class="hint-close-btn" aria-label="Close Hint">✕</button>
        </div>
        <div class="hint-card-body">${config.hint}</div>
      </div>
    `;
    document.getElementById('hud').appendChild(this.hintContainer);

    this.hintPanel = document.getElementById('game-hint-card');

    document.getElementById('hud-back').addEventListener('click', () => {
      if (this.currentLevelObj && this.currentLevelObj.cleanup) {
        this.currentLevelObj.cleanup();
      }
      this.scene.children = this.scene.children.filter(c => !c.isLevelObject);
      this.showScreen('level-select-menu');
    });
    
    document.getElementById('hud-hint').addEventListener('click', () => {
      this.toggleHint();
    });

    document.getElementById('btn-close-hint').addEventListener('click', () => {
      this.hideHint();
    });
  }

  toggleHint() {
    if (!this.hintPanel) return;
    const isVisible = this.hintPanel.classList.contains('active');
    if (isVisible) {
      this.hideHint();
    } else {
      this.showHint();
    }
  }

  showHint() {
    if (!this.hintPanel) return;
    if (this.hintCredits > 0) {
      if (!this.hintPanel.dataset.used) {
        this.hintCredits--;
        this.updateHintsDisplay();
        this.saveProgress();
        this.hintPanel.dataset.used = 'true';
      }
      this.hintPanel.classList.add('active');
    }
  }

  hideHint() {
    if (!this.hintPanel) return;
    this.hintPanel.classList.remove('active');
  }

  removeHeader() {
    if (this.headerEl) {
      this.headerEl.remove();
      this.headerEl = null;
    }
    if (this.hintContainer) {
      this.hintContainer.remove();
      this.hintContainer = null;
      this.hintPanel = null;
    }
  }
  
  showSuccess() {
    const levelId = this.currentLevel;
    const currentLevelConfig = this.levels.find(l => l.id === levelId);
    if (currentLevelConfig) {
      currentLevelConfig.completed = true;
      currentLevelConfig.current = false;
      
      const chapterLevels = this.levels.filter(l => l.chapter === currentLevelConfig.chapter);
      const currentIndex = chapterLevels.findIndex(l => l.id === levelId);
      if (currentIndex >= 0 && currentIndex + 1 < chapterLevels.length) {
        chapterLevels[currentIndex + 1].lockedByDefault = false;
        chapterLevels[currentIndex + 1].current = true;
      }
      this.saveProgress();
    }

    // Hide hint if open
    this.hideHint();

    // Show solid & highly readable victory overlay
    const overlay = document.createElement('div');
    overlay.className = 'victory-overlay';
    overlay.id = 'victory-overlay';
    
    overlay.innerHTML = `
      <div class="victory-card">
        <div class="victory-stars-box">🏆</div>
        <h2 class="victory-title">LEVEL COMPLETE!</h2>
        <p class="victory-level-name">${currentLevelConfig ? currentLevelConfig.name : 'Success'}</p>
        <div class="victory-reward-pill">
          <span>✨</span>
          <span>+20 Hint Credits</span>
        </div>
        <button id="btn-victory-next" class="btn-primary victory-action-btn">
          <span class="btn-title" style="font-size:1.35rem;">NEXT LEVEL ➔</span>
        </button>
      </div>
    `;
    document.getElementById('hud').appendChild(overlay);

    document.getElementById('btn-victory-next').addEventListener('click', () => {
      overlay.style.transition = 'opacity 0.3s ease';
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        this.goToNextLevel();
      }, 300);
    });
  }

  goToNextLevel() {
    const chapterLevels = this.levels.filter(l => l.chapter === this.currentChapter);
    const currentIndex = chapterLevels.findIndex(l => l.id === this.currentLevel);
    const nextLevel = currentIndex >= 0 && currentIndex + 1 < chapterLevels.length ? chapterLevels[currentIndex + 1] : null;
    
    if (nextLevel) {
      this.startGame(nextLevel.id);
    } else {
      // Chapter complete
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
