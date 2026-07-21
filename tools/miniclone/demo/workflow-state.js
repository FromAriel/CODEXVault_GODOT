const EVIDENCE_LIFETIME_MS = 15 * 60 * 1000;

export const WORKFLOW_STATES = Object.freeze({
  STARTING: "starting",
  INSPECTING: "inspecting",
  CHOOSE_TARGET: "choose_target",
  CHECKING_TARGET: "checking_target",
  READY: "ready",
  CONFIRMING: "confirming",
  STARTING_CLONE: "starting_clone",
  CLONING: "cloning",
  CANCELLING: "cancelling",
  CLEANING_UP: "cleaning_up",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  PARTIAL_FAILURE: "partial_failure",
  RECOVERING: "recovering",
  BOOT_VERIFICATION: "boot_verification",
});

const ACTIVE_CLONE_STATES = new Set([
  WORKFLOW_STATES.STARTING_CLONE,
  WORKFLOW_STATES.CLONING,
  WORKFLOW_STATES.CANCELLING,
  WORKFLOW_STATES.CLEANING_UP,
]);

const PREPARATION_OPERATIONS = new Set(["preflight", "diagnostic", "disclosure"]);
const NON_DISMISSIBLE_SAFETY_BLOCKERS = new Set([
  "severe_storage_event",
  "severe_storage_evidence",
  "storage_event",
  "source_containment_unproved",
  "source_containment_failed",
  "snapshot_cleanup_unproved",
  "containment_blocked",
]);

function emptyEvidence() {
  return {
    preflight: null,
    diagnostic: null,
    disclosure: null,
    evidenceExpiresAtMs: null,
    confirmationValid: false,
    confirmationError: null,
  };
}

export function createInitialWorkflowState() {
  return {
    status: WORKFLOW_STATES.STARTING,
    generation: 0,
    selectedDiskNumber: null,
    queuedDiskNumber: null,
    inFlight: null,
    capability: null,
    inspection: null,
    ...emptyEvidence(),
    cloneStatus: null,
    cancelRequested: false,
    runCommunicationError: null,
    bootVerification: null,
    bootVerificationError: null,
    blockingError: null,
    confirmationResetSequence: 0,
  };
}

function finiteInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function taggedEvidence(generation, diskNumber, value) {
  return { generation, diskNumber, value };
}

function inspectionTargets(state) {
  const value = state.inspection?.value;
  if (Array.isArray(value?.targets)) return value.targets;
  if (Array.isArray(value?.selectableTargets)) return value.selectableTargets;
  return [];
}

function diskNumberOf(target) {
  if (finiteInteger(target?.diskNumber)) return target.diskNumber;
  if (finiteInteger(target?.disk?.number)) return target.disk.number;
  return null;
}

function isSelectableTarget(target) {
  if (target?.selectable === true) return true;
  return target?.eligible === true && target?.disposition !== "refused";
}

function containsSelectableDisk(state, diskNumber) {
  return inspectionTargets(state).some(
    (target) => diskNumberOf(target) === diskNumber && isSelectableTarget(target),
  );
}

function evidenceMatches(entry, state) {
  return entry !== null &&
    entry.generation === state.generation &&
    entry.diskNumber === state.selectedDiskNumber;
}

function disclosureIsNonAuthorizing(disclosure) {
  const value = disclosure?.value;
  const claim = value?.authorizesExecution ?? value?.authorizes_execution;
  return claim === false;
}

export function isVerifiedCompletedTerminal(terminal) {
  return (terminal?.final_state ?? terminal?.finalState) === "completed"
    && (terminal.physical_restore_completed ?? terminal.physicalRestoreCompleted) === true
    && (terminal.prepared_to_boot ?? terminal.preparedToBoot) === true
    && (terminal.cleanup_complete ?? terminal.cleanupComplete) === true
    && (terminal.target_offline ?? terminal.targetOffline) === true
    && (terminal.boot_tested ?? terminal.bootTested) === false;
}

