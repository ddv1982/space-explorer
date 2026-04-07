import Phaser from 'phaser';
import { audioManager } from '../../systems/AudioManager';
import { colorToHexString } from '../../utils/colorUtils';
import { createMusicSliderControl } from '../shared/musicSliderControl';
import { applyMusicRuntimeTuningValue, type MusicTuningSliders } from '../shared/musicRuntimeTuning';
import type { MenuLayoutPlan } from './layout';

export function createMenuTitle(scene: Phaser.Scene, plan: MenuLayoutPlan): void {
  scene.add.text(plan.centerX, plan.titleY, 'SPACE EXPLORER', {
    fontSize: '64px',
    color: '#eefaff',
    fontStyle: 'bold',
    fontFamily: 'monospace',
    stroke: '#040b12',
    strokeThickness: 4,
  }).setOrigin(0.5).setDepth(12);
}

export function createControlsPanel(
  scene: Phaser.Scene,
  plan: MenuLayoutPlan,
  accentColor: number,
  mobile: boolean
): void {
  const controlsPanel = scene.add.graphics();
  controlsPanel.fillStyle(0x050b14, 0.76);
  controlsPanel.fillRoundedRect(plan.controlsPanelX, plan.controlsY - 8, plan.controlsPanelWidth, plan.controlsPanelHeight, 8);
  controlsPanel.lineStyle(1, accentColor, 0.38);
  controlsPanel.strokeRoundedRect(plan.controlsPanelX, plan.controlsY - 8, plan.controlsPanelWidth, plan.controlsPanelHeight, 8);
  controlsPanel.setDepth(10);

  scene.add.text(plan.centerX, plan.controlsY + 6, 'CONTROLS', {
    fontSize: '14px',
    color: colorToHexString(accentColor),
    fontFamily: 'monospace',
  }).setOrigin(0.5).setDepth(11);

  const controlsContent = [
    { label: 'MOVE', keys: mobile ? 'On-screen Joystick' : 'W A S D  /  Arrows' },
    { label: 'FIRE', keys: mobile ? 'Tap Right Side' : 'SPACE  /  Click' },
    { label: 'LIVES', keys: '3 Ships Per Run' },
  ];

  controlsContent.forEach((row, i) => {
    const rowY = plan.controlsY + 28 + i * 28;
    scene.add.text(plan.controlsPanelX + 20, rowY, row.label, {
      fontSize: '13px',
      color: '#d6f6ff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setDepth(11);

    scene.add.text(plan.centerX + 10, rowY, row.keys, {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#112033',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(12);
  });
}

export function createMusicLabPanel(
  scene: Phaser.Scene,
  plan: MenuLayoutPlan,
  accentColor: number,
  getSliders: () => MusicTuningSliders | null
): MusicTuningSliders {
  const musicPanel = scene.add.graphics();
  musicPanel.fillStyle(0x050b14, 0.8);
  musicPanel.fillRoundedRect(plan.musicPanelX, plan.musicPanelY, plan.musicPanelWidth, plan.musicPanelHeight, 10);
  musicPanel.lineStyle(1, accentColor, 0.42);
  musicPanel.strokeRoundedRect(plan.musicPanelX, plan.musicPanelY, plan.musicPanelWidth, plan.musicPanelHeight, 10);
  musicPanel.setDepth(10);

  scene.add.text(plan.centerX, plan.musicPanelY + 14, 'MUSIC LAB (LIVE)', {
    fontSize: '14px',
    color: colorToHexString(accentColor),
    fontFamily: 'monospace',
  }).setOrigin(0.5, 0).setDepth(11);

  const runtimeTuning = audioManager.getMusicRuntimeTuning();
  const sliders: MusicTuningSliders = {
    creativity: createMusicSliderControl(scene, {
      label: 'CREATIVITY',
      value: runtimeTuning.creativity,
      width: plan.sliderWidth,
      onChange: (value) => applyMusicRuntimeTuningValue('creativity', value, getSliders()),
    }),
    energy: createMusicSliderControl(scene, {
      label: 'ENERGY',
      value: runtimeTuning.energy,
      width: plan.sliderWidth,
      onChange: (value) => applyMusicRuntimeTuningValue('energy', value, getSliders()),
    }),
    ambience: createMusicSliderControl(scene, {
      label: 'AMBIENCE',
      value: runtimeTuning.ambience,
      width: plan.sliderWidth,
      onChange: (value) => applyMusicRuntimeTuningValue('ambience', value, getSliders()),
    }),
  };

  sliders.creativity.setPosition(plan.sliderX, plan.sliderStartY);
  sliders.energy.setPosition(plan.sliderX, plan.sliderStartY + plan.sliderSpacing);
  sliders.ambience.setPosition(plan.sliderX, plan.sliderStartY + plan.sliderSpacing * 2);
  sliders.creativity.setDepth(11);
  sliders.energy.setDepth(11);
  sliders.ambience.setDepth(11);

  return sliders;
}
