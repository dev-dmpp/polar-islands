/**
 * Game singleton — orchestrates the world, player, camera, input, HUD and
 * dialog. Phase F0 wires up the minimum to get the landing screen and
 * the world visible and walkable. Phases F1+ add audio, dialog, etc.
 */
import * as THREE from 'three';
import { createRenderer, addLights } from '../render/renderer';
import { buildSky } from '../render/skybox';
import { FollowCamera } from '../render/camera';
import { buildIsland, type Island } from '../world/island';
import { Player } from '../entities/player';
import { InputManager } from './input';
import { createAudio, type AudioApi } from './audio';
import { loadSave, loadSettings, persistSave, type SaveData, type Settings } from './gameState';
import { createHud, type HudApi } from '../ui/hud';
import { createLanding, type LandingApi } from '../ui/landing';
import { DialogBubble } from '../ui/dialog';
import { PLAZAS, CONTACT_NPC } from '../content/cv';

interface PlazaInfo {
  id: string;
  name: string;
  subtitle: string;
  position: THREE.Vector3;
  script: string[];
}

export class Game {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private cameraCtl!: FollowCamera;
  private island!: Island;
  private player!: Player;
  private input!: InputManager;
  private audio!: AudioApi;
  private save!: SaveData;
  private settings!: Settings;
  private hud!: HudApi;
  private landing!: LandingApi;
  private dialog!: DialogBubble;
  private clock = new THREE.Clock();
  private running = false;
  private elapsed = 0;

  /** Map plaza id → info. */
  private plazas: PlazaInfo[] = [];
  /** Whether WASD was active on the previous frame. Used to detect
   *  the "key released" edge and clear the target then. */
  private wasdActive = false;
  /** Plaza id currently in range (for the HUD label). */
  private activePlaza: string | null = null;
  /** Plaza currently in dialog. */
  private inDialogPlaza: string | null = null;
  /** Whether the player has been placed in the world (post-landing). */
  private worldActive = false;

  async start(container: HTMLElement, hudContainer: HTMLElement): Promise<void> {
    this.save = loadSave();
    this.settings = loadSettings();
    this.audio = createAudio(this.settings);

    // Renderer
    this.renderer = createRenderer(container);
    this.scene = new THREE.Scene();
    addLights(this.scene);
    buildSky(this.scene);
    this.cameraCtl = new FollowCamera();
    this.cameraCtl.setAspect(window.innerWidth / window.innerHeight);

    // World
    this.island = buildIsland(this.scene);
    // Outlines + procedural geometry sometimes produce wrong bounding
    // spheres, which causes Three.js to frustum-cull entire islands. The
    // scene is small enough that culling is not worth the risk; disable
    // it once at scene setup.
    this.scene.traverse((o) => { o.frustumCulled = false; });
    this.plazas = [
      ...PLAZAS.map(p => ({
        id: p.id,
        name: p.name,
        subtitle: p.subtitle,
        position: new THREE.Vector3(p.position.x, 0, p.position.z),
        script: p.script,
      })),
      {
        id: CONTACT_NPC.id,
        name: CONTACT_NPC.name,
        subtitle: CONTACT_NPC.subtitle,
        position: new THREE.Vector3(CONTACT_NPC.position.x, 0, CONTACT_NPC.position.z),
        script: CONTACT_NPC.script,
      },
    ];

    // Player
    this.player = new Player();
    this.player.setPosition(this.save.playerX, 0, this.save.playerZ || 8);
    this.player.setRotation(this.save.playerRotY || 0);
    this.scene.add(this.player.group);

    // Input
    this.input = new InputManager(this.renderer.domElement, () => this.onResize());

    // UI
    this.hud = createHud(hudContainer);
    this.landing = createLanding(hudContainer);
    this.dialog = new DialogBubble(hudContainer);

    // Initial camera snap.
    const dist = 70;
    const tilt = 0.50;
    this.cameraCtl.camera.position.set(
      this.player.position.x,
      dist * Math.sin(tilt),
      this.player.position.z + dist * Math.cos(tilt),
    );
    // AC-style: look at the player, so it stays centered.
    this.cameraCtl.camera.lookAt(this.player.position.x, 0, this.player.position.z);

    // Show landing. The world's first paint is already done (sky + island
    // visible behind the landing overlay). Mark ready immediately; the
    // remaining assets load in the background.
    this.landing.show(() => this.onEnter());
    this.landing.setReady(true);

    // Listen for HUD button events
    window.addEventListener('polar:reset-camera', () => this.resetCamera());
    window.addEventListener('polar:cv-placeholder', () => {
      this.hud.showHint('📄 El CV en PDF aún no está publicado. Vuelve pronto o escríbeme por Contacto.', 4500);
    });

    // NOTE: Dialog advance on click is handled in the main loop
    // (popClick() is consumed there), so the canvas listener was
    // removed. The main loop's unified click block also routes
    // clicks to dialog.advance() when one is open.

    // Save loop
    setInterval(() => {
      this.save.playerX = this.player.position.x;
      this.save.playerY = 0;
      this.save.playerZ = this.player.position.z;
      this.save.playerRotY = this.player.rotY;
      persistSave(this.save);
    }, 5000);
    // Mark running and expose for debugging.
    this.running = true;
    this.clock.start();
    (window as unknown as { __polarGame: Game }).__polarGame = this;
    this.loop();
  }

  private onEnter(): void {
    if (this.worldActive) return;
    this.worldActive = true;
    this.landing.hide();
    this.hud.showHint('Click o WASD para moverte · E cerca de una plaza para conversar · rueda para zoom', 4500);
  }

