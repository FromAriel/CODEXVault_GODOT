const TEXT_LIMITS = Object.freeze({
  code: 96,
  source: 32,
  identifier: 160,
  detail: 512,
  warningMessage: 1024,
});

export const ACTIVITY_LIMITS = Object.freeze({
  history: 200,
  nerdEntries: 12,
  progressNotificationMs: 250,
  ...TEXT_LIMITS,
});

export const ACTIVITY_FAILURE_CLASSES = Object.freeze({
  NONE: "none",
  NO_TARGET: "no_target",
  UNSUPPORTED_TARGET: "unsupported_target",
  SOURCE_CHANGED: "source_changed",
  TARGET_CHANGED: "target_changed",
  STALE_EVIDENCE: "stale_evidence",
  SNAPSHOT_FAILURE: "snapshot_failure",
  COPY_VERIFICATION_FAILURE: "copy_verification_failure",
  STORAGE_FAILURE: "storage_failure",
  BOOT_FAILURE: "boot_failure",
  JOURNAL_FAILURE: "journal_failure",
  CLEANUP_FAILURE: "cleanup_failure",
  TARGET_ISOLATION_FAILURE: "target_isolation_failure",
  WORKER_PROTOCOL_FAILURE: "worker_protocol_failure",
  CANCELLATION: "cancellation",
  GENERIC_FAILURE: "generic_failure",
});

const CORE_CATALOG = {
  runtime_resolved: {
    normal: "Starting MiniClone",
    nerd: "Runtime and execution capability resolved",
    severity: "info",
  },
  inspection_started: {
    normal: "Finding your Windows drive",
    nerd: "Inspecting native disks, volumes, boot roles, and Windows capability",
    severity: "info",
  },
  inspection_completed: {
    normal: "Windows drive protected",
    nerd: "Running Windows source classified and protected",
    severity: "success",
  },
  target_selected: {
    normal: "Destination selected",
    nerd: "Selected cached destination evidence; no write authorized",
    severity: "info",
  },
  disclosure_started: {
    normal: "Preparing the erase review",
    nerd: "Building the non-authorizing erasure disclosure from matching preflight evidence",
    severity: "info",
  },
  confirmation_submitted: {
    normal: "Confirming the destination",
    nerd: "Submitting the bounded destination identity and data-loss acknowledgement",
    severity: "info",
  },
  confirmation_opened: {
    normal: "Review the destination before cloning",
    nerd: "Opened the bounded destructive-start confirmation for current evidence",
    severity: "info",
  },
  confirmation_cancelled: {
    normal: "Destination confirmation cancelled",
    nerd: "Cleared the ephemeral confirmation without changing readiness evidence",
    severity: "info",
  },
  confirmation_completed: {
    normal: "Destination confirmed",
    nerd: "MiniClone accepted the ephemeral phrase and both acknowledgements for this evidence generation",
    severity: "success",
  },
  clone_start_requested: {
    normal: "Starting the clone",
    nerd: "Requesting worker startup for the exact confirmed evidence generation",
    severity: "info",
  },
  preflight_started: {
    normal: "Checking the destination",
    nerd: "Revalidating target identity, transport, topology, extents, geometry, and capacity",
    severity: "info",
  },
  preflight_completed: {
    normal: "Destination checks passed",
    nerd: "Exact target evidence and proposed same-style layout verified read-only",
    severity: "success",
  },
  diagnostic_started: {
    normal: "Preparing a safe live copy",
    nerd: "Starting bounded native VSS source diagnosis",
    severity: "info",
  },
  diagnostic_completed: {
    normal: "Safe snapshot test passed",
    nerd: "Required snapshot reads passed and snapshot deletion was proved",
    severity: "success",
  },
  confirmation_ready: {
    normal: "Ready to clone",
    nerd: "Evidence chain and erasure disclosure agree for the selected target",
    severity: "success",
  },
  accepted: {
    normal: "Starting the clone",
    nerd: "Product worker accepted the exact certified run",
    severity: "info",
  },
  validated: {
    normal: "Checking everything again",
    nerd: "Revalidating certificate, source, destination, boot style, and native state",
    severity: "info",
  },
  snapshot_ready: {
    normal: "Preparing a safe live copy",
    nerd: "Native VSS snapshot is ready for source reads",
    severity: "success",
  },
  target_prepared: {
    normal: "Preparing the destination",
    nerd: "Fresh GPT/MBR layout and required filesystems prepared",
    severity: "success",
  },
  copying: {
    normal: "Copying Windows",
    nerd: "Copying chunks with immediate target readback and hash verification",
    severity: "info",
  },
  identity_reconciled: {
    normal: "Making the new drive independent",
    nerd: "Target identity and offline Windows drive mappings reconciled",
    severity: "success",
  },
  boot_prepared: {
    normal: "Preparing startup files",
    nerd: "Same-style BCDBoot and BCD evidence verified",
    severity: "success",
  },
  cleaning_up: {
    normal: "Finishing safely",
    nerd: "Removing snapshot and mounts, then isolating the destination offline",
    severity: "info",
  },
  completed: {
    normal: "Clone complete",
    nerd: "Exact copy, verification, boot preparation, cleanup, and offline gates passed",
    severity: "success",
    terminal: true,
  },
  cancelled: {
    normal: "Clone stopped safely",
    nerd: "Destination is incomplete; terminal cleanup and isolation evidence recorded",
    severity: "warning",
    terminal: true,
  },
  partial_failure: {
    normal: "Clone could not be completed",
    nerd: "A blocking phase failed; containment evidence follows",
    severity: "error",
    terminal: true,
  },
  recovered_active: {
    normal: "Reconnected to an active clone",
    nerd: "Durable state found; live cancellation availability is shown truthfully",
    severity: "info",
  },
  recovered_terminal: {
    normal: "Previous clone result recovered",
    nerd: "Terminal summary or provenance reconstructed from fixed durable evidence",
    severity: "info",
  },
  boot_verification_started: {
    normal: "Verifying this clone",
    nerd: "Rediscovering the running Windows source and fixed target provenance for post-boot verification",
    severity: "info",
  },
  boot_verification_completed: {
    normal: "Clone boot verified",
    nerd: "Post-boot source identity and target provenance verification passed",
    severity: "success",
  },
  boot_verification_failed: {
    normal: "MiniClone could not verify that Windows started from the new drive.",
    nerd: "Post-boot source identity or target provenance verification did not pass.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.BOOT_FAILURE,
  },
  evidence_expired: {
    normal: "Safety check expired — checking again",
    nerd: "The request-start-based evidence deadline expired; MiniClone invalidated and restarted this target generation.",
    severity: "warning",
    failureClass: ACTIVITY_FAILURE_CLASSES.STALE_EVIDENCE,
  },
};

