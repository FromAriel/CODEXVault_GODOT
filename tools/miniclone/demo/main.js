import { normalizeUiError } from "./ui-model.js";
import { createAppBridge } from "./app-bridge.js";
import { createActivityStore } from "./activity-store.js";
import { createNormalShellRenderer } from "./dom-renderer.js";
import { translateActivityNormal } from "./activity-catalog.js";
import {
  createExecutionPresentationState,
  reduceExecutionPresentation,
} from "./execution-view-model.js";
import { createModalController } from "./modal-controller.js";
import { createNerdExpertRenderer } from "./nerd-expert-renderer.js";
import { createNerdTrustViewModel } from "./nerd-view-model.js";
import { createExpertEvidenceViewModel } from "./expert-evidence.js";
import {
  createExpertPresentationState,
  reduceExpertPresentation,
} from "./expert-presentation.js";
import {
  createPresentationState,
  reducePresentation,
} from "./presentation-mode.js";
import {
  applyThemeToDocument,
  createThemeState,
  reduceTheme,
} from "./theme-state.js";
import { createNormalShellViewModel } from "./view-model.js";
import { createWorkflowController } from "./workflow-controller.js";
import {
  WORKFLOW_STATES,
  createInitialWorkflowState,
  isEvidenceReady,
} from "./workflow-state.js";

const invoke = window.__TAURI__?.core?.invoke;
const elements = {
  appWindow: document.querySelector(".app-window"),
  demoBanner: document.querySelector("#demoBanner"),
  runtimeTag: document.querySelector("#runtimeTag"),
  refreshButton: document.querySelector("#refreshButton"),
  nerdToggle: document.querySelector("#nerdToggle"),
  expertEvidenceToggle: document.querySelector("#expertEvidenceToggle"),
  expertEvidencePanel: document.querySelector("#expertEvidencePanel"),
  preflightButton: document.querySelector("#normalPrimaryAction"),
  targetConfirmationPanel: document.querySelector("#targetConfirmationPanel"),
  targetConfirmationTitle: document.querySelector("#targetConfirmationTitle"),
  targetConfirmationCloseButton: document.querySelector("#targetConfirmationCloseButton"),
  erasureWarning: document.querySelector("#erasureWarning"),
  confirmationSourceName: document.querySelector("#confirmationSourceName"),
  confirmationSourceIdentity: document.querySelector("#confirmationSourceIdentity"),
  confirmationTargetName: document.querySelector("#confirmationTargetName"),
  confirmationTargetFacts: document.querySelector("#confirmationTargetFacts"),
  acknowledgeDataLoss: document.querySelector("#acknowledgeDataLoss"),
  acknowledgeTargetIdentity: document.querySelector("#acknowledgeTargetIdentity"),
  expectedConfirmationPhrase: document.querySelector("#expectedConfirmationPhrase"),
  confirmationPhrase: document.querySelector("#confirmationPhrase"),
  recordConfirmationButton: document.querySelector("#recordConfirmationButton"),
  confirmationError: document.querySelector("#confirmationError"),
  normalActionTitle: document.querySelector("#normalActionTitle"),
  footerBoundary: document.querySelector("#footerBoundary"),
  footerStatus: document.querySelector("#footerStatus"),
};

let appBridge = null;
let activityStore = null;
let workflowController = null;
let normalRenderer = null;
let nerdExpertRenderer = null;
let themeState = createThemeState();
let executionPresentationState = createExecutionPresentationState();
let presentationState = createPresentationState();
let expertPresentationState = createExpertPresentationState();
let latestWorkflowState = null;
let latestActivitySnapshot = null;

function translatedFailure(error, fallbackCode = "product_execution_failed") {
  return translateActivityNormal({
    source: "ui_command",
    code: error?.kind ?? fallbackCode,
    severity: "error",
  });
}

function renderActivityFeed(snapshot = activityStore?.getSnapshot(), change = null) {
  if (!snapshot) return;
  latestActivitySnapshot = snapshot;
  void change;
  renderNormalShell();
}

