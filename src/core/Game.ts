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

    // Initial camera snap behind the player
    this.cameraCtl.camera.position.set(
      this.player.position.x,
      WORLD_CAM_Y,
      this.player.position.z + WORLD_CAM_Z,
    );

    // Show landing. The world's first paint is already done (sky + island
    // visible behind the landing overlay). Mark ready immediately; the
    // remaining assets load in the background.
    this.landing.show(() => this.onEnter());
    this.landing.setReady(true);

    // Listen for HUD button events
    window.addEventListener('polar:reset-camera', () => this.resetCamera());

    // Dialog advance via click
    this.renderer.domElement.addEventListener('click', () => {
      if (this.inDialogPlaza) {
        this.dialog.advance();
      }
    });

    // Save loop
    setInterval(() => {
      this.save.playerX = this.player.position.x;
      this.save.playerY = 0;
      this.save.playerZ = this.player.position.z;
      this.save.playerRotY = this.player.rotY;
      persistSave(this.save);
    }, 5000);

    this.running = true;
    this.clock.start();
    this.loop();
  }

  private onEnter(): void {
    if (this.worldActive) return;
    this.worldActive = true;
    this.landing.hide();
    this.hud.showHint('Click en cualquier punto para moverte · E cerca de una plaza para conversar', 4500);
  }

  private onResize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.cameraCtl.setAspect(window.innerWidth / window.innerHeight);
  }

  private resetCamera(): void {
    // Re-snap camera to behind the player.
    this.cameraCtl.camera.position.set(
      this.player.position.x,
      WORLD_CAM_Y,
      this.player.position.z + WORLD_CAM_Z,
    );
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

    // Click to move
    if (this.worldActive && !this.inDialogPlaza) {
      const click = this.input.popClick();
      if (click && !click.right) {
        // Raycast to ground plane (y = 0)
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
      if (this.input.isAdvancing() && !this.inDialogPlaza) {
        const nearest = this.getNearestPlaza();
        if (nearest) this.startDialog(nearest);
      }
    }

    // ----- Update world -----
    this.player.update(dt, (x, z) => this.island.clamp(x, z));

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

// Camera follow offset (matches the FollowCamera zoom defaults; used to snap
// the camera on first frame and on reset).
const WORLD_CAM_Y = 22;
const WORLD_CAM_Z = 18;
