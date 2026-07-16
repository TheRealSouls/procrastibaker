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
    isAuthLoading,
    authNotice,
    authError,
  } = useApp();
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
      // On success the handler navigates away — nothing more to do here.
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
            <dd>{user.email || "—"}</dd>
          </div>
          <div>
            <dt>{t("account.signInMethod")}</dt>
            <dd>
              {isEmailUser ? t("account.methodEmail") : t("account.methodGoogle")}
            </dd>
          </div>
        </dl>
        <p className="account-hint">
          {t("account.changeUsernamePrefix")}{" "}
          <Link to="/dashboard">{t("account.dashboardWord")}</Link>.
        </p>
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

      <ReminderSettings />

      <section className="page-card account-section account-danger">
        <h2>{t("account.deleteHeading")}</h2>
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
  // last changed them before this feature — or from another device.
  useEffect(() => {
    if (uid) {
      void saveReminderSettings(uid, prefs);
    }
    // Only on uid change — later edits sync through the handlers below.
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
