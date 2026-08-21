// Display and device preferences. These are per-device rather than per-account
// (a dark room and a muted laptop are properties of where you are sitting, not
// of who you are), so they live in localStorage like the reminder settings.

export type ThemePreference = "system" | "light" | "dark";
export type TodoPosition = "top" | "bottom";

export type Preferences = {
  theme: ThemePreference;
  finishSound: boolean;
  todoPosition: TodoPosition;
  showTodo: boolean;
  // Keeps the list visible on the timer screen while a bake runs.
  todoWhileBaking: boolean;
};

const STORAGE_KEY = "procrastibaker.preferences";
export const PREFERENCES_CHANGE_EVENT = "procrastibaker:preferences";

const DEFAULTS: Preferences = {
  theme: "system",
  finishSound: true,
  todoPosition: "top",
  showTodo: true,
  todoWhileBaking: false,
};

export function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return { ...DEFAULTS };
    }

    const parsed = JSON.parse(raw) as Partial<Preferences> | null;

    return {
      theme:
        parsed?.theme === "light" || parsed?.theme === "dark"
          ? parsed.theme
          : "system",
      finishSound: parsed?.finishSound !== false,
      todoPosition: parsed?.todoPosition === "bottom" ? "bottom" : "top",
      showTodo: parsed?.showTodo !== false,
      todoWhileBaking: parsed?.todoWhileBaking === true,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePreferences(prefs: Preferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    // The 'storage' event only fires in other tabs, so tell this one directly.
    window.dispatchEvent(new Event(PREFERENCES_CHANGE_EVENT));
  } catch {
    // Storage unavailable (private mode / quota); preferences just won't persist.
  }
}

/**
 * Writes the resolved theme onto <html> so the CSS variables can switch.
 * "system" follows the OS setting and keeps following it as that changes.
 */
export function applyTheme(theme: ThemePreference): void {
  if (typeof document === "undefined") {
    return;
  }

  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const resolved = theme === "system" ? (prefersDark ? "dark" : "light") : theme;

  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}
