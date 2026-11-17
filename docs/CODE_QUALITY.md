# Code quality review — 17 November 2026

This review improves maintainability and correctness; it does not assign an invented judge score.

| Finding | Change | Verification |
| --- | --- | --- |
| Main module mixed HTML, parsing, rendering, exports and requests | Move static markup to index.html; extract renderer, parser and export functions | DOM rendering/export tests and production build |
| Authentication duplicated across endpoints | Shared HTTP method/origin/cache policy and timing-safe token check | Request/auth/origin negative tests |
| Provider orchestration mixed with HTTP responses | Separate Gemini adapter and explicit ProviderError; inject config and fetch into handler factory | Isolated tests without global environment/fetch mutation |
| Schemas accepted whitespace-only inputs and findings | Shared limits and nonblank constraints; preserve exact quote whitespace | Boundary and schema regressions |
| Default model differed from deployed tested model | Use Gemini 3.1 Flash Lite as shared server default | Adapter request test and live smoke run |
| Worker leaked on invalid PDF pages | Finally-based destruction and bounded extraction | Cleanup asserted on successful and failed parsing |
| TXT limit differed from PDF limit | Apply shared character limit to both formats | Oversized TXT test |
| Frontend trusted successful JSON without schema validation | Validate live output before rendering | Shared schema checks; safe rendering test |
| Export hid partial-review state | Include incomplete status in exported brief | Export assertion |
| No enforced static analysis | ESLint plus strict TypeScript checkJs for API, shared schemas, server and export modules | npm run lint; npm run typecheck; CI gates |

Thirty deterministic tests pass. npm run verify runs formatting, lint, scoped strict type checking, tests and build. Type checking does not yet cover the full browser controller/parser; it is not a claim of an entirely TypeScript application.

Initial application JavaScript decreased from approximately 452 KB (137 KB gzip) to 88 KB (27 KB gzip); the PDF parser and worker load only after PDF selection. Total downloaded bytes when using PDF functionality are not reduced by that amount. This is a build-size measurement, not a browser latency benchmark.

Remaining product limitations in BUILD_PLAN.md and earlier verification records still apply: distributed quotas, complete browser/manual accessibility QA, large live-model evaluation, deterministic clause alignment and professional legal review remain future work.

## Deployment regression checks

The refactored production deployment passed all three opt-in synthetic Gemini checks: review (3,472 ms), comparison (2,863 ms), and missing-information response (2,434 ms). Each result had valid source substrings and was not marked incomplete. These are individual smoke observations, not accuracy or latency benchmarks. The dependency audit reported zero known vulnerabilities at this check.
