import { FormEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { useFriends, type Friend } from "../hooks/useFriends";
import { useGifts } from "../hooks/useGifts";
import { pastries } from "../data/pastries";
import { pastrySprites } from "../data/pastrySprites";
import type { Gift } from "../services/giftService";
import { giftableCount } from "../utils/giftableInventory";
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

const GIFT_RESULT_KEYS = {
  sent: "gifts.msgSent",
  "not-friend": "gifts.msgNotFriend",
  "no-stock": "gifts.msgNoStock",
  error: "gifts.msgError",
} as const;

function pastryName(id: string): string {
  return pastries.find((pastry) => pastry.id === id)?.name ?? id;
}

export function FriendsView() {
  const { t } = useTranslation();
  const { appState, handleSendGift, handleClaimGift } = useApp();
  const user = appState.user;
  const { friends, incoming, outgoing, friendEntries, addFriend, accept, remove } =
    useFriends(user?.uid, user?.username);
  const { incomingGifts } = useGifts(user?.uid);

  const [target, setTarget] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [giftTarget, setGiftTarget] = useState<Friend | null>(null);
  const [giftBusy, setGiftBusy] = useState(false);
  const [giftNotice, setGiftNotice] = useState("");
  const [claimBusyId, setClaimBusyId] = useState("");
  const [claimNotice, setClaimNotice] = useState("");

  // Pastry types you have baked stock of, most-stocked first.
  const giftableList = useMemo(
    () =>
      Object.entries(appState.giftablePastries)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]),
    [appState.giftablePastries],
  );

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

  async function handlePickGift(pastryId: string) {
    if (!giftTarget || giftBusy) {
      return;
    }

    setGiftBusy(true);

    try {
      const result = await handleSendGift(
        giftTarget.uid,
        giftTarget.username,
        pastryId,
      );
      setGiftNotice(t(GIFT_RESULT_KEYS[result.status]));
      if (result.status === "sent") {
        setGiftTarget(null);
      }
    } finally {
      setGiftBusy(false);
    }
  }

  async function handleClaim(gift: Gift) {
    if (claimBusyId) {
      return;
    }

    const alreadyOwned = appState.unlockedPastryIds.includes(gift.pastryId);
    setClaimBusyId(gift.id);

    try {
      await handleClaimGift(gift);
      setClaimNotice(
        alreadyOwned
          ? t("gifts.gotStock", { pastry: pastryName(gift.pastryId) })
          : t("gifts.unlocked", { pastry: pastryName(gift.pastryId) }),
      );
    } finally {
      setClaimBusyId("");
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

      {incomingGifts.length > 0 && (
        <section className="page-card">
          <h2>{t("gifts.inboxHeading")}</h2>
          <ul className="gift-inbox">
            {incomingGifts.map((gift) => (
              <li className="gift-inbox__item" key={gift.id}>
                <img
                  alt=""
                  aria-hidden="true"
                  className="gift-inbox__sprite"
                  src={pastrySprites[gift.pastryId]}
                />
                <span className="gift-inbox__text">
                  {t("gifts.received", {
                    from: gift.fromUsername,
                    pastry: pastryName(gift.pastryId),
                  })}
                </span>
                <button
                  className="button primary"
                  disabled={claimBusyId === gift.id}
                  onClick={() => void handleClaim(gift)}
                  type="button"
                >
                  {claimBusyId === gift.id
                    ? t("gifts.claiming")
                    : t("gifts.claim")}
                </button>
              </li>
            ))}
          </ul>
          {claimNotice && (
            <p className="auth-notice" role="status">
              {claimNotice}
            </p>
          )}
        </section>
      )}

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
                {row.streakCount > 0 ? `🔥 ${row.streakCount}` : ", "}
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
                <div className="friends-list__actions">
                  <button
                    className="button"
                    onClick={() => {
                      setGiftTarget(friend);
                      setGiftNotice("");
                    }}
                    type="button"
                  >
                    🎁 {t("gifts.sendButton")}
                  </button>
                  <button
                    className="button tag-delete-button"
                    onClick={() => void remove(friend.id)}
                    type="button"
                  >
                    {t("friends.remove")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {outgoing.length > 0 && (
          <p className="field-hint">
            {t("friends.outgoingPending", { count: outgoing.length })}
          </p>
        )}
        {giftNotice && (
          <p className="auth-notice" role="status">
            {giftNotice}
          </p>
        )}
      </section>

      {giftTarget && (
        <div
          className="gift-picker-backdrop"
          onClick={() => {
            if (!giftBusy) {
              setGiftTarget(null);
            }
          }}
          role="presentation"
        >
          <div
            className="gift-picker"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h2 className="gift-picker__title">
              {t("gifts.pickHeading", { name: giftTarget.username })}
            </h2>
            <p className="field-hint">{t("gifts.pickIntro")}</p>
            {giftableList.length === 0 ? (
              <p className="auth-error" role="status">
                {t("gifts.noneBaked")}
              </p>
            ) : (
              <ul className="gift-picker__grid">
                {giftableList.map(([id, count]) => (
                  <li key={id}>
                    <button
                      className="gift-picker__pastry"
                      disabled={giftBusy || giftableCount(appState.giftablePastries, id) <= 0}
                      onClick={() => void handlePickGift(id)}
                      type="button"
                    >
                      <img alt="" aria-hidden="true" src={pastrySprites[id]} />
                      <span>{pastryName(id)}</span>
                      <span className="gift-picker__count">×{count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              className="button"
              disabled={giftBusy}
              onClick={() => setGiftTarget(null)}
              type="button"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
