## Bundle Baseline (2026-04-10)

- Command: `bun run build`
- Output warning: `Some chunks are larger than 1600 kB after minification.`
- Notable chunk sizes:
  - `dist/assets/index-Dc0mJv79.js`: 1,623.84 kB (gzip 418.53 kB)
  - `dist/index.html`: 1.81 kB (gzip 0.81 kB)

## Current Startup Entry Path Summary

- Entry file `src/main.ts` statically imports Phaser plus only `BootScene`, `PreloadScene`, and `MenuScene`.
- `src/main.ts` constructs `new Phaser.Game(config)` with those startup scenes in the initial `scene` array.
- `src/scenes/sceneRegistry.ts` lazy-loads `GameScene`, `PlanetIntermissionScene`, `GameOverScene`, and `VictoryScene` on first use.
- `src/main.ts` eagerly wires viewport/resize recovery because mobile browser viewport changes affect the Phaser scale manager during play.
- `vite.config.ts` keeps Phaser in a manual `phaser` chunk and other dependencies in `vendor` when present, with `chunkSizeWarningLimit: 1500`.

## Low-Risk Optimization Targets

- Move non-boot scenes to dynamic imports and register/add them after boot/preload completes.
- Keep only minimal startup scenes in the initial bundle (`BootScene` and essential preload path).
- Add manual chunking in `vite.config.ts` (for example Phaser/runtime vs game scenes) to reduce main entry chunk size.
- Audit scene-level imports for large optional systems/assets and defer them behind scene activation paths.

## Post-Change Build Metrics (2026-04-10)

- Command: `bun run build`
- Config change: Added a conservative manual chunk strategy in `vite.config.ts` to emit `phaser` for `node_modules/phaser` and `vendor` for other `node_modules` dependencies.
- Current warning: `Some chunks are larger than 1500 kB after minification.` (`vite.config.ts` sets `chunkSizeWarningLimit: 1500`)
- Notable chunk sizes:
  - `dist/assets/phaser-CS3aEib-.js`: 1,351.46 kB (gzip 348.50 kB)
  - `dist/assets/index-0KqbZ6Bn.js`: 34.02 kB (gzip 10.46 kB)
  - `dist/assets/GameScene-Bd0f6A_O.js`: 126.14 kB (gzip 30.75 kB)
  - `dist/assets/colorUtils-DkbqjlyI.js`: 64.15 kB (gzip 16.29 kB)

## Baseline Comparison Notes

- Baseline had a single large app entry chunk: `dist/assets/index-Dc0mJv79.js` at 1,623.84 kB (gzip 418.53 kB).
- Post-change build moves Phaser engine code into a dedicated `phaser` chunk, reducing the app entry chunk to 34.02 kB (gzip 10.46 kB).
- Largest chunk size drops by 272.38 kB minified and 70.03 kB gzip versus baseline.
- Build can still warn at the configured 1500 kB threshold when the Phaser chunk grows beyond that guardrail.

## Bundle Guardrails

- `bun run bundle:report` reads files under `dist/`, skips sourcemaps, and prints a concise raw/gzip size summary (top 8 largest files plus totals).
- `bun run bundle:check` runs the same report in check mode and exits non-zero when a threshold is exceeded.
- Defaults:
  - Largest file threshold: `3500` kB (`BUNDLE_MAX_ASSET_KB`)
  - Total `dist` threshold: `30000` kB (`BUNDLE_MAX_TOTAL_KB`)
  - Largest JavaScript asset threshold: `1500` kB (`BUNDLE_MAX_JS_ASSET_KB`)
  - Total JavaScript threshold: `1800` kB (`BUNDLE_MAX_TOTAL_JS_KB`)
- Rationale: broad asset thresholds leave room for non-JS files, while JavaScript-specific thresholds keep the latest Phaser chunk baseline near ~1351 kB under a tighter guardrail and catch accidental JS regressions.
- Threshold overrides are supported for local/CI tuning, for example:
  - `bun run bundle:check --max-js-asset-kb 1450 --max-total-js-kb 1750`
  - `BUNDLE_MAX_JS_ASSET_KB=1450 BUNDLE_MAX_TOTAL_JS_KB=1750 bun run bundle:check`
- This guardrail is additive to Vite `chunkSizeWarningLimit`, so native Vite warnings remain visible during `bun run build`.

## Current Vite 8 Rebaseline (2026-06-16)

- Commands: `bun run build`, `bun run bundle:report`, `bun run bundle:check`.
- Build output: Vite 8.0.10 emitted lazy scene chunks plus the manual Phaser chunk without exceeding bundle guardrails.
- JavaScript chunks:
  - `dist/assets/phaser-CxcFaG1v.js`: 1,353.43 kB raw / 351.21 kB gzip.
  - `dist/assets/GameScene-Cu_Lm2tk.js`: 162.14 kB raw / 41.55 kB gzip.
  - `dist/assets/index-CYP4MDtu.js`: 122.91 kB raw / 35.10 kB gzip.
  - `dist/assets/AudioManager--0kR67TR.js`: 33.61 kB raw / 9.65 kB gzip.
  - `dist/assets/PlanetIntermissionScene-Do5cXozF.js`: 19.15 kB raw / 6.00 kB gzip.
- Bundle report totals: 21 files, 28,065.72 kB raw / 26,724.17 kB gzip; JavaScript total 1,659.73 kB raw.
- Largest assets remain premium background PNGs, led by `bg_level02.png` at 3,018.43 kB raw / 3,007.77 kB gzip.
- `bun run bundle:check` passed with thresholds: largest asset <= 3,500 kB, total <= 30,000 kB, largest JS <= 1,500 kB, total JS <= 1,800 kB.
