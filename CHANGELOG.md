# Changelog

All notable changes to this project will be documented in this file.

## [1.1.4] - 2026-04-27

### Changed
- Simplified `PauseStateController` pause-state publishing so overlay/mobile-control updates flow through one shared path while preserving existing pause and orientation-block behavior.
- Centralized non-empty campaign validation in `src/config/levels/campaigns.ts` and extracted shared arrangement clone/merge helpers for level music configuration.

### Quality
- Added regression coverage for pause-state semantics, campaign validation, and `createSignatureMusic()` arrangement immutability.
- Verified with `bun test`, `bun run levels:validate`, `bun run lint`, `bun run build`, and `bun run bundle:check`.


## [1.1.1] - 2026-04-22

### Changed
- Split large gameplay, intermission, parallax, and sprite-generation modules into focused helpers while keeping existing runtime behavior and visual output aligned with the `1.1.0` release line.
- Centralized generated-texture creation and parallax motion helpers so shared rendering paths are easier to maintain without changing authored level content or release-facing features.

### Quality
- Verified with `bun run lint`, `bun test`, `bun run build`, `bun run levels:validate`, and `bun run bundle:check`.

## [1.1.0] - 2026-04-21

### Added
- Added active player and enemy bullet trails routed through shared gameplay presentation events.
- Added config-driven `visualModifiers` support on level sections so atmosphere and scenic emphasis can be authored per pacing beat.
- Added shared hazard-linked scenic response overlays for storms, gravity wells, ambush fog, crossfire arcs, debris surges, minefields, and corridor pressure.
- Added attack-style-based procedural boss visual variants with deterministic accent motifs.
- Added reusable transient camera color pulses for dramatic gameplay beats.
- Added edge-only foreground silhouette treatment for extra depth without entering the main dodge lane.

### Changed
- Overhauled the procedural ship silhouette language for the player, helper, scout, fighter, bomber, gunship, and swarm roster to improve small-scale readability and role identity.
- Added lightweight section-reactive atmosphere modulation so background drift, twinkle, and landmark emphasis now breathe with pacing.
- Upgraded Prism Reef and Magnetar Foundry with stronger landmark identity using shared moon-surface horizon treatment.
- Concentrated extra spectacle in `Eventide Singularity` with stronger authored section visual escalation and finale-phase presentation.

### Quality
- Verified with `bun run levels:validate` and `bun run build`.

## [1.0.0] - 2026-04-10

### Changed
- Promoted the project to `1.0.0` as a clean major baseline release.
- Reset remote release/tag history and published a single major release track starting at `v1.0.0`.

### Included Improvements
- Runtime smoothness optimizations from recent `0.8.x` work (pool lifecycle hardening, resize/parallax churn reductions, death/respawn smoothing).
- Bundle startup improvements (lazy scene registration and explicit chunk splitting) plus new bundle guardrail tooling (`bundle:report` / `bundle:check`).
- Additional scene-flow confidence coverage and a release smoke-check checklist.

### Quality
- Verified with `bun run levels:validate`, `bun test`, `bun run build`, and `bun run bundle:check`.

## [0.8.16] - 2026-04-10

### Added
- Added bundle guardrail tooling via `bun run bundle:report` and `bun run bundle:check` to track output size trends and catch regressions with explicit thresholds.
- Added a scene-flow smoke checklist (`docs/qa/scene-flow-smoke-checklist.md`) for quick pre-release transition verification.

### Changed
- Expanded scene registry tests to cover pre-registered scene skip behavior and loader-failure no-start behavior.
- Documented bundle-check usage and threshold rationale in bundle optimization notes.

### Quality
- Verified with `bun run levels:validate`, `bun test`, `bun run build`, and `bun run bundle:check`.

## [0.8.15] - 2026-04-10

### Changed
- Reduced startup bundle weight by removing gameplay/ending scenes from eager app bootstrap and loading them on demand through a shared scene registry.
- Added Vite manual chunking to split Phaser engine/runtime dependencies into dedicated `phaser` and `vendor` chunks for leaner entry payloads.

### Quality
- Verified with `bun run levels:validate`, `bun test`, and `bun run build`.

## [0.8.14] - 2026-04-10

### Added
- Added an opt-in respawn transition frame probe (`?debugRespawnFrameProbe=1` or `globalThis.__SPACE_EXPLORER_RESPAWN_FRAME_PROBE__ = true`) to log transition frame-time stats for hitch analysis.

### Changed
- Reduced player-death explosion particle budget by adding a `particleBudgetScale` path in `EffectsManager.createExplosion(...)` and tuning the death cue to use a conservative budget scale.
- Wired probe sampling through gameplay-locked update windows and respawn begin/finish lifecycle points so respawn telemetry is captured without changing baseline gameplay flow.