export function isEvidenceReady(state, nowMs = Date.now()) {
  if (!state || state.blockingError !== null || !finiteInteger(state.selectedDiskNumber)) return false;
  if (state.inspection?.generation !== state.generation || state.inspection?.diskNumber !== null) return false;
  if (!containsSelectableDisk(state, state.selectedDiskNumber)) return false;
  if (!evidenceMatches(state.preflight, state) || !evidenceMatches(state.diagnostic, state) ||
      !evidenceMatches(state.disclosure, state) || !disclosureIsNonAuthorizing(state.disclosure)) {
    return false;
  }
  return Number.isFinite(state.evidenceExpiresAtMs) && Number.isFinite(nowMs) &&
    nowMs < state.evidenceExpiresAtMs;
}

export function canStartClone(state, nowMs = Date.now()) {
  return isEvidenceReady(state, nowMs) && state.capability?.execution_enabled === true;
}

export function isTargetProvenanceRecovery(status) {
  const runId = status?.run_id;
  const terminal = status?.terminal;
  return status?.active === false
    && status?.phase === "boot_prepared"
    && status?.recovery?.provenance === "target_provenance"
    && status?.recovery?.recovered === true
    && status?.recovery?.worker_active === false
    && status?.recovery?.cancellation_available === false
    && typeof runId === "string"
    && runId.trim().length > 0
    && status?.error_code === "target_provenance_incomplete"
    && terminal?.final_state === "partial_failure"
    && terminal?.physical_restore_completed === false
    && terminal?.prepared_to_boot === true
    && terminal?.boot_tested === false
    && terminal?.cleanup_complete === false
    && terminal?.target_offline === false;
}

export function recoveryProvenanceKind(status) {
  const recovery = status?.recovery;
  if (!recovery || recovery.recovered !== true || typeof recovery.provenance !== "string") {
    return null;
  }
  if (recovery.provenance === "target_provenance") {
    return isTargetProvenanceRecovery(status) ? recovery.provenance : null;
  }
  return ["active_marker", "summary", "journal_without_summary"].includes(recovery.provenance)
    ? recovery.provenance
    : null;
}

export function isNonDismissibleSafetyBlocker(error) {
  const kind = error?.kind ?? error?.code;
  return NON_DISMISSIBLE_SAFETY_BLOCKERS.has(kind);
}

export function hasVerifiedBootEvidence(state) {
  const report = state?.bootVerification;
  return state?.bootVerificationError === null
    && report?.verified === true
    && report?.boot_tested === true
    && typeof report?.run_id === "string"
    && report.run_id.length > 0
    && report.run_id === state?.cloneStatus?.run_id;
}

export function hasProvedTerminalContainment(state) {
  const status = state?.cloneStatus;
  const terminal = status?.terminal;
  const cleanup = status?.expert_evidence?.cleanup_evidence
    ?? status?.expert_evidence?.cleanup;
  const vssStatus = cleanup?.vss_cleanup_status;
  return status?.active !== true
    && terminal?.target_offline === true
    && cleanup?.snapshot_deleted === true
    && ["deleted", "already_absent", "not_created"].includes(vssStatus)
    && cleanup?.temporary_mounts_remaining_count === 0
    && cleanup?.target_offline === true
    && cleanup?.offline_proof?.verified === true
    && cleanup?.final_target_state === "offline"
    && cleanup?.final_target_state_proof?.verified === true;
}

export function canDismissTerminalResult(state) {
  if (!state || state.inFlight !== null || state.cloneStatus?.active === true) return false;
  if (isNonDismissibleSafetyBlocker(state.blockingError)) return false;
  const terminal = state.cloneStatus?.terminal;
  const containedTerminal = [
    WORKFLOW_STATES.COMPLETED,
    WORKFLOW_STATES.CANCELLED,
    WORKFLOW_STATES.PARTIAL_FAILURE,
  ].includes(state.status)
    && ["completed", "cancelled", "partial_failure"].includes(terminal?.final_state)
    && terminal?.target_offline === true
    && (terminal?.cleanup_complete === true || hasProvedTerminalContainment(state));
  return containedTerminal || hasVerifiedBootEvidence(state);
}

