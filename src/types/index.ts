export type View =
  | "login"
  | "dashboard"
  | "timer"
  | "bakery"
  | "shop"
  | "stats";

export type StudyTag =
  | "Study"
  | "Work"
  | "Break"
  | "Revision"
  | "Reading"
  | "Project";

export type User = {
  username: string;
  email: string;
  coins: number;
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
  tag: StudyTag;
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
  completedSessions: StudySession[];
  expiredSessions: StudySession[];
  selectedPastryId: string;
  audioSettings: AudioSettings;
};
