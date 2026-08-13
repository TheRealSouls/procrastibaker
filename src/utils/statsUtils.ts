import { pastries } from "../data/pastries";
import { DEFAULT_TAGS, fallbackTagColor, findTagById } from "../data/tags";
import type { Season, StudySession, StudyTag } from "../types";
import { todayKey } from "./streakUtils";

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

// --- Small local date helpers (hand-rolled to match streakUtils conventions) ---

function atStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

/** Local Monday that starts the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const start = atStartOfDay(date);
  const mondayIndex = (start.getDay() + 6) % 7; // Sun=0 → 6, Mon=1 → 0, …
  return addDays(start, -mondayIndex);
}

/** "1 Jul"-style short label from a Date. */
function shortDayLabel(date: Date): string {
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`;
}

/** Buckets sessions by local calendar day (keyed off `endedAt`). */
function focusByDay(
  sessions: StudySession[],
): Map<string, { minutes: number; count: number }> {
  const byDay = new Map<string, { minutes: number; count: number }>();

  for (const session of sessions) {
    const ended = new Date(session.endedAt);
    if (Number.isNaN(ended.getTime())) {
      continue;
    }
    const key = todayKey(ended);
    const bucket = byDay.get(key) ?? { minutes: 0, count: 0 };
    bucket.minutes += Math.max(0, session.durationMinutes);
    bucket.count += 1;
    byDay.set(key, bucket);
  }

  return byDay;
}

export type DailyFocus = {
  dateKey: string;
  date: Date;
  minutes: number;
  count: number;
};

export type HeatmapCell = DailyFocus & { level: 0 | 1 | 2 | 3 | 4 };

export type HeatmapData = {
  // weeks[col] is a length-7 column (Mon..Sun); null = padding / future day.
  weeks: (HeatmapCell | null)[][];
  monthLabels: { column: number; label: string }[];
  maxMinutes: number;
  totalMinutes: number;
  activeDays: number;
};

export type WeeklyFocus = {
  weekStartKey: string;
  weekStart: Date;
  label: string;
  minutes: number;
  count: number;
  expired: number;
};

export type FocusRecords = {
  bestDayMinutes: number;
  bestDayKey: string | null;
  bestWeekMinutes: number;
  longestSessionMinutes: number;
  totalMinutes: number;
  activeDays: number;
};

/** Focus minutes/counts for each of the last `days` days (includes empty days). */
export function getDailyFocus(
  sessions: StudySession[],
  days: number,
  now: Date = new Date(),
): DailyFocus[] {
  const byDay = focusByDay(sessions);
  const today = atStartOfDay(now);
  const out: DailyFocus[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset);
    const dateKey = todayKey(date);
    const bucket = byDay.get(dateKey);
    out.push({
      dateKey,
      date,
      minutes: bucket?.minutes ?? 0,
      count: bucket?.count ?? 0,
    });
  }

  return out;
}

/** GitHub-style calendar grid of focus intensity over the last `weeks` weeks. */
export function getHeatmapWeeks(
  sessions: StudySession[],
  weeks = 17,
  now: Date = new Date(),
): HeatmapData {
  const byDay = focusByDay(sessions);
  const today = atStartOfDay(now);
  const gridStart = addDays(startOfWeek(today), -(weeks - 1) * 7);

  // First pass: build cells (minutes) and find the busiest day for scaling.
  const cells: (DailyFocus | null)[][] = [];
  let maxMinutes = 0;
  let totalMinutes = 0;
  let activeDays = 0;

  for (let col = 0; col < weeks; col += 1) {
    const column: (DailyFocus | null)[] = [];
    for (let row = 0; row < 7; row += 1) {
      const date = addDays(gridStart, col * 7 + row);
      // Future days (later this week) render as blank padding.
      if (date.getTime() > today.getTime()) {
        column.push(null);
        continue;
      }
      const dateKey = todayKey(date);
      const bucket = byDay.get(dateKey);
      const minutes = bucket?.minutes ?? 0;
      const count = bucket?.count ?? 0;
      if (minutes > 0) {
        maxMinutes = Math.max(maxMinutes, minutes);
        totalMinutes += minutes;
        activeDays += 1;
      }
      column.push({ dateKey, date, minutes, count });
    }
    cells.push(column);
  }

  // Second pass: assign 0–4 intensity levels from the max daily minutes.
  const weeksWithLevels: (HeatmapCell | null)[][] = cells.map((column) =>
    column.map((cell) =>
      cell === null ? null : { ...cell, level: focusLevel(cell.minutes, maxMinutes) },
    ),
  );

  // Month labels: mark the column where a new month first appears.
  const monthLabels: { column: number; label: string }[] = [];
  let lastMonth = -1;
  for (let col = 0; col < weeks; col += 1) {
    const monday = addDays(gridStart, col * 7);
    if (monday.getMonth() !== lastMonth) {
      lastMonth = monday.getMonth();
      monthLabels.push({ column: col, label: SHORT_MONTHS[lastMonth] });
    }
  }

  return { weeks: weeksWithLevels, monthLabels, maxMinutes, totalMinutes, activeDays };
}

function focusLevel(minutes: number, maxMinutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0 || maxMinutes <= 0) {
    return 0;
  }
  const ratio = minutes / maxMinutes;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

/** Weekly focus totals for the last `weeks` weeks (Monday-start, includes empty). */
export function getWeeklyFocus(
  completedSessions: StudySession[],
  expiredSessions: StudySession[],
  weeks = 8,
  now: Date = new Date(),
): WeeklyFocus[] {
  const completedByWeek = new Map<string, { minutes: number; count: number }>();
  const expiredByWeek = new Map<string, number>();

  for (const session of completedSessions) {
    const key = weekStartKeyFor(session.endedAt);
    if (!key) continue;
    const bucket = completedByWeek.get(key) ?? { minutes: 0, count: 0 };
    bucket.minutes += Math.max(0, session.durationMinutes);
    bucket.count += 1;
    completedByWeek.set(key, bucket);
  }

  for (const session of expiredSessions) {
    const key = weekStartKeyFor(session.endedAt);
    if (!key) continue;
    expiredByWeek.set(key, (expiredByWeek.get(key) ?? 0) + 1);
  }

  const firstWeek = addDays(startOfWeek(now), -(weeks - 1) * 7);
  const out: WeeklyFocus[] = [];

  for (let i = 0; i < weeks; i += 1) {
    const weekStart = addDays(firstWeek, i * 7);
    const weekStartKey = todayKey(weekStart);
    const completed = completedByWeek.get(weekStartKey);
    out.push({
      weekStartKey,
      weekStart,
      label: shortDayLabel(weekStart),
      minutes: completed?.minutes ?? 0,
      count: completed?.count ?? 0,
      expired: expiredByWeek.get(weekStartKey) ?? 0,
    });
  }

  return out;
}

function weekStartKeyFor(dateStr: string): string | null {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return todayKey(startOfWeek(date));
}

/** Personal records used by the momentum strip. */
export function getFocusRecords(sessions: StudySession[]): FocusRecords {
  const byDay = focusByDay(sessions);

  let bestDayMinutes = 0;
  let bestDayKey: string | null = null;
  let totalMinutes = 0;
  let activeDays = 0;

  for (const [key, bucket] of byDay) {
    totalMinutes += bucket.minutes;
    if (bucket.minutes > 0) {
      activeDays += 1;
    }
    if (bucket.minutes > bestDayMinutes) {
      bestDayMinutes = bucket.minutes;
      bestDayKey = key;
    }
  }

  const byWeek = new Map<string, number>();
  for (const session of sessions) {
    const key = weekStartKeyFor(session.endedAt);
    if (!key) continue;
    byWeek.set(key, (byWeek.get(key) ?? 0) + Math.max(0, session.durationMinutes));
  }
  const bestWeekMinutes = byWeek.size > 0 ? Math.max(...byWeek.values()) : 0;

  const longestSessionMinutes = sessions.reduce(
    (longest, session) => Math.max(longest, Math.max(0, session.durationMinutes)),
    0,
  );

  return {
    bestDayMinutes,
    bestDayKey,
    bestWeekMinutes,
    longestSessionMinutes,
    totalMinutes,
    activeDays,
  };
}

/**
 * Week-over-week delta for the momentum headline. `deltaPercent` is null when
 * there's no prior week to compare against (or the prior week had zero focus).
 */
export function getWeekOverWeekDelta(
  weekly: WeeklyFocus[],
): { current: number; previous: number; deltaPercent: number | null } | null {
  if (weekly.length < 2) {
    return null;
  }
  const current = weekly[weekly.length - 1].minutes;
  const previous = weekly[weekly.length - 2].minutes;

  if (previous === 0) {
    // Nothing to compare against, surface "new" progress only if there is some.
    return current > 0 ? { current, previous, deltaPercent: null } : null;
  }

  return {
    current,
    previous,
    deltaPercent: Math.round(((current - previous) / previous) * 100),
  };
}

export type PastryCount = {
  count: number;
  emoji: string;
  id: string;
  name: string;
  totalMinutes: number;
  // Set for limited-run pastries, so the UI can badge them and hide the ones
  // that are out of season and have never been baked.
  season?: Season;
};

export type TagMinuteTotal = {
  tagId: string;
  tagName: string;
  tagColor: string;
  minutes: number;
};

export function getTotalMinutesByTag(
  sessions: StudySession[],
  tags: StudyTag[] = DEFAULT_TAGS,
): TagMinuteTotal[] {
  const totals = new Map<string, TagMinuteTotal>();

  for (const tag of tags) {
    totals.set(tag.id, {
      tagId: tag.id,
      tagName: tag.name,
      tagColor: tag.color,
      minutes: 0,
    });
  }

  for (const session of sessions) {
    const tag = findTagById(tags, session.tagId);
    const tagId = session.tagId || tag?.id || session.tagName;
    const total = totals.get(tagId) ?? {
      tagId,
      tagName: session.tagName || tag?.name || "Unknown",
      tagColor: session.tagColor || tag?.color || fallbackTagColor,
      minutes: 0,
    };

    total.minutes += session.durationMinutes;
    totals.set(tagId, total);
  }

  return [...totals.values()];
}

export function getPastryCounts(sessions: StudySession[]): PastryCount[] {
  return pastries.map<PastryCount>((pastry) =>
    sessions.reduce<PastryCount>(
      (summary, session) =>
        session.pastryId === pastry.id
          ? {
              ...summary,
              count: summary.count + 1,
              totalMinutes: summary.totalMinutes + session.durationMinutes,
            }
          : summary,
      {
        count: 0,
        emoji: pastry.emoji,
        id: pastry.id,
        name: pastry.name,
        totalMinutes: 0,
        ...(pastry.season ? { season: pastry.season } : {}),
      },
    ),
  );
}

export function getCompletionRate(
  completedSessions: StudySession[],
  expiredSessions: StudySession[],
): number {
  const totalSessions = completedSessions.length + expiredSessions.length;

  return totalSessions === 0
    ? 0
    : Math.round((completedSessions.length / totalSessions) * 100);
}

export function getMostUsedTag(sessions: StudySession[]): string | null {
  const totals = new Map<string, { count: number; name: string }>();

  for (const session of sessions) {
    const key = session.tagId || session.tagName;
    const total = totals.get(key) ?? { count: 0, name: session.tagName };

    total.count += 1;
    totals.set(key, total);
  }

  const mostUsed = [...totals.values()].reduce(
    (best, entry) => (entry.count > best.count ? entry : best),
    { count: 0, name: null as string | null },
  );

  return mostUsed.count > 0 ? mostUsed.name : null;
}

export function getMostBakedPastry(sessions: StudySession[]): string | null {
  const mostBaked = getPastryCounts(sessions).reduce(
    (best, entry) => (entry.count > best.count ? entry : best),
    { count: 0, name: null as string | null },
  );

  return mostBaked.count > 0 ? mostBaked.name : null;
}
