export const USERNAME_MAX_LENGTH = 32;

/**
 * Reduces any display name to an allowed username: letters and numbers only.
 *
 * Google accounts hand us a full name like "Matas Roda", and friend lookup
 * matches on an exact username, so a name with a space would be effectively
 * unsearchable. Accents are folded to their base letter first ("José" becomes
 * "Jose") rather than dropped outright.
 *
 * Returns "" when nothing usable survives, so callers can fall back.
 */
export function sanitizeUsername(raw: string): string {
  return raw
    .normalize("NFKD")
    // Strip the combining marks left behind by the decomposition above.
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, USERNAME_MAX_LENGTH);
}

/** True when the name is already a valid username. */
export function isValidUsername(value: string): boolean {
  return value.length > 0 && value === sanitizeUsername(value);
}
