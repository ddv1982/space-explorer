# Scene flow smoke checklist

Use this quick checklist before releases that touch scene registration/loading/routing.

## Setup

- Start with a fresh page load.
- Open browser console and verify there are no scene registration errors.

## Critical flows

- **Menu → Game**
  - Start a run from menu.
  - Confirm transition succeeds on first attempt (no blank/frozen state).

- **Game → PlanetIntermission → Game**
  - Finish a non-final mission.
  - Confirm intermission appears and returning to gameplay works.

- **Game → GameOver → Menu**
  - Lose all lives.
  - Confirm game-over scene appears and return to menu works.

- **PlanetIntermission (final mission) → Victory → Menu**
  - Reach final mission completion path.
  - Confirm victory scene appears and return to menu works.

## Pass criteria

- No console errors from `sceneRegistry`.
- No missing-scene warnings.
- Transitions happen once per action and land on expected scene.

## Optional diagnostics

- Run `bun test tests/sceneRegistry.test.ts` for focused transition-safety coverage.
- Run `bun run bundle:check` to confirm bundle guardrails still pass.
