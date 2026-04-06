# Architecture Guidelines

This document describes the scene boundaries, system contracts, and coding rules that match the current Phaser + TypeScript structure in this repo.

## Scene Responsibilities

- `BootScene` and `PreloadScene` are thin startup scenes. Keep them focused on bootstrapping and startup handoff.
- `MenuScene` owns fresh-run setup. It resets persistent player state before starting gameplay.
- `GameScene` is the gameplay orchestrator. It builds the active level, connects systems, reacts to gameplay events, and is the only scene that decides when combat transitions to `PlanetIntermission` or `GameOver`.
- `PlanetIntermissionScene` owns between-level upgrades and the handoff into the next gameplay scene or `Victory`.
- `GameOverScene` and `VictoryScene` are terminal presentation scenes. They read the stored run summary and should not reconstruct gameplay state themselves.

## Scene and System Boundaries

- `GameScene` composes systems and entities; it should stay responsible for scene lifecycle, scene transitions, and top-level event wiring.
- Systems in `src/systems` should stay focused on one area of behavior:
  - `LevelManager` tracks progress, boss timing, and completion state.
  - `WaveManager` converts `LevelsConfig` data into live encounters, hazard sections, and asteroid spawns.
  - `EnemyPool` owns pooled enemy, bomb, boss, and enemy-bullet groups.
  - `CollisionManager` owns overlap wiring and emits gameplay events instead of changing scenes directly.
  - `HUD`, `EffectsManager`, `AudioManager`, `ParallaxBackground`, `WarpTransition`, `InputManager`, and `ScoreManager` should remain presentation or support systems.
- Prefer pushing reusable gameplay rules into systems or shared helpers, but keep scene-only flow decisions inside the scene that owns the transition.

## Shared Gameplay-Flow Contracts

- `src/systems/GameplayFlow.ts` is the shared contract for gameplay scene events and terminal transition names.
- Add new gameplay events to `GAME_SCENE_EVENTS` instead of introducing ad hoc string literals across files.
- Keep terminal transition state centralized through `TERMINAL_TRANSITIONS` and `TerminalTransitionState` so combat shutdown rules stay consistent.
- `GameScene` currently treats terminal transitions as effectively one-way once they are committed, with one deliberate exception: a pending level-complete handoff can still be canceled if a fatal hit needs to take precedence first. Preserve that guard/precedence rule before adding new end-of-level or death behavior.
- Optional cleanup and feedback that should not block scene completion should stay wrapped in best-effort helpers, matching the existing `runBestEffort` usage in gameplay and collision code.

## Shared Player State and Run Summary Contracts

- `src/systems/PlayerState.ts` is the only place that should define registry keys and helper functions for persistent run data.
- Use `getPlayerState`, `setPlayerState`, `saveScoreToState`, `saveCurrentHp`, `advanceToNextLevel`, `getRunSummary`, and `setRunSummary` instead of writing raw registry keys in scenes.
- `PlayerStateData` is the long-lived run state used between scenes.
- `RunSummaryData` is the terminal summary contract used by `GameOverScene` and `VictoryScene`.
- When adding new terminal UI data, extend `RunSummaryData` and update the setter/getter helpers first so every scene reads the same contract.

## Data-Driven Enemy Wiring Expectations

- New encounter tuning should start in `src/config/LevelsConfig.ts`. Adjust weights, encounter sizes, boss thresholds, and cadence there before adding scene logic.
- Keep `src/config/LevelsConfig.ts` as the public entrypoint, but prefer organizing large authored datasets behind focused modules (for example types, selectors, internal helpers, and separate definition files) instead of letting one config file accumulate every concern.
- Level identity should stay in the level-config module boundary as well. Background/theme metadata, music config, authored stage sections, boss identity, and difficulty role belong in focused config modules behind the `src/config/LevelsConfig.ts` entrypoint instead of ad hoc scene branches.
- Per-level music should stay declarative. `AudioManager` may interpret procedural track config, but `GameScene` should only select the current stage or boss cue from level config.
- Authored stage moments should be represented as reusable `sections` / hazard descriptors in level config. Keep `WaveManager` responsible for interpreting them instead of pushing timeline logic into scenes.
- Adding a new enemy type requires a full wiring pass:
  - Add the type to `EnemyType` and update level enemy weights.
  - Add or update the pooled group and spawn method in `EnemyPool`.
  - Register the type in `EnemyPool.getEnemyGroupRegistry()` so collisions and player-contact behavior stay complete.
  - Add a spawn handler in `WaveManager.enemySpawnHandlers` so config data can produce live spawns.
  - Wire any extra projectile or hazard pools the enemy needs during spawn setup.
- Keep `WaveManager` data-driven. It should select from config and delegate concrete object creation to `EnemyPool` instead of embedding enemy-specific scene logic.

## Coding Guidelines for Future Changes

- Prefer config changes over hard-coded scene changes when tuning difficulty, pacing, colors, or upgrade balance.
- Reuse existing shared contracts before adding new scene-local constants for events, registry data, or transition names.
- Keep scene transitions in scenes, not in lower-level systems.
- Preserve object pooling patterns (`getFirstDead(false)` / `group.get(...)`) for gameplay objects that spawn frequently.
- Add narrow helper methods only when they clarify a repeated rule or boundary; otherwise keep related logic together.
- Follow the existing TypeScript style: explicit property types when useful, small private helpers, and minimal abstraction.
- When a change affects both gameplay flow and terminal scenes, verify that `setRunSummary` and player-state updates happen before the scene transition.
- If you introduce a new system-level dependency, prefer event emission or setter-based wiring over direct cross-system mutation during update loops.

## Practical Checklist

- After gameplay-flow changes, check `GameScene`, `GameplayFlow`, and `PlayerState` together.
- After enemy roster changes, check `LevelsConfig`, `WaveManager`, `EnemyPool`, and `CollisionManager` together.
- After adding terminal UI data, check both `GameOverScene` and `VictoryScene`.
- Keep `README.md` high level and update this document when the internal architecture changes in a meaningful way.
