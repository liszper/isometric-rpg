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

  constructor(world, color = 0x4040c0, scale = 1) {
    super();
    
    // Create character mesh
    const bodyGeometry = new THREE.CapsuleGeometry(0.25 * scale, 0.5 * scale, 2, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color });
    this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.bodyMesh.position.y = 0.5 * scale;
    this.add(this.bodyMesh);

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

    this.world.path.clear();

    this.path = search(startCoords, nearestWalkableTile, this.world);

    if (!this.path || this.path.length === 0) {
      this.triggerEvent('noPathFound');
      return;
    }

    // DEBUG: Show the path as breadcrumbs
    this.path.forEach((step) => {
      const node = new THREE.Mesh(
        new THREE.SphereGeometry(0.1),
        new THREE.MeshBasicMaterial({ color: 0xffff00 })
      );
      node.position.set(step.position.x + 0.5, 0.1, step.position.y + 0.5);
      this.world.path.add(node);
    });

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
        this.removeEventListener('reachedPathEnd', onReachDestination);
      }
    };
    this.addEventListener('reachedPathEnd', onReachDestination);
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
      } else {
        // Reached current target
        this.position.copy(this.targetPosition);
        this.currentPosition.copy(this.targetPosition);
        this.pathIndex++;
        this.updatePosition(); // Move to the next position in the path
      }
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
}