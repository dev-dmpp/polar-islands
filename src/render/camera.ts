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
    // The island is 44x36, half-extent 22. Camera at 70 units with tilt
    // ~24° from the horizon frames the whole island with margin.
    const dist = 70;
    const tilt = 0.42;
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
    // Map [minZoom=5 .. maxZoom=60] -> [fov=25 .. fov=70]
    const t = (this.zoom - WORLD.camera.minZoom) / (WORLD.camera.maxZoom - WORLD.camera.minZoom);
    this.camera.fov = THREE.MathUtils.lerp(25, 70, t);
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
    const tilt = 0.42;
    this.targetPos.set(
      playerPos.x,
      dist * Math.sin(tilt),
      playerPos.z + dist * Math.cos(tilt),
    );
    this.curPos.lerp(this.targetPos, lerpAmt);
    this.camera.position.copy(this.curPos);
    // Look at the island center (z=0), not the player. The player
    // may be on either side of center; the camera always frames the
    // whole island.
    this.camera.lookAt(this.curPos.x, 0, 0);
  }
}
