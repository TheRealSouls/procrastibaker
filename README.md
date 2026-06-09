# Procrastibaker

Procrastibaker is an early prototype of a gamified study timer where students bake pastries by completing focused study sessions. It is inspired by Forest, but uses a warm bakery theme: choose a pastry, start a study block, keep it baking in the oven, and earn coins when the session finishes.

## Features

- Local prototype login with username and email.
- Dashboard with coins, selected pastry, completed time, baked pastries, and expired pastries.
- Timer setup with duration, study tag, pastry selection, reward preview, and oven ambience controls.
- Active countdown with oven animation, progress, completion reward, and cancel protection.
- Bakery collection for completed pastries plus an expired pastry bin.
- Pastry shop for unlocking new pastries with coins.
- Statistics dashboard with study totals, tag breakdowns, completion rate, and pastry counts.
- Collapsed developer tools on the dashboard for resetting local data and adding demo data.

## Tech Stack

- React
- TypeScript
- Vite
- Plain CSS
- `localStorage` persistence

## Run Locally

Install dependencies once:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Create a local environment file from `.env.example` if you need Firebase values for future auth work:

```bash
cp .env.example .env.local
```

Create a production build:

```bash
npm run build
```

## Current Limitations

- Data is stored only in the current browser with `localStorage`.
- Login is local prototype state, not real authentication.
- There is no backend, database, account sync, or cloud backup.
- Active timer sessions are not restored after a full refresh or closed tab.
- Shop, coins, and developer tools are prototype-only and not protected by a server.
- Charts are simple CSS bars instead of a charting library.

## Future Improvements

- Persist users and sessions with a backend.
- Add real authentication.
- Restore active sessions safely after refresh.
- Add weekly goals, streaks, achievements, and calendar views.
- Add more pastries, rarity tiers, and seasonal collections.
- Add custom study tags and exportable statistics.
- Improve PWA/mobile support for focused study use.
