import { studyTags } from "../data/tags";
import { pastries } from "../data/pastries";
import type {
  AppState,
  AudioSettings,
  StudySession,
  StudyTag,
  User,
} from "../types";

const storageKey = "procrastibaker-app-state";
const typoStorageKey = "procrastinbaker-app-state";
const legacyStorageKey = "pastry-focus-app-state";

export function createDefaultAppState(): AppState {
  const selectedPastryId =
    pastries.find((pastry) => pastry.unlockedByDefault)?.id ?? pastries[0].id;

  return {
    user: null,
    unlockedPastryIds: pastries
      .filter((pastry) => pastry.unlockedByDefault)
      .map((pastry) => pastry.id),
    completedSessions: [],
    expiredSessions: [],
    selectedPastryId,
    audioSettings: {
      soundEnabled: true,
      soundVolume: 40,
    },
  };
}

export function loadAppState(): AppState {
  const fallback = createDefaultAppState();
  const saved =
    localStorage.getItem(storageKey) ??
    localStorage.getItem(typoStorageKey) ??
    localStorage.getItem(legacyStorageKey);

  if (!saved) {
    return fallback;
  }

  try {
    return normalizeAppState(JSON.parse(saved), fallback);
  } catch {
    return fallback;
  }
}

export function saveAppState(state: AppState) {
  localStorage.setItem(storageKey, JSON.stringify(state));
  localStorage.removeItem(typoStorageKey);
  localStorage.removeItem(legacyStorageKey);
}

export function resetAppState() {
  localStorage.removeItem(storageKey);
  localStorage.removeItem(typoStorageKey);
  localStorage.removeItem(legacyStorageKey);
}

function normalizeAppState(value: unknown, fallback: AppState): AppState {
  if (!isRecord(value)) {
    return fallback;
  }

  const unlockedPastryIds = [
    ...new Set([
      ...fallback.unlockedPastryIds,
      ...(Array.isArray(value.unlockedPastryIds)
        ? value.unlockedPastryIds.filter(isPastryId)
        : []),
    ]),
  ];
  const selectedPastryId =
    typeof value.selectedPastryId === "string" &&
    unlockedPastryIds.includes(value.selectedPastryId)
      ? value.selectedPastryId
      : fallback.selectedPastryId;

  return {
    user: isUser(value.user) ? normalizeUser(value.user) : fallback.user,
    unlockedPastryIds,
    completedSessions: Array.isArray(value.completedSessions)
      ? value.completedSessions.filter(isStudySession)
      : fallback.completedSessions,
    expiredSessions: Array.isArray(value.expiredSessions)
      ? value.expiredSessions.filter(isStudySession)
      : fallback.expiredSessions,
    selectedPastryId,
    audioSettings: normalizeAudioSettings(
      value.audioSettings,
      fallback.audioSettings,
    ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUser(value: unknown): value is User {
  return (
    isRecord(value) &&
    typeof value.username === "string" &&
    typeof value.email === "string" &&
    typeof value.coins === "number" &&
    Number.isFinite(value.coins) &&
    value.username.trim().length > 0 &&
    value.email.trim().length > 0
  );
}

function normalizeUser(user: User): User {
  return {
    username: user.username.trim().slice(0, 32),
    email: user.email.trim().slice(0, 80),
    coins: Math.max(0, Math.floor(user.coins)),
  };
}

function normalizeAudioSettings(
  value: unknown,
  fallback: AudioSettings,
): AudioSettings {
  if (
    !isRecord(value) ||
    typeof value.soundEnabled !== "boolean" ||
    typeof value.soundVolume !== "number" ||
    !Number.isFinite(value.soundVolume)
  ) {
    return fallback;
  }

  return {
    soundEnabled: value.soundEnabled,
    soundVolume: clampSoundVolume(value.soundVolume),
  };
}

function clampSoundVolume(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function isStudySession(value: unknown): value is StudySession {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isPastryId(value.pastryId) &&
    typeof value.pastryName === "string" &&
    isStudyTag(value.tag) &&
    typeof value.durationMinutes === "number" &&
    Number.isFinite(value.durationMinutes) &&
    typeof value.startedAt === "string" &&
    typeof value.endedAt === "string" &&
    typeof value.completed === "boolean" &&
    typeof value.expired === "boolean"
  );
}

function isPastryId(value: unknown): value is string {
  return (
    typeof value === "string" && pastries.some((pastry) => pastry.id === value)
  );
}

function isStudyTag(value: unknown): value is StudyTag {
  return (
    typeof value === "string" &&
    studyTags.includes(value as StudyTag)
  );
}
