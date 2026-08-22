import { pastries } from "../data/pastries";
import type { StudySession } from "../types";

/**
 * Ledger of gifting adjustments per pastry id: +1 when a gift is claimed, -1 when
 * one is sent. Values may be negative.
 *
 * The number you can actually gift is derived as
 * `completed sessions for that pastry + this ledger`, rather than being a stored
 * stock count. A stored count only ever grew from sessions finished after the
 * feature shipped, so existing bakes (and demo sessions added through the
 * developer tools) granted nothing and the picker wrongly claimed you had never
 * baked anything.
 */
export type GiftablePastries = Record<string, number>;

function isPastryId(value: unknown): value is string {
  return typeof value === "string" && pastries.some((pastry) => pastry.id === value);
}

/** Keeps known pastry ids with a whole-number adjustment, dropping zeroes. */
export function normalizeGiftablePastries(value: unknown): GiftablePastries {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const result: GiftablePastries = {};

  for (const [id, amount] of Object.entries(value as Record<string, unknown>)) {
    if (isPastryId(id) && typeof amount === "number" && Number.isFinite(amount)) {
      const whole = Math.trunc(amount);
      if (whole !== 0) {
        result[id] = whole;
      }
    }
  }

  return result;
}

/** How many of a pastry the user has baked, from their completed sessions. */
export function bakedCount(
  sessions: StudySession[],
  pastryId: string,
): number {
  return sessions.reduce(
    (total, session) => (session.pastryId === pastryId ? total + 1 : total),
    0,
  );
}

/** How many of a pastry can be gifted right now. Never negative. */
export function availableToGift(
  sessions: StudySession[],
  ledger: GiftablePastries,
  pastryId: string,
): number {
  const adjustment = Math.trunc(ledger[pastryId] ?? 0);
  return Math.max(0, bakedCount(sessions, pastryId) + adjustment);
}

/** Every pastry with at least one giftable unit, most plentiful first. */
export function giftableEntries(
  sessions: StudySession[],
  ledger: GiftablePastries,
): Array<[string, number]> {
  const ids = new Set<string>([
    ...sessions.map((session) => session.pastryId),
    ...Object.keys(ledger),
  ]);

  return [...ids]
    .filter(isPastryId)
    .map((id): [string, number] => [id, availableToGift(sessions, ledger, id)])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
}

/** Records a claimed gift (+1). */
export function addGiftable(
  ledger: GiftablePastries,
  pastryId: string,
): GiftablePastries {
  return { ...ledger, [pastryId]: Math.trunc(ledger[pastryId] ?? 0) + 1 };
}

/** Records a sent gift (-1). */
export function spendGiftable(
  ledger: GiftablePastries,
  pastryId: string,
): GiftablePastries {
  return { ...ledger, [pastryId]: Math.trunc(ledger[pastryId] ?? 0) - 1 };
}
