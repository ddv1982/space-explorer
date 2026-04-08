# Space Explorer

A retro arcade space shooter built with [Phaser 4 RC](https://phaser.io), TypeScript, and Vite. Pilot a responsive ship through a **10-level campaign**, survive escalating hazards, defeat themed bosses, collect power-ups, and upgrade your ship between missions.

Playable here:
[Space Explorer](https://space-explorer.net)

![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)
![Phaser](https://img.shields.io/badge/Phaser-4.0.0--rc.7-green)
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
| 1 | Solar Slipstream | high-contrast onboarding, rhythmic telegraphs | No |
| 2 | Prism Reef | visibility pressure + ambush timing | No |
| 3 | Magnetar Foundry | storm-and-gravity pressure, first wall | Arc Warden Khepri |
| 4 | Fracture Convoy | frontal lane control and convoy choke points | Marshal Bront |
| 5 | Cinder Vault | attrition gauntlet through ember hazards | Pyre Leviathan |
| 6 | Graveyard Lattice | collapsing salvage corridors | Reliquary Crown |
| 7 | Mirage Archive | deceptive calm, memory-fog ambushes | Archivist Shade |
| 8 | Halo Cartography | fast orbital pattern prediction | Orbital Cantor |
| 9 | Glass Rift Narrows | claustrophobic canyon precision flying | Rift Basilisk |
| 10 | Eventide Singularity | full-system anomaly finale | Axiom Null |

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
- **Adaptive section pacing** — tension-arc shaping and fairness throttles smooth extreme overlap spikes
- **Adaptive boss scaling** — boss durability scales with player upgrade investment and campaign progression
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

- **Phaser 4 RC (4.0.0-rc.7)** — game engine
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
bun run levels:validate # config validation for level authoring
```

## Additional docs

- [`docs/architecture-guidelines.md`](docs/architecture-guidelines.md) — scene/system boundaries and coding rules
- [`docs/procedural-music-system.md`](docs/procedural-music-system.md) — procedural music architecture, authoring contract, and deterministic QA workflow
- [`docs/campaign-expansion-plan.md`](docs/campaign-expansion-plan.md) — historical expansion plan and design-reference notes
- [`docs/releases/0.2.1.md`](docs/releases/0.2.1.md) — subtle brightness and color-pop patch notes
- [`docs/releases/0.2.0.md`](docs/releases/0.2.0.md) — Phaser 4 compatibility-first migration notes
- [`docs/releases/0.7.1.md`](docs/releases/0.7.1.md) — rhythm stabilization pass for steadier and less sluggish procedural music feel
- [`docs/releases/0.7.0.md`](docs/releases/0.7.0.md) — deterministic procedural music architecture upgrade (intent, harmony, rhythm, arrangement, QA)
- [`docs/releases/0.5.2.md`](docs/releases/0.5.2.md) — adaptive boss scaling, hazard fairness pacing, and level validator release notes
- [`docs/releases/0.5.3.md`](docs/releases/0.5.3.md) — stronger boss durability scaling for upgrade-heavy runs
- [`docs/releases/0.5.4.md`](docs/releases/0.5.4.md) — order-of-magnitude boss HP increase across campaign bosses

## Acknowledgements

This project was largely autonomously built using [Flow for OpenCode](https://github.com/ddv1982/flow-opencode), a planning-and-execution workflow plugin that turns goals into tracked, reviewer-gated feature sessions.

## License

MIT License. See [`LICENSE`](LICENSE).
