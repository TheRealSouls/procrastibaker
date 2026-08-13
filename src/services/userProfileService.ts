import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { pastries } from "../data/pastries";
import type { AudioSettings, User } from "../types";
import { loadAppState } from "../utils/appStorage";
import { getOptionalFirestore } from "../utils/firebase";
import { normalizeGiftablePastries } from "../utils/giftableInventory";
import { sanitizeUsername, USERNAME_MAX_LENGTH } from "../utils/username";
import { MAX_FREEZES } from "../utils/streakUtils";

export type UserProfile = {
  uid: string;
  username: string;
  email: string;
  coins: number;
  selectedPastryId: string;
  unlockedPastryIds: string[];
  giftablePastries: Record<string, number>;
  audioSettings: AudioSettings;
  localStorageMigrated: boolean;
  streakCount: number;
  streakLongest: number;
  streakLastActiveDate: string;
  streakFreezes: number;
  usernameChangedAt: Timestamp | null;
  dailyGoalMinutes: number;
  dailyGoalRewardedDate: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

// One username change per rolling week.
export const USERNAME_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

// Daily focus goal (minutes) and the coin bonus for meeting it.
export const DEFAULT_DAILY_GOAL_MINUTES = 60;
export const MIN_DAILY_GOAL_MINUTES = 10;
export const MAX_DAILY_GOAL_MINUTES = 600;
export const DAILY_GOAL_REWARD_COINS = 25;
export const MIN_DAILY_GOAL_REWARD_COINS = 5;
export const MAX_DAILY_GOAL_REWARD_COINS = 60;

/**
 * Coins awarded for meeting the daily goal, scaled by how ambitious that goal is.
 *
 * A flat bonus made the lowest possible goal strictly optimal: the same reward
 * for a tenth of the work. Scaling it against the default keeps the choice
 * honest, since an easier goal pays proportionally less.
 */
export function dailyGoalRewardCoins(goalMinutes: number): number {
  const goal = clampDailyGoal(goalMinutes);
  const scaled = Math.round(
    (goal / DEFAULT_DAILY_GOAL_MINUTES) * DAILY_GOAL_REWARD_COINS,
  );

  return Math.min(
    MAX_DAILY_GOAL_REWARD_COINS,
    Math.max(MIN_DAILY_GOAL_REWARD_COINS, scaled),
  );
}

export type UsernameChangeResult =
  | { status: "ok"; username: string }
  | { status: "unchanged" }
  | { status: "taken" }
  | { status: "cooldown"; nextChangeAt: number }
  | { status: "error" };

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
    | "giftablePastries"
    | "username"
    | "dailyGoalMinutes"
    | "dailyGoalRewardedDate"
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
      // Reserved up front so two accounts can never share a name.
      username: await claimAvailableUsername(firestore, uid, user.username),
      email: normalizeText(user.email, 80),
      coins: Math.max(0, Math.floor(localState.user?.coins ?? user.coins)),
      selectedPastryId,
      unlockedPastryIds:
        unlockedPastryIds.length > 0 ? unlockedPastryIds : [selectedPastryId],
      giftablePastries: {},
      audioSettings: normalizeAudioSettings(localState.audioSettings),
      localStorageMigrated: false,
      streakCount: 0,
      streakLongest: 0,
      streakLastActiveDate: "",
      streakFreezes: 0,
      dailyGoalMinutes: DEFAULT_DAILY_GOAL_MINUTES,
      dailyGoalRewardedDate: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(userRef, profile);
    } catch (error) {
      // An older deployed ruleset whitelists fewer profile fields, and its
      // hasOnly() check rejects the whole write, which would otherwise brick
      // sign-up entirely. Newer fields are all optional, so retry without them
      // rather than leaving the account with no profile at all.
      if (getFirestoreErrorCode(error) !== "permission-denied") {
        throw error;
      }

      console.warn(
        "Profile write rejected, retrying without newer optional fields. Deploy the latest firestore.rules to keep them.",
        error,
      );

      const legacyProfile = { ...profile };
      delete (legacyProfile as Partial<typeof profile>).giftablePastries;
      await setDoc(userRef, legacyProfile);

      return {
        uid,
        ...legacyProfile,
        giftablePastries: {},
        usernameChangedAt: null,
        createdAt: null,
        updatedAt: null,
      };
    }

    return {
      uid,
      ...profile,
      usernameChangedAt: null,
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

// How many numbered variants to try before falling back to a random suffix.
const USERNAME_SUFFIX_ATTEMPTS = 30;

/**
 * Reserves a free username for a brand new account, appending a number when the
 * plain name is taken: MatasRoda, MatasRoda2, MatasRoda3 and so on.
 *
 * Two people called "John Smith" would otherwise both land on JohnSmith, which
 * breaks friend lookup because it resolves a name to exactly one uid. The
 * create-only rule on `usernames` is what actually decides the race: whoever
 * commits first wins, and the loser's create throws and moves to the next
 * number.
 */
async function claimAvailableUsername(
  firestore: Firestore,
  uid: string,
  desired: string,
): Promise<string> {
  const root = sanitizeUsername(desired) || "Baker";

  for (let attempt = 0; attempt < USERNAME_SUFFIX_ATTEMPTS; attempt += 1) {
    const suffix = attempt === 0 ? "" : String(attempt + 1);
    // Keep room for the digits so long names stay within the length limit.
    const base = root.slice(0, USERNAME_MAX_LENGTH - suffix.length);
    const candidate = `${base}${suffix}`;
    const claimRef = doc(firestore, "usernames", candidate.toLowerCase());

    try {
      const existing = await getDoc(claimRef);

      if (existing.exists()) {
        // Already ours (a retried sign-in), so keep it.
        if (existing.data().uid === uid) {
          return candidate;
        }
        continue;
      }

      await setDoc(claimRef, { uid });
      return candidate;
    } catch (error) {
      // Lost the race, or the claim is unreadable. Either way, try the next one.
      console.debug(`Username ${candidate} unavailable`, error);
    }
  }

  // Extremely unlikely. A random suffix beats handing out a duplicate.
  const fallbackSuffix = String(Math.floor(Math.random() * 9000) + 1000);
  return `${root.slice(0, USERNAME_MAX_LENGTH - fallbackSuffix.length)}${fallbackSuffix}`;
}

class UsernameTakenError extends Error {}

/**
 * Changes a username atomically, enforcing global uniqueness via a
 * `usernames/{lowercase}` claim collection whose create-only security rule makes
 * a duplicate claim fail at the database. The 7-day cooldown is enforced here
 * (client-side) against the stored `usernameChangedAt` timestamp.
 */
export async function changeUsername(
  uid: string,
  rawName: string,
  current: Pick<UserProfile, "username" | "usernameChangedAt">,
): Promise<UsernameChangeResult> {
  const firestore = getOptionalFirestore();
  // Spaces and symbols are stripped rather than rejected, so a name pasted from
  // elsewhere still resolves to something claimable.
  const name = sanitizeUsername(rawName);

  if (!firestore || !uid.trim() || !name) {
    return { status: "error" };
  }

  if (name === current.username) {
    return { status: "unchanged" };
  }

  const lastChangedMs = current.usernameChangedAt
    ? current.usernameChangedAt.toMillis()
    : 0;

  if (lastChangedMs > 0) {
    const nextChangeAt = lastChangedMs + USERNAME_COOLDOWN_MS;

    if (Date.now() < nextChangeAt) {
      return { status: "cooldown", nextChangeAt };
    }
  }

  const newLower = name.toLowerCase();
  const oldLower = current.username.toLowerCase();

  try {
    await runTransaction(firestore, async (transaction) => {
      const userRef = doc(firestore, "users", uid);
      const newNameRef = doc(firestore, "usernames", newLower);
      const oldNameRef = doc(firestore, "usernames", oldLower);

      const newNameSnap = await transaction.get(newNameRef);
      // Only read (and later release) the old claim when the key really changes.
      const oldNameSnap =
        newLower === oldLower ? null : await transaction.get(oldNameRef);

      if (newNameSnap.exists() && newNameSnap.data().uid !== uid) {
        throw new UsernameTakenError();
      }

      transaction.set(newNameRef, { uid });

      if (oldNameSnap?.exists() && oldNameSnap.data().uid === uid) {
        transaction.delete(oldNameRef);
      }

      transaction.update(userRef, {
        username: name,
        usernameChangedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    return { status: "ok", username: name };
  } catch (error) {
    if (error instanceof UsernameTakenError) {
      return { status: "taken" };
    }

    console.error("Firestore change username failed", error);
    return { status: "error" };
  }
}

function getFirestoreErrorCode(error: unknown): string {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code
    : "";
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
    // Sanitised on read too, so accounts created before usernames were
    // restricted converge to a searchable name instead of staying unfindable.
    username:
      sanitizeUsername(normalizeText(value.username, 32)) ||
      sanitizeUsername(normalizeText(fallbackUser?.username, 32)) ||
      "Student",
    email: normalizeText(value.email, 80) || normalizeText(fallbackUser?.email, 80),
    coins: Math.max(0, Math.floor(Number(value.coins) || 0)),
    selectedPastryId,
    unlockedPastryIds,
    giftablePastries: normalizeGiftablePastries(value.giftablePastries),
    audioSettings: normalizeAudioSettings(value.audioSettings),
    localStorageMigrated: value.localStorageMigrated === true,
    streakCount: clampNonNegativeInt(value.streakCount),
    streakLongest: clampNonNegativeInt(value.streakLongest),
    streakLastActiveDate: normalizeStreakDate(value.streakLastActiveDate),
    streakFreezes: Math.min(MAX_FREEZES, clampNonNegativeInt(value.streakFreezes)),
    usernameChangedAt: isTimestamp(value.usernameChangedAt)
      ? value.usernameChangedAt
      : null,
    dailyGoalMinutes: clampDailyGoal(value.dailyGoalMinutes),
    dailyGoalRewardedDate: normalizeStreakDate(value.dailyGoalRewardedDate),
    createdAt: isTimestamp(value.createdAt) ? value.createdAt : null,
    updatedAt: isTimestamp(value.updatedAt) ? value.updatedAt : null,
  };
}

function clampDailyGoal(value: unknown): number {
  const minutes =
    typeof value === "number" && Number.isFinite(value)
      ? Math.floor(value)
      : DEFAULT_DAILY_GOAL_MINUTES;

  return Math.min(
    MAX_DAILY_GOAL_MINUTES,
    Math.max(MIN_DAILY_GOAL_MINUTES, minutes),
  );
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
    const username = sanitizeUsername(updates.username);

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

  if (updates.giftablePastries !== undefined) {
    normalized.giftablePastries = normalizeGiftablePastries(
      updates.giftablePastries,
    );
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

  if (
    typeof updates.dailyGoalMinutes === "number" &&
    Number.isFinite(updates.dailyGoalMinutes)
  ) {
    normalized.dailyGoalMinutes = clampDailyGoal(updates.dailyGoalMinutes);
  }

  if (typeof updates.dailyGoalRewardedDate === "string") {
    normalized.dailyGoalRewardedDate = normalizeStreakDate(
      updates.dailyGoalRewardedDate,
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