const FAILURE_CATALOG = {
  no_eligible_target: {
    normal: "No supported destination drive is available.",
    nerd: "Discovery found no destination that passed the public target classifier.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.NO_TARGET,
  },
  unsupported_target: {
    normal: "This drive cannot be used safely as a destination.",
    nerd: "The selected destination failed a required transport, topology, health, role, or geometry gate.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.UNSUPPORTED_TARGET,
  },
  source_changed: {
    normal: "The Windows source changed or could not be proved. MiniClone stopped before continuing.",
    nerd: "Protected source identity, native extent, Windows role, or compatibility evidence changed or became unproved.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.SOURCE_CHANGED,
  },
  target_identity_changed: {
    normal: "The destination changed. MiniClone stopped before writing. Select the drive again.",
    nerd: "Target identity changed across a protected boundary; the workflow generation and evidence chain were invalidated.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.TARGET_CHANGED,
  },
  stale_evidence: {
    normal: "The safety checks expired or changed. Select the destination and check it again.",
    nerd: "Preflight or certificate evidence became stale and can no longer authorize this generation.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.STALE_EVIDENCE,
  },
  snapshot_failed: {
    normal: "MiniClone could not make a safe snapshot. Nothing was written to the destination. Close backup software and try again.",
    nerd: "The native VSS snapshot lifecycle failed before a safe source view was proved.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.SNAPSHOT_FAILURE,
  },
  copy_verification_failed: {
    normal: "Copied data did not verify. MiniClone stopped and left the destination incomplete. Do not boot from it.",
    nerd: "Copy length, immediate readback, chunk hash, or total hash verification failed.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.COPY_VERIFICATION_FAILURE,
  },
  severe_storage_event: {
    normal: "The storage system reported a serious error. MiniClone stopped. Do not boot from the destination.",
    nerd: "A correlated severe Disk, NTFS, FilterManager, or storage event blocked the active phase.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.STORAGE_FAILURE,
  },
  boot_preparation_failed: {
    normal: "Windows was copied, but startup preparation could not be proved. Do not boot from the destination.",
    nerd: "Same-style BCDBoot, BCD, or plausible-loader evidence did not pass.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.BOOT_FAILURE,
  },
  journal_or_summary_failed: {
    normal: "MiniClone could not prove the clone result. Do not treat the destination as complete.",
    nerd: "The bounded journal or terminal summary could not be written, read, or validated.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.JOURNAL_FAILURE,
  },
  cleanup_unproved: {
    normal: "Cleanup could not be proved. Leave MiniClone open and use Expert evidence for support.",
    nerd: "Snapshot deletion, handle release, or temporary mount cleanup remains unproved.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.CLEANUP_FAILURE,
  },
  target_offline_unproved: {
    normal: "MiniClone could not prove the destination is safely offline. Do not disconnect it or reboot based on MiniClone's advice.",
    nerd: "Final target isolation or offline-state evidence is missing or contradictory.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.TARGET_ISOLATION_FAILURE,
  },
  missing_terminal_evidence: {
    normal: "MiniClone stopped without a complete result. No success claim was made.",
    nerd: "The worker ended without one valid terminal frame; completion and containment remain unproved.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.WORKER_PROTOCOL_FAILURE,
  },
  product_summary_missing: {
    normal: "MiniClone stopped without a complete result. No success claim was made.",
    nerd: "Recovery found a durable journal without a readable terminal summary; completion and cleanup remain unproved.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.JOURNAL_FAILURE,
  },
  worker_protocol_violation: {
    normal: "MiniClone stopped because it received an unfamiliar engine result. No success claim was made.",
    nerd: "Worker version, run identity, ordering, frame shape, or terminal cardinality was invalid.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.WORKER_PROTOCOL_FAILURE,
  },
};

