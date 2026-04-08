# Changelog

All notable changes to this project will be documented in this file.

## [0.8.6] - 2026-04-09

### Added
- Added a boss identity matrix (`docs/phase4-boss-identity-matrix.md`) mapping Levels 4-10 bosses to distinct rhythm, movement, and projectile-grammar goals.

### Changed
- Tuned BossConfig values across Levels 4-10 to increase per-boss identity contrast in phase cadence, mobility profile, and projectile pressure shape.
- Updated boss attack pattern logic so `pursuit` and `bulwark` styles respond more directly to configured spread/shot tuning, improving authored differentiation without changing core boss architecture.
- Preserved progression fairness by keeping boss identity changes within existing validation/test guardrails.

### Quality
- Verified with `bun run levels:validate`, `bun test`, and `bun run build`.

## [0.8.5] - 2026-04-09

### Added
- Added Phase 3 signature-moment design map (`docs/phase3-signature-moments.md`) describing distinct encounter identity goals for levels 4-10.

### Changed
- Implemented a signature encounter pass for levels 4-10 by differentiating each stage’s hazard choreography and section narrative cues.
- Updated section hazard blends and summaries across `Fracture Convoy`, `Cinder Vault`, `Graveyard Lattice`, `Mirage Archive`, `Halo Cartography`, `Glass Rift Narrows`, and `Eventide Singularity` to emphasize unique stage personalities.
- Preserved fairness/readability while increasing personality by keeping cadence and intensity transitions within validator guardrails.

### Quality
- Verified with `bun run levels:validate`, `bun test`, and `bun run build`.

## [0.8.4] - 2026-04-09

### Changed
- Completed Phase 2 level design tuning across the remaining campaign levels (Levels 4-10): `Fracture Convoy`, `Cinder Vault`, `Graveyard Lattice`, `Mirage Archive`, `Halo Cartography`, `Glass Rift Narrows`, and `Eventide Singularity`.
- Rebalanced hazard cadence/intensity and section spawn pressure to keep high-end difficulty while improving telegraph readability and reducing abrupt pressure spikes.
- Added explicit section `tensionArc` and `vatTarget` shaping throughout those levels to strengthen intro/build/hazard/climax/boss-approach emotional contouring.
- Lowered boss-approach pressure carryover in late stages to improve anticipation clarity before boss handoff.

### Quality
- Verified with `bun run levels:validate`, `bun test`, and `bun run build`.

## [0.8.3] - 2026-04-09

### Added
- Added a research synthesis note (`docs/level-design-research-notes.md`) translating Exa/Ref findings into practical level-design heuristics for pacing, telegraphing, readability, and recovery windows.

### Changed
- Added new level pacing/readability validator guardrails for section arc quality, early-level telegraph cadence, and abrupt hazard-transition detection.
- Retuned core campaign Levels 1-3 (`Solar Slipstream`, `Prism Reef`, `Magnetar Foundry`) for clearer intensity contours by adjusting hazard cadence/intensity, spawn pressure ramps, and section release windows.
- Introduced explicit `tensionArc` and `vatTarget` emotion shaping across those levels to make intra-section progression feel more intentional and legible.

### Quality
- Verified with `bun run levels:validate`, `bun test`, and `bun run build`.

## [0.8.2] - 2026-04-09

### Changed
- Reworked Level 2 (`Prism Reef`) music for a clearer groove and stronger progression: faster tempo, more grounded bass patterning, a more memorable lead motif, and denser section intensities.
- Added a custom stage arrangement curve for Level 2 so intro/build/peak/release transitions feel more intentional during ambush and hazard phases.

### Quality
- Verified with `bun run levels:validate`, `bun test`, and `bun run build`.

## [0.8.1] - 2026-04-09

### Changed
- Shortened the in-game pause hint copy to avoid overflow in the pause panel.
- Simplified README release notes link to a single `Latest` entry.

### Quality
- Verified with `bun test` and `bun run build`.

## [0.8.0] - 2026-04-09

### Changed
- Set `musicOutputGainBoost` to `2.9` so the 100% music volume ceiling has substantially more headroom.

### Quality
- Verified with `bun test` and `bun run build`.

## [0.7.9] - 2026-04-09

### Changed
- Increased music headroom once more by raising runtime output gain boost, so `100%` volume is stronger than v0.7.8.

### Quality
- Verified with `bun test` and `bun run build`.

## [0.7.8] - 2026-04-09

### Changed
- Increased music headroom again by raising the runtime output gain boost, so `100%` volume has a stronger ceiling than v0.7.7.

### Quality
- Verified with `bun test` and `bun run build`.

## [0.7.7] - 2026-04-09

### Added
- Added **MUSIC VOLUME** control to the Menu (home) Music Lab so volume can be tuned before starting gameplay.

### Changed
- Calibrated procedural music output gain so `100%` music volume plays noticeably louder than the prior baseline.
- Updated Menu music panel sizing and slider lifecycle wiring to support all four live controls (`creativity`, `energy`, `ambience`, `music volume`).

### Quality
- Verified with `bun run build` and `bun test`.

## [0.7.6] - 2026-04-09

### Added
- Added a dedicated **MUSIC VOLUME** slider to the in-game pause overlay so players can directly control live music loudness while paused.

### Changed
- Introduced explicit music-volume state and API methods in the audio managers, with pause-slider updates now scaling procedural music gain in real time.
- Expanded pause overlay layout sizing and copy so all four sliders (`creativity`, `energy`, `ambience`, `music volume`) fit cleanly without overlapping controls.

### Quality
- Verified with `bun test` and `bun run build`.

## [0.6.2] - 2026-04-08

### Fixed
- Ensured gameplay simulation truly halts while pause overlay is visible by short-circuiting entity `preUpdate` behavior when Arcade physics is paused.
- Prevented enemies, bullets, bombs, asteroid spin, and power-up bobbing/offscreen lifecycle updates from progressing during pause.

### Quality
- Verified with `npm run lint` and `npm run build`.

## [0.6.1] - 2026-04-08

### Changed
- Reduced scaled boss HP output to a global 30% tuning multiplier to significantly soften boss durability while preserving existing adaptive scaling behavior.

### Quality
- Verified with `npm run lint` and `npm run build`.

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
