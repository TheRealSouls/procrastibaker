import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../components/EmptyState";
import { FocusHeatmap } from "../components/FocusHeatmap";
import { FocusMomentum } from "../components/FocusMomentum";
import { PastryVisual } from "../components/PastryVisual";
import { StatCard } from "../components/StatCard";
import { TagDonutChart } from "../components/TagDonutChart";
import { WeeklyTrendChart } from "../components/WeeklyTrendChart";
import type { AppState } from "../types";
import { formatMinutes } from "../utils/sessionUtils";
import {
  getCompletionRate,
  getFocusRecords,
  getHeatmapWeeks,
  getPastryCounts,
  getTotalMinutesByTag,
  getWeeklyFocus,
  getWeekOverWeekDelta,
} from "../utils/statsUtils";

type StatsViewProps = {
  state: AppState;
};

export function StatsView({ state }: StatsViewProps) {
  const { t } = useTranslation();
  const tagMinutes = getTotalMinutesByTag(
    state.completedSessions,
    state.tags,
  );
  const totalCompletedMinutes = tagMinutes.reduce(
    (total, entry) => total + entry.minutes,
    0,
  );
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
  const hasFocusData = state.completedSessions.length > 0;
  const heatmap = getHeatmapWeeks(state.completedSessions, 17);
  const weekly = getWeeklyFocus(
    state.completedSessions,
    state.expiredSessions,
    8,
  );
  const weekDelta = getWeekOverWeekDelta(weekly);
  const focusRecords = getFocusRecords(state.completedSessions);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <h1>{t("stats.title")}</h1>
        <p>{t("stats.intro")}</p>
      </section>

      {totalSessions === 0 && (
        <EmptyState icon={"\u{1F4DA}"} title={t("stats.emptyTitle")}>
          {t("stats.emptyBody")}
        </EmptyState>
      )}

      {hasFocusData && (
        <>
          <FocusMomentum
            delta={weekDelta}
            records={focusRecords}
            streakCount={state.user?.streakCount ?? 0}
          />

          <section className="page-card">
            <div className="section-title-row">
              <h2>{t("stats.focusCalendar")}</h2>
              <span>{t("stats.lastFourMonths")}</span>
            </div>
            <FocusHeatmap data={heatmap} />
          </section>

          <section className="page-card">
            <div className="section-title-row">
              <h2>{t("stats.weeklyTrend")}</h2>
              <span>{t("stats.lastEightWeeks")}</span>
            </div>
            <WeeklyTrendChart data={weekly} />
          </section>
        </>
      )}

      <section className="card-grid" aria-label={t("stats.summaryAria")}>
        <StatCard
          label={t("stats.completedMinutes")}
          value={totalCompletedMinutes}
        />
        <StatCard label={t("stats.workMinutes")} value={getTagMinutes(tagMinutes, "work")} />
        <StatCard label={t("stats.breakMinutes")} value={getTagMinutes(tagMinutes, "break")} />
        <StatCard
          label={t("stats.revisionMinutes")}
          value={getTagMinutes(tagMinutes, "revision")}
        />
        <StatCard
          label={t("stats.readingMinutes")}
          value={getTagMinutes(tagMinutes, "reading")}
        />
        <StatCard
          label={t("stats.projectMinutes")}
          value={getTagMinutes(tagMinutes, "project")}
        />
        <StatCard
          label={t("stats.totalSessions")}
          value={state.completedSessions.length}
        />
        <StatCard
          label={t("stats.failedSessions")}
          value={state.expiredSessions.length}
        />
        <StatCard label={t("stats.completionRate")} value={`${completionRate}%`} />
        <StatCard label={t("stats.coinBalance")} value={state.user?.coins ?? 0} />
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
          label={t("stats.mostBaked")}
          value={
            mostBakedPastry.count > 0 ? mostBakedPastry.name : t("stats.noneYet")
          }
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
          label={t("stats.mostUsedTag")}
          value={mostUsedTag?.name ?? t("stats.noneYet")}
        />
      </section>

      <section className="page-card tag-breakdown-card">
        <div className="section-title-row">
          <h2>{t("stats.tagBreakdown")}</h2>
          <span>
            {t("stats.totalSuffix", {
              time: formatMinutes(totalCompletedMinutes),
            })}
          </span>
        </div>
        <TagDonutChart data={tagMinutes} totalMinutes={totalCompletedMinutes} />
      </section>

      <section className="page-card">
        <div className="section-title-row">
          <h2>{t("stats.pastryBreakdown")}</h2>
          <span>
            {t("stats.bakedCount", { count: state.completedSessions.length })}
          </span>
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
