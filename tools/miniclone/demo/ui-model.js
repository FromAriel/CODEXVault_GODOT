const refusalMessages = Object.freeze({
  source_disk: "Running Windows source",
  system_disk: "Contains system files",
  boot_disk: "Currently booted disk",
  pagefile_disk: "Contains an active pagefile",
  crashdump_disk: "Contains crash-dump storage",
  offline_disk: "Disk is offline",
  read_only_disk: "Disk is read-only",
  failing_health: "Disk health is not healthy",
  target_too_small: "Smaller than source requirements",
  partitioned_disk: "Already partitioned",
  non_empty_disk: "Contains existing data",
  active_bit_locker: "BitLocker protection is active",
  unknown_bit_locker: "BitLocker state is unknown",
  elevation_required: "Administrator session is required",
  unsupported_target_bus: "Unsupported external or removable bus",
  unsupported_target_type: "Unsupported disk type",
  unsupported_windows_host: "Windows version or architecture is not supported for this stage",
  native_extent_mismatch: "Native volume extents do not agree with Windows discovery",
});

const diagnosticSampleContract = Object.freeze([
  Object.freeze({ path: "Windows\\System32\\config\\SYSTEM", attempted: 4096, required: true, mode: "first_bytes" }),
  Object.freeze({ path: "Windows\\win.ini", attempted: 64 * 1024, required: false, mode: "bounded_prefix" }),
  Object.freeze({ path: "Windows\\System32\\drivers\\etc\\hosts", attempted: 1024 * 1024, required: false, mode: "bounded_prefix" }),
]);
const diagnosticRangeContract = Object.freeze([
  Object.freeze({ offset: 0, length: 4096 }),
  Object.freeze({ offset: 4096, length: 4096 }),
  Object.freeze({ offset: 1048576, length: 4096 }),
]);

