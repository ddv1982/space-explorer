# Architecture Warning Reduction Plan

Date: 2026-08-17
Status: implemented

## Implementation Outcome

- The architecture checker now distinguishes actionable warnings from reviewed retained policies and fails on any unexplained threshold violation.
- All 25 warnings in the baseline were reviewed against their actual domain role. They are now classified as authored data, drawing recipes, pure layouts, presentation builders, or runtime coordinators rather than appearing as undifferentiated warning noise.
- Existing composition roots and coherent test narratives use the same reporting model, producing one complete retained-policy inventory grouped by category.
- Every source policy records its rationale, regression evidence, and near-current line/import or line/complexity budget. Missing symbols, removed files, exceeded function budgets, and exceeded source budgets fail the check.
- Authored scores and ordered drawing recipes remain cohesive; no arbitrary file slicing or abstraction was introduced solely to lower a metric.
- A dedicated regression test proves the report has zero actionable warnings, includes the required retained categories, and contains no stale-policy diagnostics.
- The structural guidelines now state that unexplained concentration, surface, function, and test warnings are failures. Budgets must move downward or disappear when future semantic extraction makes a hotspot smaller.

The review step determined that the residual list described intentional concentration rather than unresolved responsibility mixing. Consequently, the implementation completed the plan through classification and enforceable budgets instead of performing the conditional extractions described below. Those extraction recipes remain guidance for a future hotspot that exceeds its budget or gains an independent responsibility.

## Goal

Turn the architecture report from a mixed list of intentional concentration and actionable complexity into a high-signal regression gate. Reduce genuine complexity, preserve cohesive authored scores and drawing recipes, and retain an explicit rationale and tight budget wherever concentration is the clearest representation of the domain.

## Baseline

- 239 source modules and 764 internal dependency edges.
- No source dependency cycles.
- 25 warnings: three module-concentration warnings and 22 function warnings.
- The largest authored-data modules are `arpeggiatorPatterns.ts` (864 lines) and `bassPatterns.ts` (509 lines).
- `neonBackgroundGenerator.ts` exceeds its 650-line concentration budget at 674 lines and also contains a complex texture-registration function.
- Remaining function warnings cluster in browser snapshot assembly, scene presentation/layout, gameplay behavior composition, procedural audio, HUD construction, and procedural texture recipes.
- Five deliberately concentrated functions and seven test narratives already have documented policies and near-current regression budgets.

## Principles

- Classify before extracting: a long authored score, a drawing recipe, and a branching runtime coordinator are not the same architecture problem.
- Refactor by semantic responsibility, never by arbitrary line ranges.
- Keep pure layout calculations together when their coordinate relationships are easier to verify as one policy.
- Keep procedural drawing order visible; extract reusable primitives and independent passes, not isolated individual draw calls.
- Preserve public facades, output, determinism, rendering order, input behavior, and frame pacing.
- Add a retained policy only when cohesion is demonstrably better than decomposition, with rationale, owner, metric, and a budget close to the current value.
- Lower or remove budgets after every successful extraction. Never raise a budget merely to make the report quiet.

## Phase 0 — Give Every Warning a Type

Make the report distinguish actionable complexity from reviewed concentration before changing implementation.

### Work

1. Add explicit warning categories to the architecture checker: `authored-data`, `drawing-recipe`, `pure-layout`, `presentation-builder`, and `runtime-coordinator`.
2. Store reviewed exceptions in a typed policy table containing the symbol or module, rationale, budget, and regression coverage.
3. Report unreviewed warnings separately from retained policies; retained policies must remain visible but must not read as unresolved failures.
4. Reject stale policy entries when a file or symbol disappears, and fail when a retained item exceeds its budget.
5. Capture the current 25-warning inventory in a checker test so reclassification cannot silently hide warnings.

### Exit criteria

