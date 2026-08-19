# Crossfire visual pilot evidence

Run the focused desktop and mobile comparison with:

```sh
VISUAL_SCREENSHOT_DIR=tests/e2e/visual-evidence bunx playwright test tests/e2e/visual.evidence.spec.ts tests/e2e/smoke.spec.ts --grep "crossfire telegraph glow"
```

The `crossfire-baseline-*` images show the authored Prism Crossfire state with
the pilot Glow disabled. The matching `crossfire-pilot-*` images show the same
paused state with the Glow enabled. The test also compares 90 synchronized
WebGL render samples per state and rejects an average increase above 1 ms or a
95th-percentile increase above 2 ms per frame.

`render-cost.json` records the observed desktop and mobile measurements from
the retained comparison run.
