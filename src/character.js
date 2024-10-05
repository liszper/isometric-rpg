import * as THREE from 'three';
import { Vector3, Vector2 } from 'three';
import { search } from './pathfinding';

export class Character extends THREE.Group {
  raycaster = new THREE.Raycaster();
  path = [];
  pathIndex = 0;
  moveSpeed = 3; // Units per second
  rotationSpeed = 5; // Adjust this value to control rotation speed
  currentPosition = new Vector3();
  targetPosition = new Vector3();
  isMoving = false;
  eventListeners = {};
  targetRotation = 0;
  isRotating = false;
  pathVisualization = null; // Change this line
  pathColor = new THREE.Color(Math.random(), Math.random(), Math.random());
  legAngle = 0;
  legAnimationSpeed = 5; // Adjust this to control leg swing speed
  eyeColor = 0xffffff;
  blinkInterval = 3000; // Blink every 3 seconds
  blinkDuration = 150; // Blink lasts for 150ms
  emoteInterval = 10000; // Emote every 10 seconds
  emotes = ['😊', '😄', '🤔', '😎', '🙂'];
  currentEmote = null;
  emoteObject = null;
  jumpHeight = 0.5;
  jumpDuration = 0.5;
  isJumping = false;
  jumpStartTime = 0;

  constructor(world, color = 0x4040c0, scale = 1) {
    super();
    
    // Create character mesh
    const bodyGeometry = new THREE.CapsuleGeometry(0.25 * scale, 0.5 * scale, 2, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color });
    this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.bodyMesh.position.y = 0.5 * scale;
    this.add(this.bodyMesh);

    // Add legs
    this.leftLeg = this.createLeg(scale, -0.15 * scale);
    this.rightLeg = this.createLeg(scale, 0.15 * scale);
    this.add(this.leftLeg, this.rightLeg);

    // Add a small cone to indicate forward direction
    const directionIndicator = new THREE.Mesh(
      new THREE.ConeGeometry(0.1 * scale, 0.2 * scale, 8),
      new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    directionIndicator.position.set(0, 0.5 * scale, 0.3 * scale);
    directionIndicator.rotation.x = Math.PI / 2;
    this.bodyMesh.add(directionIndicator);

    this.world = world;

    this.currentPosition.copy(this.position);
    this.targetPosition.copy(this.position);

    // Change these lines:
    this.pathVisualization = new THREE.Group();
    this.world.add(this.pathVisualization); // Add to the world instead of the scene

    // Add eyes
    this.eyes = this.createEyes(scale);
    this.bodyMesh.add(this.eyes);

    // Start blinking
    this.startBlinking();

    // Add a shadow
    this.addShadow(scale);

    // Add emote object
    this.createEmoteObject(scale);

    // Start emoting
    this.startEmoting();
  }

  createLeg(scale, xOffset) {
    const legGeometry = new THREE.CapsuleGeometry(0.1 * scale, 0.3 * scale, 2, 8);
    const legMaterial = new THREE.MeshStandardMaterial({ color: this.bodyMesh.material.color });
    const leg = new THREE.Mesh(legGeometry, legMaterial);
    leg.position.set(xOffset, 0.15 * scale, 0);
    return leg;
  }

  findPath(startCoords, endCoords) {
    return search(startCoords, endCoords, this.world);
  }

  setDestination(destination) {
    const startCoords = new Vector2(
      Math.floor(this.position.x),
      Math.floor(this.position.z)
    );
    const endCoords = new Vector2(
      Math.floor(destination.x),
      Math.floor(destination.z)
    );

    const nearestWalkableTile = this.findNearestWalkableTile(endCoords, startCoords);

    if (!nearestWalkableTile) {
      return;
    }

    this.clearPathVisualization();

    this.path = search(startCoords, nearestWalkableTile, this.world);

    if (!this.path || this.path.length === 0) {
      this.triggerEvent('noPathFound');
      return;
    }

    this.visualizePath();

    this.pathIndex = 0;
    this.updatePosition();

    const onReachDestination = () => {
      if (this.pathIndex >= this.path.length) {
        const lastStep = this.path[this.path.length - 1];
        const secondLastStep = this.path[this.path.length - 2] || this.path[0];
        const finalDirection = new Vector3(
          lastStep.position.x - secondLastStep.position.x,
          0,
          lastStep.position.y - secondLastStep.position.y
        ).normalize();
        this.faceTowards(this.position.clone().add(finalDirection));
        
        // Replace this.jump() with:
        if (typeof this.jump === 'function') {
          this.jump();
        } else {
          console.warn('jump method is not defined');
        }
        
        this.removeEventListener('reachedPathEnd', onReachDestination);
      }
    };
    this.addEventListener('reachedPathEnd', onReachDestination);
  }

