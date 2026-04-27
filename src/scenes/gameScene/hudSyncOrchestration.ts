import type { Player } from '../../entities/Player';
import type { HUD } from '../../systems/HUD';
import type { LevelManager } from '../../systems/LevelManager';
import type { ScoreManager } from '../../systems/ScoreManager';
import type { GameSceneFlowController } from './GameSceneFlowController';

interface HudSyncInput {
  hud: HUD;
  shields: number;
  lastHudShieldCount: number | null;
}

interface HudUpdateInput {
  hud: HUD;
  player: Pick<Player, 'hp' | 'maxHp' | 'shields'>;
  scoreManager: Pick<ScoreManager, 'getScore'>;
  levelManager: Pick<LevelManager, 'progress'>;
  flow: Pick<GameSceneFlowController, 'getRemainingLives'>;
  lastHudShieldCount: number | null;
}

export function syncHudShields(input: HudSyncInput): number | null {
  if (input.lastHudShieldCount === input.shields) {
    return input.lastHudShieldCount;
  }

  input.hud.updateShields(input.shields);
  return input.shields;
}

export function updateHud(input: HudUpdateInput): number | null {
  input.hud.update(
    input.player.hp,
    input.player.maxHp,
    input.scoreManager.getScore(),
    input.levelManager.progress,
    input.flow.getRemainingLives()
  );

  return syncHudShields({
    hud: input.hud,
    shields: input.player.shields,
    lastHudShieldCount: input.lastHudShieldCount,
  });
}
