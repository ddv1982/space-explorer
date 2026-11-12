import type Phaser from 'phaser';
import { prefersReducedMotion } from '../../utils/device';
import { colorToHexString, mixColor } from '../../utils/colorUtils';
import { getVisualQualityProfile } from '../../config/visualQuality';

interface HudAnnouncementLayout {
  centerX: number;
  announcementY: number;
  announcementExitY: number;
  announcementMaxWidth: number;
}

interface HudAnnouncementTweenDeps {
  scene: Phaser.Scene;
  announcementText: Phaser.GameObjects.Text;
  /** Rule drawn under the title; it rides the same tween so the pair reads as one card. */
  announcementRule: Phaser.GameObjects.Graphics;
  /** Padding the title keeps around its letters for the glow. */
  glowPadding: number;
  sectorText: Phaser.GameObjects.Text;
  levelText: Phaser.GameObjects.Text;
  getLayoutMetrics: () => HudAnnouncementLayout;
}

interface HudAnnouncement {
  text: string;
  color: number;
  duration: number;
  offset?: number;
  exit?: 'level' | number;
  delay?: number;
}

const WARNING = 0xff4d5e;
const CAUTION = 0xffc36e;
const ALLY = 0x6af6ff;
const ELITE = 0xc99bff;

export class HudAnnouncementTweens {
  private activeTween: Phaser.Tweens.Tween | null = null;

  constructor(private readonly deps: HudAnnouncementTweenDeps) {}

  relayout(layout: HudAnnouncementLayout): void {
    const { announcementText: text, announcementRule: rule } = this.deps;
    text.setPosition(layout.centerX, layout.announcementY);
    rule.setPosition(layout.centerX, layout.announcementY);
    if (this.activeTween && text.alpha > 0) {
      this.activeTween.stop();
      this.activeTween = this.deps.scene.tweens.add({
        targets: [text, rule],
        alpha: { from: text.alpha, to: 0 },
        duration: 900,
        ease: 'Power2',
        onComplete: () => {
          this.activeTween = null;
        },
      });
    }
  }

  showLevelAnnouncement(levelName: string, levelNumber: number): void {
    this.deps.sectorText.setText(`SECTOR ${levelNumber.toString().padStart(2, '0')}`);
    this.deps.levelText.setText(levelName);
    this.show({ text: `SECTOR ${levelNumber}`, color: 0x5bd8ff, duration: 2000, delay: 1000, exit: 'level' });
  }

  showBossWarning(): void {
    this.show({ text: 'WARNING: BOSS INCOMING', color: WARNING, duration: 2500 });
  }

  showBossPhaseAnnouncement(phase: number): void {
    this.show({ text: `BOSS PHASE ${phase}`, color: CAUTION, duration: 1400, offset: -8, exit: -34 });
  }

  showBossGuardBreakAnnouncement(): void {
    this.show({ text: 'GUARD BREAK', color: 0xffd76a, duration: 1300, offset: -8, exit: -30 });
  }

  showHelperWingAnnouncement(helperCount: number): void {
    this.show({ text: `ALLY WING ONLINE (${helperCount})`, color: ALLY, duration: 1600, offset: -6, exit: -28 });
  }

  showEliteWaveAnnouncement(title = 'ELITE WAVE'): void {
    this.show({ text: title, color: ELITE, duration: 1500, offset: -6, exit: -30 });
  }

  showPicketOnlineAnnouncement(): void {
    this.show({ text: 'PICKET ONLINE', color: 0xffcf7a, duration: 1500, offset: -6, exit: -28 });
  }

  showHelperWingDepletedAnnouncement(): void {
    this.show({ text: 'ALLY WING LOST', color: 0xff8899, duration: 1400, offset: -4 });
  }

  /**
   * Title card: white-hot display letters glowing in the event's colour over a matching rule. The
   * card fades (and optionally drifts) out; reduced motion keeps the fade and drops the drift.
   */
  private show({ text, color, duration, offset = 0, exit, delay }: HudAnnouncement): void {
    const layout = this.deps.getLayoutMetrics();
    const { announcementText: announcement, announcementRule: rule, glowPadding } = this.deps;
    const startY = layout.announcementY + offset;
    const glow = colorToHexString(color);

    announcement.setText(text);
    announcement.setColor(colorToHexString(mixColor(0xffffff, color, 0.22)));
    announcement.setShadow(0, 0, glow, Math.round(glowPadding * getVisualQualityProfile().uiGlowStrength), false, true);
    announcement.setScale(Math.min(1, layout.announcementMaxWidth / announcement.width));
    announcement.setAlpha(1);
    announcement.setPosition(layout.centerX, startY);
    this.drawRule(announcement.displayWidth - glowPadding * 2, announcement.displayHeight / 2 - glowPadding + 5, color);
    rule.setAlpha(1);
    rule.setPosition(layout.centerX, startY);
    this.activeTween?.stop();

    const exitY = exit === 'level' ? layout.announcementExitY : exit === undefined ? null : layout.announcementY + exit;
    this.activeTween = this.deps.scene.tweens.add({
      targets: [announcement, rule],
      alpha: { from: 1, to: 0 },
      ...(exitY === null || prefersReducedMotion() ? {} : { y: { from: startY, to: exitY } }),
      duration,
      ...(delay === undefined ? {} : { delay }),
      ease: 'Power2',
      onComplete: () => {
        this.activeTween = null;
      },
    });
  }

  /** Rule under the title: bright in the middle, fading to nothing at both ends. */
  private drawRule(width: number, y: number, color: number): void {
    const rule = this.deps.announcementRule;
    const half = width / 2;
    rule.clear();
    [0.9, 0.5, 0.2].forEach((alpha, index, steps) => {
      const from = (half * index) / steps.length;
      const to = (half * (index + 1)) / steps.length;
      rule.fillStyle(color, alpha);
      rule.fillRect(-to, y, to - from, 2);
      rule.fillRect(from, y, to - from, 2);
    });
  }
}
