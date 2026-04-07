import type Phaser from 'phaser';
import { centerHorizontally, getViewportLayout } from '../../utils/layout';

export interface MenuLayoutPlan {
  centerX: number;
  titleY: number;
  controlsPanelX: number;
  controlsY: number;
  controlsPanelWidth: number;
  controlsPanelHeight: number;
  musicPanelX: number;
  musicPanelY: number;
  musicPanelWidth: number;
  musicPanelHeight: number;
  sliderX: number;
  sliderStartY: number;
  sliderSpacing: number;
  sliderWidth: number;
  promptY: number;
}

export function createMenuLayoutPlan(scene: Phaser.Scene): MenuLayoutPlan {
  const layout = getViewportLayout(scene);
  const compact = layout.height < 640;
  const controlsPanelWidth = 360;
  const controlsPanelHeight = compact ? 118 : 132;
  const controlsY = layout.centerY - (compact ? 24 : 8);
  const controlsPanelX = centerHorizontally(layout, controlsPanelWidth);
  const musicPanelWidth = 430;
  const musicPanelHeight = compact ? 170 : 188;
  const musicPanelX = centerHorizontally(layout, musicPanelWidth);
  const musicPanelY = controlsY + controlsPanelHeight + (compact ? 16 : 24);

  return {
    centerX: layout.centerX,
    titleY: controlsY - (compact ? 130 : 150),
    controlsPanelX,
    controlsY,
    controlsPanelWidth,
    controlsPanelHeight,
    musicPanelX,
    musicPanelY,
    musicPanelWidth,
    musicPanelHeight,
    sliderX: musicPanelX + 26,
    sliderStartY: musicPanelY + 42,
    sliderSpacing: 46,
    sliderWidth: musicPanelWidth - 52,
    promptY: Math.min(layout.bottom - 24, musicPanelY + musicPanelHeight + 28),
  };
}
