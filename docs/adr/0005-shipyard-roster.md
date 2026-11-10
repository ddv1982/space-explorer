# Shipyard roster

Date: 2026-11-09. Status: implemented in v1.23.0. Supersedes [ADR 0003](0003-cinematic-frontier-pilot.md).

## Decision

Every hull is a code-built three.js model rendered at build time by `scripts/shipyard` into a one-row WebP sprite sheet plus a normal map: the player (9 bank frames), helper wing, all eleven enemy families, one boss per attack style, the picket turret, the sower mine and four asteroid variants. `SHIPYARD_SPRITES` in `src/config/shipyardSprites.ts` is the single manifest: key, file, logical size, frame count and pose (`bank` rolls one model; `variant` builds a distinct model per frame).

The authored image-model hulls, the generated neon vector hulls (`shipTextures`, `bossTextures`, `worldTextures`, `neonStyle`), the `?art=neon` comparison mode and the cinematic export/evidence scripts were deleted. One art pipeline, one loader, one look.

## Contract

- Sheets are authored at `SPRITE_DENSITY` (4×) and trimmed to logical size on load, so display sizes and Arcade bodies are exactly those the encounters were tuned with.
- `queueShipyardAssets` / `finishShipyardLoading` load and validate every sheet in Preload and again at Game entry. A missing or malformed sheet shows the artwork retry screen; there is no silent fallback art.
- `LightingRig` turns on per-pixel lighting for any sprite whose texture carries a normal map, so explosions, engine lights and pulses shade every hull.
- `bun run art:shipyard` renders all sheets (`--only a,b` for a subset) and enforces a 1.2 MiB download budget; each run writes `assets/source/shipyard/_preview*.png` for review. `bun run art:shipyard --probe` re-checks the normal-map convention.
- Models are deterministic (seeded noise, no `Math.random`) so re-rendering is reproducible.

## Consequences

Adding a ship is: write a builder in `scripts/shipyard/models`, register it in `models/index.ts`, add a `SHIPYARD_SPRITES` row, render. Light (bolts, fire, beams, pickups) stays procedural Canvas 2D art; it is not modelled.
