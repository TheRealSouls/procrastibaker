import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import type { StudySession } from "../types";
import { getOptionalFirestore } from "../utils/firebase";

export type SyncedStudySession = StudySession & {
  platform: "web" | "android";
  createdAt: Timestamp | null;
};

// Firestore is intended to become the source of truth for authenticated users.
// localStorage remains a migration backup/cache until all UI writes move here.
export async function addStudySession(uid: string, session: StudySession) {
  const firestore = getOptionalFirestore();
  const durationMinutes = Math.floor(session.durationMinutes);

  if (
    !firestore ||
    !uid.trim() ||
    !session.id.trim() ||
    durationMinutes < 10 ||
    durationMinutes > 120
  ) {
    return null;
  }

  try {
    const sessionRef = doc(firestore, "users", uid, "sessions", session.id);

    await setDoc(sessionRef, {
      pastryId: session.pastryId,
      pastryName: session.pastryName.trim().slice(0, 48),
      tagId: session.tagId.trim().slice(0, 80),
      tagName: session.tagName.trim().slice(0, 24),
      tagColor: isHexColor(session.tagColor) ? session.tagColor : "#C77B30",
      durationMinutes,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      completed: session.completed,
      expired: session.expired,
      platform: "web",
      createdAt: serverTimestamp(),
    });

    return session.id;
  } catch (error) {
    console.error("Firestore add study session failed", error);
    return null;
  }
}

export function listenToSessions(
  uid: string,
  callback: (sessions: SyncedStudySession[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const firestore = getOptionalFirestore();

  if (!firestore || !uid.trim()) {
    return () => undefined;
  }

  return onSnapshot(
    query(collection(firestore, "users", uid, "sessions"), orderBy("startedAt", "desc")),
    (snapshot) => {
      callback(
        snapshot.docs
          .map((item) => normalizeStudySession(item.id, item.data()))
          .filter((session): session is SyncedStudySession => session !== null),
      );
    },
    (error) => {
      console.error("Firestore listen sessions failed", error);
      onError?.(error);
    },
  );
}

function normalizeStudySession(
  id: string,
  value: Record<string, unknown>,
): SyncedStudySession | null {
  if (
    typeof value.pastryId !== "string" ||
    typeof value.pastryName !== "string" ||
    typeof value.tagId !== "string" ||
    typeof value.tagName !== "string" ||
    typeof value.durationMinutes !== "number" ||
    typeof value.startedAt !== "string" ||
    typeof value.endedAt !== "string" ||
    typeof value.completed !== "boolean" ||
    typeof value.expired !== "boolean"
  ) {
    return null;
  }

  return {
    id,
    pastryId: value.pastryId,
    pastryName: value.pastryName,
    tagId: value.tagId,
    tagName: value.tagName,
    tagColor:
      typeof value.tagColor === "string" && isHexColor(value.tagColor)
        ? value.tagColor
        : "#C77B30",
    durationMinutes: Math.max(0, Math.floor(value.durationMinutes)),
    startedAt: value.startedAt,
    endedAt: value.endedAt,
    completed: value.completed,
    expired: value.expired,
    platform: value.platform === "android" ? "android" : "web",
    createdAt: isTimestamp(value.createdAt) ? value.createdAt : null,
  };
}

function isHexColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function isTimestamp(value: unknown): value is Timestamp {
  return (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  );
}
