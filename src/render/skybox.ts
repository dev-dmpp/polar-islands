/**
 * Sky: soft daytime sky with a sun. Animal Crossing / Stardew Valley look:
 * warm pastel gradient (light blue at top, warm cream at horizon) instead
 * of the previous deep purple night sky.
 */
import * as THREE from 'three';
import { PALETTE } from '../core/config';

const SKY_RADIUS = 1800;

export function buildSky(scene: THREE.Scene): { mesh: THREE.Mesh; sun: THREE.Mesh } {
  // Sky dome with vertical gradient.
  const skyGeom = new THREE.SphereGeometry(SKY_RADIUS, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color(PALETTE.skyTop) },
      uMid: { value: new THREE.Color(PALETTE.skyMid) },
      uBot: { value: new THREE.Color(PALETTE.skyBot) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uMid;
      uniform vec3 uBot;
      varying vec3 vPos;
      void main() {
        float h = normalize(vPos).y;
        vec3 col;
        if (h > 0.0) {
          col = mix(uMid, uTop, smoothstep(0.0, 0.6, h));
        } else {
          col = mix(uMid, uBot, smoothstep(0.0, -0.6, h));
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(skyGeom, skyMat);
  mesh.renderOrder = -1000;
  scene.add(mesh);

  // A soft sun disc placed at a high angle. Lit, unlit material so it
  // glows with its own color regardless of lighting.
  const sunGeom = new THREE.CircleGeometry(28, 24);
  const sunMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(PALETTE.sun),
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const sun = new THREE.Mesh(sunGeom, sunMat);
  // Place it in the upper portion of the sky, off-center to the back.
  sun.position.set(80, 600, -800);
  sun.lookAt(0, 0, 0);
  sun.renderOrder = -998;
  scene.add(sun);

  return { mesh, sun };
}
