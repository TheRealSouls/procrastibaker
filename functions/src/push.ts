import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { logger } from "firebase-functions";

// FCM error codes that mean the stored token is dead and should be removed so we
// stop trying to deliver to it.
const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

/**
 * Sends a notification to the device token stored at pushTokens/{uid}. No-ops if
 * the user has no stored token. Deletes the token doc when FCM reports it as dead
 * so a future re-registration can replace it. Returns true when a push was sent.
 */
export async function sendToUser(
  uid: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<boolean> {
  const db = getFirestore();
  const tokenSnap = await db.doc(`pushTokens/${uid}`).get();

  if (!tokenSnap.exists) {
    return false;
  }

  const token = tokenSnap.get("token");

  if (typeof token !== "string" || !token) {
    return false;
  }

  try {
    await getMessaging().send({
      token,
      notification: { title, body },
      data: data ?? {},
      android: { priority: "high", notification: { defaultSound: true } },
    });
    return true;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "";

    if (DEAD_TOKEN_CODES.has(code)) {
      logger.info(`Removing dead push token for ${uid} (${code})`);
      await db.doc(`pushTokens/${uid}`).delete().catch(() => undefined);
    } else {
      logger.error(`Push to ${uid} failed`, error);
    }

    return false;
  }
}
