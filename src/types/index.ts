export type View =
  | "home"
  | "login"
  | "dashboard"
  | "timer"
  | "bakery"
  | "shop"
  | "stats";

export type StudyTag = {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
};

export type User = {
  uid?: string;
  username: string;
  email: string;
  coins: number;
  authProvider: "local" | "google";
};

export type Pastry = {
  id: string;
  name: string;
  emoji: string;
  price: number;
  bakeTimeMultiplier: number;
  unlockedByDefault: boolean;
  description: string;
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
