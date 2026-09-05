# Cinematic hulls

Date: 2026-09-05. Status: implemented. The original raster background pilot was superseded by [the procedural campaign](0004-living-procedural-backgrounds.md).

The player, scout, fighter, bomber, and Pyre Herald use authored WebP hull images. Other ships and bosses retain their generated textures. The five hulls retain 4× source pixels with Phaser's logical frame metadata at scale 1. Display sizes, origins, Arcade bodies, and gameplay remain unchanged.

Preload queues missing hulls and validates their dimensions before entering the menu or gameplay. Missing or invalid images show a retry action. The Game scene repeats the cache-aware load boundary for direct entry and recovery. The five validated images stay in the game texture cache across transitions.

Editable PNGs and their image-model prompts live in `assets/source/cinematic`. Runtime WebP files live in `public/assets/cinematic`. Run `bun run art:export` with cwebp installed to regenerate them. The exporter enforces the 384 KiB download ceiling and the configured source dimensions. Backgrounds use no authored raster assets.

The development-only `?art=neon` comparison selects the previous generated hulls and background. `bun run art:evidence` captures matched static comparisons. `bun run backgrounds:record` records current campaign gameplay in both orientations. Generated evidence stays in ignored `output/` directories.

The initial pilot also loaded an authored Aurora plate and generated motes. Those assets and their residency policy were retired after the user preferred procedural backgrounds. Its local research boards and recordings are historical evidence, not release inputs.

Browser checks cover real combat, pooling, boss phases, respawn, loading retries, resize, and level handoff. Physical-device frame rate and thermal qualification remain separate from the browser checks.
