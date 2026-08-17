# Menu Screen Responsive Hierarchy Plan

Date: 2026-08-17
Status: implemented

## Implementation Outcome

- Replaced the broad compact-coordinate chain with explicit `desktop`, `tablet`, `phone-portrait`, `phone-landscape`, and `ultra-compact` profiles.
- Added semantic bounds for the title lockup, mission settings, tuning controls, run selection, and status; all later regions now flow from the preceding band.
- Reserved the display font's real rendered line box rather than its nominal font size. `COMMAND DECK`, `SPACE EXPLORER`, and the subtitle now maintain browser-verified gaps.
- Reduced the desktop title ceiling from 86 px to 78 px, clamped decorative wings to available width, and hides the eyebrow on constrained landscape profiles.
- Distributes spare desktop height between tuning and run selection, producing a lower, balanced save-card row. Portrait uses single-column tuning plus a two-column card grid; landscape retains two-column tuning and a compact four-card row.
- Extended browser-harness text telemetry with rendered width and height, allowing evidence tests to assert actual glyph-box containment and separation.
- Reworked responsive tests around declared bands, added profile-selection coverage, and expanded browser evidence across desktop, tablet, phone portrait, phone landscape, and ultra-compact viewports.
- The feasibility pass establishes `360x600` as the shortest portrait evidence target without scrolling. Smaller square viewports cannot hold every required setting and run action at readable sizes; `480x320` remains the supported ultra-short landscape target.

## Goal

Give the main menu a clear command-deck hierarchy with collision-free typography, deliberate vertical rhythm, readable settings, and balanced save-card placement across desktop, tablet, portrait phone, and short landscape viewports.

## Current Findings

- `COMMAND DECK` is positioned only 22 px above the desktop title center while `SPACE EXPLORER` may render at 86 px. Their real glyph bounds overlap even though their anchor points differ.
- The responsive layout exposes center coordinates rather than semantic band bounds, making later elements depend on guessed text heights.
- Existing menu collision tests model title, subtitle, settings, tiles, and status, but omit the eyebrow and approximate the title rectangle from breakpoint flags.
- The subtitle, difficulty, quality, four sliders, and save cards are packed into the upper half of the frame, leaving a large visually inactive area below.
- The settings controls have adequate raw size, but their labels, selectors, and slider rows do not form a strong spacing hierarchy.
- Save cards are readable on desktop, but the settings-to-card transition is tight and the occupied save card has more competing accents than empty cards.

## Principles

- Layout semantic regions from measured or declared bounds, not from unrelated center-point offsets.
- Treat the title lockup, mission controls, tuning controls, and run selection as four distinct bands.
- Use available height to improve rhythm; compact profiles should compress gaps before shrinking essential text or touch targets.
- Keep minimum interactive targets at 44 CSS pixels on touch-oriented profiles.
- Preserve the current neon command-deck identity, input behavior, save semantics, and performance characteristics.
- Add visual decoration only after hierarchy and geometry are correct.

## Phase 0 — Capture the Baseline and Define the Layout Contract

### Work

1. Capture the current menu at representative viewports: `1920x1080`, `1366x768`, `1024x768`, `768x1024`, `390x844`, `360x640`, `844x390`, and `480x320`.
2. Record actual browser-harness bounds for the eyebrow, title, subtitle, difficulty row, quality row, each slider, each save card, and status line.
3. Define named menu bands in `MenuLayoutPlan`: title lockup, mission settings, tuning controls, run selection, and status.
4. Establish minimum gaps between those bands and minimum safe-frame insets.
5. Add the screenshot supplied in this review as the desktop regression reference for the title collision and upper-heavy composition.

### Exit criteria

- Every visible menu element belongs to one named band.
- Tests can reason about top/bottom bounds rather than reconstructing approximate rectangles from center coordinates.
- The current eyebrow/title overlap is reproduced by an automated assertion before layout changes begin.

## Phase 1 — Rebuild the Title Lockup

### Work

1. Lay out `COMMAND DECK`, `SPACE EXPLORER`, and the subtitle as a single lockup with explicit top, baseline, and bottom bounds.
2. Position the eyebrow above the title using the measured title cap height plus a deliberate gap, rather than `titleY - 22`.
3. Reduce the maximum desktop title size if necessary so the lockup fits comfortably inside the frame and does not dominate the controls.
4. Keep decorative title wings outside the fitted title bounds and clamp or hide them when horizontal space is limited.
5. Use profile policy for the eyebrow: retain it on desktop/tablet, reduce it on portrait, and hide it on ultra-short landscape if it cannot retain a clean gap.
6. Give the subtitle a stable separation from the title glow so it reads as supporting copy rather than another title layer.

### Exit criteria

- Eyebrow, title, wings, and subtitle have no intersecting visual bounds at every target viewport.
- `COMMAND DECK` remains legible rather than being visible through the title.
- The title is the first visual anchor without consuming disproportionate vertical space.
- No title glyph or wing approaches the safe frame closer than the defined inset.

## Phase 2 — Establish Desktop and Tablet Vertical Rhythm

### Work

