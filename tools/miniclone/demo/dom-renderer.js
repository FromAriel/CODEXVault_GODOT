const REQUIRED_REGION_IDS = Object.freeze([
  "normalStatusText",
  "discoveryTitle",
  "discoverySummary",
  "adminPill",
  "adminLabel",
  "normalTrustChecks",
  "sourceName",
  "sourceIdentity",
  "normalSourceFacts",
  "sourcePolicyNote",
  "targetCardLabel",
  "targetHeadingTitle",
  "targetHeadingSummary",
  "normalEligibleTargets",
  "normalRefusedTargets",
  "targetCapabilityChip",
  "selectionBanner",
  "selectionName",
  "selectionDetail",
  "normalPrimaryAction",
  "normalExecutionNotice",
  "normalExecutionWarning",
  "normalCommunicationError",
  "normalProgress",
  "normalResult",
  "normalCancelPrompt",
  "normalAnnouncement",
  "normalBlockingError",
  "footerStatus",
  "themeToggle",
]);

const TRUST_CHECK_LABELS = Object.freeze([
  "Windows source found",
  "Destination selected",
  "Safety checks complete",
  "Ready for confirmation",
]);

const TRUST_STATES = new Set(["pending", "active", "complete", "blocked"]);
const RESULT_OWNED_ACTIONS = new Set(["refresh_inspection", "verify_boot", "close_application"]);

function boundedText(value, limit = 512) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  const normalized = String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(0, limit - 1))}\u2026`;
}

function findRegion(root, id) {
  if (root?.id === id) return root;
  const nested = root?.querySelector?.(`#${id}`) ?? null;
  if (nested) return nested;
  const document = root?.ownerDocument;
  return document?.getElementById?.(id) ?? null;
}

function requireRegions(root) {
  if (!root || typeof root.querySelector !== "function") {
    throw new TypeError("normal_shell_root_required");
  }
  const regions = {};
  for (const id of REQUIRED_REGION_IDS) {
    const region = findRegion(root, id);
    if (!region) throw new Error(`normal_shell_region_missing:${id}`);
    regions[id] = region;
  }
  if (regions.normalRefusedTargets.tagName !== "DETAILS") {
    throw new Error("normal_shell_refused_targets_must_be_details");
  }
  return regions;
}

function asArray(value, limit) {
  return Array.isArray(value) ? value.slice(0, limit) : [];
}

function resultOwnedAction(viewModel) {
  if (!viewModel?.result || viewModel.result.visible === false) return null;
  const action = viewModel?.primaryAction ?? viewModel?.action;
  if (!action || !RESULT_OWNED_ACTIONS.has(action.id)) return null;
  const result = viewModel?.result;
  return result && result.visible !== false ? action : null;
}

function normalizeCheck(check, index) {
  const state = TRUST_STATES.has(check?.state) ? check.state : "pending";
  return {
    label: boundedText(check?.label, 96) || TRUST_CHECK_LABELS[index],
    state,
    stateLabel: boundedText(check?.stateLabel, 48) || ({
      pending: "Waiting",
      active: "Checking",
      complete: "Complete",
      blocked: "Stopped",
    })[state],
  };
}

function normalizeTarget(target) {
  if (!target || !Number.isInteger(target.diskNumber) || target.diskNumber < 0) return null;
  const disposition = target.disposition === "requires_erase" || target.status === "Will be erased"
    ? "Will be erased"
    : "Ready";
  return {
    diskNumber: target.diskNumber,
    model: boundedText(target.model, 128) || "Storage device",
    capacity: boundedText(target.capacity, 64),
    connection: boundedText(target.connection, 64),
    disposition,
    selected: target.selected === true,
    disabled: target.disabled === true,
  };
}

function normalizeRefusedTarget(target) {
  if (!target) return null;
  return {
    model: boundedText(target.model, 128) || "Storage device",
    capacity: boundedText(target.capacity, 64),
    reason: boundedText(target.reason, 256) || "MiniClone cannot safely use this disk.",
  };
}

function eligibleTargets(viewModel) {
  const values = viewModel?.targets?.eligible
    ?? viewModel?.destinations?.eligible
    ?? viewModel?.eligibleTargets;
  return asArray(values, 64).map(normalizeTarget).filter(Boolean);
}

function refusedTargets(viewModel) {
  const values = viewModel?.targets?.refused
    ?? viewModel?.destinations?.refused
    ?? viewModel?.refusedTargets;
  return asArray(values, 64).map(normalizeRefusedTarget).filter(Boolean);
}

