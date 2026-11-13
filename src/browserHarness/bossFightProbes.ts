import Phaser from 'phaser';
import type { Boss } from '@/entities/enemies/Boss';
import { FLIGHT_CONFIG } from '@/config/flightConfig';
import { stepFlight } from '@/systems/flight/flightModel';
import type { Player } from '@/entities/Player';
import type { EnemyPool } from '@/systems/EnemyPool';
import { GAME_SCENE_EVENTS } from '@/systems/GameSceneEvents';
import type { DamageSource, PlayerFatalResult, PlayerHitResult } from '@/systems/PlayerDamage';

/** What one boss fight cost the player; times are gameplay-clock seconds (pause and hit-stop excluded). */
export interface BossFightReport {
  spawned: boolean;
  killed: boolean;
  seconds: number;
  fastKillBonus: number;
  hullHits: number;
  shieldHits: number;
  deaths: number;
  /** Hits (hull and shield) by what dealt them, to see what the fight threatens with. */
  hitsBySource: Partial<Record<DamageSource, number>>;
  phases: number[];
  /** Most enemy shots alive at once, against the enemy-bullet pool's 80. */
  peakShots: number;
  bossHp: number;
  bossMaxHp: number;
}

interface BossFightScene extends Phaser.Scene {
  player: Player;
  enemyPool: EnemyPool;
  levelManager: { distance: number; getLevelConfig(): { levelDistance: number; bossTriggerProgress: number } };
  gameplayClock: { now: number; delta: number };
  boss: Boss | null;
  inputManager: {
    cursors: Record<'left' | 'right' | 'up' | 'down', Phaser.Input.Keyboard.Key>;
  };
}

/** The bot's resting line, as a share of the viewport height. */
const BOT_HOME_Y = 0.82;
/** Half the ship's 24x32 hitbox plus half a shot's 8x8 one, with margin for overshooting a lane. */
const BOT_HIT_HALF_WIDTH = 30;
const BOT_HIT_HALF_HEIGHT = 30;
/** How far ahead the bot looks, in seconds. */
const BOT_LOOKAHEAD_S = 0.8;
/** The bot picks among fixed lanes this far apart, within reach of where it is now. */
const BOT_LANE_SPACING = 40;
const BOT_LANE_REACH = 400;
/** A new lane must beat the current one by this much, so the bot does not dither between equals. */
const BOT_SWITCH_MARGIN = 40;
/** Inside this distance, and slower than the settle speed, the bot lets go and lets drag stop it. */
const BOT_DEADBAND = 8;
const BOT_SETTLE_SPEED = 60;
const BOT_STEP_MS = 1000 / 60;
/** Player shots fly at 600 px/s (`BULLET_SPEED`); the bot leads a moving boss by their flight time. */
const BOT_SHOT_SPEED = 600;

interface BotMemory {
  goalX: number | null;
  bossX: number | null;
}

/** Which way to press to stop on `goal`: toward it, or against the motion once it would overshoot. */
function botKey(position: number, velocity: number, goal: number): -1 | 0 | 1 {
  const offset = goal - position;
  if (Math.abs(offset) < BOT_DEADBAND && Math.abs(velocity) < BOT_SETTLE_SPEED) return 0;
  // A frame of travel on top of the braking distance, since the keys act a frame late.
  const brakingDistance =
    (velocity * velocity) / (2 * FLIGHT_CONFIG.acceleration) + (Math.abs(velocity) * BOT_STEP_MS) / 1000;
  if (Math.sign(velocity) === Math.sign(offset) && brakingDistance >= Math.abs(offset)) {
    return velocity > 0 ? -1 : 1;
  }
  return offset > 0 ? 1 : -1;
}

/** The ship's x every frame for the lookahead, if the bot steers for `goal` with the real flight model. */
function predictPath(x: number, vx: number, goal: number): number[] {
  const path: number[] = [];
  let state = { vx, vy: 0, bank: 0 };
  for (let elapsed = 0; elapsed <= BOT_LOOKAHEAD_S * 1000; elapsed += BOT_STEP_MS) {
    path.push(x);
    const key = botKey(x, state.vx, goal);
    state = stepFlight(state, key * FLIGHT_CONFIG.maxSpeed, 0, BOT_STEP_MS, FLIGHT_CONFIG);
    x += (state.vx * BOT_STEP_MS) / 1000;
  }
  return path;
}

