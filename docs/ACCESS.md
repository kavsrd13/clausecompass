# Access and deployment

The fictional demo, city search and guidance planner are public. Select **Personalize with Gemini** to use the protected AI route. Reviewers with an app access token can enter it under **AI personalization access**. [Production planner](https://airwise-pearl.vercel.app)

| Server environment variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Google Gemini API credential for server-side generation |
| `APP_ACCESS_TOKEN` | Private bearer token accepted by the app for AI requests |
| `GEMINI_MODEL` | Optional model override. The default is `gemini-3.1-flash-lite`. |

For local AI runs, copy the variable names from `.env.example` into an ignored `.env.local` and set the values there. For Vercel, set production secrets in the AirWise project and deploy. Only the app access token belongs in the UI. Supply it to authorized reviewers privately. Git and the deployment upload both exclude local secret files.

## Verify live personalization

Set `APP_URL` to the intended running instance. With its app access token in `.env.local`, run `node --env-file=.env.local scripts/live.mjs`. This sends one fictional household request to Gemini and can incur API charges. It checks the response contract, modelled provenance, action membership and safety order, and the 80 km travel calculation.
