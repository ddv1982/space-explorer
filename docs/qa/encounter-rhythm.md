# Encounter rhythm audit

Run `bun scripts/analyzeEncounterRhythm.ts` to inspect the current authored windows, waves, recovery drops, and hazard eligibility across all ten levels. Time is gameplay time. The script derives section lengths from the same scroll speed as `LevelManager`. It does not model enemy randomness, pool exhaustion, hazard pressure, kills, or enjoyment.

## Baseline measurements

The baseline is commit `1200489`. A recovery pickup starts at y = -40 and descends at 60 px/s. Reaching a stationary player at 75% of an 844px portrait viewport takes 11.22 seconds. At 600px height it takes 8.17 seconds. These are geometric travel times, not observed collection rates. Moving upward can intercept earlier, but requiring that during the boss arrival defeats the advertised Recovery Beat.

| Level | Approach duration before tuning | Recovery drop to boss before tuning |
| --- | ---: | ---: |
| Ember Monsoon | 2.014s | 1.007s |
| Clockwork Causeway | 2.222s | 1.111s |
| Shatter Reef | 2.431s | 1.458s |
| Debris Gauntlet | 2.569s | 1.542s |
| Hollow Choir | 2.639s | 1.583s |
| Eclipse Narrows | 2.708s | 1.490s |
| Swarmfront | 2.778s | 1.528s |
| Eventide Engine | 2.917s | 1.458s |

The first flare currently spans the full viewport height and sweeps its full width. There is no continuous in-bounds route past this beam. This is a geometry defect, not a problem that faster controls or fewer enemies can solve. The integrated hazard correction and its tests own that proof.

## Pilot decisions

Aurora's Blue Quiet lasts 12.22s before tuning. Three available designs were compared against the authored data: retain it, shorten the release, or keep its duration and add a single positioning task. Shortening it removes recovery time without identifying a problem in the preceding waves. Keeping it unchanged leaves a random mixed roster that can still spawn divers during the advertised release. The selected design keeps the duration, restricts random arrivals to one scout, and places a warned scout column on a side lane. This is a design judgment awaiting player comparison, not an observed preference result.

Ember's first boss approach needs enough time to collect the existing shield. Keep the climax's absolute schedule intact and provide about 8s for a deliberate midfield interception before boss arrival. Move its health drop into the approach, after the shield, so the center recovery route does not ask the player to chase health through recurring energy-storm spawns. Restrict approach arrivals to one scout at a lower rate. Existing enemies and projectiles can remain; this does not promise an empty or damage-free screen.

Debris Gauntlet needs separate hazard lessons before its siege remix. Teach the flare without recurring debris in the same section. Teach lattice alone before cover starts. End lattice and cover emissions before the recovery drop, and keep the siege overlap as the exam. Slower beam cadence limits concurrent barriers; it cannot repair the full-height flare geometry. Preserve the existing boss and Marked Ace roster.

The chain expires after 2.5 seconds without a kill. Recovery does not promise chain continuity. Do not fill recovery with enemies solely to prevent expiry. The sparse scout task offers optional mastery; players may instead collect resources and reposition.

## What remains unproven

Authored timing can show a pickup has time to arrive and a wave fits its section. It cannot show that a player will understand the warning, collect the pickup safely through surviving enemies, enjoy a release, or choose another run. Fresh-player discovery, sustained campaign attrition, physical touch devices, and voluntary replay counts remain follow-up validation. No automated result in this document substitutes for those observations.

## Pilot timing and route checks

P3 selects the 480px/s, 3200px/s² acceleration, 4000px/s² braking profile supplied by the controls owner. `tests/helpers/beamRouteProof.ts` samples continuous straight-line escape routes at 240Hz after a 250ms reaction delay, with the real 24×32 player body, normalized movement, and total speed capped at 480. It consumes actual launch geometry from `HazardBeamSystem` in the unit fixture.

