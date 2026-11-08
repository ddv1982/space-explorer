import type Phaser from 'phaser';

interface HudAnnouncementLayout {
  centerX: number;
  announcementY: number;
  announcementExitY: number;
}

interface HudAnnouncementTweenDeps {
  scene: Phaser.Scene;
  announcementText: Phaser.GameObjects.Text;
  sectorText: Phaser.GameObjects.Text;
  levelText: Phaser.GameObjects.Text;
  getLayoutMetrics: () => HudAnnouncementLayout;
}

interface HudAnnouncement {
  text: string;
  color: string;
  duration: number;
  offset?: number;
  exit?: 'level' | number;
  delay?: number;
}

export class HudAnnouncementTweens {
  private activeTween: Phaser.Tweens.Tween | null = null;

  constructor(private readonly deps: HudAnnouncementTweenDeps) {}

  relayout(layout: HudAnnouncementLayout): void {
    const text = this.deps.announcementText;
    text.setPosition(layout.centerX, layout.announcementY);
    if (this.activeTween && text.alpha > 0) {
      this.activeTween.stop();
      this.activeTween = this.deps.scene.tweens.add({
        targets: text,
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
    this.show({ text: `SECTOR ${levelNumber}`, color: '#ffffff', duration: 2000, delay: 1000, exit: 'level' });
  }

  showBossWarning(): void {
    this.show({ text: '⚠ WARNING: BOSS INCOMING ⚠', color: '#ff4444', duration: 2500 });
  }

  showBossPhaseAnnouncement(phase: number): void {
    this.show({ text: `⚠ BOSS PHASE ${phase} ⚠`, color: '#ffcc44', duration: 1400, offset: -8, exit: -34 });
  }

  showBossGuardBreakAnnouncement(): void {
    this.show({ text: 'GUARD BREAK', color: '#ffd76a', duration: 1300, offset: -8, exit: -30 });
  }

  showHelperWingAnnouncement(helperCount: number): void {
    this.show({ text: `ALLY WING ONLINE (${helperCount})`, color: '#6af6ff', duration: 1600, offset: -6, exit: -28 });
  }

  showEliteWaveAnnouncement(): void {
    this.show({ text: '⚠ ELITE WAVE ⚠', color: '#c99bff', duration: 1500, offset: -6, exit: -30 });
  }

  showPicketOnlineAnnouncement(): void {
    this.show({ text: 'PICKET ONLINE', color: '#ffcf7a', duration: 1500, offset: -6, exit: -28 });
  }

  showHelperWingDepletedAnnouncement(): void {
    this.show({ text: 'ALLY WING LOST', color: '#ff8899', duration: 1400, offset: -4 });
  }

  private show({ text, color, duration, offset = 0, exit, delay }: HudAnnouncement): void {
    const layout = this.deps.getLayoutMetrics();
    const announcement = this.deps.announcementText;
    const startY = layout.announcementY + offset;
    announcement.setText(text);
    announcement.setColor(color);
    announcement.setAlpha(1);
    announcement.setPosition(layout.centerX, startY);
    this.activeTween?.stop();

    this.activeTween = this.deps.scene.tweens.add({
      targets: announcement,
      alpha: { from: 1, to: 0 },
      ...(exit === undefined
        ? {}
        : { y: { from: startY, to: exit === 'level' ? layout.announcementExitY : layout.announcementY + exit } }),
      duration,
      ...(delay === undefined ? {} : { delay }),
      ease: 'Power2',
      onComplete: () => {
        this.activeTween = null;
      },
    });
  }
}
