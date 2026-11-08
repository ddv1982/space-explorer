# Maintenance cleanup verification

The behavior diff was independently approved in two Sol review rounds. The final application checks passed locally with the patched dependencies: frozen installation, TypeScript7 and6, all123 isolated unit suites, lint, formatting, level validation, architecture policies, unused-code checks, production build, bundle limits, and the dependency audit.

The browser baseline passed all14 visual tests before presentation changes. Final full-browser verification remains in progress. The live development comparison starts with legacy textures, pauses, and resizes to portrait. Production bundle checks reject legacy renderer and diagnostic markers.

## First CI performance result

[Run42518205020](https://github.com/ddv1982/space-explorer/actions/runs/42518205020) measured normal update p95 values of5.1,0.8,0.6,1.2,and0.7ms across five fresh runs. One exceeded the existing5ms limit. All five6ms synthetic regressions were rejected.

The single first-run spike suggests runner or initialization variation, but does not prove its cause. One fresh build is required with the same behavior and thresholds. A repeated failure requires investigation rather than another retry. This result is not a performance improvement or regression claim. No threshold, sample count, warmup, or retry setting changes.

## Release handoff

Version1.20.1 and its release notes are prepared. The full-stop workflow leaves the maintenance PR open and unmerged. Publish the release only from the merged main revision after checks and reviews pass.
