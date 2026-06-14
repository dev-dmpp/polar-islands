/**
 * Island generator. Builds the central island: a grass surface oval with
 * rocky cliffs underneath, edge fade-to-cliff, and a small water ring around
 * it. Deterministic from the WORLD.seed.
 */
import * as THREE from 'three';
import { PALETTE, WORLD } from '../core/config';
import { toonMat, addOutline } from '../render/toonMaterial';
import { makeRng, rngRange } from '../utils/rng';

export interface Island {
  group: THREE.Group;
  /** Returns world coords clamped to the island's walkable area. */
  clamp(x: number, z: number): { x: number; z: number };
  /** True if a point is on the walkable surface (within the island, above the water ring). */
  isWalkable(x: number, z: number): boolean;
  /** Returns 0..1 proximity to a plaza position (1 = at plaza). */
  plazaProximity(x: number, z: number): { id: string; dist: number } | null;
  /** Plaza mesh groups, indexed by plaza id (for VFX / outlines). */
  plazas: Map<string, THREE.Group>;
}

interface PlazaSpec {
  id: string;
  name: string;
  x: number;
  z: number;
}

const PLAZA_SPOTS: PlazaSpec[] = [
  { id: 'aurora', name: 'Plaza Aurora', x: 22, z: -8 },
  { id: 'forja', name: 'Plaza Forja', x: -22, z: -14 },
  { id: 'biblioteca', name: 'Plaza Biblioteca', x: 0, z: 22 },
  { id: 'herreria', name: 'Plaza Herrería', x: -22, z: 14 },
  { id: 'torre', name: 'Plaza Torre', x: 22, z: 16 },
  { id: 'contacto', name: 'El Mensajero', x: 0, z: 0 },
];

