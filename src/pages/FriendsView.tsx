import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { useFriends, type Friend } from "../hooks/useFriends";
import { useGifts } from "../hooks/useGifts";
import { FriendProfileModal } from "../components/FriendProfileModal";
import { pastries } from "../data/pastries";
import { pastrySprites } from "../data/pastrySprites";
import type { Gift } from "../services/giftService";
import { searchUsernames, type UsernameMatch } from "../services/friendService";
import { giftableEntries } from "../utils/giftableInventory";
import fireSprite from "../media/sprites/fire.png";
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
  const {
    friends,
    incoming,
    outgoing,
    friendEntries,
    error: friendsError,
    addFriend,
    accept,
    remove,
  } = useFriends(user?.uid, user?.username);
  const { incomingGifts } = useGifts(user?.uid);

  const [target, setTarget] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [giftTarget, setGiftTarget] = useState<Friend | null>(null);
  const [giftBusy, setGiftBusy] = useState(false);
  const [giftNotice, setGiftNotice] = useState("");
  const [claimBusyId, setClaimBusyId] = useState("");
  const [claimNotice, setClaimNotice] = useState("");
  const [profileFriend, setProfileFriend] = useState<Friend | null>(null);
  const [matches, setMatches] = useState<UsernameMatch[]>([]);
  const [searching, setSearching] = useState(false);

  // Debounced prefix search, so typing a name suggests real accounts instead of
  // requiring it to be spelled exactly.
  useEffect(() => {
    const term = target.trim();

    if (term.length < 2) {
      setMatches([]);
      return;
    }

    setSearching(true);
    const handle = window.setTimeout(async () => {
      const found = await searchUsernames(term, user?.uid ?? "");
      setMatches(found);
      setSearching(false);
    }, 250);

    return () => {
      window.clearTimeout(handle);
      setSearching(false);
    };
  }, [target, user?.uid]);

  async function requestFriend(username: string) {
    if (busy) {
      return;
    }

    setBusy(true);
    setNotice("");

    try {
      const result = await addFriend(username);
      setNotice(t(RESULT_KEYS[result.status]));
      if (result.status === "sent" || result.status === "accepted") {
        setTarget("");
        setMatches([]);
      }
    } finally {
      setBusy(false);
    }
  }

  // Derived from completed sessions plus the gift ledger, so every bake counts,
  // including ones finished before gifting existed.
  const giftableList = useMemo(
    () => giftableEntries(appState.completedSessions, appState.giftablePastries),
    [appState.completedSessions, appState.giftablePastries],
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

      {/* A failed listener used to leave the lists silently empty, which reads
          identically to simply having no friends yet. */}
      {friendsError && (
        <p className="auth-error" role="alert">
          {t("friends.loadError")}
        </p>
      )}

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
        {matches.length > 0 && (
          <ul className="friend-search__results">
            {matches.map((match) => {
              const existing = friends.find((item) => item.uid === match.uid);

              return (
                <li className="friend-search__result" key={match.uid}>
                  <span className="friend-search__name">{match.username}</span>
                  {existing ? (
                    <button
                      className="button"
                      onClick={() => setProfileFriend(existing)}
                      type="button"
                    >
                      {t("friends.viewProfile")}
                    </button>
                  ) : (
                    <button
                      className="button primary"
                      disabled={busy}
                      onClick={() => void requestFriend(match.username)}
                      type="button"
                    >
                      {t("friends.addButton")}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {!searching && matches.length === 0 && target.trim().length >= 2 && (
          <p className="field-hint">{t("friends.noMatches")}</p>
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
                {row.streakCount > 0 ? (
                  <>
                    <img alt="" className="streak-sprite" src={fireSprite} />
                    {row.streakCount}
                  </>
                ) : (
                  "·"
                )}
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
                <button
                  className="friends-list__profile"
                  onClick={() => setProfileFriend(friend)}
                  type="button"
                >
                  <span className="friends-list__name friends-list__name-button">
                    {friend.username}
                  </span>
                  <span className="friends-list__bio">
                    {friend.bio || t("friends.noBio")}
                  </span>
                </button>
                <div className="friends-list__actions">
                  <button
                    className="button"
                    onClick={() => {
                      setGiftTarget(friend);
                      setGiftNotice("");
                    }}
                    type="button"
                  >
                    {t("gifts.sendButton")}
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

      {profileFriend && (
        <FriendProfileModal
          entry={
            friendEntries.find((item) => item.uid === profileFriend.uid) ?? null
          }
          onBlocked={() => remove(profileFriend.id)}
          onClose={() => setProfileFriend(null)}
          uid={profileFriend.uid}
          username={profileFriend.username}
        />
      )}

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
                      disabled={giftBusy}
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
