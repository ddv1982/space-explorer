# Space Explorer art direction

Every hull in the game — player, helper wing, all eleven enemy families, the six bosses, picket turrets, mines and the four asteroid shapes — is a code-built 3D model rendered by the **shipyard** (`scripts/shipyard`, three.js at build time only) into WebP sprite sheets: an albedo pass with a baked upper-left key light plus a matching normal map. In game, `LightingRig` lights every normal-mapped sprite per pixel, so explosions, engines and pulses shade nearby hulls. See [ADR 0005](adr/0005-shipyard-roster.md) for the contract and [ADR 0004](adr/0004-living-procedural-backgrounds.md) for backgrounds.

Light itself — bolts, orbs, beams, fire, smoke, sparks, flares, glows — is painted procedurally with Canvas 2D gradients (`withCanvasTexture`), never modelled: it has to stay soft, additive and cheap. Canvas textures register as plain texture sources, never Phaser `CanvasTexture`s, whose `getImageData` readback stalls software renderers for seconds.

## Shipyard hulls

- **Logical sizes are gameplay contracts.** Sheets live in `SHIPYARD_SPRITES` (`src/config/shipyardSprites.ts`) at 4× density; frames are trimmed to the logical size the Arcade bodies were tuned with (player 36×44, scout 26×28, fighter 36×36, bomber 44×38, gunship 40×40, bosses 88×56, asteroids 44×44 …). Changing art never changes a hitbox.
- **Factions by material.** The player and helper wear pale ceramic over titanium with cyan / teal emissives. Hostiles are dark gunmetal with armour panels and glowing accents in their family colour (scout red, fighter orange, diver magenta, dodger cyan, gunship blue, sower violet, bomber amber, lancer steel, splitter orange, swarm yellow, swarmling pink). Bosses are capital ships in their attack style's colour.
- **Silhouette first.** Hulls display at 14–88 px, so readable outlines and plate value contrast beat micro-detail. Emissives use intensity ≥ 2.5 so bloom picks them out.
- **Asteroids** are neutral grey stone so level MULTIPLY tints recolour them; they spin, so their sheet bakes a softer key and relies on the normal map for direction.
- Regenerate with `bun run art:shipyard` (or `--only a,b`); each run writes `assets/source/shipyard/_preview.png` for review.

## V2 remake contract

- **Readable pressure first.** The center 45–55% of the playfield stays darker and calmer than entities, bullets, hazards, and pickups so Lane-Reading and Ambush Anticipation stay intact. Scenery and HUD chrome never win contrast in that corridor.
- **Big impacts hold for a beat.** Ace kills, hull hits, boss phase changes and boss defeats trigger a 40–100 ms freeze (`systems/HitStop.ts`). It pauses the Arcade world and skips gameplay frames exactly like the pause menu, so every combat clock stops together and nothing catches up afterwards; music, input, the HUD and presentation tweens keep running. It never takes physics from the pause menu or a transition. Do not implement it by slowing time: Arcade keeps a backlog, and entities advance on the raw scene delta. Every camera shake goes through `shakeCamera`, which honours the Screen shake setting.
- **Gameplay clocks stay frozen on pause.** Telegraph windows, beam phases, and choreographed waves still count accumulated gameplay delta. Presentation motion may tween on the scene clock; it must not schedule combat consequences from scene time.
- **Both orientations stay first-class.** There is no rotate block. Phone-portrait 390px remains a required layout. Decorative chrome must collapse before it clips a primary action.
- **Scoped hybrid art.** Shipyard hull sheets join the ten planet-arrival portraits. Gameplay backgrounds are procedural. Required hull sheet failures block entry with retry; they must not masquerade as a successful procedural fallback.
- **Quality tiers budget spectacle.** Auto / Low stay the only player-facing quality axis (stored Standard or High values read as Auto). Remake FX budgets live on `VisualQualityProfile` as `uiGlowStrength`, `particleBurstScale`, `particleQuantityScale`, and `menuAtmosphere`. The living atmosphere uses the bounded target sizes below; particle budgets remain tiered. Main-menu quality changes persist and reload; pause quality changes persist and report that a restart is required; storage failures stay non-fatal and keep the prior tier.
- **Glow stays cheap.** Per-object Glow remains reserved for the player and telegraphs. Bolts and pickups bake their glow into canvas-painted textures (larger than their bodies; entities pin the original hitbox); hull emissives glow through camera bloom. Camera ColorMatrix stays subtle.

## Pillars

1. **Lit hardware, neon light** — solid, normal-mapped 3D hulls; everything that is light (bolts, fire, beams, engines) is soft, additive and saturated.
2. **Bounded authored assets** — shipyard sheets are compressed WebP generated from code under a download budget, with retained source density and explicit cache ownership. The retired 25 MB painterly background pack stays retired.
3. **Readable pressure** — the center gameplay lane stays dark and calm. Bullets, enemies, hazards, and pickups win attention with saturated neon cores; scenery never crosses their luminance in the lane.

