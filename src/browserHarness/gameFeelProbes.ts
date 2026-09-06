import Phaser from 'phaser';
import type { PlayerFatalResult, PlayerHitResult } from '@/systems/PlayerDamage';
import { GAME_SCENE_EVENTS } from '@/systems/GameplayFlow';
import { GameFeelRecording, type GameFeelEventDetail, type GameFeelOptions } from './gameFeelRecording';
import { bindGameFeelRuntime, captureGameFeelOccupancy } from './gameFeelRuntime';
import { captureGameFeelEnvironment } from './gameFeelEnvironment';

const CONTROL_CODES = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'Space',
  'Escape',
]);

class GameFeelProbe {
  private readonly recording = new GameFeelRecording(() => this.detach());
  private startedWall = 0;
  private nextSegmentId = 0;
  private segmentId: number | null = null;
  private scene: Phaser.Scene | null = null;
  private sample: ReturnType<typeof bindGameFeelRuntime> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private lastOccupancyWall = -Infinity;

  constructor(private readonly game: Phaser.Game) {
    game.events.once(Phaser.Core.Events.DESTROY, this.onDestroy);
  }

  start(options: GameFeelOptions) {
    if (this.destroyed) throw new Error('Cannot record a destroyed game');
    if (!this.recording.start(options, new Date().toISOString())) return this.read();
    this.startedWall = performance.now();
    this.nextSegmentId = 0;
    this.lastOccupancyWall = -Infinity;
    try {
      this.recording.environment(captureGameFeelEnvironment(this.game));
    } catch {
      this.recording.stop('adapter-unavailable', this.wall());
      return this.read();
    }
    this.timer = setTimeout(() => this.recording.stop('duration-cap', this.wall()), this.recording.durationLimit);
    this.game.events.on(Phaser.Core.Events.POST_STEP, this.onFrame);
    window.addEventListener('keydown', this.onKey, true);
    window.addEventListener('keyup', this.onKey, true);
    window.addEventListener('pointerdown', this.onPointer, true);
    window.addEventListener('pointermove', this.onPointer, true);
    window.addEventListener('pointerup', this.onPointer, true);
    window.addEventListener('pointercancel', this.onPointer, true);
    window.addEventListener('focus', this.onFocus);
    window.addEventListener('blur', this.onFocus);
    document.addEventListener('visibilitychange', this.onFocus);
    this.onFocus();
    this.discoverScene();
    return this.read();
  }

  stop() {
    this.recording.stop('requested', this.wall());
    return this.read();
  }
  read() {
    return this.recording.read();
  }
  clear() {
    this.recording.clear();
  }
  private wall() {
    return Math.max(0, performance.now() - this.startedWall);
  }
  private event(detail: GameFeelEventDetail) {
    this.recording.event({ ...detail, wallMs: this.wall(), segmentId: this.segmentId });
  }

  private readonly onKey = (event: KeyboardEvent): void => {
    if (!CONTROL_CODES.has(event.code)) return;
    this.event({
      kind: 'key',
      action: event.type === 'keydown' ? 'down' : 'up',
      code: event.code,
      repeat: event.repeat,
    });
  };

  private readonly onPointer = (event: PointerEvent): void => {
    if (event.target !== this.game.canvas) return;
    const pointerType =
      event.pointerType === 'mouse' || event.pointerType === 'touch' || event.pointerType === 'pen'
        ? event.pointerType
        : 'unknown';
    const action =
      event.type === 'pointerdown'
        ? 'down'
        : event.type === 'pointerup'
          ? 'up'
          : event.type === 'pointercancel'
            ? 'cancel'
            : 'move';
    this.event({
      kind: 'pointer',
      action,
      pointerId: event.pointerId,
      pointerType,
      x: event.clientX,
      y: event.clientY,
      buttons: event.buttons,
    });
  };

  private readonly onFocus = (event?: Event): void => {
    this.event({
      kind: 'focus',
      delivered:
        event?.type === 'focus' || event?.type === 'blur' || event?.type === 'visibilitychange'
          ? event.type
          : 'initial',
      trusted: event?.isTrusted ?? false,
      focused: document.hasFocus(),
      visible: document.visibilityState === 'visible',
    });
  };
  private readonly onHit = (result: PlayerHitResult): void => {
    this.event({ kind: 'player-hit', cause: result.source, outcome: result.outcome, hullDamage: result.hullDamage });
  };
  private readonly onDeath = (result: PlayerFatalResult): void => {
    this.event({ kind: 'player-death', cause: result.source, outcome: result.outcome, hullDamage: result.hullDamage });
  };
  private readonly onEnemyWarning = (): void => {
    this.event({ kind: 'enemy-spawn-warning' });
  };
  private readonly onWormhole = (): void => {
    this.event({ kind: 'wormhole-telegraph' });
  };
  private readonly onLevelComplete = (): void => {
    this.event({ kind: 'level-complete' });
  };
  private readonly onShutdown = (): void => {
    this.leaveScene('shutdown');
  };
  private readonly onSceneDestroy = (): void => {
    this.leaveScene('destroy');
  };
  private readonly onDestroy = (): void => {
    this.destroyed = true;
    this.recording.stop('game-destroyed', this.wall());
    this.detach();
  };

