import { formatActivityMetrics } from "./activity-catalog.js";
import { formatBytes } from "./ui-model.js";
import { EXPERT_TAB_IDS } from "./expert-presentation.js";

const STATUS_VALUES = new Set([
  "current",
  "complete",
  "warning",
  "pending",
  "unavailable",
  "recovered",
]);
const FIELD_LIMIT = 256;
const DETAIL_LIMIT = 512;
const LIST_LIMIT = 64;
const ACTIVITY_LIMIT = 50;
const STORAGE_EVENT_LIMIT = 200;

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

function list(value, limit = LIST_LIMIT) {
  return Array.isArray(value) ? value.slice(0, limit) : [];
}

function first(...values) {
  return values.find((value) => value !== null && value !== undefined);
}

function valueAt(source, ...names) {
  const object = record(source);
  if (object === null) return null;
  for (const name of names) {
    if (object[name] !== null && object[name] !== undefined) return object[name];
  }
  return null;
}

function containsForbiddenText(value) {
  const text = String(value);
  return /\bERASE\s+DISK\s+\d+\b/i.test(text)
    || /[A-Za-z]:[\\/]/.test(text)
    || /\\\\(?:\?\\|\.\\|[^\\/\s]+[\\/])/.test(text)
    || /\/\/[^/\s]+\/[^/\s]+/.test(text)
    || /(?:^|[\s=:([{'"])[\\/](?:Device|GLOBALROOT|Volume|DosDevices)[\\/]/i.test(text)
    || /\b(?:journal|summary|manifest|provenance|report)_path\b/i.test(text)
    || /\b(?:bcdboot|powershell|cmd\.exe)\b/i.test(text);
}

function safeText(value, limit = FIELD_LIMIT) {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  if (typeof value !== "string") return null;
  const normalized = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length === 0) return null;
  if (containsForbiddenText(normalized)) return "Redacted";
  return normalized.slice(0, limit);
}

function safeCode(value) {
  const text = safeText(value, 96);
  return text !== null && /^[a-zA-Z0-9_.:-]+$/.test(text) ? text : null;
}

function safeArrayText(value, limit = LIST_LIMIT) {
  const values = list(value, limit)
    .map((item) => safeText(item))
    .filter((item) => item !== null);
  return values.length === 0 ? null : values.join(", ");
}

function bitLockerEvidence(value) {
  return value === "not_recorded_in_certificate"
    ? "Not recorded in certificate"
    : value;
}

function metricSummary(metrics) {
  const formatted = formatActivityMetrics(metrics);
  const parts = [];
  if (formatted.transferred !== null) parts.push(formatted.transferred);
  if (formatted.percent !== null) parts.push(`${formatted.percent}%`);
  if (formatted.rate !== null) parts.push(formatted.rate);
  if (formatted.eta !== null) parts.push(`ETA ${formatted.eta}`);
  return parts.length === 0 ? null : parts.join(", ");
}

function row(label, value, { bytes = false, detail = false } = {}) {
  let projected = value;
  if (bytes && Number.isFinite(Number(value)) && Number(value) >= 0) {
    projected = formatBytes(Number(value));
  }
  const text = safeText(projected, detail ? DETAIL_LIMIT : FIELD_LIMIT);
  return text === null ? null : Object.freeze({ label, value: text });
}

function rows(...candidates) {
  return Object.freeze(candidates.flat().filter((candidate) => candidate !== null));
}

function table(id, label, columns, sourceRows) {
  return Object.freeze({
    id,
    label,
    title: label,
    columns: Object.freeze([...columns]),
    rows: Object.freeze(sourceRows),
  });
}

function section(id, title, status, sectionRows = [], tables = []) {
  return Object.freeze({
    id,
    title,
    status: STATUS_VALUES.has(status) ? status : "unavailable",
    rows: Object.freeze([...sectionRows]),
    tables: Object.freeze([...tables]),
  });
}

function tab(id, label, sections) {
  return Object.freeze({ id, label, sections: Object.freeze(sections) });
}

function taggedEvidence(state, name, diskScoped = true) {
  const entry = record(state?.[name]);
  if (entry === null || entry.generation !== state?.generation) return null;
  const expectedDisk = diskScoped ? state?.selectedDiskNumber : null;
  return entry.diskNumber === expectedDisk ? record(entry.value) : null;
}

function envelopeOf(value) {
  return record(value?.envelope) ?? record(value);
}

function diskRows(prefix, disk) {
  const source = record(disk) ?? {};
  return rows(
    row(`${prefix} disk`, first(source.number, source.disk_number)),
    row(`${prefix} model`, source.model),
    row(`${prefix} serial`, source.serial),
    row(`${prefix} unique ID`, first(
      source.unique_id,
      source.uniqueId,
      source.stable_device_identity,
      source.identity_fingerprint,
    )),
    row(`${prefix} capacity`, first(source.size_bytes, source.capacity_bytes), { bytes: true }),
    row(`${prefix} partition style`, first(source.partition_style, source.partitionStyle)),
    row(`${prefix} connection`, first(source.bus_type, source.transport, source.connection_family)),
    row(`${prefix} health`, source.health),
    row(`${prefix} logical sector`, source.logical_sector_size, { bytes: true }),
    row(`${prefix} physical sector`, source.physical_sector_size, { bytes: true }),
  );
}

function tableCell(value, { bytes = false } = {}) {
  if (bytes && Number.isFinite(Number(value)) && Number(value) >= 0) {
    return safeText(formatBytes(Number(value)));
  }
  return safeText(value);
}

function layoutTable(id, label, partitions) {
  const projected = list(partitions).map((partition, index) => {
    const item = record(partition) ?? {};
    return Object.freeze({
      cells: Object.freeze([
        tableCell(first(item.partition_number, item.number, index + 1)),
        tableCell(first(item.role, item.partition_type, "Unknown")),
        tableCell(first(item.filesystem, "Unformatted")),
        tableCell(item.size_bytes, { bytes: true }),
      ]),
    });
  });
  return table(id, label, ["Partition", "Role", "Filesystem", "Capacity"], projected);
}

function hostSourceSection(state) {
  const inspection = taggedEvidence(state, "inspection", false);
  const envelope = envelopeOf(inspection);
  const report = record(envelope?.report) ?? {};
  const host = record(report.windows_host) ?? record(inspection?.windowsHost) ?? {};
  const source = record(report.source_disk) ?? record(inspection?.source) ?? {};
  return section(
    "host_source",
    "Host and protected source",
    inspection === null ? "unavailable" : "current",
    rows(
      row("Windows", first(host.product_name, host.display_version, host.edition_id)),
      row("Windows build", host.build_number),
      row("Windows revision", host.revision),
      row("Architecture", first(host.os_architecture, host.architecture)),
      row("Compatibility tier", host.compatibility_tier),
      row("Evidence consistent", host.evidence_consistent),
      ...diskRows("Source", source),
    ),
  );
}

function certificateOf(disclosure) {
  const envelope = envelopeOf(disclosure);
  return record(envelope?.certificate_evidence)
    ?? record(envelope?.certificateEvidence)
    ?? record(disclosure?.certificate_evidence)
    ?? record(disclosure?.certificateEvidence);
}

function preflightRaw(preflight) {
  return record(envelopeOf(preflight)?.report?.clone_preflight)
    ?? record(preflight?.clone_preflight)
    ?? {};
}

function destinationSection(state, preflight, disclosure, certificate) {
  const raw = preflightRaw(preflight);
  const envelope = envelopeOf(disclosure);
  const target = record(envelope?.target_disk)
    ?? record(raw.target_disk)
    ?? record(valueAt(certificate, "target_identity", "target_identity_fingerprint"))
    ?? {};
  const native = record(envelope?.native_target_evidence)
    ?? record(raw.native_target_evidence)
    ?? record(valueAt(certificate, "native_target_state", "native_state", "native_state_summary"))
    ?? {};
  const transport = record(valueAt(certificate, "transport", "transport_evidence")) ?? {};
  const topology = record(valueAt(certificate, "topology", "topology_evidence")) ?? {};
  let status = "unavailable";
  if (preflight !== null || disclosure !== null) status = "current";
  else if (Number.isInteger(state?.selectedDiskNumber)) status = "pending";
  return section(
    "destination",
    "Selected destination",
    status,
    rows(
      ...diskRows("Target", target),
      row("Disposition", first(raw.target_disposition, envelope?.target_disposition, certificate?.target_disposition)),
      row("Transport supported", first(transport.supported, native.transport_supported)),
      row("Transport", first(transport.observed_bus, transport.connection_family, target.bus_type)),
      row("Local", transport.local),
      row("Fixed", transport.fixed),
      row("Removable", transport.removable),
      row("Hotplug", transport.hotplug),
      row("Virtual", transport.virtual_device),
      row("Ownership and extents agree", transport.ownership_extent_agreement),
      row("Transport refusal reasons", safeArrayText(transport.reasons)),
      row("Topology", first(topology.kind, topology.topology, certificate?.topology)),
      row("Topology supported", topology.supported),
      row("Topology refusal reasons", safeArrayText(topology.reasons)),
      row("Native backend", native.backend),
      row("Native identity queried", native.queried),
      row("Offline", first(native.offline, target.is_online === undefined ? null : !target.is_online)),
      row("Read only", first(target.is_read_only, native.read_only)),
      row("BitLocker", bitLockerEvidence(first(
        native.bitlocker_status,
        certificate?.bitlocker_status,
      ))),
      row("Extent count", first(native.native_volume_extent_count, native.extent_count)),
      row("Protected roles", safeArrayText(first(certificate?.protected_roles, native.protected_roles))),
    ),
  );
}

function layoutSection(state, preflight, disclosure) {
  const raw = preflightRaw(preflight);
  const envelope = envelopeOf(disclosure);
  const current = first(raw.current_target_contents, envelope?.current_target_contents, []);
  const proposed = first(raw.proposed_layout, envelope?.proposed_layout, []);
  const hasCurrentEvidence = preflight !== null || disclosure !== null;
  return section(
    "layout",
    "Current and proposed layout",
    hasCurrentEvidence ? "complete" : Number.isInteger(state?.selectedDiskNumber) ? "pending" : "unavailable",
    rows(
      row("Boot style", raw.boot_style),
      row("Required capacity", raw.required_size_bytes, { bytes: true }),
      row("Remaining unallocated", first(raw.remaining_unallocated_bytes, envelope?.remaining_unallocated_bytes), { bytes: true }),
      row("Erasure confirmation required", raw.requires_erase_confirmation),
    ),
    [
      layoutTable("current_layout", "Current target contents", current),
      layoutTable("proposed_layout", "Proposed clone layout", proposed),
    ],
  );
}

function fixedProbeLabel(relativePath, index) {
  const text = String(relativePath ?? "").toLowerCase();
  if (text.endsWith("system")) return "Required SYSTEM hive";
  if (text.endsWith("win.ini")) return "Optional Windows marker";
  if (text.endsWith("hosts")) return "Optional hosts file";
  return `Bounded file probe ${index + 1}`;
}

function snapshotSection(state, diagnostic) {
  const envelope = envelopeOf(diagnostic);
  const raw = record(envelope?.report?.source_diagnostic) ?? record(diagnostic?.source_diagnostic) ?? {};
  const lifecycle = record(raw.vss_lifecycle) ?? {};
  const sampleRows = list(raw.sample_reads).map((sample, index) => {
    const item = record(sample) ?? {};
    return Object.freeze({ cells: Object.freeze([
      fixedProbeLabel(item.relative_path, index),
      tableCell(item.read_mode),
      tableCell(item.bytes_read, { bytes: true }),
      tableCell(item.sha256),
    ]) });
  });
  const rangeRows = list(raw.ranges).map((range, index) => {
    const item = record(range) ?? {};
    return Object.freeze({ cells: Object.freeze([
      tableCell(index + 1),
      tableCell(item.offset_bytes),
      tableCell(item.bytes_read, { bytes: true }),
      tableCell(item.sha256),
    ]) });
  });
  const cleaned = ["deleted", "already_absent"].includes(raw.cleanup_status)
    && lifecycle.cleanup_proved_absent === true;
  const status = diagnostic === null
    ? Number.isInteger(state?.selectedDiskNumber) ? "pending" : "unavailable"
    : cleaned ? "complete" : "warning";
  return section(
    "snapshot",
    "Snapshot and bounded source reads",
    status,
    rows(
      row("Provider", raw.provider),
      row("Snapshot ID", raw.snapshot_id),
      row("Lifecycle stage", lifecycle.lifecycle_stage),
      row("Operation HRESULT", lifecycle.operation_hresult),
      row("Deletion attempted", lifecycle.deletion_attempted),
      row("Deletion HRESULT", lifecycle.deletion_hresult),
      row("Deleted snapshot count", lifecycle.deleted_snapshot_count),
      row("Components released", lifecycle.backup_components_release_status),
      row("Cleanup", raw.cleanup_status),
      row("Snapshot absence proved", lifecycle.cleanup_proved_absent),
    ),
    [
      table("snapshot_samples", "Bounded file reads", ["Probe", "Method", "Bytes", "SHA-256"], sampleRows),
      table("snapshot_ranges", "Bounded volume reads", ["Range", "Offset", "Bytes", "SHA-256"], rangeRows),
    ],
  );
}

function certificateSection(state, disclosure, certificate, nowMs) {
  const completeAt = Number(first(
    certificate?.preflight_completed_at_unix_ms,
    certificate?.completed_at_unix_ms,
    certificate?.completedAtUnixMs,
  ));
  const expiresAt = Number(first(
    certificate?.expires_at_unix_ms,
    certificate?.expiresAtUnixMs,
    state?.evidenceExpiresAtMs,
  ));
  const authoritativeExpiresAt = Number.isFinite(Number(state?.evidenceExpiresAtMs))
    ? Number(state.evidenceExpiresAtMs)
    : expiresAt;
  const current = disclosure !== null
    && certificate !== null
    && Number.isFinite(authoritativeExpiresAt)
    && Number.isFinite(nowMs)
    && nowMs < authoritativeExpiresAt;
  const status = certificate === null
    ? disclosure === null && Number.isInteger(state?.selectedDiskNumber) ? "pending" : "unavailable"
    : current ? "current" : "warning";
  return section(
    "certificate",
    "Preflight certificate",
    status,
    rows(
      row("Evidence status", certificate === null ? null : first(certificate.status, "computed")),
      row("Certificate version", first(certificate?.certificate_version, certificate?.version)),
      row("Completed (Unix ms)", Number.isFinite(completeAt) ? completeAt : null),
      row("Expires (Unix ms)", Number.isFinite(expiresAt) ? expiresAt : null),
      row("Certificate SHA-256", first(certificate?.certificate_sha256, certificate?.sha256)),
      row("Current layout fingerprint", first(
        certificate?.current_target_contents_sha256,
        certificate?.current_target_fingerprint,
        certificate?.current_layout_fingerprint,
      )),
      row("Proposed layout fingerprint", first(
        certificate?.proposed_layout_sha256,
        certificate?.proposed_layout_fingerprint,
      )),
      row("Windows build", certificate?.windows_build_number),
      row("Windows revision", certificate?.windows_revision),
      row("Windows tier", first(
        certificate?.windows_compatibility_tier,
        certificate?.windows_tier,
        certificate?.compatibility_tier,
      )),
      row("OS architecture", first(
        certificate?.windows_os_architecture,
        certificate?.architecture,
        certificate?.windows_architecture,
      )),
      row("Process architecture", certificate?.windows_process_architecture),
      row("Boot style", certificate?.boot_style),
      row("Source identity", first(
        certificate?.source_identity?.stable_device_identity,
        certificate?.source_identity_fingerprint,
        certificate?.source_fingerprint,
      )),
      row("Target identity", first(
        certificate?.target_identity?.stable_device_identity,
        certificate?.target_identity_fingerprint,
        certificate?.target_fingerprint,
      )),
      row("Target disposition", certificate?.target_disposition),
      row("Required capacity", first(
        certificate?.required_size_bytes,
        certificate?.required_capacity_bytes,
      ), { bytes: true }),
      row("Transport", first(certificate?.transport_summary, certificate?.transport?.observed_bus)),
      row("Topology", first(certificate?.topology_summary, certificate?.topology?.kind)),
      row("Protected roles", safeArrayText(certificate?.protected_roles)),
      row("Native backend", certificate?.native_target_state?.backend),
      row("Native state queried", certificate?.native_target_state?.queried),
      row("Native state offline", certificate?.native_target_state?.offline),
      row("Native state read only", certificate?.native_target_state?.read_only),
      row("Native extent count", certificate?.native_target_state?.native_volume_extent_count),
    ),
  );
}

function activityTable(activitySnapshot) {
  const history = Array.isArray(activitySnapshot?.history)
    ? activitySnapshot.history.slice(-ACTIVITY_LIMIT)
    : [];
  const projected = history.map((event) => {
    const item = record(event) ?? {};
    return Object.freeze({ cells: Object.freeze([
      tableCell(first(item.local_sequence, item.source_sequence)),
      tableCell(safeCode(item.code)),
      tableCell(safeCode(item.phase)),
      tableCell(safeCode(item.severity)),
      tableCell(safeCode(first(item.origin, item.source))),
    ]) });
  });
  return table("run_activity", "Latest activity", ["Sequence", "Code", "Phase", "Severity", "Source"], projected);
}

function warningCodes(status) {
  return list(first(status?.structured_warnings, status?.structuredWarnings), LIST_LIMIT)
    .map((warning) => safeCode(first(warning?.code, warning?.warning?.code)))
    .filter((code) => code !== null)
    .join(", ") || null;
}

function hasValidatedSummaryProjection(expert, status, terminal) {
  const source = safeCode(first(expert?.source, expert?.evidence_source));
  const evidenceTerminal = record(expert?.terminal_truth);
  return ["live_terminal_summary", "recovered_summary"].includes(source)
    && expert?.version === 1
    && typeof status?.run_id === "string"
    && expert?.run_id === status.run_id
    && typeof terminal?.final_state === "string"
    && evidenceTerminal?.final_state === terminal.final_state;
}

function executionSection(state, activitySnapshot, expert) {
  const status = record(state?.cloneStatus) ?? {};
  const run = record(valueAt(expert, "run", "execution")) ?? expert ?? {};
  const copyEvidence = record(valueAt(expert, "copy", "copy_evidence")) ?? {};
  const terminal = record(status.terminal) ?? record(valueAt(expert, "terminal_truth", "terminal")) ?? {};
  const progress = record(activitySnapshot?.currentProgress) ?? record(status.progress);
  const recovered = status.recovery?.recovered === true;
  const evidenceSource = safeCode(first(expert?.source, expert?.evidence_source));
  const summaryBacked = hasValidatedSummaryProjection(expert, status, terminal);
  let sectionStatus = "unavailable";
  if (recovered) sectionStatus = "recovered";
  else if (status.active === true) sectionStatus = "current";
  else if (terminal.final_state === "completed" && summaryBacked) sectionStatus = "complete";
  else if (status.run_id != null || terminal.final_state != null) sectionStatus = "warning";
  return section(
    "execution",
    "Clone run and copy verification",
    sectionStatus,
    rows(
      row("Run ID", status.run_id),
      row("Evidence source", evidenceSource),
      row("Validated terminal summary", summaryBacked),
      row("Status schema", status.status_schema_version),
      row("Worker protocol", first(expert?.protocol_version, status.protocol_version)),
      row("Capability", first(expert?.capability, status.capability)),
      row("Current phase", first(expert?.last_state, status.phase)),
      row("Boot style", expert?.boot_style),
      row("Recovery provenance", first(expert?.recovery_provenance, status.recovery?.provenance)),
      row("Current progress", progress?.metrics == null ? null : metricSummary(progress.metrics)),
      row("Planned bytes", first(copyEvidence.bytes_planned, run.bytes_planned), { bytes: true }),
      row("Copied bytes", first(copyEvidence.bytes_copied, run.bytes_copied), { bytes: true }),
      row("Chunk count", first(copyEvidence.chunk_count, run.chunk_count)),
      row("Exact byte coverage", first(copyEvidence.exact_byte_coverage, run.exact_byte_coverage)),
      row("Chunk hashes match", first(copyEvidence.chunk_hashes_match, run.chunk_hashes_match)),
      row("Chunk readback verified", first(copyEvidence.chunk_readback_verified, run.chunk_readback_verified)),
      row("Source total SHA-256", first(
        copyEvidence.total_source_sha256,
        copyEvidence.source_total_sha256,
        copyEvidence.source_sha256,
        run.total_source_sha256,
      )),
      row("Target total SHA-256", first(
        copyEvidence.total_target_sha256,
        copyEvidence.target_total_sha256,
        copyEvidence.target_sha256,
        run.total_target_sha256,
      )),
      row("Total hashes match", first(
        copyEvidence.total_hashes_match,
        copyEvidence.hashes_match,
        run.total_hashes_match,
      )),
      row("Readback verified", first(copyEvidence.readback_verified, run.readback_verified)),
      row("Identity reconciled", first(run.identity_reconciled, expert?.identity_reconciled)),
      row("Physical writes performed", expert?.physical_writes_performed),
      row("Warning codes", warningCodes(status)),
      row("Final state", terminal.final_state),
    ),
    [activityTable(activitySnapshot)],
  );
}

function storageEventTable(expert) {
  const events = list(first(expert?.storage_events, expert?.storageEvents), STORAGE_EVENT_LIMIT);
  const projected = events.map((event) => {
    const item = record(event) ?? {};
    return Object.freeze({ cells: Object.freeze([
      tableCell(first(item.event_id, item.eventId)),
      tableCell(item.provider),
      tableCell(first(item.record_id, item.event_record_id)),
      tableCell(first(item.timestamp_utc, item.timestamp_unix_ms, item.emitted_at_unix_ms)),
      tableCell(first(item.disk_number, item.virtual_disk_number)),
      tableCell(first(item.lba, item.logical_block_address)),
      tableCell(first(item.request_type, item.request)),
      tableCell(first(item.final_status, item.status)),
      tableCell(item.correlated),
    ]) });
  });
  return table(
    "storage_events",
    "Correlated storage events",
    ["Event", "Provider", "Record", "Timestamp", "Disk", "LBA", "Request", "Final status", "Correlated"],
    projected,
  );
}

function bootFileTable(boot) {
  const projected = list(boot?.boot_file_checks).map((check) => {
    const item = record(check) ?? {};
    return Object.freeze({ cells: Object.freeze([
      tableCell(item.kind),
      tableCell(item.present),
      tableCell(item.size_bytes, { bytes: true }),
    ]) });
  });
  return table("boot_file_checks", "Startup file checks", ["Check", "Present", "Size"], projected);
}

function cleanupSection(state, expert) {
  const status = record(state?.cloneStatus) ?? {};
  const terminal = record(status.terminal) ?? record(valueAt(expert, "terminal_truth", "terminal")) ?? {};
  const cleanup = record(valueAt(expert, "cleanup", "cleanup_evidence")) ?? {};
  const boot = record(valueAt(expert, "boot_preparation", "boot_evidence", "boot")) ?? {};
  const provenance = record(valueAt(expert, "provenance", "provenance_evidence")) ?? {};
  const recovered = status.recovery?.recovered === true;
  const summaryBacked = hasValidatedSummaryProjection(expert, status, terminal);
  const cleanupComplete = first(
    cleanup.cleanup_complete,
    terminal.cleanup_complete,
    cleanup.snapshot_deleted === true
      && cleanup.temporary_mounts_remaining_count === 0
      && cleanup.target_offline === true,
  );
  const targetOffline = first(cleanup.target_offline, terminal.target_offline);
  let sectionStatus = "unavailable";
  if (recovered) sectionStatus = "recovered";
  else if (summaryBacked && cleanupComplete === true && targetOffline === true) sectionStatus = "complete";
  else if (status.active === true) sectionStatus = "pending";
  else if (status.run_id != null || terminal.final_state != null) sectionStatus = "warning";
  const omitted = Number(first(expert?.storage_events_omitted, expert?.storageEventsOmitted));
  return section(
    "cleanup",
    "Startup preparation, cleanup, and isolation",
    sectionStatus,
    rows(
      row("Validated terminal summary", summaryBacked),
      row("BCDBoot exit code", first(boot.bcdboot_exit_code, boot.exit_code)),
      row("BCDBoot succeeded", first(boot.bcdboot_succeeded, boot.succeeded)),
      row("BCD inspection valid", first(
        boot.bcd_inspection_succeeded,
        boot.bcd_inspection_valid,
        boot.bcd_valid,
      )),
      row("Plausible Windows loader", first(
        boot.plausible_loader,
        boot.plausible_windows_loader,
        boot.loader_plausible,
      )),
      row("BCD identifiers", safeArrayText(boot.identifiers)),
      row("Default BCD identifier", boot.default_identifier),
      row("Windows loader identifiers", safeArrayText(boot.windows_loader_identifiers)),
      row("Windows boot manager present", boot.windows_boot_manager_present),
      row("Fallback startup file present", first(
        boot.fallback_boot_file_present,
        boot.fallback_boot_present,
        boot.bootx64_present,
      )),
      row("Target boot evidence cleared", boot.target_boot_evidence_cleared_before_bcdboot),
      row("Target BCD hash before", boot.target_bcd_hash_before?.sha256),
      row("Target BCD hash after", boot.target_bcd_hash_after?.sha256),
      row("Host BCD unchanged", boot.host_bcd_unchanged),
      row("Snapshot deleted", first(cleanup.snapshot_deleted, cleanup.vss_deleted)),
      row("VSS cleanup", first(cleanup.vss_cleanup_status, cleanup.snapshot_cleanup_status)),
      row("Temporary mounts remaining", first(
        cleanup.temporary_mounts_remaining_count,
        cleanup.remaining_mount_count,
        cleanup.temporary_mount_count,
      )),
      row("Temporary mounts removed", cleanup.removed_mounts_count),
      row("Target detached", first(cleanup.target_detached, cleanup.detached)),
      row("Destination offline", targetOffline),
      row("Attachment proof method", cleanup.attachment_proof?.method),
      row("Attachment proof verified", cleanup.attachment_proof?.verified),
      row("Offline proof method", cleanup.offline_proof?.method),
      row("Offline proof verified", cleanup.offline_proof?.verified),
      row("Final isolation state", first(cleanup.final_target_state, cleanup.final_state)),
      row("Final-state proof method", cleanup.final_target_state_proof?.method),
      row("Final-state proof verified", cleanup.final_target_state_proof?.verified),
      row("Cleanup complete", cleanupComplete),
      row("Cleanup errors", safeArrayText(first(cleanup.errors, cleanup.error_codes, cleanup.cleanup_errors))),
      row("Manifest SHA-256", provenance.manifest_sha256),
      row("Certificate SHA-256", provenance.certificate_sha256),
      row("Execution evidence SHA-256", provenance.execution_evidence_sha256),
      row("Write verification passed", provenance.write_verified),
      row("Storage events omitted", Number.isFinite(omitted) ? omitted : null),
    ),
    [bootFileTable(boot), storageEventTable(expert)],
  );
}

function bootSection(state, expert) {
  const status = record(state?.cloneStatus) ?? {};
  const recovery = record(status.recovery) ?? {};
  const bootEvidence = record(valueAt(expert, "boot_verification", "boot_evidence", "boot")) ?? {};
  const verification = record(state?.bootVerification) ?? {};
  const recoveredTarget = recovery.provenance === "target_provenance"
    && recovery.recovered === true;
  const verified = verification.verified === true
    && verification.boot_tested === true
    && verification.run_id === status.run_id;
  let sectionStatus = "unavailable";
  if (verified) sectionStatus = "complete";
  else if (recoveredTarget) sectionStatus = "recovered";
  else if (status.terminal?.prepared_to_boot === true) sectionStatus = "pending";
  else if (state?.bootVerificationError != null) sectionStatus = "warning";
  const roles = first(verification.partition_roles, bootEvidence.partition_roles);
  return section(
    "boot",
    "Post-boot verification",
    sectionStatus,
    rows(
      row("Recovery provenance", recovery.provenance),
      row("Recovered target provenance", recoveredTarget),
      row("Run ID", first(verification.run_id, status.run_id)),
      row("Running target matched", first(verification.running_target_matched, bootEvidence.running_target_matched)),
      row("Boot style", first(verification.boot_style, bootEvidence.boot_style)),
      row("Partition roles", safeArrayText(roles)),
      row("Provenance digest matched", first(verification.provenance_digest_matched, bootEvidence.provenance_digest_matched)),
      row("Summary digest matched", first(verification.summary_digest_matched, bootEvidence.summary_digest_matched)),
      row("Verified", verification.verified),
      row("Boot tested", verification.boot_tested),
      row("Verification error", first(state?.bootVerificationError?.code, state?.bootVerificationError?.kind)),
    ),
  );
}

function resolveNow(now) {
  if (typeof now === "function") return Number(now());
  if (typeof now?.now === "function") return Number(now.now());
  if (Number.isFinite(Number(now))) return Number(now);
  return Date.now();
}

export { EXPERT_TAB_IDS };

export function createExpertEvidenceViewModel({
  workflowState = null,
  activitySnapshot = null,
  now = Date.now,
} = {}) {
  const state = record(workflowState) ?? {};
  const snapshot = record(activitySnapshot) ?? {};
  const nowMs = resolveNow(now);
  const preflight = taggedEvidence(state, "preflight");
  const diagnostic = taggedEvidence(state, "diagnostic");
  const disclosure = taggedEvidence(state, "disclosure");
  const certificate = certificateOf(disclosure);
  const expert = record(state.cloneStatus?.expert_evidence)
    ?? record(state.cloneStatus?.expertEvidence)
    ?? {};

  const tabs = Object.freeze([
    tab("system", "System", [
      hostSourceSection(state),
      destinationSection(state, preflight, disclosure, certificate),
    ]),
    tab("preparation", "Preparation", [
      layoutSection(state, preflight, disclosure),
      snapshotSection(state, diagnostic),
      certificateSection(state, disclosure, certificate, nowMs),
    ]),
    tab("run", "Run", [
      executionSection(state, snapshot, expert),
      cleanupSection(state, expert),
    ]),
    tab("boot", "Boot", [
      bootSection(state, expert),
    ]),
  ]);

  return Object.freeze({
    schemaVersion: 1,
    generatedAtUnixMs: Number.isFinite(nowMs) ? nowMs : null,
    tabs,
  });
}