const WARNING_CATALOG = {
  event_153_observed: {
    normal: "Windows reported a storage retry. MiniClone is still checking the final result.",
    nerd: "A correlated virtual-disk Event 153 retry was observed before terminal verification completed.",
    severity: "warning",
  },
  event_153_recovered: {
    normal: "Windows retried a virtual-disk request; all verification passed.",
    nerd: "Windows recovered a virtual-disk Event 153 retry; correlation found no severe companion and verification passed.",
    severity: "warning",
  },
  cancellation_requested: {
    normal: "MiniClone is stopping safely.",
    nerd: "Cancellation was requested once; the worker will stop at the next safe checkpoint and complete cleanup.",
    severity: "warning",
    failureClass: ACTIVITY_FAILURE_CLASSES.CANCELLATION,
  },
  execution_warning: {
    normal: "MiniClone recorded a non-blocking warning.",
    nerd: "The worker retained a structured execution warning for Expert evidence.",
    severity: "warning",
  },
  run_status_uncertain: {
    normal: "MiniClone briefly lost contact with the clone and is still checking its status.",
    nerd: "A bounded product-status request failed while the worker may still be active; polling remains authoritative.",
    severity: "warning",
    failureClass: ACTIVITY_FAILURE_CLASSES.WORKER_PROTOCOL_FAILURE,
  },
  cancel_status_uncertain: {
    normal: "The stop request was sent, but MiniClone is still waiting for the final result.",
    nerd: "Cancellation intent remains latched after an ambiguous response; no duplicate request will be sent.",
    severity: "warning",
    failureClass: ACTIVITY_FAILURE_CLASSES.CANCELLATION,
  },
  boot_verification_retry: {
    normal: "Boot verification did not pass. The previous clone result is unchanged.",
    nerd: "The fixed-path verifier failed or returned mismatched evidence; clone terminal truth was preserved.",
    severity: "warning",
    failureClass: ACTIVITY_FAILURE_CLASSES.BOOT_FAILURE,
  },
};

