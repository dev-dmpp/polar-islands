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
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 4000);
    this.camera.position.set(0, WORLD.camera.initialZoom, WORLD.camera.initialZoom * 0.65);
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
    // Position offset relative to facing: behind the player along -forward.
    const sin = Math.sin(playerRotY);
    const cos = Math.cos(playerRotY);
    // forward = (sin, 0, cos) in world (X-Z plane, +Z = up on screen)
    const behindX = -sin * this.zoom * 0.6;
    const behindZ = -cos * this.zoom * 0.6;
    this.targetPos.set(
      playerPos.x + behindX,
      this.zoom,
      playerPos.z + behindZ,
    );
    // Smooth follow
    const a = 1 - Math.pow(1 - cf.followLerp, dt * 60);
    this.camera.position.lerp(this.targetPos, a);

    // Look slightly ahead
    this.targetLook.set(
      playerPos.x + sin * cf.lookAhead,
      playerPos.y,
      playerPos.z + cos * cf.lookAhead,
    );
    this.curLook.lerp(this.targetLook, a);
    this.camera.lookAt(this.curLook);
  }
}
