import { useCallback, useEffect, useMemo, useState } from "react";
import {
  acceptFriendRequest,
  ensureUsernameClaim,
  fetchLeaderboardEntries,
  listenToReceivedLinks,
  listenToSentLinks,
  removeFriendLink,
  sendFriendRequest,
  type FriendRequest,
  type LeaderboardEntry,
  type SendRequestResult,
} from "../services/friendService";

export type Friend = {
  id: string; // the friendRequests doc id (for removal)
  uid: string;
  username: string;
  bio: string;
};

/**
 * Subscribes to the current user's friend links (sent + received) and derives
 * friends / incoming / outgoing lists, plus the friends' leaderboard entries.
 * Two single-field listeners keep this index-free.
 */
export function useFriends(uid?: string, username?: string) {
  const [sent, setSent] = useState<FriendRequest[]>([]);
  const [received, setReceived] = useState<FriendRequest[]>([]);
  const [friendEntries, setFriendEntries] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!uid) {
      setSent([]);
      setReceived([]);
      return;
    }

    if (username) {
      void ensureUsernameClaim(uid, username);
    }

    const unsubSent = listenToSentLinks(uid, setSent, (err) =>
      setError(err.message),
    );
    const unsubReceived = listenToReceivedLinks(uid, setReceived, (err) =>
      setError(err.message),
    );

    return () => {
      unsubSent();
      unsubReceived();
    };
  }, [uid, username]);

  const incoming = useMemo(
    () => received.filter((request) => request.status === "pending"),
    [received],
  );
  const outgoing = useMemo(
    () => sent.filter((request) => request.status === "pending"),
    [sent],
  );

  // Raw links only. Names here are the snapshot taken when the request was
  // created, so they are used for identity and never for display.
  const friendLinks = useMemo(() => {
    const accepted = [...sent, ...received].filter(
      (request) => request.status === "accepted",
    );

    return accepted.map((request) => {
      const iAmSender = request.fromUid === uid;
      return {
        id: request.id,
        uid: iAmSender ? request.toUid : request.fromUid,
        fallbackName: iAmSender ? request.toUsername : request.fromUsername,
      };
    });
  }, [sent, received, uid]);

  const friendUidsKey = useMemo(
    () => friendLinks.map((friend) => friend.uid).sort().join(","),
    [friendLinks],
  );

  // Display names and bios come from the friend's own stats document, which is
  // rewritten whenever their profile changes. This is what makes a rename show
  // up here instead of the list keeping the name they had when you added them.
  const friends = useMemo<Friend[]>(
    () =>
      friendLinks.map((link) => {
        const entry = friendEntries.find((item) => item.uid === link.uid);
        return {
          id: link.id,
          uid: link.uid,
          username: entry?.username || link.fallbackName,
          bio: entry?.bio ?? "",
        };
      }),
    [friendLinks, friendEntries],
  );

  const refreshLeaderboard = useCallback(async () => {
    if (!friendUidsKey) {
      setFriendEntries([]);
      return;
    }

    const entries = await fetchLeaderboardEntries(friendUidsKey.split(","));
    setFriendEntries(entries);
  }, [friendUidsKey]);

  useEffect(() => {
    void refreshLeaderboard();
  }, [refreshLeaderboard]);

  const addFriend = useCallback(
    async (targetUsername: string): Promise<SendRequestResult> => {
      if (!uid) {
        return { status: "error" };
      }

      const result = await sendFriendRequest(
        uid,
        username ?? "Student",
        targetUsername,
      );

      if (result.status === "accepted") {
        void refreshLeaderboard();
      }

      return result;
    },
    [uid, username, refreshLeaderboard],
  );

  const accept = useCallback(
    async (id: string) => {
      const ok = await acceptFriendRequest(id);
      if (ok) {
        void refreshLeaderboard();
      }
      return ok;
    },
    [refreshLeaderboard],
  );

  const remove = useCallback((id: string) => removeFriendLink(id), []);

  return {
    friends,
    incoming,
    outgoing,
    friendEntries,
    error,
    addFriend,
    accept,
    remove,
    refreshLeaderboard,
  };
}
