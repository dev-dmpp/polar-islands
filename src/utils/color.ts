/**
 * Color helpers: hex ↔ THREE.Color, palette utilities.
 */
import * as THREE from 'three';

export function hexToColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

export function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}
