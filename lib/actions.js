export const SOURCES = Object.freeze({
  who: "https://www.who.int/news-room/questions-and-answers/item/air-pollution-personal-interventions-and-risk-communication",
  epa: "https://www.epa.gov/indoor-air-quality-iaq/guide-air-cleaners-home",
  ventilation:
    "https://www.epa.gov/indoor-air-quality-iaq/improving-indoor-air-quality",
  particles:
    "https://www.epa.gov/indoor-air-quality-iaq/indoor-particulate-matter",
  airnow: "https://www.airnow.gov/aqi/aqi-basics/",
});
/** @param {import("./contracts.js").HouseholdProfile} input @param {number} aqi @returns {import("./contracts.js").Action[]} */
export function eligibleActions(input, aqi) {
  const severe = aqi > 150 || (input.sensitive && aqi > 100);
  /** @type {import("./contracts.js").Action[]} */
  const actions = [
    {
      id: "reduce-exposure",
      title: severe
        ? "Move strenuous activity indoors"
        : "Keep outdoor plans flexible",
      action: severe
        ? "Reduce prolonged or strenuous outdoor activity during this polluted period. Choose gentle indoor activity in a cleaner space; check local public-health advisories before essential trips."
        : "Check conditions before outdoor activity. Choose routes away from heavy traffic and adjust duration and effort if air quality worsens.",
      impact:
        "Reduces time breathing polluted outdoor air. Indoor air can also be polluted; no exposure reduction percentage can be guaranteed.",
      source: SOURCES.who,
      mandatory: severe,
    },
    {
      id: "clean-room",
      title: input.purifier
        ? "Use your cleaner-air room"
        : "Make one room cleaner",
      action: input.purifier
        ? "Run a properly sized particle-filtering cleaner in the room used most. Keep its airflow clear and follow filter-maintenance instructions. Avoid devices that intentionally produce ozone."
        : "Reduce indoor smoke sources and choose a room away from outdoor traffic. If buying a cleaner later, compare room size and clean-air delivery rate; avoid ozone-generating devices.",
      impact:
        "Source control and particle filtration can reduce indoor particle levels. They do not remove every pollutant or replace necessary ventilation.",
      source: SOURCES.epa,
      mandatory: severe,
    },
  ];
  if (input.budget === "some" && !input.purifier) {
    actions.push({
      id: "filter-option",
      title: "Consider an appropriately sized cleaner",
      action:
        "If affordable, compare particle air cleaners by clean-air delivery rate and room size. Avoid ozone-generating products. Keep source control and necessary ventilation as priorities.",
      impact:
        "Filtration supplements source control; it does not remove every pollutant or guarantee health outcomes.",
      source: SOURCES.epa,
      mandatory: false,
    });
  }
  actions.push(
    {
      id: "smoke-sources",
      title: "Skip indoor smoke sources",
      action:
        "Avoid smoking, incense, candles and indoor waste burning. Use a damp cloth for dust rather than stirring it into the air.",
      impact:
        "Prevents additional particles inside the home; no indoor concentration is inferred without a sensor.",
      source: SOURCES.particles,
      mandatory: false,
    },
    {
      id: "ventilation",
      title: "Ventilate thoughtfully",
      action:
        "When outdoor air is heavily polluted, limit unnecessary outdoor-air entry. Ventilate when outdoor air improves. Keep required exhaust, combustion safety and carbon-monoxide protection in place; never seal a room with an unvented fuel-burning device.",
      impact:
        "Balances outdoor particle entry with indoor pollutant removal. A particle filter does not make carbon monoxide safe.",
      source: SOURCES.ventilation,
      mandatory: false,
    },
  );
  if (input.commute === "car") {
    actions.push({
      id: "transit",
      title: "Replace a solo-car trip",
      action:
        "Where practical, use public transport or a shared journey instead of driving alone. On heavily polluted days avoid replacing the trip with strenuous cycling or walking; reduce time near busy roads.",
      impact:
        "Can reduce solo driving and tailpipe emissions. Public transport and shared vehicles still have emissions; route, occupancy and vehicle type matter.",
      source: SOURCES.who,
      mandatory: false,
    });
  }
  if (input.commute === "active") {
    actions.push({
      id: "active-travel",
      title: "Adapt your active commute",
      action: severe
        ? "For essential journeys, consider transport that avoids prolonged exertion outdoors. Use a less traffic-heavy route where feasible and follow local advisories."
        : "Choose a route away from heavy traffic where feasible. Recheck air quality before setting out and adjust effort if conditions worsen.",
      impact:
        "Route and effort affect exposure. Cleaner transport choices do not make a polluted journey risk-free.",
      source: SOURCES.who,
      mandatory: severe,
    });
  }
  if (input.cooking !== "electric") {
    actions.push({
      id: "cooking",
      title: "Reduce cooking smoke",
      action:
        input.cooking === "solid"
          ? "Keep solid-fuel burning out of enclosed living spaces. Where feasible, use cleaner cooking options and maintain safe exhaust. Do not burn charcoal indoors."
          : "Use cooking exhaust vented outdoors where available. Avoid unnecessary frying or charring, and consider electric cooking when practical and affordable.",
      impact:
        "Reduces avoidable indoor combustion sources. Exhaust and ventilation remain important; do not disable gas safety measures.",
      source: SOURCES.particles,
      mandatory: false,
    });
  }
  actions.push({
    id: "community",
    title: "Make a community clean-air commitment",
    action:
      "Coordinate no-idling school pickups, shared trips and no open waste burning with neighbours. Share official local advisories rather than unverified readings.",
    impact:
      "Targets pollution at its source. Collective benefit depends on actual participation; a pledge is not a measured reduction.",
    source: SOURCES.who,
    mandatory: false,
  });
  return actions;
}
