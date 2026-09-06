# Direct retry

GameOver now offers Retry and Menu. Retry starts level 1 with the same state reset as New Run on the command deck. The shared `startFreshRun` action resets PlayerState and the terminal summary, then prepares the level's assets before starting Game. Checkpoint loading uses `startPreparedRun` so saved state remains intact.

Enter or R retries. Escape or M opens the command deck. Held Space, repeated key events, and taps outside the buttons do not start a run. A focused native button owns Enter and Space, so Enter on Menu cannot trigger Retry. Painted buttons and the existing accessible action layer share one transition guard. The scene blocks resize restarts during a queued transition, removes keyboard and terminal action bindings on shutdown or destruction, and ignores stale asset-ready callbacks.

The result screen shows score and level reached. Its next goal is to beat the previous score, or clear the reached level when the score is zero. This uses existing run data. It adds no score rules or stored progression.

The 2.5-second score chain still expires during authored Recovery Beats. This screen does not describe that expiry as a mistake. Encounter tuning and later human observation should establish whether score pursuit creates pressure to abandon a useful recovery position before considering a separate scoring change.

## Validation

The focused unit suites cover fresh state, saved-state continuation, delayed asset callbacks after shutdown/destruction, duplicate readiness callbacks, Menu's existing setup, and button geometry at 390×844, 844×390, 320×568, and 568×320. Browser scenarios are in `tests/e2e/directRetry.spec.ts`.

The browser suite loads a scored, upgraded checkpoint with one reserve, injects fatal damage while Space stays held, retries, and reads the new persisted state through the existing recorder. It checks unchanged checkpoint/settings storage, semantic and painted actions, fresh shortcut keys, pointer exclusion, orientation changes, and ten repeated retries.

Root owns full-suite registration and combined performance gates. Human replay preference and physical touch testing remain follow-up work. Scripted retries do not demonstrate voluntary replay.

## Layout comparison

Compared paired and stacked buttons in the running Phaser scene at 390×844 and 844×390. Selected stacked buttons for portrait and paired buttons for landscape. At 390px wide, stacking increases each action from 149px to 310px and separates their rows by 12px. At 844×390, pairing keeps 30px vertical margins; the stacked alternative leaves 12px. Both alternatives fit, but the selected arrangement gives narrow screens larger targets and short screens more breathing room. This is an implementation judgment, not a measured player preference.

The four screenshots and scene snapshots are in `output/direct-retry/{selected,alternate}-{390x844,844x390}.{png,json}`. Temporary alternatives were removed from runtime code.

## Executed checks

- `bun test tests/startRun.test.ts`: four passed.
- `bun test tests/MenuScene.test.ts`: nine passed.
- `bun test tests/gameOverLayout.test.ts`: four passed.
- Typecheck, focused ESLint/Prettier, architecture check, and diff check passed.
- Eight browser cases passed across desktop and mobile in 2.4 minutes. The enhanced ten-retry test then passed on both profiles in 51.8 seconds, including stable window-keydown listener counts after the first retry. Its recorder JSON is under `output/direct-retry/retry-{desktop,mobile}/ten-retry-segments.json`.

Browser execution used a temporary Playwright configuration selecting this suite, desktop 1280×720, touch 844×390, one worker, and Vite port 4185. The resize scenario also verified 390×844. Root registers the committed suite with the normal projects for integrated reruns.

The listener test first compared against startup and saw a decrease from three listeners to two on the first keyboard activation. It now establishes the post-first-retry baseline and checks nine further cycles for growth. No runtime change was needed for that test correction.

## Preserve native actions after gameplay

An actual Game-to-Intermission check exposed two input ownership defects. Enter on Buy Weapons also purchased the canvas-selected Hull upgrade. After guarding the intermission controller, native Space still failed because Phaser retained its global gameplay key capture.

The accessible action layer now keeps Enter, Space, and Tab at the native navigation boundary without preventing their browser defaults. Escape, R, and M remain available to scene shortcuts. The intermission controller also rejects queued native-origin upgrade input and retains Escape continuation from a focused button.

Both defects have failing-before regressions. Fifteen focused unit tests and six desktop/mobile accessible-action cases pass. The browser check verifies one 800-credit Weapons purchase, one 500-credit Hull purchase, native Tab navigation, and continuation to level 2 with exactly the resulting credits and upgrades. It starts gameplay before staging intermission so inherited global key capture is exercised.
