import Phaser from 'phaser';
import type { LevelConfig } from '../config/LevelsConfig';
import { colorToHexString, mixColor } from '../utils/colorUtils';
import type { ChainState } from './ScoreManager';
import { HudAnnouncementTweens } from './hud/announcementTweens';
import { resolveChainReadout } from './hud/chainReadout';
import {
  renderBossBar,
  renderChainBadge,
  renderHullCells,
  renderProgressBar,
  renderReserveIcons,
  renderShieldPips,
  renderSurgeBar,
} from './hud/meterRenderers';
import { getLayoutMetrics, shouldRenderMeterRatio, type HudLayoutMetrics } from './hud/statusBarLayout';
import {
  ANNOUNCEMENT_GLOW_PADDING,
  createHudWidgets,
  relayoutHudWidgets,
  type HudWidgets,
} from './hud/bootstrapRelayout';

const DEFAULT_ACCENT = 0x54dcff;

export class HUD {
  private scene!: Phaser.Scene;
  private widgets!: HudWidgets;
  private announcementTweens!: HudAnnouncementTweens;
  private accentColor = DEFAULT_ACCENT;
  private bossVisible = false;
  private currentHp: number | null = null;
  private currentMaxHp: number | null = null;
  private currentLives: number | null = null;
  private currentShields: number | null = null;
  private currentScore: number | null = null;
  private currentProgress: number | null = null;
  private currentChainLabel: string | null = null;
  private currentChainColor = '';
  private currentSurgeRatio: number | null = null;
  private currentBossHp: number | null = null;
  private currentBossMaxHp: number | null = null;

  create(scene: Phaser.Scene, levelConfig?: LevelConfig): void {
    this.scene = scene;
    this.currentHp = null;
    this.currentMaxHp = null;
    this.currentLives = null;
    this.currentShields = null;
    this.currentScore = null;
    this.currentProgress = null;
    this.currentChainLabel = null;
    this.currentChainColor = '';
    this.currentSurgeRatio = null;
    this.currentBossHp = null;
    this.currentBossMaxHp = null;
    this.bossVisible = false;

    const levelAccent = levelConfig?.accentColor ?? DEFAULT_ACCENT;
    this.accentColor = mixColor(DEFAULT_ACCENT, levelAccent, 0.8);
    this.widgets = createHudWidgets({
      scene,
      labelColor: colorToHexString(mixColor(0xd8f4ff, levelAccent, 0.28)),
      sectorColor: colorToHexString(mixColor(0x7fdcff, levelAccent, 0.62)),
    });

    this.announcementTweens = new HudAnnouncementTweens({
      scene: this.scene,
      announcementText: this.widgets.announcementText,
      announcementRule: this.widgets.announcementRule,
      glowPadding: ANNOUNCEMENT_GLOW_PADDING,
      sectorText: this.widgets.sectorText,
      levelText: this.widgets.levelText,
      getLayoutMetrics: () => this.layout(),
    });

    for (const widget of Object.values(this.widgets)) widget.setScrollFactor(0);
    this.relayout();
  }

  relayout(): void {
    if (!this.scene) {
      return;
    }

    const layout = this.layout();
    relayoutHudWidgets(this.widgets, layout, this.accentColor);
    this.announcementTweens.relayout(layout);

    renderHullCells(this.widgets.hullCells, this.currentHp, this.currentMaxHp, layout);
    renderReserveIcons(this.widgets.reserveIcons, this.currentLives ?? 0, layout);
    renderShieldPips(this.widgets.shieldPips, this.currentShields ?? 0, layout);
    renderSurgeBar(this.widgets.surgeFill, this.currentSurgeRatio, layout);
    renderProgressBar(this.widgets.progressFill, this.currentProgress, this.accentColor, layout);
    this.renderChainBadge();
    this.renderBossBar();
  }

  showLevelAnnouncement(levelName: string, levelNumber: number): void {
    this.announcementTweens.showLevelAnnouncement(levelName, levelNumber);
  }

  updateShields(shields: number): void {
    if (this.currentShields === shields) {
      return;
    }

    this.currentShields = shields;
    renderShieldPips(this.widgets.shieldPips, shields, this.layout());
  }

