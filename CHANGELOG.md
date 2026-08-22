# Changelog

All notable changes to this project will be documented in this file.

## [1.17.0] - 2026-08-22

### Added
- Added an explicit high-density-to-logical texture resolve so procedural entity edges retain smooth coverage without permanently increasing texture memory.
- Added desktop and phone-portrait visual evidence across Low, Standard, High, and Auto with controlled half-pixel motion phases.
- Added failure-path coverage for temporary canvas ownership, pre-registration construction errors, post-registration listener errors, and cleanup exception precedence.

### Changed
- Low, Standard, High, and Auto now generate gameplay entity textures from the same 4x supersampled source while particle and spectacle budgets remain tiered.
- Generated textures now register at their authored logical dimensions instead of repairing private Phaser frame metadata after upload.
- Browser evidence now records authored frame and source-canvas dimensions alongside quality tier and motion phase.

### Quality
- Passed both TypeScript compilers, architecture checks, the complete isolated unit suite, desktop/mobile visual evidence, desktop/mobile performance evidence, and the normal update-cost gate.
- Passed 12 visual browser scenarios, including 16 all-tier entity-edge captures across desktop and 390px phone portrait.
- Passed the normal SwiftShader performance gate at a maximum update p95 of 0.7 ms against the unchanged 5 ms threshold.

## [1.16.0] - 2026-08-21

### Added
- Added complete semantic action parity for menu, pause, intermission, victory, and game-over workflows while keeping the canvas as the only painted UI.
- Added trusted-input audio recovery that resumes policy-suspended audio without overriding gameplay or visibility pause reasons.
- Added atomic per-slot v2 save entries with storage-event/read-through coverage while retaining shipped v1 envelope compatibility.
- Added a release-blocking desktop update-cost gate with five normal replicates, five synthetic sensitivity replicates, and retained CI artifacts.

### Changed
- Semantic controls now retain focus across updates, expose painted settings in both directions, announce status, and use collision-free descriptions.
- Enemy firing cycles now begin from accumulated gameplay delta after spawn instead of inheriting scene uptime.
- Performance probes live in a focused browser-harness module and collect exactly ten update/render samples after warm-up.
- Architecture policies now classify the completed accessibility and performance evidence boundaries with zero actionable warnings.

### Quality
- Passed both TypeScript compilers, formatting, ESLint, Knip, level validation, architecture and cycle checks, the complete isolated unit suite, production build, and bundle guardrails.
- Passed 41 applicable desktop/mobile functional and visual browser checks with one intentional project skip.
- Passed the local SwiftShader performance gate at a maximum update p95 of 0.5 ms; all five 6 ms synthetic replicates were rejected as required.
- Two GitHub-hosted `ubuntu-24.04` runs characterized a 5 ms update-cost ceiling and a 300-second execution allowance for the unchanged 10-frame measurement window.

## [1.15.0] - 2026-08-19

### Added
- Added a `GameplayClock` that accumulates delta only on unpaused combat frames.
- Added a visually hidden named-action layer for menu, pause, and intermission.
- Added a write-probe before save mutations and a second-tap confirm for slot delete.
- Added Content-Security-Policy and related security headers on the production deploy.

### Changed
- Pause no longer expires score chains, fire cooldown, helper respawn, or picket fire cadence.
- Picket `PICKET ONLINE` announcement stays on Phaser scene time. Mount fire stays on the gameplay clock.
- Hybrid devices hide the joystick on hardware keydown and restore it on the next pointerdown.
- Intermission ignores key repeat on Enter and Space.
- Menu, pause, and shop hit areas floor at 44 CSS pixels.
- Save slots persist live shield charges up to eight and floor authored campaign levels.
- Production deploy is a job on `quality.yml` and runs only after quality and browser jobs succeed.

### Quality
- Architecture budgets fail when they sit more than 80 lines above measured size.
- `bun audit --audit-level=high` is a quality step, with `brace-expansion` and `nanoid` pinned through overrides.
- Isolated unit runner uses a 60 second per-file timeout.
- Passed 36 functional and visual browser checks with one intentional project skip, and three applicable performance scenarios with three intentional project skips.

## [1.14.0] - 2026-08-17

### Added
- Added explicit desktop, tablet, phone-portrait, phone-landscape, and ultra-compact menu layout profiles.
- Added semantic bounds for the title lockup, mission settings, tuning controls, run selection, and status bands.
- Added rendered text width and height to development browser snapshots so browser evidence can detect real glyph collisions.

### Changed
- Rebuilt the menu title lockup around actual font line boxes, preventing `COMMAND DECK` and the subtitle from crossing the `SPACE EXPLORER` title.
- Reduced and fitted the desktop title, clamped decorative wings, and hides the eyebrow on constrained landscape screens.
- Rebalanced desktop vertical rhythm and adapted tuning controls and save cards for tablet, portrait, landscape, and short-phone layouts.
- Replaced approximate anchor-point collision tests with declared-band and rendered-bound assertions across seven representative viewports.

### Quality
- Passed both TypeScript compilers, formatting, ESLint, the complete unit suite, level validation, Knip, architecture checks, production build, and bundle budgets.
- Passed 34 functional and visual browser checks with one intentional project skip.
- Passed all four applicable performance scenarios with two intentional mobile project skips.