The sample covers 390×844 portrait, 844×390 landscape, and 800×600; both flare directions; lattice center and extreme gap positions; x at 20%, 50%, and 80%; y at 60%, 75%, and 90%. All 108 sampled paths start at rest, avoid the simultaneous flare and lattice, and remain in bounds. The model rejects the former full-height flare. Its straight-line controller can choose arbitrary angles, while the game has eight input directions, so it is a geometry model rather than proof of every executable input route. It excludes surviving enemies, cover, incoming bullets, pre-existing velocity, upper-screen positions, and human reaction variability.

The integrated browser test supplements the model with real eight-direction input at desktop, phone-portrait, and phone-landscape sizes. It starts above the flare's escape region and inside a lattice column, waits at least 250 ms of gameplay time, then drives right/down and down through delivered keyboard events. All three runs reach the safe region without hull loss before both hazards activate. These are representative input routes, not a universal guarantee under combined enemies and bullets.

The flare telegraph now occupies the visible source edge. Previously its entire width was outside the viewport for the 700ms warning. Its lower 22% escape lane has a 100px minimum. Lattice geometry and the 800ms lattice warning stay unchanged, so the bottom remains divided by lattice walls. Direct bounds assertions protect the visible warning and the remaining lattice challenge.

The initial 14–15s approaches allowed passive lower-screen collection but added too much waiting. That design was rejected. The selected approaches last about 8s and ask for deliberate midfield interception. A pickup reaches 50% of an 844px viewport in 7.70s. The following Ember health drop can be intercepted around 42% height before the boss.

The selected pilot windows are measured from the authored configuration:

| Decision | Selected value | Basis |
| --- | --- | --- |
| Blue Quiet task | Warned three-scout column at 2.8s | Design judgment; retain 12.22s release |
| Ember shield before boss | 7.894s | Exceeds 7.70s portrait-midfield drift |
| Ember health before boss | 6.606s | Existing pickup moved out of storm emissions; intercept near 42% height |
| Debris shield before boss | 7.806s | Exceeds portrait-midfield drift |
| Flare teaching cadence | 6s, emissions end at 15s | Design judgment; no scripted debris in debut |
| Lattice teaching cadence | 4.5s, emissions end at 10s | Latest allowed beam expires by 13s |
| Cover first eligibility | After 14s | At least 1s after last allowed lattice expiry |
| Siege hazard emissions end | 14s into a 23.125s section | Leaves expiry time before the resource approach |

The exact hazard trigger uses a strict cadence comparison and pressure budget, so first eligibility is just after the reported timestamp. Pressure can delay or suppress an emission; these values do not claim deterministic spawn sequences.

## All-ten campaign matrix

| Level and Dominant Motif | Introduction | Escalation | Recovery Beat and resource demand | Boss exam |
| --- | --- | --- | --- | --- |
| Aurora Threshold, Lane-Reading | Familiar scout lanes | Diver column, crossfire, warned vee | Midlevel health; Blue Quiet side-lane scout task | No boss; return through open center space |
| Tideglass Shallows, Ambush Anticipation | Familiar scouts/divers, then scout-only portal | Dodger line after first portal; later ambush and portal remix | Midlevel health; Clearline release | No boss; read arrival before committing |
| Ember Monsoon, mine denial | Fighter approach and sower drift | Minefield/debris, storm-front gunship column | Shield then health in the extended center approach; avoid losing hull in the mine peak | Pyre Herald barrage |
| Clockwork Causeway, timed lane duels | Vanguard approach and warned lancer | Crossfire/mines, then corridor and storm lock | Existing center shield has 7.840s to arrive; single scouts during approach | Marshal Vectra pressure |
| Shatter Reef, split/ambush priority | Splitter brood | Ambush current, Marked Ace priority check | Midlevel health; 7.860s pre-boss shield lead; leave surviving splitters behind | Reef Stalker pursuit |
| Debris Gauntlet, hazard Lane-Reading | Visible flare edge and bottom escape | Lattice before cover, then siege remix | Switchback health; 7.806s shield lead; avoid spending reserves on beam traps | Bastion Bulwark shield cycle |
| Hollow Choir, Ambush Anticipation | Warned lancer behind familiar pressure | Warp aisles, lancer reprise and elite beat | Aisle health; 7.888s shield lead; resolve late arrivals before following pickup | Choir Regent pressure |
| Eclipse Narrows, convoy lane commits | Warned escort formations | Pincers, cover and vanguard elite | Crossfire health; final picket then 7.830s shield lead | Umbral Ark carrier summons |
| Swarmfront, target priority at density | Swarm rings | Splitters, dodgers and elite density crest | Midlevel health; thin final brood then 7.894s shield lead | Hive Maelstrom counter-rotation |
| Eventide Engine, ordered motif recall | Portal then minefield | Flare, lattice, corridor and convergence in sequence | Flare shield retained; final picket then 7.860s health lead | Omega Null pressure into maelstrom |

