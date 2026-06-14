/**
 * Polar Islands — core configuration.
 * Paleta frío profundo + acentos vibrantes. Vista 3/4 top-down.
 */

export const PALETTE = {
  // Sky — daytime, warm and soft
  skyTop:    '#5fb8e8',   // bright sky blue
  skyMid:    '#a8d8f0',   // pale blue
  skyBot:    '#fff0d0',   // warm cream horizon

  // Sun
  sun:       '#fff2a0',   // soft yellow

  // Ground & water
  grass:     '#7cbe5a',   // vibrant cartoon grass
  grassDark: '#5a9a3e',
  grassHi:   '#a8d878',
  water:     '#5fb8d8',
  waterHi:   '#a0e0f0',
  cliff:     '#8a6a4a',
  cliffHi:   '#a8855a',

  // Architecture
  wood:      '#c08050',
  woodDark:  '#8a5028',
  woodHi:    '#d8a070',
  stone:     '#9aa8b8',
  stoneHi:   '#c0c8d0',

  // Accents
  accent1:   '#5fb8e8',   // soft blue
  accent2:   '#e08a50',   // warm orange
  warm:      '#ffc864',   // lanterns
  warmHot:   '#ff8848',
  npc:       '#e8608c',   // Polar pink
  npcSkin:   '#ffd5b0',
  leaf:      '#5fb84a',
  leafDark:  '#3a8a30',
  roof:      '#a83838',   // warm red roof
  roofDark:  '#7a2828',

  // UI
  text:      '#3a2818',
  textDim:   '#7a5a3a',
  panel:     '#fff5dc',
  panelEdge: '#8a5028',
} as const;

export const WORLD = {
  /** Island size in world units (oval). */
  island: {
    radiusX: 42,
    radiusZ: 32,
    surfaceY: 0,
  },
  /** Player walk speed in world units / second. */
  player: {
    speed: 6,
    reachDist: 1.2,        // distance to target = "arrived"
    turnLerp: 0.18,
    walkBobAmp: 0.06,
    walkBobHz: 4.5,
  },
  /** Camera follow tuning. Orthographic top-down.
   *  zoom = half-height of viewport in world units.
   *  At zoom 18 we see ~36 world units tall, which fits the island
   *  (radiusZ=32) with a small margin. */
  camera: {
    lookAhead: 0,
    followLerp: 0.12,
    minZoom: 12,
    maxZoom: 60,
    initialZoom: 38,
  },
  /** Rng seed for procedural world. */
  seed: 'polar-aurora',
} as const;

export const SAVE_KEY = 'polar-islands-save-v1';
export const SETTINGS_KEY = 'polar-islands-settings-v1';
