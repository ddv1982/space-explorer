# Changelog

All notable changes to this project will be documented in this file.

## [0.1.3] - 2026-04-07

### Changed
- Refactored repeated Phaser scene lifecycle wiring into `src/utils/sceneLifecycle.ts` and adopted it in `GameScene`, `MenuScene`, `PlanetIntermissionScene`, and `WarpTransition`.
- Consolidated duplicated hex-color formatting helpers into `src/utils/colorUtils.ts` and reused it from HUD and menu code.
- Reduced repeated cleanup logic in `GameScene` by centralizing shared teardown behavior.

### Quality
- Verified with `bun run lint`, `bun run knip`, and `bun run build`.