  private leaveScene(action: 'shutdown' | 'destroy'): void {
    if (this.scene) this.event({ kind: 'scene', action, scene: this.scene.sys.settings.key.slice(0, 80) });
    this.detachScene();
  }

  private discoverScene(): void {
    if (!this.recording.active) return;
    const active = this.game.scene.getScenes(true)[0];
    if (!active || active === this.scene) return;
    this.detachScene();
    this.scene = active;
    this.segmentId = ++this.nextSegmentId;
    active.events.on(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown);
    active.events.on(Phaser.Scenes.Events.DESTROY, this.onSceneDestroy);
    this.event({ kind: 'scene', action: 'entered', scene: active.sys.settings.key.slice(0, 80) });
    if (!this.recording.active || active.sys.settings.key !== 'Game') return;
    try {
      this.sample = bindGameFeelRuntime(active);
      active.events.on(GAME_SCENE_EVENTS.enemySpawnWarning, this.onEnemyWarning);
      active.events.on(GAME_SCENE_EVENTS.wormholeTelegraph, this.onWormhole);
      active.events.on(GAME_SCENE_EVENTS.playerHit, this.onHit);
      active.events.on(GAME_SCENE_EVENTS.playerDeath, this.onDeath);
      active.events.on(GAME_SCENE_EVENTS.levelComplete, this.onLevelComplete);
    } catch {
      this.recording.stop('adapter-unavailable', this.wall());
    }
  }

  private readonly onFrame = (_time: number, deltaMs: number): void => {
    const began = performance.now();
    if (!this.recording.checkDuration(this.wall())) return;
    this.discoverScene();
    if (!this.sample || this.segmentId === null) return;
    try {
      const frame = this.sample(this.wall(), this.segmentId, deltaMs);
      this.recording.frame(frame);
      if (this.recording.active && this.scene && frame.wallMs - this.lastOccupancyWall >= 250) {
        this.lastOccupancyWall = frame.wallMs;
        this.event(captureGameFeelOccupancy(this.scene));
      }
      frame.captureCostMs = performance.now() - began;
    } catch {
      this.recording.stop('adapter-unavailable', this.wall());
    }
  };

  private detachScene(): void {
    this.scene?.events.off(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown);
    this.scene?.events.off(Phaser.Scenes.Events.DESTROY, this.onSceneDestroy);
    this.scene?.events.off(GAME_SCENE_EVENTS.enemySpawnWarning, this.onEnemyWarning);
    this.scene?.events.off(GAME_SCENE_EVENTS.wormholeTelegraph, this.onWormhole);
    this.scene?.events.off(GAME_SCENE_EVENTS.playerHit, this.onHit);
    this.scene?.events.off(GAME_SCENE_EVENTS.playerDeath, this.onDeath);
    this.scene?.events.off(GAME_SCENE_EVENTS.levelComplete, this.onLevelComplete);
    this.scene = null;
    this.segmentId = null;
    this.sample = null;
  }

  private detach(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.detachScene();
    this.game.events.off(Phaser.Core.Events.POST_STEP, this.onFrame);
    window.removeEventListener('keydown', this.onKey, true);
    window.removeEventListener('keyup', this.onKey, true);
    window.removeEventListener('pointerdown', this.onPointer, true);
    window.removeEventListener('pointermove', this.onPointer, true);
    window.removeEventListener('pointerup', this.onPointer, true);
    window.removeEventListener('pointercancel', this.onPointer, true);
    window.removeEventListener('focus', this.onFocus);
    window.removeEventListener('blur', this.onFocus);
    document.removeEventListener('visibilitychange', this.onFocus);
  }
}

export function createGameFeelProbes(game: Phaser.Game) {
  const probe = new GameFeelProbe(game);
  return {
    start: (options: GameFeelOptions) => probe.start(options),
    stop: () => probe.stop(),
    read: () => probe.read(),
    clear: () => probe.clear(),
  };
}