function createTextNode(document, tagName, className, text) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  node.textContent = boundedText(text);
  return node;
}

function normalizedTheme(themeState) {
  if (themeState?.theme === "light" || themeState?.mode === "light" || themeState?.lightEnabled === true) {
    return "light";
  }
  return "dark";
}

function progressPercent(progress) {
  if (progress?.percent === null || progress?.percent === undefined) return null;
  const value = Number(progress?.percent);
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : null;
}

function formatBytes(value) {
  if (value === null || value === undefined) return "";
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let amount = bytes;
  let unit = 0;
  while (amount >= 1000 && unit < units.length - 1) {
    amount /= 1000;
    unit += 1;
  }
  const digits = unit === 0 || amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
  return `${amount.toFixed(digits)} ${units[unit]}`;
}

function formatDuration(secondsValue) {
  if (secondsValue === null || secondsValue === undefined) return "";
  const seconds = Number(secondsValue);
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  if (seconds < 60) return `${Math.ceil(seconds)} sec remaining`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} min remaining`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.ceil((seconds % 3600) / 60);
  return `${hours} hr${hours === 1 ? "" : "s"}${minutes > 0 ? ` ${minutes} min` : ""} remaining`;
}

function resultText(value) {
  if (typeof value === "string" || typeof value === "number") return boundedText(value, 1024);
  return "";
}

/**
 * Renders the bounded Normal-mode projection into an existing persistent shell.
 * This renderer owns only the children and attributes of the contracted regions.
 */
export function createNormalShellRenderer({
  root,
  onSelectTarget = () => {},
  onPrimaryAction = () => {},
  onCancelPromptAction = () => {},
  onToggleTheme = () => {},
} = {}) {
  const regions = requireRegions(root);
  const document = root.ownerDocument ?? root;
  if (typeof document.createElement !== "function") throw new TypeError("normal_shell_document_required");
  if (typeof onSelectTarget !== "function"
    || typeof onPrimaryAction !== "function"
    || typeof onCancelPromptAction !== "function"
    || typeof onToggleTheme !== "function") {
    throw new TypeError("normal_shell_callbacks_must_be_functions");
  }

  let disposed = false;
  let listeners = [];
  let lastAnnouncement = null;
  let lastAnnouncementKey = null;

  function listen(node, eventName, callback) {
    node.addEventListener(eventName, callback);
    listeners.push(() => node.removeEventListener(eventName, callback));
  }

  function removeListeners() {
    for (const remove of listeners.splice(0)) remove();
  }

  function renderTrustChecks(viewModel) {
    const supplied = asArray(viewModel?.trustChecks, TRUST_CHECK_LABELS.length);
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < TRUST_CHECK_LABELS.length; index += 1) {
      const check = normalizeCheck(supplied[index], index);
      const row = document.createElement("div");
      row.className = "normal-trust-check";
      row.dataset.state = check.state;
      row.append(
        createTextNode(document, "span", "normal-trust-check-icon", String(index + 1).padStart(2, "0")),
        createTextNode(document, "span", "normal-trust-check-label", check.label),
        createTextNode(document, "strong", "normal-trust-check-state", check.stateLabel),
      );
      fragment.append(row);
    }
    regions.normalTrustChecks.replaceChildren(fragment);
  }

  function renderShellCopy(viewModel) {
    const header = viewModel?.header ?? {};
    const title = boundedText(header.title ?? header.status ?? viewModel?.headerStatus, 160)
      || "Starting MiniClone";
    const summary = boundedText(header.summary ?? header.status ?? viewModel?.statusText, 256)
      || "Preparing the safe disk workflow.";
    regions.discoveryTitle.textContent = title;
    regions.discoverySummary.textContent = summary;
    regions.normalStatusText.textContent = summary;
    regions.footerStatus.textContent = title;
    regions.adminPill.dataset.state = header.tone === "error"
      ? "error"
      : header.tone === "success" ? "ok" : "checking";
    regions.adminLabel.textContent = boundedText(header.badgeLabel, 96) || "Checking safely";

    const source = viewModel?.source;
    regions.sourceName.textContent = boundedText(source?.model, 128) || "Finding the Windows drive…";
    regions.sourceIdentity.textContent = source
      ? [boundedText(source.volume, 16), boundedText(source.windowsVersion, 96)].filter(Boolean).join(" · ")
      : "Waiting for verified Windows evidence";
    const shield = document.createElement("span");
    shield.className = "mini-shield";
    shield.setAttribute("aria-hidden", "true");
    shield.textContent = "✓";
    regions.sourcePolicyNote.replaceChildren(
      shield,
      document.createTextNode(` ${boundedText(source?.policyNote, 256) || "MiniClone never offers this disk as a destination."}`),
    );

    const destinationHeading = viewModel?.destinationHeading ?? {};
    regions.targetCardLabel.textContent = boundedText(destinationHeading.label, 48) || "AVAILABLE DISKS";
    regions.targetHeadingTitle.textContent = boundedText(destinationHeading.title, 128) || "Select a destination";
    regions.targetHeadingSummary.textContent = boundedText(destinationHeading.summary, 256)
      || "Choose where the Windows copy should go.";

    regions.selectionBanner.hidden = false;
    regions.selectionName.textContent = boundedText(viewModel?.actionCopy?.title, 128) || title;
    regions.selectionDetail.textContent = boundedText(viewModel?.actionCopy?.detail, 256)
      || "Choose one supported destination to continue.";
  }

  function renderSource(viewModel) {
    const source = viewModel?.source;
    const derivedFacts = source && !Array.isArray(source?.facts) ? [
      { label: "Capacity", value: source.capacity },
      { label: "Boot", value: source.bootStyle },
      { label: "Status", value: source.badge || "Protected source" },
    ] : null;
    const facts = asArray(source?.facts ?? viewModel?.sourceFacts ?? derivedFacts, 8);
    const fragment = document.createDocumentFragment();
    for (const fact of facts) {
      const label = boundedText(fact?.label, 64);
      const value = boundedText(fact?.value, 160);
      if (!label || !value) continue;
      const pair = document.createElement("div");
      pair.className = "normal-source-fact";
      const semanticList = regions.normalSourceFacts.tagName === "DL";
      pair.append(
        createTextNode(document, semanticList ? "dt" : "span", "normal-source-fact-label", label),
        createTextNode(document, semanticList ? "dd" : "strong", "normal-source-fact-value", value),
      );
      fragment.append(pair);
    }
    regions.normalSourceFacts.replaceChildren(fragment);
  }

  function renderEligible(viewModel) {
    const focusedTarget = regions.normalEligibleTargets.contains(document.activeElement)
      ? Number(document.activeElement?.dataset?.diskNumber)
      : null;
    const fragment = document.createDocumentFragment();
    const targets = eligibleTargets(viewModel);
    for (const target of targets) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "normal-target-card";
      button.dataset.selected = String(target.selected);
      button.dataset.diskNumber = String(target.diskNumber);
      button.dataset.disposition = target.disposition === "Will be erased" ? "requires_erase" : "ready_blank";
      button.setAttribute("aria-pressed", String(target.selected));
      button.disabled = target.disabled;

      const identity = document.createElement("span");
      identity.className = "normal-target-identity";
      identity.append(
        createTextNode(document, "strong", "normal-target-model", target.model),
        createTextNode(
          document,
          "span",
          "normal-target-meta",
          [target.capacity, target.connection].filter(Boolean).join(" · "),
        ),
      );
      button.append(identity, createTextNode(document, "span", "normal-target-status", target.disposition));
      listen(button, "click", () => {
        if (!disposed && !button.disabled) onSelectTarget(target.diskNumber);
      });
      fragment.append(button);
    }
    if (targets.length === 0) {
      const placeholder = document.createElement("div");
      placeholder.className = "target-placeholder";
      if (viewModel?.destinations?.pending === true) {
        const spinner = document.createElement("div");
        spinner.className = "spinner";
        spinner.setAttribute("aria-hidden", "true");
        placeholder.append(spinner);
      }
      placeholder.append(createTextNode(
        document,
        "span",
        "normal-target-empty",
        boundedText(viewModel?.destinations?.emptyMessage, 160) || "No destination disks were found.",
      ));
      fragment.append(placeholder);
    }
    regions.normalEligibleTargets.replaceChildren(fragment);
    if (Number.isInteger(focusedTarget) && focusedTarget >= 0) {
      const replacement = [...regions.normalEligibleTargets.querySelectorAll("button")]
        .find((button) => Number(button.dataset.diskNumber) === focusedTarget);
      if (replacement) replacement.focus({ preventScroll: true });
    }
  }

  function renderDestinationPolicy(viewModel) {
    const policy = viewModel?.destinationPolicy;
    const region = regions.targetCapabilityChip;
    region.textContent = boundedText(policy?.label, 48) || "NO WRITES";
    region.dataset.tone = boundedText(policy?.tone, 24) || "safe";
  }

  function renderRefused(viewModel) {
    const targets = refusedTargets(viewModel);
    const details = regions.normalRefusedTargets;
    details.hidden = targets.length === 0;
    if (targets.length === 0) {
      details.replaceChildren();
      details.removeAttribute("open");
      return;
    }

    const summary = createTextNode(
      document,
      "summary",
      "normal-refused-summary",
      `Other disks MiniClone cannot use (${targets.length})`,
    );
    const rows = document.createElement("div");
    rows.className = "normal-refused-rows";
    for (const target of targets) {
      const row = document.createElement("div");
      row.className = "normal-refused-row";
      const identity = document.createElement("span");
      identity.className = "normal-refused-identity";
      identity.append(
        createTextNode(document, "strong", "normal-refused-model", target.model),
        createTextNode(document, "span", "normal-refused-capacity", target.capacity),
      );
      row.append(identity, createTextNode(document, "span", "normal-refused-reason", target.reason));
      rows.append(row);
    }
    details.replaceChildren(summary, rows);
  }

  function renderPrimaryAction(viewModel) {
    const action = viewModel?.primaryAction ?? viewModel?.action;
    const region = regions.normalPrimaryAction;
    const buttonRegion = region.tagName === "BUTTON";
    if (!buttonRegion) region.replaceChildren();
    if (!action || Array.isArray(action) || action.visible === false || resultOwnedAction(viewModel)) {
      if (buttonRegion) {
        region.hidden = true;
        region.disabled = true;
        region.textContent = "";
        region.removeAttribute("aria-busy");
        delete region.dataset.action;
      }
      return;
    }
    const label = boundedText(action.label, 96);
    if (!label) return;

    const button = buttonRegion ? region : document.createElement("button");
    button.type = "button";
    button.className = `button normal-primary-action ${action.tone === "danger" ? "danger" : "primary"}`;
    button.hidden = false;
    button.textContent = label;
    button.disabled = action.enabled !== true;
    button.dataset.action = boundedText(action.id, 64);
    if (action.busy === true) button.setAttribute("aria-busy", "true");
    else button.removeAttribute("aria-busy");
    listen(button, "click", () => {
      if (!disposed && !button.disabled) onPrimaryAction(boundedText(action.id, 64) || null);
    });
    if (!buttonRegion) region.append(button);
  }

  function renderProgress(viewModel) {
    const progress = viewModel?.progress;
    const region = regions.normalProgress;
    const visible = Boolean(progress && progress.visible !== false);
    region.hidden = !visible;
    region.setAttribute("aria-live", "off");
    if (!visible) {
      region.replaceChildren();
      return;
    }

    const percent = progressPercent(progress);
    const track = document.createElement("div");
    track.id = "normalProgressTrack";
    track.className = "normal-progress-track";
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    const label = boundedText(progress.label ?? progress.phase, 160) || "MiniClone progress";
    track.setAttribute("aria-label", label);
    if (percent === null || progress.indeterminate === true) {
      track.setAttribute("aria-valuetext", boundedText(progress.statusText, 160) || "In progress");
    } else {
      track.setAttribute("aria-valuenow", String(Math.round(percent)));
    }

    const bar = document.createElement("span");
    bar.id = "normalProgressBar";
    bar.className = "normal-progress-bar";
    if (percent !== null && progress.indeterminate !== true) bar.style.width = `${percent}%`;
    track.append(bar);

    const text = document.createElement("p");
    text.id = "normalProgressText";
    text.className = "normal-progress-text";
    const computedMetrics = [];
    const completed = formatBytes(progress.bytesCompleted);
    const planned = formatBytes(progress.bytesPlanned);
    if (completed && planned) computedMetrics.push(`${completed} of ${planned}`);
    else if (completed) computedMetrics.push(completed);
    const rate = formatBytes(progress.rateBytesPerSecond);
    if (rate && Number(progress.rateBytesPerSecond) > 0) computedMetrics.push(`${rate}/s`);
    const eta = formatDuration(progress.etaSeconds);
    if (eta) computedMetrics.push(eta);
    const metrics = asArray(progress.metrics ?? computedMetrics, 4)
      .map((metric) => boundedText(metric, 96))
      .filter(Boolean);
    if (percent !== null && progress.indeterminate !== true) {
      track.setAttribute("aria-valuetext", [`${Math.round(percent)}%`, ...metrics].join(" · "));
    }
    text.textContent = [label, ...metrics].join(" · ");
    region.replaceChildren(track, text);
  }

  function renderExecutionMessages(viewModel) {
    const execution = viewModel?.execution ?? {};
    const messages = [
      [regions.normalExecutionNotice, execution.notice, "info"],
      [regions.normalExecutionWarning, execution.warning, "warning"],
      [regions.normalCommunicationError, execution.communicationError, "warning"],
    ];
    for (const [region, message, defaultTone] of messages) {
      const text = resultText(message?.text ?? message);
      region.hidden = !text;
      region.replaceChildren();
      if (!text) {
        delete region.dataset.tone;
        continue;
      }
      region.dataset.tone = boundedText(message?.tone, 24) || defaultTone;
      region.append(createTextNode(document, "p", null, text));
    }
  }

  function renderTruthFacts(facts, container) {
    const normalized = asArray(facts, 5)
      .map((fact) => {
        const state = ["complete", "not_complete", "not_yet", "not_proven_here"].includes(fact?.state)
          ? fact.state
          : "not_proven_here";
        return {
          id: boundedText(fact?.id, 48),
          label: boundedText(fact?.label, 96),
          state,
          stateLabel: ({
            complete: "Complete",
            not_complete: "Not complete",
            not_yet: "Not yet",
            not_proven_here: "Not proven here",
          })[state],
        };
      })
      .filter((fact) => fact.id && fact.label);
    if (normalized.length === 0) return;
    const list = document.createElement("dl");
    list.className = "normal-truth-facts";
    for (const fact of normalized) {
      const row = document.createElement("div");
      row.className = "normal-truth-fact";
      row.dataset.fact = fact.id;
      row.dataset.state = fact.state;
      row.append(
        createTextNode(document, "dt", "normal-truth-label", fact.label),
        createTextNode(document, "dd", "normal-truth-state", fact.stateLabel),
      );
      list.append(row);
    }
    container.append(list);
  }

  function renderResult(viewModel) {
    const result = viewModel?.result;
    const execution = viewModel?.execution ?? {};
    const region = regions.normalResult;
    const title = resultText(result?.title);
    const message = resultText(result?.message);
    const note = resultText(result?.note);
    const facts = execution.truthFacts ?? result?.truthFacts;
    const instructions = asArray(execution.instructions ?? result?.instructions, 5)
      .map((instruction) => boundedText(instruction, 256))
      .filter(Boolean);
    const nextStep = resultText(execution.nextStep ?? result?.nextStep);
    const visible = Boolean(result && result.visible !== false && (
      title || message || note || asArray(facts, 5).length > 0 || instructions.length > 0 || nextStep
    ));
    region.hidden = !visible;
    region.replaceChildren();
    if (!visible) return;
    region.dataset.tone = boundedText(result?.tone ?? result?.kind, 24) || "info";
    if (title) region.append(createTextNode(document, "h2", "normal-result-title", title));
    if (message) region.append(createTextNode(document, "p", "normal-result-message", message));
    if (note) region.append(createTextNode(document, "p", "normal-result-note", note));
    renderTruthFacts(facts, region);
    if (instructions.length > 0) {
      const heading = createTextNode(document, "h3", "normal-instructions-title", "Boot from the new drive");
      const list = document.createElement("ol");
      list.className = "normal-instructions";
      for (const instruction of instructions) {
        list.append(createTextNode(document, "li", null, instruction));
      }
      region.append(heading, list);
    }
    if (nextStep) region.append(createTextNode(document, "p", "normal-next-step", nextStep));

    const action = resultOwnedAction(viewModel);
    const actionLabel = boundedText(action?.label, 96);
    const actions = document.createElement("div");
    actions.className = "normal-result-actions";
    const backButton = document.createElement("button");
    backButton.id = "normalResultBackButton";
    backButton.type = "button";
    backButton.className = "button secondary normal-result-back-action";
    backButton.textContent = "Back to main";
    backButton.dataset.action = "back_to_main";
    listen(backButton, "click", () => {
      if (!disposed) onPrimaryAction("back_to_main");
    });
    actions.append(backButton);
    if (action && actionLabel) {
      const button = document.createElement("button");
      button.id = "normalResultPrimaryAction";
      button.type = "button";
      button.className = "button primary normal-result-primary-action";
      button.textContent = actionLabel;
      button.disabled = action.enabled !== true;
      button.dataset.action = boundedText(action.id, 64);
      listen(button, "click", () => {
        if (!disposed && !button.disabled) onPrimaryAction(button.dataset.action || null);
      });
      actions.append(button);
    }
    region.append(actions);
  }

  function renderCancelPrompt(viewModel) {
    const prompt = viewModel?.execution?.cancelPrompt;
    const region = regions.normalCancelPrompt;
    const focusedAction = region.contains(document.activeElement)
      ? document.activeElement?.id
      : null;
    const title = resultText(prompt?.title);
    const message = resultText(prompt?.message);
    const visible = Boolean(title && message);
    region.hidden = !visible;
    region.replaceChildren();
    if (!visible) return;

    region.setAttribute("role", "group");
    region.setAttribute("aria-labelledby", "normalCancelPromptTitle");
    const copy = document.createElement("div");
    copy.className = "normal-cancel-copy";
    const heading = createTextNode(document, "h2", "normal-cancel-title", title);
    heading.id = "normalCancelPromptTitle";
    copy.append(heading, createTextNode(document, "p", "normal-cancel-message", message));

    const actions = document.createElement("div");
    actions.className = "normal-cancel-actions";
    const keep = createTextNode(document, "button", "button primary", boundedText(prompt.keepLabel, 64) || "Keep cloning");
    keep.id = "normalCancelKeepButton";
    keep.type = "button";
    const confirm = createTextNode(document, "button", "button danger", boundedText(prompt.confirmLabel, 64) || "Stop safely");
    confirm.id = "normalCancelConfirmButton";
    confirm.type = "button";
    listen(keep, "click", () => {
      if (!disposed) onCancelPromptAction("dismiss_cancel_prompt");
    });
    listen(confirm, "click", () => {
      if (!disposed) onCancelPromptAction("confirm_cancel_prompt");
    });
    actions.append(keep, confirm);
    region.append(copy, actions);
    if (focusedAction === "normalCancelKeepButton") {
      keep.focus({ preventScroll: true });
    } else if (focusedAction === "normalCancelConfirmButton") {
      confirm.focus({ preventScroll: true });
    }
  }

  function renderAnnouncement(viewModel) {
    const announcementKey = boundedText(
      viewModel?.execution?.announcement?.key ?? viewModel?.announcement?.key,
      192,
    );
    const announcement = boundedText(
      viewModel?.execution?.announcement?.text ?? viewModel?.announcement?.text ?? viewModel?.announcement,
      512,
    );
    const region = regions.normalAnnouncement;
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    if (announcement !== lastAnnouncement || announcementKey !== lastAnnouncementKey) {
      region.textContent = announcement;
      lastAnnouncement = announcement;
      lastAnnouncementKey = announcementKey;
    }
  }

  function renderBlockingError(viewModel) {
    const errorModel = viewModel?.blockingError;
    const title = resultText(errorModel?.title);
    const error = resultText(errorModel?.message ?? errorModel);
    const region = regions.normalBlockingError;
    region.setAttribute("role", "alert");
    region.hidden = !title && !error;
    region.replaceChildren();
    if (title) region.append(createTextNode(document, "strong", "normal-blocking-error-title", title));
    if (error) region.append(createTextNode(document, "span", "normal-blocking-error-message", error));
  }

  function renderTheme(themeState) {
    const theme = normalizedTheme(themeState);
    const toggle = regions.themeToggle;
    const targetTheme = theme === "light" ? "dark" : "light";
    toggle.type = "button";
    toggle.textContent = targetTheme === "light" ? "Light theme" : "Dark theme";
    toggle.setAttribute("aria-label", toggle.textContent);
    toggle.removeAttribute("aria-pressed");
    toggle.dataset.themeTarget = targetTheme;
    listen(toggle, "click", () => {
      if (!disposed) onToggleTheme(targetTheme);
    });
  }

  function render(viewModel = {}, themeState = {}) {
    if (disposed) return false;
    removeListeners();
    renderShellCopy(viewModel);
    renderTrustChecks(viewModel);
    renderSource(viewModel);
    renderDestinationPolicy(viewModel);
    renderEligible(viewModel);
    renderRefused(viewModel);
    renderPrimaryAction(viewModel);
    renderExecutionMessages(viewModel);
    renderProgress(viewModel);
    renderResult(viewModel);
    renderCancelPrompt(viewModel);
    renderAnnouncement(viewModel);
    renderBlockingError(viewModel);
    renderTheme(themeState);
    return true;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    removeListeners();
  }

  return { render, dispose };
}
