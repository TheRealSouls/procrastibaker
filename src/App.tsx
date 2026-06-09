import { useCallback, useEffect, useRef, useState } from "react";
import { AppNav } from "./components/AppNav";
import { ConfirmationModal } from "./components/ConfirmationModal";
import { BakeryView } from "./pages/BakeryView";
import { DashboardView } from "./pages/DashboardView";
import { HomeView } from "./pages/HomeView";
import { LoginView } from "./pages/LoginView";
import { ShopView } from "./pages/ShopView";
import { StatsView } from "./pages/StatsView";
import { TimerView } from "./pages/TimerView";
import { pastries } from "./data/pastries";
import { DEFAULT_TAGS } from "./data/tags";
import croissantIcon from "./media/sprites/icon.png";
import type { AudioSettings, StudySession, StudyTag, View } from "./types";
import {
  createDefaultAppState,
  loadAppState,
  resetAppState,
  saveAppState,
} from "./utils/appStorage";
import {
  getCurrentUser,
  listenToAuthChanges,
  loginWithLocalProfile,
  loginWithGoogle,
  logout,
  updateLocalUser,
} from "./utils/authService";
import { missingFirebaseConfigMessage } from "./utils/firebase";
import { calculateCoins } from "./utils/sessionUtils";

const appName = "Procrastibaker";
const githubUrl = "https://github.com/TheRealSouls/procrastibaker";

