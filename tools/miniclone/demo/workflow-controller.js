import {
  buildInspectionView,
  buildPreflightView,
  buildSourceDiagnosticView,
  buildTargetConfirmationView,
} from "./ui-model.js";
import {
  canDismissTerminalResult,
  canStartClone,
  createInitialWorkflowState,
  isEvidenceReady,
  reduceWorkflow,
} from "./workflow-state.js";

const EVIDENCE_LIFETIME_MS = 15 * 60 * 1000;
const CLONE_POLL_INTERVAL_MS = 500;
const ACTIVE_RUN_STATES = new Set([
  "starting_clone",
  "cloning",
  "cancelling",
  "cleaning_up",
]);
const RETRYABLE_CONFIRMATION_KINDS = new Set([
  "confirmation_phrase_mismatch",
  "confirmation_acknowledgements_missing",
]);

const nullPersistence = Object.freeze({
  save() {},
});

const nullActivityStore = Object.freeze({
  appendTransition() {},
  ingestProductStatus() {},
  dispose() {},
});

function defaultClock() {
  return Date.now();
}

const defaultScheduler = Object.freeze({
  setTimeout(callback, delay) {
    return globalThis.setTimeout(callback, delay);
  },
  clearTimeout(handle) {
    globalThis.clearTimeout(handle);
  },
});

function clockNow(clock) {
  const value = typeof clock === "function" ? clock() : clock.now();
  if (!Number.isFinite(value)) throw new TypeError("The workflow clock returned an invalid time");
  return value;
}

function safeErrorKind(rawError, fallback) {
  const candidate = rawError?.kind ?? rawError?.code;
  return typeof candidate === "string" && /^[a-z][a-z0-9_]{0,63}$/u.test(candidate)
    ? candidate
    : fallback;
}

function publicError(rawError, operation) {
  const error = new Error(`The ${operation.replaceAll("_", " ")} operation did not complete.`);
  error.kind = safeErrorKind(rawError, `${operation}_failed`);
  return error;
}

function candidateDiskNumber(candidate) {
  return candidate?.diskNumber ?? candidate?.disk?.number;
}

function candidateIsSelectable(candidate, sourceDiskNumber) {
  if (candidate?.selectable !== undefined) return candidate.selectable === true;
  const reasons = candidate?.refusal_reasons ?? [];
  const disposition = candidate?.disposition ?? (candidate?.eligible === true ? "ready_blank" : "refused");
  return disposition !== "refused"
    && candidate?.disk?.number !== sourceDiskNumber
    && reasons.length === 0;
}

function containmentFailure(value) {
  const diagnostic = value?.report?.source_diagnostic ?? value?.source_diagnostic;
  const lifecycle = diagnostic?.vss_lifecycle ?? value?.vss_lifecycle ?? value?.lifecycle
    ?? value?.report?.vss_lifecycle;
  if (lifecycle && (lifecycle.cleanup_proved_absent !== true
      || !["deleted", "already_absent"].includes(lifecycle.cleanup_status))) {
    return "source_containment_unproved";
  }
  if (diagnostic && diagnostic.cleanup_status
      && !["deleted", "already_absent"].includes(diagnostic.cleanup_status)) {
    return "source_containment_unproved";
  }

  const kind = String(value?.kind ?? value?.code ?? value?.error_code ?? "").toLowerCase();
  if (kind.includes("cleanup") || kind.includes("snapshot_absence") || kind.includes("vss_delete")) {
    return "source_containment_unproved";
  }
  if (kind.includes("severe") || /(?:^|_)event_(?:51|55|129|140|154|157)(?:_|$)/u.test(kind)
      || kind.includes("filtermanager_event_3")) {
    return "severe_storage_evidence";
  }
  const eventCollections = [
    value?.events,
    value?.storage_events,
    value?.report?.events,
    value?.report?.storage_events,
    value?.report?.source_diagnostic?.events,
  ];
  for (const event of eventCollections.flatMap((events) => Array.isArray(events) ? events : [])) {
    const eventId = Number(event?.event_id ?? event?.id);
    const provider = String(event?.provider ?? "").toLowerCase();
    if ([51, 55, 129, 140, 154, 157].includes(eventId)
        || (eventId === 3 && provider.includes("filtermanager"))) {
      return "severe_storage_evidence";
    }
  }
  return null;
}

