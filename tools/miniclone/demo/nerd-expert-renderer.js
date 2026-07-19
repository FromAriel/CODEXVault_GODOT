const TAB_IDS = Object.freeze(["system", "preparation", "run", "boot"]);
const STATUS_LABELS = Object.freeze({
  current: "Current",
  complete: "Complete",
  warning: "Warning",
  pending: "Pending",
  unavailable: "Unavailable",
  recovered: "Recovered",
});

function boundedText(value, limit = 512) {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
    return "";
  }
  const text = String(value)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .trim();
  return text.length <= limit ? text : `${text.slice(0, Math.max(0, limit - 1))}\u2026`;
}

function asArray(value, limit) {
  return Array.isArray(value) ? value.slice(0, limit) : [];
}

function requireNode(root, selector) {
  const node = root.querySelector(selector);
  if (!node) throw new Error(`nerd_expert_region_missing:${selector}`);
  return node;
}

function createTextNode(document, tagName, className, text) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  node.textContent = boundedText(text);
  return node;
}

function normalizedStatus(value) {
  const status = boundedText(value, 32).toLowerCase();
  return Object.hasOwn(STATUS_LABELS, status) ? status : "unavailable";
}

function normalizedTab(viewModel, tabId) {
  const tab = asArray(viewModel?.tabs, 4).find((candidate) => candidate?.id === tabId);
  return tab ?? {
    id: tabId,
    label: tabId[0].toUpperCase() + tabId.slice(1),
    sections: [],
  };
}

function appendEvidenceRows(document, sectionNode, rows) {
  const normalizedRows = asArray(rows, 64).filter((row) => row && typeof row === "object");
  if (normalizedRows.length === 0) {
    const empty = document.createElement("p");
    empty.className = "expert-empty-evidence";
    empty.textContent = "No evidence is available for this section yet.";
    sectionNode.append(empty);
    return;
  }

  const list = document.createElement("dl");
  list.className = "expert-evidence-rows";
  for (const row of normalizedRows) {
    const label = boundedText(row.label ?? row.name ?? row.key, 128);
    const value = boundedText(row.value ?? row.text ?? row.statusLabel, 1024);
    if (!label || !value) continue;
    const item = document.createElement("div");
    item.className = "expert-evidence-row";
    item.append(
      createTextNode(document, "dt", null, label),
      createTextNode(document, "dd", null, value),
    );
    list.append(item);
  }
  if (list.children.length === 0) {
    appendEvidenceRows(document, sectionNode, []);
    return;
  }
  sectionNode.append(list);
}

function tableCellValue(row, column, index) {
  if (Array.isArray(row)) return row[index];
  if (!row || typeof row !== "object") return "";
  const key = typeof column === "object" ? column.key : column;
  const value = row[key] ?? row.cells?.[index];
  if (value && typeof value === "object") return value.value ?? value.text ?? "";
  return value;
}

function appendEvidenceTables(document, sectionNode, tables) {
  for (const tableModel of asArray(tables, 64)) {
    if (!tableModel || typeof tableModel !== "object") continue;
    const columns = asArray(tableModel.columns, 16);
    const rows = asArray(tableModel.rows, 200);
    if (columns.length === 0 || rows.length === 0) continue;
    const wrapper = document.createElement("div");
    wrapper.className = "expert-table-wrap";
    const title = boundedText(tableModel.title, 128);
    if (title) wrapper.append(createTextNode(document, "h4", null, title));
    const table = document.createElement("table");
    table.className = "expert-evidence-table";
    const header = document.createElement("thead");
    const headerRow = document.createElement("tr");
    for (const column of columns) {
      const heading = createTextNode(
        document,
        "th",
        null,
        typeof column === "object" ? column.label : column,
      );
      heading.scope = "col";
      headerRow.append(heading);
    }
    header.append(headerRow);
    const body = document.createElement("tbody");
    for (const row of rows) {
      const bodyRow = document.createElement("tr");
      columns.forEach((column, index) => {
        bodyRow.append(createTextNode(document, "td", null, tableCellValue(row, column, index)));
      });
      body.append(bodyRow);
    }
    table.append(header, body);
    wrapper.append(table);
    sectionNode.append(wrapper);
  }
}

function renderEvidencePanel(document, panel, tab) {
  const fragment = document.createDocumentFragment();
  const sections = asArray(tab.sections, 32);
  const projected = sections.length > 0 ? sections : [{
    id: `${tab.id}_unavailable`,
    title: `${tab.label} evidence`,
    status: "unavailable",
    rows: [],
    tables: [],
  }];
  for (const section of projected) {
    const status = normalizedStatus(section?.status);
    const article = document.createElement("article");
    article.className = "expert-evidence-section";
    article.dataset.status = status;
    const heading = document.createElement("div");
    heading.className = "expert-section-head";
    heading.append(
      createTextNode(document, "h3", null, boundedText(section?.title, 160) || "Evidence"),
      createTextNode(document, "span", "expert-status-chip", STATUS_LABELS[status]),
    );
    article.append(heading);
    appendEvidenceRows(document, article, section?.rows);
    appendEvidenceTables(document, article, section?.tables);
    fragment.append(article);
  }
  panel.replaceChildren(fragment);
}

