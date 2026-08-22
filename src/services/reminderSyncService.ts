import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getOptionalFirestore } from "../utils/firebase";
import type { ReminderPrefs } from "../utils/reminderStorage";

// Mirrors the device-local daily-reminder prefs to reminderSettings/{uid} so the
// scheduled Cloud Function can deliver the reminder as a push when the app is
// closed. The timezone offset (minutes east of UTC) lets the server work out
// when the user's local reminder time is due. Merge-writes so the function's
// server-managed `lastPushedDate` field is preserved.
export async function saveReminderSettings(
  uid: string,
  prefs: ReminderPrefs,
): Promise<void> {
  const firestore = getOptionalFirestore();

  if (!firestore || !uid) {
    return;
  }

  try {
    await setDoc(
      doc(firestore, "reminderSettings", uid),
      {
        enabled: prefs.enabled,
        time: prefs.time,
        tzOffsetMinutes: -new Date().getTimezoneOffset(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error("Saving reminder settings failed", error);
  }
}
