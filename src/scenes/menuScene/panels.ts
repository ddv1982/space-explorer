import Phaser from 'phaser';
import type { SaveSlotId, SaveSlotViewModel } from '../../systems/SaveSlotStorage';
import { PARTICLE, generateEffectsParticleTextures } from '../../systems/effects/particleTextureFactory';
import { isTouchMobileDevice } from '../../utils/device';
import { withCanvasTexture } from '../../utils/generatedTexture';
import { scaleUiGlowAlpha } from '../../utils/renderingCompat';
import { createActionButtonControl } from '../shared/actionButtonControl';
import {
  addNeonTitle,
  fitNeonTitleFontSize,
  NEON,
  NEON_TEXT,
  neonLabelStyle,
  prefersReducedMotion,
} from '../shared/neonUiTheme';
import { setSingleLineTextWithEllipsis } from '../shared/textFit';
import { MIN_TOUCH_TARGET_PX } from '../shared/touchTarget';
import type { MenuLayoutPlan } from './layout';

const MENU_TAGLINE = 'TEN HOSTILE SECTORS. ONE SHIP.';

const SCRIM_KEY = 'menu-scrim';
const SCRIM_HEIGHT = 256;
const CARD_PADDING_X = 16;
const DELETE_BUTTON_WIDTH = 44;
const DELETE_BUTTON_HEIGHT = 26;

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

/**
 * Shade behind the title and the footer so copy stays legible over the vista without boxing it in:
 * dark at the top and bottom edges, clear through the middle where the hero and horizon live.
 */
export function createMenuBackdrop(scene: Phaser.Scene): void {
  withCanvasTexture(scene, SCRIM_KEY, 4, SCRIM_HEIGHT, (context, width, height) => {
    const shade = context.createLinearGradient(0, 0, 0, height);
    shade.addColorStop(0, 'rgba(1,4,10,0.78)');
    shade.addColorStop(0.3, 'rgba(1,4,10,0.12)');
    shade.addColorStop(0.62, 'rgba(1,4,10,0.1)');
    shade.addColorStop(1, 'rgba(1,4,10,0.7)');
    context.fillStyle = shade;
    context.fillRect(0, 0, width, height);
  });
  scene.add
    .image(0, 0, SCRIM_KEY)
    .setOrigin(0)
    .setDisplaySize(Number(scene.scale.width), Number(scene.scale.height))
    .setDepth(4);
}

/** Kicker, title and tagline. */
export function createMenuTitle(scene: Phaser.Scene, plan: MenuLayoutPlan): void {
  if (plan.kickerVisible) {
    const kicker = scene.add
      .text(plan.centerX, plan.kickerY, 'COMMAND DECK', neonLabelStyle(plan.kickerFontSize, NEON_TEXT.cyan, 5))
      .setOrigin(0.5)
      .setDepth(12);
    const rules = scene.add.graphics().setDepth(12);
    const reach = kicker.width / 2 + 14;
    rules.lineStyle(1, NEON.cyan, 0.45);
    rules.lineBetween(plan.centerX - reach - 44, plan.kickerY, plan.centerX - reach, plan.kickerY);
    rules.lineBetween(plan.centerX + reach, plan.kickerY, plan.centerX + reach + 44, plan.kickerY);
  }

  const titleSize = fitNeonTitleFontSize(scene, 'SPACE EXPLORER', plan.titleFontSize, plan.titleMaxWidth);
  addNeonTitle(scene, plan.centerX, plan.titleY, 'SPACE EXPLORER', titleSize, 11);

  scene.add
    .text(
      plan.centerX,
      plan.taglineY,
      MENU_TAGLINE,
      neonLabelStyle(plan.taglineFontSize, NEON_TEXT.secondary, plan.taglineFontSize * 0.22)
    )
    .setOrigin(0.5)
    .setDepth(12);
}

