import { useEffect, useRef, useState } from "react";
import croissantIcon from "../media/sprites/icon.png";
import {
  loadReminderPrefs,
  getReminderLastFired,
  setReminderLastFired,
  REMINDER_CHANGE_EVENT,
  type ReminderPrefs,
} from "../utils/reminderStorage";
import { todayKey } from "../utils/streakUtils";

function notificationsGranted(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  );
}

/**
 * Fires a local browser notification at the user's chosen time if they haven't
 * hit today's focus goal, once per day. It also "catches up" on app open if the
 * time has already passed. This is best-effort and only runs while a tab is open
 * (true background push would need a service worker + FCM).
 */
export function useDailyReminder(goalMet: boolean) {
  const goalMetRef = useRef(goalMet);
  goalMetRef.current = goalMet;

  const [prefs, setPrefs] = useState<ReminderPrefs>(loadReminderPrefs);

  // Stay in sync with settings changes (same-tab custom event + cross-tab storage).
  useEffect(() => {
    const reload = () => setPrefs(loadReminderPrefs());
    window.addEventListener(REMINDER_CHANGE_EVENT, reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener(REMINDER_CHANGE_EVENT, reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  useEffect(() => {
    if (!prefs.enabled || !notificationsGranted()) {
      return;
    }

    const [hours, minutes] = prefs.time.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return;
    }

    function fire() {
      if (goalMetRef.current) {
        return;
      }

      const today = todayKey();
      if (getReminderLastFired() === today) {
        return;
      }

      setReminderLastFired(today);
      try {
        const notification = new Notification("Procrastibaker", {
          body: "You haven't hit today's focus goal yet, wanna bake a cookie or two? yum yum",
          icon: croissantIcon,
        });
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch {
        // Some browsers require notifications from a service worker, ignore.
      }
    }

    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);

    // Already past today's time and not yet fired → nudge on open.
    if (now >= target) {
      fire();
      target.setDate(target.getDate() + 1);
    }

    const timeout = window.setTimeout(fire, target.getTime() - now.getTime());
    return () => window.clearTimeout(timeout);
  }, [prefs.enabled, prefs.time]);
}
