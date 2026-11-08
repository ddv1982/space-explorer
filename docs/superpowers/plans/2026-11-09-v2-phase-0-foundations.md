# Space Explorer v2, Phase 0 (Foundations and proof): implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the v2 foundations in the real game.
- A ship flown with momentum on keyboard and touch drag, with autofire.
- The player ship and the Fighter rendered from code-built 3D models into bank-frame sprite sheets with normal maps.
- Those sprites lit in-game by dynamic lights and bloom, within a per-tier performance budget.
- A preview deploy the user plays on their phone.

**Architecture:**
- **Shipyard (build time).** A script under `scripts/shipyard/` builds three.js models in code. It renders them headless in Playwright's Chromium into albedo and normal sprite sheets, then writes WebP files to `public/assets/v2/`. The rendered sheets are committed. three.js is a devDependency only.
- **Flight model (runtime).** A pure, frame-rate-independent module turns a desired velocity into actual velocity and bank angle. `Player` applies it to its Arcade body.
- **Lighting (runtime).** A per-scene `LightingRig` owns Phaser lights and bloom, with budgets taken from the visual quality profile.

**Tech Stack:** Phaser 4.2.1 (WebGL lighting, filters, `Phaser.Actions.AddEffectBloom`), TypeScript 7, Vite, Bun test, Playwright 1.62, three.js (devDependency), `cwebp`.

**Spec:** `docs/superpowers/specs/2026-11-09-space-explorer-overhaul-design.md`

## Global Constraints

- **Branching:** all v2 work happens on the long-lived branch `v2` (created from `main` in Task 1). Phase work merges into `v2`. `main` stays as v1 until the v2.0.0 release.
- **Comparison toggle:** `?flight=legacy` restores v1 movement and the v1 joystick, in **all** builds on `v2`, until Phase 5 removes it. The default is the new momentum flight.
- **Quality gates must pass** at the end of every task: `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run test`, `bun run knip`, `bun run architecture:check`, `bun run build`, `bun run bundle:check`.
- **Bundle limits are unchanged:** app JS 475 KB, total JS 1.9 MB, 3.5 MB per asset, 30 MB total. three.js must never appear in `dist/`.
- **Logical sprite sizes and Arcade bodies are unchanged in Phase 0.** Player is 36×44 with a 24×32 body; Fighter is 36×36. v2 sheets are authored at 4× density (`CINEMATIC_DENSITY`).
- **Performance target:**
  - 60 fps on Standard on a mid-range phone (about 2021 class).
  - High holds 60 fps on desktop integrated graphics.
  - Headless Chromium renders in software and can't qualify GPU cost. It is a regression baseline only.
- **Kept behaviour:**
  - Pause freezes gameplay clocks.
  - Both touch orientations stay playable, with no rotate block.
  - Reduced motion is respected.
  - The difficulty setting changes forgiveness only.
- **Look:** cinematic, lit, metal panels and glowing engines. The albedo carries baked key lighting from the upper left, so the Low tier (no dynamic lights) still looks the same.
- Attribution lines on every commit, per repo instructions.

## Review Focus

1. **Frame-rate independence.** The same input gives the same glide distance and stop time at 30, 60 and 120 fps. *Owned by Task 1.*
2. **Pause and resume.** A zero or paused delta changes nothing, and resuming doesn't cause a velocity jump. *Owned by Task 2 (player) and Task 6 (light pulses).*
3. **Lifting a finger and touching again.** A new touch re-anchors without the ship jumping toward the new finger position. A second finger on the pause button never steers the ship. *Owned by Task 3.*
4. **Death and respawn.** Velocity, bank angle and the drag anchor reset on respawn, so the new ship never inherits the old ship's glide. *Owned by Task 2 and Task 3.*
5. **Rotation or resize mid-drag.** The drag target is clamped to the new world bounds, and the ship never ends up off-screen. *Owned by Task 3.*

---

### Task 1: Branch, and the momentum flight model

**Files:**
- Create: `src/systems/flight/flightModel.ts`
- Create: `src/config/flightConfig.ts`
- Test: `tests/flightModel.test.ts`

