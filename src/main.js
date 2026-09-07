import { Game } from './game/Game.js';

const init = () => {
  try {
    const game = new Game();
    window.game = game;
    game.init();
  } catch (err) {
    console.error('Fatal initialization error:', err);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