## [1.13.0] - 2026-08-17

### Added
- Added typed architecture-policy categories for authored data, composition roots, drawing recipes, presentation builders, pure layouts, runtime coordinators, and coherent test narratives.
- Added regression coverage proving the architecture report contains zero unexplained warnings and retains its required policy categories.

### Changed
- Converted source concentration, function complexity, public-surface, and test-size findings from advisory noise into an enforceable architecture gate.
- Recorded a rationale, regression evidence, and near-current ceiling for every intentionally concentrated source artifact.
- Grouped retained policies separately from actionable warnings so the report remains readable without hiding reviewed hotspots.

### Quality
- Rejects stale policy entries, removed policy targets, exceeded budgets, dependency cycles, and any new unclassified warning.
- Passed both TypeScript compilers, ESLint, the isolated unit suite, level validation, Knip, architecture checks, production build, bundle budgets, and formatting.

## [1.8.1] - 2026-08-16

### Changed
- Rebalanced Standard quality for fanless Retina-class laptops with two full-screen background planes, 1x particle textures, 80% particle quantities, and slightly tighter burst scale.
- Added a dedicated particle-quantity budget across Low, Standard, and High while keeping High as the full three-plane, full-particle spectacle tier.
- Generates and retains only the procedural background authoring and runtime planes required by the selected quality tier.
- Baked a darker center flight lane into the far background composite without adding per-frame draw work.

### Quality
- Replaced screenshot-only corridor evidence with sampled luminance assertions over real browser captures.
- Strengthened game-over and victory evidence with viewport and title-spacing assertions.
- Passed TypeScript, lint, the complete unit suite, production build, and desktop/mobile visual browser gates.

## [1.8.0] - 2026-08-16

### Added
- Extended Low / Standard / High visual profiles with remake FX budgets for UI glow, motif density, particle burst scale, and menu atmosphere.
- Added command-deck chrome across shared UI, the main menu, pause, game over, victory, intermission frames, HUD top bar, and the mobile pause button.
- Added gameplay-corridor visual evidence at `984x768` and `390x844`, plus command-deck screenshots for menu, pause, game over, and victory.

### Changed
- Intensified procedural neon-vector silhouettes, explosions, beams, warp, and edge-weighted level motifs without changing encounter grammar.
- Reserved runtime Glow filters for the player and telegraphs; pickup glow stays baked into generated textures.
- Documented the presentation remake in `CONTEXT.md`, `docs/art-direction.md`, and ADR 0002.

### Quality
- Passed both TypeScript compilers, lint, the complete unit suite, level validation, Knip, production build, bundle budgets, desktop/mobile functional and visual browser gates, and isolated performance evidence.

## [1.7.2] - 2026-08-16

### Removed
- Deleted unused public methods and helpers with no production callers, including encounter-progress, asteroid-group, pointer, joystick-pointer, warp cancel/is-running, enemy-bullet fire, and test-only shield persist APIs.
- Removed the unused ambient-sparkle and ember particle chain plus the unused enemy-fire SFX path.
- Stripped unread UI, theme, layout, and player-config fields that were never consumed at runtime.

### Changed
- Inlined the GameScene flow-context and helper-wing forwarding modules so persist, scene start, and best-effort cleanup call their owning helpers directly.
- Left unused music catalogs, VAT/theme prose, and the GameScene bootstrap stack in place as reserved authoring and orchestration surface.

### Quality
- Folded forwarding-only tests into owning-module coverage and kept fatal-hit flash, helper-wing persist, and terminal-transition precedence unchanged.
- Passed both TypeScript compilers' unit corridor via typecheck, lint, Knip, and the complete isolated unit suite.

## [1.7.1] - 2026-08-16

### Changed
- Rebuilt the pause menu around one centered checkpoint deck instead of reserving an empty legacy music column.
- Simplified the global footer to Resume and Main Menu, leaving save, load, and delete actions attached to their explicit checkpoint slots.
- Added view-specific guidance for Checkpoints and Settings, widened the mode tabs, and reduced the title scale for a clearer command hierarchy.
- Reflowed checkpoint metadata, controls, status copy, and footer actions across desktop, phone portrait, phone landscape, and ultra-compact frames.

### Fixed
- Prevented pause tabs, checkpoint headers, rows, status text, and footer controls from colliding at compact viewport boundaries.
- Removed ambiguous global save/load shortcuts that silently selected an implicit slot while duplicating the visible slot actions.

### Quality
- Added pause-menu visual evidence at `984x768` desktop and `390x844` phone portrait sizes for both Checkpoints and Settings.
- Expanded responsive geometry coverage to enforce centered desktop cards and non-overlapping content bands through short and ultra-compact layouts.
- Passed both TypeScript compilers, lint, the complete unit suite, production build, and desktop/mobile pause interaction and visual browser checks.

## [1.7.0] - 2026-08-16

### Added
- Added persistent Low, Normal, and High difficulty settings, with the original campaign balance preserved exactly as Normal.
- Added the complete settings surface to the pause menu through dedicated Checkpoints and Settings views.