function getWorkflowState() {
  return workflowController?.getState() ?? null;
}

function workflowIsBusy(state = latestWorkflowState) {
  return state?.inFlight != null;
}

function renderNormalShell(state = latestWorkflowState) {
  if (!normalRenderer) return;
  const activitySnapshot = latestActivitySnapshot;
  const viewModel = createNormalShellViewModel({
    workflowState: state,
    activitySnapshot,
    executionPresentationState,
    now: Date.now(),
  });
  normalRenderer.render(viewModel, themeState);
  renderProgressiveDisclosure(state, activitySnapshot);
  const hasRunEvidence = Boolean(state?.cloneStatus);
  elements.refreshButton.disabled = workflowIsBusy() || hasRunEvidence || !state?.inspection?.value;
}

function renderProgressiveDisclosure(
  state = latestWorkflowState,
  activitySnapshot = latestActivitySnapshot,
) {
  const expertOpen = presentationState.nerdEnabled === true
    && presentationState.expertEnabled === true
    && expertPresentationState.open === true;
  nerdExpertRenderer?.render({
    presentationState,
    expertPresentationState,
    nerdViewModel: createNerdTrustViewModel({ workflowState: state, activitySnapshot }),
    expertViewModel: expertOpen ? createExpertEvidenceViewModel({
      workflowState: state,
      activitySnapshot,
      now: Date.now(),
    }) : null,
  });
}

function selectNormalTarget(diskNumber) {
  const acceptedTarget = workflowController?.selectTarget(diskNumber);
  if (!acceptedTarget) return;
  executionPresentationState = reduceExecutionPresentation(executionPresentationState, { type: "reset" });
  resetConfirmationState();
  renderNormalShell();
}

function toggleNormalTheme(theme) {
  themeState = reduceTheme(themeState, { type: "theme_set", theme });
  applyThemeToDocument(document, themeState);
  renderNormalShell();
}

function handleNormalPrimaryAction(actionId) {
  switch (actionId) {
    case "back_to_main":
      updateExecutionPresentation({ type: "dismiss_terminal_result" });
      document.querySelector("#normalPrimaryAction:not([hidden])")?.focus({ preventScroll: true });
      return undefined;
    case "open_confirmation": return openTargetConfirmation();
    case "open_cancel_prompt": return openSafeStopPrompt();
    case "verify_boot": return void verifyCurrentBoot();
    case "refresh_inspection": return runInspection();
    case "close_application": return void invoke?.("close_application");
    default: return undefined;
  }
}

function updateExecutionPresentation(action) {
  executionPresentationState = reduceExecutionPresentation(executionPresentationState, action);
  renderNormalShell();
}

function openSafeStopPrompt() {
  const viewModel = createNormalShellViewModel({
    workflowState: getWorkflowState(),
    activitySnapshot: activityStore?.getSnapshot() ?? null,
    executionPresentationState,
    now: Date.now(),
  });
  if ((viewModel?.primaryAction ?? viewModel?.action)?.id !== "open_cancel_prompt") return;
  updateExecutionPresentation({ type: "open_cancel_prompt" });
  document.querySelector("#normalCancelKeepButton")?.focus({ preventScroll: true });
}

async function handleCancelPromptAction(actionId) {
  if (actionId === "dismiss_cancel_prompt") {
    updateExecutionPresentation({ type: "dismiss_cancel_prompt" });
    document.querySelector('#normalPrimaryAction[data-action="open_cancel_prompt"]')
      ?.focus({ preventScroll: true });
    return;
  }
  if (actionId !== "confirm_cancel_prompt") return;
  updateExecutionPresentation({ type: "reset" });
  elements.normalActionTitle.focus({ preventScroll: true });
  try {
    await workflowController?.cancelClone();
  } catch {
    // The controller retains the active run and reports communication uncertainty safely.
  }
}

function isDemo() {
  return appBridge?.mode === "demo";
}

