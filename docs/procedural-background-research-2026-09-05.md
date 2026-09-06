# Procedural backgrounds with cinematic depth

Research date: 2026-09-05. The user likes Phaser-generated environments and wants to retain their dynamic character while improving their appearance. This investigation changes the proposed background direction, not the running renderer. The five cinematic hulls remain compatible with a procedural environment.

Implementation follow-up: all ten campaign worlds now have a live procedural renderer. [ADR 0004](adr/0004-living-procedural-backgrounds.md) records the selected cached-field compositor, quality limits, and resource ownership. The descriptions of the former raster pilot below are research context.

## Recommendation

Make the environments procedural again, with a small animated atmosphere shader, generated solid landmarks, and layered motion. Keep the cinematic ships. Prototype Aurora Threshold first, then a mechanical environment and the final singularity to establish range before extending the approach across the campaign.

The largest missing ingredient is evolving structure. A cloud can change shape, a ring can reveal different illuminated faces as it turns, and a planet can have a moving terminator or cloud bands. These changes make the scene feel alive without filling the screen with extra particles.

## Current behavior

Only Aurora Threshold uses the authored image introduced by the pilot. The menu also reuses Aurora's backdrop. Levels 2–10 still generate their backgrounds in Phaser. Their textures are largely generated once and cached, then scrolled, drifted, pulsed, and combined with separate scenery. They are not continuously regenerating their cloud structure every frame.

The existing implementation already supplies much of the supporting system:

- [neonBackgroundGenerator.ts](../src/systems/parallax/neonBackgroundGenerator.ts) contains ten distinct motifs and builds the cached planes.
- [premiumBackgroundLayers.ts](../src/systems/parallax/premiumBackgroundLayers.ts) owns layer creation, layout, and motion.
- [backgroundMotion.ts](../src/systems/parallax/backgroundMotion.ts) animates planets, stars, and debris.
- [atmosphereProfile.ts](../src/systems/parallax/atmosphereProfile.ts) derives presentation targets from authored section tension, music intensity, and phase.
- [RuntimePerformanceBudget.ts](../src/systems/RuntimePerformanceBudget.ts) already adapts optional presentation under sustained pressure.

The proposed upgrade should replace parts of the existing planes rather than stack another complete background behind them.

## What Exa and Ref established

### Phaser already has useful procedural building blocks

