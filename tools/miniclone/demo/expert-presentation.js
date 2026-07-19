export const EXPERT_TAB_IDS = Object.freeze([
  "system",
  "preparation",
  "run",
  "boot",
]);

export function createExpertPresentationState() {
  return Object.freeze({
    open: false,
    selectedTab: "system",
  });
}

export function reduceExpertPresentation(state, action) {
  const current = typeof state?.open === "boolean" && EXPERT_TAB_IDS.includes(state?.selectedTab)
    ? state
    : createExpertPresentationState();
  switch (action?.type) {
    case "opened":
    case "expert_opened":
      return Object.freeze({ open: true, selectedTab: "system" });
    case "closed":
    case "expert_closed":
      return createExpertPresentationState();
    case "tab_selected":
    case "expert_tab_selected":
      if (!current.open || !EXPERT_TAB_IDS.includes(action.tabId)) return current;
      return Object.freeze({ open: true, selectedTab: action.tabId });
    default:
      return current;
  }
}
