import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  documentId,
  endAt,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAt,
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
  // Mirrored from the private profile so confirmed friends can read it here,
  // rather than opening up the whole user document.
  bio: string;
  // Totals per pastry id. Enough to draw their Crumb Map; individual sessions
  // stay private.
  pastryCounts: Record<string, number>;
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
      bio: clip(stats.bio ?? "", 160),
      pastryCounts: stats.pastryCounts ?? {},
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
    bio: typeof value.bio === "string" ? value.bio.slice(0, 160) : "",
    pastryCounts:
      typeof value.pastryCounts === "object" && value.pastryCounts !== null
        ? (value.pastryCounts as Record<string, number>)
        : {},
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


// ---------------------------------------------------------------------------
// Safety: blocking and reporting
// ---------------------------------------------------------------------------

// A block is one doc per direction, id "<blocker>__<blocked>", mirroring how
// friend links are keyed so the rules can authorise from the id alone.
function blockId(blockerUid: string, blockedUid: string): string {
  return `${blockerUid}__${blockedUid}`;
}

/**
 * Blocks a user: records the block and tears down any friend link between the
 * two, in both directions. The security rules additionally refuse a new friend
 * request from anyone the recipient has blocked, so this cannot be undone by
 * simply asking again.
 */
export async function blockUser(
  blockerUid: string,
  blockedUid: string,
): Promise<boolean> {
  const firestore = getOptionalFirestore();

  if (!firestore || !blockerUid.trim() || !blockedUid.trim()) {
    return false;
  }

  try {
    await setDoc(doc(firestore, "blocks", blockId(blockerUid, blockedUid)), {
      blockerUid,
      blockedUid,
      createdAt: serverTimestamp(),
    });

    // Best-effort cleanup: an existing friendship should not survive a block.
    for (const id of [
      requestId(blockerUid, blockedUid),
      requestId(blockedUid, blockerUid),
    ]) {
      try {
        await deleteDoc(doc(firestore, "friendRequests", id));
      } catch {
        // Nothing to remove in that direction.
      }
    }

    return true;
  } catch (error) {
    console.error("Block user failed", error);
    return false;
  }
}

export async function unblockUser(
  blockerUid: string,
  blockedUid: string,
): Promise<boolean> {
  const firestore = getOptionalFirestore();

  if (!firestore || !blockerUid.trim() || !blockedUid.trim()) {
    return false;
  }

  try {
    await deleteDoc(doc(firestore, "blocks", blockId(blockerUid, blockedUid)));
    return true;
  } catch (error) {
    console.error("Unblock user failed", error);
    return false;
  }
}

export type ReportReason = "spam" | "abuse" | "inappropriate" | "other";

/**
 * Files a moderation report. Write-only for clients: nobody can read, edit or
 * withdraw reports from the app, so a reported user cannot discover or tamper
 * with them. Moderators read them through the console or an admin tool.
 */
export async function reportUser(
  reporterUid: string,
  targetUid: string,
  targetUsername: string,
  reason: ReportReason,
  details: string,
): Promise<boolean> {
  const firestore = getOptionalFirestore();

  if (!firestore || !reporterUid.trim() || !targetUid.trim()) {
    return false;
  }

  try {
    await addDoc(collection(firestore, "reports"), {
      reporterUid,
      targetUid,
      targetUsername: clip(targetUsername, 32),
      reason,
      details: clip(details, 500),
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Report user failed", error);
    return false;
  }
}

/** Uids this user has blocked, so the UI can hide or mark them. */
export function listenToBlocks(
  uid: string,
  callback: (blockedUids: string[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const firestore = getOptionalFirestore();

  if (!firestore || !uid.trim()) {
    return () => undefined;
  }

  return onSnapshot(
    query(collection(firestore, "blocks"), where("blockerUid", "==", uid)),
    (snapshot) => {
      callback(
        snapshot.docs
          .map((item) => item.data().blockedUid)
          .filter((value): value is string => typeof value === "string"),
      );
    },
    (error) => {
      console.error("Listen blocks failed", error);
      onError?.(error);
    },
  );
}

export type UsernameMatch = { uid: string; username: string };

/**
 * Prefix search over the public `usernames` registry.
 *
 * Firestore has no substring search, but document ids here are the lowercased
 * name, so an id range query gives a real "starts with" lookup without any
 * extra index or a third-party search service.
 */
export async function searchUsernames(
  term: string,
  excludeUid: string,
  max = 8,
): Promise<UsernameMatch[]> {
  const firestore = getOptionalFirestore();
  const prefix = clip(term, 32).toLowerCase();

  if (!firestore || !prefix) {
    return [];
  }

  try {
    const snapshot = await getDocs(
      query(
        collection(firestore, "usernames"),
        orderBy(documentId()),
        startAt(prefix),
        // \uf8ff sorts after any regular character, closing the prefix range.
        endAt(`${prefix}\uf8ff`),
        limit(max + 1),
      ),
    );

    return snapshot.docs
      .map((item) => ({
        uid: typeof item.data().uid === "string" ? item.data().uid : "",
        username: item.id,
      }))
      .filter((match) => match.uid && match.uid !== excludeUid)
      .slice(0, max);
  } catch (error) {
    console.error("Username search failed", error);
    return [];
  }
}
