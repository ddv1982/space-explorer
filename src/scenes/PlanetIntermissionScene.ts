import Phaser from 'phaser';
import { getPlayerState, setPlayerState, advanceToNextLevel, PlayerStateData } from '../systems/PlayerState';
import { getLevelConfig, isLastLevel } from '../config/LevelsConfig';
import { UPGRADES, getUpgradeCost, isUpgradeMaxed, UpgradeDef } from '../config/UpgradesConfig';
import { GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';
import { WarpTransition } from '../systems/WarpTransition';
import { audioManager } from '../systems/AudioManager';

interface UpgradeButton {
  bg: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  costText: Phaser.GameObjects.Text;
  levelText: Phaser.GameObjects.Text;
  upgrade: UpgradeDef;
  x: number;
  y: number;
}

export class PlanetIntermissionScene extends Phaser.Scene {
  private state!: PlayerStateData;
  private scoreText!: Phaser.GameObjects.Text;
  private buttons: UpgradeButton[] = [];
  private warpTransition!: WarpTransition;
  private planetColors: number[][] = [
    [0x2266aa, 0x4488cc],
    [0x884488, 0xaa66aa],
    [0x448844, 0x66aa66],
    [0x886644, 0xaa8866],
    [0x884444, 0xaa6666],
  ];

  constructor() {
    super({ key: 'PlanetIntermission' });
  }

  create(): void {
    audioManager.init();
    audioManager.stopMusic();
    this.state = getPlayerState(this.registry);
    this.cameras.main.setBackgroundColor('#000011');

    this.generatePlanetTexture();

    const completedLevelConfig = getLevelConfig(this.state.level);
    const nextLevelConfig = getLevelConfig(this.state.level + 1);

    this.add.text(GAME_WIDTH / 2, 50, completedLevelConfig.planetName, {
      fontSize: '20px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 85, 'PLANET APPROACHED', {
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 130, `LEVEL ${this.state.level} COMPLETE`, {
      fontSize: '18px',
      color: '#44ff88',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.scoreText = this.add.text(GAME_WIDTH / 2, 170, `CREDITS: ${this.state.score}`, {
      fontSize: '24px',
      color: '#ffcc00',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.createUpgradeButtons();

    this.warpTransition = new WarpTransition();
    this.warpTransition.create(this);

    const continueLabel = isLastLevel(this.state.level)
      ? 'FINAL MISSION - Click to Continue'
      : `NEXT: ${nextLevelConfig.name} - Click to Continue`;

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, continueLabel, {
      fontSize: '20px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.handleUpgradeClick(pointer)) {
        audioManager.playClick();
        this.input.off('pointerdown');

        if (isLastLevel(this.state.level)) {
          // All levels beaten - go to Victory
          this.registry.set('finalScore', this.state.score);
          this.registry.set('levelReached', this.state.level);
          this.scene.start('Victory');
        } else {
          this.warpTransition.play(() => {
            advanceToNextLevel(this.registry);
            this.scene.start('Game');
          });
        }
      }
    });
  }

  private generatePlanetTexture(): void {
    const colorPair = this.planetColors[(this.state.level - 1) % this.planetColors.length];
    const key = `planet-level-${this.state.level}`;

    const g = this.add.graphics();
    const cx = 60;
    const cy = 60;
    const r = 50;

    g.fillStyle(colorPair[0], 1);
    g.fillCircle(cx, cy, r);

    g.fillStyle(colorPair[1], 0.6);
    g.fillCircle(cx - 10, cy - 8, r * 0.7);

    g.fillStyle(0x000000, 0.2);
    g.fillCircle(cx + 15, cy + 10, r * 0.5);

    g.lineStyle(1, colorPair[1], 0.3);
    for (let i = 0; i < 3; i++) {
      const ringY = cy - 20 + i * 20;
      g.beginPath();
      g.moveTo(cx - r + 5, ringY);
      g.lineTo(cx + r - 5, ringY);
      g.strokePath();
    }

    g.generateTexture(key, 120, 120);
    g.destroy();

    this.add.image(GAME_WIDTH / 2, 270, key).setScale(1.5).setDepth(1);
  }

  private createUpgradeButtons(): void {
    const startX = 160;
    const startY = 380;
    const buttonWidth = 240;
    const buttonHeight = 60;
    const spacingX = 240;
    const spacingY = 20;

    for (let i = 0; i < UPGRADES.length; i++) {
      const upgrade = UPGRADES[i];
      const x = startX + (i % 2) * (buttonWidth + spacingX - 220);
      const y = startY + Math.floor(i / 2) * (buttonHeight + spacingY);
      const currentLevel = this.state.upgrades[upgrade.key];
      const cost = getUpgradeCost(upgrade, currentLevel);
      const maxed = isUpgradeMaxed(upgrade, currentLevel);
      const canAfford = this.state.score >= cost;

      const col = i % 2;
      const row = Math.floor(i / 2);
      const bx = startX + col * (buttonWidth + 40);
      const by = startY + row * (buttonHeight + spacingY);

      const bg = this.add.graphics();
      this.drawButtonBg(bg, buttonWidth, buttonHeight, canAfford && !maxed);
      bg.setPosition(bx, by);
      bg.setDepth(2);

      const text = this.add.text(bx + 10, by + 8, upgrade.name, {
        fontSize: '14px',
        color: canAfford && !maxed ? '#ffffff' : '#666666',
        fontFamily: 'monospace',
      }).setDepth(3);

      const levelText = this.add.text(bx + 10, by + 28, `${upgrade.description} [${currentLevel}/${upgrade.maxLevel}]`, {
        fontSize: '11px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      }).setDepth(3);

      const costLabel = maxed ? 'MAXED' : `${cost}`;
      const costText = this.add.text(bx + buttonWidth - 10, by + buttonHeight / 2, costLabel, {
        fontSize: '16px',
        color: maxed ? '#44ff44' : canAfford ? '#ffcc00' : '#664444',
        fontFamily: 'monospace',
      }).setOrigin(1, 0.5).setDepth(3);

      this.buttons.push({ bg, text, costText, levelText, upgrade, x: bx, y: by });
    }
  }

  private drawButtonBg(bg: Phaser.GameObjects.Graphics, w: number, h: number, active: boolean): void {
    bg.clear();
    bg.fillStyle(0x222244, 0.8);
    bg.fillRoundedRect(0, 0, w, h, 8);
    bg.lineStyle(2, active ? 0x4488ff : 0x444466, 1);
    bg.strokeRoundedRect(0, 0, w, h, 8);
  }

  private handleUpgradeClick(pointer: Phaser.Input.Pointer): boolean {
    const buttonWidth = 240;
    const buttonHeight = 60;

    for (const btn of this.buttons) {
      if (
        pointer.x >= btn.x && pointer.x <= btn.x + buttonWidth &&
        pointer.y >= btn.y && pointer.y <= btn.y + buttonHeight
      ) {
        this.tryBuyUpgrade(btn.upgrade);
        return true;
      }
    }
    return false;
  }

  private tryBuyUpgrade(upgrade: UpgradeDef): void {
    const currentLevel = this.state.upgrades[upgrade.key];
    if (isUpgradeMaxed(upgrade, currentLevel)) return;

    const cost = getUpgradeCost(upgrade, currentLevel);
    if (this.state.score < cost) return;

    this.state.score -= cost;
    this.state.upgrades[upgrade.key] += 1;
    setPlayerState(this.registry, this.state);

    audioManager.playPowerUp();

    this.scoreText.setText(`CREDITS: ${this.state.score}`);
    this.refreshButtons();
  }

  private refreshButtons(): void {
    const buttonWidth = 240;
    const buttonHeight = 60;

    for (const btn of this.buttons) {
      const currentLevel = this.state.upgrades[btn.upgrade.key];
      const cost = getUpgradeCost(btn.upgrade, currentLevel);
      const maxed = isUpgradeMaxed(btn.upgrade, currentLevel);
      const canAfford = this.state.score >= cost;

      this.drawButtonBg(btn.bg, buttonWidth, buttonHeight, canAfford && !maxed);

      btn.text.setColor(canAfford && !maxed ? '#ffffff' : '#666666');
      btn.levelText.setText(`${btn.upgrade.description} [${currentLevel}/${btn.upgrade.maxLevel}]`);
      btn.costText.setText(maxed ? 'MAXED' : `${cost}`);
      btn.costText.setColor(maxed ? '#44ff44' : canAfford ? '#ffcc00' : '#664444');
    }
  }
}
