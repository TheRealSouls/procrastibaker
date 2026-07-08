import { useEffect, useState } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { pastries } from "../data/pastries";
import { DEFAULT_TAGS } from "../data/tags";
import {
  addStudySession,
  listenToSessions,
  type SyncedStudySession,
} from "../services/sessionService";
import {
  createTag as createFirestoreTag,
  deleteTag as deleteFirestoreTag,
  listenToTags,
  seedDefaultTagsIfMissing,
  type SyncedStudyTag,
} from "../services/tagService";
import {
  createUserProfileIfMissing,
  listenToUserProfile,
  updateUserProfile as updateFirestoreUserProfile,
  type UserProfile,
  type UserProfileUpdates,
} from "../services/userProfileService";
import type { AppState, StudySession, StudyTag, User } from "../types";
import { createDefaultAppState } from "../utils/appStorage";
import { mapFirebaseUserToAppUser } from "../utils/authService";
import { captureError } from "../utils/sentry";
import {
  getOptionalFirebaseAuth,
  missingFirebaseConfigMessage,
} from "../utils/firebase";
import { migrateLocalStorageToFirestore } from "../utils/migrateLocalStorageToFirestore";

type CoinUpdate = number | { delta: number };

const placeholderState = createDefaultAppState();

export function useCloudAppState() {
  const firebaseAvailable = Boolean(getOptionalFirebaseAuth());
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!firebaseAvailable);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<SyncedStudySession[]>([]);
  const [tags, setTags] = useState<SyncedStudyTag[]>([]);
  const [cloudReady, setCloudReady] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [tagsLoaded, setTagsLoaded] = useState(false);
  const [error, setError] = useState(
    firebaseAvailable ? "" : missingFirebaseConfigMessage,
  );

  // A signed-in user is always backed by a Firestore profile. The placeholder
  // (user: null) is used while loading and when signed out — App then shows the
  // loading screen or the sign-in gate respectively.
  const appState =
    cloudUser?.uid && profile
      ? buildCloudAppState(cloudUser, profile, sessions, tags)
      : placeholderState;
  // Once auth has resolved with no user, we are NOT loading — App shows the
  // sign-in gate. We only keep loading while a signed-in user's data syncs.
  const loading = firebaseAvailable
    ? !authReady ||
      (cloudUser?.uid
        ? !cloudReady || !profileLoaded || !sessionsLoaded || !tagsLoaded
        : false)
    : false;

  useEffect(() => {
    const auth = getOptionalFirebaseAuth();

    if (!auth) {
      return;
    }

    return onIdTokenChanged(auth, (firebaseUser) => {
      setAuthReady(true);

      // No guest accounts: a missing user OR a leftover anonymous session both
      // mean "not signed in". Sign anonymous sessions out so they can't linger.
      if (!firebaseUser || firebaseUser.isAnonymous) {
        if (firebaseUser?.isAnonymous) {
          void auth.signOut();
        }

        setCloudUser(null);
        setProfile(null);
        setSessions([]);
        setTags([]);
        setCloudReady(false);
        setProfileLoaded(false);
        setSessionsLoaded(false);
        setTagsLoaded(false);
        return;
      }

      try {
        const nextUser = mapFirebaseUserToAppUser(firebaseUser);
        // onIdTokenChanged also fires on hourly token refreshes; keep the same
        // reference when the identity is unchanged so the cloud-sync effect does
        // not needlessly tear down and re-subscribe the Firestore listeners.
        setCloudUser((prev) =>
          prev &&
          prev.uid === nextUser.uid &&
          prev.authProvider === nextUser.authProvider
            ? prev
            : nextUser,
        );
      } catch (mappingError) {
        console.error("Firebase auth user mapping failed", mappingError);
        setError("Could not load your profile.");
      }
    });
  }, []);

  useEffect(() => {
    const activeUser = cloudUser;

    if (!activeUser?.uid) {
      return;
    }

    const syncUser: User = activeUser;
    const uid: string = activeUser.uid;

    let cancelled = false;
    let unsubscribeProfile: () => void = () => undefined;
    let unsubscribeSessions: () => void = () => undefined;
    let unsubscribeTags: () => void = () => undefined;

    setCloudReady(false);
    setProfileLoaded(false);
    setSessionsLoaded(false);
    setTagsLoaded(false);
    setError("");

    async function startCloudSync() {
      const nextProfile = await createUserProfileIfMissing(syncUser);

      if (!nextProfile) {
        setError("Could not create or load your cloud profile.");
      } else if (!nextProfile.localStorageMigrated) {
        const migrated = await migrateLocalStorageToFirestore(
          uid,
          syncUser,
          nextProfile,
        );

        if (!migrated) {
          setError("Could not migrate your local progress to cloud storage.");
        }
      } else {
        await seedDefaultTagsIfMissing(uid);
      }

      if (cancelled) {
        return;
      }

      unsubscribeProfile = listenToUserProfile(
        uid,
        (profile) => {
          setProfile(profile);
          setProfileLoaded(true);
        },
        (error) => {
          setError(error.message || "Could not listen to your cloud profile.");
          setProfileLoaded(true);
        },
      );
      unsubscribeSessions = listenToSessions(
        uid,
        (sessions) => {
          setSessions(sessions);
          setSessionsLoaded(true);
        },
        (error) => {
          setError(error.message || "Could not listen to your cloud sessions.");
          setSessionsLoaded(true);
        },
      );
      unsubscribeTags = listenToTags(
        uid,
        (tags) => {
          setTags(tags);
          setTagsLoaded(true);
        },
        (error) => {
          setError(error.message || "Could not listen to your cloud tags.");
          setTagsLoaded(true);
        },
      );
      setCloudReady(true);
    }

    startCloudSync().catch((error) => {
      console.error("Cloud app state initialization failed", error);
      captureError(error);
      setError("Could not initialize cloud sync.");
      setCloudReady(true);
      setProfileLoaded(true);
      setSessionsLoaded(true);
      setTagsLoaded(true);
    });

    return () => {
      cancelled = true;
      unsubscribeProfile();
      unsubscribeSessions();
      unsubscribeTags();
    };
  }, [cloudUser]);

  async function updateUserProfile(updates: UserProfileUpdates) {
    const uid = profile ? cloudUser?.uid : undefined;

    if (!uid) {
      return false;
    }

    const saved = await updateFirestoreUserProfile(uid, updates);

    if (!saved) {
      setError("Could not update your cloud profile.");
    } else {
      setProfile((current) =>
        current ? applyCloudProfileUpdates(current, updates) : current,
      );
    }

    return saved;
  }

  async function addCompletedSession(session: StudySession) {
    return saveSession({ ...ensureSessionId(session), completed: true, expired: false });
  }

  async function addExpiredSession(session: StudySession) {
    return saveSession({ ...ensureSessionId(session), completed: false, expired: true });
  }

  async function updateCoins(update: CoinUpdate) {
    const currentCoins = appState.user?.coins ?? 0;
    const nextCoins =
      typeof update === "number" ? update : currentCoins + update.delta;

    return updateUserProfile({ coins: Math.max(0, Math.floor(nextCoins)) });
  }

  async function updateSelectedPastry(pastryId: string) {
    if (!isPastryId(pastryId) || !appState.unlockedPastryIds.includes(pastryId)) {
      return false;
    }

    return updateUserProfile({ selectedPastryId: pastryId });
  }

  async function updateUnlockedPastries(unlockedPastryIds: string[]) {
    const validPastryIds = [...new Set(unlockedPastryIds.filter(isPastryId))];

    if (validPastryIds.length === 0) {
      return false;
    }

    return updateUserProfile({ unlockedPastryIds: validPastryIds });
  }

  async function addTag(tag: StudyTag) {
    const uid = profile ? cloudUser?.uid : undefined;

    if (!uid || !tag.id.trim() || !tag.name.trim()) {
      return false;
    }

    const saved = await createFirestoreTag(uid, tag);

    if (!saved) {
      setError("Could not save your study tag.");
    } else {
      setTags((current) =>
        current.some((item) => item.id === tag.id)
          ? current
          : [...current, { ...tag, createdAt: null }],
      );
    }

    return saved;
  }

  async function deleteTag(tagId: string) {
    const uid = profile ? cloudUser?.uid : undefined;

    if (!uid || appState.tags.length <= 1) {
      return false;
    }

    const deleted = await deleteFirestoreTag(uid, tagId);

    if (!deleted) {
      setError("Could not delete your study tag.");
    } else {
      setTags((current) => current.filter((tag) => tag.id !== tagId));
    }

    return deleted;
  }

  async function saveSession(session: StudySession) {
    const uid = profile ? cloudUser?.uid : undefined;

    if (!uid) {
      return false;
    }

    const savedId = await addStudySession(uid, session);

    if (!savedId) {
      setError("Could not save your study session.");
    } else {
      setSessions((current) =>
        current.some((item) => item.id === session.id)
          ? current
          : [{ ...session, platform: "web", createdAt: null }, ...current],
      );
    }

    return Boolean(savedId);
  }

  async function runLocalStorageMigration() {
    const uid = cloudUser?.uid;

    if (!uid || !profile) {
      setError("Local migration requires an active session.");
      return false;
    }

    const migrated = await migrateLocalStorageToFirestore(uid, cloudUser, profile);

    if (!migrated) {
      setError("Could not migrate your local progress to cloud storage.");
      return false;
    }

    setProfile((current) =>
      current ? { ...current, localStorageMigrated: true } : current,
    );
    return true;
  }

  return {
    appState,
    loading,
    error,
    updateUserProfile,
    addCompletedSession,
    addExpiredSession,
    updateCoins,
    updateSelectedPastry,
    updateUnlockedPastries,
    addTag,
    deleteTag,
    runLocalStorageMigration,
  };
}