### Changed
- Low, Normal, and High now multiply accepted hull damage by `0.75`, `1.0`, and `1.25` without changing formations, spawn schedules, movement, projectile speed, telegraphs, hazard geometry, boss phases, or one-hit shields.
- Consolidated difficulty, visual quality, creativity, energy, ambience, and music volume into shared controls used by both the main and pause menus.
- Kept pause-menu quality changes safe for active runs by persisting them for restart instead of reloading gameplay.
- Reflowed settings across desktop, phone portrait, and phone landscape, including live orientation changes while paused.

### Fixed
- Preserved fractional hull values through checkpoints and manual save/load so Low and High damage remain exact across persistence boundaries.
- Recreated responsive slider clusters when their width changes, preventing overlap or clipping after orientation changes.

### Quality
- Added focused storage, collision, save-state, shared-panel, pause-controller, responsive-layout, and desktop/mobile browser coverage.
- Proved a paused Low selection affects the next active-run hull hit with an exact `5.0` to `4.25` browser-observed change.
- Passed both TypeScript compilers, lint, unit tests, desktop/mobile functional and visual browser gates, performance evidence, level validation, Knip, production build, and bundle budgets.

## [1.6.0] - 2026-08-15

### Added
- Added persistent Low, Standard, and High visual-quality controls to the main menu, with safe local-storage fallback and a clean reload boundary for generated assets.
- Added supersampled entity and particle textures that preserve authored display dimensions and Arcade Physics geometry.
- Added independent deep, motif, and atmosphere background planes with quality-aware layer counts, horizontal drift, and per-level motion.
- Added non-physical boss aura, shield, command-core, and hardpoint rigs for stronger phase and Guard Break readability.

### Changed
- Rebuilt all ten planet-arrival portraits at 1024×1024 with richer surface detail while retaining responsive composition and lifecycle ownership.
- Expanded impact, projectile, exhaust, and boss effects while keeping particle pressure bounded by the selected quality profile.
- Refined the top HUD presentation and separated the HULL label from its meter for cleaner readability.

### Fixed
- Froze wave, hazard, enemy-cycle, and Guard Break schedules across physics-only pauses so telegraphs and attack windows cannot collapse or expire during pause.
- Guarded preload completion against stale font promises and timeout callbacks across shutdown and restart.
- Bounded persisted upgrades, scores, health, shields, lives, and helper resources to configured safe limits.
- Prevented duplicate portrait loads, retained cached portraits through resize restarts, and reduced resize settling to one premium visual rebuild.

### Quality
- Added focused regression coverage for generated-texture density, quality persistence, responsive menu selection, pause-safe clocks, preload ownership, save normalization, portrait deduplication, resize orchestration, and HUD spacing.
- Passed both TypeScript compilers, lint, unit tests, desktop/mobile functional and visual browser gates, performance evidence, level validation, Knip, production build, and bundle budgets.

## [1.5.1] - 2026-08-04

### Changed
- Raised Guard capacity by 25% across Levels 5–10, preserving a clear progression from 30 pressure on the first guarded boss to 60 at Terminus Black.
- Reduced the no-hit decay delay from 1.5 seconds to 1.2 seconds and increased decay rates across the late-game curve, requiring more consistent main-gun pressure.
- Shortened Guard Break from 2.5 seconds to 1.8 seconds while retaining the readable interruption and double-damage reward.

### Quality
- Added a campaign-level balance regression covering every authored Guard threshold, decay rate, delay, and break duration.
- Passed level validation and the complete static, unit, build, bundle, browser, visual, and performance release corridor.

## [1.5.0] - 2026-08-04

### Added
- Added the two-tier AEGIS Picket upgrade after Level 4, deploying responsive automatic flank turrets with a bounded projectile pool, dedicated effects, audio, persistence, and desktop/mobile coverage.
- Added sparse Marked Aces to Levels 5–10 with gilded identification, doubled durability, quadrupled base score, guaranteed power-up drops, and pool-safe state restoration.
- Added x5 Chain Overdrive, reducing the main gun cooldown by 15% while the maximum score chain remains active.
- Added Guard Break encounters to bosses in Levels 5–10, with sustained-player-damage guard pressure, delayed decay, a 2.5-second stagger, double player damage during the break, HUD feedback, and sublinear difficulty scaling.

### Changed
- Replaced the procedural vector-like arrival discs with ten authored and optimized WebP planet portraits while retaining the responsive neon navigation chrome, reduced-motion behavior, and campaign-specific identities.
- Updated the campaign roster, art direction, level-design notes, upgrade interface, development level jump, save normalization, and release documentation for the expanded late-game systems.

### Quality
- Added level validation and focused unit/browser coverage for planet assets, AEGIS purchase and deployment, Marked Ace choreography and pooling, Guard Break behavior, Overdrive cooldown/readout behavior, persistence, lifecycle teardown, and responsive layouts.
- Hardened boss hit/tint lifecycle behavior, shifted-camera turret targeting and projectile bounds, nonzero-origin intermission rendering, and finite Guard Break configuration validation through two complete code-review rounds.
- Passed both TypeScript compilers, lint, unit tests, level validation, Knip, production build, bundle budgets, desktop/mobile functional and visual browser gates, and performance evidence.

## [1.4.1] - 2026-08-03

### Changed
- Rebuilt all ten planet-arrival worlds at 512×512 with soft spherical lighting, directional neon rims, atmospheric halos, shadow-side detail, and motif-specific surface treatments.
- Added curved aurora and ember geography, inhabited-world night lights, split front/back orbital rings, and reduced-motion-aware ambient animation.
- Released generated planet textures when the intermission scene shuts down so the higher-resolution artwork does not accumulate across the campaign.

