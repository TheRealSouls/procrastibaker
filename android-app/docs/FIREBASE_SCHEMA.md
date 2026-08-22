# Firebase Schema

Use Firebase Authentication for login.

Use Cloud Firestore for cross-platform synced data.

Collections:

```txt
users/{uid}
users/{uid}/sessions/{sessionId}
users/{uid}/tags/{tagId}
```

## users/{uid}

Fields:
- username: string
- email: string
- coins: number
- selectedPastryId: string
- unlockedPastryIds: string[]
- audioSettings: object
- createdAt
- updatedAt

Example:

```ts
{
  username: "matas",
  email: "matas@example.com",
  coins: 25,
  selectedPastryId: "brownie",
  unlockedPastryIds: ["cookie", "brownie"],
  audioSettings: {
    soundEnabled: true,
    soundVolume: 40,
  },
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
}
```

## users/{uid}/sessions/{sessionId}

Fields:
- pastryId: string
- pastryName: string
- tagId: string
- tagName: string
- tagColor: string
- durationMinutes: number
- startedAt
- endedAt
- completed: boolean
- expired: boolean
- platform: "web" | "android"

Session rules:
- Completed sessions have completed true and expired false.
- Expired sessions have completed false and expired true.
- Android writes platform as "android".
- Web writes platform as "web".
- Keep denormalized pastryName, tagName, and tagColor for historical accuracy.

## users/{uid}/tags/{tagId}

Fields:
- name: string
- color: string
- isDefault: boolean
- createdAt

Tag rules:
- Users can create custom tags.
- Users can delete default and custom tags.
- Client must prevent deleting the final remaining tag.
- Firestore rules should validate basic field shape but cannot easily enforce every cross-document count rule without server code.

## Security Rules Direction

Rules:
- Users can only read/write their own user document.
- Users can only read/write their own sessions.
- Users can only read/write their own tags.
- Validate required fields and basic types.
- Do not allow users to write other users' documents.

Starter rule direction:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function ownsUser(uid) {
      return signedIn() && request.auth.uid == uid;
    }

    match /users/{uid} {
      allow read, create, update, delete: if ownsUser(uid);

      match /sessions/{sessionId} {
        allow read, create, update, delete: if ownsUser(uid);
      }

      match /tags/{tagId} {
        allow read, create, update, delete: if ownsUser(uid);
      }
    }
  }
}
```

Implementation notes:
- Store Firebase config in environment variables.
- Do not commit real Firebase API keys or service account files.
- Do not use Admin SDK credentials in the mobile app.
- Prefer serverTimestamp for createdAt and updatedAt where possible.
