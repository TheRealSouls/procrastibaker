import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import type { User } from "../types";
import { loadAppState } from "./appStorage";
import {
  getFirebaseAuth,
  getOptionalFirebaseAuth,
  googleProvider,
} from "./firebase";

type UserInput = Pick<User, "username" | "email" | "coins"> &
  Partial<Pick<User, "uid" | "authProvider" | "emailVerified">>;

export function getCurrentFirebaseUser() {
  return getOptionalFirebaseAuth()?.currentUser ?? null;
}

/** Signs in with Google (popup). Procrastibaker requires a real account. */
export async function loginWithGoogle(): Promise<User> {
  const result = await signInWithPopup(getFirebaseAuth(), googleProvider);
  return mapFirebaseUserToAppUser(result.user);
}

/** Creates a new email/password account and sends the verification email. */
export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<User> {
  const result = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    email,
    password,
  );

  // Best-effort: a failed verification send must not fail the sign-up itself
  // (users can resend from the in-app banner).
  try {
    await sendEmailVerification(result.user);
  } catch (error) {
    console.error("Sending verification email failed", error);
  }

  return mapFirebaseUserToAppUser(result.user);
}

/** Re-sends the verification email to the currently signed-in user. */
export async function sendVerificationEmail(): Promise<void> {
  const user = getFirebaseAuth().currentUser;

  if (!user) {
    throw new Error("You are not signed in.");
  }

  await sendEmailVerification(user);
}

/**
 * Reloads the current user and forces a token refresh so an out-of-band email
 * verification is reflected in `emailVerified` (and re-fires onIdTokenChanged).
 */
export async function refreshEmailVerified(): Promise<boolean> {
  const user = getOptionalFirebaseAuth()?.currentUser;

  if (!user) {
    return false;
  }

  await user.reload();
  await user.getIdToken(true);
  return user.emailVerified;
}

/** Signs in to an existing email/password account. */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<User> {
  const result = await signInWithEmailAndPassword(
    getFirebaseAuth(),
    email,
    password,
  );
  return mapFirebaseUserToAppUser(result.user);
}

/** Sends a password-reset email (handled entirely by Firebase, no backend). */
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email);
}

export async function logout() {
  const auth = getOptionalFirebaseAuth();

  if (auth?.currentUser) {
    await firebaseSignOut(auth);
  }
}

/**
 * Re-verifies the user's identity before a sensitive action (account deletion).
 * Google users get a popup; email users must supply their current password.
 * Returns "password-required" when a password is needed but was not provided.
 */
export async function reauthenticateCurrentUser(
  password?: string,
): Promise<"ok" | "password-required"> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You are not signed in.");
  }

  const providerId = user.providerData[0]?.providerId;

  if (providerId === "google.com") {
    await reauthenticateWithPopup(user, googleProvider);
    return "ok";
  }

  if (!password) {
    return "password-required";
  }

  await reauthenticateWithCredential(
    user,
    EmailAuthProvider.credential(user.email ?? "", password),
  );
  return "ok";
}

/** Deletes the Firebase Authentication account (call AFTER deleting user data). */
export async function deleteCurrentUser(): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You are not signed in.");
  }

  await deleteUser(user);
}

export function mapFirebaseUserToAppUser(
  firebaseUser: FirebaseUser,
  existingUser = loadAppState().user,
): User {
  const email = firebaseUser.email?.trim() ?? "";
  const fallbackName = email ? email.split("@")[0] : "";

  return normalizeAppUser({
    uid: firebaseUser.uid,
    username:
      firebaseUser.displayName?.trim() ||
      fallbackName ||
      existingUser?.username ||
      "Student",
    email,
    coins: existingUser?.coins ?? 0,
    authProvider: getAuthProvider(firebaseUser),
    emailVerified: firebaseUser.emailVerified,
  });
}

function getAuthProvider(firebaseUser: FirebaseUser): User["authProvider"] {
  const providerId = firebaseUser.providerData[0]?.providerId;
  return providerId === "google.com" ? "google" : "email";
}

function normalizeAppUser(user: UserInput): User {
  const username = user.username.trim().slice(0, 32) || "Student";
  const email = user.email.trim().slice(0, 80);
  const uid = user.uid?.trim().slice(0, 128);

  return {
    ...(uid ? { uid } : {}),
    username,
    email,
    coins: Math.max(0, Math.floor(user.coins)),
    authProvider: user.authProvider === "google" ? "google" : "email",
    emailVerified: user.emailVerified ?? false,
    // Placeholders — the live values come from the Firestore profile via
    // buildCloudAppState; this User is only used for its uid + authProvider.
    usernameChangedAt: 0,
    streakCount: 0,
    streakLongest: 0,
    streakLastActiveDate: "",
    streakFreezes: 0,
    dailyGoalMinutes: 60,
    dailyGoalRewardedDate: "",
  };
}
