import "./style.css";
import { buildPlan, demoSnapshot } from "./lib/air.js";
import {
  loadGuidance,
  loadPersonalization,
  searchCities,
} from "./lib/client/api.js";
import {
  citySelect,
  element,
  form,
  readProfile,
  searchInput,
  showCities,
  tokenInput,
} from "./lib/client/form.js";
import { renderReview } from "./lib/client/review.js";
import { createBrief } from "./lib/client/export.js";
import { LatestRequest } from "./lib/client/latest-request.js";
/** @import {Plan} from "./lib/contracts.js" */

const output = element("output", HTMLElement);
const badge = element("badge", HTMLElement);
const status = element("status", HTMLElement);
const searchStatus = element("search-status", HTMLElement);
const searchButton = element("search", HTMLButtonElement);
const guidanceButton = element("guidance", HTMLButtonElement);
const aiButton = element("ai", HTMLButtonElement);
const downloadButton = element("export", HTMLButtonElement);
const printButton = element("print", HTMLButtonElement);
/** @type {Plan | null} */
let result = null;
const planRequest = new LatestRequest(45_000, setPlanBusy);
const cityRequest = new LatestRequest(12_000, (busy) => {
  searchButton.disabled = busy;
});

/** @param {boolean} busy */
function setPlanBusy(busy) {
  guidanceButton.disabled = busy;
  aiButton.disabled = busy;
  output.setAttribute("aria-busy", String(busy));
}

/** @param {string} label @param {string} message */
function clearPlan(label, message) {
  planRequest.cancel();
  result = null;
  output.replaceChildren();
  badge.textContent = label;
  status.textContent = message;
  downloadButton.disabled = true;
  printButton.disabled = true;
}

function cancelSearch() {
  cityRequest.cancel();
  searchStatus.textContent = "";
}

/** @param {Plan} plan */
function showPlan(plan) {
  renderReview(document, plan);
  result = plan;
  downloadButton.disabled = false;
  printButton.disabled = false;
  if (plan.snapshot.kind === "demo") {
    badge.textContent = "FICTIONAL DEMO";
    status.textContent =
      "Fictional winter-smog example. These are not current readings.";
  } else {
    badge.textContent = plan.ai ? "LIVE DATA · GEMINI" : "LIVE DATA · GUIDANCE";
    status.textContent =
      "Plan ready. Check local official advisories before acting.";
  }
}

/** @param {unknown} error */
function errorMessage(error) {
  if (error instanceof Error && error.name === "TimeoutError")
    return "The request timed out. Please try again.";
  return error instanceof Error
    ? error.message
    : "Service unavailable. Please try again.";
}

/** @param {"guidance" | "ai"} mode */
async function runPlan(mode) {
  if (!form.reportValidity()) return;
  cancelSearch();
  const ai = mode === "ai";
  clearPlan(
    "CHECKING AIR",
    ai
      ? "Checking modelled air and personalizing priorities…"
      : "Checking modelled outdoor air…",
  );
  await planRequest.run(
    (signal) => {
      const profile = readProfile();
      return ai
        ? loadPersonalization(profile, signal, tokenInput.value)
        : loadGuidance(profile, signal);
    },
    showPlan,
    (error) => {
      badge.textContent = "PLAN UNAVAILABLE";
      status.textContent = errorMessage(error);
    },
  );
}

/** @param {import("./lib/contracts.js").City[]} matches */
function showCityResults(matches) {
  if (matches.length === 0) {
    searchStatus.textContent = "No matching city found. Try another name.";
    return;
  }
  showCities(matches);
  clearPlan("CITY CHANGED", "Build a plan for the selected city.");
  searchStatus.textContent = "Select the correct city and build your plan.";
}

async function findCity() {
  const query = searchInput.value.trim();
  if (query.length < 2) {
    cancelSearch();
    searchStatus.textContent = "Enter at least two characters for city search.";
    return;
  }
  searchStatus.textContent = "Searching for your city…";
  await cityRequest.run(
    (signal) => searchCities(query, signal),
    showCityResults,
    (error) => {
      searchStatus.textContent = errorMessage(error);
    },
  );
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void runPlan("guidance");
});
aiButton.addEventListener("click", () => void runPlan("ai"));
searchButton.addEventListener("click", findCity);
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.isComposing) {
    event.preventDefault();
    void findCity();
  }
});
form.addEventListener("input", (event) => {
  if (event.target === searchInput) return cancelSearch();
  if (event.target === tokenInput) return;
  if (event.target === citySelect) cancelSearch();
  clearPlan("PROFILE CHANGED", "Profile changed. Build a new plan.");
});
element("demo", HTMLButtonElement).addEventListener("click", () => {
  if (!form.reportValidity()) return;
  cancelSearch();
  clearPlan("", "");
  showPlan(buildPlan(readProfile(), demoSnapshot()));
});
downloadButton.addEventListener("click", () => {
  if (!result) return;
  const url = URL.createObjectURL(
    new Blob([createBrief(result)], { type: "text/markdown" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "airwise-family-plan.md";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
printButton.addEventListener("click", () => window.print());
element("clear", HTMLButtonElement).addEventListener("click", () => {
  form.reset();
  cancelSearch();
  showCities();
  clearPlan(
    "READY WHEN YOU ARE",
    "Try a fictional demo or check modelled air for your city.",
  );
});
showCities();
