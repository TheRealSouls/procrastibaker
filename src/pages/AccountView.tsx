import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { exportUserData } from "../services/accountService";
import {
  isAnalyticsOptedOut,
  setAnalyticsOptedOut,
} from "../services/analytics";
import { saveReminderSettings } from "../services/reminderSyncService";
import { usePreferences } from "../hooks/usePreferences";
import { BIO_MAX_LENGTH } from "../services/userProfileService";
import {
  loadReminderPrefs,
  saveReminderPrefs,
  type ReminderPrefs,
} from "../utils/reminderStorage";

type Busy = "idle" | "exporting" | "deleting";

export function AccountView() {
  const { t } = useTranslation();
  const {
    appState,
    handlePasswordReset,
    handleDeleteAccount,
    handleBioChange,
    handleResendVerification,
    handleRefreshVerification,
    isAuthLoading,
    authNotice,
    authError,
  } = useApp();
  const [verifyStatus, setVerifyStatus] = useState<
    "idle" | "sending" | "sent" | "failed" | "checking" | "still-unverified"
  >("idle");
  const [verifyMessage, setVerifyMessage] = useState("");
  const { preferences, update: updatePreferences } = usePreferences();
  const [bioDraft, setBioDraft] = useState(appState.user?.bio ?? "");
  const [bioStatus, setBioStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const user = appState.user;
  const isEmailUser = user?.authProvider === "email";

  const [busy, setBusy] = useState<Busy>("idle");
  const [exportError, setExportError] = useState("");
  const [optedOut, setOptedOut] = useState(isAnalyticsOptedOut());

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  if (!user) {
    return null;
  }

  async function saveBio() {
    setBioStatus("saving");
    const ok = await handleBioChange(bioDraft);
    setBioStatus(ok ? "saved" : "failed");
  }

  async function resendVerification() {
    setVerifyStatus("sending");
    setVerifyMessage("");
    const result = await handleResendVerification();

    if (result.ok) {
      setVerifyStatus("sent");
      setVerifyMessage(t("account.emailVerifySent"));
      return;
    }

    setVerifyStatus("failed");
    setVerifyMessage(result.message ?? t("account.emailVerifyFailed"));
  }

  async function refreshVerification() {
    setVerifyStatus("checking");
    setVerifyMessage("");
    const verified = await handleRefreshVerification();

    // When it succeeds the pill flips to verified on its own, so only the
    // still-unverified case needs saying out loud.
    if (!verified) {
      setVerifyStatus("still-unverified");
      setVerifyMessage(t("account.emailVerifyStillPending"));
    } else {
      setVerifyStatus("idle");
    }
  }

  async function handleExport() {
    if (!user?.uid) {
      return;
    }

    setBusy("exporting");
    setExportError("");

    try {
      const data = await exportUserData(user.uid);

      if (!data) {
        setExportError(t("account.exportError"));
        return;
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `procrastibaker-data-${user.uid}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportError(t("account.exportError"));
    } finally {
      setBusy("idle");
    }
  }

  function toggleAnalytics(nextOptedOut: boolean) {
    setAnalyticsOptedOut(nextOptedOut);
    setOptedOut(nextOptedOut);
  }

  async function handleConfirmDelete() {
    setDeleteError("");
    setBusy("deleting");

    try {
      const result = await handleDeleteAccount(
        isEmailUser ? deletePassword : undefined,
      );

      if (result.status === "password-required") {
        setDeleteError(t("account.passwordRequired"));
      } else if (result.status === "error") {
        setDeleteError(result.message ?? t("account.genericError"));
      }
      // On success the handler navigates away, nothing more to do here.
    } finally {
      setBusy("idle");
    }
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <h1>{t("account.title")}</h1>
        <p>{t("account.intro")}</p>
      </section>

      <section className="page-card account-section">
        <h2>{t("account.detailsHeading")}</h2>
        <dl className="account-details">
          <div>
            <dt>{t("account.username")}</dt>
            <dd>{user.username}</dd>
          </div>
          <div>
            <dt>{t("account.email")}</dt>
            <dd>{user.email || t("account.emailNotSet")}</dd>
          </div>
          <div>
            <dt>{t("account.emailVerifiedLabel")}</dt>
            <dd>
              <span
                className={`verify-pill${
                  user.emailVerified ? " is-verified" : " is-unverified"
                }`}
              >
                <i
                  aria-hidden="true"
                  className={
                    user.emailVerified
                      ? "fa-solid fa-circle-check"
                      : "fa-solid fa-circle-exclamation"
                  }
                />
                {user.emailVerified
                  ? t("account.emailVerifiedYes")
                  : t("account.emailVerifiedNo")}
              </span>
            </dd>
          </div>
          <div>
            <dt>{t("account.signInMethod")}</dt>
            <dd>
              {isEmailUser ? t("account.methodEmail") : t("account.methodGoogle")}
            </dd>
          </div>
        </dl>

        {isEmailUser && !user.emailVerified && (
          <div className="account-verify">
            <p className="field-hint">{t("account.emailVerifyBody")}</p>
            <div className="account-verify__actions">
              <button
                className="button"
                disabled={verifyStatus === "sending"}
                onClick={resendVerification}
                type="button"
              >
                {verifyStatus === "sending"
                  ? t("account.emailVerifySending")
                  : t("account.emailVerifySend")}
              </button>
              <button
                className="button"
                disabled={verifyStatus === "checking"}
                onClick={refreshVerification}
                type="button"
              >
                {verifyStatus === "checking"
                  ? t("account.emailVerifyChecking")
                  : t("account.emailVerifyRefresh")}
              </button>
            </div>
            {verifyMessage && (
              <p
                className={
                  verifyStatus === "sent" ? "auth-notice" : "auth-error"
                }
                role="status"
              >
                {verifyMessage}
              </p>
            )}
          </div>
        )}

        <p className="account-hint">
          {t("account.changeUsernamePrefix")}{" "}
          <Link to="/dashboard">{t("account.dashboardWord")}</Link>.
        </p>
      </section>

      <section className="page-card account-section">
        <h2>{t("account.bioHeading")}</h2>
        <p>{t("account.bioBody")}</p>
        <label className="sr-only" htmlFor="account-bio">
          {t("account.bioHeading")}
        </label>
        <textarea
          className="account-bio"
          id="account-bio"
          maxLength={BIO_MAX_LENGTH}
          onChange={(event) => {
            setBioDraft(event.target.value);
            setBioStatus("idle");
          }}
          rows={3}
          value={bioDraft}
        />
        <p className="field-hint">
          {t("account.bioCount", {
            count: BIO_MAX_LENGTH - bioDraft.length,
          })}
        </p>
        {bioStatus === "saved" && (
          <p className="auth-notice" role="status">
            {t("account.bioSaved")}
          </p>
        )}
        {bioStatus === "failed" && (
          <p className="auth-error" role="alert">
            {t("account.bioFailed")}
          </p>
        )}
        <button
          className="button primary"
          disabled={bioStatus === "saving" || bioDraft === (user.bio ?? "")}
          onClick={() => void saveBio()}
          type="button"
        >
          {bioStatus === "saving" ? t("account.bioSaving") : t("common.save")}
        </button>
      </section>

      <section className="page-card account-section">
        <h2>{t("account.exportHeading")}</h2>
        <p>{t("account.exportBody")}</p>
        {exportError && (
          <p className="auth-error" role="alert">
            {exportError}
          </p>
        )}
        <button
          className="button"
          disabled={busy === "exporting"}
          onClick={handleExport}
          type="button"
        >
          {busy === "exporting"
            ? t("account.exportPreparing")
            : t("account.exportBtn")}
        </button>
      </section>

      <section className="page-card account-section">
        <h2>{t("account.changePasswordHeading")}</h2>
        {isEmailUser ? (
          <>
            <p>
              {t("account.resetEmailPrefix")} <strong>{user.email}</strong>.
            </p>
            {authNotice && (
              <p className="auth-notice" role="status">
                {authNotice}
              </p>
            )}
            {authError && (
              <p className="auth-error" role="alert">
                {authError}
              </p>
            )}
            <button
              className="button"
              disabled={isAuthLoading}
              onClick={() => handlePasswordReset(user.email)}
              type="button"
            >
              {isAuthLoading
                ? t("account.sendingReset")
                : t("account.sendResetBtn")}
            </button>
          </>
        ) : (
          <p>{t("account.googlePasswordNote")}</p>
        )}
      </section>

      <section className="page-card account-section">
        <h2>{t("account.privacyHeading")}</h2>
        <label className="account-toggle">
          <input
            checked={optedOut}
            onChange={(event) => toggleAnalytics(event.target.checked)}
            type="checkbox"
          />
          <span>{t("account.analyticsToggle")}</span>
        </label>
      </section>

      <section className="page-card account-section">
        <h2>{t("account.appearanceHeading")}</h2>

        <label className="account-field" htmlFor="theme-select">
          {t("account.themeLabel")}
        </label>
        <select
          className="friend-profile__select"
          id="theme-select"
          onChange={(event) =>
            updatePreferences({
              theme: event.target.value as typeof preferences.theme,
            })
          }
          value={preferences.theme}
        >
          <option value="system">{t("account.themeSystem")}</option>
          <option value="light">{t("account.themeLight")}</option>
          <option value="dark">{t("account.themeDark")}</option>
        </select>

        <label className="account-toggle">
          <input
            checked={preferences.finishSound}
            onChange={(event) =>
              updatePreferences({ finishSound: event.target.checked })
            }
            type="checkbox"
          />
          <span>{t("account.finishSoundToggle")}</span>
        </label>

        <label className="account-toggle">
          <input
            checked={preferences.showTodo}
            onChange={(event) =>
              updatePreferences({ showTodo: event.target.checked })
            }
            type="checkbox"
          />
          <span>{t("account.showTodoToggle")}</span>
        </label>

        {preferences.showTodo && (
          <>
            <label className="account-field" htmlFor="todo-position">
              {t("account.todoPositionLabel")}
            </label>
            <select
              className="friend-profile__select"
              id="todo-position"
              onChange={(event) =>
                updatePreferences({
                  todoPosition: event.target
                    .value as typeof preferences.todoPosition,
                })
              }
              value={preferences.todoPosition}
            >
              <option value="top">{t("account.todoTop")}</option>
              <option value="bottom">{t("account.todoBottom")}</option>
            </select>
          </>
        )}
      </section>

      <ReminderSettings />

      <section
        aria-labelledby="danger-zone-heading"
        className="page-card account-section account-danger danger-zone"
      >
        <div className="danger-zone__header">
          <i aria-hidden="true" className="fa-solid fa-triangle-exclamation" />
          <h2 id="danger-zone-heading">{t("account.dangerZone")}</h2>
        </div>
        <p className="danger-zone__lead">{t("account.dangerZoneBody")}</p>

        <h3 className="danger-zone__action">{t("account.deleteHeading")}</h3>
        <p>{t("account.deleteBody")}</p>

        {!confirmingDelete ? (
          <button
            className="button danger"
            onClick={() => {
              setConfirmingDelete(true);
              setDeleteError("");
            }}
            type="button"
          >
            {t("account.deleteBtn")}
          </button>
        ) : (
          <div className="account-danger__confirm">
            {isEmailUser ? (
              <div className="feedback-field">
                <label htmlFor="delete-password">
                  {t("account.confirmPasswordLabel")}
                </label>
                <input
                  autoComplete="current-password"
                  id="delete-password"
                  onChange={(event) => setDeletePassword(event.target.value)}
                  type="password"
                  value={deletePassword}
                />
              </div>
            ) : (
              <p>{t("account.googleReconfirm")}</p>
            )}

            {deleteError && (
              <p className="auth-error" role="alert">
                {deleteError}
              </p>
            )}

            <div className="account-danger__actions">
              <button
                className="button danger"
                disabled={busy === "deleting"}
                onClick={handleConfirmDelete}
                type="button"
              >
                {busy === "deleting"
                  ? t("account.deleting")
                  : t("account.confirmDeleteBtn")}
              </button>
              <button
                className="button"
                disabled={busy === "deleting"}
                onClick={() => {
                  setConfirmingDelete(false);
                  setDeletePassword("");
                  setDeleteError("");
                }}
                type="button"
              >
                {t("account.cancel")}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ReminderSettings() {
  const { t } = useTranslation();
  const { appState } = useApp();
  const uid = appState.user?.uid;
  const supported =
    typeof window !== "undefined" && "Notification" in window;
  const [permission, setPermission] = useState<NotificationPermission | null>(
    supported ? Notification.permission : null,
  );
  const [prefs, setPrefs] = useState(loadReminderPrefs);
  const blocked = supported && permission === "denied";

  // Backfill the server copy (and refresh the timezone offset) once we know the
  // user, so the scheduled push function has current settings even if the user
  // last changed them before this feature, or from another device.
  useEffect(() => {
    if (uid) {
      void saveReminderSettings(uid, prefs);
    }
    // Only on uid change, later edits sync through the handlers below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  function persist(next: ReminderPrefs) {
    setPrefs(next);
    saveReminderPrefs(next);
    if (uid) {
      void saveReminderSettings(uid, next);
    }
  }

  async function handleToggle(enabled: boolean) {
    if (enabled && supported && permission !== "granted") {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        persist({ ...prefs, enabled: false });
        return;
      }
    }

    persist({ ...prefs, enabled });
  }

  function handleTime(time: string) {
    persist({ ...prefs, time });
  }

  return (
    <section className="page-card account-section">
      <h2>{t("account.reminderHeading")}</h2>
      <p>{t("account.reminderBody")}</p>

      {!supported && (
        <p className="field-hint">{t("account.reminderUnsupported")}</p>
      )}
      {blocked && <p className="field-hint">{t("account.reminderBlocked")}</p>}

      <label className="account-toggle">
        <input
          checked={prefs.enabled}
          disabled={!supported || blocked}
          onChange={(event) => void handleToggle(event.target.checked)}
          type="checkbox"
        />
        <span>{t("account.reminderToggle")}</span>
      </label>

      {prefs.enabled && (
        <div className="reminder-time">
          <label htmlFor="reminder-time">
            {t("account.reminderTimeLabel")}
          </label>
          <input
            id="reminder-time"
            onChange={(event) => handleTime(event.target.value)}
            type="time"
            value={prefs.time}
          />
        </div>
      )}
    </section>
  );
}
