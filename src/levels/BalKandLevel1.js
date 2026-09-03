import * as THREE from 'three';

export class BalKandLevel1 {
  constructor(game) {
    this.game = game;
    this.arrowsLeft = 3;
    this.hits = 0;
    this.requiredHits = 2;
    this.state = 'AIMING'; // AIMING, SHOOTING, ARROW_FLYING, ROUND_COMPLETE
    
    this.arrow = null;
    this.power = 0;
    this.maxPower = 30;
    this.isCharging = false;
    this.aimAngle = 0;
    
    this.arrowVelocity = new THREE.Vector3();
    this.gravity = -20;
    
    this.target = null;
    this.targetPos = new THREE.Vector3(20, 5, 0);
  }
  
  init() {
    this.game.camera.position.set(0, 0, 10);
    
    // Environment
    const floorGeo = new THREE.PlaneGeometry(60, 30);
    const floorMat = this.game.assetManager.getTextureMaterial('background');
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, 0, -5);
    floor.isLevelObject = true;
    this.game.scene.add(floor);
    
    // Ram (Player)
    const ramGeo = new THREE.PlaneGeometry(5, 8);
    const ramMat = this.game.assetManager.getTextureMaterial('ram');
    this.ramSprite = new THREE.Mesh(ramGeo, ramMat);
    this.ramSprite.position.set(-12, 0, 0);
    this.ramSprite.isLevelObject = true;
    this.game.scene.add(this.ramSprite);
    
    // Target
    const targetGeo = new THREE.PlaneGeometry(5, 7);
    const targetMat = this.game.assetManager.getTextureMaterial('target');
    this.target = new THREE.Mesh(targetGeo, targetMat);
    this.target.position.copy(this.targetPos);
    this.target.isLevelObject = true;
    this.game.scene.add(this.target);
    
    // Bow
    const bowGeo = new THREE.PlaneGeometry(2, 6);
    const bowMat = this.game.assetManager.getTextureMaterial('bow');
    this.bow = new THREE.Mesh(bowGeo, bowMat);
    this.bow.position.set(-10, 0, 1);
    this.bow.isLevelObject = true;
    this.game.scene.add(this.bow);
    
    // Trajectory Line
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    const lineGeo = new THREE.BufferGeometry();
    this.trajectoryLine = new THREE.Line(lineGeo, lineMat);
    this.trajectoryLine.isLevelObject = true;
    this.game.scene.add(this.trajectoryLine);
    
    this.showDialog("Ram's First Training. Hold E or tap to charge power. Aim using W/S.");
  }
  
  update(delta) {
    if (this.state === 'AIMING') {
      // Aiming
      if (this.game.inputManager.keys['KeyW']) this.aimAngle += 1 * delta;
      if (this.game.inputManager.keys['KeyS']) this.aimAngle -= 1 * delta;
      if (this.game.inputManager.aimDelta !== 0) {
        this.aimAngle += this.game.inputManager.aimDelta;
        this.game.inputManager.aimDelta = 0; // consume the delta
      }
      this.aimAngle = Math.max(-Math.PI/4, Math.min(Math.PI/4, this.aimAngle));
      this.bow.rotation.z = this.aimAngle;
      
      // Charging
      if (this.game.inputManager.isInteracting) {
        this.isCharging = true;
        this.power = Math.min(this.power + 20 * delta, this.maxPower);
      } else if (this.isCharging) {
        // Fire
        this.fireArrow();
      }
      
      this.updateTrajectory();
    } else if (this.state === 'ARROW_FLYING') {
      // Arrow Physics
      this.arrow.position.addScaledVector(this.arrowVelocity, delta);
      this.arrowVelocity.y += this.gravity * delta;
      
      // Arrow rotation
      this.arrow.rotation.z = Math.atan2(this.arrowVelocity.y, this.arrowVelocity.x);
      
      // Check collision
      if (this.arrow.position.distanceTo(this.target.position) < 2) {
        this.onHit();
      } else if (this.arrow.position.y < 0 || this.arrow.position.x > 40) {
        this.onMiss();
      }
    }
  }
  
  updateTrajectory() {
    const points = [];
    let pos = new THREE.Vector3(-10, 0, 1);
    let vel = new THREE.Vector3(Math.cos(this.aimAngle), Math.sin(this.aimAngle), 0).multiplyScalar(this.power);
    
    for (let i = 0; i < 30; i++) {
      points.push(pos.clone());
      pos.addScaledVector(vel, 0.05);
      vel.y += this.gravity * 0.05;
    }
    this.trajectoryLine.geometry.setFromPoints(points);
  }
  
  fireArrow() {
    this.isCharging = false;
    this.state = 'ARROW_FLYING';
    this.trajectoryLine.visible = false;
    
    const arrowGeo = new THREE.PlaneGeometry(3, 0.5);
    const arrowMat = this.game.assetManager.getTextureMaterial('arrow');
    this.arrow = new THREE.Mesh(arrowGeo, arrowMat);
    this.arrow.position.set(-10, 0, 1);
    this.arrow.isLevelObject = true;
    this.game.scene.add(this.arrow);
    
    this.arrowVelocity.set(Math.cos(this.aimAngle), Math.sin(this.aimAngle), 0).multiplyScalar(this.power);
    this.power = 0;
  }
  
  onHit() {
    this.state = 'ROUND_COMPLETE';
    this.hits++;
    this.showDialog("Perfect shot!");
    setTimeout(() => this.nextRound(), 2000);
  }
  
  onMiss() {
    this.state = 'ROUND_COMPLETE';
    this.showDialog("Missed. Try adjusting your angle and power.");
    setTimeout(() => this.nextRound(), 2000);
  }
  
  nextRound() {
    this.arrowsLeft--;
    if (this.arrow) {
      this.game.scene.remove(this.arrow);
      this.arrow = null;
    }
    
    if (this.arrowsLeft <= 0 || this.hits >= this.requiredHits) {
      if (this.hits >= this.requiredHits) {
        this.solvePuzzle();
      } else {
        this.showDialog("Training Failed. Try again.");
        setTimeout(() => this.game.startGame(this.game.gameState.currentLevel), 2000);
      }
    } else {
      this.state = 'AIMING';
      this.trajectoryLine.visible = true;
    }
  }
  
  completeLevel() {
    this.state = 'SUCCESS';
    this.game.showSuccess();
  }
  
  solvePuzzle() {
    this.showDialog("TRAINING COMPLETE. You have learned the first lesson.");
    setTimeout(() => {
      this.completeLevel();
    }, 2000);
  }
  
  showDialog(text) {
    const dialog = document.getElementById('dialog-box');
    const dialogText = document.getElementById('dialog-text');
    dialogText.textContent = text;
    dialog.classList.add('show');
    if (this.dialogTimeout) clearTimeout(this.dialogTimeout);
    this.dialogTimeout = setTimeout(() => {
      dialog.classList.remove('show');
    }, 3000);
  }
  
  cleanup() {
    this.game.removeHeader();
    if (this.dialogTimeout) clearTimeout(this.dialogTimeout);
    document.getElementById('dialog-box').classList.remove('show');
  }
}
