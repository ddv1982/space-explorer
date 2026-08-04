import Phaser from 'phaser';
import type { LevelConfig } from '../config/LevelsConfig';
import { colorToHexString, mixColor } from '../utils/colorUtils';
import { UI_FONT_MONO } from '../utils/uiFonts';
import type { ChainState } from './ScoreManager';
import { HudAnnouncementTweens } from './hud/announcementTweens';
import { resolveChainReadout } from './hud/chainReadout';
import {
  getLayoutMetrics,
  renderBossBar,
  renderHpBar,
  renderProgressBar,
  renderSurgeBar,
  shouldRenderMeterRatio,
} from './hud/statusBarLayout';
import { HudShieldIconRenderer } from './hud/shieldIconRenderer';
import {
  createHudWidgets,
  relayoutHudWidgets,
} from './hud/bootstrapRelayout';

export class HUD {
  private scene!: Phaser.Scene;
  private topBarPanel!: Phaser.GameObjects.Graphics;
  private hpBarBg!: Phaser.GameObjects.Graphics;
  private hpBarFill!: Phaser.GameObjects.Graphics;
  private hpLabel!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private livesLabel!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private sectorText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private progressBg!: Phaser.GameObjects.Graphics;
  private progressFill!: Phaser.GameObjects.Graphics;
  private bossBarBg!: Phaser.GameObjects.Graphics;
  private bossBarFill!: Phaser.GameObjects.Graphics;
  private bossNameText!: Phaser.GameObjects.Text;
  private announcementText!: Phaser.GameObjects.Text;
  private announcementTween: Phaser.Tweens.Tween | null = null;
  private announcementTweens!: HudAnnouncementTweens;
  private chainText!: Phaser.GameObjects.Text;
  private surgeBg!: Phaser.GameObjects.Graphics;
  private surgeFill!: Phaser.GameObjects.Graphics;
  private currentChainLabel: string | null = null;
  private currentSurgeRatio: number | null = null;

  private readonly baseHpBarWidth = 200;
  private readonly hpBarHeight = 16;
  private readonly baseProgressWidth = 300;
  private readonly progressHeight = 6;
  private readonly baseBossBarWidth = 400;
  private readonly bossBarHeight = 10;
  private bossVisible: boolean = false;
  private shieldIconRenderer = new HudShieldIconRenderer();
  private currentHp: number | null = null;
  private currentMaxHp: number | null = null;
  private currentLives: number | null = null;
  private currentScore: number | null = null;
  private currentProgress: number | null = null;
  private currentBossHp: number | null = null;
  private currentBossMaxHp: number | null = null;
  private currentBossGuardRatio: number | null = null;
  private currentBossGuardBroken = false;
  private panelStrokeColor = 0x3f6b8b;
  private hpBorderColor = 0x8ee8ff;
  private progressBorderColor = 0x7fdcff;
  private progressFillColor = 0x54dcff;

