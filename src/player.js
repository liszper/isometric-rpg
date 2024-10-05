import * as THREE from 'three';
import { Vector3 } from 'three';
import { search } from './pathfinding';

export class Player extends THREE.Group {
  raycaster = new THREE.Raycaster();
  path = [];
  pathIndex = 0;
  moveSpeed = 3; // Units per second
  rotationSpeed = 10; // Radians per second
  currentPosition = new Vector3();
  targetPosition = new Vector3();
  isMoving = false;
  jumpHeight = 1; // Increased jump height
  jumpDuration = 0.5;
  jumpProgress = 0;
  isJumping = false;
  jumpStartPosition = new Vector3();
  jumpEndPosition = new Vector3();
  
  constructor(camera, world) {
    super();
    
    // Create player mesh
    const bodyGeometry = new THREE.CapsuleGeometry(0.25, 0.5, 2, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4040c0 });
    this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.bodyMesh.position.y = 0.5;
    this.add(this.bodyMesh);

    // Add a small cone to indicate forward direction
    const directionIndicator = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.2, 8),
      new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    directionIndicator.position.set(0, 0.5, 0.3);
    directionIndicator.rotation.x = Math.PI / 2;
    this.bodyMesh.add(directionIndicator);

    this.position.set(1.5, 0, 5.5);
    this.camera = camera;
    this.world = world;

    this.currentPosition.copy(this.position);
    this.targetPosition.copy(this.position);

    window.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  /**
   * 
   * @param {MouseEvent} event 
   */
  onMouseDown(event) {
    const coords = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      - (event.clientY / window.innerHeight) * 2 + 1
    );

    this.raycaster.setFromCamera(coords, this.camera);
    const intersections = this.raycaster.intersectObject(this.world.terrain);

    if (intersections.length > 0) {
      const playerCoords = new THREE.Vector2(
        Math.floor(this.position.x),
        Math.floor(this.position.z)
      );

      const selectedCoords = new THREE.Vector2(
        Math.floor(intersections[0].point.x),
        Math.floor(intersections[0].point.z)
      );

      this.world.path.clear();

      // Find path from player's current position to the selected square
      this.path = search(playerCoords, selectedCoords, this.world);

      // If no path found, return early
      if (this.path === null || this.path.length === 0) return;

      // DEBUG: Show the path as breadcrumbs
      this.path.forEach((step) => {
        const node = new THREE.Mesh(
          new THREE.SphereGeometry(0.1),
          new THREE.MeshBasicMaterial({ color: step.jump ? 0xff0000 : 0xffff00 })
        );
        node.position.set(step.position.x + 0.5, 0.1, step.position.y + 0.5);
        this.world.path.add(node);
      });

      // Start moving
      this.pathIndex = 0;
      this.updatePosition();
    }
  }

  onKeyDown(event) {
    if (event.code === 'Space' && !this.isJumping) {
      this.startJump();
    }
  }

  startJump() {
    this.isJumping = true;
    this.jumpProgress = 0;
    this.jumpStartPosition.copy(this.position);
    
    // Find the next non-jump step to set as the jump end position
    let endIndex = this.pathIndex + 1;
    while (endIndex < this.path.length && this.path[endIndex].jump) {
      endIndex++;
    }
    if (endIndex < this.path.length) {
      const endStep = this.path[endIndex];
      this.jumpEndPosition.set(endStep.position.x + 0.5, 0, endStep.position.y + 0.5);
    } else {
      // If no non-jump step found, use the last step in the path
      const lastStep = this.path[this.path.length - 1];
      this.jumpEndPosition.set(lastStep.position.x + 0.5, 0, lastStep.position.y + 0.5);
    }
  }

  updateJump(deltaTime) {
    if (!this.isJumping) return;

    this.jumpProgress += deltaTime / this.jumpDuration;
    if (this.jumpProgress >= 1) {
      this.isJumping = false;
      this.position.copy(this.jumpEndPosition);
      this.bodyMesh.position.y = 0.5;
      // Update pathIndex to the landing position
      while (this.pathIndex < this.path.length && this.path[this.pathIndex].jump) {
        this.pathIndex++;
      }
      this.updatePosition();
      return;
    }

    // Parabolic jump trajectory
    const t = this.jumpProgress;
    const jumpCurve = 4 * t * (1 - t); // Parabolic curve peaking at t=0.5
    const jumpHeight = this.jumpHeight * jumpCurve;

    // Interpolate position
    this.position.lerpVectors(this.jumpStartPosition, this.jumpEndPosition, t);
    this.position.y += jumpHeight;

    // Update body mesh position
    this.bodyMesh.position.y = 0.5;
  }

  updatePosition() {
    if (this.pathIndex >= this.path.length) {
      this.isMoving = false;
      return;
    }

    const nextStep = this.path[this.pathIndex];
    this.targetPosition.set(nextStep.position.x + 0.5, 0, nextStep.position.y + 0.5);
    this.currentPosition.copy(this.position);
    this.isMoving = true;

    if (nextStep.jump) {
      this.startJump();
    }
  }

  update(deltaTime) {
    if (this.isJumping) {
      this.updateJump(deltaTime);
    } else if (this.isMoving) {
      const step = this.moveSpeed * deltaTime;
      const distanceToTarget = this.currentPosition.distanceTo(this.targetPosition);

      if (distanceToTarget > step) {
        // Move towards target
        this.currentPosition.lerp(this.targetPosition, step / distanceToTarget);
        this.position.copy(this.currentPosition);

        // Rotate towards movement direction
        const direction = new THREE.Vector3().subVectors(this.targetPosition, this.currentPosition).normalize();
        const targetRotation = Math.atan2(direction.x, direction.z);
        const rotationStep = this.rotationSpeed * deltaTime;
        this.rotation.y = THREE.MathUtils.lerp(
          this.rotation.y,
          targetRotation,
          Math.min(1, rotationStep / Math.abs(targetRotation - this.rotation.y))
        );
      } else {
        // Reached current target
        this.position.copy(this.targetPosition);
        this.currentPosition.copy(this.targetPosition);
        this.pathIndex++;
        this.updatePosition(); // Move to the next position in the path
      }
    }
  }

  // New method to check if the player can move to a given position
  canMoveTo(position) {
    const tileX = Math.floor(position.x);
    const tileZ = Math.floor(position.z);
    return !this.world.getObject(new THREE.Vector2(tileX, tileZ));
  }

  // New method to move the player directly (e.g., for keyboard controls)
  moveDirection(direction) {
    const newPosition = this.position.clone().add(direction);
    if (this.canMoveTo(newPosition)) {
      this.position.copy(newPosition);
      this.currentPosition.copy(newPosition);
      this.targetPosition.copy(newPosition);
    }
  }
}