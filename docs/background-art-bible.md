# Space Explorer Background Art Bible

This bible defines the premium generated-background direction for the 10-level campaign. It is intentionally implementation-facing: every concept is layered, vertically loop-friendly, browser-performance aware, and designed to replace the existing procedural backgrounds rather than stack on top of them.

## Global Visual Direction

**Style:** modern retro arcade space opera — deep-space silhouettes, painterly cosmic forms, neon accents, subtle CRT/pixel softness, readable darkness through the center lane, and high-contrast edge detail.

**Readability rule:** the middle 45-55% of the playfield should stay darker, lower contrast, and less detailed than the outer edges. Bullets, enemies, hazards, player ship, and pickups must be readable at a glance.

**No-stacking rule:** when generated/premium background layers are present for a level, disable the old procedural star/nebula/planet/silhouette layers for that level. Procedural elements may be used only as lightweight enhancement overlays explicitly listed below, never as a second full background.

## Master Image Prompt Template

Use this as the base for every generated layer:

```text
Vertical scrolling 2D game background layer for a retro-modern arcade space shooter, {LEVEL_NAME}, {LAYER_ROLE}. Modern retro arcade space opera style, stylized painterly cosmic forms, subtle pixel/CRT softness, deep black-blue space values, neon accents, high contrast silhouettes, loop-friendly vertical composition, details weighted toward edges and corners, center gameplay corridor intentionally darker and calmer, no UI, no text, no characters, no bullets, no foreground player/enemy ships, no poster composition, no photorealistic NASA realism, no overexposed whites, transparent PNG if this layer contains isolated foreground or overlay elements. Size target {SIZE}. Palette: {PALETTE}. Mood: {MOOD}. Specific subject: {SUBJECT}.
```

**Shared negative prompt:** text, logo, UI, HUD, characters, bullets, lasers, pickups, player ship, enemy ship, large readable spaceship unless distant silhouette, photorealistic NASA photo, overexposed stars, busy center, dense detail behind gameplay, white star clusters in center lane, poster framing, hard seams, non-looping top/bottom composition, excessive noise, excessive bloom, low-resolution artifacts.

## Asset Specifications and Naming

- Main vertical layers: `1024x2048` baseline; `1536x3072` for premium desktop if memory budget allows.
- Prefer power-of-two dimensions for repeated/tiled textures where possible.
- Use transparent PNG/WebP for mid/near/overlay layers with isolated forms.
- Use compressed delivery variants when supported: WebP/AVIF for browser download, PNG source retained for art pipeline, KTX/PVR only after device testing.
- Atlas small reusable particles/overlays by campaign family; keep full-screen layer textures separate to avoid very large atlases.
- Naming convention:
  - `bg_level01_far.png`
  - `bg_level01_nebula.png`
  - `bg_level01_mid.png`
  - `bg_level01_near.png`
  - `bg_level01_overlay.png`

## Phaser 4 Integration Plan

1. Add a per-level background manifest that lists layer keys, URLs, dimensions, alpha, blend mode, scroll speed, and whether a layer is transparent.
2. During level preload, lazy-load only the active level and next level background layer set.
3. When manifest assets are available, create only asset-backed parallax layers; do not create the old procedural starfield/scenic/planet/silhouette layers.
4. Keep code-driven overlays cheap: a few low-alpha particles, tint pulses, tilePosition offsets, scale/rotation tweens, and occasional line/arc graphics.
5. Destroy or unload previous-level background textures after transitions when safe.
6. Consider Phaser 4 `SpriteGPULayer` for many small static/animated quads such as stars, dust, glass glints, or debris; avoid changing its member data frequently.

## Performance Recommendations