  create(scene: Phaser.Scene, levelConfig?: LevelConfig): void {
    this.scene = scene;
    this.shieldIconRenderer.resetShields();
    this.currentHp = null;
    this.currentMaxHp = null;
    this.currentLives = null;
    this.currentScore = null;
    this.currentProgress = null;
    this.currentBossHp = null;
    this.currentBossMaxHp = null;
    this.currentBossGuardRatio = null;
    this.currentBossGuardBroken = false;
    this.bossVisible = false;
    this.announcementTween = null;
    this.currentChainLabel = null;
    this.currentSurgeRatio = null;

    const accentColor = levelConfig?.accentColor ?? 0x54dcff;
    const labelColor = colorToHexString(mixColor(0xd8f4ff, accentColor, 0.28));
    const sectorColor = colorToHexString(mixColor(0x7fdcff, accentColor, 0.62));
    this.panelStrokeColor = mixColor(0x334466, accentColor, 0.42);
    this.hpBorderColor = mixColor(0x8ee8ff, accentColor, 0.48);
    this.progressBorderColor = mixColor(0x7fdcff, accentColor, 0.72);
    this.progressFillColor = mixColor(0x54dcff, accentColor, 0.86);

    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '11px',
      color: labelColor,
      fontFamily: UI_FONT_MONO,
      fontStyle: 'bold',
      stroke: '#040b12',
      strokeThickness: 2,
    };
    const valueStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '12px',
      color: '#f6fbff',
      fontFamily: UI_FONT_MONO,
      fontStyle: 'bold',
      stroke: '#040b12',
      strokeThickness: 2,
    };

    ({
      topBarPanel: this.topBarPanel,
      hpBarBg: this.hpBarBg,
      hpBarFill: this.hpBarFill,
      hpLabel: this.hpLabel,
      hpText: this.hpText,
      livesLabel: this.livesLabel,
      livesText: this.livesText,
      scoreText: this.scoreText,
      sectorText: this.sectorText,
      levelText: this.levelText,
      progressBg: this.progressBg,
      progressFill: this.progressFill,
      announcementText: this.announcementText,
      bossBarBg: this.bossBarBg,
      bossBarFill: this.bossBarFill,
      bossNameText: this.bossNameText,
      chainText: this.chainText,
      surgeBg: this.surgeBg,
      surgeFill: this.surgeFill,
    } = createHudWidgets({
      scene,
      labelStyle,
      valueStyle,
      sectorColor,
    }));

    this.announcementTweens = new HudAnnouncementTweens({
      scene: this.scene,
      announcementText: this.announcementText,
      sectorText: this.sectorText,
      levelText: this.levelText,
      getLayoutMetrics: () =>
        getLayoutMetrics(this.scene, this.baseHpBarWidth, this.baseProgressWidth, this.baseBossBarWidth),
      getAnnouncementTween: () => this.announcementTween,
      setAnnouncementTween: (tween) => {
        this.announcementTween = tween;
      },
    });

    this.setScrollFactor(0);
    this.relayout();
  }

  relayout(): void {
    if (!this.scene) {
      return;
    }

    this.announcementTween = relayoutHudWidgets({
      scene: this.scene,
      baseHpBarWidth: this.baseHpBarWidth,
      baseProgressWidth: this.baseProgressWidth,
      baseBossBarWidth: this.baseBossBarWidth,
      topBarPanel: this.topBarPanel,
      hpBarBg: this.hpBarBg,
      hpLabel: this.hpLabel,
      hpText: this.hpText,
      livesLabel: this.livesLabel,
      livesText: this.livesText,
      scoreText: this.scoreText,
      sectorText: this.sectorText,
      levelText: this.levelText,
      progressBg: this.progressBg,
      announcementText: this.announcementText,
      bossNameText: this.bossNameText,
      chainText: this.chainText,
      surgeBg: this.surgeBg,
      hpBarHeight: this.hpBarHeight,
      progressHeight: this.progressHeight,
      panelStrokeColor: this.panelStrokeColor,
      hpBorderColor: this.hpBorderColor,
      progressBorderColor: this.progressBorderColor,
      announcementTween: this.announcementTween,
      setAnnouncementTween: (tween) => {
        this.announcementTween = tween;
      },
    });

    this.renderHpBar();
    this.renderProgressBar();
    this.renderShieldIcons();
    this.renderBossBar();
    this.renderSurge();
  }

  showLevelAnnouncement(levelName: string, levelNumber: number): void {
    this.announcementTweens.showLevelAnnouncement(levelName, levelNumber);
  }

  updateShields(shields: number): void {
    this.shieldIconRenderer.updateShields(shields, () => this.renderShieldIcons());
  }

  private setScrollFactor(factor: number): void {
    this.topBarPanel.setScrollFactor(factor);
    this.hpBarBg.setScrollFactor(factor);
    this.hpBarFill.setScrollFactor(factor);
    this.hpLabel.setScrollFactor(factor);
    this.hpText.setScrollFactor(factor);
    this.livesLabel.setScrollFactor(factor);
    this.livesText.setScrollFactor(factor);
    this.scoreText.setScrollFactor(factor);
    this.sectorText.setScrollFactor(factor);
    this.levelText.setScrollFactor(factor);
    this.progressBg.setScrollFactor(factor);
    this.progressFill.setScrollFactor(factor);
    this.bossBarBg.setScrollFactor(factor);
    this.bossBarFill.setScrollFactor(factor);
    this.bossNameText.setScrollFactor(factor);
    this.announcementText.setScrollFactor(factor);
    this.chainText.setScrollFactor(factor);
    this.surgeBg.setScrollFactor(factor);
    this.surgeFill.setScrollFactor(factor);
  }

  showBossBar(name: string = 'BOSS'): void {
    if (this.bossVisible) return;

    this.bossVisible = true;
    this.bossBarBg.setVisible(true);
    this.bossBarFill.setVisible(true);
    this.bossNameText.setVisible(true);
    this.bossNameText.setText(name.toUpperCase());
    this.renderBossBar();
  }

  hideBossBar(): void {
    this.bossVisible = false;
    this.currentBossHp = null;
    this.currentBossMaxHp = null;
    this.currentBossGuardRatio = null;
    this.currentBossGuardBroken = false;
    this.bossBarBg.clear();
    this.bossBarFill.clear();
    this.bossBarBg.setVisible(false);
    this.bossBarFill.setVisible(false);
    this.bossNameText.setVisible(false);
  }

  updateBossHp(hp: number, maxHp: number): void {
    if (!this.bossVisible) return;

    if (this.currentBossHp === hp && this.currentBossMaxHp === maxHp) {
      return;
    }

    this.currentBossHp = hp;
    this.currentBossMaxHp = maxHp;
    this.renderBossBar();
  }

  updateBossGuard(ratio: number | null, broken: boolean): void {
    if (!this.bossVisible) return;

    const nextRatio = ratio === null ? null : Math.max(0, Math.min(1, ratio));
    if (this.currentBossGuardRatio === nextRatio && this.currentBossGuardBroken === broken) {
      return;
    }

    this.currentBossGuardRatio = nextRatio;
    this.currentBossGuardBroken = broken;
    this.renderBossBar();
  }

  update(hp: number, maxHp: number, score: number, progress: number, lives: number): void {
    const hpChanged = this.currentHp !== hp || this.currentMaxHp !== maxHp;

    if (hpChanged) {
      this.currentHp = hp;
      this.currentMaxHp = maxHp;
      this.hpText.setText(`${hp}/${maxHp}`);
      this.renderHpBar();
    }

    if (this.currentLives !== lives) {
      this.livesText.setText(lives.toString());
      this.currentLives = lives;
    }

    if (this.currentScore !== score) {
      this.scoreText.setText(score.toString().padStart(8, '0'));
      this.currentScore = score;
    }

    const clampedProgress = Math.min(progress, 1);
    const progressStep =
      1 /
      getLayoutMetrics(this.scene, this.baseHpBarWidth, this.baseProgressWidth, this.baseBossBarWidth)
        .progressWidth;
    if (
      this.currentProgress === null ||
      Math.abs(clampedProgress - this.currentProgress) >= progressStep ||
      clampedProgress === 0 ||
      clampedProgress === 1
    ) {
      this.currentProgress = clampedProgress;
      this.renderProgressBar();
    }
  }

  updateChainMeter(chainState: ChainState): void {
    const readout = resolveChainReadout(chainState);

    if (readout.label === this.currentChainLabel) {
      return;
    }

    this.currentChainLabel = readout.label;
    this.chainText.setText(readout.label);
    this.chainText.setColor(readout.color);
    this.chainText.setVisible(readout.label !== '');
  }

  updateSurge(ratio: number): void {
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const layout = getLayoutMetrics(this.scene, this.baseHpBarWidth, this.baseProgressWidth, this.baseBossBarWidth);
    const surgeStep = 1 / Math.max(1, layout.hpBarWidth - 26);

    if (!shouldRenderMeterRatio(this.currentSurgeRatio, clampedRatio, surgeStep)) {
      return;
    }

    this.currentSurgeRatio = clampedRatio;
    this.renderSurge();
  }

  private renderSurge(): void {
    renderSurgeBar({
      surgeFill: this.surgeFill,
      currentSurgeRatio: this.currentSurgeRatio,
      hpBarHeight: this.hpBarHeight,
      layout: getLayoutMetrics(this.scene, this.baseHpBarWidth, this.baseProgressWidth, this.baseBossBarWidth),
    });
  }

  showBossWarning(): void {
    this.announcementTweens.showBossWarning();
  }

  showBossPhaseAnnouncement(phase: number): void {
    this.announcementTweens.showBossPhaseAnnouncement(phase);
  }

  showBossGuardBreakAnnouncement(): void {
    this.announcementTweens.showBossGuardBreakAnnouncement();
  }

  showHelperWingAnnouncement(helperCount: number): void {
    this.announcementTweens.showHelperWingAnnouncement(helperCount);
  }

  showPicketOnlineAnnouncement(): void {
    this.announcementTweens.showPicketOnlineAnnouncement();
  }

  showEliteWaveAnnouncement(): void {
    this.announcementTweens.showEliteWaveAnnouncement();
  }

  showHelperWingDepletedAnnouncement(): void {
    this.announcementTweens.showHelperWingDepletedAnnouncement();
  }

  private renderHpBar(): void {
    renderHpBar({
      hpBarFill: this.hpBarFill,
      currentHp: this.currentHp,
      currentMaxHp: this.currentMaxHp,
      hpBarHeight: this.hpBarHeight,
      layout: getLayoutMetrics(this.scene, this.baseHpBarWidth, this.baseProgressWidth, this.baseBossBarWidth),
    });
  }

  private renderProgressBar(): void {
    renderProgressBar({
      progressFill: this.progressFill,
      currentProgress: this.currentProgress,
      progressHeight: this.progressHeight,
      progressFillColor: this.progressFillColor,
      layout: getLayoutMetrics(this.scene, this.baseHpBarWidth, this.baseProgressWidth, this.baseBossBarWidth),
    });
  }

  private renderShieldIcons(): void {
    const layout = getLayoutMetrics(this.scene, this.baseHpBarWidth, this.baseProgressWidth, this.baseBossBarWidth);
    this.shieldIconRenderer.renderShieldIcons({
      scene: this.scene,
      hpBarHeight: this.hpBarHeight,
      layout,
    });
  }

  private renderBossBar(): void {
    renderBossBar({
      bossBarBg: this.bossBarBg,
      bossBarFill: this.bossBarFill,
      bossVisible: this.bossVisible,
      currentBossHp: this.currentBossHp,
      currentBossMaxHp: this.currentBossMaxHp,
      bossBarHeight: this.bossBarHeight,
      guardRatio: this.currentBossGuardRatio ?? undefined,
      guardBroken: this.currentBossGuardBroken,
      layout: getLayoutMetrics(this.scene, this.baseHpBarWidth, this.baseProgressWidth, this.baseBossBarWidth),
    });
  }
}
