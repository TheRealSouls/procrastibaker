import { pastries } from "../data/pastries";
import type { StudySession } from "../types";

export type CrumbTile = {
  key: string;
  pastryId: string;
  pastryName: string;
  /** Grid coordinates, centred on 0,0 and growing outwards. */
  x: number;
  y: number;
  /** ISO timestamp of the bake, empty for tiles built from friend totals. */
  endedAt: string;
};

/**
 * Square-spiral coordinates for a tile index: 0 sits at the centre and each
 * subsequent index rings outwards. This is what makes a Crumb Map grow from the
 * middle rather than filling left-to-right like a list.
 */
export function spiralPosition(index: number): { x: number; y: number } {
  if (index <= 0) {
    return { x: 0, y: 0 };
  }

  // Which ring the index falls in: ring r holds every index up to (2r+1)^2 - 1.
  const ring = Math.ceil((Math.sqrt(index + 1) - 1) / 2);
  const ringStart = (2 * ring - 1) ** 2;
  const sideLength = 2 * ring;
  // How far along the ring's perimeter, and which of the four sides that is.
  const offset = index - ringStart;
  const side = Math.floor(offset / sideLength);
  const step = offset % sideLength;

  switch (side) {
    case 0:
      return { x: ring, y: -ring + step + 1 };
    case 1:
      return { x: ring - step - 1, y: ring };
    case 2:
      return { x: -ring, y: ring - step - 1 };
    default:
      return { x: -ring + step + 1, y: -ring };
  }
}

// Small deterministic hash, so a given seed always produces the same map. A
// random shuffle would rearrange every tile on each render.
function hash(value: string): number {
  let h = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return h >>> 0;
}

/** Which ring a spiral index belongs to. */
function ringOf(index: number): number {
  return index <= 0 ? 0 : Math.ceil((Math.sqrt(index + 1) - 1) / 2);
}

/**
 * Reorders indices within each ring using a seeded shuffle. Density still grows
 * outwards (ring N fills before ring N+1) but the arrangement inside a ring is
 * scattered, so two bakers with the same totals get different-looking maps.
 */
function scatterIndices(count: number, seed: string): number[] {
  const rings = new Map<number, number[]>();

  for (let i = 0; i < count; i += 1) {
    const ring = ringOf(i);
    const bucket = rings.get(ring);
    if (bucket) bucket.push(i);
    else rings.set(ring, [i]);
  }

  const out: number[] = [];

  for (const ring of [...rings.keys()].sort((a, b) => a - b)) {
    const bucket = rings.get(ring) ?? [];
    // Fisher-Yates driven by the seeded hash.
    for (let i = bucket.length - 1; i > 0; i -= 1) {
      const j = hash(`${seed}:${ring}:${i}`) % (i + 1);
      [bucket[i], bucket[j]] = [bucket[j], bucket[i]];
    }
    out.push(...bucket);
  }

  return out;
}

/** "YYYY-MM" for grouping bakes by month. */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** Distinct months that contain at least one bake, newest first. */
export function bakedMonths(sessions: StudySession[]): string[] {
  const months = new Set<string>();

  for (const session of sessions) {
    if (session.endedAt) {
      months.add(monthKey(session.endedAt));
    }
  }

  return [...months].sort().reverse();
}

/**
 * Lays completed bakes onto the spiral, oldest first, so the centre of the map
 * is where the user started and the outer edge is their most recent work.
 */
export function buildCrumbMap(
  sessions: StudySession[],
  month: string | null,
): CrumbTile[] {
  const relevant = sessions
    .filter((session) => !month || monthKey(session.endedAt) === month)
    .slice()
    .sort((a, b) => a.endedAt.localeCompare(b.endedAt));

  const order = scatterIndices(relevant.length, month ?? "all");

  return relevant.map((session, index) => ({
    key: session.id || `${session.endedAt}-${index}`,
    pastryId: session.pastryId,
    pastryName: session.pastryName,
    ...spiralPosition(order[index]),
    endedAt: session.endedAt,
  }));
}

/**
 * Builds a map from per-pastry totals instead of individual bakes. Used for
 * friends, whose sessions stay private: only their aggregate counts are shared.
 */
export function buildCrumbMapFromCounts(
  counts: Record<string, number>,
  seed = "friend",
): CrumbTile[] {
  const total = Object.values(counts).reduce(
    (sum, value) => sum + Math.max(0, Math.floor(value)),
    0,
  );
  const order = scatterIndices(total, seed);
  const tiles: CrumbTile[] = [];
  let index = 0;

  // Follow the catalogue order so a friend's map is stable between visits.
  for (const pastry of pastries) {
    const total = Math.max(0, Math.floor(counts[pastry.id] ?? 0));

    for (let n = 0; n < total; n += 1) {
      tiles.push({
        key: `${pastry.id}-${n}`,
        pastryId: pastry.id,
        pastryName: pastry.name,
        ...spiralPosition(order[index] ?? index),
        endedAt: "",
      });
      index += 1;
    }
  }

  return tiles;
}

/** Totals per pastry id, for sharing to friends and for the map legend. */
export function countByPastry(
  sessions: StudySession[],
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const session of sessions) {
    counts[session.pastryId] = (counts[session.pastryId] ?? 0) + 1;
  }

  return counts;
}
