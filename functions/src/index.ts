import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { pastryName } from "./pastryNames";
import { sendToUser } from "./push";

// Hard ceiling on concurrent instances. Both functions are tiny and low traffic,
// so this costs nothing in practice but caps the bill if something ever loops.
setGlobalOptions({ maxInstances: 5, region: "europe-west1" });

initializeApp();

// ---------------------------------------------------------------------------
// Gift alerts: when a gift doc is created, push the recipient. The in-app inbox
// already shows it on web; this delivers it to the native app when it's closed.
// ---------------------------------------------------------------------------
export const onGiftCreated = onDocumentCreated("gifts/{giftId}", async (event) => {
  const gift = event.data?.data();

  if (!gift) {
    return;
  }

  const toUid = typeof gift.toUid === "string" ? gift.toUid : "";
  const fromUsername =
    typeof gift.fromUsername === "string" && gift.fromUsername
      ? gift.fromUsername
      : "A friend";
  const pastryId = typeof gift.pastryId === "string" ? gift.pastryId : "";

  if (!toUid || gift.status !== "unclaimed") {
    return;
  }

  const sent = await sendToUser(
    toUid,
    "You got a pastry! 🎁",
    `${fromUsername} sent you a ${pastryName(pastryId)}. Tap to claim it.`,
    { type: "gift", pastryId },
  );

  if (sent) {
    logger.info(`Gift push delivered to ${toUid}`);
  }
});

// ---------------------------------------------------------------------------
// Daily reminders: runs on a schedule, finds users whose local reminder time is
// due and who haven't hit today's focus goal, and pushes them. Reminder settings
// (enabled/time/timezone) are mirrored to reminderSettings/{uid} by the client.
// ---------------------------------------------------------------------------

// How long after the set time a reminder may still fire, covers the schedule
// granularity and a missed tick.
const REMINDER_WINDOW_MINUTES = 60;
const DEFAULT_GOAL_MINUTES = 60;

type LocalClock = { date: string; minutes: number };

// Wall-clock date ("YYYY-MM-DD") and minutes-into-day for a UTC instant shifted
// by the user's timezone offset (minutes east of UTC).
function localClock(utcMs: number, tzOffsetMinutes: number): LocalClock {
  const shifted = new Date(utcMs + tzOffsetMinutes * 60_000);
  return {
    date: shifted.toISOString().slice(0, 10),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

function parseTimeToMinutes(time: unknown): number | null {
  if (typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const [hours, minutes] = time.split(":").map(Number);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

// Sums the durationMinutes of the user's completed sessions that fall on the
// given local date. Reads a bounded slice of recent sessions (ordered by end
// time) so no composite index is needed.
async function focusMinutesOnLocalDate(
  uid: string,
  localDate: string,
  tzOffsetMinutes: number,
): Promise<number> {
  const db = getFirestore();
  const snap = await db
    .collection(`users/${uid}/sessions`)
    .orderBy("endedAt", "desc")
    .limit(50)
    .get();

  let total = 0;

  for (const doc of snap.docs) {
    const data = doc.data();

    if (data.completed !== true || typeof data.endedAt !== "string") {
      continue;
    }

    const endedMs = Date.parse(data.endedAt);

    if (Number.isNaN(endedMs)) {
      continue;
    }

    if (localClock(endedMs, tzOffsetMinutes).date === localDate) {
      const minutes = Number(data.durationMinutes);
      if (Number.isFinite(minutes) && minutes > 0) {
        total += minutes;
      }
    }
  }

  return total;
}

export const sendDailyReminders = onSchedule(
  { schedule: "every 30 minutes", timeoutSeconds: 300 },
  async () => {
    const db = getFirestore();
    const now = Date.now();
    const due = await db
      .collection("reminderSettings")
      .where("enabled", "==", true)
      .get();

    let pushed = 0;

    for (const doc of due.docs) {
      const settings = doc.data();
      const uid = doc.id;
      const tzOffsetMinutes = Number(settings.tzOffsetMinutes);
      const targetMinutes = parseTimeToMinutes(settings.time);

      if (!Number.isFinite(tzOffsetMinutes) || targetMinutes === null) {
        continue;
      }

      const clock = localClock(now, tzOffsetMinutes);

      // Only within the window after the chosen time, and at most once per day.
      const inWindow =
        clock.minutes >= targetMinutes &&
        clock.minutes < targetMinutes + REMINDER_WINDOW_MINUTES;

      if (!inWindow || settings.lastPushedDate === clock.date) {
        continue;
      }

      // Skip if they've already hit today's goal.
      const profileSnap = await db.doc(`users/${uid}`).get();
      const goalMinutes = Number(
        profileSnap.get("dailyGoalMinutes") ?? DEFAULT_GOAL_MINUTES,
      );
      const minutesToday = await focusMinutesOnLocalDate(
        uid,
        clock.date,
        tzOffsetMinutes,
      );

      if (goalMinutes > 0 && minutesToday >= goalMinutes) {
        continue;
      }

      const sent = await sendToUser(
        uid,
        "Procrastibaker",
        "You haven't hit today's focus goal yet, wanna bake a cookie or two? yum yum",
        { type: "reminder" },
      );

      // Mark the day as handled whether or not a token existed, so we don't
      // re-check this user every tick for the rest of the day.
      await doc.ref.set({ lastPushedDate: clock.date }, { merge: true });

      if (sent) {
        pushed += 1;
      }
    }

    logger.info(`Daily reminders: ${pushed} pushed of ${due.size} enabled`);
  },
);
