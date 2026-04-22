import Phaser from 'phaser';
import { centerHorizontally, getViewportLayout } from '../../utils/layout';
import { createPromptText } from '../shared/createPromptText';
import { getUpgradeGridLayout, type UpgradeGridLayout } from './shared';

export interface IntermissionLayoutMetrics {
  planetNameY: number;
  titleY: number;
  levelCompleteY: number;
  scoreY: number;
  planetY: number;
  planetScale: number;
  promptY: number;
  gridTop: number;
  gridLayout: UpgradeGridLayout;
  compact: boolean;
  tight: boolean;
}

interface IntermissionHeaderConfig {
  planetName: string;
  level: number;
  score: number;
}

export function getIntermissionLayout(scene: Phaser.Scene, buttonCount: number): IntermissionLayoutMetrics {
  const layout = getViewportLayout(scene);
  const compact = layout.height < 430;
  const tight = layout.height < 520;
  const gridLayout = getUpgradeGridLayout(layout.height);
  const promptY = layout.bottom - (compact ? 22 : tight ? 32 : 60);
  const planetNameY = layout.top + (compact ? 18 : tight ? 28 : 50);
  const titleY = planetNameY + (compact ? 22 : tight ? 28 : 35);
  const levelCompleteY = titleY + (compact ? 24 : tight ? 30 : 45);
  const scoreY = levelCompleteY + (compact ? 22 : tight ? 28 : 40);
  const planetY = scoreY + (compact ? 28 : tight ? 46 : 100);
  const planetScale = compact ? 0.65 : tight ? 0.95 : 1.5;
  const rows = buttonCount > 0 ? Math.ceil(buttonCount / gridLayout.columns) : 0;
  const gridHeight = rows > 0
    ? rows * gridLayout.buttonHeight + (rows - 1) * gridLayout.spacingY
    : 0;
  const minGridTop = planetY + (compact ? 46 : tight ? 72 : 110);
  const desiredGridTop = compact ? 168 : tight ? 244 : gridLayout.top;
  const gridTop = rows > 0
    ? Math.max(minGridTop, Math.min(desiredGridTop, promptY - (compact ? 18 : 24) - gridHeight))
    : desiredGridTop;

  return {
    planetNameY,
    titleY,
    levelCompleteY,
    scoreY,
    planetY,
    planetScale,
    promptY,
    gridTop,
    gridLayout,
    compact,
    tight,
  };
}

export function createIntermissionHeader(
  scene: Phaser.Scene,
  intermissionLayout: IntermissionLayoutMetrics,
  config: IntermissionHeaderConfig
): Phaser.GameObjects.Text {
  const layout = getViewportLayout(scene);

  scene.add.text(layout.centerX, intermissionLayout.planetNameY, config.planetName, {
    fontSize: intermissionLayout.compact ? '16px' : intermissionLayout.tight ? '18px' : '20px',
    color: '#888888',
    fontFamily: 'monospace',
  }).setOrigin(0.5);

  scene.add.text(layout.centerX, intermissionLayout.titleY, 'PLANET APPROACHED', {
    fontSize: intermissionLayout.compact ? '28px' : intermissionLayout.tight ? '32px' : '36px',
    color: '#ffffff',
    fontStyle: 'bold',
    fontFamily: 'monospace',
  }).setOrigin(0.5);

  scene.add.text(layout.centerX, intermissionLayout.levelCompleteY, `LEVEL ${config.level} COMPLETE`, {
    fontSize: intermissionLayout.compact ? '14px' : intermissionLayout.tight ? '16px' : '18px',
    color: '#44ff88',
    fontFamily: 'monospace',
  }).setOrigin(0.5);

  return scene.add.text(layout.centerX, intermissionLayout.scoreY, `CREDITS: ${config.score}`, {
    fontSize: intermissionLayout.compact ? '18px' : intermissionLayout.tight ? '20px' : '24px',
    color: '#ffcc00',
    fontFamily: 'monospace',
  }).setOrigin(0.5);
}

export function createIntermissionPrompt(
  scene: Phaser.Scene,
  intermissionLayout: IntermissionLayoutMetrics,
  label: string
): void {
  const layout = getViewportLayout(scene);

  createPromptText(scene, layout.centerX, intermissionLayout.promptY, label, {
    color: '#b8c8dd',
    fontSize: intermissionLayout.compact ? '16px' : intermissionLayout.tight ? '18px' : '20px',
  });
}

export function getUpgradeGridStartX(scene: Phaser.Scene, gridLayout: UpgradeGridLayout): number {
  const layout = getViewportLayout(scene);
  const gridWidth =
    gridLayout.buttonWidth * gridLayout.columns +
    gridLayout.spacingX * (gridLayout.columns - 1);

  return centerHorizontally(layout, gridWidth);
}
