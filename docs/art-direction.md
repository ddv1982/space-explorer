# Space Explorer Art Direction — Neon Vector

This document is the master visual bible for the neon vector redesign. It supersedes the painterly direction in `background-art-bible.md` (kept for history) and extends the scope to ships, projectiles, VFX, backgrounds, and UI. Everything is produced procedurally in code, with one approved exception: the ten authored planet-arrival portraits (see below).

The v2 presentation remake intensifies this language. It is not a new art style, not a campaign remake, and not a new encounter grammar. See [V2 remake contract](#v2-remake-contract).

## V2 remake contract

- **Readable pressure first.** The center 45–55% of the playfield stays darker and calmer than entities, bullets, hazards, and pickups so Lane-Reading and Ambush Anticipation stay intact. Scenery and HUD chrome never win contrast in that corridor.
- **Gameplay clocks stay frozen on pause.** Telegraph windows, beam phases, and choreographed waves still count accumulated gameplay delta. Presentation motion may tween on the scene clock; it must not schedule combat consequences from scene time.
- **Both orientations stay first-class.** There is no rotate block. Phone-portrait 390px remains a required layout. Decorative chrome must collapse before it clips a primary action.
- **Procedural only, one raster exception.** Generated Phaser textures remain the source of ships, projectiles, VFX, backgrounds, and UI chrome. The only approved rasters are the ten planet-arrival WebP portraits.
- **Quality tiers budget spectacle.** Low / standard / high stay the only player-facing quality axis. Remake FX budgets live on `VisualQualityProfile` as `uiGlowStrength`, `motifDensity`, `particleBurstScale`, and `menuAtmosphere`. Main-menu quality changes persist and reload; pause quality changes persist and report that a restart is required; storage failures stay non-fatal and keep the prior tier.
- **Glow stays cheap.** Per-object Glow remains reserved for the player and telegraphs. Entity and pickup glow is baked into generated textures. Camera ColorMatrix stays subtle.

## Pillars

1. **Neon vector** — clean geometric silhouettes, hot cores, layered glow halos, crisp outlines. Geometry Wars readability with a modern space-opera palette.
2. **Procedural only** — every texture is generated at runtime via Phaser Graphics (`withGeneratedTexture`). No raster downloads; the former 25 MB of painterly background PNGs is retired. **Approved exception (2026-08):** the ten planet-arrival portraits are committed authored WebP rasters, documented under [Planet arrival portraits](#planet-arrival-portraits-approved-raster-exception).
3. **Readable pressure** — the center gameplay lane stays dark and calm. Bullets, enemies, hazards, and pickups win attention with saturated neon cores; scenery never crosses their luminance in the lane.

## Palette System

Global base (from `scenes/shared/neonUiTheme.ts`):

- Space base: `#020816` (NEON.navy), panel `#030a18`
- Player cyan: `#5bd8ff` (NEON.cyan), hot core `#bff6ff`
- Ally/blue tech: `#2f94ff` (NEON.blue), deep `#0a2d5c`
- Teal support: `#58f0d8`, purple special: `#8f6bff`
- Danger red: `#ff756f`, amber warning: `#ffc36e`
- Text/white-hot: `#f4fdff`

Per-level identity: each level keeps its `accentColor` / `nebulaColor` from the level definition; the neon background generator derives the level's glow palette from those two values plus a per-level motif (arcs, crystals, grid, shards, rings).

### Entity color coding (gameplay readability, fixed regardless of level)

| Entity | Glow color | Meaning |
| --- | --- | --- |
| Player ship | cyan `#5bd8ff` | hero |
| Helper wing | teal `#58f0d8` | ally |
| Player bullets | cyan-white | friendly fire |
| Scout | red `#ff5d73` | fast flanker |
| Fighter | green `#52f28e` | balanced |
| Bomber | amber `#ffb14b` | heavy ordnance |
| Gunship | blue `#63a4ff` | ranged |
| Swarm | yellow `#ffff5d` | weak, numerous |
| Enemy bullets / bombs | magenta-red `#ff4d8d` / amber | hostile fire |
| Bosses | per-attack-style accent (existing palette, neon-ized) | set piece |
| Asteroids | cool grey-violet wireframe | neutral hazard |
| Power-ups | green health / blue shield / gold rapidfire, white halo | pickup |

## Shape Language

- **Player**: sleek forward dart; twin prongs; engine cores glow. Banking conveyed by rotation (code-driven, no extra frames).
- **Enemies**: single-gesture silhouettes (dart, chevron, hex, twin-prong, tri-shard) readable at 20–44 px.
- **Bosses**: wide multi-part hulls with concentric rings / arc motifs; pulsing core.
- **Glow recipe** (all entities): halo pass (shape scaled up, low alpha) → mid glow pass → near-black body fill tinted with hue → bright neon outline → white-hot core accents (cockpit, engine dots).
- **Asteroids**: faceted wireframe polygons, dim inner fill, neon edge strokes; rotating.

## Backgrounds

Per level, five procedurally generated authoring layers (vertically seamless) replace the old PNG backplate:

1. `far` — deep vertical gradient (navy → black), sparse dim stars. Opaque.
2. `nebula` — large soft radial glow blobs in the level's `nebulaColor`, weighted to edges.
3. `mid` — the level's neon motif: thin line work drawn by `LEVEL_MOTIFS` in `neonBackgroundGenerator.ts` (aurora ribbons, glass-tide swells, ember-storm streaks, clockwork gears, coral fans, wreckage plates, cathedral arches, eclipse coronas, hive honeycomb, singularity-engine swirl).
4. `near` — rare dark silhouette flecks near edges. Transparent.
5. `overlay` — tiny bright motes, additive blend, very sparse.

At generation time those five canvases are collapsed into three bounded runtime planes: `deep` (`far + nebula`), `motif` (`mid + near`), and additive `atmosphere` (`overlay`). Each plane retains independent vertical speed, alpha response, pulse, and subtle horizontal drift. The low quality tier omits the atmosphere plane; standard/high retain all three.

Rules: center 45–55% of the lane stays under ~20% luminance; scroll speeds increase deep → atmosphere; textures are generated per level window and released outside it (existing window logic). The procedural starfield/twinkle/debris/planet extras remain as enhancement layers.

## VFX

- Explosions: white-hot flash → expanding neon ring → line-burst sparks → shard debris (additive). Enemy classes apply their own palette and shockwave aspect (wide dodger, tall lancer/diver, heavy bomber, yellow swarm) without changing particle budgets.
- Muzzle flash: four-point star flare. Exhaust: soft glow orbs. Bullet trails: small glow dots.
- Hit splash: sharp cross flare. Power-up burst: halo ring + sparks in pickup color.
- Warp transition: vertical speed-line streaks in cyan/white.

## UI

- Existing neon UI theme (`neonUiTheme.ts`) is the standard: angled frames, dividers, layered glow titles. V2 command-deck chrome (menu, pause, game over, victory, intermission frame) shares that language and scales glow with `uiGlowStrength` / `menuAtmosphere`.
- Typography: bundled display font (Orbitron) with system fallback stack; mono for numeric readouts.
- Gameplay hierarchy: `HULL` and `RES` anchor the left status cluster, score/sector anchor the right, and the center `FLIGHT VECTOR` is a ten-segment continuous progress readout. The compact layout moves progress to the lower edge of the panel to avoid overlap at phone widths.
- Game Over / Victory / Planet Intermission adopt the same frame + glow language; intermission planet bodies are the authored raster portraits (exception below), framed by the existing neon halo, orbit, route, and satellite chrome.

## Planet arrival portraits (approved raster exception)

Approved 2026-08 as a scoped exception to the procedural-only rule. The ten planet-intermission hero worlds are committed authored raster assets, replacing the retired runtime-generated vector disc:

- **Assets**: `public/assets/planets/planet-01.webp` … `planet-10.webp` — 1024×1024 RGBA WebP, transparent background. One painterly world per campaign level: teal aurora gas giant with thin ring, luminous ocean world, volcanic fracture world, industrial machine world, violet reef-ocean world, shattered fortress with debris, pale cathedral moon, eclipsed black planet, ochre hive world, singularity engine with accretion ring.
- **Look**: painterly/textural surface detail, realistic spherical lighting, soft terminators, limb shading, atmospheric glow, and world-specific features baked in — deliberately not SVG-like, contrasting the surrounding neon vector chrome which stays procedural.
- **Authoring**: rendered offline and deterministically by `scripts/generatePlanetPortraits.ts` (seeded value-noise surfaces; no runtime cost, no `Math.random`, no wall-clock input). Regenerate only with explicit art-direction sign-off; the committed WebPs are the source of truth at runtime.
- **Loading**: queued during the boot preload (`queueAllPlanetPortraits`) and re-queued by the intermission scene's own preload when the texture is not cached (direct/dev starts, restarts after release). The displayed texture is released from the cache on intermission shutdown, matching the previous generated-texture lifecycle.
- **Composition**: each portrait doubles the retired disc's source frame and planet radius while preserving its normalized composition, so halo, orbit tilt, satellites, route line, labels, animations, responsive layouts, and reduced-motion behavior are unchanged.

## Performance Rules

- Entity, projectile, pickup, and particle textures are density-supersampled while retaining their authored logical frame metadata. Standard uses 2× entity/particle sources; high uses 3× entities and 2× particles; low remains 1×. This must never change sprite display dimensions or Arcade Physics bodies.
- Main and pause menus use the same settings surface: difficulty (low/normal/high), visual quality (low/standard/high), and creativity, energy, ambience, and music-volume sliders. Difficulty and music changes apply to the active runtime; difficulty changes forgiveness only and never encounter grammar. Main-menu quality changes persist and reload so generated assets share one profile. Pause-menu quality changes persist without discarding the run and clearly report that a restart is required. Storage failures remain non-fatal and leave the prior tier selected.
- Pause separates checkpoint actions and settings into explicit subviews. Reopening pause deterministically starts on checkpoints; switching subviews or resizing never changes the physics/audio pause contract. Both subviews retain reachable controls in desktop, phone portrait, and phone landscape compositions.
- Additive glow is expensive: cap simultaneous ADD-blend layers, keep halos inside texture canvases, prefer texture-baked glow over runtime filters for pooled objects.
- Camera glow filter stays subtle (existing baseline). Per-object glow filters are reserved for the player and telegraphs; bosses use non-physical pooled shape rigs for cores, hardpoints, aura, shield, and guard-break state.
- Generated textures are power-of-two where practical and reused via stable keys.
