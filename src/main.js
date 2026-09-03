import { Game } from './game/Game.js';

const init = () => {
  const game = new Game();
  game.init();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
