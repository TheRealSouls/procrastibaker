import { EmptyState } from "../components/EmptyState";
import { PastryVisual } from "../components/PastryVisual";
import { ProgressBar } from "../components/ProgressBar";
import { StatCard } from "../components/StatCard";
import { studyTags } from "../data/tags";
import type { AppState } from "../types";
import { formatMinutes } from "../utils/sessionUtils";
import {
  getCompletionRate,
  getMostBakedPastry,
  getMostUsedTag,
  getPastryCounts,
  getTotalMinutesByTag,
} from "../utils/statsUtils";

type StatsViewProps = {
  state: AppState;
};

export function StatsView({ state }: StatsViewProps) {
  const tagMinutesByTag = getTotalMinutesByTag(state.completedSessions);
  const tagMinutes = studyTags.map((tag) => ({
    label: tag,
    value: tagMinutesByTag[tag],
  }));
  const totalCompletedMinutes = Object.values(tagMinutesByTag).reduce(
    (total, minutes) => total + minutes,
    0,
  );
  const maxTagMinutes = Math.max(...tagMinutes.map((entry) => entry.value), 0);
  const pastryCounts = getPastryCounts(state.completedSessions);
  const totalSessions =
    state.completedSessions.length + state.expiredSessions.length;
  const completionRate = getCompletionRate(
    state.completedSessions,
    state.expiredSessions,
  );

  return (
    <div className="page-stack">
      <section className="page-heading">
        <h1>Study stats</h1>
        <p>
          A clear breakdown of completed focus time, stopped sessions, pastry
          bakes, and study tag patterns.
        </p>
      </section>

      {totalSessions === 0 && (
        <EmptyState icon={"\u{1F4DA}"} title="No study data yet.">
          Complete or cancel a baking session to start filling your stats.
        </EmptyState>
      )}

      <section className="card-grid" aria-label="Study statistics summary">
        <StatCard
          label="Completed study minutes"
          value={totalCompletedMinutes}
        />
        <StatCard label="Work minutes" value={tagMinutesByTag.Work} />
        <StatCard label="Break minutes" value={tagMinutesByTag.Break} />
        <StatCard
          label="Revision minutes"
          value={tagMinutesByTag.Revision}
        />
        <StatCard
          label="Reading minutes"
          value={tagMinutesByTag.Reading}
        />
        <StatCard
          label="Project minutes"
          value={tagMinutesByTag.Project}
        />
        <StatCard
          label="Total completed sessions"
          value={state.completedSessions.length}
        />
        <StatCard
          label="Total failed sessions"
          value={state.expiredSessions.length}
        />
        <StatCard label="Completion rate" value={`${completionRate}%`} />
        <StatCard label="Current coin balance" value={state.user?.coins ?? 0} />
        <StatCard
          label="Most baked pastry"
          value={getMostBakedPastry(state.completedSessions) ?? "None yet"}
        />
        <StatCard
          label="Most used tag"
          value={getMostUsedTag(state.completedSessions) ?? "None yet"}
        />
      </section>

      <section className="page-card">
        <div className="section-title-row">
          <h2>Tag breakdown</h2>
          <span>{formatMinutes(totalCompletedMinutes)} total</span>
        </div>
        <div className="bar-list">
          {tagMinutes.map((entry) => (
            <div className="bar-row" key={entry.label}>
              <span>{entry.label}</span>
              <ProgressBar
                ariaLabel={`${entry.label} minutes`}
                max={maxTagMinutes}
                value={entry.value}
                valueText={formatMinutes(entry.value)}
              />
              <strong>{formatMinutes(entry.value)}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="page-card">
        <div className="section-title-row">
          <h2>Pastry breakdown</h2>
          <span>{state.completedSessions.length} baked</span>
        </div>
        <div className="pastry-breakdown-grid">
          {pastryCounts.map((entry) => (
            <article className="pastry-breakdown-card" key={entry.id}>
              <PastryVisual
                className="pastry-breakdown-card__visual"
                emoji={entry.emoji}
                pastryId={entry.id}
                pastryName={entry.name}
              />
              <div>
                <h3>{entry.name}</h3>
                <strong>{entry.count}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
