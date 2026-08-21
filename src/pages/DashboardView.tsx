import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { DeveloperTools } from "../components/DeveloperTools";
import { PastryVisual } from "../components/PastryVisual";
import { ProgressBar } from "../components/ProgressBar";
import { StatCard } from "../components/StatCard";
import { StreakBadge } from "../components/StreakBadge";
import { TodoList } from "../components/TodoList";
import { usePreferences } from "../hooks/usePreferences";
import { pastries } from "../data/pastries";
import {
  dailyGoalRewardCoins,
  MAX_DAILY_GOAL_MINUTES,
  MIN_DAILY_GOAL_MINUTES,
  USERNAME_COOLDOWN_MS,
  type UsernameChangeResult,
} from "../services/userProfileService";
import type { AppState, View } from "../types";
import { focusMinutesOnDate } from "../utils/leaderboard";
import { formatMinutes } from "../utils/sessionUtils";
import { daysBetween, MAX_FREEZES, todayKey } from "../utils/streakUtils";
import { validateUsername } from "../utils/validation";

const DAILY_GOAL_STEP = 15;

type DashboardViewProps = {
  onAddCoins: () => void;
  onAddDemoCompletedSessions: () => void;
  onAddDemoExpiredSessions: () => void;
  onFinishTestSession: () => void;
  onRunLocalMigration: () => void;
  state: AppState;
  onNavigate: (view: View) => void;
  onUsernameChange: (username: string) => Promise<UsernameChangeResult>;
  onDailyGoalChange: (minutes: number) => void;
  onResetData: () => void;
};

type StreakNudgeKey =
  | "dashboard.nudgeStart"
  | "dashboard.nudgeSafe"
  | "dashboard.nudgeKeep"
  | "dashboard.nudgeFreeze"
  | "dashboard.nudgeCooled";

