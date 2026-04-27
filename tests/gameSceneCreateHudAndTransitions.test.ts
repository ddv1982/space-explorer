import { describe, expect, test } from 'bun:test';

const callLog: string[] = [];
let hudCreateArgs: { scene: unknown; levelConfig: unknown } | null = null;
let hudAnnouncementArgs: { levelName: string; level: number } | null = null;
let warpCreateScene: unknown = null;
let warpAccentColor: unknown = null;

const { createHudAndTransitions } = await import('../src/scenes/gameScene/createHudAndTransitions');

describe('createHudAndTransitions', () => {
  test('creates HUD and warp transition in the expected order and returns next shield cache', () => {
    callLog.length = 0;
    hudCreateArgs = null;
    hudAnnouncementArgs = null;
    warpCreateScene = null;
    warpAccentColor = null;

    const scene = {};
    const levelConfig = { name: 'Nebula Pass', accentColor: 0x55aaff };

    const result = createHudAndTransitions({
      scene: scene as never,
      levelConfig: levelConfig as never,
      level: 3,
      playerShields: 2,
      lastHudShieldCount: null,
      createHud: () => ({
        create(scene: unknown, levelConfig: unknown) {
          callLog.push('hud.create');
          hudCreateArgs = { scene, levelConfig };
        },
        showLevelAnnouncement(levelName: string, level: number) {
          callLog.push('hud.showLevelAnnouncement');
          hudAnnouncementArgs = { levelName, level };
        },
        updateShields(shields: number) {
          callLog.push(`hud.updateShields:${shields}`);
        },
      }) as never,
      createWarpTransition: () => ({
        create(scene: unknown) {
          callLog.push('warp.create');
          warpCreateScene = scene;
        },
        setAccentColor(accentColor: unknown) {
          callLog.push('warp.setAccentColor');
          warpAccentColor = accentColor;
        },
      }) as never,
    });

    expect(callLog).toEqual([
      'hud.create',
      'hud.showLevelAnnouncement',
      'hud.updateShields:2',
      'warp.create',
      'warp.setAccentColor',
    ]);
    expect(hudCreateArgs).toEqual({ scene, levelConfig });
    expect(hudAnnouncementArgs).toEqual({ levelName: 'Nebula Pass', level: 3 });
    expect(warpCreateScene).toBe(scene);
    expect(warpAccentColor).toBe(0x55aaff);
    expect(result.lastHudShieldCount).toBe(2);
    expect(result.hud).toBeDefined();
    expect(result.warpTransition).toBeDefined();
  });
});