- Limit simultaneous full-screen layers to 3-4; optional overlay should be sparse/transparent.
- Avoid multiple full-screen additive layers; reserve additive blend for small glows/arcs.
- Keep center dark to reduce visual clutter and lower perceived overdraw brightness.
- Use lazy loading and texture cleanup to avoid keeping all 10 levels in memory.
- Prefer code motion over animated sprite sheets for nebula drift, ring rotation, lightning flicker, and tint pulses.
- Pack small particles/glints into one atlas; keep large background panels as independent textures.
- Test mobile memory with 1024x2048 first; gate 1536x3072 behind quality settings.

## Level Bible

### Level 1 — Solar Slipstream

- **Mood:** heroic, clean, energetic onboarding.
- **Palette:** near-black navy `#050914`, solar gold `#ffb84a`, amber `#ff7a1a`, cyan accent `#59d7ff`.
- **Concept:** a distant sun and flowing solar plasma lanes frame a dark central runway.
- **Layers:**
  1. `bg_level01_far.png` — sparse navy starfield with gentle vertical star trails.
  2. `bg_level01_nebula.png` — distant sun glow and broad golden plasma streams at upper corners/edges.
  3. `bg_level01_mid.png` — soft solar wind ribbons, diagonal but not crossing center heavily.
  4. `bg_level01_near.png` — rare dark debris silhouettes near edges.
  5. `bg_level01_overlay.png` — transparent tiny amber/cyan motes.
- **Prompts:**
  - Far: use template with subject “sparse deep navy starfield, faint vertical motion trails, no bright stars in center corridor”.
  - Nebula: “distant sun partially off-canvas near top edge, golden solar plasma arcs along left and right edges, dark center runway”.
  - Mid: “clean solar wind ribbons, amber-gold flowing streams, diagonal energy sweep around edges, calm central lane”.
  - Near: “very sparse black asteroid flecks and small silhouettes at outer margins, transparent background”.
  - Overlay: “tiny soft amber ion particles and cyan sparks, sparse, transparent PNG, no dense clusters”.
- **Negative prompt:** shared negative plus no huge sun in center, no white glare, no dense yellow fog.
- **Readability:** keep brightness strongest top-left/top-right; center value under ~20% luminance.
- **Performance:** far+nebula can be opaque; mid/near/overlay transparent with low alpha. Reuse overlay particles in Level 3/5 with recolor.
- **Animation ideas:** scroll far at 0.10x, plasma at 0.22x, mid ribbons at 0.35x; pulse amber tint during hazard sections.

### Level 2 — Prism Reef

- **Mood:** beautiful, dangerous, ambush-ready.
- **Palette:** deep violet `#130821`, cyan `#50f0ff`, magenta `#b45cff`, glass blue `#8ff8ff`.
- **Concept:** translucent crystal reef structures along edges inside violet-cyan nebula mist.
- **Layers:** far sparse violet stars; nebula mist; mid crystal formations; near refraction shards; overlay prismatic glints.
- **Prompts:**
  - Far: “dark violet starfield, low star count, faint cyan dust, clean center”.
  - Nebula: “soft violet and cyan nebula mist, watercolor gradients, edge-weighted, center subdued”.
  - Mid: “translucent crystalline reef towers on left and right edges, cyan-magenta refraction, transparent PNG”.
  - Near: “few angular crystal shard silhouettes in corners, dark outlines, transparent PNG”.
  - Overlay: “small prismatic glints and refracted dust specks, sparse, transparent”.
- **Negative prompt:** no rainbow clutter, no bright crystal wall in center, no kaleidoscope pattern.
- **Readability:** enemy bullets should never cross same-value cyan clusters; keep crystal highlights mostly off-lane.
- **Performance:** bake crystals into one mid layer; animate only alpha/position.
- **Animation ideas:** slow sine drift of mist, rare glint alpha tweens, tiny parallax shard offsets.

### Level 3 — Magnetar Foundry

