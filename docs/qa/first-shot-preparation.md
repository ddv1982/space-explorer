# Prepare the player bullet before firing

P0 verification found a first-shot stall in the unchanged game. The first call to `BulletPool.fire` constructs a `Bullet` and generates its texture. Phaser's canvas texture registration reads pixels with `getImageData`, which can block the gameplay update.

## Reproduction and intervention

The baseline was `fccb176a82542285807739f786a8fe661ccfb8d2`. The local experiment used Chrome 151, a 1280 by 720 viewport, ArrowLeft and Space, ten measured frames, and two warm-up frames.

| Condition | First update p95 | Repeat update p95 |
| --- | --- | --- |
| Normal local launcher | 0.4 ms | 0.3 ms |
| CI-style launcher | 495.0 ms | 0.5 ms |
| CI-style launcher with the player-bullet texture prepared before input | 0.4 ms | 0.4 ms |

The CI-style flags were `--enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader`. Both launch modes reported a SwiftShader renderer. Direct instrumentation measured 492.7 ms in the sole `getImageData` call during the first-shot probe. A CPU profile independently placed 487.9 ms of self-time in that native call.

Preparing the texture before input took 449.6 ms. This moves existing work into initialization; it does not eliminate its cost or prove every lower-level driver cause. The Linux CI log showed larger first-update outliers, but no Linux CPU profile was captured.

## Runtime change

`BulletPool.create` prepares the existing player-bullet texture before the pool can fire. The texture helper already reuses a cached texture. The `Bullet` constructor keeps its existing ensure call so standalone callers remain safe.

The change preserves bullet pixels, logical dimensions, collision bodies, speed, damage, cadence, and pool capacity. It does not choose a new movement model. Other first-use texture costs remain separate profiling candidates.

## Enforce the existing performance threshold

The normal CI threshold command was piped through `tee` under GitHub's unspecified shell. That shell uses `bash -e` without `pipefail`, so a failed test could leave the job green. The step now specifies `shell: bash`, which enables `-eo pipefail` in GitHub Actions. The existing 5 ms threshold and six-millisecond synthetic negative control remain unchanged.

A local shell check reproduced the problem. `exit 7 | tee ...` returned zero with `bash -e` and seven with `bash --noprofile --norc -eo pipefail`. The workflow change preserves logs while propagating failure.

The browser regression checks texture preparation before the first firing input and verifies that a real first shot adds no further player-bullet canvas readback. The performance check must also pass without hiding the first frame, increasing the warm-up, disabling effects, or relaxing the threshold.

## Verified results

The browser regression failed before the change on desktop and mobile, with zero player-bullet readbacks before firing. After the change, both recorded one readback before firing and still one after a visible shot. The texture cache test in `tests/generatedTexture.test.ts` also covers reuse without generation.

With the CI-style local launcher and the unchanged ten-frame method, all five normal probes passed at 0.4 to 1.0 ms update p95. All five synthetic probes exceeded 5 ms at 6.3 to 6.8 ms, and the command exited nonzero as required. See [the raw gate report](game-feel-evidence/first-shot-gate.json). These results measure the named local environment, not every player device.

At texture-preparation revision `1200489`, all 119 unit-test files, both compiler checks, lint, formatting, architecture, unused-code checks, level validation, production build, and bundle budgets pass. Initialization carries the preparation work; a full human first-session and physical-device assessment remains part of the playtest program.

## Prepare the first physics object

Integrated verification at `5fd40e3` found a smaller cold firing cost after texture preparation. A local CPU profile placed the first update in `BulletPool` object acquisition, Phaser sprite/body construction, and the upward muzzle calculation. The remote CI failure measured 6 ms on its first probe. A separate run spiked on its third probe, so cold allocation does not explain every remote outlier.

The pool now prepares one disabled, invisible bullet during scene creation. Its first shot reuses that object; later acquisition and the 100-bullet capacity are unchanged. The muzzle calculation directly writes the upward position established by P1. A real Phaser regression checks dormant state, first reuse, kill/reuse, full capacity, and overflow rejection. Restoring the empty-pool implementation makes that regression fail.

| Local diagnostic | Before | After |
| --- | --- | --- |
| First update p95, CPU profiler | 1.7 ms | 0.7 ms |
| First update p95, profiler and 4x CPU throttle | 4.1 ms | 3.0 ms |
| First acquisition, narrow timing and 4x throttle | 1.6 ms | 0.2 ms |

These instrumented measurements identify work and compare the intervention; they are not device latency results. The unchanged normal gate passed five probes at 0.3 to 0.7 ms. The synthetic condition rejected all five at 6.2 to 6.6 ms. The ten-frame sample, two warm-up frames, 5 ms threshold, and 6 ms synthetic workload remain unchanged. See the [allocation measurements](game-feel-evidence/bullet-allocation-gate.json). Remote CI must validate the final integrated revision separately.
