# CI runtime

The reference is [workflow 42518843671](https://github.com/ddv1982/space-explorer/actions/runs/42518843671) at `df95453`. It passed every quality and browser gate. Its slowest browser job took 1,802 seconds, including 1,770 seconds in the test command. The other desktop shard took 1,394 seconds. Dependency installation took at most one second, and browser installation took 17 to 26 seconds across lanes. No test retry inflated the desktop reference. These are observed run times, not a repeated benchmark.

## Scheduling decision

Use six desktop shards, four mobile shards, and two portrait shards. Keep the existing projects, assertions, skip conditions, retries, renderer configuration, one worker per runner, and separate performance gate. This makes 15 browser jobs plus the quality and performance-gate jobs. Account concurrency and uneven test durations can still cause queues or long shards.

A second design would separate expensive renderer specs from ordinary functional specs. It adds another test-selection policy and risks project-name-dependent behavior, so the fixed-shard design is preferred. Setup caching cannot address the measured test-execution bottleneck.

## Coverage and timing proof

`bun run ci:coverage` lists each complete project and every configured shard through Playwright. It rejects omitted or duplicated test identities. Always-uploaded native JUnit results preserve actual failures, skips, and per-test durations. Large screenshots and traces remain failure-only artifacts.

Measure post-change job start, queue, step, and completion times on GitHub Actions before claiming an improvement. Compare with the reference above and disclose run count. More runners may reduce elapsed time at the cost of additional setup and runner concurrency. No gameplay speedup is claimed.

[Playwright sharding](https://playwright.dev/docs/test-sharding) documents test-level partitioning with fully parallel projects. [GitHub concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency) documents conditional cancellation.