### Quality
- Captured individual visual evidence for every campaign planet and hardened the portrait-resize assertion against asynchronous scene rendering.
- Preserved the existing planet profiles, responsive layouts, upgrade flow, texture-key contracts, Canvas fallback, and bundle budgets.

## [1.4.0] - 2026-08-02

### Changed
- Reimagined all ten planet-arrival screens as a shared cinematic navigation system with a unique procedural world, orbital motif, signal identity, and destination briefing for every campaign level.
- Reflowed arrival art, mission context, upgrade controls, and campaign-completion messaging across desktop, laptop, landscape mobile, portrait mobile, and ultra-compact viewports without changing gameplay or the premium campaign backgrounds.

### Fixed
- Isolated CI browser lanes on separate runners and limited each software-WebGL runner to one Playwright worker, preventing parallel Phaser navigation stalls while retaining job-level parallelism.
- Bounded software-rendered frame sampling in CI and kept real-time cadence and movement assertions on hardware-backed local runs, avoiding false failures below two delivered frames per second.
- Coalesced sub-threshold music-intensity changes during action-section ramps, removing per-frame audio-context pressure in Chrome while preserving continuous atmosphere animation and authored section transitions.
- Waited for each staged planet's rendered title and procedural world before collecting campaign-wide browser evidence, removing a slow-runner scene-restart race.

### Quality
- Added a Level 9 action-scene regression that bounds music requests across 240 continuously animated frames.
- Added campaign-wide profile coverage and Chromium visual evidence that stages every arrival plus a portrait-mobile upgrade screen.

## [1.3.2] - 2026-08-01

### Changed
- Preserved all five procedural neon background planes by compositing their authored alpha and additive treatment once per level, then rendering one full-screen texture alongside the existing independently moving planets, twinkles, and debris.
- Reduced premium-background residency to the active composite by default while keeping the next level's just-in-time PlanetIntermission warmup.
- Replaced the redundant full-camera WebGL vignette/glow pair with a CSS vignette; the new procedural art, ships, and effects retain their baked neon glow and the level color grade remains active.
- Suppressed settled surge-meter redraws while preserving exact endpoint updates.
- Ran functional and visual browser coverage with bounded parallel workers, then kept timing-sensitive performance evidence isolated on one worker.

### Quality
- Added a non-invasive raw `requestAnimationFrame` delivery probe with refresh-adaptive cadence classification and lifecycle coverage, without `gl.finish()` or renderer monkeypatch synchronization.
- Added focused tests for procedural compositing, one-layer presentation, texture-residency windows, and HUD redraw policy.
- Retained desktop/mobile visual evidence and isolated performance evidence while making slow or background-throttled Chromium measurements self-describing instead of timing out.
- Passed 20 canonical browser checks with 3 expected project-applicability skips, alongside both TypeScript compilers, lint, unit tests, level validation, Knip, production build, and bundle budgets.

## [1.3.1] - 2026-08-01

### Changed
- Cached exact active-section resolution and suppressed duplicate music-intensity and atmosphere presentation writes without quantizing campaign progress or changing authored transitions.
- Avoided unchanged background alpha writes while preserving every layer, blend mode, texture, motion formula, and visual value.
- Aggregated active hazard intensity in one pass and stopped clearing an already-empty dormant hazard overlay while retaining frame-by-frame animation whenever it is visible.
- Split browser coverage into a bounded two-worker functional lane and a single-worker visual/performance evidence lane.
- Replaced repeated E2E helpers and avoidable fixed startup delays with shared harness-ready fixtures and scene-state polling.

### Quality
- Added focused regression coverage for section and boss presentation transitions, redundant alpha suppression, hazard aggregation, and dormant-overlay cleanup.
- Removed an obsolete audio-resume-disabled performance scenario after request deduplication made both its control and treatment paths measure zero; stable probes now require music/audio request pressure to remain below sampled frame count.
- Passed TypeScript 7 and TypeScript 6 checks, lint, unit tests, 14 functional browser checks with one expected project skip, five isolated evidence checks with one expected project skip, level validation, Knip, production build, bundle budgets, and `git diff --check`.

## [1.2.2] - 2026-07-30

### Changed
- Restored Level 1 to standard weighted scout/fighter encounters by removing the two extra authored enemy packets from Prism Crossfire and Light Channel.
- Preserved Solar Slipstream's bossless onboarding structure, hazard telegraphs, encounter sizing, spawn pacing, and final Recovery Beat.
- Limited strict projectile-cadence A/B assertions to full-sample runs whose frame delivery can resolve the active 150 ms cadence.

### Quality
- Added a campaign regression guard requiring Level 1 to remain free of authored signature waves while retaining authored gameplay in later levels.
- Attached and logged frame-pacing evidence before assertions, including whether the cadence comparison was resolvable and both trail-event-per-shot rates.
- Allowed the full six-scenario frame probe to finish its lifecycle checks under slow software-rendered desktop delivery.
- Passed TypeScript 7 and TypeScript 6 checks, lint, unit tests, desktop/mobile browser smoke, level validation, Knip, production build, bundle budgets, and `git diff --check`.

