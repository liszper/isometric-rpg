import { Character } from './character';
import * as THREE from 'three';

export class NPC extends Character {
  constructor(world, startPosition) {
    super(world, 0x40c040, 0.8); // Green color, slightly smaller scale

    this.moveSpeed = 1.5; // Units per second
    this.position.set(startPosition.x + 0.5, 0, startPosition.y + 0.5);

    this.isIdling = false;
    this.idleTime = 0;
    this.idleDuration = 0;

    this.findNewDestination();

    this.addEventListener('reachedDestination', () => this.onReachedDestination());
    this.addEventListener('noPathFound', () => this.findNewDestination());
  }

  findNewDestination() {
    let endCoords;
    do {
      endCoords = new THREE.Vector3(
        Math.floor(Math.random() * this.world.width),
        0,
        Math.floor(Math.random() * this.world.height)
      );
    } while (this.world.getObject(new THREE.Vector2(endCoords.x, endCoords.z)));

    this.setDestination(endCoords);
  }

  onReachedDestination() {
    this.startIdling();
  }

  startIdling() {
    this.isMoving = false;
    this.isIdling = true;
    this.idleTime = 0;
    this.idleDuration = Math.random() * 5 + 2; // Idle for 2-7 seconds
  }

  update(deltaTime) {
    if (this.isIdling) {
      this.idleTime += deltaTime;
      if (this.idleTime >= this.idleDuration) {
        this.isIdling = false;
        this.findNewDestination();
      }
      return;
    }

    super.update(deltaTime);

    // If not moving and not idling, find a new destination
    if (!this.isMoving && !this.isIdling) {
      this.findNewDestination();
    }
  }
}