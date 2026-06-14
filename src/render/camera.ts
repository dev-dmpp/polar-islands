/**
 * Top-down perspective camera with a gentle tilt — Animal Crossing feel.
 * - The player is large on screen (camera close to the player).
 * - The world is rectangular, not oval.
 * - The camera follows the player in XZ with a smooth lerp; it does
 *   not rotate with the player.
 *
 * `zoom` controls the FOV: smaller = more zoomed in (closer).
 */
import * as THREE from 'three';
import { WORLD } from '../core/config';

export class FollowCamera {
  readonly camera: THREE.PerspectiveCamera;
  private zoom: number;
  private targetPos = new THREE.Vector3();
  private curPos = new THREE.Vector3();

  constructor() {
    this.zoom = WORLD.camera.initialZoom;
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 8000);
    // The island is 70x56. Dist=70 with tilt ~28° leaves the player
    // visibly larger than the trees and frames the whole island with
    // margin. The camera can zoom out further (up to maxZoom=100) to
    // see everything at once.
    const dist = 70;
    const tilt = 0.50;
    this.camera.position.set(0, dist * Math.sin(tilt), dist * Math.cos(tilt));
    this.camera.lookAt(0, 0, 0);
    this.curPos.copy(this.camera.position);
    this.applyZoom();
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  setZoom(z: number): void {
    this.zoom = THREE.MathUtils.clamp(z, WORLD.camera.minZoom, WORLD.camera.maxZoom);
    this.applyZoom();
  }

  /** Map zoom value to FOV. Smaller zoom = smaller FOV = more zoomed in. */
  private applyZoom(): void {
    // Map [minZoom=5 .. maxZoom=100] -> [fov=22 .. fov=75]
    const t = (this.zoom - WORLD.camera.minZoom) / (WORLD.camera.maxZoom - WORLD.camera.minZoom);
    this.camera.fov = THREE.MathUtils.lerp(22, 75, t);
    this.camera.updateProjectionMatrix();
  }

  getZoom(): number { return this.zoom; }

  /**
   * Update the camera position. The camera follows the player in XZ,
   * keeping the same height and back-offset relative to the player.
   * Looking at the player keeps the framing stable.
   */
  update(dt: number, playerPos: THREE.Vector3, _playerRotY: number): void {
    const lerpAmt = 1 - Math.pow(1 - WORLD.camera.followLerp, dt * 60);
    const dist = 70;
    const tilt = 0.50;
    this.targetPos.set(
      playerPos.x,
      dist * Math.sin(tilt),
      playerPos.z + dist * Math.cos(tilt),
    );
    this.curPos.lerp(this.targetPos, lerpAmt);
    this.camera.position.copy(this.curPos);
    // AC-style follow: the camera always looks at the player, so the
    // player stays centered on screen and the world scrolls past.
    this.camera.lookAt(playerPos.x, 0, playerPos.z);
  }
}
