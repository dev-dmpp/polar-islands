import './styles/hud.css';
import { Game } from './core/Game';

function showFatal(err: unknown): void {
  console.error(err);
  const app = document.getElementById('app')!;
  const pre = document.createElement('pre');
  pre.style.cssText = 'color:#ff6b6b; padding:20px; font-family:monospace;';
  pre.textContent = `Error fatal al iniciar:\n${err instanceof Error ? err.message : String(err)}\n\n${err instanceof Error ? err.stack : ''}`;
  app.appendChild(pre);
}

window.addEventListener('error', (e) => showFatal(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => showFatal(e.reason));

const app = document.getElementById('app')!;
const hud = document.getElementById('hud')!;

const game = new Game();
game.start(app, hud).catch(showFatal);