/** The one lit control on the screen: a solid launch button with a breathing halo behind it. */
function createLaunchButton(scene: Phaser.Scene, plan: MenuLayoutPlan, onNewRun: () => void) {
  const rect = plan.launchButton;
  generateEffectsParticleTextures(scene);
  const halo = scene.add
    .image(rect.x + rect.width / 2, rect.y + rect.height / 2, PARTICLE.glow)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setTint(NEON.cyan)
    .setDisplaySize(rect.width * 1.5, rect.height * 3)
    .setAlpha(scaleUiGlowAlpha(0.3))
    .setDepth(10);
  if (!prefersReducedMotion()) {
    scene.tweens.add({
      targets: halo,
      alpha: scaleUiGlowAlpha(0.12),
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  const button = createActionButtonControl(scene, {
    label: 'NEW RUN',
    width: rect.width,
    height: rect.height,
    variant: 'primary',
    fontSize: `${Math.round(rect.height * 0.36)}px`,
    onClick: onNewRun,
  });
  button.setPosition(rect.x, rect.y);
  button.setDepth(11);

  // Play chevron ahead of the label; the label shifts so the pair stays centred.
  const chevron = scene.add.graphics().setDepth(12);
  const size = rect.height * 0.17;
  const lockupShift = size + 6;
  button.label.setX(button.label.x + lockupShift);
  const tipX = button.label.x - button.label.width / 2 - 12;
  const centerY = rect.y + rect.height / 2;
  chevron.fillStyle(NEON.ink, 1);
  chevron.beginPath();
  chevron.moveTo(tipX - size * 1.5, centerY - size);
  chevron.lineTo(tipX, centerY);
  chevron.lineTo(tipX - size * 1.5, centerY + size);
  chevron.closePath();
  chevron.fillPath();

  return {
    destroy() {
      scene.tweens.killTweensOf(halo);
      halo.destroy();
      button.destroy();
      chevron.destroy();
    },
  };
}

/**
 * A save slot as a glass card: campaign position and run stats when filled (tap to resume, DEL to
 * clear), dim and inert when empty.
 */
function createSlotCard(
  scene: Phaser.Scene,
  rect: MenuLayoutPlan['slotCards'][number],
  slotNumber: number,
  handlers: MenuSaveSlotHandlers
) {
  const slotId = `slot-${slotNumber}` as SaveSlotId;
  // Roomy cards add a third line: when the checkpoint was saved.
  const roomy = rect.height >= 64;
  const titleSize = roomy ? 14 : 13;
  const detailSize = roomy ? 13 : 12;
  const savedAtSize = 11;
  const lineGap = roomy ? 4 : 2;
  const textX = rect.x + CARD_PADDING_X;
  const blockHeight = titleSize + lineGap + detailSize + (roomy ? lineGap + savedAtSize : 0);
  const blockTop = rect.y + (rect.height - blockHeight) / 2;
  const detailY = blockTop + titleSize + lineGap + detailSize / 2;

  const button = createActionButtonControl(scene, {
    label: '',
    width: rect.width,
    height: rect.height,
    variant: 'secondary',
    onClick: () => handlers.onLoadSlot(slotId),
  });
  button.setPosition(rect.x, rect.y);
  button.setDepth(11);

  const title = scene.add
    .text(textX, blockTop + titleSize / 2, '', neonLabelStyle(titleSize, NEON_TEXT.primary, 0.75))
    .setOrigin(0, 0.5)
    .setDepth(12);
  const detail = scene.add
    .text(textX, detailY, '', neonLabelStyle(detailSize, NEON_TEXT.muted, 1))
    .setOrigin(0, 0.5)
    .setDepth(12);
  const savedAt = roomy
    ? scene.add
        .text(
          textX,
          detailY + detailSize / 2 + lineGap + savedAtSize / 2,
          '',
          neonLabelStyle(savedAtSize, NEON_TEXT.muted, 0.5)
        )
        .setOrigin(0, 0.5)
        .setDepth(12)
    : null;

  const deleteButton = createActionButtonControl(scene, {
    label: 'DEL',
    width: DELETE_BUTTON_WIDTH,
    height: DELETE_BUTTON_HEIGHT,
    hitWidth: MIN_TOUCH_TARGET_PX,
    hitHeight: MIN_TOUCH_TARGET_PX,
    variant: 'danger',
    fontSize: '12px',
    onClick: () => handlers.onDeleteSlot(slotId),
  });
  deleteButton.setPosition(
    rect.x + rect.width - CARD_PADDING_X - DELETE_BUTTON_WIDTH,
    rect.y + (rect.height - DELETE_BUTTON_HEIGHT) / 2
  );
  deleteButton.setDepth(13);

  const fullTextWidth = rect.width - CARD_PADDING_X * 2;
  const occupiedTextWidth = fullTextWidth - DELETE_BUTTON_WIDTH - 10;

  return {
    slotId,
    refresh(model: SaveSlotViewModel | undefined, storageAvailable: boolean): void {
      const occupied = Boolean(model?.occupied);
      const textWidth = occupied ? occupiedTextWidth : fullTextWidth;
      setSingleLineTextWithEllipsis(title, model?.title ?? '', textWidth, `SLOT ${slotNumber}`);
      setSingleLineTextWithEllipsis(detail, model?.subtitle ?? '', textWidth, 'EMPTY');
      title.setColor(occupied ? NEON_TEXT.primary : NEON_TEXT.muted);
      detail.setColor(occupied ? NEON_TEXT.gold : NEON_TEXT.muted);
      title.setAlpha(occupied ? 1 : 0.8);
      detail.setAlpha(occupied ? 1 : 0.6);
      // An empty roomy card has no third line, so its two lines re-centre.
      const shift = savedAt && !occupied ? (lineGap + savedAtSize) / 2 : 0;
      title.setY(blockTop + titleSize / 2 + shift);
      detail.setY(detailY + shift);
      savedAt?.setText(occupied ? (model?.savedAtLabel ?? '') : '');
      button.setEnabled(occupied && storageAvailable);
      deleteButton.setVisible(occupied);
    },
    destroy(): void {
      button.destroy();
      title.destroy();
      detail.destroy();
      savedAt?.destroy();
      deleteButton.destroy();
    },
  };
}

/** Run selection: the launch button, the three save-slot cards and the status line under them. */
export function createSaveSlotEntryPanel(
  scene: Phaser.Scene,
  plan: MenuLayoutPlan,
  handlers: MenuSaveSlotHandlers,
  storageAvailable: boolean
): MenuSaveSlotPanel {
  const launch = createLaunchButton(scene, plan, handlers.onNewRun);
  const cards = plan.slotCards.map((rect, index) => createSlotCard(scene, rect, index + 1, handlers));
  const idleHint = isTouchMobileDevice()
    ? 'DRAG TO FLY  ·  GUNS FIRE AUTOMATICALLY'
    : 'WASD / ARROWS TO FLY  ·  SPACE TO FIRE  ·  ESC TO PAUSE';

  const statusText = scene.add
    .text(plan.centerX, plan.statusY, idleHint, neonLabelStyle(12, NEON_TEXT.muted, 1.5))
    .setOrigin(0.5)
    .setDepth(11);

  return {
    refresh(slots) {
      for (const card of cards) {
        card.refresh(
          slots.find((slot) => slot.id === card.slotId),
          storageAvailable
        );
      }
    },
    setStatus(message, isError = false) {
      statusText.setColor(isError ? NEON_TEXT.danger : message ? NEON_TEXT.secondary : NEON_TEXT.muted);
      statusText.setText(message || idleHint);
    },
    destroy() {
      launch.destroy();
      for (const card of cards) card.destroy();
      statusText.destroy();
    },
  };
}
