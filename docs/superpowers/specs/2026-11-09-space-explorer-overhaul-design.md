# Space Explorer v2 overhaul: design

Date: 2026-11-09. Status: draft for approval.

## Intent

The user wants a big overhaul. In its current state the game reads as small ships in mostly empty dark space, and the controls stop dead. The user no longer enjoys that. The overhaul covers graphics, ships, textures, level design, controls and sound, and gameplay is open for redesign. The earlier rule that "encounter grammar is frozen" (CONTEXT.md, ADR 0002) is **revoked** for this work. So is the rule that textures stay flat 2D procedural drawings (ADR 0003/0004 framing).

Success means the game feels like flying a ship through a real place. Ships look solid and lit, the world below you is full of things to see and shoot, explosions are big and bright, and each level is a memorable journey with a shape. It should feel like a different, much better game, not a reskin.

## Goals

1. **Cinematic 3D-rendered look**, in the spirit of Sky Force Reloaded or Danmaku Unlimited (genre reference only; copy nothing). Ships look like lit, shaded models with metal panels and glowing engines. Big bright explosions. Instead of empty space you fly over scrolling environments: stations, planet surfaces, asteroid fields, megastructures.
2. **Ships and environment pieces are 3D models built in code** (the user chose this over AI art and asset packs). They are rendered to sprite sheets with matching normal maps, so they react to in-game light.
3. **Controls with real momentum.** A slight wind-up when starting, a short glide when releasing, and visible banking. It must still be precise enough to thread bullets.
4. **New level design:**
   - **Two layers.** Ground targets in the scrolling terrain (turrets, shield generators, chain-exploding fuel tanks, hangar doors that launch enemies unless destroyed first). Air enemies fly in formations above.
   - **Terrain is mostly scenery below you.** A few signposted set pieces narrow the path: walls, closing blast doors, canyon squeezes.
   - **Every level has a shape:** launch → rising section → mid-level set piece (a capital ship flying past, a collapsing station, an asteroid storm) → short breather → a boss that is part of the level (for example, flying along a battleship's hull and taking out turrets section by section before reaching the core).
5. **A 10-level campaign arc:**
   1. Home shipyard departure
   2. Ice-moon canyons
   3. Asteroid mining belt
   4. Gas-giant lightning storm
   5. Graveyard of derelict warships
   6. Enemy refinery world
   7. Jungle moon under siege
   8. Gravity-well station
   9. Enemy armada fleet
   10. Capital world core
6. **Replay hooks.** Per-level medals for destroying all ground targets, finishing without a hit, and finding a hidden bonus target. Score chains reward aggressive play.
7. **Weapons.** A main gun that levels up through pickups, plus one secondary slot (homing missiles, ground-burst bomb, laser). Between-level upgrades feed into these.
8. **Sound stays code-synthesized but gets richer.** The user likes the current sound design. Build on the existing procedural music and SFX engine; don't replace it.

## Non-goals

- No AI-generated art or audio, no paid external services, no bought or CC0 art packs.
- No real-time 3D engine at runtime. The game stays Phaser 4 in 2D.
- No change of platform: still a browser game, deployed the same way (Vercel, space-explorer.net).
- No multiplayer, online leaderboards or monetisation.

## Anti-goals (things that would make this a failure even if it technically works)

- **It feels like a reskin.** New sprites on the same empty screen and the same waves.
- **The busier screen hurts readability.** Enemy bullets must stay the most readable thing on screen. Terrain and ground detail must never camouflage bullets or hide safe paths.
- **Floaty, imprecise controls.** Momentum is wanted; sluggishness is not.
- **It runs badly on phones.** Portrait and landscape phones must stay smooth and playable.
- **The look is inconsistent**, with some assets lit and 3D and others flat.

## Constraints

- **Stack:** Phaser 4.2.1, TypeScript 7, Vite, Bun. Keep the existing quality gates: typecheck, lint, format, unit tests, `levels:validate`, knip, `architecture:check`, build, `bundle:check`, Playwright suites. Tests that pin the *old* encounter grammar or old levels may be retired with the content they cover. Tests that protect infrastructure (pause freezing gameplay clocks, scene ownership and cleanup, save slots, input, audio lifecycle) stay.
- **Kept behaviour:**
  - Both orientations on touch devices, with no rotate block.
  - Pause freezes gameplay clocks (pattern from `WaveChoreographer` and `HazardBeam`).
  - Three visual quality tiers plus Auto.
  - Reduced-motion support.
  - The difficulty setting changes forgiveness, not layouts.
  - Upgrades between levels.
  - Planet intermission between levels. It is restyled, and its planet portraits are replaced with code-rendered planets.
- **Bundle:** the current `bundle:check` limits stay unless a phase justifies raising them: app JS 475 KB, total JS 1.9 MB, 3.5 MB per asset, 30 MB total. The 3D modelling and rendering code is build-time only and never ships to players.
- **Platform research (2026-11):** Phaser 4 supports per-pixel lighting through `setLighting(true)` with normal maps, self-shadowing via `setSelfShadow`, filters on any game object or camera, and bloom via `Phaser.Actions.AddEffectBloom()`. The runtime lighting plan depends on these. Phase 0 must prove them on a real phone-class GPU budget.

## Decisions taken in conversation

- **Gameplay:** a complete redesign, including levels, enemies, weapons and controls.
- **Visual direction:** cinematic 3D-rendered (option 1 of three offered).
- **Art source:** 3D models built in code and rendered to sprites (option 2 of three offered).
- **Sound:** keep the current synthesized approach and improve it in code.
- **Level design proposal accepted as written above:** two layers, level shape, campaign arc, medals and weapons. The user said "you can be creative here".

- **Run structure (user choice):**
  - Cleared levels unlock in a level-select list, and any of them can be replayed to chase medals.
  - Dying costs a life. Game over restarts the current level, not the campaign.
  - Upgrades carry over between levels and replays.
- **Touch controls (user choice):**
  - Relative drag: put a finger anywhere and the ship follows the finger's movement, with a slight glide.
  - The main gun fires automatically on touch.
  - The secondary weapon has an on-screen button, placed for both orientations.
  - The virtual joystick is retired.

## Calls made by Claude (open to user correction)

- **Desktop input:** arrows/WASD to move. Hold Space or click to fire, with an autofire toggle in settings. Secondary weapon on Shift or X. The hardware-keyboard detection on touch devices stays.
- **Health and economy:**
  - The ship keeps hull HP plus lives. "No-hit" means no hull damage taken.
  - Score still converts into upgrade credits.
  - Replaying a level pays credits only for score above your previous best on that level, so grinding an early level can't max out the ship.

- **Pipeline.** A build-time script (Bun with three.js as a devDependency, run headless through the existing Playwright Chromium) builds each model from code. It renders an albedo/emissive sheet and a matching normal-map sheet, then writes WebP files to `public/assets/`. Generated sheets are committed so the game build doesn't depend on the renderer.
- **Frames per ship:** a banking range (for example 7–9 frames from full left to full right bank), plus damage states for larger enemies and bosses. Bosses are made of separate parts (hull sections, turrets, core) so parts can be destroyed independently.
- **Environments:** modular code-built tile and prop kits per world (station panels, ice ridges, rock, hull plating, refinery pipes, foliage canopies), rendered from the top down with normal maps and assembled into scrolling layers at runtime. Ground targets are separate sprites placed on the terrain. Existing living shader backgrounds may survive as the deep-space layer behind terrain where a world calls for open space.
- **Runtime lighting:**
  - A small number of dynamic lights: engine glow, muzzle flashes, explosions, environmental lights.
  - Bloom on emissives. The number of lights and filters scales with the quality tier.
  - Low tier may fall back to baked lighting without normal maps if Phase 0 shows phones can't afford it.
- **Terrain collision:** only signposted set-piece walls and doors collide. Contact deals hull damage and pushes the ship back rather than killing it outright. All other terrain is non-colliding scenery.
- **Momentum feel:** tuned by playtest, not fixed upfront. The starting point is lower drag and acceleration than today (drag 4,000 against a 480 px/s cap stops the ship in about 0.12 s), aiming for about a 0.25–0.35 s glide to rest. Velocity-driven banking uses the bank frames.
- **Playfield:**
  - Levels are authored in a fixed-width logical column (about 540 units wide). Its height adapts to the screen.
  - The column scales to fit the viewport. On screens wider than the column (desktop, landscape phones), the terrain art keeps going into the side margins as non-gameplay scenery, so there are no black bars. Nothing that collides or can be shot sits outside the column.
  - Portrait phones show the column edge to edge.
  - Landscape phones get the shortest runway. They must still be playable, and threat timing is validated against the shortest supported runway.
  - `levels:validate` checks that walls, doors and ground targets sit inside the column.
- **Performance target:**
  - 60 fps on Standard on a mid-range phone (about 2021 class).
  - High holds 60 fps on desktop integrated graphics.
  - Auto starts phones on Standard and steps down under pressure.
  - Headless Chromium renders in software, so it can't qualify GPU lighting cost. Phase 0 therefore includes a preview deploy that the user plays on their own phone, alongside the existing performance project for regressions.
  - If phones need the baked-lighting fallback, it is still rendered from the same 3D models with the same light direction. The look stays consistent; only reactions to dynamic light are lost.
  - Every sheet's albedo already carries baked key lighting, and the normal map only adds dynamic response. No second copy of the assets is needed.
- **Save data:** v2 uses a new save key, and old v1 progress isn't migrated (the game and upgrades are different). Settings such as volume, quality, difficulty and controls carry over where they still apply.
- **Enemy roster:** redesigned for the new worlds. Existing enemy behaviours (diver, splitter, lancer, sower and others) may be reused as ideas but have no protected status.
- **Sound upgrades:**
  - Layered explosions with sub-bass and debris tails, sized to the explosion.
  - Distinct weapon voices per weapon level and secondary weapon.
  - Ground-target impact sounds.
  - Music intensity that follows the level shape (launch → set piece → breather → boss), including a boss theme per boss.
  - All built in the existing `src/systems/audio` engine.
- **Delivery:** in phases (below). Each phase ends playable. The user plays the Phase 1 vertical slice and approves it before the full roster and campaign are produced.

## Phases

**Phase 0: Foundations and proof.**
- The 3D-to-sprite pipeline produces the player ship (bank frames plus normal map) and one enemy.
- Lit by Phaser lights in game, with bloom.
- Measured on Low/Standard/High and a phone-class profile (existing `test:performance` project).
- New momentum controls (keyboard, plus touch drag with autofire) behind a dev toggle, so they can be compared side by side with the current controls.
- Exit: the user plays the controls and sees the lit ship, and the performance budget is met.

**Phase 1: Vertical slice, Level 1 (home shipyard).**
- Full terrain layer and ground targets.
- New weapon system (main gun levels plus one secondary).
- Medals, the level shape and its set piece, a part-based boss.
- Upgraded SFX and music for this level.
- New HUD styling.
- Exit: the user plays it start to finish and approves the direction. This is the main checkpoint. Production scale-up waits on it.

**Phase 2: Production kit.**
- The full enemy roster and the remaining two secondary weapons.
- Environment kits for all ten worlds.
- The boss part-system generalised.
- The level authoring format and `levels:validate` rules for terrain, ground targets, set pieces and medals.

**Phase 3: Levels 2–5.** Built, with bosses, music and sound.

**Phase 4: Levels 6–10.** Built, with bosses, music, sound and the final level.

**Phase 5: Shell and progression.**
- Menu, planet intermission (code-rendered planets), upgrade shop for the new weapons, victory and game-over screens, save v2.
- Old v1 content and its tests removed.

**Phase 6: Polish and release.**
- Balance pass across difficulties.
- Readability audit (bullets versus terrain) at desktop and 390 px portrait.
- Real-device performance.
- Docs: CONTEXT.md decisions and a new ADR superseding 0002–0004 where relevant.
- Release v2.0.0.

## Left to the builder

- Exact model geometry, palettes per world, frame counts and sheet layouts, within the look and budgets above.
- Specific enemy designs, wave layouts, set-piece choreography and boss patterns, within the level shape and campaign arc.
- Exact momentum numbers, after playtesting with the user in Phase 0.
- How to restructure source modules, following `docs/architecture-guidelines.md` and `architecture:check`.
- Whether development happens on one long-lived branch or phase-by-phase into `main` behind a flag, as long as `main` stays releasable.
