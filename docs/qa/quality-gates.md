# Quality Gates

Space Explorer uses Bun for local and CI validation. The GitHub Actions workflow in `.github/workflows/quality.yml` runs the same gates expected before release.

## Local Gates

Run these before packaging a release or when a change touches shared runtime, level config, or tooling:

```bash
bun install --frozen-lockfile
bun run typecheck
bun run typecheck:ts6
bun run lint
bun run test
bun run test:e2e
bun run levels:validate
bun run knip
bun run build
bun run bundle:check
```

## Notes

- `bun run typecheck` uses TypeScript 7.0.2 as the authoritative compiler for production source, scripts, Vite config, and tests.
- `bun run typecheck:ts6` checks the temporary TypeScript 6 compiler-API bridge retained for typescript-eslint compatibility.
- `bun run test` runs each test file in its own Bun process so file-level mocks and globals cannot leak across suites. Each suite times out after 60 seconds unless `TEST_SUITE_TIMEOUT_MS` is set. Use `bun run test -- --verbose` to print successful child output.
- `bun run test:e2e` runs independent functional and visual coverage with bounded parallel workers, then runs timing-sensitive performance evidence alone on one worker. It exercises the real Phaser runtime in desktop and mobile Chromium, including WebGL rendering, Arcade Physics, routing, resize, lifecycle recovery, and console-error failure.
- CI runs static/build checks and the two browser lanes concurrently on separate runners. Each CI browser runner uses one Playwright worker because parallel Phaser instances can starve GitHub's software WebGL renderer; local hardware-backed browser runs retain four workers.
- CI performance evidence uses short structural samples and leaves refresh-cadence and real-time movement gates to hardware-backed local runs, because SwiftShader delivery is not representative of player hardware.
- `bun run build` keeps the production build path focused on source type-checking plus Vite output.
- `bun run bundle:check` expects a fresh `dist/` from `bun run build`.
- Phaser is pinned to 4.2.1, consumed through its package ESM export, and configured for WebGL. Unsupported browsers receive the explicit WebGL-required state.
- Production `tsconfig.json` keeps `noUnusedLocals` / `noUnusedParameters` **off** because ESLint (`@typescript-eslint/no-unused-vars`) is the authoritative unused-symbol gate.
- Production deploy is a job on this same workflow. It runs only on `main` after both quality and browser jobs succeed, uses a pinned Vercel CLI, and keeps tokens on the deploy steps.

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
