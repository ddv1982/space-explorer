import Phaser from 'phaser';
import type { SaveSlotId, SaveSlotViewModel } from '../../systems/SaveSlotStorage';
import { createActionButtonControl, type ActionButtonControl } from '../shared/actionButtonControl';
import { getVisualQualityProfile } from '../../config/visualQuality';
import { scaleUiGlowAlpha } from '../../utils/renderingCompat';
import { addNeonTitle, drawNeonDivider, drawNeonFrame, fitNeonTitleFontSize, NEON, NEON_FONT, NEON_TEXT } from '../shared/neonUiTheme';
import { setSingleLineTextWithEllipsis } from '../shared/textFit';
import type { MenuLayoutPlan } from './layout';

interface MenuSaveSlotHandlers {
  onNewRun: () => void;
  onLoadSlot: (slotId: SaveSlotId) => void;
  onDeleteSlot: (slotId: SaveSlotId) => void;
}

export interface MenuSaveSlotPanel {
  refresh: (slots: SaveSlotViewModel[]) => void;
  setStatus: (message: string, isError?: boolean) => void;
  destroy: () => void;
}

export function createMenuBackdrop(scene: Phaser.Scene, plan: MenuLayoutPlan, accentColor: number): void {
  const width = Number(scene.scale.width);
  const height = Number(scene.scale.height);
  const atmosphere = getVisualQualityProfile().menuAtmosphere;
  const grid = scene.add.graphics();

  grid.fillStyle(0x01040a, 0.46);
  grid.fillRect(0, 0, width, height);
  grid.fillStyle(accentColor, scaleUiGlowAlpha(0.05));
  grid.fillCircle(plan.centerX, plan.outerFrameY + plan.outerFrameHeight + 20, Math.min(220, plan.outerFrameWidth * 0.28));
  grid.lineStyle(1, NEON.blue, scaleUiGlowAlpha(0.07));
  const scanStep = atmosphere >= 3 ? 22 : atmosphere >= 2 ? 28 : 36;
  for (let y = 0; y < height; y += scanStep) {
    grid.lineBetween(0, y, width, y);
  }
  for (let x = 0; x < width; x += scanStep * 2) {
    grid.lineBetween(x, 0, x, height);
  }

  if (!plan.veryShortCompact) {
    const dartX = plan.outerFrameX + 56;
    const dartY = plan.outerFrameY + 58;
    grid.lineStyle(1.5, NEON.cyan, scaleUiGlowAlpha(0.35));
    grid.beginPath();
    grid.moveTo(dartX, dartY - 16);
    grid.lineTo(dartX + 12, dartY + 10);
    grid.lineTo(dartX, dartY + 6);
    grid.lineTo(dartX - 12, dartY + 10);
    grid.closePath();
    grid.strokePath();
    grid.fillStyle(NEON.cyan, scaleUiGlowAlpha(0.08));
    grid.fillPath();
  }

  drawNeonFrame(grid, plan.outerFrameX, plan.outerFrameY, plan.outerFrameWidth, plan.outerFrameHeight, {
    accentColor,
    fillAlpha: 0.16,
    strokeAlpha: 0.86,
    cornerCut: 28,
    glow: true,
  });
  drawNeonDivider(grid, plan.centerX, plan.outerFrameY + 34, Math.min(560, plan.outerFrameWidth - 120), NEON.blue);
  drawNeonDivider(grid, plan.centerX, plan.outerFrameY + plan.outerFrameHeight - 34, Math.min(560, plan.outerFrameWidth - 120), NEON.cyan);
  grid.setDepth(4);
}

