import {
  WORKFLOW_STATES,
  createInitialWorkflowState,
  hasVerifiedBootEvidence,
  isEvidenceReady,
  isTargetProvenanceRecovery,
  isVerifiedCompletedTerminal,
  recoveryProvenanceKind,
} from "./workflow-state.js";
import { createExecutionViewModel } from "./execution-view-model.js";

const ACTIVE_EXECUTION_STATES = new Set([
  WORKFLOW_STATES.STARTING_CLONE,
  WORKFLOW_STATES.CLONING,
  WORKFLOW_STATES.CANCELLING,
  WORKFLOW_STATES.CLEANING_UP,
]);

const PASSED_READINESS_STATES = new Set([
  WORKFLOW_STATES.READY,
  WORKFLOW_STATES.CONFIRMING,
  ...ACTIVE_EXECUTION_STATES,
  WORKFLOW_STATES.COMPLETED,
  WORKFLOW_STATES.CANCELLED,
  WORKFLOW_STATES.BOOT_VERIFICATION,
]);

const REFUSAL_COPY = Object.freeze({
  source_disk: "This is the Windows source.",
  system_disk: "Windows currently depends on this disk.",
  boot_disk: "Windows currently boots from this disk.",
  pagefile_disk: "Windows is actively using this disk.",
  crashdump_disk: "Windows is actively using this disk.",
  ambiguous_dependency: "Windows may depend on this disk.",
  offline_disk: "This disk is offline.",
  read_only_disk: "This disk is read-only.",
  failing_health: "This disk did not pass its health check.",
  target_too_small: "This disk is too small for the clone.",
  active_bit_locker: "BitLocker is active on this disk.",
  unknown_bit_locker: "MiniClone could not verify this disk's BitLocker state.",
  unsupported_target_bus: "This connection type is not supported.",
  unsupported_target_type: "This disk type is not supported.",
  unsupported_target_topology: "This disk layout is not supported.",
  unsupported_topology: "This disk layout is not supported.",
  dynamic_disk: "Dynamic disks are not supported.",
  storage_spaces: "Storage Spaces disks are not supported.",
  multipath_disk: "Multipath disks are not supported.",
  hotplug_disk: "Hot-plug disks are not supported.",
  removable_disk: "Removable disks are not supported.",
  unhealthy_disk: "This disk did not pass its health check.",
  unsupported_windows_host: "This Windows environment is not supported.",
  native_extent_mismatch: "Windows and the disk hardware reported different identities.",
  identity_changed: "This disk changed after it was checked.",
  target_identity_changed: "This disk changed after it was checked.",
});

const BLOCKING_COPY = Object.freeze({
  inspection_failed: [
    "MiniClone could not inspect this computer",
    "No disk was selected and no success claim was made.",
  ],
  source_identity_changed: [
    "The Windows source changed",
    "Refresh the disk list before continuing.",
  ],
  target_identity_changed: [
    "The destination changed",
    "MiniClone stopped before trusting the changed disk.",
  ],
  severe_storage_event: [
    "Windows reported a serious storage problem",
    "MiniClone stopped and made no success claim.",
  ],
  snapshot_cleanup_unproved: [
    "Snapshot cleanup could not be proved",
    "MiniClone stopped because safe cleanup was uncertain.",
  ],
  source_containment_unproved: [
    "Snapshot cleanup could not be proved",
    "MiniClone stopped because safe cleanup was uncertain.",
  ],
  cleanup_failed: [
    "Cleanup did not finish",
    "The destination may be incomplete. Review it before doing anything else.",
  ],
  missing_terminal_evidence: [
    "The final result is missing",
    "MiniClone cannot claim the clone completed without final evidence.",
  ],
  boot_verification_unproved: [
    "Boot verification did not pass",
    "The previous clone result is unchanged; boot success was not recorded.",
  ],
});

