import { describe, expect, test } from 'bun:test';
import type Phaser from 'phaser';

import { HudAnnouncementTweens } from '../src/systems/hud/announcementTweens';

type MockTweenConfig = {
  targets: unknown;
  alpha: { from: number; to: number };
  y?: { from: number; to: number };
  duration: number;
  delay?: number;
  ease: string;
  onComplete: () => void;
};

function createMockText(initialText = '') {
  const state = { text: initialText, color: '#ffffff', alpha: 0, x: 0, y: 0 };
  const text = {
    get alpha() {
      return state.alpha;
    },
    setText(value: string) {
      state.text = value;
      return text;
    },
    setColor(value: string) {
      state.color = value;
      return text;
    },
    setAlpha(value: number) {
      state.alpha = value;
      return text;
    },
    setPosition(x: number, y: number) {
      state.x = x;
      state.y = y;
      return text;
    },
  };
  return { text: text as unknown as Phaser.GameObjects.Text, state };
}

function createFixture() {
  const announcementText = createMockText();
  const sectorText = createMockText();
  const levelText = createMockText();
  const tweenConfigs: MockTweenConfig[] = [];
  const stopCounts: number[] = [];
  const scene = {
    tweens: {
      add: (config: MockTweenConfig) => {
        const index = tweenConfigs.length;
        tweenConfigs.push(config);
        stopCounts.push(0);
        return {
          stop: () => {
            stopCounts[index] += 1;
          },
        };
      },
    },
  } as unknown as Phaser.Scene;

  const helper = new HudAnnouncementTweens({
    scene,
    announcementText: announcementText.text,
    sectorText: sectorText.text,
    levelText: levelText.text,
    getLayoutMetrics: () => ({ centerX: 512, announcementY: 300, announcementExitY: 250 }),
  });
  return { helper, announcementText, sectorText, levelText, tweenConfigs, stopCounts };
}

describe('HudAnnouncementTweens', () => {
  test('level announcement sets sector labels and preserves delayed upward fade', () => {
    const fixture = createFixture();
    fixture.helper.showLevelAnnouncement('Nebula Pass', 3);
    expect(fixture.sectorText.state.text).toBe('SECTOR 03');
    expect(fixture.levelText.state.text).toBe('Nebula Pass');
    expect(fixture.announcementText.state).toEqual({ text: 'SECTOR 3', color: '#ffffff', alpha: 1, x: 512, y: 300 });
    expect(fixture.tweenConfigs[0]).toMatchObject({
      alpha: { from: 1, to: 0 },
      y: { from: 300, to: 250 },
      duration: 2000,
      delay: 1000,
      ease: 'Power2',
    });
  });

  const cases = [
    {
      show: (helper: HudAnnouncementTweens) => helper.showBossWarning(),
      text: '⚠ WARNING: BOSS INCOMING ⚠',
      color: '#ff4444',
      duration: 2500,
      y: 300,
    },
    {
      show: (helper: HudAnnouncementTweens) => helper.showBossPhaseAnnouncement(2),
      text: '⚠ BOSS PHASE 2 ⚠',
      color: '#ffcc44',
      duration: 1400,
      y: 292,
      exitY: 266,
    },
    {
      show: (helper: HudAnnouncementTweens) => helper.showBossGuardBreakAnnouncement(),
      text: 'GUARD BREAK',
      color: '#ffd76a',
      duration: 1300,
      y: 292,
      exitY: 270,
    },
    {
      show: (helper: HudAnnouncementTweens) => helper.showHelperWingAnnouncement(4),
      text: 'ALLY WING ONLINE (4)',
      color: '#6af6ff',
      duration: 1600,
      y: 294,
      exitY: 272,
    },
    {
      show: (helper: HudAnnouncementTweens) => helper.showEliteWaveAnnouncement(),
      text: '⚠ ELITE WAVE ⚠',
      color: '#c99bff',
      duration: 1500,
      y: 294,
      exitY: 270,
    },
    {
      show: (helper: HudAnnouncementTweens) => helper.showPicketOnlineAnnouncement(),
      text: 'PICKET ONLINE',
      color: '#ffcf7a',
      duration: 1500,
      y: 294,
      exitY: 272,
    },
    {
      show: (helper: HudAnnouncementTweens) => helper.showHelperWingDepletedAnnouncement(),
      text: 'ALLY WING LOST',
      color: '#ff8899',
      duration: 1400,
      y: 296,
    },
  ];
  for (const profile of cases) {
    test(`${profile.text} preserves its authored profile and cancels the previous announcement`, () => {
      const fixture = createFixture();
      fixture.helper.showLevelAnnouncement('Nebula Pass', 3);
      profile.show(fixture.helper);
      expect(fixture.stopCounts).toEqual([1, 0]);
      expect(fixture.announcementText.state).toEqual({
        text: profile.text,
        color: profile.color,
        alpha: 1,
        x: 512,
        y: profile.y,
      });
      expect(fixture.tweenConfigs[1]).toMatchObject({
        duration: profile.duration,
        ease: 'Power2',
        alpha: { from: 1, to: 0 },
      });
      expect(fixture.tweenConfigs[1].y).toEqual(
        profile.exitY === undefined ? undefined : { from: profile.y, to: profile.exitY }
      );
      expect(fixture.tweenConfigs[1].delay).toBeUndefined();
      fixture.tweenConfigs[1].onComplete();
      fixture.helper.showBossWarning();
      expect(fixture.stopCounts).toEqual([1, 0, 0]);
    });
  }

  test('resize centers a visible announcement and continues its current alpha for 900ms', () => {
    const fixture = createFixture();
    fixture.helper.showBossPhaseAnnouncement(2);
    fixture.announcementText.state.alpha = 0.45;
    fixture.helper.relayout({ centerX: 195, announcementY: 362, announcementExitY: 322 });
    expect(fixture.announcementText.state).toEqual({
      text: '⚠ BOSS PHASE 2 ⚠',
      color: '#ffcc44',
      alpha: 0.45,
      x: 195,
      y: 362,
    });
    expect(fixture.stopCounts).toEqual([1, 0]);
    expect(fixture.tweenConfigs[1]).toMatchObject({ alpha: { from: 0.45, to: 0 }, duration: 900, ease: 'Power2' });
    expect(fixture.tweenConfigs[1].y).toBeUndefined();
    fixture.tweenConfigs[1].onComplete();
    fixture.helper.showPicketOnlineAnnouncement();
    expect(fixture.stopCounts).toEqual([1, 0, 0]);
  });

  test('resize moves hidden or completed announcements without restarting a fade', () => {
    const fixture = createFixture();
    fixture.helper.relayout({ centerX: 195, announcementY: 362, announcementExitY: 322 });
    expect(fixture.tweenConfigs).toHaveLength(0);
    fixture.helper.showBossWarning();
    fixture.announcementText.state.alpha = 0;
    fixture.helper.relayout({ centerX: 400, announcementY: 240, announcementExitY: 200 });
    expect(fixture.tweenConfigs).toHaveLength(1);
    expect(fixture.stopCounts).toEqual([0]);
    expect(fixture.announcementText.state).toMatchObject({ x: 400, y: 240 });
  });
});
