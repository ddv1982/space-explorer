import Phaser from 'phaser';
import { createGameFeelProbes } from './browserHarness/gameFeelProbes';
import { createShipyardProbes } from './browserHarness/shipyardProbes';
import { createProceduralBackgroundProbes } from './browserHarness/proceduralBackgroundProbes';

import { createBrowserHarnessGameplayProbes } from './browserHarness/gameplayProbes';
import { createBrowserHarnessNavigation } from './browserHarness/navigation';

import { createBrowserHarnessSnapshot } from './browserHarness/snapshot';
import type { BrowserHarnessApi } from './browserHarness/types';
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
  const harnessAudioContextManager = (audioManager as unknown as { contextManager: { getCtx(): AudioContext | null } })
    .contextManager;
  const navigation = createBrowserHarnessNavigation(game);
  const gameplayProbes = createBrowserHarnessGameplayProbes(game);

  const api: BrowserHarnessApi = {
    gameFeel: createGameFeelProbes(game),
    destroyGame: () => game.destroy(true),
    snapshot: () => createBrowserHarnessSnapshot(game),
    waitForRender: () => new Promise<void>((resolve) => game.events.once(Phaser.Core.Events.POST_RENDER, resolve)),
    suspendAudioContextForPolicyTest: async () => {
      const context = harnessAudioContextManager.getCtx();
      if (!context || context.state === 'closed') throw new Error('Browser harness audio context is unavailable');
      if (audioManager.getPauseReasons().length > 0) {
        throw new Error('Browser harness cannot stage policy suspension while an application pause is active');
      }
      if (context.state === 'running') await context.suspend();
    },
    ...gameplayProbes,
    ...createShipyardProbes(game),
    ...createProceduralBackgroundProbes(game),
    ...navigation,
  };
  return Object.freeze(api);
}

export function installBrowserHarness(game: Phaser.Game): void {
  if (!window[HARNESS_GLOBAL]) window[HARNESS_GLOBAL] = createBrowserHarnessApi(game);
}
