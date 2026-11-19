/** @import {AirSnapshot, Plan} from "../contracts.js" */
/** @param {AirSnapshot["hours"]} hours @param {number} first @param {number} last @param {number} duration */
export function lowestWindow(hours, first, last, duration) {
  let best;
  for (let i = first; i + duration - 1 <= last; i++) {
    const rows = hours.slice(i, i + duration);
    const start = rows[0];
    if (
      !start ||
      rows.length !== duration ||
      rows.some((r, j) => r.time !== start.time + j * 3600)
    )
      continue;
    const peak = Math.max(...rows.map((r) => r.aqi));
    if (!best || peak < best.peak) best = { start: start.time, peak };
  }
  return best;
}
/** @param {Plan} plan @param {()=>string} token @param {AbortSignal} signal */
export function showTools(plan, token, signal) {
  const section = document.querySelector("#plan-tools");
  /** @template {HTMLElement} T @param {string} id @param {new (...args:never[])=>T} type */
  function control(id, type) {
    const el = document.getElementById(id);
    if (!(el instanceof type)) throw new Error("Missing planner control " + id);
    return el;
  }
  const start = control("window-start", HTMLSelectElement),
    end = control("window-end", HTMLSelectElement),
    duration = control("window-duration", HTMLSelectElement);
  const windowResult = control("window-result", HTMLElement),
    commute = control("commute-result", HTMLElement),
    days = control("switch-days", HTMLInputElement);
  const answer = control("plan-answer", HTMLElement),
    ask = control("ask-plan", HTMLButtonElement),
    question = control("plan-question", HTMLInputElement);
  const { snapshot, context } = plan;
  const format = (/** @type {number} */ seconds) =>
    new Date(seconds * 1000).toLocaleString(undefined, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  const mode =
    snapshot.kind === "demo" ? "Fictional scenario" : "Modelled forecast";
  for (const select of [start, end])
    select.replaceChildren(
      ...snapshot.hours.map((h, i) => new Option(format(h.time), String(i))),
    );
  end.selectedIndex = snapshot.hours.length - 1;
  duration.value = "1";
  function compare() {
    const length = Number(duration.value);
    const best = lowestWindow(
      snapshot.hours,
      start.selectedIndex,
      end.selectedIndex,
      length,
    );
    windowResult.textContent = best
      ? `${mode}: ${format(best.start)} to ${format(best.start + length * 3600)} has the lowest peak forecast US AQI in this range: ${best.peak}. ${best.peak > 100 ? "Even this window has elevated pollution. " : ""}Check local advisories.`
      : "No complete window fits. Widen the range or shorten the activity.";
  }
  function simulate() {
    const count = Number(days.value);
    const replaced = Math.round(context.distanceKm * 2 * count * 10) / 10;
    commute.textContent =
      context.commute === "car"
        ? `${count} switched days. Baseline: ${plan.avoidedKm} km of solo driving. Proposed: ${Math.round((plan.avoidedKm - replaced) * 10) / 10} km. Replaced: ${replaced} km per week.`
        : "Your baseline has no solo-car commute to replace.";
  }
  days.max = String(context.days);
  days.disabled = context.commute !== "car";
  days.value = String(days.disabled ? 0 : Math.min(2, context.days));
  days.oninput = simulate;
  start.onchange = end.onchange = duration.onchange = compare;
  compare();
  simulate();
  answer.textContent = "";
  question.value = "";
  ask.disabled = false;
  ask.onclick = async () => {
    const text = question.value.trim(),
      access = token();
    if (!text || !access) {
      answer.textContent = "Enter a question and an app access token.";
      return;
    }
    ask.disabled = true;
    answer.textContent = "Looking through this plan…";
    try {
      const response = await fetch("/api/question", {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.any([signal, AbortSignal.timeout(40000)]),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + access,
        },
        body: JSON.stringify({ question: text, profile: context, snapshot }),
      });
      const data = await response.json();
      if (!response.ok || typeof data.answer !== "string") throw new Error();
      if (!signal.aborted) answer.textContent = mode + " · " + data.answer;
    } catch {
      if (!signal.aborted)
        answer.textContent =
          "Could not get an answer. Check your access token and retry.";
    } finally {
      if (!signal.aborted) ask.disabled = false;
    }
  };
  section?.removeAttribute("hidden");
}
