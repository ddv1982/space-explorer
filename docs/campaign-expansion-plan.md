# Campaign Expansion Plan

> Historical/design reference: this document captures the expansion planning and implementation notes that informed the current late-campaign content. The game state in `README.md` and the live config under `src/config/levels/` are the authoritative sources for what is currently shipped.

## 1. Proposed 5-level expansion plan

### Level 6 — Wreckfield Run
- **Destination / setting:** Orpheus Relay convoy graveyard
- **Visual theme:** teal salvage glow, drifting hull plates, cold sparks
- **Core gameplay idea:** weave through wreckage while enemy fire uses debris as pseudo-cover
- **Enemy composition:** fighters, gunships, bomber support, light scouts
- **Hazards:** debris surges, collapsing wreck lanes, tighter corridor moments
- **Pacing:** eerie opening → tightening debris squeeze → heavy carrier arrival
- **Boss concept:** **Scrap Regent**, a salvage carrier using scrap shields and drone summons
- **Music direction:** metallic synth pulse with haunted lead fragments; boss cue adds heavier bass churn
- **Difficulty role:** first post-inferno step-up, teaching route reading through authored terrain

### Level 7 — Ghostlight Veil
- **Destination / setting:** Nacre Reach nebula wall
- **Visual theme:** pale violet fog, ghost glows, low-visibility pockets
- **Core gameplay idea:** ambush timing and information pressure instead of pure density
- **Enemy composition:** swarms, fighters, bombers, gunship cleanup pressure
- **Hazards:** fog ambush bands, mine pockets, misleading quiet sections
- **Pacing:** calm drift → repeated pincer ambushes → cloaking boss duel
- **Boss concept:** **Veil Manta**, a stealthy hunter with disappearance/re-entry attack phases
- **Music direction:** drifting mystery tones over a hidden pulse; boss cue turns that pulse into pursuit
- **Difficulty role:** escalates tension by reducing certainty, not just adding more bullets

### Level 8 — Crown of Rings
- **Destination / setting:** Astraea IX ring lanes
- **Visual theme:** gold-violet ring dust, shard trails, giant planet light bands
- **Core gameplay idea:** orbital hazards create moving safe lanes while interceptors punish late decisions
- **Enemy composition:** fast fighters, gunships, bombers anchoring denial zones
- **Hazards:** ring-crossfire sweeps, mine clusters, orbital debris arcs
- **Pacing:** scenic wide opening → organized ring hazard sequences → rotating artillery boss
- **Boss concept:** **Ring Shepherd**, an orbital artillery platform that rotates denial lanes
- **Music direction:** regal synth-brass lead over urgent arcade pulse; boss cue becomes artillery fanfare
- **Difficulty role:** tests lane prediction and movement planning under faster pressure

### Level 9 — Obsidian Maw
- **Destination / setting:** shattered moon canyon at Kharon Rift
- **Visual theme:** black rock walls, ember seams, claustrophobic canyon light
- **Core gameplay idea:** standout canyon flight section through damaging rock formations on both sides
- **Enemy composition:** fighters and swarms in the corridor, gunships guarding the exit
- **Hazards:** rock corridor walls, falling debris, narrow turns, controlled projectile pressure
- **Pacing:** open approach → sustained canyon gauntlet → predator boss in exit chamber
- **Boss concept:** **Maw Serpent**, a canyon hunter with pursuit behavior and rotating denial patterns
- **Music direction:** low synth rumble with sharp stabs and ticking percussion; boss cue becomes relentless chase music
- **Difficulty role:** signature piloting test and one of the run’s hardest authored set pieces

### Level 10 — Terminus Black
- **Destination / setting:** anomaly gate at Acheron Gate
- **Visual theme:** near-black void, bent starlight, fracture flashes, gravity distortion
- **Core gameplay idea:** final synthesis of elite waves, anomaly hazards, and boss mastery
- **Enemy composition:** high-speed mixed elite roster with coordinated windows
- **Hazards:** gravity wells, anomaly surges, sustained crossfire, minimal downtime
- **Pacing:** ominous quiet → escalating distortion gauntlet → climactic multi-role boss battle
- **Boss concept:** **Null Crown**, a gate sentinel with shields, chase phases, summons, and rotating area denial
- **Music direction:** cosmic ambient intro collapsing into maximum-pressure synth assault; boss cue never releases tension
- **Difficulty role:** final exam for positioning, adaptation, and composure

## 2. Difficulty progression summary

- **Level 6:** tighter authored movement and more gunship pressure
- **Level 7:** higher uncertainty, ambush timing, and visibility stress
- **Level 8:** faster lane decisions and hazard prediction
- **Level 9:** precision piloting under controlled enemy pressure
- **Level 10:** full-system mastery with elite wave density and boss escalation

Design rule: challenge rises through **clarity-preserving pressure**—denser threats, faster reactions, narrower routing, and bosses that evolve level lessons.

## 3. Music direction summary

- **Wreckfield Run:** haunted metallic pulse, mid-tempo, salvage tension, heavier boss churn
- **Ghostlight Veil:** mysterious drifting tone, hidden rhythmic pulse, pursuit boss variation
- **Crown of Rings:** majestic but urgent, bright synth lead, ceremonial intensity, artillery boss surge
- **Obsidian Maw:** claustrophobic rumble and ticking pressure, chase-driven boss escalation
- **Terminus Black:** cosmic dread into hard final-drive synth assault, maximum boss intensity

## 4. Architecture changes needed

- Extend `LevelsConfig` into a richer authored campaign schema:
  - theme metadata
  - music config
  - authored level sections
  - hazard descriptors
  - boss identity data
- Keep `GameScene` as orchestration only; route content through config and systems
- Upgrade `AudioManager` to consume per-level procedural track data
- Upgrade `WaveManager` to read reusable section/hazard scripts instead of only weighted random waves
- Extend boss behavior through config-backed pattern styles rather than separate one-off bosses

## 5. Implementation status

Completed in this pass:

1. Added richer level config types and all five expansion level definitions
2. Added per-level procedural music assignment with boss cue handoff
3. Added reusable section / hazard scripting in `WaveManager`
4. Implemented the rock corridor with collision-safe fairness controls
5. Added new boss pattern logic for carrier, pursuit, and bulwark fights
6. Validated the repo with build, lint, and knip

## 6. Remaining tuning ideas

- Playtest late-campaign hazard readability under full load
- Tune escort density on carrier bosses if needed
- Either implement or remove currently provisional hazard config fields such as `durationMs`
