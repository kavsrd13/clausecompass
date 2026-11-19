# Code structure

AirWise shares the household, city, forecast and plan contracts between the browser and server. The compiler checks every shipped app module and the build, development and live-verification scripts. Strict JavaScript checking includes missing return paths and unchecked indexed access. Node types and the production runtime both target Node 24.

| When changing… | Start here | Regression coverage |
| --- | --- | --- |
| Household fields or API payloads | [Shared validation schemas](../lib/contracts.js) | Invalid profiles, coordinates and upstream data |
| An action or eligibility rule | [Action catalogue](../lib/actions.js) | Budget, travel, cooking, cleaner access and sensitivity scenarios |
| Priority order or travel arithmetic | [Plan builder](../lib/air.js) | AQI boundaries, mandatory actions, duplicates and solo-car scenarios |
| Provider integration | [Forecast](../lib/server/air.js), [Gemini](../lib/server/gemini.js), [city search](../api/locations.js) | Injected transports, missing data, chronology, malformed rankings and quotas |
| Browser interaction | [Events and request ownership](../main.js), [form](../lib/client/form.js), [API client](../lib/client/api.js) | Late results, profile edits, failure recovery and payload privacy |
| Display or export | [Plan renderer](../lib/client/review.js), [Markdown export](../lib/client/export.js) | Keyboard flow, hourly table, accessibility checks and a real file download |

## Three decisions worth preserving

- The API constructs the eligible plan once. Gemini sees compact ID and title pairs. The response schema enumerates the IDs for that household, and the ordering function preserves mandatory and unranked actions.
- Each city search and plan request owns its own abort controller. A result may update the UI only while that controller is current. Tests deliberately deliver a superseded response after a newer result.
- Forecast pollutant arrays must align with a strictly increasing time axis. Missing values create gaps. They cannot shift another hour's readings into the current plan.

The browser imports the tree-shakable validation API from the existing Zod dependency. The size comparison and independent browser checks are in [verification](VERIFICATION.md).
