import {
  ACTIVITY_LIMITS,
  RECOVERY_PROVENANCE_CODES,
  normalizeActivityEvent,
  redactActivityText,
  sanitizeStableCode,
} from "./activity-catalog.js";
import { isVerifiedCompletedTerminal } from "./workflow-state.js";

const DEFAULT_CLOCK = Object.freeze({
  now() {
    return Date.now();
  },
});

const DEFAULT_SCHEDULER = Object.freeze({
  setTimeout(callback, delay) {
    return globalThis.setTimeout(callback, delay);
  },
  clearTimeout(handle) {
    globalThis.clearTimeout(handle);
  },
});

const TERMINAL_CODES = new Set(["completed", "cancelled", "partial_failure"]);
const RECOVERY_PROVENANCE = new Set(RECOVERY_PROVENANCE_CODES);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonnegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function boundedRunId(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, ACTIVITY_LIMITS.identifier);
  if (!trimmed) return null;
  if (/\bERASE\s+(?:DISK|DRIVE)\s+\d+\b/i.test(trimmed)) return "[typed_phrase_redacted]";
  return trimmed.replace(/[^A-Za-z0-9_.:@-]+/g, "_");
}

function clockReader(clock) {
  let last = 0;
  return () => {
    try {
      const value = typeof clock === "function" ? clock() : clock.now();
      if (!Number.isFinite(value) || value < 0) return last;
      last = Math.max(last, Math.trunc(value));
      return last;
    } catch {
      return last;
    }
  };
}

function createBoundedKeySet(limit) {
  const keys = new Set();
  const order = [];
  return {
    has(key) {
      return keys.has(key);
    },
    add(key) {
      if (keys.has(key)) return false;
      keys.add(key);
      order.push(key);
      while (order.length > limit) keys.delete(order.shift());
      return true;
    },
    clear() {
      keys.clear();
      order.length = 0;
    },
  };
}

function freezeRecovery(recovery, status) {
  if (!isRecord(recovery)) return null;
  const rawProvenance = recovery.provenance ?? recovery.source ?? recovery.kind;
  const provenance = sanitizeStableCode(rawProvenance, "unknown_recovery");
  const safeProvenance = RECOVERY_PROVENANCE.has(provenance) ? provenance : "unknown_recovery";
  const cancellation = recovery.cancellation_available ?? recovery.cancellationAvailable;
  return Object.freeze({
    recovered: true,
    provenance: safeProvenance,
    active: typeof recovery.active === "boolean"
      ? recovery.active
      : typeof status?.active === "boolean" ? status.active : null,
    cancellation_available: typeof cancellation === "boolean" ? cancellation : null,
  });
}

function terminalTruthFromStatus(terminal) {
  if (!isRecord(terminal)) return null;
  return {
    physical_restore_completed: terminal.physical_restore_completed ?? terminal.physicalRestoreCompleted,
    prepared_to_boot: terminal.prepared_to_boot ?? terminal.preparedToBoot,
    boot_tested: terminal.boot_tested ?? terminal.bootTested,
    cleanup_complete: terminal.cleanup_complete ?? terminal.cleanupComplete,
    target_offline: terminal.target_offline ?? terminal.targetOffline,
  };
}

function terminalCode(terminal, status) {
  const state = sanitizeStableCode(
    terminal?.final_state ?? terminal?.finalState ?? status?.phase,
    "partial_failure",
  );
  if (state === "completed" && !isVerifiedCompletedTerminal(terminal)) return "partial_failure";
  return TERMINAL_CODES.has(state) ? state : "partial_failure";
}

function enforceCompletedActivityTruth(rawEvent, status) {
  const code = rawEvent?.code ?? rawEvent?.activity_code ?? rawEvent?.activityCode;
  if (code !== "completed" || isVerifiedCompletedTerminal(status?.terminal)) return rawEvent;
  return {
    ...rawEvent,
    code: "partial_failure",
    activity_code: "partial_failure",
    phase: "partial_failure",
    severity: "error",
    terminal_truth: terminalTruthFromStatus(status?.terminal),
  };
}

function progressHasEvidence(progress) {
  if (!isRecord(progress)) return false;
  return progress.source_sequence != null
    || progress.sourceSequence != null
    || progress.phase != null
    || progress.bytes_completed != null
    || progress.bytesCompleted != null
    || progress.bytes_planned != null
    || progress.bytesPlanned != null
    || progress.emitted_at_unix_ms != null
    || progress.emittedAtUnixMs != null;
}

