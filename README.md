# Procrastibaker

Procrastibaker is a cozy study timer where focus sessions turn into pastries. Pick a bake, choose a study tag, start the oven, and try not to throw the pastry away before the timer ends. If you finish, the pastry lands on your bakery shelf and you earn coins. If you quit early, it goes to the expired bin.

It is a small prototype with a very specific mood: warm counters, pixel pastries, soft cards, and just enough game loop to make a study block feel less grim.

## what it does

- Runs a study timer from 10 to 120 minutes in 5-minute steps.
- Lets you choose a pastry, a coloured study tag, and an optional oven ambience sound.
- Awards 1 coin per 5 minutes when a session finishes.
- Saves completed pastries to the bakery shelf.
- Saves cancelled sessions to the expired pastry bin.
- Tracks study totals, tag totals, completion rate, favourite pastry, and pastry counts.
- Lets you buy new pastries with coins.
- Supports custom study tags with colours.
- Uses Google sign-in for identity when Firebase config is present.
- Keeps study progress in localStorage for now.
- Includes developer tools for reset, demo data, coins, and a one-click finished test session.

## the current bake

The app has four pastries:

- Cookie and Brownie are unlocked from the start.
- Muffin costs 80 coins.
- Birthday Cake costs 200 coins.

The pastry art lives in `src/media/sprites/`. The app uses those pixel sprites first and falls back to emoji if an image fails.

Study tags have names and colours. The default set is Study, Work, Break, Revision, Reading, and Project. You can add up to 12 custom tags, delete custom tags, and keep old session history intact even after a tag is gone.

## tech stack

- React
- TypeScript
- Vite
- Plain CSS
- Firebase Authentication for Google sign-in
- localStorage for prototype progress

There is no database yet. Firebase is only used for authentication.

## run it locally

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Build the app:

```bash
npm run build
```

Preview a production build:

```bash
npm run preview
```

## firebase setup

Copy `.env.example` to `.env.local` and fill in your Firebase web app values:

```bash
cp .env.example .env.local
```

Required values:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

Optional values:

```bash
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

If these values are missing, the app still loads. Google sign-in will show an error, and the local prototype login remains available.

## project map

```txt
src/
  components/   reusable UI pieces
  data/         pastries, tags, sprite mappings
  pages/        dashboard, timer, bakery, shop, stats, login
  utils/        storage, auth, dates, session math, stats
  types/        shared TypeScript models
  media/        favicon files and pastry sprites
```

## developer tools

The dashboard has a collapsed "Developer Tools" panel. It can:

- Reset all local data.
- Add demo completed sessions.
- Add demo expired sessions.
- Add 100 coins.
- Finish a test study session.

The finished test session uses the selected pastry, the first available study tag, a 25-minute duration, and the normal coin formula. It is meant for checking bakery, stats, coin, and localStorage flows without waiting for a timer.

## limits

- Progress is saved only in the current browser.
- Firebase does not sync sessions, coins, tags, or shop purchases.
- A timer in progress does not survive a closed tab.
- Developer tools are for local testing and are not protected by a server.
- Stats use simple CSS bars rather than a chart library.
- The shop economy is intentionally tiny.

## later

Good next steps would be Firestore sync, active-session recovery, weekly goals, streaks, achievements, more pastry art, a PWA install flow, and better mobile focus mode. The prototype already has the oven. It just needs a bigger bakery.
