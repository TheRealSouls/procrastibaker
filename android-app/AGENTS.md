# AGENTS.md

## Project Context

This folder is the Android planning context for Procrastibaker, a cozy bakery-themed study timer app.

The Android app should be built as an Expo React Native app using TypeScript, Expo Router, Firebase Authentication, Cloud Firestore, AsyncStorage, expo-av, React Native Reanimated, EAS Build, Android Studio emulator testing, and physical Android phone testing.

The web prototype lives one directory up and should be used for product, visual, and behavior parity.

## Required Stack

- Expo React Native
- TypeScript
- Expo Router
- Firebase Authentication
- Cloud Firestore
- AsyncStorage
- expo-av
- React Native Reanimated
- Own sprites first, FontAwesome only where needed
- EAS Build / Expo development build

## Product Rules

- Display name is Procrastibaker.
- Login uses Google Authentication.
- Username is the display name.
- Do not reintroduce nickname.
- Timer duration must be 10 to 120 minutes.
- Duration changes in 5-minute increments.
- Coin reward is 1 coin per 5 completed minutes.
- Completing a session creates a completed session and awards coins.
- Cancelling, leaving, or abandoning an unfinished session creates an expired session and awards no coins.
- Users can create and delete study tags.
- Default tags can be deleted.
- The final remaining tag cannot be deleted.
- Locked pastries cannot be selected until purchased.
- Completed and expired sessions must sync through Firestore.

## Firestore Architecture

```txt
users/{uid}
  username
  email
  coins
  selectedPastryId
  unlockedPastryIds
  audioSettings
  createdAt
  updatedAt

users/{uid}/tags/{tagId}
  name
  color
  isDefault
  createdAt

users/{uid}/sessions/{sessionId}
  pastryId
  pastryName
  tagId
  tagName
  tagColor
  durationMinutes
  startedAt
  endedAt
  completed
  expired
  platform
```

Android must write `platform: "android"` for sessions.

## Asset Rules

- Reuse assets from `assets/`.
- Use pastry sprites instead of emoji where possible.
- Use sprites for navigation icons where available.
- Use `assets/sounds/oven-loop.mp3` for oven ambience.
- Do not use absolute Windows paths in app code.
- Do not include web cursor assets in Android UI.

## Security Rules

- Do not commit real `.env` files.
- Do not commit Firebase service account JSON.
- Do not commit Android keystores or signing credentials.
- Do not manually store Firebase auth tokens in AsyncStorage.
- Keep Firebase config in environment variables.
- Firestore rules must restrict users to their own `users/{uid}` document and subcollections.
- Validate user-controlled strings with length limits before writing to Firestore.

## Code Quality Rules

- Keep screen components focused.
- Keep Firebase logic in service modules.
- Keep AsyncStorage logic in cache/sync modules.
- Keep timer math separate from JSX.
- Use typed models for user, tags, pastries, sessions, audio settings, and app state.
- Avoid unnecessary dependencies.
- Do not add a backend beyond Firebase unless explicitly requested.
- Do not add chart libraries initially.

## Implementation Priority

1. Expo Router shell
2. Firebase Auth
3. Firestore profile bootstrap
4. Asset maps and design tokens
5. Dashboard
6. Timer setup
7. Active oven timer with pause/resume
8. Session complete/expire writes
9. Bakery
10. Shop
11. Stats
12. Tag management
13. Audio
14. Offline cache and sync polish
15. Android emulator and physical device QA
