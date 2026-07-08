import { DEFAULT_TAGS } from "../data/tags";
import { pastries } from "../data/pastries";
import { addStudySession } from "../services/sessionService";
import {
  createTag,
  seedDefaultTagsIfMissing,
} from "../services/tagService";
import {
  updateUserProfile,
  type UserProfile,
} from "../services/userProfileService";
import type { StudySession, StudyTag, User } from "../types";
import { loadAppState, saveAppState } from "./appStorage";

export async function migrateLocalStorageToFirestore(
  uid: string,
  cloudUser: User,
  profile: UserProfile,
) {
  if (!uid.trim() || profile.localStorageMigrated) {
    return true;
  }

  try {
    const localState = loadAppState();
    const selectedPastryId = isPastryId(localState.selectedPastryId)
      ? localState.selectedPastryId
      : profile.selectedPastryId;
    const unlockedPastryIds = [
      ...new Set(
        [
          ...profile.unlockedPastryIds,
          ...localState.unlockedPastryIds,
          selectedPastryId,
        ].filter(isPastryId),
      ),
    ];
    const completedSessions = localState.completedSessions.map(normalizeSession);
    const expiredSessions = localState.expiredSessions.map(normalizeSession);
    const tags = (localState.tags.length > 0 ? localState.tags : DEFAULT_TAGS).map(
      normalizeTag,
    );
    const writeResults = await Promise.all([
      ...completedSessions.map((session) => addStudySession(uid, session)),
      ...expiredSessions.map((session) => addStudySession(uid, session)),
      ...tags.map((tag) => createTag(uid, tag)),
    ]);

    if (writeResults.some((result) => !result)) {
      throw new Error("One or more local records failed to migrate.");
    }

    await seedDefaultTagsIfMissing(uid);

    const profileUpdated = await updateUserProfile(uid, {
      username: cloudUser.username,
      email: cloudUser.email,
      coins: Math.max(profile.coins, localState.user?.coins ?? 0),
      selectedPastryId,
      unlockedPastryIds:
        unlockedPastryIds.length > 0 ? unlockedPastryIds : [selectedPastryId],
      audioSettings: localState.audioSettings,
      localStorageMigrated: true,
      streakCount: Math.max(profile.streakCount, localState.user?.streakCount ?? 0),
      streakLongest: Math.max(
        profile.streakLongest,
        localState.user?.streakLongest ?? 0,
      ),
      streakLastActiveDate:
        localState.user?.streakLastActiveDate || profile.streakLastActiveDate,
      streakFreezes: Math.max(
        profile.streakFreezes,
        localState.user?.streakFreezes ?? 0,
      ),
    });

    if (!profileUpdated) {
      throw new Error("Could not mark local migration as complete.");
    }

    saveAppState({
      ...localState,
      user: cloudUser,
      completedSessions,
      expiredSessions,
      selectedPastryId,
      unlockedPastryIds:
        unlockedPastryIds.length > 0 ? unlockedPastryIds : [selectedPastryId],
    });

    return true;
  } catch (error) {
    console.error("localStorage to Firestore migration failed", error);
    return false;
  }
}

function normalizeSession(session: StudySession): StudySession {
  const id = getFirestoreDocId(session.id) || `local-${hashString(
    [
      session.pastryId,
      session.pastryName,
      session.tagId,
      session.tagName,
      session.durationMinutes,
      session.startedAt,
      session.endedAt,
      session.completed,
      session.expired,
    ].join("|"),
  )}`;

  return { ...session, id };
}

function normalizeTag(tag: StudyTag): StudyTag {
  return {
    ...tag,
    id: getFirestoreDocId(tag.id) || `tag-${hashString(tag.name)}`,
  };
}

function getFirestoreDocId(value: string) {
  const id = value.trim().slice(0, 128);

  return id && id !== "." && id !== ".." && !id.includes("/") ? id : "";
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash).toString(36);
}

function isPastryId(value: unknown): value is string {
  return typeof value === "string" && pastries.some((pastry) => pastry.id === value);
}
