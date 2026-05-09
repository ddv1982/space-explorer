# Level 6 Boss Helper-Wing Freeze: Plan

## Goal
Fix the freeze reported around level 6 (`Graveyard Lattice`) when the player loses a life during the boss fight and helper-wing/level-transition state may be active. The fix should make death, boss completion, helper-wing persistence, and next-level handoff deterministic without broad rewrites.

## Background
- Level 6 is the first expansion level: the core campaign has five levels, and `WRECKFIELD_RUN_LEVEL` is first in the expansion campaign (`src/config/levels/definitions/coreCampaign.ts:8`, `src/config/levels/definitions/expansionCampaign.ts:8`). Its boss is `Reliquary Crown`, and it enables `lastLifeHelperWing` (`src/config/levels/definitions/wreckfieldRun.ts:6`, `src/config/levels/definitions/wreckfieldRun.ts:34`, `src/config/levels/definitions/wreckfieldRun.ts:48`).
- Boss defeat marks the boss defeated, persists/suspends helper state, and queues level completion (`src/scenes/gameScene/combatFeedbackHandlers.ts:72`, `src/scenes/gameScene/combatFeedbackHandlers.ts:161`, `src/scenes/gameScene/combatFeedbackHandlers.ts:176`). Player death independently calls `flow.handlePlayerDeath()` and then syncs helper-wing state (`src/scenes/gameScene/combatFeedbackHandlers.ts:190`).
- `GameSceneFlowController.queueLevelComplete()` currently refuses new completion work while respawn or a terminal transition is active, and flushes only when the player is alive, respawn is not active, and terminal state is `none` (`src/scenes/gameScene/GameSceneFlowController.ts:122`, `src/scenes/gameScene/GameSceneFlowController.ts:255`).
- Respawn sets `respawnInProgress`, clears the pending level-complete timer, schedules Phaser timers, and then calls the flow-context pause hook (`src/scenes/gameScene/GameSceneFlowController.ts:201`, `src/scenes/gameScene/GameSceneFlowController.ts:272`, `src/scenes/gameScene/GameSceneFlowController.ts:286`). That hook currently pauses only the Arcade physics world, not the Phaser scene clock (`src/scenes/gameScene/flowContextBridge.ts:14`). Prior notes still flag respawn pause/resume and death-timing boundaries as freeze-prone (`docs/death-respawn-hitch-research-notes.md:5`, `docs/death-respawn-hitch-research-notes.md:52`).
- Helper wing grants when `remainingLives === 1`, persists granted slots, suspends for transition, and restores from `PlayerState.helperWing` on the next `GameScene` (`src/systems/LastLifeHelperWing.ts:60`, `src/systems/LastLifeHelperWing.ts:84`, `src/systems/LastLifeHelperWing.ts:111`, `src/scenes/gameScene/createPoolsAndGameplaySystems.ts:82`).
- Intermission upgrades preserve the full player state, while `advanceToNextLevel()` increments level and resets HP/shields without resetting lives or helper-wing state (`src/scenes/PlanetIntermissionScene.ts:256`, `src/systems/PlayerState.ts:183`). Treat lives/helper carryover as current gameplay contract unless a separate design change is requested.

## Diagnosis Hypothesis
The likely freeze is not a helper-wing save-schema bug. It is a same-frame or adjacent-frame transition race: boss defeat queues level completion, player death starts respawn and helper sync, respawn clears/suppresses the scheduled completion flush, and the respawn freeze/update-gate boundary may leave no reliable retry path back to level completion. Because the current pause hook targets Arcade physics rather than the whole Phaser scene, timer blocking must be verified before changing freeze mechanics.

## Approach
Make `GameSceneFlowController` the durable arbiter of transition intent, and keep helper-wing activation from undoing transition suspension.

1. **Durable level-complete intent.** Separate the logical `levelCompleteQueued` intent from the scheduled zero-delay flush timer. Clearing a timer during respawn must not lose the intent; final game-over/reset/shutdown are the only paths that should clear the intent outright.
2. **Monotonic terminal transitions.** Once `levelComplete` or `playerDeath` becomes the accepted terminal transition, later events should not cancel or flip it. A final death can still beat a merely queued, not-yet-accepted completion; it should not beat an already accepted level-complete terminal.
3. **Narrow respawn-freeze semantics.** First prove whether `physics.world.pause()` contributes to the freeze. If it does, replace it with a softer respawn freeze that relies on the existing locked-frame path, which already skips gameplay systems while sampling respawn/HUD (`tests/GameSceneUpdateGate.test.ts:226`). If it does not, keep physics pause and focus the fix on durable completion intent.
4. **Outcome-based helper sync.** Have `handlePlayerDeath` return a small outcome (`respawn-started`, `game-over-started`, `ignored-terminal-active`) with whether level completion is queued. If a terminal transition is already active, return `ignored-terminal-active` before decrementing/saving lives. `combatFeedbackHandlers` owns the primary invariant: sync/activate helper wing only for ordinary gameplay respawn, not when level-complete handoff or terminal transition is already in flight.
5. **No persistence migration.** Do not change `PlayerState.helperWing`, `remainingLives`, intermission upgrade saves, or level-advance state carryover in this fix.

