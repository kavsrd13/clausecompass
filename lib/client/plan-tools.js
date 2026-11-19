import { lowestWindow, commuteSummary } from "../scenario.js";
import { askPlan } from "./api.js";
import { SECONDS_PER_HOUR } from "../forecast.js";
/** @import {Plan} from "../contracts.js" */

/** @template {HTMLElement} T @param {string} id @param {new (...args:never[])=>T} type */
function control(id, type) {
  const el = document.getElementById(id);
  if (!(el instanceof type)) throw new Error("Missing planner control " + id);
  return el;
}
/** @param {Plan} plan @param {()=>void} changed */
function bindWindow(plan, changed) {
  const start = control("window-start", HTMLSelectElement),
    end = control("window-end", HTMLSelectElement),
    duration = control("window-duration", HTMLSelectElement);

  const windowResult = control("window-result", HTMLElement);
  const snapshot = plan.snapshot;
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
      ? `${mode}: ${format(best.start)} to ${format(best.start + length * SECONDS_PER_HOUR)} has the lowest peak forecast US AQI in this range: ${best.peak}. ${best.peak > 100 ? "Even this window has elevated pollution. " : ""}Check local advisories.`
      : "No complete window fits. Widen the range or shorten the activity.";
  }

  start.onchange =
    end.onchange =
    duration.onchange =
      () => {
        compare();
        changed();
      };
  compare();
  return () => ({
    first: start.selectedIndex,
    last: end.selectedIndex,
    duration: Number(duration.value),
  });
}
/** @param {Plan} plan @param {()=>void} changed */
function bindCommute(plan, changed) {
  const days = control("switch-days", HTMLInputElement),
    commute = control("commute-result", HTMLElement);
  const context = plan.context;
  days.max = String(context.days);
  days.disabled = context.commute !== "car";
  days.value = String(days.disabled ? 0 : Math.min(2, context.days));

  const render = () => {
    commute.textContent = commuteSummary(context, Number(days.value));
  };
  days.oninput = () => {
    render();
    changed();
  };
  render();
  return () => Number(days.value);
}
/** @param {Plan} plan @param {()=>string} token @param {AbortSignal} signal */
export function showTools(plan, token, signal) {
  const answer = control("plan-answer", HTMLElement),
    ask = control("ask-plan", HTMLButtonElement),
    question = control("plan-question", HTMLInputElement);
  let current = new AbortController();
  function changed() {
    current.abort();
    current = new AbortController();
    answer.textContent = "";
    ask.disabled = false;
  }
  const windowSelection = bindWindow(plan, changed),
    selectedDays = bindCommute(plan, changed);
  changed();
  question.value = "";
  question.oninput = changed;
  ask.onclick = async () => {
    const text = question.value.trim(),
      access = token();
    if (!text || !access) {
      answer.textContent = "Enter a question and an app access token.";
      return;
    }
    const owner = AbortSignal.any([signal, current.signal]);
    ask.disabled = true;
    answer.textContent = "Looking through this plan…";
    try {
      const reply = await askPlan(
        {
          question: text,
          profile: plan.context,
          snapshot: plan.snapshot,
          selection: { ...windowSelection(), days: selectedDays() },
        },
        access,
        AbortSignal.any([owner, AbortSignal.timeout(40000)]),
      );
      if (!owner.aborted)
        answer.textContent =
          (plan.snapshot.kind === "demo"
            ? "Fictional scenario"
            : "Modelled forecast") +
          " · " +
          reply.answer;
    } catch (error) {
      if (!owner.aborted)
        answer.textContent =
          error instanceof Error ? error.message : "Please retry.";
    } finally {
      if (!owner.aborted) ask.disabled = false;
    }
  };
  document.getElementById("plan-tools")?.removeAttribute("hidden");
}
