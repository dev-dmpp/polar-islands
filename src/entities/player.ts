/**
 * Player: point-and-click walker with idle bob + walk cycle. The player
 * rotates smoothly toward the destination while moving, and stops within
 * `reachDist` of the target.
 */
import * as THREE from 'three';
import { WORLD } from '../core/config';
import { toonMat, addOutline } from '../render/toonMaterial';
import { PALETTE } from '../core/config';

export class Player {
  readonly group: THREE.Group;
  /** Visual body + head + legs assembled under `group`. */
  private body: THREE.Mesh;
  private head: THREE.Mesh;
  private leftLeg: THREE.Mesh;
  private rightLeg: THREE.Mesh;
  private leftArm: THREE.Mesh;
  private rightArm: THREE.Mesh;
  private shadow: THREE.Mesh;

  private target: THREE.Vector3 | null = null;
  private facing = 0;          // current rot.y (radians)
  private targetFacing = 0;    // desired rot.y
  private walkPhase = 0;       // accumulated walk cycle
  private walking = false;
  private speed = 0;          // smoothed speed (for telemetry)
  private position3 = new THREE.Vector3();

  constructor() {
    this.group = new THREE.Group();
    this.group.position.set(0, 0, 8);

    // Soft round shadow disc beneath the player.
    const shadowGeom = new THREE.CircleGeometry(0.55, 16);
    shadowGeom.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false,
    });
    this.shadow = new THREE.Mesh(shadowGeom, shadowMat);
    this.shadow.position.y = 0.01;
    this.group.add(this.shadow);

    // Body
    this.body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 0.7, 4, 8),
      toonMat({ color: PALETTE.accent1 }),
    );
    this.body.position.y = 0.85;
    addOutline(this.body, '#0a0a1a', 1.06);
    this.group.add(this.body);

    // Head
    this.head = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 12, 10),
      toonMat({ color: PALETTE.npcSkin }),
    );
    this.head.position.y = 1.65;
    addOutline(this.head, '#0a0a1a', 1.06);
    this.group.add(this.head);

    // Hair (a slightly larger hemisphere on top)
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      toonMat({ color: '#3a2a1a' }),
    );
    hair.position.y = 1.7;
    addOutline(hair, '#0a0a1a', 1.05);
    this.head.add(hair);

    // Eyes
    const eyeMat = toonMat({ color: '#0a0a1a', emissive: '#0a0a1a', emissiveIntensity: 0.0 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), eyeMat);
    eyeL.position.set(-0.10, 1.70, 0.28);
    this.group.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.10;
    this.group.add(eyeR);

    // Legs
    this.leftLeg = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.13, 0.45, 4, 6),
      toonMat({ color: '#2a3a5a' }),
    );
    this.leftLeg.position.set(-0.18, 0.30, 0);
    addOutline(this.leftLeg, '#0a0a1a', 1.07);
    this.group.add(this.leftLeg);

    this.rightLeg = this.leftLeg.clone();
    this.rightLeg.position.x = 0.18;
    this.group.add(this.rightLeg);

    // Arms
    this.leftArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.10, 0.5, 4, 6),
      toonMat({ color: PALETTE.accent1 }),
    );
    this.leftArm.position.set(-0.45, 0.95, 0);
    addOutline(this.leftArm, '#0a0a1a', 1.08);
    this.group.add(this.leftArm);

    this.rightArm = this.leftArm.clone();
    this.rightArm.position.x = 0.45;
    this.group.add(this.rightArm);

    // Subtle point light at feet so the character doesn't disappear
    // into shadow if we add dark materials later.
    const light = new THREE.PointLight(0xffe0a0, 0.2, 6, 2);
    light.position.y = 1.5;
    this.group.add(light);
  }

  setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }

  setRotation(rotY: number): void {
    this.facing = rotY;
    this.targetFacing = rotY;
    this.group.rotation.y = rotY;
  }

  get position(): THREE.Vector3 { return this.group.position; }
  get rotY(): number { return this.facing; }
  get isWalking(): boolean { return this.walking; }
  get currentSpeed(): number { return this.speed; }

  /** Set a destination in world XZ. */
  setTarget(x: number, z: number): void {
    this.target = new THREE.Vector3(x, this.group.position.y, z);
  }
  clearTarget(): void { this.target = null; }

  update(dt: number, islandBounds: (x: number, z: number) => { x: number; z: number }): void {
    if (this.target) {
      const dx = this.target.x - this.group.position.x;
      const dz = this.target.z - this.group.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < WORLD.player.reachDist) {
        this.target = null;
        this.walking = false;
      } else {
        this.walking = true;
        this.targetFacing = Math.atan2(dx, dz);
        // Move toward target.
        const stepLen = WORLD.player.speed * dt;
        const nx = this.group.position.x + (dx / dist) * stepLen;
        const nz = this.group.position.z + (dz / dist) * stepLen;
        const clamped = islandBounds(nx, nz);
        this.group.position.x = clamped.x;
        this.group.position.z = clamped.z;
        this.speed = WORLD.player.speed;
      }
    } else {
      this.walking = false;
      this.speed *= Math.pow(0.001, dt);
    }

    // Smooth facing
    let delta = this.targetFacing - this.facing;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    this.facing += delta * (1 - Math.pow(1 - WORLD.player.turnLerp, dt * 60));
    this.group.rotation.y = this.facing;

    // Walk cycle (legs + arms swing)
    if (this.walking) {
      this.walkPhase += dt * WORLD.player.walkBobHz * Math.PI;
      const swing = Math.sin(this.walkPhase) * 0.5;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.leftArm.rotation.x = -swing * 0.5;
      this.rightArm.rotation.x = swing * 0.5;
      // Vertical bob
      this.body.position.y = 0.85 + Math.abs(Math.sin(this.walkPhase * 2)) * WORLD.player.walkBobAmp;
      this.head.position.y = 1.65 + Math.abs(Math.sin(this.walkPhase * 2)) * WORLD.player.walkBobAmp;
    } else {
      // Idle bob (subtle breathing)
      const t = performance.now() * 0.0015;
      this.body.position.y = 0.85 + Math.sin(t) * 0.02;
      this.head.position.y = 1.65 + Math.sin(t) * 0.02;
      // Relax legs/arms
      this.leftLeg.rotation.x *= 0.85;
      this.rightLeg.rotation.x *= 0.85;
      this.leftArm.rotation.x *= 0.85;
      this.rightArm.rotation.x *= 0.85;
    }

    this.position3.copy(this.group.position);
  }
}
