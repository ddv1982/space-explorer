# Review Findings Remediation Plan

Date: 2026-08-19
Status: phases 0-8 implemented on this branch. Phase 9 remains parked.

This plan turns the 2026-08 review into a stacked sequence of PRs. The earlier quality plan in `docs/plans/codebase-quality-phased-improvement-2026-06-16.md` is historical. Most of its gates already exist. These findings are leftover holes in contracts that those gates do not enforce.

## Scope

Fix the accepted High, Medium, and Lower findings. The deferred performance list stays a later program. It did not receive independent Flow acceptance, and mixing it into this stack would pretend those probes already measure player-facing frame time.

Do not replace Phaser, Vite, Bun, or the scene and system map in `docs/architecture-guidelines.md`. Do not pause Phaser's scene clock. Do not add a UI framework, an ECS, or a second pause API.

## Current evidence

Confirmed against `main` at `9d6280d`.

**Deploy.** `.github/workflows/vercel.yml` and `.github/workflows/quality.yml` both fire on `push` to `main`. Deploy does not wait for quality or browser jobs. It runs `bunx vercel@latest`, puts `VERCEL_TOKEN` on the job `env`, and has no `concurrency` group or GitHub `environment`. Quality has no workflow `permissions` block. `vercel.json` has no security headers.

**Pause clock.** `CONTEXT.md` already states the contract. Pause stops Arcade physics. The scene clock keeps running. Systems that schedule gameplay consequences must count accumulated gameplay delta. `WaveManager`, `EnemyBase`, `HazardBeam`, and picket announcement comments already follow that. `ScoreManager.registerKill`, Overdrive via `getChainState(time)`, player fire in `gameplayFrameBehavior.ts`, helper fire, respawn, and contact cooldowns, and `PicketTurretSystem` mount creation still consume `scene.time.now` or the Phaser update `time` argument. `updateFrame.ts` skips gameplay updates while paused, then resumes with a jumped scene timestamp. Cooldowns and the 2500 ms chain window therefore expire for free during a pause.

**Helper-wing install order.** `runGameSceneCreateBootstrap` calls `registerRuntimeHandlers()`, which syncs `this.lastLifeHelperWing`. `GameScene.create` assigns the new runtime only after bootstrap returns. The first sync can hit a null or stale wing.

**Input.** `planetIntermission/interactionController.ts` activates on every `keydown-ENTER` and `keydown-SPACE`, including repeats. `PlanetIntermissionScene.tryBuyUpgrade` also calls `moveFocusAfterPurchase` when the focused upgrade caps, so a keyboard purchase can advance focus twice. `hardwareKeyboardDetection.ts` latches the first window `keydown` for the whole session and bootstrap then permanently suppresses the joystick.

**Touch and a11y.** Menu and pause chrome is canvas-drawn and pointer-first. Phone profiles set difficulty and quality row height to 24–28 px. Menu `DEL` is 44×20. The 44 CSS-pixel floor is already written in `docs/plans/menu-screen-responsive-hierarchy-2026-08-17.md` and is not enforced.

**Persistence.** `GameplayFlow` increments `player.shields` on pickup with no cap at the upgrade tier. `normalizePersistedPlayerState` then clamps `currentShields` to `upgrades.shield`. Delete in menu and pause writes immediately. `getStorage()` only checks that `localStorage` exists. `normalizePersistedPlayerState` keeps fractional `level` values. `getLevelConfig(1.5)` indexes `LEVELS[0.5]` and returns `undefined`.

**Lifecycle.** `startRegisteredScene` swallows load failures and has no generation token. `registerRestartOnResize`, `showControlsHint`, and `PreloadScene` re-bind scale and scene listeners on each create or preload without an idempotent rebind helper. `hideEnemyForBossIntro` hides and resets a body but leaves `body.enable` true. Shared `despawnEntity` already disables the body.

**Hot path and tests.** `Bullet` and `EnemyBullet` call `getRuntimeTrailInterval` per trail check. That freezes a new snapshot and re-reads visual quality. Asteroid spin adds `rotSpeed` once per update. Power-up bob uses delta for phase and then applies a per-frame X nudge. `MenuScene.test.ts` installs a `PlayerState` `mock.module`. `scripts/run-tests.ts` isolates files, which is why the leak stays hidden, and it has no per-suite timeout. Architecture budgets are hand-edited and stay green after a file shrinks.

