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
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = false; // off for F0; will revisit in F1
  container.appendChild(renderer.domElement);
  return renderer;
}

export function addLights(scene: THREE.Scene): void {
  // Strong ambient for the toon look — no harsh shadows in F0.
  const ambient = new THREE.AmbientLight(0xc0d0ff, 0.85);
  scene.add(ambient);

  // Directional light to give the toon gradient some direction.
  const dir = new THREE.DirectionalLight(0xffe8b0, 0.55);
  dir.position.set(20, 30, 10);
  scene.add(dir);

  // Cool fill from the opposite side.
  const fill = new THREE.DirectionalLight(0x6080ff, 0.25);
  fill.position.set(-20, 10, -20);
  scene.add(fill);
}
