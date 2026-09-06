# Cinematic ship sources

These five transparent PNGs are the editable sources for the shipped hulls. Their image-model provenance and prompts are in [PROMPTS.md](PROMPTS.md).

From the repository root, run `bun run art:export` with cwebp installed to regenerate `public/assets/cinematic/*.webp`. The manifest in `src/config/cinematicAssets.ts` defines logical dimensions and the retained 4× source density. Only the WebP exports are served by the game.