## Work Items
1. **Lock the race down with tests first.** Add deterministic `GameSceneFlowController` coverage for: boss death queued then non-final player death; non-final player death then boss death while respawn is active; zero-delay completion flush firing while respawn is blocked; accepted level-complete terminal ignoring later player death; final death beating queued-but-unaccepted completion; and respawn completion behavior while `physics.world.pause()` is active.
2. **Refactor level-complete queue handling in `GameSceneFlowController.ts`.** Introduce explicit helpers for timer-only clear, intent clear, flush request, and try-flush. Ensure `beginRespawnTransition()` clears only the pending timer, `completeRespawnTransition()` retries a durable queued completion, and final game-over/reset/shutdown clear intent deliberately.
3. **Verify before changing respawn-freeze mechanics.** Add/adjust coverage that proves whether `physics.world.pause()` can coexist with respawn timer completion. Only if that test exposes a blocker, update `GameSceneFlowContext` / `flowContextBridge.ts` / `GameScene.ts` toward soft-freeze callbacks; otherwise avoid this refactor.
4. **Return a player-death flow outcome.** Change `GameSceneFlowController.handlePlayerDeath()` from `void` to an outcome object that reports whether respawn started, game-over started, or the death was ignored because a terminal transition was already active.
5. **Make helper-wing sync transition-aware.** Update `combatFeedbackHandlers.handlePlayerDeath()` to call `syncLastLifeHelperWingState()` only when the outcome is ordinary respawn and no level-complete handoff is queued. Keep boss-death ordering as persist → suspend → queue.
6. **Add combat/helper regression coverage.** In `tests/combatFeedbackHandlers.test.ts` or adjacent handler tests, cover helper sync allowed for ordinary respawn, suppressed when completion is queued, and suppressed for terminal/game-over outcomes. Add bridge tests only if the guard moves into `helperWingStateBridge.ts`.
7. **Keep `LastLifeHelperWing.ts` unchanged unless caller-side suppression fails.** The preferred invariant is caller-owned: transition paths do not sync helper activation. Add an internal transition-suspended guard only if a test proves another path can activate helpers after suspension.
8. **Verify the scene handoff path.** Run targeted tests, then full checks, and perform manual smoke around level 6 boss defeat, death during boss fight, adjacent-frame death/defeat, intermission, and next-level start using `docs/qa/scene-flow-smoke-checklist.md`.

## Acceptance Criteria
- Same-frame and adjacent-frame boss-defeat/player-death permutations do not strand the game in respawn, level-complete, or helper-wing transition state.
- Respawn completion has a proven retry path while respawn freeze/physics pause is active.
- Level-complete intent survives non-terminal respawn and flushes after the player is alive again.
- Accepted terminal transitions are stable: no later event flips level-complete to game-over or game-over to intermission.
- Helper wing remains additive in normal last-life gameplay but cannot reactivate during a level-complete handoff.
- No `PlayerState` schema or migration changes are required.

## Verification Steps
- Targeted tests:
  - `bun test tests/GameSceneFlowController.test.ts`
  - `bun test tests/combatFeedbackHandlers.test.ts`
  - `bun test tests/GameSceneUpdateGate.test.ts`
  - `bun test tests/gameSceneHelperWingStateBridge.test.ts`
- Full verification:
  - `bunx tsc --noEmit`
  - `bun run lint`
  - `bun test`
  - `bun run build`
- Manual smoke:
  - Level 6 boss defeat with player alive.
  - Player loses a non-final life during level 6 boss fight with helper wing enabled.
  - Boss defeat and player death on adjacent frames.

## Orchestration Progress
- [x] Item 1: Flow-controller durable level-complete intent, monotonic terminal transition handling, player-death outcome, and physics-pause respawn timer proof implemented. Verified with `bun test tests/GameSceneFlowController.test.ts` (7 pass, 0 fail) in sub-agent session `B7B9C907-3A3A-4F02-B531-04AA1532F800`.
- [x] Item 2: Combat/helper-wing death sync becomes transition-aware with regression coverage. Verified with `bun test tests/combatFeedbackHandlers.test.ts` (8 pass, 0 fail) in sub-agent session `0450B0B6-B1BD-4FB3-A60F-44E4739F28C3`.
- [x] Item 3: Targeted/full verification and final review. Oracle review findings were fixed in sub-agent session `92394ACF-6690-47BD-A44B-D6FEDD1CBCEB`; final verification in session `D3E7952E-2CE3-465E-AF12-DA69572F3130` passed targeted tests, `bunx tsc --noEmit`, `bun run lint`, `bun test` (248 pass, 0 fail), and `bun run build`. Fresh in-session verification also passed the same targeted tests plus `bunx tsc --noEmit`, `bun run lint`, `bun test` (248 pass, 0 fail), and `bun run build`.

## Open Questions
- If implementation proves final player death and boss defeat are truly simultaneous before either terminal is accepted, keep the conservative rule: final death beats a merely queued completion, but not an accepted level-complete terminal.
- Whether level completion should restore remaining lives is a separate gameplay-design question and should not block this freeze fix.

## References
- `src/scenes/gameScene/GameSceneFlowController.ts`
- `src/scenes/gameScene/combatFeedbackHandlers.ts`
- `src/scenes/gameScene/flowContextBridge.ts`
- `src/scenes/GameScene.ts`
- `src/systems/LastLifeHelperWing.ts`
- `src/systems/PlayerState.ts`
- `src/scenes/PlanetIntermissionScene.ts`
- `docs/death-respawn-hitch-research-notes.md`
- `docs/helper-wing-research-notes.md`
- `docs/qa/scene-flow-smoke-checklist.md`