**Interfaces:**
- Produces:
  - `interface FlightState { vx: number; vy: number; bank: number }`. `bank` runs from -1 (full left) to 1 (full right).
  - `interface FlightParams { maxSpeed: number; responseMs: number; glideMs: number; bankResponseMs: number }`
  - `const FLIGHT_CONFIG: FlightParams = { maxSpeed: 480, responseMs: 70, glideMs: 110, bankResponseMs: 90 }`. These are starting values to be tuned with the user in Task 7. `glideMs` is the exponential time constant for slowing down, so 0.3 s to 5% of speed is about `3 × glideMs`.
  - `function stepFlight(state: FlightState, desiredVx: number, desiredVy: number, dtMs: number, params: FlightParams): FlightState`. Pure, and returns a new object.
  - `function keyboardDesiredVelocity(h: -1|0|1, v: -1|0|1, maxSpeed: number): { vx: number; vy: number }`. Diagonals are normalized.

- [ ] **Step 1:** `git switch -c v2` from an up-to-date `main`.
- [ ] **Step 2: Write the failing tests** in `tests/flightModel.test.ts`:
  - `reaches 90% of max speed from rest within 200ms at 60fps`. Step 16.67 ms with desired (480, 0); expect `vx >= 432` after 12 steps, and `vx < 432` after 3 steps (wind-up is visible).
  - `glides to rest instead of stopping dead`. From vx = 480 with desired 0: expect `vx > 120` after 80 ms, and `|vx| < 24` after 350 ms.
  - `is frame-rate independent`. Run 500 ms of acceleration then 500 ms of release at dt 8.33, 16.67 and 33.33. The final `vx` and the integrated distance agree within 2%.
  - `zero or negative or NaN delta returns an equal state`. dt of 0, -5 and NaN each return `toEqual(state)`.
  - `never exceeds maxSpeed in magnitude`. Desired (10000, 10000) for 2 s; expect `hypot(vx, vy) <= 480 + 1e-6`.
  - `bank follows lateral velocity`. Desired vx = 480 for 1 s gives `bank > 0.95`. After release, bank returns below 0.05 within 600 ms. Bank stays within [-1, 1].
  - `keyboardDesiredVelocity normalizes diagonals`. (1, -1) gives magnitude 480.
- [ ] **Step 3:** Run `bun test tests/flightModel.test.ts` and expect FAIL (module not found).
- [ ] **Step 4: Implement** `stepFlight`. Each axis approaches its desired velocity by exponential smoothing, `alpha = 1 - exp(-dt / tau)`. Use `tau = responseMs` when |desired| ≥ |current| on that axis and the signs agree; otherwise use `tau = glideMs`. Then clamp the vector magnitude to `maxSpeed`. Bank approaches `clamp(vx / maxSpeed, -1, 1)` with `bankResponseMs`.
- [ ] **Step 5:** Run `bun test tests/flightModel.test.ts` and expect PASS. Then run the quality gates.
- [ ] **Step 6:** Commit with `feat(flight): add frame-rate independent momentum flight model`.

### Task 2: Player flies on the flight model (keyboard), with the legacy toggle

**Files:**
- Modify: `src/entities/Player.ts` (constructor around lines 36–55, `update` around lines 200–215, `resetSpawnState`)
- Create: `src/config/flightMode.ts`
- Test: `tests/Player.test.ts` (add cases), `tests/flightMode.test.ts`

**Interfaces:**
- Consumes: `stepFlight`, `keyboardDesiredVelocity` and `FLIGHT_CONFIG` from Task 1.
- Produces:
  - `type FlightMode = 'momentum' | 'legacy'`
  - `function getFlightMode(search?: string): FlightMode`. Reads `?flight=` from `window.location.search` and defaults to `'momentum'`. This works in production builds too, so **don't** gate it on `import.meta.env.DEV`.
  - `Player.getBank(): number`, which returns the current bank in [-1, 1].
  - `Player.setDesiredVelocityOverride(v: { vx: number; vy: number } | null): void`, which Task 4 uses for touch drag.

