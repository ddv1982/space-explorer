# Level & Arcade Systems Design Bible: "Neon Frontier" Campaign

## Set pieces added in v1.28

Every sector keeps its five-part arc and gains at least one beat built from four new blocks:

- **Rival duel** (`rival`). The player's own hull at half strength (`RIVAL_*` constants halve
  `FLIGHT_CONFIG` and the base fire rate). Its hull is rated in player hits, 30 at any damage tier, so a
  duel lasts about nine seconds stock and shortens only with fire rate. While a rival lives the sector
  holds: the wave clock, hazards and route progress all stop, and its hull shows on the boss bar. Rivals
  are authored only as choreographed waves. L2 ends in the first duel (it has no boss), L4 and L9 have
  one mid-level, L7 and L10 send a pair.
- **Courier** (`courier`). Unarmed gold runner that weaves edge to edge and always drops a power-up.
  Escaping costs nothing. L8 runs them as convoys.
- **Wall** formation. Fills every lane except the wave's `lane`; wide screens get up to three members
  per lane so the open lane stays the only clear way through. `count` caps the total.
- **Echelon** formation. A diagonal staircase stepping away from the nearer screen edge.

Upgrade tiers open across all ten sectors (`progressionCaps` in `UpgradesConfig.ts`), and purchased
shields recharge on every respawn.

## Late-campaign combat texture

Levels 5–10 add payoff without adding player inputs:

- **AEGIS Picket** becomes purchasable after Level 4. Its fixed flank turrets trim chaff with flat-damage bolts while the main gun remains the dominant damage source. Pickets never target bosses.
- **Ship systems** are free one-of-three picks at the refit bay after sectors 2, 5 and 8 (`config/shipSystems.ts`). They change how the ship plays rather than how hard it hits, and are balanced by measurement: each main gun trades single-target damage for one strength and scored inside the standard gun's run-to-run spread in sector 5. Nothing is offered in sectors 1–2, which stay a gentle introduction. A system works without input; the only new input is changing one. Once a slot has a pick the player may change it to another option of that slot: freely at every later refit bay (the picks sit beside the upgrade cards and reopen the pick dialog, which Escape dismisses), the main gun mid-flight on Q or the touch swap key, and support and doctrine from the pause panel's SYSTEMS tab. A gun change in flight costs `GUN_SWAP` (0.5 s of silence, 2 s before the next change, both on the gameplay clock), so swapping mid-fight is a decision and never a free best-of-all-guns; between sectors, at the refit bay, a change is free and has no cooldown. In flight, feedback is a brief name flash over the ship; there is no persistent panel. The current pick is saved with the run.
- **Run variation** comes from one seed per run (`systems/runVariation.ts`, `systems/gameplayRandom.ts`). It decides the wave choices, whether each sector is mirrored left to right, and the sky. Two rules keep scores comparable: the sky is looks only, and the only layout change is the mirror, which is as hard by symmetry. Never vary wave order, enemy counts or timing by seed. RETRY keeps the seed; NEW RUN draws a new one. Enemies, asteroids and wormholes each draw from their own seeded stream, so one cannot shift another's choices; how far a run gets through a stream still depends on play. Enemy jitter and pickup drops stay unseeded because they depend on how the fight goes.
- **Marked Aces** are sparse authored variants of existing enemies. Their gilded treatment signals 2× durability, 4× score, and exactly one guaranteed power-up.
- **Boss volleys are telegraphed.** For the last 400 ms before every volley the boss's core swells and its hardpoints flash white. Bosses have no stun or bonus-damage window; fights are paced by the wind-up and each attack's cooldown.
- **Boss fights are authored rotations.** A boss's whole fight lives in its level file (`BossConfig`): phases start at hull thresholds (any number of them), and each phase steps through an ordered list of attacks, each with its own cooldown, never picked at random. An attack can send the boss to an anchor first (`x` a share of the screen width, `y` pixels from the top) and holds the volley until it arrives, so a safe spot does not stay safe. Shared building blocks live in `entities/enemies/boss/volleys.ts`: arcs, aimed arcs, spirals, escort summons, a wall with one gap, an aimed burst, and a beam that reuses the hazard beam and its telegraph. A shielded attack keeps the hull closed from the previous volley until it fires, and only then.
- **Boss hull is authored, not scaled.** Upgrades shorten boss fights; nothing raises boss hull. Each boss has a par time (45-70 s) and a hull tuned so the sector's representative ship meets it with the measurement bot (`bun run balance:bosses`, which states the ship). Past par, cooldowns shrink evenly to 25% faster over 30 s; the wind-up keeps its length. The sector 3 boss does not escalate. A kill under par pays 200 points per whole second left. Fight time is the boss's gameplay clock, so pause and hit-stop never count.
- **Max-chain Overdrive** reduces the main-gun cooldown by 15% while the existing chain multiplier remains at x5. It adds no input and ends immediately when the chain falls.

