export const profile = {
  city: "New Delhi, India",
  latitude: 28.61,
  longitude: 77.21,
  sensitive: true,
  commute: "car",
  distanceKm: 8,
  days: 5,
  budget: "free",
  purifier: false,
  cooking: "gas",
  goal: "No-cost school pickup plan",
};
export const now = Date.UTC(2026, 10, 18, 8, 30);
export function responseRecorder() {
  return {
    code: 200,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.code = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
  };
}
export function airResponse() {
  const t = Math.floor(now / 3600000) * 3600;
  return {
    hourly: {
      time: [t - 3600, t, t + 3600],
      us_aqi: [220, 235, 210],
      pm2_5: [170, 185, 155],
    },
  };
}