export function canVerifyBoot(state) {
  if (!state || state.inFlight !== null || state.blockingError !== null) return false;
  if (!isTargetProvenanceRecovery(state.cloneStatus)) return false;
  const terminalBootTested = state.cloneStatus?.terminal?.boot_tested
    ?? state.cloneStatus?.terminal?.bootTested;
  const verificationSucceeded = hasVerifiedBootEvidence(state);
  return terminalBootTested !== true
    && !verificationSucceeded;
}

function safeBlockingError(error, fallbackKind = "workflow_blocked") {
  const kind = typeof error?.kind === "string" && error.kind.length > 0
    ? error.kind
    : typeof error?.code === "string" && error.code.length > 0 ? error.code : fallbackKind;
  const code = typeof error?.code === "string" && error.code.length > 0 ? error.code : kind;
  return { kind, code };
}

function retagInspection(inspection, generation) {
  return inspection === null ? null : taggedEvidence(generation, null, inspection.value);
}

function invalidatePreparation(state, {
  selectedDiskNumber = state.selectedDiskNumber,
  queuedDiskNumber = null,
  keepInFlight = false,
  clearSelection = false,
} = {}) {
  const generation = state.generation + 1;
  const selected = clearSelection ? null : selectedDiskNumber;
  return {
    ...state,
    status: selected === null ? WORKFLOW_STATES.CHOOSE_TARGET : WORKFLOW_STATES.CHECKING_TARGET,
    generation,
    selectedDiskNumber: selected,
    queuedDiskNumber,
    inFlight: keepInFlight ? state.inFlight : null,
    inspection: retagInspection(state.inspection, generation),
    ...emptyEvidence(),
    cancelRequested: false,
    runCommunicationError: null,
    bootVerification: null,
    bootVerificationError: null,
    blockingError: state.blockingError,
    confirmationResetSequence: state.confirmationResetSequence + 1,
  };
}

function operationStatus(operation, state) {
  if (PREPARATION_OPERATIONS.has(operation)) return WORKFLOW_STATES.CHECKING_TARGET;
  if (operation === "confirmation") return WORKFLOW_STATES.CONFIRMING;
  if (operation === "start_clone") return WORKFLOW_STATES.STARTING_CLONE;
  if (operation === "status") return state.status;
  if (operation === "cancel") return WORKFLOW_STATES.CANCELLING;
  if (operation === "boot_verification") return WORKFLOW_STATES.BOOT_VERIFICATION;
  return null;
}

function canStartOperation(state, operation, action) {
  if (state.inFlight !== null) return false;
  if (state.blockingError !== null && !["status", "cancel"].includes(operation)) return false;
  if (operation === "boot_verification") return canVerifyBoot(state);
  if (PREPARATION_OPERATIONS.has(operation)) {
    if (!finiteInteger(state.selectedDiskNumber) || state.inspection?.generation !== state.generation) return false;
    if (operation === "diagnostic" && !evidenceMatches(state.preflight, state)) return false;
    if (operation === "disclosure" &&
        (!evidenceMatches(state.preflight, state) || !evidenceMatches(state.diagnostic, state))) return false;
    return !ACTIVE_CLONE_STATES.has(state.status);
  }
  if (operation === "confirmation") {
    return state.status === WORKFLOW_STATES.CONFIRMING && Number.isFinite(action.nowMs)
      && canStartClone(state, action.nowMs);
  }
  if (operation === "start_clone") {
    return state.status === WORKFLOW_STATES.CONFIRMING && state.confirmationValid &&
      Number.isFinite(action.nowMs) && canStartClone(state, action.nowMs);
  }
  if (operation === "status") return ACTIVE_CLONE_STATES.has(state.status) || state.status === WORKFLOW_STATES.RECOVERING;
  if (operation === "cancel") {
    return state.cancelRequested === true && state.cloneStatus?.active === true
      && [WORKFLOW_STATES.STARTING_CLONE, WORKFLOW_STATES.CLONING, WORKFLOW_STATES.CANCELLING]
        .includes(state.status);
  }
  return false;
}

