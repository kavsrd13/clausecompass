# Verification · 19 November 2026

| Check | Result on the revised app |
| --- | --- |
| Formatting, scoped ESLint rules, strict type checking, production build | Passed on Node 24 |
| Unit, API and DOM workflow tests | 84 passed |
| Playwright workflows | Three workflows at each of two Chromium viewports, 1280 × 800 and 360 × 800 |
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

## Production verification of the previous release

On 19 November 2026, the production homepage returned HTTP 200 and served JavaScript byte-for-byte identical to the 37,726-byte release artifact. The independent CI run also passed every gate, including both browser viewports. [Tested revision](https://github.com/kavsrd13/clausecompass/commit/3f43869a3a508eacecbce1d90519ac7574dd9b67) · [CI run](https://github.com/kavsrd13/clausecompass/actions/runs/44460259411) · [Production](https://airwise-pearl.vercel.app)

| Live request | Observed result |
| --- | --- |
| Public city search for Pune | HTTP 200, five validated matches |
| Public New Delhi forecast | HTTP 200, 24 modelled hourly entries |
| Personalization without an app token | HTTP 401 |
| Personalization with an authorized app token | HTTP 200, seven eligible actions, expected mandatory ordering and 80 km travel scenario |

To repeat the live Gemini check, set `APP_URL` and the corresponding private app access token and run `node --env-file=.env.local scripts/live.mjs`. [Access guide](ACCESS.md)

A browser test with provider fixtures establishes application behavior. A live request checks current provider availability. Neither measures long-term model accuracy. Manual screen-reader evaluation and professional review of the guidance catalogue remain open.
