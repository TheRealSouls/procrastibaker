import type { StudySession } from "../types";

// The leaderboard ranks friends by focus minutes in the current (Monday-based)
// week. weekKey is the ISO date of that Monday, stored alongside each entry so a
// stale entry from a previous week reads as 0 this week.

export function startOfWeek(date: Date = new Date()): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const mondayIndex = (start.getDay() + 6) % 7; // Mon = 0 … Sun = 6
  start.setDate(start.getDate() - mondayIndex);
  return start;
}

export function weekKey(date: Date = new Date()): string {
  return startOfWeek(date).toISOString().slice(0, 10);
}

export function weeklyFocusMinutes(
  sessions: StudySession[],
  date: Date = new Date(),
): number {
  const weekStart = startOfWeek(date).getTime();

  return sessions
    .filter(
      (session) =>
        session.completed && new Date(session.endedAt).getTime() >= weekStart,
    )
    .reduce((total, session) => total + session.durationMinutes, 0);
}

export function totalFocusMinutes(sessions: StudySession[]): number {
  return sessions
    .filter((session) => session.completed)
    .reduce((total, session) => total + session.durationMinutes, 0);
}
