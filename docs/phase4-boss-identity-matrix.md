## Phase 4 Boss Identity Matrix (Levels 4-10)

Goal: make each boss fight feel distinct through cadence, motion profile, phase-shift intensity, and projectile grammar.

### L4 — Marshal Bront (`pressure`)
- **Identity:** Tactical pincer commander.
- **Phase feel:** Tight spread feints in phase 1, faster pressure spirals in phase 2.
- **Key levers:** moderate cooldowns, narrow spread arcs, high phase-2 cadence bump.

### L5 — Pyre Leviathan (`maelstrom`)
- **Identity:** Volcanic overrun.
- **Phase feel:** Slow heat-up barrages, then dense dual-spiral ignition flood.
- **Key levers:** stronger phase transition delta, higher spiral shot count/turn rate, hotter bullet speed scale.

### L6 — Reliquary Crown (`carrier`)
- **Identity:** Escort-command carrier.
- **Phase feel:** Structured escort pressure in phase 1, mixed spiral + arc command in phase 2.
- **Key levers:** slightly slower baseline cadence but persistent summon windows and stable control movement.

### L7 — Archivist Shade (`pursuit`)
- **Identity:** Tracking hunter.
- **Phase feel:** Aim-led pursuit volleys escalate into snap bursts with chase corrections.
- **Key levers:** faster movement and phase-2 cooldown, tighter aimed spread with sharper bullet speed gain.

### L8 — Orbital Cantor (`bulwark`)
- **Identity:** Rotating bastion.
- **Phase feel:** Defensive spread lattice, then denser rotary spokes during shield windows.
- **Key levers:** larger spoke density, measured cadence, strong phase-2 rotational identity.

### L9 — Rift Basilisk (`pursuit`)
- **Identity:** Apex predator.
- **Phase feel:** Aggressive tracking from phase 1, then lockjaw burst pursuit in phase 2.
- **Key levers:** high move speed, shortened phase-2 cooldown, elevated aimed burst speed.

### L10 — Axiom Null (`bulwark`)
- **Identity:** Final sovereign artillery engine.
- **Phase feel:** Deliberate oppressive setup, then maximal rotary convergence in phase 2.
- **Key levers:** highest spoke density, elevated spiral turn rate and speed scale, shorter endgame cadence.

## Implementation guardrails

- Keep progression monotonic in overall threat (L4 -> L10).
- Differentiate adjacent bosses by at least two dimensions (cadence, movement, spread/spiral grammar).
- Preserve readability: avoid extreme cooldown reductions that collapse telegraph windows.
