export class InputManager {
  constructor() {
    this.keys = {};
    this.joystick = { x: 0, y: 0 };
    this.isInteracting = false;
    
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyE' || e.code === 'Space') this.isInteracting = true;
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'KeyE' || e.code === 'Space') this.isInteracting = false;
    });
    
    // Mobile Touch & Mouse Pointer Aiming & Charging
    this.aimDelta = 0;
    let startY = 0;
    let isDragging = false;
    
    const isUIElement = (target) => {
      return target && target.closest && target.closest('button, .screen:not(.transparent-screen), .game-header, #dialog-box');
    };

    const onStart = (y, target) => {
      if (isUIElement(target)) return;
      isDragging = true;
      startY = y;
      this.isInteracting = true;
    };

    const onMove = (y) => {
      if (!isDragging) return;
      this.aimDelta = (startY - y) * 0.005; 
      startY = y;
    };

    const onEnd = () => {
      if (isDragging) {
        isDragging = false;
        this.aimDelta = 0;
        this.isInteracting = false;
      }
    };

    window.addEventListener('pointerdown', (e) => onStart(e.clientY, e.target));
    window.addEventListener('pointermove', (e) => onMove(e.clientY));
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
  }
}
