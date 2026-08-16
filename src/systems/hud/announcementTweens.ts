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
  getAnnouncementTween: () => Phaser.Tweens.Tween | null;
  setAnnouncementTween: (tween: Phaser.Tweens.Tween | null) => void;
}

export class HudAnnouncementTweens {
  constructor(private readonly deps: HudAnnouncementTweenDeps) {}

  showLevelAnnouncement(levelName: string, levelNumber: number): void {
    const layout = this.deps.getLayoutMetrics();

    this.deps.sectorText.setText(`SECTOR ${levelNumber.toString().padStart(2, '0')}`);
    this.deps.levelText.setText(levelName);
    this.deps.announcementText.setText(`SECTOR ${levelNumber}`);
    this.deps.announcementText.setColor('#ffffff');
    this.deps.announcementText.setAlpha(1);
    this.deps.announcementText.setPosition(layout.centerX, layout.announcementY);
    this.deps.getAnnouncementTween()?.stop();

    this.deps.setAnnouncementTween(
      this.deps.scene.tweens.add({
        targets: this.deps.announcementText,
        alpha: { from: 1, to: 0 },
        y: { from: layout.announcementY, to: layout.announcementExitY },
        duration: 2000,
        delay: 1000,
        ease: 'Power2',
        onComplete: () => {
          this.deps.setAnnouncementTween(null);
        },
      })
    );
  }

  showBossWarning(): void {
    const layout = this.deps.getLayoutMetrics();

    this.deps.announcementText.setText('⚠ WARNING: BOSS INCOMING ⚠');
    this.deps.announcementText.setColor('#ff4444');
    this.deps.announcementText.setAlpha(1);
    this.deps.announcementText.setPosition(layout.centerX, layout.announcementY);
    this.deps.getAnnouncementTween()?.stop();

    this.deps.setAnnouncementTween(
      this.deps.scene.tweens.add({
        targets: this.deps.announcementText,
        alpha: { from: 1, to: 0 },
        duration: 2500,
        ease: 'Power2',
        onComplete: () => {
          this.deps.setAnnouncementTween(null);
        },
      })
    );
  }

  showBossPhaseAnnouncement(phase: number): void {
    const layout = this.deps.getLayoutMetrics();

    this.deps.announcementText.setText(`⚠ BOSS PHASE ${phase} ⚠`);
    this.deps.announcementText.setColor('#ffcc44');
    this.deps.announcementText.setAlpha(1);
    this.deps.announcementText.setPosition(layout.centerX, layout.announcementY - 8);
    this.deps.getAnnouncementTween()?.stop();

    this.deps.setAnnouncementTween(
      this.deps.scene.tweens.add({
        targets: this.deps.announcementText,
        alpha: { from: 1, to: 0 },
        y: { from: layout.announcementY - 8, to: layout.announcementY - 34 },
        duration: 1400,
        ease: 'Power2',
        onComplete: () => {
          this.deps.setAnnouncementTween(null);
        },
      })
    );
  }

  showBossGuardBreakAnnouncement(): void {
    const layout = this.deps.getLayoutMetrics();

    this.deps.announcementText.setText('GUARD BREAK');
    this.deps.announcementText.setColor('#ffd76a');
    this.deps.announcementText.setAlpha(1);
    this.deps.announcementText.setPosition(layout.centerX, layout.announcementY - 8);
    this.deps.getAnnouncementTween()?.stop();

    this.deps.setAnnouncementTween(
      this.deps.scene.tweens.add({
        targets: this.deps.announcementText,
        alpha: { from: 1, to: 0 },
        y: { from: layout.announcementY - 8, to: layout.announcementY - 30 },
        duration: 1300,
        ease: 'Power2',
        onComplete: () => this.deps.setAnnouncementTween(null),
      })
    );
  }

  showHelperWingAnnouncement(helperCount: number): void {
    const layout = this.deps.getLayoutMetrics();

    this.deps.announcementText.setText(`ALLY WING ONLINE (${helperCount})`);
    this.deps.announcementText.setColor('#6af6ff');
    this.deps.announcementText.setAlpha(1);
    this.deps.announcementText.setPosition(layout.centerX, layout.announcementY - 6);
    this.deps.getAnnouncementTween()?.stop();

    this.deps.setAnnouncementTween(
      this.deps.scene.tweens.add({
        targets: this.deps.announcementText,
        alpha: { from: 1, to: 0 },
        y: { from: layout.announcementY - 6, to: layout.announcementY - 28 },
        duration: 1600,
        ease: 'Power2',
        onComplete: () => {
          this.deps.setAnnouncementTween(null);
        },
      })
    );
  }

  showEliteWaveAnnouncement(): void {
    const layout = this.deps.getLayoutMetrics();

    this.deps.announcementText.setText('⚠ ELITE WAVE ⚠');
    this.deps.announcementText.setColor('#c99bff');
    this.deps.announcementText.setAlpha(1);
    this.deps.announcementText.setPosition(layout.centerX, layout.announcementY - 6);
    this.deps.getAnnouncementTween()?.stop();

    this.deps.setAnnouncementTween(
      this.deps.scene.tweens.add({
        targets: this.deps.announcementText,
        alpha: { from: 1, to: 0 },
        y: { from: layout.announcementY - 6, to: layout.announcementY - 30 },
        duration: 1500,
        ease: 'Power2',
        onComplete: () => {
          this.deps.setAnnouncementTween(null);
        },
      })
    );
  }

  showPicketOnlineAnnouncement(): void {
    const layout = this.deps.getLayoutMetrics();

    this.deps.announcementText.setText('PICKET ONLINE');
    this.deps.announcementText.setColor('#ffcf7a');
    this.deps.announcementText.setAlpha(1);
    this.deps.announcementText.setPosition(layout.centerX, layout.announcementY - 6);
    this.deps.getAnnouncementTween()?.stop();

    this.deps.setAnnouncementTween(
      this.deps.scene.tweens.add({
        targets: this.deps.announcementText,
        alpha: { from: 1, to: 0 },
        y: { from: layout.announcementY - 6, to: layout.announcementY - 28 },
        duration: 1500,
        ease: 'Power2',
        onComplete: () => {
          this.deps.setAnnouncementTween(null);
        },
      })
    );
  }

  showHelperWingDepletedAnnouncement(): void {
    const layout = this.deps.getLayoutMetrics();

    this.deps.announcementText.setText('ALLY WING LOST');
    this.deps.announcementText.setColor('#ff8899');
    this.deps.announcementText.setAlpha(1);
    this.deps.announcementText.setPosition(layout.centerX, layout.announcementY - 4);
    this.deps.getAnnouncementTween()?.stop();

    this.deps.setAnnouncementTween(
      this.deps.scene.tweens.add({
        targets: this.deps.announcementText,
        alpha: { from: 1, to: 0 },
        duration: 1400,
        ease: 'Power2',
        onComplete: () => {
          this.deps.setAnnouncementTween(null);
        },
      })
    );
  }
}