These systems must preserve Lane-Reading, avoid persistent HUD panels, and remain independently removable through upgrade/config gates.

This is the master spec for the complete level overhaul. It replaces all 10 level definitions with a
re-themed sequel campaign and adds the arcade systems that make it feel like a new game. It builds on
the neon-vector art direction in `docs/art-direction.md`.

Premise: the first campaign ended at the Eventide Singularity. The Neon Frontier is what lies on the
far side: ten hostile sectors of increasing strangeness, ending at the Eventide Engine, the machine
that powers the frontier itself.

## 1. Design pillars

1. **Choreographed, not random.** Waves are authored on a lane grammar with entrance paths,
   formations, and kill-conditional bonuses. Randomness seasons; it never leads.
2. **One gimmick per level, then remix.** Every level has a single headline mechanic. Later levels
   recombine earlier gimmicks instead of stacking new ones.
3. **Pressure with relief valves.** Popcorn rushes, bonus waves, recovery drops, and a pre-boss lull
   are structural, not accidental. Gentle levels 1-3, ramp 4-7, hard 8-10.
4. **Telegraph everything.** No silent spawns, no unreadable bullets, no unfair deaths. Danger always
   announces itself.
5. **Score chasing.** A decaying chain multiplier and a graze-fed Surge pulse reward aggression and
   create the one-more-run pull.

## 2. Campaign-wide systems

### 2.1 Difficulty curve and relief valves

- spawnRateMultiplier: 1.0 (L1) rising to ~2.25 (L10); encounter sizes 1-2 up to 2-3.
- Level durations stay in the 75-150s band (levelDistance 11000 to 21000).
- Relief valves, always on:
  - On player death: all enemy bullets are cancelled, hazard pressure resets to zero, and the spawn
    rate is dipped (x0.75) for 8 seconds. Existing 2s respawn invulnerability stays.
  - Authored recovery drops (health/shield) at heat fronts and before every boss.
  - Popcorn rush (all scout/swarm, high spectacle, low threat) before each mid-boss beat and boss.
- Helper wings (last-life escorts) unlock from level 6 as today.

### 2.2 Chain multiplier

- Every kill adds 1 to the chain and refreshes a 2.5s decay window.
- Multiplier = 1 + floor(chain / 8), capped at x5. Applies to all kill scores.
- Player hit: chain halved. Player death: chain resets to 0.
- HUD readout next to the score: "CHAIN x3" with a pulse on tier-up; hidden at x1.
- Chain kills feed the spectacle: tier-ups trigger a subtle screen-edge shimmer.

### 2.3 Graze Surge

- Graze radius: enemy bullets passing within ~26px of the player ship (without hitting) are grazed,
  once per bullet, marked with a tiny spark.
- Each graze adds 1 to the Surge gauge (capacity 40). Grazed bullets during boss fights count double.
- At full gauge: automatic Surge Pulse. Enemy bullets within 220px are cleared and converted to
  +25 score each, with a brief hitstop flash and neon ring VFX. Gauge resets.
