# Space Explorer

A retro arcade space exploration shooter built with [Phaser 3](https://phaser.io), TypeScript, and Vite. Fly your spaceship through five increasingly dangerous sectors, battle enemy waves, defeat bosses, and upgrade your ship between missions.

![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)
![Phaser](https://img.shields.io/badge/Phaser-3.90-green)
![Vite](https://img.shields.io/badge/Vite-8.0-purple)

## Play

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

## Game Overview

### Game Loop

```
Menu → Game (Level 1) → Planet Intermission → Game (Level 2) → ... → Victory
```

Each level has increasing difficulty. Between levels you land on a planet and can spend your score as credits to upgrade your ship. If your HP reaches zero, it's game over.

### Sectors

| Level | Name | Enemies | Boss |
|-------|------|---------|------|
| 1 | Asteroid Belt Alpha | Scouts, Fighters | No |
| 2 | Nebula Pass | Scouts, Fighters, Bombers | No |
| 3 | Ion Storm Sector | Scouts, Fighters, Bombers, Swarm | Yes |
| 4 | Warzone Corridor | All types including Gunships | Yes |
| 5 | Deep Space Inferno | All types, maximum spawn rate | Yes |

### Enemies

- **Scout** — Fast, low HP, kamikaze on contact
- **Fighter** — Medium speed, fires bullets at the player
- **Bomber** — Slow, high HP, drops proximity bombs that deal 2 damage
- **Swarm** — Tiny, fast, spawns in groups, low HP each
- **Gunship** — Heavy, fires a 3-bullet spread pattern
- **Boss** — 30 HP, two phases (5-bullet spread → spiral pattern), appears on levels 3-5

### Upgrades

Spent at the planet intermission screen between levels using your score as currency:

- **Hull Plating** — +2 max HP per level
- **Weapons** — +1 damage per level
- **Fire Rate** — Faster shooting per level
- **Shield** — Absorbs one full hit per level

## Tech Stack

- **Phaser 3.90** — Game engine (WebGL with Canvas fallback)
- **TypeScript** — Strict mode, ES2020 target
- **Vite 8** — Build tool and dev server

## Architecture

The current architectural and coding guidance for this repo lives in [`docs/architecture-guidelines.md`](docs/architecture-guidelines.md). Keep that document in sync with future scene/system refactors.

```
src/
├── config/           # Game configuration
│   ├── LevelsConfig.ts    # 5 level definitions (enemies, themes, bosses)
│   ├── playerConfig.ts    # Base player stats and upgrade scaling
│   └── UpgradesConfig.ts  # Upgrade definitions and cost formulas
├── entities/         # Game objects
│   ├── enemies/           # Enemy types (Scout, Fighter, Bomber, Swarm, Gunship, Boss)
│   │   └── EnemyBase.ts       # Abstract base class for all enemies
│   ├── Asteroid.ts
│   ├── Bullet.ts
│   ├── EnemyBullet.ts
│   └── Player.ts
├── scenes/           # Phaser scenes
│   ├── BootScene.ts
│   ├── PreloadScene.ts
│   ├── MenuScene.ts           # Animated star field title screen
│   ├── GameScene.ts           # Main gameplay
│   ├── PlanetIntermissionScene.ts  # Upgrade shop
│   ├── GameOverScene.ts       # Death screen with level reached
│   └── VictoryScene.ts        # Victory screen after all levels
├── systems/          # Game systems
│   ├── AudioManager.ts       # Procedural Web Audio API sounds
│   ├── BulletPool.ts         # Object-pooled bullet management
│   ├── CollisionManager.ts   # All overlap/collision handlers
│   ├── EffectsManager.ts     # Particle effects, camera FX, color grading
│   ├── GameplayFlow.ts       # Shared gameplay event + transition contracts
│   ├── EnemyPool.ts          # Object-pooled enemy groups by type
│   ├── HUD.ts                # HP bar, score, progress, boss health
│   ├── InputManager.ts       # Keyboard + mouse input
│   ├── LevelManager.ts       # Level progression and boss gating
│   ├── ParallaxBackground.ts # Multi-layer star field + nebula
│   ├── PlayerState.ts        # Persistent state via Phaser registry
│   ├── ScoreManager.ts       # Score tracking
│   ├── WarpTransition.ts     # Star streak transition effect
│   └── WaveManager.ts        # Config-driven enemy spawning
├── utils/
│   └── constants.ts          # Game dimensions, speeds, pool sizes
└── main.ts           # Phaser game config and scene registration
```

### Design Decisions

- **All graphics are procedural** — Generated via `Phaser.Graphics.generateTexture()`. No external sprite or image assets needed.
- **Object pooling** — Bullets, enemies, and enemy bullets use `Phaser.Physics.Arcade.Group` with `maxSize` and `runChildUpdate`.
- **WebGL guards** — Camera post-FX (bloom, vignette, color matrix) and sprite pre-FX (glow) check for `camera.postFX` / `sprite.preFX` existence before use.
- **Procedural audio** — All sounds generated via Web Audio API `OscillatorNode` and `GainNode`. No audio files.
- **State persistence** — Player state stored in Phaser's `registry`, carried across scene transitions.
- **Config-driven** — Level definitions, enemy spawn weights, upgrade costs, and player stats are all in config files for easy tuning.

## Build

```bash
bun run build      # TypeScript check + Vite production build
bun run preview    # Preview production build locally
```

Output goes to `dist/`. Bundle is approximately 1.5 MB (350 KB gzipped), mostly Phaser.

## Deploy

This repo is configured for static Vercel deployments using GitHub Actions and Vercel prebuilt output.

### Local Vercel setup

1. Create or import the `ddv1982/space-explorer` project in Vercel.
2. Link the local repo to that Vercel project:

```bash
bunx vercel link
```

3. The link command creates `.vercel/project.json` locally. Copy the `orgId` and `projectId` values into GitHub repository secrets named `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`.
4. Create a Vercel access token and store it in the GitHub repository secret `VERCEL_TOKEN`.

### GitHub Actions deploys

- Pushes to `main` trigger a production deploy.
- Pull requests from branches in this repository trigger preview deploys.
- The workflow uses `vercel pull`, `vercel build`, and `vercel deploy --prebuilt`.

Workflow file: [`.github/workflows/vercel.yml`](.github/workflows/vercel.yml)

### Share the game publicly

After the first successful production deployment, Vercel will assign a production URL for the project. Share that URL directly, or add a custom domain in Vercel and share the domain instead.

To verify the production bundle locally before pushing:

```bash
bun run build
```

## License

MIT License. See [`LICENSE`](LICENSE).
