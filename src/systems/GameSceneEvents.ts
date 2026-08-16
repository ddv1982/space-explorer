export const GAME_SCENE_EVENTS = {
  enemyDeath: 'enemy-death',
  playerDeath: 'player-death',
  playerFatalHit: 'player-fatal-hit',
  levelComplete: 'level-complete',
  bossSpawn: 'boss-spawn',
  playerHit: 'player-hit',
  playerExhaust: 'player-exhaust',
  enemySpawnWarning: 'enemy-spawn-warning',
  wormholeTelegraph: 'wormhole-telegraph',
  eliteWave: 'elite-wave',
  bossDeath: 'boss-death',
  bossPhaseChange: 'boss-phase-change',
  bossGuardBreak: 'boss-guard-break',
  helperWingActivated: 'helper-wing-activated',
  helperWingDepleted: 'helper-wing-depleted',
  playerBulletTrail: 'player-bullet-trail',
  enemyBulletTrail: 'enemy-bullet-trail',
  picketOnline: 'picket-online',
} as const;

type GameSceneEventPayloads = {
  [GAME_SCENE_EVENTS.enemyDeath]: [score: number, x: number, y: number, isAce?: boolean];
  [GAME_SCENE_EVENTS.playerDeath]: [];
  [GAME_SCENE_EVENTS.playerFatalHit]: [];
  [GAME_SCENE_EVENTS.levelComplete]: [];
  [GAME_SCENE_EVENTS.bossSpawn]: [];
  [GAME_SCENE_EVENTS.playerHit]: [];
  [GAME_SCENE_EVENTS.playerExhaust]: [x: number, y: number, intensity: number];
  [GAME_SCENE_EVENTS.enemySpawnWarning]: [x: number];
  [GAME_SCENE_EVENTS.wormholeTelegraph]: [x: number, y: number];
  [GAME_SCENE_EVENTS.eliteWave]: [];
  [GAME_SCENE_EVENTS.bossDeath]: [score: number, x: number, y: number];
  [GAME_SCENE_EVENTS.bossPhaseChange]: [phase: number];
  [GAME_SCENE_EVENTS.bossGuardBreak]: [];
  [GAME_SCENE_EVENTS.helperWingActivated]: [helperCount: number];
  [GAME_SCENE_EVENTS.helperWingDepleted]: [];
  [GAME_SCENE_EVENTS.playerBulletTrail]: [x: number, y: number];
  [GAME_SCENE_EVENTS.enemyBulletTrail]: [x: number, y: number];
  [GAME_SCENE_EVENTS.picketOnline]: [];
};

export type GameSceneEventName = keyof GameSceneEventPayloads;

export type GameSceneEventHandler<Event extends GameSceneEventName> = (...args: GameSceneEventPayloads[Event]) => void;
