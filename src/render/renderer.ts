/**
 * Renderer + lights setup. One orthographic-ish top-down feel; we still use
 * PerspectiveCamera but at a moderate FOV (50°).
 */
import * as THREE from 'three';

export function createRenderer(container: HTMLElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false,
    // Keep the drawing buffer around so external tooling (and the
    // browser compositor) can read it after a frame is rendered.
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x5fb8e8, 1.0); // sky-blue clear so even empty frames are not black
  renderer.shadowMap.enabled = false;
  container.appendChild(renderer.domElement);
  return renderer;
}

export function addLights(scene: THREE.Scene): void {
  // Bright warm ambient — AC daytime feel.
  const ambient = new THREE.AmbientLight(0xfff0d0, 0.95);
  scene.add(ambient);

  // Hemisphere light: blue sky color from above, warm sand color from below.
  // This makes the world's colors look coherent even though the actual
  // skybox dome is mostly out of view (camera looks down).
  const hemi = new THREE.HemisphereLight(0x88c8e8, 0xc8a878, 0.45);
  scene.add(hemi);

  // Key light from the sun (warm yellow, high angle).
  const dir = new THREE.DirectionalLight(0xfff2c0, 0.65);
  dir.position.set(40, 60, -30);
  scene.add(dir);

  // Cool sky fill from the opposite side.
  const fill = new THREE.DirectionalLight(0xa0c8e0, 0.30);
  fill.position.set(-40, 30, 30);
  scene.add(fill);
}