1. Allocate desktop height by band instead of chaining all content directly below the subtitle.
2. Give difficulty and quality a compact mission-settings group with consistent label width, selector height, and row gap.
3. Present the four tuning sliders as a balanced two-by-two grid with equal column widths and clearer separation from mission settings.
4. Increase the transition gap between tuning controls and run-selection cards.
5. Move the save-card group toward the visual center/lower-middle of the available frame, eliminating the large unused lower region without pushing status against the border.
6. Normalize card padding and de-emphasize the delete control until the occupied slot is focused or hovered, while preserving discoverability and keyboard access.
7. Keep all major groups aligned to a shared content width or column grid.

### Exit criteria

- Desktop content feels vertically balanced rather than top-heavy.
- Mission settings, tuning controls, and run selection are recognizable as separate groups at a glance.
- Slider rows and save cards align consistently across columns.
- Occupied and empty cards share the same structural rhythm, with destructive action visually subordinate to load/new-run actions.

## Phase 3 — Introduce Explicit Responsive Profiles

Replace the broad `compact`/`veryShortCompact` behavior with named profiles whose priorities are visible in code.

### Profiles

- `desktop`: wide two-column settings and four-card row.
- `tablet`: scaled title lockup, two-column settings, two-by-two or four-card row according to width.
- `phone-portrait`: compact title lockup, full-width mission rows, one-column sliders, and two-column run cards.
- `phone-landscape`: reduced/hidden eyebrow, compact title, two-column controls, and one-row cards with shortened secondary copy.
- `ultra-compact`: essential controls only, compressed gaps, protected touch targets, and selectively hidden decorative/supporting text.

### Work

1. Centralize profile selection in the pure menu layout policy.
2. Define per-profile typography, gaps, columns, card heights, and optional decoration in data tables where practical.
3. Stack controls before shrinking labels below readable sizes.
4. Allow card secondary text to truncate or disappear on short landscape while preserving slot identity and action.
5. Confirm dynamic resize/orientation restart selects the correct profile without stale geometry.
6. Keep every interactive element within viewport and safe-frame bounds with at least a 44 px touch target.

### Exit criteria

- Portrait phones require no clipped control, overlapping text, or off-screen card.
- Short landscape retains difficulty, quality, four tuning controls, and four run choices without targets becoming too small.
- A breakpoint transition changes one coherent profile instead of several unrelated nested conditionals.
- Desktop spacing does not inherit mobile compression values.

## Phase 4 — Refine Typography and Information Density

### Work

1. Define a menu type scale for eyebrow, display title, subtitle, group label, control label, card title, metadata, and status.
2. Verify the loaded display and mono fonts before measuring; use deterministic fallback metrics during font loading.
3. Increase label/value contrast where the current condensed font becomes soft, without increasing glow blur.
4. Retain single-line ellipsis for saved-run titles and add explicit width budgets per responsive profile.
5. Standardize numeric value boxes so percentages align and remain readable at `100%`.
6. Review copy hierarchy: supporting text may be shortened on compact profiles, but difficulty, quality, slider identity, and slot identity must remain explicit.

### Exit criteria

- Text remains sharp and readable at device-pixel ratios 1, 2, and common fractional browser zoom/render scales.
- No label crosses another label, value box, icon, or card action.
- Truncation is intentional and retains enough information to distinguish saved runs.
- Glow supports hierarchy without making small text fuzzy.

## Phase 5 — Strengthen Geometry and Browser Evidence

### Work

1. Extend `responsiveLayout.test.ts` to include the eyebrow and explicit band rectangles.
2. Test band ordering, minimum gaps, safe-frame containment, card-grid containment, and minimum touch sizes across the full viewport matrix.
3. Add browser assertions using actual rendered text/object bounds for eyebrow/title, title/subtitle, settings/tuning, tuning/cards, and cards/status.
4. Add menu screenshots for desktop, tablet, phone portrait, and phone landscape in both empty-slot and occupied-slot states.
5. Exercise keyboard focus, pointer hover, touch selection, delete, quality reload, orientation change, and saved-title truncation.
6. Compare menu frame/render cost before and after; layout cleanup must not add per-frame work or runtime filters.

### Exit criteria

- Automated geometry catches the exact `COMMAND DECK`/title regression shown in the supplied screenshot.
- Visual evidence covers all named responsive profiles and an occupied save slot.
- Functional menu interactions pass with keyboard, pointer, and touch.
- No production bundle or frame-pacing regression is introduced.

## Verification

Run focused layout and menu tests during each phase, followed by:

```sh
bun run format:check
bun run typecheck
bun run typecheck:ts6
bun run lint
bun run test
bun run architecture:check
bun run build
bun run bundle:check
bun run test:e2e:fast
bun run test:e2e:performance
```

## Overall Acceptance Criteria

- `COMMAND DECK` never appears behind or through `SPACE EXPLORER`.
- The title lockup, mission settings, tuning controls, run cards, and status form five clearly separated visual levels.
- Desktop uses its available height deliberately; mobile compresses gracefully without sacrificing required controls or touch targets.
- All text and controls remain inside the command frame at every target viewport.
- Empty and occupied save-card states remain readable, aligned, and operable.
- Layout tests use declared/measured bounds and fail on real visual collisions rather than only anchor-point proximity.

## Non-goals

- Replacing the neon command-deck art direction.
- Changing save-slot behavior, difficulty balance, audio values, or visual-quality semantics.
- Adding scrolling to the menu unless the ultra-compact feasibility pass proves all required controls cannot meet the minimum touch target simultaneously.
- Introducing new runtime filters or continuous animation solely to decorate the menu.
