# Performance

How the game is measured, what the numbers were, and which guardrails keep them there.

## Guardrails

- `tests/e2e/renderBudget.spec.ts` fails if a busy fight draws more than 55 times in one frame or compiles a shader during play. See "Draw-call budget" in `architecture-guidelines.md` for the rules behind it.
- `RuntimePerformanceBudget` (on the Auto quality tier) steps effects down (fewer particles and trails, no glow) when at least 12% of the frames in a 120-frame window take longer than 22 ms, and steps back up after four windows at 2.5% or less. Gaps over 250 ms (tab switches, debugger pauses) are ignored.
- The canvas renders at 1× CSS pixels on every screen. A phone with a 3× display fills a 390×844 canvas, not 1170×2532, so fill rate stays low without a separate resolution setting.

## Measuring

```bash
bun run perf:profile -- --level 9 --seconds 60          # desktop 1280×720
bun run perf:profile -- --level 9 --phone --throttle 4  # 390×844 at 3×, CPU slowed 4×
```

The profiler starts its own dev server and plays the sector with autofire on. Per 5-second window it prints frames over 20 ms and 33 ms, the longest frame, draw calls, and the current effects step (0 is full effects). It runs headed, so frame times come from the real GPU. CPU throttling slows JavaScript but not the GPU, so it approximates a phone's CPU, not its graphics.

The dev server compiles modules on first use, so the first 5 seconds of a profile include hitches that a production build does not have.

## Results (2026-11-12, Apple M4, Chrome)

| Profile | Sector | Frames over 20 ms | Over 33 ms | Effects step |
| --- | --- | --- | --- | --- |
| Desktop 1280×720 | 9 | 1 of 1,500 (0.07%) | 0 | 0 |
| Phone, CPU ×4 | 1 | 8 of 2,983 (0.27%), all in the first 5 s | 4 | 0 |
| Phone, CPU ×4 | 9 | 12 of 2,979 (0.40%), all in the first 10 s | 5 | 0 |
| Phone, CPU ×10 | 9 | 63 of 1,906 (3.3%) | 11, all in the first 5 s | 0 |
| Production build, phone, CPU ×4 | 1 (40 s from NEW RUN) | 2 of 4,001 | 1 | n/a |

On the production build the only slow frame is the one that creates the game scene after NEW RUN (89 ms at CPU ×4, 30 ms unthrottled), while the screen changes scenes. At CPU ×10 the profiler's effects column stayed at 0 in every 5-second window, so no 120-frame window reached the 12% threshold.

Not measured yet: a real phone GPU. Run the game on a mid-range Android phone through Chrome remote debugging (`chrome://inspect`) and compare with the table above before tuning for phones.