function configureRuntimePresentation() {
  const demo = isDemo();
  document.body.dataset.runtimeMode = demo ? "demo" : "live";
  elements.demoBanner.hidden = !demo;
  elements.runtimeTag.textContent = demo ? "SIMULATED FLOW" : "READ-ONLY DISCOVERY";
  elements.footerBoundary.lastChild.textContent = demo
    ? " Demo build: no engine, elevation, VSS, or disk access"
    : " Default engine build: physical writes disabled";
}

function configureProductExecutionPresentation(capability) {
  if (!capability) return;
  elements.recordConfirmationButton.textContent = "Erase destination and start clone";
  if (isDemo()) {
    return;
  }
  if (capability.execution_enabled === true) {
    elements.runtimeTag.textContent = "RELEASE CANDIDATE";
    elements.footerBoundary.lastChild.textContent = " Release Candidate: product execution explicitly enabled";
  }
}

const modalPanels = Object.freeze({
  target_confirmation: elements.targetConfirmationPanel,
  expert_evidence: elements.expertEvidencePanel,
});

const modalController = createModalController({
  document,
  panels: modalPanels,
  backgroundRoots: [...document.querySelectorAll(
    ".app-window > .demo-banner, .app-window > .title-bar, .app-window > .footer, .content > :not(.modal-panel)",
  )],
  returnTargets: {
    target_confirmation: elements.preflightButton,
    expert_evidence: elements.expertEvidenceToggle,
  },
  canClose: (name) => name === "expert_evidence"
    || (!workflowIsBusy() && latestWorkflowState?.cloneStatus?.active !== true),
  onChange: (active, previousActive) => {
    if (previousActive !== "expert_evidence" || active === "expert_evidence") return;
    presentationState = reducePresentation(presentationState, {
      type: "expert_changed",
      enabled: false,
    });
    expertPresentationState = reduceExpertPresentation(expertPresentationState, { type: "closed" });
    renderProgressiveDisclosure();
  },
});

function setNerdMode(enabled) {
  if (enabled === false && modalController.active === "expert_evidence") {
    modalController.close({ restoreFocus: false });
  }
  presentationState = reducePresentation(presentationState, {
    type: "nerd_changed",
    enabled,
  });
  if (!presentationState.nerdEnabled) {
    expertPresentationState = reduceExpertPresentation(expertPresentationState, { type: "closed" });
  }
  renderProgressiveDisclosure();
  if (!presentationState.nerdEnabled) elements.nerdToggle.focus({ preventScroll: true });
}

function setExpertMode(enabled) {
  if (enabled !== true) {
    if (modalController.active === "expert_evidence") {
      modalController.close({ restoreFocus: true });
    } else {
      presentationState = reducePresentation(presentationState, {
        type: "expert_changed",
        enabled: false,
      });
      expertPresentationState = reduceExpertPresentation(expertPresentationState, { type: "closed" });
      renderProgressiveDisclosure();
    }
    return;
  }
  if (!presentationState.nerdEnabled || modalController.active !== null) {
    renderProgressiveDisclosure();
    return;
  }
  presentationState = reducePresentation(presentationState, {
    type: "expert_changed",
    enabled: true,
  });
  expertPresentationState = reduceExpertPresentation(expertPresentationState, { type: "opened" });
  renderProgressiveDisclosure();
  if (!modalController.open("expert_evidence", elements.expertEvidenceToggle)) {
    presentationState = reducePresentation(presentationState, {
      type: "expert_changed",
      enabled: false,
    });
    expertPresentationState = reduceExpertPresentation(expertPresentationState, { type: "closed" });
    renderProgressiveDisclosure();
  }
}

function selectExpertTab(tabId) {
  expertPresentationState = reduceExpertPresentation(expertPresentationState, {
    type: "tab_selected",
    tabId,
  });
  renderProgressiveDisclosure();
}

function closeExpertEvidence() {
  if (modalController.active === "expert_evidence") modalController.close({ restoreFocus: true });
}

