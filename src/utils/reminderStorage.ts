// Daily-reminder preferences are device-specific (notification permission is
// per-browser), so they live in localStorage rather than the cloud profile.

export type ReminderPrefs = {
  enabled: boolean;
  time: string; // "HH:MM", 24h local
};

const PREFS_KEY = "procrastibaker.reminder";
const LAST_FIRED_KEY = "procrastibaker.reminderLastFired";
export const REMINDER_CHANGE_EVENT = "procrastibaker:reminder";

const DEFAULT_PREFS: ReminderPrefs = { enabled: false, time: "19:00" };

function isTime(value: unknown): value is string {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
}

export function loadReminderPrefs(): ReminderPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) {
      return { ...DEFAULT_PREFS };
    }

    const parsed = JSON.parse(raw) as Partial<ReminderPrefs>;
    return {
      enabled: parsed?.enabled === true,
      time: isTime(parsed?.time) ? parsed.time : DEFAULT_PREFS.time,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveReminderPrefs(prefs: ReminderPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    // Notify same-tab listeners (the 'storage' event only fires cross-tab).
    window.dispatchEvent(new Event(REMINDER_CHANGE_EVENT));
  } catch {
    // Storage unavailable (private mode / quota), reminders just won't persist.
  }
}

export function getReminderLastFired(): string {
  try {
    return localStorage.getItem(LAST_FIRED_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setReminderLastFired(day: string): void {
  try {
    localStorage.setItem(LAST_FIRED_KEY, day);
  } catch {
    // Ignore, worst case a reminder can repeat.
  }
}