## [1.2.1] - 2026-07-30

### Added
- Added a browser-harness-gated active-combat frame-pacing probe with raw p50/p95/p99/max timing, over-budget counts, synchronized update/render/GPU work, and runtime-load context.
- Added current-source legacy-versus-active projectile cadence comparisons for desktop and mobile Chromium.
- Added retained desktop/mobile projectile-trail evidence using real pooled player and enemy projectiles after performance measurement.

### Changed
- Reduced player and enemy projectile trail emission cadence from 18/24 ms to 150 ms, substantially lowering trail-event pressure while retaining directional feedback.
- Shifted enemy projectiles and trails to a brighter magenta-white palette so hostile downward lanes remain distinct from cyan player fire and orange nebula backgrounds.
- Made successful test output concise while preserving complete diagnostics on failure.

### Fixed
- Avoided redundant audio-context suspend/resume Promise chains when the requested context state is already satisfied.
- Isolated shared combat-feedback test doubles so real audio singletons cannot leak behavior across test files.

### Quality
- Verified the frame-pacing diagnosis and smoothness changes through independent Flow review.
- Passed TypeScript 7 and TypeScript 6 checks, lint, unit tests, desktop/mobile browser smoke, level validation, Knip, production build, bundle budgets, and `git diff --check`.
- Retained one advisory coverage gap for representative enemy pressure and uncommon probe cleanup/recovery interleavings.

## [1.2.0] - 2026-07-27

### Added
- Added source-bound desktop and mobile Chromium smoke coverage for boot, gameplay, Arcade overlap callbacks, generated textures, filters, particles, tweens, lazy scene routing, orientation handling, and unsupported WebGL messaging.
- Added a gated browser harness for runtime probes and synchronized WebGL render-cost comparisons.
- Added a measured Prism Crossfire visual pilot with clearer hazard arcs and a bounded Phaser 4 glow treatment.
- Added focused regular-enemy durability coverage that locks base shot counts and preserves the fighter, bomber, and gunship hierarchy.

### Changed
- Upgraded the runtime to Phaser 4.2.1 package ESM with explicit WebGL support requirements.
- Promoted TypeScript 7.0.2 to the authoritative source, script, and test compiler while retaining a temporary TypeScript 6 compatibility check for compiler-API tooling.
- Updated Vite, ESLint, Knip, typescript-eslint, Bun types, and related reproducible dependency metadata.
- Converted release scripts from JavaScript to typed TypeScript entry points.
- Reduced fighter HP from 3 to 2, bomber HP from 5 to 4, and gunship HP from 6 to 5 so regular encounters preserve pressure without repetitive cleanup.
- Updated README badges and architecture/quality documentation for the current compiler, engine, browser harness, and release gates.

### Fixed
- Corrected Phaser 4 tint modes so damage, shield, collision, and phase feedback use intentional fill or multiply semantics.
- Made movement rotation and related frame behavior time-consistent across configured frame-rate limits.
- Hardened resize, pause, audio, loading, registry, persistence, and scene teardown boundaries against stale or partially destroyed runtime state.
- Kept loading progress and Menu handoff tied to real loader completion instead of optimistic transition timing.

### Quality
- Added frozen-install, TypeScript 7/6 parity, real-browser, build, bundle, level-validation, lint, test, and Knip gates to the documented release corridor.
- Retained reviewer-accessible desktop/mobile Prism Crossfire screenshots and synchronized render-cost evidence.
- Verified the modernization and durability slices through independent Flow review before release preparation.

## [1.1.27] - 2026-07-26

### Added
- Added windowed premium-background loading so startup warms only Levels 1-2 and later campaign art loads before the relevant Game transition.
- Added lifecycle-aware loading coverage for Menu, intermission, and pause checkpoint transitions.
- Added shared collision-target and best-effort side-effect helpers, plus a focused shared Phaser test mock.

### Changed
- Released premium textures outside the active level window after the new Game parallax has claimed its layers.
- Warmed the next premium-background window during intermission without removing art still owned by the outgoing scene.
- Centralized bomber, gunship, and swarm tuning constants without changing their gameplay values.

### Fixed
- Prevented stale player flash callbacks and camera color-pulse callbacks from mutating a later visual lifecycle.
- Guarded Menu resize restarts while an asynchronous Game transition is loading campaign art.

### Quality
- Refreshed death/respawn research notes and documented the intentional TypeScript unused-symbol policy.
- Verified with `bun run build`, `bun run typecheck`, `bun run lint`, `bun run test`, `bun run levels:validate`, `bun run knip`, `bun run bundle:check`, and `git diff --check`.

## [1.1.26] - 2026-07-26

### Changed
- Reused stable gameplay frame delegates instead of rebuilding update closures on every frame.
- Consolidated GameScene bootstrap contracts and inlined one-use parallax lifecycle context builders.
- Removed camera shake from routine explosions and accepted player impacts while preserving particles, audio, and hit feedback.
- Added explicit Knip entry coverage for the browser entry point and repository scripts.

### Quality
- Removed confirmed dead private methods, fields, exports, and forwarding-only tests from HUD, effects, and parallax systems.
- Added focused atmosphere-profile and update-frame regression coverage.
- Verified with `bun run build`, `bun run typecheck`, `bun run lint`, `bun run test`, `bun run levels:validate`, `bun run knip`, and `bun run bundle:check`.

