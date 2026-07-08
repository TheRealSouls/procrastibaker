import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { pastries } from "../data/pastries";
import type { AudioSettings, User } from "../types";
import { loadAppState } from "../utils/appStorage";
import { getOptionalFirestore } from "../utils/firebase";
import { MAX_FREEZES } from "../utils/streakUtils";

export type UserProfile = {
  uid: string;
  username: string;
  email: string;
  coins: number;
  selectedPastryId: string;
  unlockedPastryIds: string[];
  audioSettings: AudioSettings;
  localStorageMigrated: boolean;
  streakCount: number;
  streakLongest: number;
  streakLastActiveDate: string;
  streakFreezes: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

export type UserProfileUpdates = Partial<
  Pick<
    UserProfile,
    | "audioSettings"
    | "coins"
    | "email"
    | "localStorageMigrated"
    | "selectedPastryId"
    | "streakCount"
    | "streakFreezes"
    | "streakLastActiveDate"
    | "streakLongest"
    | "unlockedPastryIds"
    | "username"
  >
>;

// Firestore is intended to become the source of truth for authenticated users.
// localStorage remains a migration backup/cache while the UI is moved over.
export async function createUserProfileIfMissing(user: User) {
  const firestore = getOptionalFirestore();
  const uid = user.uid?.trim();

  if (!firestore || !uid) {
    return null;
  }

  try {
    const userRef = doc(firestore, "users", uid);
    const snapshot = await getDoc(userRef);

    if (snapshot.exists()) {
      return normalizeUserProfile(uid, snapshot.data(), user);
    }

    const localState = loadAppState();
    const selectedPastryId = isPastryId(localState.selectedPastryId)
      ? localState.selectedPastryId
      : pastries[0].id;
    const unlockedPastryIds = localState.unlockedPastryIds.filter(isPastryId);
    const profile = {
      username: normalizeText(user.username, 32) || "Student",
      email: normalizeText(user.email, 80),
      coins: Math.max(0, Math.floor(localState.user?.coins ?? user.coins)),
      selectedPastryId,
      unlockedPastryIds:
        unlockedPastryIds.length > 0 ? unlockedPastryIds : [selectedPastryId],
      audioSettings: normalizeAudioSettings(localState.audioSettings),
      localStorageMigrated: false,
      streakCount: 0,
      streakLongest: 0,
      streakLastActiveDate: "",
      streakFreezes: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, profile);

    return {
      uid,
      ...profile,
      createdAt: null,
      updatedAt: null,
    };
  } catch (error) {
    console.error("Firestore create user profile failed", error);
    return null;
  }
}

export async function getUserProfile(uid: string) {
  const firestore = getOptionalFirestore();

  if (!firestore || !uid.trim()) {
    return null;
  }

  try {
    const snapshot = await getDoc(doc(firestore, "users", uid));

    return snapshot.exists()
      ? normalizeUserProfile(uid, snapshot.data(), null)
      : null;
  } catch (error) {
    console.error("Firestore get user profile failed", error);
    return null;
  }
}

export function listenToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const firestore = getOptionalFirestore();

  if (!firestore || !uid.trim()) {
    return () => undefined;
  }

  return onSnapshot(
    doc(firestore, "users", uid),
    (snapshot) => {
      callback(
        snapshot.exists() ? normalizeUserProfile(uid, snapshot.data(), null) : null,
      );
    },
    (error) => {
      console.error("Firestore listen user profile failed", error);
      onError?.(error);
    },
  );
}

