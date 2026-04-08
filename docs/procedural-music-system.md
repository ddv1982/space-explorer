# Procedural Music System

Contributor guide for authoring and validating deterministic procedural music in level configs.

## Architecture Overview

- Runtime entrypoint is `src/systems/audio/ProceduralMusicManager.ts`, which schedules short lookahead windows (`musicScheduleAheadSeconds`) and advances `musicStepIndex` deterministically.
- Scheduling flow per step is: `musicIntent` (meter + deterministic pulse) -> `harmony` (bar/chord/root Hz) -> `arrangement` (section density + gain multipliers) -> `rhythm` (per-layer trigger decision) -> `synthesis` (Web Audio node graph + envelopes/modulation).
- `musicIntent.ts` converts track time signature + `stepsPerBeat` into `stepsPerBar`, computes `barIndex`/`stepInBar`, and emits a deterministic pulse from `deterministicSeed`.
- `harmony.ts` resolves mode + progression (`degree`, `barsDuration`, `quality`) into `harmonicRootHz`, normalized and loop-safe.
- `rhythm.ts` gates each layer with deterministic hash-based decisions (`division`, `phase`, `gate`, `density`, accents), so repeated runs project the same timeline.
- `arrangement.ts` resolves phase sections (`intro/build/peak/release`) with loop/non-loop behavior and per-layer gain multipliers.
- `synthesis.ts` schedules tone/noise voices from layer patterns, harmonic root, expression presets, envelopes, and modulation into the music bus.

## Level Authoring Contract

Author in each level under `music.stage` and `music.boss` (`src/config/levels/types.ts`).

- Required track fields: `tempo`, `rootHz`, `stepsPerBeat`, `masterGain`, `intent`, and `bass`.
- Intent fields: non-empty `deterministicSeed`, valid `timeSignature` (`beatUnit` in `2 | 4 | 8 | 16`), `descriptors.energyProfile`, `descriptors.harmony.steps`, optional `descriptors.arrangement`.
- Rhythm fields per layer (`bass/pulse/lead/noise`): `division > 0`, `gate` in `[0,1]`, optional finite `phase`, `accentAmount`, finite values in `accentPattern`.

Typical ranges used by current campaign configs (`src/config/levels/registry.ts`):

- Tempo: stage `92-116`, boss `102-128`.
- Root frequency (`rootHz`): `82.41-146.83`.
- Time signatures: mostly `4/4`, with odd-meter support in `7/8`.
- Arrangement: density stage `0.38-0.84`, boss `0.68-0.96`; energyLift stage `0.08-0.34`, boss `0.18-0.46`; barsDuration stage `4-8`, boss `2-4`.
- Rhythm conventions: divisions usually `4/8/16` (and `7/14` for odd meter), stage gates around `0.38-0.90`, boss gates around `0.54-0.96`.

## QA Workflow

- Validate level schema/constraints before tuning review: `bun run levels:validate`.
- Verify deterministic replay fixtures: `bun test tests/musicReplayDeterminism.test.ts`.
- Run music subsystem tests when touching intent/harmony/rhythm/arrangement behavior:
  - `bun test tests/musicIntent.test.ts`
  - `bun test tests/harmonicProgression.test.ts`
  - `bun test tests/polyrhythm.test.ts`
  - `bun test tests/musicArrangement.test.ts`
- For merge readiness, run full checks: `bun run build` then `bun test`.

## Deterministic Design Principles and Pitfalls

- Keep all scheduling decisions derived from track config + step index only; avoid runtime randomness in step selection.
- Treat `deterministicSeed` as part of the content contract; changing it intentionally rewrites replay timelines.
- Preserve bar math invariants: stable `stepsPerBeat`, valid time signatures, and positive progression/arrangement durations.
- Avoid malformed numeric values (`NaN`, infinities, negative durations/gates); resolver code normalizes some inputs, but validation should catch authoring mistakes early.
- When adding new modulation or expression behavior, ensure it shapes sound only and does not alter trigger timing logic.
