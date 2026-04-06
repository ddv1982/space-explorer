import Phaser from 'phaser';
import { getPlayerState, setPlayerState, advanceToNextLevel, PlayerStateData, setRunSummary } from '../systems/PlayerState';
import { getLevelConfig, isLastLevel } from '../config/LevelsConfig';
import { UpgradeBlockReason, UpgradeEvaluation, UpgradeKey, evaluateUpgrade, evaluateUpgrades, getUpgradeByKey } from '../config/UpgradesConfig';
import { centerHorizontally, getViewportLayout } from '../utils/layout';
import { WarpTransition } from '../systems/WarpTransition';
import { audioManager } from '../systems/AudioManager';

const UPGRADE_GRID_LAYOUT = {
  top: 380,
  columns: 2,
  buttonWidth: 240,
  buttonHeight: 60,
  spacingX: 32,
  spacingY: 16,
  textInsetX: 10,
  titleOffsetY: 8,
  descriptionOffsetY: 28,
  costInsetX: 10,
  borderRadius: 8,
};

interface UpgradeButton {
  bg: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  costText: Phaser.GameObjects.Text;
  levelText: Phaser.GameObjects.Text;
  upgradeKey: UpgradeKey;
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
    const layout = getViewportLayout(this);

    this.generatePlanetTexture();

    const completedLevelConfig = getLevelConfig(this.state.level);
    const nextLevelConfig = getLevelConfig(this.state.level + 1);

