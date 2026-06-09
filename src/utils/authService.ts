import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import type { User } from "../types";
import { loadAppState, saveAppState } from "./appStorage";
import {
  getFirebaseAuth,
  getOptionalFirebaseAuth,
  googleProvider,
} from "./firebase";

type UserInput = Pick<User, "username" | "email" | "coins"> &
  Partial<Pick<User, "uid" | "authProvider">>;

export function getCurrentUser(): User | null {
  const firebaseUser = getCurrentFirebaseUser();

  if (firebaseUser) {
    return mapFirebaseUserToAppUser(firebaseUser);
  }

  return loadAppState().user;
}

export function getCurrentFirebaseUser() {
  return getOptionalFirebaseAuth()?.currentUser ?? null;
}

export async function loginWithGoogle(): Promise<User> {
  const result = await signInWithPopup(getFirebaseAuth(), googleProvider);
  const user = mapFirebaseUserToAppUser(result.user, loadAppState().user);

  saveAppState({
    ...loadAppState(),
    user,
  });

  return user;
}

export async function logout() {
  const auth = getOptionalFirebaseAuth();

  if (auth?.currentUser) {
    await firebaseSignOut(auth);
  }

  saveAppState({
    ...loadAppState(),
    user: null,
  });
}

export function listenToAuthChanges(onUser: (user: User | null) => void) {
  const auth = getOptionalFirebaseAuth();

  if (!auth) {
    return () => undefined;
  }

  let hasSeenFirebaseUser = false;

  return onAuthStateChanged(auth, (firebaseUser) => {
    if (!firebaseUser) {
      if (hasSeenFirebaseUser) {
        saveAppState({
          ...loadAppState(),
          user: null,
        });
        onUser(null);
      }

      return;
    }

    hasSeenFirebaseUser = true;
    const user = mapFirebaseUserToAppUser(firebaseUser, loadAppState().user);

    saveAppState({
      ...loadAppState(),
      user,
    });

    onUser(user);
  });
}

export function loginWithLocalProfile(username: string, email: string): User {
  const user = normalizeAppUser({
    username,
    email,
    coins: 0,
    authProvider: "local",
  });

  saveAppState({
    ...loadAppState(),
    user,
  });

  return user;
}

export function updateLocalUser(user: User): User {
  const nextUser = normalizeAppUser(user);

  saveAppState({
    ...loadAppState(),
    user: nextUser,
  });

  return nextUser;
}

export function mapFirebaseUserToAppUser(
  firebaseUser: FirebaseUser,
  existingUser = loadAppState().user,
): User {
  const email = firebaseUser.email?.trim();

  if (!email) {
    throw new Error("Your Google account does not provide an email address.");
  }

  return normalizeAppUser({
    uid: firebaseUser.uid,
    username:
      firebaseUser.displayName?.trim() || email.split("@")[0] || "Student",
    email,
    coins: existingUser?.coins ?? 0,
    authProvider: "google",
  });
}

function normalizeAppUser(user: UserInput): User {
  const username = user.username.trim().slice(0, 32);
  const email = user.email.trim().slice(0, 80);
  const uid = user.uid?.trim().slice(0, 128);

  if (!username || !email) {
    throw new Error("Username and email are required.");
  }

  return {
    ...(uid ? { uid } : {}),
    username,
    email,
    coins: Math.max(0, Math.floor(user.coins)),
    authProvider: user.authProvider === "google" ? "google" : "local",
  };
}
