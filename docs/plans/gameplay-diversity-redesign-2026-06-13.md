# Gameplay Diversity Redesign Plan

## Goal

Improve the full 10-level campaign so each level has a clearer dominant motif, stronger within-level pacing, and more engaging contrast between pressure peaks and Recovery Beats. The redesign prioritizes gameplay verbs first, then uses theme, boss behavior, music, and presentation to support the chosen play experience.

## Resolved Direction

- Scope: hybrid. Start from existing level authoring, but add targeted mechanics when a concrete variety gap appears.
- Target range: all 10 levels.
- Early difficulty: preserve onboarding for levels 1-2; level 3 is the first real boss-pressure check.
- Variety layer: prioritize within-level pacing over broad player-economy or upgrade changes.
- Level identity: each level should have a unique primary player skill; repeated hazards can return as support or late-game remix material.
- Presentation: full redesign is allowed, but use working titles first and finalize names/themes after mechanics prove themselves.
- Difficulty target: earned clear. Early levels should be accessible, late levels should threaten deaths while staying learnable, and the finale should feel earned without memorization-only play.
- Player economy: keep upgrades, lives, and core player stats stable during the first pass.
- Readability: gameplay readability wins over spectacle on every level.

## Campaign Skill Map

| Level | Primary skill | Boss direction |
|------:|---------------|----------------|
| 1 | Lane-reading intro | Bossless; readable mastery set-piece and short release |
| 2 | Ambush anticipation | Bossless; controlled ambush mastery sequence |
| 3 | First boss mastery | Teach boss telegraphs and safe damage windows, with pre-boss recovery |
| 4 | Route commitment under crossfire | Reinforce lane-lock and route-commitment motif |
| 5 | Endurance survival | Contrast with a burst-damage duel boss |
| 6 | Terrain-as-cover routing | Cover boss that validates literal cover use |
| 7 | Pattern memory under uncertainty | Memory-remix boss with repeated attacks and altered timing/angles |
| 8 | Visual rhythm timing | Cadence-duel boss with predictable safe/vulnerable beats |
| 9 | Precision piloting | Precision boss with readable, slightly wider movement asks |
| 10 | Adaptive synthesis | Multi-mode synthesis final boss with clear telegraphed modes |

## Recovery Beat Rules

- Recovery Beats are organic, not quota-based.
- A Recovery Beat usually shifts the player to a simpler task rather than removing danger entirely.
- Level 10 should include short task-shift Recovery Beats between synthesis waves.
- Endurance recovery can include authored health/shield relief.
- Rapid-fire should not be part of default recovery relief; reserve it for offensive mastery moments or random drops.

## New Mechanics In Scope

- Literal cover for Level 6: cover blocks enemy bullets and bomber bombs, but not enemy bodies.
- Mixed cover durability: most cover can break; key teaching cover lasts longer or can be indestructible.
- Authored health/shield relief for recovery beats.
- Lane-based signature wave templates for key authored moments.

## Constraints

- New enemy archetypes are allowed only with strict justification: unique behavior, readable tells, and reuse in at least one later context.
- New hazard types are allowed only when existing hazards cannot express an approved primary skill.
- Signature waves should use lane templates rather than fixed pixel coordinates so desktop and mobile remain readable.
- Mobile/narrow viewport play is first-class.

## Vertical Slice

Implement the redesign first across Levels 1, 5, 6, and 10.

Status: implemented in the first vertical slice for reusable authored section primitives, Level 6 literal cover, and authored content/guardrails for Levels 1, 5, 6, and 10. Manual playtest proof is still required before treating the redesign as fully tuned.

| Level | Slice purpose | Scope |
|------:|---------------|-------|
| 1 | Onboarding/readability proof | Polish the existing lane-reading structure rather than rebuilding it |
| 5 | Endurance and authored relief proof | Preserve endurance identity, add recovery/resource structure, and create burst-duel boss contrast |
| 6 | New cover mechanic proof | Implement real bullet/bomb-blocking cover and a cover-focused boss |
| 10 | Finale synthesis proof | Restructure pre-boss into clear synthesis waves with short recovery beats |

## Validation And Playtest Proof

- Add warning-based level validation guardrails rather than hard errors for design rules.
- Candidate warnings: missing recovery opportunities, adjacent repeated primary skills, signature-wave readability risks, and mobile lane-readability risks.
- Add a manual playtest checklist for each redesigned level covering dominant motif clarity, Recovery Beat feel, unfair spike risks, viewport readability, and boss coherence.

## Manual Playtest Checklist

- Level 1: confirm the authored lane-reading waves are readable on desktop and narrow viewport, and the final release still feels like a short confidence beat rather than downtime.
- Level 5: confirm authored health/shield relief stabilizes endurance without trivializing the furnace run, and the Pyre Leviathan feels like a burst-duel contrast rather than another endurance stretch.
- Level 6: confirm cover blocks enemy bullets and bomber bombs clearly, enemy bodies still remain threatening, and breakable cover durability is readable before it collapses.
- Level 10: confirm each synthesis wave has a distinct readable task, short Recovery Beats are noticeable but still dangerous, and the final boss approach does not feel memorization-only.
- All slice levels: test desktop and narrow viewport for lane readability, spawn warning clarity, unfair spike risk, and whether authored waves feel like intentional motifs rather than random difficulty spikes.

## Out Of Scope For The First Slice

- Full upgrade/economy rebalance.
- Broad enemy roster expansion.
- Broad new hazard expansion.
- Strict music-synced hazards; Level 8 rhythm timing should use visible cadence first.
