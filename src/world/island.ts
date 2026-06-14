/**
 * Island generator. Builds the central island: a rectangular grass
 * surface with rounded corners, rocky cliffs underneath, and a small
 * water ring around it. Deterministic from the WORLD.seed.
 *
 * Each plaza is rendered as a small themed building / marker, not just a
 * pole with a lantern. Player + trees have a soft round shadow disc
 * underneath (AC/Stardew classic look).
 */
import * as THREE from 'three';
import { PALETTE, WORLD } from '../core/config';
import { toonMat, addOutline } from '../render/toonMaterial';
import { makeRng, rngRange } from '../utils/rng';

export interface Island {
  group: THREE.Group;
  /** Returns world coords clamped to the island's walkable area. */
  clamp(x: number, z: number): { x: number; z: number };
  /** True if a point is on the walkable surface (within the island). */
  isWalkable(x: number, z: number): boolean;
  /** Plaza mesh groups, indexed by plaza id. */
  plazas: Map<string, THREE.Group>;
}

interface PlazaSpec {
  id: string;
  name: string;
  x: number;
  z: number;
  style: 'forge' | 'library' | 'tower' | 'plaza' | 'workshop' | 'shrine' | 'well';
}

/** Plazas arranged in a 2x3 grid on a rectangular island (70x56), with a
 *  central "well" point in the middle. */
const PLAZA_SPOTS: PlazaSpec[] = [
  { id: 'aurora',      name: 'Plaza Aurora',     x: -26, z: -20, style: 'plaza'    },
  { id: 'forja',       name: 'Plaza Forja',      x:  26, z: -20, style: 'forge'    },
  { id: 'biblioteca',  name: 'Plaza Biblioteca', x:  26, z:  20, style: 'library'  },
  { id: 'herreria',    name: 'Plaza Herrería',   x: -26, z:  20, style: 'workshop' },
  { id: 'torre',       name: 'Plaza Torre',      x:   0, z: -24, style: 'tower'    },
  { id: 'contacto',    name: 'El Mensajero',     x:   0, z:   0, style: 'well'     },
];

/** Build a flat circular shadow disc to put under entities. */
function shadowDisc(radius: number, opacity = 0.32): THREE.Mesh {
  const geom = new THREE.CircleGeometry(radius, 18);
  geom.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  return new THREE.Mesh(geom, mat);
}

/** Build a stylized tree (3-tier foliage on a trunk). */
function buildTree(rng: () => number): THREE.Group {
  const tree = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 0.9, 6),
    toonMat({ color: PALETTE.woodDark }),
  );
  trunk.position.y = 0.45;
  addOutline(trunk, '#2a1a0a', 1.06);
  tree.add(trunk);

  const t1 = new THREE.Mesh(
    new THREE.ConeGeometry(0.95, 0.9, 8),
    toonMat({ color: PALETTE.leafDark }),
  );
  t1.position.y = 1.10;
  addOutline(t1, '#2a1a0a', 1.04);
  tree.add(t1);

  const t2 = new THREE.Mesh(
    new THREE.ConeGeometry(0.75, 0.8, 8),
    toonMat({ color: PALETTE.leaf }),
  );
  t2.position.y = 1.65;
  addOutline(t2, '#2a1a0a', 1.04);
  tree.add(t2);

  const t3 = new THREE.Mesh(
    new THREE.ConeGeometry(0.50, 0.7, 8),
    toonMat({ color: PALETTE.grassHi }),
  );
  t3.position.y = 2.15;
  addOutline(t3, '#2a1a0a', 1.04);
  tree.add(t3);

  tree.rotation.y = rng() * Math.PI * 2;
  return tree;
}

/** A small house with a roof and a door. */
function buildHouse(opts: {
  bodyColor: number | string;
  roofColor: number | string;
  w: number;
  h: number;
  d: number;
  doorColor?: number | string;
}): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(opts.w, opts.h, opts.d),
    toonMat({ color: opts.bodyColor }),
  );
  body.position.y = opts.h / 2;
  addOutline(body, '#2a1a0a', 1.03);
  g.add(body);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(Math.max(opts.w, opts.d) * 0.78, 0.9, 4),
    toonMat({ color: opts.roofColor }),
  );
  roof.position.y = opts.h + 0.45;
  roof.rotation.y = Math.PI / 4;
  addOutline(roof, '#2a1a0a', 1.03);
  g.add(roof);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, opts.h * 0.55, 0.1),
    toonMat({ color: opts.doorColor ?? PALETTE.woodDark }),
  );
  door.position.set(0, opts.h * 0.275, opts.d / 2 + 0.01);
  g.add(door);

  const win = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.45, 0.1),
    toonMat({ color: '#a0e0f0' }),
  );
  win.position.set(opts.w * 0.3, opts.h * 0.65, opts.d / 2 + 0.01);
  g.add(win);

  return g;
}

