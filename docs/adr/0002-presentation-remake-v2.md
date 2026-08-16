# Presentation Remake V2

Space Explorer will remake its presentation as a next-version neon-vector spectacle: cinematic command-deck menus and richer combat chrome, without changing campaign grammar. We chose this over a style reboot because Lane-Reading depends on the existing neon-vector contrast language, and over authored raster ships/backplates because the procedural-only rule (planet-arrival portraits excepted) keeps download size and quality-tier generation coherent.

## Consequences

- `VisualQualityProfile` now budgets remake FX (`uiGlowStrength`, `motifDensity`, `particleBurstScale`, `particleQuantityScale`, `menuAtmosphere`) on the existing low/standard/high tiers. No new player-facing quality axis.
- Later remake work must keep the center 45–55% lane darker than entities, bullets, hazards, and pickups; telegraph windows and pause gameplay-delta clocks stay unchanged.
- Menu, pause, game-over, victory, and intermission share one command-deck chrome language. Intermission keeps the authored planet portraits and remakes only surrounding chrome.
- Per-object Glow stays reserved for the player and telegraphs. Entity glow is baked into generated textures. Arcade body sizes and authored sprite display dimensions stay identical after supersampled redraws.