function identityError(kind) {
  const error = new Error("Workflow evidence identity did not match the cached selection.");
  error.kind = kind;
  return error;
}

function assertDiskIdentity(actual, expected, kind) {
  if (!Number.isInteger(actual) || !Number.isInteger(expected) || actual !== expected) {
    throw identityError(kind);
  }
}

function boundedProjectionText(value, fallback, maximumLength = 128) {
  const normalized = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return (normalized || fallback).slice(0, maximumLength);
}

function windowsLabel(sourceView) {
  const match = /^([a-z]):\\$/iu.exec(String(sourceView?.windowsMount ?? "").trim());
  return match ? `Windows (${match[1].toUpperCase()}:)` : "Windows";
}

function safeDisclosureProjection(view, sourceView) {
  return Object.freeze({
    expectedPhrase: view.expectedPhrase,
    source: Object.freeze({
      model: boundedProjectionText(view.source.model, "Windows source"),
      windowsLabel: windowsLabel(sourceView),
    }),
    target: Object.freeze({
      diskNumber: view.target.diskNumber,
      model: boundedProjectionText(view.target.model, "Destination drive"),
      capacity: boundedProjectionText(view.target.capacity, "Unknown"),
    }),
  });
}

function hasCloneRunEvidence(status) {
  return status && typeof status === "object" && (
    status.run_id != null || status.phase != null || status.error_code != null
    || status.error_message != null || status.terminal != null
    || (Array.isArray(status.activity) && status.activity.length > 0)
    || status.recovery != null
  );
}

function recoveredCancellationAvailable(status, capability) {
  const detached = status?.recovery?.provenance === "active_marker"
    && status?.recovery?.recovered === true;
  if (detached) return false;
  const explicit = status?.cancellation_available ?? capability?.cancellation_available;
  if (explicit !== undefined) return explicit === true;
  return false;
}

function assertBridge(bridge) {
  const methods = [
    "productCloneCapability",
    "productCloneStatus",
    "inspectHost",
    "preflightTarget",
    "diagnoseSource",
    "prepareTargetConfirmation",
    "confirmTargetErasure",
    "startProductClone",
    "cancelProductClone",
    "verifyProductBoot",
  ];
  for (const method of methods) {
    if (typeof bridge?.[method] !== "function") {
      throw new TypeError(`The workflow bridge is missing ${method}()`);
    }
  }
}