export function buildIsland(scene: THREE.Scene): Island {
  const group = new THREE.Group();
  const rx = WORLD.island.radiusX;
  const rz = WORLD.island.radiusZ;
  const surfY = WORLD.island.surfaceY;

  // --- Grass surface (slightly subdivided oval disk) ---
  const grassGeom = new THREE.CircleGeometry(1, 96);
  // Squash to oval
  grassGeom.scale(rx, rz, 1);
  grassGeom.rotateX(-Math.PI / 2);
  // Add subtle vertex jitter for hand-made feel
  const pos = grassGeom.attributes.position;
  const rng = makeRng(WORLD.seed);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    // distance from center, normalized
    const dx = x / rx;
    const dz = z / rz;
    const d = Math.min(1, Math.hypot(dx, dz));
    if (d > 0.1) {
      const n = rngRange(rng, -0.18, 0.18) * (1 - d);
      pos.setY(i, n);
    }
  }
  pos.needsUpdate = true;
  grassGeom.computeVertexNormals();

  const grass = new THREE.Mesh(grassGeom, toonMat({ color: PALETTE.grass }));
  grass.position.y = surfY;
  group.add(grass);

  // Inner darker ring (under trees etc.)
  const innerGeom = new THREE.CircleGeometry(1, 64);
  innerGeom.scale(rx * 0.85, rz * 0.85, 1);
  innerGeom.rotateX(-Math.PI / 2);
  const inner = new THREE.Mesh(innerGeom, toonMat({ color: PALETTE.grassDark }));
  inner.position.y = surfY + 0.005;
  group.add(inner);

  // --- Cliff underneath ---
  // A short cylinder (height 8) below the grass gives the impression of
  // floating earth.
  const cliffGeom = new THREE.CylinderGeometry(1, 0.7, 8, 32, 1, false);
  cliffGeom.scale(rx * 0.95, 1, rz * 0.95);
  const cliff = new THREE.Mesh(cliffGeom, toonMat({ color: PALETTE.cliff }));
  cliff.position.y = surfY - 4;
  addOutline(cliff, '#0a0a1a', 1.02);
  group.add(cliff);

  // Cliff base cone (a chunky pointy bottom for the "island" look)
  const baseGeom = new THREE.ConeGeometry(1, 10, 24, 1);
  baseGeom.scale(rx * 0.65, 1, rz * 0.65);
  const base = new THREE.Mesh(baseGeom, toonMat({ color: PALETTE.cliffHi }));
  base.position.y = surfY - 12;
  addOutline(base, '#0a0a1a', 1.02);
  group.add(base);

  // --- Water ring around the island ---
  const waterGeom = new THREE.RingGeometry(1, 1, 64, 1);
  waterGeom.scale(rx * 1.6, rz * 1.6, 1);
  waterGeom.rotateX(-Math.PI / 2);
  const waterMat = toonMat({ color: PALETTE.water, transparent: true, opacity: 0.85 });
  const water = new THREE.Mesh(waterGeom, waterMat);
  water.position.y = surfY - 0.3;
  group.add(water);

  scene.add(group);

  // --- Plazas: each is a small raised platform with a marker pole ---
  const plazas = new Map<string, THREE.Group>();
  for (const spec of PLAZA_SPOTS) {
    const plaza = new THREE.Group();
    plaza.position.set(spec.x, surfY, spec.z);

    // Platform
    const plat = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.6, 0.4, 12),
      toonMat({ color: PALETTE.stoneHi }),
    );
    plat.position.y = 0.2;
    addOutline(plat, '#0a0a1a', 1.04);
    plaza.add(plat);

    // Inner darker disc
    const innerDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(2.0, 2.0, 0.45, 12),
      toonMat({ color: PALETTE.stone }),
    );
    innerDisc.position.y = 0.22;
    plaza.add(innerDisc);

    // Marker pole (vertical post) — taller for the Torre, shorter otherwise
    const poleHeight = spec.id === 'torre' ? 4.5 : 2.4;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.10, poleHeight, 8),
      toonMat({ color: PALETTE.wood }),
    );
    pole.position.y = 0.4 + poleHeight / 2;
    addOutline(pole, '#0a0a1a', 1.10);
    plaza.add(pole);

    // Lantern on top of the pole
    const lanternBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.2, 0.4),
      toonMat({ color: PALETTE.woodDark }),
    );
    lanternBase.position.y = 0.4 + poleHeight;
    plaza.add(lanternBase);

    const lanternBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      toonMat({ color: PALETTE.warm, emissive: PALETTE.warm, emissiveIntensity: 0.6 }),
    );
    lanternBody.position.y = 0.4 + poleHeight + 0.35;
    plaza.add(lanternBody);

    const lanternTop = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 0.4, 4),
      toonMat({ color: PALETTE.woodDark }),
    );
    lanternTop.position.y = 0.4 + poleHeight + 0.8;
    lanternTop.rotation.y = Math.PI / 4;
    plaza.add(lanternTop);

    // Warm point light at the lantern
    const light = new THREE.PointLight(PALETTE.warm, 0.7, 8, 2);
    light.position.y = 0.4 + poleHeight + 0.35;
    plaza.add(light);

    group.add(plaza);
    plazas.set(spec.id, plaza);
  }

  // --- Scattered trees (low-poly cones on cylinders) ---
  const treeSpots: Array<{ x: number; z: number; scale: number }> = [];
  // Place ~14 trees on the grass avoiding plaza positions.
  let attempts = 0;
  while (treeSpots.length < 14 && attempts < 200) {
    attempts++;
    const ang = rng() * Math.PI * 2;
    const rr = Math.sqrt(rng()) * 0.85;
    const x = Math.cos(ang) * rr * rx;
    const z = Math.sin(ang) * rr * rz;
    // Reject if too close to any plaza (within 4u)
    let tooClose = false;
    for (const p of PLAZA_SPOTS) {
      if (Math.hypot(p.x - x, p.z - z) < 4) { tooClose = true; break; }
    }
    if (tooClose) continue;
    // Reject if too close to another tree
    let treeClash = false;
    for (const t of treeSpots) {
      if (Math.hypot(t.x - x, t.z - z) < 3) { treeClash = true; break; }
    }
    if (treeClash) continue;
    treeSpots.push({ x, z, scale: 0.7 + rng() * 0.5 });
  }
  for (const t of treeSpots) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 1.0, 6),
      toonMat({ color: PALETTE.woodDark }),
    );
    trunk.position.y = 0.5;
    addOutline(trunk, '#0a0a1a', 1.10);
    tree.add(trunk);

    // 2 stacked cones for foliage
    const f1 = new THREE.Mesh(
      new THREE.ConeGeometry(0.9, 1.2, 7),
      toonMat({ color: PALETTE.grassDark }),
    );
    f1.position.y = 1.3;
    addOutline(f1, '#0a0a1a', 1.05);
    tree.add(f1);

    const f2 = new THREE.Mesh(
      new THREE.ConeGeometry(0.65, 0.9, 7),
      toonMat({ color: PALETTE.grass }),
    );
    f2.position.y = 1.95;
    addOutline(f2, '#0a0a1a', 1.05);
    tree.add(f2);

    tree.position.set(t.x, 0, t.z);
    tree.scale.setScalar(t.scale);
    group.add(tree);
  }

  // --- Functions exposed ---
  const clamp = (x: number, z: number): { x: number; z: number } => {
    // Clamp to inside the oval, with a small margin so the player doesn't
    // walk off the edge into the void.
    const margin = 0.5;
    const nx = THREE.MathUtils.clamp(x, -rx + margin, rx - margin);
    const nz = THREE.MathUtils.clamp(z, -rz + margin, rz - margin);
    // Also clamp to oval (not just the bounding box)
    const dx = nx / (rx - margin);
    const dz = nz / (rz - margin);
    const d = Math.hypot(dx, dz);
    if (d > 1) {
      return { x: nx / d, z: nz / d };
    }
    return { x: nx, z: nz };
  };

  const isWalkable = (x: number, z: number): boolean => {
    const dx = x / rx;
    const dz = z / rz;
    return Math.hypot(dx, dz) < 0.95;
  };

  const plazaProximity = (x: number, z: number): { id: string; dist: number } | null => {
    let best: { id: string; dist: number } | null = null;
    for (const p of PLAZA_SPOTS) {
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < 3.5) {
        if (!best || d < best.dist) best = { id: p.id, dist: d };
      }
    }
    return best;
  };

  return { group, clamp, isWalkable, plazaProximity, plazas };
}
