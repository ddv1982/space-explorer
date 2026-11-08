# Maintenance cleanup verification

The behavior diff was independently approved in two Sol review rounds. The final application checks passed locally with the patched dependencies: frozen installation, TypeScript 7 and 6, all 123 isolated unit suites, lint, formatting, level validation, architecture policies, unused-code checks, production build, bundle limits, and the dependency audit.

The browser baseline passed all 14 visual tests before presentation changes. Final local browser verification passed 191 tests with 3 explicit skips. [The complete workflow](https://github.com/ddv1982/space-explorer/actions/runs/42518843671) passed all gates. The live development comparison starts with legacy textures, pauses, and resizes to portrait. Production bundle checks reject legacy renderer and diagnostic markers.

## First CI performance result

[Run 42518205020](https://github.com/ddv1982/space-explorer/actions/runs/42518205020) measured normal update p95 values of 5.1, 0.8, 0.6, 1.2, and 0.7 ms across five fresh runs. One exceeded the existing 5 ms limit. All five 6 ms synthetic regressions were rejected.

The single first-run spike suggests runner or initialization variation, but does not prove its cause. One fresh build passed with the same behavior and thresholds. Its five normal values were 3.3, 0.9, 0.6, 0.7, and 0.7 ms, and all five synthetic regressions were rejected. This result is not a performance improvement or regression claim. No threshold, sample count, warmup, or retry setting changes.

## Release handoff

Version 1.20.1 and its release notes are prepared. The subsequent full-send request authorizes merging after the CI optimization passes its own verification. Publish the release only from the merged main revision after checks and reviews pass.