export function createWorkflowController({
  bridge,
  clock = defaultClock,
  scheduler = defaultScheduler,
  persistence = nullPersistence,
  activityStore = nullActivityStore,
  onStateChange = () => {},
} = {}) {
  assertBridge(bridge);
  if (typeof scheduler?.setTimeout !== "function" || typeof scheduler?.clearTimeout !== "function") {
    throw new TypeError("The workflow scheduler must provide setTimeout and clearTimeout");
  }
  if (typeof onStateChange !== "function") throw new TypeError("onStateChange must be a function");
  if (typeof activityStore?.appendTransition !== "function"
      || typeof activityStore?.ingestProductStatus !== "function") {
    throw new TypeError("activityStore must provide appendTransition and ingestProductStatus");
  }

  let state = createInitialWorkflowState();
  let operationTail = Promise.resolve();
  let activeOperation = null;
  let preparationPromise = null;
  let selectableTargets = [];
  let selectedTarget = null;
  let queuedDiskNumber = null;
  let expiryTimer = null;
  let pollTimer = null;
  let pollQueued = false;
  let cancelRequested = false;
  let disposed = false;
  let persistentContainmentBlocker = null;
  let inspectionSourceDiskNumber = null;
  let inspectionSourceView = null;
  let cloneCancellationAvailable = false;
  let lastRunId = null;
  let lastSequence = null;

  function persist(nextState) {
    if (typeof persistence?.save !== "function") return;
    try {
      persistence.save(nextState);
    } catch {
      // Browser persistence is explicitly non-authoritative.
    }
  }

  function activityForAction(action, nextState) {
    let code = null;
    let severity = "info";
    switch (action.type) {
      case "capability_received": code = "runtime_resolved"; break;
      case "inspection_started": code = "inspection_started"; break;
      case "inspection_succeeded": code = "inspection_completed"; severity = "success"; break;
      case "target_selected":
      case "target_queued": code = "target_selected"; break;
      case "preflight_received": code = "preflight_completed"; severity = "success"; break;
      case "diagnostic_received": code = "diagnostic_completed"; severity = "success"; break;
      case "disclosure_received": code = "confirmation_ready"; severity = "success"; break;
      case "confirmation_opened": code = "confirmation_opened"; break;
      case "confirmation_cancelled": code = "confirmation_cancelled"; break;
      case "confirmation_accepted": code = "confirmation_completed"; severity = "success"; break;
      case "confirmation_rejected":
        code = safeErrorKind(action.error, "confirmation_rejected");
        severity = "error";
        break;
      case "clone_starting": code = "clone_start_requested"; break;
      case "cancel_requested": code = "cancellation_requested"; severity = "warning"; break;
      case "boot_verification_started": code = "boot_verification_started"; break;
      case "boot_verification_received":
        code = nextState.bootVerificationError === null
          && action.value?.verified === true
          && action.value?.boot_tested === true
          ? "boot_verification_completed"
          : "boot_verification_retry";
        severity = code === "boot_verification_completed" ? "success" : "error";
        break;
      case "boot_verification_failed":
        code = "boot_verification_retry";
        severity = "error";
        break;
      case "run_communication_failed":
        code = action.operation === "cancel" ? "cancel_status_uncertain" : "run_status_uncertain";
        severity = "warning";
        break;
      case "operation_started": {
        const operationCodes = {
          preflight: "preflight_started",
          diagnostic: "diagnostic_started",
          disclosure: "disclosure_started",
          confirmation: "confirmation_submitted",
        };
        code = operationCodes[action.operation] ?? null;
        break;
      }
      case "inspection_failed":
      case "preflight_failed":
      case "diagnostic_failed":
      case "disclosure_failed":
      case "blocking_error":
        code = safeErrorKind(action.error, `${action.type}_failed`);
        severity = "error";
        break;
      case "invalidate":
        if (action.reason === "evidence_expired") {
          code = "evidence_expired";
          severity = "warning";
        }
        break;
      default:
        break;
    }
    if (code === null) return null;
    return {
      schema_version: 1,
      emitted_at_unix_ms: clockNow(clock),
      source: "ui_command",
      code,
      phase: nextState.status,
      severity,
      recovered: false,
      workflow_generation: nextState.generation,
      run_id: nextState.cloneStatus?.run_id ?? null,
    };
  }

  function recordAcceptedAction(action, nextState) {
    try {
      const event = activityForAction(action, nextState);
      if (event === null) return;
      activityStore.appendTransition(event);
    } catch {
      // Activity is presentation-only and cannot affect workflow authority.
    }
  }

  function dispatch(action) {
    if (disposed) return false;
    const nextState = reduceWorkflow(state, action);
    if (nextState === state) return false;
    state = nextState;
    persist(state);
    recordAcceptedAction(action, state);
    onStateChange(state, action);
    return true;
  }

  function clearExpiryTimer() {
    if (expiryTimer === null) return;
    scheduler.clearTimeout(expiryTimer);
    expiryTimer = null;
  }

  function clearPollTimer() {
    if (pollTimer === null) return;
    scheduler.clearTimeout(pollTimer);
    pollTimer = null;
  }

  function invalidate(reason) {
    clearExpiryTimer();
    dispatch({ type: "invalidate", reason });
  }

  function snapshotIdentity() {
    return {
      generation: state.generation,
      diskNumber: state.selectedDiskNumber,
    };
  }

  function isCurrent(identity) {
    return !disposed
      && identity.generation === state.generation
      && identity.diskNumber === state.selectedDiskNumber;
  }

  function commitContainmentFailure(rawValue) {
    const kind = containmentFailure(rawValue);
    if (!kind) return false;
    persistentContainmentBlocker = {
      kind,
      message: "Source or storage containment could not be proved.",
    };
    dispatch({
      type: "blocking_error",
      error: persistentContainmentBlocker,
    });
    return true;
  }

  function enqueue(queueLabel, task, stateOperation = queueLabel) {
    const run = async () => {
      if (disposed) return null;
      activeOperation = queueLabel;
      if (stateOperation !== null) {
        const started = dispatch({ type: "operation_started", operation: stateOperation });
        if (!started) {
          activeOperation = null;
          return null;
        }
      }
      try {
        return await task();
      } finally {
        if (activeOperation === queueLabel) activeOperation = null;
        if (stateOperation !== null) {
          dispatch({ type: "operation_finished", operation: stateOperation });
        }
      }
    };
    const result = operationTail.then(run, run);
    operationTail = result.catch(() => {});
    return result;
  }

  function updateInspectionCache(envelope, view) {
    const sourceDiskNumber = envelope?.report?.source_disk?.number;
    assertDiskIdentity(view?.source?.diskNumber, sourceDiskNumber, "inspection_identity_mismatch");
    const rawCandidates = envelope?.report?.target_candidates ?? [];
    const viewsByNumber = new Map(view.targets.map((target) => [target.diskNumber, target]));
    selectableTargets = rawCandidates
      .filter((candidate) => candidateIsSelectable(candidate, sourceDiskNumber))
      .map((candidate) => ({
        ...candidate,
        ...viewsByNumber.get(candidateDiskNumber(candidate)),
        diskNumber: candidateDiskNumber(candidate),
        raw: candidate,
      }));
    inspectionSourceDiskNumber = sourceDiskNumber;
    inspectionSourceView = view.source;
    selectedTarget = null;
    queuedDiskNumber = null;
  }

  function inspectionTask() {
    return async () => {
      dispatch({ type: "inspection_started" });
      try {
        const envelope = await bridge.inspectHost();
        const view = buildInspectionView(envelope);
        updateInspectionCache(envelope, view);
        dispatch({
          type: "inspection_succeeded",
          inspection: envelope,
          view,
          targets: selectableTargets,
        });
        return envelope;
      } catch (rawError) {
        const error = publicError(rawError, "inspection");
        dispatch({ type: "inspection_failed", error: { kind: error.kind, message: error.message } });
        throw error;
      }
    };
  }

  function scheduleExpiry(expiresAt, identity) {
    clearExpiryTimer();
    const delay = Math.max(0, expiresAt - clockNow(clock));
    expiryTimer = scheduler.setTimeout(() => {
      expiryTimer = null;
      if (!isCurrent(identity)) return;
      if (clockNow(clock) < expiresAt) {
        scheduleExpiry(expiresAt, identity);
        return;
      }
      invalidate("evidence_expired");
      observeAutomaticPreparation();
    }, delay);
  }

  function commitCloneStatus(status, {
    allowRunSwitch = false,
    cancellationAvailable,
  } = {}) {
    if (!status || typeof status !== "object") return false;
    const runId = status.run_id ?? null;
    const sequence = Number.isFinite(status.sequence) ? status.sequence : null;
    if (lastRunId !== null && runId !== lastRunId && !allowRunSwitch) return false;
    if (lastRunId !== null && runId === lastRunId) {
      if (lastSequence !== null && (sequence === null || sequence <= lastSequence)) return false;
      if (lastSequence === null && sequence === null) return false;
    }
    if (runId !== null && (lastRunId === null || allowRunSwitch)) {
      lastRunId = runId;
      lastSequence = null;
    }
    if (sequence !== null && runId !== null) lastSequence = sequence;
    if (typeof cancellationAvailable === "boolean") {
      cloneCancellationAvailable = cancellationAvailable;
    } else if (typeof status.cancellation_available === "boolean") {
      cloneCancellationAvailable = status.cancellation_available;
    }
    if (status.active !== true) cloneCancellationAvailable = false;
    const normalizedStatus = {
      ...status,
      cancellation_available: status.active === true && cloneCancellationAvailable,
    };
    const statusForState = cancelRequested && status.active === true && status.phase !== "cleaning_up"
      ? { ...normalizedStatus, phase: "cancelling" }
      : normalizedStatus;
    if (!dispatch({ type: "clone_status", status: statusForState })) return false;
    try {
      activityStore.ingestProductStatus(statusForState, {
        workflowGeneration: state.generation,
        runId: statusForState.run_id ?? null,
      });
    } catch {
      // Activity is presentation-only and cannot reject accepted worker truth.
    }
    if (status.active !== true) {
      clearPollTimer();
      cancelRequested = false;
      return true;
    }
    schedulePoll();
    return true;
  }

  function schedulePoll() {
    if (disposed || pollTimer !== null || pollQueued || state.cloneStatus?.active !== true
        || !ACTIVE_RUN_STATES.has(state.status)) return;
    pollTimer = scheduler.setTimeout(() => {
      pollTimer = null;
      if (disposed || pollQueued) return;
      pollQueued = true;
      enqueue("status_poll", async () => {
        if (!dispatch({ type: "status_poll_started" })) {
          pollQueued = false;
          if (state.cloneStatus?.active === true) schedulePoll();
          return null;
        }
        try {
          const status = await bridge.productCloneStatus();
          commitCloneStatus(status);
          return status;
        } catch (rawError) {
          if (commitContainmentFailure(rawError)) return null;
          const error = publicError(rawError, "clone_status");
          dispatch({
            type: "run_communication_failed",
            operation: "status",
            error: { kind: error.kind },
          });
          return null;
        } finally {
          dispatch({ type: "operation_finished", operation: "status" });
          pollQueued = false;
          if (state.cloneStatus?.active === true) schedulePoll();
        }
      }, null);
    }, CLONE_POLL_INTERVAL_MS);
  }

  async function runPreflightInside(identity) {
    const requestStartedAt = clockNow(clock);
    try {
      const envelope = await bridge.preflightTarget(identity.diskNumber);
      const view = buildPreflightView(envelope);
      assertDiskIdentity(view.target.diskNumber, identity.diskNumber, "target_identity_mismatch");
      assertDiskIdentity(
        envelope?.report?.clone_preflight?.source_disk?.number,
        inspectionSourceDiskNumber,
        "source_identity_mismatch",
      );
      if (!isCurrent(identity)) {
        commitContainmentFailure(envelope);
        return { stale: true, value: envelope };
      }
      const expiresAt = requestStartedAt + EVIDENCE_LIFETIME_MS;
      const value = { ...view, envelope };
      dispatch({
        type: "preflight_received",
        generation: identity.generation,
        diskNumber: identity.diskNumber,
        value,
        expiresAtMs: expiresAt,
      });
      scheduleExpiry(expiresAt, identity);
      return { stale: false, value: envelope };
    } catch (rawError) {
      if (!isCurrent(identity)) {
        commitContainmentFailure(rawError);
        return { stale: true, value: null };
      }
      const error = publicError(rawError, "target_preflight");
      dispatch({
        type: "preflight_failed",
        generation: identity.generation,
        diskNumber: identity.diskNumber,
        error: { kind: error.kind, message: error.message },
      });
      throw error;
    }
  }

  async function runDiagnosisInside(identity) {
    let envelope;
    try {
      envelope = await bridge.diagnoseSource();
    } catch (rawError) {
      const containment = commitContainmentFailure(rawError);
      if (!isCurrent(identity) && !containment) return { stale: true, value: null };
      const error = publicError(rawError, containment ? "source_containment" : "source_diagnostic");
      if (!containment) {
        dispatch({
          type: "diagnostic_failed",
          generation: identity.generation,
          diskNumber: identity.diskNumber,
          error: { kind: error.kind, message: error.message },
        });
      }
      throw error;
    }

    let view;
    try {
      view = buildSourceDiagnosticView(envelope);
      assertDiskIdentity(
        view.source.diskNumber,
        inspectionSourceDiskNumber,
        "source_identity_mismatch",
      );
    } catch (rawError) {
      const containment = commitContainmentFailure(envelope);
      if (!isCurrent(identity) && !containment) return { stale: true, value: null };
      const error = publicError(rawError, containment ? "source_containment" : "source_diagnostic");
      if (!containment) {
        dispatch({
          type: "diagnostic_failed",
          generation: identity.generation,
          diskNumber: identity.diskNumber,
          error: { kind: error.kind, message: error.message },
        });
      }
      throw error;
    }
    if (commitContainmentFailure(envelope)) throw publicError(null, "source_containment");
    if (!isCurrent(identity)) return { stale: true, value: envelope };
    dispatch({
      type: "diagnostic_received",
      generation: identity.generation,
      diskNumber: identity.diskNumber,
      value: { ...view, envelope },
    });
    return { stale: false, value: envelope };
  }

  async function runDisclosureInside(identity) {
    try {
      const envelope = await bridge.prepareTargetConfirmation();
      const view = buildTargetConfirmationView(envelope);
      assertDiskIdentity(view.target.diskNumber, identity.diskNumber, "target_identity_mismatch");
      assertDiskIdentity(
        view.source.diskNumber,
        inspectionSourceDiskNumber,
        "source_identity_mismatch",
      );
      if (view.authorizesExecution !== false) {
        throw new Error("Unsafe confirmation authority");
      }
      if (!isCurrent(identity)) {
        commitContainmentFailure(envelope);
        return { stale: true, value: envelope };
      }
      dispatch({
        type: "disclosure_received",
        generation: identity.generation,
        diskNumber: identity.diskNumber,
        value: {
          authorizesExecution: false,
          confirmed: view.confirmed === true,
          sessionOnly: view.sessionOnly === true,
          targetDiskNumber: view.target.diskNumber,
          projection: safeDisclosureProjection(view, inspectionSourceView),
          envelope,
        },
        nowMs: clockNow(clock),
      });
      return { stale: false, value: envelope };
    } catch (rawError) {
      if (!isCurrent(identity)) {
        commitContainmentFailure(rawError);
        return { stale: true, value: null };
      }
      const error = publicError(rawError, "target_disclosure");
      dispatch({
        type: "disclosure_failed",
        generation: identity.generation,
        diskNumber: identity.diskNumber,
        error: { kind: error.kind, message: error.message },
      });
      throw error;
    }
  }

  function initialize() {
    if (persistentContainmentBlocker !== null) {
      return Promise.reject(publicError({ kind: "containment_blocked" }, "workflow"));
    }
    return enqueue("initialize", async () => {
      try {
        const capability = await bridge.productCloneCapability();
        dispatch({ type: "capability_received", capability });
        const recoveredStatus = await bridge.productCloneStatus();
        if (recoveredStatus?.active === true) {
          dispatch({ type: "recovery_started" });
          commitCloneStatus(recoveredStatus, {
            cancellationAvailable: recoveredCancellationAvailable(recoveredStatus, capability),
          });
          return recoveredStatus;
        }
        const inspection = await inspectionTask()();
        if (hasCloneRunEvidence(recoveredStatus)) {
          dispatch({ type: "recovery_started" });
          commitCloneStatus(recoveredStatus, { cancellationAvailable: false });
        }
        return inspection;
      } catch (rawError) {
        const error = rawError instanceof Error && rawError.kind
          ? rawError
          : publicError(rawError, "initialization");
        if (!state.blockingError) {
          dispatch({ type: "blocking_error", error: { kind: error.kind, message: error.message } });
        }
        throw error;
      }
    }, null);
  }

  function refreshInspection() {
    if (persistentContainmentBlocker !== null) {
      return Promise.reject(publicError({ kind: "containment_blocked" }, "workflow"));
    }
    if (state.cloneStatus?.active === true || ACTIVE_RUN_STATES.has(state.status)) {
      return Promise.reject(publicError({ kind: "clone_still_active" }, "inspection"));
    }
    if (state.cloneStatus !== null) {
      if (!canDismissTerminalResult(state)
          || !dispatch({ type: "terminal_result_dismissed" })) {
        return Promise.reject(publicError({ kind: "terminal_result_not_dismissible" }, "inspection"));
      }
      cancelRequested = false;
      cloneCancellationAvailable = false;
      lastRunId = null;
      lastSequence = null;
    }
    invalidate("inspection_refresh");
    selectableTargets = [];
    selectedTarget = null;
    inspectionSourceDiskNumber = null;
    inspectionSourceView = null;
    queuedDiskNumber = null;
    return enqueue("inspection", inspectionTask(), null);
  }

  function selectTarget(diskNumber) {
    if (disposed || persistentContainmentBlocker !== null || !Number.isInteger(diskNumber)) return null;
    const target = selectableTargets.find((candidate) => candidate.diskNumber === diskNumber);
    if (!target) return null;
    if (state.selectedDiskNumber === diskNumber) {
      if (state.blockingError !== null || state.cloneStatus?.active === true) return null;
      if (state.status === "checking_target") observeAutomaticPreparation();
      return target;
    }
    if (!dispatch({ type: "target_selected", diskNumber, target })) return null;
    clearExpiryTimer();
    selectedTarget = target;
    queuedDiskNumber = activeOperation ? state.queuedDiskNumber : null;
    observeAutomaticPreparation();
    return target;
  }

  function requireSelection() {
    if (persistentContainmentBlocker !== null) {
      throw publicError({ kind: "containment_blocked" }, "workflow");
    }
    if (!selectedTarget || state.selectedDiskNumber !== selectedTarget.diskNumber) {
      throw publicError(null, "target_selection");
    }
    return snapshotIdentity();
  }

  function runPreflight() {
    const identity = requireSelection();
    return enqueue("preflight", async () => {
      const result = await runPreflightInside(identity);
      return result.stale ? null : result.value;
    });
  }

  function runDiagnosis() {
    const identity = requireSelection();
    return enqueue("diagnostic", async () => {
      const result = await runDiagnosisInside(identity);
      return result.stale ? null : result.value;
    });
  }

  function prepareDisclosure() {
    const identity = requireSelection();
    return enqueue("disclosure", async () => {
      const result = await runDisclosureInside(identity);
      return result.stale ? null : result.value;
    });
  }

  function prepareSelectedTarget() {
    requireSelection();
    if (preparationPromise !== null) return preparationPromise;
    const pending = enqueue("prepare_target", async () => {
      let lastDisclosure = null;
      while (!disposed) {
        queuedDiskNumber = null;
        const identity = requireSelection();
        if (!dispatch({ type: "operation_started", operation: "preflight" })) {
          throw publicError(null, "target_preflight");
        }
        const preflight = await runPreflightInside(identity);
        if (preflight.stale) {
          dispatch({ type: "operation_finished", operation: "preflight" });
          continue;
        }
        if (!dispatch({ type: "operation_started", operation: "diagnostic" })) {
          throw publicError(null, "source_diagnostic");
        }
        const diagnostic = await runDiagnosisInside(identity);
        if (diagnostic.stale) {
          dispatch({ type: "operation_finished", operation: "diagnostic" });
          continue;
        }
        if (!dispatch({ type: "operation_started", operation: "disclosure" })) {
          throw publicError(null, "target_disclosure");
        }
        const disclosure = await runDisclosureInside(identity);
        if (disclosure.stale) {
          dispatch({ type: "operation_finished", operation: "disclosure" });
          continue;
        }
        lastDisclosure = disclosure.value;
        break;
      }
      return lastDisclosure;
    }, null);
    preparationPromise = pending;
    void pending.then(
      () => {
        if (preparationPromise === pending) preparationPromise = null;
      },
      () => {
        if (preparationPromise === pending) preparationPromise = null;
      },
    );
    return pending;
  }

  function observeAutomaticPreparation() {
    if (disposed || persistentContainmentBlocker !== null || selectedTarget === null) return null;
    let pending;
    try {
      pending = prepareSelectedTarget();
    } catch {
      return null;
    }
    void pending.catch(() => {
      // The workflow state and activity stream already contain the bounded failure.
    });
    return pending;
  }

  function openConfirmation() {
    if (disposed || !canStartClone(state, clockNow(clock))) return null;
    if (!dispatch({ type: "confirmation_opened", nowMs: clockNow(clock) })) return null;
    const projection = state.disclosure?.value?.projection;
    if (!projection) {
      dispatch({
        type: "blocking_error",
        error: { kind: "confirmation_projection_missing" },
      });
      return null;
    }
    return {
      expectedPhrase: projection.expectedPhrase,
      source: { ...projection.source },
      target: { ...projection.target },
    };
  }

  function cancelConfirmation() {
    return dispatch({ type: "confirmation_cancelled" });
  }

  function submitConfirmation({ typedPhrase, acknowledgeDataLoss, acknowledgeTargetIdentity } = {}) {
    const identity = requireSelection();
    if (state.status !== "confirming" || !canStartClone(state, clockNow(clock))) {
      return Promise.reject(publicError(null, "confirmation_evidence"));
    }
    return enqueue("confirmation", async () => {
      if (!dispatch({
        type: "operation_started",
        operation: "confirmation",
        nowMs: clockNow(clock),
      })) return null;
      let phrase = String(typedPhrase ?? "");
      const ephemeral = {
        typedPhrase: phrase,
        acknowledgeDataLoss: acknowledgeDataLoss === true,
        acknowledgeTargetIdentity: acknowledgeTargetIdentity === true,
      };
      let confirmationAccepted = false;
      try {
        const confirmedEnvelope = await bridge.confirmTargetErasure(ephemeral);
        const view = buildTargetConfirmationView(confirmedEnvelope);
        assertDiskIdentity(view.target.diskNumber, identity.diskNumber, "target_identity_mismatch");
        assertDiskIdentity(
          view.source.diskNumber,
          inspectionSourceDiskNumber,
          "source_identity_mismatch",
        );
        if (!isCurrent(identity) || !isEvidenceReady(state, clockNow(clock))) {
          if (isCurrent(identity)) {
            invalidate("evidence_expired");
            observeAutomaticPreparation();
          }
          return null;
        }
        if (view.confirmed !== true || view.authorizesExecution !== false) {
          throw new Error("Confirmation evidence was not valid");
        }
        if (!dispatch({
          type: "confirmation_accepted",
          generation: identity.generation,
          diskNumber: identity.diskNumber,
        })) {
          throw identityError("confirmation_commit_rejected");
        }
        confirmationAccepted = true;
        if (!dispatch({ type: "clone_starting", nowMs: clockNow(clock) })) {
          throw identityError("clone_start_reservation_failed");
        }
        const status = await bridge.startProductClone(ephemeral);
        if (!commitCloneStatus(status, { allowRunSwitch: true, cancellationAvailable: true })) {
          throw identityError("clone_start_status_rejected");
        }
        return status;
      } catch (rawError) {
        const error = publicError(rawError, "confirmation");
        if (!confirmationAccepted && RETRYABLE_CONFIRMATION_KINDS.has(error.kind)
            && isCurrent(identity)) {
          dispatch({
            type: "confirmation_rejected",
            generation: identity.generation,
            diskNumber: identity.diskNumber,
            error: { kind: error.kind },
          });
        } else {
          dispatch({ type: "blocking_error", error: { kind: error.kind } });
        }
        throw error;
      } finally {
        dispatch({ type: "operation_finished", operation: "confirmation" });
        phrase = "";
        ephemeral.typedPhrase = "";
      }
    }, null);
  }

  function cancelClone() {
    if (disposed || cancelRequested || state.cloneStatus?.active !== true
        || !cloneCancellationAvailable || state.cloneStatus.cancellation_available !== true) {
      return Promise.resolve(null);
    }
    if (!dispatch({ type: "cancel_intent_latched" })) return Promise.resolve(null);
    cancelRequested = true;
    clearPollTimer();
    return enqueue("cancel_clone", async () => {
      if (state.cloneStatus?.active !== true) return state.cloneStatus;
      try {
        if (!dispatch({ type: "cancel_requested" })) {
          throw identityError("clone_cancellation_reservation_failed");
        }
        const status = await bridge.cancelProductClone();
        if (!commitCloneStatus(status)) {
          throw identityError("clone_cancellation_status_rejected");
        }
        return status;
      } catch (rawError) {
        if (commitContainmentFailure(rawError)) {
          throw publicError(rawError, "clone_cancellation");
        }
        const error = publicError(rawError, "clone_cancellation");
        dispatch({
          type: "run_communication_failed",
          operation: "cancel",
          error: { kind: error.kind },
        });
        throw error;
      } finally {
        dispatch({ type: "operation_finished", operation: "cancel" });
        if (state.cloneStatus?.active === true) schedulePoll();
      }
    }, null);
  }

  function verifyBoot() {
    return enqueue("verify_boot", async () => {
      if (!dispatch({ type: "boot_verification_started" })) return null;
      try {
        const report = await bridge.verifyProductBoot();
        dispatch({ type: "boot_verification_received", value: report });
        return report;
      } catch (rawError) {
        const error = publicError(rawError, "boot_verification");
        dispatch({ type: "boot_verification_failed", error: { kind: error.kind } });
        throw error;
      }
    }, null);
  }

  function getState() {
    return state;
  }

  function dispose() {
    if (disposed) return;
    clearExpiryTimer();
    clearPollTimer();
    disposed = true;
    try {
      activityStore.dispose?.();
    } catch {
      // Presentation cleanup cannot alter durable workflow truth.
    }
  }

  return Object.freeze({
    initialize,
    refreshInspection,
    selectTarget,
    runPreflight,
    runDiagnosis,
    prepareDisclosure,
    prepareSelectedTarget,
    openConfirmation,
    cancelConfirmation,
    submitConfirmation,
    cancelClone,
    verifyBoot,
    getState,
    dispose,
  });
}
