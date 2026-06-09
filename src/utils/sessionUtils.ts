export function formatMinutes(minutes: number): string {
  const safeMinutes = Number.isFinite(minutes)
    ? Math.max(0, Math.floor(minutes))
    : 0;

  if (safeMinutes < 60) {
    return `${safeMinutes} min`;
  }

  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  return remainingMinutes
    ? `${hours} hr ${remainingMinutes} min`
    : `${hours} hr`;
}

export function calculateCoins(durationMinutes: number): number {
  return Number.isFinite(durationMinutes)
    ? Math.max(0, Math.floor(durationMinutes / 5))
    : 0;
}
