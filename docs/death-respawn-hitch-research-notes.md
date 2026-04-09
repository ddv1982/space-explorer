# Death / Respawn Hitch Research Notes

## Issue framing

Observed symptom: a noticeable hitch around player life-loss and respawn in `GameScene`.

High-risk moment in current flow combines multiple bursty operations in a short window:

- death animation + explosion particles + camera shake,
- immediate hazard cleanup and gameplay lock,
- a delayed forced scene pause,
- a later resume plus respawn spawn-state restoration.

The hitch likely comes from a stack of short CPU / render spikes plus timing boundary effects, not one single catastrophic call.

## Key local findings (hotspot inspection)

### 1) `GameSceneFlowController` mixes Phaser clock and browser timers during respawn

File: `src/scenes/gameScene/GameSceneFlowController.ts`

- Respawn uses both `scene.time.delayedCall(...)` and `setTimeout(...)` watchdogs.
  - `pendingRespawn` at 1000 ms (Phaser timer)
  - `pendingRespawnFreeze` at 240 ms (Phaser timer) -> calls `scene.pause()`
  - `respawnWatchdog` at 1250 ms (browser timer) -> calls `completeRespawnTransition(...)`
- Because Phaser timers are scene-clock-driven, pausing the scene freezes them; browser `setTimeout` keeps running.
- Current design appears to rely on that behavior to finish respawn while paused, then force `scene.resume()`.

Risk: this cross-clock handoff can fire transition work off the normal scene clock cadence and produce resume-frame churn.

### 2) Death cue performs a high-intensity burst effect right before transition logic

Files:

- `src/scenes/GameScene.ts`
- `src/systems/EffectsManager.ts`

On player death (`GameScene.playPlayerDeathCue`):

- `effectsManager.createExplosion(x, y, 2.2)`
- `audioManager.playExplosion(1.4)`

At intensity `2.2`, `EffectsManager.createExplosion` does all of:

- updates explosion emitter config (`updateConfig(...)`) on call,
- explodes ~44 explosion particles,
- explodes ~17 debris particles,
- camera shake for ~220 ms at intensity `0.011`.

This is a concentrated render + particle + camera FX burst at the exact moment gameplay state transitions begin.

### 3) Scene pause/resume is used as part of normal respawn mechanics

Files:

- `src/scenes/GameScene.ts`
- `src/scenes/gameScene/GameSceneFlowController.ts`

The flow context wires:

- `pauseScene: () => this.scene.pause()`
- `resumeScene: () => this.scene.resume()`

The respawn process deliberately pauses and resumes the current gameplay scene to create a freeze effect.

Risk: pausing the whole scene can cause broader subsystem churn than necessary (timers, animation/tween clocks, update scheduling), increasing hitch probability on low-end devices.

### 4) Camera flash/shake is layered in multiple combat paths

File: `src/scenes/GameScene.ts`

- Fatal hit path flashes camera.
- Death explosion path shakes camera.
- Other combat/boss paths also shake/flash camera.

While not necessarily wrong, additive FX activity around death can compound frame-time spikes.

## External findings (Phaser guidance)

### Particle / explosion spike relevance

1. Phaser News - Game Object Pools Tutorial (official):
   - URL: https://phaser.io/news/2021/04/game-object-pools-tutorial
   - Key guidance: avoid repeated allocations in hot loops; pooling reduces frame drops from allocation + GC pressure.

2. Phaser Dev Log 144 (official historical engine notes):
   - URL: https://phaser.io/devlogs/144
   - Key guidance: grouping emitters and batching by texture reduces draw-call flushes; fewer top-level emitter objects lowers management overhead.

### Camera shake / effect cost relevance

3. Phaser Camera Shake API docs:
   - URL: https://docs.phaser.io/api-documentation/class/cameras-scene2d-effects-shake
   - Key guidance: shake effect updates every frame for duration; optional callback is also per-frame. Keep shake usage lean and avoid extra per-frame callback work during intense events.

4. Phaser Camera API docs (`shake`, `flash`, per-frame callbacks):
   - URL: https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera
   - Key guidance: camera FX callbacks are frame-driven; stacked camera FX can add per-frame overhead if overused at peak moments.

### Scene pause/resume and timing model relevance

5. Phaser Scene Events docs:
   - URL: https://docs.phaser.io/api-documentation/namespace/scenes-events
   - Key guidance: `pause`, `resume`, `shutdown`, and `destroy` have distinct lifecycle semantics. Pause is a systems-level state shift, not a lightweight visual freeze primitive.

6. Phaser TimerEvent docs (v3.88.2):
   - URL: https://docs.phaser.io/api-documentation/3.88.2/class/time-timerevent
   - Key guidance: `TimerEvent` is managed by Scene Clock and pauses when its clock pauses.

7. Phaser Timeline docs:
   - URL: https://docs.phaser.io/api-documentation/class/time-timeline
   - Key guidance: scene-level timeline/time systems pause with the scene. Scene time is coherent; mixing with external clocks can create timing divergence.

### Ref MCP usage note

- Ref MCP search/read was used during this research pass; available Phaser results in this environment were sparse and mostly pointed to repository readme anchors, e.g. https://github.com/phaserjs/phaser/blob/master/README.md?plain=1#L55#using-phaser-from-a-cdn
- Actionable lifecycle and timing details above therefore came from Exa-fetched Phaser API documentation pages.

## Likely root cause ranking (most to least likely)

1. Mixed timer domains in respawn (`scene.time.delayedCall` + `setTimeout`) combined with explicit `scene.pause()/resume()`.
   - Why likely: directly creates cross-clock behavior during critical transition window and can resume with concentrated catch-up work.

2. Peak FX burst at death (high-intensity explosion + debris + camera shake in same beat).
   - Why likely: known spike profile for frame-time outliers; happens exactly where hitch is perceived.

3. Whole-scene pause/resume used to produce freeze effect.
   - Why likely: broader lifecycle churn than needed; affects multiple managers/timers at once.

4. Repeated emitter `updateConfig(...)` at explosion time.
   - Why likely: lower impact than the above, but still extra config churn in an already heavy frame.

## Recommended minimal-risk fix direction

Keep gameplay behavior and visuals mostly intact, but remove timing divergence first.

1. Make respawn transition single-clock:
   - Replace browser watchdog `setTimeout` with Phaser-time-based guard that does not depend on paused scene clock.
   - Prefer not pausing the scene; use gameplay lock + player visibility/immobility gating to emulate freeze.
   - If pause must remain, pause only targeted systems (e.g. inputs/spawns/colliders) instead of full scene pause.

2. Reduce death FX burst cost with conservative caps:
   - Lower player-death explosion visual intensity (or cap emitted counts specifically for player death).
   - Keep shake short and low intensity; avoid extra FX callbacks.

3. Remove avoidable per-event config churn:
   - Precompute/cached emitter configs for common intensities (e.g. player death, boss death) instead of rebuilding every call.

4. Validate with frame-time instrumentation around death window:
   - Capture frame time from ~200 ms before death to ~1500 ms after, compare p95/p99 before and after timer unification.

This path is minimal-risk because it focuses first on timing-model consistency (highest confidence), then applies small, bounded FX budget trims without changing core gameplay rules.
