## Bundle Baseline (2026-04-10)

- Command: `bun run build`
- Output warning: `Some chunks are larger than 1600 kB after minification.`
- Notable chunk sizes:
  - `dist/assets/index-Dc0mJv79.js`: 1,623.84 kB (gzip 418.53 kB)
  - `dist/index.html`: 1.81 kB (gzip 0.81 kB)

## Startup Entry Path Summary

- Entry file `src/main.ts` statically imports Phaser plus all scenes at startup: `BootScene`, `PreloadScene`, `MenuScene`, `GameScene`, `PlanetIntermissionScene`, `GameOverScene`, `VictoryScene`.
- `src/main.ts` immediately constructs `new Phaser.Game(config)` with all scene classes in the initial `scene` array.
- `src/main.ts` also wires viewport/resize listeners eagerly, but this is likely minor versus scene + engine code.
- `vite.config.ts` has default chunking behavior and a raised warning threshold (`chunkSizeWarningLimit: 1600`), so current output remains mostly as one large JS bundle.

## Low-Risk Optimization Targets

- Move non-boot scenes to dynamic imports and register/add them after boot/preload completes.
- Keep only minimal startup scenes in the initial bundle (`BootScene` and essential preload path).
- Add manual chunking in `vite.config.ts` (for example Phaser/runtime vs game scenes) to reduce main entry chunk size.
- Audit scene-level imports for large optional systems/assets and defer them behind scene activation paths.

## Post-Change Build Metrics (2026-04-10)

- Command: `bun run build`
- Config change: Added a conservative manual chunk strategy in `vite.config.ts` to emit `phaser` for `node_modules/phaser` and `vendor` for other `node_modules` dependencies.
- Current warning: `Some chunks are larger than 500 kB after minification.` (default warning threshold, no warning-limit increase used)
- Notable chunk sizes:
  - `dist/assets/phaser-CS3aEib-.js`: 1,351.46 kB (gzip 348.50 kB)
  - `dist/assets/index-0KqbZ6Bn.js`: 34.02 kB (gzip 10.46 kB)
  - `dist/assets/GameScene-Bd0f6A_O.js`: 126.14 kB (gzip 30.75 kB)
  - `dist/assets/colorUtils-DkbqjlyI.js`: 64.15 kB (gzip 16.29 kB)

## Baseline Comparison Notes

- Baseline had a single large app entry chunk: `dist/assets/index-Dc0mJv79.js` at 1,623.84 kB (gzip 418.53 kB).
- Post-change build moves Phaser engine code into a dedicated `phaser` chunk, reducing the app entry chunk to 34.02 kB (gzip 10.46 kB).
- Largest chunk size drops by 272.38 kB minified and 70.03 kB gzip versus baseline.
- Build still warns at default 500 kB due Phaser chunk size, but warning is now informative instead of muted by a raised threshold.
