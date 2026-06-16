# Codebase Quality Phased Improvement Plan

Date: 2026-06-16

## Scope

This plan reviews Space Explorer against its current stack, repo quality criteria, external Phaser/Vite/TypeScript guidance, and the architecture language in `CONTEXT.md` and `docs/architecture-guidelines.md`. It intentionally proposes improvements only; no application code was changed as part of this review.

## Current Baseline

- Stack: Phaser 4, TypeScript 6, Vite 8, Bun.
- Runtime architecture: Phaser scenes compose entities and systems; `GameScene` is the gameplay orchestrator; `WaveManager`, `EnemyPool`, `CollisionManager`, `HUD`, `AudioManager`, `ParallaxBackground`, and related systems own focused behavior per `docs/architecture-guidelines.md:13-23`.
- Content architecture: `src/config/LevelsConfig.ts:1-8` is a thin public entrypoint, and level authoring is organized behind `src/config/levels/types.ts` and definition modules.
- Validation baseline from this review: `bun run lint` passed, `bun test` passed with 265 tests across 61 files, `bun run levels:validate` passed for 10 levels, and `bun run knip` completed with no reported findings.
- CI baseline: no `.github/**/*` workflow files were found.

## External Best-Practice Evidence

- Ref MCP Phaser docs confirm the core pooling pattern used by the repo: deactivate objects and reuse inactive group members with `getFirstDead`, `get`, `kill`, or `killAndHide` instead of destroying hot gameplay objects.
- Ref MCP Phaser audio docs confirm that Phaser has one shared `SoundManager`, browser autoplay unlock behavior, and explicit cleanup considerations for retained/looping sounds; this matters because Space Explorer uses a custom Web Audio procedural stack through `AudioManager`.
- Ref MCP Vite docs confirm that production builds apply code splitting/preload optimizations and that Vite 8 is in the Rolldown-powered generation, so build behavior and chunking should be periodically remeasured after major dependency updates.
- Exa research on Phaser + TypeScript + Vite guidance reinforces this repo's good defaults: strict TypeScript, `tsc` before production build, Vite for browser game iteration, scene/object/system organization, Arcade physics for simple shooter collisions, object pooling, cleanup on scene shutdown, and profiling before performance changes.
- Exa Phaser performance guidance emphasizes a 60 FPS frame budget, avoiding hot-loop allocation, pooling bullets/enemies/particles, reducing draw calls, profiling with browser DevTools, mobile-specific particle/effect budgets, and validating on low-spec devices.

## Strong Existing Quality

- The architecture guidelines are concrete and useful. They define scene boundaries, system ownership, gameplay-flow event contracts, shared player state contracts, data-driven enemy wiring, and a minimal-abstraction preference in `docs/architecture-guidelines.md:5-64`.
- The game is already strongly data-driven. Level sections support phases, summaries, enemy focus, hazard events, signature waves, recovery drops, music intensity, visual modifiers, VAT targets, and tension arcs in `src/config/levels/types.ts:118-166`.
- Pooling is already standard for hot objects. Examples include bullets in `src/systems/BulletPool.ts`, enemies in `src/systems/EnemyPool.ts`, asteroids in `src/systems/WaveManager.ts`, and enemy projectiles in enemy classes.
- Lifecycle cleanup is a first-class concern. `GameScene` delegates teardown through `createGameSceneRuntimeLifecycle`, and tests cover shutdown/destroy idempotency.
- Regression coverage is unusually broad for an arcade game: collision routing, gameplay flow, responsive layouts, pause/save UI, procedural music determinism, campaign validation, pool wiring, parallax lifecycle, and level pressure policy all have tests.
- Bundle guardrails already exist through `scripts/bundle-report.mjs` and `bundle:check`, with historical notes in `docs/bundle-size-optimization-notes.md`.

## Improvement Principles

- Prefer measurement and deletion before adding frameworks or abstractions.
- Preserve the existing scene/system boundary language unless evidence shows a boundary is actively hurting maintenance.
- Preserve object pooling and data-driven level authoring as architectural strengths.
- Keep gameplay-design improvements in the project's vocabulary: Within-Level Pacing, Dominant Motif, Lane-Reading, Ambush Anticipation, and Recovery Beat.
- Treat performance claims as hypotheses until measured in browser profiles and on mobile hardware.

## Phase 0: Lock Quality Gates

Priority: highest.

Goal: make the existing healthy baseline repeatable outside a local terminal.

Recommended work:

- Add CI for `bun install`, `bun run build`, `bun run lint`, `bun test`, `bun run levels:validate`, `bun run knip`, and `bun run bundle:check`.
- Add an explicit type-check script, for example `typecheck`, even if it initially runs the same `tsc` step as `build`.
- Add test type-checking with a dedicated `tsconfig.test.json` or equivalent, because `tsconfig.json:24` includes `src` and `scripts/**/*.ts` but not `tests/**/*.ts`.
- Keep `skipLibCheck` unless Phaser or TypeScript upgrades prove it masks local issues; this is a practical build-speed tradeoff for game projects.
- Review whether `noUnusedLocals` and `noUnusedParameters` should remain ESLint-only or move into TypeScript once test type-checking is stable. Current TypeScript settings keep both disabled at `tsconfig.json:19-20`, while ESLint covers unused vars for source/tests in `eslint.config.js:20-39`.

