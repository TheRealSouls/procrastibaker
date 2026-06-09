import type { User } from "../types";
import { loadAppState, saveAppState } from "./appStorage";

// Local prototype auth only. Replace these storage calls with Firebase or Supabase session calls when real auth is added.
export function getCurrentUser(): User | null {
  // Future Firebase or Supabase auth can read the provider session here.
  return loadAppState().user;
}

export function loginWithLocalProfile(username: string, email: string): User {
  const user = normalizeLocalUser({ username, email, coins: 0 });

  saveAppState({
    ...loadAppState(),
    user,
  });

  return user;
}

export function updateLocalUser(user: User): User {
  const nextUser = normalizeLocalUser(user);

  saveAppState({
    ...loadAppState(),
    user: nextUser,
  });

  return nextUser;
}

export function logout() {
  // Future Firebase or Supabase auth can sign out the provider session here.
  saveAppState({
    ...loadAppState(),
    user: null,
  });
}

function normalizeLocalUser(user: User): User {
  const username = user.username.trim().slice(0, 32);
  const email = user.email.trim().slice(0, 80);

  if (!username || !email) {
    throw new Error("Username and email are required.");
  }

  return {
    username,
    email,
    coins: Math.max(0, Math.floor(user.coins)),
  };
}
