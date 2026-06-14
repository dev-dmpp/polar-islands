/**
 * Landing screen with a "establishing shot": a static render of the island +
 * sky shown behind an overlay. The "Enter" button fades in once the world is
 * ready. Subtext mentions audio (Thibault pattern).
 */
import { PROFILE } from '../content/profile';

export interface LandingApi {
  show(onEnter: () => void): void;
  hide(): void;
  setReady(ready: boolean): void;
  destroy(): void;
}

export function createLanding(parent: HTMLElement): LandingApi {
  const overlay = document.createElement('div');
  overlay.className = 'landing';
  overlay.innerHTML = `
    <div class="landing-vignette"></div>
    <div class="landing-content">
      <h1 class="landing-title">
        <span class="t-l t-1">P</span><span class="t-l t-2">o</span><span class="t-l t-3">l</span><span class="t-l t-4">a</span><span class="t-l t-5">r</span>
        <span class="t-sp">&nbsp;</span>
        <span class="t-l t-6">I</span><span class="t-l t-7">s</span><span class="t-l t-8">l</span><span class="t-l t-9">a</span><span class="t-l t-10">n</span><span class="t-l t-11">d</span><span class="t-l t-12">s</span>
      </h1>
      <p class="landing-tagline">Hola, soy ${PROFILE.name}. Explora mi sistema.</p>
      <p class="landing-sub">Esta experiencia usa audio. La música es ambient.</p>
      <button class="landing-cta" disabled>
        <span class="cta-text">Cargando el mundo…</span>
      </button>
      <div class="landing-foot">
        <kbd>W</kbd> mover (opcional) · <kbd>Click</kbd> en cualquier punto del mundo para ir ahí · <kbd>Rueda</kbd> zoom · <kbd>Esc</kbd> menú
      </div>
    </div>
  `;
  parent.appendChild(overlay);

  const btn = overlay.querySelector('.landing-cta') as HTMLButtonElement;
  const ctaText = overlay.querySelector('.cta-text') as HTMLElement;
  let onEnterCb: (() => void) | null = null;

  const onClick = (): void => {
    if (btn.disabled) return;
    onEnterCb?.();
  };
  btn.addEventListener('click', onClick);
  // Also allow pressing Space/Enter to "enter" the world
  const onKey = (e: KeyboardEvent): void => {
    if (overlay.classList.contains('hidden')) return;
    if (e.code === 'Enter' || e.code === 'Space') {
      if (!btn.disabled) {
        e.preventDefault();
        onClick();
      }
    }
  };
  window.addEventListener('keydown', onKey);

  return {
    show(onEnter) {
      onEnterCb = onEnter;
      overlay.classList.remove('hidden');
      // Animate title letters
      const letters = overlay.querySelectorAll<HTMLElement>('.t-l');
      letters.forEach((sp, i) => {
        sp.style.opacity = '0';
        sp.style.transform = 'translateY(20px)';
        window.setTimeout(() => {
          sp.style.transition = 'opacity 500ms cubic-bezier(0.2,0.7,0.2,1), transform 500ms cubic-bezier(0.2,0.7,0.2,1)';
          sp.style.opacity = '1';
          sp.style.transform = 'translateY(0)';
        }, 300 + i * 60);
      });
    },
    hide() {
      overlay.classList.add('hidden');
      // After the CSS transition, set display:none
      window.setTimeout(() => { overlay.style.display = 'none'; }, 700);
    },
    setReady(ready) {
      btn.disabled = !ready;
      ctaText.textContent = ready ? 'Entrar al archipiélago' : 'Cargando el mundo…';
    },
    destroy() {
      btn.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
      overlay.remove();
    },
  };
}
