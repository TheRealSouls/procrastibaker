import { LEGAL } from "../../config/legal";
import { LegalLayout } from "./LegalLayout";

export function TermsView() {
  return (
    <LegalLayout title="Terms of Service">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of{" "}
        {LEGAL.appName} (the &ldquo;Service&rdquo;), operated by{" "}
        {LEGAL.companyName}. Please read them carefully.
      </p>

      <h2>1. Acceptance of terms</h2>
      <p>
        By creating an account or using the Service you agree to these Terms and
        to our <a href="/privacy">Privacy Policy</a>. If you do not agree, do not
        use the Service.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You need an account (via Google or email and password) to use the
        Service. You are responsible for keeping your credentials secure and for
        activity under your account. You must provide accurate information and be
        old enough to consent to data processing in your country (at least 16
        unless a lower age applies).
      </p>

      <h2>3. Your responsibilities &amp; acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>break the law or infringe others&rsquo; rights while using the Service;</li>
        <li>
          attempt to disrupt, reverse-engineer, overload or gain unauthorized
          access to the Service or its infrastructure;
        </li>
        <li>
          submit unlawful, abusive or infringing content through the feedback
          form or the username/tag fields;
        </li>
        <li>
          use bots or automated means to create accounts or manipulate in-app
          coins, streaks or other progress.
        </li>
      </ul>

      <h2>4. In-app items</h2>
      <p>
        Coins, pastries, streaks and streak freezes are virtual items with no
        monetary value. They cannot be exchanged for cash and may be adjusted or
        reset as part of normal operation of the Service.
      </p>

      <h2>5. Intellectual property</h2>
      <p>
        The Service, including its name, design, artwork and code, is owned by
        {" "}
        {LEGAL.companyName} or its licensors and is protected by intellectual
        property laws. You may not copy, resell or create derivative works
        except as permitted by an applicable open-source licence. You retain any
        rights to content you submit (such as feedback), and grant us a licence
        to use it to operate and improve the Service.
      </p>

      <h2>6. Service availability</h2>
      <p>
        The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo; basis. We may change, suspend or discontinue features
        at any time, and we do not guarantee uninterrupted or error-free
        operation.
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, {LEGAL.companyName} is not liable
        for any indirect, incidental, or consequential damages, or for lost data
        or progress, arising from your use of the Service. Nothing in these Terms
        limits liability that cannot be limited under applicable law.
      </p>

      <h2>8. Termination</h2>
      <p>
        You may stop using the Service and delete your account at any time from
        <em> Account &amp; Privacy</em>. We may suspend or terminate accounts that
        violate these Terms or the law.
      </p>

      <h2>9. Governing law</h2>
      <p>
        These Terms are governed by the laws of {LEGAL.jurisdiction}, without
        regard to conflict-of-laws rules. Disputes will be subject to the courts
        of that jurisdiction, unless mandatory consumer-protection law provides
        otherwise.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update these Terms; continued use after changes means you accept
        the updated Terms.
      </p>

      <h2>11. Contact</h2>
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
