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
    this.templeTargetScale = 8.8; // Well-proportioned scale for both mobile and desktop
    this.shivaTargetScale = 7.2;
    this.templeLoaded = false;
    this.shivaLoaded = false;

    // Visuals
    this.particleMesh = null;
    this.auraRing = null;
    this.shivaSpotLight = null;
    this.sunLight = null;
    this.ground = null;
    this.outerRing = null;

    // Interaction
    this.pointerDownPos = new THREE.Vector2();
    this.pointerDownTime = 0;
    this.resumeRotateTimer = null;

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

    // 1. Perspective Camera Setup (Optimized FOV & Framing)
    this.originalCamera = this.game.camera;
    this.perspectiveCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.game.camera = this.perspectiveCamera;

    const isPortrait = height > width;
    const camDistance = isPortrait ? 22 : 17;
    const camHeight = isPortrait ? 8.0 : 6.0;
    this.perspectiveCamera.position.set(0, camHeight, camDistance);

    // 2. Clear Scene & Setup Sky Background
    this.game.scene.background = new THREE.Color(0xFDF8EE);

    // 3. OrbitControls attached to full-screen container for touch & mouse 360 rotation & pinch zoom
    const domTarget = document.getElementById('app') || this.game.canvas;
    this.controls = new OrbitControls(this.perspectiveCamera, domTarget);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enableRotate = true;
    this.controls.enableZoom = true;
    this.controls.enablePan = false; // Keep models centered
    this.controls.rotateSpeed = 0.9;
    this.controls.zoomSpeed = 1.1;
    this.controls.minDistance = 7;
    this.controls.maxDistance = 45;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.02; // Keep camera above courtyard ground
    this.controls.minPolarAngle = 0.1;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 1.0;
    this.controls.target.set(0, 3.0, 0);
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    this.controls.update();

    // 4. Lighting Rig
    this.setupLighting();

    // 5. Courtyard Platform (Scaled to fit nicely)
    this.setupCourtyard();

    // 6. Floating Divine Golden Particles & Aura
    this.setupDivineParticles();

    // 7. Setup UI Overlays (Loading Card, Guidance, Tap Banner, Next Button)
    this.setupUI();

    // 8. Load Both 3D Models (Temple + Shiva)
    this.loadModels();

    // Event Listeners
    window.addEventListener('resize', this.onResize);
    domTarget.addEventListener('pointerdown', this.onPointerDown, { passive: true });
    domTarget.addEventListener('pointerup', this.onPointerUp, { passive: true });
  }

  setupLighting() {
    // Warm Sun Directional Light
    this.sunLight = new THREE.DirectionalLight(0xFFF3D6, 2.8);
    this.sunLight.position.set(15, 26, 18);
    this.sunLight.isLevelObject = true;
    this.game.scene.add(this.sunLight);

    // Secondary Soft Fill Light
    const fillLight = new THREE.DirectionalLight(0xFFD699, 1.2);
    fillLight.position.set(-18, 15, -15);
    fillLight.isLevelObject = true;
    this.game.scene.add(fillLight);

    // Divine Shiva Top Spotlight
    this.shivaSpotLight = new THREE.PointLight(0xFFE082, 0, 30);
    this.shivaSpotLight.position.set(0, 10, 2.5);
    this.shivaSpotLight.isLevelObject = true;
    this.game.scene.add(this.shivaSpotLight);

    // Hemisphere Ambient (Sky & Warm Earth)
    const hemiLight = new THREE.HemisphereLight(0xFFF6E5, 0x8D6E63, 1.6);
    hemiLight.isLevelObject = true;
    this.game.scene.add(hemiLight);
  }

  setupCourtyard() {
    // Courtyard Stone Base Circle
    const groundGeo = new THREE.CylinderGeometry(14, 14.5, 0.5, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xEAE2D5,
      roughness: 0.8,
      metalness: 0.1
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.position.set(0, -0.25, 0);
    this.ground.isLevelObject = true;
    this.ground.receiveShadow = true;
    this.game.scene.add(this.ground);

    // Outer Decorative Ring
    const ringGeo = new THREE.RingGeometry(14.2, 15.2, 48);
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

    // Divine Manifestation Aura Ring for Shiva (placed at foreground position z = 2.5)
    const auraGeo = new THREE.RingGeometry(3.2, 4.8, 48);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xFFD54F,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });
    this.auraRing = new THREE.Mesh(auraGeo, auraMat);
    this.auraRing.rotation.x = -Math.PI / 2;
    this.auraRing.position.set(0, 0.05, 2.5);
    this.auraRing.isLevelObject = true;
    this.game.scene.add(this.auraRing);
  }

  setupDivineParticles() {
    const particleCount = 180;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const radius = 3 + Math.random() * 13;
      const theta = Math.random() * Math.PI * 2;
      const y = Math.random() * 16;

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
      size: 0.9,
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
        this.showDialog("🕉️ Explore the temple in 360°! Tap to reveal Lord Shiva.", false);
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

        // Compute Bounding Box & Normalize Scale (Height ~8.8)
        const box = new THREE.Box3().setFromObject(this.templeGroup);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = this.templeTargetScale / (maxDim || 1);
        this.templeGroup.scale.setScalar(scale);

        // Place at origin initially
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
              if (child.material.isMeshStandardMaterial) {
                child.material.roughness = 0.45;
                child.material.metalness = 0.25;
              }
            }
          }
        });

        // Normalize Scale (Height ~7.2)
        const box = new THREE.Box3().setFromObject(this.shivaGroup);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = this.shivaTargetScale / (maxDim || 1);
        this.shivaTargetScale = scale;

        // Position in foreground (z = 2.5) with initial scale 0 (hidden until revealed)
        this.shivaGroup.scale.set(0.001, 0.001, 0.001);
        this.shivaGroup.position.set(0, 0.2, 2.5);
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

    // Stop propagation on buttons so clicking doesn't rotate OrbitControls
    const tapBtn = this.uiContainer.querySelector('#btn-tap-temple');
    if (tapBtn) {
      const handleTap = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        this.triggerDivineManifestation();
      };
      ['click', 'pointerup', 'touchend'].forEach(evt => tapBtn.addEventListener(evt, handleTap));
      ['pointerdown', 'touchstart', 'mousedown'].forEach(evt => tapBtn.addEventListener(evt, e => e.stopPropagation()));
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
      ['click', 'pointerup', 'touchend'].forEach(evt => nextBtn.addEventListener(evt, handleNext));
      ['pointerdown', 'touchstart', 'mousedown'].forEach(evt => nextBtn.addEventListener(evt, e => e.stopPropagation()));
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
    this.pointerDownTime = performance.now();
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
    // Detect tap / click (minimal drag distance & quick duration)
    const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
    const duration = performance.now() - this.pointerDownTime;
    if (dist < 15 && duration < 500 && this.state === 'TEMPLE_VIEW') {
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

    // Make Shiva visible
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
  }

  update(delta) {
    this.time += delta;

    // Update OrbitControls with damping
    if (this.controls) {
      this.controls.update();
    }

    // Animate Divine Particles
    if (this.particleMesh) {
      const positions = this.particleMesh.geometry.attributes.position.array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 1] += delta * 0.8;
        if (positions[i * 3 + 1] > 16) {
          positions[i * 3 + 1] = 0.5;
        }
      }
      this.particleMesh.geometry.attributes.position.needsUpdate = true;
      this.particleMesh.rotation.y += delta * 0.06;
    }

    // Outer decorative ring animation
    if (this.outerRing) {
      this.outerRing.rotation.z += delta * 0.1;
    }

    // Handle Manifestation Transformation Animation (Separating Temple into Background with Clear Gap)
    if (this.state === 'TRANSFORMING') {
      this.transformProgress += delta / 2.2; // 2.2 second smooth transition
      const p = Math.min(1, this.transformProgress);
      // Smooth ease-out cubic
      const ease = 1 - Math.pow(1 - p, 3);

      // 1. Temple Transition: Glides back to z = -8.5 with clear gap behind Shiva
      if (this.templeGroup) {
        this.templeGroup.position.z = -ease * 8.5;
      }

      // 2. Shiva Manifestation: Rising in Foreground (z = 2.5) with scaling
      if (this.shivaGroup) {
        const shivaScale = this.shivaTargetScale * ease;
        this.shivaGroup.scale.setScalar(shivaScale);
        this.shivaGroup.position.set(0, 0.2 + Math.sin(p * Math.PI * 0.5) * 0.5, 2.5);
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
      // Gentle divine floating levitation
      this.shivaGroup.position.y = 0.6 + Math.sin(this.time * 1.8) * 0.2;
      if (this.auraRing) {
        this.auraRing.rotation.z += delta * 0.25;
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
    const domTarget = document.getElementById('app') || this.game.canvas;
    window.removeEventListener('resize', this.onResize);
    if (domTarget) {
      domTarget.removeEventListener('pointerdown', this.onPointerDown);
      domTarget.removeEventListener('pointerup', this.onPointerUp);
    }
  }
}
