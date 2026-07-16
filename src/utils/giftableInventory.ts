import { pastries } from "../data/pastries";

// A map of pastryId -> how many baked units the user holds and can gift. Pastries
// are earned by completing focus sessions (one bake per session) and spent by
// gifting them to friends. Separate from `unlockedPastryIds`, which only tracks
// which pastry *types* have been unlocked.
export type GiftablePastries = Record<string, number>;

function isPastryId(value: unknown): value is string {
  return typeof value === "string" && pastries.some((pastry) => pastry.id === value);
}

// Keep only known pastry ids with a positive whole-number count.
export function normalizeGiftablePastries(value: unknown): GiftablePastries {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const result: GiftablePastries = {};

  for (const [id, count] of Object.entries(value as Record<string, unknown>)) {
    if (isPastryId(id) && typeof count === "number" && Number.isFinite(count)) {
      const whole = Math.floor(count);
      if (whole > 0) {
        result[id] = whole;
      }
    }
  }

  return result;
}

export function giftableCount(map: GiftablePastries, pastryId: string): number {
  return Math.max(0, Math.floor(map[pastryId] ?? 0));
}

// Returns a new map with `pastryId` incremented by `amount`.
export function addGiftable(
  map: GiftablePastries,
  pastryId: string,
  amount = 1,
): GiftablePastries {
  return { ...map, [pastryId]: giftableCount(map, pastryId) + Math.max(1, amount) };
}

// Returns a new map with one unit of `pastryId` removed (dropping the key at 0),
// or null when there is nothing to take.
export function takeGiftable(
  map: GiftablePastries,
  pastryId: string,
): GiftablePastries | null {
  const current = giftableCount(map, pastryId);

  if (current <= 0) {
    return null;
  }

  const next = { ...map };

  if (current - 1 <= 0) {
    delete next[pastryId];
  } else {
    next[pastryId] = current - 1;
  }

  return next;
}
