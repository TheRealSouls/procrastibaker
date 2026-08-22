# Data Model

User:
- uid
- username
- email
- coins
- selectedPastryId
- unlockedPastryIds
- audioSettings

AudioSettings:
- soundEnabled
- soundVolume

Pastry:
- id
- name
- image
- price
- unlockedByDefault
- description

StudyTag:
- id
- name
- color
- isDefault

StudySession:
- id
- pastryId
- pastryName
- tagId
- tagName
- tagColor
- durationMinutes
- startedAt
- endedAt
- completed
- expired
- platform

Default pastries:
- cookie
- brownie
- muffin
- cake

Default unlocked pastries:
- cookie
- brownie

Purchasable pastries:
- muffin
- cake

Default tags:
- Study
- Work
- Break
- Revision
- Reading
- Project

Rules:
- Timer duration is 10 to 120 minutes.
- Timer duration changes in 5-minute increments.
- Coin reward is 1 coin per 5 completed minutes.
- Cancelled or abandoned sessions expire and award no coins.
- Users may delete any tag, including default tags.
- Users must always have at least one tag.
- If the selected tag is deleted, select the first remaining tag.
- If the selected pastry becomes invalid, fall back to the first unlocked pastry.

Suggested TypeScript shapes:

```ts
type UserProfile = {
  uid: string;
  username: string;
  email: string;
  coins: number;
  selectedPastryId: string;
  unlockedPastryIds: string[];
  audioSettings: {
    soundEnabled: boolean;
    soundVolume: number;
  };
};

type Pastry = {
  id: "cookie" | "brownie" | "muffin" | "cake";
  name: string;
  image: ImageSourcePropType;
  price: number;
  unlockedByDefault: boolean;
  description: string;
};

type StudyTag = {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
};

type StudySession = {
  id: string;
  pastryId: string;
  pastryName: string;
  tagId: string;
  tagName: string;
  tagColor: string;
  durationMinutes: number;
  startedAt: Date;
  endedAt: Date;
  completed: boolean;
  expired: boolean;
  platform: "web" | "android";
};
```
