# Changelog

All notable changes to this project will be documented in this file.

## [0.2.3] - 2026-04-07

### Performance
- Refactored runtime performance policy into a shared module to remove duplicated heuristics and keep fallback behavior consistent.
- Added particle emitter bounds/culling controls (`maxAliveParticles`, `maxParticles`, `viewBounds`) to reduce avoidable update/render load.
- Reduced emitter config churn by caching explosion and power-up burst config updates.

### Changed
- Rebalanced Asteroid Belt Alpha visuals to restore a darker baseline while retaining vibrant cyan upgrade styling.

### Quality
- Verified with `bun run lint`, `bun run knip`, and `bun run build`.

## [0.2.2] - 2026-04-07

### Performance
- Added conservative runtime FPS fallback logic to reduce optional visual workload only under sustained low FPS (5-second grace period + two low-FPS windows).
- Optimized effects/background behavior in fallback mode (reduced burst density, optional glow cost, and background motion/detail load).

### Changed
- Retuned **Asteroid Belt Alpha** to keep a dark mood while improving vibrancy through stronger cyan palette values and grade settings.

### Quality
- Verified with `bun run lint`, `bun run knip`, and `bun run build`.

## [0.2.1] - 2026-04-07

### Fixed
- Corrected camera color-grade mapping after the Phaser 4 migration by converting legacy level `colorGrade` values to Phaser 4 `ColorMatrix` semantics.
- Reduced overly dark presentation by retuning global camera vignette and glow strengths.

### Performance
- Removed an expensive full-screen blur pass from gameplay camera filters.
- Added low-performance adaptive scaling for particle reserve/burst counts and parallax scenic detail generation.

### Quality
- Verified with `bun run lint`, `bun run knip`, and `bun run build`.

## [0.2.0] - 2026-04-07

### Changed
- Upgraded the engine dependency from Phaser 3.90 to Phaser 4.0.0-rc.7, including migration from legacy `preFX` / `postFX` usage to Phaser 4 filter lists.
- Increased ship visual fidelity by adding richer contour lighting, rim highlights, heat bloom, and extra procedural panel detail in `SpriteFactory`.
- Upgraded scene presentation with denser parallax starfields, richer nebula layers, softened particle textures, and enhanced camera filtering.

### Quality
- Verified with `bun run build` and `bun run lint`.

## [0.1.3] - 2026-04-07

### Changed
- Refactored repeated Phaser scene lifecycle wiring into `src/utils/sceneLifecycle.ts` and adopted it in `GameScene`, `MenuScene`, `PlanetIntermissionScene`, and `WarpTransition`.
- Consolidated duplicated hex-color formatting helpers into `src/utils/colorUtils.ts` and reused it from HUD and menu code.
- Reduced repeated cleanup logic in `GameScene` by centralizing shared teardown behavior.

### Quality
- Verified with `bun run lint`, `bun run knip`, and `bun run build`.
