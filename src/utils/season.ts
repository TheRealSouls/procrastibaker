import type { Pastry, Season } from "../types";

// Seasonal windows keyed by month (0 = January). Autumn spans Sept–Nov;
// December is its own festive window for the Gingerbread Man.
const SEASON_BY_MONTH: Record<number, Season | null> = {
  0: null, // Jan
  1: null, // Feb
  2: null, // Mar
  3: null, // Apr
  4: null, // May
  5: null, // Jun
  6: null, // Jul
  7: null, // Aug
  8: "autumn", // Sep
  9: "autumn", // Oct
  10: "autumn", // Nov
  11: "december", // Dec
};

export function getSeason(date: Date = new Date()): Season | null {
  return SEASON_BY_MONTH[date.getMonth()] ?? null;
}

// A pastry is in season if it has no seasonal restriction, or the restriction
// matches the current season.
export function isPastryInSeason(
  pastry: Pastry,
  date: Date = new Date(),
): boolean {
  return !pastry.season || pastry.season === getSeason(date);
}

// A pastry should be shown in the catalog (shop / picker) when it is in season,
// or when the player already owns it, so owned seasonal bakes never vanish.
export function isPastryVisible(
  pastry: Pastry,
  unlockedPastryIds: string[],
  date: Date = new Date(),
): boolean {
  return isPastryInSeason(pastry, date) || unlockedPastryIds.includes(pastry.id);
}
