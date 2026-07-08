import {
  createBrowserRouter,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AppProvider, useApp } from "./context/AppContext";
import { LofiPlayerProvider } from "./context/LofiPlayerContext";
import { AccountView } from "./pages/AccountView";
import { BakeryView } from "./pages/BakeryView";
import { DashboardView } from "./pages/DashboardView";
import { FeedbackView } from "./pages/FeedbackView";
import { HomeView } from "./pages/HomeView";
import { CookiePolicyView } from "./pages/legal/CookiePolicyView";
import { PrivacyPolicyView } from "./pages/legal/PrivacyPolicyView";
import { TermsView } from "./pages/legal/TermsView";
import { LoginView } from "./pages/LoginView";
import { ShopView } from "./pages/ShopView";
import { StatsView } from "./pages/StatsView";
import { TimerView } from "./pages/TimerView";
import type { View } from "./types";

function HomeRoute() {
  const navigate = useNavigate();
  return <HomeView onStart={() => navigate("/dashboard")} />;
}

function LoginRoute() {
  const {
    appState,
    isAppStateLoading,
    appStateError,
    authError,
    authNotice,
    isAuthLoading,
    handleEmailSignIn,
    handleEmailSignUp,
    handleGoogleLogin,
    handlePasswordReset,
  } = useApp();

  if (isAppStateLoading) {
    return (
      <main className="login-screen">
        <section className="page-card login-card">
          <h1>Loading bakery...</h1>
        </section>
      </main>
    );
  }

  if (appState.user) {
    return <Navigate replace to="/dashboard" />;
  }

  return (
    <main className="login-screen">
      <LoginView
        authError={authError || appStateError}
        authNotice={authNotice}
        isAuthLoading={isAuthLoading}
        onEmailSignIn={handleEmailSignIn}
        onEmailSignUp={handleEmailSignUp}
        onGoogleLogin={handleGoogleLogin}
        onPasswordReset={handlePasswordReset}
      />
    </main>
  );
}

function DashboardRoute() {
  const navigate = useNavigate();
  const {
    appState,
    handleAddCoins,
    handleAddDemoCompletedSessions,
    handleAddDemoExpiredSessions,
    handleFinishTestSession,
    handleRunLocalMigration,
    handleUsernameChange,
    handleResetData,
  } = useApp();

  return (
    <DashboardView
      onAddCoins={handleAddCoins}
      onAddDemoCompletedSessions={handleAddDemoCompletedSessions}
      onAddDemoExpiredSessions={handleAddDemoExpiredSessions}
      onFinishTestSession={handleFinishTestSession}
      onRunLocalMigration={handleRunLocalMigration}
      state={appState}
      onNavigate={(view: View) => navigate(`/${view}`)}
      onUsernameChange={handleUsernameChange}
      onResetData={handleResetData}
    />
  );
}

function TimerRoute() {
  const {
    appState,
    handleCancelSession,
    handleCompleteSession,
    handleAudioSettingsChange,
    handleSelectPastry,
    handleTagsChange,
  } = useApp();

  return (
    <TimerView
      state={appState}
      onCancelSession={handleCancelSession}
      onCompleteSession={handleCompleteSession}
      onAudioSettingsChange={handleAudioSettingsChange}
      onSelectPastry={handleSelectPastry}
      onTagsChange={handleTagsChange}
    />
  );
}

function BakeryRoute() {
  const { appState } = useApp();
  return <BakeryView state={appState} />;
}

function ShopRoute() {
  const { appState, handleBuyPastry, handleBuyStreakFreeze, handleSelectPastry } =
    useApp();
  return (
    <ShopView
      state={appState}
      onBuyPastry={handleBuyPastry}
      onBuyStreakFreeze={handleBuyStreakFreeze}
      onSelectPastry={handleSelectPastry}
    />
  );
}

function StatsRoute() {
  const { appState } = useApp();
  return <StatsView state={appState} />;
}

function FeedbackRoute() {
  const { appState } = useApp();
  return <FeedbackView state={appState} />;
}

export const router = createBrowserRouter([
  {
    element: <AppProvider />,
    children: [
      { index: true, element: <HomeRoute /> },
      { path: "login", element: <LoginRoute /> },
      { path: "privacy", element: <PrivacyPolicyView /> },
      { path: "terms", element: <TermsView /> },
      { path: "cookies", element: <CookiePolicyView /> },
      {
        element: (
          <LofiPlayerProvider>
            <AppShell />
          </LofiPlayerProvider>
        ),
        children: [
          { path: "dashboard", element: <DashboardRoute /> },
          { path: "timer", element: <TimerRoute /> },
          { path: "bakery", element: <BakeryRoute /> },
          { path: "shop", element: <ShopRoute /> },
          { path: "stats", element: <StatsRoute /> },
          { path: "feedback", element: <FeedbackRoute /> },
          { path: "account", element: <AccountView /> },
        ],
      },
      { path: "*", element: <Navigate replace to="/dashboard" /> },
    ],
  },
]);
