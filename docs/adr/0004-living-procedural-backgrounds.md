# Living procedural backgrounds

Date: 2026-09-05. Status: implemented across all ten campaign levels. Physical-device qualification remains open.

The user preferred Phaser-generated environments after playing the cinematic pilot. All ten worlds use generated textures, a moving shader, and optional generated geometry. The approved Aurora composition remains unchanged. Cinematic ship images and planet-arrival portraits remain separate assets.

## Composition

`LivingBackground` owns a small atmosphere render target, its viewport-sized Image, a generated starfield, and optional landmark geometry. `ParallaxBackground` selects this owner before creating legacy planes or scenery. It forwards the existing smoothed atmosphere, drift, and landmark values. Gameplay clocks, collision geometry, and encounter configuration do not change.

Aurora combines evolving folded light curtains and an analytically shaded edge planet. Clockwork combines generated mechanical rings, shadow faces, inset panels, and warm haze. Eventide combines a dark well, an orbital belt, a photon ring, and broken structures. Landmarks and stars render separately from the soft atmosphere, preserving their edge resolution.

The campaign registry selects a world profile and one GLSL kernel. Tideglass adds blue caustic waves and an ocean planet; Ember adds turbulent fronts and a cinder planet; Shatter Reef adds fractured purple light and crystals; Debris adds shafts of light and wreckage; Hollow Choir adds pale columns, arches, and a moon; Eclipse adds a corona and dark body; Swarmfront adds pulsing cellular membranes and chambers.

The atmosphere samples a locally generated 65×65 scalar field. Its final row and column repeat the first, allowing continuous interpolation across the 64-cell period without relying on repeat wrapping for an NPOT texture. A development-only live evaluation path computes the same noise values for comparison. It is value noise with domain warping, not Phaser's built-in Simplex class.

The center-lane multiplier uses unwarped viewport coordinates. Planet and landmark placement also uses viewport coordinates, so the protected lane cannot move with a repeating texture. Generated stars and landmarks use independent seeded generators; the new renderer does not consume or reseed Phaser's global random stream.

## Cost and quality

The maximum atmosphere target long edge is 320 pixels on Low, 480 on Standard, and 640 on High and Auto. A viewport Image upscales the completed texture. This bounds expensive shader pixels rather than scaling a full-resolution Shader quad on screen.

Low freezes atmosphere evolution while retaining slow stars. Reduced motion freezes stars, landmark rotation, and atmosphere evolution. Section lighting still responds to the existing authored targets. Standard and High use bounded refresh intervals. Auto slows optional shader refresh under sustained pressure and freezes landmark rotation at the highest pressure level. Pressure changes do not allocate new targets or alter gameplay timing.

Each owner retains one 512² star texture, the small scalar field, one atmosphere target, and optionally one 512² landmark texture shared by at most two images. Raw pixel storage is at most about 3.58 MiB per owner before GPU overhead, camera buffers, and the rest of the game. Only the active quality allocation is created.

The authored Aurora backplate has been removed from the runtime loader, export list, and public assets. Its original concept/source remains in the historical graphics-study output. The five ship images still use the validated retained-resolution loader.

## Ownership and recovery

Shader program names are stable per world, so repeat visits reuse the ten campaign program suites. Every owner receives unique texture keys containing the scene and an instance counter. Destruction releases consumers, generated textures, shader target, and event listeners. This prevents an outgoing scene from destroying an incoming scene's background.

Phaser 4.2.1's Shader cleanup clears its render node without releasing that node's private vertex buffer and VAOs. `livingBackgroundShaderOwner.ts` is a narrowly scoped compatibility adapter that releases those resources through the Shader's destroy event. It does not destroy factory-cached shader programs or the shared index buffer. Re-audit this adapter when Phaser changes.

Static targets remain scheduled while their program suite is unready. A successful draw can then freeze the target. Resize updates the framebuffer and the consumer texture metadata together. WebGL restoration schedules a refill even when motion is disabled.

## Evidence and limits

The dedicated browser checks compare actual shader pixels, exercise all ten worlds in desktop and portrait layouts, resize, force context loss, test Low and Auto, vary section lighting, and cycle menu/game ownership while checking GPU wrapper counts. A repeated campaign tour checks all nine intermission handoffs and compares warmed background programs, background VAOs, and renderer buffers. Combat can warm unrelated renderer batching variants, so the background VAO count is checked by shader source rather than inferred from the global count. A synthetic delayed-program check holds compilation status pending for the background program to exercise static-target readiness independently of driver speed.

The cached/live comparison measured nearly identical costs in the available SwiftShader environment. The sampling path is retained for its bounded repeated work; no meaningful speedup or physical-device frame-rate claim follows from those timings. Real laptop and phone frame delivery, memory peaks, and thermal behavior remain qualification work.

Developer comparisons require a reload: `?background=legacy` selects the previous procedural presentation with cinematic ships; `?atmosphere=live` selects the live noise calculation. The legacy texture generator is retained only in development and is removed from the production bundle. These are not player-facing quality settings and are removed as executable URL checks from production builds.

Generated captures and measurements go to the ignored `output/campaign-backgrounds` folder. `bun run backgrounds:compare` reproduces the sampling comparison with the dev server on port 4173. `bun run backgrounds:record` records all ten worlds in desktop and portrait gameplay.
