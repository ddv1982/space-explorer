# Quality Gates

Space Explorer uses Bun for local and CI validation. The GitHub Actions workflow in `.github/workflows/quality.yml` runs the same gates expected before release.

## Local Gates

Run these before packaging a release or when a change touches shared runtime, level config, or tooling:

```bash
bun install
bun run typecheck
bun run lint
bun test
bun run levels:validate
bun run knip
bun run build
bun run bundle:check
```

## Notes

- `bun run typecheck` covers production source, scripts, Vite config, and tests.
- `bun run build` keeps the production build path focused on source type-checking plus Vite output.
- `bun run bundle:check` expects a fresh `dist/` from `bun run build`.

## Manual Release Smoke

Run this checklist when changes touch scene flow, persistence, controls, responsive layout, boss transitions, or audio lifecycle:

- Fresh load reaches the menu without console errors.
- Starting a run from the menu reaches gameplay on the first attempt.
- Save, load, delete, pause, resume, and return-to-menu controls work from the pause overlay.
- Mobile controls and orientation overlay remain usable on a narrow viewport.
- A non-final mission completes into PlanetIntermission and returns to gameplay.
- Boss defeat, player death, game-over, and victory transitions happen once and land on the expected scene.
- Audio unlocks after user input, resumes after pause/focus recovery, and does not stack duplicate music after scene transitions.

Use `docs/qa/scene-flow-smoke-checklist.md` for the focused scene-routing subset.