**Docs.** `tests/e2e/visual-evidence/README.md` still names `tests/e2e/game.smoke.spec.ts`, which does not exist. Bundle notes last rebaselined in mid-2026 and still quote old chunk hashes.

## Approach choices

These are the forks that would otherwise stall the work. They are settled here so later PRs implement instead of re-litigating.

**Gameplay clock.** Keep Phaser scene time for tweens, delayed flashes, resize debounce, and HUD chrome. Add one `GameplayClock` that accumulates delta only on unpaused combat frames and expose `now` plus `delta`. Pass those values into score, fire, helper, picket, and HUD chain reads. Do not call `scene.time.paused = true`. `tests/updateFrame.test.ts` already protects the scene-time jump. A second clock is the domain model. Per-system private accumulators are how the hole opened.

**Helper-wing sync.** Move the first `syncLastLifeHelperWingState` to after `installBootstrapRuntime`. Do not add another lifecycle phase object.

**Deploy.** Fold production deploy into `quality.yml` as a final job with `needs: [quality, browser]`, `if: github.ref == 'refs/heads/main' && github.event_name == 'push'`, a `production` environment, a `concurrency` group that cancels in-flight deploys, step-scoped secrets, and a pinned `vercel` version. `workflow_run` is slower and easier to skip. Keep `vercel.json` `git.deploymentEnabled: false` so Vercel Git integration cannot bypass the gate.

**Save delete.** Add an in-place confirm on the same overlay. First activation arms. Second activation deletes. Escape or a later click elsewhere cancels. No modal stack.

**Hybrid keyboard.** Treat the first key as "keyboard is in use now", not "this session is keyboard-only". Restore the joystick on the next touch or pointer movement. Keep the controls hint swap.

**Menu a11y.** Keep the neon canvas. Add a visually hidden DOM layer for menu, pause, and intermission actions with names, a focus order, and Enter/Space activation. Mark the game canvas `aria-hidden` while that layer is live. A second painted UI is more than the job needs.

**Touch targets.** Floor hit areas at 44 CSS pixels on touch-oriented profiles. Visual chrome may stay smaller. The `DEL` face can stay compact if its hit rectangle is 44×44.

**Shield charges.** Persist `currentShields` as live charges. Cap at a small safety ceiling, not at `upgrades.shield`. The upgrade tier remains the refill amount on level advance.

**Boss intro.** Delete `hideEnemyForBossIntro`. Call each enemy's `despawn()` so pooled bodies disable the same way a normal death does.

**Performance snapshot.** Cache the last emitted snapshot on the budget object. Trail helpers read the cache. Rebuild only on `sampleFrame` pressure change or quality-tier change.

**Architecture budgets.** After each check, fail when a retained policy budget is more than a small slack above the measured size. The checker becomes the lever that forces a downward edit.

**Deferred performance.** Do not raise CI frame-time gates in this stack. Those tests currently prove probe shape on SwiftShader. Honesty work belongs in a later program with production-bundle runs, serialized local defaults, late-level and phone-portrait scenarios, and a live leak assertion.

## Phase map

Each phase is one PR unless noted. Later phases may start in a worktree. They must not merge before the named gate on the previous head is green.

### Phase 0. Production deploy cannot outrun quality

Priority: first. Owner: `.github/workflows`, `vercel.json`.

Work:

- Move the Vercel production job into `quality.yml` with `needs: [quality, browser]`.
- Add `concurrency: { group: production-deploy, cancel-in-progress: true }`.
- Set `environment: production`.
- Pin `vercel` (exact version, not `@latest`).
- Move `VERCEL_*` secrets onto the deploy steps only.
- Set `permissions: { contents: read, id-token: none }` on both workflows.
- Leave GitHub Environment protection rules for a human. Required reviewers are a repo setting, not a diff.

Gate:

- A workflow dry-read shows deploy skipped on pull requests and blocked unless both quality jobs succeeded.
- `bunx vercel@latest` is gone from the repo.

Do not wait for security headers here. Headers do not stop an ungated production push.

### Phase 1. Gameplay clock and helper-wing install order

Priority: high. Owner: `GameScene` create and update, score, helper, picket.

Work:

- Introduce `GameplayClock` with `reset`, `advance(delta)`, `now`, and `delta`.
- Advance it only from `updateGameplayFrame`.
- Thread `clock.now` into player fire, `ScoreManager` chain reads, helper update, deploy, contact, respawn, picket `update`, and HUD chain display.
- Keep Phaser `time` for visual delayed calls.
- Call `syncLastLifeHelperWingState` after `installBootstrapRuntime`.
- Add a bootstrap-order test that fails if sync runs before the new wing is installed.

