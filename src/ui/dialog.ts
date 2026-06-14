/**
 * Dialog bubble that shows a sequence of pages. Each character is wrapped in
 * its own span for letter-by-letter animation. Pressing E / Space / clicking
 * advances to the next page, or closes when the last page is done.
 *
 * WoraWork pattern: every character is a span + a blinking ArrowDown at the
 * end of the current page to indicate "press to continue".
 */
export interface DialogHandlers {
  onPageChange?: (pageIndex: number, totalPages: number, line: string) => void;
  onClose?: () => void;
}

const TYPEWRITER_SPEED_MS = 22;

export class DialogBubble {
  private root: HTMLElement;
  private headerEl: HTMLElement;
  private bodyEl: HTMLElement;
  private arrowEl: HTMLElement;
  private hintEl: HTMLElement;

  private lines: string[] = [];
  private pageIdx = 0;
  private typewriterTimer: number | null = null;
  private handlers: DialogHandlers = {};
  private visible = false;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'dialog-bubble';
    this.root.style.display = 'none';
    this.root.innerHTML = `
      <div class="dialog-header">
        <span class="dialog-name"></span>
        <span class="dialog-subtitle"></span>
      </div>
      <div class="dialog-body"></div>
      <div class="dialog-arrow">▼</div>
      <div class="dialog-hint">E / Space / Click para continuar</div>
    `;
    parent.appendChild(this.root);
    this.headerEl = this.root.querySelector('.dialog-name') as HTMLElement;
    this.bodyEl = this.root.querySelector('.dialog-body') as HTMLElement;
    this.arrowEl = this.root.querySelector('.dialog-arrow') as HTMLElement;
    this.hintEl = this.root.querySelector('.dialog-hint') as HTMLElement;
  }

  isVisible(): boolean { return this.visible; }
  get currentPage(): number { return this.pageIdx; }
  get totalPages(): number { return this.lines.length; }

  show(header: string, subtitle: string, lines: string[], handlers: DialogHandlers = {}): void {
    this.lines = lines.slice();
    this.handlers = handlers;
    this.pageIdx = 0;
    this.headerEl.textContent = header;
    const subEl = this.root.querySelector('.dialog-subtitle') as HTMLElement;
    subEl.textContent = subtitle;
    this.root.style.display = 'flex';
    this.visible = true;
    this.showCurrentPage();
  }

  hide(): void {
    this.stopTypewriter();
    this.root.style.display = 'none';
    this.visible = false;
    this.handlers.onClose?.();
  }

  /** Try to advance: skip typewriter if mid-typing, otherwise next page. */
  advance(): void {
    if (!this.visible) return;
    if (this.typewriterTimer !== null) {
      // Skip typewriter: reveal full line immediately
      this.stopTypewriter();
      this.fillSpans(this.lines[this.pageIdx]!);
      this.showArrow(true);
      return;
    }
    this.pageIdx++;
    if (this.pageIdx >= this.lines.length) {
      this.hide();
      return;
    }
    this.showCurrentPage();
  }

  private showCurrentPage(): void {
    this.stopTypewriter();
    const line = this.lines[this.pageIdx] ?? '';
    this.handlers.onPageChange?.(this.pageIdx, this.lines.length, line);
    this.bodyEl.innerHTML = '';
    // Build one <span> per char, all hidden.
    for (let i = 0; i < line.length; i++) {
      const sp = document.createElement('span');
      sp.textContent = line[i] === ' ' ? '\u00A0' : line[i]!;
      sp.className = 'dialog-letter';
      sp.style.opacity = '0';
      this.bodyEl.appendChild(sp);
    }
    this.showArrow(false);
    this.typewrite(line);
  }

  private typewrite(line: string): void {
    const spans = this.bodyEl.querySelectorAll<HTMLElement>('.dialog-letter');
    let i = 0;
    const tick = (): void => {
      if (i >= line.length) {
        this.typewriterTimer = null;
        this.showArrow(true);
        return;
      }
      const sp = spans[i];
      if (sp) {
        sp.style.transition = 'opacity 80ms';
        sp.style.opacity = '1';
      }
      i++;
      this.typewriterTimer = window.setTimeout(tick, TYPEWRITER_SPEED_MS);
    };
    tick();
  }

  private stopTypewriter(): void {
    if (this.typewriterTimer !== null) {
      clearTimeout(this.typewriterTimer);
      this.typewriterTimer = null;
    }
  }

  private fillSpans(line: string): void {
    const spans = this.bodyEl.querySelectorAll<HTMLElement>('.dialog-letter');
    for (let i = 0; i < spans.length && i < line.length; i++) {
      spans[i]!.style.opacity = '1';
    }
  }

  private showArrow(show: boolean): void {
    this.arrowEl.style.opacity = show ? '1' : '0';
    this.arrowEl.style.animation = show ? 'dialog-blink 0.8s infinite' : 'none';
    this.hintEl.style.opacity = show ? '1' : '0';
  }
}
