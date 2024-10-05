import * as THREE from 'three';
import { search } from './pathfinding';

export class NPC extends THREE.Group {
  constructor(world, startPosition) {
    super();

    this.world = world;
    this.moveSpeed = 1.5; // Units per second
    this.rotationSpeed = 5; // Radians per second

    // Create NPC mesh
    const bodyGeometry = new THREE.CapsuleGeometry(0.2, 0.4, 2, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x40c040 });
    this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.bodyMesh.position.y = 0.4;
    this.add(this.bodyMesh);

    // Add a small cone to indicate forward direction
    const directionIndicator = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.16, 8),
      new THREE.MeshStandardMaterial({ color: 0xffff00 })
    );
    directionIndicator.position.set(0, 0.4, 0.24);
    directionIndicator.rotation.x = Math.PI / 2;
    this.bodyMesh.add(directionIndicator);

    this.position.set(startPosition.x + 0.5, 0, startPosition.y + 0.5);

    this.path = [];
    this.pathIndex = 0;
    this.isMoving = false;
    this.currentPosition = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();

    this.findNewPath();
  }

  findNewPath() {
    const startCoords = new THREE.Vector2(
      Math.floor(this.position.x),
      Math.floor(this.position.z)
    );

    let endCoords;
    do {
      endCoords = new THREE.Vector2(
        Math.floor(Math.random() * this.world.width),
        Math.floor(Math.random() * this.world.height)
      );
    } while (this.world.getObject(endCoords));

    this.path = search(startCoords, endCoords, this.world);

    if (this.path && this.path.length > 0) {
      this.pathIndex = 0;
      this.updatePosition();
    } else {
      // If no path found, try again in a short while
      setTimeout(() => this.findNewPath(), 1000);
    }
  }

  updatePosition() {
    if (this.pathIndex >= this.path.length) {
      this.isMoving = false;
      this.findNewPath();
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
}