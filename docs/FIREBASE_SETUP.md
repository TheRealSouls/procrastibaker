# Firebase Setup

Firestore is now the source of truth for logged-in users. `localStorage` remains a logged-out fallback, migration source, and cache only.

## Checklist

1. Open the Firebase Console for the `procrastibaker-d3c13` project.
2. Enable Firebase Authentication.
3. Enable the Google sign-in provider in Authentication.
4. Add `localhost` and `127.0.0.1` to Authentication authorised domains for local development.
5. Create a Cloud Firestore database.
6. Publish the Firestore rules from `firestore.rules`.
7. Add the required Vite environment variables to `.env.local`:

```txt
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

8. Restart the Vite dev server after changing env variables.
9. Test Google login from the app.
10. Complete a study session and confirm it appears under `users/{uid}/sessions/{sessionId}`.
11. Cancel a study session and confirm it appears under `users/{uid}/sessions/{sessionId}` with `expired: true`.
12. Add or delete a study tag and confirm it appears under `users/{uid}/tags/{tagId}`.
13. Buy or select a pastry and confirm `users/{uid}` updates.

## Deploy Rules

```bash
firebase deploy --only firestore:rules
```

## Expected Firestore Shape

```txt
users/{uid}
users/{uid}/sessions/{sessionId}
users/{uid}/tags/{tagId}
```

Users should only be able to read and write their own `users/{uid}` document and its `sessions` and `tags` subcollections.

## QA

- Confirm an authenticated user can read and write `users/{ownUid}`.
- Confirm an authenticated user can read and write `users/{ownUid}/sessions/{sessionId}`.
- Confirm an authenticated user can read and write `users/{ownUid}/tags/{tagId}`.
- Confirm unauthenticated reads and writes are denied.
- Confirm a user cannot read or write another user's `users/{uid}` document.
- Confirm a user cannot read or write another user's sessions or tags.
