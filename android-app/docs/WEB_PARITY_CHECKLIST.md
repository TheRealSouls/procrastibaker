# Web Parity Checklist

The Android app should match the web app visually and functionally.

Screens:
- Landing / welcome screen
- Login screen
- Dashboard
- Timer setup
- Active oven timer
- Bakery collection
- Expired pastry bin
- Shop
- Stats
- Tag management
- Settings / profile

Features:
- Google login
- Same pastries
- Same sprites
- Same colours
- Same timer range
- Same coin formula
- Same tag colours
- Same completed/expired logic
- Same Firestore data model
- Same user progress as web
- Username as display name
- Editable username
- No nickname field
- Optional oven sound
- Pause and resume timer
- Navigation/leave warning for unfinished sessions
- Tag deletion for default and custom tags
- Last remaining tag cannot be deleted

Coin formula:
- 1 coin per 5 minutes completed

Timer:
- Minimum 10 minutes
- Maximum 120 minutes
- 5-minute increments
- Finish button stays disabled until the countdown reaches zero
- Cancel or leave early saves an expired session
- Pause stops countdown, pastry bounce, and oven audio
- Resume continues from the preserved remaining time

Data parity:
- users/{uid} stores user profile, coins, selected pastry, unlocked pastries, and audio settings.
- users/{uid}/tags/{tagId} stores tag data.
- users/{uid}/sessions/{sessionId} stores completed and expired sessions.
- Sessions use platform "android" from the Android app.

Visual parity:
- Warm bakery palette
- Rounded cozy cards
- Pixel pastry sprites
- Oven-focused timer screen
- Bakery shelf collection
- Friendly student dashboard
- Clear bottom/tab navigation or equivalent phone-friendly navigation
- Tag dots shown anywhere tag labels appear
- Most baked pastry should show the matching sprite

Testing parity:
- Login works on Android emulator and physical phone.
- Progress syncs after app restart.
- Firestore data appears in the same user path as the web app.
- Locked pastries cannot be selected.
- Shop purchases deduct coins safely.
- Stats handle empty data.
- Completion rate handles zero sessions.
- Audio does not overlap when pausing/resuming.