- **Mood:** heavy, electric, unstable.
- **Palette:** black-blue `#030711`, forge orange `#ff6a21`, electric blue `#2ea7ff`, dirty metal `#343846`.
- **Concept:** distant neutron star and industrial cosmic fragments caught in magnetic bands.
- **Layers:** far dark starfield; nebula/electromagnetic bands; mid metal fragments; near black forge silhouettes; overlay magnetic arcs.
- **Prompts:**
  - Far: “near-black starfield distorted by faint magnetar lensing, sparse stars”.
  - Nebula: “distant neutron star off-center high edge, orange and blue magnetic energy bands framing dark center”.
  - Mid: “dark industrial metal fragments and broken forge plates along edges, transparent PNG”.
  - Near: “large near-black mechanical silhouettes in lower corners only, transparent”.
  - Overlay: “thin electric blue magnetic arcs, segmented lightning curves, sparse, transparent”.
- **Negative prompt:** no full-screen lightning web, no bright center star, no readable machinery text.
- **Readability:** use orange/blue bands as edge framing, not behind enemy bullet lanes.
- **Performance:** lightning should be code-drawn line graphics or tiny overlay, not animated sheets.
- **Animation ideas:** flicker overlay alpha, jitter arcs by swapping 2-3 generated line positions, tint pulse during gravity hazards.

### Level 4 — Fracture Convoy

- **Mood:** militarized, tense, directional.
- **Palette:** gunmetal `#151a24`, warning red `#ff3b30`, sodium amber `#ffb000`, hyperspace blue `#5aa8ff`.
- **Concept:** broken convoy lane with wreck silhouettes and fractured hyperspace rails guiding choke points.
- **Layers:** far dark lane stars; nebula fractured blue lanes; mid wrecked cargo silhouettes; near debris corridor; overlay warning lights.
- **Prompts:**
  - Far: “dark gunmetal space, sparse stars stretched vertically into convoy direction”.
  - Nebula: “fractured hyperspace lanes as dim blue angular rails along sides, dark middle corridor”.
  - Mid: “distant wrecked cargo ship silhouettes along edges, broken hull pieces, no readable ships in center”.
  - Near: “small debris corridor pieces near left and right margins, transparent PNG”.
  - Overlay: “tiny red and amber warning beacons, very sparse, transparent”.
- **Negative prompt:** no active spaceships, no cockpit/UI, no readable labels, no bright red center.
- **Readability:** directional lanes should support dodge flow; avoid red lights behind red enemy bullets.
- **Performance:** merge static wreck silhouettes; animate beacon alpha only.
- **Animation ideas:** slow vertical drift, warning-light blink tweens, occasional hyperspace crack flicker.

### Level 5 — Cinder Vault

- **Mood:** hot, oppressive, dangerous.
- **Palette:** char black `#050303`, ember red `#8f1d14`, molten orange `#ff5a1f`, dull gold `#b86b25`.
- **Concept:** volcanic space vault with molten asteroid edges and ancient dark architecture.
- **Layers:** far smoky dark starfield; red nebula/vault glow; mid molten asteroid fragments; near vault silhouettes; overlay ember field.
- **Prompts:**
  - Far: “nearly black smoky starfield with dim red dust, sparse”.
  - Nebula: “dark red nebula glow like heat behind ancient vault, low brightness center”.
  - Mid: “molten asteroid fragments around edges, orange cracks, transparent PNG”.
  - Near: “ancient vault arch silhouettes in corners and side margins, almost black, transparent”.
  - Overlay: “small ember particles, sparse, transparent, no dense fire”.
- **Negative prompt:** no full fire background, no lava river through center, no bright yellow-white heat.
- **Readability:** central corridor should be black-red, not orange; ember particles must not resemble pickups.
- **Performance:** use one small ember texture with emitter cap; avoid many additive particles.
- **Animation ideas:** slow ember drift downward, low-frequency red tint breathing, molten crack shimmer by alpha pulse.

### Level 6 — Graveyard Lattice

