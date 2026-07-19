const DEMO_FIXTURE_URL = new URL("./demo-fixtures/current-flow.json", import.meta.url);
const DEMO_ACTIVITY_EPOCH_MS = 1_784_352_000_000;
const DEMO_CERTIFICATE_EPOCH_MS = DEMO_ACTIVITY_EPOCH_MS - 60_000;
const DEMO_SHA_SOURCE = "1".repeat(64);
const DEMO_SHA_TARGET = "2".repeat(64);
const DEMO_SHA_CERTIFICATE = "3".repeat(64);
const DEMO_SHA_LAYOUT_CURRENT = "4".repeat(64);
const DEMO_SHA_LAYOUT_PROPOSED = "5".repeat(64);

function demoTimestamp(sequence) {
  return DEMO_ACTIVITY_EPOCH_MS + (sequence * 1_000);
}

function demoActivityEvent(sequence, code, phase, severity, extras = {}) {
  return {
    schema_version: 1,
    source_sequence: sequence,
    emitted_at_unix_ms: demoTimestamp(sequence),
    source: "worker",
    code,
    phase,
    severity,
    detail: extras.detail ?? null,
    metrics: extras.metrics ?? null,
    warning: extras.warning ?? null,
    terminal_truth: extras.terminalTruth ?? null,
    recovered: false,
  };
}

function demoProgressEvent(sequence, phase, metrics) {
  return {
    schema_version: 1,
    source_sequence: sequence,
    emitted_at_unix_ms: demoTimestamp(sequence),
    source: "worker",
    code: phase,
    phase,
    severity: "info",
    detail: null,
    metrics,
    warning: null,
    terminal_truth: null,
    recovered: false,
  };
}

function demoCertificateEvidence(preflight) {
  const source = preflight.source_disk;
  const target = preflight.target_disk;
  const identity = (disk) => ({
    disk_number: disk.number,
    model: disk.model,
    serial: disk.serial,
    stable_device_identity: disk.unique_id,
    capacity_bytes: disk.size_bytes,
    logical_sector_size: disk.logical_sector_size,
    physical_sector_size: disk.physical_sector_size,
  });
  return {
    version: 1,
    status: "computed",
    certificate_version: 1,
    completed_at_unix_ms: DEMO_CERTIFICATE_EPOCH_MS,
    expires_at_unix_ms: DEMO_CERTIFICATE_EPOCH_MS + (15 * 60 * 1_000),
    certificate_sha256: DEMO_SHA_CERTIFICATE,
    current_target_contents_sha256: DEMO_SHA_LAYOUT_CURRENT,
    proposed_layout_sha256: DEMO_SHA_LAYOUT_PROPOSED,
    windows_build_number: 19045,
    windows_revision: 9999,
    windows_os_architecture: "x64",
    windows_process_architecture: "x64",
    windows_compatibility_tier: "tested_supported",
    boot_style: preflight.boot_style,
    source_identity: identity(source),
    target_identity: identity(target),
    target_disposition: preflight.target_disposition,
    required_size_bytes: preflight.required_size_bytes,
    bitlocker_status: "not_recorded_in_certificate",
    transport: {
      observed_bus: target.bus_type,
      local: true,
      fixed: true,
      removable: false,
      hotplug: false,
      virtual_device: false,
      ownership_extent_agreement: true,
      supported: true,
      reasons: [],
      reasons_omitted: 0,
    },
    topology: { kind: "basic", supported: true, reasons: [], reasons_omitted: 0 },
    protected_roles: [],
    protected_roles_omitted: 0,
    native_target_state: {
      backend: "bundled_demo_fixture",
      queried: true,
      offline: !target.is_online,
      read_only: target.is_read_only,
      native_volume_extent_count: preflight.native_target_evidence?.native_volume_extent_count ?? 0,
    },
  };
}

