import { useEffect, useRef, useState } from "react";
import { Navigate, NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppNav } from "./AppNav";
import { CoinIcon } from "./CoinIcon";
import { ConfirmationModal } from "./ConfirmationModal";
import { EmailVerificationBanner } from "./EmailVerificationBanner";
import { GiftAlertModal } from "./GiftAlertModal";
import { LofiPlayer } from "./LofiPlayer";
import { StreakBadge } from "./StreakBadge";
import { useApp } from "../context/AppContext";
import { usePreferences } from "../hooks/usePreferences";
import { useDailyReminder } from "../hooks/useDailyReminder";
import croissantIcon from "../media/sprites/icon.png";
import { focusMinutesOnDate } from "../utils/leaderboard";

const appName = "Procrastibaker";
const githubUrl = "https://github.com/TheRealSouls/procrastibaker";

export function AppShell() {
  const { t } = useTranslation();
  const {
    appState,
    isAppStateLoading,
    appStateError,
    isAuthLoading,
    handleLogout,
    hasActiveSession,
    discardActiveSession,
  } = useApp();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  // Collapsing the bottom bar hands the page back a chunk of vertical space,
  // which matters most on tall narrow phones.
  const [navCollapsed, setNavCollapsed] = useState(false);
  // Applying the theme here covers every signed-in screen.
  usePreferences();
  const sidebarRef = useRef<HTMLElement | null>(null);

  // On narrow screens the sidebar becomes a fixed bottom bar that floats over
  // the page. Publish its measured height as --bottom-bar-height so the layout
  // can reserve exactly that much space. Measured rather than hardcoded because
  // the bar grows with its contents, and a stale guess leaves the last card
  // permanently hidden underneath it.
  useEffect(() => {
    const node = sidebarRef.current;

    if (!node) {
      return;
    }

    function publishHeight() {
      const sidebar = sidebarRef.current;

      if (!sidebar) {
        return;
      }

      // On desktop the sidebar is a normal column, so nothing overlaps.
      const isBottomBar = getComputedStyle(sidebar).position === "fixed";
      document.documentElement.style.setProperty(
        "--bottom-bar-height",
        isBottomBar ? `${Math.ceil(sidebar.getBoundingClientRect().height)}px` : "0px",
      );
    }

    publishHeight();

    const observer = new ResizeObserver(publishHeight);
    observer.observe(node);
    window.addEventListener("resize", publishHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", publishHeight);
      document.documentElement.style.removeProperty("--bottom-bar-height");
    };
  }, []);

  // Signing out mid-bake would strand the pastry: the timer's own cleanup runs
  // after auth is gone, so its write would be rejected. Confirm first, then
  // expire and log the bake while still signed in.
  function requestSignOut() {
    if (hasActiveSession) {
      setShowSignOutConfirm(true);
      return;
    }

    handleLogout();
  }

  async function confirmSignOut() {
    setShowSignOutConfirm(false);
    await discardActiveSession();
    handleLogout();
  }

  const dailyGoalMet = appState.user
    ? focusMinutesOnDate(appState.completedSessions) >=
      appState.user.dailyGoalMinutes
    : false;
  useDailyReminder(dailyGoalMet);

  if (isAppStateLoading) {
    return (
      <main className="login-screen">
        <section className="page-card login-card">
          <h1>{t("shell.loadingTitle")}</h1>
          <p>{t("shell.loadingBody")}</p>
        </section>
      </main>
    );
  }

  if (!appState.user) {
    return <Navigate replace to="/login" />;
  }

  return (
    <div className={`app-shell${navCollapsed ? " nav-collapsed" : ""}`}>
      {/* Keyboard and screen-reader users can jump straight past the nav. */}
      <a className="skip-link" href="#main-content">
        {t("shell.skipToContent")}
      </a>
      <div className="mobile-topbar">
        <div>
          <img
            alt=""
            aria-hidden="true"
            className="app-brand-icon"
            draggable={false}
            src={croissantIcon}
          />
          <strong className="app-wordmark">{appName}</strong>
        </div>
        <div className="mobile-topbar__status">
          <StreakBadge count={appState.user.streakCount} />
          <small
            aria-label={t("shell.coinBalanceAria", {
              count: appState.user.coins,
            })}
          >
            <CoinIcon />
            {t("shell.coins", { count: appState.user.coins })}
          </small>
        </div>
        <button
          className="mobile-sign-out"
          disabled={isAuthLoading}
          onClick={requestSignOut}
          type="button"
        >
          {t("shell.signOut")}
        </button>
      </div>

      <aside className="sidebar" ref={sidebarRef}>
        <button
          aria-controls="primary-nav"
          aria-expanded={!navCollapsed}
          aria-label={
            navCollapsed ? t("shell.expandNav") : t("shell.collapseNav")
          }
          className="sidebar-collapse"
          onClick={() => setNavCollapsed((value) => !value)}
          type="button"
        >
          <i
            aria-hidden="true"
            className={
              navCollapsed ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down"
            }
          />
        </button>
        <div className="brand">
          <img
            alt=""
            aria-hidden="true"
            className="app-brand-icon"
            draggable={false}
            src={croissantIcon}
          />
          <div>
            <strong className="app-wordmark">{appName}</strong>
            <small
              aria-label={t("shell.coinBalanceAria", {
                count: appState.user.coins,
              })}
            >
              <CoinIcon />
              {t("shell.coins", { count: appState.user.coins })}
            </small>
            <StreakBadge
              className="brand__streak"
              count={appState.user.streakCount}
            />
          </div>
        </div>
        <AppNav />
        <NavLink
          className={({ isActive }) =>
            isActive ? "sidebar-account active" : "sidebar-account"
          }
          to="/account"
        >
          {t("shell.accountPrivacy")}
        </NavLink>
        <button
          className="sidebar-sign-out"
          disabled={isAuthLoading}
          onClick={requestSignOut}
          type="button"
        >
          {t("shell.signOut")}
        </button>
        <a
          aria-label={t("shell.githubAria")}
          className="sidebar-github"
          href={githubUrl}
          rel="noreferrer"
          target="_blank"
        >
          <i className="fa-brands fa-github fa-2x" aria-hidden="true" />
          <span>{t("shell.github")}</span>
        </a>
      </aside>

      <main className="main-content" id="main-content" tabIndex={-1}>
        <EmailVerificationBanner />
        {appStateError && (
          <p className="auth-error" role="alert">
            {appStateError}
          </p>
        )}
        <Outlet />
      </main>

      <LofiPlayer />

      {/* Announces incoming gifts and returning thanks, including on sign-in. */}
      <GiftAlertModal />

      {showSignOutConfirm && (
        <ConfirmationModal
          cancelLabel={t("shell.signOutBakingCancel")}
          confirmLabel={t("shell.signOutBakingConfirm")}
          message={t("shell.signOutBakingMsg")}
          onCancel={() => setShowSignOutConfirm(false)}
          onConfirm={() => void confirmSignOut()}
          title={t("shell.signOutBakingTitle")}
        />
      )}
    </div>
  );
}
