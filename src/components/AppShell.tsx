import { Navigate, NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppNav } from "./AppNav";
import { LofiPlayer } from "./LofiPlayer";
import { StreakBadge } from "./StreakBadge";
import { useApp } from "../context/AppContext";
import croissantIcon from "../media/sprites/icon.png";

const appName = "Procrastibaker";
const githubUrl = "https://github.com/TheRealSouls/procrastibaker";

export function AppShell() {
  const { t } = useTranslation();
  const { appState, isAppStateLoading, appStateError, isAuthLoading, handleLogout } =
    useApp();

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
          <strong className="app-wordmark">{appName}</strong>
        </div>
        <div className="mobile-topbar__status">
          <StreakBadge count={appState.user.streakCount} />
          <small
            aria-label={t("shell.coinBalanceAria", {
              count: appState.user.coins,
            })}
          >
            {t("shell.coins", { count: appState.user.coins })}
          </small>
        </div>
        <button
          className="mobile-sign-out"
          disabled={isAuthLoading}
          onClick={handleLogout}
          type="button"
        >
          {t("shell.signOut")}
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
            <strong className="app-wordmark">{appName}</strong>
            <small
              aria-label={t("shell.coinBalanceAria", {
                count: appState.user.coins,
              })}
            >
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
          onClick={handleLogout}
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

      <main className="main-content">
        {appStateError && (
          <p className="auth-error" role="alert">
            {appStateError}
          </p>
        )}
        <Outlet />
      </main>

      <LofiPlayer />
    </div>
  );
}
