import { FormEvent, useState } from "react";
import { DeveloperTools } from "../components/DeveloperTools";
import { PastryVisual } from "../components/PastryVisual";
import { StatCard } from "../components/StatCard";
import { pastries } from "../data/pastries";
import type { AppState, View } from "../types";
import { formatMinutes } from "../utils/sessionUtils";
import { getTotalMinutesByTag } from "../utils/statsUtils";

type DashboardViewProps = {
  onAddCoins: () => void;
  onAddDemoCompletedSessions: () => void;
  onAddDemoExpiredSessions: () => void;
  state: AppState;
  onNavigate: (view: View) => void;
  onUsernameChange: (username: string) => void;
  onResetData: () => void;
};

export function DashboardView({
  onAddCoins,
  onAddDemoCompletedSessions,
  onAddDemoExpiredSessions,
  state,
  onNavigate,
  onUsernameChange,
  onResetData,
}: DashboardViewProps) {
  const [username, setUsername] = useState(state.user?.username ?? "");
  const selectedPastry =
    pastries.find((pastry) => pastry.id === state.selectedPastryId) ??
    pastries[0];
  const completedMinutes = Object.values(
    getTotalMinutesByTag(state.completedSessions),
  ).reduce((total, minutes) => total + minutes, 0);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const nextUsername = username.trim().slice(0, 32);

    if (nextUsername) {
      onUsernameChange(nextUsername);
      setUsername(nextUsername);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-card dashboard-hero">
        <div>
          <p className="quiet-text">Welcome back</p>
          <h1>Hello, {state.user?.username ?? "student"}</h1>
          <p>
            Start a focused baking session, keep your pastry warm, and grow
            your study shelf one completed block at a time.
          </p>
          <div className="dashboard-actions">
            <button
              className="button primary"
              onClick={() => onNavigate("timer")}
              type="button"
            >
              Start Baking
            </button>
            <button
              className="button"
              onClick={() => onNavigate("bakery")}
              type="button"
            >
              View Bakery
            </button>
            <button
              className="button"
              onClick={() => onNavigate("shop")}
              type="button"
            >
              Open Shop
            </button>
            <button
              className="button"
              onClick={() => onNavigate("stats")}
              type="button"
            >
              View Stats
            </button>
          </div>
        </div>
        <div className="hero-oven" aria-label={`Selected pastry: ${selectedPastry.name}`}>
          <PastryVisual
            emoji={selectedPastry.emoji}
            pastryId={selectedPastry.id}
            pastryName={selectedPastry.name}
          />
        </div>
      </section>

      <section className="dashboard-grid" aria-label="Dashboard summary">
        <StatCard
          description="Saved bakery balance"
          label="Coins"
          value={state.user?.coins ?? 0}
          variant="metric"
        />
        <StatCard
          description="Total successful focus time"
          label="Completed study time"
          value={formatMinutes(completedMinutes)}
          variant="metric"
        />
        <StatCard
          description="Finished sessions"
          label="Baked pastries"
          value={state.completedSessions.length}
          variant="metric"
        />
        <StatCard
          description="Stopped early sessions"
          label="Expired pastries"
          value={state.expiredSessions.length}
          variant="metric"
        />
      </section>

      <section className="dashboard-lower">
        <article className="page-card selected-pastry-card">
          <PastryVisual
            className="selected-pastry-card__visual"
            emoji={selectedPastry.emoji}
            pastryId={selectedPastry.id}
            pastryName={selectedPastry.name}
          />
          <div>
            <h2>Selected pastry</h2>
            <p>
              {selectedPastry.name} is ready for your next baking session.
            </p>
          </div>
        </article>

        <article className="page-card">
          <h2>Username</h2>
          <p>Update the name shown around your study bakery.</p>
          <form className="username-form" onSubmit={handleSubmit}>
            <label htmlFor="profile-username">Current username</label>
            <div>
              <input
                autoComplete="username"
                id="profile-username"
                maxLength={32}
                onChange={(event) => setUsername(event.target.value)}
                pattern=".*\S.*"
                title="Enter at least one non-space character."
                value={username}
              />
              <button className="button primary" type="submit">
                Save
              </button>
            </div>
          </form>
        </article>
      </section>

      <DeveloperTools
        onAddCoins={onAddCoins}
        onAddDemoCompletedSessions={onAddDemoCompletedSessions}
        onAddDemoExpiredSessions={onAddDemoExpiredSessions}
        onResetData={onResetData}
      />
    </div>
  );
}
