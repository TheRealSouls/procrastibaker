import { pastries } from "../data/pastries";
import { DEFAULT_TAGS, fallbackTagColor, findTagById } from "../data/tags";
import type { StudySession, StudyTag } from "../types";

export type PastryCount = {
  count: number;
  emoji: string;
  id: string;
  name: string;
  totalMinutes: number;
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
