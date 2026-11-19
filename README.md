# AirWise · Urban Air Quality Assistant

AirWise helps families turn a city's winter-smog forecast into a daily routine. It pairs each action with an explanation of its impact and a source. It was built for Hack2Skill Challenge 6. [Open the deployed planner](https://airwise-pearl.vercel.app)

## Try it

Select **Try winter-smog demo**. The default solo-car commute of 8 km each way on five days gives 80 km of weekly travel that could shift to shared or public journeys. Change the distance to 2 km and rebuild to see 20 km. Open the hourly table, download the plan, or print it.

| Mode | Input and result | Access |
| --- | --- | --- |
| Winter-smog demo | Uses a fictional day and the selected household preferences | Works offline once the page has loaded |
| Check air & build a plan | Looks up a city forecast and selects actions on the device. Only coordinates go to the forecast endpoint. | Public |
| Personalize with Gemini | Uses current modelled air, the household profile and an optional goal to rank eligible actions | Enter the private app access token under **AI personalization access** |

## Run locally

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. The local server builds the client on startup and serves the same API routes as production. Restart it after editing the client. Gemini configuration and deployment instructions are in the [access guide](docs/ACCESS.md).

## How a plan is built

1. Pick a city or search for one. The forecast uses US AQI and PM2.5, with a timestamp and up to 24 hourly entries. Missing hours are omitted. An unusable forecast produces an error.
2. Household sensitivity, cooking fuel, budget, cleaner availability and travel mode determine which actions apply. The catalogue covers indoor source control, daily routines, transport and community choices.
3. For AI personalization, Gemini receives the eligible IDs and titles. The server checks its ranking against those IDs and puts mandatory precautions first. Application code supplies source links, guidance and travel arithmetic.
4. The travel scenario estimates solo-car kilometres that could be replaced. Actual emissions and exposure depend on the route, vehicle, occupancy and indoor conditions.

## Checks

Run `npm run verify` for formatting, lint, strict type checking, unit and integration tests, and the production build. Run `npx playwright install chromium` followed by `npm run test:browser` for the desktop and phone-width workflows. The browser suite uses fixtures for external services. [Verification results](docs/VERIFICATION.md) · [Code structure](docs/CODE_QUALITY.md) · [Continuous integration](https://github.com/kavsrd13/clausecompass/actions/workflows/verify.yml)

## Sources and privacy

Air data comes from Open-Meteo's CAMS model forecasts. Grid-level US AQI can differ from street-level readings and national AQIs. Check local official advisories. The public provider has usage and attribution terms. [Open-Meteo](https://open-meteo.com/en/docs/air-quality-api) · [CAMS](https://atmosphere.copernicus.eu/) · [US AQI](https://www.airnow.gov/aqi/aqi-basics/)

The catalogue provides general pollution-prevention information. It draws on guidance for reducing exposure, managing indoor particles, choosing air cleaners and maintaining ventilation. [WHO](https://www.who.int/news-room/questions-and-answers/item/air-pollution-personal-interventions-and-risk-communication) · [EPA on air cleaners](https://www.epa.gov/indoor-air-quality-iaq/guide-air-cleaners-home) · [EPA on indoor particles](https://www.epa.gov/indoor-air-quality-iaq/indoor-particulate-matter) · [EPA on ventilation](https://www.epa.gov/indoor-air-quality-iaq/improving-indoor-air-quality)

The app keeps household inputs in page memory. City search sends the search text to Open-Meteo. AI personalization sends the selected city name, preferences and optional goal to Google. Leave personal medical details out of the goal. Provider retention terms apply. The paid AI route uses a private token. Distributed usage quotas and manual screen-reader evaluation remain open.
