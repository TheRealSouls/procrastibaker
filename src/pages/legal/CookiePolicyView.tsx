import { LEGAL } from "../../config/legal";
import { LegalLayout } from "./LegalLayout";

export function CookiePolicyView() {
  return (
    <LegalLayout title="Cookie Policy">
      <p>
        This page explains how {LEGAL.appName} uses cookies and similar browser
        storage. In short: we use browser storage that is strictly necessary to
        run the app, our analytics is configured to be cookieless, and we do not
        use advertising or cross-site tracking cookies.
      </p>

      <h2>1. Strictly necessary storage</h2>
      <p>These are required for the app to function and do not require consent:</p>
      <ul>
        <li>
          <strong>Firebase Authentication</strong> — keeps you signed in (stored
          in the browser&rsquo;s IndexedDB/localStorage).
        </li>
        <li>
          <strong>App state cache</strong> — a{" "}
          <code>procrastibaker-app-state</code> localStorage entry that caches
          your progress for offline use.
        </li>
        <li>
          <strong>Google reCAPTCHA / App Check</strong> — sets a Google security
          cookie (e.g. <code>_GRECAPTCHA</code>) strictly to detect bots and
          abuse on sign-in and the feedback form.
        </li>
        <li>
          <strong>Your preferences</strong> — small localStorage entries such as
          your analytics opt-out choice.
        </li>
      </ul>

      <h2>2. Analytics (cookieless)</h2>
      <p>
        Our product analytics (PostHog, EU) is configured to use localStorage
        rather than cookies, to respect Do-Not-Track, and to disable session
        recording. Because it does not use cookies and is used for a legitimate,
        privacy-preserving purpose, it does not place tracking cookies on your
        device. You can still opt out completely in <em>Account &amp; Privacy</em>.
      </p>

      <h2>3. What we do not use</h2>
      <ul>
        <li>No advertising cookies.</li>
        <li>No cross-site or third-party marketing trackers.</li>
        <li>No social-media tracking pixels.</li>
      </ul>

      <h2>4. Do you need a cookie banner?</h2>
      <p>
        Because {LEGAL.appName} only relies on strictly necessary storage plus
        cookieless, Do-Not-Track-respecting analytics, a consent banner is not
        strictly required under the ePrivacy Directive for cookies. We instead
        give you a clear opt-out for analytics and full control over your data.
        If you later add advertising or non-essential cookies, a consent banner
        would become necessary.
      </p>

      <h2>5. Controlling storage</h2>
      <p>
        You can clear cookies and site data at any time in your browser settings
        (note: this will sign you out and clear cached progress). You can opt out
        of analytics in <em>Account &amp; Privacy</em>. Questions? Contact{" "}
        {LEGAL.contactEmail}.
      </p>
    </LegalLayout>
  );
}
