# AirWise — Urban Air Quality Assistant

Challenge 6: a family smog-day planner with location-aware modelled outdoor air, indoor guidance, lower-emission routines and transparent impact explanations. This replaces the earlier legal-document topic.

## Run
Node 24: `npm ci`, `npm run dev` for the UI/demo. The local dev server includes same-origin API routes and live public air data. The fictional demo requires no credentials or network. City search and modelled air use Open-Meteo APIs. For Gemini, configure GEMINI_API_KEY, GEMINI_MODEL (default gemini-3.1-flash-lite), and APP_ACCESS_TOKEN in ignored server environment settings. Enter only the app access token in AI personalization access. Never enter a Gemini key in the UI. The old Vercel project is deleted; no replacement deployment has been created.

## What it does
- City search and preset cities; no exact address or GPS required.
- Clearly labelled US AQI and PM2.5 model forecasts with timestamps and Open-Meteo/CAMS attribution; not India AQI or street-level sensor readings.
- Sensitivity, cooking, cleaner access, budget and commute context.
- Guidance-only mode and separately labelled Gemini prioritization. Gemini ranks eligible action IDs; it does not generate medical advice or impact numbers.
- Mandatory severe-smog precautions stay first regardless of AI ranking.
- Indoor source-control guidance, safer transport tradeoffs and community actions.
- Solo-driving replacement scenario with formula and limitations; Markdown/print export.

## Verify
`npm run verify`: formatting, lint, strict server/domain type checks, deterministic tests and production build. See docs/VERIFICATION.md for exact verification status. Offline tests are not evidence of live Gemini accuracy. No judge score is guaranteed.

## Sources and terms
Outdoor data: [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) / [CAMS](https://atmosphere.copernicus.eu/). The free API is for eligible noncommercial use; check usage limits and obtain a commercial plan if needed. Model grid/forecast values differ from local monitors. US AQI categories are not interchangeable with national AQI systems.

Action catalogue: [WHO personal interventions](https://www.who.int/news-room/questions-and-answers/item/air-pollution-personal-interventions-and-risk-communication), [EPA air cleaners](https://www.epa.gov/indoor-air-quality-iaq/guide-air-cleaners-home), [EPA indoor particles](https://www.epa.gov/indoor-air-quality-iaq/indoor-particulate-matter), [EPA source control and ventilation](https://www.epa.gov/indoor-air-quality-iaq/improving-indoor-air-quality).

## Privacy and security
No household profile is persisted. City coordinates are transmitted to the air-data provider; selected household preferences and the optional goal go to Gemini only for requested AI personalization. Do not include private medical details. Provider retention terms still apply; use an appropriate paid Gemini project before accepting sensitive content. API keys must never be committed. Distributed abuse quotas are not implemented; do not publicly share the app access token. Public air-data requests have input/time bounds but require platform rate limits before large-scale public release.

## Scope and limits
No medical diagnosis/treatment, indoor sensor measurements, hyperlocal route optimization or guaranteed reductions in emissions, city AQI or health risk. Recommendations are informational and may not fit every home. Keep combustion safety and necessary ventilation in place; follow local official advisories. The narrower curated catalogue limits unsafe model-generated advice but does not constitute professional health validation. Accessibility conformance needs manual evaluation. Source repository currently retains its historical GitHub name; its current application is AirWise.

## Repository rules
Single main branch; below 10 MB; no node_modules, dist, secrets or large media in Git. No challenge submissions are automated.