/** A cylindrical tower (lighthouse-style) with a lantern on top. */
function buildTower(): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.1, 4.2, 12),
    toonMat({ color: PALETTE.stoneHi }),
  );
  base.position.y = 2.1;
  addOutline(base, '#2a1a0a', 1.02);
  g.add(base);

  for (let i = 0; i < 3; i++) {
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.18, 12),
      toonMat({ color: PALETTE.roof }),
    );
    stripe.position.y = 0.6 + i * 1.3;
    g.add(stripe);
  }

  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 0.6, 8),
    toonMat({ color: PALETTE.woodDark }),
  );
  housing.position.y = 4.5;
  addOutline(housing, '#2a1a0a', 1.04);
  g.add(housing);

  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.5, 8),
    toonMat({ color: PALETTE.warm, emissive: PALETTE.warm, emissiveIntensity: 0.7 }),
  );
  glass.position.y = 4.5;
  g.add(glass);

  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(0.7, 0.5, 8),
    toonMat({ color: PALETTE.woodDark }),
  );
  cap.position.y = 5.05;
  addOutline(cap, '#2a1a0a', 1.04);
  g.add(cap);

  const light = new THREE.PointLight(PALETTE.warm, 0.8, 10, 2);
  light.position.y = 4.5;
  g.add(light);

  return g;
}

/** A wishing well for the central plaza. */
function buildWell(): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.1, 0.6, 12),
    toonMat({ color: PALETTE.stone }),
  );
  base.position.y = 0.3;
  addOutline(base, '#2a1a0a', 1.03);
  g.add(base);

  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.85, 0.05, 12),
    toonMat({ color: PALETTE.water, emissive: PALETTE.water, emissiveIntensity: 0.2 }),
  );
  water.position.y = 0.62;
  g.add(water);

  const postL = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 1.4, 0.18),
    toonMat({ color: PALETTE.woodDark }),
  );
  postL.position.set(-0.7, 1.3, 0);
  addOutline(postL, '#2a1a0a', 1.04);
  g.add(postL);

  const postR = postL.clone();
  postR.position.x = 0.7;
  g.add(postR);

  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.16, 0.18),
    toonMat({ color: PALETTE.wood }),
  );
  beam.position.y = 2.0;
  addOutline(beam, '#2a1a0a', 1.04);
  g.add(beam);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.0, 0.7, 6),
    toonMat({ color: PALETTE.roof }),
  );
  roof.position.y = 2.7;
  roof.rotation.y = Math.PI / 6;
  addOutline(roof, '#2a1a0a', 1.03);
  g.add(roof);

  return g;
}

function buildPlazaMarker(spec: PlazaSpec): THREE.Group {
  const g = new THREE.Group();

  const plat = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.6, 0.3, 16),
    toonMat({ color: PALETTE.stoneHi }),
  );
  plat.position.y = 0.15;
  addOutline(plat, '#2a1a0a', 1.02);
  g.add(plat);

  const innerDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(2.05, 2.05, 0.32, 16),
    toonMat({ color: PALETTE.stone }),
  );
  innerDisc.position.y = 0.17;
  g.add(innerDisc);

  const sh = shadowDisc(2.4, 0.2);
  sh.position.y = 0.31;
  g.add(sh);

  let marker: THREE.Group;
  switch (spec.style) {
    case 'forge':
      marker = buildHouse({ bodyColor: '#8a5a3a', roofColor: PALETTE.roof, w: 2.2, h: 1.6, d: 1.8, doorColor: '#5a3a22' });
      break;
    case 'library':
      marker = buildHouse({ bodyColor: '#d8c890', roofColor: PALETTE.roofDark, w: 2.6, h: 1.8, d: 2.0, doorColor: PALETTE.woodDark });
      break;
    case 'workshop':
      marker = buildHouse({ bodyColor: '#9a7050', roofColor: '#5a8a3a', w: 2.0, h: 1.5, d: 2.2, doorColor: PALETTE.woodDark });
      break;
    case 'tower':
      marker = buildTower();
      break;
    case 'well':
      marker = buildWell();
      break;
    case 'plaza':
    default:
      marker = new THREE.Group();
      const shrine = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.8, 1.2),
        toonMat({ color: PALETTE.woodHi }),
      );
      shrine.position.y = 0.4;
      addOutline(shrine, '#2a1a0a', 1.03);
      marker.add(shrine);
      const flagPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6),
        toonMat({ color: PALETTE.woodDark }),
      );
      flagPole.position.y = 1.6;
      addOutline(flagPole, '#2a1a0a', 1.05);
      marker.add(flagPole);
      const flag = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.4, 0.04),
        toonMat({ color: PALETTE.npc, side: THREE.DoubleSide }),
      );
      flag.position.set(0.3, 2.0, 0);
      marker.add(flag);
      break;
  }
  g.add(marker);
  return g;
}

