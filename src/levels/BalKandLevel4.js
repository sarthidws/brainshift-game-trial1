import * as THREE from 'three';

export class BalKandLevel4 {
  constructor(game) {
    this.game = game;
    this.state = 'INTRO';
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.isDragging = false;
    this.draggedStone = null;
    this.stones = [];
    this.placedCount = 0;
    
    // Bridge slots
    this.bridgeSlots = [
      { pos: new THREE.Vector3(-4, -1, 1), occupied: false },
      { pos: new THREE.Vector3(4, -1, 1), occupied: false }
    ];
    
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
  }

  init() {
    this.game.camera.position.set(0, 0, 10);
    
    // White background
    this.bgGeo = new THREE.PlaneGeometry(60, 40);
    this.bgMat = new THREE.MeshBasicMaterial({ color: 0xFFF9F0 });
    this.bg = new THREE.Mesh(this.bgGeo, this.bgMat);
    this.bg.position.set(0, 0, -5);
    this.bg.isLevelObject = true;
    this.game.scene.add(this.bg);

    // Sun (Decorative)
    const sunGeo = new THREE.PlaneGeometry(4, 4);
    const sunMat = this.game.assetManager.getTextureMaterial('sun');
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.sun.position.set(0, 8, -1);
    this.sun.isLevelObject = true;
    this.game.scene.add(this.sun);
    
    // River
    const riverGeo = new THREE.PlaneGeometry(25, 6);
    const riverMat = this.game.assetManager.getTextureMaterial('water_river');
    this.river = new THREE.Mesh(riverGeo, riverMat);
    this.river.position.set(0, -1, -2);
    this.river.isLevelObject = true;
    this.game.scene.add(this.river);
    
    // Setup Stones
    const stoneConfigs = [
      { id: 'ram_stone_1', isRam: true, startPos: new THREE.Vector3(-8, -8, 0), rot: Math.PI * -0.02 },
      { id: 'ram_stone_2', isRam: true, startPos: new THREE.Vector3(4, -12, 0), rot: Math.PI * 0.04 },
      { id: 'simple_stone_1', isRam: false, startPos: new THREE.Vector3(-2, -10, 0), rot: Math.PI * 0.02 },
      { id: 'simple_stone_2', isRam: false, startPos: new THREE.Vector3(8, -8, 0), rot: Math.PI * -0.04 }
    ];
    
    stoneConfigs.forEach(conf => {
      const geo = new THREE.PlaneGeometry(4, 4);
      const mat = this.game.assetManager.getTextureMaterial(conf.id);
      const stone = new THREE.Mesh(geo, mat);
      stone.position.copy(conf.startPos);
      stone.rotation.z = conf.rot;
      stone.userData = { ...conf, placed: false };
      stone.isLevelObject = true;
      this.game.scene.add(stone);
      this.stones.push(stone);
    });

    this.game.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.game.canvas.addEventListener('pointermove', this.onPointerMove);
    this.game.canvas.addEventListener('pointerup', this.onPointerUp);
    this.game.canvas.addEventListener('pointercancel', this.onPointerUp);
    
    this.state = 'PLAYING';
    this.showDialog("Find the stones that belong to Ram.", true);
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
    
    const intersects = this.raycaster.intersectObjects(this.stones);
    if (intersects.length > 0) {
      const stone = intersects[0].object;
      if (!stone.userData.placed) {
        this.draggedStone = stone;
        this.isDragging = true;
        this.draggedStone.scale.set(1.08, 1.08, 1.08);
      }
    }
  }

  onPointerMove(e) {
    if (!this.isDragging || !this.draggedStone) return;
    this.updateMouse(e);
    this.raycaster.setFromCamera(this.mouse, this.game.camera);
    
    const targetZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const targetPos = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(targetZ, targetPos);
    
    if (targetPos) {
      this.draggedStone.position.copy(targetPos);
    }
  }

  onPointerUp(e) {
    if (!this.isDragging || !this.draggedStone) return;
    
    this.isDragging = false;
    this.draggedStone.scale.set(1, 1, 1);
    
    // Check drop inside river bounds roughly (Y between -4 and +2, X between -10 and +10)
    const pos = this.draggedStone.position;
    const inRiver = pos.y > -4 && pos.y < 2 && pos.x > -12 && pos.x < 12;
    
    if (inRiver) {
      if (this.draggedStone.userData.isRam) {
        // Place stone in next slot
        const slot = this.bridgeSlots.find(s => !s.occupied);
        if (slot) {
          slot.occupied = true;
          this.draggedStone.userData.placed = true;
          this.draggedStone.position.copy(slot.pos);
          this.draggedStone.rotation.z = 0; // straighten
          this.placedCount++;
          
          if (this.placedCount >= 2) {
            this.completeLevel();
          }
        }
      } else {
        // Wrong stone
        this.shakeWrongStone(this.draggedStone);
      }
    } else {
      // Return to start
      this.draggedStone.position.copy(this.draggedStone.userData.startPos);
    }
    
    this.draggedStone = null;
  }

  shakeWrongStone(stone) {
    this.showDialog("This stone won't work...", false);
    setTimeout(() => this.showDialog("Look closely at the stones.", true), 2000);
    
    const startX = stone.position.x;
    let shakes = 0;
    const shakeInterval = setInterval(() => {
      stone.position.x = startX + (shakes % 2 === 0 ? 0.5 : -0.5);
      shakes++;
      if (shakes > 5) {
        clearInterval(shakeInterval);
        stone.position.copy(stone.userData.startPos);
      }
    }, 50);
  }

  completeLevel() {
    this.state = 'SUCCESS';
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
