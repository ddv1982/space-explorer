import Phaser from 'phaser';

export function mixColor(baseColor: number, accentColor: number, weight: number): number {
  const clampedWeight = Phaser.Math.Clamp(weight, 0, 1);

  const baseR = (baseColor >> 16) & 0xff;
  const baseG = (baseColor >> 8) & 0xff;
  const baseB = baseColor & 0xff;

  const accentR = (accentColor >> 16) & 0xff;
  const accentG = (accentColor >> 8) & 0xff;
  const accentB = accentColor & 0xff;

  const r = Math.round(baseR + (accentR - baseR) * clampedWeight);
  const g = Math.round(baseG + (accentG - baseG) * clampedWeight);
  const b = Math.round(baseB + (accentB - baseB) * clampedWeight);

  return (r << 16) | (g << 8) | b;
}