# Procrastibaker — Compliance & Privacy Notes

This document records what Procrastibaker actually does with data, the compliance
work that has been implemented in the codebase, and the **manual actions a human
must complete before a public/production launch**. It is written to be accurate
to the current code — it does not describe features the app does not have.

> ⚠️ This is engineering documentation, **not legal advice**. Have a qualified
> lawyer review the policy pages and the items in [Manual Actions](#manual-actions)
> before you rely on them.

---

## 1. What the app collects and why

Procrastibaker is a single-page React app hosted on Firebase Hosting. There is no
custom backend server — all data flows go directly from the browser to managed
third-party services.

| Data | Where it lives | Why |
| --- | --- | --- |
| Email address | Firebase Authentication + `users/{uid}` profile | Sign-in, account identity |
| Account identifier (`uid`) | Firebase Auth, Firestore, PostHog, Sentry | Ties your data together |
| Username | `users/{uid}` profile | Display name in-app |
| Study sessions, tags, coins, streak, unlocked pastries, audio settings | `users/{uid}` + subcollections in Cloud Firestore | The core product state |
| Feedback messages | Formspree (email delivery) | Delivering feedback you choose to send |
| Product-analytics events (feature usage, sign-in method) | PostHog (EU) | Understanding which features are used |
| Error/crash reports | Sentry (EU) | Keeping the app stable |
| IP address (request metadata) | All of the above, inherently | Standard web-request metadata |

**What the app does NOT do** (verified against the codebase): no payments, no
advertising / ad networks, no location tracking, no file/photo uploads, no
third-party social tracking pixels, no AI processing of user data, no selling of
data, no session recording / replay.

### Legal basis (GDPR Art. 6)
- **Contract** — account, profile, and study data are needed to provide the app.
- **Legitimate interests** — security (App Check/reCAPTCHA), error monitoring, and
  privacy-friendly analytics. Analytics can be switched off by the user (see §4).

---

## 2. Third-party processors

Kept in code at [`src/config/legal.ts`](src/config/legal.ts) (`THIRD_PARTY_PROCESSORS`)
so the Privacy Policy page and this file stay in sync:

- **Google Firebase** (Auth, Firestore, Hosting, App Check) — global.
- **Google reCAPTCHA** — v3 via App Check + v2 on the feedback form.
- **PostHog** — product analytics, **EU Cloud**.
- **Sentry** — error reporting, **EU region**.
- **Formspree** — feedback delivery, **US**.
- **Google Fonts & Font Awesome** — CDN assets (fonts/icons); see the IP note.

**International transfers:** Formspree (US) and Google's global infrastructure may
process data outside the EEA. Confirm the appropriate transfer mechanism (SCCs /
adequacy) with each provider before launch.

---

## 3. Cookies & local storage

Procrastibaker uses **no advertising or cross-site tracking cookies**. Storage in
use (documented on the Cookie Policy page):

- **Firebase Auth** — IndexedDB, keeps you signed in (strictly necessary).
- `procrastibaker-app-state` — localStorage app cache (strictly necessary).
- `procrastibaker-analytics-optout` — localStorage, remembers your analytics choice.
- **reCAPTCHA** (`_GRECAPTCHA`) — set by Google for bot protection.
- **PostHog** is configured **cookieless** (`persistence: "localStorage"`,
  `respect_dnt: true`, no session recording, manual pageviews) — see
  [`src/services/analytics.ts`](src/services/analytics.ts).

Because analytics is cookieless and limited to strictly-necessary + first-party
storage, a blocking cookie-consent banner is **not strictly required** under the
lean cookieless model chosen. **Confirm this position for your target
jurisdictions** — some DPAs still expect notice/controls for any analytics.

---

## 4. Data-subject rights — implemented in-app

All available on the **Account & Privacy** page (`/account`, signed-in):
[`src/pages/AccountView.tsx`](src/pages/AccountView.tsx).

- **Access / portability** — "Download my data" exports profile + sessions + tags
  as JSON ([`src/services/accountService.ts`](src/services/accountService.ts) →
  `exportUserData`).
- **Erasure** — "Delete my account" re-authenticates the user, deletes all
  Firestore data (`deleteAllUserData`, batched), then deletes the Auth account and
  clears local + analytics identity (`AppContext.handleDeleteAccount`).
- **Rectification** — username is editable from the dashboard; password reset email
  from the Account page (email users) or via Google (Google users).
- **Right to object / opt-out of analytics** — a toggle calls
  `setAnalyticsOptedOut()` → `posthog.opt_out_capturing()`. The choice is persisted
  and honoured on every load *before* any event fires.

Re-authentication for deletion is handled in
[`src/utils/authService.ts`](src/utils/authService.ts)
(`reauthenticateCurrentUser`, `deleteCurrentUser`).

---

## 5. Legal pages

Public, no sign-in required, linked from the landing footer and the login page:

- `/privacy` — [`PrivacyPolicyView`](src/pages/legal/PrivacyPolicyView.tsx)
- `/terms` — [`TermsView`](src/pages/legal/TermsView.tsx)
- `/cookies` — [`CookiePolicyView`](src/pages/legal/CookiePolicyView.tsx)

They read company/contact/jurisdiction from `LEGAL` in
[`src/config/legal.ts`](src/config/legal.ts) — fill in the placeholders (§Manual).

---

## 6. Security review

- **Auth** — Google + email/password only; **no anonymous/guest accounts**.
  Passwords enforced client-side at sign-up (≥8, upper, lower, number;
  [`src/utils/validation.ts`](src/utils/validation.ts)); Firebase enforces its own
  minimum server-side.
- **Firestore rules** — owner-only access with a strict `hasOnly` field whitelist
  ([`firestore.rules`](firestore.rules)). Deploy with
  `firebase deploy --only firestore:rules` after any profile-field change.
- **App Check** — reCAPTCHA v3 protects Firestore
  ([`src/utils/firebase.ts`](src/utils/firebase.ts)).
- **No dangerous sinks** — no `dangerouslySetInnerHTML`, `eval`, or `document.cookie`
  writes in app code (React escaping is relied upon).
- **Secrets** — only *public* keys ship to the client (Firebase config, reCAPTCHA
  **site** keys, PostHog key, Sentry DSN). reCAPTCHA **secret** keys and the Sentry
  auth token are console/build-only and must never be committed. `.env.local` is
  gitignored.
- **Security headers** — added to [`firebase.json`](firebase.json):
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Strict-Transport-Security`, and a restrictive `Permissions-Policy`.
  **A Content-Security-Policy is NOT yet set** — it needs testing against Firebase,
  Google APIs, reCAPTCHA, PostHog, Sentry, Formspree, Fonts, and Font Awesome
  origins before enabling to avoid breaking the app. Treat CSP as a follow-up.

---

## 7. Third-party content attributions

Lo-fi background tracks in `public/sounds/lofi/` are from **Pixabay** (royalty-free
under the Pixabay Content License; attribution is appreciated, not strictly
required). Recorded in `MUSIC_ATTRIBUTIONS` in
[`src/config/legal.ts`](src/config/legal.ts):

- Alex Morgan — Pixabay
- FASSounds — Pixabay
- Shinji (lofi_music_library) — Pixabay
- BFCMUSIC — Pixabay

> When the in-app lo-fi player UI is built, surface these credits in the player
> (e.g. an "About the music" link) to honour the attributions.

---

## 8. Compliance scorecard

Indicative maturity of the **codebase** (not a legal certification). Scores assume
the Manual Actions below are completed.

| Area | Score | Notes |
| --- | --- | --- |
| Data-subject rights (access/export/erase/object) | 9 / 10 | Implemented in-app; erasure is self-service. |
| Privacy transparency (policies) | 8 / 10 | Pages complete; need real company details + legal review. |
| Cookies / tracking | 8 / 10 | Cookieless analytics + opt-out; confirm banner stance per jurisdiction. |
| Authentication & access control | 9 / 10 | No guests, strong-password rules, owner-only rules, App Check. |
| Data protection / storage | 8 / 10 | Managed EU analytics/errors; confirm US transfer (Formspree) mechanism. |
| Transport & headers security | 7 / 10 | HSTS + hardening headers added; CSP still to be tested/enabled. |
| **Overall** | **~8 / 10** | Production-ready pending Manual Actions + legal sign-off. |

---

## Manual Actions

Complete these before a public launch:

1. **Fill in `LEGAL` placeholders** in [`src/config/legal.ts`](src/config/legal.ts):
   `companyName`, `contactEmail`, `businessAddress`, `jurisdiction`,
   `effectiveDate`.
2. **Legal review** of `/privacy`, `/terms`, `/cookies` by a qualified lawyer for
   your jurisdiction(s).
3. **Confirm the cookie-consent position** (§3) for your target markets; add a
   banner if your DPA requires one for analytics.
4. **Confirm international-transfer mechanisms** with Formspree (US) and Google.
5. **Decide on a DPO / privacy contact** and make sure `contactEmail` reaches them.
6. **App Check enforcement** — move Firestore App Check from *monitor* to *enforce*
   in the Firebase console once real traffic looks healthy.
7. **Design & test a Content-Security-Policy** (§6) and add it to `firebase.json`.
8. **Deploy** updated Firestore rules and Hosting config:
   `firebase deploy --only firestore:rules,hosting`.
9. **Data-processing agreements** — ensure DPAs are in place with Firebase/Google,
   PostHog, Sentry, and Formspree.
10. **Attribute the lo-fi music** in the player UI when it ships (§7).
