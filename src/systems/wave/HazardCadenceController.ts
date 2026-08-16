import type { ScriptedHazardConfig } from '@/config/LevelsConfig';

import {
  canTriggerHazard,
  consumeHazardPressure,
  decayHazardPressure,
  isHazardWithinDuration,
} from './hazardPressurePolicy';

export class HazardCadenceController {
  private pressure = 0;
  private sectionStartedAt = 0;
  private readonly lastTriggered = new Map<string, number>();

  reset(sectionStartedAt = this.sectionStartedAt): void {
    this.pressure = 0;
    this.sectionStartedAt = sectionStartedAt;
    this.lastTriggered.clear();
  }

  decay(delta: number): void {
    this.pressure = decayHazardPressure(this.pressure, delta);
  }

  getPressure(): number {
    return this.pressure;
  }

  tryTrigger(time: number, hazard: ScriptedHazardConfig, key: string): boolean {
    const cadence = hazard.cadenceMs ?? 2000;
    const lastTriggered = this.lastTriggered.get(key) ?? this.sectionStartedAt;
    const sectionElapsedMs = Math.max(0, time - this.sectionStartedAt);

    if (
      !isHazardWithinDuration(hazard, sectionElapsedMs) ||
      time <= lastTriggered + cadence ||
      !canTriggerHazard(this.pressure, hazard)
    ) {
      return false;
    }

    this.lastTriggered.set(key, time);
    this.pressure = consumeHazardPressure(this.pressure, hazard);
    return true;
  }
}
