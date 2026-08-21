import { loadPreferences } from "./preferences";

// Comfortable rather than startling: this fires the moment a session ends, often
// with headphones on.
const FINISH_VOLUME = 0.45;

let element: HTMLAudioElement | null = null;

/**
 * Plays the session-complete chime, unless the user has turned it off.
 * Reuses one element so repeated plays do not stack up, and never throws: a
 * blocked autoplay must not interrupt saving the session.
 */
export function playFinishSound(): void {
  if (typeof window === "undefined" || !loadPreferences().finishSound) {
    return;
  }

  try {
    if (!element) {
      element = new Audio("/sounds/finish_sound.mp3");
      element.preload = "auto";
    }

    element.volume = FINISH_VOLUME;
    element.currentTime = 0;
    void element.play().catch(() => undefined);
  } catch {
    // Audio unavailable; the session still completes normally.
  }
}
