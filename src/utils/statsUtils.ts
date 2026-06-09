import { pastries } from "../data/pastries";
import { studyTags } from "../data/tags";
import type { StudySession, StudyTag } from "../types";

export type PastryCount = {
  count: number;
  emoji: string;
  id: string;
  name: string;
  totalMinutes: number;
};

export function getTotalMinutesByTag(
  sessions: StudySession[],
): Record<StudyTag, number> {
  return studyTags.reduce<Record<StudyTag, number>>(
    (totals, tag) => ({
      ...totals,
      [tag]: sessions.reduce(
        (total, session) =>
          session.tag === tag ? total + session.durationMinutes : total,
        0,
      ),
    }),
    {
      Study: 0,
      Work: 0,
      Break: 0,
      Revision: 0,
      Reading: 0,
      Project: 0,
    },
  );
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

export function getMostUsedTag(sessions: StudySession[]): StudyTag | null {
  const totals = studyTags.map((tag) => ({
    tag,
    count: sessions.filter((session) => session.tag === tag).length,
  }));
  const mostUsed = totals.reduce(
    (best, entry) => (entry.count > best.count ? entry : best),
    { count: 0, tag: null as StudyTag | null },
  );

  return mostUsed.count > 0 ? mostUsed.tag : null;
}

export function getMostBakedPastry(sessions: StudySession[]): string | null {
  const mostBaked = getPastryCounts(sessions).reduce(
    (best, entry) => (entry.count > best.count ? entry : best),
    { count: 0, name: null as string | null },
  );

  return mostBaked.count > 0 ? mostBaked.name : null;
}
