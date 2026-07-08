import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  type DocumentReference,
} from "firebase/firestore";
import { getOptionalFirestore } from "../utils/firebase";

export type ExportedUserData = {
  exportedAt: string;
  uid: string;
  profile: Record<string, unknown> | null;
  sessions: Record<string, unknown>[];
  tags: Record<string, unknown>[];
};

// Firestore Timestamps aren't JSON-friendly — convert them to ISO strings so the
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

/**
 * Permanently deletes a user's Firestore data (profile + all sessions + tags).
 * Batched in chunks of 400 to stay under Firestore's 500-write batch limit.
 * Must be called BEFORE deleting the auth account (security rules require the
 * owner to be signed in).
 */
export async function deleteAllUserData(uid: string): Promise<boolean> {
  const firestore = getOptionalFirestore();

  if (!firestore || !uid.trim()) {
    return false;
  }

  try {
    const [sessionsSnap, tagsSnap] = await Promise.all([
      getDocs(collection(firestore, "users", uid, "sessions")),
      getDocs(collection(firestore, "users", uid, "tags")),
    ]);

    const refs: DocumentReference[] = [
      ...sessionsSnap.docs.map((item) => item.ref),
      ...tagsSnap.docs.map((item) => item.ref),
      doc(firestore, "users", uid),
    ];

    for (let start = 0; start < refs.length; start += 400) {
      const batch = writeBatch(firestore);
      for (const ref of refs.slice(start, start + 400)) {
        batch.delete(ref);
      }
      await batch.commit();
    }

    return true;
  } catch (error) {
    console.error("Delete user data failed", error);
    return false;
  }
}