  showBossBar(name: string = 'BOSS'): void {
    if (this.bossVisible) return;

    this.bossVisible = true;
    this.widgets.bossBarBg.setVisible(true);
    this.widgets.bossBarFill.setVisible(true);
    this.widgets.bossNameText.setVisible(true);
    this.widgets.bossNameText.setText(name.toUpperCase());
    this.renderBossBar();
  }

  hideBossBar(): void {
    this.bossVisible = false;
    this.currentBossHp = null;
    this.currentBossMaxHp = null;
    this.widgets.bossBarBg.clear();
    this.widgets.bossBarFill.clear();
    this.widgets.bossBarBg.setVisible(false);
    this.widgets.bossBarFill.setVisible(false);
    this.widgets.bossNameText.setVisible(false);
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

  update(hp: number, maxHp: number, score: number, progress: number, lives: number): void {
    if (this.currentHp !== hp || this.currentMaxHp !== maxHp) {
      this.currentHp = hp;
      this.currentMaxHp = maxHp;
      this.widgets.hpText.setText(`${hp}/${maxHp}`);
      renderHullCells(this.widgets.hullCells, hp, maxHp, this.layout());
    }

    if (this.currentLives !== lives) {
      this.currentLives = lives;
      renderReserveIcons(this.widgets.reserveIcons, lives, this.layout());
    }

    if (this.currentScore !== score) {
      this.widgets.scoreText.setText(score.toString().padStart(8, '0'));
      this.currentScore = score;
    }

    const clampedProgress = Math.min(progress, 1);
    const layout = this.layout();
    if (
      this.currentProgress === null ||
      Math.abs(clampedProgress - this.currentProgress) >= 1 / layout.progressWidth ||
      clampedProgress === 0 ||
      clampedProgress === 1
    ) {
      this.currentProgress = clampedProgress;
      renderProgressBar(this.widgets.progressFill, clampedProgress, this.accentColor, layout);
    }
  }

  updateChainMeter(chainState: ChainState): void {
    const readout = resolveChainReadout(chainState);

    if (readout.label === this.currentChainLabel) {
      return;
    }

    this.currentChainLabel = readout.label;
    this.currentChainColor = readout.color;
    this.widgets.chainText.setText(readout.label);
    this.widgets.chainText.setColor(readout.color);
    this.widgets.chainText.setVisible(readout.label !== '');
    this.renderChainBadge();
  }

  updateSurge(ratio: number): void {
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const layout = this.layout();

    if (!shouldRenderMeterRatio(this.currentSurgeRatio, clampedRatio, 1 / layout.hullWidth)) {
      return;
    }

    this.currentSurgeRatio = clampedRatio;
    renderSurgeBar(this.widgets.surgeFill, clampedRatio, layout);
  }

  showBossWarning(): void {
    this.announcementTweens.showBossWarning();
  }

  showBossPhaseAnnouncement(phase: number): void {
    this.announcementTweens.showBossPhaseAnnouncement(phase);
  }

  showHelperWingAnnouncement(helperCount: number): void {
    this.announcementTweens.showHelperWingAnnouncement(helperCount);
  }

  showPicketOnlineAnnouncement(): void {
    this.announcementTweens.showPicketOnlineAnnouncement();
  }

  showEliteWaveAnnouncement(title?: string): void {
    this.announcementTweens.showEliteWaveAnnouncement(title);
  }

  showHelperWingDepletedAnnouncement(): void {
    this.announcementTweens.showHelperWingDepletedAnnouncement();
  }

  private layout(): HudLayoutMetrics {
    return getLayoutMetrics(this.scene);
  }

  private renderChainBadge(): void {
    const { chainBadge, chainText } = this.widgets;
    renderChainBadge(
      chainBadge,
      this.currentChainLabel ? chainText.getBounds() : null,
      Phaser.Display.Color.HexStringToColor(this.currentChainColor || '#ffffff').color
    );
  }

  private renderBossBar(): void {
    renderBossBar(
      this.widgets.bossBarBg,
      this.widgets.bossBarFill,
      {
        visible: this.bossVisible,
        hp: this.currentBossHp,
        maxHp: this.currentBossMaxHp,
      },
      this.layout()
    );
  }
}
