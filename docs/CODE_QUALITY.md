# Code structure

AirWise shares the household, city, forecast and plan contracts between the browser and server. The compiler checks every shipped app module and the build, development and live-verification scripts. Strict JavaScript checking includes missing return paths and unchecked indexed access. Node types and the production runtime both target Node 24.

| When changing… | Start here | Regression coverage |
| --- | --- | --- |
| Household fields or API payloads | [Shared validation schemas](../lib/contracts.js) | Invalid profiles, coordinates and upstream data |
| An action or eligibility rule | [Eligibility policy](../lib/actions.js), [guidance and sources](../lib/guidance.js), [AQI bands](../lib/aqi.js) | Budget, travel, cooking, cleaner access and sensitivity scenarios |
| Priority order or travel arithmetic | [Plan builder](../lib/air.js) | AQI boundaries, mandatory actions, duplicates and solo-car scenarios |
| Provider integration | [Forecast contract](../lib/forecast.js), [Open-Meteo adapter](../lib/server/air.js), [Gemini](../lib/server/gemini.js), [city search](../api/locations.js) | Missing data, chronology, mixed-quality city results, malformed rankings and quotas |
| Browser interaction | [Events and request ownership](../main.js), [form](../lib/client/form.js), [API client](../lib/client/api.js) | Late results, profile edits, failure recovery and payload privacy |
| Display or export | [Plan renderer](../lib/client/review.js), [Markdown export](../lib/client/export.js) | Keyboard flow, hourly table, accessibility checks and a real file download |

## Three decisions worth preserving

- The API constructs the eligible plan once. Gemini sees compact ID and title pairs. The response schema enumerates the IDs for that household, and the ordering function preserves mandatory and unranked actions.
- Each city search and plan request owns its own abort controller. A result may update the UI only while that controller is current. Tests deliberately deliver a superseded response after a newer result.
- Forecast pollutant arrays must align with a strictly increasing time axis. Missing values create gaps. They cannot shift another hour's readings into the current plan.

The browser imports the tree-shakable validation API from the existing Zod dependency. The size comparison and independent browser checks are in [verification](VERIFICATION.md).

## Coding practices applied

*The Art of Readable Code* guided the split between selecting an action and writing its guidance. To change who receives a cleaner recommendation, edit the eligibility policy. To change the wording or source, edit the catalogue. Time calculations use names such as `retrievedAtMs` and `hourStartSeconds` so unit conversions are visible. [O’Reilly publisher page](https://www.oreilly.com/library/view/the-art-of/9781449318482/)

*Software Engineering at Google* informed two checks in this project. ESLint rejects direct imports of server handlers, Node built-ins and the full Zod entry point from browser and shared modules. Regression tests exercise the public planner and HTTP handlers with deterministic provider replies. A browser test gives the planner a response for another family and verifies that downloading becomes available only after a successful retry. [Style guides and rules](https://abseil.io/resources/swe-book/html/ch08.html) · [Unit testing](https://abseil.io/resources/swe-book/html/ch12.html)

The shared forecast contract checks time units, freshness at retrieval, the current reading and the ordered 24-hour window. The browser verifies the returned household and eligible IDs before using the ranking. It rebuilds safety instructions, sources and travel figures from the same domain code used by the server.

`npm run verify` runs the same checks locally and in CI. Application functions have a cyclomatic complexity limit of 10. ESLint also disallows dynamic code execution in app modules and Node globals in browser and shared code. The compiler rejects unused declarations, unreachable code and switch fallthrough.

The Node coverage gates require 98% each for lines, branches and functions across instrumented API, server, shared and client modules. Client measurements cover the HTTP client, renderer and Markdown export. The bundled entry point and form wiring run through DOM and Playwright workflows. A production build also checks the compressed JavaScript against a 16 KiB budget for mobile delivery. These thresholds are AirWise project decisions.

Both protected endpoints use the same bearer-token check and return a bearer challenge on HTTP 401. Gemini model discovery follows continuation tokens under one 15-second deadline and reports a provider failure if a later page fails or a token repeats. [HTTP authentication challenges](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.2) · [Gemini model listing](https://aistudio.google.com/api-reference/models/list-models)
