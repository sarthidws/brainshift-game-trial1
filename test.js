const { JSDOM } = require("jsdom");
const dom = new JSDOM(`<!DOCTYPE html><div id="chapter-journey-map"></div>`);
global.document = dom.window.document;

class Game {
  constructor() {
    this.chapters = [
      { id: 1, name: 'BAL KAND', subtitle: 'The Beginning' },
      { id: 2, name: 'VANVAS', subtitle: 'The Forest Journey' }
    ];
    this.levels = [
      { id: 1, name: 'The First Arrow', completed: true, chapter: 1 },
      { id: 2, name: 'The Training Target', completed: true, chapter: 1 },
      { id: 3, name: 'The Sun and Hanuman', completed: true, chapter: 2 }
    ];
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
      
      const isLocked = progress.total > 0 && chap.id > 1 && this.getChapterProgress(chap.id - 1).percentage < 100 && false; 

      const dotClass = progress.percentage === 100 ? 'completed' : (progress.percentage > 0 || chap.id === 1 ? 'current' : 'locked');
      const dotContent = progress.percentage === 100 ? '✓' : (isLocked ? '🔒' : '');
      
      el.innerHTML = `
        <div class="node-content ${isLocked ? 'locked' : ''}">
          <h4>${chap.name}</h4>
        </div>
      `;
      
      mapContainer.appendChild(el);
    });
  }
}
const g = new Game();
try {
  g.renderChapterSelect();
  console.log("Success! Children count:", document.getElementById('chapter-journey-map').children.length);
} catch(e) {
  console.error(e);
}
