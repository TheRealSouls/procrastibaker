# Procrastibaker Product Brief

Procrastibaker is a cozy bakery-themed study timer app.

Users choose a pastry, set a study timer, and focus while the pastry bakes. If they complete the session, the pastry is added to their bakery and they earn coins. If they quit early, the pastry expires and goes to the bin.

Target users:
- High-school students
- College students
- Exam-prep students
- Procrastinators who need gentle accountability

Core features:
- Google login
- Timer from 10 to 120 minutes in 5-minute intervals
- Pastry selection
- Animated oven screen
- Completed bakery collection
- Expired pastry bin
- Coins
- Shop
- Coloured study tags
- Tag creation and deletion, while always keeping at least one tag
- Statistics
- Optional oven sound
- Cross-platform sync with the web app

Product tone:
- Gentle accountability, not punishment
- Cozy and motivating
- Clear enough for focused students
- Playful without becoming childish

Display name:
- Procrastibaker

Current web prototype behavior to preserve:
- Login uses username and email for local fallback, and Google auth when configured.
- Username is the display name everywhere.
- Nickname has been removed.
- Completed sessions award 1 coin per 5 minutes.
- Cancelled or abandoned sessions become expired pastries and award no coins.
- Locked pastries cannot be selected until purchased.
- User progress should eventually sync between web and Android through Firestore.
