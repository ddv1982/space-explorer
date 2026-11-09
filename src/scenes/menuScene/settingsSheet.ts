import type Phaser from 'phaser';
import { createActionButtonControl } from '../shared/actionButtonControl';
import { drawNeonDivider, drawNeonFrame, NEON, NEON_FONT, NEON_TEXT } from '../shared/neonUiTheme';
import type { SettingsPanel } from '../shared/settingsPanel';
import type { MenuLayoutPlan } from './layout';

const SHEET_DEPTH = 30;

export interface MenuSettingsSheet {
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
  destroy: () => void;
}

/**
 * A modal sheet over the home view that holds the shared settings panel (difficulty, quality and
 * the four audio sliders). A full-screen blocker swallows taps meant for the home view behind it.
 */
export function createMenuSettingsSheet(
  scene: Phaser.Scene,
  plan: MenuLayoutPlan,
  panel: SettingsPanel,
  onToggle: (open: boolean) => void
): MenuSettingsSheet {
  const modal = plan.settingsModal;
  const width = Number(scene.scale.width);
  const height = Number(scene.scale.height);

  const blocker = scene.add
    .rectangle(0, 0, width, height, 0x01040a, 0.78)
    .setOrigin(0)
    .setDepth(SHEET_DEPTH)
    .setInteractive();
  const frame = scene.add.graphics().setDepth(SHEET_DEPTH + 1);
  drawNeonFrame(frame, modal.x, modal.y, modal.width, modal.height, {
    accentColor: NEON.cyan,
    fillAlpha: 0.94,
    strokeAlpha: 0.9,
    cornerCut: 18,
    glow: true,
  });
  const dividerY = modal.titleY + modal.titleFontSize / 2 + 6;
  if (dividerY < modal.missionBand.top - 2) {
    drawNeonDivider(frame, plan.centerX, dividerY, Math.min(360, modal.width - 80), NEON.blue);
  }
  const title = scene.add
    .text(plan.centerX, modal.titleY, 'SETTINGS', {
      fontSize: `${modal.titleFontSize}px`,
      color: NEON_TEXT.title,
      fontFamily: NEON_FONT.display,
      fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setDepth(SHEET_DEPTH + 2);

  let open = false;
  const done = createActionButtonControl(scene, {
    label: 'DONE',
    width: modal.doneButton.width,
    height: modal.doneButton.height,
    variant: 'primary',
    fontSize: '15px',
    onClick: () => sheet.close(),
  });
  done.setPosition(modal.doneButton.x, modal.doneButton.y);
  done.setDepth(SHEET_DEPTH + 2);
  panel.setDepth(SHEET_DEPTH + 2);

  const setShown = (shown: boolean): void => {
    blocker.setVisible(shown);
    if (shown) blocker.setInteractive();
    else blocker.disableInteractive();
    frame.setVisible(shown);
    title.setVisible(shown);
    done.setVisible(shown);
    panel.setVisible(shown);
  };

  const sheet: MenuSettingsSheet = {
    open() {
      if (open) return;
      open = true;
      setShown(true);
      onToggle(true);
    },
    close() {
      if (!open) return;
      open = false;
      setShown(false);
      onToggle(false);
    },
    isOpen: () => open,
    destroy() {
      blocker.destroy();
      frame.destroy();
      title.destroy();
      done.destroy();
    },
  };
  setShown(false);
  return sheet;
}
