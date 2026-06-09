import type { CSSProperties } from "react";
import { EmptyState } from "../components/EmptyState";
import { PastryVisual } from "../components/PastryVisual";
import { ProgressBar } from "../components/ProgressBar";
import { StatCard } from "../components/StatCard";
import type { AppState } from "../types";
import { formatMinutes } from "../utils/sessionUtils";
import {
  getCompletionRate,
  getPastryCounts,
  getTotalMinutesByTag,
} from "../utils/statsUtils";

type StatsViewProps = {
  state: AppState;
};

export function StatsView({ state }: StatsViewProps) {
  const tagMinutes = getTotalMinutesByTag(
    state.completedSessions,
    state.tags,
  );
  const totalCompletedMinutes = tagMinutes.reduce(
    (total, entry) => total + entry.minutes,
    0,
  );
  const maxTagMinutes = Math.max(...tagMinutes.map((entry) => entry.minutes), 0);
  const pastryCounts = getPastryCounts(state.completedSessions);
  const totalSessions =
    state.completedSessions.length + state.expiredSessions.length;
  const completionRate = getCompletionRate(
    state.completedSessions,
    state.expiredSessions,
  );
  const mostBakedPastry = pastryCounts.reduce(
    (best, entry) => (entry.count > best.count ? entry : best),
    { count: 0, emoji: "", id: "", name: "", totalMinutes: 0 },
  );
  const mostUsedTag = getMostUsedTagSummary(state.completedSessions);

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
        <StatCard label="Work minutes" value={getTagMinutes(tagMinutes, "work")} />
        <StatCard label="Break minutes" value={getTagMinutes(tagMinutes, "break")} />
        <StatCard
          label="Revision minutes"
          value={getTagMinutes(tagMinutes, "revision")}
        />
        <StatCard
          label="Reading minutes"
          value={getTagMinutes(tagMinutes, "reading")}
        />
        <StatCard
          label="Project minutes"
          value={getTagMinutes(tagMinutes, "project")}
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
          accessory={
            mostBakedPastry.count > 0 ? (
              <PastryVisual
                className="stat-card__pastry"
                emoji={mostBakedPastry.emoji}
                pastryId={mostBakedPastry.id}
                pastryName={mostBakedPastry.name}
              />
            ) : undefined
          }
          label="Most baked pastry"
          value={mostBakedPastry.count > 0 ? mostBakedPastry.name : "None yet"}
        />
        <StatCard
          accessory={
            mostUsedTag ? (
              <span
                aria-hidden="true"
                className="tag-dot stat-card__tag-dot"
                style={{ "--tag-color": mostUsedTag.color } as CSSProperties}
              />
            ) : undefined
          }
          label="Most used tag"
          value={mostUsedTag?.name ?? "None yet"}
        />
      </section>

      <section className="page-card">
        <div className="section-title-row">
          <h2>Tag breakdown</h2>
          <span>{formatMinutes(totalCompletedMinutes)} total</span>
        </div>
        <div className="bar-list">
          {tagMinutes.map((entry) => (
            <div
              className="bar-row"
              key={entry.tagId}
              style={{ "--tag-color": entry.tagColor } as CSSProperties}
            >
              <span className="tag-label">
                <span className="tag-dot" aria-hidden="true" />
                <span>{entry.tagName}</span>
              </span>
              <ProgressBar
                ariaLabel={`${entry.tagName} minutes`}
                fillClassName="bar-fill tag-bar-fill"
                max={maxTagMinutes}
                value={entry.minutes}
                valueText={formatMinutes(entry.minutes)}
              />
              <strong>{formatMinutes(entry.minutes)}</strong>
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

function getTagMinutes(
  tagMinutes: ReturnType<typeof getTotalMinutesByTag>,
  tagId: string,
) {
  return tagMinutes.find((entry) => entry.tagId === tagId)?.minutes ?? 0;
}

function getMostUsedTagSummary(sessions: AppState["completedSessions"]) {
  const totals = new Map<string, { color: string; count: number; name: string }>();

  for (const session of sessions) {
    const key = session.tagId || session.tagName;
    const total = totals.get(key) ?? {
      color: session.tagColor,
      count: 0,
      name: session.tagName,
    };

    total.count += 1;
    totals.set(key, total);
  }

  const mostUsed = [...totals.values()].reduce(
    (best, entry) => (entry.count > best.count ? entry : best),
    { color: "", count: 0, name: "" },
  );

  return mostUsed.count > 0 ? mostUsed : null;
}
