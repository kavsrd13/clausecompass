# Verification · 19 November 2026

| Check | Result on the revised app |
| --- | --- |
| Formatting, scoped ESLint rules, strict type checking, production build | Passed on Node 24 |
| Unit, API and DOM workflow tests | 57 passed |
| Playwright workflows | Two scenarios on each of two Chromium viewports, 1280 × 800 and 360 × 800 |
| Automated accessibility | Empty and populated plans in a real browser, including the color-contrast rule. Zero violations across the four tested states. |
| Dependencies | `npm audit --audit-level=high` reported zero known vulnerabilities at the time of testing |

## What changed since the scored version

The baseline is Git revision `7385e28`. Both size measurements use the minified production JavaScript file from `npm run build`. Gzip uses Node's default `gzipSync` settings. These are artifact sizes, independent of any measured network speed.

| Measurement | Baseline | Revised |
| --- | ---: | ---: |
| Browser JavaScript, bytes | 467,091 | 37,726 |
| Browser JavaScript, gzip bytes | 98,900 | 13,640 |
| Node test cases | 40 | 57 |
| Browser workflow runs in CI | 0 | 4 |

The regression suite covers a late city search arriving after a demo, an old forecast arriving after a new household plan, unordered or misaligned readings, malformed city results, and Gemini network or output errors. The browser suite exercises the keyboard skip link, full 24-row fictional forecast, actual Markdown download, city selection, minimal forecast payload, authenticated AI request and failed refresh. Tests use synthetic household data.

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

City search and forecasts use Open-Meteo. On 18 November, the prior production revision also returned a successful authenticated Gemini plan. To test a deployed revision with current data, set `APP_URL` and the corresponding private app access token and run `node --env-file=.env.local scripts/live.mjs`. The script verifies the plan contract, travel arithmetic, eligible action set and mandatory ordering. [Access guide](ACCESS.md)

A browser test with provider fixtures establishes application behavior. A live request checks current provider availability. Neither measures long-term model accuracy. Manual screen-reader evaluation and professional review of the guidance catalogue remain open.
