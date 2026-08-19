import { describe, expect, mock, test } from 'bun:test';
import { mockPhaserModule } from './helpers/phaserMock';

mockPhaserModule();

const ensurePremiumBackgroundAssets = mock();
const startRegisteredScene = mock();
let currentLevel = 4;

mock.module('@/systems/parallax/premiumBackgroundLoading', () => ({
  ensurePremiumBackgroundAssets,
}));

mock.module('@/systems/PlayerState', () => ({
  advanceToNextLevel: () => {
    currentLevel += 1;
  },
  getPlayerState: () => ({ level: currentLevel }),
  getRunSummary: mock(),
  setPlayerState: mock(),
  setRunSummary: mock(),
}));

mock.module('../src/scenes/sceneRegistry', () => ({
  startRegisteredScene,
}));

const { PlanetIntermissionScene } = await import('../src/scenes/PlanetIntermissionScene');
type PlanetIntermissionSceneInstance = InstanceType<typeof PlanetIntermissionScene>;

describe('PlanetIntermissionScene premium background transition', () => {
  test('advances state and waits for the next level window before starting Game', () => {
    currentLevel = 4;
    ensurePremiumBackgroundAssets.mockClear();
    startRegisteredScene.mockClear();

    let onReady: (() => void) | undefined;
    ensurePremiumBackgroundAssets.mockImplementation((_scene, _level, callback) => {
      onReady = callback;
    });

    const scene = Object.create(PlanetIntermissionScene.prototype) as PlanetIntermissionSceneInstance;
    (scene as unknown as Record<string, unknown>).registry = {};
    (scene as unknown as Record<string, unknown>).warpTransition = {
      play: (callback: () => void) => callback(),
    };

    (scene as unknown as { transitionToNextGameLevel: () => void }).transitionToNextGameLevel();

    expect(currentLevel).toBe(5);
    expect(ensurePremiumBackgroundAssets).toHaveBeenCalledWith(scene, 5, expect.any(Function));
    expect(startRegisteredScene).not.toHaveBeenCalled();

    onReady?.();

    expect(startRegisteredScene).toHaveBeenCalledWith(scene, 'Game');
  });

  test('handlePostPurchaseFocus moves once when the focused upgrade caps', () => {
    const scene = Object.create(PlanetIntermissionScene.prototype) as PlanetIntermissionSceneInstance;
    let moves = 0;
    (scene as unknown as Record<string, unknown>).interactionController = {
      isFocusedButton: () => true,
      moveFocusAfterPurchase: () => {
        moves += 1;
      },
    };
    (scene as unknown as Record<string, unknown>).buttons = [{ upgradeKey: 'hp' }];
    (scene as unknown as Record<string, unknown>).getButtonEvaluation = () => ({ canPurchase: false });

    (
      scene as unknown as {
        handlePostPurchaseFocus: (button: { upgradeKey: string }, upgradeKey: string) => void;
      }
    ).handlePostPurchaseFocus({ upgradeKey: 'hp' }, 'hp');

    expect(moves).toBe(1);
  });
});
