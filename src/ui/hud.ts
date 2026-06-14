/**
 * Top-bar HUD with shortcuts. Persistent during gameplay.
 * Buttons mirror the keyboard shortcuts; the keyboard is primary, the
 * buttons are a discoverable safety net.
 */
import { PROFILE } from '../content/profile';

export interface HudApi {
  setMuted(muted: boolean): void;
  setZone(name: string, subtitle: string, visible: boolean): void;
  showHint(text: string, autoMs?: number): void;
  showMenu(): void;
  hideMenu(): void;
  isMenuOpen(): boolean;
  destroy(): void;
}

export function createHud(parent: HTMLElement): HudApi {
  const root = document.createElement('div');
  root.className = 'hud';
  root.innerHTML = `
    <div class="hud-top">
      <div class="hud-brand">
        <span class="brand-dot"></span>
        <span class="brand-name">${PROFILE.alias}</span>
        <span class="brand-sep">·</span>
        <span class="brand-role">Full Stack · Panamá</span>
      </div>
      <div class="hud-buttons">
        <button class="hud-btn" data-act="mute" title="Silenciar/activar audio (M)">
          <span class="ico">♪</span><span class="lbl">Audio</span>
          <span class="kbd">M</span>
        </button>
        <button class="hud-btn" data-act="reset" title="Resetear cámara (R)">
          <span class="ico">⌖</span><span class="lbl">Reset</span>
          <span class="kbd">R</span>
        </button>
        <button class="hud-btn" data-act="contact" title="Contacto">
          <span class="ico">✉</span><span class="lbl">Contacto</span>
        </button>
        <button class="hud-btn primary" data-act="cv" title="Descargar CV (próximamente)">
          <span class="ico">↓</span><span class="lbl">CV</span>
        </button>
        <button class="hud-btn" data-act="gh" title="GitHub">
          <span class="ico">⌘</span><span class="lbl">GitHub</span>
        </button>
        <button class="hud-btn" data-act="menu" title="Menú (Esc)">
          <span class="ico">≡</span><span class="kbd">Esc</span>
        </button>
      </div>
    </div>

    <div class="hud-zone">
      <span class="zone-name"></span>
      <span class="zone-subtitle"></span>
    </div>

    <div class="hud-hint"></div>

    <div class="hud-menu">
      <div class="hud-menu-card">
        <h2>Menú</h2>
        <div class="hud-menu-list">
          <div class="mm-row"><span class="k">Nombre</span><span class="v">${PROFILE.name}</span></div>
          <div class="mm-row"><span class="k">Dirección</span><span class="v">${PROFILE.city}</span></div>
          <div class="mm-row"><span class="k">Email</span><span class="v">${PROFILE.email}</span></div>
          <div class="mm-row"><span class="k">Teléfono</span><span class="v">${PROFILE.phone}</span></div>
          <div class="mm-row"><span class="k">GitHub</span><span class="v">@dev-dmpp</span></div>
        </div>
        <div class="hud-menu-actions">
          <button data-act="cv" class="hud-btn primary">Descargar CV</button>
          <button data-act="gh" class="hud-btn">Ir a GitHub</button>
          <button data-act="mute" class="hud-btn">Silenciar/Activar</button>
          <button data-act="reset-save" class="hud-btn warn">Reiniciar partida</button>
          <button data-act="menu" class="hud-btn">Cerrar</button>
        </div>
      </div>
    </div>
  `;
  parent.appendChild(root);

  const zoneEl = root.querySelector('.hud-zone') as HTMLElement;
  const zoneName = root.querySelector('.zone-name') as HTMLElement;
  const zoneSub = root.querySelector('.zone-subtitle') as HTMLElement;
  const hintEl = root.querySelector('.hud-hint') as HTMLElement;
  const menuEl = root.querySelector('.hud-menu') as HTMLElement;

  let muted = false;
  let menuOpen = false;
  let hintTimer: number | null = null;

  const actMap: Record<string, () => void> = {
    mute: () => { muted = !muted; updateMuteIcon(); },
    reset: () => { window.dispatchEvent(new CustomEvent('polar:reset-camera')); },
    cv: () => {
      // El CV en PDF todavía no está publicado. Mostramos un placeholder
      // en vez de abrir un mailto (eso confundía con el botón de contacto).
      window.dispatchEvent(new CustomEvent('polar:cv-placeholder'));
    },
    gh: () => { window.open(PROFILE.github, '_blank', 'noopener'); },
    contact: () => { window.open(`mailto:${PROFILE.email}`, '_blank'); },
    'reset-save': () => {
      if (confirm('¿Borrar la partida guardada?')) {
        try { localStorage.removeItem('polar-islands-save-v1'); } catch { /* ignore */ }
        window.location.reload();
      }
    },
  };

  const updateMuteIcon = (): void => {
    const btn = root.querySelector<HTMLElement>('[data-act="mute"] .ico');
    if (btn) btn.textContent = muted ? '✕' : '♪';
  };

  root.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const btn = target.closest<HTMLElement>('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'menu') {
      toggleMenu();
      return;
    }
    actMap[act!]?.();
  });

  const toggleMenu = (): void => {
    menuOpen = !menuOpen;
    menuEl.classList.toggle('visible', menuOpen);
  };

  return {
    setMuted(m) { muted = m; updateMuteIcon(); },
    setZone(name, subtitle, visible) {
      zoneName.textContent = name;
      zoneSub.textContent = subtitle;
      zoneEl.classList.toggle('visible', visible);
    },
    showHint(text, autoMs = 3500) {
      hintEl.textContent = text;
      hintEl.classList.add('visible');
      if (hintTimer) clearTimeout(hintTimer);
      hintTimer = window.setTimeout(() => {
        hintEl.classList.remove('visible');
      }, autoMs);
    },
    showMenu() { menuOpen = false; toggleMenu(); },
    hideMenu() { if (menuOpen) toggleMenu(); },
    isMenuOpen() { return menuOpen; },
    destroy() { root.remove(); },
  };
}