const CURRENT_ERROR_CATALOG = {
  not_elevated: {
    normal: "Administrator access is required. Restart MiniClone as administrator.",
    nerd: "The elevated desktop boundary was not available, so protected inspection or execution was refused.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.GENERIC_FAILURE,
  },
  worker_missing: {
    normal: "The MiniClone engine worker is missing. Reinstall or repair MiniClone.",
    nerd: "The fixed packaged worker path was unavailable; no fallback executable was selected.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.WORKER_PROTOCOL_FAILURE,
  },
  worker_timeout: {
    normal: "The MiniClone engine check timed out. Nothing was changed.",
    nerd: "The bounded worker deadline expired before a valid terminal response arrived.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.WORKER_PROTOCOL_FAILURE,
  },
  worker_exit: {
    normal: "The MiniClone engine stopped unexpectedly. No success claim was made.",
    nerd: "The bounded worker process exited before the expected evidence was accepted.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.WORKER_PROTOCOL_FAILURE,
  },
  source_diagnostic_timeout: {
    normal: "The safe snapshot check timed out and cleanup is not yet proved. Leave MiniClone open and use Expert evidence for support.",
    nerd: "The bounded source-diagnostic worker timed out; VSS cleanup after termination remains unproved.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.CLEANUP_FAILURE,
  },
  source_diagnostic_requires_preflight: {
    normal: "Check the destination again before preparing a safe live copy.",
    nerd: "Source diagnosis was refused because matching current-generation preflight evidence was absent.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.STALE_EVIDENCE,
  },
  source_identity_changed: {
    normal: "The Windows source changed. MiniClone stopped before continuing. Run the checks again.",
    nerd: "The protected source identity changed across the discovery or preparation boundary.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.SOURCE_CHANGED,
  },
  source_identity_mismatch: {
    normal: "The Windows source no longer matches the protected checks. MiniClone stopped.",
    nerd: "Source disk identity disagreed with the current workflow-generation evidence.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.SOURCE_CHANGED,
  },
  target_identity_mismatch: {
    normal: "The destination changed. MiniClone stopped before writing. Select the drive again.",
    nerd: "Target disk identity disagreed with the current workflow-generation evidence.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.TARGET_CHANGED,
  },
  confirmation_requires_diagnostic: {
    normal: "Prepare a safe live copy before confirming the destination.",
    nerd: "Confirmation was refused because matching source-diagnostic evidence was absent.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.STALE_EVIDENCE,
  },
  demo_confirmation_requires_diagnostic: {
    normal: "Prepare a safe live copy before confirming the destination.",
    nerd: "Demo confirmation was refused because matching simulated diagnostic evidence was absent.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.STALE_EVIDENCE,
  },
  confirmation_phrase_mismatch: {
    normal: "The confirmation phrase did not match. Check the destination and try again.",
    nerd: "The ephemeral typed phrase failed exact confirmation and was cleared without entering activity state.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.GENERIC_FAILURE,
  },
  confirmation_acknowledgements_missing: {
    normal: "Both destination-erasure acknowledgements are required.",
    nerd: "Confirmation was refused until both bounded data-loss and target-identity acknowledgements are present.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.GENERIC_FAILURE,
  },
  confirmation_host_not_eligible: {
    normal: "This Windows computer cannot safely start a clone with the current evidence.",
    nerd: "The host compatibility or destructive-eligibility gate refused confirmation.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.UNSUPPORTED_TARGET,
  },
  confirmation_target_changed: {
    normal: "The destination changed. MiniClone stopped before writing. Select the drive again.",
    nerd: "Target identity, geometry, contents, or disposition changed after discovery.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.TARGET_CHANGED,
  },
  unsupported_schema: {
    normal: "This MiniClone interface and engine do not match. Reinstall or update MiniClone.",
    nerd: "The evidence schema version is unsupported by this frontend catalog.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.WORKER_PROTOCOL_FAILURE,
  },
  inspection_busy: {
    normal: "MiniClone is already checking this computer. Wait for that check to finish.",
    nerd: "A second inspection request was refused while the serialized inspection owner was active.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.GENERIC_FAILURE,
  },
  tauri_unavailable: {
    normal: "The MiniClone desktop bridge is unavailable. Restart the app.",
    nerd: "The fixed Tauri command bridge was unavailable; no browser or storage fallback was attempted.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.WORKER_PROTOCOL_FAILURE,
  },
  containment_blocked: {
    normal: "Cleanup or safe containment is not proved. Leave MiniClone open and use Expert evidence for support.",
    nerd: "A safety-critical cleanup, severe-event, or containment blocker prevents further workflow operations.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.CLEANUP_FAILURE,
  },
  storage_event: {
    normal: "The storage system reported a serious error. MiniClone stopped. Do not boot from the destination.",
    nerd: "Correlated storage-event evidence blocked the active operation.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.STORAGE_FAILURE,
  },
  clone_start_status_rejected: {
    normal: "The clone could not start safely. Check the destination again.",
    nerd: "The first worker status did not match the reserved run, ordering, or active-state contract.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.WORKER_PROTOCOL_FAILURE,
  },
  product_execution_not_promoted: {
    normal: "This MiniClone build is not enabled to write a clone.",
    nerd: "The validation-only worker refused execution because product writes are structurally disabled.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.GENERIC_FAILURE,
  },
  product_execution_failed: {
    normal: "MiniClone could not complete the clone. Do not boot from the incomplete destination.",
    nerd: "Product execution ended in a blocking failure; terminal containment evidence remains authoritative.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.GENERIC_FAILURE,
  },
  confirmation_failed: {
    normal: "MiniClone could not confirm this destination. Check it and try again.",
    nerd: "The bounded confirmation operation failed without retaining the typed phrase.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.GENERIC_FAILURE,
  },
  invalid_demo_fixture: {
    normal: "The MiniClone Demo data is invalid. Reinstall or repair MiniClone Demo.",
    nerd: "A bundled Demo envelope failed its fixed mode, schema, command, or safety contract.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.WORKER_PROTOCOL_FAILURE,
  },
  demo_fixture_unavailable: {
    normal: "The MiniClone Demo data could not be loaded. Reinstall or repair MiniClone Demo.",
    nerd: "The separately bundled, diskless Demo scenario was unavailable.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.WORKER_PROTOCOL_FAILURE,
  },
  stale_demo_inspection: {
    normal: "Run the Demo system check again before selecting a destination.",
    nerd: "The fictional target operation was refused because current Demo inspection evidence was absent.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.STALE_EVIDENCE,
  },
  invalid_demo_target: {
    normal: "Select one of the destinations shown by MiniClone Demo.",
    nerd: "The Demo received a target number that was not present in its cached selectable-target evidence.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.NO_TARGET,
  },
  demo_target_refused: {
    normal: "That Demo destination cannot be selected safely.",
    nerd: "The requested fictional disk was absent from the Demo's selectable-target matrix.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.UNSUPPORTED_TARGET,
  },
  demo_diagnostic_requires_preflight: {
    normal: "Check the Demo destination before preparing a safe live copy.",
    nerd: "The simulated source diagnostic was refused because matching Demo preflight evidence was absent.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.STALE_EVIDENCE,
  },
  demo_target_changed: {
    normal: "The Demo destination changed. Select it and run the checks again.",
    nerd: "Fictional target identity or disposition changed between Demo evidence stages.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.TARGET_CHANGED,
  },
  demo_execution_requires_confirmation: {
    normal: "Confirm the Demo destination before starting the simulated clone.",
    nerd: "The diskless execution timeline was refused because current Demo confirmation evidence was absent.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.STALE_EVIDENCE,
  },
  demo_timeline_missing: {
    normal: "That MiniClone Demo scenario is unavailable.",
    nerd: "The requested deterministic Demo execution timeline was not bundled.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.WORKER_PROTOCOL_FAILURE,
  },
  demo_execution_confirmation_mismatch: {
    normal: "The Demo confirmation expired or changed. Confirm the destination again.",
    nerd: "The ephemeral Demo execution confirmation no longer matched the current fictional target evidence.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.STALE_EVIDENCE,
  },
  product_clone_not_active: {
    normal: "There is no active clone to stop.",
    nerd: "Cancellation was refused because no matching active worker run exists.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.CANCELLATION,
  },
  invalid_runtime_mode: {
    normal: "This MiniClone interface has an invalid runtime mode. Reinstall or repair MiniClone.",
    nerd: "Runtime selection returned neither the fixed Live boundary nor the separately compiled Demo boundary.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.WORKER_PROTOCOL_FAILURE,
  },
  inspection_identity_mismatch: {
    normal: "The Windows source identity could not be proved. MiniClone stopped.",
    nerd: "The inspection view and native source evidence disagreed on the protected source disk.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.SOURCE_CHANGED,
  },
  inspection_failed: {
    normal: "MiniClone could not finish checking this computer. Nothing was changed.",
    nerd: "The serialized inspection operation ended without a valid current evidence envelope.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.GENERIC_FAILURE,
  },
  target_preflight_failed: {
    normal: "MiniClone could not finish checking the destination. Nothing was written.",
    nerd: "The read-only target preflight ended without valid current-generation evidence.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.UNSUPPORTED_TARGET,
  },
  source_containment_unproved: {
    normal: "Snapshot cleanup could not be proved. Leave MiniClone open and use Expert evidence for support.",
    nerd: "VSS deletion, backup-component release, or snapshot absence remained unproved.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.CLEANUP_FAILURE,
  },
  severe_storage_evidence: {
    normal: "The storage system reported a serious error. MiniClone stopped.",
    nerd: "A severe Disk, NTFS, or FilterManager event remained globally blocking after correlation.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.STORAGE_FAILURE,
  },
  source_containment_failed: {
    normal: "Snapshot cleanup could not be proved. Leave MiniClone open and use Expert evidence for support.",
    nerd: "The source-containment operation failed without proving snapshot absence and safe release.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.CLEANUP_FAILURE,
  },
  source_diagnostic_failed: {
    normal: "MiniClone could not make a safe snapshot. Nothing was written to the destination.",
    nerd: "The native source diagnostic ended before its bounded VSS lifecycle and reads were proved.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.SNAPSHOT_FAILURE,
  },
  target_disclosure_failed: {
    normal: "MiniClone could not prepare the destination review. Run the checks again.",
    nerd: "The erasure disclosure could not be bound to matching current-generation target evidence.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.STALE_EVIDENCE,
  },
  target_selection_failed: {
    normal: "Select one of the available destination drives.",
    nerd: "The requested workflow operation had no matching cached selectable-target number.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.NO_TARGET,
  },
  confirmation_evidence_failed: {
    normal: "The safety checks expired or changed. Check the destination again.",
    nerd: "Confirmation was refused because the current evidence chain was incomplete or expired.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.STALE_EVIDENCE,
  },
  confirmation_projection_missing: {
    normal: "MiniClone could not display a safe destination confirmation. Run the checks again.",
    nerd: "Validated preparation evidence was missing its bounded Normal confirmation projection.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.WORKER_PROTOCOL_FAILURE,
  },
  confirmation_commit_rejected: {
    normal: "The destination confirmation changed before cloning could start. Run the checks again.",
    nerd: "The controller rejected the confirmation commit because its workflow generation no longer matched.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.STALE_EVIDENCE,
  },
  clone_start_reservation_failed: {
    normal: "The clone could not start safely. Check the destination again.",
    nerd: "The controller could not reserve the single execution transition for the confirmed generation.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.WORKER_PROTOCOL_FAILURE,
  },
  clone_status_failed: {
    normal: "MiniClone lost the current clone status. No success claim was made.",
    nerd: "The serialized worker-status poll failed before a valid ordered status was accepted.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.WORKER_PROTOCOL_FAILURE,
  },
  clone_cancellation_failed: {
    normal: "MiniClone could not confirm the stop request. Leave MiniClone open while it checks cleanup.",
    nerd: "The cooperative cancellation command failed before matching terminal containment evidence arrived.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.CANCELLATION,
  },
  clone_cancellation_status_rejected: {
    normal: "MiniClone could not verify the stop result. No safe completion claim was made.",
    nerd: "The cancellation response failed the active run, source-sequence, or terminal-status contract.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.WORKER_PROTOCOL_FAILURE,
  },
  initialization_failed: {
    normal: "MiniClone could not finish starting safely. Nothing was changed.",
    nerd: "Capability, durable recovery, or initial inspection did not produce valid startup evidence.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.WORKER_PROTOCOL_FAILURE,
  },
  workflow_failed: {
    normal: "MiniClone stopped because the workflow state could not be proved. Nothing was changed.",
    nerd: "A serialized workflow operation failed without a more specific bounded error code.",
    severity: "error",
    failureClass: ACTIVITY_FAILURE_CLASSES.GENERIC_FAILURE,
  },
};

