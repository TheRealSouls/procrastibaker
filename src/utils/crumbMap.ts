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

  return relevant.map((session, index) => ({
    key: session.id || `${session.endedAt}-${index}`,
    pastryId: session.pastryId,
    pastryName: session.pastryName,
    ...spiralPosition(index),
    endedAt: session.endedAt,
  }));
}

/**
 * Builds a map from per-pastry totals instead of individual bakes. Used for
 * friends, whose sessions stay private: only their aggregate counts are shared.
 */
export function buildCrumbMapFromCounts(
  counts: Record<string, number>,
): CrumbTile[] {
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
        ...spiralPosition(index),
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
