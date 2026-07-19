export function createPresentationState() {
  return {
    nerdEnabled: false,
    expertEnabled: false,
  };
}

export function reducePresentation(state, action) {
  const current = state ?? createPresentationState();
  switch (action?.type) {
    case "nerd_changed": {
      const nerdEnabled = action.enabled === true;
      return {
        nerdEnabled,
        expertEnabled: nerdEnabled ? current.expertEnabled : false,
      };
    }
    case "expert_changed":
      if (!current.nerdEnabled) return current;
      return {
        nerdEnabled: true,
        expertEnabled: action.enabled === true,
      };
    default:
      return current;
  }
}
