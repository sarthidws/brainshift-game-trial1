export class InputManager {
  constructor() {
    this.keys = {};
    this.joystick = { x: 0, y: 0 };
    this.isInteracting = false;
    
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyE') this.isInteracting = true;
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'KeyE') this.isInteracting = false;
    });
    
    const prompt = document.getElementById('interaction-prompt');
    if (prompt) {
      prompt.addEventListener('mousedown', () => this.isInteracting = true);
      prompt.addEventListener('mouseup', () => this.isInteracting = false);
      prompt.addEventListener('touchstart', () => this.isInteracting = true);
      prompt.addEventListener('touchend', () => this.isInteracting = false);
    }
    
    // Mobile Touch & Mouse Drag Aiming
    this.aimDelta = 0;
    let startY = 0;
    let isDragging = false;
    
    const onStart = (y) => { isDragging = true; startY = y; };
    const onMove = (y) => {
      if (!isDragging) return;
      this.aimDelta = (startY - y) * 0.005; 
      startY = y;
    };
    const onEnd = () => { isDragging = false; this.aimDelta = 0; };

    window.addEventListener('mousedown', (e) => onStart(e.clientY));
    window.addEventListener('mousemove', (e) => onMove(e.clientY));
    window.addEventListener('mouseup', onEnd);
    
    window.addEventListener('touchstart', (e) => onStart(e.touches[0].clientY), {passive: true});
    window.addEventListener('touchmove', (e) => onMove(e.touches[0].clientY), {passive: true});
    window.addEventListener('touchend', onEnd);
  }
}
