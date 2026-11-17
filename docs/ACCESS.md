# Access to live analysis

The production app is https://clausecompass-self.vercel.app.

A random deployment access token is stored in the ignored local .env.local file and in Vercel's sensitive APP_ACCESS_TOKEN variable. Enter its value in Live access settings. Do not share it publicly. The Gemini key is stored only in Vercel. Never enter a Gemini key into the app's access-token box.

The supplied Gemini key appeared in chat. Rotate it through Google AI Studio and update the Vercel production secret afterward, then redeploy. No key was committed to Git.

To run the opt-in live tests: node --env-file=.env.local scripts/live.mjs. This sends fictional documents to Gemini and can incur API usage.
