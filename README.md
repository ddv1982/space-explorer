# Space Explorer

A retro arcade space shooter built with [Phaser 3](https://phaser.io), TypeScript, and Vite. Pilot a responsive ship through a **10-level campaign**, survive escalating hazards, defeat themed bosses, collect power-ups, and upgrade your ship between missions.

Playable here:
[Space Explorer](https://space-explorer.net)

![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)
![Phaser](https://img.shields.io/badge/Phaser-3.90-green)
![Vite](https://img.shields.io/badge/Vite-8.0-purple)

## Quick start

```bash
bun install
bun run dev
```

Open `http://localhost:5173` in your browser.

## Controls

| Input | Action |
|-------|--------|
| Arrow keys / WASD | Move ship |
| Space / Click | Fire weapons |

## Game overview

### Core loop

```text
Menu → Game → Planet Intermission → Game → ... → Victory
```

- Fight through enemy waves, hazards, and bosses
- Lose HP on hits, but continue the run while you still have remaining lives
- Respawn after death if lives remain
- Spend score as credits between levels to upgrade your ship
- Reach the end of the campaign to trigger the Victory flow

### Campaign roster

| Level | Name | Highlights | Boss |
|------:|------|------------|------|
| 1 | Asteroid Belt Alpha | readable opener, debris rhythm | No |
| 2 | Nebula Pass | low-visibility ambushes | No |
| 3 | Ion Storm Sector | storm pressure, first boss gate | Storm Binder |
| 4 | Warzone Corridor | dense frontal pressure | Siegebreaker Vaal |
| 5 | Deep Space Inferno | endurance gauntlet | Inferno Harbinger |
| 6 | Wreckfield Run | collapsing wreck lanes | Scrap Regent |
| 7 | Ghostlight Veil | fog ambushes, mine pockets | Veil Manta |
| 8 | Crown of Rings | orbital lane hazards | Ring Shepherd |
| 9 | Obsidian Maw | canyon / rock corridor set piece | Maw Serpent |
| 10 | Terminus Black | anomaly hazards, final exam | Null Crown |

### Enemy roster

- **Scout** — fast, low-HP contact threat
- **Fighter** — mobile ranged pressure
- **Bomber** — slower, heavier target that drops bombs
- **Swarm** — fragile group attackers
- **Gunship** — heavier enemy with spread fire
- **Bosses** — named encounters with distinct styles such as barrage, pursuit, carrier, bulwark, and maelstrom patterns

### Gameplay systems

- **Scripted level sections** — pacing, hazard cadence, and encounter focus can shift inside a level
- **Hazard scripting** — asteroid bursts, ring crossfire, nebula ambushes, gravity wells, and canyon-wall rock corridors
- **Per-level procedural music** — each level and boss has its own Web Audio-driven music identity
- **Power-up drops** — temporary pickups such as health, shield, and rapid-fire boosts
- **Lives + respawn flow** — the run continues after death if lives remain
- **Upgrade progression** — intermission upgrades unlock over time and obey progression caps

### Upgrades

Bought during the planet intermission screen using score as currency:

- **Hull Armor** — raises max HP
- **Weapons** — increases damage
- **Fire Rate** — improves firing speed
- **Shield** — increases hit absorption

Some upgrades unlock later in the campaign and use progression caps so the run scales in a controlled way.

## Tech stack

- **Phaser 3.90** — game engine
- **TypeScript** — strict typing across gameplay and config
- **Vite 8** — dev server and production build
- **Bun** — package manager / script runner

## Project structure

The internal architecture rules live in [`docs/architecture-guidelines.md`](docs/architecture-guidelines.md).

```text
src/
├── config/
│   ├── LevelsConfig.ts          # public level-config entrypoint
│   ├── UpgradesConfig.ts        # upgrade definitions and progression rules
│   ├── playerConfig.ts          # player stat scaling
│   └── levels/
│       ├── types.ts            # level config types
│       ├── selectors.ts        # getLevelConfig / campaign selectors
│       ├── registry.ts         # ordered campaign registry
│       ├── musicHelpers.ts     # procedural music config helpers
│       └── definitions/        # one file per level
├── entities/
│   ├── Player.ts
│   ├── PowerUp.ts
│   ├── Asteroid.ts
│   ├── BomberBomb.ts
│   ├── Bullet.ts
│   ├── EnemyBullet.ts
│   └── enemies/
├── scenes/
│   ├── BootScene.ts
│   ├── PreloadScene.ts
│   ├── MenuScene.ts
│   ├── GameScene.ts
│   ├── PlanetIntermissionScene.ts
│   ├── GameOverScene.ts
│   └── VictoryScene.ts
├── systems/
│   ├── AudioManager.ts         # procedural audio and music
│   ├── CollisionManager.ts
│   ├── EnemyPool.ts
│   ├── HUD.ts
│   ├── LevelManager.ts
│   ├── PlayerState.ts
│   ├── WaveManager.ts          # config-driven enemy + hazard spawning
│   └── ...
└── utils/
    ├── constants.ts
    └── layout.ts
```

## Design notes

- **Config-driven campaign** — levels, music, hazard sections, and bosses are authored through config
- **Procedural presentation** — visuals and audio avoid external asset-heavy pipelines where possible
- **Object pooling** — bullets, enemies, bombs, asteroids, and bullets are pooled for performance
- **Arcade readability first** — later levels add complexity through authored pacing and hazards, not only stat inflation

## Development

```bash
bun run dev      # start local dev server
bun run build    # type-check and production build
bun run preview  # preview production build
bun run lint     # eslint
bun run knip     # unused-code analysis
```

## Additional docs

- [`docs/architecture-guidelines.md`](docs/architecture-guidelines.md) — scene/system boundaries and coding rules
- [`docs/campaign-expansion-plan.md`](docs/campaign-expansion-plan.md) — historical expansion plan and design-reference notes

## License

MIT License. See [`LICENSE`](LICENSE).
