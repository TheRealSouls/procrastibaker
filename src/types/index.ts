export type View =
  | "home"
  | "login"
  | "dashboard"
  | "timer"
  | "bakery"
  | "shop"
  | "stats"
  | "feedback";

export type StudyTag = {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
};

export type User = {
  uid?: string;
  username: string;
  // Empty for anonymous (guest) users — they have no email until they link Google.
  email: string;
  coins: number;
  authProvider: "local" | "google" | "anonymous" | "email";
  // Whether the account's email address has been verified. Google accounts are
  // always verified; email/password accounts start false until they confirm.
  emailVerified: boolean;
  // Epoch ms of the last username change, 0 if never changed. Drives the
  // once-per-week change cooldown in the UI.
  usernameChangedAt: number;
  // Streak (Duolingo-style). streakLastActiveDate is a local "YYYY-MM-DD" key,
  // "" if no bake has ever been completed.
  streakCount: number;
  streakLongest: number;
  streakLastActiveDate: string;
  streakFreezes: number;
};

export type Season = "autumn";

export type Pastry = {
  id: string;
  name: string;
  emoji: string;
  price: number;
  bakeTimeMultiplier: number;
  unlockedByDefault: boolean;
  description: string;
  // Seasonal pastries are only offered in the shop during their season; if left
  // undefined the pastry is available all year round.
  season?: Season;
};

export type StudySession = {
  id: string;
  pastryId: string;
  pastryName: string;
  tagId: string;
  tagName: string;
  tagColor: string;
  durationMinutes: number;
  startedAt: string;
  endedAt: string;
  completed: boolean;
  expired: boolean;
};

export type AudioSettings = {
  soundEnabled: boolean;
  soundVolume: number;
};

export type AppState = {
  user: User | null;
  unlockedPastryIds: string[];
  tags: StudyTag[];
  completedSessions: StudySession[];
  expiredSessions: StudySession[];
  selectedPastryId: string;
  audioSettings: AudioSettings;
};