function freezeCatalog(source) {
  return Object.freeze(Object.fromEntries(
    Object.entries(source).map(([code, entry]) => [code, Object.freeze({ code, ...entry })]),
  ));
}

export const ACTIVITY_CODE_REGISTRY = freezeCatalog({
  ...CORE_CATALOG,
  ...FAILURE_CATALOG,
  ...WARNING_CATALOG,
  ...CURRENT_ERROR_CATALOG,
});

export const KNOWN_ACTIVITY_CODES = Object.freeze(Object.keys(ACTIVITY_CODE_REGISTRY));

export const RECOVERY_PROVENANCE_CODES = Object.freeze([
  "active_marker",
  "summary",
  "journal_without_summary",
  "target_provenance",
]);

const KNOWN_SEVERITIES = new Set(["info", "success", "warning", "error"]);
const TERMINAL_CODES = new Set(["completed", "cancelled", "partial_failure"]);

const FAILURE_COPY = Object.freeze(Object.fromEntries(
  Object.values(FAILURE_CATALOG).map((entry) => [entry.failureClass, Object.freeze({
    normal: entry.normal,
    nerd: entry.nerd,
  })]),
));

const FAILURE_CODE_RULES = Object.freeze([
  [ACTIVITY_FAILURE_CLASSES.NO_TARGET, /(?:no_eligible_target|target.*(?:none|missing)|no_target)/],
  [ACTIVITY_FAILURE_CLASSES.UNSUPPORTED_TARGET, /(?:unsupported_target|target.*refused|product_(?:layout|geometry|capacity)_refused)/],
  [ACTIVITY_FAILURE_CLASSES.SOURCE_CHANGED, /(?:source|windows_host|windows_tier).*(?:changed|identity|mismatch|missing|unproved|refused|unsupported)/],
  [ACTIVITY_FAILURE_CLASSES.TARGET_CHANGED, /(?:target|destination).*(?:changed|identity_mismatch)|confirmation_target_changed/],
  [ACTIVITY_FAILURE_CLASSES.STALE_EVIDENCE, /(?:stale|expired|certificate.*(?:age|digest|invalid)|evidence.*(?:changed|mismatch))/],
  [ACTIVITY_FAILURE_CLASSES.TARGET_ISOLATION_FAILURE, /(?:target|destination).*(?:offline|isolation).*(?:fail|missing|unproved|mismatch)/],
  [ACTIVITY_FAILURE_CLASSES.CLEANUP_FAILURE, /(?:(?:cleanup|delete|release|mount|detach).*(?:fail|missing|unproved|remaining|error)|(?:vss|snapshot).*(?:cleanup|delete|release)|source_containment_unproved)/],
  [ACTIVITY_FAILURE_CLASSES.SNAPSHOT_FAILURE, /(?:vss|snapshot).*(?:create|read|fail|missing|unavailable|timeout)/],
  [ACTIVITY_FAILURE_CLASSES.COPY_VERIFICATION_FAILURE, /(?:copy|chunk|readback|hash).*(?:fail|mismatch|short|oversize|overflow|unproved)/],
  [ACTIVITY_FAILURE_CLASSES.STORAGE_FAILURE, /(?:severe.*storage|storage.*event|disk_event|ntfs_event|filtermanager|event_98)/],
  [ACTIVITY_FAILURE_CLASSES.BOOT_FAILURE, /(?:boot|bcd).*(?:fail|missing|mismatch|unproved|invalid)/],
  [ACTIVITY_FAILURE_CLASSES.JOURNAL_FAILURE, /(?:journal|summary|provenance).*(?:fail|missing|invalid|unproved|create|write|flush|read)/],
  [ACTIVITY_FAILURE_CLASSES.WORKER_PROTOCOL_FAILURE, /(?:worker|protocol|frame|terminal).*(?:fail|invalid|missing|ended|violation|large)/],
  [ACTIVITY_FAILURE_CLASSES.CANCELLATION, /cancel(?:lation)?_(?:requested|pending)/],
]);