function getGameScene(game: Phaser.Game): BossFightScene {
  const scene = game.scene.getScene('Game') as BossFightScene | null;
  if (!scene?.sys.isActive() || !scene.levelManager) throw new Error('Boss fight probes need active gameplay');
  return scene;
}

/**
 * The measurement bot's one rule: stay on a low line where its shots will meet the boss, but fly to the
 * nearby lane where the fewest shots will touch the ship on the way there or once there (sooner shots
 * count more).
 * It flies with the real flight model and reads only positions and velocities, so the same bot can be
 * replayed against any boss engine.
 */
function steerBot(scene: BossFightScene, memory: BotMemory): void {
  const { player, enemyPool, inputManager } = scene;
  const keys = inputManager.cursors;
  for (const key of Object.values(keys)) key.isDown = false;
  if (!player.active) return;

  const width = scene.scale.width;
  const boss = scene.boss?.active ? scene.boss : null;
  const bossVx =
    boss && memory.bossX !== null && scene.gameplayClock.delta > 0
      ? ((boss.x - memory.bossX) * 1000) / scene.gameplayClock.delta
      : 0;
  memory.bossX = boss?.x ?? null;
  const aimX = boss ? boss.x + (bossVx * (player.y - boss.y)) / BOT_SHOT_SPEED : width / 2;
  const velocity = (player.body as Phaser.Physics.Arcade.Body).velocity;
  const shots: Array<{ x: number; y: number; vx: number; vy: number }> = [];
  for (const child of enemyPool.getEnemyBulletGroup().getChildren()) {
    const bullet = child as Phaser.Physics.Arcade.Sprite;
    const body = bullet.body as Phaser.Physics.Arcade.Body | null;
    if (bullet.active && body) shots.push({ x: bullet.x, y: bullet.y, vx: body.velocity.x, vy: body.velocity.y });
  }

  const laneDanger = (laneX: number): number => {
    const path = predictPath(player.x, velocity.x, laneX);
    let danger = 0;
    for (const shot of shots) {
      // The first frame this shot would touch the ship (with a margin), sooner hits counting more.
      for (let frame = 0; frame < path.length; frame++) {
        const t = (frame * BOT_STEP_MS) / 1000;
        const dx = shot.x + shot.vx * t - path[frame]!;
        const dy = shot.y + shot.vy * t - player.y;
        if (Math.abs(dx) < BOT_HIT_HALF_WIDTH && Math.abs(dy) < BOT_HIT_HALF_HEIGHT) {
          danger += 1 / (t + 0.15);
          break;
        }
      }
    }
    return danger;
  };
  const laneScore = (laneX: number): number =>
    laneDanger(laneX) * 1000 + Math.abs(laneX - aimX) + Math.abs(laneX - player.x) * 0.1;

  const minX = width * 0.05;
  const maxX = width * 0.95;
  const aimLane = Phaser.Math.Clamp(aimX, minX, maxX);
  let goalX = aimLane;
  if (laneDanger(aimLane) > 0) {
    // Dodge: keep the current dodge lane unless another one is clearly better.
    goalX = Phaser.Math.Clamp(memory.goalX ?? player.x, minX, maxX);
    let bestScore = laneScore(goalX) - BOT_SWITCH_MARGIN;
    const firstLane = Math.ceil((player.x - BOT_LANE_REACH - minX) / BOT_LANE_SPACING);
    for (let lane = Math.max(0, firstLane); ; lane++) {
      const laneX = minX + lane * BOT_LANE_SPACING;
      if (laneX > Math.min(maxX, player.x + BOT_LANE_REACH)) break;
      const score = laneScore(laneX);
      if (score < bestScore) {
        bestScore = score;
        goalX = laneX;
      }
    }
  }
  memory.goalX = goalX;

  const horizontal = botKey(player.x, velocity.x, goalX);
  const vertical = botKey(player.y, velocity.y, scene.scale.height * BOT_HOME_Y);
  keys.left.isDown = horizontal < 0;
  keys.right.isDown = horizontal > 0;
  // Holding the line matters less than dodging: vertical keys would slow sideways thrust on diagonals.
  keys.up.isDown = horizontal === 0 && vertical < 0;
  keys.down.isDown = horizontal === 0 && vertical > 0;
}

