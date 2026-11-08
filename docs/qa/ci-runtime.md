# CI runtime and coverage

The reference is [workflow 42518843671](https://github.com/ddv1982/space-explorer/actions/runs/42518843671) at `df95453`. Its slowest browser job took 1,802 seconds, including 1,770 seconds in the test command. The other desktop shard took 1,394 seconds. Dependency installation took at most one second, and browser installation took 17 to 26 seconds. No test retry inflated the desktop reference. These are observed run times, not a repeated benchmark.

## Keep the workflow small

CI has three job definitions: quality, browser, and performance. The browser matrix uses three built-in shards for each of the desktop and touch-portrait profiles. Each runner has one browser worker. The performance test checks the same five normal and five injected regressions in one command, without an expected-failure shell protocol.

The initial alternative added 17 validation runners and a custom shard-inventory checker. It preserved every historical test, but increased machinery. The user requested simpler CI and necessary tests, so that unpushed candidate was superseded. Playwright's built-in sharding handles the small fixed matrix.

## Remove work without removing contracts

| Removed work | Retained regression proof |
| --- | --- |
| Repeated ten-world and ten-level sweeps under mobile emulation | Complete desktop campaign sweeps, plus touch combat, controls, rotation, and representative renderer checks |
| Historical baseline/direct control profiles | Shipped native controls at 60 and 120 Hz, stopping, normalized movement, and firing direction |
| Legacy-versus-current projectile-trail experiments | Normal update-cost acceptance, synthetic regression sensitivity, actual projectile and collision checks |
| Capture-only quality/phase screenshots | Objective contrast, viewport bounds, textures, and layout assertions; failure screenshots and traces |
| Two full games for cross-tab storage | Same-origin pages, real storage writes and events, visibility updates, and deletion |
| Wrapper test that reran the architecture CLI and asserted report strings | The actual architecture CI check and focused policy fixtures |
| Broad custom performance pass reports | Native Playwright test results and raw probe metrics |

Recorder diagnostics remain manually available. Saves, fatal-hit precedence, retries, accessible actions, audio recovery, shader recovery, GPU teardown, and the performance limits remain protected. A smaller count alone does not establish adequate coverage; the retained behavior must pass on the actual browser.

## Measure the result

Use post-change Actions job start and completion times, test results, and runner time. Compare with the reference and disclose run count. No speedup is established until the revised workflow completes. [Playwright sharding](https://playwright.dev/docs/test-sharding) documents the built-in partitioning. [GitHub concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency) documents conditional cancellation.

## First cleanup measurement

[Workflow 42524597057](https://github.com/ddv1982/space-explorer/actions/runs/42524597057) passed the cleaned-up suite. Recorded validation runner time fell from 6,948 to 4,391 seconds. The longest job fell from 1,802 to 1,511 seconds, with the single touch lane becoming the bottleneck. These are one observed run per version, not a repeated benchmark.

The next scheduling adjustment uses the same three shards for each profile. This replaces special-case lane entries with a Cartesian matrix and keeps all retained tests unchanged. Measure the final run before claiming its elapsed-time improvement.
