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
