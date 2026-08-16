import Phaser from 'phaser';
import { getVisualQualityProfile } from '../config/visualQuality';

export function scaleUiGlowAlpha(baseAlpha: number): number {
  const scaled = baseAlpha * getVisualQualityProfile().uiGlowStrength;
  return scaled < 0 ? 0 : scaled > 1 ? 1 : scaled;
}

type FilterableGameObject = Phaser.GameObjects.GameObject & {
  enableFilters(): FilterableGameObject;
  readonly filters: Phaser.Types.GameObjects.FiltersInternalExternal | null;
};

interface ColorGradeValues {
  brightness: number;
  contrast: number;
  saturation: number;
}

interface CameraPulseValues {
  brightness?: number;
  contrast?: number;
  saturation?: number;
}

export function applyGameObjectGlow(
  gameObject: FilterableGameObject,
  color: number,
  options: {
    outerStrength?: number;
    innerStrength?: number;
    scale?: number;
    knockout?: boolean;
    clearFirst?: boolean;
  } = {}
): Phaser.Filters.Glow | null {
  const { outerStrength = 2, innerStrength = 2, scale = 1, knockout = false, clearFirst = true } = options;

  gameObject.enableFilters();

  if (!gameObject.filters) {
    return null;
  }

  if (clearFirst) {
    gameObject.filters.internal.clear();
  }

  return gameObject.filters.internal.addGlow(color, outerStrength, innerStrength, scale, knockout);
}

export function applyHazardTelegraphGlow(gameObject: FilterableGameObject, color: number): Phaser.Filters.Glow | null {
  return applyGameObjectGlow(gameObject, color, {
    outerStrength: 1.4,
    innerStrength: 0.15,
    scale: 0.5,
    knockout: false,
  });
}

export function applyCameraColorGrade(
  camera: Phaser.Cameras.Scene2D.Camera,
  currentFilter: Phaser.Filters.ColorMatrix | null,
  grade: ColorGradeValues
): Phaser.Filters.ColorMatrix {
  const filter = currentFilter ?? camera.filters.internal.addColorMatrix();
  const matrix = filter.colorMatrix;

  const mappedBrightness = Phaser.Math.Clamp(
    grade.brightness <= 0.35 ? 1.025 + grade.brightness : grade.brightness,
    0.8,
    1.4
  );
  const mappedContrast = Phaser.Math.Clamp(grade.contrast >= 0.5 ? grade.contrast - 1 : grade.contrast, -0.8, 1);
  const mappedSaturation = Phaser.Math.Clamp(
    (grade.saturation >= 0.5 ? grade.saturation - 1 : grade.saturation) + 0.04,
    -1,
    1.2
  );

  matrix.reset();
  matrix.brightness(mappedBrightness);
  matrix.contrast(mappedContrast, true);
  matrix.saturate(mappedSaturation, true);

  return filter;
}

export function applyCameraColorPulse(
  camera: Phaser.Cameras.Scene2D.Camera,
  currentFilter: Phaser.Filters.ColorMatrix | null,
  pulse: CameraPulseValues
): Phaser.Filters.ColorMatrix {
  const filter = currentFilter ?? camera.filters.internal.addColorMatrix();
  const matrix = filter.colorMatrix;

  matrix.brightness(pulse.brightness ?? 1, true);
  matrix.contrast(pulse.contrast ?? 0, true);
  matrix.saturate(pulse.saturation ?? 0, true);

  return filter;
}

export function clearCameraFilters(camera: Phaser.Cameras.Scene2D.Camera): void {
  camera.filters.internal.clear();
  camera.filters.external.clear();
}
