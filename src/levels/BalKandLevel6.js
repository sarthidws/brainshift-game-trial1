import * as THREE from 'three';

export class BalKandLevel6 {
  constructor(game) {
    this.game = game;
    this.state = 'STORY';
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.objects = []; // Hit zones
    
    this.onPointerDown = this.onPointerDown.bind(this);
    
    this.arrowVelocity = 40; // units per second
    this.arrowTarget = null;
    this.isVictoryHit = false;
  }

  init() {
    this.game.camera.position.set(0, 0, 10);
    this.game.scene.background = null;

    // Background
    const bgGeo = new THREE.PlaneGeometry(150, 150);
    const bgMat = this.game.assetManager.getTextureMaterial('level3bg');
    this.bg = new THREE.Mesh(bgGeo, bgMat);
    this.bg.position.set(0, 0, -5);
    this.bg.isLevelObject = true;
    this.game.scene.add(this.bg);

    // Sun
    const sunMat = this.game.assetManager.getTextureMaterial('sun');
    this.sun = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), sunMat);
    this.sun.position.set(0, 12, -4);
    this.sun.isLevelObject = true;
    this.game.scene.add(this.sun);
    
    // Ram (Left)
    const ramMat = this.game.assetManager.getTextureMaterial('ram_bow');
    this.ram = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), ramMat);
    this.ram.position.set(-10, -2, 0);
    this.ram.isLevelObject = true;
    this.game.scene.add(this.ram);
    
    // Ravan (Right)
    const ravanMat = this.game.assetManager.getTextureMaterial('ravan');
    this.ravan = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), ravanMat);
    this.ravan.position.set(8, 0, 0);
    this.ravan.isLevelObject = true;
    this.game.scene.add(this.ravan);
    
    // Arrow (Hidden initially)
    const arrowMat = this.game.assetManager.getTextureMaterial('arrow');
    this.arrow = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), arrowMat);
    this.arrow.position.set(-8, -2, 1);
    this.arrow.visible = false;
    this.arrow.isLevelObject = true;
    this.game.scene.add(this.arrow);

    this.setupHitZones();

    this.game.canvas.addEventListener('pointerdown', this.onPointerDown);
    
    this.showStory();
  }
  
  setupHitZones() {
    // Create invisible meshes over Ravan for hit detection
    const hitZones = [
      { id: 'head', w: 3, h: 3, x: 8, y: 5, weak: false },
      { id: 'left_heads', w: 4, h: 3, x: 5, y: 4, weak: false },
      { id: 'right_heads', w: 4, h: 3, x: 11, y: 4, weak: false },
      { id: 'chest', w: 5, h: 4, x: 8, y: 1, weak: false },
      { id: 'left_arm', w: 3, h: 5, x: 4, y: 0, weak: false },
      { id: 'right_arm', w: 3, h: 5, x: 12, y: 0, weak: false },
      { id: 'left_leg', w: 3, h: 5, x: 6, y: -5, weak: false },
      { id: 'right_leg', w: 3, h: 5, x: 10, y: -5, weak: false },
      { id: 'navel', w: 3, h: 3, x: 8, y: -2, weak: true }, // The weak point
    ];
    
    const hitMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0 }); // Invisible
    
    hitZones.forEach(zone => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(zone.w, zone.h), hitMat);
      mesh.position.set(zone.x, zone.y, 1);
      mesh.userData = { id: zone.id, weak: zone.weak };
      mesh.isLevelObject = true;
      this.game.scene.add(mesh);
      this.objects.push(mesh);
    });
  }
  
  showStory() {
    this.storyOverlay = document.createElement('div');
    this.storyOverlay.style.position = 'absolute';
    this.storyOverlay.style.inset = '0';
    this.storyOverlay.style.background = 'rgba(0,0,0,0.8)';
    this.storyOverlay.style.display = 'flex';
    this.storyOverlay.style.alignItems = 'center';
    this.storyOverlay.style.justifyContent = 'center';
    this.storyOverlay.style.zIndex = '200';
    this.storyOverlay.style.pointerEvents = 'auto';
    this.storyOverlay.style.padding = '20px';
    
    this.storyOverlay.innerHTML = `
      <div class="wood-panel" style="text-align: center; max-width: 400px; padding: 30px;">
        <h2 style="color: var(--maroon); font-family: var(--font-display); font-size: 1.8rem; margin-bottom: 15px;">The Final Battle</h2>
        <p style="color: var(--brown); font-size: 1.1rem; line-height: 1.5; margin-bottom: 25px;">
          Ram faced Ravan in the final battle. But Ravan could only be defeated by striking his hidden weak point.
        </p>
        <button id="btn-start-battle" class="btn-primary" style="width: 100%;">FIGHT</button>
      </div>
    `;
    
    document.getElementById('hud').appendChild(this.storyOverlay);
    
    document.getElementById('btn-start-battle').addEventListener('click', () => {
      this.storyOverlay.remove();
      this.state = 'PLAYING';
    });
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
    
    const intersects = this.raycaster.intersectObjects(this.objects);
    if (intersects.length > 0) {
      const obj = intersects[0].object;
      this.shootArrow(intersects[0].point, obj.userData.weak);
    }
  }
  
  shootArrow(targetPos, isWeakPoint) {
    this.state = 'ANIMATING';
    this.isVictoryHit = isWeakPoint;
    
    // Reset arrow
    this.arrow.position.set(-8, -2, 1);
    this.arrow.visible = true;
    
    this.arrowTarget = targetPos.clone();
    this.arrowTarget.z = 1; // keep above elements
    
    // Rotate arrow to face target
    const angle = Math.atan2(this.arrowTarget.y - this.arrow.position.y, this.arrowTarget.x - this.arrow.position.x);
    this.arrow.rotation.z = angle;
  }

  update(delta) {
    if (this.state === 'ANIMATING' && this.arrowTarget) {
      const dist = this.arrow.position.distanceTo(this.arrowTarget);
      
      if (dist < 1) {
        // Hit reached
        this.state = 'HIT';
        this.arrow.visible = false;
        
        if (this.isVictoryHit) {
          this.triggerVictory();
        } else {
          this.triggerWrongHit();
        }
      } else {
        // Move arrow
        const dir = new THREE.Vector3().subVectors(this.arrowTarget, this.arrow.position).normalize();
        this.arrow.position.add(dir.multiplyScalar(this.arrowVelocity * delta));
      }
    }
  }
  
  triggerWrongHit() {
    // Small shake on Ravan
    const startX = this.ravan.position.x;
    let shakes = 0;
    const shakeInterval = setInterval(() => {
      shakes++;
      this.ravan.position.x = startX + (shakes % 2 === 0 ? 0.5 : -0.5);
      if (shakes > 5) {
        clearInterval(shakeInterval);
        this.ravan.position.x = startX;
        this.state = 'PLAYING'; // Let user try again
      }
    }, 50);
  }
  
  triggerVictory() {
    // Big reaction
    this.ravan.material.color.setHex(0xffaaaa);
    let shakes = 0;
    const shakeInterval = setInterval(() => {
      shakes++;
      this.ravan.position.x = 8 + (Math.random() - 0.5) * 2;
      this.ravan.position.y = 0 + (Math.random() - 0.5) * 2;
      
      if (shakes > 20) {
        clearInterval(shakeInterval);
        this.ravan.visible = false;
        
        setTimeout(() => {
          this.showRavanVadh();
        }, 500);
      }
    }, 50);
  }
  
  showRavanVadh() {
    const textOverlay = document.createElement('div');
    textOverlay.style.position = 'absolute';
    textOverlay.style.inset = '0';
    textOverlay.style.display = 'flex';
    textOverlay.style.alignItems = 'center';
    textOverlay.style.justifyContent = 'center';
    textOverlay.style.zIndex = '200';
    
    textOverlay.innerHTML = `
      <h1 style="color: var(--orange-main); font-family: var(--font-display); font-size: clamp(2.5rem, 8vw, 5rem); text-align: center; text-shadow: 0 5px 15px rgba(0,0,0,0.5); animation: zoomIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
        RAVAN VADH!
      </h1>
      <style>@keyframes zoomIn { from { transform: scale(0); } to { transform: scale(1); } }</style>
    `;
    
    document.getElementById('hud').appendChild(textOverlay);
    
    setTimeout(() => {
      textOverlay.remove();
      this.game.showSuccess();
    }, 2500);
  }

  cleanup() {
    if (this.storyOverlay) this.storyOverlay.remove();
    this.game.canvas.removeEventListener('pointerdown', this.onPointerDown);
  }
}