/**
 * Stages a level's boss fight directly and records what it cost, for `scripts/balance/bossFights.ts`
 * and the boss e2e. `invulnerable` keeps the ship alive (hits still count as hull hits) so time to
 * kill can be measured on fights the bot cannot survive.
 */
export function createBossFightProbes(game: Phaser.Game) {
  let report: BossFightReport | null = null;
  let detach: (() => void) | null = null;

  return {
    startBossFight: (options: { bot?: boolean; invulnerable?: boolean } = {}): void => {
      detach?.();
      const scene = getGameScene(game);
      const fight: BossFightReport = {
        spawned: false,
        killed: false,
        seconds: 0,
        fastKillBonus: 0,
        hullHits: 0,
        shieldHits: 0,
        deaths: 0,
        hitsBySource: {},
        phases: [],
        peakShots: 0,
        bossHp: 0,
        bossMaxHp: 0,
      };
      report = fight;
      let spawnedAt = 0;
      const botMemory: BotMemory = { goalX: null, bossX: null };
      if (options.invulnerable) scene.player.shields = 0;

      const onSpawn = (): void => {
        fight.spawned = true;
        spawnedAt = scene.gameplayClock.now;
      };
      const onHit = (result: PlayerHitResult): void => {
        fight.hitsBySource[result.source] = (fight.hitsBySource[result.source] ?? 0) + 1;
        if (result.outcome === 'absorbed') fight.shieldHits += 1;
        else fight.hullHits += 1;
        if (options.invulnerable) scene.player.hp = scene.player.maxHp;
      };
      const onDeath = (result: PlayerFatalResult): void => {
        fight.hitsBySource[result.source] = (fight.hitsBySource[result.source] ?? 0) + 1;
        fight.deaths += 1;
      };
      const onPhase = (phase: number): void => {
        fight.phases.push(phase);
      };
      const onBossDeath = (_score: number, _x: number, _y: number, fastKillBonus: number): void => {
        fight.killed = true;
        fight.fastKillBonus = fastKillBonus;
        fight.seconds = (scene.gameplayClock.now - spawnedAt) / 1000;
      };
      const onUpdate = (): void => {
        const boss = scene.boss;
        if (boss?.active) {
          fight.bossHp = boss.hp;
          fight.bossMaxHp = boss.maxHp;
        }
        fight.peakShots = Math.max(fight.peakShots, scene.enemyPool.getEnemyBulletGroup().countActive(true));
        if (fight.spawned && !fight.killed) fight.seconds = (scene.gameplayClock.now - spawnedAt) / 1000;
        if (options.bot) steerBot(scene, botMemory);
      };
      const bindings: Array<[string, (...args: never[]) => void]> = [
        [GAME_SCENE_EVENTS.bossSpawn, onSpawn],
        [GAME_SCENE_EVENTS.playerHit, onHit],
        [GAME_SCENE_EVENTS.playerDeath, onDeath],
        [GAME_SCENE_EVENTS.bossPhaseChange, onPhase],
        [GAME_SCENE_EVENTS.bossDeath, onBossDeath],
        [Phaser.Scenes.Events.UPDATE, onUpdate],
      ];
      for (const [event, handler] of bindings) scene.events.on(event, handler);
      detach = () => {
        for (const [event, handler] of bindings) scene.events.off(event, handler);
        detach = null;
      };
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => detach?.());

      // Skip the sector: the next frame reaches the boss trigger and the normal boss entry runs.
      const level = scene.levelManager.getLevelConfig();
      scene.levelManager.distance = level.levelDistance * level.bossTriggerProgress;
    },
    readBossFight: (): BossFightReport | null =>
      report ? { ...report, hitsBySource: { ...report.hitsBySource }, phases: [...report.phases] } : null,
    /** Deals damage to the live boss through its normal damage path (shields still block). */
    damageBoss: (amount: number): boolean => {
      const scene = getGameScene(game);
      const boss = scene.boss;
      if (!boss?.active) return false;
      boss.takeDamage(amount);
      return true;
    },
  };
}