    this.add.text(layout.centerX, 50, completedLevelConfig.planetName, {
      fontSize: '20px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(layout.centerX, 85, 'PLANET APPROACHED', {
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(layout.centerX, 130, `LEVEL ${this.state.level} COMPLETE`, {
      fontSize: '18px',
      color: '#44ff88',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.scoreText = this.add.text(layout.centerX, 170, `CREDITS: ${this.state.score}`, {
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

    this.add.text(layout.centerX, layout.bottom - 60, continueLabel, {
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
          setRunSummary(this.registry, { finalScore: this.state.score, levelReached: this.state.level });
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
    const layout = getViewportLayout(this);
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

    this.add.image(layout.centerX, 270, key).setScale(1.5).setDepth(1);
  }

  private createUpgradeButtons(): void {
    const layout = getViewportLayout(this);
    const evaluations = evaluateUpgrades(this.state.level, this.state.score, this.state.upgrades);
    const gridWidth =
      UPGRADE_GRID_LAYOUT.buttonWidth * UPGRADE_GRID_LAYOUT.columns +
      UPGRADE_GRID_LAYOUT.spacingX * (UPGRADE_GRID_LAYOUT.columns - 1);
    const startX = centerHorizontally(layout, gridWidth);

    for (let i = 0; i < evaluations.length; i++) {
      const evaluation = evaluations[i];
      const { upgrade } = evaluation;

      const col = i % UPGRADE_GRID_LAYOUT.columns;
      const row = Math.floor(i / UPGRADE_GRID_LAYOUT.columns);
      const bx = startX + col * (UPGRADE_GRID_LAYOUT.buttonWidth + UPGRADE_GRID_LAYOUT.spacingX);
      const by = UPGRADE_GRID_LAYOUT.top + row * (UPGRADE_GRID_LAYOUT.buttonHeight + UPGRADE_GRID_LAYOUT.spacingY);

      const bg = this.add.graphics();
      this.drawButtonBg(bg, UPGRADE_GRID_LAYOUT.buttonWidth, UPGRADE_GRID_LAYOUT.buttonHeight, evaluation.canPurchase);
      bg.setPosition(bx, by);
      bg.setDepth(2);

      const text = this.add.text(bx + UPGRADE_GRID_LAYOUT.textInsetX, by + UPGRADE_GRID_LAYOUT.titleOffsetY, upgrade.name, {
        fontSize: '14px',
        color: evaluation.canPurchase ? '#ffffff' : '#666666',
        fontFamily: 'monospace',
      }).setDepth(3);

      const levelText = this.add.text(bx + UPGRADE_GRID_LAYOUT.textInsetX, by + UPGRADE_GRID_LAYOUT.descriptionOffsetY, this.getLevelText(evaluation), {
        fontSize: '11px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      }).setDepth(3);

      const costLabel = this.getCostLabel(evaluation);
      const costText = this.add.text(bx + UPGRADE_GRID_LAYOUT.buttonWidth - UPGRADE_GRID_LAYOUT.costInsetX, by + UPGRADE_GRID_LAYOUT.buttonHeight / 2, costLabel, {
        fontSize: '16px',
        color: this.getCostColor(evaluation.blockReason),
        fontFamily: 'monospace',
      }).setOrigin(1, 0.5).setDepth(3);

      this.buttons.push({ bg, text, costText, levelText, upgradeKey: upgrade.key, x: bx, y: by });
    }
  }

  private drawButtonBg(bg: Phaser.GameObjects.Graphics, w: number, h: number, active: boolean): void {
    bg.clear();
    bg.fillStyle(0x222244, 0.8);
    bg.fillRoundedRect(0, 0, w, h, UPGRADE_GRID_LAYOUT.borderRadius);
    bg.lineStyle(2, active ? 0x4488ff : 0x444466, 1);
    bg.strokeRoundedRect(0, 0, w, h, UPGRADE_GRID_LAYOUT.borderRadius);
  }

  private handleUpgradeClick(pointer: Phaser.Input.Pointer): boolean {
    for (const btn of this.buttons) {
      if (
        pointer.x >= btn.x && pointer.x <= btn.x + UPGRADE_GRID_LAYOUT.buttonWidth &&
        pointer.y >= btn.y && pointer.y <= btn.y + UPGRADE_GRID_LAYOUT.buttonHeight
      ) {
        this.tryBuyUpgrade(btn.upgradeKey);
        return true;
      }
    }
    return false;
  }

  private tryBuyUpgrade(upgradeKey: UpgradeKey): boolean {
    const button = this.buttons.find((entry) => entry.upgradeKey === upgradeKey);
    if (!button) {
      return false;
    }

    const evaluation = this.getButtonEvaluation(button);
    if (!evaluation.canPurchase) {
      return false;
    }

    this.state.score -= evaluation.cost;
    this.state.upgrades[upgradeKey] += 1;
    setPlayerState(this.registry, this.state);

    audioManager.playPowerUp();

    this.scoreText.setText(`CREDITS: ${this.state.score}`);
    this.refreshButtons();
    return true;
  }

  private refreshButtons(): void {
    for (const btn of this.buttons) {
      const evaluation = this.getButtonEvaluation(btn);

      this.drawButtonBg(btn.bg, UPGRADE_GRID_LAYOUT.buttonWidth, UPGRADE_GRID_LAYOUT.buttonHeight, evaluation.canPurchase);

      btn.text.setColor(evaluation.canPurchase ? '#ffffff' : '#666666');
      btn.levelText.setText(this.getLevelText(evaluation));
      btn.costText.setText(this.getCostLabel(evaluation));
      btn.costText.setColor(this.getCostColor(evaluation.blockReason));
    }
  }

  private getButtonEvaluation(button: UpgradeButton): UpgradeEvaluation {
    return evaluateUpgrade(
      getUpgradeByKey(button.upgradeKey),
      this.state.level,
      this.state.score,
      this.state.upgrades
    );
  }

  private getLevelText(evaluation: UpgradeEvaluation): string {
    const baseText = `${evaluation.upgrade.description} [${evaluation.currentLevel}/${evaluation.upgrade.maxLevel}]`;

    if (evaluation.blockReason === 'locked' && evaluation.unlockReason) {
      return `UNLOCK: ${evaluation.unlockReason}`;
    }

    if (evaluation.blockReason === 'progression') {
      return `${baseText} CAP ${evaluation.progressionLimit}`;
    }

    return baseText;
  }

  private getCostLabel(evaluation: UpgradeEvaluation): string {
    switch (evaluation.blockReason) {
      case 'maxed':
        return 'MAXED';
      case 'locked':
        return 'LOCKED';
      case 'progression':
        return `L${evaluation.progressionLimit}`;
      default:
        return `${evaluation.cost}`;
    }
  }

  private getCostColor(blockReason: UpgradeBlockReason): string {
    switch (blockReason) {
      case 'maxed':
        return '#44ff44';
      case 'locked':
      case 'progression':
        return '#888888';
      case 'credits':
        return '#664444';
      default:
        return '#ffcc00';
    }
  }
}
