import type Phaser from 'phaser';
import { createCombatPolishProbes } from './browserHarness/combatPolishProbes';
import { createGameFeelProbes } from './browserHarness/gameFeelProbes';
import { createShipyardProbes } from './browserHarness/shipyardProbes';
import { createEffectsProbes } from './browserHarness/effectsProbes';
import { createProceduralBackgroundProbes } from './browserHarness/proceduralBackgroundProbes';

import { createBrowserHarnessGameplayProbes } from './browserHarness/gameplayProbes';
import { createBrowserHarnessNavigation } from './browserHarness/navigation';
import {
  BrowserHarnessPerformanceProbes,
  type BrowserHarnessAudioContextManager,
} from './browserHarness/performanceProbes';
import { createBrowserHarnessSnapshot } from './browserHarness/snapshot';
import type { BrowserHarnessApi } from './browserHarness/types';
import { BrowserHarnessVisualPilot } from './browserHarness/visualPilot';
import { audioManager } from './systems/AudioManager';

export type { BrowserHarnessSnapshot } from './browserHarness/snapshot';
export type * from './browserHarness/types';

const HARNESS_GLOBAL = '__SPACE_EXPLORER_BROWSER_HARNESS__';

declare global {
  interface Window {
    __SPACE_EXPLORER_BROWSER_HARNESS__?: BrowserHarnessApi;
  }
}

function createBrowserHarnessApi(game: Phaser.Game): BrowserHarnessApi {
  const harnessAudioContextManager = (audioManager as unknown as { contextManager: BrowserHarnessAudioContextManager })
    .contextManager;
  let originalAudioResume: BrowserHarnessAudioContextManager['resume'] | null = null;
  const visualPilot = new BrowserHarnessVisualPilot(game);
  const navigation = createBrowserHarnessNavigation(game);
  const gameplayProbes = createBrowserHarnessGameplayProbes(game);
  const performanceProbes = new BrowserHarnessPerformanceProbes(game, audioManager, harnessAudioContextManager);

  const api: BrowserHarnessApi = {
    combatPolish: createCombatPolishProbes(game),
    gameFeel: createGameFeelProbes(game),
    destroyGame: () => game.destroy(true),
    snapshot: () => createBrowserHarnessSnapshot(game),
    setAudioResumeRequestsEnabled: (enabled: boolean) => {
      if (!enabled && !originalAudioResume) {
        originalAudioResume = harnessAudioContextManager.resume;
        harnessAudioContextManager.resume = (): void => undefined;
      } else if (enabled && originalAudioResume) {
        harnessAudioContextManager.resume = originalAudioResume;
        originalAudioResume = null;
      }
    },
    suspendAudioContextForPolicyTest: async () => {
      const context = harnessAudioContextManager.getCtx();
      if (!context || context.state === 'closed') throw new Error('Browser harness audio context is unavailable');
      if (audioManager.getPauseReasons().length > 0) {
        throw new Error('Browser harness cannot stage policy suspension while an application pause is active');
      }
      if (context.state === 'running') await context.suspend();
    },
    probeFramePacing: (sampleCount, options) => performanceProbes.probeFramePacing(sampleCount, options),
    ...gameplayProbes,
    ...createShipyardProbes(game),
    ...createEffectsProbes(game),
    ...createProceduralBackgroundProbes(game),
    showLaneReadingPilot: (glowEnabled = true, hazardType = 'ring-crossfire') =>
      visualPilot.show(glowEnabled, hazardType),
    measureLaneReadingPilotRenderCost: () => visualPilot.measureRenderCost(),
    ...navigation,
  };
  return Object.freeze(api);
}

export function installBrowserHarness(game: Phaser.Game): void {
  if (!window[HARNESS_GLOBAL]) window[HARNESS_GLOBAL] = createBrowserHarnessApi(game);
}
