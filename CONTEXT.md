# Space Explorer

Space Explorer is a retro arcade space shooter whose campaign design language focuses on readable pressure, distinct level identity, and rhythmic pacing across escalating stages.

## Language

**Recovery Beat**:
A deliberate lower-pressure segment inside a difficult level that gives the player room to regain control, read the next motif, or enjoy mastery without making the level feel trivial. It usually shifts the player to a simpler, more readable task rather than removing danger entirely.
_Avoid_: easy bit, filler, downtime

**Within-Level Pacing**:
The rhythm of pressure peaks, recovery beats, motif introductions, and escalation inside a single level.
_Avoid_: level variety, difficulty curve

**Dominant Motif**:
The primary gameplay idea that gives a level its identity and is introduced, twisted, and escalated across that level.
_Avoid_: gimmick, mashup

**Lane-Reading**:
The player skill of recognizing safe movement lanes from telegraphs, enemy placement, and hazard timing before committing to a dodge route.
_Avoid_: dodging, movement showcase

**Ambush Anticipation**:
The player skill of recognizing when an apparently safe space is likely to change because of delayed enemy entries, visibility pressure, or repeated setup cues.
_Avoid_: surprise, cheap shot

## Decisions

**Both orientations on touch devices (2026-08)**:
Phones and tablets are playable in portrait and landscape; there is no rotate block. Portrait is the preferred phone experience because a taller viewport gives the player more vertical runway to read incoming threats, which serves Lane-Reading and Ambush Anticipation. Late-level formations were audited at phone-portrait width (390px) and needed no geometry retuning.

**Gameplay clocks freeze on pause (2026-08)**:
Pause suspends only the arcade physics world; the scene clock keeps running. Systems that schedule gameplay consequences therefore count accumulated gameplay delta instead of reading scene time: choreographed waves (`WaveChoreographer`) and hazard beams (`HazardBeam`) freeze their telegraph/fire/expire windows while paused, so a pause can never compress wave schedules into a burst or let a beam expire for free. This protects Lane-Reading: telegraph lead times survive pauses intact.

**Difficulty changes forgiveness, not encounter grammar (2026-08)**:
The campaign's original balance is Normal difficulty. Low, Normal, and High multiply accepted hull damage by `0.75`, `1.0`, and `1.25` respectively. Difficulty never changes formations, spawn schedules, movement or projectile speeds, telegraph windows, hazard geometry, boss phase thresholds, or the one-hit shield contract. This keeps the authored Within-Level Pacing, Lane-Reading, and Ambush Anticipation lessons stable while changing how many mistakes a player can recover from.

**Presentation remake does not change encounter grammar (2026-08)**:
The v2 neon-vector remake is a presentation pass: menus, silhouettes, VFX, atmosphere, and HUD chrome may escalate spectacle, but formations, spawn schedules, movement or projectile speeds, telegraph windows, hazard geometry, boss phase thresholds, Arcade body sizes, and the one-hit shield contract stay frozen. The center 45–55% lane stays darker than threats so Lane-Reading survives the louder look. Textures stay procedural except the existing planet-arrival portraits. Visual quality remains three tiers with remake FX budgets on the existing profile; there is no new quality axis. Pause still freezes gameplay clocks; both orientations stay playable with no rotate block.

**Threat silhouette edges are quality-invariant (2026-08)**:
Low, Standard, High, and Auto all supersample procedurally generated entity textures at 4x, so quality tiers never degrade threat silhouette edge smoothing. The explicit high-density resolve is only a temporary generation surface; logical texture dimensions, gameplay geometry, and authored encounter values remain unchanged, while particle and spectacle budgets stay tiered.