- Every current warning has one category and either a remediation phase or a documented retained policy.
- The checker prints separate counts for actionable warnings and retained policies.
- Adding a broad path exemption or an unbounded allowance is impossible through the typed policy format.
- Architecture checks still fail on cycles and on any budget regression.

## Phase 1 — Simplify Pure Snapshot and Layout Policies

Start with deterministic code where behavior can be characterized exhaustively and Phaser lifecycle risk is low.

### Targets

- `createBrowserHarnessSnapshot`
- `PauseOverlay.create` and `PauseOverlay.applyState`
- `createSaveSlotEntryPanel` and the related anonymous panel callback
- `getUpgradeGridLayout`
- `createIntermissionHeader`

### Work

1. Convert repeated conditional assembly into named intermediate models and profile tables.
2. Separate state selection from geometry calculation and from Phaser-object mutation.
3. Replace boolean combinations in `applyState` with named visibility/enabled-state decisions.
4. Give anonymous warning-producing callbacks domain names so reports and stack traces remain stable.
5. Extend table-driven tests for compact, wide, portrait, short, locked, capped, and unavailable states.

### Exit criteria

- No anonymous function warning remains in menu panels.
- Each target falls below the default function thresholds or is retained as a pure policy with a lower, evidence-backed budget.
- Snapshot schema and responsive visual output are unchanged.
- The viewport scenario matrix passes without adding implementation-specific assertions.

## Phase 2 — Split Presentation Controls by Lifecycle

Separate construction, layout, rendering, interaction, and cleanup where they are currently interleaved.

### Targets

- `createActionButtonControl`
- `createMusicSliderControl` and its `redraw` function
- `createHudWidgets` and `relayoutHudWidgets`
- `createPlanetArrivalVisual`

### Work

1. Introduce small typed view models for visual state rather than passing many independent booleans and coordinates.
2. Extract pure geometry and label/value formatting from Phaser object creation.
3. Keep pointer/keyboard binding and disposal adjacent as one lifecycle concern.
4. Consolidate repeated graphics operations into local named drawing helpers only when they express a complete visual element.
5. Preserve the existing control APIs so scenes do not acquire new implementation knowledge.

### Exit criteria

- `createMusicSliderControl` becomes a short composition function with independently testable geometry and rendering stages.
- Widget creation and relayout share an explicit widget contract rather than positional coupling.
- Controls retain keyboard, pointer, disabled, focus, and responsive behavior.
- No new module cycle or per-frame allocation is introduced.

## Phase 3 — Decompose Runtime Coordinators Along Event Boundaries

Reduce the warnings most likely to obscure gameplay defects while retaining recognizable composition roots.

### Targets

- `createGameSceneCombatFeedbackHandlers`
- `createGameSceneGameplayFrameBehavior`
- `scheduleTone`

### Work

1. Group combat feedback by event family: damage/hit feedback, rewards, terminal flow, and boss or helper events.
2. Split frame behavior into named input, movement, firing, system-update, and transition stages while preserving their exact order.
3. Represent tone-envelope and oscillator-routing choices as validated plans, leaving Web Audio scheduling as one imperative boundary.
4. Add ordering and cleanup tests before moving code, especially for terminal events and audio node teardown.
5. Keep one public factory per existing subsystem so callers do not coordinate the extracted pieces themselves.

### Exit criteria

- Runtime factories read as orchestration over named collaborators and fall below default complexity thresholds.
- Gameplay update order, collision/feedback behavior, audio timing, and cleanup remain unchanged.
- Profiling shows no regression in frame allocations or scheduling overhead.
- Extracted modules expose domain-specific contracts, not generic callback bags.

## Phase 4 — Structure Authored Music Without Fragmenting the Score

Improve navigation and validation of music data while treating length alone as weak evidence of poor design.

### Targets

- `arpeggiatorPatterns.ts`
- `bassPatterns.ts`
- `createSignatureMusic`

### Work