export function isKnownActivityCode(code) {
  return typeof code === "string" && Object.hasOwn(ACTIVITY_CODE_REGISTRY, code);
}

export function sanitizeStableCode(value, fallback = "unknown_activity") {
  if (typeof value !== "string") return fallback;
  const original = value.trim();
  if (/\bERASE\s+(?:DISK|DRIVE)\s+\d+\b/i.test(original)
      || /[0-9a-f]{40,}/i.test(original)
      || /\{?[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\}?/i.test(original)) {
    return fallback;
  }
  const sanitized = original
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, TEXT_LIMITS.code);
  return sanitized || fallback;
}

function capText(value, limit) {
  if (typeof value !== "string") return null;
  const collapsed = value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  if (!collapsed) return null;
  if (collapsed.length <= limit) return collapsed;
  return `${collapsed.slice(0, Math.max(0, limit - 1))}…`;
}

export function redactActivityText(value, limit = TEXT_LIMITS.detail) {
  const cappedLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 4096) : TEXT_LIMITS.detail;
  const text = capText(value, 4096);
  if (text === null) return null;
  const redacted = text
    .replace(/\bERASE\s+(?:DISK|DRIVE)\s+\d+\b/gi, "[typed phrase redacted]")
    .replace(
      /\b[A-Za-z_][A-Za-z0-9_]{0,63}\s*=\s*(?:"[^"\r\n]*"|'[^'\r\n]*'|[^,;|)\]}·\r\n]*)/gi,
      "[environment value redacted]",
    )
    .replace(
      /\b(?:serial(?:[\s_-]+(?:number|id))?|s\/n)\s*(?:(?:[:=]|\bis\b)\s*)?(?:"[^"\r\n]*"|'[^'\r\n]*'|[^,;|)\]}·\r\n]*)/gi,
      "[serial redacted]",
    )
    .replace(
      /(["'])(?:[A-Za-z]:\\|\\\\|\\Device\\)[^"'\r\n]*\1/gi,
      "[path redacted]",
    )
    .replace(/(?:\b[A-Za-z]:\\|\\\\|\\Device\\)[^,;|)\]}·\r\n]*/gi, "[path redacted]")
    .replace(/\b[0-9a-f]{40,128}\b/gi, "[hash redacted]")
    .replace(/\{?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\}?/gi, "[identifier redacted]");
  return capText(redacted, cappedLimit);
}

function boundedIdentifier(value) {
  if (typeof value !== "string") return null;
  const capped = capText(value, TEXT_LIMITS.identifier);
  if (capped === null) return null;
  if (/\bERASE\s+(?:DISK|DRIVE)\s+\d+\b/i.test(capped)) return "[typed_phrase_redacted]";
  return capped.replace(/[^A-Za-z0-9_.:@-]+/g, "_");
}

function nonnegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function sanitizeMetrics(metrics) {
  if (metrics === null || typeof metrics !== "object" || Array.isArray(metrics)) return null;
  const normalized = Object.freeze({
    bytes_completed: nonnegativeInteger(metrics.bytes_completed ?? metrics.bytesCompleted),
    bytes_planned: nonnegativeInteger(metrics.bytes_planned ?? metrics.bytesPlanned),
    bytes_per_second: nonnegativeInteger(metrics.bytes_per_second ?? metrics.bytesPerSecond),
    eta_seconds: nonnegativeInteger(metrics.eta_seconds ?? metrics.etaSeconds),
  });
  return Object.values(normalized).some((value) => value !== null) ? normalized : null;
}

function sanitizeWarning(warning) {
  if (warning === null || typeof warning !== "object" || Array.isArray(warning)) return null;
  const code = sanitizeStableCode(warning.code, "unknown_warning");
  const message = redactActivityText(warning.message, TEXT_LIMITS.warningMessage);
  return Object.freeze({ code, message });
}

function sanitizeTerminalTruth(terminalTruth) {
  if (terminalTruth === null || typeof terminalTruth !== "object" || Array.isArray(terminalTruth)) {
    return null;
  }
  const truth = (snake, camel) => {
    const value = terminalTruth[snake] ?? terminalTruth[camel];
    return typeof value === "boolean" ? value : null;
  };
  return Object.freeze({
    physical_restore_completed: truth("physical_restore_completed", "physicalRestoreCompleted"),
    prepared_to_boot: truth("prepared_to_boot", "preparedToBoot"),
    boot_tested: truth("boot_tested", "bootTested"),
    cleanup_complete: truth("cleanup_complete", "cleanupComplete"),
    target_offline: truth("target_offline", "targetOffline"),
  });
}

