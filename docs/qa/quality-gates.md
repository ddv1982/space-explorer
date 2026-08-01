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
- `bun run test` runs each test file in its own Bun process so file-level mocks and globals cannot leak across suites.
- `bun run test:e2e` exercises the real Phaser runtime in desktop and mobile Chromium, including WebGL rendering, Arcade Physics, routing, resize, lifecycle recovery, and console-error failure.
- `bun run build` keeps the production build path focused on source type-checking plus Vite output.
- `bun run bundle:check` expects a fresh `dist/` from `bun run build`.
- Phaser is pinned to 4.2.1, consumed through its package ESM export, and configured for WebGL. Unsupported browsers receive the explicit WebGL-required state.
- Production `tsconfig.json` keeps `noUnusedLocals` / `noUnusedParameters` **off** because ESLint (`@typescript-eslint/no-unused-vars`) is the authoritative unused-symbol gate.

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