- [ ] **Step 1: Write the failing tests:**
  - `getFlightMode returns legacy only for ?flight=legacy`. `'?flight=legacy'` gives `'legacy'`; `''` and `'?flight=x'` give `'momentum'`.
  - `momentum update sets body velocity from stepFlight and zero acceleration`. Mock Player prototype pattern as in the existing tests. With right held for one 16.67 ms update, expect `setVelocity` called with vx in (0, 480) and `setAcceleration(0, 0)`.
  - `paused update with delta 0 leaves velocity unchanged` (Review Focus 2).
  - `spawn resets flight state and bank to zero` (Review Focus 4). After building up a bank, `spawn()` makes `getBank()` return 0 and the next update starts from vx = 0.
  - `legacy mode keeps v1 acceleration path`. With `getFlightMode` mocked to `'legacy'`, `update` calls `setAcceleration(3200, 0)` for right.
- [ ] **Step 2:** Run `bun test tests/Player.test.ts tests/flightMode.test.ts` and expect FAIL.
- [ ] **Step 3: Implement.**
  - In momentum mode the constructor sets drag to 0 and keeps `setMaxVelocity(480)`.
  - `update` calls `stepFlight` using the delta passed in (already gameplay delta), then calls `setVelocity`.
  - Visual rotation becomes `bank × 12°` (sprite bank frames arrive in Task 5).
  - `isMovingUp` and the exhaust intensity derive from the desired velocity.
  - Legacy mode is the current code path, unchanged.
- [ ] **Step 4:** Run the tests and expect PASS. Then run the quality gates plus `bunx playwright test --project=chromium-desktop -g "player"` (existing player-control e2e). Update only the assertions that pin the v1 stop distance, and only for momentum mode.
- [ ] **Step 5:** Commit with `feat(flight): fly the player on momentum model with ?flight=legacy toggle`.

### Task 3: Touch relative drag with autofire

**Files:**
- Create: `src/systems/input/relativeDrag.ts` (pure)
- Create: `src/systems/TouchDragControls.ts` (Phaser-facing; owns the pause button, which moves out of `MobileControls`)
- Modify: `src/systems/InputManager.ts`. In momentum mode on touch devices, use `TouchDragControls` instead of `MobileControls`. `isFiring()` returns true while in touch mode and gameplay is active (autofire).
- Modify: the scene wiring in `src/scenes/gameScene/createInputAndPlayer.ts` to construct the right control class from `getFlightMode()`.
- Test: `tests/relativeDrag.test.ts`, `tests/InputManager.test.ts` (add cases)

**Interfaces:**
- Consumes: `getFlightMode`, `Player.setDesiredVelocityOverride`, `FLIGHT_CONFIG.maxSpeed`.
- Produces:
  - `interface DragState { pointerId: number | null; fingerStartX: number; fingerStartY: number; shipStartX: number; shipStartY: number }`
  - `function beginDrag(pointerId, fingerX, fingerY, shipX, shipY): DragState`
  - `function dragTarget(state: DragState, fingerX: number, fingerY: number, bounds: { left: number; top: number; right: number; bottom: number }): { x: number; y: number }`. Returns `shipStart + (finger - fingerStart)`, clamped to the bounds.
  - `function dragDesiredVelocity(shipX, shipY, targetX, targetY, maxSpeed: number, followMs = 60): { vx: number; vy: number }`. Returns `(target - ship) / (followMs / 1000)`, clamped to maxSpeed, and zero within 1 px.
  - `TouchDragControls` with `create(scene, getShip: () => { x: number; y: number })`, `getDesiredVelocity(out): { vx; vy } | null` (null when no drag is active), `isControlPointer(pointer): boolean`, `setPauseHandler(fn)`, `setBlocked(b)`, `destroy()`, matching the `MobileControls` lifecycle the scene already calls.

- [ ] **Step 1: Write the failing tests** in `tests/relativeDrag.test.ts`:
  - `dragTarget moves ship by finger delta, not to finger`. Start finger (300, 600) and ship (200, 700); finger at (320, 580) gives (220, 680).
  - `re-touch re-anchors without jump` (Review Focus 3). End the drag, then `beginDrag` at finger (50, 50) with the ship at (220, 680). `dragTarget` at the same finger position gives (220, 680).
  - `target is clamped to bounds after resize` (Review Focus 5). With bounds shrunk to right = 390, a target that was 600 clamps to 390.
  - `dragDesiredVelocity clamps to maxSpeed and is zero within 1px`.
