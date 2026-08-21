import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import type { LeaderboardEntry, ReportReason } from "../services/friendService";
import { CrumbMap } from "./CrumbMap";
import { formatMinutes } from "../utils/sessionUtils";
import fireSprite from "../media/sprites/fire.png";

type FriendProfileModalProps = {
  uid: string;
  username: string;
  entry: LeaderboardEntry | null;
  onClose: () => void;
  // Called after a successful block so the list can drop them straight away.
  onBlocked: () => void;
};

const REASONS: ReportReason[] = ["spam", "abuse", "inappropriate", "other"];

/**
 * A friend's public profile: bio and focus stats, read from their
 * leaderboardStats document, which the rules already limit to confirmed
 * friends. Also the place to report or block them, which Play policy expects
 * anywhere users can see each other's content.
 */
export function FriendProfileModal({
  uid,
  username,
  entry,
  onClose,
  onBlocked,
}: FriendProfileModalProps) {
  const { t } = useTranslation();
  const { handleBlockUser, handleReportUser } = useApp();
  const [mode, setMode] = useState<"profile" | "report" | "block">("profile");
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function submitReport() {
    if (busy) {
      return;
    }

    setBusy(true);

    try {
      const ok = await handleReportUser(uid, username, reason, details);
      setNotice(ok ? t("profile.reportSent") : t("profile.reportFailed"));
      if (ok) {
        setMode("profile");
      }
    } finally {
      setBusy(false);
    }
  }

  async function confirmBlock() {
    if (busy) {
      return;
    }

    setBusy(true);

    try {
      const ok = await handleBlockUser(uid);
      if (ok) {
        onBlocked();
        onClose();
      } else {
        setNotice(t("profile.blockFailed"));
        setMode("profile");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-labelledby="friend-profile-title"
        aria-modal="true"
        className="confirmation-modal friend-profile"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <h2 id="friend-profile-title">{username}</h2>

        {mode === "profile" && (
          <>
            <p className="friend-profile__bio">
              {entry?.bio ? entry.bio : t("profile.noBio")}
            </p>

            <dl className="friend-profile__stats">
              <div>
                <dt>{t("profile.thisWeek")}</dt>
                <dd>{formatMinutes(entry?.weeklyMinutes ?? 0)}</dd>
              </div>
              <div>
                <dt>{t("profile.allTime")}</dt>
                <dd>{formatMinutes(entry?.totalMinutes ?? 0)}</dd>
              </div>
              <div>
                <dt>{t("profile.streak")}</dt>
                <dd>
                  <img alt="" className="streak-sprite" src={fireSprite} />
                  {entry?.streakCount ?? 0}
                </dd>
              </div>
            </dl>

            {notice && (
              <p className="auth-notice" role="status">
                {notice}
              </p>
            )}

            <CrumbMap
              compact
              counts={entry?.pastryCounts ?? {}}
              seed={uid}
              title={t("crumbMap.friendTitle", { name: username })}
            />

            <div className="friend-profile__safety">
              <button
                className="button"
                onClick={() => setMode("report")}
                type="button"
              >
                {t("profile.report")}
              </button>
              <button
                className="button tag-delete-button"
                onClick={() => setMode("block")}
                type="button"
              >
                {t("profile.block")}
              </button>
            </div>

            <div className="confirmation-modal__actions">
              <button className="button primary" onClick={onClose} type="button">
                {t("profile.close")}
              </button>
            </div>
          </>
        )}

        {mode === "report" && (
          <>
            <p>{t("profile.reportIntro", { name: username })}</p>
            <label className="friend-profile__label" htmlFor="report-reason">
              {t("profile.reportReason")}
            </label>
            <select
              className="friend-profile__select"
              id="report-reason"
              onChange={(event) => setReason(event.target.value as ReportReason)}
              value={reason}
            >
              {REASONS.map((value) => (
                <option key={value} value={value}>
                  {t(`profile.reason_${value}`)}
                </option>
              ))}
            </select>

            <label className="friend-profile__label" htmlFor="report-details">
              {t("profile.reportDetails")}
            </label>
            <textarea
              className="friend-profile__textarea"
              id="report-details"
              maxLength={500}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
              value={details}
            />

            <div className="confirmation-modal__actions">
              <button
                className="button primary"
                disabled={busy}
                onClick={() => void submitReport()}
                type="button"
              >
                {busy ? t("profile.reporting") : t("profile.submitReport")}
              </button>
              <button
                className="button"
                disabled={busy}
                onClick={() => setMode("profile")}
                type="button"
              >
                {t("common.cancel")}
              </button>
            </div>
          </>
        )}

        {mode === "block" && (
          <>
            <p>{t("profile.blockConfirm", { name: username })}</p>
            <div className="confirmation-modal__actions">
              <button
                className="button tag-delete-button"
                disabled={busy}
                onClick={() => void confirmBlock()}
                type="button"
              >
                {busy ? t("profile.blocking") : t("profile.confirmBlock")}
              </button>
              <button
                className="button"
                disabled={busy}
                onClick={() => setMode("profile")}
                type="button"
              >
                {t("common.cancel")}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