Ref's current Phaser documentation lists `NoiseSimplex2D`, `NoiseSimplex3D`, and cellular noise variants. Simplex noise exposes flow, seed, detail, and warp controls. Cellular patterns suit cracked materials, hive structures, and refractive textures. I confirmed that these classes and their factories exist in the installed Phaser 4.2.1 source. The older dev log uses some different names; use the installed `NoiseCell2D` family rather than copying its earlier `NoiseCellular2D` spelling. [Current noise documentation](https://github.com/phaserjs/phaser/blob/master/skills/v4-new-features/SKILL.md), [Phaser's noise development article](https://phaser.io/news/2026/03/phaser-4-noise-cellular-noise-devlog).

The official shader guide documents a config-based Shader object and explicit uniform updates. Each Shader interrupts normal batching and uses its own draw call, so a handful of deliberately composed layers is preferable to one shader per cloud. Phaser 3 Shadertoy examples need adaptation because time and resolution uniforms are not automatically supplied in Phaser 4. [Phaser 4 shader guide](https://phaser.io/tutorials/phaser-4-shader-guide), [migration notes](https://github.com/phaserjs/phaser/blob/master/skills/v3-to-v4-migration/SKILL.md).

### Warped noise can make clouds curl instead of sliding as one sheet

Inigo Quilez describes distorting the coordinates of a noise pattern with another pattern. This produces curled, organic structures. The Book of Shaders explains combining noise at different scales to control broad shapes and fine detail. My application is a restrained, slowly evolving atmosphere with broad forms first and fine wisps concentrated near the edges. [Domain warping](https://iquilezles.org/articles/warp/), [fractal noise](https://thebookofshaders.com/13/).

Quilez also describes animating 2D clouds by moving their constituent noise layers at different velocities. This is a useful lower-cost comparison to a more complex live noise calculation. It can use textures generated in Phaser, so it does not require downloaded background paintings. His historical performance figures are not estimates for this game. [Dynamic 2D clouds](https://iquilezles.org/articles/dynclouds/).

### Soft atmosphere can render below gameplay resolution

NVIDIA's off-screen particle technique explains why soft fog and smoke can benefit from rendering into a smaller target, with a later compositing step. This supports testing a smaller atmosphere buffer while keeping ships, bullets, UI, and sharp landmarks at normal resolution. It does not imply that the historical speedups will transfer directly to Phaser. [GPU Gems on off-screen effects](https://developer.nvidia.com/gpugems/gpugems3/part-iv-image-effects/chapter-23-high-speed-screen-particles).

Installed Phaser 4.2.1 has `Shader.setRenderToTexture()` and `renderImmediate()`. Its source allocates the render target from the Shader's dimensions. A genuinely smaller shader target can therefore feed a viewport-sized Image. Merely making a Shader object larger with display scaling is not the same optimization: its fragment shader would still run over the larger screen area. For sporadic updates, Phaser recommends drawing through a DynamicTexture. [Installed Shader source](../node_modules/phaser/src/gameobjects/shader/Shader.js), [render texture documentation](https://github.com/phaserjs/phaser/blob/master/skills/render-textures/SKILL.md).

### Spectacle still needs a contrast hierarchy

Riot's VFX guidance ties visual prominence to gameplay importance. Here, atmosphere should feel rich through shape, depth, and motion, while hostile rounds and telegraphs retain the strongest local contrast. Game Accessibility Guidelines also recommends control over background movement. [Riot VFX guidance](https://nexus.leagueoflegends.com/en-us/2017/10/dev-leagues-vfx-style-guide/), [background movement guidance](https://gameaccessibilityguidelines.com/provide-an-option-to-turn-off-hide-background-movement/).

## Proposed visual construction

| Element | Proposed treatment | Update pattern |
| --- | --- | --- |
| Distant space | Seeded sparse stars and a broad color gradient | Generate once, slow drift |
| Living atmosphere | Simplex noise, limited warping, a controlled palette, and edge-weighted density | Small animated shader target |
| Planets | Generated sphere shading, a clear terminator, atmospheric rim, optional cloud bands | Cached surface with limited animated shading |
| Structures | Solid polygon plates, arcs, bevels, and shadows instead of outline-only motifs | Generate reusable parts, animate transforms |
| Near dust | Sparse particles with a different drift speed | Existing pooled effects and quality limits |
| Section changes | Gradual changes in flow, lighting, and density tied to authored section state | Existing atmosphere targets with smoothing |

Planets do not require a real-time 3D world. A projected sphere normal can provide directional shading on a 2D disc. Generated plates can suggest thick mechanical structures through a few broad faces and shadows. These are proposed techniques to prototype, not features already implemented.

Use a dedicated visual seed per level and object. Do not reseed Phaser's global random generator or consume gameplay randomness to animate scenery. Stable visual seeds let us compare the same scene and preserve its identity when quality changes.

Apply the calm-center constraint in viewport coordinates after atmosphere composition. A dark region baked only into a repeating texture can move away from the actual flight lane as that texture scrolls or repeats. Crisp landmarks also need placement rules that keep scenery distinct from collidable hazards.

## Three moving prototypes

| Prototype | What it should feel like | What it proves |
| --- | --- | --- |
| Living Aurora, Level 1 | Long teal curtains that fold and curl, a shaded planet at the edge, slow distant stars and faster foreground dust | Organic motion and depth without an authored backplate |
| Clockwork Causeway, Level 4 | Vast rotating machine arcs with solid dark faces, warm seams, occasional glints, and small drifting debris | Generated geometry can match the ships' material richness |
| Eventide Engine, Level 10 | Broken rings around a dark gravitational well, restrained orbital dust, and slowly bending light | A distinct finale without washing out the combat field |

The first prototype should compare two atmosphere implementations using the same seed, palette, and composition: a generated noise texture animated through inexpensive sampling, and Phaser's live simplex noise. Choose from actual image quality and frame cost before adding more shader passes.

Do not use static image-model concepts to decide whether this motion feels right. The next useful deliverable is short recordings from Phaser with real ships and bullets over the backgrounds.

## Campaign range

Aurora uses flowing curtains. Tideglass uses slow interference and refraction patterns. Ember Monsoon uses sparse drifting embers and broad turbulent bands. Clockwork uses rotating mechanical forms. Shatter Reef uses fractured mineral growth. Debris Gauntlet uses layered wreckage with occasional light glints. Hollow Choir uses pale architectural silhouettes and drifting dust. Eclipse Narrows uses a moving corona around dark mass. Swarmfront uses controlled cellular hive patterns. Eventide uses orbital distortion and broken rings.

Each level needs a different dominant form and movement rhythm. A recolored version of the same noise field would not provide enough variety.

## Initial engineering constraints

Start with one expensive atmosphere shader. Evaluate quarter-width/quarter-height and half-width/half-height targets for soft clouds; those use one-sixteenth and one-quarter of the full pixel count respectively, before compositing overhead. These are experiment settings, not proven device presets. Keep crisp stars and structures outside the low-resolution atmosphere target.

Start with few noise octaves and limited warp detail. Some Phaser noise settings change shader configuration, so do not animate iteration counts or continually recreate shaders. Animate flow, offset, and existing uniforms. Reallocate render targets only at deliberate resize or quality transitions.

Preserve existing quality meanings. Low can retain a generated atmosphere snapshot with gentle parallax; Standard and High can animate progressively more detail. Auto should reduce optional cost using the current sustained-pressure logic. Reduced motion can stop cloud evolution and landmark rotation while retaining readable scenery. None of these controls may change gameplay clocks or telegraphs.

Prototype acceptance requires the same scene in desktop, portrait, and landscape, with active projectiles, a hazard, and reduced effects. Check seams over long scrolling intervals, shader compilation on entry, texture cleanup, context restoration, and foreground contrast. Measure in isolation. SwiftShader evidence is useful for comparisons, but physical devices must settle frame delivery, memory, and thermal limits.

The next implementation step is the Living Aurora comparison. The current raster pilot remains available as a reference until the generated version has been reviewed.
