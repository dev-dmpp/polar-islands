import { SAVE_KEY, SETTINGS_KEY } from './config';

export interface SaveData {
  /** Player position in world units. */
  playerX: number;
  playerY: number;
  playerZ: number;
  playerRotY: number;
  /** Which zones the player has visited. */
  visited: string[];
  /** Timestamp. */
  updatedAt: number;
}

export interface Settings {
  /** Audio enabled. */
  audioOn: boolean;
  /** Audio volume 0..1. */
  volume: number;
  /** Show dev debug panel. */
  debug: boolean;
}

const defaultSave = (): SaveData => ({
  playerX: 0,
  playerY: 0,
  playerZ: 8,
  playerRotY: 0,
  visited: [],
  updatedAt: Date.now(),
});

const defaultSettings = (): Settings => ({
  audioOn: true,
  volume: 0.55,
  debug: false,
});

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as SaveData;
    if (typeof parsed.playerX !== 'number') return defaultSave();
    return parsed;
  } catch {
    return defaultSave();
  }
}

export function persistSave(save: SaveData): void {
  save.updatedAt = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // localStorage may be unavailable (private mode, etc.); silently ignore.
  }
}

export function resetSave(): void {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw) as Settings;
    return { ...defaultSettings(), ...parsed };
  } catch {
    return defaultSettings();
  }
}

export function persistSettings(s: Settings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}
