/**
 * Top-down orthographic camera with a slight tilt — Animal Crossing New
 * Horizons / Stardew Valley feel.
 */
import * as THREE from 'three';
import { WORLD } from '../core/config';

const CAM_HEIGHT = 500;
const TILT = 0.38;

export class FollowCamera {
  readonly camera: THREE.OrthographicCamera;
  private aspect = 1;
  private zoom: number;
  private targetPos = new THREE.Vector3();
  private curPos = new THREE.Vector3();

  constructor() {
    this.zoom = WORLD.camera.initialZoom;
    this.camera = new THREE.OrthographicCamera(
      -this.zoom, this.zoom,
       this.zoom, -this.zoom,
       0.1, 2000,
    );
    // Default up. The world geometry is rotated 180° around Y so that
    // visually the +Z world axis maps to the top of the screen (the
    // island's "north" stays at the top of the screen).
    this.camera.up.set(0, 1, 0);
    this.placeCameraAt(0, 0);
    this.curPos.copy(this.camera.position);
  }

  private placeCameraAt(px: number, pz: number): void {
    const offset = CAM_HEIGHT * Math.tan(TILT);
    this.camera.position.set(px, CAM_HEIGHT, pz + offset);
    this.camera.lookAt(px, 0, pz);
  }

  setAspect(aspect: number): void {
    this.aspect = aspect;
    this.recomputeFrustum();
  }

  private recomputeFrustum(): void {
    const halfH = this.zoom;
    const halfW = halfH * this.aspect;
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
  }

  setZoom(z: number): void {
    this.zoom = THREE.MathUtils.clamp(z, WORLD.camera.minZoom, WORLD.camera.maxZoom);
    this.recomputeFrustum();
  }

  getZoom(): number { return this.zoom; }

  update(dt: number, playerPos: THREE.Vector3, _playerRotY: number): void {
    const lerpAmt = 1 - Math.pow(1 - WORLD.camera.followLerp, dt * 60);
    this.targetPos.set(playerPos.x, CAM_HEIGHT, playerPos.z + CAM_HEIGHT * Math.tan(TILT));
    this.curPos.lerp(this.targetPos, lerpAmt);
    this.camera.position.copy(this.curPos);
    this.camera.lookAt(this.curPos.x, 0, this.curPos.z);
  }
}
