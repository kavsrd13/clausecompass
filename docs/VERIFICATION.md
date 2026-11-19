# Verification · 19 November 2026

## Current application release

Application revision [7ec854a](https://github.com/kavsrd13/clausecompass/commit/7ec854a) passed `npm run verify` with 105 Node tests and zero failures. The measured modules reached 100% line coverage, 98.13% branch coverage and 100% function coverage. The build produced 44,900 bytes of browser JavaScript (16,018 bytes gzip); npm audit reported zero known vulnerabilities.

Fixed-clock tests cover an elapsed window, a partially elapsed first hour, and an open plan advancing across an hour boundary. Demo forecasts use their fictional retrieval time. The bundled download workflow reads the generated Markdown and checks the selected two-day commute (80 km baseline, 48 km remaining, 32 km replaced) and a two-hour window in UTC. Reset tests check text, handlers and a reply arriving after cancellation. These tests run in Node and a simulated DOM.

## Earlier planner and provider refactor

The planner and provider refactor passed 98 Node tests and six desktop and phone-width browser workflows. The Node suite exercised 100% of lines, 98.88% of branches and 100% of functions across the measured modules. The production JavaScript bundle measured 40,832 bytes, or 14,698 bytes gzip. The dependency audit returned zero known vulnerabilities at verification time.

For the same burst of 20 synthetic public requests at identical coordinates, the previous handler made 20 upstream calls and the revised handler made one. All callers received HTTP 200 in both runs. This measures duplicate work within a single running instance. Production throughput and cross-instance concurrency depend on the hosting platform and provider. Run `node --test tests/forecast-requests.test.js` to verify sharing, retry and capacity behavior.

## Earlier release at `63f9129`

The standards update passed 91 Node tests. Coverage includes API endpoints, server and domain modules, plus the client HTTP adapter, renderer and exporter. Across these modules, line and function coverage were 100% and branch coverage was 98.77%. CI enforces a 98% floor for each measure. The browser entry point and form interactions are exercised in the bundled workflows.

## Earlier release at `417ecd9`

| Check | Result at this revision |
| --- | --- |
| Formatting, scoped ESLint rules, strict type checking, production build | Passed on Node 24 |
| Unit, API and DOM workflow tests | 84 passed |
| Playwright workflows | All six passed, three workflows at each of two Chromium viewports, 1280 × 800 and 360 × 800 |
| Automated accessibility | Empty and populated plans in a real browser, including the color-contrast rule. Zero violations across the four tested states. |
| Dependencies | `npm audit --audit-level=high` reported zero known vulnerabilities at the time of testing |

## What changed since the scored version

The scored baseline is Git revision `7385e28`. The previous release is `e932a6c`. The measurements use the minified production JavaScript file from `npm run build`. Gzip uses Node's default `gzipSync` settings.

| Measurement | Scored baseline | Previous release | Current |
| --- | ---: | ---: | ---: |
| Browser JavaScript, bytes | 467,091 | 37,726 | 40,649 |
| Browser JavaScript, gzip bytes | 98,900 | 13,640 | 14,615 |
| Node test cases | 40 | 57 | 84 |
| Browser workflow runs in CI | 0 | 4 | 6 |

The regression suite covers a late city search arriving after a demo, an old forecast arriving after a new household plan, unordered or misaligned readings, malformed city results, and Gemini network or output errors. The browser suite exercises the keyboard skip link, full 24-row fictional forecast, actual Markdown download, city selection, minimal forecast payload, authenticated AI request and failed refresh. Tests use synthetic household data.

## Coding standards review

The revised planner rejects a reply for another household and checks the complete set of eligible actions before displaying or exporting it. New contract tests reject timestamps outside the renderable range and forecasts that disagree with their current reading. A mixed geocoder response can still return its valid matches.

ESLint's cyclomatic complexity for `eligibleActions` fell from 14 to 6. A comparison with the previous release across 96 household configurations and ten AQI boundaries produced the same advice text, sources, ordering and mandatory flags in all 960 combinations. A continuing policy test also exercises required precedence across this matrix.

| Node coverage across API, shared domain and server modules | Previous release | Current |
| --- | ---: | ---: |
| Lines | 93.83% | 100.00% |
| Branches | 94.24% | 98.22% |
| Functions | 90.91% | 100.00% |

Run `npm run test:coverage` to reproduce the current measurements. Browser behavior is checked separately in Playwright. [Published engineering guidance and code decisions](CODE_QUALITY.md)

## Reproduce the checks

```sh
npm ci
npm run verify
npm audit --audit-level=high
npx playwright install chromium
npm run test:browser
```

The browser suite starts a local server on port 4186. To use an installed Chrome instead, set `AIRWISE_BROWSER_CHANNEL=chrome`. CI installs the Chromium build paired with the locked Playwright version. [CI workflow](../.github/workflows/verify.yml)

## Production verification

On 19 November 2026, Chrome opened the public production site, searched for Pune, requested a live forecast and personalized a fictional family plan through the UI. The published JavaScript matched the reviewed 40,649-byte build byte-for-byte. The independent Linux CI run also passed all 84 Node tests and six browser workflows. [Tested revision](https://github.com/kavsrd13/clausecompass/commit/417ecd9329c9ed924c3040f8fcbbe34755955f8b) · [CI run](https://github.com/kavsrd13/clausecompass/actions/runs/44470745669) · [Production](https://airwise-pearl.vercel.app)

| Live request | Observed result |
| --- | --- |
| Public city search for Pune | HTTP 200, five validated matches |
| Public forecast for the selected Pune location | HTTP 200, 24 modelled hourly entries |
| Personalization without an app token | HTTP 401 |
| Personalization with an authorized app token | HTTP 200, seven eligible actions displayed, expected mandatory ordering, 80 km travel scenario and a downloadable plan |

To repeat the live Gemini check, set `APP_URL` and the corresponding private app access token and run `node --env-file=.env.local scripts/live.mjs`. [Access guide](ACCESS.md)

A browser test with provider fixtures establishes application behavior. A live request checks current provider availability. Neither measures long-term model accuracy. Manual screen-reader evaluation and professional review of the guidance catalogue remain open.
