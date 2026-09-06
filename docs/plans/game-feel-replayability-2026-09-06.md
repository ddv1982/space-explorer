# Improve play feel and replayability

The user authorized this program on 2026-09-06. The comparison build is `fccb176a82542285807739f786a8fe661ccfb8d2`, version 1.19.0.

The user subsequently authorized autonomous implementation of every phase. Human and physical-device observations remain follow-up validation, not implementation blockers. The engineering choices below use code, controlled comparisons, and automated evidence; they do not claim proven enjoyment or retention.

The program preserves the existing ten-level campaign, procedural worlds, cinematic hull direction, and damage-only difficulty settings. Each phase uses evidence from the preceding phase. Human findings remain separate from automated correctness checks.

## Execute the phases in order

| Phase | Scope | Exit evidence | Status |
| --- | --- | --- | --- |
| P0 | Local recording, baseline capture, playtest protocol | Technical evidence plus fresh-player observations and three common barriers | Recorder implemented; human observations pending |
| P1 | Compare movement, braking, directional travel, and bank-directed aiming | Deliberate control on keyboard and physical touch devices | Implemented; native Arcade comparison and emulated-input checks pass |
| P2 | Distinguish hit outcomes and explain deaths | Players identify damage and a plausible avoidance action | Implemented; typed source/outcome, terminal cause, and real-collision checks |
| P3 | Tune Aurora Threshold, Ember Monsoon, and Debris Gauntlet | Purposeful recovery, readable escalation, and feasible safe routes | Implemented; visible flare warnings, escape routes, and purposeful approaches |
| P4 | Resolve the three most visible combat-art inconsistencies | Recognition at actual play size without changed geometry | Implemented; Diver, Gunship, and Sower compared at native scale |
| P5 | Direct retry and useful existing run results | Repeated voluntary-play signal in fresh cohorts | Implemented; reset, settings, input, and ten-retry checks pass |
| P6 | Apply proven tuning across the campaign | Sustained campaign and human evidence, plus release checks | Implemented; all-ten-level audit, tuning, and staged level/boss checks |

Implementation does not mark the human exit evidence as collected. Read [control measurements](../qa/player-controls-tuning.md), [encounter decisions and campaign matrix](../qa/encounter-rhythm.md), and [retry verification](../qa/direct-retry.md) for the technical evidence and its limits.

The final integration also retains brief Escape presses across frame boundaries and refreshes final score at the game-over handoff. The latter includes an enemy-contact reward that completes after synchronous fatal damage. Both have failing-before regressions. Final verification also prepares the first projectile physics object and keeps native intermission keys out of gameplay input, preventing double purchases and blocked Space activation. Current CI results and runtime artifacts identify the validated revision; this document does not replace those receipts.

## Preserve the evidence boundaries

- Start with [the playtest protocol](../qa/game-feel-playtest.md) and record findings in [the baseline report](../qa/game-feel-baseline.md).
- Keep development recording behind the existing `import.meta.env.DEV` and browser-harness query boundary.
- Record unknown death causes as unknown. Player-hit feedback covers shield and hull outcomes; player-death counts individual lives.
- Do not label recorded inputs as deterministic replay. Enemy spawns and beam placement use randomness.
- Compare movement candidates before choosing control values. Do not retune hazard timing against an unselected movement model.
- Give Recovery Beats an explicit purpose. A low enemy count alone does not establish boredom.
- Inspect the 2500 ms score-chain timeout during recovery. Do not automatically fill calm sections with enemies to preserve a chain.
- Preserve difficulty as damage forgiveness. Presentation work keeps encounter timing and collision bodies unchanged.
- Treat small-sample replay counts as iteration signals. Never replace human observations with automated completion.

## Deliver reviewable changes

Use a separate branch per verified phase and keep dependencies explicit. The operator reviews interaction changes and merges the completed PRs. Main's successful release workflow deploys the game, so no agent merges as part of this program.

Follow [required quality gates](../qa/quality-gates.md) and [the performance contract](../qa/performance-gate-contract.md). Physical-device checks and human observations are additional requirements.

## Research supporting the sequence

[Harry Krueger's Resogun postmortem](https://www.gamedeveloper.com/business/the-game-is-the-boss-a-i-resogun-i-postmortem) describes outside playtests and removing mechanics that disrupted play. That supports focusing on control and encounter iteration before adding systems.

[Mike Booth's Left 4 Dead presentation](https://cdn.fastly.steamstatic.com/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf) distinguishes pacing variation from difficulty. This program applies purposeful pressure and relief to authored encounters without importing its adaptive director.

[Steve Bromley's sample-size guidance](https://gamesuserresearch.com/how-many-players-do-i-need-for-a-playtest/) distinguishes discovering problems from measuring player populations. Small repeated sessions guide the early phases; precise retention claims require a separately designed study.