function updateConfirmationSubmitState() {
  const workflowReady = isEvidenceReady(getWorkflowState(), Date.now());
  const ready = workflowReady &&
    elements.acknowledgeDataLoss.checked &&
    elements.acknowledgeTargetIdentity.checked &&
    elements.confirmationPhrase.value.trim() === elements.expectedConfirmationPhrase.textContent;
  elements.recordConfirmationButton.disabled = workflowIsBusy() || !ready;
}

function resetConfirmationState() {
  elements.targetConfirmationTitle.textContent = "Erase this destination and start cloning?";
  elements.confirmationSourceName.textContent = "—";
  elements.confirmationSourceIdentity.textContent = "—";
  elements.confirmationTargetName.textContent = "—";
  elements.confirmationTargetFacts.textContent = "—";
  elements.acknowledgeDataLoss.checked = false;
  elements.acknowledgeTargetIdentity.checked = false;
  elements.acknowledgeDataLoss.disabled = false;
  elements.acknowledgeTargetIdentity.disabled = false;
  elements.confirmationPhrase.value = "";
  elements.confirmationPhrase.disabled = false;
  elements.expectedConfirmationPhrase.textContent = "ERASE DISK —";
  elements.recordConfirmationButton.disabled = true;
  elements.targetConfirmationCloseButton.disabled = false;
  elements.confirmationError.hidden = true;
  elements.confirmationError.textContent = "";
}

function setLoadingState() {
  elements.refreshButton.disabled = true;
  resetConfirmationState();
  modalController.reset();
  renderNormalShell();
}

function renderTargetConfirmationDisclosure(projection) {
  resetConfirmationState();
  elements.targetConfirmationTitle.textContent = "Erase this destination and start cloning?";
  elements.erasureWarning.textContent = "Everything currently on this destination will be permanently erased. Your Windows source will not be erased.";
  elements.confirmationSourceName.textContent = projection.source.model;
  elements.confirmationSourceIdentity.textContent = projection.source.windowsLabel;
  elements.confirmationTargetName.textContent = `Disk ${projection.target.diskNumber} · ${projection.target.model}`;
  elements.confirmationTargetFacts.textContent = projection.target.capacity;
  elements.expectedConfirmationPhrase.textContent = projection.expectedPhrase;
  elements.confirmationPhrase.value = "";
  elements.acknowledgeDataLoss.checked = false;
  elements.acknowledgeTargetIdentity.checked = false;
  elements.confirmationError.hidden = true;
  elements.confirmationError.textContent = "";
  elements.recordConfirmationButton.disabled = true;
  modalController.open("target_confirmation", elements.preflightButton);
  renderActivityFeed();
  elements.footerStatus.textContent = `Final confirmation · Disk ${projection.target.diskNumber}`;
  updateConfirmationSubmitState();
}

function openTargetConfirmation() {
  if (workflowIsBusy()) return;
  const projection = workflowController.openConfirmation();
  if (!projection) return;
  renderTargetConfirmationDisclosure(projection);
}

function cancelTargetConfirmation() {
  if (workflowIsBusy()) return;
  if (!workflowController.cancelConfirmation()) return;
  resetConfirmationState();
  if (modalController.active === "target_confirmation") {
    modalController.close({ restoreFocus: true });
  }
  renderNormalShell();
}