Gate:

- A unit test pauses for longer than `CHAIN_WINDOW_MS` and the chain, fire cooldown, helper respawn, and picket cadence are unchanged.
- Existing wave, hazard, and enemy pause tests still pass.
- `bun run test` plus the gameplay browser smoke path in `docs/qa/scene-flow-smoke-checklist.md` for pause and resume.

### Phase 2. Intermission input and hybrid keyboard

Priority: high for purchases, medium for hybrid devices. Owner: intermission interaction, `hardwareKeyboardDetection`, `MobileControls`.

Work:

- Ignore `event.repeat` on Enter and Space. Phaser keyboard events expose the DOM event.
- Let `tryBuyUpgrade` own post-purchase focus. Remove the second move from `activateFocusedButton`.
- On hardware keydown, suppress the joystick. On the next touch or pointer move, show it again. Detection stays session-wide for the hint text. Suppression does not.

Gate:

- Holding Enter on a cheap upgrade buys once.
- Buying the last rank of a focused upgrade moves focus once.
- A hardware-key-then-touch test shows the joystick again.

### Phase 3. Persistence honesty

Priority: medium, player-facing. Owner: `PlayerState`, `SaveSlotStorage`, menu and pause delete.

Work:

- Floor and clamp `level` in `normalizePersistedPlayerState` to an authored integer. Make `getLevelConfig` reject or coerce non-integers so `LEVELS[0.5]` cannot happen.
- Persist shield pickups. Cap `currentShields` at a named maximum that is above the upgrade tier.
- Probe storage with set and remove, not only `in window`.
- Require confirm-to-delete in menu tiles and pause slot rows. Same arm-and-confirm rule in both places.

Gate:

- A checkpoint with temporary shields above the shield upgrade reloads with those charges.
- `level: 1.7` normalizes to `1` and still resolves an authored config.
- A storage mock that throws on write reports unavailable.
- Delete without confirm leaves the slot. Confirm removes it.

### Phase 4. Touch targets

Priority: high for phones. Owner: menu layout, tier selectors, pause slot buttons.

Work:

- Add a shared `MIN_TOUCH_TARGET_PX = 44` used by menu, pause, and intermission hit areas on touch-oriented profiles.
- Raise phone difficulty and quality hit height to 44. Keep the visual row tighter if the layout still fits `360×600` and `844×390`.
- Expand `DEL` hit area to 44×44. Keep the glyph small.
- Pause slot SAVE/LOAD/DEL already sit at 68×30. Raise those hit boxes to 44 px tall on compact pause rows.

Gate:

- Table-driven layout tests assert every interactive rect on phone-portrait, phone-landscape, and ultra-compact is at least 44×44.
- Existing visual evidence for menu and pause still fits the frame. If a band overflows, compress gaps first, then type size, never the hit floor.

### Phase 5. Accessible menu, pause, and intermission

Priority: high, larger than Phase 4. Depends on Phase 4 only for shared action names.

Work:

- Mount a single off-screen (or `sr-only`) DOM tree owned by the active overlay scene.
- Expose named buttons for run start, slot load, slot delete confirm, pause resume, pause save/load/delete, difficulty, quality, upgrade purchase, and continue.
- Tab order matches the visual reading order. The canvas is `aria-hidden` while the overlay is up.
- Keyboard activation goes through the same handlers the canvas buttons already call.
- Destroy the DOM tree on scene shutdown.

Gate:

- A Playwright accessibility snapshot on Menu, Pause, and Planet Intermission lists the named controls.
- Keyboard-only purchase, pause resume, and slot load still work.
- No second painted theme.

### Phase 6. Lifecycle leaks

Priority: medium. Owner: scene registry, resize helpers, boss intro.

Work:

- Give `ensureSceneRegistered` a generation token tied to the scene manager. Ignore resolved loads after shutdown or a newer request for the same key. Surface a visible failure instead of only `console.error`.
- Rebind resize and hint listeners through the existing `rebindSceneLifecycleHandlers` pattern so a second create cannot stack handlers.
- Replace `hideEnemyForBossIntro` with `enemy.despawn()`.
- Keep `PreloadScene` generation for the font-wait transition. Use it for resize registration too.

Gate:

- A double-create or double-preload test shows one live resize handler.
- A rejected lazy scene load does not call `scene.start`.
- After boss intro, every previously active pooled enemy has `body.enable === false` and is inactive.

