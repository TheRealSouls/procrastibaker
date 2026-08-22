# Procrastibaker roadmap

Working document. Sizes are rough: **S** is a day or so, **M** is a few days,
**L** is a week or more of focused work.

## Already shipped
Focus timer with progressive baking, pastry shop and seasonal pastries, streaks and
streak freezes, daily goals with a scaled coin bonus, stats and heatmap, tags,
lo-fi player, friends and weekly leaderboard, pastry gifting earned from real study
sessions, email verification, GDPR export and delete, i18n scaffolding, Firestore
security rules, Cloud Functions for gift and reminder push, and a Capacitor Android
shell.

---

## Now: get the Android app live
See [PLAY_STORE.md](PLAY_STORE.md) for the step by step.

The long pole is **not** code. It is the **12 testers for 14 continuous days** closed
testing requirement for personal developer accounts. Start recruiting on day one.

Blocking items: `google-services.json`, SHA fingerprints in Firebase, upload keystore,
and deploying the current web build, rules and functions.

---

## Next: custom profiles (M)
Bio, avatar and a viewable profile. Makes friends, leaderboard and later groups feel
like people rather than usernames.

- Extend the profile in [`userProfileService.ts`](src/services/userProfileService.ts),
  which already has the field threading pattern (`bio`, `avatarUrl`).
- **Needs Firebase Storage**, which is not set up yet. Also needs client-side resizing,
  a hard size cap, and rules restricting writes to the owner's own path.
- A friend-visible profile view, reusing the read gating already proven by
  `isAcceptedFriend()` in [`firestore.rules`](firestore.rules).

> **This is the feature that makes moderation non-optional.** See below.

## Then: study groups (L)
YPT-style shared rooms: membership, invite codes, a group focus total and a group
leaderboard.

- Largest new backend surface so far: group docs, a members subcollection, invite
  handling, and aggregation of per-member focus minutes.
- Better after profiles, so members are recognisable.
- Group names and descriptions are more user-generated content.

## Later: monetisation (L)
Deliberately last.

**Important constraint:** on Android, selling digital goods generally requires
**Google Play Billing**, not Stripe. Stripe is the right tool for the **web** app, and
for anything that is not a digital good. Plan for web-first paid features, and treat
Play Billing as separate work if you want to sell inside the Android app.

Candidates: cosmetic pastry packs, a "Baker's Club" subscription (extra stats, streak
freezes, exclusive seasonal pastries), streak freeze top-ups.

---

## Not on the original list, but should be

### Launch blockers once profiles ship
- **UGC moderation and reporting (M).** Bios, avatars, usernames and group names are
  all user-generated. Play policy expects a **report and block** path for social
  features, and image uploads need a takedown route. This is a launch blocker for
  profiles, not polish.
- **Age rating decision (S).** Targeting under 13 triggers Play Families policy and
  much stricter data rules. Targeting 13+ is far simpler. Decide deliberately.
- **Legal refresh (S).** Terms and privacy policy need updating for user-generated
  content, and again later for payments.

### Health of what already exists
- **Error monitoring (S).** The Sentry trial expired, so production errors currently
  go nowhere. Either downgrade to the free tier or replace it.
- **Automated tests (M).** There are none. `streakUtils`, `leaderboard` and
  `giftableInventory` hold the scoring logic and are cheap, high value units to cover.
  The daily goal reward scaling is exactly the kind of rule that breaks silently.
- **Bundle size (S).** One chunk of roughly 1.4 MB. Route level code splitting would
  noticeably cut first load, which matters most on mobile data.
- **Backup and restore.** Export exists. Import does not.

### Growth and retention
- **Onboarding (S).** First run currently drops you straight into the dashboard.
- **Push permission priming (S).** Ask in-app *before* triggering the OS prompt. A
  denied Android notification permission is hard to recover.
- **Activation funnel (S).** PostHog is wired but no funnel is defined. Suggested
  activation metric: finished at least one session on day one.
- **Support channel (S).** Required by the store listing. The feedback page exists,
  but a monitored email is needed too.
- **ASO (S).** Title, short description keywords and screenshots do most of the work
  for organic installs.
- **Social (ongoing).** Short-form "study with me" video is the natural organic
  channel for this category. The progressive baking animation and the heatmap share
  image are both already good visual hooks.

### Product ideas worth considering
- Achievements and badges derived from existing session data (S, high value, no new
  backend).
- Levels or XP layered over coins (S).
- Pastry recipes or collections to complete (M).
- Focus session notes, so a session records what you actually studied (S).
- Web push, so reminders work on desktop too. The Cloud Functions already handle
  delivery, only token registration differs (M).

---

## Suggested order
1. Ship the Android app.
2. Restore error monitoring and add unit tests for the scoring logic.
3. Custom profiles, with moderation and reporting in the same release.
4. Achievements, onboarding and the activation funnel.
5. Study groups.
6. Monetisation.