export function App() {
  const [appState, setAppState] = useState(() => ({
    ...loadAppState(),
    user: getCurrentUser(),
  }));
  const [view, setView] = useState<View>("home");
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isSessionProtected, setIsSessionProtected] = useState(false);
  const [pendingView, setPendingView] = useState<View | null>(null);
  const expireProtectedSessionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  useEffect(() => {
    const unsubscribe = listenToAuthChanges((user) => {
      if (!user) {
        setAppState((current) => ({ ...current, user: null }));
        setView((currentView) =>
          currentView === "home" ? "home" : "login",
        );
        return;
      }

      setAppState((current) => ({ ...current, user }));
      setView((currentView) =>
        currentView === "home" ? "home" : "dashboard",
      );
    });

    return unsubscribe;
  }, []);

  async function handleGoogleLogin() {
    setAuthError("");
    setIsAuthLoading(true);

    try {
      const user = await loginWithGoogle();

      setAppState((current) => ({ ...current, user }));
      setView("dashboard");
    } catch (error) {
      console.error("Google login failed", error);
      setAuthError(getGoogleLoginErrorMessage(error));
    } finally {
      setIsAuthLoading(false);
    }
  }

  function handleLogin(username: string, email: string) {
    setAuthError("");
    const user = loginWithLocalProfile(username, email);

    setAppState((current) => ({ ...current, user }));
    setView("dashboard");
  }

  function handleEnterApp() {
    setAuthError("");
    setView(appState.user ? "dashboard" : "login");
  }

  const handleProtectedSessionChange = useCallback(
    (isProtected: boolean, expireSession?: () => void) => {
      expireProtectedSessionRef.current = expireSession ?? null;
      setIsSessionProtected(isProtected);

      if (!isProtected) {
        setPendingView(null);
      }
    },
    [],
  );

  function handleNavigate(nextView: View) {
    if (nextView === view) {
      return;
    }

    if (
      view === "timer" &&
      isSessionProtected &&
      expireProtectedSessionRef.current
    ) {
      setPendingView(nextView);
      return;
    }

    setView(nextView);
  }

  function stayInProtectedSession() {
    setPendingView(null);
  }

  function leaveProtectedSession() {
    const nextView = pendingView;

    if (!nextView) {
      return;
    }

    expireProtectedSessionRef.current?.();
    expireProtectedSessionRef.current = null;
    setIsSessionProtected(false);
    setPendingView(null);
    setView(nextView);
  }

  function handleUsernameChange(username: string) {
    setAppState((current) => ({
      ...current,
      user: current.user
        ? updateLocalUser({ ...current.user, username })
        : current.user,
    }));
  }

  function handleSelectPastry(pastryId: string) {
    setAppState((current) => {
      if (!current.unlockedPastryIds.includes(pastryId)) {
        return current;
      }

      return { ...current, selectedPastryId: pastryId };
    });
  }

  function handleBuyPastry(pastryId: string) {
    setAppState((current) => {
      const pastry = pastries.find((item) => item.id === pastryId);
      const coins = current.user
        ? Math.max(0, Math.floor(current.user.coins))
        : 0;

      if (
        !pastry ||
        !current.user ||
        current.unlockedPastryIds.includes(pastry.id) ||
        coins < pastry.price
      ) {
        return current;
      }

      return {
        ...current,
        user: updateLocalUser({ ...current.user, coins: coins - pastry.price }),
        unlockedPastryIds: [...current.unlockedPastryIds, pastry.id],
      };
    });
  }

  function handleAudioSettingsChange(audioSettings: AudioSettings) {
    setAppState((current) => ({
      ...current,
      audioSettings: {
        soundEnabled: audioSettings.soundEnabled,
        soundVolume: Math.min(
          100,
          Math.max(0, Math.round(audioSettings.soundVolume)),
        ),
      },
    }));
  }

  function handleTagsChange(tags: StudyTag[]) {
    setAppState((current) => ({ ...current, tags }));
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

    setAppState((current) => ({
      ...current,
      user: current.user
        ? updateLocalUser({
            ...current.user,
            coins: current.user.coins + calculateCoins(durationMinutes),
          })
        : current.user,
      completedSessions: [
        {
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
        },
        ...current.completedSessions,
      ],
    }));
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

    setAppState((current) => ({
      ...current,
      expiredSessions: [
        {
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
        },
        ...current.expiredSessions,
      ],
    }));
  }

  async function handleLogout() {
    setAuthError("");
    setIsAuthLoading(true);

    try {
      await logout();
      setAppState((current) => ({ ...current, user: null }));
      setView("login");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Sign out failed.");
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleResetData() {
    await logout();
    resetAppState();
    setAppState(createDefaultAppState());
    setView("login");
  }

  function handleAddDemoCompletedSessions() {
    setAppState((current) => ({
      ...current,
      completedSessions: [
        createDemoSession("cookie", "study", 25, true, 1),
        createDemoSession("brownie", "reading", 45, true, 3),
        createDemoSession("cookie", "revision", 30, true, 5),
        ...current.completedSessions,
      ],
    }));
  }

  function handleAddDemoExpiredSessions() {
    setAppState((current) => ({
      ...current,
      expiredSessions: [
        createDemoSession("brownie", "project", 40, false, 2),
        createDemoSession("cookie", "work", 20, false, 6),
        ...current.expiredSessions,
      ],
    }));
  }

  function handleAddCoins() {
    setAppState((current) => ({
      ...current,
      user: current.user
        ? updateLocalUser({ ...current.user, coins: current.user.coins + 100 })
        : current.user,
    }));
  }

  function handleFinishTestSession() {
    setAppState((current) => {
      const pastry =
        pastries.find((item) => item.id === current.selectedPastryId) ??
        pastries[0];
      const tag = current.tags[0] ?? DEFAULT_TAGS[0];
      const durationMinutes = 25;
      const endedAt = new Date();
      const startedAt = new Date(
        endedAt.getTime() - durationMinutes * 60 * 1000,
      );

      return {
        ...current,
        user: current.user
          ? updateLocalUser({
              ...current.user,
              coins: current.user.coins + calculateCoins(durationMinutes),
            })
          : current.user,
        completedSessions: [
          {
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
          },
          ...current.completedSessions,
        ],
      };
    });
  }

  if (view === "home") {
    return <HomeView onStart={handleEnterApp} />;
  }

  if (!appState.user) {
    return (
      <main className="login-screen">
        <LoginView
          authError={authError}
          isAuthLoading={isAuthLoading}
          onGoogleLogin={handleGoogleLogin}
          onLogin={handleLogin}
        />
      </main>
    );
  }

  return (
    <div className="app-shell">
      <div className="mobile-topbar">
        <div>
          <img
            alt=""
            aria-hidden="true"
            className="app-brand-icon"
            draggable={false}
            src={croissantIcon}
          />
          <strong>{appName}</strong>
        </div>
        <small aria-label={`Current coin balance: ${appState.user.coins} coins`}>
          {appState.user.coins} coins
        </small>
        <button
          className="mobile-sign-out"
          disabled={isAuthLoading}
          onClick={handleLogout}
          type="button"
        >
          Sign out
        </button>
      </div>

      <aside className="sidebar">
        <div className="brand">
          <img
            alt=""
            aria-hidden="true"
            className="app-brand-icon"
            draggable={false}
            src={croissantIcon}
          />
          <div>
            <strong>{appName}</strong>
            <small aria-label={`Current coin balance: ${appState.user.coins} coins`}>
              {appState.user.coins} coins
            </small>
          </div>
        </div>
        <AppNav currentView={view} onChange={handleNavigate} />
        <button
          className="sidebar-sign-out"
          disabled={isAuthLoading}
          onClick={handleLogout}
          type="button"
        >
          Sign out
        </button>
        <a
          aria-label="Open Procrastibaker on GitHub"
          className="sidebar-github"
          href={githubUrl}
          rel="noreferrer"
          target="_blank"
        >
          <i className="fa-brands fa-github fa-2x" aria-hidden="true" />
          <span>GitHub</span>
        </a>
      </aside>

      <main className="main-content">
        {view === "dashboard" && (
          <DashboardView
            onAddCoins={handleAddCoins}
            onAddDemoCompletedSessions={handleAddDemoCompletedSessions}
            onAddDemoExpiredSessions={handleAddDemoExpiredSessions}
            onFinishTestSession={handleFinishTestSession}
            state={appState}
            onNavigate={handleNavigate}
            onUsernameChange={handleUsernameChange}
            onResetData={handleResetData}
          />
        )}
        {view === "timer" && (
          <TimerView
            state={appState}
            onCancelSession={handleCancelSession}
            onCompleteSession={handleCompleteSession}
            onNavigate={setView}
            onProtectedSessionChange={handleProtectedSessionChange}
            onAudioSettingsChange={handleAudioSettingsChange}
            onSelectPastry={handleSelectPastry}
            onTagsChange={handleTagsChange}
          />
        )}
        {view === "bakery" && <BakeryView state={appState} />}
        {view === "shop" && (
          <ShopView
            state={appState}
            onBuyPastry={handleBuyPastry}
            onSelectPastry={handleSelectPastry}
          />
        )}
        {view === "stats" && <StatsView state={appState} />}
      </main>

      {pendingView && isSessionProtected && (
        <ConfirmationModal
          cancelLabel="Stay Baking"
          confirmLabel="Leave and Expire Pastry"
          message="Your pastry is still baking. If you leave now, it will expire and go to the bin."
          onCancel={stayInProtectedSession}
          onConfirm={leaveProtectedSession}
          title="Leave this baking session?"
        />
      )}
    </div>
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
