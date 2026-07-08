import {
  DEFAULT_TAGS,
  fallbackTagColor,
  findTagById,
  findTagByName,
  maxCustomTags,
} from "../data/tags";
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
export const appStateStorageEvent = "procrastibaker-app-state-changed";

export function createDefaultAppState(): AppState {
  const selectedPastryId =
    pastries.find((pastry) => pastry.unlockedByDefault)?.id ?? pastries[0].id;

  return {
    user: null,
    unlockedPastryIds: pastries
      .filter((pastry) => pastry.unlockedByDefault)
      .map((pastry) => pastry.id),
    tags: DEFAULT_TAGS,
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
  notifyAppStateChanged();
}

export function resetAppState() {
  localStorage.removeItem(storageKey);
  localStorage.removeItem(typoStorageKey);
  localStorage.removeItem(legacyStorageKey);
  notifyAppStateChanged();
}

function notifyAppStateChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(appStateStorageEvent));
  }
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
  const tags = normalizeTags(value.tags);

  return {
    user: isUser(value.user) ? normalizeUser(value.user) : fallback.user,
    unlockedPastryIds,
    completedSessions: Array.isArray(value.completedSessions)
      ? normalizeStudySessions(value.completedSessions, tags)
      : fallback.completedSessions,
    expiredSessions: Array.isArray(value.expiredSessions)
      ? normalizeStudySessions(value.expiredSessions, tags)
      : fallback.expiredSessions,
    tags,
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

function isUser(value: unknown): value is Record<string, unknown> {
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

function normalizeUser(user: Record<string, unknown>): User {
  const uid = typeof user.uid === "string" ? user.uid.trim().slice(0, 128) : "";
  const authProvider = user.authProvider === "google" ? "google" : "local";

  return {
    ...(uid ? { uid } : {}),
    username: String(user.username).trim().slice(0, 32),
    email: String(user.email).trim().slice(0, 80),
    coins: Math.max(0, Math.floor(Number(user.coins))),
    authProvider,
    streakCount: toNonNegativeInt(user.streakCount),
    streakLongest: toNonNegativeInt(user.streakLongest),
    streakLastActiveDate: toDateKey(user.streakLastActiveDate),
    streakFreezes: toNonNegativeInt(user.streakFreezes),
  };
}

function toNonNegativeInt(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

function toDateKey(value: unknown): string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : "";
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

function normalizeTags(value: unknown): StudyTag[] {
  if (!Array.isArray(value)) {
    return DEFAULT_TAGS;
  }

  const tags: StudyTag[] = [];
  const usedNames = new Set<string>();
  const usedIds = new Set<string>();
  let customTagCount = 0;

  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }

    const name =
      typeof item.name === "string" ? item.name.trim().slice(0, 24) : "";
    const id =
      typeof item.id === "string" ? item.id.trim().slice(0, 80) : "";
    const color = typeof item.color === "string" ? item.color.trim() : "";
    const normalizedName = name.toLowerCase();
    const isDefault = DEFAULT_TAGS.some((tag) => tag.id === id);

    if (
      !name ||
      !id ||
      usedNames.has(normalizedName) ||
      usedIds.has(id) ||
      !isHexColor(color) ||
      (!isDefault && customTagCount >= maxCustomTags)
    ) {
      continue;
    }

    usedNames.add(normalizedName);
    usedIds.add(id);
    tags.push({
      id,
      name,
      color,
      isDefault,
    });

    if (!isDefault) {
      customTagCount += 1;
    }
  }

  return tags.length > 0 ? tags : DEFAULT_TAGS;
}

function normalizeStudySessions(
  values: unknown[],
  tags: StudyTag[],
): StudySession[] {
  return values
    .map((value) => normalizeStudySession(value, tags))
    .filter((session): session is StudySession => session !== null);
}

function normalizeStudySession(
  value: unknown,
  tags: StudyTag[],
): StudySession | null {
  if (
    !isRecord(value) ||
    !isPastryId(value.pastryId) ||
    typeof value.pastryName !== "string" ||
    typeof value.durationMinutes !== "number" ||
    !Number.isFinite(value.durationMinutes) ||
    typeof value.startedAt !== "string" ||
    typeof value.endedAt !== "string" ||
    typeof value.completed !== "boolean" ||
    typeof value.expired !== "boolean"
  ) {
    return null;
  }

  const legacyTag = typeof value.tag === "string" ? value.tag : "";
  const storedTagName =
    typeof value.tagName === "string" ? value.tagName : legacyTag;
  const storedTagId = typeof value.tagId === "string" ? value.tagId : "";
  const matchedTag =
    (storedTagId ? findTagById(tags, storedTagId) : null) ??
    findTagByName(tags, storedTagName) ??
    findTagByName(DEFAULT_TAGS, storedTagName);
  const tagName =
    storedTagName.trim().slice(0, 24) ||
    matchedTag?.name ||
    DEFAULT_TAGS[0].name;
  const tagColor =
    typeof value.tagColor === "string" && isHexColor(value.tagColor)
      ? value.tagColor
      : matchedTag?.color || fallbackTagColor;

  return {
    id: getStoredSessionId(value),
    pastryId: value.pastryId,
    pastryName: value.pastryName,
    tagId:
      storedTagId.trim().slice(0, 80) || matchedTag?.id || DEFAULT_TAGS[0].id,
    tagName,
    tagColor,
    durationMinutes: value.durationMinutes,
    startedAt: value.startedAt,
    endedAt: value.endedAt,
    completed: value.completed,
    expired: value.expired,
  };
}

function getStoredSessionId(value: Record<string, unknown>) {
  const id = typeof value.id === "string" ? value.id.trim().slice(0, 128) : "";

  if (id) {
    return id;
  }

  return `local-${hashString(
    [
      value.pastryId,
      value.pastryName,
      value.tagId,
      value.tagName,
      value.durationMinutes,
      value.startedAt,
      value.endedAt,
      value.completed,
      value.expired,
    ].join("|"),
  )}`;
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash).toString(36);
}

function isPastryId(value: unknown): value is string {
  return (
    typeof value === "string" && pastries.some((pastry) => pastry.id === value)
  );
}

function isHexColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}
