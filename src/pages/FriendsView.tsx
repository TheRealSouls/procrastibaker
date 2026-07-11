import { FormEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { useFriends } from "../hooks/useFriends";
import { formatMinutes } from "../utils/sessionUtils";
import {
  totalFocusMinutes,
  weeklyFocusMinutes,
  weekKey,
} from "../utils/leaderboard";

type LeaderRow = {
  uid: string;
  username: string;
  weeklyMinutes: number;
  totalMinutes: number;
  streakCount: number;
  isMe: boolean;
};

const RESULT_KEYS = {
  sent: "friends.msgSent",
  accepted: "friends.msgAccepted",
  already: "friends.msgAlready",
  pending: "friends.msgPending",
  self: "friends.msgSelf",
  "not-found": "friends.msgNotFound",
  error: "friends.msgError",
} as const;

export function FriendsView() {
  const { t } = useTranslation();
  const { appState } = useApp();
  const user = appState.user;
  const { friends, incoming, outgoing, friendEntries, addFriend, accept, remove } =
    useFriends(user?.uid, user?.username);

  const [target, setTarget] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const currentWeek = weekKey();

  const leaderboard = useMemo<LeaderRow[]>(() => {
    const myRow: LeaderRow = {
      uid: user?.uid ?? "me",
      username: user?.username ?? "You",
      weeklyMinutes: weeklyFocusMinutes(appState.completedSessions),
      totalMinutes: totalFocusMinutes(appState.completedSessions),
      streakCount: user?.streakCount ?? 0,
      isMe: true,
    };

    const friendRows: LeaderRow[] = friendEntries.map((entry) => ({
      uid: entry.uid,
      username: entry.username,
      // A stale entry from a previous week counts as 0 focus this week.
      weeklyMinutes: entry.weekKey === currentWeek ? entry.weeklyMinutes : 0,
      totalMinutes: entry.totalMinutes,
      streakCount: entry.streakCount,
      isMe: false,
    }));

    return [myRow, ...friendRows].sort(
      (a, b) =>
        b.weeklyMinutes - a.weeklyMinutes || b.totalMinutes - a.totalMinutes,
    );
  }, [appState.completedSessions, currentWeek, friendEntries, user]);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();

    const name = target.trim();
    if (!name || busy) {
      return;
    }

    setBusy(true);
    setNotice("");

    try {
      const result = await addFriend(name);
      setNotice(t(RESULT_KEYS[result.status]));
      if (result.status === "sent" || result.status === "accepted") {
        setTarget("");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <h1>{t("friends.title")}</h1>
        <p>{t("friends.intro")}</p>
      </section>

      <section className="page-card">
        <h2>{t("friends.addHeading")}</h2>
        <form className="friends-add" onSubmit={handleAdd}>
          <label className="sr-only" htmlFor="friend-username">
            {t("friends.addLabel")}
          </label>
          <input
            autoComplete="off"
            id="friend-username"
            maxLength={32}
            onChange={(event) => {
              setTarget(event.target.value);
              setNotice("");
            }}
            placeholder={t("friends.addPlaceholder")}
            value={target}
          />
          <button className="button primary" disabled={busy} type="submit">
            {busy ? t("friends.adding") : t("friends.addButton")}
          </button>
        </form>
        {notice && (
          <p className="auth-notice" role="status">
            {notice}
          </p>
        )}
        <p className="field-hint">{t("friends.addHint")}</p>
      </section>

      {incoming.length > 0 && (
        <section className="page-card">
          <h2>{t("friends.incomingHeading")}</h2>
          <ul className="friends-list">
            {incoming.map((request) => (
              <li className="friends-list__item" key={request.id}>
                <span className="friends-list__name">{request.fromUsername}</span>
                <div className="friends-list__actions">
                  <button
                    className="button primary"
                    onClick={() => void accept(request.id)}
                    type="button"
                  >
                    {t("friends.accept")}
                  </button>
                  <button
                    className="button"
                    onClick={() => void remove(request.id)}
                    type="button"
                  >
                    {t("friends.decline")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="page-card">
        <div className="section-title-row">
          <h2>{t("friends.leaderboardHeading")}</h2>
          <span>{t("friends.leaderboardIntro")}</span>
        </div>
        <ol className="leaderboard">
          {leaderboard.map((row, index) => (
            <li
              className={
                row.isMe ? "leaderboard__row is-me" : "leaderboard__row"
              }
              key={row.uid}
            >
              <span className="leaderboard__rank">{index + 1}</span>
              <span className="leaderboard__name">
                {row.username}
                {row.isMe && (
                  <span className="leaderboard__you">{t("friends.you")}</span>
                )}
              </span>
              <span className="leaderboard__weekly">
                {formatMinutes(row.weeklyMinutes)}
              </span>
              <span className="leaderboard__streak" aria-hidden="true">
                {row.streakCount > 0 ? `🔥 ${row.streakCount}` : "—"}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="page-card">
        <h2>{t("friends.friendsHeading")}</h2>
        {friends.length === 0 ? (
          <p className="quiet-text">{t("friends.noFriends")}</p>
        ) : (
          <ul className="friends-list">
            {friends.map((friend) => (
              <li className="friends-list__item" key={friend.id}>
                <span className="friends-list__name">{friend.username}</span>
                <button
                  className="button tag-delete-button"
                  onClick={() => void remove(friend.id)}
                  type="button"
                >
                  {t("friends.remove")}
                </button>
              </li>
            ))}
          </ul>
        )}
        {outgoing.length > 0 && (
          <p className="field-hint">
            {t("friends.outgoingPending", { count: outgoing.length })}
          </p>
        )}
      </section>
    </div>
  );
}
