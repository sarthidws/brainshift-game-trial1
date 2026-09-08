import * as THREE from 'three';

export class BalKandLevel7 {
  constructor(game) {
    this.game = game;
    this.state = 'INTRO'; // INTRO, PLAYING, RETURNING, TRANSFORMING, SUCCESS
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.isDragging = false;
    this.dragOffset = new THREE.Vector3();
    this.footprintStartPos = new THREE.Vector3(-4.8, -4.5, 2);
    this.targetPos = new THREE.Vector3(6.5, -2.0, 0);
    this.successRadius = 4.5; // Generous drop zone for mobile & desktop

    this.time = 0;
    this.animTime = 0;
    this.transformProgress = 0;

    // Return lerp state
    this.returnProgress = 1;
    this.returnStartPos = new THREE.Vector3();

    // Bindings
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onResize = this.onResize.bind(this);
  }

  init() {
    this.game.camera.position.set(0, 0, 10);
    this.game.scene.background = null;

    // 1. Background Setup (Landscape / Portrait adaptive)
    const bgGeo = new THREE.PlaneGeometry(160, 160);
    this.bgMatDesktop = this.game.assetManager.getTextureMaterial('forest_bg');
    this.bgMatMobile = this.game.assetManager.getTextureMaterial('mobile_forest_bg');
    
    const isLandscape = window.innerWidth > window.innerHeight;
    this.bgMat = (isLandscape ? this.bgMatDesktop : this.bgMatMobile).clone();
    this.bg = new THREE.Mesh(bgGeo, this.bgMat);
    this.bg.position.set(0, 0, -6);
    this.bg.isLevelObject = true;
    this.game.scene.add(this.bg);

    // 2. Lord Ram (Left Side, facing Ahalya)
    const ramGeo = new THREE.PlaneGeometry(7.0, 10.0);
    const ramMat = this.game.assetManager.getTextureMaterial('ram');
    this.ram = new THREE.Mesh(ramGeo, ramMat);
    this.ram.position.set(-8.0, -1.5, 0);
    this.ram.isLevelObject = true;
    this.ram.name = "Ram";
    this.game.scene.add(this.ram);

    // 3. Extra Stones / Distractions
    // Distraction 1: Men stone form
    const menStoneGeo = new THREE.PlaneGeometry(4.6, 5.8);
    const menStoneMat = this.game.assetManager.getTextureMaterial('men_stone');
    this.menStone = new THREE.Mesh(menStoneGeo, menStoneMat);
    this.menStone.position.set(1.2, 1.8, -0.5);
    this.menStone.isLevelObject = true;
    this.menStone.name = "MenStone";
    this.game.scene.add(this.menStone);

    // Distraction 2: Simple stone
    const simpleStoneGeo = new THREE.PlaneGeometry(3.5, 3.5);
    const simpleStoneMat = this.game.assetManager.getTextureMaterial('simple_stone_1');
    this.simpleStone = new THREE.Mesh(simpleStoneGeo, simpleStoneMat);
    this.simpleStone.position.set(0.5, -4.8, -0.5);
    this.simpleStone.isLevelObject = true;
    this.simpleStone.name = "SimpleStone";
    this.game.scene.add(this.simpleStone);

    // 4. Ahalya Stone Form (Main Interaction Target)
    const ahalyaStoneGeo = new THREE.PlaneGeometry(6.5, 8.0);
    this.ahalyaStoneMat = this.game.assetManager.getTextureMaterial('ahalya_stone').clone();
    this.ahalyaStone = new THREE.Mesh(ahalyaStoneGeo, this.ahalyaStoneMat);
    this.ahalyaStone.position.copy(this.targetPos);
    this.ahalyaStone.isLevelObject = true;
    this.ahalyaStone.name = "AhalyaStone";
    this.game.scene.add(this.ahalyaStone);

    // 5. Ahalya Human Form (Revealed upon divine transformation)
    const ahalyaHumanGeo = new THREE.PlaneGeometry(7.0, 9.2);
    this.ahalyaHumanMat = this.game.assetManager.getTextureMaterial('ahalya_human').clone();
    this.ahalyaHumanMat.transparent = true;
    this.ahalyaHumanMat.opacity = 0;
    this.ahalyaHuman = new THREE.Mesh(ahalyaHumanGeo, this.ahalyaHumanMat);
    this.ahalyaHuman.position.set(this.targetPos.x, this.targetPos.y + 0.3, 0.1);
    this.ahalyaHuman.scale.set(0.9, 0.9, 0.9);
    this.ahalyaHuman.visible = true;
    this.ahalyaHuman.isLevelObject = true;
    this.ahalyaHuman.name = "AhalyaHuman";
    this.game.scene.add(this.ahalyaHuman);

    // 6. Divine Glow / Halo Ring for transformation
    const glowGeo = new THREE.PlaneGeometry(12, 12);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
    gradient.addColorStop(0, 'rgba(255, 240, 180, 0.95)');
    gradient.addColorStop(0.3, 'rgba(255, 215, 0, 0.7)');
    gradient.addColorStop(0.6, 'rgba(255, 170, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 150, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const glowTex = new THREE.CanvasTexture(canvas);
    this.glowMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.glowMesh = new THREE.Mesh(glowGeo, this.glowMat);
    this.glowMesh.position.set(this.targetPos.x, this.targetPos.y, -0.2);
    this.glowMesh.scale.set(0.5, 0.5, 0.5);
    this.glowMesh.isLevelObject = true;
    this.game.scene.add(this.glowMesh);

    // 7. Footprint Aura (Gentle pulsating aura around draggable footprint)
    const auraGeo = new THREE.PlaneGeometry(4.8, 4.8);
    const auraCanvas = document.createElement('canvas');
    auraCanvas.width = 128;
    auraCanvas.height = 128;
    const auraCtx = auraCanvas.getContext('2d');
    const auraGrad = auraCtx.createRadialGradient(64, 64, 5, 64, 64, 60);
    auraGrad.addColorStop(0, 'rgba(255, 230, 140, 0.8)');
    auraGrad.addColorStop(0.5, 'rgba(255, 190, 50, 0.4)');
    auraGrad.addColorStop(1, 'rgba(255, 180, 0, 0)');
    auraCtx.fillStyle = auraGrad;
    auraCtx.fillRect(0, 0, 128, 128);

    const auraTex = new THREE.CanvasTexture(auraCanvas);
    this.footprintAuraMat = new THREE.MeshBasicMaterial({
      map: auraTex,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.footprintAura = new THREE.Mesh(auraGeo, this.footprintAuraMat);
    this.footprintAura.position.set(0, 0, -0.1);

    // 8. Draggable Sacred Footprint (Ram's sacred stone footprint)
    const footprintGeo = new THREE.PlaneGeometry(3.4, 3.4);
    this.footprintMat = this.game.assetManager.getTextureMaterial('ram_stone_1').clone();
    this.footprint = new THREE.Mesh(footprintGeo, this.footprintMat);
    this.footprint.position.copy(this.footprintStartPos);
    this.footprint.isLevelObject = true;
    this.footprint.name = "RamFootprint";
    this.footprint.add(this.footprintAura);
    this.game.scene.add(this.footprint);

    // Adjust positions for mobile/portrait screens
    this.updateLayout();

    // Event Listeners
    this.game.canvas.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    window.addEventListener('pointermove', this.onPointerMove, { passive: false });
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('resize', this.onResize);

    this.state = 'PLAYING';
    this.showDialog("Liberate Ahalya from the curse.", false);
  }

  updateLayout() {
    const aspect = window.innerWidth / window.innerHeight;
    const isLandscape = aspect > 1.0;

    if (this.bg && this.bgMat) {
      const activeTexMat = isLandscape ? this.bgMatDesktop : this.bgMatMobile;
      if (activeTexMat && activeTexMat.map) {
        this.bgMat.map = activeTexMat.map;
        this.bgMat.needsUpdate = true;
      }
    }

    if (!isLandscape) {
      // Mobile / Portrait Layout
      // Scale and position objects vertically
      this.ram.position.set(-4.8, 4.2, 0);
      this.ram.scale.set(0.85, 0.85, 0.85);

      this.footprintStartPos.set(-2.2, 1.2, 2);
      if (!this.isDragging && this.state === 'PLAYING') {
        this.footprint.position.copy(this.footprintStartPos);
      }

      this.menStone.position.set(4.2, 3.8, -0.5);
      this.menStone.scale.set(0.8, 0.8, 0.8);

      this.simpleStone.position.set(-4.5, -4.8, -0.5);

      this.targetPos.set(1.5, -4.0, 0);
      this.ahalyaStone.position.copy(this.targetPos);
      this.ahalyaHuman.position.set(this.targetPos.x, this.targetPos.y + 0.3, 0.1);
      this.glowMesh.position.set(this.targetPos.x, this.targetPos.y, -0.2);
    } else {
      // Landscape Layout (Desktop & Landscape Mobile)
      this.ram.position.set(-8.0, -1.5, 0);
      this.ram.scale.set(1, 1, 1);

      this.footprintStartPos.set(-4.8, -4.5, 2);
      if (!this.isDragging && this.state === 'PLAYING') {
        this.footprint.position.copy(this.footprintStartPos);
      }

      this.menStone.position.set(1.2, 1.8, -0.5);
      this.menStone.scale.set(1, 1, 1);

      this.simpleStone.position.set(0.5, -4.8, -0.5);

      this.targetPos.set(6.5, -2.0, 0);
      this.ahalyaStone.position.copy(this.targetPos);
      this.ahalyaHuman.position.set(this.targetPos.x, this.targetPos.y + 0.3, 0.1);
      this.glowMesh.position.set(this.targetPos.x, this.targetPos.y, -0.2);
    }
  }

  onResize() {
    this.updateLayout();
  }

  update(delta) {
    this.time += delta;

    // 1. Idle animation for footprint when waiting
    if (this.state === 'PLAYING') {
      if (!this.isDragging) {
        // Floating motion
        const floatOffset = Math.sin(this.time * 2.8) * 0.12;
        this.footprint.position.y = this.footprintStartPos.y + floatOffset;
        
        // Gentle scale pulse
        const pulse = 1.0 + Math.sin(this.time * 2.2) * 0.04;
        this.footprint.scale.set(pulse, pulse, pulse);

        // Aura pulse
        if (this.footprintAuraMat) {
          this.footprintAuraMat.opacity = 0.5 + Math.sin(this.time * 3.5) * 0.25;
        }
      } else {
        // While dragging: slight scale up and active aura
        this.footprint.scale.set(1.15, 1.15, 1.15);
        if (this.footprintAuraMat) {
          this.footprintAuraMat.opacity = 0.85;
        }
      }
    }

    // 2. Returning animation on incorrect drop
    if (this.state === 'RETURNING') {
      this.returnProgress += delta * 3.5; // Return in ~0.28s
      if (this.returnProgress >= 1) {
        this.returnProgress = 1;
        this.footprint.position.copy(this.footprintStartPos);
        this.state = 'PLAYING';
      } else {
        // Smooth ease-out quad
        const t = this.returnProgress;
        const ease = 1 - (1 - t) * (1 - t);
        this.footprint.position.lerpVectors(this.returnStartPos, this.footprintStartPos, ease);
      }
    }

    // 3. Transformation Animation Sequence
    if (this.state === 'TRANSFORMING') {
      this.transformProgress += delta / 1.5; // ~1.5s sequence
      const p = Math.min(1, this.transformProgress);

      // Phase A: Divine glow intensifies & radiates
      if (this.glowMat && this.glowMesh) {
        if (p < 0.6) {
          this.glowMat.opacity = Math.sin((p / 0.6) * Math.PI * 0.5) * 1.0;
          const s = 0.6 + (p / 0.6) * 1.2;
          this.glowMesh.scale.set(s, s, s);
        } else {
          this.glowMat.opacity = (1 - (p - 0.6) / 0.4);
          const s = 1.8 + ((p - 0.6) / 0.4) * 0.4;
          this.glowMesh.scale.set(s, s, s);
        }
        this.glowMesh.rotation.z += delta * 1.2;
      }

      // Phase B: Stone fades out and gently scales
      if (this.ahalyaStoneMat && this.ahalyaStone) {
        const stoneOpacity = Math.max(0, 1 - p * 1.4);
        this.ahalyaStoneMat.opacity = stoneOpacity;
        const stoneScale = 1 + p * 0.08;
        this.ahalyaStone.scale.set(stoneScale, stoneScale, stoneScale);
      }

      // Phase C: Footprint gently dissolves into the divine energy
      if (this.footprintMat) {
        this.footprintMat.opacity = Math.max(0, 1 - p * 1.2);
        if (this.footprintAuraMat) {
          this.footprintAuraMat.opacity = Math.max(0, 1 - p * 1.5);
        }
      }

      // Phase D: Ahalya Human form softly materializes and rises
      if (this.ahalyaHumanMat && this.ahalyaHuman) {
        const humanOpacity = Math.min(1, Math.max(0, (p - 0.25) / 0.7));
        this.ahalyaHumanMat.opacity = humanOpacity;
        const humanScale = 0.9 + Math.sin(Math.min(1, p / 0.9) * Math.PI * 0.5) * 0.1;
        this.ahalyaHuman.scale.set(humanScale, humanScale, humanScale);
        this.ahalyaHuman.position.y = this.targetPos.y + 0.3 + Math.sin(p * Math.PI) * 0.15;
      }

      // Completion
      if (p >= 1) {
        this.state = 'SUCCESS';
        this.completeLevel();
      }
    }
  }

  updateMouse(e) {
    const rect = this.game.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  getPointerWorldPos() {
    this.raycaster.setFromCamera(this.mouse, this.game.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -2); // z=2 plane
    const targetPos = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, targetPos);
    return targetPos;
  }

  onPointerDown(e) {
    if (this.state !== 'PLAYING') return;

    // Prevent default touch gesture scrolling
    if (e.cancelable) e.preventDefault();

    this.updateMouse(e);
    this.raycaster.setFromCamera(this.mouse, this.game.camera);

    // Interactive targets
    const interactiveObjects = [this.footprint, this.menStone, this.simpleStone, this.ahalyaStone];
    const intersects = this.raycaster.intersectObjects(interactiveObjects, true);

    if (intersects.length > 0) {
      const topObj = intersects[0].object;
      
      // Check if player touched footprint or its aura
      if (topObj === this.footprint || topObj === this.footprintAura || topObj.parent === this.footprint) {
        this.isDragging = true;
        const worldPos = this.getPointerWorldPos();
        if (worldPos) {
          this.dragOffset.subVectors(this.footprint.position, worldPos);
        }
      } else if (topObj === this.menStone || topObj === this.simpleStone) {
        // Gentle rock shake on tapping distractors
        this.shakeObject(topObj);
      } else if (topObj === this.ahalyaStone) {
        // Tapped stone directly -> give gentle hint pulse
        this.shakeObject(this.ahalyaStone);
      }
    }
  }

  shakeObject(mesh) {
    const origZ = mesh.rotation.z;
    mesh.rotation.z = origZ + 0.08;
    setTimeout(() => {
      if (mesh) mesh.rotation.z = origZ - 0.08;
      setTimeout(() => {
        if (mesh) mesh.rotation.z = origZ;
      }, 100);
    }, 100);
  }

  onPointerMove(e) {
    if (!this.isDragging || this.state !== 'PLAYING') return;
    if (e.cancelable) e.preventDefault();

    this.updateMouse(e);
    const worldPos = this.getPointerWorldPos();
    if (worldPos) {
      this.footprint.position.copy(worldPos.add(this.dragOffset));
    }
  }

  onPointerUp(e) {
    if (!this.isDragging || this.state !== 'PLAYING') return;
    this.isDragging = false;

    // Check distance to Ahalya's stone
    const distToAhalya = this.footprint.position.distanceTo(this.ahalyaStone.position);

    if (distToAhalya <= this.successRadius) {
      // SUCCESS: Footprint placed on Ahalya's stone!
      this.state = 'TRANSFORMING';
      this.transformProgress = 0;

      // Snap footprint to base of Ahalya stone
      this.footprint.position.set(this.targetPos.x, this.targetPos.y - 2.5, 2);
    } else {
      // INCORRECT DROP: Smoothly glide back to starting position
      this.state = 'RETURNING';
      this.returnProgress = 0;
      this.returnStartPos.copy(this.footprint.position);
    }
  }

  completeLevel() {
    this.game.showSuccess();
  }

  showDialog(text, sticky = false) {
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
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('resize', this.onResize);
  }
}