async function recordTargetConfirmation() {
  if (workflowIsBusy() || !isEvidenceReady(getWorkflowState(), Date.now())) return;
  elements.confirmationError.hidden = true;
  elements.acknowledgeDataLoss.disabled = true;
  elements.acknowledgeTargetIdentity.disabled = true;
  elements.confirmationPhrase.disabled = true;
  elements.recordConfirmationButton.disabled = true;
  elements.targetConfirmationCloseButton.disabled = true;
  const ephemeralConfirmation = {
    typedPhrase: elements.confirmationPhrase.value,
    acknowledgeDataLoss: elements.acknowledgeDataLoss.checked,
    acknowledgeTargetIdentity: elements.acknowledgeTargetIdentity.checked,
  };
  let refocusConfirmationPhrase = false;
  try {
    const submission = workflowController.submitConfirmation(ephemeralConfirmation);
    elements.confirmationPhrase.value = "";
    ephemeralConfirmation.typedPhrase = "";
    const result = await submission;
    const workerStatus = result?.active !== undefined || result?.terminal || result?.run_id;
    if (!workerStatus) throw new Error("Clone worker did not accept the confirmed request");
    if (modalController.active === "target_confirmation") {
      modalController.reset({ restoreFocus: false });
    }
    resetConfirmationState();
    renderNormalShell();
    elements.normalActionTitle.focus({ preventScroll: true });
  } catch (rawError) {
    ephemeralConfirmation.typedPhrase = "";
    elements.confirmationPhrase.value = "";
    const error = normalizeUiError(rawError);
    const retryable = getWorkflowState()?.status === WORKFLOW_STATES.CONFIRMING
      && ["confirmation_phrase_mismatch", "confirmation_acknowledgements_missing"]
        .includes(getWorkflowState()?.confirmationError?.kind ?? rawError?.kind);
    if (retryable) {
      elements.acknowledgeDataLoss.checked = false;
      elements.acknowledgeTargetIdentity.checked = false;
      elements.confirmationError.textContent = translatedFailure(error, "confirmation_failed");
      elements.confirmationError.hidden = false;
      elements.footerStatus.textContent = "Confirmation needs your attention.";
      refocusConfirmationPhrase = true;
    } else {
      modalController.reset({ restoreFocus: true });
      elements.footerStatus.textContent = `Clone start stopped · ${translatedFailure(error, "confirmation_failed")}`;
    }
  } finally {
    elements.targetConfirmationCloseButton.disabled = false;
    if (getWorkflowState()?.status === WORKFLOW_STATES.CONFIRMING) {
      elements.acknowledgeDataLoss.disabled = false;
      elements.acknowledgeTargetIdentity.disabled = false;
      elements.confirmationPhrase.disabled = false;
      if (refocusConfirmationPhrase) elements.confirmationPhrase.focus();
    }
    updateConfirmationSubmitState();
  }
}

async function verifyCurrentBoot() {
  try {
    await workflowController?.verifyBoot();
  } catch {
    // The controller preserves clone truth and exposes the safe read-only retry state.
  }
}

function renderSuccess() {
  renderActivityFeed();
  renderNormalShell();
}

function renderFailure(rawError) {
  const error = normalizeUiError(rawError);
  renderActivityFeed();
  const currentState = getWorkflowState();
  renderNormalShell(currentState?.blockingError ? currentState : {
    ...createInitialWorkflowState(),
    status: WORKFLOW_STATES.PARTIAL_FAILURE,
    blockingError: { kind: error.kind, code: error.kind },
  });
}

function createDomSubscriber() {
  let confirmationResetSequence = -1;
  let capability = null;
  let cloneActive = false;

  return (state) => {
    latestWorkflowState = state;
    const becameActive = state.cloneStatus?.active === true && !cloneActive;
    const acceptedRunFromConfirmation = modalController.active === "target_confirmation"
      && state.cloneStatus !== null && state.cloneStatus !== undefined
      && state.status !== WORKFLOW_STATES.CONFIRMING;
    const enteredRun = becameActive || acceptedRunFromConfirmation;
    cloneActive = state.cloneStatus?.active === true;
    if (!cloneActive || state.cloneStatus?.cancellation_available !== true) {
      executionPresentationState = reduceExecutionPresentation(
        executionPresentationState,
        { type: "reset" },
      );
    }
    renderNormalShell(state);
    if (state.confirmationResetSequence !== confirmationResetSequence) {
      confirmationResetSequence = state.confirmationResetSequence;
      const retryableConfirmation = state.status === WORKFLOW_STATES.CONFIRMING
        && ["confirmation_phrase_mismatch", "confirmation_acknowledgements_missing"]
          .includes(state.confirmationError?.kind);
      if (retryableConfirmation) {
        elements.acknowledgeDataLoss.checked = false;
        elements.acknowledgeTargetIdentity.checked = false;
        elements.confirmationPhrase.value = "";
        elements.recordConfirmationButton.disabled = true;
      } else {
        if (modalController.active === "target_confirmation") {
          modalController.reset({ restoreFocus: !acceptedRunFromConfirmation });
        }
        resetConfirmationState();
      }
    }
    if (state.capability !== capability) {
      capability = state.capability;
      configureProductExecutionPresentation(capability);
    }
    if (enteredRun) elements.normalActionTitle.focus({ preventScroll: true });
    updateConfirmationSubmitState();
  };
}

