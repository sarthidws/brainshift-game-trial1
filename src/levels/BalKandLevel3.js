import * as THREE from 'three';

export class BalKandLevel3 {
  constructor(game) {
    this.game = game;
    this.state = 'INTRO'; // INTRO, PLAYING, DRAGGING_SUN, SUCCESS
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.isDragging = false;
    this.draggedObj = null;
    this.wrongAttemptCount = 0;
    this.successRadius = 5;
    
    // Binding methods
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
  }

  init() {
    this.game.camera.position.set(0, 0, 10);
    
    // Background
    const bgGeo = new THREE.PlaneGeometry(60, 30); // Or calculate aspect
    const bgMat = this.game.assetManager.getTextureMaterial('level3bg');
    this.bg = new THREE.Mesh(bgGeo, bgMat);
    this.bg.position.set(0, 0, -5);
    this.bg.isLevelObject = true;
    this.game.scene.add(this.bg);

    // Hanuman (Target)
    const hanumanGeo = new THREE.PlaneGeometry(6, 8);
    const hanumanMat = this.game.assetManager.getTextureMaterial('hanuman');
    this.hanuman = new THREE.Mesh(hanumanGeo, hanumanMat);
    this.hanuman.position.set(0, -5, 0); // lower center
    this.hanuman.isLevelObject = true;
    this.hanuman.name = "Hanuman";
    this.game.scene.add(this.hanuman);

    // Sun (Draggable)
    const sunGeo = new THREE.PlaneGeometry(4, 4);
    const sunMat = this.game.assetManager.getTextureMaterial('sun');
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.sun.position.set(0, 8, 1); // upper center
    this.sun.isLevelObject = true;
    this.sun.name = "Sun";
    this.game.scene.add(this.sun);
    
    // Setup Interaction
    this.game.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.game.canvas.addEventListener('pointermove', this.onPointerMove);
    this.game.canvas.addEventListener('pointerup', this.onPointerUp);
    this.game.canvas.addEventListener('pointercancel', this.onPointerUp);
    
    this.state = 'PLAYING';
    this.showDialog("Give Hanuman the fruit.", true);
  }

  update(delta) {
    if (this.state === 'SUCCESS') {
      // Small pulse or idle logic here
    }
  }

  updateMouse(e) {
    const rect = this.game.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  onPointerDown(e) {
    if (this.state !== 'PLAYING') return;
    this.updateMouse(e);
    this.raycaster.setFromCamera(this.mouse, this.game.camera);
    const intersects = this.raycaster.intersectObjects([this.sun, this.hanuman]);

    if (intersects.length > 0) {
      const obj = intersects[0].object;
      if (obj.name === "Sun") {
        this.draggedObj = this.sun;
        this.isDragging = true;
        this.sun.scale.set(1.1, 1.1, 1.1); // scale up on grab
      } else if (obj.name === "Hanuman") {
        this.handleHanumanInteraction();
      }
    }
  }

  onPointerMove(e) {
    if (!this.isDragging || !this.draggedObj) return;
    
    this.updateMouse(e);
    this.raycaster.setFromCamera(this.mouse, this.game.camera);
    // Project mouse onto z=1 plane for the sun
    const targetZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), -1);
    const targetPos = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(targetZ, targetPos);
    
    if (targetPos) {
      this.draggedObj.position.copy(targetPos);
    }

    // Check collision continuously
    if (this.sun.position.distanceTo(this.hanuman.position) < this.successRadius) {
      this.isDragging = false;
      this.completeLevel();
    }
  }

  onPointerUp(e) {
    if (this.draggedObj && this.draggedObj.name === "Sun") {
      this.draggedObj.scale.set(1, 1, 1);
    }
    this.isDragging = false;
    this.draggedObj = null;
  }

  handleHanumanInteraction() {
    this.wrongAttemptCount++;
    this.hanuman.scale.set(1.05, 1.05, 1.05);
    setTimeout(() => this.hanuman.scale.set(1, 1, 1), 200);

    let hint = "Think differently...";
    if (this.wrongAttemptCount === 2) {
      hint = "What if the fruit came to Hanuman?";
    } else if (this.wrongAttemptCount >= 3) {
      hint = "Sometimes, the goal needs to reach you.";
    }
    this.showDialog(hint);
  }

  completeLevel() {
    this.state = 'SUCCESS';
    this.sun.position.set(this.hanuman.position.x, this.hanuman.position.y + 2, 2);
    this.sun.scale.set(1, 1, 1);
    this.game.showSuccess();
  }

  showDialog(text, sticky=false) {
    const dialog = document.getElementById('dialog-box');
    const dialogText = document.getElementById('dialog-text');
    if (!dialog || !dialogText) return;
    
    dialogText.textContent = text;
    dialog.classList.add('show');
    if (this.dialogTimeout) clearTimeout(this.dialogTimeout);
    
    if (!sticky) {
      this.dialogTimeout = setTimeout(() => {
        dialog.classList.remove('show');
      }, 3000);
    }
  }

  cleanup() {
    this.game.removeHeader();
    if (this.dialogTimeout) clearTimeout(this.dialogTimeout);
    const dialog = document.getElementById('dialog-box');
    if (dialog) dialog.classList.remove('show');
    
    this.game.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.game.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.game.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.game.canvas.removeEventListener('pointercancel', this.onPointerUp);
  }
}
