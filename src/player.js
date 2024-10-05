import { Character } from './character';
import { PlayerJump } from './jump';
import { ContextMenu } from './actions';
import * as THREE from 'three';
import { search } from './pathfinding';

export class Player extends Character {
  constructor(camera, world) {
    super(world);
    
    this.position.set(1.5, 0, 5.5);
    this.camera = camera;

    this.jump = new PlayerJump(this);
    this.contextMenu = new ContextMenu(this);

    this.raycaster = new THREE.Raycaster();

    window.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('contextmenu', this.onContextMenu.bind(this));

    this.addEventListener('reachedDestination', () => this.onReachedDestination());
  }

  getMouseIntersection(event) {
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);

    // Intersect with terrain, NPCs, trees, and rocks
    const intersectables = [
      this.world.terrain,
      ...this.world.npcs.children,
      ...this.world.trees.children,
      ...this.world.rocks.children
    ];

    return this.raycaster.intersectObjects(intersectables, true);
  }

  handleLeftClick(event) {
    const intersects = this.getMouseIntersection(event);
    if (intersects.length > 0) {
      const clickedPoint = intersects[0].point;
      this.setDestination(clickedPoint);
    }
  }

  onReachedDestination() {
    // You can add any additional logic here when the player reaches their destination
  }

  onMouseDown(event) {
    if (event.button === 0) { // Left click
      this.handleLeftClick(event);
    }
  }

  onKeyDown(event) {
    if (event.code === 'Space' && !this.jump.isJumping) {
      this.jump.startJump();
    }
  }

  update(deltaTime) {
    super.update(deltaTime);
    if (this.jump.isJumping) {
      this.jump.updateJump(deltaTime);
    }
  }

  onContextMenu(event) {
    event.preventDefault();
    const intersects = this.getMouseIntersection(event);

    if (intersects.length > 0) {
      const intersection = intersects[0];
      const worldPosition = intersection.point;
      const clickedObject = intersection.object;

      // Determine the type of object clicked
      let objectType = 'terrain';
      if (clickedObject.parent === this.world.npcs) objectType = 'npc';
      else if (clickedObject.parent === this.world.trees) objectType = 'tree';
      else if (clickedObject.parent === this.world.rocks) objectType = 'rock';

      this.contextMenu.show(event.clientX, event.clientY, worldPosition, objectType, clickedObject);
    }
  }
}