function correlationFromStatus(status, context) {
  const safeContext = isRecord(context) ? context : {};
  const statusRunId = boundedRunId(status?.run_id ?? status?.runId);
  const contextRunId = boundedRunId(safeContext.run_id ?? safeContext.runId);
  if (statusRunId !== null && contextRunId !== null && statusRunId !== contextRunId) return null;
  const statusGeneration = nonnegativeInteger(status?.workflow_generation ?? status?.workflowGeneration);
  const contextGeneration = nonnegativeInteger(
    safeContext.workflow_generation ?? safeContext.workflowGeneration,
  );
  if (statusGeneration !== null
      && contextGeneration !== null
      && statusGeneration !== contextGeneration) return null;
  return Object.freeze({
    runId: statusRunId ?? contextRunId,
    workflowGeneration: statusGeneration ?? contextGeneration,
    origin: safeContext.origin == null
      ? null
      : sanitizeStableCode(safeContext.origin, "product_status"),
  });
}

function eventCorrelationKey(event, channel) {
  return [
    channel,
    event.source,
    event.origin,
    event.run_id ?? "-",
    event.workflow_generation ?? "-",
  ].join("|");
}

function semanticEventKey(event, channel) {
  return [
    eventCorrelationKey(event, channel),
    event.code,
    event.phase ?? "-",
    event.severity,
    event.warning?.code ?? "-",
    event.warning?.message ?? "-",
    event.error_code ?? "-",
    event.recovery_provenance ?? "-",
    event.emitted_at_unix_ms ?? "-",
    event.metrics?.bytes_completed ?? "-",
    event.metrics?.bytes_planned ?? "-",
    event.metrics?.bytes_per_second ?? "-",
    event.metrics?.eta_seconds ?? "-",
    event.terminal_truth?.physical_restore_completed ?? "-",
    event.terminal_truth?.prepared_to_boot ?? "-",
    event.terminal_truth?.boot_tested ?? "-",
    event.terminal_truth?.cleanup_complete ?? "-",
    event.terminal_truth?.target_offline ?? "-",
  ].join("|");
}

function warningSignature(event) {
  if (event.warning === null) return null;
  return [
    event.run_id ?? "-",
    event.workflow_generation ?? "-",
    event.warning.code,
    event.warning.message ?? "-",
  ].join("|");
}

function safeArray(value, limit) {
  if (!Array.isArray(value)) return [];
  return value.slice(Math.max(0, value.length - limit));
}