### Phase 7. Hot path, runner, budgets, docs

Priority: medium and lower. Owner: budget, entities, scripts, docs.

Work:

- Cache `RuntimePerformanceSnapshot`. Trail interval helpers read the cache.
- Scale asteroid `rotSpeed` and power-up bob displacement by `delta / (1000 / 60)`.
- Add a per-file timeout to `scripts/run-tests.ts`. Print failing stdout as today. On success, keep the one-line pass. Add `--verbose` for full child output.
- Stop `MenuScene.test.ts` from mocking the whole `PlayerState` module, or inject the few functions it needs so `bun test tests` cannot leak.
- Fail architecture check when a retained budget exceeds measured size by more than the documented slack.
- Point visual-evidence docs at `tests/e2e/visual.evidence.spec.ts` and `tests/e2e/smoke.spec.ts`.
- Rebaseline `docs/bundle-size-optimization-notes.md` from a fresh `bun run bundle:report`.

Gate:

- `bun run test` still isolates files and fails a hung suite.
- A same-process `bun test tests/MenuScene.test.ts tests/<any PlayerState consumer>.test.ts` pair does not see the menu mock.
- Architecture check fails a fixture whose budget is far above its line count.
- Bundle notes match current hashes and totals.

### Phase 8. Security leftovers

Priority: lower. Can land beside Phase 7.

Work:

- Add Vercel security headers in `vercel.json` (`Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`). Keep CSP loose enough for Phaser WebGL and the procedural audio worklet if one is used. Tighten after a report, not before.
- Add `bun audit` (or the current Bun advisory command) as a quality step that fails on high severity.
- Confirm both workflows declare `permissions`.

Gate:

- Production response includes the headers.
- Advisory step fails a fixture or documented override, not a silent warn.

### Phase 9. Deferred performance program

Out of this stack. Track it. Do not schedule it behind Phase 8 as if it were accepted work.

When it starts, the first jobs are:

- Separate "probe is alive" CI assertions from hardware frame-budget assertions.
- Default local Playwright performance to one worker. Keep four workers for functional and visual only.
- Add late-level, boss, dense-beam, saturated-pool, long-session, and 390×844 scenarios.
- Point browser performance at `vite preview` of `dist`, not `vite`.
- Sample adaptive quality only during active combat frames. Count deltas above 250 ms as dropped, or keep a separate stall counter.
- Add a repeated scene-transition leak test with bounds on bodies, tweens, listeners, and heap.

## Throughput checkpoint

Merge order is linear on `main`. Parallel implementation is fine. Parallel merge is not.

| After this lands | The next engineer can | They must not start |
| --- | --- | --- |
| Phase 0 | Treat `main` deploys as gated | Touch gameplay clocks |
| Phase 1 | Trust pause as a gameplay freeze | Rewrite score or fire to use `scene.time.now` |
| Phase 2 | Change intermission focus rules | Add more keydown buyers without a repeat guard |
| Phase 3 | Change save UI copy | Clamp shields to the upgrade tier |
| Phase 4 | Overlay DOM on stable hit rects | Shrink phone hits to recover layout |
| Phase 5 | Add more named overlay actions | Paint a second menu |
| Phase 6 | Add lazy scenes | Hide pooled enemies without `despawn` |
| Phase 7 | Tune budgets and docs | Treat architecture green as current size |
| Phase 8 | Tighten CSP | Call the deferred perf list done |

Stop the stack if Phase 1 changes pause feel in a way the existing wave or hazard tests cannot see. Play one pause-during-telegraph and one pause-during-max-chain before opening Phase 2.

## Non-goals

- No new quality framework.
- No raising architecture budgets to quiet the checker.
- No CI frame-time fail that SwiftShader cannot represent.
- No rotate lock. Portrait stays the preferred phone layout.
- No difficulty or encounter retune.

## Verification shared by every phase

Run the gates in `docs/qa/quality-gates.md` that the phase can affect.

- Workflow-only phases run the static jobs and a workflow-file review.
- Gameplay phases run `bun run test` and the relevant browser lane.
- Layout and a11y phases run visual evidence plus the new snapshot.
- Persistence phases run unit tests. They do not need a full campaign.

## Suggested first implementation slice

If only one coding PR follows this document, implement Phase 0 and Phase 1 together only if the deploy diff stays reviewable. Prefer Phase 0 alone, then Phase 1. Those two close the production hole and the documented pause contract. Everything else is safer on top of that.
