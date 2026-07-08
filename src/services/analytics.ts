import posthog from "posthog-js";
import type { User } from "../types";
import { clearSentryUser, setSentryUser } from "../utils/sentry";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST =
  import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

// User-controlled analytics opt-out (GDPR right to object). Persisted locally so
// the choice survives reloads and is honoured before PostHog captures anything.
const ANALYTICS_OPT_OUT_KEY = "procrastibaker-analytics-optout";

let analyticsReady = false;

export function isAnalyticsOptedOut(): boolean {
  try {
    return localStorage.getItem(ANALYTICS_OPT_OUT_KEY) === "true";
  } catch {
    return false;
  }
}

/** Toggle analytics on/off from the Account & Privacy screen. */
export function setAnalyticsOptedOut(optedOut: boolean) {
  try {
    localStorage.setItem(ANALYTICS_OPT_OUT_KEY, String(optedOut));
  } catch {
    // Ignore storage errors (e.g. private mode).
  }

  if (analyticsReady) {
    if (optedOut) {
      posthog.opt_out_capturing();
    } else {
      posthog.opt_in_capturing();
    }
  }
}

export function initAnalytics() {
  if (
    analyticsReady ||
    typeof POSTHOG_KEY !== "string" ||
    POSTHOG_KEY.length === 0
  ) {
    return;
  }

  // Lean & cookieless: no cookies, no session replay, respect Do-Not-Track,
  // and capture page views manually.
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    persistence: "localStorage",
    respect_dnt: true,
    disable_session_recording: true,
    capture_pageview: false,
    capture_pageleave: false,
  });

  analyticsReady = true;

  // Honour a previously-saved opt-out immediately, before any event fires.
  if (isAnalyticsOptedOut()) {
    posthog.opt_out_capturing();
  }
}

/** Tie the current user to both PostHog and Sentry (uid + provider only — no PII). */
export function identifyUser(user: Pick<User, "uid" | "authProvider">) {
  if (!user.uid) {
    return;
  }

  setSentryUser(user.uid);

  if (analyticsReady) {
    posthog.identify(user.uid, { authProvider: user.authProvider });
  }
}

export function trackEvent(name: string, props?: Record<string, unknown>) {
  if (analyticsReady) {
    posthog.capture(name, props);
  }
}

export function trackView(view: string) {
  trackEvent("$pageview", { view });
}

/** Clears identity on sign-out so the next user isn't merged with this one. */
export function resetAnalytics() {
  clearSentryUser();

  if (analyticsReady) {
    posthog.reset();
  }
}