## Palette System

Global base (from `scenes/shared/neonUiTheme.ts`):

- Space base: `#020816` (NEON.navy), panel `#030a18`
- Player cyan: `#5bd8ff` (NEON.cyan), hot core `#bff6ff`
- Ally/blue tech: `#2f94ff` (NEON.blue), deep `#0a2d5c`
- Teal support: `#58f0d8`, purple special: `#8f6bff`
- Danger red: `#ff756f`, amber warning: `#ffc36e`
- Text/white-hot: `#f4fdff`

Per-level identity: each level keeps its `accentColor` from the level definition; its background world (palette, atmosphere, landmark) is authored in `livingBackgroundProfile.ts`.

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
| Enemy bullets / bombs | magenta-red `#ff4d8d` / amber; bullets are ringed orbs (white core, bright ring, dark bands) so they read apart from stars in grayscale too | hostile fire |
| Bosses | per-attack-style accent (existing palette, neon-ized) | set piece |
| Asteroids | cool grey-violet wireframe | neutral hazard |
| Power-ups | green health / blue shield / gold rapidfire, white halo | pickup |

## Shape Language

- **Player**: sleek twin-fork interceptor; nine rendered bank frames carry the roll, a small rotation adds yaw; a flickering twin engine flame stretches with forward thrust.
- **Enemies**: single-gesture silhouettes (dart, chevron, hex, twin-prong, tri-shard) readable at 14–44 px, built as plated 3D hulls.
- **Bosses**: wide multi-part capital ships, one silhouette per attack style; glowing reactor cores and engine banks.
- **Asteroids**: four lumpy, cratered stone shapes; each spawn picks one and spins it.

## Backgrounds