- No new input required; the pulse is automatic so the mechanic works on touch and keyboard alike.

### 2.4 Telegraphed spawn language

- Wormhole warp-ins: a shrinking neon ring marks the arrival point 600ms before enemies materialize.
- Elite enemies (lancer, gunship-led waves) get edge arrows while off-screen.
- Boss arrival: warning banner + siren + music drop, then the boss enters (partially exists; upgraded
  with the banner and a hard lighting beat).

### 2.5 Boss spectacle

- Boss death: ~0.6s slow-motion hitstop, white flash, expanding shockwave ring, debris burst, large
  score popup. Reuses the explosion flash + shockwave choreography from the VFX overhaul.
- Phase change: short firing pause, flash, hit-stop and announcement on every phase change; the new phase's rotation starts from its first attack.
- The final boss (L10) switches hull style between phases (pressure into maelstrom).

### 2.6 Wave choreography grammar

- Playfield divided into 7 spawn lanes (8% margins kept free).
- Authored wave scripts per section: `{ atMs, formation, type, count, lane, path? }` entries compiled
  onto a Phaser Timeline per section. Formations: `column`, `vee`, `ring`, `line`, `pincer`.
- Entrance paths for divers: curved flight from top corners into formation anchors before attacking.
- Kill-conditional bonus waves: if a scripted wave is cleared within 4s, a bonus popcorn wave spawns
  (score-chase reward for fast play).
- Mid-boss beat: at ~60% of boss levels, an elite wave (banner + telegraph) punctuates the level.
- Boss add-waves: during boss fights on flagged levels, light popcorn spawns every ~12s so the screen
  never goes empty and the chain can be fed (today spawning stops entirely during bosses).
- Random interval spawning remains as the connective tissue between scripted waves.

### 2.7 New enemy roster

Existing five stay: scout, fighter, bomber, swarm, gunship. Five new types join:

| Type | Role | Behavior | HP | Score | Debut |
|---|---|---|---|---|---|
| diver | pressure / choreography | curved entrance, assembles in formation, then dive-bombs the player | 1 | 150 | L1 |
| dodger | direct challenge | strafes sideways to evade incoming player fire, fires single aimed shots | 2 | 300 | L2 |
| sower | area denial | slow drift, lays drifting mines (destructible, 1 HP, explode on touch) | 3 | 350 | L3 |
| lancer | elite duel | holds position high, telegraphs 0.8s, fires one fast aimed bolt | 4 | 500 | L4 |
| splitter | swarm multiplier | on death splits into 2 fast swarmlings | 2 | 250 | L5 |

Each type gets a neon sprite in the sprite factory, a pool entry, spawn handler, and durability tests.
Exclusivity rule: a type debuts in its level, recurs in later remix levels, and the splitter stays
exclusive to L5, L9, and L10.

### 2.8 New hazards

| Hazard | Behavior | Debut |
|---|---|---|
| solar-flare | telegraphed beam sweep from a screen edge; damages the player but also clears enemy bullets it crosses (risk/reward) | L6 |
| laser-lattice | timed crossing beam pairs with safe gaps, pattern obstacle | L6 |
| wormhole-spawn | mid-screen warp portals that teleport in a scripted enemy pack after a ring telegraph | L2 |

### 2.9 Boss attack-style plan

All six hull styles are used; a phase can switch style (the finale does). Bastion Bulwark is the first boss authored for the rotation engine; the others still fire one attack per phase and are due their own rotations.

