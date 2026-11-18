# AirWise — Challenge 6 build plan

Updated 18 November 2026. Replaces the legal-document product scope; retain modular architecture, input/output validation, source provenance, automated quality gates, accessible controls and secret handling.

## Product
Help families navigate smog with a city-based routine, indoor source-control guidance, transport alternatives, direct impact explanations and community actions. Profile: city, sensitivity flag, travel mode/distance/days, budget, cleaner availability, cooking method and a short optional goal. Do not request diagnoses, addresses, precise GPS or household identities.

## Architecture
esbuild web app, shared Zod schemas, strict checkJs on domain/server modules, Node/Vercel-compatible API handlers, Open-Meteo city search and CAMS-derived hourly air forecasts, Gemini for constrained action prioritization. No document upload, PDF parser, document comparison or legal advice remains. No persistent household database. API responses use no-store. AI access is token protected and credentials remain server-side.

## Trust and safety
Label modelled data, provider, timestamp and US AQI scale. Never label it an official local station or India AQI. Reject stale/missing/invalid values. Clearly label fictional demo mode. No silent live-to-demo or AI-to-guidance substitution.

Gemini returns only approved action IDs; code enforces mandatory pollution precautions, checks eligibility and supplies all health guidance, provenance links and deterministic travel arithmetic. Unknown generated IDs fail validation. Exposure reduction, tailpipe-emission reduction and carbon impacts are different; no invented percentages, medical outcomes or city AQI improvements. Individual advice cannot replace public-health measures.

## Direct-impact feature
For a solo-car baseline, a scenario calculates one-way km × 2 × travel days of solo driving that could be replaced by shared/public journeys. Other baselines show zero solo-car travel replaced. This is not total network vehicle-km, measured CO2, or a guarantee of reduced exposure. Each recommendation explains its mechanism and limitations.

## Quality targets
A score above 97% in each category is an ambition, not a prediction. Judge weights and hidden tests are unknown. Publish actual results and remaining gaps.

| Category | Acceptance evidence |
| --- | --- |
| Code quality | Modular responsibilities, shared schemas, lint, strict server/domain checking, reproducible npm ci |
| Security | Input limits, fixed provider hosts, no arbitrary URLs, no exposed key, safe text rendering, origin/method/auth tests |
| Efficiency | Small build, one air lookup and one bounded AI generation per personalization, no document dependencies |
| Testing | AQI boundaries, household scenarios, missing/stale data, safe AI constraints, transport calculations, DOM rendering, API failures |
| Accessibility | Labelled controls, visible focus, text-based risk labels, accessible table, keyboard controls, responsive layout, automated audit plus manual limitations |
| Alignment | City-specific air context, household adaptation, indoor guidance, transport choices, community action and explicit impact assumptions |

## Delivery gates
1. Replace legal scope, examples, UI, prompts and tests.
2. Run formatting, lint, strict type checking, offline tests and production build.
3. Verify live public air data separately from fixtures.
4. Verify Gemini separately when a valid server credential is configured; never claim live AI based on mocks.
5. Document accessibility, provider use limits, privacy and outstanding limitations.
6. Preserve one main branch and source below 10 MB; commit no private environment files.
7. The old Vercel project was deleted at the user's request. Do not recreate or deploy without a new deployment request.
