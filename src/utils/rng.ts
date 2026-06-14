/**
 * Seeded RNG wrapper. Deterministic procedural generation.
 */
import seedrandom from 'seedrandom';

export function makeRng(seed: string): () => number {
  return seedrandom(seed);
}

export function rngRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function rngInt(rng: () => number, min: number, maxInclusive: number): number {
  return Math.floor(min + rng() * (maxInclusive - min + 1));
}

export function rngPick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
