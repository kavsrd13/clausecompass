# AirWise access and deployment

Production: https://airwise-pearl.vercel.app

A new AirWise Vercel project was deployed on 18 November 2026 at the user's explicit request. The earlier ClauseCompass project remains deleted. The user explicitly approved reusing the previously supplied Gemini key for this new project; it is stored as a sensitive server-only production variable. No API key is committed or embedded in browser code.

A new APP_ACCESS_TOKEN protects Gemini requests. Its value is stored in the ignored local .env.local file and as a sensitive Vercel production variable. Enter the value in the app's AI personalization access field. Do not put the Gemini key there. Public guidance-only mode, city search and air data do not need that token. Do not share the token publicly.

Local development: npm run dev. Live smoke test: set APP_URL to the production URL and run node --env-file=.env.local scripts/live.mjs. This sends a fictional profile and can incur Gemini API usage. The earlier chat-shared Gemini key should be rotated through Google AI Studio and then updated in Vercel.