Acceptance criteria:

- A clean branch gets the same pass/fail result locally and in CI.
- Tests are type-checked, not only linted and executed.
- CI uses Bun consistently with the declared `packageManager`.
- CI has no new custom quality framework beyond existing scripts unless a gap remains after wiring them.

## Phase 1: Remove Hot-Path Allocation And Pooling Hazards

Priority: high.

Goal: reduce preventable GC and pooled-object lifecycle risks without changing gameplay feel.

Confirmed evidence:

- `GameScene.update` creates a fresh frame-behavior object every frame at `src/scenes/GameScene.ts:364-378`.
- `createGameSceneGameplayFrameBehavior` creates multiple closures and returns a new object at `src/scenes/gameScene/gameplayFrameBehavior.ts:78-180`.
- Pooled objects schedule delayed tint callbacks that only check `active`, such as `EnemyBase.flashHit` at `src/entities/enemies/EnemyBase.ts:30-39` and asteroid collision flash at `src/entities/Asteroid.ts:80-100`.

Recommended work:

- Replace per-frame behavior-object construction with a stable frame delegate created during scene setup or convert the helper into stateless exported functions that receive the scene/delegate once.
- Add a lightweight browser performance probe before and after the change to confirm reduced allocations rather than assuming a speedup.
- Add generation-token or delayed-event cancellation guards for pooled visual callbacks that can outlive a despawn/reuse cycle.
- Audit other pooled entities with delayed calls, timers, or tweens: boss flashes, helper wing flashes, bullets, enemy bullets, bombs, power-ups, particles, and overlays.
- Keep the fix local to entity lifecycle helpers. Do not add a general-purpose pooling framework unless repeated fixes prove a shared primitive is needed.

Acceptance criteria:

- No allocations from gameplay-frame behavior show up as a recurring hot path in browser profiling.
- Pooled delayed visual callbacks cannot mutate a later spawn of the same object.
- Existing gameplay-flow and collision tests still pass.
- Any new tests reproduce the lifecycle risk directly instead of testing private implementation details broadly.

## Phase 2: Reduce Unneeded Complexity

Priority: high.

Goal: simplify seams that no longer pay for themselves while preserving the useful architecture boundaries.

Confirmed evidence:

- `runGameSceneCreateBootstrap` uses several narrow bridge contracts and a broad cast from `unknown` to a composite scene bridge at `src/scenes/gameScene/runGameSceneCreateBootstrap.ts:19-46` and `src/scenes/gameScene/runGameSceneCreateBootstrap.ts:192-213`.
- The foreground silhouette lifecycle has an empty creation function at `src/systems/parallax/foregroundSilhouetteLifecycle.ts:21-26`, but the state type and destroy path remain wired through parallax lifecycle code.
- The architecture guide explicitly says to add narrow helpers only when they clarify repeated rules or boundaries, and otherwise keep related logic together in `docs/architecture-guidelines.md:61-62`.

Recommended work:

- Decide whether foreground silhouettes are a real near-term art feature. If not, remove the no-op creation seam, state threading, and tests that only preserve no-op behavior.
- If foreground silhouettes are desired, implement the smallest useful version and document why it belongs in the parallax lifecycle.
- Simplify bootstrap bridge typing by replacing the `unknown` entrypoint with a typed scene shape, or move orchestration back toward `GameScene` where indirection no longer clarifies ownership.
- Review tiny context/bridge modules under `src/scenes/gameScene` and `src/systems/parallax` for deletion or consolidation where they only forward callbacks.
- Preserve modules that isolate genuinely testable rules, such as layout math, level validation, hazard pressure, music scheduling, and player state normalization.

Acceptance criteria:

- Fewer forwarding-only files or no-op seams exist after the pass.
- `GameScene` remains readable and does not become a dumping ground for low-level rules.
- Tests cover behavior, ordering, or contracts that matter to players and authoring, not inactive scaffolding.

## Phase 3: Rebaseline Bundle, Startup, Mobile, And Audio

Priority: medium-high.

Goal: replace stale assumptions with current measurements after Vite/Phaser updates.

Confirmed evidence:

- Current `vite.config.ts:11-27` manually chunks Phaser into its own chunk and sets `chunkSizeWarningLimit` to 1500.
- `docs/bundle-size-optimization-notes.md:23-54` records historical post-change bundle metrics and guardrails.
- The same bundle note says `src/main.ts` statically imported all scenes at startup in `docs/bundle-size-optimization-notes.md:9-14`, but current `src/main.ts:1-20` imports only boot/preload/menu scenes, while `src/scenes/sceneRegistry.ts:7-12` lazy-loads gameplay and terminal scenes. The note is stale and should be refreshed.
- `src/main.ts:28-118` has substantial viewport/resize recovery wiring, which is likely intentional for mobile but should be profiled rather than guessed at.
- `src/scenes/PreloadScene.ts:11-16` preloads all premium background images, so startup asset timing and memory should be measured against the current campaign asset set.

