import { describe, expect, test } from 'bun:test';
import type Phaser from 'phaser';

import { HudAnnouncementTweens } from '../src/systems/hud/announcementTweens';

type TextState = {
  text: string;
  color: string;
  alpha: number;
  x: number;
  y: number;
};

type MockTweenConfig = {
  targets: unknown;
  alpha: { from: number; to: number };
  y?: { from: number; to: number };
  duration: number;
  delay?: number;
  ease: string;
  onComplete: () => void;
};

function createMockText(initialText = ''): { text: Phaser.GameObjects.Text; state: TextState } {
  const state: TextState = {
    text: initialText,
    color: '#ffffff',
    alpha: 0,
    x: 0,
    y: 0,
  };

  const text = {
    setText: (value: string) => {
      state.text = value;
      return text;
    },
    setColor: (value: string) => {
      state.color = value;
      return text;
    },
    setAlpha: (value: number) => {
      state.alpha = value;
      return text;
    },
    setPosition: (x: number, y: number) => {
      state.x = x;
      state.y = y;
      return text;
    },
  };

  return {
    text: text as unknown as Phaser.GameObjects.Text,
    state,
  };
}

function createFixture() {
  const announcementText = createMockText();
  const sectorText = createMockText();
  const levelText = createMockText();

  let priorTweenStopCalls = 0;
  let currentTween: Phaser.Tweens.Tween | null = {
    stop: () => {
      priorTweenStopCalls += 1;
    },
  } as unknown as Phaser.Tweens.Tween;

  const tweenConfigs: MockTweenConfig[] = [];
  const tweenInstances: Phaser.Tweens.Tween[] = [];

  const scene = {
    tweens: {
      add: (config: MockTweenConfig) => {
        tweenConfigs.push(config);
        const tween = {
          stop: () => undefined,
        } as unknown as Phaser.Tweens.Tween;
        tweenInstances.push(tween);
        return tween;
      },
    },
  } as unknown as Phaser.Scene;

  const helper = new HudAnnouncementTweens({
    scene,
    announcementText: announcementText.text,
    sectorText: sectorText.text,
    levelText: levelText.text,
    getLayoutMetrics: () => ({ centerX: 512, announcementY: 300, announcementExitY: 250 }),
    getAnnouncementTween: () => currentTween,
    setAnnouncementTween: (tween) => {
      currentTween = tween;
    },
  });

  return {
    helper,
    announcementText,
    sectorText,
    levelText,
    tweenConfigs,
    tweenInstances,
    getCurrentTween: () => currentTween,
    getPriorTweenStopCalls: () => priorTweenStopCalls,
  };
}

describe('HudAnnouncementTweens', () => {
  test('showLevelAnnouncement preserves text and tween timing semantics', () => {
    const fixture = createFixture();

    fixture.helper.showLevelAnnouncement('Nebula Pass', 3);

    expect(fixture.sectorText.state.text).toBe('SECTOR 03');
    expect(fixture.levelText.state.text).toBe('Nebula Pass');
    expect(fixture.announcementText.state.text).toBe('SECTOR 3');
    expect(fixture.announcementText.state.color).toBe('#ffffff');
    expect(fixture.announcementText.state.alpha).toBe(1);
    expect(fixture.announcementText.state.x).toBe(512);
    expect(fixture.announcementText.state.y).toBe(300);
    expect(fixture.getPriorTweenStopCalls()).toBe(1);

    expect(fixture.tweenConfigs).toHaveLength(1);
    expect(fixture.tweenConfigs[0]).toMatchObject({
      alpha: { from: 1, to: 0 },
      y: { from: 300, to: 250 },
      duration: 2000,
      delay: 1000,
      ease: 'Power2',
    });
    expect(fixture.getCurrentTween()).toBe(fixture.tweenInstances[0]);

    fixture.tweenConfigs[0].onComplete();
    expect(fixture.getCurrentTween()).toBeNull();
  });

  test('boss and helper announcements preserve text, colors, and tween profiles', () => {
    const fixture = createFixture();

    fixture.helper.showBossWarning();
    fixture.helper.showBossPhaseAnnouncement(2);
    fixture.helper.showHelperWingAnnouncement(4);
    fixture.helper.showHelperWingDepletedAnnouncement();

    expect(fixture.tweenConfigs).toHaveLength(4);

    expect(fixture.tweenConfigs[0]).toMatchObject({
      duration: 2500,
      ease: 'Power2',
      alpha: { from: 1, to: 0 },
    });

    expect(fixture.tweenConfigs[1]).toMatchObject({
      duration: 1400,
      ease: 'Power2',
      y: { from: 292, to: 266 },
      alpha: { from: 1, to: 0 },
    });

    expect(fixture.tweenConfigs[2]).toMatchObject({
      duration: 1600,
      ease: 'Power2',
      y: { from: 294, to: 272 },
      alpha: { from: 1, to: 0 },
    });

    expect(fixture.tweenConfigs[3]).toMatchObject({
      duration: 1400,
      ease: 'Power2',
      alpha: { from: 1, to: 0 },
    });

    expect(fixture.announcementText.state.text).toBe('ALLY WING LOST');
    expect(fixture.announcementText.state.color).toBe('#ff8899');
    expect(fixture.announcementText.state.alpha).toBe(1);
    expect(fixture.announcementText.state.x).toBe(512);
    expect(fixture.announcementText.state.y).toBe(296);
  });
});