- [ ] **Step 2: Write the failing tests** in `tests/InputManager.test.ts`:
  - `touch momentum mode autofires while gameplay active`.
  - `pause-button pointer never starts a drag` (Review Focus 3). A pointer down inside the pause hit area leaves `getDesiredVelocity` as null.
  - `second finger while dragging is ignored for steering`.
  - `respawn clears drag anchor` (Review Focus 4). Call `TouchDragControls.reset()` from the scene's respawn path; the next pointer move without a pointer down yields null.
- [ ] **Step 3:** Run the tests and expect FAIL.
- [ ] **Step 4: Implement.**
  - The first pointer down anywhere outside the pause button begins a drag.
  - Each frame, the scene passes `getDesiredVelocity()` to `player.setDesiredVelocityOverride()`. When it is null, the player uses keyboard intent.
  - On viewport resize, re-clamp using `getViewportBounds`.
  - Hardware-keyboard detection keeps working: the first keypress hides touch UI as today.
- [ ] **Step 5:** Run the unit tests and the gates, then `bunx playwright test --project=chromium-mobile`. Rewrite only the joystick-specific e2e assertions so they run under `?flight=legacy`, and add one e2e, `drag moves ship relative to finger in portrait`, using `page.touchscreen` / CDP touch events at 390×844.
- [ ] **Step 6:** Commit with `feat(input): relative touch drag with autofire for momentum flight`.

### Task 4: Shipyard, a code-built 3D model rendered to albedo and normal sheets

**Files:**
- Modify: `package.json`. Add the devDependency `three` (latest stable at execution time, exact version pinned) and `@types/three`. Add the script `"art:shipyard": "bun scripts/shipyard/renderShips.ts"`.
- Create: `scripts/shipyard/sheetLayout.ts` (pure)
- Create: `scripts/shipyard/models/materials.ts`. Shared PBR materials: titanium `#485460`, ceramic `#c4ccd2`, recess `#101a27`, edge `#e0e5e8`, plus emissive engine materials per faction (player cyan, enemy red-orange).
- Create: `scripts/shipyard/models/playerShip.ts`, `scripts/shipyard/models/fighter.ts`. Each exports `build(): THREE.Group`, with the nose pointing to -Y in screen space when viewed from the top.
- Create: `scripts/shipyard/renderPage.ts`. Bundled with `bun build --target=browser` and runs inside Chromium. Exposes `window.renderShipSheet(spec): Promise<{ albedo: string; normal: string }>` (PNG data URLs).
- Create: `scripts/shipyard/renderShips.ts`. A Bun CLI that launches Playwright Chromium, injects the bundle, renders each ship, writes PNGs to `assets/source/v2/`, then runs `cwebp -q 90 -alpha_q 100` into `public/assets/v2/<file>.webp` and `<file>_n.webp` (normal maps use `-lossless`).
- Create: `src/config/v2Ships.ts`, the runtime manifest shared with the shipyard.
- Test: `tests/shipyardSheetLayout.test.ts`, `tests/v2Ships.test.ts`

**Interfaces:**
- Produces:
  - `interface V2ShipSpec { key: string; file: string; width: number; height: number; bankFrames: number; maxBankDeg: number }`
  - `const V2_SHIPS = [{ key: 'v2-player', file: 'player', width: 36, height: 44, bankFrames: 9, maxBankDeg: 35 }, { key: 'v2-fighter', file: 'fighter', width: 36, height: 36, bankFrames: 1, maxBankDeg: 0 }] as const`
  - `function v2AssetUrl(file: string, normal?: boolean): string`, which returns `assets/v2/${file}${normal ? '_n' : ''}.webp`
  - `function sheetLayout(spec: V2ShipSpec, density: number): { frameWidth: number; frameHeight: number; sheetWidth: number; sheetHeight: number; frameBankDeg: number[] }`. Frames are in one row; frame `i` has bank `-max + i × 2max / (n - 1)`, and the middle frame is 0°.
  - `function bankToFrame(bank: number, frames: number): number`. Maps [-1, 1] to the nearest frame index (in `src/config/v2Ships.ts`, so runtime and tests share it).

- [ ] **Step 1: Write the failing tests:**
  - `sheetLayout for player is 9 frames of 144×176 in one row`, giving sheet 1296×176. `frameBankDeg[0] = -35`, `[4] = 0`, `[8] = 35`.
  - `bankToFrame maps -1, 0 and 1 to 0, 4 and 8, and clamps out-of-range values`.
  - `single-frame ships have frameBankDeg [0]`.
