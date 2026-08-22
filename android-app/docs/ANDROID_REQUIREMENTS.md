# Android Requirements

Stack:
- Framework: Expo React Native
- Language: TypeScript
- Routing: Expo Router
- Auth: Firebase Authentication
- Database: Cloud Firestore
- Storage/cache: AsyncStorage
- Audio: expo-av
- Animations: React Native Reanimated
- Icons: own sprites first, FontAwesome only where needed
- Build: EAS Build / Expo development build
- Testing: Android Studio emulator and physical Android phone

Project setup:
- Use Expo Router file-based routes.
- Use TypeScript strict enough to catch data-shape mistakes.
- Keep Firebase config in environment variables.
- Keep Firestore access in dedicated service modules, not screen components.
- Keep AsyncStorage access in cache/sync utilities, not screen components.
- Do not commit real secrets, service account files, keystores, or `.env` files.

Suggested route structure:

```txt
app/
  _layout.tsx
  index.tsx
  login.tsx
  (tabs)/
    _layout.tsx
    dashboard.tsx
    timer.tsx
    bakery.tsx
    shop.tsx
    stats.tsx
  settings.tsx
```

Suggested source structure:

```txt
src/
  components/
  constants/
  data/
  hooks/
  services/
    authService.ts
    firestoreService.ts
    syncService.ts
  storage/
    appCache.ts
  types/
  utils/
```

Firebase requirements:
- Google sign-in creates or loads users/{uid}.
- New users receive default coins, unlocked pastries, selected pastry, audio settings, and default tags.
- Existing users load Firestore profile, tags, and sessions.
- Offline cache should use AsyncStorage as a local fallback.
- Avoid storing Firebase auth tokens manually in AsyncStorage.

Timer requirements:
- Duration range: 10 to 120 minutes.
- Duration step: 5 minutes.
- Pause/resume is required.
- Active timer should survive normal navigation inside the app.
- Leaving or cancelling an unfinished session should save an expired session.
- Browser beforeunload does not apply on Android; use React Navigation guards or app state handling where appropriate.
- When app backgrounds during an active session, calculate remaining time from timestamps rather than trusting an interval.

Audio requirements:
- Oven ambience plays only during active running sessions.
- Audio pauses when the timer pauses.
- Audio stops on complete, cancel, expiry, sign out, or unmount.
- Avoid multiple overlapping audio instances.
- Sound setting and volume sync with user profile and cache locally.

Animation requirements:
- Use React Native Reanimated for pastry bounce, oven glow, and small screen transitions.
- Keep active timer motion subtle.
- Stop bounce when paused, completed, or expired.
- Respect Android reduced motion settings where possible.

Testing checklist:
- Android emulator login works.
- Physical Android login works.
- Firestore user document is created.
- Tags are created, deleted, and synced.
- Last remaining tag cannot be deleted.
- Completed sessions sync to users/{uid}/sessions.
- Expired sessions sync to users/{uid}/sessions.
- Coins cannot go negative.
- Locked pastries cannot be selected.
- Purchases persist after app restart.
- Timer pause/resume preserves remaining time.
- Oven audio starts, pauses, resumes, and stops correctly.
- App restart loads cached state quickly, then reconciles with Firestore.
