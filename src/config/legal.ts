// Central place for the legal/contact details that a human must fill in before
// a public launch. Everything in square brackets is a PLACEHOLDER, replace it
// with your real company information (see COMPLIANCE.md → Manual Actions).
export const LEGAL = {
  appName: "Procrastibaker",
  companyName: "Procrastibaker",
  contactEmail: "matas.roda@gmail.com",
  businessAddress: "",
  jurisdiction: "Ireland",
  effectiveDate: "8 July 2026",
  // The public site this policy applies to.
  siteUrl: "https://procrastibaker-d3c13-40511.web.app",
} as const;

// Third-party processors that actually receive data, kept in one place so the
// policy pages and COMPLIANCE.md stay in sync with reality.
export const THIRD_PARTY_PROCESSORS = [
  {
    name: "Google Firebase (Authentication, Cloud Firestore, Hosting, App Check)",
    purpose: "Account sign-in, storing your profile/sessions, serving the app, bot protection",
    data: "Email, account identifier (uid), profile + study data, IP address",
    region: "Google LLC, global infrastructure",
    policy: "https://firebase.google.com/support/privacy",
  },
  {
    name: "Google reCAPTCHA (v3 App Check + v2 on the feedback form)",
    purpose: "Protecting sign-in and the feedback form from bots and abuse",
    data: "Device/usage signals, IP address",
    region: "Google LLC",
    policy: "https://policies.google.com/privacy",
  },
  {
    name: "PostHog (EU Cloud)",
    purpose: "Privacy-friendly product analytics (which features are used)",
    data: "Account identifier (uid), sign-in method, in-app events, IP address",
    region: "European Union",
    policy: "https://posthog.com/privacy",
  },
  {
    name: "Sentry (EU region)",
    purpose: "Error and crash reporting to keep the app stable and secure",
    data: "Account identifier (uid), error details, browser/device metadata",
    region: "European Union",
    policy: "https://sentry.io/privacy/",
  },
  {
    name: "Formspree",
    purpose: "Delivering the messages you submit through the in-app feedback form",
    data: "Feedback message, category, and (if signed in) your email and username",
    region: "United States",
    policy: "https://formspree.io/legal/privacy-policy/",
  },
  {
    name: "Google Fonts & Font Awesome (CDN assets)",
    purpose: "Loading fonts and icons used by the interface",
    data: "IP address (standard web request metadata)",
    region: "Google LLC / Fonticons, Inc.",
    policy: "https://policies.google.com/privacy",
  },
] as const;

// Bundled third-party content that requires (or benefits from) attribution.
// The lo-fi tracks in /public/sounds/lofi are from Pixabay (royalty-free under
// the Pixabay Content License; attribution appreciated).
export const MUSIC_ATTRIBUTIONS = [
  { artist: "Alex Morgan", source: "Pixabay", url: "https://pixabay.com/users/alex-morgan-54692529/" },
  { artist: "FASSounds", source: "Pixabay", url: "https://pixabay.com/users/fassounds-3433550/" },
  { artist: "Shinji (lofi_music_library)", source: "Pixabay", url: "https://pixabay.com/users/lofi_music_library-4546859/" },
  { artist: "BFCMUSIC", source: "Pixabay", url: "https://pixabay.com/users/bfcmusic-16674938/" },
] as const;