export function createActivityStore({
  clock = DEFAULT_CLOCK,
  scheduler = DEFAULT_SCHEDULER,
  onChange = null,
  maxEvents = ACTIVITY_LIMITS.history,
} = {}) {
  if (!(typeof clock === "function" || typeof clock?.now === "function")) {
    throw new TypeError("The activity clock must be a function or provide now()");
  }
  if (typeof scheduler?.setTimeout !== "function" || typeof scheduler?.clearTimeout !== "function") {
    throw new TypeError("The activity scheduler must provide setTimeout and clearTimeout");
  }
  if (onChange !== null && typeof onChange !== "function") {
    throw new TypeError("The activity onChange callback must be a function");
  }
  if (!Number.isInteger(maxEvents) || maxEvents < 1 || maxEvents > ACTIVITY_LIMITS.history) {
    throw new RangeError(`Activity history must be between 1 and ${ACTIVITY_LIMITS.history} events`);
  }

  const now = clockReader(clock);
  const listeners = new Set();
  const seenKeys = createBoundedKeySet(Math.max(64, maxEvents * 4));
  const warningSignatures = createBoundedKeySet(Math.max(64, maxEvents * 2));
  const highestSequences = new Map();
  const highestSequenceOrder = [];
  const highestSequenceLimit = 64;
  const history = [];

  let disposed = false;
  let localSequence = 0;
  let currentProgress = null;
  let recovery = null;
  let progressTimer = null;
  let progressDirty = false;
  let lastProgressNotificationAt = null;

  function hasObservers() {
    return onChange !== null || listeners.size > 0;
  }

  function getSnapshot() {
    return Object.freeze({
      sequence: localSequence,
      history: Object.freeze([...history]),
      currentProgress,
      recovery,
      disposed,
    });
  }

  function notify(kind) {
    if (disposed || !hasObservers()) return;
    const snapshot = getSnapshot();
    const change = Object.freeze({ kind });
    if (onChange !== null) {
      try {
        onChange(snapshot, change);
      } catch {
        // Activity presentation callbacks cannot become workflow authority.
      }
    }
    for (const listener of [...listeners]) {
      try {
        listener(snapshot, change);
      } catch {
        // One renderer or assistive observer must not block another.
      }
    }
  }

  function clearProgressTimer() {
    if (progressTimer === null) return;
    try {
      scheduler.clearTimeout(progressTimer);
    } catch {
      // A failed presentation timer cleanup cannot change activity truth.
    }
    progressTimer = null;
  }

  function emitProgressNotification() {
    if (disposed || !progressDirty) return;
    clearProgressTimer();
    progressDirty = false;
    lastProgressNotificationAt = now();
    notify("progress");
  }

  function scheduleProgressNotification() {
    if (disposed || !progressDirty || progressTimer !== null || !hasObservers()) return;
    const currentTime = now();
    if (lastProgressNotificationAt === null
        || currentTime - lastProgressNotificationAt >= ACTIVITY_LIMITS.progressNotificationMs) {
      emitProgressNotification();
      return;
    }
    const delay = Math.max(
      0,
      ACTIVITY_LIMITS.progressNotificationMs - (currentTime - lastProgressNotificationAt),
    );
    try {
      progressTimer = scheduler.setTimeout(() => {
        progressTimer = null;
        emitProgressNotification();
      }, delay);
    } catch {
      progressTimer = null;
    }
  }

  function touchHighestSequence(key, sequence) {
    if (sequence === null) return true;
    const prior = highestSequences.get(key);
    if (prior !== undefined && sequence <= prior) return false;
    highestSequences.set(key, sequence);
    const priorIndex = highestSequenceOrder.indexOf(key);
    if (priorIndex >= 0) highestSequenceOrder.splice(priorIndex, 1);
    highestSequenceOrder.push(key);
    while (highestSequenceOrder.length > highestSequenceLimit) {
      highestSequences.delete(highestSequenceOrder.shift());
    }
    return true;
  }

  function normalizeForStore(rawEvent, correlation, channel, defaultTimestamp) {
    if (!isRecord(rawEvent)) return null;
    const withDefaults = {
      ...rawEvent,
      emitted_at_unix_ms: rawEvent.emitted_at_unix_ms
        ?? rawEvent.emittedAtUnixMs
        ?? defaultTimestamp,
      run_id: rawEvent.run_id ?? rawEvent.runId ?? correlation?.runId,
      workflow_generation: rawEvent.workflow_generation
        ?? rawEvent.workflowGeneration
        ?? correlation?.workflowGeneration,
      origin: rawEvent.origin ?? correlation?.origin ?? rawEvent.source,
    };
    const normalized = normalizeActivityEvent(withDefaults, correlation ?? {});
    if (normalized === null) return null;
    const correlationKey = eventCorrelationKey(normalized, channel);
    if (!touchHighestSequence(correlationKey, normalized.source_sequence)) return null;
    const key = normalized.source_sequence === null
      ? semanticEventKey(normalized, channel)
      : `${correlationKey}|${normalized.source_sequence}`;
    if (!seenKeys.add(key)) return null;
    localSequence += 1;
    return Object.freeze({
      ...normalized,
      local_sequence: localSequence,
      activity_kind: channel === "progress" ? "progress" : "transition",
    });
  }

  function acceptTransition(rawEvent, correlation = null, defaultTimestamp = now()) {
    if (disposed) return null;
    const event = normalizeForStore(rawEvent, correlation, "transition", defaultTimestamp);
    if (event === null) return null;
    history.push(event);
    if (history.length > maxEvents) history.splice(0, history.length - maxEvents);
    if (TERMINAL_CODES.has(event.code) || event.terminal_truth !== null) {
      currentProgress = null;
      progressDirty = false;
      clearProgressTimer();
    }
    const signature = warningSignature(event);
    if (signature !== null) warningSignatures.add(signature);
    return event;
  }

  function acceptProgress(rawEvent, correlation = null, defaultTimestamp = now()) {
    if (disposed) return null;
    const event = normalizeForStore(rawEvent, correlation, "progress", defaultTimestamp);
    if (event === null) return null;
    if (currentProgress !== null
        && eventCorrelationKey(currentProgress, "progress") === eventCorrelationKey(event, "progress")
        && event.source_sequence === null
        && currentProgress.emitted_at_unix_ms !== null
        && event.emitted_at_unix_ms !== null
        && event.emitted_at_unix_ms < currentProgress.emitted_at_unix_ms) {
      return null;
    }
    currentProgress = event;
    progressDirty = true;
    return event;
  }

  function notifyTransition() {
    clearProgressTimer();
    if (progressDirty) {
      progressDirty = false;
      lastProgressNotificationAt = now();
    }
    notify("transition");
  }

  function appendTransition(event) {
    try {
      const accepted = acceptTransition(event);
      if (accepted === null) return false;
      notifyTransition();
      return true;
    } catch {
      return false;
    }
  }

  function upsertCurrentProgress(event) {
    try {
      const accepted = acceptProgress(event);
      if (accepted === null) return false;
      scheduleProgressNotification();
      return true;
    } catch {
      return false;
    }
  }

  function synthesizeWarning(rawWarning, correlation) {
    if (typeof rawWarning === "string") {
      return {
        source: "worker",
        code: "execution_warning",
        severity: "warning",
        warning: { code: "execution_warning", message: rawWarning },
        recovered: recovery !== null,
      };
    }
    if (!isRecord(rawWarning)) return null;
    const warning = isRecord(rawWarning.warning) ? rawWarning.warning : rawWarning;
    return {
      source: rawWarning.source ?? "worker",
      origin: rawWarning.origin,
      source_sequence: rawWarning.source_sequence ?? rawWarning.sourceSequence ?? rawWarning.sequence,
      emitted_at_unix_ms: rawWarning.emitted_at_unix_ms ?? rawWarning.emittedAtUnixMs,
      code: rawWarning.activity_code ?? rawWarning.activityCode ?? warning.code ?? "execution_warning",
      phase: rawWarning.phase,
      severity: "warning",
      warning: { code: warning.code ?? "execution_warning", message: warning.message },
      recovered: rawWarning.recovered === true || recovery !== null,
      run_id: correlation.runId,
      workflow_generation: correlation.workflowGeneration,
    };
  }

  function ingestProductStatus(status, context = {}) {
    if (disposed || !isRecord(status)) return getSnapshot();
    try {
      const correlation = correlationFromStatus(status, context);
      if (correlation === null) return getSnapshot();
      const nextRecovery = freezeRecovery(status.recovery, status);
      recovery = nextRecovery;

      let transitionAccepted = false;
      let progressAccepted = false;
      let hasTerminalActivity = false;
      let hasRecoveryActivity = false;
      let hasCurrentPhaseActivity = false;
      const currentPhase = status.phase == null ? null : sanitizeStableCode(status.phase, "unknown_phase");

      for (const rawEvent of safeArray(status.activity, ACTIVITY_LIMITS.history)) {
        if (!isRecord(rawEvent)) continue;
        const event = enforceCompletedActivityTruth(rawEvent, status);
        const preview = normalizeActivityEvent(event, correlation);
        if (preview !== null) {
          hasTerminalActivity ||= TERMINAL_CODES.has(preview.code) || preview.terminal_truth !== null;
          hasRecoveryActivity ||= preview.code === "recovered_active"
            || preview.code === "recovered_terminal";
          hasCurrentPhaseActivity ||= currentPhase !== null
            && (preview.code === currentPhase || preview.phase === currentPhase);
        }
        const rawKind = event.activity_kind ?? event.activityKind ?? event.type;
        if (rawKind === "progress") {
          if (acceptProgress(event, correlation, null) !== null) progressAccepted = true;
          continue;
        }
        const accepted = acceptTransition(event, correlation, null);
        if (accepted === null) continue;
        transitionAccepted = true;
      }

      for (const rawWarning of safeArray(
        status.structured_warnings ?? status.structuredWarnings,
        ACTIVITY_LIMITS.history,
      )) {
        const synthesized = synthesizeWarning(rawWarning, correlation);
        if (synthesized === null) continue;
        const preview = normalizeActivityEvent(synthesized, correlation);
        const signature = preview === null ? null : warningSignature(preview);
        if (signature !== null && warningSignatures.has(signature)) continue;
        if (acceptTransition(synthesized, correlation, null) !== null) transitionAccepted = true;
      }

      if (nextRecovery !== null && !hasRecoveryActivity) {
        const code = nextRecovery.active === true ? "recovered_active" : "recovered_terminal";
        const accepted = acceptTransition({
          source: "recovery",
          code,
          severity: "info",
          recovered: true,
          recovery_provenance: nextRecovery.provenance,
          run_id: correlation.runId,
          workflow_generation: correlation.workflowGeneration,
        }, correlation, null);
        if (accepted !== null) transitionAccepted = true;
      }

      if (currentPhase !== null && !hasCurrentPhaseActivity && !TERMINAL_CODES.has(currentPhase)) {
        const accepted = acceptTransition({
          source: "worker",
          source_sequence: status.sequence,
          emitted_at_unix_ms: status.emitted_at_unix_ms ?? status.emittedAtUnixMs,
          code: currentPhase,
          phase: currentPhase,
          recovered: nextRecovery !== null,
        }, correlation, null);
        if (accepted !== null) transitionAccepted = true;
      }

      if (progressHasEvidence(status.progress)) {
        const rawProgress = status.progress;
        const phase = rawProgress.phase ?? status.phase;
        const accepted = acceptProgress({
          ...rawProgress,
          source: rawProgress.source ?? "worker",
          code: rawProgress.code ?? phase ?? "copying",
          phase,
          severity: rawProgress.severity ?? "info",
          metrics: rawProgress.metrics ?? rawProgress,
          recovered: rawProgress.recovered === true || nextRecovery !== null,
        }, correlation, null);
        if (accepted !== null) progressAccepted = true;
      }

      if (isRecord(status.terminal) && !hasTerminalActivity) {
        const code = terminalCode(status.terminal, status);
        const accepted = acceptTransition({
          source: nextRecovery === null ? "worker" : "recovery",
          source_sequence: status.terminal.source_sequence
            ?? status.terminal.sourceSequence
            ?? status.sequence,
          emitted_at_unix_ms: status.terminal.emitted_at_unix_ms
            ?? status.terminal.emittedAtUnixMs,
          code,
          phase: code,
          severity: code === "completed" ? "success" : code === "cancelled" ? "warning" : "error",
          terminal_truth: terminalTruthFromStatus(status.terminal),
          error_code: status.error_code ?? status.errorCode,
          error_message: status.error_message ?? status.errorMessage,
          recovered: nextRecovery !== null,
          recovery_provenance: nextRecovery?.provenance,
        }, correlation, null);
        if (accepted !== null) transitionAccepted = true;
      } else if (!status.active
          && !hasTerminalActivity
          && (status.error_code != null || status.errorCode != null)) {
        const accepted = acceptTransition({
          source: nextRecovery === null ? "worker" : "recovery",
          source_sequence: status.sequence,
          code: "partial_failure",
          phase: "partial_failure",
          severity: "error",
          error_code: status.error_code ?? status.errorCode,
          error_message: status.error_message ?? status.errorMessage,
          recovered: nextRecovery !== null,
          recovery_provenance: nextRecovery?.provenance,
        }, correlation, null);
        if (accepted !== null) transitionAccepted = true;
      }

      if (hasTerminalActivity
          || isRecord(status.terminal)
          || (!status.active && (status.error_code != null || status.errorCode != null))) {
        currentProgress = null;
        progressDirty = false;
        clearProgressTimer();
      }

      if (transitionAccepted) notifyTransition();
      else if (progressAccepted) scheduleProgressNotification();
      return getSnapshot();
    } catch {
      return getSnapshot();
    }
  }

  function getNerdEntries(limit = ACTIVITY_LIMITS.nerdEntries) {
    if (!Number.isFinite(limit)) return Object.freeze([]);
    const boundedLimit = Math.max(
      0,
      Math.min(ACTIVITY_LIMITS.nerdEntries, Math.trunc(limit)),
    );
    if (boundedLimit === 0) return Object.freeze([]);
    let candidates = history;
    if (currentProgress !== null) {
      candidates = history.filter((event) => !(
        event.code === currentProgress.code
        && event.phase === currentProgress.phase
        && event.run_id === currentProgress.run_id
        && event.workflow_generation === currentProgress.workflow_generation
        && event.warning === null
        && event.terminal_truth === null
      ));
      const retained = boundedLimit === 1 ? [] : candidates.slice(-(boundedLimit - 1));
      return Object.freeze([...retained, currentProgress]);
    }
    return Object.freeze(candidates.slice(-boundedLimit));
  }

  function subscribe(listener) {
    if (disposed || typeof listener !== "function") return () => {};
    listeners.add(listener);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      listeners.delete(listener);
    };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    clearProgressTimer();
    listeners.clear();
    seenKeys.clear();
    warningSignatures.clear();
    highestSequences.clear();
    highestSequenceOrder.length = 0;
    progressDirty = false;
  }

  return Object.freeze({
    appendTransition,
    upsertCurrentProgress,
    ingestProductStatus,
    getSnapshot,
    getNerdEntries,
    subscribe,
    dispose,
  });
}
