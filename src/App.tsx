import { useEffect, useState } from "react";
import { AppNav } from "./components/AppNav";
import { BakeryView } from "./pages/BakeryView";
import { DashboardView } from "./pages/DashboardView";
import { LoginView } from "./pages/LoginView";
import { ShopView } from "./pages/ShopView";
import { StatsView } from "./pages/StatsView";
import { TimerView } from "./pages/TimerView";
import { pastries } from "./data/pastries";
import type { AudioSettings, StudySession, StudyTag, View } from "./types";
import {
  createDefaultAppState,
  loadAppState,
  resetAppState,
  saveAppState,
} from "./utils/appStorage";
import {
  getCurrentUser,
  loginWithLocalProfile,
  updateLocalUser,
} from "./utils/authService";
import { calculateCoins } from "./utils/sessionUtils";

const appName = "Procrastibaker";
const githubUrl = "https://github.com/TheRealSouls/procrastinbaker";

export function App() {
  const [appState, setAppState] = useState(() => ({
    ...loadAppState(),
    user: getCurrentUser(),
  }));
  const [view, setView] = useState<View>(() =>
    appState.user ? "dashboard" : "login",
  );

  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  function handleLogin(username: string, email: string) {
    const user = loginWithLocalProfile(username, email);

    setAppState((current) => ({ ...current, user }));
    setView("dashboard");
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
          tag,
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
          tag,
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

  function handleResetData() {
    resetAppState();
    setAppState(createDefaultAppState());
    setView("login");
  }

  function handleAddDemoCompletedSessions() {
    setAppState((current) => ({
      ...current,
      completedSessions: [
        createDemoSession("cookie", "Study", 25, true, 1),
        createDemoSession("brownie", "Reading", 45, true, 3),
        createDemoSession("cookie", "Revision", 30, true, 5),
        ...current.completedSessions,
      ],
    }));
  }

  function handleAddDemoExpiredSessions() {
    setAppState((current) => ({
      ...current,
      expiredSessions: [
        createDemoSession("brownie", "Project", 40, false, 2),
        createDemoSession("cookie", "Work", 20, false, 6),
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

  if (!appState.user) {
    return (
      <main className="login-screen">
        <LoginView onLogin={handleLogin} />
      </main>
    );
  }

  return (
    <div className="app-shell">
      <div className="mobile-topbar">
        <div>
          <span aria-hidden="true">🥐</span>
          <strong>{appName}</strong>
        </div>
        <small aria-label={`Current coin balance: ${appState.user.coins} coins`}>
          {appState.user.coins} coins
        </small>
      </div>

      <aside className="sidebar">
        <div className="brand">
          <span aria-hidden="true">🥐</span>
          <div>
            <strong>{appName}</strong>
            <small aria-label={`Current coin balance: ${appState.user.coins} coins`}>
              {appState.user.coins} coins
            </small>
          </div>
        </div>
        <AppNav currentView={view} onChange={setView} />
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
            state={appState}
            onNavigate={setView}
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
            onAudioSettingsChange={handleAudioSettingsChange}
            onSelectPastry={handleSelectPastry}
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
    </div>
  );
}

function createDemoSession(
  pastryId: string,
  tag: StudyTag,
  durationMinutes: number,
  completed: boolean,
  daysAgo: number,
): StudySession {
  const pastry = pastries.find((item) => item.id === pastryId) ?? pastries[0];
  const endedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  const startedAt = new Date(endedAt.getTime() - durationMinutes * 60 * 1000);

  return {
    id: crypto.randomUUID(),
    pastryId: pastry.id,
    pastryName: pastry.name,
    tag,
    durationMinutes,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    completed,
    expired: !completed,
  };
}