  clearPathVisualization() {
    while (this.pathVisualization.children.length > 0) {
      const child = this.pathVisualization.children[0];
      this.pathVisualization.remove(child);
      child.geometry.dispose();
      child.material.dispose();
    }
  }

  visualizePath() {
    const pathGeometry = new THREE.BufferGeometry();
    const positions = [];

    this.path.forEach((step) => {
      positions.push(step.position.x + 0.5, 0.1, step.position.y + 0.5);
    });

    pathGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const pathMaterial = new THREE.LineBasicMaterial({ color: this.pathColor });
    const pathLine = new THREE.Line(pathGeometry, pathMaterial);
    this.pathVisualization.add(pathLine);

    // Add small spheres at each path point
    const sphereGeometry = new THREE.SphereGeometry(0.1);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: this.pathColor });

    this.path.forEach((step) => {
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(step.position.x + 0.5, 0.1, step.position.y + 0.5);
      this.pathVisualization.add(sphere);
    });
  }

  findNearestWalkableTile(clickedCoords, playerCoords) {
    const maxSearchRadius = 5;
    let nearestTile = null;
    let nearestDistance = Infinity;

    for (let radius = 0; radius <= maxSearchRadius; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
            const tileX = clickedCoords.x + dx;
            const tileY = clickedCoords.y + dy;
            const tileCoords = new Vector2(tileX, tileY);

            if (!this.world.getObject(tileCoords)) {
              const distanceToPlayer = playerCoords.distanceTo(tileCoords);
              if (distanceToPlayer < nearestDistance) {
                nearestDistance = distanceToPlayer;
                nearestTile = tileCoords;
              }
            }
          }
        }
      }
      if (nearestTile) break;
    }

    return nearestTile;
  }

  updatePosition() {
    if (!this.path || this.path.length === 0 || this.pathIndex >= this.path.length) {
      this.isMoving = false;
      this.triggerEvent('reachedPathEnd');
      return;
    }

    const nextStep = this.path[this.pathIndex];
    this.targetPosition.set(nextStep.position.x + 0.5, 0, nextStep.position.y + 0.5);
    this.currentPosition.copy(this.position);
    this.isMoving = true;
  }

  update(deltaTime) {
    if (this.isMoving) {
      const step = this.moveSpeed * deltaTime;
      const distanceToTarget = this.currentPosition.distanceTo(this.targetPosition);

      if (distanceToTarget > step) {
        // Move towards target
        this.currentPosition.lerp(this.targetPosition, step / distanceToTarget);
        this.position.copy(this.currentPosition);

        // Update rotation to face movement direction
        this.updateRotation(deltaTime);

        // Animate legs
        this.animateLegs(deltaTime);
      } else {
        // Reached current target
        this.position.copy(this.targetPosition);
        this.currentPosition.copy(this.targetPosition);
        this.pathIndex++;
        this.updatePosition(); // Move to the next position in the path
      }
    } else {
      // Reset legs to neutral position when not moving
      this.resetLegs();
    }

    // Smooth rotation
    if (this.isRotating) {
      const step = this.rotationSpeed * deltaTime;
      let angleDiff = this.targetRotation - this.rotation.y;
      
      // Ensure we rotate the shortest way
      angleDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
      
      if (Math.abs(angleDiff) < step) {
        this.rotation.y = this.targetRotation;
        this.isRotating = false;
      } else {
        this.rotation.y += Math.sign(angleDiff) * step;
        // Normalize the rotation to keep it between -PI and PI
        this.rotation.y = ((this.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI;
      }
    }

    // Update shadow position
    if (this.shadow) {
      this.shadow.position.x = this.position.x;
      this.shadow.position.z = this.position.z;
    }

    this.updateJump();

    // Make emote face the camera
    if (this.world.camera) {
      this.emoteObject.quaternion.copy(this.world.camera.quaternion);
    }
  }

  updateRotation(deltaTime) {
    const direction = new THREE.Vector3().subVectors(this.targetPosition, this.currentPosition).normalize();
    if (direction.lengthSq() > 0.001) {
      const targetRotation = Math.atan2(direction.x, direction.z);
      const currentRotation = this.rotation.y;
      
      let angleDiff = targetRotation - currentRotation;
      angleDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
      
      const rotationStep = this.rotationSpeed * deltaTime;
      const step = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), rotationStep);
      
      this.rotation.y += step;
      this.rotation.y = ((this.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI;
    }
  }

  moveDirection(direction) {
    const newPosition = this.position.clone().add(direction);
    if (this.canMoveTo(newPosition)) {
      this.position.copy(newPosition);
      this.currentPosition.copy(newPosition);
      this.targetPosition.copy(newPosition);
      this.updateRotation(1 / 60);
    }
  }

  canMoveTo(position) {
    const tileX = Math.floor(position.x);
    const tileZ = Math.floor(position.z);
    return !this.world.getObject(new THREE.Vector2(tileX, tileZ));
  }

  faceTowards(target) {
    const direction = new THREE.Vector3()
      .subVectors(target, this.position)
      .setY(0)
      .normalize();
    
    if (direction.lengthSq() > 0.001) {
      this.targetRotation = Math.atan2(direction.x, direction.z);
      this.isRotating = true;
    }
  }

  addEventListener(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  removeEventListener(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
  }

  triggerEvent(event) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => callback());
    }
  }

  animateLegs(deltaTime) {
    this.legAngle += this.legAnimationSpeed * deltaTime;
    const leftLegY = Math.sin(this.legAngle) * 0.2;
    const rightLegY = Math.sin(this.legAngle + Math.PI) * 0.2;

    this.leftLeg.position.y = 0.15 + leftLegY;
    this.rightLeg.position.y = 0.15 + rightLegY;

    // Add a slight forward/backward motion
    const legForward = Math.cos(this.legAngle) * 0.1;
    this.leftLeg.position.z = legForward;
    this.rightLeg.position.z = -legForward;
  }

  resetLegs() {
    this.leftLeg.position.set(-0.15, 0.15, 0);
    this.rightLeg.position.set(0.15, 0.15, 0);
  }

  createEyes(scale) {
    const eyesGroup = new THREE.Group();
    const eyeGeometry = new THREE.SphereGeometry(0.05 * scale, 16, 16);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: this.eyeColor });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(0.1 * scale, 0.7 * scale, 0.22 * scale);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(-0.1 * scale, 0.7 * scale, 0.22 * scale);
    
    eyesGroup.add(leftEye, rightEye);
    return eyesGroup;
  }

  startBlinking() {
    setInterval(() => {
      this.blink();
    }, this.blinkInterval);
  }

  blink() {
    this.eyes.scale.y = 0.1;
    setTimeout(() => {
      this.eyes.scale.y = 1;
    }, this.blinkDuration);
  }

  addShadow(scale) {
    const shadowGeometry = new THREE.CircleGeometry(0.3 * scale, 32);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
    });
    this.shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.01;
    this.add(this.shadow);
  }

  createEmoteObject(scale) {
    const emoteGeometry = new THREE.PlaneGeometry(0.5 * scale, 0.5 * scale);
    const emoteMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthTest: false,
    });
    this.emoteObject = new THREE.Mesh(emoteGeometry, emoteMaterial);
    this.emoteObject.position.set(0, 1.5 * scale, 0);
    this.emoteObject.renderOrder = 1; // Ensure it renders on top
    this.add(this.emoteObject);
  }

  startEmoting() {
    setInterval(() => {
      this.showRandomEmote();
    }, this.emoteInterval);
  }

  showRandomEmote() {
    this.currentEmote = this.emotes[Math.floor(Math.random() * this.emotes.length)];
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = '48px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.currentEmote, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    this.emoteObject.material.map = texture;
    this.emoteObject.material.opacity = 1;
    this.emoteObject.material.needsUpdate = true;

    setTimeout(() => {
      this.emoteObject.material.opacity = 0;
      this.emoteObject.material.needsUpdate = true;
    }, 2000);
  }

  jump() {
    if (!this.isJumping) {
      this.isJumping = true;
      this.jumpStartTime = Date.now();
    }
  }

  updateJump() {
    if (this.isJumping) {
      const elapsedTime = (Date.now() - this.jumpStartTime) / 1000;
      if (elapsedTime < this.jumpDuration) {
        const jumpProgress = elapsedTime / this.jumpDuration;
        const jumpHeight = Math.sin(jumpProgress * Math.PI) * this.jumpHeight;
        this.position.y = jumpHeight;
      } else {
        this.position.y = 0;
        this.isJumping = false;
      }
    }
  }
}