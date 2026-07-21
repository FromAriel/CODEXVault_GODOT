import {
  formatActivityMetrics,
  translateActivityNormal,
} from "./activity-catalog.js";
import {
  WORKFLOW_STATES,
  canDismissTerminalResult,
  canVerifyBoot as canVerifyBootFromWorkflow,
  hasVerifiedBootEvidence,
  isNonDismissibleSafetyBlocker,
  isTargetProvenanceRecovery,
  isVerifiedCompletedTerminal,
  recoveryProvenanceKind,
} from "./workflow-state.js";

const ACTIVE_EXECUTION_STATES = new Set([
  WORKFLOW_STATES.STARTING_CLONE,
  WORKFLOW_STATES.CLONING,
  WORKFLOW_STATES.CANCELLING,
  WORKFLOW_STATES.CLEANING_UP,
]);

const TERMINAL_EXECUTION_STATES = new Set([
  WORKFLOW_STATES.COMPLETED,
  WORKFLOW_STATES.CANCELLED,
  WORKFLOW_STATES.PARTIAL_FAILURE,
]);

const FACT_COPY = Object.freeze([
  ["windows_copy", "Windows copy"],
  ["startup_files", "Startup files"],
  ["temporary_cleanup", "Temporary cleanup"],
  ["destination_isolation", "Destination isolation"],
  ["boot_verification", "Boot verification"],
]);

