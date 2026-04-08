## Level Design Research Notes (April 2026)

This note captures research findings used to improve current campaign levels and add level-design guardrails.

### Sources reviewed

- MDA: A Formal Approach to Game Design and Game Research (Hunicke, LeBlanc, Zubek)
- GameDeveloper: *The Art and Science of Pacing and Sequencing Combat Encounters*
- GameDeveloper: *Enemy Attacks and Telegraphing*
- GameDeveloper: *Designing smart, meaningful SHMUPs*
- SHMUP Creator: *Gameplay best practices*
- Valve: *The AI Systems of Left 4 Dead* (adaptive dramatic pacing)

### Practical takeaways

1. **Design from target feeling backwards (MDA)**
   - Pick intended player feeling first (clarity, pressure, relief), then tune mechanics and pacing to support it.

2. **Use explicit peaks and valleys**
   - Encounters are more engaging when intensity rises, briefly releases, then rises again.
   - Constant high pressure causes fatigue; constant low pressure causes boredom.

3. **Telegraph before threat**
   - Dangerous moments should provide readable anticipation (timing windows, clearer cadence, non-ambiguous intent).
   - Difficulty should come from execution and overlap, not confusion.

4. **Build level identity through a recurring motif**
   - Start each level with a manageable version of its core idea, then iterate with twists.
   - Avoid introducing too many new pressures in one section.

5. **Always preserve survivable space and readability in SHMUPs**
   - Keep hazards and projectile pressure readable against background and rhythm.
   - Avoid unfair spikes from cadence or simultaneous high-pressure layers.

6. **Adapt pacing frequency, not only amplitude**
   - Borrowing from L4D: alternating high/low pressure windows can improve dramatic shape without flattening challenge.

### Translation into this codebase

- Use section-level knobs that already exist:
  - `musicIntensity`, `spawnRateMultiplier`, `asteroidInterval`, `hazardEvents[*].cadenceMs/intensity`
  - `tensionArc` and `vatTarget` to influence intensity contour over section progress.
- Add validator warnings for pacing anti-patterns:
  - missing recovery section near level end,
  - weak section-level music intensity climb,
  - abrupt cadence/intensity jumps,
  - early-level hazard cadence that is too fast for readability.
- Retune core campaign sections so each level better follows:
  - intro (learn/read) -> build (recognize) -> hazard/climax (execute) -> release/boss-approach (recover/anticipate).
