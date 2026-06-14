/**
 * Procedural starry skybox with a 3-stop vertical gradient. A flat inverted
 * sphere with a custom shader; no textures required.
 */
import * as THREE from 'three';
import { PALETTE } from '../core/config';

const SKY_RADIUS = 1800;
const STAR_COUNT = 700;

export function buildSky(scene: THREE.Scene): { mesh: THREE.Mesh; stars: THREE.Points } {
  // Gradient sky dome
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

  // Stars
  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);
  const tints = [
    new THREE.Color(0xffffff),
    new THREE.Color(0xc8e0ff),
    new THREE.Color(0xffe0c8),
    new THREE.Color(0xffc8e0),
    new THREE.Color(0xc8ffe0),
  ];
  for (let i = 0; i < STAR_COUNT; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = SKY_RADIUS * 0.95;
    positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    const tint = tints[Math.floor(Math.random() * tints.length)];
    colors[i * 3 + 0] = tint.r;
    colors[i * 3 + 1] = tint.g;
    colors[i * 3 + 2] = tint.b;
    sizes[i] = Math.random() < 0.85 ? (1.5 + Math.random() * 1.5) : (3 + Math.random() * 2.5);
  }
  const starGeom = new THREE.BufferGeometry();
  starGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  starGeom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const starMat = new THREE.PointsMaterial({
    size: 2.2,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeom, starMat);
  stars.renderOrder = -999;
  scene.add(stars);

  return { mesh, stars };
}