function isLowercaseSha256(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

export function formatBytes(value) {
  if (!Number.isFinite(value) || value < 0) return "Unknown";
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let amount = value;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  const precision = unit >= 3 ? 1 : 0;
  return `${amount.toFixed(precision)} ${units[unit]}`;
}

export function bootStyleFromReport(report) {
  const confidence = String(report?.source_confidence ?? "").toLowerCase();
  if (confidence.includes("uefi_gpt")) return "UEFI / GPT";
  if (confidence.includes("bios_mbr")) return "BIOS / MBR";
  const style = String(report?.source_disk?.partition_style ?? "unknown").toUpperCase();
  return style === "GPT" ? "GPT" : style === "MBR" ? "MBR" : "Unknown";
}

export function windowsMount(source) {
  const bootPartitions = (source?.partitions ?? []).filter((partition) => partition.is_boot === true);
  if (bootPartitions.length !== 1) return "Not reported";
  const driveRoots = [...new Set((bootPartitions[0].access_paths ?? [])
    .map((path) => /^([a-z]):[\\/]?$/i.exec(String(path).trim()))
    .filter(Boolean)
    .map((match) => `${match[1].toUpperCase()}:\\`))];
  return driveRoots.length === 1 ? driveRoots[0] : "Not reported";
}

export function sourceView(report) {
  const source = report?.source_disk;
  if (!source) throw new Error("Inspection report did not include a source disk");
  return {
    diskNumber: source.number,
    model: source.model,
    identity: `Serial ${source.serial ?? "not reported"} · ${String(source.partition_style).toUpperCase()}`,
    capacity: formatBytes(source.size_bytes),
    bootStyle: bootStyleFromReport(report),
    windowsMount: windowsMount(source),
  };
}

export function compatibilityView(report) {
  const host = report?.windows_host;
  const storage = report?.native_storage_evidence;
  const version = host?.build_number == null
    ? "Not proved"
    : `${host.major_version ?? 10}.${host.minor_version ?? 0}.${host.build_number}.${host.revision ?? 0}`;
  const tierLabels = {
    tested_supported: "Tested supported",
    supported_unverified: "Supported, unverified",
    unsupported_or_unproved: "Unsupported or unproved",
  };
  const volumeFailures = (storage?.volumes ?? []).filter((volume) => {
    const extentCount = (volume.extents ?? []).length;
    if (volume.query_status === "queried") return extentCount === 0;
    if (volume.query_status === "not_disk_backed") return extentCount !== 0;
    return true;
  });
  const capabilityFailures = [
    ...(host?.capabilities ?? []),
    ...(storage?.capabilities ?? []),
  ].filter((capability) => capability.status !== "available");
  const extentsComplete = Boolean(storage?.enumeration_complete) &&
    !storage?.enumeration_error && volumeFailures.length === 0;
  return {
    version,
    displayVersion: host?.display_version ?? "Unknown release",
    architecture: `${host?.os_architecture ?? "unknown"} OS / ${host?.process_architecture ?? "unknown"} process`,
    tier: host?.compatibility_tier ?? "unsupported_or_unproved",
    tierLabel: tierLabels[host?.compatibility_tier] ?? tierLabels.unsupported_or_unproved,
    evidenceConsistent: host?.evidence_consistent === true,
    destructiveEligible: host?.destructive_eligible === true,
    extentsComplete,
    nativeVolumeCount: storage?.volumes?.length ?? 0,
    failures: [
      ...capabilityFailures.map((capability) => capability.detail ?? capability.name),
      ...volumeFailures.map((volume) => `${volume.volume_guid}: ${volume.query_status}`),
      ...(storage?.enumeration_error ? [storage.enumeration_error] : []),
    ],
  };
}

export function refusalMessage(reason) {
  return refusalMessages[reason] ?? String(reason).replaceAll("_", " ");
}

export function targetViews(report) {
  const sourceNumber = report?.source_disk?.number;
  return [...(report?.target_candidates ?? [])]
    .map((candidate) => {
      const reasons = [...(candidate.refusal_reasons ?? [])];
      const disposition = candidate.disposition ?? (candidate.eligible ? "ready_blank" : "refused");
      const protectedSource = candidate.disk.number === sourceNumber ||
        reasons.some((reason) => ["source_disk", "system_disk", "boot_disk"].includes(reason));
      const selectable = disposition !== "refused" && !protectedSource && reasons.length === 0;
      return {
        diskNumber: candidate.disk.number,
        model: candidate.disk.model,
        capacity: formatBytes(candidate.disk.size_bytes),
        partitionStyle: String(candidate.disk.partition_style).toUpperCase(),
        health: String(candidate.disk.health).replaceAll("_", " "),
        serialLabel: `Serial ${candidate.disk.serial ?? "not reported"}`,
        disposition,
        selectable,
        reasons: reasons.map(refusalMessage),
        warnings: [...(candidate.warnings ?? [])],
      };
    })
    .sort((left, right) => Number(right.selectable) - Number(left.selectable) || left.diskNumber - right.diskNumber);
}

export function envelopeMode(envelope) {
  const mode = envelope?.mode ?? "live";
  if (mode === "live") {
    if (envelope?.simulated === true || envelope?.ui_elevated !== true) {
      throw new Error("Live UI evidence was simulated or not elevated");
    }
    return { mode, simulated: false };
  }
  if (mode === "demo") {
    if (envelope?.simulated !== true || envelope?.ui_elevated !== false) {
      throw new Error("Demo UI evidence was not explicitly simulated and non-elevated");
    }
    return { mode, simulated: true };
  }
  throw new Error(`Unsupported UI runtime mode: ${mode}`);
}

export function buildInspectionView(envelope) {
  const runtime = envelopeMode(envelope);
  if (envelope.report?.schema_version !== 1 || envelope.report?.status !== "ok") {
    throw new Error("Inspection envelope was not a successful schema-version-1 report");
  }
  const source = sourceView(envelope.report);
  const targets = targetViews(envelope.report);
  const compatibility = compatibilityView(envelope.report);
  return {
    ...runtime,
    source,
    compatibility,
    targets,
    eligibleCount: targets.filter((target) => target.selectable).length,
    worker: {
      executable: envelope.worker.executable,
      version: envelope.worker.version,
      durationMs: envelope.worker.duration_ms,
    },
    log: {
      event: "inspection_complete",
      mode: runtime.mode,
      simulated: runtime.simulated,
      schema_version: envelope.report.schema_version,
      command: envelope.report.command,
      source_disk: source.diskNumber,
      source_confidence: envelope.report.source_confidence,
      target_count: targets.length,
      eligible_target_count: targets.filter((target) => target.selectable).length,
      refusals: envelope.report.refusals ?? [],
      warnings: envelope.report.warnings ?? [],
      windows_host: envelope.report.windows_host ?? null,
      native_storage: {
        backend: envelope.report.native_storage_evidence?.backend ?? null,
        enumeration_complete: compatibility.extentsComplete,
        volume_count: compatibility.nativeVolumeCount,
        failures: compatibility.failures,
      },
      physical_writes_enabled: false,
    },
  };
}

export function buildPreflightView(envelope) {
  const runtime = envelopeMode(envelope);
  const report = envelope.report;
  const preflight = report?.clone_preflight;
  if (report?.schema_version !== 1 || report?.command !== "preflight" || report?.status !== "ok" || !preflight) {
    throw new Error("Preflight envelope was not a successful schema-version-1 report");
  }
  if (!preflight.ready || !preflight.dry_run || preflight.writes_performed ||
      preflight.source_writes_performed || preflight.physical_disk_destructive ||
      preflight.vss_snapshot_created) {
    throw new Error("Preflight report violated the Slice 37 read-only contract");
  }
  return {
    ...runtime,
    target: {
      diskNumber: preflight.target_disk.number,
      model: preflight.target_disk.model,
      capacity: formatBytes(preflight.target_disk.size_bytes),
      disposition: preflight.target_disposition,
    },
    bootStyle: preflight.boot_style === "uefi_gpt" ? "UEFI / GPT" : "BIOS / MBR",
    requiredCapacity: formatBytes(preflight.required_size_bytes),
    remainingCapacity: formatBytes(preflight.remaining_unallocated_bytes),
    currentContents: (preflight.current_target_contents ?? []).map((partition) => ({
      number: partition.partition_number,
      filesystem: partition.filesystem ?? "Unformatted",
      capacity: formatBytes(partition.size_bytes),
      label: partition.volume_label ?? "No label",
    })),
    proposedLayout: (preflight.proposed_layout ?? []).map((partition) => ({
      number: partition.partition_number,
      role: String(partition.role).replaceAll("_", " "),
      filesystem: partition.filesystem,
      capacity: formatBytes(partition.size_bytes),
    })),
    gates: preflight.safety_gates ?? [],
    nativeEvidence: preflight.native_target_evidence,
    requiresEraseConfirmation: preflight.requires_erase_confirmation,
    warnings: report.warnings ?? [],
    noWritesPerformed: true,
  };
}

export function buildTargetConfirmationView(envelope) {
  const runtime = envelopeMode(envelope);
  const target = envelope?.target_disk;
  const source = envelope?.source_disk;
  const native = envelope?.native_target_evidence;
  const disposition = envelope?.target_disposition;
  if (!target || !source || !["ready_blank", "requires_erase"].includes(disposition)) {
    throw new Error("Target confirmation disclosure did not contain a selectable exact target");
  }
  if (source.number === target.number || !native?.queried ||
      (!runtime.simulated && String(native.backend).toLowerCase() === "mock")) {
    throw new Error("Target confirmation disclosure did not contain trusted source/target evidence");
  }
  if (envelope.session_only !== true || envelope.authorizes_execution !== false ||
      envelope.writes_performed !== false || typeof envelope.confirmed !== "boolean") {
    throw new Error("Target confirmation disclosure violated the session-only contract");
  }
  const expectedPhrase = `ERASE DISK ${target.number}`;
  if (envelope.expected_phrase !== expectedPhrase) {
    throw new Error("Target confirmation phrase did not match the disclosed disk");
  }
  const currentContents = envelope.current_target_contents ?? [];
  if (currentContents.some((partition) => partition.would_be_erased !== true)) {
    throw new Error("Target confirmation did not disclose every target partition as erased");
  }
  const proposedLayout = envelope.proposed_layout ?? [];
  if (proposedLayout.length === 0) {
    throw new Error("Target confirmation did not include a replacement layout");
  }
  return {
    ...runtime,
    source: {
      diskNumber: source.number,
      model: source.model,
      serial: source.serial ?? "Not reported",
      uniqueId: source.unique_id ?? "Not reported",
    },
    target: {
      diskNumber: target.number,
      model: target.model,
      serial: target.serial ?? "Not reported",
      uniqueId: target.unique_id ?? "Not reported",
      capacity: formatBytes(target.size_bytes),
      partitionStyle: String(target.partition_style ?? "unknown").toUpperCase(),
      onlineState: target.is_online ? "Online" : "Offline",
      readOnlyState: native.read_only ? "Read-only" : "Writable",
      disposition,
    },
    nativeEvidence: native,
    currentContents: currentContents.map((partition) => ({
      number: partition.partition_number,
      label: partition.volume_label ?? "No label",
      filesystem: partition.filesystem ?? "Unformatted / unknown",
      partitionType: partition.partition_type ?? "Unknown type",
      capacity: formatBytes(partition.size_bytes),
      accessPaths: partition.access_paths ?? [],
    })),
    proposedLayout: proposedLayout.map((partition) => ({
      number: partition.partition_number,
      role: String(partition.role).replaceAll("_", " "),
      filesystem: partition.filesystem,
      capacity: formatBytes(partition.size_bytes),
    })),
    remainingCapacity: formatBytes(envelope.remaining_unallocated_bytes),
    warnings: [...(envelope.warnings ?? [])],
    expectedPhrase,
    confirmed: envelope.confirmed,
    sessionOnly: true,
    authorizesExecution: false,
    noWritesPerformed: true,
  };
}

export function buildSourceDiagnosticView(envelope) {
  const runtime = envelopeMode(envelope);
  const report = envelope.report;
  const diagnostic = report?.source_diagnostic;
  if (report?.schema_version !== 1 || report?.command !== "diagnose-source" ||
      report?.status !== "ok" || !diagnostic) {
    throw new Error("Source diagnostic envelope was not a successful schema-version-1 report");
  }
  const lifecycle = diagnostic.vss_lifecycle;
  const cleanupProved = lifecycle?.cleanup_proved_absent === true &&
    ["deleted", "already_absent"].includes(lifecycle?.cleanup_status);
  const providerValid = runtime.simulated
    ? diagnostic.provider === "demo_simulated_native_vss"
    : diagnostic.provider === "native_vss_backup_components";
  if (!diagnostic.snapshot_lifecycle_performed || !cleanupProved ||
      diagnostic.cleanup_status !== lifecycle.cleanup_status ||
      !providerValid ||
      diagnostic.target_writes_performed || diagnostic.source_writes_performed ||
      diagnostic.physical_disk_destructive || diagnostic.destructive) {
    throw new Error("Source diagnostic report violated the Slice 38 read-only lifecycle contract");
  }
  const samples = diagnostic.sample_reads ?? [];
  const samplesValid = samples.length === diagnosticSampleContract.length &&
    diagnosticSampleContract.every((spec, index) => {
      const sample = samples[index];
      const identityValid = sample?.relative_path === spec.path &&
        sample.required === spec.required &&
        sample.bytes_attempted === spec.attempted &&
        sample.read_mode === spec.mode;
      const evidenceValid = spec.required
        ? sample.exists === true && sample.bytes_read === spec.attempted && isLowercaseSha256(sample.sha256)
        : sample.exists === true
          ? sample.bytes_read > 0 && sample.bytes_read <= spec.attempted && isLowercaseSha256(sample.sha256)
          : sample.exists === false && sample.bytes_read === 0 && sample.sha256 == null;
      return identityValid && evidenceValid;
    });
  if (!samplesValid) {
    throw new Error("Source diagnostic required file evidence was incomplete");
  }
  const ranges = diagnostic.ranges ?? [];
  const rangesValid = ranges.length === diagnosticRangeContract.length &&
    diagnosticRangeContract.every((spec, index) => {
      const range = ranges[index];
      return range?.offset_bytes === spec.offset &&
        range.bytes_attempted === spec.length &&
        range.bytes_read === spec.length &&
        range.read_mode === "snapshot_volume_range" &&
        isLowercaseSha256(range.sha256);
    });
  if (!rangesValid) {
    throw new Error("Source diagnostic range evidence was incomplete");
  }
  return {
    ...runtime,
    source: {
      diskNumber: diagnostic.source_disk.number,
      model: diagnostic.source_disk.model,
      bootStyle: diagnostic.boot_style === "uefi_gpt" ? "UEFI / GPT" : "BIOS / MBR",
      windowsVolume: diagnostic.windows_volume,
    },
    provider: diagnostic.provider,
    snapshotId: diagnostic.snapshot_id,
    samples: samples.map((sample) => ({
      path: sample.relative_path,
      required: sample.required,
      exists: sample.exists,
      bytes: formatBytes(sample.bytes_read),
      verified: Boolean(sample.sha256),
    })),
    ranges: ranges.map((range) => ({
      offset: formatBytes(range.offset_bytes),
      bytes: formatBytes(range.bytes_read),
      verified: Boolean(range.sha256),
    })),
    cleanupStatus: diagnostic.cleanup_status,
    lifecycle: {
      stage: lifecycle.lifecycle_stage,
      deletionHresult: lifecycle.deletion_hresult ?? "not reported",
      deletedCount: lifecycle.deleted_snapshot_count ?? null,
      nondeletedSnapshotId: lifecycle.nondeleted_snapshot_id ?? null,
      releaseStatus: lifecycle.backup_components_release_status,
      provedAbsent: lifecycle.cleanup_proved_absent,
    },
    durationMs: diagnostic.duration_ms,
    gates: diagnostic.safety_gates ?? [],
    noTargetWrites: true,
  };
}

export function normalizeUiError(error) {
  const kind = typeof error?.kind === "string" ? error.kind : "unknown_error";
  const message = typeof error?.message === "string" ? error.message : String(error ?? "Unknown inspection error");
  const titles = {
    not_elevated: "Administrator access is required",
    worker_missing: "Engine worker is missing",
    worker_timeout: "Engine inspection timed out",
    source_diagnostic_timeout: "Source snapshot cleanup is unproved",
    source_diagnostic_requires_preflight: "Target preflight is required",
    source_identity_changed: "Source identity changed",
    confirmation_requires_diagnostic: "Source diagnostic is required",
    demo_confirmation_requires_diagnostic: "Source diagnostic is required",
    confirmation_phrase_mismatch: "Confirmation phrase did not match",
    confirmation_acknowledgements_missing: "Both acknowledgements are required",
    confirmation_host_not_eligible: "This Windows host cannot advance",
    confirmation_target_changed: "Target evidence changed",
    unsupported_schema: "UI and engine versions do not match",
    inspection_busy: "Inspection is already running",
    tauri_unavailable: "Desktop bridge is unavailable",
  };
  const reportLifecycle = error?.report?.source_diagnostic?.vss_lifecycle;
  const lifecycle = error?.vss_lifecycle ?? reportLifecycle ?? null;
  return {
    kind,
    message,
    title: titles[kind] ?? "Inspection could not finish",
    exitCode: error?.exit_code ?? null,
    report: error?.report ?? null,
    lifecycle,
  };
}