export function DashboardView({
  onAddCoins,
  onAddDemoCompletedSessions,
  onAddDemoExpiredSessions,
  onFinishTestSession,
  onRunLocalMigration,
  state,
  onNavigate,
  onUsernameChange,
  onDailyGoalChange,
  onResetData,
}: DashboardViewProps) {
  const { t, i18n } = useTranslation();
  const { preferences } = usePreferences();
  const [username, setUsername] = useState(state.user?.username ?? "");
  const [usernameError, setUsernameError] = useState("");
  const [usernameNotice, setUsernameNotice] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const usernameChangedAt = state.user?.usernameChangedAt ?? 0;
  const nextChangeAt =
    usernameChangedAt > 0 ? usernameChangedAt + USERNAME_COOLDOWN_MS : 0;
  const cooldownActive = nextChangeAt > Date.now();

  function formatChangeDate(ms: number) {
    return new Date(ms).toLocaleDateString(i18n.language, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  const selectedPastry =
    pastries.find((pastry) => pastry.id === state.selectedPastryId) ??
    pastries[0];
  const completedMinutes = state.completedSessions.reduce(
    (total, session) => total + session.durationMinutes,
    0,
  );

  const streakCount = state.user?.streakCount ?? 0;
  const streakLongest = state.user?.streakLongest ?? 0;
  const streakFreezes = state.user?.streakFreezes ?? 0;

  const dailyGoalMinutes = state.user?.dailyGoalMinutes ?? 60;
  const todayMinutes = focusMinutesOnDate(state.completedSessions);
  const dailyGoalMet = todayMinutes >= dailyGoalMinutes;
  const dailyGoalRemaining = Math.max(0, dailyGoalMinutes - todayMinutes);
  // The bonus is once per day, so once banked the card must stop advertising it.
  // Otherwise lowering the goal below today's total looks like a fresh payout.
  const dailyGoalClaimed =
    (state.user?.dailyGoalRewardedDate ?? "") === todayKey();
  const dailyGoalReward = dailyGoalRewardCoins(dailyGoalMinutes);

  function adjustDailyGoal(delta: number) {
    const next = Math.min(
      MAX_DAILY_GOAL_MINUTES,
      Math.max(MIN_DAILY_GOAL_MINUTES, dailyGoalMinutes + delta),
    );

    if (next !== dailyGoalMinutes) {
      onDailyGoalChange(next);
    }
  }
  const streakNudgeKey = getStreakNudgeKey(
    streakCount,
    streakFreezes,
    state.user?.streakLastActiveDate ?? "",
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (savingUsername || cooldownActive) {
      return;
    }

    const nextUsername = username.trim();
    const error = validateUsername(nextUsername);

    if (error) {
      setUsernameNotice("");
      setUsernameError(error);
      return;
    }

    setUsernameError("");
    setUsernameNotice("");
    setSavingUsername(true);

    try {
      const result = await onUsernameChange(nextUsername);

      switch (result.status) {
        case "ok":
          setUsername(result.username);
          setUsernameNotice(t("dashboard.usernameSaved"));
          break;
        case "unchanged":
          setUsername(nextUsername);
          break;
        case "taken":
          setUsernameError(t("dashboard.usernameTaken"));
          break;
        case "cooldown":
          setUsernameError(
            t("dashboard.usernameCooldown", {
              date: formatChangeDate(result.nextChangeAt),
            }),
          );
          break;
        default:
          setUsernameError(t("dashboard.usernameError"));
      }
    } finally {
      setSavingUsername(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-card dashboard-hero">
        <div>
          <p className="quiet-text">{t("dashboard.welcomeBack")}</p>
          <h1>
            {t("dashboard.hello", {
              name: state.user?.username ?? "student",
            })}
          </h1>
          <p>{t("dashboard.heroBody")}</p>
          <div className="dashboard-actions">
            <button
              className="button primary"
              onClick={() => onNavigate("timer")}
              type="button"
            >
              {t("dashboard.startBaking")}
            </button>
            <button
              className="button"
              onClick={() => onNavigate("bakery")}
              type="button"
            >
              {t("dashboard.viewBakery")}
            </button>
            <button
              className="button"
              onClick={() => onNavigate("shop")}
              type="button"
            >
              {t("dashboard.openShop")}
            </button>
            <button
              className="button"
              onClick={() => onNavigate("stats")}
              type="button"
            >
              {t("dashboard.viewStats")}
            </button>
          </div>
        </div>
        <div
          className="hero-oven"
          aria-label={t("dashboard.selectedPastryAria", {
            name: selectedPastry.name,
          })}
        >
          <PastryVisual
            emoji={selectedPastry.emoji}
            pastryId={selectedPastry.id}
            pastryName={selectedPastry.name}
          />
        </div>
      </section>

      <section className="dashboard-grid" aria-label={t("dashboard.summaryAria")}>
        <StatCard
          description={t("dashboard.coinsDesc")}
          label={t("dashboard.coins")}
          value={state.user?.coins ?? 0}
          variant="metric"
        />
        <StatCard
          description={t("dashboard.completedTimeDesc")}
          label={t("dashboard.completedTime")}
          value={formatMinutes(completedMinutes)}
          variant="metric"
        />
        <StatCard
          description={t("dashboard.bakedPastriesDesc")}
          label={t("dashboard.bakedPastries")}
          value={state.completedSessions.length}
          variant="metric"
        />
        <StatCard
          description={t("dashboard.expiredPastriesDesc")}
          label={t("dashboard.expiredPastries")}
          value={state.expiredSessions.length}
          variant="metric"
        />
      </section>

      {preferences.showTodo && preferences.todoPosition === "top" && (
        <TodoList uid={state.user?.uid} />
      )}

      <section className="page-card streak-card" aria-labelledby="streak-heading">
        <div className="streak-card__main">
          <StreakBadge className="streak-card__badge" count={streakCount} />
          <div>
            <h2 id="streak-heading">
              {streakCount === 0
                ? t("dashboard.streakHeadingNone")
                : t("dashboard.streakHeading", { count: streakCount })}
            </h2>
            <p>{t(streakNudgeKey, { count: streakCount })}</p>
          </div>
        </div>
        <dl className="streak-card__meta">
          <div>
            <dt>{t("dashboard.longest")}</dt>
            <dd>{t("dashboard.dayCount", { count: streakLongest })}</dd>
          </div>
          <div>
            <dt>{t("dashboard.freezes")}</dt>
            <dd>
              {streakFreezes} / {MAX_FREEZES}
            </dd>
          </div>
        </dl>
      </section>

      <section
        className="page-card daily-goal-card"
        aria-labelledby="daily-goal-heading"
      >
        <div className="daily-goal-card__head">
          <div>
            <h2 id="daily-goal-heading">{t("dashboard.dailyGoalHeading")}</h2>
            <p>
              {dailyGoalClaimed
                ? t("dashboard.dailyGoalClaimed")
                : dailyGoalMet
                ? t("dashboard.dailyGoalMet", { coins: dailyGoalReward })
                : t("dashboard.dailyGoalRemaining", {
                    remaining: formatMinutes(dailyGoalRemaining),
                  })}
            </p>
          </div>
          <div className="daily-goal-card__stepper" role="group">
            <button
              aria-label={t("dashboard.dailyGoalDecrease")}
              className="button"
              disabled={dailyGoalMinutes <= MIN_DAILY_GOAL_MINUTES}
              onClick={() => adjustDailyGoal(-DAILY_GOAL_STEP)}
              type="button"
            >
              −
            </button>
            <span className="daily-goal-card__target">
              {t("dashboard.dailyGoalTarget", {
                minutes: formatMinutes(dailyGoalMinutes),
              })}
            </span>
            <button
              aria-label={t("dashboard.dailyGoalIncrease")}
              className="button"
              disabled={dailyGoalMinutes >= MAX_DAILY_GOAL_MINUTES}
              onClick={() => adjustDailyGoal(DAILY_GOAL_STEP)}
              type="button"
            >
              +
            </button>
          </div>
        </div>
        <p className="field-hint daily-goal-card__hint">
          {t("dashboard.dailyGoalRewardHint")}{" "}
          {t("dashboard.dailyGoalRewardValue", { count: dailyGoalReward })}
        </p>
        <ProgressBar
          ariaLabel={t("dashboard.dailyGoalAria")}
          className="bar-track daily-goal-card__bar"
          max={dailyGoalMinutes}
          value={todayMinutes}
          valueText={t("dashboard.dailyGoalProgress", {
            done: formatMinutes(todayMinutes),
            goal: formatMinutes(dailyGoalMinutes),
          })}
        />
        <p className="daily-goal-card__progress">
          {t("dashboard.dailyGoalProgress", {
            done: formatMinutes(todayMinutes),
            goal: formatMinutes(dailyGoalMinutes),
          })}
        </p>
      </section>

      <section
        className="dashboard-lower"
        aria-label={t("dashboard.profileSettingsAria")}
      >
        <article
          className="page-card selected-pastry-card"
          aria-labelledby="selected-pastry-heading"
        >
          <PastryVisual
            className="selected-pastry-card__visual"
            emoji={selectedPastry.emoji}
            pastryId={selectedPastry.id}
            pastryName={selectedPastry.name}
          />
          <div>
            <h2 id="selected-pastry-heading">{t("dashboard.selectedPastry")}</h2>
            <p>
              {t("dashboard.selectedPastryReady", { name: selectedPastry.name })}
            </p>
          </div>
        </article>

        <article className="page-card" aria-labelledby="username-heading">
          <h2 id="username-heading">{t("dashboard.username")}</h2>
          <p id="username-help">{t("dashboard.usernameHelp")}</p>
          <form className="username-form" onSubmit={handleSubmit}>
            <label htmlFor="profile-username">
              {t("dashboard.currentUsername")}
            </label>
            <div>
              <input
                aria-describedby="username-help"
                autoComplete="username"
                disabled={cooldownActive || savingUsername}
                id="profile-username"
                maxLength={32}
                name="username"
                onChange={(event) => {
                  setUsername(event.target.value);
                  setUsernameError("");
                  setUsernameNotice("");
                }}
                pattern="[A-Za-z0-9]+"
                title={t("dashboard.usernamePattern")}
                value={username}
              />
              <button
                className="button primary"
                disabled={cooldownActive || savingUsername}
                type="submit"
              >
                {t("common.save")}
              </button>
            </div>
          </form>
          {cooldownActive ? (
            <p className="field-hint" role="status">
              {t("dashboard.usernameCooldownNote", {
                date: formatChangeDate(nextChangeAt),
              })}
            </p>
          ) : (
            <p className="field-hint">{t("dashboard.usernameOncePerWeek")}</p>
          )}
          {usernameNotice && (
            <p className="auth-notice" role="status">
              {usernameNotice}
            </p>
          )}
          {usernameError && (
            <p className="auth-error" role="alert">
              {usernameError}
            </p>
          )}
        </article>
      </section>

      {preferences.showTodo && preferences.todoPosition === "bottom" && (
        <TodoList uid={state.user?.uid} />
      )}

      <DeveloperTools
        onAddCoins={onAddCoins}
        onAddDemoCompletedSessions={onAddDemoCompletedSessions}
        onAddDemoExpiredSessions={onAddDemoExpiredSessions}
        onFinishTestSession={onFinishTestSession}
        onRunLocalMigration={onRunLocalMigration}
        onResetData={onResetData}
      />
    </div>
  );
}

function getStreakNudgeKey(
  count: number,
  freezes: number,
  lastActiveDate: string,
): StreakNudgeKey {
  if (count === 0) {
    return "dashboard.nudgeStart";
  }

  const gap = lastActiveDate ? daysBetween(lastActiveDate, todayKey()) : null;

  if (gap === 0) {
    return "dashboard.nudgeSafe";
  }

  if (gap === 1) {
    return "dashboard.nudgeKeep";
  }

  if (gap === 2 && freezes > 0) {
    return "dashboard.nudgeFreeze";
  }

  return "dashboard.nudgeCooled";
}