function inferCode(event) {
  const warning = event?.warning;
  const terminal = event?.terminal_truth ?? event?.terminalTruth ?? event?.terminal;
  const suppliedCode = event?.code;
  return (suppliedCode === "warning" ? warning?.code : suppliedCode)
    ?? warning?.code
    ?? terminal?.final_state
    ?? terminal?.finalState
    ?? event?.phase
    ?? "unknown_activity";
}

export function normalizeActivityEvent(event, correlation = {}) {
  if (event === null || typeof event !== "object" || Array.isArray(event)) return null;
  try {
    const code = sanitizeStableCode(inferCode(event));
    const catalogEntry = ACTIVITY_CODE_REGISTRY[code];
    const warning = sanitizeWarning(event.warning);
    const terminalTruth = sanitizeTerminalTruth(
      event.terminal_truth ?? event.terminalTruth ?? event.terminal,
    );
    const suppliedSeverity = typeof event.severity === "string" ? event.severity.toLowerCase() : null;
    const severity = KNOWN_SEVERITIES.has(suppliedSeverity)
      ? suppliedSeverity
      : catalogEntry?.severity ?? (warning ? "warning" : terminalTruth ? "error" : "info");
    const sourceSequence = nonnegativeInteger(
      event.source_sequence ?? event.sourceSequence ?? event.sequence,
    );
    const emittedAt = nonnegativeInteger(event.emitted_at_unix_ms ?? event.emittedAtUnixMs);
    const generation = nonnegativeInteger(
      event.workflow_generation
        ?? event.workflowGeneration
        ?? correlation.workflow_generation
        ?? correlation.workflowGeneration,
    );
    const eventRunId = boundedIdentifier(event.run_id ?? event.runId);
    const contextRunId = boundedIdentifier(correlation.run_id ?? correlation.runId);
    if (eventRunId !== null && contextRunId !== null && eventRunId !== contextRunId) return null;
    const eventGeneration = nonnegativeInteger(event.workflow_generation ?? event.workflowGeneration);
    const contextGeneration = nonnegativeInteger(
      correlation.workflow_generation ?? correlation.workflowGeneration,
    );
    if (eventGeneration !== null && contextGeneration !== null && eventGeneration !== contextGeneration) {
      return null;
    }
    const source = sanitizeStableCode(event.source, "ui_command").slice(0, TEXT_LIMITS.source);
    const origin = sanitizeStableCode(event.origin ?? correlation.origin ?? source, source)
      .slice(0, TEXT_LIMITS.source);
    const errorCode = event.error_code ?? event.errorCode;
    const errorMessage = event.error_message ?? event.errorMessage;
    const failureClass = event.failure_class ?? event.failureClass;
    const localSequence = nonnegativeInteger(event.local_sequence ?? event.localSequence);
    const recoveryProvenance = event.recovery_provenance ?? event.recoveryProvenance;
    return Object.freeze({
      schema_version: nonnegativeInteger(event.schema_version ?? event.schemaVersion) ?? 1,
      sequence: sourceSequence,
      source_sequence: sourceSequence,
      local_sequence: localSequence,
      emitted_at_unix_ms: emittedAt,
      source,
      origin,
      run_id: eventRunId ?? contextRunId,
      workflow_generation: eventGeneration ?? contextGeneration ?? generation,
      code,
      phase: event.phase == null ? null : sanitizeStableCode(event.phase, "unknown_phase"),
      severity,
      detail: redactActivityText(event.detail, TEXT_LIMITS.detail),
      metrics: sanitizeMetrics(event.metrics ?? event),
      warning,
      terminal_truth: terminalTruth,
      error_code: errorCode == null ? null : sanitizeStableCode(errorCode, "unknown_error"),
      error_message: redactActivityText(errorMessage, TEXT_LIMITS.warningMessage),
      failure_class: failureClass == null ? null : sanitizeStableCode(failureClass, "generic_failure"),
      recovery_provenance: recoveryProvenance == null
        ? null
        : sanitizeStableCode(recoveryProvenance, "unknown_recovery"),
      recovered: event.recovered === true,
    });
  } catch {
    return null;
  }
}

function formatBinaryBytes(value) {
  if (!Number.isSafeInteger(value) || value < 0) return null;
  if (value < 1024) return `${value} B`;
  const units = ["KiB", "MiB", "GiB", "TiB", "PiB"];
  let amount = value;
  let unitIndex = -1;
  do {
    amount /= 1024;
    unitIndex += 1;
  } while (amount >= 1024 && unitIndex < units.length - 1);
  const precision = amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
  return `${amount.toFixed(precision).replace(/\.0+$|(?<=\.[0-9])0+$/g, "")} ${units[unitIndex]}`;
}