function startOperation(state, action) {
  const operation = action.operation;
  if (!canStartOperation(state, operation, action)) return state;
  const status = operationStatus(operation, state);
  if (status === null) return state;
  const next = {
    ...state,
    status,
    queuedDiskNumber: operation === "preflight" ? null : state.queuedDiskNumber,
    inFlight: {
      operation,
      generation: state.generation,
      diskNumber: state.selectedDiskNumber,
    },
  };
  if (operation === "preflight") {
    const startedAtMs = Number(action.startedAtMs);
    const explicitExpiry = Number(action.expiresAtMs ?? action.expiresAt);
    next.evidenceExpiresAtMs = Number.isFinite(startedAtMs)
      ? startedAtMs + EVIDENCE_LIFETIME_MS
      : Number.isFinite(explicitExpiry) ? explicitExpiry : null;
    next.preflight = null;
    next.diagnostic = null;
    next.disclosure = null;
    next.confirmationValid = false;
    next.confirmationError = null;
    next.confirmationResetSequence += 1;
  }
  if (operation === "confirmation") next.confirmationError = null;
  if (operation === "start_clone") {
    next.cloneStatus = null;
    next.cancelRequested = false;
    next.runCommunicationError = null;
    next.bootVerification = null;
    next.bootVerificationError = null;
  }
  if (operation === "boot_verification") {
    next.bootVerification = null;
    next.bootVerificationError = null;
  }
  return next;
}

function sameOperation(state, operation, action) {
  const inFlight = state.inFlight;
  if (inFlight?.operation !== operation) return false;
  const generation = action.generation ?? inFlight.generation;
  const diskNumber = action.diskNumber ?? inFlight.diskNumber;
  return generation === inFlight.generation && diskNumber === inFlight.diskNumber;
}

function receiveEvidence(state, action, operation, field) {
  if (!sameOperation(state, operation, action)) return state;
  const generation = action.generation ?? state.inFlight.generation;
  const diskNumber = action.diskNumber ?? state.inFlight.diskNumber;
  if (generation !== state.generation || diskNumber !== state.selectedDiskNumber) {
    return { ...state, inFlight: null };
  }
  const next = {
    ...state,
    status: WORKFLOW_STATES.CHECKING_TARGET,
    inFlight: null,
    [field]: taggedEvidence(generation, diskNumber, action.value),
  };
  if (operation === "preflight") {
    const explicitExpiry = Number(action.expiresAtMs ?? action.expiresAt);
    if (Number.isFinite(explicitExpiry)) next.evidenceExpiresAtMs = explicitExpiry;
  }
  if (operation === "disclosure" && Number.isFinite(action.nowMs) && isEvidenceReady(next, action.nowMs)) {
    next.status = WORKFLOW_STATES.READY;
  }
  return next;
}

function failOperation(state, action, operation) {
  if (!sameOperation(state, operation, action)) return state;
  const generation = action.generation ?? state.inFlight.generation;
  const diskNumber = action.diskNumber ?? state.inFlight.diskNumber;
  const stale = generation !== state.generation || diskNumber !== state.selectedDiskNumber;
  if (stale && action.blocking !== true) return { ...state, inFlight: null };
  return {
    ...state,
    status: WORKFLOW_STATES.PARTIAL_FAILURE,
    inFlight: null,
    confirmationValid: false,
    blockingError: safeBlockingError(action.error, `${operation}_failed`),
    confirmationResetSequence: state.confirmationResetSequence + 1,
  };
}

