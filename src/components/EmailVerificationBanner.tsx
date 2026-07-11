import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";

type Status = "idle" | "sending" | "sent" | "checking" | "error";

/**
 * Non-blocking nudge shown to email/password users whose address isn't verified
 * yet. Offers a resend and an "I've verified — refresh" that re-checks status;
 * on success the user object flips `emailVerified` and this unmounts itself.
 */
export function EmailVerificationBanner() {
  const { t } = useTranslation();
  const { appState, handleResendVerification, handleRefreshVerification } =
    useApp();
  const user = appState.user;
  const [status, setStatus] = useState<Status>("idle");

  if (!user || user.authProvider !== "email" || user.emailVerified) {
    return null;
  }

  async function resend() {
    setStatus("sending");
    const ok = await handleResendVerification();
    setStatus(ok ? "sent" : "error");
  }

  async function refresh() {
    setStatus("checking");
    const verified = await handleRefreshVerification();
    // On success the banner unmounts (emailVerified flips to true); otherwise
    // surface that it isn't confirmed yet.
    if (!verified) {
      setStatus("error");
    }
  }

  return (
    <div className="email-verify-banner" role="status">
      <div className="email-verify-banner__text">
        <strong>{t("verify.title")}</strong>
        <span>{t("verify.body", { email: user.email })}</span>
        {status === "sent" && (
          <span className="email-verify-banner__note">{t("verify.resent")}</span>
        )}
        {status === "error" && (
          <span className="email-verify-banner__note is-error">
            {t("verify.error")}
          </span>
        )}
      </div>
      <div className="email-verify-banner__actions">
        <button
          className="button"
          disabled={status === "sending"}
          onClick={resend}
          type="button"
        >
          {status === "sending" ? t("verify.sending") : t("verify.resend")}
        </button>
        <button
          className="button primary"
          disabled={status === "checking"}
          onClick={refresh}
          type="button"
        >
          {status === "checking" ? t("verify.checking") : t("verify.refresh")}
        </button>
      </div>
    </div>
  );
}
