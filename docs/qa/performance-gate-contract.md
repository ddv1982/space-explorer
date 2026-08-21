# Performance Gate Contract

## Decision

The release gate is desktop `workCost.update.p95Ms`, measured by the browser harness between Phaser `PRE_STEP` and `POST_STEP`. The threshold is **2 ms** for a 10-frame measured window after 2 warm-up frames. The normal and synthetic commands each run five fresh gameplay replicates; the synthetic condition adds 6 ms of update work and must fail the same threshold assertion.

This signal is suitable for enforcement because it measures application update work rather than software-renderer delivery. RAF cadence, render-submission timing, mobile timing, and runtime-load counts remain diagnostic evidence. They must not fail releases on GitHub-hosted SwiftShader runners.

## Environment

- Browser project: `chromium-desktop-performance-gate`, `1280x720`, one worker, retries disabled, Vite development server with the development-only harness.
- Intended CI runner: GitHub-hosted `ubuntu-24.04`, isolated in the `performance-gate` job.
- CI-shaped characterization host: macOS, 10 logical cores, 16 GiB reported device memory.
- Browser: HeadlessChrome 151.0.7922.34.
- Renderer: ANGLE Vulkan SwiftShader.
- Production builds remain free of the browser harness.

The workflow runs the normal threshold command as a required pass, then requires the same command to fail with 6 ms of synthetic work. It uploads each command's `test-results/` directory even on failure. A GitHub-hosted baseline above 2 ms invalidates this contract; do not loosen the threshold without a new characterization.

## Method

1. Start a fresh Level 1 run at Standard quality for each replicate.
2. Hold movement and fire so update work includes active player input, projectiles, effects, and normal encounter progression.
3. Discard 2 warm-up frames and measure 10 frames.
4. Run five normal replicates, then run five synthetic replicates through the same assertion.
5. Inject synthetic work only inside the development browser harness. The 6 ms busy workload starts during `PRE_STEP`, is included in update cost, and disappears when the probe cleans up.
6. Attach per-replicate values, median, min/max, median absolute deviation, coefficient of variation, environment data, and synthetic failure count.

The short update-cost window is the supported gate contract. Longer RAF and rendering windows remain diagnostic because software rendering does not represent player-facing delivery cadence.

## Threshold

One source-bound CI-shaped execution produced five normal and five synthetic replicates:

- Baseline update p95: `0.3–0.5 ms`, median `0.4 ms`.
- Synthetic update p95: `6.3–6.5 ms`, median `6.4 ms`.
- Paired median separation: approximately `6 ms`.
- Synthetic failures at 2 ms: `5/5`.

The candidate formula is maximum observed baseline plus `max(1 ms, 3 * MAD)`, rounded up to a whole millisecond. Maximum baseline `0.5 ms` plus the 1 ms floor gives `1.5 ms`, rounded to the `2 ms` threshold. Relative CV is retained only as context because sub-millisecond timer quantization makes it misleading for a near-zero baseline.

## Commands

Required normal gate:

```bash
bun run test:e2e:performance:gate
```

Synthetic sensitivity check, which must exit nonzero:

```bash
bun run test:e2e:performance:gate:synthetic
```

General performance evidence remains `bun run test:e2e:performance`. The source-bound local CI-shaped values and exact commands are recorded in `docs/qa/performance-gate-baseline.json`; GitHub Actions artifacts are the authoritative evidence for the intended runner.