function demoExpertEvidence({ phase, terminal, kind, metrics, copyVerified: priorCopyVerified = false }) {
  const completed = terminal?.final_state === "completed";
  const copyVerified = priorCopyVerified || completed || [
    "boot_prepared",
    "cleaning_up",
    "completed",
  ].includes(phase);
  const copiedBytes = completed
    ? 250_000_000_000
    : Number(metrics?.bytes_completed ?? 0);
  const cleanupComplete = terminal?.cleanup_complete === true;
  const bootPrepared = terminal?.prepared_to_boot === true || phase === "boot_prepared";
  const storageEvents = kind === "event_153_warning"
    ? [{
        event_id: 153,
        provider: "Disk",
        record_id: 153001,
        timestamp_utc: new Date(DEMO_ACTIVITY_EPOCH_MS + 8_000).toISOString(),
        disk_number: 5,
        lba: "0x6c800",
        request_type: "virtual_disk_request",
        final_status: "recovered",
        correlated: true,
      }]
    : [];
  return {
    version: 1,
    source: "live_terminal_summary",
    run_id: "demo-clone-1",
    protocol_version: 1,
    capability: "demo_simulation",
    recovery_provenance: null,
    last_state: phase,
    boot_style: "uefi_gpt",
    bytes_planned: 250_000_000_000,
    bytes_copied: copiedBytes,
    chunk_count: completed ? 59_605 : null,
    exact_byte_coverage: copyVerified,
    chunk_hashes_match: copyVerified,
    chunk_readback_verified: copyVerified,
    total_source_sha256: copyVerified ? DEMO_SHA_SOURCE : null,
    total_target_sha256: copyVerified ? DEMO_SHA_SOURCE : null,
    total_hashes_match: copyVerified,
    readback_verified: copyVerified,
    identity_reconciled: completed,
    physical_writes_performed: false,
    boot_evidence: {
      bcdboot_exit_code: bootPrepared ? 0 : null,
      bcdboot_succeeded: bootPrepared,
      bcd_inspection_succeeded: bootPrepared,
      plausible_loader: bootPrepared,
      identifiers: bootPrepared ? ["{bootmgr}", "{default}"] : [],
      identifiers_omitted: 0,
      default_identifier: bootPrepared ? "{default}" : null,
      windows_loader_identifiers: bootPrepared ? ["{default}"] : [],
      windows_loader_identifiers_omitted: 0,
      boot_file_checks: bootPrepared ? [
        { kind: "windows_boot_manager", present: true, size_bytes: 1_024_000 },
        { kind: "fallback_boot_file", present: true, size_bytes: 1_024_000 },
      ] : [],
      boot_file_checks_omitted: 0,
      windows_boot_manager_present: bootPrepared,
      fallback_boot_file_present: bootPrepared,
      target_boot_evidence_cleared_before_bcdboot: bootPrepared,
      target_bcd_hash_before: null,
      target_bcd_hash_after: bootPrepared ? { exists: true, sha256: DEMO_SHA_TARGET } : null,
      host_bcd_unchanged: true,
    },
    cleanup_evidence: {
      snapshot_deleted: cleanupComplete,
      vss_cleanup_status: cleanupComplete ? "deleted" : "pending",
      temporary_mounts_remaining_count: cleanupComplete ? 0 : 1,
      removed_mounts_count: cleanupComplete ? 2 : 0,
      target_detached: false,
      target_offline: terminal?.target_offline ?? false,
      attachment_proof: null,
      offline_proof: cleanupComplete
        ? { method: "demo_native_state", verified: true, observed_state: "offline" }
        : null,
      final_target_state: terminal?.target_offline === true ? "offline" : "pending",
      final_target_state_proof: cleanupComplete
        ? { method: "demo_native_state", verified: true, observed_state: "offline" }
        : null,
      errors: cleanupComplete ? [] : kind === "cleanup_failure" ? ["cleanup_unproved"] : [],
      errors_omitted: 0,
    },
    provenance_evidence: {
      manifest_sha256: completed ? DEMO_SHA_CERTIFICATE : null,
      certificate_sha256: DEMO_SHA_CERTIFICATE,
      execution_evidence_sha256: completed ? DEMO_SHA_LAYOUT_PROPOSED : null,
      write_verified: completed,
    },
    storage_events: storageEvents,
    storage_events_omitted: 0,
    terminal_truth: terminal ?? null,
  };
}

