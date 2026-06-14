/**
 * Polar Islands — core configuration.
 * Paleta frío profundo + acentos vibrantes. Vista 3/4 top-down.
 */

export const PALETTE = {
  // Sky
  skyTop:    '#0a0a2e',
  skyMid:    '#1a1a4e',
  skyBot:    '#0d0d2b',

  // Ground & water
  grass:     '#3a8a5a',
  grassDark: '#2a6a42',
  grassHi:   '#5ab070',
  water:     '#3a6ab0',
  waterHi:   '#6ec1ff',
  cliff:     '#5a4a3e',
  cliffHi:   '#7a5a48',

  // Architecture
  wood:      '#8c5a3a',
  woodDark:  '#5a3a22',
  woodHi:    '#b07a52',
  stone:     '#5a6a7e',
  stoneHi:   '#7a8a9e',

  // Accents
  accent1:   '#6ec1ff',  // cyan (highlights, UI)
  accent2:   '#c14aff',  // magenta (selection)
  warm:      '#ffb84a',  // faroles
  warmHot:   '#ff7a3a',
  npc:       '#ff6b9d',  // Polar avatar
  npcSkin:   '#ffd5b0',

  // UI
  text:      '#f5f5f5',
  textDim:   '#b8a3d5',
  panel:     '#0d0d2b',
  panelEdge: '#6ec1ff',
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
  /** Camera follow tuning. */
  camera: {
    offsetY: 22,
    offsetZ: 14,
    lookAhead: 1.5,
    followLerp: 0.10,
    minZoom: 14,
    maxZoom: 60,
    initialZoom: 36,
  },
  /** Rng seed for procedural world. */
  seed: 'polar-aurora',
} as const;

export const SAVE_KEY = 'polar-islands-save-v1';
export const SETTINGS_KEY = 'polar-islands-settings-v1';
