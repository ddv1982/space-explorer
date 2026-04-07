# Changelog

All notable changes to this project will be documented in this file.

## [0.6.0] - 2026-04-08

### Added
- New in-game pause menu triggered by `ESC`, with dedicated overlay actions for resume and return to main menu.
- Mobile portrait orientation pause behavior that uses the same pause overlay variant and requires rotating back to landscape to resume gameplay.
- Shared runtime music controls (`creativity`, `energy`, `ambience`) in both Menu and Pause screens, with immediate audible effect across active music playback.

### Changed
- Tuned procedural music runtime response curves and defaults for stronger, more perceptible slider behavior while keeping runtime-only reset semantics on reload.

### Architecture
- Introduced `PauseStateController` to centralize pause responsibility (manual/orientation state, physics pause/resume, and pause overlay coordination) outside `GameScene`.
- Split pause overlay implementation into focused modules (`pauseOverlay/types.ts`, `pauseOverlay/view.ts`, and `pauseOverlay/controls.ts`) to reduce file size and improve separation of concerns.
- Split `MenuScene` UI construction into `menuScene/layout.ts` and `menuScene/panels.ts`, leaving scene flow orchestration in `MenuScene`.
- Added shared music runtime tuning helpers and profile mapping modules to remove duplication and keep audio mapping policy isolated.

### Quality
- Verified with `npm run lint` and `npm run build`.

## [0.5.4] - 2026-04-07

### Changed
- Increased every campaign boss base `maxHp` to a much higher four-digit progression ladder to address under-tuned boss durability.
- Kept strict level-by-level boss HP escalation so each boss is tougher than the previous one.

### Quality
- Verified with `bun run lint`, `bun run build`, `bun run knip`, and `bun run levels:validate`.

## [0.5.3] - 2026-04-07

### Changed
- Rebalanced adaptive boss HP scaling to react much more strongly to offensive upgrades, especially fire-rate and damage investment.
- Added level-gated offense scaling and stronger progression/defense contributions so upgraded runs still face durable, readable boss fights.

### Quality
- Verified with `bun run lint`, `bun run build`, `bun run knip`, and `bun run levels:validate`.

## [0.5.2] - 2026-04-07

### Added
- Adaptive boss durability scaling that increases boss max HP based on player upgrade investment and campaign progression.
- New `bun run levels:validate` command with level authoring guardrails for section continuity, boss trigger coherence, and hazard parameter sanity.

### Changed
- Introduced section-identity pacing hooks (tension-arc + VAT tension bias) to shape spawn and music intensity over section progress.
- Added hazard-pressure fairness throttling in `WaveManager` to smooth extreme hazard + encounter overlap spikes.

### Quality
- Verified with `bun run levels:validate`, `bun run lint`, `bun run build`, and `bun run knip`.

## [0.5.1] - 2026-04-07

### Changed
- Refactored `ParallaxBackground` lifecycle orchestration to reduce DRY duplication by centralizing create/destroy/rebuild paths for level visual layers.
- Cleaned moon surface and passing-planet layer state modeling with dedicated typed state and helper-based reset/offscreen handling.
- Replaced fragile magic-number motion/reset behavior with named constants and config-driven motion parameters while preserving visuals.

### Quality
- Verified with `bun run lint`, `bun run knip`, and `bun run build`.

## [0.5.0] - 2026-04-07

### Added
- New moon base surface background layer for Graveyard Lattice level (Wreckfield Run): procedurally generated terrain with horizon glow, crater field, lit base structures (buildings with windows, antennas with blinking lights), runway strips, and atmospheric scatter — the player now flies over a wrecked relay surface.
- New passing planet fly-by background layers for Prism Reef level (Nebula Pass): three procedurally generated planets at varying depths (200/100/300px), scroll speeds, and opacity levels drift across the background creating depth parallax as the player flies through the nebula system. Planets feature surface band noise, atmospheric halos, specular highlights, and optional ring systems.

### Architecture
- Extended `LevelConfig` with optional `moonSurface` (MoonSurfaceConfig) and `passingPlanets` (PassingPlanetConfig[]) fields for per-level background layer configuration.
- Added two new modular texture generators under `src/systems/parallax/`: `moonSurfaceGenerator.ts` and `passingPlanetGenerator.ts`, following established DRY patterns.
- Wired new layers into `ParallaxBackground` lifecycle (create/update/destroy/resize) alongside existing scenic/planet/debris/twinkle systems.

### Quality
- Verified with `bun run lint` (zero errors/warnings), `bun run knip`, and `bun run build`.

## [0.4.1] - 2026-04-07

### Changed
- Refactored oversized rendering systems for maintainability: extracted particle texture generation into `src/systems/effects/particleTextureFactory.ts` and split parallax texture generation into focused modules under `src/systems/parallax/`.
- Reduced DRY violations by centralizing shared texture-generation utilities and reusable drawing workflows.
- Brightened first level (Solar Slipstream) readability by tuning `bgColor`, `nebulaAlpha`, and `colorGrade` values while preserving level identity.
- Validated implementation approach against Phaser 4 guidance (modular rendering responsibilities, reusable texture workflows, and context-safe filter architecture) using Exa + local Phaser API research.

### Quality
- Verified with `bun run lint`, `bun run knip`, and `bun run build`.

## [0.4.0] - 2026-04-07

### Changed
- Replaced all 10 particle textures with visually distinct procedural shapes: irregular fire-burst explosions, elongated spark streaks, flash-ring muzzle effects, soft smoke wisps for exhaust, multi-layered glow trails, star-burst impacts, four-point sparkle stars, multi-layered burst glows, and irregular debris polygon chunks.
- Enhanced nebula rendering with vortex/swirl arm patterns, dense cloud cluster formations, color gradient bands, and more varied organic cloud shapes.
- Upgraded planet rendering with surface band noise (gas giant feel), specular highlight, limb darkening, multi-ring system with gap detail, cloud wisps on surface, and outer atmospheric halo layer.
- Added star twinkle shimmer system with 12-24 animated sparkle sprites per level that pulse in brightness using sine-wave oscillation.

### Quality
- Verified with `bun run lint`, `bun run knip`, and `bun run build`.

## [0.3.3] - 2026-04-07

### Changed
- Refactored level progression architecture to use explicit campaign definitions (core and expansion) with campaign metadata instead of opaque bare arrays.
- Centralized campaign flattening in a shared helper and added guardrails that fail fast on empty campaigns or duplicate level entries.
- Kept runtime level order and selector behavior unchanged while making campaign structure clearer and easier to extend.

### Quality
- Verified with `bun run lint`, `bun run knip`, and `bun run build`.

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
