export const THEMES = Object.freeze({
  DARK: "dark",
  LIGHT: "light",
});

function validTheme(value) {
  return value === THEMES.DARK || value === THEMES.LIGHT;
}

export function createThemeState() {
  return Object.freeze({ theme: THEMES.DARK });
}

export function reduceTheme(state, action) {
  const current = validTheme(state?.theme) ? state : createThemeState();
  switch (action?.type) {
    case "theme_toggled":
      return Object.freeze({
        theme: current.theme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK,
      });
    case "theme_set":
      return validTheme(action.theme) && action.theme !== current.theme
        ? Object.freeze({ theme: action.theme })
        : current;
    default:
      return current;
  }
}

export function applyThemeToDocument(document, state) {
  const root = document?.documentElement;
  if (!root || typeof root.setAttribute !== "function" || !root.style) {
    throw new TypeError("Theme application requires a document element");
  }
  const theme = validTheme(state?.theme) ? state.theme : THEMES.DARK;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
  return theme;
}
