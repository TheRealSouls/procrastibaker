import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { getOptionalFirestore } from "../utils/firebase";

export type GiftStatus = "unclaimed" | "claimed";

export type Gift = {
  id: string;
  fromUid: string;
  fromUsername: string;
  toUid: string;
  toUsername: string;
  pastryId: string;
  status: GiftStatus;
};

export type SendGiftResult = { status: "sent" | "not-friend" | "error" };

// Cost to send a gift (paid by the sender) and the consolation coins a recipient
// gets when the gifted pastry is one they already own.
export const GIFT_COST_COINS = 30;
export const GIFT_DUPLICATE_COINS = 15;

function clip(value: string, max: number): string {
  return value.trim().slice(0, max);
}

// Creates the gift doc. The sender's coin deduction is a separate write on their
// own profile, batched alongside this by the AppContext handler so both land
// together. Returns the new gift id, or null on failure.
export async function createGift(
  fromUid: string,
  fromUsername: string,
  toUid: string,
  toUsername: string,
  pastryId: string,
): Promise<string | null> {
  const firestore = getOptionalFirestore();

  if (!firestore || !fromUid.trim() || !toUid.trim() || !clip(pastryId, 64)) {
    return null;
  }

  try {
    const ref = await addDoc(collection(firestore, "gifts"), {
      fromUid,
      fromUsername: clip(fromUsername, 32) || "Student",
      toUid,
      toUsername: clip(toUsername, 32) || "Student",
      pastryId: clip(pastryId, 64),
      status: "unclaimed",
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.error("Create gift failed", error);
    return null;
  }
}

// One listener over the gifts addressed to this user. Single equality filter (no
// composite index); the caller filters unclaimed client-side.
export function listenToIncomingGifts(
  uid: string,
  callback: (gifts: Gift[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const firestore = getOptionalFirestore();

  if (!firestore || !uid.trim()) {
    return () => undefined;
  }

  return onSnapshot(
    query(collection(firestore, "gifts"), where("toUid", "==", uid)),
    (snapshot) => {
      callback(
        snapshot.docs
          .map((item) => normalizeGift(item.id, item.data()))
          .filter((gift): gift is Gift => gift !== null),
      );
    },
    (error) => {
      console.error("Listen incoming gifts failed", error);
      onError?.(error);
    },
  );
}

export async function markGiftClaimed(giftId: string): Promise<boolean> {
  const firestore = getOptionalFirestore();

  if (!firestore || !giftId.trim()) {
    return false;
  }

  try {
    await updateDoc(doc(firestore, "gifts", giftId), { status: "claimed" });
    return true;
  } catch (error) {
    console.error("Mark gift claimed failed", error);
    return false;
  }
}

export async function deleteGift(giftId: string): Promise<boolean> {
  const firestore = getOptionalFirestore();

  if (!firestore || !giftId.trim()) {
    return false;
  }

  try {
    await deleteDoc(doc(firestore, "gifts", giftId));
    return true;
  } catch (error) {
    console.error("Delete gift failed", error);
    return false;
  }
}

function normalizeGift(id: string, value: Record<string, unknown>): Gift | null {
  if (
    typeof value.fromUid !== "string" ||
    typeof value.toUid !== "string" ||
    typeof value.pastryId !== "string" ||
    (value.status !== "unclaimed" && value.status !== "claimed")
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
    pastryId: value.pastryId,
    status: value.status,
  };
}
