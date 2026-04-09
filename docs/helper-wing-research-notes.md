## Helper wing implementation research (Phaser 4 / Arcade)

Date: 2026-04-09

### Goal

Design a low-risk helper-wing assist for late, boss-heavy levels that fits the current architecture:

- TypeScript Phaser 4 project
- Arcade Physics groups and overlap callbacks
- Event-driven GameScene ↔ HUD signaling

### Sources consulted (Exa + Ref)

- Phaser docs: Arcade Group API
  - https://docs.phaser.io/api-documentation/class/physics-arcade-group
- Phaser docs: Arcade Collider API
  - https://docs.phaser.io/api-documentation/class/physics-arcade-collider
- Phaser docs: Arcade Physics concepts
  - https://docs.phaser.io/phaser/concepts/physics/arcade
- Phaser docs: Arcade Physics plugin API (`moveTo`, `moveToObject`, `overlap`)
  - https://docs.phaser.io/api-documentation/class/physics-arcade-arcadephysics
- Phaser EventEmitter API
  - https://newdocs.phaser.io/docs/3.55.2/Phaser.Events.EventEmitter
- Ref lookup to canonical docs path from Phaser README
  - https://github.com/phaserjs/phaser/blob/master/README.md?plain=1#L83#api-documentation

### Key findings

1. **Use pooled physics groups for helper ships**
   - Phaser Arcade Group is explicitly intended for homogeneous physics objects and pooling-like reuse.
   - This matches existing project patterns (`BulletPool`, `EnemyPool`) and avoids frequent create/destroy spikes.

2. **Use explicit overlap/collider callbacks for helper damage interactions**
   - Arcade overlap/collider callbacks are the intended integration point for group-vs-group and sprite-vs-group interactions.
   - Best fit for helper-vs-enemy bullets/bombs/enemies without refactoring core collision architecture.

3. **Avoid relying on `moveToObject` for companion following**
   - `moveTo` / `moveToObject` do not continuously re-target and do not auto-stop on arrival.
   - For companion ships that should stay in formation around a moving player, a per-frame follow steering/smoothing loop is more deterministic.

4. **Keep gameplay-to-HUD communication event-driven**
   - Phaser scene emitters (`on/off/emit`) are first-class and align with the current `GAME_SCENE_EVENTS` approach.
   - Helper-wing state transitions (activated/depleted) should emit scene events that HUD can present as announcements.

### Architecture decision for this repository

- Add a dedicated `LastLifeHelperWing` runtime system to own:
  - helper spawn/activation rules,
  - follow/fire update loop,
  - helper life depletion,
  - helper collision overlap wiring.
- Add a small `HelperShip` entity class (pooled via Arcade Group).
- Reuse `BulletPool` for helper projectiles so enemy-hit and damage routing stays unchanged.
- Gate feature with **level config opt-in** and trigger only at **remainingLives === 1**.
- Emit helper-wing lifecycle events and let `GameScene` + `HUD` handle presentation feedback.

### Risk controls

- Keep feature opt-in for selected late levels only.
- Keep damage/collision behavior additive and isolated to helper system.
- Avoid broad rewrites to `CollisionManager` or player death flow unless necessary.