P6 sets each remaining boss approach to approximately 8s and starts its existing recovery drop at 2% of the approach. It changes no earlier section boundary or scripted wave timestamp. Single-scout random arrivals replace mixed late-stage enemies during each approach; existing final picket and brood waves remain. Tideglass removes the nebula ambush from the portal introduction, uses familiar scouts in the first portals, and shifts the warned dodger line from 4.2s to 7.8s. Its entry roster contains only scouts and divers so random dodgers cannot preempt their introduction. Later remixes remain intact.

The rejected version extended all approaches to 13–17s for passive lower-screen pickup collection and added 103.40s across the campaign. That would increase the very waiting this review aims to reduce. The selected version adds 43.88s across all eight approaches, each lasting 7.965–8.056s. Its first pickup reaches portrait midfield by boss arrival, asking the player to intercept it deliberately. The existing following Ember health can be intercepted near 42% height. Earlier waves stay fixed, and no pickup is duplicated. Human fatigue testing should still compare these shorter Recovery Beats.

## Resource attrition audit

The fresh-run state starts with 5 hull and 3 reserves. `advanceToNextLevel` refills hull to the purchased maximum and shields to the purchased shield tier. Hull and shield loss therefore accumulate within a level, not across normal level transitions. Reserves and unspent credits persist. Purchases subtract credits, and boss HP scales with purchased upgrades through the existing boss-scaling policy. The selected difficulty changes accepted hull damage only; none of these changes alter that contract.

An authored health pickup restores 2 hull up to the maximum; a shield pickup adds one shield up to the existing cap, and each shield absorbs one hit. The campaign retains its existing total of nine authored health pickups and eight authored shield pickups. None is added by this tuning. Random drops, Marked Ace rewards, purchases, and pickup misses make actual resource trajectories player-dependent.

A realistic campaign test should record level-entry reserves, credits, purchased tiers, restored hull/shields, then boss-entry resources and damage sources. Injecting low hull at every level start would not represent the normal progression contract. The harder question is whether reserve loss before the late campaign becomes unrecoverable despite the intermission refill. This audit does not invent a survival rate or change reserves without observed evidence.

## Remaining validation, ranked

1. Exercise beam overlaps with initial motion and surviving enemies, including upper-screen positions and three natural spawn samples. The geometric proof covers only the stated lower-screen beam samples.
2. Observe pickup collection and the added 43.88s of campaign recovery with fresh players. Record confusion, upward chases, optional score pursuit, and perceived waiting by section timestamp.
3. Run full campaigns with ordinary purchased loadouts. Separate reserve depletion from failure to read an individual hazard; retain each boss-entry resource record.
4. Repeat on physical portrait and landscape phones, then measure voluntary retry and return counts. Automated completion does not answer either preference question.

Local verification includes the all-level timing regression, actual LevelManager clock comparison, all choreographed wave windows, all eight approach midfield-interception windows, portal teaching order, and 108 beam-route samples. The ten-level validator ran after each of the seven P6 level edits. Browser and performance evidence are owned by the integrated build.