export function createMenuTitle(scene: Phaser.Scene, plan: MenuLayoutPlan): void {
  if (plan.eyebrowY > 0 && plan.eyebrowY < plan.titleY - 8) {
    scene.add
      .text(plan.centerX, plan.eyebrowY, 'COMMAND DECK', {
        fontSize: plan.compact ? '10px' : '12px',
        color: NEON_TEXT.cyan,
        fontFamily: NEON_FONT.mono,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(12);
  }

  const desiredTitleSize = plan.shortLandscape ? 30 : plan.veryShortCompact ? 48 : plan.outerFrameWidth < 500 ? 42 : plan.compact ? 64 : 86;
  const titleSize = fitNeonTitleFontSize(scene, 'SPACE EXPLORER', desiredTitleSize, Math.max(180, plan.outerFrameWidth - 96));
  const titleText = addNeonTitle(scene, plan.centerX, plan.titleY, 'SPACE EXPLORER', titleSize, 11);

  const wings = scene.add.graphics();
  const halfTitleWidth = titleText.width / 2;
  const wingGap = plan.veryShortCompact ? 12 : 20;
  const wingSpan = plan.veryShortCompact ? 20 : plan.compact ? 40 : 60;
  wings.lineStyle(1, NEON.cyan, 0.55);
  wings.lineBetween(plan.centerX - halfTitleWidth - wingGap - wingSpan, plan.titleY, plan.centerX - halfTitleWidth - wingGap, plan.titleY);
  wings.lineBetween(plan.centerX + halfTitleWidth + wingGap, plan.titleY, plan.centerX + halfTitleWidth + wingGap + wingSpan, plan.titleY);
  wings.lineStyle(1, NEON.blue, scaleUiGlowAlpha(0.4));
  wings.lineBetween(plan.centerX - halfTitleWidth - wingGap - wingSpan + 4, plan.titleY - 5, plan.centerX - halfTitleWidth - wingGap - 4, plan.titleY - 5);
  wings.lineBetween(plan.centerX + halfTitleWidth + wingGap + 4, plan.titleY - 5, plan.centerX + halfTitleWidth + wingGap + wingSpan - 4, plan.titleY - 5);
  wings.lineStyle(1, NEON.cyanBright, scaleUiGlowAlpha(0.35));
  wings.lineBetween(plan.centerX - halfTitleWidth - wingGap - wingSpan + 8, plan.titleY + 5, plan.centerX - halfTitleWidth - wingGap, plan.titleY + 5);
  wings.lineBetween(plan.centerX + halfTitleWidth + wingGap, plan.titleY + 5, plan.centerX + halfTitleWidth + wingGap + wingSpan - 8, plan.titleY + 5);
  wings.setDepth(12);

  scene.add
    .text(plan.centerX, plan.subtitleY, 'Select a session to begin your mission.', {
      fontSize: plan.veryShortCompact ? '12px' : plan.compact ? '14px' : '16px',
      color: NEON_TEXT.secondary,
      fontFamily: NEON_FONT.mono,
      wordWrap: { width: Math.max(220, plan.outerFrameWidth - 96) },
      align: 'center',
    })
    .setOrigin(0.5)
    .setDepth(12);
}

export function createSaveSlotEntryPanel(
  scene: Phaser.Scene,
  plan: MenuLayoutPlan,
  _accentColor: number,
  handlers: MenuSaveSlotHandlers,
  storageAvailable: boolean,
): MenuSaveSlotPanel {
  const tileTextMaxWidth = Math.max(12, plan.tileWidth - 20);
  const compact = plan.tileHeight < 150;
  const veryCompact = plan.tileHeight <= 76;

  const tiles = [0, 1, 2, 3].map((i) => {
    const isNewRun = i === 0;
    const slotId = isNewRun ? null : (`slot-${i}` as SaveSlotId);
    const tilePosition = plan.tilePositions[i] ?? { x: plan.centerX - plan.tileWidth / 2, y: plan.tileRowY };
    const tx = tilePosition.x;
    const ty = tilePosition.y;

    // Button with no built-in label so we can layout icon + text ourselves
    const button = createActionButtonControl(scene, {
      label: '',
      width: plan.tileWidth,
      height: plan.tileHeight,
      variant: isNewRun ? 'primary' : 'secondary',
      fontSize: '15px',
      onClick: () => {
        if (isNewRun) handlers.onNewRun();
        else if (slotId) handlers.onLoadSlot(slotId);
      },
    });
    button.setPosition(tx, ty);
    button.setDepth(11);

    // Vertical layout inside tile: icon → label → subtext
    const iconY = ty + (veryCompact ? 17 : compact ? 32 : 48);
    const labelY = ty + (veryCompact ? 40 : compact ? 62 : 90);
    const subtextY = ty + (veryCompact ? 57 : compact ? 80 : 118);

    const iconG = scene.add.graphics();
    const cx = tx + plan.tileWidth / 2;
    drawNeonFrame(iconG, tx + 4, ty + 4, plan.tileWidth - 8, plan.tileHeight - 8, {
      accentColor: isNewRun ? NEON.cyan : NEON.purple,
      fillAlpha: 0,
      strokeAlpha: 0.28,
      cornerCut: 8,
      glow: false,
    });
    if (isNewRun) {
      const cy = iconY;
      const sz = compact ? 14 : 20;
      iconG.lineStyle(2, NEON.cyan, 0.95);
      iconG.beginPath();
      iconG.moveTo(cx - sz, cy + sz * 0.75);
      iconG.lineTo(cx + sz * 1.1, cy);
      iconG.lineTo(cx - sz, cy - sz * 0.75);
      iconG.closePath();
      iconG.strokePath();
      iconG.fillStyle(NEON.cyan, 0.22);
      iconG.fillPath();
    } else {
      const cy = iconY;
      const w = compact ? 28 : 36;
      const h = compact ? 26 : 32;
      iconG.lineStyle(1.5, NEON.purple, 0.9);
      iconG.strokeRect(cx - w / 2, cy - h / 2, w, h);
      iconG.fillStyle(NEON.purple, 0.2);
      iconG.fillRect(cx - w * 0.35, cy - h / 2, w * 0.7, h * 0.35);
      iconG.strokeRect(cx - w * 0.35, cy - h / 2, w * 0.7, h * 0.35);
      iconG.lineStyle(1, NEON.purple, 0.5);
      iconG.strokeRect(cx - w * 0.4, cy + 2, w * 0.8, h * 0.3);
    }
    iconG.setDepth(12);

    const labelText = scene.add.text(tx + plan.tileWidth / 2, labelY, isNewRun ? 'NEW RUN' : `SLOT ${i}`, {
      fontSize: compact ? '13px' : '15px',
      color: isNewRun ? '#f2fbff' : '#e2f3ff',
      fontFamily: NEON_FONT.mono,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(12);

    const subtext = scene.add.text(tx + plan.tileWidth / 2, subtextY, isNewRun ? 'START FRESH' : 'EMPTY', {
      fontSize: compact ? '10px' : '11px',
      color: NEON_TEXT.muted,
      fontFamily: NEON_FONT.mono,
    }).setOrigin(0.5).setDepth(12);

    let deleteBtn: ActionButtonControl | null = null;
    if (!isNewRun) {
      deleteBtn = createActionButtonControl(scene, {
        label: 'DEL',
        width: 44,
        height: 20,
        variant: 'danger',
        fontSize: '10px',
        onClick: () => {
          if (slotId) handlers.onDeleteSlot(slotId);
        },
      });
      deleteBtn.setPosition(tx + plan.tileWidth - 48, ty + 4);
      deleteBtn.setVisible(false);
      deleteBtn.setDepth(13);
    }

    const applyTileText = (title: string, subtitle: string): void => {
      setSingleLineTextWithEllipsis(labelText, title, tileTextMaxWidth, isNewRun ? 'NEW RUN' : `SLOT ${i}`);
      setSingleLineTextWithEllipsis(subtext, subtitle, tileTextMaxWidth, isNewRun ? 'START FRESH' : 'EMPTY');
    };

    applyTileText(isNewRun ? 'NEW RUN' : `SLOT ${i}`, isNewRun ? 'START FRESH' : 'EMPTY');

    return { button, labelText, subtext, slotId, iconG, deleteBtn, applyTileText };
  });

  const statusText = scene.add
    .text(plan.centerX, plan.statusY, '', {
      fontSize: '12px',
      color: storageAvailable ? NEON_TEXT.muted : NEON_TEXT.danger,
      fontFamily: NEON_FONT.mono,
    })
    .setOrigin(0.5)
    .setDepth(11);

  const refresh = (slots: SaveSlotViewModel[]): void => {
    tiles.forEach((t, i) => {
      if (i === 0) return;
      const model = slots.find((s) => s.id === t.slotId);
      if (model?.occupied) {
        t.applyTileText(model.title, model.savedAtLabel);
        t.subtext.setColor(NEON_TEXT.cyan);
        t.button.setEnabled(storageAvailable);
        t.deleteBtn?.setVisible(true);
      } else {
        t.applyTileText(`SLOT ${i}`, 'EMPTY');
        t.subtext.setColor(NEON_TEXT.muted);
        t.button.setEnabled(false);
        t.deleteBtn?.setVisible(false);
      }
    });
  };

  const setStatus = (message: string, isError = false): void => {
    statusText.setColor(isError ? NEON_TEXT.danger : NEON_TEXT.muted);
    statusText.setText(message);
  };

  return {
    refresh,
    setStatus,
    destroy: () => {
      tiles.forEach((t) => {
        t.button.destroy();
        t.labelText.destroy();
        t.subtext.destroy();
        t.iconG.destroy();
        t.deleteBtn?.destroy();
      });
      statusText.destroy();
    },
  };
}