function bridgeError(kind, message) {
  return { kind, message };
}

function copy(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

export function sourceFingerprintMatches(expected, observed) {
  const fields = [
    "number",
    "model",
    "serial",
    "unique_id",
    "size_bytes",
    "partition_style",
    "logical_sector_size",
    "physical_sector_size",
  ];
  const expectedBoot = (expected?.partitions ?? []).filter((partition) => partition.is_boot === true);
  const observedBoot = (observed?.partitions ?? []).filter((partition) => partition.is_boot === true);
  return fields.every((field) => expected?.[field] === observed?.[field])
    && expectedBoot.length === 1
    && observedBoot.length === 1
    && expectedBoot[0].id === observedBoot[0].id
    && expectedBoot[0].number === observedBoot[0].number
    && expectedBoot[0].offset_bytes === observedBoot[0].offset_bytes
    && expectedBoot[0].size_bytes === observedBoot[0].size_bytes;
}

function validateDemoEnvelope(envelope, command) {
  if (envelope?.mode !== "demo" || envelope?.simulated !== true || envelope?.ui_elevated !== false) {
    throw bridgeError("invalid_demo_fixture", "Demo evidence was not explicitly marked simulated and non-elevated.");
  }
  if (envelope.report?.schema_version !== 1 || envelope.report?.command !== command || envelope.report?.status !== "ok") {
    throw bridgeError("invalid_demo_fixture", `Demo fixture did not contain a successful schema-version-1 ${command} report.`);
  }
  return copy(envelope);
}

async function loadBundledScenario() {
  const response = await fetch(DEMO_FIXTURE_URL, { cache: "no-store" });
  if (!response.ok) {
    throw bridgeError("demo_fixture_unavailable", `Could not load bundled demo fixture (${response.status}).`);
  }
  return response.json();
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class LiveBridge {
  constructor(invoke) {
    this.invoke = invoke;
    this.mode = "live";
    this.simulated = false;
  }

  inspectHost() {
    return this.invoke("inspect_host");
  }

  preflightTarget(diskNumber) {
    return this.invoke("preflight_target", { diskNumber });
  }

  diagnoseSource() {
    return this.invoke("diagnose_source");
  }

  prepareTargetConfirmation() {
    return this.invoke("prepare_target_confirmation");
  }

  confirmTargetErasure({ typedPhrase, acknowledgeDataLoss, acknowledgeTargetIdentity }) {
    return this.invoke("confirm_target_erasure", {
      typedPhrase,
      acknowledgeDataLoss,
      acknowledgeTargetIdentity,
    });
  }

  productCloneCapability() {
    return this.invoke("product_clone_capability");
  }

  startProductClone({ typedPhrase, acknowledgeDataLoss, acknowledgeTargetIdentity }) {
    return this.invoke("start_product_clone", {
      input: {
        typedErasurePhrase: typedPhrase,
        acknowledgeTotalDataLoss: acknowledgeDataLoss,
        acknowledgeTargetIdentity,
      },
    });
  }

  cancelProductClone() {
    return this.invoke("cancel_product_clone");
  }

  productCloneStatus() {
    return this.invoke("product_clone_status");
  }

  verifyProductBoot() {
    return this.invoke("verify_product_boot");
  }
}

export class DemoBridge {
  constructor({ loadScenario = loadBundledScenario, delay = wait } = {}) {
    this.mode = "demo";
    this.simulated = true;
    this.loadScenario = loadScenario;
    this.delay = delay;
    this.scenarioPromise = null;
    this.inspectionReady = false;
    this.inspectionSource = null;
    this.preflightDiskNumber = null;
    this.preflightEnvelope = null;
    this.diagnosticReady = false;
    this.confirmationEnvelope = null;
    this.cloneStatus = null;
    this.cloneTimeline = null;
    this.cloneTimelineIndex = 0;
    this.cloneTimelineKind = null;
    this.cloneCopyVerified = false;
  }

  scenario() {
    this.scenarioPromise ??= this.loadScenario();
    return this.scenarioPromise;
  }

  async inspectHost() {
    this.inspectionReady = false;
    this.inspectionSource = null;
    this.preflightDiskNumber = null;
    this.preflightEnvelope = null;
    this.diagnosticReady = false;
    this.confirmationEnvelope = null;
    this.cloneStatus = null;
    this.cloneTimeline = null;
    this.cloneTimelineIndex = 0;
    this.cloneTimelineKind = null;
    this.cloneCopyVerified = false;
    const scenario = await this.scenario();
    await this.delay(720);
    const envelope = validateDemoEnvelope(scenario.inspection, "inspect");
    this.inspectionSource = copy(envelope.report.source_disk);
    this.inspectionReady = true;
    return envelope;
  }

  async preflightTarget(diskNumber) {
    if (!this.inspectionReady) {
      throw bridgeError("stale_demo_inspection", "Run the simulated discovery before target preflight.");
    }
    if (!Number.isInteger(diskNumber) || diskNumber < 0) {
      throw bridgeError("invalid_demo_target", "Demo target selection must be a valid disk number.");
    }
    this.preflightDiskNumber = null;
    this.preflightEnvelope = null;
    this.diagnosticReady = false;
    this.confirmationEnvelope = null;
    const scenario = await this.scenario();
    const fixture = scenario.preflights?.[String(diskNumber)];
    if (!fixture) {
      throw bridgeError("demo_target_refused", `Disk ${diskNumber} is not a selectable demo target.`);
    }
    await this.delay(640);
    const envelope = validateDemoEnvelope(fixture, "preflight");
    if (envelope.report.clone_preflight?.target_disk?.number !== diskNumber) {
      throw bridgeError("invalid_demo_fixture", "Demo preflight target identity did not match the selection.");
    }
    if (!sourceFingerprintMatches(this.inspectionSource, envelope.report.clone_preflight?.source_disk)) {
      throw bridgeError("source_identity_changed", "Demo source identity changed between discovery and preflight.");
    }
    this.preflightDiskNumber = diskNumber;
    this.preflightEnvelope = copy(envelope);
    return envelope;
  }

  async diagnoseSource() {
    if (this.preflightDiskNumber === null) {
      throw bridgeError("demo_diagnostic_requires_preflight", "Run a simulated target preflight before the source diagnostic.");
    }
    this.diagnosticReady = false;
    this.confirmationEnvelope = null;
    const scenario = await this.scenario();
    await this.delay(1250);
    const envelope = validateDemoEnvelope(scenario.diagnostic, "diagnose-source");
    const preflightSource = this.preflightEnvelope?.report?.clone_preflight?.source_disk;
    const diagnosticSource = envelope.report?.source_diagnostic?.source_disk;
    if (!sourceFingerprintMatches(this.inspectionSource, diagnosticSource) ||
        !sourceFingerprintMatches(preflightSource, diagnosticSource)) {
      throw bridgeError("source_identity_changed", "Demo source identity changed before confirmation.");
    }
    this.diagnosticReady = true;
    return envelope;
  }

  async prepareTargetConfirmation() {
    if (!this.diagnosticReady || !this.preflightEnvelope) {
      throw bridgeError("demo_confirmation_requires_diagnostic", "Run the simulated source diagnostic before reviewing erasure.");
    }
    const priorConfirmation = this.confirmationEnvelope;
    const scenario = await this.scenario();
    const policy = scenario.confirmation_policy;
    if (policy?.phrase_prefix !== "ERASE DISK " || policy?.session_only !== true ||
        policy?.authorizes_execution !== false || policy?.writes_performed !== false) {
      throw bridgeError("invalid_demo_fixture", "Demo confirmation policy was missing or unsafe.");
    }
    const preflight = this.preflightEnvelope.report.clone_preflight;
    const candidate = scenario.inspection.report.target_candidates.find(
      (item) => item.disk.number === preflight.target_disk.number,
    );
    if (!candidate || candidate.disposition !== preflight.target_disposition ||
        candidate.disposition === "refused") {
      throw bridgeError("demo_target_changed", "Demo target identity or disposition changed before confirmation.");
    }
    await this.delay(320);
    const envelope = {
      mode: "demo",
      simulated: true,
      ui_elevated: false,
      source_disk: copy(preflight.source_disk),
      target_disk: copy(preflight.target_disk),
      target_disposition: preflight.target_disposition,
      native_target_evidence: copy(preflight.native_target_evidence),
      current_target_contents: copy(preflight.current_target_contents),
      proposed_layout: copy(preflight.proposed_layout),
      remaining_unallocated_bytes: preflight.remaining_unallocated_bytes,
      warnings: [...(candidate.warnings ?? []), ...(this.preflightEnvelope.report.warnings ?? [])],
      certificate_evidence: demoCertificateEvidence(preflight),
      expected_phrase: `${policy.phrase_prefix}${preflight.target_disk.number}`,
      session_only: true,
      authorizes_execution: false,
      writes_performed: false,
      confirmed: priorConfirmation?.confirmed === true &&
        priorConfirmation.target_disk?.number === preflight.target_disk.number,
    };
    this.confirmationEnvelope = copy(envelope);
    return envelope;
  }

  async confirmTargetErasure({ typedPhrase, acknowledgeDataLoss, acknowledgeTargetIdentity }) {
    this.confirmationEnvelope = null;
    const envelope = await this.prepareTargetConfirmation();
    if (acknowledgeDataLoss !== true || acknowledgeTargetIdentity !== true) {
      throw bridgeError("confirmation_acknowledgements_missing", "Both erasure acknowledgements must be selected.");
    }
    if (String(typedPhrase).trim() !== envelope.expected_phrase) {
      throw bridgeError("confirmation_phrase_mismatch", "The confirmation phrase did not exactly match the fictional target disk.");
    }
    envelope.confirmed = true;
    this.confirmationEnvelope = copy(envelope);
    return envelope;
  }

  async simulateCloneTimeline(kind = "success") {
    if (!this.confirmationEnvelope?.confirmed) {
      throw bridgeError("demo_execution_requires_confirmation", "Record the fictional erasure confirmation first.");
    }
    const scenario = await this.scenario();
    const stages = scenario.execution_timelines?.[kind];
    if (!Array.isArray(stages) || stages.length === 0) {
      throw bridgeError("demo_timeline_missing", `Unknown demo execution timeline: ${kind}.`);
    }
    return {
      mode: "demo",
      simulated: true,
      writes_performed: false,
      kind,
      stages: copy(stages),
    };
  }

  async productCloneCapability() {
    return {
      capability: "demo_simulation",
      execution_enabled: true,
      separately_identified_release_candidate: false,
      simulated: true,
    };
  }

  async startProductClone({ typedPhrase, acknowledgeDataLoss, acknowledgeTargetIdentity }, kind = "success") {
    if (!this.confirmationEnvelope?.confirmed) {
      throw bridgeError("demo_execution_requires_confirmation", "Record the fictional erasure confirmation first.");
    }
    if (acknowledgeDataLoss !== true || acknowledgeTargetIdentity !== true ||
        String(typedPhrase).trim() !== this.confirmationEnvelope.expected_phrase) {
      throw bridgeError("demo_execution_confirmation_mismatch", "The fictional execution confirmation no longer matches.");
    }
    const timeline = await this.simulateCloneTimeline(kind);
    this.cloneTimeline = timeline.stages;
    this.cloneTimelineIndex = 0;
    this.cloneTimelineKind = kind;
    this.cloneCopyVerified = false;
    this.cloneLastEmittedPhase = null;
    const initialSequence = 1;
    this.cloneStatus = {
      status_schema_version: 1,
      protocol_version: 1,
      capability: "demo_simulation",
      active: true,
      run_id: "demo-clone-1",
      sequence: initialSequence,
      phase: "validated",
      progress: null,
      activity: [demoActivityEvent(initialSequence, "accepted", null, "info")],
      structured_warnings: [],
      recovery: null,
      warnings: [],
      terminal: null,
      error_code: null,
      error_message: null,
      expert_evidence: demoExpertEvidence({
        phase: "validated",
        terminal: null,
        kind,
        metrics: null,
        copyVerified: false,
      }),
      simulated: true,
    };
    return copy(this.cloneStatus);
  }

  async productCloneStatus() {
    if (!this.cloneStatus) return null;
    if (!this.cloneStatus.active) return copy(this.cloneStatus);
    const stage = this.cloneTimeline?.[this.cloneTimelineIndex++];
    if (!stage) {
      const finalMetrics = this.cloneStatus.progress?.metrics ?? null;
      const completed = ["success", "event_153_warning", "post_boot_verification"].includes(this.cloneTimelineKind);
      const cancelled = this.cloneTimelineKind === "cancelled";
      const cleanupComplete = this.cloneTimelineKind !== "cleanup_failure";
      const finalState = completed ? "completed" : cancelled ? "cancelled" : "partial_failure";
      const errorCodes = {
        cleanup_failure: "cleanup_unproved",
        stale_evidence: "stale_evidence",
        target_replacement: "target_identity_changed",
        severe_storage_event: "severe_storage_event",
        partial_failure: "copy_verification_failed",
        copy_mismatch: "copy_verification_failed",
      };
      this.cloneStatus.sequence += 1;
      this.cloneStatus.active = false;
      this.cloneStatus.phase = finalState;
      this.cloneStatus.progress = null;
      const terminalTruth = {
        final_state: finalState,
        physical_restore_completed: completed,
        prepared_to_boot: completed,
        boot_tested: false,
        cleanup_complete: cleanupComplete,
        target_offline: cleanupComplete,
      };
      this.cloneStatus.terminal = terminalTruth;
      this.cloneStatus.error_code = completed || cancelled
        ? null
        : errorCodes[this.cloneTimelineKind] ?? "product_execution_failed";
      this.cloneStatus.error_message = completed || cancelled
        ? null
        : "The simulated worker stopped without making a success claim.";
      this.cloneStatus.expert_evidence = demoExpertEvidence({
        phase: finalState,
        terminal: terminalTruth,
        kind: this.cloneTimelineKind,
        metrics: finalMetrics,
        copyVerified: this.cloneCopyVerified,
      });
      this.cloneStatus.activity.push(demoActivityEvent(
        this.cloneStatus.sequence,
        finalState,
        finalState,
        completed ? "success" : cancelled ? "warning" : "error",
        { terminalTruth },
      ));
      return copy(this.cloneStatus);
    }
    const phaseByStage = {
      preflight: "validated", confirmation: "validated", vss: "snapshot_ready",
      layout: "target_prepared", copy: "copying", copy_partial: "copying",
      verification: "copying", boot_prep: "boot_prepared", cleanup: "cleaning_up",
      target_offline: "cleaning_up", prepared_to_boot: "boot_prepared",
      cancel: "cleaning_up", partial_failure: "partial_failure",
      cleanup_failed: "partial_failure", readback_failed: "partial_failure",
      certificate_expired: "partial_failure", refused_before_write: "partial_failure",
      identity_changed: "partial_failure", event_51: "partial_failure",
      hash_mismatch: "partial_failure", manual_boot: "boot_prepared",
      provenance_match: "boot_prepared", boot_tested: "boot_prepared",
    };
    const nextPhase = stage.phase ?? stage.state ?? phaseByStage[stage] ?? this.cloneStatus.phase;
    this.cloneStatus.phase = nextPhase;
    if (this.cloneLastEmittedPhase !== nextPhase) {
      this.cloneStatus.sequence += 1;
      this.cloneStatus.activity.push(demoActivityEvent(
        this.cloneStatus.sequence,
        nextPhase,
        nextPhase,
        ["snapshot_ready", "target_prepared", "boot_prepared"].includes(nextPhase)
          ? "success"
          : nextPhase === "partial_failure" ? "error" : "info",
        { detail: `Deterministic Demo phase: ${nextPhase}` },
      ));
      this.cloneLastEmittedPhase = nextPhase;
    }
    const priorMetrics = this.cloneStatus.progress?.metrics ?? {
      bytes_completed: 0,
      bytes_planned: 250000000000,
      bytes_per_second: 0,
      eta_seconds: null,
    };
    const metrics = {
      bytes_completed: stage.bytes_completed ?? priorMetrics.bytes_completed,
      bytes_planned: stage.bytes_planned ?? priorMetrics.bytes_planned,
      bytes_per_second: stage.bytes_per_second ?? priorMetrics.bytes_per_second,
      eta_seconds: stage.eta_seconds ?? priorMetrics.eta_seconds,
    };
    if (stage === "copy") metrics.bytes_completed = metrics.bytes_planned;
    if (stage === "copy_partial") metrics.bytes_completed = Math.floor(metrics.bytes_planned / 3);
    if (stage === "verification" && metrics.bytes_completed === metrics.bytes_planned) {
      this.cloneCopyVerified = true;
    }
    this.cloneStatus.sequence += 1;
    this.cloneStatus.progress = demoProgressEvent(this.cloneStatus.sequence, nextPhase, metrics);
    if (stage.warning) {
      const warning = {
        code: "execution_warning",
        message: "The simulated worker recorded a non-blocking execution warning.",
      };
      this.cloneStatus.sequence += 1;
      this.cloneStatus.structured_warnings.push(warning);
      this.cloneStatus.activity.push(demoActivityEvent(
        this.cloneStatus.sequence,
        warning.code,
        nextPhase,
        "warning",
        { warning },
      ));
    }
    if (stage === "event_153_recovered") {
      const warning = {
        code: "event_153_recovered",
        message: "One correlated virtual-disk retry recovered and every strict success gate passed.",
      };
      this.cloneStatus.sequence += 1;
      this.cloneStatus.structured_warnings.push(warning);
      this.cloneStatus.activity.push(demoActivityEvent(
        this.cloneStatus.sequence,
        warning.code,
        nextPhase,
        "warning",
        { warning },
      ));
    }
    this.cloneStatus.expert_evidence = demoExpertEvidence({
      phase: nextPhase,
      terminal: null,
      kind: this.cloneTimelineKind,
      metrics,
      copyVerified: this.cloneCopyVerified,
    });
    return copy(this.cloneStatus);
  }

  async cancelProductClone() {
    if (!this.cloneStatus?.active) {
      throw bridgeError("product_clone_not_active", "No fictional clone is active.");
    }
    const finalMetrics = this.cloneStatus.progress?.metrics ?? null;
    this.cloneStatus.sequence += 1;
    this.cloneStatus.active = false;
    this.cloneStatus.phase = "cancelled";
    this.cloneStatus.progress = null;
    const terminalTruth = {
      final_state: "cancelled",
      physical_restore_completed: false,
      prepared_to_boot: false,
      boot_tested: false,
      cleanup_complete: true,
      target_offline: true,
    };
    this.cloneStatus.terminal = terminalTruth;
    this.cloneStatus.expert_evidence = demoExpertEvidence({
      phase: "cancelled",
      terminal: terminalTruth,
      kind: "cancelled",
      metrics: finalMetrics,
      copyVerified: this.cloneCopyVerified,
    });
    this.cloneStatus.activity.push(demoActivityEvent(
      this.cloneStatus.sequence,
      "cancelled",
      "cancelled",
      "warning",
      { terminalTruth },
    ));
    return copy(this.cloneStatus);
  }

  async verifyProductBoot() {
    return {
      version: 1,
      run_id: "demo-clone-1",
      verified: true,
      boot_tested: true,
      boot_style: "uefi_gpt",
      simulated: true,
      errors: [],
    };
  }
}

export async function createAppBridge(invoke) {
  if (typeof invoke !== "function") {
    throw bridgeError("tauri_unavailable", "The MiniClone desktop bridge is unavailable.");
  }
  const runtime = await invoke("runtime_mode");
  if (runtime?.mode === "live" && runtime?.simulated === false) {
    return new LiveBridge(invoke);
  }
  if (runtime?.mode === "demo" && runtime?.simulated === true) {
    return new DemoBridge();
  }
  throw bridgeError("invalid_runtime_mode", "MiniClone returned an unsupported runtime mode.");
}