async function runInspection() {
  if (workflowIsBusy()) return;
  executionPresentationState = reduceExecutionPresentation(executionPresentationState, { type: "reset" });
  setLoadingState();
  try {
    const envelope = await workflowController.refreshInspection();
    if (envelope) renderSuccess();
  } catch (error) {
    renderFailure(error);
  } finally {
    renderNormalShell();
  }
}

elements.refreshButton.addEventListener("click", runInspection);
elements.recordConfirmationButton.addEventListener("click", recordTargetConfirmation);
elements.acknowledgeDataLoss.addEventListener("change", updateConfirmationSubmitState);
elements.acknowledgeTargetIdentity.addEventListener("change", updateConfirmationSubmitState);
elements.confirmationPhrase.addEventListener("input", updateConfirmationSubmitState);
elements.targetConfirmationCloseButton.addEventListener("click", () => {
  if (modalController.active === "target_confirmation") cancelTargetConfirmation();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !event.defaultPrevented
      && modalController.active === null
      && executionPresentationState.cancelPromptOpen === true) {
    event.preventDefault();
    updateExecutionPresentation({ type: "dismiss_cancel_prompt" });
    document.querySelector('#normalPrimaryAction[data-action="open_cancel_prompt"]')
      ?.focus({ preventScroll: true });
    return;
  }
  if (event.key === "Escape" && event.defaultPrevented
      && modalController.active === null
      && getWorkflowState()?.status === WORKFLOW_STATES.CONFIRMING) {
    workflowController.cancelConfirmation();
    resetConfirmationState();
    renderNormalShell();
    if (!elements.preflightButton.disabled && !elements.preflightButton.hidden) {
      elements.preflightButton.focus();
    }
  }
});

async function initialize() {
  try {
    normalRenderer = createNormalShellRenderer({
      root: elements.appWindow,
      onSelectTarget: selectNormalTarget,
      onPrimaryAction: handleNormalPrimaryAction,
      onCancelPromptAction: handleCancelPromptAction,
      onToggleTheme: toggleNormalTheme,
    });
    nerdExpertRenderer = createNerdExpertRenderer({
      root: elements.appWindow,
      onToggleNerd: setNerdMode,
      onToggleExpert: setExpertMode,
      onSelectExpertTab: selectExpertTab,
      onCloseExpert: closeExpertEvidence,
    });
    applyThemeToDocument(document, themeState);
    renderNormalShell(null);
    activityStore = createActivityStore({ onChange: renderActivityFeed });
    latestActivitySnapshot = activityStore.getSnapshot();
    appBridge = await createAppBridge(invoke);
    configureRuntimePresentation();
    setLoadingState();
    workflowController = createWorkflowController({
      bridge: appBridge,
      activityStore,
      onStateChange: createDomSubscriber(),
    });
    await workflowController.initialize();
    const state = getWorkflowState();
    latestWorkflowState = state;
    if (state?.inspection?.value) renderSuccess();
    renderNormalShell(state);
  } catch (error) {
    const normalized = normalizeUiError(error);
    activityStore?.appendTransition({
      schema_version: 1,
      source: "ui_command",
      code: normalized.kind,
      severity: "error",
      recovered: false,
    });
    renderFailure(error);
    elements.refreshButton.disabled = true;
  }
}

window.addEventListener("beforeunload", () => {
  nerdExpertRenderer?.dispose();
  normalRenderer?.dispose();
  modalController.destroy();
  if (workflowController) workflowController.dispose();
  else activityStore?.dispose();
});
initialize();
