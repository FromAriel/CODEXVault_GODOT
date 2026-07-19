const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableElements(panel) {
  return [...panel.querySelectorAll(FOCUSABLE_SELECTOR)].filter((element) =>
    !element.hidden && !element.closest("[hidden]") && element.getAttribute("aria-hidden") !== "true");
}

function setBackgroundInert(element, inert) {
  element.inert = inert;
  if (inert) {
    element.setAttribute("inert", "");
    element.setAttribute("aria-hidden", "true");
  } else {
    element.removeAttribute("inert");
    element.removeAttribute("aria-hidden");
  }
}

export function createModalController({
  document,
  panels,
  backgroundRoots,
  returnTargets = {},
  canClose = () => true,
  onChange = () => {},
}) {
  let active = null;
  let returnFocus = null;

  function focusPanel(name) {
    const panel = panels[name];
    const focusables = focusableElements(panel);
    const target = focusables[0] ?? panel;
    if (target === panel && !panel.hasAttribute("tabindex")) panel.setAttribute("tabindex", "-1");
    target.focus();
  }

  function render(previousActive = active) {
    for (const [name, panel] of Object.entries(panels)) {
      const isActive = name === active;
      panel.hidden = !isActive;
      panel.setAttribute("aria-hidden", String(!isActive));
      panel.inert = !isActive;
      if (isActive) panel.removeAttribute("inert");
      else panel.setAttribute("inert", "");
    }
    for (const root of backgroundRoots) setBackgroundInert(root, active !== null);
    document.body.classList.toggle("modal-open", active !== null);
    document.body.dataset.modal = active ?? "none";
    onChange(active, previousActive);
  }

  function activate(name, { replace = false, returnTarget = null } = {}) {
    if (!(name in panels)) throw new Error(`Unsupported modal state: ${name}`);
    if (active !== null && active !== name && !replace) return false;
    if (active === null) returnFocus = returnTarget ?? returnTargets[name] ?? document.activeElement;
    if (replace && returnTarget) returnFocus = returnTarget;
    const previousActive = active;
    active = name;
    render(previousActive);
    focusPanel(name);
    return true;
  }

  function close({ force = false, restoreFocus = true } = {}) {
    if (active === null) return true;
    if (!force && !canClose(active)) return false;
    const previousActive = active;
    const target = returnFocus;
    active = null;
    returnFocus = null;
    render(previousActive);
    if (restoreFocus && target?.isConnected && !target.disabled && !target.hidden) target.focus();
    return true;
  }

  function handleKeydown(event) {
    if (active === null) return;
    if (event.key === "Escape") {
      if (canClose(active)) {
        event.preventDefault();
        close();
      }
      return;
    }
    if (event.key !== "Tab") return;
    const panel = panels[active];
    const focusables = focusableElements(panel);
    if (focusables.length === 0) {
      event.preventDefault();
      focusPanel(active);
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  document.addEventListener("keydown", handleKeydown);
  render();

  return Object.freeze({
    get active() {
      return active;
    },
    open(name, returnTarget = null) {
      return activate(name, { returnTarget });
    },
    replace(name, returnTarget = null) {
      return activate(name, { replace: true, returnTarget });
    },
    close,
    reset({ restoreFocus = false } = {}) {
      return close({ force: true, restoreFocus });
    },
    destroy() {
      document.removeEventListener("keydown", handleKeydown);
      close({ force: true, restoreFocus: false });
    },
  });
}