const HEADER_COPY = Object.freeze({
  [WORKFLOW_STATES.STARTING]: ["Starting MiniClone", "Preparing the safe disk workflow.", "working"],
  [WORKFLOW_STATES.INSPECTING]: ["Finding your Windows drive", "MiniClone is checking the disks without changing them.", "working"],
  [WORKFLOW_STATES.CHOOSE_TARGET]: ["Choose where to copy Windows", "Your running Windows drive is protected.", "ready"],
  [WORKFLOW_STATES.CHECKING_TARGET]: ["Checking your destination", "MiniClone is proving that the selected disk is safe to use.", "working"],
  [WORKFLOW_STATES.READY]: ["Ready to clone", "The source, destination, and safety evidence agree.", "success"],
  [WORKFLOW_STATES.CONFIRMING]: ["Confirm this destination", "Review the one destructive decision before starting.", "attention"],
  [WORKFLOW_STATES.STARTING_CLONE]: ["Starting the clone", "MiniClone is rechecking everything before the first write.", "working"],
  [WORKFLOW_STATES.CLONING]: ["Cloning Windows", "The verified Windows snapshot is being copied.", "working"],
  [WORKFLOW_STATES.CANCELLING]: ["Stopping the clone", "MiniClone is finishing safe cleanup before it stops.", "attention"],
  [WORKFLOW_STATES.CLEANING_UP]: ["Finishing safely", "MiniClone is removing temporary access and isolating the destination.", "working"],
  [WORKFLOW_STATES.COMPLETED]: ["Clone completed", "The final result is available below.", "success"],
  [WORKFLOW_STATES.CANCELLED]: ["Clone cancelled", "The destination may be incomplete and was not declared ready to boot.", "attention"],
  [WORKFLOW_STATES.PARTIAL_FAILURE]: ["MiniClone stopped", "No unsupported success claim was made.", "error"],
  [WORKFLOW_STATES.RECOVERING]: ["Checking an earlier clone", "MiniClone is reading its durable result before showing a status.", "working"],
  [WORKFLOW_STATES.BOOT_VERIFICATION]: ["Verifying the cloned Windows installation", "MiniClone is matching this boot to the recorded clone.", "working"],
});

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function boundedText(value, fallback, limit = 96) {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/[\u0000-\u001f\u007f-\u009f]+/gu, " ")
    .replace(/\s+/gu, " ").trim();
  return normalized.length === 0 ? fallback : normalized.slice(0, limit);
}