## [1.1.25] - 2026-06-16

### Added
- Added Bun-based CI quality gates for type-checking, linting, tests, level validation, Knip, build, and bundle guardrails.
- Added explicit `typecheck` coverage for production source plus tests through a dedicated test TypeScript config.
- Added warning-level level validation for Within-Level Pacing, Dominant Motif, Lane-Reading, Recovery Beats, and Ambush Anticipation.

### Changed
- Removed per-frame gameplay behavior construction from `GameScene.update` while preserving live boss HUD state through a getter.
- Hardened pooled delayed tint callbacks for enemies, bosses, asteroids, and helper ships with lifecycle tokens.
- Deleted the no-op foreground silhouette lifecycle seam from the parallax stack.
- Refreshed bundle/startup documentation with current Vite 8 lazy-scene output and documented release smoke coverage.

### Quality
- Added regression coverage for stale pooled visual callbacks.
- Made hazard pressure policy tests independently runnable with their own Phaser mock.
- Verified with `bun run build`, `bun run typecheck`, `bun run lint`, `bun run test`, `bun run levels:validate`, `bun run knip`, and `bun run bundle:check`.

## [1.1.24] - 2026-06-13

### Added
- Added authored section primitives for lane-based signature waves and health/shield Recovery Beat drops.
- Added opt-in literal cover so selected asteroid terrain blocks enemy bullets and bomber bombs without blocking enemy bodies.
- Added the first gameplay-diversity vertical slice across Levels 1, 5, 6, and 10, including Level 6 terrain-as-cover routing and finale synthesis waves.

### Changed
- Reworked Level 6 into a cover-reading stage with breakable projectile-blocking wreck plates and a bulwark-style boss pressure profile.
- Tuned Level 5 toward endurance survival with authored relief and a burst-duel boss contrast.
- Preserved Level 1 onboarding while adding readable authored lane-reading checks.

### Quality
- Added validator guardrails for authored waves, Recovery Beat drops, and cover durability configuration.
- Added regression coverage for authored wave/drop execution, cover projectile blocking, cover spawner config, and vertical-slice campaign expectations.
- Added design glossary, ADR, implementation plan, and manual playtest checklist for the gameplay-diversity slice.

## [1.1.22] - 2026-05-10

### Fixed
- Fixed the level 6 completion crash by making last-life helper-wing teardown tolerate Phaser groups, colliders, and helper bodies that are already partially invalidated during scene shutdown.
- Hardened adjacent enemy-pool and collision hazard cleanup paths so invalidated Phaser group children no longer throw while terminal transitions are completing.

### Quality
- Added regression coverage for invalidated helper-wing teardown, enemy group child iteration, and hazard cleanup during transition cleanup.
- Verified with targeted lifecycle tests, `bunx tsc --noEmit`, `bun run lint`, `bun test`, `bun run build`, `bun run levels:validate`, `bun run knip`, and `bun run bundle:check`.

## [1.1.21] - 2026-05-09

### Fixed
- Fixed the level 6 boss/death race so queued level completion survives non-final respawn and flushes after the player is alive again.
- Made terminal scene-flow transitions monotonic so accepted level-complete handoff cannot be flipped by later player-death events, while final death can still beat a merely queued completion.
- Suppressed helper-wing death sync and death side effects during queued level-complete or ignored terminal handoffs.

### Quality
- Added regression coverage for same-frame/adjacent boss-defeat and player-death permutations, respawn timer behavior under physics pause, transition-aware helper-wing sync, and flow-context physics-only pause behavior.
- Verified with targeted scene-flow/helper tests, `bunx tsc --noEmit`, `bun run lint`, `bun test`, and `bun run build`.

## [1.1.20] - 2026-04-28

### Changed
- Removed the remaining generated moon-surface landmark layer so premium-art levels no longer render the green crater/tint band over gameplay space.
- Deleted the moon-surface config surface, generator, lifecycle wiring, and update/layout paths instead of leaving the layer dormant behind flags.
- Simplified the shared parallax lifecycle by removing moon-surface creation/destruction from the level-visual orchestration context.

### Quality
- Updated parallax lifecycle regression coverage to reflect the smaller background stack after moon-surface removal.
- Verified with `bunx tsc --noEmit`, `bun run lint`, `bun test`, `bun run build`, `bun run levels:validate`, `bun run knip`, and `bun run bundle:check`.

## [1.1.19] - 2026-04-28

### Changed
- Stopped stacking the old procedural starfield underneath premium background art, so premium-art levels no longer mix the legacy starfield pass into the new backdrop presentation.
- Made premium background layers fully opaque so the level base background color no longer tints through the dark center lane.
- Added regression coverage proving premium background levels skip the old starfield creation path.

### Quality
- Verified with `bunx tsc --noEmit`, `bun run lint`, `bun test`, `bun run build`, `bun run levels:validate`, `bun run knip`, and `bun run bundle:check`.

## [1.1.18] - 2026-04-28

### Changed
- Removed the generated moon-surface prop geometry that was still layering over premium backgrounds on the levels that used moon-surface landmarks.
- Deleted the moon-surface building, window, antenna-light, spire, and runway/light-strip drawing paths while keeping the simpler horizon/terrain/crater treatment intact.
- Simplified the moon-surface config surface by removing the now-unused `buildingCount` field.