function formatDuration(seconds) {
  if (!Number.isSafeInteger(seconds) || seconds < 0) return null;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainderSeconds = seconds % 60;
  if (minutes < 60) return remainderSeconds === 0 ? `${minutes}m` : `${minutes}m ${remainderSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainderMinutes = minutes % 60;
  if (hours < 24) return remainderMinutes === 0 ? `${hours}h` : `${hours}h ${remainderMinutes}m`;
  const days = Math.floor(hours / 24);
  const remainderHours = hours % 24;
  return remainderHours === 0 ? `${days}d` : `${days}d ${remainderHours}h`;
}

export function formatActivityMetrics(metrics) {
  const safe = sanitizeMetrics(metrics);
  if (safe === null) {
    return Object.freeze({ percent: null, transferred: null, rate: null, eta: null });
  }
  const completed = safe.bytes_completed;
  const planned = safe.bytes_planned;
  const percent = completed !== null && planned !== null && planned > 0
    ? Math.min(100, Math.round((completed / planned) * 1000) / 10)
    : null;
  const completedText = formatBinaryBytes(completed);
  const plannedText = planned !== null && planned > 0 ? formatBinaryBytes(planned) : null;
  const transferred = completedText === null
    ? null
    : plannedText === null ? completedText : `${completedText} of ${plannedText}`;
  const rateBytes = safe.bytes_per_second;
  const rate = rateBytes !== null && rateBytes > 0 ? `${formatBinaryBytes(rateBytes)}/s` : null;
  return Object.freeze({
    percent,
    transferred,
    rate,
    eta: safe.eta_seconds === null ? null : formatDuration(safe.eta_seconds),
  });
}

function metricSuffix(event) {
  const formatted = formatActivityMetrics(event?.metrics);
  const parts = [];
  if (formatted.transferred !== null) parts.push(formatted.transferred);
  if (formatted.percent !== null) parts.push(`${formatted.percent}%`);
  if (formatted.rate !== null) parts.push(formatted.rate);
  if (formatted.eta !== null) parts.push(`ETA ${formatted.eta}`);
  return parts.length === 0 ? "" : ` — ${parts.join(", ")}`;
}

function candidateFailureCode(event) {
  return sanitizeStableCode(
    event?.failure_class
      ?? event?.failureClass
      ?? event?.error_code
      ?? event?.errorCode
      ?? event?.warning?.code
      ?? event?.code,
    "generic_failure",
  );
}

export function classifyActivityFailure(event) {
  const candidate = candidateFailureCode(event);
  if (Object.values(ACTIVITY_FAILURE_CLASSES).includes(candidate)) return candidate;
  const known = ACTIVITY_CODE_REGISTRY[candidate]?.failureClass;
  if (known) return known;
  for (const [failureClass, pattern] of FAILURE_CODE_RULES) {
    if (pattern.test(candidate)) return failureClass;
  }
  const normalized = normalizeActivityEvent(event);
  if (normalized?.severity === "error" || normalized?.terminal_truth !== null) {
    return ACTIVITY_FAILURE_CLASSES.GENERIC_FAILURE;
  }
  return ACTIVITY_FAILURE_CLASSES.NONE;
}

function fallbackIsTerminal(event) {
  const normalized = normalizeActivityEvent(event);
  return normalized?.terminal_truth !== null
    || normalized?.severity === "error"
    || TERMINAL_CODES.has(normalized?.code);
}

export function translateActivityNormal(event) {
  const normalized = normalizeActivityEvent(event);
  if (normalized === null) return "MiniClone is working safely.";
  const entry = ACTIVITY_CODE_REGISTRY[normalized.code];
  const specificFailure = ACTIVITY_CODE_REGISTRY[candidateFailureCode(normalized)];
  const failureClass = classifyActivityFailure(normalized);
  if ((normalized.code === "partial_failure" || normalized.severity === "error")
      && failureClass !== ACTIVITY_FAILURE_CLASSES.GENERIC_FAILURE
      && failureClass !== ACTIVITY_FAILURE_CLASSES.NONE) {
    return specificFailure?.normal ?? FAILURE_COPY[failureClass]?.normal ?? entry?.normal
      ?? "MiniClone stopped because it received an unfamiliar engine result. No success claim was made.";
  }
  if (normalized.code === "partial_failure" && specificFailure?.severity === "error") {
    return specificFailure.normal;
  }
  if (entry) return entry.normal;
  return fallbackIsTerminal(normalized)
    ? "MiniClone stopped because it received an unfamiliar engine result. No success claim was made."
    : "MiniClone is working safely.";
}

export function translateActivityNerd(event) {
  const normalized = normalizeActivityEvent(event);
  if (normalized === null) return "Unrecognized engine activity (`unknown_activity`)";
  const entry = ACTIVITY_CODE_REGISTRY[normalized.code];
  const specificFailure = ACTIVITY_CODE_REGISTRY[candidateFailureCode(normalized)];
  const failureClass = classifyActivityFailure(normalized);
  let text;
  if ((normalized.code === "partial_failure" || normalized.severity === "error")
      && failureClass !== ACTIVITY_FAILURE_CLASSES.GENERIC_FAILURE
      && failureClass !== ACTIVITY_FAILURE_CLASSES.NONE) {
    text = specificFailure?.nerd ?? FAILURE_COPY[failureClass]?.nerd ?? entry?.nerd;
  } else if (normalized.code === "partial_failure" && specificFailure?.severity === "error") {
    text = specificFailure.nerd;
  } else {
    text = entry?.nerd;
  }
  if (!text) text = `Unrecognized engine activity (\`${normalized.code}\`)`;
  return `${text}${metricSuffix(normalized)}`;
}

export function renderActivityExpert(event) {
  const normalized = normalizeActivityEvent(event);
  if (normalized === null) return Object.freeze([]);
  const fields = [
    ["Local sequence", normalized.local_sequence],
    ["Source sequence", normalized.source_sequence],
    ["Timestamp (Unix ms)", normalized.emitted_at_unix_ms],
    ["Source", normalized.source],
    ["Origin", normalized.origin],
    ["Run", normalized.run_id],
    ["Workflow generation", normalized.workflow_generation],
    ["Code", normalized.code],
    ["Phase", normalized.phase],
    ["Severity", normalized.severity],
    ["Detail", normalized.detail],
    ["Warning code", normalized.warning?.code],
    ["Warning message", normalized.warning?.message],
    ["Error code", normalized.error_code],
    ["Error message", normalized.error_message],
    ["Recovery provenance", normalized.recovery_provenance],
    ["Recovered", normalized.recovered],
  ];
  return Object.freeze(fields
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([label, value]) => Object.freeze({ label, value })));
}

export const translateNormal = translateActivityNormal;
export const translateNerd = translateActivityNerd;
