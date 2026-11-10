# Documentation Map

Start here when changing the game. Release history lives in [`CHANGELOG.md`](../CHANGELOG.md); older plans and research notes are in git history.

## Current architecture

- [`architecture-guidelines.md`](./architecture-guidelines.md) — ownership, dependency, lifecycle, and performance boundaries.
- [`procedural-music-system.md`](./procedural-music-system.md) — music runtime and authoring contract.
- [`level-design.md`](./level-design.md) — campaign and encounter vocabulary.
- [`art-direction.md`](./art-direction.md) and [`background-art-bible.md`](./background-art-bible.md) — presentation language.

## Development and QA

- [`../README.md`](../README.md#development) lists the local commands and what CI runs.

## Common change paths

- **Tune an encounter:** level definition → `LevelsConfig` selectors → `WaveManager`.
- **Add an enemy:** enemy type/config → `EnemyPool` registry → wave spawn handler → collision registry.
- **Change gameplay flow:** `GameSceneFlowController` → `GameplayFlow` contracts → `PlayerState` persistence.
- **Change intermission UI:** `PlanetIntermissionScene` → `planetIntermission/presentation` or `upgradeButtons`.
- **Add a visual effect:** `EffectsManager` or parallax layer → visual-quality profile → runtime performance budget.

## Runtime map

```text
main
  → scene registry
    → GameScene (lifecycle, ownership, transitions)
      → bootstrap runtime construction
      → flow and lifecycle controllers
      → gameplay systems
        → pooled entities
        → authored level configuration
```

## Decisions

- [`adr/`](./adr/) records the architecture decisions that still shape the code.

## Vocabulary

- **Lane reading:** recognizing where a threat will travel before committing movement.
- **Recovery beat:** a deliberately quieter interval that lets the player reposition or recover resources.
- **Pressure:** sustained visual or encounter demand; runtime visual pressure never changes simulation rules.
- **Terminal transition:** the one-way handoff from active combat to intermission, game over, or victory.
