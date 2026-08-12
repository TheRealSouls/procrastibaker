import { LEGAL, THIRD_PARTY_PROCESSORS } from "../../config/legal";
import { LegalLayout } from "./LegalLayout";

export function PrivacyPolicyView() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        This Privacy Policy explains what information {LEGAL.appName} (&ldquo;we&rdquo;,
        &ldquo;us&rdquo;) collects, why we collect it and the choices you have.
        It describes only functionality that the app actually provides.
        {LEGAL.appName} is operated by {LEGAL.companyName}.
      </p>

      <h2>1. Data we collect</h2>
      <p>We only collect what the app needs to work:</p>
      <ul>
        <li>
          <strong>Account data</strong>, your email address and, for
          email/password accounts, a securely hashed password (managed by
          Google Firebase Authentication; we never see or store your raw
          password). Google sign-in provides your email and display name.
        </li>
        <li>
          <strong>Profile &amp; progress</strong>, your chosen username, in-app
          coins, unlocked/selected pastries, audio settings, study streak, and
          your study sessions and custom study tags.
        </li>
        <li>
          <strong>Feedback</strong>, if you use the feedback form, the message,
          the category and (when signed in) your email and username.
        </li>
        <li>
          <strong>Product &amp; diagnostic data</strong>, anonymous-ish usage
          events tied to your account identifier (e.g. &ldquo;bake completed&rdquo;),
          plus error/crash reports. See &sect;4.
        </li>
        <li>
          <strong>Technical data</strong>, our processors receive your IP
          address and standard browser metadata as part of ordinary web requests
          and abuse prevention.
        </li>
      </ul>
      <p>
        We do <strong>not</strong> collect location/GPS data, we do not run
        advertising, we do not use AI features, we do not accept file uploads,
        and we do not process real-money payments (coins are an in-app virtual
        reward with no monetary value).
      </p>

      <h2>2. Why we collect it &amp; legal basis (GDPR Art. 6)</h2>
      <ul>
        <li>
          <strong>Providing the service</strong> (accounts, saving your bakery
          and study progress), <em>performance of a contract</em>.
        </li>
        <li>
          <strong>Security &amp; abuse prevention</strong> (reCAPTCHA / App Check,
          error monitoring), <em>legitimate interests</em> and legal obligation.
        </li>
        <li>
          <strong>Product analytics</strong>, <em>legitimate interests</em> in
          improving the app, using privacy-friendly, cookieless analytics that
          respects your browser&rsquo;s Do-Not-Track signal. You can opt out at
          any time in <em>Account &amp; Privacy</em>.
        </li>
        <li>
          <strong>Feedback</strong>, <em>legitimate interests</em> / your
          consent when you choose to contact us.
        </li>
      </ul>

      <h2>3. Cookies &amp; local storage</h2>
      <p>
        {LEGAL.appName} does not set advertising or cross-site tracking cookies.
        Essential functionality uses browser storage (localStorage/IndexedDB) to
        keep you signed in and cache your progress. Analytics is configured to be
        cookieless. Google reCAPTCHA sets a security cookie strictly to fight
        abuse. See our <a href="/cookies">Cookie Policy</a> for details.
      </p>

      <h2>4. Third-party services (processors)</h2>
      <p>We share the minimum necessary data with these providers:</p>
      <ul>
        {THIRD_PARTY_PROCESSORS.map((processor) => (
          <li key={processor.name}>
            <strong>{processor.name}</strong>, {processor.purpose}. Data:{" "}
            {processor.data}. Region: {processor.region}.{" "}
            <a href={processor.policy} rel="noreferrer" target="_blank">
              Privacy policy
            </a>
            .
          </li>
        ))}
      </ul>

      <h2>5. Analytics</h2>
      <p>
        We use PostHog (EU) for privacy-friendly product analytics. It records
        which features are used, tied to your account identifier, not your name.
        Session recording is disabled, and Do-Not-Track is respected. You can opt
        out entirely in <em>Account &amp; Privacy</em>.
      </p>

      <h2>6. Your rights</h2>
      <p>
        Under the GDPR and similar laws you can access, correct, export, delete,
        restrict or object to the processing of your data. In the app you can:
      </p>
      <ul>
        <li>
          <strong>Access &amp; portability</strong>, export all your data as JSON
          from <em>Account &amp; Privacy</em>.
        </li>
        <li>
          <strong>Erasure</strong>, permanently delete your account and all
          associated data from <em>Account &amp; Privacy</em>.
        </li>
        <li>
          <strong>Rectification</strong>, update your username from your
          Dashboard and your password via the reset flow.
        </li>
        <li>
          <strong>Object / restrict</strong>, opt out of analytics at any time.
        </li>
      </ul>
      <p>
        To exercise any right or to complain to a supervisory authority, contact
        us at <strong>{LEGAL.contactEmail}</strong>.
      </p>

      <h2>7. Data retention</h2>
      <p>
        We keep your account and study data for as long as your account exists.
        When you delete your account, your profile, study sessions and tags are
        removed from our database and your authentication record is deleted.
        Backups and processor logs may persist for a limited period before being
        overwritten. Feedback messages are retained by our form provider.
      </p>

      <h2>8. International transfers</h2>
      <p>
        Some providers (e.g. Firebase, Formspree) may process data outside your
        country, including in the United States. Where required, such transfers
        rely on appropriate safeguards such as the EU Standard Contractual
        Clauses. Analytics and error tracking are hosted in the EU.
      </p>

      <h2>9. Children&rsquo;s privacy</h2>
      <p>
        {LEGAL.appName} is intended for students aged 16 and over (or the minimum
        digital-consent age in your country). We do not knowingly collect data
        from children below that age. If you believe a child has provided us
        data, contact {LEGAL.contactEmail} and we will delete it.
      </p>

      <h2>10. Security</h2>
      <p>
        Data is transmitted over HTTPS. Passwords are hashed by Firebase
        Authentication. Access to your data is restricted by server-side security
        rules so that only you can read or write it, and requests are protected
        by App Check. See our security summary in the project&rsquo;s COMPLIANCE
        documentation.
      </p>

      <h2>11. Changes to this policy</h2>
      <p>
        We may update this policy; the &ldquo;Effective&rdquo; date above will
        change and material changes will be surfaced in the app.
      </p>

      <h2>12. Contact</h2>
      <p>
        {LEGAL.companyName}
        <br />
        {LEGAL.businessAddress && (
          <>
            {LEGAL.businessAddress}
            <br />
          </>
        )}
        {LEGAL.contactEmail}
      </p>
    </LegalLayout>
  );
}
