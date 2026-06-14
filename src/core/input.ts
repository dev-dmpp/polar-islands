/**
 * Input: keyboard + mouse. The player moves by clicking a destination in the
 * world; keys for rotation, dialog advance, mute, and menu.
 */
export class InputManager {
  private keys = new Set<string>();
  private mouse: { x: number; y: number; nx: number; ny: number; leftDown: boolean; rightDown: boolean } = {
    x: 0, y: 0, nx: 0, ny: 0, leftDown: false, rightDown: false,
  };
  private clickQueue: { x: number; y: number; shift: boolean; right: boolean }[] = [];
  private wheelDelta = 0;
  private onResize: () => void;

  constructor(canvas: HTMLCanvasElement, onResize: () => void) {
    this.onResize = onResize;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('resize', this.onResize);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('resize', this.onResize);
  }

  private keyState = {
    /** Set the first frame a key goes down; cleared on consume. */
    advanceEdge: false,
  };
  private onKeyDown = (e: KeyboardEvent): void => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
    if (!this.keys.has(e.code)) {
      // Edge-trigger for "press to advance / open dialog"
      if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
        this.keyState.advanceEdge = true;
      }
    }
    this.keys.add(e.code);
  };
  private onKeyUp = (e: KeyboardEvent): void => { this.keys.delete(e.code); };
  private onBlur = (): void => { this.keys.clear(); this.keyState.advanceEdge = false; };

  /** Edge-triggered: true exactly one frame per key press. */
  consumeAdvanceEdge(): boolean {
    const v = this.keyState.advanceEdge;
    this.keyState.advanceEdge = false;
    return v;
  }

  private onMouseMove = (e: MouseEvent): void => {
    const target = e.currentTarget as HTMLCanvasElement;
    const rect = target.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
    this.mouse.nx = (this.mouse.x / rect.width) * 2 - 1;
    this.mouse.ny = -((this.mouse.y / rect.height) * 2 - 1);
  };
  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) this.mouse.leftDown = true;
    if (e.button === 2) this.mouse.rightDown = true;
    this.clickQueue.push({ x: e.clientX, y: e.clientY, shift: e.shiftKey, right: e.button === 2 });
  };
  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) this.mouse.leftDown = false;
    if (e.button === 2) this.mouse.rightDown = false;
  };
  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.wheelDelta += e.deltaY;
  };

  isDown(code: string): boolean { return this.keys.has(code); }

  getMouse(): { nx: number; ny: number; x: number; y: number } {
    return this.mouse;
  }

  /** Pop a queued click. Returns null if no click pending. */
  popClick(): { x: number; y: number; shift: boolean; right: boolean } | null {
    return this.clickQueue.shift() ?? null;
  }

  /** Accumulated wheel delta since last call. */
  consumeWheel(): number {
    const d = this.wheelDelta;
    this.wheelDelta = 0;
    return d;
  }

  // --- High-level queries (used by main loop) ---

  /** Movement input (continuous). Returns {dx, dz} in world XZ each tick. */
  getMoveAxis(): { dx: number; dz: number } {
    let dx = 0;
    let dz = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp'))    dz -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown'))  dz += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft'))  dx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) dx += 1;
    // Normalize so diagonals aren't faster.
    const len = Math.hypot(dx, dz);
    if (len > 0) { dx /= len; dz /= len; }
    return { dx, dz };
  }

  isThrusting(): boolean {
    return this.keys.has('KeyW') || this.keys.has('ArrowUp');
  }
  isBraking(): boolean {
    return this.keys.has('Space');
  }
  isBoosting(): boolean {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }
  isAdvancing(): boolean {
    return this.keys.has('KeyE') || this.keys.has('Space') || this.keys.has('Enter');
  }
  isEscapeDown(): boolean {
    return this.keys.has('Escape');
  }
  isMuteDown(): boolean {
    return this.keys.has('KeyM');
  }
  isResetDown(): boolean {
    return this.keys.has('KeyR');
  }
  isHelpDown(): boolean {
    return this.keys.has('KeyH') || this.keys.has('Slash');
  }
}