export const EXECUTION_FACT_STATES = Object.freeze({
  COMPLETE: "complete",
  NOT_COMPLETE: "not_complete",
  NOT_YET: "not_yet",
  NOT_PROVEN_HERE: "not_proven_here",
});

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function finiteNonnegative(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function nonemptyText(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function recoveryProvenance(state) {
  return recoveryProvenanceKind(state?.cloneStatus);
}

function matchingRecoveryRun(state) {
  const status = record(state?.cloneStatus);
  const recovery = record(status?.recovery);
  const runId = nonemptyText(status?.run_id ?? status?.runId);
  if (runId === null || recovery === null) return false;
  const recoveryRunId = nonemptyText(recovery.run_id ?? recovery.runId);
  return recoveryRunId === null || recoveryRunId === runId;
}

function terminalTruth(state) {
  const terminal = record(state?.cloneStatus?.terminal) ?? {};
  const verifiedBoot = hasVerifiedBootEvidence(state);
  const terminalBootTested = terminal.boot_tested ?? terminal.bootTested;
  const containmentUnproved = isNonDismissibleSafetyBlocker(state?.blockingError)
    && !["severe_storage_event", "severe_storage_evidence", "storage_event"]
      .includes(state?.blockingError?.kind ?? state?.blockingError?.code);
  return Object.freeze({
    physicalRestoreCompleted: terminal.physical_restore_completed === true
      || terminal.physicalRestoreCompleted === true,
    preparedToBoot: terminal.prepared_to_boot === true || terminal.preparedToBoot === true,
    bootTested: verifiedBoot,
    cleanupComplete: !containmentUnproved
      && (terminal.cleanup_complete === true || terminal.cleanupComplete === true),
    targetOffline: terminal.target_offline === true || terminal.targetOffline === true,
    hasPhysicalRestoreEvidence: typeof terminal.physical_restore_completed === "boolean"
      || typeof terminal.physicalRestoreCompleted === "boolean",
    hasPreparedEvidence: typeof terminal.prepared_to_boot === "boolean"
      || typeof terminal.preparedToBoot === "boolean",
    hasBootEvidence: verifiedBoot || terminalBootTested === false,
    hasCleanupEvidence: !containmentUnproved && (typeof terminal.cleanup_complete === "boolean"
      || typeof terminal.cleanupComplete === "boolean"),
    hasOfflineEvidence: typeof terminal.target_offline === "boolean"
      || typeof terminal.targetOffline === "boolean",
  });
}

function factState(value, hasEvidence, falseState = EXECUTION_FACT_STATES.NOT_COMPLETE) {
  if (!hasEvidence) return EXECUTION_FACT_STATES.NOT_PROVEN_HERE;
  return value ? EXECUTION_FACT_STATES.COMPLETE : falseState;
}

function publicTruth(truth) {
  return {
    physicalRestoreCompleted: truth.physicalRestoreCompleted,
    preparedToBoot: truth.preparedToBoot,
    bootTested: truth.bootTested,
    cleanupComplete: truth.cleanupComplete,
    targetOffline: truth.targetOffline,
  };
}

function pendingTruthFacts() {
  return FACT_COPY.map(([id, label]) => Object.freeze({
    id,
    label,
    state: EXECUTION_FACT_STATES.NOT_YET,
  }));
}

function projectTruthFacts(state, truth) {
  const executionVisible = ACTIVE_EXECUTION_STATES.has(state?.status)
    || TERMINAL_EXECUTION_STATES.has(state?.status) && record(state?.cloneStatus) !== null
    || state?.status === WORKFLOW_STATES.BOOT_VERIFICATION
    || recoveryProvenance(state) !== null;
  if (!executionVisible) return Object.freeze([]);
  if (!TERMINAL_EXECUTION_STATES.has(state?.status)
      && state?.status !== WORKFLOW_STATES.BOOT_VERIFICATION) {
    return Object.freeze(pendingTruthFacts());
  }
  if (isTargetProvenanceRecovery(state?.cloneStatus)) {
    return Object.freeze(FACT_COPY.map(([id, label]) => Object.freeze({
      id,
      label,
      state: id === "startup_files"
        ? truth.preparedToBoot ? EXECUTION_FACT_STATES.COMPLETE : EXECUTION_FACT_STATES.NOT_COMPLETE
        : id === "boot_verification"
          ? truth.bootTested ? EXECUTION_FACT_STATES.COMPLETE : EXECUTION_FACT_STATES.NOT_YET
          : EXECUTION_FACT_STATES.NOT_PROVEN_HERE,
    })));
  }
  const bootFalseState = truth.preparedToBoot
    ? EXECUTION_FACT_STATES.NOT_YET
    : EXECUTION_FACT_STATES.NOT_COMPLETE;
  const states = [
    factState(truth.physicalRestoreCompleted, truth.hasPhysicalRestoreEvidence),
    factState(truth.preparedToBoot, truth.hasPreparedEvidence),
    factState(truth.cleanupComplete, truth.hasCleanupEvidence),
    factState(truth.targetOffline, truth.hasOfflineEvidence),
    factState(truth.bootTested, truth.hasBootEvidence, bootFalseState),
  ];
  return Object.freeze(FACT_COPY.map(([id, label], index) => Object.freeze({
    id,
    label,
    state: states[index],
  })));
}

function statusRunId(state) {
  return nonemptyText(state?.cloneStatus?.run_id ?? state?.cloneStatus?.runId);
}

function correlatedEvent(state, event) {
  if (record(event) === null) return false;
  const runId = statusRunId(state);
  const eventRunId = nonemptyText(event.run_id ?? event.runId);
  if (runId !== null && eventRunId !== runId) return false;
  const generation = Number(state?.generation);
  const eventGeneration = Number(event.workflow_generation ?? event.workflowGeneration);
  if (Number.isInteger(generation) && eventGeneration !== generation) return false;
  return true;
}

function latestWarning(state, activitySnapshot, completedEvidenceValid) {
  const history = Array.isArray(activitySnapshot?.history) ? activitySnapshot.history : [];
  const warning = [...history].reverse().find((event) => (
    correlatedEvent(state, event) && event?.severity === "warning"
      && !["run_status_uncertain", "cancel_status_uncertain"].includes(event?.code)
  ));
  if (warning === undefined) return null;
  const code = nonemptyText(warning.code) ?? "execution_warning";
  const translatedCode = code === "event_153_recovered" && !completedEvidenceValid
    ? "event_153_observed"
    : code;
  return Object.freeze({
    code: translatedCode,
    tone: "warning",
    text: translateActivityNormal({ ...warning, code: translatedCode }),
  });
}

function correlatedActivityProgress(state, activitySnapshot) {
  const progress = record(activitySnapshot?.currentProgress);
  if (progress === null || !ACTIVE_EXECUTION_STATES.has(state?.status)) return null;
  return correlatedEvent(state, progress) ? record(progress.metrics) ?? progress : null;
}

function phaseForState(status) {
  switch (status) {
    case WORKFLOW_STATES.STARTING_CLONE: return "validated";
    case WORKFLOW_STATES.CANCELLING: return "cancelling";
    case WORKFLOW_STATES.CLEANING_UP: return "cleaning_up";
    case WORKFLOW_STATES.COMPLETED: return "completed";
    case WORKFLOW_STATES.CANCELLED: return "cancelled";
    case WORKFLOW_STATES.PARTIAL_FAILURE: return "partial_failure";
    default: return "copying";
  }
}

function projectProgress(state, activitySnapshot) {
  const direct = record(state?.cloneStatus?.progress);
  const metrics = record(direct?.metrics) ?? direct ?? correlatedActivityProgress(state, activitySnapshot) ?? {};
  const completed = finiteNonnegative(metrics.bytes_completed ?? metrics.bytesCompleted);
  const planned = finiteNonnegative(metrics.bytes_planned ?? metrics.bytesPlanned);
  const rate = finiteNonnegative(metrics.bytes_per_second ?? metrics.bytesPerSecond);
  const eta = finiteNonnegative(metrics.eta_seconds ?? metrics.etaSeconds);
  const phaseCode = nonemptyText(state?.cloneStatus?.phase) ?? phaseForState(state?.status);
  const visible = ACTIVE_EXECUTION_STATES.has(state?.status) || direct !== null;
  const percent = planned !== null && planned > 0 && completed !== null
    ? Math.min(100, Math.max(0, (completed / planned) * 100))
    : null;
  return Object.freeze({
    visible,
    phase: translateActivityNormal({ code: phaseCode, phase: phaseCode }),
    phaseCode,
    percent,
    bytesCompleted: completed,
    bytesPlanned: planned,
    rateBytesPerSecond: rate !== null && rate > 0 ? rate : null,
    etaSeconds: eta,
    formatted: formatActivityMetrics({
      bytes_completed: completed,
      bytes_planned: planned,
      bytes_per_second: rate,
      eta_seconds: eta,
    }),
    indeterminate: percent === null,
  });
}

function resultForState(state, truth, completedEvidenceValid) {
  if (isTargetProvenanceRecovery(state?.cloneStatus)) {
    if (truth.bootTested) {
      return Object.freeze({
        kind: "success",
        title: "This Windows clone has been boot verified.",
        message: "MiniClone matched this running Windows installation to the recorded clone.",
        note: "Source-side cleanup and offline evidence are not claimed from this running clone.",
        ...publicTruth(truth),
      });
    }
    return Object.freeze({
      kind: "attention",
      title: "Verify this cloned Windows installation.",
      message: "MiniClone found the fixed clone record for this running Windows installation.",
      note: state?.bootVerificationError == null
        ? "Verification is read-only and will match this boot to the recorded clone."
        : "Boot verification did not pass. The recorded clone result is unchanged.",
      ...publicTruth(truth),
    });
  }
  const blockerKind = state?.blockingError?.kind ?? state?.blockingError?.code;
  const severeStorageFailure = ["severe_storage_event", "severe_storage_evidence", "storage_event"]
    .includes(blockerKind);
  if (severeStorageFailure && record(state?.cloneStatus) !== null
      && state?.cloneStatus?.active !== true
      && TERMINAL_EXECUTION_STATES.has(state?.status)) {
    const contained = truth.cleanupComplete && truth.targetOffline;
    return Object.freeze({
      kind: "error",
      title: translateActivityNormal({ code: "severe_storage_event", severity: "error" }),
      message: contained
        ? "The destination is incomplete, cleaned up, and safely offline. Do not boot from it."
        : "Keep MiniClone open, leave both disks connected, and do not reboot or disconnect the destination.",
      note: null,
      ...publicTruth(truth),
    });
  }
  if (isNonDismissibleSafetyBlocker(state?.blockingError)
      && record(state?.cloneStatus) !== null
      && state?.cloneStatus?.active !== true
      && TERMINAL_EXECUTION_STATES.has(state?.status)) {
    return Object.freeze({
      kind: "error",
      title: translateActivityNormal({ code: blockerKind, severity: "error" }),
      message: "MiniClone has not proved safe cleanup. Keep MiniClone open, leave both disks connected, and do not reboot or disconnect the destination.",
      note: null,
      ...publicTruth(truth),
    });
  }
  if (state?.status === WORKFLOW_STATES.COMPLETED) {
    if (!completedEvidenceValid) {
      return Object.freeze({
        kind: "error",
        title: "The final clone evidence is incomplete.",
        message: "MiniClone cannot claim this destination is ready to boot.",
        note: "Keep MiniClone open, leave both disks connected, and do not reboot or disconnect the destination.",
        ...publicTruth(truth),
      });
    }
    if (truth.bootTested) {
      return Object.freeze({
        kind: "success",
        title: "This Windows clone has been boot verified.",
        message: "MiniClone matched this running Windows installation to the recorded clone.",
        note: null,
        ...publicTruth(truth),
      });
    }
    if (truth.preparedToBoot) {
      return Object.freeze({
        kind: "success",
        title: "Your Windows clone is ready.",
        message: "MiniClone copied and verified Windows, prepared startup files, cleaned up its temporary snapshot, and left the destination safely offline.",
        note: "The clone is prepared to boot. It has not been boot-tested yet.",
        ...publicTruth(truth),
      });
    }
    return Object.freeze({
      kind: "error",
      title: "Windows was copied, but startup preparation did not finish.",
      message: "Do not boot from this destination.",
      note: truth.cleanupComplete && truth.targetOffline
        ? "The incomplete destination was cleaned up and left safely offline."
        : "Keep MiniClone open and leave both disks connected until cleanup is proved.",
      ...publicTruth(truth),
    });
  }
  if (state?.status === WORKFLOW_STATES.CANCELLED) {
    const contained = truth.cleanupComplete && truth.targetOffline;
    return Object.freeze({
      kind: "cancelled",
      title: contained ? "The clone stopped safely." : "The clone stopped, but safe cleanup is not fully proved.",
      message: contained
        ? "The destination is incomplete, cleaned up, and safely offline. Do not boot from it."
        : "Keep MiniClone open, leave both disks connected, and do not reboot or disconnect the destination.",
      note: null,
      ...publicTruth(truth),
    });
  }
  if (state?.status === WORKFLOW_STATES.PARTIAL_FAILURE) {
    if (record(state?.cloneStatus) === null) return null;
    const contained = truth.cleanupComplete && truth.targetOffline;
    const bootPreparationFailed = truth.physicalRestoreCompleted && truth.hasPreparedEvidence
      && !truth.preparedToBoot;
    return Object.freeze({
      kind: "error",
      title: bootPreparationFailed
        ? "Windows was copied, but startup preparation did not finish."
        : contained ? "The clone did not complete." : "MiniClone stopped before safe cleanup was proved.",
      message: bootPreparationFailed
        ? "Do not boot from this destination."
        : contained
          ? "The incomplete destination was cleaned up and left safely offline. Do not boot from it."
          : "Keep MiniClone open, leave both disks connected, and do not reboot or disconnect the destination.",
      note: null,
      ...publicTruth(truth),
    });
  }
  return null;
}

function instructionsFor(state, truth, completedEvidenceValid) {
  if (state?.status !== WORKFLOW_STATES.COMPLETED || !completedEvidenceValid
      || !truth.preparedToBoot || truth.bootTested) return Object.freeze([]);
  return Object.freeze([
    "Shut down.",
    "Select the new drive from the firmware's one-time boot menu.",
    "After Windows starts from the new drive, reopen MiniClone and choose Verify this clone.",
  ]);
}

function nextStepFor(state, truth, completedEvidenceValid) {
  if (state?.bootVerificationError !== null && state?.bootVerificationError !== undefined) {
    return "Boot from the cloned drive and choose Verify this clone again.";
  }
  if (state?.status === WORKFLOW_STATES.COMPLETED && completedEvidenceValid) {
    return truth.bootTested
      ? "This clone is boot verified."
      : truth.preparedToBoot ? "Shut down when you are ready to try the new drive." : "Do not boot from this destination.";
  }
  if ([WORKFLOW_STATES.CANCELLED, WORKFLOW_STATES.PARTIAL_FAILURE].includes(state?.status)) {
    return truth.cleanupComplete && truth.targetOffline
      ? "You can check the disks again."
      : "Keep MiniClone open and leave both disks connected.";
  }
  return null;
}

function noticeFor(state) {
  if (ACTIVE_EXECUTION_STATES.has(state?.status)) {
    if (recoveryProvenance(state) === "active_marker"
        && state?.cloneStatus?.cancellation_available !== true) {
      return Object.freeze({
        tone: "attention",
        text: "MiniClone reconnected to this clone. Status monitoring continues, but this app session cannot send a stop request.",
      });
    }
    return Object.freeze({
      tone: "attention",
      text: "Keep MiniClone open and do not disconnect either disk.",
    });
  }
  if (isTargetProvenanceRecovery(state?.cloneStatus)) {
    return Object.freeze({
      tone: "info",
      text: "MiniClone found the fixed clone record for this running Windows installation.",
    });
  }
  switch (recoveryProvenance(state)) {
    case "summary": return Object.freeze({
      tone: "info",
      text: "MiniClone recovered this result from its durable summary.",
    });
    case "journal_without_summary": return Object.freeze({
      tone: "attention",
      text: "MiniClone found an earlier run without a final summary. No success claim was made.",
    });
    default: return null;
  }
}

function communicationErrorFor(state) {
  if (state?.runCommunicationError === null || state?.runCommunicationError === undefined) return null;
  const code = state.runCommunicationError.operation === "cancel"
    ? "cancel_status_uncertain"
    : "run_status_uncertain";
  return Object.freeze({
    code,
    tone: "warning",
    text: translateActivityNormal({ code, severity: "warning" }),
  });
}

function canOfferCancellation(state) {
  return state?.status === WORKFLOW_STATES.CLONING
    && state?.cloneStatus?.active === true
    && state?.cloneStatus?.cancellation_available === true
    && state?.cancelRequested !== true;
}

export function canVerifyBoot(state) {
  return matchingRecoveryRun(state) && canVerifyBootFromWorkflow(state);
}

export function createExecutionPresentationState() {
  return Object.freeze({ cancelPromptOpen: false, resultDismissed: false, sequence: 0 });
}

export function reduceExecutionPresentation(state, action) {
  const current = record(state) ?? createExecutionPresentationState();
  const type = nonemptyText(action?.type);
  switch (type) {
    case "open_cancel_prompt":
      if (current.cancelPromptOpen === true) return current;
      return Object.freeze({ ...current, cancelPromptOpen: true, sequence: current.sequence + 1 });
    case "dismiss_cancel_prompt":
      if (current.cancelPromptOpen !== true) return current;
      return Object.freeze({ ...current, cancelPromptOpen: false, sequence: current.sequence + 1 });
    case "dismiss_terminal_result":
      if (current.resultDismissed === true) return current;
      return Object.freeze({ ...current, resultDismissed: true, sequence: current.sequence + 1 });
    case "reset":
      return Object.freeze({
        cancelPromptOpen: false,
        resultDismissed: false,
        sequence: current.sequence + 1,
      });
    default:
      return current;
  }
}

export function createExecutionViewModel({
  workflowState,
  activitySnapshot = null,
  presentationState = null,
} = {}) {
  const state = record(workflowState) ?? {};
  const presentation = record(presentationState) ?? createExecutionPresentationState();
  const truth = terminalTruth(state);
  const completedEvidenceValid = state.status === WORKFLOW_STATES.COMPLETED
    && state.blockingError === null
    && isVerifiedCompletedTerminal(record(state?.cloneStatus?.terminal));
  const progress = projectProgress(state, activitySnapshot);
  const terminalResult = resultForState(state, truth, completedEvidenceValid);
  const result = presentation.resultDismissed === true ? null : terminalResult;
  const cancellationAvailable = canOfferCancellation(state);
  const cancelPrompt = presentation.cancelPromptOpen === true && cancellationAvailable
    ? Object.freeze({
      title: "Stop cloning safely?",
      message: "The destination will be incomplete. MiniClone will stop at the next safe point and clean up; this may take a little while.",
      keepLabel: "Keep cloning",
      confirmLabel: "Stop safely",
    })
    : null;
  const communicationWarning = communicationErrorFor(state);
  const warning = communicationWarning ?? latestWarning(state, activitySnapshot, completedEvidenceValid);
  const announcementText = result?.title ?? warning?.text ?? (progress.visible ? progress.phase : "");
  const terminalState = nonemptyText(state?.cloneStatus?.terminal?.final_state) ?? "active";
  const bootState = truth.bootTested ? "boot_verified" : state?.status === WORKFLOW_STATES.BOOT_VERIFICATION
    ? "boot_verifying" : "boot_unverified";
  const generation = Number.isSafeInteger(state?.generation) ? state.generation : 0;
  return Object.freeze({
    active: ACTIVE_EXECUTION_STATES.has(state?.status),
    notice: noticeFor(state),
    warning,
    communicationError: null,
    cancelPrompt,
    presentationSequence: Number.isSafeInteger(presentation.sequence) ? presentation.sequence : 0,
    truthFacts: projectTruthFacts(state, truth),
    instructions: instructionsFor(state, truth, completedEvidenceValid),
    nextStep: nextStepFor(state, truth, completedEvidenceValid),
    announcement: Object.freeze({
      key: `${generation}:${progress.phaseCode}:${terminalState}:${bootState}:${warning?.code ?? "none"}`,
      text: announcementText,
    }),
    progress,
    result,
    cancellationAvailable,
    canVerifyBoot: canVerifyBoot(state),
    canRefresh: canDismissTerminalResult(state),
  });
}
