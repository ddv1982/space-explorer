import type { createGameFeelProbes } from './gameFeelProbes';

import type { BrowserHarnessSnapshot } from './snapshot';
import type { createShipyardProbes } from './shipyardProbes';
import type { createProceduralBackgroundProbes } from './proceduralBackgroundProbes';

export interface BrowserHarnessApi
  extends ReturnType<typeof createShipyardProbes>, ReturnType<typeof createProceduralBackgroundProbes> {
  gameFeel: ReturnType<typeof createGameFeelProbes>;
  destroyGame: () => void;
  snapshot: () => BrowserHarnessSnapshot;
  waitForRender: () => Promise<void>;
  probeArcadeOverlap: () => Promise<boolean>;
  probeAcceptedPlayerDamage: (amount?: number) => { beforeHp: number; afterHp: number; damage: number };
  suspendAudioContextForPolicyTest: () => Promise<void>;
  showPlanetIntermission: (level: number) => Promise<{ level: number; planetName: string }>;
  route: (key: string) => Promise<void>;
}