### Quality
- Verified with `bun run levels:validate`, `bun test`, and `bun run build`.

## [0.8.13] - 2026-04-10

### Fixed
- Fixed death/respawn transition hitching by switching respawn freeze control from scene pause/resume to Arcade physics world pause/resume, avoiding broader scene lifecycle churn during life-loss recovery.

### Changed
- Removed the cross-clock respawn watchdog `setTimeout` path so respawn completion now runs through a single coherent flow without browser-timer divergence.

### Quality
- Verified with `bun run levels:validate`, `bun test`, and `bun run build`.

## [0.8.12] - 2026-04-10

### Fixed
- Fixed pooled-entity despawn lifecycle so inactive pooled objects now disable Arcade physics body participation instead of leaving bodies enabled.

### Changed
- Debounced resize/parallax rebuild and restart paths to reduce repeated heavyweight work during noisy viewport changes.
- Updated boss targeting to use a stable player reference path with safe fallback lookup, reducing repeated scene-child scans in hot paths.
- Reduced transient allocation churn in flash/effects flows by switching to scoped delayed callbacks and reusing popup/tween config pathways.

### Quality
- Verified with `bun run levels:validate`, `bun test`, and `bun run build`.

## [0.8.11] - 2026-04-09

### Fixed
- Fixed an invalid helper-wing state where depleted helper support could be re-granted again on last life across later levels.

### Changed
- Added persistent helper `grantedSlots` tracking so the runtime can distinguish never-granted slots from already-spent slots.
- Updated helper grant logic to allocate only the next ungranted slot, preventing resurrection of spent helper slots while preserving controlled two-slot progression.

### Quality
- Verified with `bun run levels:validate`, `bun test`, and `bun run build`.

## [0.8.10] - 2026-04-09

### Added
- Added persistent helper-wing run state so helper ships now carry across level transitions until their own HP/lives are depleted.

### Changed
- Updated helper-wing runtime to restore persisted helpers on level load and allow additional helper grants to fill open support slots over time (e.g. one ship per side).
- Kept transition safety hardening in place while persisting helper state, so helpers are still safely suspended/cleaned during scene handoff.

### Quality
- Verified with `bun run levels:validate`, `bun test`, and `bun run build`.

## [0.8.9] - 2026-04-09

### Fixed
- Fixed a level-transition runtime crash (`TypeError: undefined is not an object (evaluating 'n.forEach')`) that could occur when helper-wing support was active during stage handoff.

### Changed
- Hardened helper-wing lifecycle management by tracking helper overlap colliders and explicitly destroying them during helper system teardown.
- Added transition-time helper suspension so active helper ships are disabled before level-complete handoff and warp/intermission scene changes.

### Quality
- Verified with `bun run levels:validate`, `bun test`, and `bun run build`.

## [0.8.8] - 2026-04-09

### Added
- Added a new last-life helper-wing assist system for late-game levels: allied mini-ships can activate on final life, follow the player, fire support shots, and persist until their helper lives are exhausted.
- Added helper-wing research notes (`docs/helper-wing-research-notes.md`) documenting Exa + Ref implementation guidance for Phaser/Arcade integration choices.

### Changed
- Extended level schema with optional `lastLifeHelperWing` tuning so helper support can be enabled per level without affecting earlier campaign pacing.
- Integrated helper-wing lifecycle signaling into GameScene/HUD via new gameplay events (`helper-wing-activated`, `helper-wing-depleted`) with announcement feedback.
- Enabled helper-wing support on late expansion levels (`Graveyard Lattice`, `Mirage Archive`, `Halo Cartography`, `Glass Rift Narrows`, `Eventide Singularity`) with authored per-level cadence tuning.

### Quality
- Verified with `bun run levels:validate`, `bun test`, and `bun run build`.

## [0.8.7] - 2026-04-09

### Added
- Added explicit boss phase-change telegraph flow using a new `boss-phase-change` gameplay event and a HUD phase announcement banner.
- Added optional `phaseTransitionPauseMs` to `BossConfig` so phase-change readability can be tuned per boss.

### Changed
- Updated boss runtime to pause attacks briefly on phase transition and emit phase-change events before phase-two pressure resumes.
- Tuned late-campaign boss configurations (Levels 4-10) for clearer cadence identity and phase handoff readability.
- Updated pursuit and bulwark attack patterns to honor configured spread/shot parameters more directly for stronger authored differentiation.

### Quality
- Verified with `bun run levels:validate`, `bun test`, and `bun run build`.

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