- **Mood:** haunted, quiet, dangerous.
- **Palette:** cold navy `#07101b`, blue-gray `#5f7188`, ghost cyan `#8ce8ff`, emergency red `#d43a3a`.
- **Concept:** derelict ship graveyard with skeletal station lattice framing silent lanes.
- **Layers:** far cold starfield; blue-gray haze; mid derelict/lattice structures; near skeletal silhouettes; overlay emergency pin-lights.
- **Prompts:**
  - Far: “cold sparse stars, blue-gray dust, quiet dead-space mood”.
  - Nebula: “thin blue-gray fog bands, subdued and low contrast, center clean”.
  - Mid: “derelict ship hull ribs and station lattice on edges, distant silhouettes, transparent PNG”.
  - Near: “large black skeletal station beams in corners only, transparent”.
  - Overlay: “tiny dim emergency red/cyan lights, sparse, transparent”.
- **Negative prompt:** no busy junkyard center, no bright ship windows, no active ships.
- **Readability:** silhouettes can frame but not narrow gameplay unless designed as actual hazards.
- **Performance:** use mid layer as static PNG; emergency lights via low-count sprites.
- **Animation ideas:** very slow parallax, occasional light blink, subtle fog drift.

### Level 7 — Mirage Archive

- **Mood:** dreamlike, mysterious, unreliable.
- **Palette:** deep indigo `#09071c`, muted teal `#5bd6c8`, pale lavender `#b8a7ff`, archive gold `#c9a957`.
- **Concept:** soft cosmic fog with ghostly holographic archive fragments and faded celestial maps.
- **Layers:** far soft starfield; fog/nebula wash; mid holographic map fragments; near ghost grid pieces; overlay scanline shimmer.
- **Prompts:**
  - Far: “soft indigo starfield, blurred distant stars, calm dark center”.
  - Nebula: “dreamy teal-lavender cosmic fog, low contrast, painterly, edge weighted”.
  - Mid: “faded holographic archive shards, celestial map fragments, abstract, no readable text, transparent”.
  - Near: “ghostly grid arcs and broken data panels at corners, transparent, no UI”.
  - Overlay: “subtle scanline shimmer and tiny gold motes, transparent, sparse”.
- **Negative prompt:** no readable symbols/text, no UI panels, no bright fog center.
- **Readability:** keep holograms very low alpha; avoid confusing them with pickup icons.
- **Performance:** use shader-like tint/alpha pulses instead of animated hologram sheets.
- **Animation ideas:** slow horizontal fog drift, archive fragments fade in/out, scanline overlay scroll at low alpha.

### Level 8 — Halo Cartography

- **Mood:** precise, fast, cosmic-navigation fantasy.
- **Palette:** midnight blue `#050b18`, ring gold `#d9b45a`, orbital cyan `#62d8ff`, pale green `#9df0c4`.
- **Concept:** giant planetary rings and elegant orbital path overlays establish high-speed navigation.
- **Layers:** far starfield; giant ring/planet geometry; mid orbital paths; near cartographic silhouettes; overlay rotating ring lines.
- **Prompts:**
  - Far: “clean midnight starfield with sparse navigation-like star clusters, dark center”.
  - Nebula: “massive planetary ring arc sweeping behind edges, elegant gold/cyan glow, not centered bright”.
  - Mid: “thin orbital path curves and circular geometry around edges, transparent, abstract cartography”.
  - Near: “small dark satellite/marker silhouettes at corners, transparent, no active ships”.
  - Overlay: “thin rotating cartographic ring accents, cyan/gold, transparent, sparse”.
- **Negative prompt:** no UI map, no text labels, no dense circular lines in center.
- **Readability:** rings can imply motion but should not cross bullet-heavy center at high contrast.
- **Performance:** ring overlays can be vector graphics or one reusable texture rotated slowly.
- **Animation ideas:** rotate ring overlay by <2 deg/sec, parallax star drift, tiny orbital dots moving on precomputed paths.

### Level 9 — Glass Rift Narrows

