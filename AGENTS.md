# AGENTS.md

## Project Overview

This project is a gamified study timer web app inspired by the Forest app, but themed around baking pastries.

Users choose a study duration, select a pastry, assign a study category/tag, and start a focus session. While the timer runs, the selected pastry bakes inside an animated oven. If the user completes the session, the pastry is added to their bakery collection and they earn coins. If the user cancels the session early, the pastry expires and is sent to the bin.

The target audience is high-school and college students who want a cozy, motivating study tool.

The visual identity should feel warm, soft, bakery-themed, and student-friendly.

---

## Core Product Rules

The app should support:

* User login with username and email
* Editable username after login
* Timer duration selection from 10 to 120 minutes
* Duration must increase/decrease in 5-minute intervals
* Pastry selection before starting a session
* Study session tags such as Study, Work, Break, Revision, Reading, and Project
* Animated oven while the session is active
* Completed pastries saved to the user’s bakery
* Cancelled sessions saved as expired pastries
* Coin rewards for completed sessions
* Shop system where coins unlock new pastries
* Detailed statistics based on completed and expired sessions
* Persistent state using localStorage for the prototype

---

## Initial Pastries

Default unlocked pastries:

```ts
Cookie: 🍪
Brownie: 🍫
```

Purchasable pastries:

```ts
Muffin: 🧁
Birthday Cake: 🎂
```

Suggested prices:

```ts
Muffin: 80 coins
Birthday Cake: 200 coins
```

Coin reward formula:

```ts
1 coin per 5 minutes studied
```

For example:

```ts
25 minutes = 5 coins
60 minutes = 12 coins
```

---

## Recommended Tech Stack

Use:

* React
* TypeScript
* Vite
* Plain CSS or CSS modules
* localStorage for persistence

Do not add a backend unless explicitly requested.

Do not add external UI libraries unless explicitly requested.

Do not add authentication services like Firebase, Supabase, Clerk, or Auth0 yet. The first prototype should use local app state and localStorage only.

---

## Suggested Folder Structure

Use this structure unless the existing project already has a better one:

```txt
src/
  components/
    AppNav.tsx
    ConfirmationModal.tsx
    DurationSelector.tsx
    EmptyState.tsx
    Oven.tsx
    PastryCard.tsx
    PastrySelector.tsx
    ProgressBar.tsx
    SessionCard.tsx
    StatCard.tsx
    TagSelector.tsx

  data/
    pastries.ts
    tags.ts

  hooks/
    useAppState.ts
    useTimer.ts

  pages/
    BakeryView.tsx
    DashboardView.tsx
    LoginView.tsx
    ShopView.tsx
    StatsView.tsx
    TimerView.tsx

  types/
    index.ts

  utils/
    appStorage.ts
    dateUtils.ts
    statsUtils.ts
    sessionUtils.ts

  App.tsx
  main.tsx
  styles.css
```

---

## TypeScript Models

Use or adapt these types:

```ts
export type StudyTag =
  | "Study"
  | "Work"
  | "Break"
  | "Revision"
  | "Reading"
  | "Project";

export type User = {
  username: string;
  email: string;
  coins: number;
};

export type Pastry = {
  id: string;
  name: string;
  emoji: string;
  price: number;
  bakeTimeMultiplier?: number;
  unlockedByDefault: boolean;
  description: string;
};

export type StudySession = {
  id: string;
  pastryId: string;
  pastryName: string;
  tag: StudyTag;
  durationMinutes: number;
  startedAt: string;
  endedAt: string;
  completed: boolean;
  expired: boolean;
};

export type AppState = {
  user: User | null;
  unlockedPastryIds: string[];
  selectedPastryId: string;
  completedSessions: StudySession[];
  expiredSessions: StudySession[];
};
```

---

## Storage Rules

Use a single storage utility file:

```txt
src/utils/appStorage.ts
```

It should expose:

```ts
getState()
setState(state)
resetState()
createDefaultAppState()
```

Avoid direct localStorage calls inside UI components.

Components should update app state through shared state handlers or hooks.

---

## Timer Rules

The timer setup must allow durations from:

```txt
10 minutes minimum
120 minutes maximum
5-minute intervals only
```

Valid examples:

```txt
10, 15, 20, 25, 30, ... 120
```

Invalid examples:

```txt
5, 7, 121, 130
```

When a timer starts:

* Store the selected pastry
* Store the selected tag
* Store the selected duration
* Show the oven animation
* Display remaining time clearly
* Display session progress clearly

When the timer completes:

* Add a completed session
* Award coins
* Save to localStorage
* Add pastry to bakery history
* Return user to dashboard or show success state first

When the timer is cancelled:

* Show confirmation modal
* Warn that the pastry will expire
* If confirmed, save session to expiredSessions
* Award no coins
* Return user to dashboard

---

## Oven Animation Requirements

The oven should feel cozy and rewarding.

Use CSS animations only.

The oven should include:

* Warm glowing oven interior
* Pastry emoji inside
* Gentle bobbing/rising pastry animation
* Heat wave or shimmer effect
* Progress bar
* Clear timer text

Avoid distracting animations. This is a study app, not a circus for caffeinated pixels.

---

## Bakery View Requirements

The bakery should show completed pastries.

Include:

* Total pastries baked
* Grouped count by pastry type
* Total minutes by pastry type
* Individual completed session cards

Each completed session card should show:

* Pastry emoji
* Pastry name
* Tag
* Duration
* Completion date

Use a bakery shelf or display-case visual style if possible.

If there are no completed sessions, show a friendly empty state.

---

## Expired Pastry Bin Requirements

