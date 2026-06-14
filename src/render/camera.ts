/**
 * Camera 3/4 top-down follow. Offset is fixed (Y up, Z back) and the camera
 * follows the player with a smooth lerp. The look-at point sits slightly
 * ahead of the player in the player's facing direction.
 */
import * as THREE from 'three';
import { WORLD } from '../core/config';

export class FollowCamera {
  readonly camera: THREE.PerspectiveCamera;
  private targetPos = new THREE.Vector3();
  private targetLook = new THREE.Vector3();
  private curLook = new THREE.Vector3();
  private zoom: number;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 4000);
    // Top-down isometric (Stardew / AC feel): high Y, very small Z,
    // looking straight down with a slight tilt.
    this.camera.position.set(0, WORLD.camera.initialZoom, WORLD.camera.initialZoom * 0.18);
    this.camera.lookAt(0, 0, 0);
    this.curLook.set(0, 0, 0);
    this.zoom = WORLD.camera.initialZoom;
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  setZoom(z: number): void {
    this.zoom = THREE.MathUtils.clamp(z, WORLD.camera.minZoom, WORLD.camera.maxZoom);
  }

  getZoom(): number { return this.zoom; }

  /**
   * Update the camera. `playerPos` is the player position, `playerRotY` is the
   * facing angle in radians (0 = +Z, increases counter-clockwise viewed from
   * above).
   */
  update(dt: number, playerPos: THREE.Vector3, playerRotY: number): void {
    const cf = WORLD.camera;
    // Top-down isometric: camera sits mostly above the player with a small
    // Z offset for a slight tilt. The camera does NOT rotate with the player
    // — this is a fixed top-down view, not a third-person follow cam.
    void playerRotY;
    this.targetPos.set(
      playerPos.x,
      this.zoom,
      playerPos.z + this.zoom * 0.18,
    );
    const a = 1 - Math.pow(1 - cf.followLerp, dt * 60);
    this.camera.position.lerp(this.targetPos, a);

    // Look at a point slightly forward of the player in world +Z (which is
    // "down" on screen due to the camera's tilt).
    this.targetLook.set(
      playerPos.x + cf.lookAhead,
      playerPos.y,
      playerPos.z + cf.lookAhead * 0.4,
    );
    this.curLook.lerp(this.targetLook, a);
    this.camera.lookAt(this.curLook);
  }
}
