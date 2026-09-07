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
    this.ram = new THREE.Mesh(new THREE.PlaneGeometry(11, 11), ramMat);
    this.ram.position.set(-7, -2, 0);
    this.ram.isLevelObject = true;
    this.game.scene.add(this.ram);
    
    // Ravan (Right)
    const ravanMat = this.game.assetManager.getTextureMaterial('ravan');
    this.ravan = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), ravanMat);
    this.initialRavanX = 6;
    this.initialRavanY = 0;
    this.ravan.position.set(this.initialRavanX, this.initialRavanY, 0);
    this.ravan.isLevelObject = true;
    this.game.scene.add(this.ravan);
    
    // Arrow (Hidden initially)
    const arrowMat = this.game.assetManager.getTextureMaterial('arrow');
    this.arrow = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.9), arrowMat);
    this.arrow.position.set(this.ram.position.x + 2, this.ram.position.y, 1);
    this.arrow.visible = false;
    this.arrow.isLevelObject = true;
    this.game.scene.add(this.arrow);

    this.setupHitZones();

    this.game.canvas.addEventListener('pointerdown', this.onPointerDown);
    
    this.showStory();
  }
  
  setupHitZones() {
    // Relative hit zones attached to Ravan
    const hitZones = [
      { id: 'head', w: 3, h: 3, x: 0, y: 5, weak: false },
      { id: 'left_heads', w: 3.5, h: 3, x: -3, y: 4, weak: false },
      { id: 'right_heads', w: 3.5, h: 3, x: 3, y: 4, weak: false },
      { id: 'chest', w: 5, h: 3.5, x: 0, y: 1.5, weak: false },
      { id: 'left_arm', w: 3, h: 5, x: -4, y: 0, weak: false },
      { id: 'right_arm', w: 3, h: 5, x: 4, y: 0, weak: false },
      { id: 'left_leg', w: 3, h: 4.5, x: -2, y: -4.8, weak: false },
      { id: 'right_leg', w: 3, h: 4.5, x: 2, y: -4.8, weak: false },
      { id: 'navel', w: 3.5, h: 3, x: 0, y: -1.8, weak: true }, // The navel/nectar weak point
    ];
    
    const hitMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0 });
    
    hitZones.forEach(zone => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(zone.w, zone.h), hitMat);
      mesh.position.set(zone.x, zone.y, 0.1);
      mesh.userData = { id: zone.id, weak: zone.weak };
      this.ravan.add(mesh);
      this.objects.push(mesh);
    });
    
    // Also include Ravan main mesh
    this.objects.push(this.ravan);
  }
  
  showStory() {
    this.storyOverlay = document.createElement('div');
    this.storyOverlay.style.position = 'absolute';
    this.storyOverlay.style.inset = '0';
    this.storyOverlay.style.background = 'rgba(0,0,0,0.75)';
    this.storyOverlay.style.backdropFilter = 'blur(4px)';
    this.storyOverlay.style.display = 'flex';
    this.storyOverlay.style.alignItems = 'center';
    this.storyOverlay.style.justifyContent = 'center';
    this.storyOverlay.style.zIndex = '200';
    this.storyOverlay.style.pointerEvents = 'auto';
    this.storyOverlay.style.padding = '20px';
    
    this.storyOverlay.innerHTML = `
      <div class="wood-panel" style="text-align: center; width: 90%; max-width: 380px; padding: 30px 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.4);">
        <h2 style="color: var(--maroon); font-family: var(--font-display); font-size: 1.8rem; margin-bottom: 12px;">The Final Battle</h2>
        <p style="color: var(--brown); font-size: 1.05rem; line-height: 1.4; margin-bottom: 20px; font-weight: 600;">
          Ram faced Ravan in the final battle. But Ravan could only be defeated by striking his hidden weak point.
        </p>
        <button id="btn-start-battle" class="btn-primary" style="width: 100%;"><span class="btn-title" style="font-size:1.3rem;">FIGHT ➔</span></button>
      </div>
    `;
    
    document.getElementById('hud').appendChild(this.storyOverlay);
    
    document.getElementById('btn-start-battle').addEventListener('click', () => {
      this.storyOverlay.remove();
      this.storyOverlay = null;
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
    
    const intersects = this.raycaster.intersectObjects(this.objects, true);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const obj = hit.object;
      
      let isWeak = false;
      if (obj.userData && obj.userData.weak !== undefined) {
        isWeak = obj.userData.weak;
      } else {
        // Direct tap on Ravan body: check if hit point is near navel
        const worldPos = hit.point;
        const navelY = this.ravan.position.y - 1.8;
        const navelX = this.ravan.position.x;
        if (Math.abs(worldPos.x - navelX) < 1.8 && Math.abs(worldPos.y - navelY) < 1.5) {
          isWeak = true;
        }
      }
      
      this.shootArrow(hit.point, isWeak);
    }
  }
  
  shootArrow(targetPos, isWeakPoint) {
    this.state = 'ANIMATING';
    this.isVictoryHit = isWeakPoint;
    
    // Reset arrow
    this.arrow.position.set(this.ram.position.x + 2, this.ram.position.y, 1);
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
      
      if (dist < 1.2) {
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
    let shakes = 0;
    const shakeInterval = setInterval(() => {
      shakes++;
      this.ravan.position.x = this.initialRavanX + (shakes % 2 === 0 ? 0.4 : -0.4);
      if (shakes > 6) {
        clearInterval(shakeInterval);
        this.ravan.position.x = this.initialRavanX;
        this.state = 'PLAYING';
      }
    }, 45);
  }
  
  triggerVictory() {
    // Big reaction
    this.ravan.material.color.setHex(0xffaaaa);
    let shakes = 0;
    const shakeInterval = setInterval(() => {
      shakes++;
      this.ravan.position.x = this.initialRavanX + (Math.random() - 0.5) * 1.5;
      this.ravan.position.y = this.initialRavanY + (Math.random() - 0.5) * 1.5;
      
      if (shakes > 16) {
        clearInterval(shakeInterval);
        this.ravan.visible = false;
        
        setTimeout(() => {
          this.showRavanVadh();
        }, 400);
      }
    }, 45);
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
      <h1 style="color: var(--orange-main); font-family: var(--font-display); font-size: clamp(2.2rem, 7vw, 4.5rem); text-align: center; text-shadow: 0 4px 12px rgba(0,0,0,0.5); animation: zoomIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); padding: 0 20px;">
        RAVAN VADH!
      </h1>
      <style>@keyframes zoomIn { from { transform: scale(0); } to { transform: scale(1); } }</style>
    `;
    
    document.getElementById('hud').appendChild(textOverlay);
    
    setTimeout(() => {
      textOverlay.remove();
      this.game.showSuccess();
    }, 2200);
  }

  cleanup() {
    if (this.storyOverlay) this.storyOverlay.remove();
    this.game.canvas.removeEventListener('pointerdown', this.onPointerDown);
  }
}
