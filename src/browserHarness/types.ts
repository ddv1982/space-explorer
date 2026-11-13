import type { createGameFeelProbes } from './gameFeelProbes';
import type { createRenderStatsProbe } from './renderStatsProbe';

import type { BrowserHarnessSnapshot } from './snapshot';
import type { createShipyardProbes } from './shipyardProbes';
import type { createProceduralBackgroundProbes } from './proceduralBackgroundProbes';
import type { createBossFightProbes } from './bossFightProbes';

export interface BrowserHarnessApi
  extends
    ReturnType<typeof createShipyardProbes>,
    ReturnType<typeof createProceduralBackgroundProbes>,
    ReturnType<typeof createBossFightProbes> {
  gameFeel: ReturnType<typeof createGameFeelProbes>;
  renderStats: ReturnType<typeof createRenderStatsProbe>;
  destroyGame: () => void;
  snapshot: () => BrowserHarnessSnapshot;
  waitForRender: () => Promise<void>;
  probeArcadeOverlap: () => Promise<boolean>;
  probeAcceptedPlayerDamage: (amount?: number) => { beforeHp: number; afterHp: number; damage: number };
  suspendAudioContextForPolicyTest: () => Promise<void>;
  showPlanetIntermission: (level: number) => Promise<{ level: number; planetName: string }>;
  route: (key: string) => Promise<void>;
}
