# Run the game-feel playtest

Use this protocol before selecting movement or encounter changes. Automated tests verify mechanics. These sessions examine comprehension, frustration, and voluntary play.

## Prepare a session

1. Record the build SHA, participant code, prior shooter experience, physical device, browser, viewport, difficulty, quality, and starting loadout.
2. Obtain consent for recording and agree when recordings will be deleted. Keep participant names outside the game export.
3. Start with six fresh target players. Test six regular shooter players as a separate cohort. Record the device counts within each cohort.
4. Allow 20 to 30 minutes per participant and reserve five minutes for free choice. Include keyboard, physical phone portrait, and physical phone landscape.
5. Use the same build and settings within a comparison. Counterbalance prototype order for returning testers. Use fresh participants to check first-time understanding.
6. Open the development build with `?browserHarness=1`. Start local diagnostics before NEW RUN. Keep facilitator notes and video timestamps beside the exported samples.

## Record a local capture

The recorder exists only in development builds opened with `?browserHarness=1`. Start the development server with `bun run dev`, then use the browser console before handing the game to the participant.

```js
const recorder = window.__SPACE_EXPLORER_BROWSER_HARNESS__.gameFeel;
recorder.start({
  scenario: 'fresh-03-first-encounter',
  buildSha: 'REPLACE_WITH_THE_CHECKED_OUT_GIT_SHA',
  source: 'human',
  deviceLabel: 'REPLACE_WITH_PHYSICAL_DEVICE_AND_INPUT',
});
```

Replace both placeholders. Use `source: 'automation'` for scripted sessions. The recorder labels those fields as caller-supplied and does not independently verify the participant or device.

Use `recorder.stop()` at the end of a capture. It returns a plain JSON object. In Chromium DevTools, `copy(JSON.stringify(recorder.read(), null, 2))` copies the export for saving alongside the recording and facilitator notes. Export before calling `recorder.clear()` or starting another stopped recording.

The default capture stops at 36000 gameplay frames, 8000 events, or 10 minutes, whichever comes first. It preserves the beginning and reports why it stopped. A high-refresh device can reach the frame cap sooner. Capture a long playtest as named segments and record any gap between them.

An optional limit can reduce a capture, such as `maxFrames: 600` for a short check. Upper bounds are 120000 frames, 20000 events, and 30 minutes. Raising a bound increases memory use. This is an in-memory recorder; reloading the page loses unexported data.

The export distinguishes raw browser input deliveries from applied acceleration and body movement. A changed `lastFireGameplayMs` records the firing path's attempt, not proof that a projectile left a saturated pool. Use the video and visible bullet state for that claim.

Gameplay time excludes the game's paused or locked updates. Wall time still advances. Manual pause, physics pause, and flow lock are separate fields. Scene segment ids identify observed scene lifecycles; they do not automatically identify voluntary new runs.

Sparse occupancy samples describe enabled physics bodies. They include friendly objects and pickups as well as threats. Use texture keys and video to interpret them. An object count alone is not a measure of pressure, boredom, or encounter fairness.

## Observe the first session

Say, "Play the game as you normally would. You can stop whenever you want."

Do not explain controls or point out hazards before the player encounters them. Record any assistance you provide. Let the player concentrate during combat and ask questions during a natural break.

Record these observations.

| Observation | Evidence |
| --- | --- |
| First movement and firing | Video timestamp, delivered input, first observed simulation response |
| Intended lane change and stopping | Player position, release position, stopped position, overshoot, facilitator intervention |
| First hit | Hull and shield values, participant explanation, unknown cause when the event has none |
| First death | Per-life death timestamp, visible threat, explanation before showing the recording |
| First retry | Explicit new-run action, checkpoint load, or automatic reserve respawn recorded separately |
| Quiet or confusing stretch | Section and timestamp, what the player was trying to do, whether they anticipated the next threat |
| Difficulty | Arrival resources, repeated failure location, described avoidance action |
| Stopping | Voluntary stop, session time limit, interruption, or facilitator instruction |

Ask neutral questions after a natural break.

- What were you trying to do there?
- What do you think happened when you took damage?
- What would you try differently next time?
- Was there a point where you were waiting for something? What were you expecting?

Do not ask whether the controls are "more responsive" or whether the new version is "better."

## Check the three pilot levels

Use Aurora Threshold for onboarding, movement, aiming, and its Blue Quiet release. Use Ember Monsoon for recovery before the first boss. Use Debris Gauntlet for the flare introduction, lattice and cover, and later overlap.

Give later-level participants the information and resources they would have earned by that point. Label development level jumps as isolated encounter tests. Do not present them as full campaign experience.

Capture at least three spawn samples per compared encounter. Input recordings alone cannot reproduce random enemy or beam placement. Compare matched tasks and loadouts unless all relevant random inputs are controlled and verified.

## Observe voluntary continuation

At the end of the required task, say, "The required part is finished. You have five minutes to use as you like. You can keep playing, stop, or talk about the session."

Record whether the participant deliberately starts a new run and how long they continue. Do not ask them to retry. Exclude participants who lack time to choose from the denominator and state the reason. Count reserve respawns, checkpoint loads, and required test retries separately.

| Participant code | Cohort and device | Eligible to choose | Deliberate new run | Continued time | Stopping reason |
| --- | --- | --- | --- | --- | --- |
| Fill during the session | | | | | |

Small samples find problems. They do not establish a population retention rate. Report counts and denominators rather than an unsupported claim of statistical improvement.

## Decide the next experiment

1. List the three most common barriers with timestamps, affected participants, and severity.
2. Separate control response, aiming expectations, unreadable damage, hazard overlap, and deliberate recovery.
3. Record the proposed response target and measurement method before changing values.
4. Keep the human baseline gate open until actual sessions provide these findings. Missing participants never count as a pass.
5. Repeat with fresh players after the change. Preserve failures and missing observations in the report.

The provisional later-phase gates in the implementation plan are iteration rules, not published industry standards. Four of six eligible players choosing another run is a reason to test again with another cohort, not a retention claim.
