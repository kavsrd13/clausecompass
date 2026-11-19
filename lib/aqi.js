// Each upper bound is inclusive. The last column is AirWise's household precaution policy.
const bands = [
  { maximum: 50, label: "Good", precautionsFor: "none" },
  { maximum: 100, label: "Moderate", precautionsFor: "none" },
  {
    maximum: 150,
    label: "Unhealthy for sensitive groups",
    precautionsFor: "sensitive",
  },
  { maximum: 200, label: "Unhealthy", precautionsFor: "everyone" },
  { maximum: 300, label: "Very unhealthy", precautionsFor: "everyone" },
];
const hazardous = { label: "Hazardous", precautionsFor: "everyone" };

/** @param {number} aqi */
function bandFor(aqi) {
  if (!Number.isFinite(aqi) || aqi < 0) throw new RangeError("Invalid AQI");
  return bands.find((band) => aqi <= band.maximum) ?? hazardous;
}

/** @param {number} aqi */
export function category(aqi) {
  return bandFor(aqi).label;
}

/** @param {number} aqi @param {boolean} sensitive */
export function needsSmogPrecautions(aqi, sensitive) {
  const { precautionsFor } = bandFor(aqi);
  return (
    precautionsFor === "everyone" ||
    (precautionsFor === "sensitive" && sensitive)
  );
}
