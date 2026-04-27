import { mixColor } from '../../utils/colorUtils';

interface HazardOverlayGraphics {
  lineStyle(lineWidth: number, color: number, alpha?: number): void;
  lineBetween(x1: number, y1: number, x2: number, y2: number): void;
  strokeEllipse(x: number, y: number, width: number, height: number): void;
  fillStyle(color: number, alpha?: number): void;
  fillEllipse(x: number, y: number, width: number, height: number): void;
  beginPath(): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  strokePath(): void;
  fillCircle(x: number, y: number, radius: number): void;
}

interface HazardOverlayDrawPrimitivesInput {
  width: number;
  height: number;
  time: number;
  accentColor: number;
  overlayAlpha: number;
  energyStorm: number;
  gravityWell: number;
  nebulaAmbush: number;
  ringCrossfire: number;
  debrisSurge: number;
  minefield: number;
  rockCorridor: number;
}

export function drawHazardOverlayPrimitives(
  overlay: HazardOverlayGraphics,
  input: HazardOverlayDrawPrimitivesInput
): void {
  const {
    width,
    height,
    time,
    accentColor,
    overlayAlpha,
    energyStorm,
    gravityWell,
    nebulaAmbush,
    ringCrossfire,
    debrisSurge,
    minefield,
    rockCorridor,
  } = input;

  if (energyStorm > 0) {
    const stormAlpha = overlayAlpha * 0.45 * energyStorm;
    for (const ratio of [0.18, 0.48, 0.78]) {
      const x = width * ratio;
      const pulse = (Math.sin(time * 0.01 + ratio * 10) + 1) / 2;
      overlay.lineStyle(2, mixColor(accentColor, 0xffffff, 0.35), stormAlpha * (0.35 + pulse * 0.45));
      overlay.lineBetween(x, 0, x + Math.sin(time * 0.004 + ratio) * 12, height * 0.34);
    }
  }

  if (gravityWell > 0) {
    const ringAlpha = overlayAlpha * 0.32 * gravityWell;
    const cx = width * 0.5 + Math.sin(time * 0.001) * 24;
    const cy = height * 0.24;
    overlay.lineStyle(2, mixColor(accentColor, 0xffffff, 0.25), ringAlpha);
    overlay.strokeEllipse(cx, cy, width * 0.18, height * 0.11);
    overlay.lineStyle(1, mixColor(accentColor, 0xffffff, 0.45), ringAlpha * 0.7);
    overlay.strokeEllipse(cx, cy, width * 0.26, height * 0.15);
  }

  if (nebulaAmbush > 0) {
    const fogAlpha = overlayAlpha * 0.2 * nebulaAmbush;
    overlay.fillStyle(mixColor(accentColor, 0xffffff, 0.18), fogAlpha);
    overlay.fillEllipse(width * 0.08, height * 0.45, width * 0.18, height * 0.52);
    overlay.fillEllipse(width * 0.92, height * 0.42, width * 0.2, height * 0.46);
  }

  if (ringCrossfire > 0) {
    const arcAlpha = overlayAlpha * 0.26 * ringCrossfire;
    overlay.lineStyle(2, mixColor(accentColor, 0xffffff, 0.28), arcAlpha);
    overlay.beginPath();
    overlay.arc(width * 0.16, height * 0.26, width * 0.16, -0.35, 0.55);
    overlay.strokePath();
    overlay.beginPath();
    overlay.arc(width * 0.84, height * 0.26, width * 0.16, 2.59, 3.49);
    overlay.strokePath();
  }

  if (debrisSurge > 0) {
    const streakAlpha = overlayAlpha * 0.18 * debrisSurge;
    overlay.lineStyle(1.5, mixColor(0x8899aa, accentColor, 0.2), streakAlpha);
    for (const ratio of [0.12, 0.28, 0.72, 0.88]) {
      const x = width * ratio;
      overlay.lineBetween(x - 20, height * 0.18, x + 18, height * 0.34);
    }
  }

  if (minefield > 0) {
    const mineAlpha = overlayAlpha * 0.16 * minefield;
    overlay.fillStyle(mixColor(accentColor, 0xffcc88, 0.35), mineAlpha);
    for (const ratio of [0.15, 0.24, 0.76, 0.85]) {
      overlay.fillCircle(width * ratio, height * 0.62, 2);
      overlay.fillCircle(width * (ratio + 0.02), height * 0.68, 1.6);
    }
  }

  void rockCorridor;
}
