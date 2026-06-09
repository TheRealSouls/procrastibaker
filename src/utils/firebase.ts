import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

const firebaseEnvKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

type FirebaseEnvKey = (typeof firebaseEnvKeys)[number];

const debugLabels: Record<FirebaseEnvKey, string> = {
  VITE_FIREBASE_API_KEY: "apiKey",
  VITE_FIREBASE_AUTH_DOMAIN: "authDomain",
  VITE_FIREBASE_PROJECT_ID: "projectId",
  VITE_FIREBASE_STORAGE_BUCKET: "storageBucket",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "messagingSenderId",
  VITE_FIREBASE_APP_ID: "appId",
};

export const missingFirebaseConfigMessage =
  "Firebase is missing environment configuration. Check your .env file and restart the dev server.";

export const missingFirebaseEnvVars = firebaseEnvKeys.filter(
  (key) => !import.meta.env[key],
);

export function hasFirebaseConfig() {
  return missingFirebaseEnvVars.length === 0;
}

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (import.meta.env.DEV) {
  console.info(
    "Firebase config check:",
    Object.fromEntries(
      firebaseEnvKeys.map((key) => [
        debugLabels[key],
        import.meta.env[key] ? "present" : "missing",
      ]),
    ),
  );
}

export const app: FirebaseApp | null = hasFirebaseConfig()
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const auth: Auth | null = app ? getAuth(app) : null;

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("email");
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export function getOptionalFirebaseAuth() {
  return auth;
}

export function getFirebaseAuth() {
  if (!auth) {
    throw new Error(missingFirebaseConfigMessage);
  }

  return auth;
}
