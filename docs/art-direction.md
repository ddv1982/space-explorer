# Space Explorer art direction

The ship direction is Cinematic Frontier, with authored ceramic and titanium hulls and procedural combat signals. Gameplay environments are generated in Phaser. All ten campaign environments now use evolving procedural atmosphere with generated landmarks. Their palettes and gameplay contrast still follow the world identities below. See [ADR 0004](adr/0004-living-procedural-backgrounds.md) for the current background contract and [ADR 0003](adr/0003-cinematic-frontier-pilot.md) for the hull pilot's history.

The five cinematic hulls use retained 4× image pixels with logical frame dimensions at scale 1. This differs from procedural supersampling, which resolves drawings back to logical-size canvases. Keep player 36×44, scout 26×28, fighter 36×36, bomber 44×38, and Pyre Herald 88×56. Collision bodies stay unchanged. Pale armor, dark recesses, and small engine apertures carry the new material language; broad bloom must not obscure them.

The v2 contract remains the baseline for unmigrated assets. Cinematic Frontier changes presentation while preserving encounter grammar. The superseded `background-art-bible.md` remains historical reference.

## V2 remake contract

- **Readable pressure first.** The center 45–55% of the playfield stays darker and calmer than entities, bullets, hazards, and pickups so Lane-Reading and Ambush Anticipation stay intact. Scenery and HUD chrome never win contrast in that corridor.
- **Gameplay clocks stay frozen on pause.** Telegraph windows, beam phases, and choreographed waves still count accumulated gameplay delta. Presentation motion may tween on the scene clock; it must not schedule combat consequences from scene time.
- **Both orientations stay first-class.** There is no rotate block. Phone-portrait 390px remains a required layout. Decorative chrome must collapse before it clips a primary action.
- **Scoped hybrid art.** Authored cinematic hulls join the ten planet-arrival portraits. Gameplay backgrounds are procedural. Required hull image failures block entry with retry; they must not masquerade as a successful procedural fallback.
- **Quality tiers budget spectacle.** Low / standard / high stay the only player-facing quality axis. Remake FX budgets live on `VisualQualityProfile` as `uiGlowStrength`, `motifDensity`, `particleBurstScale`, `particleQuantityScale`, and `menuAtmosphere`. The living atmosphere uses the bounded target sizes below; particle budgets remain tiered. Main-menu quality changes persist and reload; pause quality changes persist and report that a restart is required; storage failures stay non-fatal and keep the prior tier.
- **Glow stays cheap.** Per-object Glow remains reserved for the player and telegraphs. Entity and pickup glow is baked into generated textures. Camera ColorMatrix stays subtle.

## Pillars

1. **Neon vector** — clean geometric silhouettes, hot cores, layered glow halos, crisp outlines. Geometry Wars readability with a modern space-opera palette.
2. **Bounded authored assets** — the cinematic hulls use compressed WebP images, retained source density, and explicit cache ownership. Procedural textures remain appropriate for readable combat signals and unmigrated content. The retired 25 MB painterly background pack stays retired.
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

All ten worlds use `LivingBackground`. Aurora has folded light curtains and an edge planet; the other worlds use distinct caustics, ember fronts, mechanical rings, crystals, wreckage, arches, an eclipse, hive membranes, or an orbital well. Stars and optional landmark images render separately from the bounded atmosphere texture. The center-lane mask uses viewport coordinates.

Low uses a static 320px atmosphere target, Standard uses 480px, and High/Auto use 640px. Reduced motion freezes the environment. Section lighting still responds to gameplay. See [ADR 0004](adr/0004-living-procedural-backgrounds.md) for ownership and recovery.

The previous plane compositor and supplemental scenery remain available through the development-only `background=legacy` comparison. They are not created for the living campaign.

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

- Procedural entities draw at 4× on every quality tier and resolve to logical-size textures. Authored cinematic hulls retain 4× source pixels with logical metadata. Low/Standard particles use 1× generation; High/Auto use 2×. Sprite display dimensions and Arcade Physics bodies never change with quality.
- Main and pause menus use the same settings surface: difficulty (low/normal/high), visual quality (low/standard/high), and creativity, energy, ambience, and music-volume sliders. Difficulty and music changes apply to the active runtime; difficulty changes forgiveness only and never encounter grammar. Main-menu quality changes persist and reload so generated assets share one profile. Pause-menu quality changes persist without discarding the run and clearly report that a restart is required. Storage failures remain non-fatal and leave the prior tier selected.
- Pause separates checkpoint actions and settings into explicit subviews. Reopening pause deterministically starts on checkpoints; switching subviews or resizing never changes the physics/audio pause contract. Both subviews retain reachable controls in desktop, phone portrait, and phone landscape compositions.
- Additive glow is expensive: cap simultaneous ADD-blend layers, keep halos inside texture canvases, prefer texture-baked glow over runtime filters for pooled objects.
- Camera glow filter stays subtle (existing baseline). Per-object glow filters are reserved for the player and telegraphs; bosses use non-physical pooled shape rigs for cores, hardpoints, aura, shield, and guard-break state.
- Generated textures are power-of-two where practical and reused via stable keys.
