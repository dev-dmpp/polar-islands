/**
 * Toon material helper with a 3-step gradient texture, plus an inverted-hull
 * outline mesh that gives the cartoon look without any post-processing.
 */
import * as THREE from 'three';

let _gradient: THREE.DataTexture | null = null;
function getGradientMap(): THREE.DataTexture {
  if (_gradient) return _gradient;
  // 3-step ramp: shadow / mid / lit. Values in 0..1 with 0.05 separation to
  // get a hard cel-shade look.
  const data = new Uint8Array([60, 140, 240]);
  const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  tex.needsUpdate = true;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  _gradient = tex;
  return tex;
}

export interface ToonOptions {
  color: string | number;
  emissive?: string | number;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  side?: THREE.Side;
  wireframe?: boolean;
}

export function toonMat(opts: ToonOptions): THREE.MeshToonMaterial {
  const mat = new THREE.MeshToonMaterial({
    color: typeof opts.color === 'string' ? new THREE.Color(opts.color) : opts.color,
    gradientMap: getGradientMap(),
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
  });
  if (opts.emissive !== undefined) {
    mat.emissive = new THREE.Color(opts.emissive);
    mat.emissiveIntensity = opts.emissiveIntensity ?? 0.3;
  }
  if (opts.wireframe) mat.wireframe = true;
  return mat;
}

/**
 * Add an inverted-hull outline to a mesh. Adds the outline as a child so it
 * follows the mesh's transform automatically.
 */
export function addOutline(mesh: THREE.Mesh, color = '#2a1a0a', scale = 1.03): THREE.Mesh {
  const outline = new THREE.Mesh(
    mesh.geometry,
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      side: THREE.BackSide,
    }),
  );
  outline.scale.setScalar(scale);
  outline.renderOrder = mesh.renderOrder - 1;
  outline.castShadow = false;
  outline.receiveShadow = false;
  mesh.add(outline);
  return outline;
}