- [ ] **Step 2:** Run the tests and expect FAIL. Implement both pure functions. Expect PASS.
- [ ] **Step 3: Implement the renderer page.**
  - `WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true })`.
  - An `OrthographicCamera` looking straight down -Z, fitted to logical w×h × density per frame.
  - Roll each frame by `frameBankDeg` about the ship's forward axis.
  - **Albedo pass:** `MeshStandardMaterial` lighting, with a directional key light from the upper left (direction (-0.5, 0.6, 0.65)), a weak cool fill and ambient. Emissive engines are drawn at full brightness.
  - **Normal pass:** the same scene with all materials overridden by `MeshNormalMaterial` (view-space normals), background transparent.
  - Composite frames side by side with `sheetLayout` and return the data URLs.
- [ ] **Step 4: Verify the normal-map convention against Phaser before modelling detail.**
  - Render a hemisphere test object as `assets/source/v2/_probe_n.png`.
  - Check the pixel at the right edge has R > 200, the centre is about (128, 128, 255), and the top edge's G matches what Phaser's lighting shader expects. Check the shader code under `node_modules/phaser/src/renderer/webgl/shaders/` for how the normal's y is decoded.
  - If Phaser expects the opposite y, flip G in the composite step.
  - Add `tests/shipyardNormalConvention.test.ts`, which decodes `_probe_n.png` with Bun (`sharp` is **not** allowed; use Playwright's `page.evaluate` canvas decode inside `renderShips.ts --probe` and write a JSON of sample pixels that the test asserts against).
- [ ] **Step 5: Model the player ship and Fighter** in code from three.js primitives, `ExtrudeGeometry` and `LatheGeometry`.
  - Panel lines come from separate thin recess meshes.
  - Engines are emissive cylinders.
  - The silhouette must stay readable at 36×44 logical size.
  - The player keeps the "twin fork nose, pale ceramic armour, cyan engines" identity. The Fighter is broad and angular, with red-orange accent armour.
- [ ] **Step 6:** Run `bun run art:shipyard`. Expect four WebP files in `public/assets/v2/` and the console printing their sizes. Fail if the total exceeds 600 KiB. Open the PNGs in `assets/source/v2/` and check that every bank frame is fully inside its cell (the script asserts a 2 px transparent border per frame).
- [ ] **Step 7:** Run the quality gates. Confirm `grep -r "three" dist/assets/*.js` finds nothing after `bun run build`, and add `scripts/shipyard/**` to knip's entry if needed.
- [ ] **Step 8:** Commit the scripts, the manifest, the source PNGs and the WebP files with `feat(art): shipyard renders code-built 3D ships to lit and normal sheets`.

### Task 5: Load v2 sheets and show the bank frames in game

**Files:**
- Create: `src/utils/v2ShipAssets.ts`. `queueV2ShipAssets(scene)` and `finishV2ShipLoading(scene): boolean`. Mirrors `src/utils/cinematicAssets.ts`, including its frame-size validation and its "Artwork could not be loaded / retry" fallback. Reuse that fallback; don't duplicate it (extract a shared `showArtworkLoadFailure(scene)` from `cinematicAssets.ts`).
- Modify: `src/scenes/PreloadScene.ts`. Queue the v2 assets.
- Modify: `src/entities/Player.ts`, `src/entities/enemies/Fighter.ts`. Use the `v2-player` and `v2-fighter` textures when the v2 art is active. The player's frame comes from `bankToFrame(this.getBank(), 9)` each update, and the code rotation from Task 2 drops to `bank × 4°` (the frames carry the bank).
- Test: `tests/v2ShipAssets.test.ts`, plus an e2e in `tests/e2e/v2Ships.spec.ts`

**Interfaces:**
- Consumes: `V2_SHIPS`, `v2AssetUrl`, `bankToFrame` (Task 4); `Player.getBank` (Task 2).
- Produces: textures `v2-player` (9 frames) and `v2-fighter` (1 frame), each with a normal map attached via the loader's `normalMap` config (`scene.load.spritesheet({ key, url, normalMap, frameConfig })`). Frames are registered at resolution `CINEMATIC_DENSITY`, with logical trim w×h as in `registerCinematicFrames`.

- [ ] **Step 1: Write the failing tests:**
  - `finishV2ShipLoading rejects a sheet with wrong frame size and shows retry`.
  - `registers 9 frames for v2-player at logical 36×44`.
- [ ] **Step 2:** Run, expect FAIL, implement, and expect PASS.
- [ ] **Step 3: Write the e2e** `v2 player sheet shows centre frame at rest and an edge frame while strafing`. Use the existing browser harness snapshot (`src/browserHarness/snapshot.ts`) and extend it to report the player's `frame.name`. Hold right for 600 ms and expect frame ≥ 7; release for 900 ms and expect frame 4. Run under `--project=chromium-desktop`.
- [ ] **Step 4:** Run the quality gates. Commit with `feat(art): load v2 ship sheets and drive player bank frames`.

### Task 6: Lighting rig, quality budgets and bloom

**Files:**
- Modify: `src/config/visualQuality.ts`. Add to `VisualQualityProfile`:
  - `dynamicLights: number`
  - `normalMapLighting: boolean`
  - `bloom: 'off' | 'soft' | 'full'`

  Values: Low `0 / false / 'off'`, Standard `4 / true / 'soft'`, High `8 / true / 'full'`. Auto starts at Standard on touch devices and High on desktop, and steps down on pressure using the existing pressure signal.
- Modify: `src/main.ts`. Set the game config `maxLights: 8`. It's a shader define, so it is fixed for the session; the active count is limited per tier.
- Create: `src/systems/lighting/LightingRig.ts`, owned per scene and destroyed on shutdown like other scene-owned resources.
- Modify: `src/systems/EffectsManager.ts` (`createExplosion`, muzzle flash) and `src/entities/Player.ts` (engine light). Request lights from the rig.
- Test: `tests/LightingRig.test.ts`, `tests/visualQuality.test.ts` (add cases), plus an e2e in `tests/e2e/v2Lighting.spec.ts`

**Interfaces:**
- Consumes: the textures from Task 5; `getVisualQualityProfile`.
- Produces:
  - `class LightingRig`
    - `constructor(scene: Phaser.Scene, profile: VisualQualityProfile)`
    - `attach(obj: Phaser.GameObjects.Sprite): void`. Calls `setLighting(true)` and `setSelfShadow(true, 0.5, 1/3)` only when `normalMapLighting` is set.
    - `pulse(x: number, y: number, color: number, radius: number, intensity: number, durationMs: number): void`. Short-lived light from a fixed pool of size `dynamicLights`. When the pool is exhausted it reuses the oldest light. It is a no-op when the pool size is 0.
    - `follow(obj: { x: number; y: number }, color: number, radius: number, intensity: number): () => void`. A persistent light such as the engine glow. Returns a release function and counts against the pool.
    - `setProfile(profile): void`, for when Auto steps down.
    - `destroy(): void`
  - Ambient colour `0x8090a0` at the default level, so sprites don't look darker than their baked albedo when lit.
  - Bloom: `Phaser.Actions.AddEffectBloom` applied to the main camera. Soft and full differ in strength and threshold, so only emissive-bright pixels bloom. It is removed when the tier is `'off'` or reduced motion asks for less flashing (keep pulses, drop bloom flicker).
  - Light pulses use gameplay time (the `GameplayClock` / delta pattern), so a paused game freezes a pulse mid-fade (Review Focus 2).

- [ ] **Step 1: Write the failing tests:**
  - `low tier attaches no lighting and creates no lights`.
  - `pulse reuses the oldest light when pool is full`. Standard has a pool of 4; call it 5 times and expect 4 lights, with the first one repositioned.
  - `pulse fades by gameplay delta and freezes at delta 0`.
  - `destroy removes every light and the bloom filter`.
  - `profile values per tier` (the values listed above).
- [ ] **Step 2:** Run, expect FAIL, implement, and expect PASS.
- [ ] **Step 3: Write the e2e** `lit fighter brightens near an explosion on standard, unchanged on low`. Spawn a Fighter via the harness and sample its average luminance from a canvas readback. Trigger a pulse next to it, sample again, and expect an increase of ≥ 10% on Standard and < 2% on Low.
- [ ] **Step 4:** Run the full gates, then `bun run test:performance`. The existing budgets must still pass with lighting on Standard. Add one performance probe, `v2 lit stress: 12 lit fighters, 8 pulses/s, bloom full`, that records frame-time p95 to `output/verification/v2-lighting/perf.json`. It is a baseline only; fail only if it is more than 25% worse than the same probe on Low (catches pathological cost under the software renderer).
- [ ] **Step 5:** Commit with `feat(graphics): lighting rig with per-tier lights, normal-map lighting and bloom`.

### Task 7: Preview deploy and the user playtest gate

**Files:**
- Create: `docs/qa/v2-phase-0-playtest.md`. Checklist and results.
- Modify: `CHANGELOG.md` (an "Unreleased: v2 Phase 0" entry).
- Modify: `src/config/flightConfig.ts`, only with values agreed in the playtest.

- [ ] **Step 1:** Push `v2` to `origin` and confirm Vercel creates a preview deployment (`gh pr create --draft --base main --head v2 --title "v2 overhaul (WIP)"` gives a preview URL through the Vercel GitHub integration). Link the PR.
- [ ] **Step 2:** Send the user the preview URL, plus the same URL with `?flight=legacy` for comparison. Ask them to play Level 1 on desktop and on their phone in portrait and landscape, and to answer:
  - Does the momentum feel like flying, too floaty, or too stiff?
  - Does the lit ship look right?
  - Is it smooth on the phone?
- [ ] **Step 3:** Tune `responseMs`, `glideMs` and `bankResponseMs` from the feedback, keeping the Task 1 tests' structure. If needed, widen their bounds to the agreed values and record the new numbers and the reason in the playtest doc and in CONTEXT.md under a new "v2 flight feel" decision. Redeploy, and repeat until the user is happy.
- [ ] **Step 4:** Record the phone result: device model, tier Auto picked, and whether it looked smooth. If Standard isn't smooth on their phone, record that and lower Auto's touch default to Low (the baked look). Note it as a Phase 6 optimisation item.
- [ ] **Step 5:** Commit with `chore(v2): record phase 0 playtest and tuned flight feel`.

**Phase 0 exit:**
- The user approves the controls and the lit ship look.
- Phone smoothness is recorded.
- All gates are green on `v2`.

---

## Later phases (milestones only; each gets its own detailed plan when the previous phase closes)

- **Phase 1: Level 1 vertical slice (home shipyard).**
  - The terrain layer system: modular top-down kit tiles from the shipyard, assembled into scrolling layers, with the protected readability rule that bullets beat terrain.
  - Ground targets: turrets, generators, chain-exploding tanks, enemy-launching hangar doors.
  - Set-piece walls and doors with damage plus push-back collision.
  - The fixed-width 540-unit authoring column, with scenery in the side margins.
  - Weapons: main gun levels plus one secondary on Shift/X and an on-screen button.
  - Medals: all ground targets, no-hit, hidden target.
  - Level shape and the mid-level set piece.
  - A part-based boss.
  - Upgraded synthesized SFX (layered explosions, weapon voices, ground impacts) and music that follows the level shape.
  - New HUD.
  - **Gate:** the user plays it start to finish and approves the direction.
- **Phase 2: Production kit.**
  - The full enemy roster through the shipyard (bank frames, damage states).
  - The other two secondary weapons.
  - Environment kits for all ten worlds.
  - The boss part-system generalised.
  - Level authoring format and `levels:validate` rules for the column, terrain, ground targets, set pieces and medals.
- **Phase 3: Levels 2–5.** Ice-moon canyons, asteroid mining belt, gas-giant lightning storm, derelict warship graveyard. Each with its boss, music and SFX.
- **Phase 4: Levels 6–10.** Refinery world, jungle moon under siege, gravity-well station, enemy armada fleet, capital world core.
- **Phase 5: Shell and progression.**
  - Level select with replay.
  - Game over restarts the level.
  - Credits only for score above your personal best on a replayed level.
  - Upgrade shop for the new weapons.
  - Save v2 (new key; settings carried over).
  - Code-rendered planets in the intermission.
  - Menus restyled.
  - Remove v1 content, the `?flight=legacy` toggle and their tests.
- **Phase 6: Polish and release.**
  - Balance across difficulties.
  - Readability audit at desktop and 390 px portrait.
  - Real-device performance work.
  - A new ADR superseding 0002–0004 where relevant, and CONTEXT.md decisions.
  - Merge `v2` into `main` and release v2.0.0.
