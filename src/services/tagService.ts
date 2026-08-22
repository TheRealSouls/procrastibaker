import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { DEFAULT_TAGS, fallbackTagColor } from "../data/tags";
import type { StudyTag } from "../types";
import { getOptionalFirestore } from "../utils/firebase";

export type SyncedStudyTag = StudyTag & {
  createdAt: Timestamp | null;
};

// Firestore is intended to become the source of truth for authenticated users.
// localStorage remains a migration backup/cache until tag UI writes move here.
export async function createTag(uid: string, tag: StudyTag) {
  const firestore = getOptionalFirestore();
  const name = tag.name.trim().slice(0, 24);

  if (!firestore || !uid.trim() || !tag.id.trim() || !name) {
    return false;
  }

  try {
    await setDoc(doc(firestore, "users", uid, "tags", tag.id), {
      name,
      color: isHexColor(tag.color) ? tag.color : fallbackTagColor,
      isDefault: tag.isDefault,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Firestore create tag failed", error);
    return false;
  }
}

// Updates an existing tag's editable fields (name/colour) without disturbing
// createdAt. The security rules validate the merged document against isStudyTag.
export async function updateTag(uid: string, tag: StudyTag) {
  const firestore = getOptionalFirestore();
  const name = tag.name.trim().slice(0, 24);

  if (!firestore || !uid.trim() || !tag.id.trim() || !name) {
    return false;
  }

  try {
    await updateDoc(doc(firestore, "users", uid, "tags", tag.id), {
      name,
      color: isHexColor(tag.color) ? tag.color : fallbackTagColor,
    });
    return true;
  } catch (error) {
    console.error("Firestore update tag failed", error);
    return false;
  }
}

export async function deleteTag(uid: string, tagId: string) {
  const firestore = getOptionalFirestore();

  if (!firestore || !uid.trim() || !tagId.trim()) {
    return false;
  }

  try {
    await deleteDoc(doc(firestore, "users", uid, "tags", tagId));
    return true;
  } catch (error) {
    console.error("Firestore delete tag failed", error);
    return false;
  }
}

export function listenToTags(
  uid: string,
  callback: (tags: SyncedStudyTag[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const firestore = getOptionalFirestore();

  if (!firestore || !uid.trim()) {
    return () => undefined;
  }

  return onSnapshot(
    collection(firestore, "users", uid, "tags"),
    (snapshot) => {
      callback(
        snapshot.docs
          .map((item) => normalizeTag(item.id, item.data()))
          .filter((tag): tag is SyncedStudyTag => tag !== null),
      );
    },
    (error) => {
      console.error("Firestore listen tags failed", error);
      onError?.(error);
    },
  );
}

export async function seedDefaultTagsIfMissing(uid: string) {
  const firestore = getOptionalFirestore();

  if (!firestore || !uid.trim()) {
    return false;
  }

  try {
    const tagsRef = collection(firestore, "users", uid, "tags");
    const snapshot = await getDocs(tagsRef);

    if (!snapshot.empty) {
      return false;
    }

    const batch = writeBatch(firestore);

    for (const tag of DEFAULT_TAGS) {
      batch.set(doc(tagsRef, tag.id), {
        name: tag.name,
        color: tag.color,
        isDefault: true,
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return true;
  } catch (error) {
    console.error("Firestore seed default tags failed", error);
    return false;
  }
}

function normalizeTag(id: string, value: Record<string, unknown>): SyncedStudyTag | null {
  if (typeof value.name !== "string") {
    return null;
  }

  return {
    id,
    name: value.name.trim().slice(0, 24),
    color:
      typeof value.color === "string" && isHexColor(value.color)
        ? value.color
        : fallbackTagColor,
    isDefault: value.isDefault === true,
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
