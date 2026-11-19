import { activitySummary, commuteSummary } from "../scenario.js";
import { askPlan } from "./api.js";

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
  /** @returns {Pick<import("../question-contract.js").Selection,"first"|"last"|"duration">} */
  const selection = () => ({
    first: start.selectedIndex,
    last: end.selectedIndex,
    duration: duration.value === "2" ? 2 : 1,
  });
  function compare() {
    windowResult.textContent =
      mode + ": " + activitySummary(snapshot, selection(), format);
  }

  start.onchange =
    end.onchange =
    duration.onchange =
      () => {
        compare();
        changed();
      };
  compare();
  return {
    selection,
    refresh: compare,
    clear() {
      start.onchange = end.onchange = duration.onchange = null;
      start.replaceChildren();
      end.replaceChildren();
      windowResult.textContent = "";
    },
  };
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
  return {
    selection: () => Number(days.value),
    clear() {
      days.oninput = null;
      commute.textContent = "";
      days.value = "0";
    },
  };
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
  const selection = () => ({
    ...windowSelection.selection(),
    days: selectedDays.selection(),
  });
  const view = document.defaultView;
  let timer = 0;
  function refresh() {
    windowSelection.refresh();
    changed();
    const now = Date.now();
    const next = plan.snapshot.hours.find((h) => h.time * 1000 >= now);
    if (next && view)
      timer = view.setTimeout(refresh, next.time * 1000 - now + 1);
  }
  if (plan.snapshot.kind === "modelled") refresh();
  signal.addEventListener(
    "abort",
    () => {
      view?.clearTimeout(timer);
      current.abort();
      question.value = answer.textContent = "";
      ask.onclick = question.oninput = null;
      windowSelection.clear();
      selectedDays.clear();
    },
    { once: true },
  );
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
          selection: selection(),
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
  return selection;
}