export function mapCloneStatusToWorkflow(status) {
  if (!status || typeof status !== "object") return null;
  if (status.active === true) {
    if (status.phase === "cleaning_up") return WORKFLOW_STATES.CLEANING_UP;
    if (status.phase === "cancelling" || status.phase === "cancelled") return WORKFLOW_STATES.CANCELLING;
    return WORKFLOW_STATES.CLONING;
  }
  const finalState = status.terminal?.final_state;
  if (finalState === "completed") {
    return isVerifiedCompletedTerminal(status.terminal)
      ? WORKFLOW_STATES.COMPLETED
      : WORKFLOW_STATES.PARTIAL_FAILURE;
  }
  if (finalState === "cancelled") return WORKFLOW_STATES.CANCELLED;
  if (finalState === "partial_failure") return WORKFLOW_STATES.PARTIAL_FAILURE;
  const hasRunEvidence = status.run_id != null || status.phase != null || status.error_code != null ||
    status.error_message != null || status.terminal != null ||
    (Array.isArray(status.activity) && status.activity.length > 0) || status.recovery != null;
  return hasRunEvidence ? WORKFLOW_STATES.PARTIAL_FAILURE : null;
}

function receiveCloneStatus(state, action) {
  const status = action.status;
  let mapped = mapCloneStatusToWorkflow(status);
  if (mapped === null) {
    return state.inFlight?.operation === "status" ? { ...state, inFlight: null } : state;
  }
  const prior = state.cloneStatus;
  if (prior?.run_id != null) {
    if (status?.run_id !== prior.run_id) return state;
    const priorSequence = Number(prior.sequence);
    const sequence = Number(status?.sequence);
    if (Number.isFinite(priorSequence) && (!Number.isFinite(sequence) || sequence <= priorSequence)) {
      return state;
    }
  }
  const missingTerminal = status?.active !== true && status?.terminal == null;
  const targetProvenance = isTargetProvenanceRecovery(status);
  const retainedSafetyBlocker = isNonDismissibleSafetyBlocker(state.blockingError)
    ? state.blockingError
    : null;
  if (state.status === WORKFLOW_STATES.CANCELLING && status?.active === true &&
      mapped === WORKFLOW_STATES.CLONING) {
    mapped = WORKFLOW_STATES.CANCELLING;
  }
  return {
    ...state,
    status: mapped,
    inFlight: null,
    cloneStatus: status,
    cancelRequested: status?.active === true ? state.cancelRequested : false,
    runCommunicationError: null,
    bootVerificationError: null,
    confirmationValid: false,
    confirmationError: null,
    blockingError: retainedSafetyBlocker ?? (missingTerminal
      ? safeBlockingError(null, "missing_terminal_evidence")
      : mapped === WORKFLOW_STATES.PARTIAL_FAILURE && !targetProvenance
        ? safeBlockingError({ kind: status?.error_code }, "product_execution_failed")
        : targetProvenance ? null : state.blockingError),
  };
}