Cancelled sessions should appear as expired pastries.

Each expired session should show:

* Greyed-out pastry emoji
* Pastry name
* Tag
* Planned duration
* Failure date

Use copy that is discouraging but not hostile.

Good examples:

```txt
This pastry expired because the session was stopped early.
Try finishing your next baking session.
```

Bad examples:

```txt
You failed.
You are bad at studying.
```

The app should motivate the user, not emotionally body-slam them.

---

## Shop Requirements

The shop should show every pastry.

For each pastry, show:

* Emoji
* Name
* Description
* Price
* Locked/unlocked status

For locked pastries:

* Show a Buy button
* Disable the Buy button if the user lacks coins

For unlocked pastries:

* Show Unlocked
* Allow the user to select it as their active pastry

Buying a pastry should:

* Deduct coins
* Add pastry id to unlockedPastryIds
* Save app state

---

## Statistics Requirements

The stats page should show:

* Total completed study minutes
* Total minutes by tag
* Total completed sessions
* Total expired sessions
* Completion rate percentage
* Current coin balance
* Total coins earned, if tracked
* Most used tag
* Most baked pastry
* Pastry counts

Use simple visualisations:

* Horizontal bars for time by tag
* Cards for totals
* Grid for pastry breakdown

Do not add chart libraries yet unless explicitly requested.

---

## UI Style Guide

Use a warm bakery colour palette.

Suggested CSS variables:

```css
:root {
  --color-cream: #fff7df;
  --color-butter: #ffd76a;
  --color-honey: #f6b73c;
  --color-caramel: #c77b30;
  --color-cocoa: #5b351f;
  --color-brown: #3b2416;
  --color-soft-white: #fffaf0;
  --color-danger: #c4513b;
  --color-success: #5f9e57;
  --shadow-soft: 0 12px 30px rgba(91, 53, 31, 0.16);
  --radius-large: 24px;
  --radius-medium: 16px;
}
```

Design principles:

* Rounded cards
* Soft shadows
* Cream/yellow backgrounds
* Brown readable text
* Orange/yellow buttons
* Friendly spacing
* Mobile-first layout
* Cozy but not childish

---

## Accessibility Rules

Make sure:

* Buttons are keyboard-accessible
* Inputs have labels
* Focus states are visible
* Text contrast is readable
* Timer information is shown as text, not only animation
* Important actions like cancelling have confirmation

Do not rely only on colour to communicate meaning.

---

## Code Quality Rules

When editing this project:

* Use TypeScript properly
* Avoid `any` unless absolutely necessary
* Keep components small and focused
* Move repeated logic into utilities
* Keep localStorage logic outside components
* Avoid unnecessary dependencies
* Avoid large, messy components
* Prefer clear names over clever names
* Make the app work before making it fancy

No half-built mystery abstractions. Future developers already suffer enough.

---

## Testing Checklist

Before considering a task complete, verify:

* The app starts without errors
* Login works
* User data persists after refresh
* Username editing works
* Timer duration cannot go below 10 or above 120
* Timer uses 5-minute increments
* User can select only unlocked pastries
* Completed sessions save correctly
* Cancelled sessions become expired pastries
* Coins are awarded correctly
* Shop purchases deduct coins correctly
* Statistics update correctly
* Bakery updates after completed sessions
* Expired bin updates after cancelled sessions
* Page is usable on mobile
* No TypeScript errors
* No obvious console errors

---

## Development Priority

Build in this order:

1. App shell and navigation
2. Types and starter data
3. localStorage persistence
4. Login and dashboard
5. Timer setup
6. Countdown logic
7. Oven animation
8. Completed bakery
9. Expired pastry bin
10. Shop
11. Statistics
12. Styling polish
13. Accessibility
14. Refactor and cleanup

Do not jump straight to advanced features before the basic app works.

---

## Features to Avoid for Now

Do not implement these unless explicitly requested:

* Real backend
* Real authentication
* Database
* Social features
* Leaderboards
* Push notifications
* Mobile app wrapper
* Payment system
* Complex charts
* AI-generated study plans
* Multiplayer features

Keep the first version simple and functional.

---

## Future Improvement Ideas

Possible later features:

* Firebase or Supabase backend
* Real user authentication
* Daily streaks
* Pastry rarity levels
* Seasonal pastries
* Custom tags
* Weekly study goals
* Calendar heatmap
* Sound effects
* Focus music
* Pomodoro mode
* Friends leaderboard
* Export statistics
* Achievement badges
* Dark mode
* Mobile PWA support

These are not part of the first prototype.

## Audio and Sound Rules

The app may include optional sounds during active study sessions.

For the prototype, support only one sound:

```txt
public/sounds/oven-loop.mp3
```

Audio requirements:

* Sounds must be stored in `public/sounds/`
* The first supported sound is an oven/baking ambience loop
* Sound should only play during an active study session
* Sound must stop when the session completes
* Sound must stop when the session is cancelled
* Sound must stop when the user turns sound off
* Sound volume must be adjustable
* Sound settings must persist in localStorage
* The app must not crash if the audio file is missing
* Do not add external audio libraries
* Do not add more sounds unless explicitly requested

Audio settings should be represented in app state as:

```ts
audioSettings: {
  soundEnabled: boolean;
  soundVolume: number;
}
```

Default audio settings:

```ts
soundEnabled: true
soundVolume: 40
```

The UI should include:

* Sound on/off toggle
* Volume slider from 0 to 100
* Accessible labels for both controls

Avoid creating multiple overlapping audio instances. Use refs or a dedicated audio hook to manage playback cleanly.

