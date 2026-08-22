// Public reCAPTCHA v2 ("I'm not a robot") site key. This is safe to ship in the
// client. The matching SECRET key must never live in the frontend, it is only
// used server-side (e.g. a Cloud Function) to verify tokens against Google's
// siteverify endpoint, which this client-only app does not do yet.
export const RECAPTCHA_SITE_KEY =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY ??
  "6Lfv8SAtAAAAABXAJaw5qjMXY8BXDKN1sn6HUk73";

export const isRecaptchaConfigured =
  typeof RECAPTCHA_SITE_KEY === "string" && RECAPTCHA_SITE_KEY.length > 0;
