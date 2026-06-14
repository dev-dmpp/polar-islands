/**
 * Audio manager — Howler.js wrapper.
 * Stub: tracks loaded in F5. Provides mute/volume.
 */
import type { Settings } from './gameState';

export interface AudioApi {
  setMuted(muted: boolean): void;
  setVolume(vol: number): void;
  isMuted(): boolean;
  /** Preload a track. No-op in F0. */
  preload(name: string, src: string): void;
  /** Play a one-shot SFX. No-op in F0. */
  play(name: string): void;
  /** Play a looped ambient track. No-op in F0. */
  playLoop(name: string): void;
}

export function createAudio(settings: Settings): AudioApi {
  return {
    setMuted(muted) { void muted; },
    setVolume(vol) { void vol; },
    isMuted() { return !settings.audioOn; },
    preload(name, src) { void name; void src; },
    play(name) { void name; },
    playLoop(name) { void name; },
  };
}