function reducer(state, action) {
  switch (action?.type) {
    case "capability_received":
      return action.capability && typeof action.capability === "object"
        ? { ...state, capability: action.capability }
        : state;
    case "recovery_started":
      if (state.inFlight !== null || ACTIVE_CLONE_STATES.has(state.status)) return state;
      return {
        ...invalidatePreparation(state, { clearSelection: true }),
        status: WORKFLOW_STATES.RECOVERING,
        inFlight: { operation: "status", generation: state.generation + 1, diskNumber: null },
      };
    case "inspection_started":
      if (state.inFlight !== null || ACTIVE_CLONE_STATES.has(state.status)) return state;
      return {
        ...state,
        status: WORKFLOW_STATES.INSPECTING,
        generation: state.generation + 1,
        selectedDiskNumber: null,
        queuedDiskNumber: null,
        inFlight: { operation: "inspection", generation: state.generation + 1, diskNumber: null },
        inspection: null,
        ...emptyEvidence(),
        cancelRequested: false,
        runCommunicationError: null,
        bootVerification: null,
        bootVerificationError: null,
        blockingError: null,
        confirmationResetSequence: state.confirmationResetSequence + 1,
      };
    case "inspection_succeeded": {
      if (state.inFlight?.operation !== "inspection") return state;
      const generation = action.generation ?? state.inFlight.generation;
      if (generation !== state.generation) return { ...state, inFlight: null };
      const inspection = action.targets === undefined
        ? action.inspection
        : { ...(action.inspection ?? {}), targets: action.targets };
      if (!inspection || typeof inspection !== "object") return state;
      return {
        ...state,
        status: WORKFLOW_STATES.CHOOSE_TARGET,
        inFlight: null,
        inspection: taggedEvidence(generation, null, inspection),
      };
    }
    case "inspection_failed":
      if (state.inFlight?.operation !== "inspection") return state;
      return {
        ...state,
        status: WORKFLOW_STATES.PARTIAL_FAILURE,
        inFlight: null,
        blockingError: safeBlockingError(action.error, "inspection_failed"),
      };
    case "target_selected": {
      const diskNumber = action.diskNumber;
      if (state.blockingError !== null || !finiteInteger(diskNumber) ||
          !containsSelectableDisk(state, diskNumber) || ACTIVE_CLONE_STATES.has(state.status)) {
        return state;
      }
      return invalidatePreparation(state, {
        selectedDiskNumber: diskNumber,
        queuedDiskNumber: state.inFlight === null ? null : diskNumber,
        keepInFlight: state.inFlight !== null,
      });
    }
    case "target_queued": {
      const diskNumber = action.diskNumber;
      if (state.blockingError !== null || state.inFlight === null ||
          !finiteInteger(diskNumber) || !containsSelectableDisk(state, diskNumber)) return state;
      return invalidatePreparation(state, {
        selectedDiskNumber: diskNumber,
        queuedDiskNumber: diskNumber,
        keepInFlight: true,
      });
    }
    case "operation_started":
      return startOperation(state, action);
    case "operation_finished":
      return state.inFlight?.operation === action.operation ? { ...state, inFlight: null } : state;
    case "preflight_received":
      return receiveEvidence(state, action, "preflight", "preflight");
    case "diagnostic_received":
      return receiveEvidence(state, action, "diagnostic", "diagnostic");
    case "disclosure_received":
      return receiveEvidence(state, action, "disclosure", "disclosure");
    case "preflight_failed":
      return failOperation(state, action, "preflight");
    case "diagnostic_failed":
      return failOperation(state, action, "diagnostic");
    case "disclosure_failed":
      return failOperation(state, action, "disclosure");
    case "confirmation_opened":
      if (state.inFlight !== null || state.status !== WORKFLOW_STATES.READY ||
          !Number.isFinite(action.nowMs) || !canStartClone(state, action.nowMs)) return state;
      return {
        ...state,
        status: WORKFLOW_STATES.CONFIRMING,
        confirmationValid: false,
        confirmationError: null,
        confirmationResetSequence: state.confirmationResetSequence + 1,
      };
    case "confirmation_cancelled":
      if (state.status !== WORKFLOW_STATES.CONFIRMING || state.inFlight !== null) return state;
      return {
        ...state,
        status: WORKFLOW_STATES.READY,
        confirmationValid: false,
        confirmationError: null,
        confirmationResetSequence: state.confirmationResetSequence + 1,
      };
    case "confirmation_accepted":
      if (!sameOperation(state, "confirmation", action)) return state;
      return {
        ...state,
        status: WORKFLOW_STATES.CONFIRMING,
        inFlight: null,
        confirmationValid: true,
        confirmationError: null,
      };
    case "confirmation_rejected":
      if (!sameOperation(state, "confirmation", action)) return state;
      return {
        ...state,
        status: WORKFLOW_STATES.CONFIRMING,
        inFlight: null,
        confirmationValid: false,
        confirmationError: safeBlockingError(action.error, "confirmation_rejected"),
        confirmationResetSequence: state.confirmationResetSequence + 1,
      };
    case "clone_starting":
      return startOperation(state, { ...action, operation: "start_clone" });
    case "clone_status":
      return receiveCloneStatus(state, action);
    case "cancel_intent_latched":
      if (state.cancelRequested === true || state.cloneStatus?.active !== true
          || ![WORKFLOW_STATES.STARTING_CLONE, WORKFLOW_STATES.CLONING]
            .includes(state.status)) return state;
      return {
        ...state,
        status: WORKFLOW_STATES.CANCELLING,
        cancelRequested: true,
      };
    case "cancel_requested":
      return startOperation(state, { ...action, operation: "cancel" });
    case "status_poll_started":
      return startOperation(state, { ...action, operation: "status" });
    case "run_communication_failed": {
      const operation = action.operation;
      if (!ACTIVE_CLONE_STATES.has(state.status)
          || !["status", "cancel"].includes(operation)
          || state.inFlight?.operation !== operation) return state;
      return {
        ...state,
        inFlight: null,
        runCommunicationError: {
          ...safeBlockingError(action.error, `${operation}_communication_failed`),
          operation,
        },
      };
    }
    case "boot_verification_started":
      return startOperation(state, { ...action, operation: "boot_verification" });
    case "boot_verification_received": {
      if (state.inFlight?.operation !== "boot_verification") return state;
      const runIdMatches = typeof action.value?.run_id === "string"
        && action.value.run_id.length > 0
        && action.value.run_id === state.cloneStatus?.run_id;
      const verified = action.value?.verified === true
        && action.value?.boot_tested === true
        && runIdMatches;
      return {
        ...state,
        status: verified
          ? WORKFLOW_STATES.COMPLETED
          : mapCloneStatusToWorkflow(state.cloneStatus) ?? WORKFLOW_STATES.PARTIAL_FAILURE,
        inFlight: null,
        bootVerification: action.value,
        bootVerificationError: verified
          ? null
          : safeBlockingError(null, runIdMatches
            ? "boot_verification_unproved"
            : "boot_verification_run_mismatch"),
      };
    }
    case "boot_verification_failed":
      if (state.inFlight?.operation !== "boot_verification") return state;
      return {
        ...state,
        status: mapCloneStatusToWorkflow(state.cloneStatus) ?? WORKFLOW_STATES.PARTIAL_FAILURE,
        inFlight: null,
        bootVerificationError: safeBlockingError(action.error, "boot_verification_failed"),
      };
    case "invalidate":
      if (ACTIVE_CLONE_STATES.has(state.status)) return state;
      return invalidatePreparation(state, { clearSelection: action.clearSelection === true });
    case "terminal_result_dismissed": {
      if (!canDismissTerminalResult(state)) return state;
      const cleared = {
        ...state,
        cloneStatus: null,
        cancelRequested: false,
        runCommunicationError: null,
        bootVerification: null,
        bootVerificationError: null,
        blockingError: null,
      };
      return {
        ...invalidatePreparation(cleared, { clearSelection: true }),
        cloneStatus: null,
        blockingError: null,
      };
    }
    case "blocking_error":
      if (ACTIVE_CLONE_STATES.has(state.status) && state.cloneStatus?.active === true) {
        return {
          ...state,
          inFlight: null,
          confirmationValid: false,
          confirmationError: null,
          blockingError: safeBlockingError(action.error),
          confirmationResetSequence: state.confirmationResetSequence + 1,
        };
      }
      return {
        ...state,
        status: WORKFLOW_STATES.PARTIAL_FAILURE,
        inFlight: null,
        confirmationValid: false,
        confirmationError: null,
        blockingError: safeBlockingError(action.error),
        confirmationResetSequence: state.confirmationResetSequence + 1,
      };
    case "clear_blocker":
      if (ACTIVE_CLONE_STATES.has(state.status)) return state;
      return {
        ...invalidatePreparation({ ...state, blockingError: null }),
        blockingError: null,
      };
    default:
      return state;
  }
}

export function reduceWorkflow(state, action) {
  const current = state ?? createInitialWorkflowState();
  return reducer(current, action);
}