- **Mood:** narrow, tense, high-skill.
- **Palette:** abyss black `#03050a`, glass cyan `#83f7ff`, pale violet `#9b78ff`, dark teal `#08323a`.
- **Concept:** glass-like asteroid canyon walls hug edges while a dark flight path remains centered.
- **Layers:** far minimal abyss; faint rift glow; mid glass canyon walls; near sharp edge silhouettes; overlay crack glints.
- **Prompts:**
  - Far: “almost black abyss starfield, extremely sparse, dark central vertical path”.
  - Nebula: “faint cyan-violet rift glow along far edges, center nearly black”.
  - Mid: “sharp glass asteroid canyon walls on left and right edges, refracted cracks, transparent center”.
  - Near: “near black jagged glass silhouettes at extreme margins, transparent PNG”.
  - Overlay: “tiny cyan crack glints and refracted dust, sparse, transparent”.
- **Negative prompt:** no glass walls covering center, no bright shards behind bullets, no chaotic shards.
- **Readability:** reserve high-contrast crack lines for extreme edges; center should be the cleanest level center.
- **Performance:** canyon walls are static layers; only glints pulse.
- **Animation ideas:** slight opposite-direction parallax between left/right walls, crack glint pulses, subtle rift shimmer.

### Level 10 — Eventide Singularity

- **Mood:** epic, apocalyptic, beautiful final boss energy.
- **Palette:** singular black `#000006`, event violet `#6e2cff`, red magenta `#ff315e`, gravitational blue `#2f8cff`.
- **Concept:** a distant black hole and warped starfield with broken cosmic architecture at the edges.
- **Layers:** far warped starfield; singularity/lensing nebula; mid broken architecture; near apocalyptic silhouettes; overlay lensing arcs.
- **Prompts:**
  - Far: “warped dark starfield bending toward distant singularity, sparse bright points, clean center”.
  - Nebula: “black hole event horizon off upper center but not bright in gameplay lane, red-violet-blue gravitational lensing, painterly”.
  - Mid: “broken cosmic architecture fragments around edges, ancient sci-fi arcs, transparent PNG”.
  - Near: “large dark fractured silhouettes in lower corners and side edges, transparent”.
  - Overlay: “thin lensing arcs and faint distorted particles, red-violet-blue, transparent, sparse”.
- **Negative prompt:** no blinding accretion disk in center, no poster black hole filling screen, no UI symbols.
- **Readability:** final level can be dramatic but center contrast must remain below projectile contrast.
- **Performance:** keep singularity mostly one baked layer; animate lensing through rotation/scale/tint, not video.
- **Animation ideas:** slow rotation of overlay arcs, starfield radial drift illusion, boss-phase tint pulses.

## Procedural Enhancement Effects Catalog

- **Slow parallax stars:** a single `TileSprite` or `SpriteGPULayer` star texture per quality tier; sparse and low alpha.
- **Nebula drift:** move `tilePositionY` and `tilePositionX` by fractions of gameplay scroll speed.
- **Tint pulses:** tween layer tint/alpha on hazards or boss phases; avoid pure white.
- **Low-cost particles:** cap emitters to small counts, use pooled sprites, edge-biased spawn zones.
- **Additive glow layers:** only for small arcs/glints, never large full-screen white glows.
- **Lightning arcs:** draw a few `Graphics` polylines and fade them; do not use full-screen animated images.
- **Rotating ring overlays:** one transparent ring texture or vector arc rotating slowly behind gameplay with low alpha.

## Generation Checklist

For each generated asset, verify:

- Top and bottom edges loop or are soft enough for vertical scrolling.
- Center 45-55% remains calm and darker than edges.
- No text/UI/characters/bullets/player/enemy objects.
- No overexposed white clusters behind likely bullet lanes.
- Transparent layers contain only the intended mid/near/overlay elements.
- Compression test passes without banding that looks like gameplay objects.
- In-game screenshot remains readable with bullets, pickups, hazards, and enemy silhouettes active.
