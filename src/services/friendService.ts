import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { getOptionalFirestore } from "../utils/firebase";

export type FriendRequestStatus = "pending" | "accepted";

export type FriendRequest = {
  id: string;
  fromUid: string;
  fromUsername: string;
  toUid: string;
  toUsername: string;
  status: FriendRequestStatus;
};

export type LeaderboardStats = {
  username: string;
  weeklyMinutes: number;
  weekKey: string;
  totalMinutes: number;
  streakCount: number;
};

export type LeaderboardEntry = LeaderboardStats & { uid: string };

export type SendRequestResult = {
  status: "sent" | "accepted" | "already" | "pending" | "self" | "not-found" | "error";
};

// A relationship doc id is deterministic ("<from>__<to>") so we can address the
// forward and reverse direction without a query.
function requestId(fromUid: string, toUid: string): string {
  return `${fromUid}__${toUid}`;
}

function clip(value: string, max: number): string {
  return value.trim().slice(0, max);
}

// Reading a *non-existent* friendRequests doc is denied by the security rules
// (they dereference resource.data, which is null when the doc is missing), so
// getDoc throws permission-denied. Treat any read failure as "not there", the
// caller only needs to know whether an existing relationship is present.
async function tryGetDoc(
  ref: DocumentReference<DocumentData>,
): Promise<DocumentSnapshot<DocumentData> | null> {
  try {
    return await getDoc(ref);
  } catch {
    return null;
  }
}

// Best-effort: register the user's current username in the shared `usernames`
// registry so friends can find them. Silently no-ops if the name is already
// claimed by someone else (create-only rule) or the user is offline.
export async function ensureUsernameClaim(
  uid: string,
  username: string,
): Promise<void> {
  const firestore = getOptionalFirestore();
  const lower = clip(username, 32).toLowerCase();

  if (!firestore || !uid.trim() || !lower) {
    return;
  }

  try {
    const ref = doc(firestore, "usernames", lower);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      await setDoc(ref, { uid });
      return;
    }

    if (snapshot.data().uid !== uid) {
      // The name is held by someone else. That is usually legitimate, but it can
      // also be a claim orphaned by a deleted account, which would otherwise
      // reserve the name for good and send friend requests to a dead uid. The
      // rules only permit a takeover when the previous owner's profile is gone,
      // so attempting it is safe: a live owner simply denies the write.
      await setDoc(ref, { uid });
    }
  } catch (error) {
    // Name taken by another user, or offline, discovery just won't include us.
    console.debug("Username claim skipped", error);
  }
}

async function lookupUidByUsername(username: string): Promise<string | null> {
  const firestore = getOptionalFirestore();
  const lower = clip(username, 32).toLowerCase();

  if (!firestore || !lower) {
    return null;
  }

  try {
    const snapshot = await getDoc(doc(firestore, "usernames", lower));
    const uid = snapshot.exists() ? snapshot.data().uid : null;
    return typeof uid === "string" && uid ? uid : null;
  } catch (error) {
    console.error("Username lookup failed", error);
    return null;
  }
}

export async function sendFriendRequest(
  fromUid: string,
  fromUsername: string,
  targetUsername: string,
): Promise<SendRequestResult> {
  const firestore = getOptionalFirestore();

  if (!firestore || !fromUid.trim() || !clip(targetUsername, 32)) {
    return { status: "error" };
  }

  const targetUid = await lookupUidByUsername(targetUsername);

  if (!targetUid) {
    return { status: "not-found" };
  }

  if (targetUid === fromUid) {
    return { status: "self" };
  }

  try {
    // They already sent us one → accept it instead of creating a duplicate.
    const reverseRef = doc(firestore, "friendRequests", requestId(targetUid, fromUid));
    const reverse = await tryGetDoc(reverseRef);

    if (reverse && reverse.exists()) {
      if (reverse.data().status === "accepted") {
        return { status: "already" };
      }
      await updateDoc(reverseRef, { status: "accepted" });
      return { status: "accepted" };
    }

    const forwardRef = doc(firestore, "friendRequests", requestId(fromUid, targetUid));
    const forward = await tryGetDoc(forwardRef);

    if (forward && forward.exists()) {
      return { status: forward.data().status === "accepted" ? "already" : "pending" };
    }

    await setDoc(forwardRef, {
      fromUid,
      fromUsername: clip(fromUsername, 32) || "Student",
      toUid: targetUid,
      toUsername: clip(targetUsername, 32),
      status: "pending",
      createdAt: serverTimestamp(),
    });
    return { status: "sent" };
  } catch (error) {
    console.error("Send friend request failed", error);
    return { status: "error" };
  }
}

