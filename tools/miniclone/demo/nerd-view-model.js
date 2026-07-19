import {
  formatActivityMetrics,
  translateActivityNerd,
} from "./activity-catalog.js";

const NERD_ENTRY_LIMIT = 12;

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

function sameActivity(left, right) {
  if (left === right) return true;
  const a = record(left);
  const b = record(right);
  if (a === null || b === null) return false;
  return (a.local_sequence ?? null) === (b.local_sequence ?? null)
    && (a.source_sequence ?? null) === (b.source_sequence ?? null)
    && (a.run_id ?? null) === (b.run_id ?? null)
    && (a.workflow_generation ?? null) === (b.workflow_generation ?? null)
    && (a.code ?? null) === (b.code ?? null)
    && (a.phase ?? null) === (b.phase ?? null);
}

function projectEntry(event, isProgress) {
  const source = record(event) ?? {};
  return Object.freeze({
    text: translateActivityNerd(source),
    severity: ["info", "success", "warning", "error"].includes(source.severity)
      ? source.severity
      : "info",
    isProgress,
    metrics: source.metrics == null ? "" : formatActivityMetrics(source.metrics),
  });
}

export function createNerdTrustViewModel({
  workflowState: _workflowState = null,
  activitySnapshot = null,
} = {}) {
  const snapshot = record(activitySnapshot) ?? {};
  const history = Array.isArray(snapshot.history)
    ? snapshot.history.filter((entry) => record(entry) !== null)
    : [];
  const progress = record(snapshot.currentProgress);

  let currentSource = progress;
  let currentIsProgress = progress !== null;
  let priorSources = history;
  if (progress !== null) {
    priorSources = history.filter((entry) => !sameActivity(entry, progress));
  } else if (history.length > 0) {
    currentSource = history[history.length - 1];
    currentIsProgress = false;
    priorSources = history.slice(0, -1);
  }

  const prior = Object.freeze(priorSources
    .slice(-Math.max(0, NERD_ENTRY_LIMIT - (currentSource === null ? 0 : 1)))
    .map((event) => projectEntry(event, false)));
  const current = currentSource === null ? null : projectEntry(currentSource, currentIsProgress);
  const entries = Object.freeze(current === null ? [...prior] : [...prior, current]);

  return Object.freeze({
    current,
    prior,
    entries,
    hasActivity: entries.length > 0,
  });
}

