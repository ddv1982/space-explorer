# Readability Improvement Plan

Status: implemented

## Implementation Outcome

- Browser diagnostics are now organized into snapshot, API types, navigation, gameplay probes, runtime controls, and visual-pilot modules. The public installer is a one-line idempotent entrypoint; the remaining API factory is tracked as a development-only composition policy.
- Responsive scenes share viewport classification vocabulary. Pause slot/footer decisions are named policies, and intermission mode selection is centralized. The remaining pure coordinate policies have tight, documented complexity budgets backed by the cross-viewport unit matrix and browser visual evidence.
- `GameScene` installs every bootstrap result explicitly; implicit `Object.assign` ownership is gone.
- Authored section interpretation, encounter scaling, hazard dispatch, wave geometry, and boss attack runtime behavior now have focused modules. `WaveManager` and `Boss` remain discoverable facades.
- Constants are grouped by domain, player-state contracts have a focused type module, and music arrangement phase types have their own authoring contract.
- Large tests retain shared typed fixtures where splitting would duplicate more setup than behavior. Each retained test narrative now has a documented, near-current regression budget.
- Architecture budgets were lowered to the post-refactor sizes and function-policy exceptions now carry their rationale in the architecture report.

## Goal

Raise the codebase from its current strong-but-concentrated readability level to a structure where gameplay, responsive presentation, and diagnostics can each be understood through small, named responsibilities. Preserve behavior and performance while reducing the remaining long functions, broad public surfaces, oversized tests, and implicit runtime wiring.

## Principles

- Refactor by responsibility, not by line count.
- Preserve `GameScene`, `WaveManager`, and entity facades as recognizable composition roots.
- Prefer pure policy functions and typed contracts over callback webs or access to private state.
- Keep authored data large when it is easier to understand as a complete score, level, or drawing recipe.
- Add characterization coverage before moving behavior.
- Lower architecture budgets when a hotspot improves so complexity cannot silently return.
- Complete and verify each phase independently; do not combine all structural changes into one review.

## Baseline

- 219 source modules and 728 internal dependency edges.
- No source dependency cycles.
- Main behavioral hotspots:
  - `browserHarness.ts#installBrowserHarness`: 691 lines, complexity 97.
  - Responsive layout policies in pause, menu, and intermission presentation: complexity 46-75.
  - `GameScene`: 429 lines with a large dependency and callback-wiring surface.
  - `WaveManager`: 502 lines spanning encounter scheduling, authored content, hazards, and asteroids.
  - `Boss`: 521 lines after initial phase-policy extraction.
- Broad public surfaces remain in `utils/constants.ts`, `PlayerState.ts`, and level-music types.
- Seven test files exceed 500 lines.
- Large music pattern and procedural drawing files are primarily authored data and are not automatic extraction targets.

## Phase 1 — Decompose Browser Diagnostics

Make `browserHarness.ts` a small development-only facade while keeping the global browser-harness contract stable.

### Work

1. Capture the current global harness interface and snapshot schema with type-level and browser tests.
2. Extract scene/object snapshot collection into `browserHarness/snapshot.ts`.
3. Extract frame-pacing and performance probes into `browserHarness/performanceProbes.ts`.
4. Extract test-control commands and Arcade overlap probes into focused command modules.
5. Move installation, lifecycle cleanup, and event subscriptions into a typed `BrowserHarnessSession`.
6. Leave `browserHarness.ts` responsible only for the public types and installation entrypoint.
7. Ensure all diagnostic modules remain behind the existing development-only dynamic import.

### Exit criteria

- `installBrowserHarness` is at most 100 lines with complexity below 15.
- No extracted browser-harness function exceeds the architecture function thresholds.
- Production bundle checks prove the harness is still excluded.
- Existing smoke, visual, and performance projects pass without changing their observable contract.
- The browser-harness concentration budget is removed or reduced to the default module budget.

## Phase 2 — Make Responsive Layout Policies Declarative

Replace deeply branched coordinate calculations with named layout inputs, breakpoint profiles, and pure layout stages.

### Work

1. Introduce shared viewport categories and spacing primitives without forcing every scene into one visual template.
2. Refactor pause-overlay layout into named stages: classify viewport, choose content profile, calculate regions, place controls.
3. Apply the same staged model to menu and planet-intermission layout.
4. Replace nested conditional expressions with profile tables where values vary by viewport class.
5. Keep scene-specific identity in local policy modules; share only genuinely common geometry vocabulary.
6. Add table-driven tests covering wide, compact, portrait, short, and safe-area-constrained viewports.
7. Retain visual evidence for representative desktop and mobile layouts.

### Exit criteria