export async function acceptFriendRequest(id: string): Promise<boolean> {
  const firestore = getOptionalFirestore();

  if (!firestore || !id.trim()) {
    return false;
  }

  try {
    await updateDoc(doc(firestore, "friendRequests", id), { status: "accepted" });
    return true;
  } catch (error) {
    console.error("Accept friend request failed", error);
    return false;
  }
}

// Used for declining an incoming request, cancelling an outgoing one, or
// removing an existing friend, all just delete the relationship doc.
export async function removeFriendLink(id: string): Promise<boolean> {
  const firestore = getOptionalFirestore();

  if (!firestore || !id.trim()) {
    return false;
  }

  try {
    await deleteDoc(doc(firestore, "friendRequests", id));
    return true;
  } catch (error) {
    console.error("Remove friend link failed", error);
    return false;
  }
}

// One listener over the requests we sent, one over the requests we received.
// The caller derives friends / incoming / outgoing from the two lists, this
// keeps every query to a single equality filter (no composite index needed).
export function listenToSentLinks(
  uid: string,
  callback: (requests: FriendRequest[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return listenToLinks(uid, "fromUid", callback, onError);
}

export function listenToReceivedLinks(
  uid: string,
  callback: (requests: FriendRequest[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return listenToLinks(uid, "toUid", callback, onError);
}

function listenToLinks(
  uid: string,
  field: "fromUid" | "toUid",
  callback: (requests: FriendRequest[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const firestore = getOptionalFirestore();

  if (!firestore || !uid.trim()) {
    return () => undefined;
  }

  return onSnapshot(
    query(collection(firestore, "friendRequests"), where(field, "==", uid)),
    (snapshot) => {
      callback(
        snapshot.docs
          .map((item) => normalizeRequest(item.id, item.data()))
          .filter((request): request is FriendRequest => request !== null),
      );
    },
    (error) => {
      console.error("Listen friend links failed", error);
      onError?.(error);
    },
  );
}

export async function upsertLeaderboardStats(
  uid: string,
  stats: LeaderboardStats,
): Promise<boolean> {
  const firestore = getOptionalFirestore();

  if (!firestore || !uid.trim()) {
    return false;
  }

  try {
    await setDoc(doc(firestore, "leaderboardStats", uid), {
      username: clip(stats.username, 32) || "Student",
      weeklyMinutes: Math.max(0, Math.floor(stats.weeklyMinutes)),
      weekKey: clip(stats.weekKey, 10),
      totalMinutes: Math.max(0, Math.floor(stats.totalMinutes)),
      streakCount: Math.max(0, Math.floor(stats.streakCount)),
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Upsert leaderboard stats failed", error);
    return false;
  }
}

export async function fetchLeaderboardEntries(
  uids: string[],
): Promise<LeaderboardEntry[]> {
  const firestore = getOptionalFirestore();

  if (!firestore || uids.length === 0) {
    return [];
  }

  const entries = await Promise.all(
    [...new Set(uids)].map(async (uid) => {
      try {
        const snapshot = await getDoc(doc(firestore, "leaderboardStats", uid));

        if (!snapshot.exists()) {
          return null;
        }

        const stats = normalizeStats(snapshot.data());
        return stats ? { uid, ...stats } : null;
      } catch (error) {
        console.error("Fetch leaderboard entry failed", error);
        return null;
      }
    }),
  );

  return entries.filter((entry): entry is LeaderboardEntry => entry !== null);
}

function normalizeRequest(
  id: string,
  value: Record<string, unknown>,
): FriendRequest | null {
  if (
    typeof value.fromUid !== "string" ||
    typeof value.toUid !== "string" ||
    (value.status !== "pending" && value.status !== "accepted")
  ) {
    return null;
  }

  return {
    id,
    fromUid: value.fromUid,
    fromUsername:
      typeof value.fromUsername === "string" ? value.fromUsername : "Student",
    toUid: value.toUid,
    toUsername:
      typeof value.toUsername === "string" ? value.toUsername : "Student",
    status: value.status,
  };
}

function normalizeStats(value: Record<string, unknown>): LeaderboardStats | null {
  if (typeof value.username !== "string") {
    return null;
  }

  return {
    username: value.username,
    weeklyMinutes: toNonNegativeInt(value.weeklyMinutes),
    weekKey: typeof value.weekKey === "string" ? value.weekKey : "",
    totalMinutes: toNonNegativeInt(value.totalMinutes),
    streakCount: toNonNegativeInt(value.streakCount),
  };
}

function toNonNegativeInt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}
