import * as THREE from 'three';
import { Vector3 } from 'three';
import { search } from './pathfinding';
import { PlayerJump } from './jump';

export class Player extends THREE.Group {
  raycaster = new THREE.Raycaster();
  path = [];
  pathIndex = 0;
  moveSpeed = 3; // Units per second
  rotationSpeed = 10; // Radians per second
  currentPosition = new Vector3();
  targetPosition = new Vector3();
  isMoving = false;
  
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

    this.jump = new PlayerJump(this);

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
      if (!this.path || this.path.length === 0) {
        console.log("No valid path found");
        return;
      }

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
    if (event.code === 'Space' && !this.jump.isJumping) {
      this.jump.startJump();
    }
  }

  updatePosition() {
    if (!this.path || this.path.length === 0 || this.pathIndex >= this.path.length) {
      this.isMoving = false;
      return;
    }

    const nextStep = this.path[this.pathIndex];
    this.targetPosition.set(nextStep.position.x + 0.5, 0, nextStep.position.y + 0.5);
    this.currentPosition.copy(this.position);
    this.isMoving = true;

    if (nextStep.jump) {
      this.jump.startJump();
    }
  }

  update(deltaTime) {
    if (this.jump.isJumping) {
      this.jump.updateJump(deltaTime);
    } else if (this.isMoving) {
      const step = this.moveSpeed * deltaTime;
      const distanceToTarget = this.currentPosition.distanceTo(this.targetPosition);

      if (distanceToTarget > step) {
        // Move towards target
        this.currentPosition.lerp(this.targetPosition, step / distanceToTarget);
        this.position.copy(this.currentPosition);

        // Update rotation to face movement direction
        this.updateRotation(deltaTime);
      } else {
        // Reached current target
        this.position.copy(this.targetPosition);
        this.currentPosition.copy(this.targetPosition);
        this.pathIndex++;
        this.updatePosition(); // Move to the next position in the path
      }
    }
  }

  // New method to update rotation
  updateRotation(deltaTime) {
    const direction = new THREE.Vector3().subVectors(this.targetPosition, this.currentPosition).normalize();
    if (direction.lengthSq() > 0.001) { // Check if there's a significant direction
      const targetRotation = Math.atan2(direction.x, direction.z);
      const currentRotation = this.rotation.y;
      
      // Calculate the shortest angle
      let angleDiff = targetRotation - currentRotation;
      angleDiff = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI;
      
      const rotationStep = this.rotationSpeed * deltaTime;
      const step = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), rotationStep);
      
      this.rotation.y += step;
      
      // Normalize the rotation to keep it between -PI and PI
      this.rotation.y = ((this.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI;
    }
  }

  // Modify moveDirection method
  moveDirection(direction) {
    const newPosition = this.position.clone().add(direction);
    if (this.canMoveTo(newPosition)) {
      this.position.copy(newPosition);
      this.currentPosition.copy(newPosition);
      this.targetPosition.copy(newPosition);
      // Update rotation when moving
      this.updateRotation(1 / 60); // Assume 60 FPS for smooth rotation
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
      // Update rotation when moving
      this.updateRotation(1 / 60); // Assume 60 FPS for smooth rotation
    }
  }
}