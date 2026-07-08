import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { pastries } from "../data/pastries";
import { DEFAULT_TAGS } from "../data/tags";
import { deleteAllUserData } from "../services/accountService";
import { useCloudAppState } from "../hooks/useCloudAppState";
import {
  identifyUser,
  resetAnalytics,
  trackEvent,
  trackView,
} from "../services/analytics";
import type { AppState, AudioSettings, StudySession, StudyTag } from "../types";
import { resetAppState } from "../utils/appStorage";
import {
  deleteCurrentUser,
  loginWithGoogle,
  logout,
  reauthenticateCurrentUser,
  sendPasswordReset,
  signInWithEmail,
  signUpWithEmail,
} from "../utils/authService";
import { missingFirebaseConfigMessage } from "../utils/firebase";
import { calculateCoins } from "../utils/sessionUtils";
import {
  applyStreakCheckIn,
  MAX_FREEZES,
  STREAK_FREEZE_PRICE,
  todayKey,
} from "../utils/streakUtils";

type AppContextValue = {
  appState: AppState;
  isAppStateLoading: boolean;
  appStateError: string;
  authError: string;
  authNotice: string;
  isAuthLoading: boolean;
  handleGoogleLogin: () => void;
  handleEmailSignIn: (email: string, password: string) => void;
  handleEmailSignUp: (email: string, password: string) => void;
  handlePasswordReset: (email: string) => void;
  handleLogout: () => void;
  handleResetData: () => void;
  handleUsernameChange: (username: string) => void;
  handleSelectPastry: (pastryId: string) => void;
  handleBuyPastry: (pastryId: string) => void;
  handleBuyStreakFreeze: () => void;
  handleAudioSettingsChange: (audioSettings: AudioSettings) => void;
  handleTagsChange: (tags: StudyTag[]) => void;
  handleCompleteSession: (
    tag: StudyTag,
    durationMinutes: number,
    startedAt: string,
    pastryId: string,
  ) => void;
  handleCancelSession: (
    tag: StudyTag,
    durationMinutes: number,
    startedAt: string,
    pastryId: string,
  ) => void;
  handleAddCoins: () => void;
  handleAddDemoCompletedSessions: () => void;
  handleAddDemoExpiredSessions: () => void;
  handleFinishTestSession: () => void;
  handleRunLocalMigration: () => void;
  handleDeleteAccount: (password?: string) => Promise<DeleteAccountResult>;
};

export type DeleteAccountResult = {
  status: "ok" | "password-required" | "error";
  message?: string;
};

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = useContext(AppContext);

  if (!value) {
    throw new Error("useApp must be used within <AppProvider>");
  }

  return value;
}