  private onResize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.cameraCtl.setAspect(window.innerWidth / window.innerHeight);
  }

  private resetCamera(): void {
    const dist = 70;
    const tilt = 0.50;
    this.cameraCtl.camera.position.set(
      this.player.position.x,
      dist * Math.sin(tilt),
      this.player.position.z + dist * Math.cos(tilt),
    );
    // AC-style: look at the player, so it stays centered.
    this.cameraCtl.camera.lookAt(this.player.position.x, 0, this.player.position.z);
  }

  private getNearestPlaza(): PlazaInfo | null {
    const px = this.player.position.x;
    const pz = this.player.position.z;
    let best: PlazaInfo | null = null;
    let bestDist = Infinity;
    for (const p of this.plazas) {
      const d = Math.hypot(p.position.x - px, p.position.z - pz);
      if (d < 4.0 && d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return best;
  }

  private startDialog(plaza: PlazaInfo): void {
    this.inDialogPlaza = plaza.id;
    this.dialog.show(plaza.name, plaza.subtitle, plaza.script, {
      onClose: () => {
        this.inDialogPlaza = null;
        // Mark as visited
        if (!this.save.visited.includes(plaza.id)) {
          this.save.visited.push(plaza.id);
          persistSave(this.save);
        }
      },
    });
  }

  private loop = (): void => {
    if (!this.running) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed += dt;

    // ----- Input processing -----
    const wheel = this.input.consumeWheel();
    if (wheel !== 0) {
      this.cameraCtl.setZoom(this.cameraCtl.getZoom() + wheel * 0.02);
    }

    // Unified movement: WASD/arrows take priority over click.
    //
    // Key insight:
    //   - Click target must PERSIST (don't clear each frame, that
    //     kills click-to-move because popClick returns null next frame).
    //   - WASD target is RECOMPUTED each frame the key is held, so it
    //     naturally moves with the player. The only "edge" we must
    //     handle is: key RELEASED → player must stop. We do that by
    //     clearing the target the frame WASD goes from active→inactive.
    if (this.worldActive && this.inDialogPlaza) {
      const click = this.input.popClick();
      if (click) this.dialog.advance();
    } else if (this.worldActive) {
      const axis = this.input.getMoveAxis();
      const wasdNow = axis.dx !== 0 || axis.dz !== 0;
      if (wasdNow) {
        // WASD held: target far ahead, recomputed every frame so it
        // tracks the player's current position.
        this.player.setTarget(
          this.player.position.x + axis.dx * 100,
          this.player.position.z + axis.dz * 100,
        );
        this.wasdActive = true;
      } else {
        // WASD not held this frame.
        if (this.wasdActive) {
          // Just released: clear the lingering target so the player stops.
          this.player.clearTarget();
          this.wasdActive = false;
        } else {
          // WASD was already inactive (or never pressed). Consume any
          // pending click as a new target. Do NOT clear — the player
          // may still be walking to a previous click destination.
          const click = this.input.popClick();
          if (click && !click.right) {
            const ndc = new THREE.Vector2();
            const rect = this.renderer.domElement.getBoundingClientRect();
            ndc.x = ((click.x - rect.left) / rect.width) * 2 - 1;
            ndc.y = -((click.y - rect.top) / rect.height) * 2 + 1;
            const ray = new THREE.Raycaster();
            ray.setFromCamera(ndc, this.cameraCtl.camera);
            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
            const hit = new THREE.Vector3();
            if (ray.ray.intersectPlane(plane, hit) && this.island.isWalkable(hit.x, hit.z)) {
              this.player.setTarget(hit.x, hit.z);
            }
          }
        }
      }
    }

    // Keys
    if (this.worldActive) {
      if (this.input.isEscapeDown()) {
        if (this.inDialogPlaza) {
          this.dialog.hide();
          this.inDialogPlaza = null;
        } else {
          this.hud.showMenu();
        }
      }
      if (this.input.isMuteDown()) {
        this.settings.audioOn = !this.settings.audioOn;
        this.audio.setMuted(!this.settings.audioOn);
        this.hud.setMuted(!this.settings.audioOn);
      }
      if (this.input.isResetDown()) this.resetCamera();
      // Advance dialog with E / Space / Enter — works whether or not
      // a dialog is open. If not in a dialog, E/Space opens one with
      // the nearest plaza.
      if (this.input.consumeAdvanceEdge()) {
        if (this.inDialogPlaza) {
          this.dialog.advance();
        } else {
          const nearest = this.getNearestPlaza();
          if (nearest) this.startDialog(nearest);
        }
      }
    }

    // ----- Update world -----
    this.player.update(dt, (x, z) => this.island.clamp(x, z));
    this.island.update(this.elapsed, { x: this.player.position.x, z: this.player.position.z });

    // Camera follow
    this.cameraCtl.update(dt, this.player.position, this.player.rotY);

    // Plaza proximity label
    if (!this.inDialogPlaza) {
      const nearest = this.getNearestPlaza();
      if (nearest) {
        if (this.activePlaza !== nearest.id) {
          this.activePlaza = nearest.id;
        }
        this.hud.setZone(nearest.name, nearest.subtitle, true);
      } else {
        if (this.activePlaza !== null) this.activePlaza = null;
        this.hud.setZone('', '', false);
      }
    }

    // Render
    this.renderer.render(this.scene, this.cameraCtl.camera);
    requestAnimationFrame(this.loop);
  };
}