### Quality
- Added focused regression coverage proving the moon-surface generator no longer emits prop-style geometry.
- Verified with `bunx tsc --noEmit`, `bun run lint`, `bun test`, `bun run build`, `bun run levels:validate`, `bun run knip`, and `bun run bundle:check`.

## [1.1.17] - 2026-04-28

### Changed
- Removed the old procedural scenic fog/nebula overlay system from the parallax stack now that premium level backgrounds are the intended presentation path.
- Deleted the scenic-layer lifecycle and scenic-texture generator code instead of keeping the overlay dormant behind runtime gating.
- Simplified `ParallaxBackground` and level-visual lifecycle wiring by removing scenic-layer create/layout/update/destroy paths and the unused `premiumAssetsReplaceProcedural` manifest flag.

### Quality
- Added/updated regression coverage for the level-visual lifecycle and parallax orchestration after scenic-layer removal.
- Verified with `bunx tsc --noEmit`, `bun run lint`, `bun test`, `bun run build`, `bun run levels:validate`, `bun run knip`, and `bun run bundle:check`.

## [1.1.16] - 2026-04-28

### Changed
- Split the private `src/scenes/gameScene` bootstrap contract into phase-local runtime/world/input/gameplay/HUD/pause files so create-time ownership is easier to follow without hiding orchestration.
- Removed the remaining cross-feature relative imports inside `src/scenes/gameScene` by standardizing `config`, `entities`, `systems`, and `utils` references on the existing `@/*` alias while keeping same-feature imports relative.
- Kept the `runGameSceneCreateBootstrap.ts` orchestration map explicit while reducing the contract density behind it.

### Quality
- Verified with `bunx tsc --noEmit`, `bun run lint`, `bun test`, `bun run build`, `bun run levels:validate`, `bun run knip`, and `bun run bundle:check`.

## [1.1.15] - 2026-04-28

### Changed
- Continued the gameplay/runtime refactor pass by breaking large orchestration files into smaller named setup and lifecycle helpers without changing expected game behavior.
- Finished the next maintainability cleanup tier across scene bootstrap, wave spawning, combat flow, player/helper/boss runtime code, menu/intermission flow, and several supporting gameplay systems.
- Standardized cross-feature imports around the existing `@/*` alias while keeping nearby same-feature imports relative, reducing deep import paths without hiding module ownership.

### Quality
- Added focused regression coverage for bootstrap sequencing, wave-manager orchestration, boss/runtime helper behavior, menu/load flow, helper-wing runtime behavior, and related gameplay helpers.
- Verified with `bunx tsc --noEmit`, `bun run lint`, `bun test`, `bun run build`, `bun run levels:validate`, `bun run knip`, and `bun run bundle:check`.

## [1.1.14] - 2026-04-28

### Fixed
- Kept the desktop maximize/resizing pause-overlay relayout fix so hidden save-slot text no longer leaks into gameplay after a resize.

### Changed
- Reverted the phone-only gameplay viewport policy and restored the original full-screen viewport behavior across devices.
- Removed the temporary phone viewport tuning config and related test scaffolding introduced for the reverted viewport policy.

### Quality
- Kept regression coverage for the pause-overlay relayout bugfix.
- Verified with `bun test`, `bun run levels:validate`, `bun run lint`, `bun run build`, `bun run knip`, and `bun run bundle:check`.

## [1.1.13] - 2026-04-28

### Fixed
- Fixed the desktop maximize/resizing regression where pause save-slot text could remain visible in gameplay after a relayout while the pause overlay was hidden.

### Changed
- Restricted the gameplay-consistency viewport override to phone-sized touch screens only, so desktop and larger resolutions keep the original full-screen gameplay behavior.
- Centralized the phone viewport cutoff in `src/config/deviceConfig.ts` so the short-side and long-side thresholds are tunable without editing detection logic.

### Quality
- Added regression coverage for phone-sized viewport gating and hidden pause-overlay relayout behavior.
- Verified with `bun test`, `bun run levels:validate`, `bun run lint`, `bun run build`, `bun run knip`, and `bun run bundle:check`.

## [1.1.12] - 2026-04-27

### Changed
- Tuned the mobile joystick with a small deadzone and remapped stick throw so tiny thumb drift no longer triggers movement as eagerly near center.
- Replaced the simple mobile direction threshold with engage/release hysteresis, stronger reverse-direction commitment, and weak-secondary-axis suppression so mobile movement feels steadier and more intentional.

### Quality
- Added regression coverage for deliberate direction engagement, held-direction hysteresis, reverse-direction gating, and weak-diagonal suppression.
- Verified with `bun test`, `bun run levels:validate`, `bun run lint`, `bun run build`, `bun run knip`, and `bun run bundle:check`.

## [1.1.11] - 2026-04-27

### Fixed
- Fixed the mobile pause button so it renders immediately on first mobile load instead of only appearing after a rotate/reflow cycle.
- Fixed mobile pause-button visibility across portrait/landscape reorientation so the touch pause affordance remains available after rotating back into gameplay.

### Changed
- Tightened the ultra-short mobile pause overlay by reducing the oversized `PAUSED` title and dropping subtitle/hint bands on constrained landscape phone screens, giving the checkpoint grid and footer controls more breathing room.