All ten worlds use `LivingBackground`. Aurora has folded light curtains and an edge planet; the other worlds use distinct caustics, ember fronts, mechanical rings, crystals, wreckage, arches, an eclipse, hive membranes, or an orbital well. A three-depth starfield (`livingStarfield.ts`: dense faint stars, haloed mid stars, sparse bright stars with diffraction spikes, in stellar colours, the mid layer tinted toward the world's star accent) scrolls at three speeds over the bounded atmosphere texture. Its layer textures are painted once and shared by every world, and a vignette darkens the corners under gameplay. The center-lane mask uses viewport coordinates.

Low uses a static 320px atmosphere target, Standard uses 480px, and High/Auto use 640px. Reduced motion freezes the environment. Section lighting still responds to gameplay. See [ADR 0004](adr/0004-living-procedural-backgrounds.md) for ownership and recovery.

## VFX

- Explosions (`EffectsManager.detonate`): white-hot lens flare and glow → billowing fireball cooling white → yellow → orange → red → expanding shockwave ring → sparks and drifting embers in the hull's accent → lingering smoke, plus debris for heavy hulls, and a dynamic light pulse. Styles per family live in `effects/explosionStyles.ts`; quantities scale with quality tier and runtime pressure.
- Bolts: player plasma lances (white core in a cyan sheath, additive), turret bolts amber, hostile orbs magenta with a dark rim for contrast. Muzzle flash: lens flare. Exhaust and trails: soft glow motes.
- Hit splash: flare plus sparks. Power-up burst: glow motes in pickup color.
- Warp transition: vertical speed-line streaks in cyan/white.

## UI

The interface is one family, defined in `scenes/shared/neonUiTheme.ts` and `actionButtonControl.ts`:

- **Shape.** Every panel, card and button is a rectangle with its top-left and bottom-right corners cut (`drawAngledRectPath`). `drawNeonFrame` paints the glass panel: a dark translucent body with a top sheen, a hairline outline, a bright accent rail along the top edge and a bracket on the cut bottom-right corner.
- **One primary action per surface.** `primary` buttons are solid cyan with dark ink text; `secondary` and `danger` are ghost glass. A screen has exactly one solid button (NEW RUN, RESUME, RETRY, CONTINUE); a selected segment in a selector is also solid.
- **Type.** Orbitron (`NEON_FONT.display`) for titles and card names; Rajdhani (`NEON_FONT.label`, via `neonLabelStyle`) for labels, buttons and body copy, uppercase and tracked, never below 12px on phones; Share Tech Mono (`NEON_FONT.mono`, via `neonReadoutStyle`) only for tabular numbers that change. All three are bundled woff2 files.
- **Titles.** `addNeonTitle` is a single text object: letters cool from white toward the accent at the baseline over a canvas shadow glow. The glow pads the text bounds, so layout tests measure order and centres, not edge gaps.
- **Colour roles.** Cyan is the player and the primary action, gold is score, credits and rewards, teal is success, red is danger. Glow strength scales with `uiGlowStrength` / `menuAtmosphere`.
- **Words.** Screens state facts, not instructions: no sentence explains a button that is already labelled.

Screens:

- **Main menu**: kicker, glowing title and tagline over the lit hero ship (an orbiting key light rolls highlights across its normal map) on a launch pad with scan rings; NEW RUN is the primary button, save slots are a row of glass cards, SETTINGS is a ghost button, and a planet horizon rises behind them while shooting stars cross the sky. Short landscape phones use two columns.
- **HUD**: two floating corner clusters and a flight-vector rail, no bar. Left: hull as one slanted cell per hull point (cyan → amber → red), surge bar, shield pips, reserve-ship icons. Right: score readout under a gold label, chain badge. The rail sits top-centre with the sector and level name on wide viewports and runs edge to edge above the clusters on phones. Meters redraw only when their value changes (`hud/meterRenderers.ts`).
- **Announcements**: title cards in the display face with a glow in the event colour and a fading rule.
- **Pause**: compact panel, CHECKPOINTS / SETTINGS tab strip, slot cards with ghost SAVE / LOAD and danger DEL, RESUME primary.
- **Game Over / Victory**: full-screen compositions (red vignette and embers; gold rays and halo) with stat cells and a score count-up, from `shared/runSummaryPresentation.ts`. Reduced motion shows final values immediately.
- **Planet intermission**: the authored raster portrait (exception below) over an atmosphere glow, with upgrade cards carrying an icon, effect line, level pips and a cost chip.

## Planet arrival portraits (approved raster exception)

Approved 2026-08 as a scoped exception to the procedural-only rule. The ten planet-intermission hero worlds are committed authored raster assets, replacing the retired runtime-generated vector disc:

- **Assets**: `public/assets/planets/planet-01.webp` … `planet-10.webp` — 1024×1024 RGBA WebP, transparent background. One painterly world per campaign level: teal aurora gas giant with thin ring, luminous ocean world, volcanic fracture world, industrial machine world, violet reef-ocean world, shattered fortress with debris, pale cathedral moon, eclipsed black planet, ochre hive world, singularity engine with accretion ring.
- **Look**: painterly/textural surface detail, realistic spherical lighting, soft terminators, limb shading, atmospheric glow, and world-specific features baked in — deliberately not SVG-like, contrasting the surrounding neon vector chrome which stays procedural.
- **Authoring**: rendered offline and deterministically by `scripts/generatePlanetPortraits.ts` (seeded value-noise surfaces; no runtime cost, no `Math.random`, no wall-clock input). Regenerate only with explicit art-direction sign-off; the committed WebPs are the source of truth at runtime.
- **Loading**: queued during the boot preload (`queueAllPlanetPortraits`) and re-queued by the intermission scene's own preload when the texture is not cached (direct/dev starts, restarts after release). The displayed texture is released from the cache on intermission shutdown, matching the previous generated-texture lifecycle.
- **Composition**: each portrait doubles the retired disc's source frame and planet radius while preserving its normalized composition, so halo, orbit tilt, satellites, route line, labels, animations, responsive layouts, and reduced-motion behavior are unchanged.

## Performance Rules

- Shipyard sheets and canvas-painted bolts and pickups retain 4× source pixels with logical frame trims. Sprite display dimensions and Arcade Physics bodies never change with quality.
- Main and pause menus use the same settings surface: difficulty (low/normal/high), visual quality (auto/low), and creativity, energy, ambience, and music-volume sliders. Difficulty and music changes apply to the active runtime; difficulty changes forgiveness only and never encounter grammar. Main-menu quality changes persist and reload so generated assets share one profile. Pause-menu quality changes persist without discarding the run and clearly report that a restart is required. Storage failures remain non-fatal and leave the prior tier selected.
- Pause separates checkpoint actions and settings into explicit subviews. Reopening pause deterministically starts on checkpoints; switching subviews or resizing never changes the physics/audio pause contract. Both subviews retain reachable controls in desktop, phone portrait, and phone landscape compositions.
- Additive glow is expensive: cap simultaneous ADD-blend layers, keep halos inside texture canvases, prefer texture-baked glow over runtime filters for pooled objects.
- Camera glow filter stays subtle (existing baseline). Per-object glow filters are reserved for the player and telegraphs; bosses use non-physical pooled shape rigs for cores, hardpoints, aura and shield state. The core swells and the hardpoints flash white for the last 400 ms before every volley (`boss/attackWindup.ts`).
- Generated textures are power-of-two where practical and reused via stable keys.
