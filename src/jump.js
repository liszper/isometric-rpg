import { Vector3 } from 'three';

export class PlayerJump {
  constructor(player) {
    this.player = player;
    this.jumpHeight = 1;
    this.jumpDuration = 0.5;
    this.jumpProgress = 0;
    this.isJumping = false;
    this.jumpStartPosition = new Vector3();
    this.jumpEndPosition = new Vector3();
  }

  startJump() {
    this.isJumping = true;
    this.jumpProgress = 0;
    this.jumpStartPosition.copy(this.player.position);
    
    // Find the next non-jump step to set as the jump end position
    let endIndex = this.player.pathIndex + 1;
    while (endIndex < this.player.path.length && this.player.path[endIndex].jump) {
      endIndex++;
    }
    if (endIndex < this.player.path.length) {
      const endStep = this.player.path[endIndex];
      this.jumpEndPosition.set(endStep.position.x + 0.5, 0, endStep.position.y + 0.5);
    } else {
      // If no non-jump step found, use the last step in the path
      const lastStep = this.player.path[this.player.path.length - 1];
      this.jumpEndPosition.set(lastStep.position.x + 0.5, 0, lastStep.position.y + 0.5);
    }
  }

  updateJump(deltaTime) {
    if (!this.isJumping) return;

    this.jumpProgress += deltaTime / this.jumpDuration;
    if (this.jumpProgress >= 1) {
      this.isJumping = false;
      this.player.position.copy(this.jumpEndPosition);
      this.player.bodyMesh.position.y = 0.5;
      // Update pathIndex to the landing position
      while (this.player.pathIndex < this.player.path.length && this.player.path[this.player.pathIndex].jump) {
        this.player.pathIndex++;
      }
      this.player.updatePosition();
      return;
    }

    // Parabolic jump trajectory
    const t = this.jumpProgress;
    const jumpCurve = 4 * t * (1 - t); // Parabolic curve peaking at t=0.5
    const jumpHeight = this.jumpHeight * jumpCurve;

    // Interpolate position
    this.player.position.lerpVectors(this.jumpStartPosition, this.jumpEndPosition, t);
    this.player.position.y += jumpHeight;

    // Update body mesh position
    this.player.bodyMesh.position.y = 0.5;
  }
}