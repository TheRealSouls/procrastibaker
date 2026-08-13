import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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
import type { UsernameChangeResult } from "../services/userProfileService";
import { resetAppState } from "../utils/appStorage";
import {
  deleteCurrentUser,
  loginWithGoogle,
  logout,
  reauthenticateCurrentUser,
  refreshEmailVerified,
  sendPasswordReset,
  sendVerificationEmail,
  signInWithEmail,
  signUpWithEmail,
} from "../utils/authService";
import { missingFirebaseConfigMessage } from "../utils/firebase";
import { upsertLeaderboardStats } from "../services/friendService";
import {
  createGift,
  markGiftClaimed,
  type Gift,
  type SendGiftResult,
} from "../services/giftService";
import { addGiftable, takeGiftable } from "../utils/giftableInventory";
import { initPushNotifications } from "../services/pushNotifications";
import { dailyGoalRewardCoins } from "../services/userProfileService";
import {
  focusMinutesOnDate,
  totalFocusMinutes,
  weeklyFocusMinutes,
  weekKey,
} from "../utils/leaderboard";
import { isPastryInSeason } from "../utils/season";
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
  handleResendVerification: () => Promise<ResendVerificationResult>;
  handleRefreshVerification: () => Promise<boolean>;
  handleLogout: () => void;
  // True while a bake is running, so the shell can warn before signing out.
  hasActiveSession: boolean;
  // The timer registers a finaliser here that expires and logs the running bake.
  registerSessionGuard: (guard: (() => Promise<void>) | null) => void;
  discardActiveSession: () => Promise<void>;
  handleResetData: () => void;
  handleUsernameChange: (username: string) => Promise<UsernameChangeResult>;
  handleDailyGoalChange: (minutes: number) => void;
  handleSelectPastry: (pastryId: string) => void;
  handleBuyPastry: (pastryId: string) => void;
  handleSendGift: (
    toUid: string,
    toUsername: string,
    pastryId: string,
  ) => Promise<SendGiftResult>;
  handleClaimGift: (gift: Gift) => Promise<void>;
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
  ) => Promise<void>;
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

