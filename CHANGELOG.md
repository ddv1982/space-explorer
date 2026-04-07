# Changelog

All notable changes to this project will be documented in this file.

## [0.3.2] - 2026-04-07

### Changed
- Reduced player life-loss explosion severity by lowering player-only explosion visual and audio intensity values.
- Kept player death explosion timing immediate (no delayed trigger) and preserved existing boss explosion intensity.

### Quality
- Verified with `bun run lint`, `bun run knip`, and `bun run build`.

## [0.3.1] - 2026-04-07

### Changed
- Updated the life-loss explosion cue to reuse the same visual and audio intensities as boss explosions.
- Removed the delayed player death explosion trigger so the effect now fires immediately with no perceptible lag.

### Quality
- Verified with `bun run lint`, `bun run knip`, and `bun run build`.

## [0.2.1] - 2026-04-07

### Changed
- Increased scene vibrancy subtly by lifting global camera-grade brightness and saturation mapping in the shared rendering compatibility utility.
- Softened baseline vignette and slightly increased glow strength to make scenes read a bit lighter while preserving existing style.

### Quality
- Verified with `bun run lint`, `bun run knip`, and `bun run build`.

## [0.2.0] - 2026-04-07

### Changed
- Upgraded engine dependency to **Phaser 4.0.0-rc.7** and migrated renderer-related API usage from Phaser 3 `preFX` / `postFX` assumptions to Phaser 4 filter lists.
- Added a shared rendering compatibility utility (`src/utils/renderingCompat.ts`) to centralize camera and game-object filter behavior (DRY).
- Updated `EffectsManager`, `Player`, and `PowerUp` to use Phaser 4-compatible filter flows via the shared compatibility layer.

### Quality
- Verified with `bun run lint`, `bun run knip`, and `bun run build`.

## [0.1.3] - 2026-04-07

### Changed
- Refactored repeated Phaser scene lifecycle wiring into `src/utils/sceneLifecycle.ts` and adopted it in `GameScene`, `MenuScene`, `PlanetIntermissionScene`, and `WarpTransition`.
- Consolidated duplicated hex-color formatting helpers into `src/utils/colorUtils.ts` and reused it from HUD and menu code.
- Reduced repeated cleanup logic in `GameScene` by centralizing shared teardown behavior.

### Quality
- Verified with `bun run lint`, `bun run knip`, and `bun run build`.
