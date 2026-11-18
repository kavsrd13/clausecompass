import "./style.css";
import { requestSchema, planSchema, snapshotSchema } from "./lib/contracts.js";
import { buildPlan, demoSnapshot } from "./lib/air.js";
import { renderReview } from "./lib/client/review.js";
import { createBrief } from "./lib/client/export.js";
const $ = (id) => document.getElementById(id);
let locations = [
  { name: "New Delhi, India", latitude: 28.61, longitude: 77.21 },
  { name: "Mumbai, India", latitude: 19.08, longitude: 72.88 },
  { name: "Lahore, Pakistan", latitude: 31.55, longitude: 74.34 },
  { name: "London, United Kingdom", latitude: 51.51, longitude: -0.13 },
  { name: "New York, United States", latitude: 40.71, longitude: -74.01 },
  { name: "Beijing, China", latitude: 39.9, longitude: 116.4 },
];
let result = null;
let revision = 0;
let controller;
const status = (text) => ($("status").textContent = text);
function populate() {
  $("city").replaceChildren(
    ...locations.map((city, i) => {
      const option = document.createElement("option");
      option.value = String(i);
      option.textContent = city.name;
      return option;
    }),
  );
}
function read() {
  const city = locations[Number($("city").value)];
  return requestSchema.parse({
    city: city.name,
    latitude: city.latitude,
    longitude: city.longitude,
    sensitive: $("sensitive").checked,
    commute: $("commute").value,
    distanceKm: Number($("distance").value),
    days: Number($("days").value),
    budget: $("budget").value,
    purifier: $("purifier").checked,
    cooking: $("cooking").value,
    goal: $("goal").value,
  });
}
function invalidate() {
  revision++;
  controller?.abort();
  result = null;
  $("export").disabled = true;
  $("badge").textContent = "PROFILE CHANGED";
  $("output").replaceChildren();
  status("Profile changed. Build a new plan.");
}
function show(plan) {
  result = plan;
  renderReview(document, plan);
  $("export").disabled = false;
  $("badge").textContent =
    plan.snapshot.kind === "demo"
      ? "FICTIONAL DEMO"
      : plan.ai
        ? "LIVE DATA · GEMINI"
        : "LIVE DATA · GUIDANCE";
  status(
    plan.snapshot.kind === "demo"
      ? "Fictional winter-smog example. These are not current readings."
      : "Plan ready. Check local official advisories before acting.",
  );
}
async function post(path, body, signal, token = "") {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || "Service unavailable");
  return data;
}
async function run(ai = false) {
  if (!$("profile").reportValidity()) return;
  const generation = ++revision;
  controller?.abort();
  controller = new AbortController();
  const activeController = controller;
  const signal = AbortSignal.any([
    controller.signal,
    AbortSignal.timeout(45000),
  ]);
  $("guidance").disabled = true;
  $("ai").disabled = true;
  document.querySelector(".results").setAttribute("aria-busy", "true");
  status(
    ai
      ? "Checking modelled air and personalizing priorities…"
      : "Checking modelled outdoor air…",
  );
  try {
    const profile = read();
    const plan = ai
      ? planSchema.parse(
          await post("/api/analyze", profile, signal, $("token").value),
        )
      : planSchema.parse(
          buildPlan(
            profile,
            snapshotSchema.parse(await post("/api/air", profile, signal)),
          ),
        );
    if (generation === revision) show(plan);
  } catch (e) {
    if (generation === revision)
      status(e.name === "AbortError" ? "Request cancelled." : e.message);
  } finally {
    if (controller === activeController) {
      controller = null;
      $("guidance").disabled = false;
      $("ai").disabled = false;
      document.querySelector(".results").setAttribute("aria-busy", "false");
    }
  }
}
$("profile").onsubmit = (e) => {
  e.preventDefault();
  run();
};
$("ai").onclick = () => run(true);
$("demo").onclick = () => {
  if (!$("profile").reportValidity()) return;
  invalidate();
  show(planSchema.parse(buildPlan(read(), demoSnapshot())));
};
$("profile").addEventListener("input", (e) => {
  if (e.target.id !== "token" && e.target.id !== "city-search") invalidate();
});
$("search").onclick = async () => {
  const query = $("city-search").value.trim();
  if (query.length < 2) {
    status("Enter at least two letters for city search.");
    return;
  }
  $("search").disabled = true;
  try {
    const data = await post(
      "/api/locations",
      { query },
      AbortSignal.timeout(12000),
    );
    if (!data.locations.length)
      throw Error("No matching city found. Try another name.");
    locations = data.locations;
    populate();
    invalidate();
    status("Select the correct city and build your plan.");
  } catch (e) {
    status(e.message);
  } finally {
    $("search").disabled = false;
  }
};
$("export").onclick = () => {
  if (!result) return;
  const url = URL.createObjectURL(
    new Blob([createBrief(result)], { type: "text/markdown" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "airwise-family-plan.md";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$("print").onclick = () => window.print();
$("clear").onclick = () => location.reload();
populate();
