import * as THREE from 'three';

export class BalKandLevel5 {
  constructor(game) {
    this.game = game;
    this.state = 'INTRO';
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.isDragging = false;
    this.draggedObj = null;
    
    this.objects = [];
    
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
  }

  init() {
    this.game.camera.position.set(0, 0, 10);
    this.game.scene.background = new THREE.Color(0xFFF9F0);

    // Sun (Decorative)
    const sunMat = this.game.assetManager.getTextureMaterial('sun');
    const sun = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), sunMat);
    sun.position.set(0, 8, -2);
    sun.isLevelObject = true;
    this.game.scene.add(sun);
    
    // Golden Deer (The Target)
    const gdMat = this.game.assetManager.getTextureMaterial('golden_deer');
    this.goldenDeer = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), gdMat);
    this.goldenDeer.position.set(2, 0, 0);
    this.goldenDeer.userData = { id: 'golden_deer', draggable: true, startPos: new THREE.Vector3(2, 0, 0) };
    this.goldenDeer.isLevelObject = true;
    this.game.scene.add(this.goldenDeer);
    this.objects.push(this.goldenDeer);
    
    // Arrow
    const arrowMat = this.game.assetManager.getTextureMaterial('arrow');
    this.arrow = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.5), arrowMat);
    this.arrow.position.set(-6, -6, 1);
    this.arrow.userData = { id: 'arrow', draggable: true, startPos: new THREE.Vector3(-6, -6, 1) };
    this.arrow.isLevelObject = true;
    this.game.scene.add(this.arrow);
    this.objects.push(this.arrow);

    // Other Animals and Distractions
    const distractors = [
      { id: 'cobra', geo: [4, 4], pos: new THREE.Vector3(-4, -2, 0) },
      { id: 'monkey', geo: [4, 4], pos: new THREE.Vector3(6, 4, 0) },
      { id: 'normal_deer', geo: [5, 5], pos: new THREE.Vector3(7, -4, 0) },
      { id: 'peacock', geo: [4, 5], pos: new THREE.Vector3(-6, 4, 0) },
      { id: 'rabbit', geo: [3, 3], pos: new THREE.Vector3(4, -8, 0) },
      { id: 'target', geo: [4, 6], pos: new THREE.Vector3(-7, -10, 0) },
      { id: 'simple_stone_1', geo: [3, 3], pos: new THREE.Vector3(2, -10, 0) }
    ];
    
    distractors.forEach(conf => {
      const mat = this.game.assetManager.getTextureMaterial(conf.id);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(conf.geo[0], conf.geo[1]), mat);
      mesh.position.copy(conf.pos);
      mesh.userData = { id: conf.id, draggable: true, startPos: conf.pos.clone() };
      mesh.isLevelObject = true;
      this.game.scene.add(mesh);
      this.objects.push(mesh);
    });

    this.game.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.game.canvas.addEventListener('pointermove', this.onPointerMove);
    this.game.canvas.addEventListener('pointerup', this.onPointerUp);
    this.game.canvas.addEventListener('pointercancel', this.onPointerUp);
    
    this.state = 'PLAYING';
  }
  update(delta) {}

  updateMouse(e) {
    const rect = this.game.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  onPointerDown(e) {
    if (this.state !== 'PLAYING') return;
    this.updateMouse(e);
    this.raycaster.setFromCamera(this.mouse, this.game.camera);
    
    const intersects = this.raycaster.intersectObjects(this.objects);
    if (intersects.length > 0) {
      const obj = intersects[0].object;
      if (obj.userData.draggable) {
        this.draggedObj = obj;
        this.isDragging = true;
        this.draggedObj.scale.set(1.1, 1.1, 1.1);
        this.draggedObj.position.z += 2; // bring to front
      }
    }
  }

  onPointerMove(e) {
    if (!this.isDragging || !this.draggedObj) return;
    this.updateMouse(e);
    this.raycaster.setFromCamera(this.mouse, this.game.camera);
    
    const targetZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), -this.draggedObj.position.z);
    const targetPos = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(targetZ, targetPos);
    
    if (targetPos) {
      this.draggedObj.position.x = targetPos.x;
      this.draggedObj.position.y = targetPos.y;
    }
  }

  onPointerUp(e) {
    if (!this.isDragging || !this.draggedObj) return;
    
    this.isDragging = false;
    this.draggedObj.scale.set(1, 1, 1);
    this.draggedObj.position.z -= 2;
    
    if (this.draggedObj.userData.id === 'arrow') {
      const distance = this.draggedObj.position.distanceTo(this.goldenDeer.position);
      if (distance < 4) { // Hit Golden Deer
        this.completeLevel();
      } else {
        // Did it hit anything else?
        let hitOther = false;
        for (let obj of this.objects) {
          if (obj !== this.arrow && obj !== this.goldenDeer) {
            if (this.draggedObj.position.distanceTo(obj.position) < 4) {
              hitOther = true;
              break;
            }
          }
        }
        
        if (hitOther) {
          this.shakeWrongObj(this.draggedObj);
        }
      }
    }
    
    this.draggedObj = null;
  }

  shakeWrongObj(obj) {
    const startX = obj.position.x;
    let shakes = 0;
    const shakeInterval = setInterval(() => {
      obj.position.x = startX + (shakes % 2 === 0 ? 0.5 : -0.5);
      shakes++;
      if (shakes > 5) {
        clearInterval(shakeInterval);
        obj.position.copy(obj.userData.startPos);
      }
    }, 50);
  }

  completeLevel() {
    this.state = 'SUCCESS';
    this.arrow.position.copy(this.goldenDeer.position);
    this.arrow.position.z += 1;
    this.game.showSuccess();
  }

  cleanup() {
    this.game.removeHeader();
    
    this.game.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.game.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.game.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.game.canvas.removeEventListener('pointercancel', this.onPointerUp);
  }
}
