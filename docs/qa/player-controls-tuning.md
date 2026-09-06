# Player control tuning

P1 selects native Arcade acceleration of 3200 px/s², a total speed cap of 480 px/s, and linear drag of 4000 px/s². Digital keyboard and resolved touch directions share normalized movement intent. Opposite directions cancel. Each direction getter is read once per update, preserving the existing touch hysteresis.

Banking remains a 15-degree visual response with frame-rate-independent damping. `getFireDirection` now returns straight upward, and `getMuzzlePosition` uses that same direction. Their callers in `gameplayFrameBehavior.ts` retain the existing reusable vectors, muzzle distances, projectile speed, and firing cadence. The private shot-rotation helper had no other callers and was removed. The player body remains 24×32. Shield and damage rules are unchanged by P1.

## Comparison

`tests/e2e/playerControlsPhysics.ts` creates a real Phaser game, a real Player, an InputManager, and an Arcade world. It drives the world's `update` and `postUpdate` scheduler with controlled deltas. All profiles share the current visual/aiming code; the baseline comparison restores only the previous movement constants and unnormalized acceleration. No alternative profile or preference flag is present in shipped code.

Each profile accelerates for three seconds before measurement. Release measures additional body travel until stopped. Reversal measures the full transition from maximum rightward velocity to maximum leftward velocity, rather than only time until the velocity crosses zero.

| Movement profile | Update / physics Hz | Cardinal / diagonal px/s | Release px | Release ms | Full reversal ms |
| --- | --- | --- | --- | --- | --- |
| Previous 800 acceleration, 800 per-axis limit, 400 drag | 60 / 60 | 800 / 1131.37 | 793.33 | 2000 | 2000 |
| Previous | 120 / 60 | 800 / 1131.37 | 793.33 | 2000 | 2000 |
| Previous | 120 / 120 | 800 / 1131.37 | 796.67 | 2000 | 2000 |
| Selected 3200 acceleration, 480 total limit, 4000 drag | 60 / 60 | 480 / 480 | 24.89 | 133.33 | 300 |
| Selected | 120 / 60 | 480 / 480 | 24.89 | 133.33 | 300 |
| Selected | 120 / 120 | 480 / 480 | 26.83 | 125 | 300 |
| Direct 480 velocity | 60 / 60 | 480 / 480 | 0 | 16.67 | 16.67 |
| Direct | 120 / 60 | 480 / 480 | 0 | 8.33 | 8.33 |
| Direct | 120 / 120 | 480 / 480 | 0 | 8.33 | 8.33 |

The native profile meets the planned limits of 40 px release distance, 350 ms reversal, and at most 5% diagonal speed advantage. It retains a brief acceleration/deceleration response while removing the long coast. Direct velocity is a viable sharper alternative; no human preference claim is made for the native choice. Direct measurements resolve within one input update because they set velocity immediately.

## Verification

The browser spec also starts the actual campaign and delivers keyboard input on desktop and CDP touch input on emulated portrait and landscape phones. It verifies diagonal acceleration, a reached speed of at least 475 px/s, a total cap of 480 px/s, straight active projectiles while the player banks, and a release that stops within 200 ms and 40 px. Six browser scenarios passed across 1280×720, 844×390, and 390×844. These are software input and simulation checks, not physical-device latency or fresh-player preference measurements.

Run the registered `playerControls.spec.ts` in the desktop and mobile Playwright projects. Evidence is saved under `output/verification/<Playwright-test-output-directory>/`, including the physics comparison JSON, delivered-control recording, and gameplay screenshot. The evidence uses the existing P0 recorder and does not read InputManager movement getters from diagnostics.

Focused Player tests cover normalized diagonal acceleration, opposing-input cancellation, one read per direction, and banking equivalence across frame rates. Existing InputManager tests protect engage/release hysteresis, deliberate reversal, secondary-axis suppression, and touch-fire filtering. Typecheck, focused ESLint, and the architecture check pass without new architecture exceptions.

Human playtests should still compare positioning confidence, touch comfort, and aim comprehension. The lower maximum speed also changes route travel times, so encounter validation must use 480 px/s before accepting campaign tuning.