function applyCloudProfileUpdates(
  profile: UserProfile,
  updates: UserProfileUpdates,
): UserProfile {
  return {
    ...profile,
    username: updates.username ?? profile.username,
    email: updates.email ?? profile.email,
    coins: updates.coins ?? profile.coins,
    selectedPastryId: updates.selectedPastryId ?? profile.selectedPastryId,
    unlockedPastryIds: updates.unlockedPastryIds ?? profile.unlockedPastryIds,
    audioSettings: updates.audioSettings ?? profile.audioSettings,
    localStorageMigrated:
      updates.localStorageMigrated ?? profile.localStorageMigrated,
    streakCount: updates.streakCount ?? profile.streakCount,
    streakLongest: updates.streakLongest ?? profile.streakLongest,
    streakLastActiveDate:
      updates.streakLastActiveDate ?? profile.streakLastActiveDate,
    streakFreezes: updates.streakFreezes ?? profile.streakFreezes,
  };
}

function buildCloudAppState(
  cloudUser: User,
  profile: UserProfile,
  sessions: SyncedStudySession[],
  tags: SyncedStudyTag[],
): AppState {
  return {
    user: {
      uid: cloudUser.uid,
      username: profile.username,
      email: profile.email,
      coins: profile.coins,
      authProvider: cloudUser.authProvider,
      streakCount: profile.streakCount,
      streakLongest: profile.streakLongest,
      streakLastActiveDate: profile.streakLastActiveDate,
      streakFreezes: profile.streakFreezes,
    },
    unlockedPastryIds: profile.unlockedPastryIds,
    tags: tags.length > 0 ? tags.map(stripSyncedTag) : DEFAULT_TAGS,
    completedSessions: sessions
      .filter((session) => session.completed)
      .map(stripSyncedSession),
    expiredSessions: sessions
      .filter((session) => session.expired)
      .map(stripSyncedSession),
    selectedPastryId: profile.selectedPastryId,
    audioSettings: profile.audioSettings,
  };
}

function ensureSessionId(session: StudySession): StudySession {
  return session.id.trim()
    ? session
    : { ...session, id: crypto.randomUUID() };
}

function stripSyncedSession(session: SyncedStudySession): StudySession {
  return {
    id: session.id,
    pastryId: session.pastryId,
    pastryName: session.pastryName,
    tagId: session.tagId,
    tagName: session.tagName,
    tagColor: session.tagColor,
    durationMinutes: session.durationMinutes,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    completed: session.completed,
    expired: session.expired,
  };
}

function stripSyncedTag(tag: SyncedStudyTag): StudyTag {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    isDefault: tag.isDefault,
  };
}

function isPastryId(value: unknown): value is string {
  return typeof value === "string" && pastries.some((pastry) => pastry.id === value);
}
