import Phaser from 'phaser';
import { scaleUiGlowAlpha } from '@/utils/renderingCompat';
import { NEON, NEON_TEXT, neonLabelStyle } from '../../shared/neonUiTheme';
import { MIN_TOUCH_TARGET_PX } from '../../shared/touchTarget';
import type { PauseOverlayLayout, PauseSubview } from './types';

const TABS: ReadonlyArray<{ subview: PauseSubview; label: string }> = [
  { subview: 'checkpoints', label: 'CHECKPOINTS' },
  { subview: 'settings', label: 'SETTINGS' },
];

interface PauseTab {
  subview: PauseSubview;
  label: Phaser.GameObjects.Text;
  hitArea: Phaser.GameObjects.Zone;
}

type TabStripLayout = Pick<
  PauseOverlayLayout,
  'tabsX' | 'tabY' | 'tabWidth' | 'tabHeight' | 'tabRuleX' | 'tabRuleWidth'
>;

export interface PauseTabs {
  setLayout: (layout: TabStripLayout) => void;
  setActive: (subview: PauseSubview) => void;
  setDepth: (depth: number) => void;
  setVisible: (visible: boolean) => void;
  destroy: () => void;
}

/**
 * Tab strip: plain labels on a hairline, the active one lit and underlined. Deliberately not buttons,
 * so the footer's RESUME stays the only solid control on the panel.
 */
export function createPauseTabs(scene: Phaser.Scene, onSelect: (subview: PauseSubview) => void): PauseTabs {
  const chrome = scene.add.graphics();
  let layout: TabStripLayout | null = null;
  let active: PauseSubview = 'checkpoints';
  let hovered: PauseSubview | null = null;

  const redraw = (): void => {
    chrome.clear();
    if (!layout) return;
    const ruleY = layout.tabY + layout.tabHeight;
    chrome.lineStyle(1, NEON.cyan, 0.2);
    chrome.lineBetween(layout.tabRuleX, ruleY, layout.tabRuleX + layout.tabRuleWidth, ruleY);

    tabs.forEach((tab, index) => {
      const x = layout!.tabsX + index * layout!.tabWidth;
      const isActive = tab.subview === active;
      if (isActive) {
        chrome.fillStyle(NEON.cyan, scaleUiGlowAlpha(0.1));
        chrome.fillRect(x, layout!.tabY, layout!.tabWidth, layout!.tabHeight);
        chrome.fillStyle(NEON.cyanBright, 1);
        chrome.fillRect(x, ruleY - 2, layout!.tabWidth, 2);
      } else if (tab.subview === hovered) {
        chrome.fillStyle(NEON.cyan, 0.05);
        chrome.fillRect(x, layout!.tabY, layout!.tabWidth, layout!.tabHeight);
      }
      tab.label.setColor(
        isActive ? NEON_TEXT.primary : tab.subview === hovered ? NEON_TEXT.secondary : NEON_TEXT.muted
      );
    });
  };

  const tabs: PauseTab[] = TABS.map(({ subview, label }) => {
    const hitArea = scene.add.zone(0, 0, 1, 1).setOrigin(0).setInteractive({ useHandCursor: true });
    hitArea.on('pointerover', () => {
      hovered = subview;
      redraw();
    });
    hitArea.on('pointerout', () => {
      if (hovered === subview) hovered = null;
      redraw();
    });
    hitArea.on('pointerdown', () => onSelect(subview));
    return { subview, label: scene.add.text(0, 0, label, neonLabelStyle(14, NEON_TEXT.muted)).setOrigin(0.5), hitArea };
  });

  return {
    setLayout(nextLayout) {
      layout = nextLayout;
      const hitHeight = Math.max(nextLayout.tabHeight, MIN_TOUCH_TARGET_PX);
      tabs.forEach((tab, index) => {
        const x = nextLayout.tabsX + index * nextLayout.tabWidth;
        tab.label.setPosition(x + nextLayout.tabWidth / 2, nextLayout.tabY + nextLayout.tabHeight / 2);
        tab.hitArea.setPosition(x, nextLayout.tabY - (hitHeight - nextLayout.tabHeight) / 2);
        tab.hitArea.setSize(nextLayout.tabWidth, hitHeight);
      });
      redraw();
    },
    setActive(subview) {
      if (subview === active) return;
      active = subview;
      redraw();
    },
    setDepth(depth) {
      chrome.setDepth(depth);
      tabs.forEach((tab) => {
        tab.label.setDepth(depth + 1);
        tab.hitArea.setDepth(depth + 2);
      });
    },
    setVisible(visible) {
      chrome.setVisible(visible);
      tabs.forEach((tab) => {
        tab.label.setVisible(visible);
        tab.hitArea.setVisible(visible);
      });
    },
    destroy() {
      chrome.destroy();
      tabs.forEach((tab) => {
        tab.label.destroy();
        tab.hitArea.destroy();
      });
    },
  };
}