### Quality
- Added regression coverage for ultra-short phone pause layout behavior.
- Verified with `bun test`, `bun run levels:validate`, `bun run lint`, `bun run build`, `bun run knip`, and `bun run bundle:check`.

## [1.1.10] - 2026-04-27

### Changed
- Lowered the mobile pause button so it sits beneath the gameplay HUD band instead of crowding the top-right HUD readout, improving touch affordance and visual separation on mobile screens.

### Quality
- Verified with `bun test`, `bun run levels:validate`, `bun run lint`, `bun run build`, `bun run knip`, and `bun run bundle:check`.

## [1.1.9] - 2026-04-27

### Added
- Added a touch-only pause button anchored to the top-right gameplay HUD area so mobile players can enter the pause menu without a keyboard.

### Changed
- Tightened the compact/very-short main-menu title band so the session subtitle no longer cuts through the `SPACE EXPLORER` logo on small mobile viewports.
- Reduced compact-menu title ornament span, lowered subtitle sizing on very short screens, and enabled centered subtitle wrapping to preserve hierarchy on devices like the iPhone 13 mini.
- Updated mobile input filtering so taps on the new pause control are excluded from right-side fire-touch detection.
- Wired the mobile pause control through the existing pause-state controller so touch pause behavior stays consistent with keyboard pause handling and mobile-control blocking.

### Quality
- Added regression coverage for mobile control-pointer filtering and compact-menu title/subtitle band separation.
- Verified with `bun test`, `bun run levels:validate`, `bun run lint`, `bun run build`, `bun run knip`, and `bun run bundle:check`.

## [1.1.8] - 2026-04-27

### Added
- Added a full in-run pause control surface with checkpoint slot management (`SAVE`, `LOAD`, `DEL`, and `MAIN MENU`) plus embedded music tuning controls for creativity, energy, ambience, and music volume.
- Added local save-slot persistence and normalization helpers so pause/menu checkpoint actions can recover canonical player/run state safely across browser sessions.
- Added shared neon UI building blocks for action buttons, slider clusters, slider icons, and single-line text fitting to support the new menu/pause presentation layer.

### Changed
- Reworked pause-state flow so manual pause, orientation lock, physics pause/resume, mobile-control blocking, save-slot availability, and status messaging all publish through one coordinated controller path.
- Upgraded the main menu layout with loadable save-slot tiles, delete actions, and the same runtime music-control surface used in-game.
- Tuned procedural music runtime gain so in-game and pause-menu music no longer fall quieter than the main-menu baseline at equivalent volume settings.
- Polished the desktop pause overlay layout and compact responsive behavior so sliders, headers, dividers, slot rows, and footer actions stay visually separated without text collisions.
- Hardened player-state normalization so legacy or corrupt checkpoint payloads recover valid shields, level bounds, helper-wing slots, and run-summary metadata.

### Quality
- Added regression coverage for pause-state transitions, pause overlay responsive spacing, checkpoint persistence/normalization, shared action-button and slider-cluster wiring, player-state schema clamping, and procedural music runtime control behavior.
- Verified with `bun test`, `bun run levels:validate`, `bun run lint`, `bun run build`, `bun run knip`, and `bun run bundle:check`.

## [1.1.7] - 2026-04-27

### Changed
- Removed the shared edge-only foreground silhouette treatment so authored levels no longer draw the Phaser-generated cone-like side framing shapes.
- Removed the `rock-corridor` hazard overlay primitives so corridor sections keep their gameplay logic without adding extra edge-shadow framing.

### Quality
- Added regression coverage that locks both shared presentation paths as no-ops.
- Verified with `bun test`, `bun run levels:validate`, `bun run lint`, `bun run build`, `bun run knip`, and `bun run bundle:check`.


## [1.1.6] - 2026-04-27

### Changed
- Split `GameScene`, planet intermission input handling, and multiple runtime/system helpers into smaller focused modules while preserving scene flow, gameplay timing, and authored level behavior.
- Reorganized level-music configuration into dedicated `music/` pattern and type modules, replacing older local helper structure with clearer internal boundaries.
- Hardened teardown ownership for runtime lifecycle, intermission listeners, and generated parallax silhouettes so repeated cleanup paths stay safe and explicit.
- Updated the README project structure section so the documented module layout matches the current codebase.

### Quality
- Added regression coverage for runtime teardown idempotency, intermission listener cleanup/re-init, and foreground silhouette texture ownership.
- Verified with `bun test`, `bun run levels:validate`, `bun run lint`, `bun run build`, and `bun run bundle:check`.


## [1.1.5] - 2026-04-27

### Changed
- Reduced orchestration and duplication across `GameScene`, `CollisionManager`, `EnemyPool`, and viewport helpers while preserving gameplay flow, collision semantics, pooling behavior, and scene progression.
- Tightened the codebase export surface by removing unused helper/barrel/facade exports and de-exporting local-only procedural, parallax, helper-ship, and rendering types.

### Quality
- Added regression coverage for collision damage routing, enemy-pool wiring/order, and `GameScene` update-gate behavior.
- Verified with `bun run knip`, `bun test`, `bun run levels:validate`, `bun run lint`, `bun run build`, and `bun run bundle:check`.


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
