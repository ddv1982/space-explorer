# v2 Phase 0 playtest

Phase 0 ends when the user has played the preview build and approved the feel and look. Results below are filled in from that playtest; nothing here is measured yet.

## What to try

Play Level 1 (Aurora Threshold) on the preview deployment:

1. **Desktop, keyboard.** Arrows/WASD and Space. Strafe left and right, then let go.
2. **Phone, portrait.** Drag anywhere; the ship follows your finger's movement and fires on its own.
3. **Phone, landscape.** Same as portrait.
4. **Comparison.** The live site (space-explorer.net) still runs v1 for comparing against the old dead-stop handling.

## Questions

- Does the ship feel like flying: too floaty, too stiff, or right? (Wind-up when starting, glide when letting go, banking.)
- Does touch drag feel direct enough?
- Do the new player ship and Fighter look right next to each other, and do explosions visibly light nearby ships?
- Is it smooth on your phone? Which quality tier is selected (Settings)?

## Results

| Item | Result |
| --- | --- |
| Flight feel (desktop) | Too precise in 1.21.0; restored v1.19 handling in 1.22.0 |
| Touch drag (portrait / landscape) | _pending_ |
| Ship look and lighting | _pending_ |
| Phone model, tier, smoothness | _pending_ |
| Tuned `FLIGHT_CONFIG` values | 1.22.0: thrust 800 px/s², drag 400 px/s², max 800 px/s, bank response 120 ms |

If Standard is not smooth on the phone, Auto's touch default drops to Low (baked look) and real-device optimisation moves to Phase 6.
