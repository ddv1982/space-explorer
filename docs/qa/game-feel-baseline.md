# Game-feel baseline

The comparison build is `fccb176a82542285807739f786a8fe661ccfb8d2`, version 1.19.0. This report separates technical evidence from human observations.

## Current status

P0 local recording and its playtest protocol are implemented. Human discovery sessions, physical-device input measurements, and voluntary-play observations are pending. P1 movement selection remains dependent on that baseline.

## Evidence categories

| Category | What it establishes | What it does not establish |
| --- | --- | --- |
| Unit tests | Recording bounds, lifecycle, event meaning, and existing gameplay contracts | Control feel or willingness to replay |
| Automated browser sessions | Real Phaser behavior, delivered inputs, post-step observations, exports, and cleanup | Physical touch latency or a human preference |
| Software-rendered performance probes | Application update cost in the documented environment | Hardware frame delivery or input-to-photon latency |
| Physical-device sessions | Input usability, occlusion, and delivery on the named device | Results for every phone or refresh rate |
| Fresh-player observations | Discoverability, comprehension, and observed choices | A precise population retention estimate |

## Human observations

No participants have been observed for this program yet. No player blockers, preference scores, or replay rates are claimed.

Use [the playtest protocol](game-feel-playtest.md). Store consented recordings and participant notes locally. Add participant counts, device mix, missing observations, and the three most common barriers after the sessions.

## Code-derived hypotheses

The current player uses 800 for acceleration and per-axis maximum velocity, with drag 400. Diagonal acceleration is not normalized. Banking also rotates the shot direction. These facts motivate comparisons; they do not prove the controls are wrong.

The score chain expires after 2500 ms without a kill. Aurora's final release occupies progress 0.84 to 1. At nominal scroll speed the release lasts about 12.2 seconds, but it still contains encounters. This is not a measurement of inactivity.

Player-hit events cover shield absorption and nonfatal hull damage. Player-death events count individual lives. Existing event payloads do not identify damage sources. The recorder must retain unknown attribution rather than infer a killer from a nearby projectile.

## Technical evidence

The unchanged build passed five normal update-cost probes with `bun run test:e2e:performance:gate`. Update p95 ranged from approximately 0.2 to 0.4 ms, with a median of 0.2 ms. All probes remained below the existing 5 ms threshold. See [the raw baseline report](game-feel-evidence/trunk-performance.json).

The environment was HeadlessChrome 151 on macOS with an ANGLE SwiftShader renderer, 10 reported logical processors, and 16 GiB reported device memory. These are software-rendered CPU measurements. They do not establish hardware frame delivery or physical input latency.

A separate automated baseline session started from NEW RUN, moved the ship left by more than 30 logical pixels, and fired visible projectiles without a browser error. The captured gameplay image shows Aurora Threshold and its movement instructions. This is a functional observation, not a measurement of enjoyable control response.

The implementation passed all 119 unit-test files, both TypeScript compiler checks, lint, formatting, architecture, unused-code analysis, ten-level validation, production build, and bundle budgets. The production build was byte-identical to the comparison build across all 28 files. The recording modules are excluded from that bundle.

The six dedicated browser cases cover desktop, emulated phone landscape, and emulated phone portrait. They verify delivered controls, applied movement, fire attempts, the frozen gameplay clock during pause, prefix-preserving caps, scene restarts, clear, and game destruction. The unknown-cause damage case uses the existing accepted-damage probe. It verifies real damage routing and event wiring but bypasses physical overlap geometry. Focus coverage explicitly injects untrusted focus events; it does not represent an operating-system focus test.

The current-head normal update gate also passed all five probes at approximately 0.3 ms. See [the head report](game-feel-evidence/head-performance.json). Reports marked `-dirty` were captured before committing the working tree and do not claim to be the unchanged base revision.

Five interleaved recording-off and recording-on samples under the normal local launcher both produced update p95 around 0.2 to 0.4 ms. The recorder's sampled observer p95 ranged from 0 to approximately 0.1 ms. Those samples fit the provisional 0.25 ms CPU allowance, with the limits of this short measurement window and timer resolution. See [the comparison report](game-feel-evidence/recording-overhead.json).

An earlier run with the CI-style browser launcher on this Mac produced update p95 outliers around 400 to 500 ms in both conditions. Repeating the comparison with the normal local launcher removed those outliers. Both reports are retained. This is evidence of a launch-environment difference, not a reason to relax the existing release threshold. Hardware frame delivery and physical input latency remain unmeasured.

Reproduce the focused evidence with `bun run test:e2e:game-feel`. JSON exports and screenshots are written under `output/game-feel/` and attached to the Playwright test results. The dedicated script uses port 4180. Set `GAME_FEEL_EVIDENCE_PORT` when running other Playwright commands against a separate checkout, so they do not reuse another checkout's development server.

## Follow-up defects found during verification

The existing CI performance job reported success despite a normal-condition failure. Its `tee` pipeline did not propagate the test's exit status under the default GitHub shell. The raw normal probes exceeded the threshold. A separate follow-up change must make the job fail correctly; a green badge from that workflow is not proof of this gate. The [affected job log](https://github.com/ddv1982/space-explorer/actions/runs/34003924071/job/101407598430) contains the failed normal condition.

Runtime profiling of the unchanged baseline identified the first-shot stall. `BulletPool.fire` creates the first `Bullet`, which generates its texture and calls canvas `getImageData`. Under the CI-style launcher on this Mac, the first update p95 was 495 ms and the readback itself took 492.7 ms. The default launcher measured 0.4 ms. Both launch modes reported a SwiftShader renderer.

A live experiment precreated only the player-bullet texture before input. Preparation took 449.6 ms, and the subsequent first-shot update p95 was 0.4 ms. This proves that the preparation is on the firing path. It does not identify every lower-level driver cause. The follow-up fix moves this existing work into pool initialization and keeps firing values and texture pixels unchanged.

The production-byte comparison above applies to the P0 recorder commit. The separate [first-shot preparation change](first-shot-preparation.md) changes initialization and has its own regression and performance evidence.
