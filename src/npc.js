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
    this.destination = null;

    this.findNewDestination();
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

    this.destination = endCoords;
    this.setDestination(endCoords);
  }

  startIdling() {
    this.isMoving = false;
    this.isIdling = true;
    this.idleTime = 0;
    
    // Occasionally make the NPC idle for a much longer time
    if (Math.random() < 0.2) { // 20% chance for long idle
      this.idleDuration = Math.random() * 30 + 30; // Idle for 30-60 seconds
    } else {
      this.idleDuration = Math.random() * 5 + 2; // Normal idle for 2-7 seconds
    }

    // Clear the path visualization
    this.clearPath();
  }

  clearPath() {
    // Remove the current path visualization
    if (this.pathVisualization) {
      if (this.world && this.world.scene) {
        this.world.scene.remove(this.pathVisualization);
      } else if (this.pathVisualization.parent) {
        this.pathVisualization.parent.remove(this.pathVisualization);
      }
      this.pathVisualization = null;
    }
    // Clear the current path
    this.path = [];
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

    // Check if we've reached the destination
    if (this.destination && this.position.distanceTo(this.destination) < 0.1) {
      this.destination = null;
      this.startIdling();
    }
  }
}