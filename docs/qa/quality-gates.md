# Quality Gates

Space Explorer uses Bun for local and CI validation. The GitHub Actions workflow in `.github/workflows/quality.yml` runs the same gates expected before release.

## Local Gates

Run these before packaging a release or when a change touches shared runtime, level config, or tooling:

```bash
bun install --frozen-lockfile
bun run typecheck
bun run typecheck:ts6
bun run lint
bun run format:check
bun run architecture:check
bun run test
bun run test:e2e
bun run test:performance
bun run levels:validate
bun run knip
bun audit --audit-level=high
bun run build
bun run bundle:check
```

## Notes

- `bun run typecheck` uses TypeScript 7.0.2 as the authoritative compiler for production source, scripts, Vite config, and tests.
- Tests use the installed Bun assertion and mock types. Do not override `bun:test` with an untyped declaration.
- `bun run typecheck:ts6` checks the temporary TypeScript 6 compiler-API bridge retained for typescript-eslint compatibility.
- `bun run test` runs each test file in its own Bun process so file-level mocks and globals cannot leak across suites. Each suite times out after 60 seconds unless `TEST_SUITE_TIMEOUT_MS` is set. Use `bun run test -- --verbose` to print successful child output.
- `bun run test:e2e` runs two browser projects. Desktop covers the complete campaign and renderer sweeps. Touch starts in portrait and checks controls, rotation, saves, accessibility, combat, and representative renderer behavior. Both use real Phaser, WebGL, and Arcade Physics.
- CI has three job definitions and five validation jobs: quality, two desktop browser shards, one touch browser lane, and one isolated performance gate. Each browser runner uses one worker to avoid software-renderer contention.
- `bun run test:performance` runs five normal and five synthetic update-cost probes in one test. Every normal value must stay within 5 ms; every 6 ms injected probe must exceed that same limit. Samples, warmup, fresh-run isolation, activity assertions, and raw metrics remain. See `docs/qa/performance-gate-contract.md`.
- Native JUnit results are retained on success and failure. Screenshots and traces support failures; bulk screenshot collection and historical A/B experiments do not block PRs. Superseded pull-request runs are canceled without canceling in-progress main-branch workflows.
- `bun run test:e2e:game-feel` is a manual recording-tool check, separate from required game regression coverage.
- `bun run build` keeps the production build path focused on source type-checking plus Vite output.
- `bun run bundle:check` expects a fresh `dist/` from `bun run build`.
- Phaser is pinned to 4.2.1, consumed through its package ESM export, and configured for WebGL. Unsupported browsers receive the explicit WebGL-required state.
- Production `tsconfig.json` keeps `noUnusedLocals` / `noUnusedParameters` **off** because ESLint (`@typescript-eslint/no-unused-vars`) is the authoritative unused-symbol gate.
- Production deploy is a job on this same workflow. It runs only on `main` after quality, browser, and gameplay update-cost jobs succeed, uses a pinned Vercel CLI, and keeps tokens on the deploy steps.
- `bun audit --audit-level=high` is a quality step. Transitive `brace-expansion` and `nanoid` pins live in `package.json` `overrides` so the step fails on a new high instead of warning.

## Visual evidence

Playwright writes actual test results, including failures and skips, to `test-results/playwright-results.xml`. Screenshot attachments support human inspection. Capturing an image does not prove smooth edges, absence of shimmer, or visual improvement. Luminance, geometry, and procedural-background pixel checks report only their explicit assertions.

The old `flow-visual-evidence.xml` synthetic report is retired. No repository consumer used it. Any external integration must read the native Playwright report instead.

## Manual Release Smoke

Run this checklist when changes touch scene flow, persistence, controls, responsive layout, boss transitions, or audio lifecycle:

- Fresh load reaches the menu without console errors.
- Starting a run from the menu reaches gameplay on the first attempt.
- Save, load, delete, pause, resume, and return-to-menu controls work from the pause overlay.
- Mobile controls remain usable on a narrow viewport in both orientations (there is no rotate block).
- A non-final mission completes into PlanetIntermission and returns to gameplay.
- Boss defeat, player death, game-over, and victory transitions happen once and land on the expected scene.
- Audio unlocks after user input, resumes after pause/focus recovery, and does not stack duplicate music after scene transitions.

Use `docs/qa/scene-flow-smoke-checklist.md` for the focused scene-routing subset.