export function buildIsland(scene: THREE.Scene): Island {
  const group = new THREE.Group();
  const W = WORLD.island.width;
  const D = WORLD.island.depth;
  const surfY = WORLD.island.surfaceY;

  // --- Grass surface (rounded rectangle, subdivided for jitter) ---
  // We use a Shape with rounded corners and a custom triangulated mesh.
  const cornerR = 14;
  const shape = new THREE.Shape();
  shape.moveTo(-W/2 + cornerR, -D/2);
  shape.lineTo(W/2 - cornerR, -D/2);
  shape.quadraticCurveTo(W/2, -D/2, W/2, -D/2 + cornerR);
  shape.lineTo(W/2, D/2 - cornerR);
  shape.quadraticCurveTo(W/2, D/2, W/2 - cornerR, D/2);
  shape.lineTo(-W/2 + cornerR, D/2);
  shape.quadraticCurveTo(-W/2, D/2, -W/2, D/2 - cornerR);
  shape.lineTo(-W/2, -D/2 + cornerR);
  shape.quadraticCurveTo(-W/2, -D/2, -W/2 + cornerR, -D/2);

  const grassGeom = new THREE.ShapeGeometry(shape, 48);
  grassGeom.rotateX(-Math.PI / 2);

  // Subtle vertex jitter for hand-made feel.
  const pos = grassGeom.attributes.position;
  const rng = makeRng(WORLD.seed);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const d = Math.min(1, Math.hypot(x / (W/2), z / (D/2)));
    if (d > 0.05) {
      pos.setY(i, rngRange(rng, -0.15, 0.15) * (1 - d));
    }
  }
  pos.needsUpdate = true;
  grassGeom.computeVertexNormals();

  const grass = new THREE.Mesh(grassGeom, toonMat({ color: PALETTE.grass }));
  grass.position.y = surfY;
  group.add(grass);

  // Subtle darker path ring under the player's default zone.
  // NOTE: a single low-offset ring avoids z-fighting with the grass.
  const innerShape = new THREE.Shape();
  const inW = W * 0.78, inD = D * 0.78, inR = cornerR * 0.8;
  innerShape.moveTo(-inW/2 + inR, -inD/2);
  innerShape.lineTo(inW/2 - inR, -inD/2);
  innerShape.quadraticCurveTo(inW/2, -inD/2, inW/2, -inD/2 + inR);
  innerShape.lineTo(inW/2, inD/2 - inR);
  innerShape.quadraticCurveTo(inW/2, inD/2, inW/2 - inR, inD/2);
  innerShape.lineTo(-inW/2 + inR, inD/2);
  innerShape.quadraticCurveTo(-inW/2, inD/2, -inW/2, inD/2 - inR);
  innerShape.lineTo(-inW/2, -inD/2 + inR);
  innerShape.quadraticCurveTo(-inW/2, -inD/2, -inW/2 + inR, -inD/2);
  const innerGeom = new THREE.ShapeGeometry(innerShape, 48);
  innerGeom.rotateX(-Math.PI / 2);
  const inner = new THREE.Mesh(innerGeom, toonMat({ color: PALETTE.grassDark }));
  // 0.04 (was 0.005) — well above z-fighting precision.
  inner.position.y = surfY + 0.04;
  group.add(inner);

  // --- Cliff underneath ---
  // A short beveled box follows the rounded-rect footprint.
  const cliffGeom = new THREE.BoxGeometry(W * 0.95, 6, D * 0.95, 1, 1, 1);
  const cliff = new THREE.Mesh(cliffGeom, toonMat({ color: PALETTE.cliff }));
  cliff.position.y = surfY - 3;
  addOutline(cliff, '#2a1a0a', 1.02);
  group.add(cliff);

  // Tapered bottom
  const baseGeom = new THREE.ConeGeometry(1, 9, 24, 1);
  baseGeom.scale(W * 0.6, 1, D * 0.6);
  const base = new THREE.Mesh(baseGeom, toonMat({ color: PALETTE.cliffHi }));
  base.position.y = surfY - 10;
  addOutline(base, '#2a1a0a', 1.02);
  group.add(base);

  // --- Water plane (huge, off-island) ---
  // A flat large plane sits at the waterline, color turquesa. The island
  // sits on top of it, so the water "wraps around" the island up to the
  // horizon. Single plane, no outline (water is supposed to be smooth).
  const waterGeom = new THREE.PlaneGeometry(400, 400, 1, 1);
  waterGeom.rotateX(-Math.PI / 2);
  const waterMat = toonMat({ color: PALETTE.water, transparent: true, opacity: 0.85 });
  const water = new THREE.Mesh(waterGeom, waterMat);
  water.position.y = surfY - 0.05;
  group.add(water);

  // Ocean accent ring (slightly darker ring) — adds a subtle depth
  // illusion right at the island's edge.
  const ringGeom = new THREE.RingGeometry(W * 0.6, W * 1.1, 48);
  ringGeom.rotateX(-Math.PI / 2);
  const ringMat = toonMat({ color: PALETTE.waterHi, transparent: true, opacity: 0.35 });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.position.y = surfY - 0.03;
  group.add(ring);

  scene.add(group);

  // --- Plazas ---
  const plazas = new Map<string, THREE.Group>();
  for (const spec of PLAZA_SPOTS) {
    const plaza = buildPlazaMarker(spec);
    plaza.position.set(spec.x, surfY, spec.z);
    group.add(plaza);
    plazas.set(spec.id, plaza);
  }

  // --- Trees scattered around the plaza grid ---
  const treeSpots: Array<{ x: number; z: number; scale: number }> = [];
  let attempts = 0;
  while (treeSpots.length < 40 && attempts < 600) {
    attempts++;
    const x = (rng() - 0.5) * (W - 12);
    const z = (rng() - 0.5) * (D - 12);
    let tooClose = false;
    for (const p of PLAZA_SPOTS) {
      if (Math.hypot(p.x - x, p.z - z) < 5) { tooClose = true; break; }
    }
    if (tooClose) continue;
    let treeClash = false;
    for (const t of treeSpots) {
      if (Math.hypot(t.x - x, t.z - z) < 3) { treeClash = true; break; }
    }
    if (treeClash) continue;
    treeSpots.push({ x, z, scale: 0.8 + rng() * 0.6 });
  }
  for (const t of treeSpots) {
    const tree = buildTree(rng);
    const sh = shadowDisc(0.8 * t.scale, 0.28);
    sh.position.set(t.x, 0.02, t.z);
    group.add(sh);
    tree.position.set(t.x, 0, t.z);
    tree.scale.setScalar(t.scale);
    group.add(tree);
  }

  // --- Decorative bushes/flowers ---
  for (let i = 0; i < 70; i++) {
    const x = (rng() - 0.5) * (W - 6);
    const z = (rng() - 0.5) * (D - 6);
    let tooClose = false;
    for (const p of PLAZA_SPOTS) {
      if (Math.hypot(p.x - x, p.z - z) < 3) { tooClose = true; break; }
    }
    for (const t of treeSpots) {
      if (Math.hypot(t.x - x, t.z - z) < 1.5) { tooClose = true; break; }
    }
    if (tooClose) continue;
    const bushColors = [PALETTE.npc, PALETTE.warm, PALETTE.warmHot, '#d850d0', '#fff0a0'];
    const color = bushColors[Math.floor(rng() * bushColors.length)];
    const bush = new THREE.Mesh(
      new THREE.SphereGeometry(0.25 + rng() * 0.15, 6, 5),
      toonMat({ color }),
    );
    bush.position.set(x, 0.2, z);
    bush.scale.y = 0.6;
    addOutline(bush, '#2a1a0a', 1.04);
    group.add(bush);
  }

  // --- Functions exposed ---
  // Clamp to a rounded rectangle (not just an AABB).
  const clamp = (x: number, z: number): { x: number; z: number } => {
    const margin = 0.5;
    const halfW = W/2 - margin;
    const halfD = D/2 - margin;
    const nx = THREE.MathUtils.clamp(x, -halfW, halfW);
    const nz = THREE.MathUtils.clamp(z, -halfD, halfD);
    // Pull back from rounded corners: if we're in a corner region, project
    // toward the center to stay within the rounded shape.
    const dx = nx - Math.max(-halfW + cornerR, Math.min(halfW - cornerR, nx));
    const dz = nz - Math.max(-halfD + cornerR, Math.min(halfD - cornerR, nz));
    const dist = Math.hypot(dx, dz);
    if (dist > cornerR) {
      const k = cornerR / dist;
      return { x: Math.max(-halfW + cornerR, Math.min(halfW - cornerR, nx)) + dx * k, z: nz };
    }
    return { x: nx, z: nz };
  };

  const isWalkable = (x: number, z: number): boolean => {
    return Math.abs(x) < W/2 - 1 && Math.abs(z) < D/2 - 1;
  };

  return { group, clamp, isWalkable, plazas };
}
