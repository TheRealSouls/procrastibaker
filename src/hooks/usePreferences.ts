import { useCallback, useEffect, useState } from "react";
import {
  applyTheme,
  loadPreferences,
  savePreferences,
  PREFERENCES_CHANGE_EVENT,
  type Preferences,
} from "../utils/preferences";

/**
 * Device preferences with live updates. Every consumer re-reads on the shared
 * change event, so toggling in Settings updates the rest of the app at once.
 */
export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(loadPreferences);

  useEffect(() => {
    function sync() {
      setPreferences(loadPreferences());
    }

    window.addEventListener(PREFERENCES_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(PREFERENCES_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Keep the document in step with the chosen theme, including later changes to
  // the OS setting while "system" is selected.
  useEffect(() => {
    applyTheme(preferences.theme);

    if (preferences.theme !== "system" || !window.matchMedia) {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);

    return () => media.removeEventListener("change", onChange);
  }, [preferences.theme]);

  const update = useCallback((patch: Partial<Preferences>) => {
    const next = { ...loadPreferences(), ...patch };
    savePreferences(next);
    setPreferences(next);
  }, []);

  return { preferences, update };
}