export async function updateUserProfile(
  uid: string,
  updates: UserProfileUpdates,
) {
  const firestore = getOptionalFirestore();

  if (!firestore || !uid.trim()) {
    return false;
  }

  try {
    await updateDoc(doc(firestore, "users", uid), {
      ...normalizeUserProfileUpdates(updates),
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Firestore update user profile failed", error);
    return false;
  }
}

function normalizeUserProfile(
  uid: string,
  value: Record<string, unknown>,
  fallbackUser: User | null,
): UserProfile {
  const storedSelectedPastryId =
    typeof value.selectedPastryId === "string" && isPastryId(value.selectedPastryId)
      ? value.selectedPastryId
      : pastries[0].id;
  const storedUnlockedPastryIds = Array.isArray(value.unlockedPastryIds)
    ? value.unlockedPastryIds.filter(isPastryId)
    : [];
  const unlockedPastryIds =
    storedUnlockedPastryIds.length > 0
      ? [...new Set(storedUnlockedPastryIds)]
      : [storedSelectedPastryId];
  const selectedPastryId = unlockedPastryIds.includes(storedSelectedPastryId)
    ? storedSelectedPastryId
    : unlockedPastryIds[0];

  return {
    uid,
    username:
      normalizeText(value.username, 32) ||
      normalizeText(fallbackUser?.username, 32) ||
      "Student",
    email: normalizeText(value.email, 80) || normalizeText(fallbackUser?.email, 80),
    coins: Math.max(0, Math.floor(Number(value.coins) || 0)),
    selectedPastryId,
    unlockedPastryIds,
    audioSettings: normalizeAudioSettings(value.audioSettings),
    localStorageMigrated: value.localStorageMigrated === true,
    streakCount: clampNonNegativeInt(value.streakCount),
    streakLongest: clampNonNegativeInt(value.streakLongest),
    streakLastActiveDate: normalizeStreakDate(value.streakLastActiveDate),
    streakFreezes: Math.min(MAX_FREEZES, clampNonNegativeInt(value.streakFreezes)),
    createdAt: isTimestamp(value.createdAt) ? value.createdAt : null,
    updatedAt: isTimestamp(value.updatedAt) ? value.updatedAt : null,
  };
}

function clampNonNegativeInt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

function normalizeStreakDate(value: unknown): string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : "";
}

function normalizeUserProfileUpdates(updates: UserProfileUpdates) {
  const normalized: UserProfileUpdates = {};

  if (typeof updates.username === "string") {
    const username = normalizeText(updates.username, 32);

    if (username) {
      normalized.username = username;
    }
  }

  if (typeof updates.email === "string") {
    const email = normalizeText(updates.email, 80);

    if (email) {
      normalized.email = email;
    }
  }

  if (typeof updates.coins === "number" && Number.isFinite(updates.coins)) {
    normalized.coins = Math.max(0, Math.floor(updates.coins));
  }

  if (
    typeof updates.selectedPastryId === "string" &&
    isPastryId(updates.selectedPastryId)
  ) {
    normalized.selectedPastryId = updates.selectedPastryId;
  }

  if (Array.isArray(updates.unlockedPastryIds)) {
    const unlockedPastryIds = [
      ...new Set(updates.unlockedPastryIds.filter(isPastryId)),
    ];

    if (unlockedPastryIds.length > 0) {
      normalized.unlockedPastryIds = unlockedPastryIds;
    }
  }

  if (updates.audioSettings) {
    normalized.audioSettings = normalizeAudioSettings(updates.audioSettings);
  }

  if (typeof updates.localStorageMigrated === "boolean") {
    normalized.localStorageMigrated = updates.localStorageMigrated;
  }

  if (
    typeof updates.streakCount === "number" &&
    Number.isFinite(updates.streakCount)
  ) {
    normalized.streakCount = Math.max(0, Math.floor(updates.streakCount));
  }

  if (
    typeof updates.streakLongest === "number" &&
    Number.isFinite(updates.streakLongest)
  ) {
    normalized.streakLongest = Math.max(0, Math.floor(updates.streakLongest));
  }

  if (typeof updates.streakLastActiveDate === "string") {
    normalized.streakLastActiveDate = normalizeStreakDate(
      updates.streakLastActiveDate,
    );
  }

  if (
    typeof updates.streakFreezes === "number" &&
    Number.isFinite(updates.streakFreezes)
  ) {
    normalized.streakFreezes = Math.min(
      MAX_FREEZES,
      Math.max(0, Math.floor(updates.streakFreezes)),
    );
  }

  return normalized;
}

function normalizeAudioSettings(value: unknown): AudioSettings {
  if (
    typeof value !== "object" ||
    value === null ||
    !("soundEnabled" in value) ||
    !("soundVolume" in value)
  ) {
    return { soundEnabled: true, soundVolume: 40 };
  }

  return {
    soundEnabled: value.soundEnabled === true,
    soundVolume:
      typeof value.soundVolume === "number" && Number.isFinite(value.soundVolume)
        ? Math.min(100, Math.max(0, Math.round(value.soundVolume)))
        : 40,
  };
}

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isPastryId(value: unknown): value is string {
  return typeof value === "string" && pastries.some((pastry) => pastry.id === value);
}

function isTimestamp(value: unknown): value is Timestamp {
  return (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  );
}
