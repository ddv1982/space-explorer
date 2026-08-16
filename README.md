# Space Explorer

A retro arcade space shooter built with [Phaser 4](https://phaser.io), TypeScript, and Vite. Pilot a responsive ship through a **10-level campaign**, survive escalating hazards, defeat themed bosses, collect power-ups, and upgrade your ship between missions.

Playable here:
[Space Explorer](https://space-explorer.net)

[![Latest release](https://img.shields.io/github/v/release/ddv1982/space-explorer?sort=semver)](https://github.com/ddv1982/space-explorer/releases/latest)
[![Quality Gates](https://github.com/ddv1982/space-explorer/actions/workflows/quality.yml/badge.svg)](https://github.com/ddv1982/space-explorer/actions/workflows/quality.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0-blue)
![Phaser](https://img.shields.io/badge/Phaser-4.2.1-green)
![Vite](https://img.shields.io/badge/Vite-8.1.5-purple)
![Bun](https://img.shields.io/badge/Bun-1.3.5-f9f1e1)
[![License](https://img.shields.io/github/license/ddv1982/space-explorer)](LICENSE)

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

On touch devices the on-screen joystick and tap-to-fire are active by default; when a hardware
keyboard is used, the first keypress switches to keyboard controls and hides the joystick for the
rest of the session (tap-to-pause stays available). Phones and tablets play in both portrait and
landscape; on phones, portrait gives the longest vertical read on incoming threats.

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
| 1 | Aurora Threshold | gentle lane-reading opener with clean diver telegraphs | No |
| 2 | Tideglass Shallows | slow, telegraphed wormhole arrivals and dodger debut | No |
| 3 | Ember Monsoon | drifting minefields and ember-storm lane commitments | Pyre Herald |
| 4 | Clockwork Causeway | beat-timed waves and telegraphed lancer duels | Marshal Vectra |
| 5 | Shatter Reef | splitter target-priority exam and reef pressure | Reef Stalker |
| 6 | Debris Gauntlet | solar-flare and laser-lattice set-piece gauntlet | Bastion Bulwark |
| 7 | Hollow Choir | elite lancer/gunship remix with wormhole telegraphs | Choir Regent |
| 8 | Eclipse Narrows | bomber and gunship pincers through tight corridors | Umbral Ark |
| 9 | Swarmfront | peak-density swarm survival and returning splitters | Hive Maelstrom |
| 10 | Eventide Engine | six-section final exam reprising the campaign's systems | Omega Null |

### Enemy roster

- **Scout** — fast, low-HP contact threat
- **Fighter** — mobile ranged pressure tuned to two base-weapon hits
- **Bomber** — slower bomb carrier tuned to four base-weapon hits
- **Swarm** — fragile group attackers
- **Gunship** — spread-fire anchor tuned to five base-weapon hits
- **Bosses** — named encounters with distinct styles such as barrage, pursuit, carrier, bulwark, and maelstrom patterns

### Gameplay systems

- **Scripted level sections** — pacing, hazard cadence, and encounter focus can shift inside a level
- **Hazard scripting** — asteroid bursts, ring crossfire, nebula ambushes, gravity wells, and canyon-wall rock corridors
- **Adaptive section pacing** — tension-arc shaping and fairness throttles smooth extreme overlap spikes
- **Adaptive boss scaling** — boss durability scales with player upgrade investment and campaign progression
- **Per-level procedural music** — each level and boss has its own Web Audio-driven music identity
- **Power-up drops** — temporary pickups such as health, shield, and rapid-fire boosts
- **AEGIS Picket turrets** — a two-tier screen-edge support upgrade available for Level 5 onward
- **Marked Aces** — sparse gilded priority targets in Levels 5–10 with stronger rewards
- **Guard Break** — sustained main-gun pressure staggers later bosses into short damage windows
- **Max-chain Overdrive** — maintaining the x5 chain briefly accelerates the main gun
- **Lives + respawn flow** — the run continues after death if lives remain
- **Upgrade progression** — intermission upgrades unlock over time and obey progression caps

### Upgrades

Bought during the planet intermission screen using score as currency:

- **Hull Armor** — raises max HP
- **Weapons** — increases damage
- **Fire Rate** — improves firing speed
- **Shield** — increases hit absorption
- **AEGIS Picket** — installs and overclocks automatic flank-defense turrets

Some upgrades unlock later in the campaign and use progression caps so the run scales in a controlled way.

## Tech stack

- **Phaser 4.2.1** — ESM game engine with WebGL rendering
- **TypeScript** — strict typing across gameplay and config
- **Vite 8.1.5** — dev server and production build
- **Bun 1.3.5** — package manager and script runner

TypeScript 7 is the authoritative compiler for application and test type-checking. Until compiler-API consumers support TypeScript 7, the canonical `typescript` package temporarily remains on TypeScript 6 for ESLint; `@typescript/native` provides the TypeScript 7 compiler, and `bun run typecheck:ts6` provides the parity check. The scripts use explicit package paths so Bun cannot resolve the wrong compiler when both packages expose a `tsc` binary.

Phaser is consumed through its package ESM export and the game requires WebGL. Browsers without WebGL receive an explicit unsupported-device message instead of a partial Canvas fallback.

## Project structure

The internal architecture rules live in [`docs/architecture-guidelines.md`](docs/architecture-guidelines.md).

```text
src/
├── config/
│   ├── LevelsConfig.ts          # public level-config entrypoint
│   ├── UpgradesConfig.ts        # upgrade definitions and progression rules
│   ├── playerConfig.ts          # player stat scaling
│   └── levels/
│       ├── types.ts             # level config types
│       ├── selectors.ts         # getLevelConfig / campaign selectors
│       ├── registry.ts          # ordered campaign registry
│       ├── definitions/         # one file per level
│       └── music/               # level music configuration and patterns
├── entities/
│   ├── Player.ts
│   ├── PowerUp.ts
│   ├── Asteroid.ts
│   ├── BomberBomb.ts
│   ├── Bullet.ts
│   ├── EnemyBullet.ts
│   └── enemies/
│       └── boss/
├── scenes/
│   ├── gameScene/               # runtime lifecycle + flow helpers
│   ├── planetIntermission/      # upgrade-screen interaction/presentation
│   ├── menuScene/
│   ├── shared/
│   ├── BootScene.ts
│   ├── PreloadScene.ts
│   ├── MenuScene.ts
│   ├── GameScene.ts
│   ├── PlanetIntermissionScene.ts
│   ├── GameOverScene.ts
│   └── VictoryScene.ts
├── systems/
│   ├── audio/
│   │   └── procedural/          # procedural music internals
│   ├── parallax/                # layered background lifecycle helpers
│   ├── balance/
│   ├── effects/
│   ├── hud/
│   ├── wave/
│   ├── AudioManager.ts          # procedural audio and music orchestration
│   ├── CollisionManager.ts
│   ├── EnemyPool.ts
│   ├── HUD.ts
│   ├── LevelManager.ts
│   ├── PlayerState.ts
│   └── WaveManager.ts           # config-driven enemy + hazard spawning
└── utils/
    ├── spriteFactory/
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
bun run typecheck # type-check source, scripts, config, and tests
bun run typecheck:ts6 # compare against the temporary TypeScript 6 compatibility compiler
bun run test     # run unit/regression tests with per-file isolation
bun run test:e2e # run parallel functional/visual checks, then isolated performance evidence
bun run build    # type-check and production build
bun run preview  # preview production build
bun run lint     # eslint
bun run knip     # unused-code analysis
bun run levels:validate # config validation for level authoring
bun run bundle:report   # report dist asset sizes after a build
bun run bundle:check    # enforce bundle guardrail thresholds after a build
bun run architecture:check # reject dependency cycles and report concentration growth
```

Visual quality offers Low, Standard, High, and Auto. Auto starts with the High
presentation and adapts nonessential effects only after sustained frame-delivery
pressure. It restores quality gradually after stable delivery returns; gameplay
timing, physics, damage, and encounter pacing are never changed.

Production bundle checks separately guard the Phaser engine chunk and application
JavaScript. Development-only browser diagnostics are tree-shaken from releases.

Playtest shortcut (dev server only, stripped from production builds): open
`http://localhost:5173/?startLevel=9` to skip the menu into any level with that level's
progression-legal max loadout. Append `&upgrades=3,3,3,2` (hp,damage,fireRate,shield)
for an explicit loadout, or `&upgrades=0` for a stock ship.

## Docs

- [`docs/architecture-guidelines.md`](docs/architecture-guidelines.md) — scene/system boundaries and coding rules
- [`docs/qa/quality-gates.md`](docs/qa/quality-gates.md) — local and CI validation gates
- [`docs/procedural-music-system.md`](docs/procedural-music-system.md) — procedural music architecture, authoring contract, and deterministic QA workflow
- [`docs/campaign-expansion-plan.md`](docs/campaign-expansion-plan.md) — historical expansion plan and design-reference notes

## Release notes

- [Unreleased changes](docs/releases/unreleased.md)
- [Latest release notes](docs/releases/1.10.1.md)
- [Release archive](docs/releases/README.md)

## Acknowledgements

This project was largely autonomously built using [Flow for OpenCode](https://github.com/ddv1982/flow-opencode), a planning-and-execution workflow plugin that turns goals into tracked, reviewer-gated feature sessions.

## License

MIT License. See [`LICENSE`](LICENSE).
