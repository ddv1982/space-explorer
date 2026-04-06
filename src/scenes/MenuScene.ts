import Phaser from 'phaser';
import { resetPlayerState } from '../systems/PlayerState';
import { audioManager } from '../systems/AudioManager';

export class MenuScene extends Phaser.Scene {
  private stars: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super({ key: 'Menu' });
  }

  create(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.cameras.main.setBackgroundColor('#000011');

    // Animated star field background
    this.createAnimatedStars();

    this.add.text(centerX, centerY - 60, 'SPACE EXPLORER', {
      fontSize: '64px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Controls panel
    const controlsY = centerY + 40;
    const controlsPanel = this.add.graphics();
    controlsPanel.fillStyle(0x111133, 0.7);
    controlsPanel.fillRoundedRect(centerX - 180, controlsY - 8, 360, 132, 8);
    controlsPanel.lineStyle(1, 0x334466, 0.6);
    controlsPanel.strokeRoundedRect(centerX - 180, controlsY - 8, 360, 132, 8);
    controlsPanel.setDepth(10);

    const controlsTitle = this.add.text(centerX, controlsY + 6, 'CONTROLS', {
      fontSize: '14px',
      color: '#6688aa',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(11);

    const controlsContent = [
      { label: 'MOVE', keys: 'W A S D  /  Arrow Keys' },
      { label: 'FIRE', keys: 'SPACE  /  Click' },
      { label: 'LIVES', keys: '3 Ships Per Run' },
    ];

    controlsContent.forEach((row, i) => {
      const rowY = controlsY + 28 + i * 28;
      this.add.text(centerX - 160, rowY, row.label, {
        fontSize: '13px',
        color: '#88aacc',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setDepth(11);

      // Key badge
      const badgeBg = this.add.graphics().setDepth(11);
      const badgeText = this.add.text(centerX + 10, rowY, row.keys, {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'monospace',
        backgroundColor: '#222244',
        padding: { x: 8, y: 4 },
      }).setOrigin(0.5).setDepth(12);
    });

    // Pulsing subtitle
    const subtitle = this.add.text(centerX, controlsY + 140, 'Click to Start', {
      fontSize: '24px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: subtitle,
      alpha: { from: 1, to: 0.3 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    this.input.once('pointerdown', () => {
      audioManager.init();
      audioManager.playClick();
      resetPlayerState(this.registry);
      this.scene.start('Game');
    });
  }

  private createAnimatedStars(): void {
    this.stars = this.add.graphics();
    this.stars.setDepth(-10);

    const starPositions: { x: number; y: number; size: number; speed: number; alpha: number }[] = [];
    for (let i = 0; i < 100; i++) {
      starPositions.push({
        x: Phaser.Math.Between(0, 1280),
        y: Phaser.Math.Between(0, 720),
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.5 + 0.1,
        alpha: Math.random() * 0.7 + 0.3,
      });
    }

    // Twinkle animation
    this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        if (!this.stars) return;
        this.stars.clear();
        for (const star of starPositions) {
          star.y += star.speed;
          if (star.y > 720) {
            star.y = 0;
            star.x = Phaser.Math.Between(0, 1280);
          }
          const twinkle = star.alpha * (0.7 + Math.sin(Date.now() * 0.003 * star.speed) * 0.3);
          this.stars.fillStyle(0xffffff, twinkle);
          this.stars.fillCircle(star.x, star.y, star.size);
        }
      },
    });
  }
}