function finiteDiskNumber(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function finiteNonnegative(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function recoveryProvenance(state) {
  return recoveryProvenanceKind(state?.cloneStatus);
}

function formatBytes(value) {
  let amount = finiteNonnegative(value);
  if (amount === null) return "Capacity unavailable";
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  return `${amount.toFixed(unit >= 3 ? 1 : 0)} ${units[unit]}`;
}

function safeFormattedCapacity(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return /^\d+(?:\.\d+)?\s+(?:B|KiB|MiB|GiB|TiB)$/u.test(normalized)
    ? normalized
    : null;
}

function inspectionValue(state) {
  return record(state?.inspection?.value);
}

function inspectionReport(state) {
  return record(inspectionValue(state)?.report);
}

function rawSource(state) {
  const inspection = inspectionValue(state);
  return record(inspectionReport(state)?.source_disk)
    ?? record(inspection?.view?.source)
    ?? record(inspection?.source);
}

function sourceNumber(state) {
  const source = rawSource(state);
  return finiteDiskNumber(source?.number ?? source?.diskNumber);
}

function sourceVolume(source) {
  const prepared = boundedText(source?.windowsMount ?? source?.windowsVolume, "", 8);
  const preparedMatch = /^([A-Za-z]):(?:\\)?$/u.exec(prepared);
  if (preparedMatch) return `${preparedMatch[1].toUpperCase()}:`;
  const bootPartitions = Array.isArray(source?.partitions)
    ? source.partitions.filter((partition) => partition?.is_boot === true)
    : [];
  if (bootPartitions.length !== 1) return "Windows volume";
  const letters = [...new Set((bootPartitions[0].access_paths ?? [])
    .map((path) => /^([A-Za-z]):[\\/]?$/u.exec(String(path).trim()))
    .filter(Boolean)
    .map((match) => `${match[1].toUpperCase()}:`))];
  return letters.length === 1 ? letters[0] : "Windows volume";
}

function bootStyle(state, source) {
  const confidence = String(inspectionReport(state)?.source_confidence ?? "").toLowerCase();
  if (confidence.includes("uefi_gpt")) return "UEFI/GPT";
  if (confidence.includes("bios_mbr")) return "BIOS/MBR";
  const prepared = String(source?.bootStyle ?? "").toLowerCase().replaceAll(" ", "");
  if (prepared === "uefi/gpt") return "UEFI/GPT";
  if (prepared === "bios/mbr") return "BIOS/MBR";
  const style = String(source?.partition_style ?? source?.partitionStyle ?? "").toLowerCase();
  return style === "gpt" ? "UEFI/GPT" : style === "mbr" ? "BIOS/MBR" : "Boot style unavailable";
}

function windowsVersion(state) {
  const host = inspectionReport(state)?.windows_host ?? inspectionValue(state)?.windowsHost;
  const build = Number(host?.build_number ?? host?.buildNumber);
  const inferredProduct = Number.isFinite(build)
    ? build >= 22_000 ? "Windows 11" : build >= 10_240 ? "Windows 10" : "Windows"
    : "Windows";
  const product = boundedText(host?.product_name ?? host?.productName, inferredProduct, 64);
  const release = boundedText(host?.display_version ?? host?.displayVersion, "", 24);
  return release && !product.toLowerCase().includes(release.toLowerCase())
    ? `${product} ${release}`.slice(0, 88)
    : product;
}

function projectSource(state) {
  const source = rawSource(state);
  if (source === null) return null;
  const capacity = formatBytes(source.size_bytes ?? source.sizeBytes);
  return Object.freeze({
    volume: sourceVolume(source),
    model: boundedText(source.model, "Windows drive", 96),
    capacity: capacity === "Capacity unavailable"
      ? safeFormattedCapacity(source.capacity) ?? capacity
      : capacity,
    windowsVersion: windowsVersion(state),
    bootStyle: bootStyle(state, source),
    badge: "Protected source",
  });
}

function candidateDisk(candidate) {
  return record(candidate?.disk) ?? candidate;
}

function candidateNumber(candidate) {
  const disk = candidateDisk(candidate);
  return finiteDiskNumber(candidate?.diskNumber ?? disk?.number);
}

function candidateReasons(candidate) {
  if (Array.isArray(candidate?.refusal_reasons)) return candidate.refusal_reasons;
  if (Array.isArray(candidate?.refusalReasons)) return candidate.refusalReasons;
  return [];
}

function rawCandidates(state) {
  const reportCandidates = inspectionReport(state)?.target_candidates;
  const accepted = inspectionValue(state)?.targets ?? inspectionValue(state)?.selectableTargets;
  const acceptedTargets = Array.isArray(accepted) ? accepted : [];
  if (!Array.isArray(reportCandidates)) return acceptedTargets;
  const reportedNumbers = new Set(reportCandidates.map(candidateNumber).filter((number) => number !== null));
  return [
    ...reportCandidates,
    ...acceptedTargets.filter((candidate) => !reportedNumbers.has(candidateNumber(candidate))),
  ];
}

function acceptedTargetNumbers(state) {
  const accepted = inspectionValue(state)?.targets ?? inspectionValue(state)?.selectableTargets;
  return new Set((Array.isArray(accepted) ? accepted : [])
    .filter((candidate) => candidate?.selectable !== false)
    .map(candidateNumber)
    .filter((number) => number !== null));
}

function candidateDisposition(candidate) {
  if (["ready_blank", "requires_erase", "refused"].includes(candidate?.disposition)) {
    return candidate.disposition;
  }
  return candidate?.selectable === true || candidate?.eligible === true ? "ready_blank" : "refused";
}

function connectionLabel(candidate) {
  const disk = candidateDisk(candidate);
  const raw = disk?.bus_type ?? disk?.busType ?? candidate?.transport?.observed_bus
    ?? candidate?.transport?.observedBus ?? candidate?.connection;
  switch (String(raw ?? "").trim().toUpperCase()) {
    case "NVME": return "NVMe";
    case "SATA":
    case "ATA": return "SATA";
    default: return "Internal drive";
  }
}

function refusalReason(candidate) {
  const reason = candidateReasons(candidate)[0];
  return REFUSAL_COPY[reason] ?? "MiniClone cannot safely use this disk.";
}

function projectDestinations(state) {
  const recoveredRun = recoveryProvenance(state) !== null;
  if (recoveredRun) {
    return Object.freeze({
      eligible: Object.freeze([]),
      refused: Object.freeze([]),
      refusedLabel: "Other disks MiniClone cannot use (0)",
      pending: false,
      recovered: true,
      emptyMessage: "Destination from the recovered run",
    });
  }
  const sourceDisk = sourceNumber(state);
  const selected = finiteDiskNumber(state?.selectedDiskNumber);
  const acceptedNumbers = acceptedTargetNumbers(state);
  const selectionLocked = state?.status === WORKFLOW_STATES.CONFIRMING
    || ACTIVE_EXECUTION_STATES.has(state?.status)
    || (state?.cloneStatus !== null && state?.cloneStatus !== undefined);
  const seen = new Set();
  const eligible = [];
  const refused = [];
  for (const candidate of rawCandidates(state)) {
    const disk = candidateDisk(candidate);
    const diskNumber = candidateNumber(candidate);
    if (diskNumber === null || seen.has(diskNumber)) continue;
    seen.add(diskNumber);
    const disposition = candidateDisposition(candidate);
    const reasons = candidateReasons(candidate);
    const selectable = acceptedNumbers.has(diskNumber) && diskNumber !== sourceDisk
      && reasons.length === 0 && disposition !== "refused";
    const capacity = formatBytes(disk?.size_bytes ?? disk?.sizeBytes);
    const common = {
      model: boundedText(disk?.model ?? candidate?.model, "Unnamed disk", 96),
      capacity: capacity === "Capacity unavailable"
        ? safeFormattedCapacity(candidate?.capacity) ?? capacity
        : capacity,
    };
    if (selectable) {
      eligible.push(Object.freeze({
        diskNumber,
        ...common,
        connection: connectionLabel(candidate),
        status: disposition === "requires_erase" ? "Will be erased" : "Ready",
        selected: diskNumber === selected,
        ...(selectionLocked ? { disabled: true } : {}),
      }));
    } else {
      refused.push(Object.freeze({
        ...common,
        reason: refusalReason(candidate),
      }));
    }
  }
  eligible.sort((left, right) => left.diskNumber - right.diskNumber);
  refused.sort((left, right) => left.model.localeCompare(right.model));
  const pending = [WORKFLOW_STATES.STARTING, WORKFLOW_STATES.INSPECTING, WORKFLOW_STATES.RECOVERING]
    .includes(state?.status);
  return Object.freeze({
    eligible: Object.freeze(eligible),
    refused: Object.freeze(refused),
    refusedLabel: `Other disks MiniClone cannot use (${refused.length})`,
    pending,
    emptyMessage: pending
      ? "MiniClone is checking the available disks…"
      : refused.length > 0
        ? "No supported destinations are available."
        : "No destination disks were found.",
  });
}

function destinationPolicy(state) {
  if (state?.capability?.simulated === true || state?.capability?.capability === "demo_simulation") {
    return Object.freeze({ label: "SIMULATED ONLY", tone: "simulation" });
  }
  const recovery = recoveryProvenance(state);
  if (recovery === "target_provenance") {
    return Object.freeze({ label: "READ-ONLY VERIFICATION", tone: "safe" });
  }
  if (recovery !== null) {
    return Object.freeze({
      label: state?.cloneStatus?.active === true ? "RECONNECTED RUN" : "RECOVERED RESULT",
      tone: state?.cloneStatus?.active === true ? "active" : "safe",
    });
  }
  if (state?.capability?.execution_enabled === true) {
    return Object.freeze({
      label: ACTIVE_EXECUTION_STATES.has(state?.status) ? "CLONE ACTIVE" : "CONFIRMATION REQUIRED",
      tone: ACTIVE_EXECUTION_STATES.has(state?.status) ? "active" : "attention",
    });
  }
  return Object.freeze({ label: "NO WRITES", tone: "safe" });
}

function actionDescription(action, selectedTarget) {
  switch (action?.id) {
    case "open_confirmation": return "One exact confirmation is required before MiniClone can start.";
    case "checking_target": return "MiniClone is checking this destination safely.";
    case "confirmation_open": return "Review the destination and confirm only when it is correct.";
    case "execution_unavailable": return "This package can verify disks, but it cannot start a clone.";
    case "open_cancel_prompt": return "Stop at a safe checkpoint and let MiniClone complete cleanup.";
    case "verify_boot": return "Verify that this Windows boot matches the completed clone record.";
    case "refresh_inspection": return "Refresh the disk list before trying again.";
    case "close_application": return "Close MiniClone without changing either disk.";
    default: return selectedTarget
      ? "MiniClone is checking the selected destination."
      : "Choose one supported destination to continue.";
  }
}

function inFlightLabel(state) {
  switch (state?.inFlight?.operation) {
    case "preflight": return "Checking destination…";
    case "diagnostic": return "Checking the Windows snapshot…";
    case "disclosure": return "Finishing safety checks…";
    case "confirmation": return "Confirming destination…";
    case "start_clone": return "Starting clone…";
    case "cancel": return "Stopping clone…";
    case "boot_verification": return "Verifying boot…";
    default: return "Working…";
  }
}

function actionModel(state, nowMs, destinationSelected, execution) {
  if (execution.canVerifyBoot) {
    return Object.freeze({ id: "verify_boot", label: "Verify this clone", enabled: true, busy: false, tone: "primary" });
  }
  if (state?.status === WORKFLOW_STATES.CLONING) {
    if (execution.cancelPrompt !== null) return null;
    return execution.cancellationAvailable
      ? Object.freeze({ id: "open_cancel_prompt", label: "Stop safely", enabled: true, busy: false, tone: "danger" })
      : null;
  }
  if ([WORKFLOW_STATES.CANCELLING, WORKFLOW_STATES.CLEANING_UP].includes(state?.status)) return null;
  if ((state?.blockingError !== null || state?.status === WORKFLOW_STATES.PARTIAL_FAILURE)
      && !execution.canRefresh) {
    return Object.freeze({
      id: "close_application",
      label: "Close MiniClone",
      enabled: true,
      busy: false,
      tone: "primary",
    });
  }
  if (state?.inFlight !== null) {
    return Object.freeze({ id: "busy", label: inFlightLabel(state), enabled: false, busy: true, tone: "primary" });
  }
  switch (state?.status) {
    case WORKFLOW_STATES.CHOOSE_TARGET:
      return Object.freeze({ id: "select_target", label: "Select a destination", enabled: false, busy: false, tone: "primary" });
    case WORKFLOW_STATES.CHECKING_TARGET:
      if (!destinationSelected) return null;
      return Object.freeze({
        id: "checking_target",
        label: "Checking this destination…",
        enabled: false,
        busy: true,
        tone: "primary",
      });
    case WORKFLOW_STATES.READY:
      if (!isEvidenceReady(state, nowMs)) {
        return Object.freeze({
          id: "checking_target",
          label: "Safety check expired — checking again",
          enabled: false,
          busy: true,
          tone: "primary",
        });
      }
      if (state.capability?.execution_enabled !== true) {
        return Object.freeze({ id: "execution_unavailable", label: "Clone unavailable in this build", enabled: false, busy: false, tone: "primary" });
      }
      return Object.freeze({ id: "open_confirmation", label: "Clone Windows", enabled: true, busy: false, tone: "danger" });
    case WORKFLOW_STATES.CONFIRMING:
      if (!isEvidenceReady(state, nowMs)) {
        return Object.freeze({
          id: "checking_target",
          label: "Safety check expired — checking again",
          enabled: false,
          busy: true,
          tone: "primary",
        });
      }
      if (state.capability?.execution_enabled !== true) {
        return Object.freeze({ id: "execution_unavailable", label: "Clone unavailable in this build", enabled: false, busy: false, tone: "primary" });
      }
      return Object.freeze({ id: "confirmation_open", label: "Confirmation open", enabled: false, busy: false, tone: "danger" });
    case WORKFLOW_STATES.COMPLETED: {
      if (execution.canRefresh) return Object.freeze({ id: "refresh_inspection", label: "Check disks again", enabled: true, busy: false, tone: "primary" });
      return Object.freeze({ id: "close_application", label: "Close MiniClone", enabled: true, busy: false, tone: "primary" });
    }
    case WORKFLOW_STATES.CANCELLED:
    case WORKFLOW_STATES.PARTIAL_FAILURE:
      return execution.canRefresh
        ? Object.freeze({ id: "refresh_inspection", label: "Check disks again", enabled: true, busy: false, tone: "primary" })
        : Object.freeze({ id: "close_application", label: "Close MiniClone", enabled: true, busy: false, tone: "primary" });
    default:
      return null;
  }
}

function completedEvidenceIsValid(state) {
  return state?.blockingError === null
    && isVerifiedCompletedTerminal(record(state?.cloneStatus?.terminal));
}


function blockingErrorModel(state) {
  const error = state?.blockingError;
  if (error === null || error === undefined) return null;
  const kind = typeof error.kind === "string" ? error.kind : typeof error.code === "string" ? error.code : "";
  if (state?.cloneStatus?.active === true) {
    const severeStorage = ["severe_storage_event", "severe_storage_evidence", "storage_event"]
      .includes(kind);
    return Object.freeze({
      title: severeStorage
        ? "Windows reported a serious storage problem"
        : "MiniClone is resolving a safety problem",
      message: "MiniClone is still monitoring the clone for a safe final result. Keep MiniClone open and keep both disks connected.",
    });
  }
  const copy = BLOCKING_COPY[kind] ?? [
    "MiniClone stopped because a safety check failed",
    "Refresh the disk list and review the destination before trying again.",
  ];
  return Object.freeze({ title: copy[0], message: copy[1] });
}

function trustChecks(state, source, destinationSelected, evidenceReady) {
  const recoveredRun = recoveryProvenance(state) !== null;
  const targetProvenance = isTargetProvenanceRecovery(state?.cloneStatus);
  const incompleteTerminal = state?.status === WORKFLOW_STATES.COMPLETED
    && !completedEvidenceIsValid(state) && !targetProvenance;
  const blocked = state?.blockingError !== null || state?.status === WORKFLOW_STATES.PARTIAL_FAILURE
    && !targetProvenance || incompleteTerminal;
  const sourceComplete = source !== null && state?.inspection?.generation === state?.generation;
  const destinationComplete = destinationSelected || recoveredRun;
  const safetyPassed = targetProvenance || evidenceReady || ACTIVE_EXECUTION_STATES.has(state?.status)
    || ([WORKFLOW_STATES.COMPLETED, WORKFLOW_STATES.CANCELLED, WORKFLOW_STATES.BOOT_VERIFICATION]
      .includes(state?.status) && !incompleteTerminal);
  const readyPassed = (targetProvenance || PASSED_READINESS_STATES.has(state?.status)) && !blocked;
  const safetyOperationActive = state?.status === WORKFLOW_STATES.CHECKING_TARGET
    && ["preflight", "diagnostic", "disclosure"].includes(state?.inFlight?.operation);
  const stateFor = (complete, active) => blocked && !complete ? "blocked" : complete ? "complete" : active ? "active" : "pending";
  return Object.freeze([
    Object.freeze({
      id: "source",
      label: "Windows source found",
      state: stateFor(sourceComplete, [WORKFLOW_STATES.STARTING, WORKFLOW_STATES.INSPECTING].includes(state?.status)),
    }),
    Object.freeze({
      id: "destination",
      label: "Destination selected",
      state: stateFor(destinationComplete, state?.status === WORKFLOW_STATES.CHOOSE_TARGET),
    }),
    Object.freeze({
      id: "safety",
      label: "Safety checks complete",
      state: stateFor(safetyPassed, safetyOperationActive),
    }),
    Object.freeze({
      id: "ready",
      label: "Ready for confirmation",
      state: stateFor(readyPassed, state?.status === WORKFLOW_STATES.CONFIRMING),
    }),
  ]);
}

export function createNormalShellViewModel({
  workflowState,
  activitySnapshot = null,
  executionPresentationState = null,
  now = 0,
} = {}) {
  const state = record(workflowState) ?? createInitialWorkflowState();
  const nowMs = Number.isFinite(now) ? now : 0;
  const source = projectSource(state);
  const destinations = projectDestinations(state);
  const destinationSelected = destinations.eligible.some((target) => target.selected);
  const evidenceReady = isEvidenceReady(state, nowMs);
  const baseHeader = HEADER_COPY[state.status] ?? HEADER_COPY[WORKFLOW_STATES.PARTIAL_FAILURE];
  const targetProvenance = isTargetProvenanceRecovery(state.cloneStatus);
  const bootVerified = hasVerifiedBootEvidence(state);
  const expiredReady = [WORKFLOW_STATES.READY, WORKFLOW_STATES.CONFIRMING].includes(state.status)
    && !evidenceReady;
  const executionDisabled = [WORKFLOW_STATES.READY, WORKFLOW_STATES.CONFIRMING].includes(state.status) && evidenceReady
    && state.capability?.execution_enabled !== true;
  const incompleteTerminal = state.status === WORKFLOW_STATES.COMPLETED
    && !completedEvidenceIsValid(state) && !targetProvenance;
  const waitingForAutomaticCheck = state.status === WORKFLOW_STATES.CHECKING_TARGET
    && state.inFlight === null;
  const header = Object.freeze({
    title: targetProvenance && state.status !== WORKFLOW_STATES.BOOT_VERIFICATION
      ? bootVerified
        ? "This Windows clone has been boot verified"
        : "Verify this cloned Windows installation"
      : incompleteTerminal ? "Clone result incomplete"
      : expiredReady ? "Safety check expired — checking again"
        : executionDisabled ? "Safety checks complete"
        : waitingForAutomaticCheck ? "Checking this destination" : baseHeader[0],
    summary: targetProvenance && state.status !== WORKFLOW_STATES.BOOT_VERIFICATION
      ? bootVerified
        ? "This running Windows installation matches the recorded clone."
        : "MiniClone can match this boot to the fixed clone record without changing any disk."
      : incompleteTerminal ? "Required completion and cleanup evidence is missing."
      : expiredReady ? "MiniClone is refreshing the destination evidence before continuing."
        : executionDisabled ? "This build can check disks but cannot start a clone."
        : waitingForAutomaticCheck ? "MiniClone is running the required checks automatically." : baseHeader[1],
    tone: targetProvenance && state.status !== WORKFLOW_STATES.BOOT_VERIFICATION
      ? bootVerified ? "success" : "attention"
      : incompleteTerminal ? "error"
      : expiredReady || executionDisabled ? "attention"
      : waitingForAutomaticCheck ? "working" : baseHeader[2],
    badgeLabel: targetProvenance
      ? bootVerified ? "Boot verified" : "Read-only verification"
      : state.capability?.simulated === true
      ? "Demo mode · no disk access"
      : incompleteTerminal || baseHeader[2] === "error"
        ? "Safety check stopped"
        : baseHeader[2] === "success" ? "Safety checks complete" : "Checking safely",
  });
  const selectedTarget = destinations.eligible.find((target) => target.selected) ?? null;
  const execution = createExecutionViewModel({
    workflowState: state,
    activitySnapshot,
    presentationState: executionPresentationState,
  });
  const action = actionModel(state, nowMs, destinationSelected, execution);
  const announcement = execution.announcement.text.length > 0
    ? execution.announcement
    : Object.freeze({
      key: `${state.status ?? WORKFLOW_STATES.STARTING}:${state.confirmationResetSequence ?? 0}`,
      text: header.title,
    });
  return Object.freeze({
    status: state.status ?? WORKFLOW_STATES.STARTING,
    header,
    trustChecks: trustChecks(state, source, destinationSelected, evidenceReady),
    source: source === null ? null : Object.freeze({
      ...source,
      policyNote: state.capability?.simulated === true
        ? "Fictional source protection is simulated; no local disk is inspected."
        : "MiniClone never offers this disk as a destination.",
    }),
    destinations,
    destinationHeading: Object.freeze(destinations.recovered === true
      ? {
        label: "RECOVERED RUN",
        title: "Destination from the recovered run",
        summary: "MiniClone is showing only the identity proved by the recovered run.",
      }
      : {
        label: "AVAILABLE DISKS",
        title: "Select a destination",
        summary: "Choose where the Windows copy should go.",
      }),
    destinationPolicy: destinationPolicy(state),
    action,
    actionCopy: Object.freeze({
      title: selectedTarget?.model ?? header.title,
      detail: actionDescription(action, selectedTarget),
    }),
    execution,
    progress: execution.progress,
    result: execution.result,
    announcement,
    blockingError: execution.result === null ? blockingErrorModel(state) : null,
  });
}
