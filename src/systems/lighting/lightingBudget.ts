import type { VisualQualityProfile } from '../../config/visualQuality';

export interface LightingBudget {
  lights: number;
  normalMapLighting: boolean;
  bloom: 'off' | 'soft' | 'full';
}

export interface LightingEnvironment {
  touchDevice: boolean;
  /** RuntimePerformanceBudget pressure level (Auto only); 0 means no pressure. */
  pressureLevel: number;
  reducedMotion: boolean;
}

/**
 * Lighting cost per tier. Auto starts phones on Standard's budget and desktops on High's, then sheds
 * bloom first and lights second as frame pressure rises. Reduced motion keeps lights but drops bloom.
 */
export function resolveLightingBudget(profile: VisualQualityProfile, environment: LightingEnvironment): LightingBudget {
  let budget: LightingBudget = {
    lights: profile.dynamicLights,
    normalMapLighting: profile.normalMapLighting,
    bloom: profile.bloom,
  };
  if (profile.tier === 'auto') {
    if (environment.touchDevice) budget = { lights: 4, normalMapLighting: true, bloom: 'soft' };
    if (environment.pressureLevel >= 1) budget.bloom = budget.bloom === 'full' ? 'soft' : 'off';
    if (environment.pressureLevel >= 2) {
      budget.bloom = 'off';
      budget.lights = Math.floor(budget.lights / 2);
    }
    if (environment.pressureLevel >= 3) budget.lights = 0;
  }
  if (environment.reducedMotion) budget.bloom = 'off';
  return budget;
}
