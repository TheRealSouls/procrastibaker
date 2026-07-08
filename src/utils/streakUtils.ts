// Pure streak logic — no React/Firebase here, so it is trivially testable.

export const MAX_FREEZES = 2;
export const STREAK_FREEZE_PRICE = 50; // coins

export type StreakState = {
  count: number;
  longest: number;
  lastActiveDate: string; // "YYYY-MM-DD" (local), "" if never
  freezes: number;
};

export type StreakOutcome =
  | "same-day"
  | "incremented"
  | "frozen"
  | "reset"
  | "started";

/** Local calendar day as "YYYY-MM-DD" (not UTC, so it matches the user's day). */
export function todayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Whole local days from `from` to `to` (to − from), or null if either is invalid. */
export function daysBetween(from: string, to: string): number | null {
  const start = parseKey(from);
  const end = parseKey(to);

  if (!start || !end) {
    return null;
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

function parseKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);

  if (!match) {
    return null;
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Lazily evaluate a streak "check-in" for a completed bake on `today`.
 * Pure: returns the next state and what happened, never mutates the input.
 */
export function applyStreakCheckIn(
  state: StreakState,
  today: string,
): { next: StreakState; outcome: StreakOutcome } {
  const gap = state.lastActiveDate
    ? daysBetween(state.lastActiveDate, today)
    : null;

  // Never baked before (or an unreadable stored date) → start the streak.
  if (gap === null) {
    return {
      next: {
        count: 1,
        longest: Math.max(1, state.longest),
        lastActiveDate: today,
        freezes: state.freezes,
      },
      outcome: "started",
    };
  }

  // Already counted today (or the clock moved backwards) → no change.
  if (gap <= 0) {
    return { next: state, outcome: "same-day" };
  }

  // Consecutive day → grow the streak.
  if (gap === 1) {
    const count = state.count + 1;
    return {
      next: {
        count,
        longest: Math.max(count, state.longest),
        lastActiveDate: today,
        freezes: state.freezes,
      },
      outcome: "incremented",
    };
  }

  // Missed exactly one day and a freeze is owned → spend it and keep going.
  if (gap === 2 && state.freezes > 0) {
    const count = state.count + 1;
    return {
      next: {
        count,
        longest: Math.max(count, state.longest),
        lastActiveDate: today,
        freezes: state.freezes - 1,
      },
      outcome: "frozen",
    };
  }

  // Missed too many days (or no freeze) → reset.
  return {
    next: {
      count: 1,
      longest: Math.max(1, state.longest),
      lastActiveDate: today,
      freezes: state.freezes,
    },
    outcome: "reset",
  };
}
