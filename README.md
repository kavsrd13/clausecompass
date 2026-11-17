# ClauseCompass
Legal document explanation, revision comparison and preparation questions with exact source quotes. Information only, not legal advice.

## Run
Node 24: `npm ci`, `npm run dev`. The fictional example works offline. For local serverless API development use `npx vercel dev`.

## Vercel
Import this repository or run `npx vercel --prod`. Configure GEMINI_API_KEY, GEMINI_MODEL and a strong APP_ACCESS_TOKEN as server environment variables. Users enter the access token in Live access settings; never put the Gemini key in the browser. Live generation is disabled without both credentials. This access-controlled prototype does not implement the planned distributed quotas; do not expose its access token publicly.

## Verification
`npm test` tests input boundaries, citation validation and output schema. `npm run build` builds the frontend. Live-model quality, manual accessibility review, and the extensive benchmark in BUILD_PLAN.md remain separate verification work. The implementation is a smaller prototype than that full plan: no DOCX/OCR, persistent storage, jurisdiction-specific advice or autonomous actions.

## Privacy
Raw files are parsed in browser memory. Extracted text is sent to the server and Gemini on live requests. No document database or browser persistent storage is used. Provider retention policies still apply. Use fictional/non-confidential material. Clearing reloads the workspace; provider-side requests may already have been processed.

Stored example output is explicitly labeled. Live errors are never replaced with example output. Quotes are checked for existence; this does not prove interpretation accuracy. Editing inputs invalidates results. Source review uses expandable exact quotes rather than PDF coordinate highlighting. Input limits are character/page/byte limits, not exact provider token counting.

## Challenge
Keep only main, public repository below 10 MB. Do not commit node_modules, dist, secrets or videos. No challenge submissions are automated.