| Level | Boss | Phases | Par |
|---|---|---|---|
| L3 | Pyre Herald | barrage, 2 phases (no escalation) | 45 s |
| L4 | Marshal Vectra | pressure, 2 phases | 50 s |
| L5 | Reef Stalker | pursuit, 2 phases | 52 s |
| L6 | Bastion Bulwark | bulwark, 3 phases at 66% and 33%: rampart (shield only while charging a wall), breach (flank anchors, aimed burst, rotary), last stand (no shield, pursues, beam) | 60 s |
| L7 | Choir Regent | pressure, 3 phases at 66% and 33%, each a fixed rhythm: hymn (two interleaving fans, then a fan aimed at you), antiphon (outward loft fans that leave the lane under it open, a nave fan that closes it, a cantor's aimed burst), crescendo (rotary, hymn, lofts with a short burst, over a faster patrol) | 58 s |
| L8 | Umbral Ark | carrier (debut), 2 phases | 62 s |
| L9 | Hive Maelstrom | maelstrom (debut), 2 phases | 65 s |
| L10 | Omega Null | pressure -> maelstrom (finale switch), 2 phases | 70 s |

## 3. The 10-level concept sheet

Difficulty shorthand: G = gentle, R = ramp, H = hard.

### L1: Aurora Threshold (G) - planet Lumen Gate - motif: aurora
- Lane-reading opener. Diver entrances are the show; scouts and fighters fill the lanes.
- distance 11000, spawnRate 1.0, encounter 1-2; enemies: scout 60, fighter 25, diver 15.
- Hazards: one gentle debris-surge stretch. No boss. 1 health drop mid-level.
- Music: bright overture, glassy synth, tempo ~96.

### L2: Tideglass Shallows (G) - planet Mira Shoal - motif: glass tide
- Gimmick debut: wormhole-spawn (slow cadence, always telegraphed). Dodger debut.
- Galaga-style bonus wave at ~55% (no-fire popcorn run for score). No boss.
- distance 12500, spawnRate 1.15; enemies: scout 30, diver 25, dodger 20, swarm 25.
- Music: buoyant arps over a tidal pulse.

### L3: Ember Monsoon (G->R) - planet Cinderreach - motif: ember storm
- Sower + minefield debut; energy-storm returns as the weather.
- First boss: Pyre Herald (barrage), taught by a mid-boss elite wave at 60%.
- distance 14500, spawnRate 1.35; enemies: fighter 30, sower 18, swarm 27, diver 25.
- Drops: health at the heat front, shield pre-boss.

### L4: Clockwork Causeway (R) - planet Gearhaven - motif: clockwork
- Waves arrive on the musical beat; lancer debut (telegraphed sniper duels).
- Boss: Marshal Vectra (pressure). distance 16000, spawnRate 1.55, encounter 2-2.
- enemies: fighter 30, lancer 20, diver 20, gunship 30.

### L5: Shatter Reef (R) - planet Korra Vale - motif: coral reef
- Splitter debut (kills multiply); nebula-ambush remix. Mid-campaign exam.
- Boss: Reef Stalker (pursuit). distance 17500, spawnRate 1.75, encounter 2-3.
- enemies: fighter 25, splitter 25, bomber 20, gunship 30.

### L6: Debris Gauntlet (R->H) - planet Bastion Fall - motif: wreckage ramparts
- Set-piece level: enemy-light, hazard-dense. Solar-flare and laser-lattice debut;
  rock corridors with destructible cover return.
- Boss: Bastion Bulwark (three phases; its shield closes only while it charges a wall). Helper wing unlocks.
- distance 18500, spawnRate 1.55; enemies: fighter 30, bomber 25, gunship 35, scout 10.

### L7: Hollow Choir (H) - planet Vesper Nine - motif: cathedral
- Elite remix: lancers and gunships behind wormhole warp-ins, ghostly fade-in ambushes.
- Boss: Choir Regent (pressure, tuned hard; three phases, each a fixed rhythm of fans and aimed bursts). distance 19000, spawnRate 1.9.
- enemies: fighter 28, lancer 22, swarm 26, gunship 24.

### L8: Eclipse Narrows (H) - planet Umbral Rook - motif: eclipse
- Convoy escort fantasy through tight corridors; bombers and gunships in pincer waves.
- Boss: Umbral Ark (carrier debut, escort summons). distance 19500, spawnRate 2.0.
- enemies: bomber 22, gunship 30, dodger 20, fighter 28.

### L9: Swarmfront (H) - planet Hive Lathe - motif: hive
- Set-piece level: swarm survival. Splitters return; density peaks here.
- Boss: Hive Maelstrom (maelstrom debut, counter-rotating spirals).
- distance 20000, spawnRate 2.1; enemies: swarm 45, splitter 15, dodger 15, fighter 25.

### L10: Eventide Engine (H) - planet Omega Spire - motif: singularity engine
- Final exam: the level reprises every gimmick in sequence (wormholes, minefields, flares,
  lattice, corridors) across 6 sections.
- Boss: Omega Null, pressure into maelstrom phase switch, the hardest fight in the game.
- distance 21000, spawnRate 2.25; enemies: fighter 30, lancer 18, gunship 32, sower 20.

## 4. Re-theme sync points

- All 10 levels get new names/planets/palettes (above). These must be synced to:
  `livingBackgroundProfile.ts` LIVING_CAMPAIGN (name-keyed living worlds: aurora, glass tide,
  ember storm, clockwork, coral reef, wreckage ramparts, cathedral, eclipse, hive, singularity
  engine), `VictoryScene.ts` (level 10 reference),
  Menu/Preload/intermission lookups (all name/index driven, no code change).
- Music: each level keeps a `createSignatureMusic` block with a new seed, mood, and tempo matching
  its concept.

## 5. Explicitly kept / out of scope

- 10 levels, same campaign flow (Game -> PlanetIntermission -> Victory/GameOver), same upgrade shop.
- Save slots clamp dynamically to `getTotalLevels()`; no migration needed.
- Enemy base stats stay global in `constants.ts` (new types added there); no per-level stat overrides.
- No new player weapons or input mappings in this overhaul (Surge pulse is automatic).

## 6. Play-feel tuning, September 2026

The concept sheet above describes campaign intent. Current authored timing is inspectable with `bun scripts/analyzeEncounterRhythm.ts` and guarded by `tests/encounterRhythm.test.ts`.

The first pilot keeps Aurora's 12.22s Blue Quiet and gives it one warned right-side scout column, with single-scout random arrivals. Leaving the 2.5s chain during recovery remains a valid choice. Ember's existing health drop moves out of its storm peak into the boss approach, following the center shield. Its boss trigger moves from 0.72 to 0.78; the preceding sections retain their absolute timing.

Debris Gauntlet teaches the flare before recurring debris and teaches lattice before cover begins. The siege still remixes flare, lattice, and debris, with fewer simultaneous emissions and time for beam expiry before the approach. Its boss trigger moves from 0.70 to 0.742. Both pilot approaches provide more than 7.70s between the shield spawn and boss arrival, enough for deliberate interception near midfield on an 844px portrait viewport. Collection through surviving enemies still needs playtest evidence.

Solar flares leave a visible bottom escape lane of at least 100px or 22% of viewport height. The previous full-height sweep forced a collision somewhere across the screen. Lattice vertical beams still reach the bottom, so players must read their gap or outside lanes. This is a gameplay geometry correction; it does not change damage, pause clocks, quality tiers, or artwork collision sizes.

The campaign pass applies the same pickup travel check to the other six boss levels. Boss triggers are now 0.752 for Clockwork Causeway, 0.746 for Shatter Reef, 0.741 for Hollow Choir, 0.719 for Eclipse Narrows, 0.718 for Swarmfront, and 0.695 for Eventide Engine. Earlier sections and authored wave timestamps stay fixed. The existing finale approach health remains health. Tideglass introduces its first portal with familiar scouts before its dodger line, and keeps ambush combinations for the later section.

These extensions add 43.88s across eight approaches. Each approach lasts about 8s and asks for a deliberate midfield pickup interception. The rejected 103.40s version relied on passive lower-screen collection and added too much waiting. Normal level transitions refill hull and purchased shields; sustained campaign attrition is principally reserves and credits, not carried hull damage.