export function createNerdExpertRenderer({
  root,
  onToggleNerd = () => {},
  onToggleExpert = () => {},
  onSelectExpertTab = () => {},
  onCloseExpert = () => {},
} = {}) {
  if (!root || typeof root.querySelector !== "function") {
    throw new TypeError("nerd_expert_root_required");
  }
  for (const callback of [onToggleNerd, onToggleExpert, onSelectExpertTab, onCloseExpert]) {
    if (typeof callback !== "function") throw new TypeError("nerd_expert_callbacks_must_be_functions");
  }

  const document = root.ownerDocument ?? root;
  const nodes = {
    trustRegion: requireNode(root, "#normalTrustRegion"),
    nerdToggle: requireNode(root, "#nerdToggle"),
    normalVisual: requireNode(root, "#normalTrustVisual"),
    normalCopy: requireNode(root, "#normalTrustCopy"),
    nerdContent: requireNode(root, "#normalNerdTrustContent"),
    nerdCurrent: requireNode(root, "#nerdCurrentActivity"),
    nerdList: requireNode(root, "#nerdActivityList"),
    expertToggle: requireNode(root, "#expertEvidenceToggle"),
    expertPanel: requireNode(root, "#expertEvidencePanel"),
    expertClose: requireNode(root, "#expertEvidenceCloseButton"),
  };
  const tabs = new Map();
  const panels = new Map();
  for (const tabId of TAB_IDS) {
    const name = tabId[0].toUpperCase() + tabId.slice(1);
    tabs.set(tabId, requireNode(root, `#expertTab${name}`));
    panels.set(tabId, requireNode(root, `#expertTabPanel${name}`));
  }

  let disposed = false;
  let listeners = [];

  function listen(node, event, callback) {
    node.addEventListener(event, callback);
    listeners.push(() => node.removeEventListener(event, callback));
  }

  function clearListeners() {
    for (const remove of listeners.splice(0)) remove();
  }

  function renderNerd(viewModel, presentationState) {
    const enabled = presentationState?.nerdEnabled === true;
    nodes.nerdToggle.setAttribute("aria-pressed", String(enabled));
    nodes.nerdToggle.setAttribute("aria-expanded", String(enabled));
    nodes.normalVisual.hidden = enabled;
    nodes.normalCopy.hidden = enabled;
    nodes.nerdContent.hidden = !enabled;
    nodes.trustRegion.setAttribute(
      "aria-labelledby",
      enabled ? "nerdTrustTitle" : "discoveryTitle",
    );
    nodes.expertToggle.checked = enabled && presentationState?.expertEnabled === true;
    nodes.expertToggle.disabled = !enabled;

    const current = viewModel?.current;
    const currentText = boundedText(current?.text, 512) || "MiniClone is working safely.";
    const label = createTextNode(document, "span", null, "CURRENT");
    const text = createTextNode(document, "strong", null, currentText);
    nodes.nerdCurrent.dataset.severity = boundedText(current?.severity, 24) || "info";
    nodes.nerdCurrent.replaceChildren(label, text);

    const fragment = document.createDocumentFragment();
    for (const entry of asArray(viewModel?.prior, 11)) {
      const item = createTextNode(document, "li", null, entry?.text);
      item.dataset.severity = boundedText(entry?.severity, 24) || "info";
      fragment.append(item);
    }
    nodes.nerdList.replaceChildren(fragment);

    listen(nodes.nerdToggle, "click", () => {
      if (!disposed) onToggleNerd(!enabled);
    });
    listen(nodes.expertToggle, "change", () => {
      if (!disposed && enabled) onToggleExpert(nodes.expertToggle.checked === true);
    });
  }

  function renderExpert(viewModel, presentationState, expertPresentationState) {
    const nerdEnabled = presentationState?.nerdEnabled === true;
    const expertEnabled = nerdEnabled && presentationState?.expertEnabled === true;
    const open = expertEnabled && expertPresentationState?.open === true;
    const requestedTab = boundedText(expertPresentationState?.selectedTab, 32).toLowerCase();
    const selectedTab = TAB_IDS.includes(requestedTab) ? requestedTab : "system";
    nodes.expertToggle.checked = expertEnabled;
    nodes.expertToggle.setAttribute("aria-expanded", String(open));
    nodes.expertPanel.dataset.presentationOpen = String(open);

    for (const tabId of TAB_IDS) {
      const tabButton = tabs.get(tabId);
      const tabPanel = panels.get(tabId);
      const selected = tabId === selectedTab;
      tabButton.setAttribute("aria-selected", String(selected));
      tabButton.tabIndex = selected ? 0 : -1;
      tabPanel.hidden = !open || !selected;
      if (open && selected) {
        renderEvidencePanel(document, tabPanel, normalizedTab(viewModel, tabId));
      } else {
        tabPanel.replaceChildren();
      }

      if (!open) continue;

      listen(tabButton, "click", () => {
        if (!disposed) onSelectExpertTab(tabId);
      });
      listen(tabButton, "keydown", (event) => {
        const index = TAB_IDS.indexOf(tabId);
        let next = null;
        if (event.key === "ArrowRight") next = TAB_IDS[(index + 1) % TAB_IDS.length];
        else if (event.key === "ArrowLeft") next = TAB_IDS[(index - 1 + TAB_IDS.length) % TAB_IDS.length];
        else if (event.key === "Home") next = TAB_IDS[0];
        else if (event.key === "End") next = TAB_IDS.at(-1);
        if (!next) return;
        event.preventDefault();
        if (!disposed) onSelectExpertTab(next);
        tabs.get(next)?.focus({ preventScroll: true });
      });
    }

    if (!open) return;
    listen(nodes.expertClose, "click", () => {
      if (!disposed) onCloseExpert();
    });
  }

  function render({
    presentationState = {},
    expertPresentationState = {},
    nerdViewModel = {},
    expertViewModel = {},
  } = {}) {
    if (disposed) return false;
    clearListeners();
    renderNerd(nerdViewModel, presentationState);
    renderExpert(expertViewModel, presentationState, expertPresentationState);
    return true;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    clearListeners();
  }

  return Object.freeze({ render, dispose });
}
