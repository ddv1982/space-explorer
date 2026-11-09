import { describe, expect, mock, test } from 'bun:test';
import type Phaser from 'phaser';

import { callsTo, createRecordingStub } from './helpers/recordingStub';

mock.module('phaser', () => ({
  default: { Math: { Clamp: (value: number, min: number, max: number) => Math.min(max, Math.max(min, value)) } },
}));

const { HudAnnouncementTweens } = await import('../src/systems/hud/announcementTweens');
type HudAnnouncementTweens = InstanceType<typeof HudAnnouncementTweens>;

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
  const scales: number[] = [];
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
    setShadow() {
      return text;
    },
    setScale(value: number) {
      scales.push(value);
      return text;
    },
    width: 600,
    displayWidth: 600,
    displayHeight: 70,
  };
  return { text: text as unknown as Phaser.GameObjects.Text, state, scales };
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

  const rule = createRecordingStub<Phaser.GameObjects.Graphics>();
  const helper = new HudAnnouncementTweens({
    scene,
    announcementText: announcementText.text,
    announcementRule: rule.stub,
    glowPadding: 18,
    sectorText: sectorText.text,
    levelText: levelText.text,
    getLayoutMetrics: () => ({ centerX: 512, announcementY: 300, announcementExitY: 250, announcementMaxWidth: 480 }),
  });
  return { helper, announcementText, rule, sectorText, levelText, tweenConfigs, stopCounts };
}

describe('HudAnnouncementTweens', () => {
  test('level announcement sets sector labels and preserves delayed upward fade', () => {
    const fixture = createFixture();
    fixture.helper.showLevelAnnouncement('Nebula Pass', 3);
    expect(fixture.sectorText.state.text).toBe('SECTOR 03');
    expect(fixture.levelText.state.text).toBe('Nebula Pass');
    expect(fixture.announcementText.state).toEqual({ text: 'SECTOR 3', color: '#dbf6ff', alpha: 1, x: 512, y: 300 });
    // The title card shrinks to the viewport and its rule rides the same tween.
    expect(fixture.announcementText.scales).toEqual([0.8]);
    expect(fixture.tweenConfigs[0].targets).toEqual([fixture.announcementText.text, fixture.rule.stub]);
    expect(callsTo(fixture.rule.calls, 'setPosition')).toEqual([[512, 300]]);
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
      text: 'WARNING: BOSS INCOMING',
      color: '#ffd8dc',
      duration: 2500,
      y: 300,
    },
    {
      show: (helper: HudAnnouncementTweens) => helper.showBossPhaseAnnouncement(2),
      text: 'BOSS PHASE 2',
      color: '#fff2df',
      duration: 1400,
      y: 292,
      exitY: 266,
    },
    {
      show: (helper: HudAnnouncementTweens) => helper.showBossGuardBreakAnnouncement(),
      text: 'GUARD BREAK',
      color: '#fff6de',
      duration: 1300,
      y: 292,
      exitY: 270,
    },
    {
      show: (helper: HudAnnouncementTweens) => helper.showHelperWingAnnouncement(4),
      text: 'ALLY WING ONLINE (4)',
      color: '#defdff',
      duration: 1600,
      y: 294,
      exitY: 272,
    },
    {
      show: (helper: HudAnnouncementTweens) => helper.showEliteWaveAnnouncement(),
      text: 'ELITE WAVE',
      color: '#f3e9ff',
      duration: 1500,
      y: 294,
      exitY: 270,
    },
    {
      show: (helper: HudAnnouncementTweens) => helper.showPicketOnlineAnnouncement(),
      text: 'PICKET ONLINE',
      color: '#fff4e2',
      duration: 1500,
      y: 294,
      exitY: 272,
    },
    {
      show: (helper: HudAnnouncementTweens) => helper.showHelperWingDepletedAnnouncement(),
      text: 'ALLY WING LOST',
      color: '#ffe5e9',
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
    fixture.helper.relayout({ centerX: 195, announcementY: 362, announcementExitY: 322, announcementMaxWidth: 358 });
    expect(fixture.announcementText.state).toEqual({
      text: 'BOSS PHASE 2',
      color: '#fff2df',
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
    fixture.helper.relayout({ centerX: 195, announcementY: 362, announcementExitY: 322, announcementMaxWidth: 358 });
    expect(fixture.tweenConfigs).toHaveLength(0);
    fixture.helper.showBossWarning();
    fixture.announcementText.state.alpha = 0;
    fixture.helper.relayout({ centerX: 400, announcementY: 240, announcementExitY: 200, announcementMaxWidth: 768 });
    expect(fixture.tweenConfigs).toHaveLength(1);
    expect(fixture.stopCounts).toEqual([0]);
    expect(fixture.announcementText.state).toMatchObject({ x: 400, y: 240 });
  });
});
