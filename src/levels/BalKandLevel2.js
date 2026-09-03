import * as THREE from 'three';
import { BalKandLevel1 } from './BalKandLevel1.js';

export class BalKandLevel2 extends BalKandLevel1 {
  init() {
    super.init();
    this.targetDirection = 1;
    this.targetSpeed = 5;
    this.requiredHits = 3;
    this.arrowsLeft = 5;
  }
  
  update(delta) {
    super.update(delta);
    
    // Move Target
    if (this.target) {
      this.target.position.y += this.targetSpeed * this.targetDirection * delta;
      if (this.target.position.y > 10) {
        this.target.position.y = 10;
        this.targetDirection = -1;
      } else if (this.target.position.y < 2) {
        this.target.position.y = 2;
        this.targetDirection = 1;
      }
    }
  }
}
