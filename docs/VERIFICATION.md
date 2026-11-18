# AirWise verification â€” 18 November 2026

The legal-topic verification records are superseded; they do not establish current air-quality behavior. Current scope is in BUILD_PLAN.md.

Offline gates: formatting, ESLint, strict checkJs for domain/server/export modules, schema and domain tests, injected provider/API tests, DOM safety and form-structure tests, build. Results are recorded after the final checks.

Live public API: Open-Meteo queried using public New Delhi city coordinates. It returned a validated modelled US AQI/PM2.5 snapshot with 24 forecast hours. This proves provider integration at that test time, not a street-level observation or continuous availability. No air reading is permanently hard-coded as current.

Live Gemini: verified against the new AirWise production project on 18 November 2026. The user approved key reuse for this new destination. The authenticated smoke test returned HTTP 200, modelled air provenance and seven approved actions. This is a functional smoke result, not a broad accuracy benchmark.

Remaining limits: distributed quotas, full browser/mobile/screen-reader QA, professional review of the action catalogue, larger live AI evaluation and broader real-browser evaluation. These gaps prevent any defensible claim of a >97% judge score or complete WCAG conformance.

## Current results
- All 40 deterministic tests pass, including AQI boundary checks, schema/input rejection, safeguards against unapproved AI actions, commute arithmetic, budget-specific options, stale-data handling, safe rendering, labels and the bundled demo workflow.
- Two axe-core structural audits (empty and populated plan) report zero violations in the checked rules. Color contrast is explicitly disabled in jsdom; layout, real keyboard/screen-reader behavior and manual mobile checks remain unverified. This is not WCAG certification.
- Formatting, ESLint, scoped strict type checking and production build pass.
- Dependency audit reports zero known vulnerabilities after replacing Vite's flagged dependency chain with esbuild. No force downgrade or audit suppression was used.
- Full local browser/HTTP preview was attempted but loopback access timed out in this environment. The bundled UI workflow passes in jsdom; direct public-provider integration returned valid data. Do not conflate those checks with a real-browser end-to-end pass.


## Production verification — 18 November 2026
Production: https://airwise-pearl.vercel.app. Vercel reports READY. Homepage, city search, modelled air data and authenticated Gemini personalization each returned HTTP 200. The public air-data endpoint returned 24 forecast hours; the AI planner returned seven approved actions. Server credentials remain outside Git. The old ClauseCompass project was not recreated.
