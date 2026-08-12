import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  type DocumentReference,
  type Firestore,
} from "firebase/firestore";
import { getOptionalFirestore } from "../utils/firebase";

export type ExportedUserData = {
  exportedAt: string;
  uid: string;
  profile: Record<string, unknown> | null;
  sessions: Record<string, unknown>[];
  tags: Record<string, unknown>[];
};

// Firestore Timestamps aren't JSON-friendly, convert them to ISO strings so the
// exported file is human-readable and portable (GDPR right to data portability).
function serialize(data: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    output[key] =
      value &&
      typeof value === "object" &&
      "toDate" in value &&
      typeof (value as { toDate?: unknown }).toDate === "function"
        ? (value as { toDate: () => Date }).toDate().toISOString()
        : value;
  }

  return output;
}

/** Gathers everything we store about a user into one portable object. */
export async function exportUserData(
  uid: string,
): Promise<ExportedUserData | null> {
  const firestore = getOptionalFirestore();

  if (!firestore || !uid.trim()) {
    return null;
  }

  try {
    const [profileSnap, sessionsSnap, tagsSnap] = await Promise.all([
      getDoc(doc(firestore, "users", uid)),
      getDocs(collection(firestore, "users", uid, "sessions")),
      getDocs(collection(firestore, "users", uid, "tags")),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      uid,
      profile: profileSnap.exists() ? serialize(profileSnap.data()) : null,
      sessions: sessionsSnap.docs.map((item) => ({
        id: item.id,
        ...serialize(item.data()),
      })),
      tags: tagsSnap.docs.map((item) => ({ id: item.id, ...serialize(item.data()) })),
    };
  } catch (error) {
    console.error("Export user data failed", error);
    return null;
  }
}

// Collects the docs of a single-equality query, tolerating a denied/failed read
// so one unavailable collection cannot abort the whole deletion.
async function refsFromQuery(
  firestore: Firestore,
  path: string,
  field: string,
  value: string,
): Promise<DocumentReference[]> {
  try {
    const snapshot = await getDocs(
      query(collection(firestore, path), where(field, "==", value)),
    );
    return snapshot.docs.map((item) => item.ref);
  } catch (error) {
    console.debug(`Collecting ${path} for deletion skipped`, error);
    return [];
  }
}

// Best-effort release of the global `usernames/{lowercase}` claim. Only deletes a
// claim this uid actually owns, so a name since taken by somebody else is left
// alone. Never throws: an unreleased claim must not fail the account deletion.
async function releaseUsernameClaim(
  firestore: Firestore,
  uid: string,
  username: string,
): Promise<void> {
  if (!username) {
    return;
  }

  try {
    const claimRef = doc(firestore, "usernames", username);
    const claim = await getDoc(claimRef);

    if (claim.exists() && claim.get("uid") === uid) {
      const batch = writeBatch(firestore);
      batch.delete(claimRef);
      await batch.commit();
    }
  } catch (error) {
    console.debug("Releasing username claim skipped", error);
  }
}

/**
 * Permanently deletes everything we store about a user: the profile, sessions and
 * tags, plus the satellite docs keyed off their uid (username claim, leaderboard
 * entry, push token, reminder settings) and both sides of their friend links and
 * gifts. Leaving any of these behind orphans data that blocks a clean re-signup,
 * most visibly the `usernames` claim, which would keep their old name reserved
 * forever.
 *
 * Batched in chunks of 400 to stay under Firestore's 500-write batch limit. Must
 * be called BEFORE deleting the auth account (security rules require the owner to
 * be signed in).
 */
export async function deleteAllUserData(uid: string): Promise<boolean> {
  const firestore = getOptionalFirestore();

  if (!firestore || !uid.trim()) {
    return false;
  }

  try {
    // The username claim is keyed by the lowercased name, so we need the profile
    // to know which doc to release.
    const profileSnap = await getDoc(doc(firestore, "users", uid));
    const username =
      profileSnap.exists() && typeof profileSnap.get("username") === "string"
        ? (profileSnap.get("username") as string).trim().toLowerCase()
        : "";

    const [
      sessionsSnap,
      tagsSnap,
      sentRequests,
      receivedRequests,
      sentGifts,
      receivedGifts,
    ] = await Promise.all([
      getDocs(collection(firestore, "users", uid, "sessions")),
      getDocs(collection(firestore, "users", uid, "tags")),
      refsFromQuery(firestore, "friendRequests", "fromUid", uid),
      refsFromQuery(firestore, "friendRequests", "toUid", uid),
      refsFromQuery(firestore, "gifts", "fromUid", uid),
      refsFromQuery(firestore, "gifts", "toUid", uid),
    ]);

    const refs: DocumentReference[] = [
      ...sessionsSnap.docs.map((item) => item.ref),
      ...tagsSnap.docs.map((item) => item.ref),
      ...sentRequests,
      ...receivedRequests,
      ...sentGifts,
      ...receivedGifts,
      doc(firestore, "leaderboardStats", uid),
      doc(firestore, "pushTokens", uid),
      doc(firestore, "reminderSettings", uid),
      // The profile itself goes last so a partial failure still leaves the
      // account recognisable.
      doc(firestore, "users", uid),
    ];

    for (let start = 0; start < refs.length; start += 400) {
      const batch = writeBatch(firestore);
      for (const ref of refs.slice(start, start + 400)) {
        batch.delete(ref);
      }
      await batch.commit();
    }

    // Release the global username claim so the name is free again. Kept out of
    // the batch above: the rules only allow deleting a claim we own, and a
    // mismatched claim would otherwise fail the whole atomic commit.
    await releaseUsernameClaim(firestore, uid, username);

    return true;
  } catch (error) {
    console.error("Delete user data failed", error);
    return false;
  }
}
