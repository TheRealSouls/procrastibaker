import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;

export const isSentryEnabled = typeof dsn === "string" && dsn.length > 0;

export function initSentry() {
  if (!isSentryEnabled) {
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1,
    integrations: [Sentry.browserTracingIntegration()],
  });
}

export function setSentryUser(uid: string) {
  if (isSentryEnabled) {
    Sentry.setUser({ id: uid });
  }
}

export function clearSentryUser() {
  if (isSentryEnabled) {
    Sentry.setUser(null);
  }
}

/** Manually report a caught error (the ErrorBoundary handles render-time ones). */
export function captureError(error: unknown) {
  if (isSentryEnabled) {
    Sentry.captureException(error);
  }
}