export type ResendVerificationResult = {
  ok: boolean;
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
    changeUsername,
    addCompletedSession,
    addExpiredSession,
    updateCoins,
    updateSelectedPastry,
    addTag,
    updateTag,
    deleteTag,
    runLocalStorageMigration,
  } = useCloudAppState();
  const navigate = useNavigate();
  const location = useLocation();
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  // Set by the timer while a bake runs. Lets the shell confirm before sign-out
  // and, on confirm, expire + log the pastry while the user is still authed.
  const sessionGuardRef = useRef<(() => Promise<void>) | null>(null);
  const [hasActiveSession, setHasActiveSession] = useState(false);

  const registerSessionGuard = useCallback(
    (guard: (() => Promise<void>) | null) => {
      sessionGuardRef.current = guard;
      setHasActiveSession(Boolean(guard));
    },
    [],
  );

  const discardActiveSession = useCallback(async () => {
    const guard = sessionGuardRef.current;
    sessionGuardRef.current = null;
    setHasActiveSession(false);

    if (guard) {
      try {
        await guard();
      } catch (error) {
        console.error("Discarding the active session failed", error);
      }
    }
  }, []);

  // Tie the signed-in user to analytics/Sentry (covers restored sessions).
  const userUid = appState.user?.uid;
  const userAuthProvider = appState.user?.authProvider;
  useEffect(() => {
    if (userUid && userAuthProvider) {
      identifyUser({ uid: userUid, authProvider: userAuthProvider });
    }
  }, [userUid, userAuthProvider]);

  // Register for native push once signed in (no-op on web) so a backend can
  // deliver reminders even when the app is closed.
  useEffect(() => {
    if (userUid) {
      void initPushNotifications(userUid);
    }
  }, [userUid]);

  // Page views are now real routes, track each distinct path.
  useEffect(() => {
    trackView(location.pathname);
  }, [location.pathname]);

  // Keep this user's leaderboard entry fresh so friends see up-to-date focus
  // minutes. Writes whenever the signed-in user's sessions/streak/name change.
  const leaderboardUsername = appState.user?.username;
  const leaderboardStreak = appState.user?.streakCount;
  const completedSessions = appState.completedSessions;
  useEffect(() => {
    if (!userUid) {
      return;
    }

    void upsertLeaderboardStats(userUid, {
      username: leaderboardUsername ?? "Student",
      weeklyMinutes: weeklyFocusMinutes(completedSessions),
      weekKey: weekKey(),
      totalMinutes: totalFocusMinutes(completedSessions),
      streakCount: leaderboardStreak ?? 0,
    });
  }, [userUid, leaderboardUsername, leaderboardStreak, completedSessions]);

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

  // Reports whether the email actually went out, and why not when it failed, so
  // the banner can distinguish "we could not send it" from "you have not clicked
  // the link yet". Those need very different advice.
  async function handleResendVerification(): Promise<ResendVerificationResult> {
    try {
      await sendVerificationEmail();
      return { ok: true };
    } catch (error) {
      console.error("Resend verification email failed", error);
      return { ok: false, message: getVerificationErrorMessage(error) };
    }
  }

  // Returns true once Firebase reports the address as verified.
  async function handleRefreshVerification(): Promise<boolean> {
    try {
      return await refreshEmailVerified();
    } catch (error) {
      console.error("Refresh verification status failed", error);
      return false;
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
    return changeUsername(username);
  }

  function handleDailyGoalChange(minutes: number) {
    if (!Number.isFinite(minutes)) {
      return;
    }

    void updateUserProfile({ dailyGoalMinutes: Math.floor(minutes) });
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
      coins < pastry.price ||
      !isPastryInSeason(pastry)
    ) {
      return;
    }

    void updateUserProfile({
      coins: coins - pastry.price,
      unlockedPastryIds: [...appState.unlockedPastryIds, pastry.id],
    });
    trackEvent("pastry_purchased", { pastryId: pastry.id, price: pastry.price });
  }

  // Gift a pastry you baked (earned from a focus session) to a confirmed friend.
  // Consumes one unit of that pastry from your giftable stock, no coins. The
  // stock is decremented first, and only then is the gift doc created; if the
  // create fails the stock is restored so you never lose a bake for nothing.
  async function handleSendGift(
    toUid: string,
    toUsername: string,
    pastryId: string,
  ): Promise<SendGiftResult> {
    const user = appState.user;

    if (!user || !user.uid || !toUid.trim()) {
      return { status: "error" };
    }

    const remaining = takeGiftable(appState.giftablePastries, pastryId);

    if (!remaining) {
      return { status: "no-stock" };
    }

    // Spend the bake up front (optimistic), then send.
    await updateUserProfile({ giftablePastries: remaining });

    const giftId = await createGift(
      user.uid,
      user.username,
      toUid,
      toUsername,
      pastryId,
    );

    if (!giftId) {
      // Refund the bake, the send didn't go through.
      void updateUserProfile({
        giftablePastries: addGiftable(remaining, pastryId),
      });
      return { status: "not-friend" };
    }

    trackEvent("gift_sent", { pastryId });
    return { status: "sent" };
  }

  // Claim an incoming gift: unlock the pastry type if it's new to you, and add the
  // baked pastry to your own giftable stock (you now hold it, and can re-gift it).
  // The profile onSnapshot folds the change back into appState.
  async function handleClaimGift(gift: Gift): Promise<void> {
    const user = appState.user;

    if (!user) {
      return;
    }

    const nextGiftable = addGiftable(appState.giftablePastries, gift.pastryId);

    if (appState.unlockedPastryIds.includes(gift.pastryId)) {
      void updateUserProfile({ giftablePastries: nextGiftable });
    } else {
      void updateUserProfile({
        unlockedPastryIds: [...appState.unlockedPastryIds, gift.pastryId],
        giftablePastries: nextGiftable,
      });
    }

    await markGiftClaimed(gift.id);
    trackEvent("gift_claimed", { pastryId: gift.pastryId });
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
    const currentTags = new Map(appState.tags.map((tag) => [tag.id, tag]));
    const nextTagIds = new Set(tags.map((tag) => tag.id));

    for (const tag of tags) {
      const existing = currentTags.get(tag.id);

      if (!existing) {
        void addTag(tag);
      } else if (existing.color !== tag.color || existing.name !== tag.name) {
        void updateTag(tag);
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
        // Bank the freshly baked pastry so it can be gifted to a friend later.
        await updateUserProfile({
          giftablePastries: addGiftable(appState.giftablePastries, pastry.id),
        });

        // Award the once-per-day goal bonus if this session crosses the target.
        // Fold it into the single coin update so we don't double-read stale coins.
        const user = appState.user;
        const today = todayKey();
        const goalMinutes = user?.dailyGoalMinutes ?? 0;
        const minutesToday =
          focusMinutesOnDate(appState.completedSessions) + durationMinutes;
        const earnedGoalBonus =
          goalMinutes > 0 &&
          user?.dailyGoalRewardedDate !== today &&
          minutesToday >= goalMinutes;

        await updateCoins({
          delta:
            calculateCoins(durationMinutes) +
            (earnedGoalBonus ? dailyGoalRewardCoins(goalMinutes) : 0),
        });

        if (earnedGoalBonus) {
          await updateUserProfile({ dailyGoalRewardedDate: today });
          trackEvent("daily_goal_met", { goalMinutes });
        }

        await recordStreakCheckIn();
        trackEvent("bake_completed", {
          durationMinutes,
          pastryId: pastry.id,
          tagId: tag.id,
        });
      }
    })();
  }

  async function handleCancelSession(
    tag: StudyTag,
    durationMinutes: number,
    startedAt: string,
    pastryId: string,
  ) {
    const pastry = pastries.find((item) => item.id === pastryId);

    if (!pastry) {
      return;
    }

    // Awaited (not fire-and-forget) so callers such as the sign-out guard can be
    // sure the expired bake is written before the session ends.
    await addExpiredSession({
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

      // 3. Delete the auth account, then clear local + analytics identity. The
      // data is already gone at this point, so a failure here leaves a login with
      // no bakery behind it. Say so plainly and sign them out rather than
      // claiming nothing was deleted.
      try {
        await deleteCurrentUser();
      } catch (deleteError) {
        console.error("Auth account deletion failed", deleteError);
        resetAnalytics();
        resetAppState();
        await logout().catch(() => undefined);
        navigate("/");
        return {
          status: "error",
          message:
            "Your bakery data was deleted, but your sign-in could not be removed. Sign in once more and delete the account again to finish.",
        };
      }

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
    handleResendVerification,
    handleRefreshVerification,
    handleLogout,
    hasActiveSession,
    registerSessionGuard,
    discardActiveSession,
    handleResetData,
    handleUsernameChange,
    handleDailyGoalChange,
    handleSelectPastry,
    handleBuyPastry,
    handleSendGift,
    handleClaimGift,
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

  // Fires when the site is served from a domain that is not on the Auth
  // allowlist. Name the exact domain so the fix is obvious.
  if (code === "auth/unauthorized-domain") {
    const host = typeof window !== "undefined" ? window.location.hostname : "this domain";
    return `Google sign-in is not allowed from ${host}. Add it in Firebase Console under Authentication, Settings, Authorized domains.`;
  }

  if (code === "auth/popup-blocked") {
    return "Your browser blocked the sign-in popup. Allow popups for this site, then try again.";
  }

  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return "Sign-in was cancelled.";
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

// Verification sends fail for a small, specific set of reasons. Naming them
// beats a generic "something went wrong" when an inbox stays empty.
function getVerificationErrorMessage(error: unknown): string {
  switch (getAuthErrorCode(error)) {
    case "auth/too-many-requests":
      return "Too many requests. Wait a few minutes, then try again.";
    case "auth/unauthorized-continue-uri":
    case "auth/invalid-continue-uri":
      return "This site is not an authorised domain for sign-in emails. Add it under Firebase Authentication, Settings, Authorized domains.";
    case "auth/user-token-expired":
    case "auth/user-not-found":
      return "Your session expired. Sign in again, then resend the email.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "We could not send that email. Please try again shortly.";
  }
}

function getEmailAuthErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message === missingFirebaseConfigMessage) {
    return missingFirebaseConfigMessage;
  }

  switch (getAuthErrorCode(error)) {
    case "auth/email-already-in-use":
      return "That email already has an account. Sign in instead, and if you first joined with Google use the Google button.";
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