Recommended work:

- Run `bun run build`, `bun run bundle:report`, and `bun run bundle:check`; update bundle notes with current Vite 8 output.
- Profile first load, menu entry, first gameplay transition, scene transition, and restart on desktop and at least one lower-spec mobile device.
- Decide whether preloading all premium backgrounds is still the right tradeoff or whether level/screen-specific lazy loading is now needed.
- Validate resize/orientation behavior on iOS Safari and Android Chrome, especially visual viewport changes and portrait overlay behavior.
- Audit the custom procedural Web Audio lifecycle against Phaser's shared sound-manager expectations: unlock timing, pause/resume on blur, scene transitions, and cleanup.
- Keep Phaser manual chunking unless measurements show Vite 8's defaults or a different chunking strategy improves startup/cache behavior.

Acceptance criteria:

- Bundle notes reflect current code and current Vite output.
- Performance recommendations have before/after evidence.
- Mobile-specific quality reductions, if added, are tied to measured frame drops or memory pressure.

## Phase 4: Strengthen Gameplay And Content Quality Guardrails

Priority: medium.

Goal: make the campaign's design language easier to validate as content evolves.

Confirmed evidence:

- Level sections already encode pacing phase, summaries, hazards, signature waves, recovery drops, visual modifiers, VAT targets, and tension arcs in `src/config/levels/types.ts:118-166`.
- `scripts/validateLevels.ts` already enforces many level and music invariants, and `bun run levels:validate` passed for 10 levels.

Recommended work:

- Extend level validation around Within-Level Pacing: section coverage, section duration sanity, pressure peak distribution, and recovery beat placement.
- Add guardrails that each level has a clear Dominant Motif and that later sections twist/escalate it rather than simply stacking hazards.
- Add validation or tests for Lane-Reading fairness: warnings before lane hazards, minimum readable gaps, and no conflicting hazard overlap during recovery beats.
- Add Ambush Anticipation checks where levels use delayed entries or visibility pressure, ensuring repeated setup cues exist before the high-pressure version.
- Keep these checks in config validation first. Avoid adding runtime gameplay logic solely to compensate for unclear authored data.

Acceptance criteria:

- Level validation catches content regressions before playtesting.
- The checks use project language from `CONTEXT.md`, not generic difficulty labels.
- False positives remain low enough that authors trust the validator.

## Phase 5: Test Suite Maintainability

Priority: medium.

Goal: keep the strong test suite useful while reducing brittleness.

Confirmed evidence:

- Tests provide broad coverage but use many `as unknown` casts and private-state patching, especially around Phaser-heavy seams.
- This is often pragmatic for browser game tests, but it can hide contract drift when tests are not type-checked.

Recommended work:

- After adding test type-checking, replace the most repeated test casts with small typed stubs or builders.
- Prefer testing public lifecycle behavior and emitted events over private field mutation.
- Keep direct private-state tests only for regression cases where the alternative would require a full Phaser runtime or browser harness.
- Add a small manual smoke checklist for areas unit tests cannot fully prove: full run start, save/load, pause/resume, mobile controls, boss transition, victory/game-over transitions, and audio unlock.

Acceptance criteria:

- New tests are easier to read than the behavior they protect.
- Type-safe stubs reduce repeated casts without creating a large fake Phaser framework.
- Manual smoke checks are reserved for browser/device behavior that unit tests cannot represent.

## Phase 6: Documentation Hygiene

Priority: low-medium.

Goal: keep docs useful as living architecture, not historical debris.

Recommended work:

- Refresh `docs/bundle-size-optimization-notes.md` after the bundle rebaseline because at least one startup-entry statement is stale.
- Add a short `docs/qa/quality-gates.md` or README section once CI exists, listing the exact local and CI commands.
- Archive or mark historical plans that are complete or superseded, especially if they describe architecture that no longer matches `src/main.ts` and `sceneRegistry`.
- Keep `docs/architecture-guidelines.md` concise. Add only durable rules, not every tactical refactor decision.

Acceptance criteria:

- A contributor can find current architecture and quality-gate expectations without reading old release notes.
- Historical notes remain useful as history but are not mistaken for current facts.

## Recommended Order

1. Phase 0: CI and type-check gates.
2. Phase 1: hot-path allocation and pooled delayed-callback safety.
3. Phase 2: no-op and bridge complexity reduction.
4. Phase 3: bundle/mobile/audio remeasurement.
5. Phase 4: gameplay/content validator strengthening.
6. Phase 5: test maintainability after type-checking exposes real friction.
7. Phase 6: documentation hygiene as follow-through.

## Non-Goals

- Do not replace Phaser, Vite, Bun, or the current scene/system architecture.
- Do not add ECS, Redux-style state, a dependency injection framework, or a generalized object-pool abstraction without direct evidence.
- Do not tune difficulty through runtime branches when level config and validation can express the rule.
- Do not optimize visuals/audio by removing identity; measure, then reduce only the nonessential pressure on frame time or memory.