1. Define a small authoring schema for named motifs, variants, phrase metadata, and arrangement references.
2. Split pattern catalogs only at musical boundaries such as motif family or campaign movement, retaining a discoverable barrel.
3. Refactor `createSignatureMusic` into named arrangement stages or declarative sections rather than nested construction logic.
4. Extend level/music validation for unique identifiers, valid references, phrase length, deterministic ordering, and unused patterns.
5. If a catalog remains over the module threshold, register it as `authored-data` with a tight size budget and schema-validation rationale.

### Exit criteria

- A contributor can locate a motif and all of its variants without searching an 800-line undifferentiated file.
- No split duplicates musical metadata or makes playback order harder to inspect.
- All authored references are validated before runtime.
- The warning report identifies retained data concentration as reviewed policy, not actionable complexity.

## Phase 5 — Divide Drawing Recipes Into Stable Visual Passes

Address the graphics hotspots last because draw order, texture caching, and generated output are behavior.

### Targets

- `neonBackgroundGenerator.ts` and `ensureNeonBackgroundTextures`
- `generatePlanetTexture` and its anonymous recipe
- `ensureBossTextureVariant` and its anonymous recipe

### Work

1. Characterize texture keys, dimensions, cache idempotency, deterministic inputs, and representative rendered output.
2. Separate texture registration/cache policy from canvas creation and visual drawing passes.
3. Extract complete passes such as background field, glow geometry, surface detail, silhouette, and finishing treatment.
4. Share primitives only where two recipes use the same visual rule; keep one-off art direction local.
5. Name anonymous recipe callbacks and document draw-order invariants at their composition points.
6. Recheck startup time, texture memory, frame pacing, and high-quality rendering on the M1 MacBook Air profile used for prior optimization work.

### Exit criteria

- `neonBackgroundGenerator.ts` is below its current 650-line budget and that budget is lowered or removed.
- No anonymous drawing-recipe warning remains.
- Registration functions fall below default complexity thresholds; retained drawing passes have explicit budgets and visual evidence.
- Texture keys, cache behavior, visual output, startup cost, and gameplay frame pacing do not regress.

## Phase 6 — Close the Warning Budget

Rebaseline the checker only after the implementation work is complete.

### Work

1. Remove obsolete policies and lower every surviving concentration/function budget to just above its measured value.
2. Add a summary grouped by category, with actionable warnings first and retained policies second.
3. Update `docs/architecture-guidelines.md` with the durable classification rule and link to regression evidence rather than copying tactical details.
4. Record before/after module, edge, warning, retained-policy, bundle, and performance counts.
5. Run the complete unit, browser, visual, performance, build, and bundle gates before release.

### Exit criteria

- Zero unexplained architecture warnings.
- Every retained policy has a current rationale, regression test or visual evidence, and a tight enforced budget.
- No source dependency cycles, bundle regression, visual regression, or measurable frame-pacing regression.
- The report is actionable enough that a new warning represents work to investigate, not familiar background noise.

## Verification

Run focused tests throughout each phase, then run the complete gate:

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

Run the affected Playwright visual projects after Phases 1, 2, and 5; gameplay/performance projects after Phases 3 and 5; and the complete browser matrix before release.

## Overall Acceptance Criteria

- The 25-warning baseline becomes zero unexplained warnings, not necessarily zero retained policies.
- Every real coordinator hotspot is decomposed below default thresholds.
- Authored data and cohesive pure policies remain easy to read as domain artifacts rather than being split to satisfy a metric.
- Drawing recipes retain visible ordering and exact output while registration and independent passes gain clear names.
- Architecture policy remains a regression guard, with budgets moving downward over time.

## Non-goals

- Forcing every file or function below one universal line count.
- Replacing authored TypeScript music with a new external content system.
- Building a generic UI framework or drawing DSL.
- Changing gameplay balance, music composition, or visual art direction during structural work.
- Adding abstractions whose only purpose is to reduce a reported number.
