import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class BalKandLevel8 {
  constructor(game) {
    this.game = game;
    this.state = 'LOADING'; // LOADING, TEMPLE_VIEW, TRANSFORMING, SHIVA_VIEW, COMPLETED
    this.time = 0;
    this.transformProgress = 0;
    this.controls = null;
    this.perspectiveCamera = null;
    this.originalCamera = null;
    
    // 3D Model references
    this.templeGroup = null;
    this.shivaGroup = null;
    this.templeTargetScale = 14;
    this.shivaTargetScale = 11;
    this.templeLoaded = false;
    this.shivaLoaded = false;

    // Effects & Visuals
    this.particleMesh = null;
    this.auraRing = null;
    this.glowFlash = null;
    this.sunLight = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.pointerDownPos = new THREE.Vector2();

    // DOM UI
    this.uiContainer = null;
    this.dialogTimeout = null;

    // Bindings
    this.onResize = this.onResize.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
  }

  init() {
    const app = document.getElementById('app') || document.body;
    const width = app.clientWidth || window.innerWidth;
    const height = app.clientHeight || window.innerHeight;
    const aspect = width / height;

    // 1. Perspective Camera Setup
    this.originalCamera = this.game.camera;
    this.perspectiveCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.game.camera = this.perspectiveCamera;
    this.updateCameraLayout();

    // 2. Clear Scene & Setup Sky Background
    this.game.scene.background = new THREE.Color(0xFDF8EE);

    // 3. OrbitControls for 360° Exploration
    this.controls = new OrbitControls(this.perspectiveCamera, this.game.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = true;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 55;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.02; // Keep camera above courtyard ground
    this.controls.minPolarAngle = 0.1;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 1.0;
    this.controls.target.set(0, 4, 0);
    this.controls.update();

    // 4. Lighting Rig
    this.setupLighting();

    // 5. Courtyard Platform
    this.setupCourtyard();

    // 6. Floating Divine Golden Particles & Aura
    this.setupDivineParticles();

    // 7. Setup UI Overlays (Loading Card, Guidance, Tap Banner, Next Button)
    this.setupUI();

    // 8. Load Both 3D Models (Temple + Shiva)
    this.loadModels();

    // Event Listeners
    window.addEventListener('resize', this.onResize);
    this.game.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.game.canvas.addEventListener('pointerup', this.onPointerUp);
  }

  updateCameraLayout() {
    if (!this.perspectiveCamera) return;
    const isPortrait = window.innerHeight > window.innerWidth;
    const camDistance = isPortrait ? 24 : 18;
    const camHeight = isPortrait ? 8.5 : 6.5;
    
    // Smoothly preserve angle if controls exist
    if (this.controls) {
      const currentDir = new THREE.Vector3().subVectors(this.perspectiveCamera.position, this.controls.target).normalize();
      if (currentDir.lengthSq() > 0.1) {
        this.perspectiveCamera.position.copy(this.controls.target).addScaledVector(currentDir, camDistance);
        this.perspectiveCamera.position.y = Math.max(camHeight, this.perspectiveCamera.position.y);
      } else {
        this.perspectiveCamera.position.set(0, camHeight, camDistance);
      }
      this.controls.update();
    } else {
      this.perspectiveCamera.position.set(0, camHeight, camDistance);
    }
  }

  setupLighting() {
    // Warm Sun Directional Light
    this.sunLight = new THREE.DirectionalLight(0xFFF3D6, 2.8);
    this.sunLight.position.set(15, 28, 18);
    this.sunLight.isLevelObject = true;
    this.game.scene.add(this.sunLight);

    // Secondary Soft Fill Light
    const fillLight = new THREE.DirectionalLight(0xFFD699, 1.2);
    fillLight.position.set(-18, 15, -15);
    fillLight.isLevelObject = true;
    this.game.scene.add(fillLight);

    // Divine Shiva Top Spot
    this.shivaSpotLight = new THREE.PointLight(0xFFE082, 0, 30);
    this.shivaSpotLight.position.set(0, 12, 0);
    this.shivaSpotLight.isLevelObject = true;
    this.game.scene.add(this.shivaSpotLight);

    // Hemisphere Ambient (Sky & Warm Earth)
    const hemiLight = new THREE.HemisphereLight(0xFFF6E5, 0x8D6E63, 1.6);
    hemiLight.isLevelObject = true;
    this.game.scene.add(hemiLight);
  }

  setupCourtyard() {
    // Courtyard Stone Base Circle
    const groundGeo = new THREE.CylinderGeometry(18, 18.5, 0.6, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xE8DFD0,
      roughness: 0.8,
      metalness: 0.1
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.position.set(0, -0.3, 0);
    this.ground.isLevelObject = true;
    this.ground.receiveShadow = true;
    this.game.scene.add(this.ground);

    // Outer Decorative Ring
    const ringGeo = new THREE.RingGeometry(18.2, 19.5, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xD4AF37,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    this.outerRing = new THREE.Mesh(ringGeo, ringMat);
    this.outerRing.rotation.x = -Math.PI / 2;
    this.outerRing.position.set(0, 0.02, 0);
    this.outerRing.isLevelObject = true;
    this.game.scene.add(this.outerRing);

    // Divine Manifestation Aura Ring for Shiva
    const auraGeo = new THREE.RingGeometry(4.5, 6.5, 48);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xFFD54F,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });
    this.auraRing = new THREE.Mesh(auraGeo, auraMat);
    this.auraRing.rotation.x = -Math.PI / 2;
    this.auraRing.position.set(0, 0.05, 0);
    this.auraRing.isLevelObject = true;
    this.game.scene.add(this.auraRing);
  }

  setupDivineParticles() {
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const radius = 4 + Math.random() * 16;
      const theta = Math.random() * Math.PI * 2;
      const y = Math.random() * 20;

      positions[i * 3] = radius * Math.cos(theta);
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = radius * Math.sin(theta);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 245, 180, 1)');
    grad.addColorStop(0.3, 'rgba(255, 195, 65, 0.85)');
    grad.addColorStop(0.8, 'rgba(255, 160, 0, 0.2)');
    grad.addColorStop(1, 'rgba(255, 140, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.PointsMaterial({
      size: 0.95,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xFFE082
    });

    this.particleMesh = new THREE.Points(geometry, material);
    this.particleMesh.isLevelObject = true;
    this.game.scene.add(this.particleMesh);
  }

  loadModels() {
    let basePath = import.meta.env.BASE_URL || '/';
    if (!basePath.endsWith('/')) basePath += '/';
    const templeUrl = basePath + 'models/temple.glb';
    const shivaUrl = basePath + 'models/godsfavoritearts-shiva-1856.glb';

    const loader = new GLTFLoader();
    let loadedCount = 0;

    const checkBothLoaded = () => {
      loadedCount++;
      if (loadedCount >= 2) {
        this.state = 'TEMPLE_VIEW';
        this.hideLoading();
        this.showTempleUI();
        this.showDialog("🕉️ Explore the sacred temple in 360°! Tap the temple to reveal Lord Shiva.", false);
      }
    };

    // 1. Load Temple Model
    loader.load(
      templeUrl,
      (gltf) => {
        this.templeGroup = gltf.scene;
        this.templeGroup.isLevelObject = true;
        this.templeGroup.name = "TempleModel";

        this.templeGroup.traverse((child) => {
          child.isLevelObject = true;
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) child.material.side = THREE.DoubleSide;
          }
        });

        // Compute Bounding Box & Normalize Scale
        const box = new THREE.Box3().setFromObject(this.templeGroup);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 14 / (maxDim || 1);
        this.templeTargetScale = scale;
        this.templeGroup.scale.setScalar(scale);

        // Place on Courtyard Ground
        const scaledBox = new THREE.Box3().setFromObject(this.templeGroup);
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
        this.templeGroup.position.x = -scaledCenter.x;
        this.templeGroup.position.y = -scaledBox.min.y;
        this.templeGroup.position.z = -scaledCenter.z;

        this.game.scene.add(this.templeGroup);
        this.templeLoaded = true;
        this.updateLoadingProgress(50);
        checkBothLoaded();
      },
      (xhr) => {
        if (xhr.lengthComputable && xhr.total > 0) {
          const percent = Math.round((xhr.loaded / xhr.total) * 45);
          this.updateLoadingProgress(percent);
        }
      },
      (err) => {
        console.error('Error loading temple.glb:', err);
        checkBothLoaded();
      }
    );

    // 2. Load Shiva Model
    loader.load(
      shivaUrl,
      (gltf) => {
        this.shivaGroup = gltf.scene;
        this.shivaGroup.isLevelObject = true;
        this.shivaGroup.name = "ShivaModel";

        this.shivaGroup.traverse((child) => {
          child.isLevelObject = true;
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.side = THREE.DoubleSide;
              // Enhance material sheen for divine statue
              if (child.material.isMeshStandardMaterial) {
                child.material.roughness = 0.45;
                child.material.metalness = 0.25;
              }
            }
          }
        });

        // Normalize Scale (~11 units height)
        const box = new THREE.Box3().setFromObject(this.shivaGroup);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 11.5 / (maxDim || 1);
        this.shivaTargetScale = scale;

        // Position at Center
        this.shivaGroup.scale.set(0.001, 0.001, 0.001); // Initial scale 0 before reveal
        this.shivaGroup.position.set(0, 0.2, 0);
        this.shivaGroup.visible = false;

        this.game.scene.add(this.shivaGroup);
        this.shivaLoaded = true;
        this.updateLoadingProgress(95);
        checkBothLoaded();
      },
      (xhr) => {
        if (xhr.lengthComputable && xhr.total > 0) {
          const percent = 50 + Math.round((xhr.loaded / xhr.total) * 45);
          this.updateLoadingProgress(percent);
        }
      },
      (err) => {
        console.error('Error loading Shiva model:', err);
        checkBothLoaded();
      }
    );
  }

  setupUI() {
    this.uiContainer = document.createElement('div');
    this.uiContainer.className = 'temple-level-ui';
    this.uiContainer.id = 'temple-level-ui';

    this.uiContainer.innerHTML = `
      <!-- Loading Overlay -->
      <div id="temple-loading-card" class="temple-loading-card active">
        <div class="temple-loading-icon">🕉️</div>
        <div class="temple-loading-title">Loading Sacred Mandir</div>
        <div class="temple-loading-subtitle">Preparing 360° Divine Architecture...</div>
        <div class="temple-loading-bar-bg">
          <div id="temple-progress-bar" class="temple-loading-bar-fill" style="width: 20%;"></div>
        </div>
      </div>

      <!-- 360 Exploration Guidance Badge -->
      <div id="temple-360-guide" class="temple-360-guide">
        <div class="temple-guide-icon">🔄</div>
        <div class="temple-guide-text">
          <span id="temple-guide-main">Drag to rotate 360°</span>
          <span id="temple-guide-sub" class="temple-guide-sub">Pinch / Scroll to zoom • Tap temple to enter</span>
        </div>
      </div>

      <!-- Interactive Tap Temple Callout Banner -->
      <div id="temple-tap-prompt" class="temple-tap-prompt">
        <button id="btn-tap-temple" class="temple-tap-pill" aria-label="Tap Temple to Reveal Lord Shiva">
          <span class="temple-tap-icon">✨</span>
          <span class="temple-tap-title">TAP TEMPLE TO REVEAL LORD SHIVA</span>
          <span class="temple-tap-pulse"></span>
        </button>
      </div>

      <!-- Action Button Panel (Next Level) -->
      <div id="temple-action-panel" class="temple-action-panel">
        <button id="btn-temple-next" class="btn-primary temple-next-btn">
          <span class="btn-title">NEXT LEVEL ➔</span>
          <span class="btn-subtitle">Continue The Journey</span>
        </button>
      </div>
    `;

    document.getElementById('hud')?.appendChild(this.uiContainer);

    // Tap Prompts and Next Level triggers
    const tapBtn = this.uiContainer.querySelector('#btn-tap-temple');
    if (tapBtn) {
      const handleTap = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        this.triggerDivineManifestation();
      };
      tapBtn.addEventListener('click', handleTap);
      tapBtn.addEventListener('pointerup', handleTap);
    }

    const nextBtn = this.uiContainer.querySelector('#btn-temple-next');
    if (nextBtn) {
      const handleNext = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        this.completeLevel();
      };
      nextBtn.addEventListener('click', handleNext);
      nextBtn.addEventListener('pointerup', handleNext);
    }
  }

  updateLoadingProgress(percent) {
    const bar = document.getElementById('temple-progress-bar');
    if (bar) {
      bar.style.width = `${Math.min(100, Math.max(20, percent))}%`;
    }
  }

  hideLoading() {
    const loadingCard = document.getElementById('temple-loading-card');
    if (loadingCard) {
      loadingCard.classList.remove('active');
      setTimeout(() => loadingCard.remove(), 400);
    }
  }

  showTempleUI() {
    const guide = document.getElementById('temple-360-guide');
    const tapPrompt = document.getElementById('temple-tap-prompt');
    if (guide) guide.classList.add('active');
    if (tapPrompt) tapPrompt.classList.add('active');
  }

  onPointerDown(e) {
    this.pointerDownPos.set(e.clientX, e.clientY);
    if (this.controls) {
      this.controls.autoRotate = false;
      if (this.resumeRotateTimer) clearTimeout(this.resumeRotateTimer);
      this.resumeRotateTimer = setTimeout(() => {
        if (this.controls && (this.state === 'TEMPLE_VIEW' || this.state === 'SHIVA_VIEW')) {
          this.controls.autoRotate = true;
        }
      }, 5000);
    }
  }

  onPointerUp(e) {
    // Detect tap / click (minimal drag distance)
    const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
    if (dist < 15 && this.state === 'TEMPLE_VIEW') {
      this.triggerDivineManifestation();
    }
  }

  triggerDivineManifestation() {
    if ((this.state !== 'TEMPLE_VIEW' && this.state !== 'LOADING') || !this.shivaGroup) return;
    this.state = 'TRANSFORMING';
    this.transformProgress = 0;

    // Hide Tap Prompt
    const tapPrompt = document.getElementById('temple-tap-prompt');
    if (tapPrompt) tapPrompt.classList.remove('active');

    // Make Shiva visible & start scaling
    this.shivaGroup.visible = true;

    // Show celebratory dialogue
    this.showDialog("🕉️ Har Har Mahadev! Divine Darshan of Lord Shiva revealed.", false);

    // Update guidance text
    const guideMain = document.getElementById('temple-guide-main');
    const guideSub = document.getElementById('temple-guide-sub');
    if (guideMain) guideMain.textContent = "✨ Explore Lord Shiva in 360°";
    if (guideSub) guideSub.textContent = "Drag to rotate • Pinch / Scroll to zoom";
  }

  onResize() {
    const app = document.getElementById('app') || document.body;
    const width = app.clientWidth || window.innerWidth;
    const height = app.clientHeight || window.innerHeight;
    const aspect = width / height;

    if (this.perspectiveCamera) {
      this.perspectiveCamera.aspect = aspect;
      this.perspectiveCamera.updateProjectionMatrix();
    }
    this.updateCameraLayout();
  }

  update(delta) {
    this.time += delta;

    // Update OrbitControls
    if (this.controls) {
      this.controls.update();
    }

    // Animate Divine Particles
    if (this.particleMesh) {
      const positions = this.particleMesh.geometry.attributes.position.array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 1] += delta * 0.9;
        if (positions[i * 3 + 1] > 20) {
          positions[i * 3 + 1] = 0.5;
        }
      }
      this.particleMesh.geometry.attributes.position.needsUpdate = true;
      this.particleMesh.rotation.y += delta * 0.07;
    }

    // Outer decorative ring animation
    if (this.outerRing) {
      this.outerRing.rotation.z += delta * 0.12;
    }

    // Handle Manifestation Transformation Animation
    if (this.state === 'TRANSFORMING') {
      this.transformProgress += delta / 2.2; // 2.2 second smooth transition
      const p = Math.min(1, this.transformProgress);
      // Smooth ease-out cubic
      const ease = 1 - Math.pow(1 - p, 3);

      // 1. Temple Transition: Gracefully scale back slightly & raise sanctum
      if (this.templeGroup) {
        const templeScale = this.templeTargetScale * (1 - ease * 0.2);
        this.templeGroup.scale.setScalar(templeScale);
        this.templeGroup.position.z = -ease * 3.5;
      }

      // 2. Shiva Manifestation: Rising & Scaling
      if (this.shivaGroup) {
        const shivaScale = this.shivaTargetScale * ease;
        this.shivaGroup.scale.setScalar(shivaScale);
        this.shivaGroup.position.y = 0.2 + Math.sin(p * Math.PI * 0.5) * 0.6;
        this.shivaGroup.rotation.y = (1 - ease) * Math.PI * 0.5;
      }

      // 3. Aura & Lighting Pulse
      if (this.auraRing) {
        this.auraRing.material.opacity = ease * 0.85;
        this.auraRing.scale.setScalar(1 + Math.sin(this.time * 3) * 0.08);
      }
      if (this.shivaSpotLight) {
        this.shivaSpotLight.intensity = ease * 4.5;
      }

      // 4. Transformation Complete -> Show Next Level button
      if (p >= 1) {
        this.state = 'SHIVA_VIEW';
        const actionPanel = document.getElementById('temple-action-panel');
        if (actionPanel) actionPanel.classList.add('active');
      }
    }

    // Continuous Living Animation in Shiva View
    if (this.state === 'SHIVA_VIEW' && this.shivaGroup) {
      // Divine subtle levitation float
      this.shivaGroup.position.y = 0.8 + Math.sin(this.time * 1.8) * 0.2;
      if (this.auraRing) {
        this.auraRing.rotation.z += delta * 0.3;
        this.auraRing.material.opacity = 0.75 + Math.sin(this.time * 2.5) * 0.15;
      }
    }
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
      }, 4000);
    }
  }

  completeLevel() {
    if (this.state === 'COMPLETED') return;
    this.state = 'COMPLETED';

    // Hide UI
    const guide = document.getElementById('temple-360-guide');
    const actionPanel = document.getElementById('temple-action-panel');
    const tapPrompt = document.getElementById('temple-tap-prompt');
    if (guide) guide.classList.remove('active');
    if (actionPanel) actionPanel.classList.remove('active');
    if (tapPrompt) tapPrompt.classList.remove('active');

    // Trigger standard victory overlay
    this.game.showSuccess();
  }

  cleanup() {
    this.game.removeHeader();

    if (this.dialogTimeout) {
      clearTimeout(this.dialogTimeout);
    }
    const dialog = document.getElementById('dialog-box');
    if (dialog) dialog.classList.remove('show');

    if (this.resumeRotateTimer) {
      clearTimeout(this.resumeRotateTimer);
    }

    // Remove DOM UI
    if (this.uiContainer) {
      this.uiContainer.remove();
      this.uiContainer = null;
    }

    // Dispose OrbitControls
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }

    // Restore Original Camera
    if (this.originalCamera) {
      this.game.camera = this.originalCamera;
    }

    // Remove Event Listeners
    window.removeEventListener('resize', this.onResize);
    this.game.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.game.canvas.removeEventListener('pointerup', this.onPointerUp);
  }
}
