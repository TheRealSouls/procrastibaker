import { Capacitor } from "@capacitor/core";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { isNativeApp } from "../utils/capacitor";
import { getOptionalFirestore } from "../utils/firebase";

// The current signed-in uid the FCM token should be stored under. Kept in a
// module var so the (once-registered) listeners always write to the latest user.
let currentUid = "";
let listenersReady = false;

async function savePushToken(uid: string, token: string): Promise<void> {
  const firestore = getOptionalFirestore();

  if (!firestore || !uid || !token) {
    return;
  }

  try {
    await setDoc(doc(firestore, "pushTokens", uid), {
      token,
      platform: Capacitor.getPlatform(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Saving push token failed", error);
  }
}

/**
 * Native-only: request notification permission, register with FCM, and store the
 * device token under pushTokens/{uid} so a backend (Cloud Function / server) can
 * target the user. No-op on web. Safe to call repeatedly / on user change.
 */
export async function initPushNotifications(uid: string): Promise<void> {
  if (!isNativeApp() || !uid) {
    return;
  }

  currentUid = uid;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    let permission = await PushNotifications.checkPermissions();
    if (
      permission.receive === "prompt" ||
      permission.receive === "prompt-with-rationale"
    ) {
      permission = await PushNotifications.requestPermissions();
    }
    if (permission.receive !== "granted") {
      return;
    }

    if (!listenersReady) {
      listenersReady = true;

      await PushNotifications.addListener("registration", (token) => {
        void savePushToken(currentUid, token.value);
      });
      await PushNotifications.addListener("registrationError", (error) => {
        console.error("Push registration error", error);
      });
      // Android shows tray notifications automatically; these hooks are where
      // foreground handling / deep-linking would go later.
      await PushNotifications.addListener("pushNotificationReceived", () => {});
      await PushNotifications.addListener(
        "pushNotificationActionPerformed",
        () => {},
      );
    }

    // (Re)register — refires "registration" with the device token for currentUid.
    await PushNotifications.register();
  } catch (error) {
    console.error("Push notifications init failed", error);
  }
}
