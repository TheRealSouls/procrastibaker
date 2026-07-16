# Procrastibaker Cloud Functions

Backend push delivery (FCM) for Procrastibaker. Runs on the Firebase Blaze plan
(pay-as-you-go — required for outbound network / scheduled functions).

## Functions
- **`onGiftCreated`** — Firestore trigger on `gifts/{giftId}` create. Looks up the
  recipient's device token at `pushTokens/{toUid}` and pushes
  *"<sender> sent you a <pastry>"*. The web app already shows gifts in-app; this
  reaches the native app when it's closed.
- **`sendDailyReminders`** — scheduled (every 30 min). Reads `reminderSettings`
  (mirrored from the client), and for each user whose local reminder time is due and
  who hasn't hit today's `dailyGoalMinutes` (summed from their recent completed
  sessions), pushes a nudge. Deduped once per local day via a server-managed
  `lastPushedDate`.

Both send through `pushTokens/{uid}` and delete a token when FCM reports it dead.

## Develop
```bash
cd functions
npm install
npm run build          # tsc -> lib/
```

## Deploy
Requires the project on the **Blaze** plan and `firebase login`.
```bash
# from the repo root
firebase deploy --only functions
firebase deploy --only firestore:rules   # pushTokens + reminderSettings rules
```

## Notes
- Only **native** (Android) clients register an FCM token today, so pushes reach the
  installed app; web users still get the in-app gift inbox and the local browser
  reminder.
- `PASTRY_NAMES` in `src/pastryNames.ts` mirrors `src/data/pastries.ts` in the web
  app — keep it in sync when pastries change.
- Timezones use the offset (`tzOffsetMinutes`) the client stores; DST shifts are
  picked up next time the user opens the reminder settings.