- `getPauseOverlayLayout`, `createMenuLayoutPlan`, and `getIntermissionLayout` each have complexity below 20.
- Layout tests describe viewport scenario and intended behavior rather than duplicating implementation arithmetic.
- No text overlap, clipped controls, or regressions in existing visual evidence.
- Adding a new breakpoint requires changing a profile or policy table rather than editing several unrelated branches.

## Phase 3 — Make Gameplay Runtime Wiring Explicit

Keep `GameScene` as the owner of Phaser lifecycle and transitions while making installed runtime state and event dependencies visible.

### Work

1. Replace `Object.assign(this, runtime)` with an explicit typed runtime owner or named installation assignments.
2. Group stable runtime systems into a `GameSceneRuntime` value while leaving transient scene state explicit.
3. Consolidate repeated callback adapters into small typed ports only where they represent a real boundary.
4. Split combat feedback construction by concern if the existing factory cannot be read as one coherent event policy.
5. Keep scene transitions, lifecycle hooks, and top-level event registration in `GameScene`.
6. Add a composition test that proves required runtime members and event bindings are installed once and disposed once.

### Exit criteria

- A reader can identify every installed runtime dependency without following `Object.assign` semantics.
- Startup can be traced through no more than three primary modules, matching the maintainability scorecard.
- `GameScene` remains below its current line and import budgets; reduce both budgets after the phase.
- No getter/setter bootstrap bridge or mirror of private scene fields is introduced.

## Phase 4 — Separate Encounter and Boss Policies

Reduce the remaining gameplay concentration by extracting independently testable decisions while retaining clear facades.

### Work

1. Characterize `WaveManager.update` ordering and timing before changing ownership.
2. Extract authored-section interpretation into a focused coordinator using the existing `AuthoredEventTracker`.
3. Extract random encounter cadence and selection policy from concrete enemy spawning.
4. Move asteroid scheduling behind the existing `WaveAsteroidSpawner` boundary if ownership is still split.
5. Audit `Boss` for separable guard, phase, attack-selection, and presentation policies; extract only policies used independently of the Phaser entity lifecycle.
6. Keep `WaveManager` and `Boss` as discoverable facades rather than replacing them with generic managers.

### Exit criteria

- `WaveManager` primarily coordinates named encounter collaborators and falls below 400 lines.
- `Boss` primarily owns entity lifecycle and falls below 450 lines.
- Extracted decisions have narrow unit tests without Phaser-scene setup where practical.
- Encounter timing, authored event order, boss phase behavior, and runtime performance remain unchanged.
- Both concentration budgets are tightened to their new sizes.

## Phase 5 — Clarify Public Surfaces and Test Narratives

Make ownership easier to discover and large regression suites easier to navigate.

### Work

1. Partition `utils/constants.ts` by domain and retain compatibility barrels only when they improve discovery.
2. Separate player-state data contracts, persistence keys, selectors, and mutations behind a small intentional public entrypoint.
3. Group music types by authoring concern while preserving the level-config entrypoint.
4. Split oversized tests by behavior narrative, not by arbitrary line ranges.
5. Introduce shared typed fixtures only when they remove setup noise without hiding scenario intent.
6. Add short module comments only for non-obvious ownership or invariants; do not narrate self-explanatory code.
7. Update the documentation map and architecture guidelines to reflect the final boundaries.

### Exit criteria

- No non-barrel module exports more than 20 declarations.
- Each previously oversized test suite is below 500 lines or carries a documented reason to remain concentrated.
- Test filenames and scenario names reveal the behavior boundary under test.
- `knip`, architecture checks, and both TypeScript versions report no new surface or dependency problems.

## Verification Per Phase

Run the narrowest relevant tests during development, followed by:

```sh
bun run format:check
bun run typecheck
bun run typecheck:ts6
bun run lint
bun run test
bun run levels:validate
bun run knip
bun run architecture:check
bun run build
bun run bundle:check
```

Run affected Playwright projects after browser-harness, layout, or gameplay-wiring changes. Run the complete browser matrix before a release.

## Overall Acceptance Criteria

- No source dependency cycles or production bundle regression.
- No known gameplay, layout, visual-quality, save-state, or frame-pacing regression.
- All currently reported behavioral function-complexity warnings are resolved or explicitly justified beside a narrow budget.
- Composition roots remain obvious and domain names remain intact.
- Architecture budgets trend downward; no new hotspot allowance is added merely to silence a warning.
- A new contributor can follow startup, one gameplay frame, one encounter spawn, one collision, and one responsive layout decision through named modules without inspecting unrelated systems.

## Deferred and Non-goals

- Reformatting or splitting authored music patterns solely because they are long.
- Splitting procedural drawing recipes when separation would make the visual recipe harder to follow.
- Replacing Phaser or rewriting the game around a new framework.
- Introducing a dependency-injection framework.
- Combining readability changes with gameplay balancing or visual redesign.
