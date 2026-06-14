/**
 * Sky: solid background color + a few soft cloud billboards at the
 * horizon. The camera looks down most of the time so the dome is
 * mostly out of view; a few cloud puffs placed near the visible
 * horizon give the scene a friendly, open-sky feel without needing a
 * full gradient sphere.
 */
import * as THREE from 'three';

const CLOUD_COUNT = 8;
const CLOUD_RADIUS = 320;

export function buildSky(scene: THREE.Scene): { clouds: THREE.Group } {
  // Solid sky-blue background — the empty space behind the island
  // looks like a clear day.
  // (We do NOT set scene.background here because that overrides the
  // renderer's setClearColor and the resulting canvas can come up
  // blank in some browser/headless configurations. The clear color
  // set in renderer.ts is the actual visible background.)
  //scene.background = new THREE.Color(PALETTE.skyTop);

  // No fog: the world is small enough that fog is not needed, and it
  // was hiding the island when the camera was close.

  // A few soft cloud puffs placed at the horizon. Each is a group
  // of overlapping white spheres (low-poly cloud look). They are
  // positioned in a ring around the world so at least a couple are
  // always in view from the tilted top-down camera.
  const clouds = new THREE.Group();
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const ang = (i / CLOUD_COUNT) * Math.PI * 2 + Math.random() * 0.4;
    const x = Math.cos(ang) * CLOUD_RADIUS;
    const z = Math.sin(ang) * CLOUD_RADIUS;
    const cloud = buildCloud();
    cloud.position.set(x, 18 + Math.random() * 8, z);
    cloud.scale.setScalar(0.9 + Math.random() * 0.6);
    clouds.add(cloud);
  }
  scene.add(clouds);

  return { clouds };
}

function buildCloud(): THREE.Group {
  const g = new THREE.Group();
  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  // 3-4 overlapping spheres form a low-poly cloud.
  const blobs = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < blobs; i++) {
    const r = 4 + Math.random() * 3;
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), cloudMat);
    s.position.set((i - blobs / 2) * 4 + Math.random() * 2, Math.random() * 1.5, Math.random() * 2);
    s.scale.y = 0.55;
    g.add(s);
  }
  return g;
}