export function AppProvider() {
  const {
    appState,
    loading: isAppStateLoading,
    error: appStateError,
    updateUserProfile,
    addCompletedSession,
    addExpiredSession,
    updateCoins,
    updateSelectedPastry,
    addTag,
    deleteTag,
    runLocalStorageMigration,
  } = useCloudAppState();
  const navigate = useNavigate();
  const location = useLocation();
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Tie the signed-in user to analytics/Sentry (covers restored sessions).
  const userUid = appState.user?.uid;
  const userAuthProvider = appState.user?.authProvider;
  useEffect(() => {
    if (userUid && userAuthProvider) {
      identifyUser({ uid: userUid, authProvider: userAuthProvider });
    }
  }, [userUid, userAuthProvider]);

  // Page views are now real routes — track each distinct path.
  useEffect(() => {
    trackView(location.pathname);
  }, [location.pathname]);

  async function handleGoogleLogin() {
    setAuthError("");
    setAuthNotice("");
    setIsAuthLoading(true);

    try {
      await loginWithGoogle();
      trackEvent("signed_in", { method: "google" });
      navigate("/dashboard");
    } catch (error) {
      console.error("Google login failed", error);
      setAuthError(getGoogleLoginErrorMessage(error));
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleEmailSignIn(email: string, password: string) {
    setAuthError("");
    setAuthNotice("");
    setIsAuthLoading(true);

    try {
      await signInWithEmail(email, password);
      trackEvent("signed_in", { method: "email" });
      navigate("/dashboard");
    } catch (error) {
      console.error("Email sign-in failed", error);
      setAuthError(getEmailAuthErrorMessage(error));
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleEmailSignUp(email: string, password: string) {
    setAuthError("");
    setAuthNotice("");
    setIsAuthLoading(true);

    try {
      await signUpWithEmail(email, password);
      trackEvent("signed_up", { method: "email" });
      navigate("/dashboard");
    } catch (error) {
      console.error("Email sign-up failed", error);
      setAuthError(getEmailAuthErrorMessage(error));
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handlePasswordReset(email: string) {
    setAuthError("");
    setAuthNotice("");

    if (!email.trim()) {
      setAuthError("Enter your email address first, then tap reset.");
      return;
    }

    setIsAuthLoading(true);

    try {
      await sendPasswordReset(email);
      setAuthNotice("Password reset email sent. Check your inbox.");
    } catch (error) {
      console.error("Password reset failed", error);
      setAuthError(getEmailAuthErrorMessage(error));
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleLogout() {
    setAuthError("");
    setIsAuthLoading(true);

    try {
      await logout();
      resetAnalytics();
      navigate("/");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Sign out failed.");
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleResetData() {
    await logout();
    resetAppState();
    navigate("/");
  }

  function handleUsernameChange(username: string) {
    void updateUserProfile({ username });
  }

  function handleSelectPastry(pastryId: string) {
    void updateSelectedPastry(pastryId);
  }

  function handleBuyPastry(pastryId: string) {
    const pastry = pastries.find((item) => item.id === pastryId);
    const coins = appState.user
      ? Math.max(0, Math.floor(appState.user.coins))
      : 0;

    if (
      !pastry ||
      !appState.user ||
      appState.unlockedPastryIds.includes(pastry.id) ||
      coins < pastry.price
    ) {
      return;
    }

    void updateUserProfile({
      coins: coins - pastry.price,
      unlockedPastryIds: [...appState.unlockedPastryIds, pastry.id],
    });
    trackEvent("pastry_purchased", { pastryId: pastry.id, price: pastry.price });
  }

  function handleBuyStreakFreeze() {
    const user = appState.user;

    if (
      !user ||
      user.streakFreezes >= MAX_FREEZES ||
      user.coins < STREAK_FREEZE_PRICE
    ) {
      return;
    }

    void updateUserProfile({
      coins: user.coins - STREAK_FREEZE_PRICE,
      streakFreezes: user.streakFreezes + 1,
    });
    trackEvent("streak_freeze_purchased", { price: STREAK_FREEZE_PRICE });
  }

  function handleAudioSettingsChange(audioSettings: AudioSettings) {
    void updateUserProfile({
      audioSettings: {
        soundEnabled: audioSettings.soundEnabled,
        soundVolume: Math.min(
          100,
          Math.max(0, Math.round(audioSettings.soundVolume)),
        ),
      },
    });
  }

  function handleTagsChange(tags: StudyTag[]) {
    const currentTagIds = new Set(appState.tags.map((tag) => tag.id));
    const nextTagIds = new Set(tags.map((tag) => tag.id));

    for (const tag of tags) {
      if (!currentTagIds.has(tag.id)) {
        void addTag(tag);
      }
    }

    for (const tag of appState.tags) {
      if (!nextTagIds.has(tag.id)) {
        void deleteTag(tag.id);
      }
    }
  }

  async function recordStreakCheckIn() {
    const user = appState.user;

    if (!user) {
      return;
    }

    const { next, outcome } = applyStreakCheckIn(
      {
        count: user.streakCount,
        longest: user.streakLongest,
        lastActiveDate: user.streakLastActiveDate,
        freezes: user.streakFreezes,
      },
      todayKey(),
    );

    await updateUserProfile({
      streakCount: next.count,
      streakLongest: next.longest,
      streakLastActiveDate: next.lastActiveDate,
      streakFreezes: next.freezes,
    });

    trackEvent(`streak_${outcome}`, { count: next.count });
  }

  function handleCompleteSession(
    tag: StudyTag,
    durationMinutes: number,
    startedAt: string,
    pastryId: string,
  ) {
    const pastry = pastries.find((item) => item.id === pastryId);

    if (!pastry) {
      return;
    }

    void (async () => {
      const saved = await addCompletedSession({
        id: crypto.randomUUID(),
        pastryId: pastry.id,
        pastryName: pastry.name,
        tagId: tag.id,
        tagName: tag.name,
        tagColor: tag.color,
        durationMinutes,
        startedAt,
        endedAt: new Date().toISOString(),
        completed: true,
        expired: false,
      });

      if (saved) {
        await updateCoins({ delta: calculateCoins(durationMinutes) });
        await recordStreakCheckIn();
        trackEvent("bake_completed", {
          durationMinutes,
          pastryId: pastry.id,
          tagId: tag.id,
        });
      }
    })();
  }

  function handleCancelSession(
    tag: StudyTag,
    durationMinutes: number,
    startedAt: string,
    pastryId: string,
  ) {
    const pastry = pastries.find((item) => item.id === pastryId);

    if (!pastry) {
      return;
    }

    void addExpiredSession({
      id: crypto.randomUUID(),
      pastryId: pastry.id,
      pastryName: pastry.name,
      tagId: tag.id,
      tagName: tag.name,
      tagColor: tag.color,
      durationMinutes,
      startedAt,
      endedAt: new Date().toISOString(),
      completed: false,
      expired: true,
    });
    trackEvent("bake_expired", {
      durationMinutes,
      pastryId: pastry.id,
      tagId: tag.id,
    });
  }

  function handleAddCoins() {
    void updateCoins({ delta: 100 });
  }

  function handleAddDemoCompletedSessions() {
    void addCompletedSession(createDemoSession("cookie", "study", 25, true, 1));
    void addCompletedSession(createDemoSession("brownie", "reading", 45, true, 3));
    void addCompletedSession(createDemoSession("cookie", "revision", 30, true, 5));
    void recordStreakCheckIn();
  }

  function handleAddDemoExpiredSessions() {
    void addExpiredSession(createDemoSession("brownie", "project", 40, false, 2));
    void addExpiredSession(createDemoSession("cookie", "work", 20, false, 6));
  }

  function handleFinishTestSession() {
    const pastry =
      pastries.find((item) => item.id === appState.selectedPastryId) ??
      pastries[0];
    const tag = appState.tags[0] ?? DEFAULT_TAGS[0];
    const durationMinutes = 25;
    const endedAt = new Date();
    const startedAt = new Date(endedAt.getTime() - durationMinutes * 60 * 1000);

    void (async () => {
      const saved = await addCompletedSession({
        id: crypto.randomUUID(),
        pastryId: pastry.id,
        pastryName: pastry.name,
        tagId: tag.id,
        tagName: tag.name,
        tagColor: tag.color,
        durationMinutes,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        completed: true,
        expired: false,
      });

      if (saved) {
        await updateCoins({ delta: calculateCoins(durationMinutes) });
        await recordStreakCheckIn();
      }
    })();
  }

  function handleRunLocalMigration() {
    void runLocalStorageMigration();
  }

  async function handleDeleteAccount(
    password?: string,
  ): Promise<DeleteAccountResult> {
    const uid = appState.user?.uid;

    if (!uid) {
      return { status: "error", message: "You are not signed in." };
    }

    try {
      // 1. Re-verify identity (Firebase requires a recent login to delete).
      const reauth = await reauthenticateCurrentUser(password);
      if (reauth === "password-required") {
        return { status: "password-required" };
      }

      // 2. Erase Firestore data first (rules require an authenticated owner).
      const erased = await deleteAllUserData(uid);
      if (!erased) {
        return {
          status: "error",
          message: "We couldn't delete your data. Please try again.",
        };
      }

      // 3. Delete the auth account, then clear local + analytics identity.
      await deleteCurrentUser();
      trackEvent("account_deleted");
      resetAnalytics();
      resetAppState();
      navigate("/");
      return { status: "ok" };
    } catch (error) {
      console.error("Account deletion failed", error);
      const code = getAuthErrorCode(error);

      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        return { status: "error", message: "That password is incorrect." };
      }
      if (code === "auth/too-many-requests") {
        return {
          status: "error",
          message: "Too many attempts. Please wait a moment and try again.",
        };
      }
      if (code === "auth/popup-closed-by-user") {
        return {
          status: "error",
          message: "Verification was cancelled. Your account was not deleted.",
        };
      }

      return {
        status: "error",
        message: "Something went wrong. Your account was not deleted.",
      };
    }
  }

  const value: AppContextValue = {
    appState,
    isAppStateLoading,
    appStateError,
    authError,
    authNotice,
    isAuthLoading,
    handleGoogleLogin,
    handleEmailSignIn,
    handleEmailSignUp,
    handlePasswordReset,
    handleLogout,
    handleResetData,
    handleUsernameChange,
    handleSelectPastry,
    handleBuyPastry,
    handleBuyStreakFreeze,
    handleAudioSettingsChange,
    handleTagsChange,
    handleCompleteSession,
    handleCancelSession,
    handleAddCoins,
    handleAddDemoCompletedSessions,
    handleAddDemoExpiredSessions,
    handleFinishTestSession,
    handleRunLocalMigration,
    handleDeleteAccount,
  };

  return (
    <AppContext.Provider value={value}>
      <Outlet />
    </AppContext.Provider>
  );
}

function createDemoSession(
  pastryId: string,
  tagId: string,
  durationMinutes: number,
  completed: boolean,
  daysAgo: number,
): StudySession {
  const pastry = pastries.find((item) => item.id === pastryId) ?? pastries[0];
  const tag = DEFAULT_TAGS.find((item) => item.id === tagId) ?? DEFAULT_TAGS[0];
  const endedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const startedAt = new Date(endedAt.getTime() - durationMinutes * 60 * 1000);

  return {
    id: crypto.randomUUID(),
    pastryId: pastry.id,
    pastryName: pastry.name,
    tagId: tag.id,
    tagName: tag.name,
    tagColor: tag.color,
    durationMinutes,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    completed,
    expired: !completed,
  };
}

function getGoogleLoginErrorMessage(error: unknown) {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : "";

  if (error instanceof Error && error.message === missingFirebaseConfigMessage) {
    return missingFirebaseConfigMessage;
  }

  if (code === "auth/configuration-not-found") {
    return "Firebase Authentication may not be enabled, or the Google sign-in provider may not be enabled in Firebase Console. Google login failed. Please try again.";
  }

  return "Google login failed. Please try again.";
}

function getAuthErrorCode(error: unknown): string {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code
    : "";
}

function getEmailAuthErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message === missingFirebaseConfigMessage) {
    return missingFirebaseConfigMessage;
  }

  switch (getAuthErrorCode(error)) {
    case "auth/email-already-in-use":
      return "That email already has an account. Try signing in instead.";
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/missing-password":
      return "Please enter a password.";
    case "auth/weak-password":
      return "Your password is too weak. Use at least 6 characters.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/user-not-found":
      return "No account found for that email. Create one instead.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/operation-not-allowed":
      return "Email sign-in isn't enabled yet. Enable Email/Password in the Firebase console.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}
