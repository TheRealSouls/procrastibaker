import type { Pastry } from "../types";

export const pastries: Pastry[] = [
  {
    id: "cookie",
    name: "Cookie",
    emoji: "🍪",
    price: 0,
    bakeTimeMultiplier: 1,
    unlockedByDefault: true,
    description: "Default pastry for short study sessions.",
  },
  {
    id: "brownie",
    name: "Brownie",
    emoji: "🍫",
    price: 0,
    bakeTimeMultiplier: 1,
    unlockedByDefault: true,
    description: "Default pastry for deep reading blocks.",
  },
  {
    id: "muffin",
    name: "Muffin",
    emoji: "🧁",
    price: 80,
    bakeTimeMultiplier: 1,
    unlockedByDefault: false,
    description: "A cheerful cupcake-style bake for steady study streaks.",
  },
  {
    id: "birthday-cake",
    name: "Birthday Cake",
    emoji: "🎂",
    price: 200,
    bakeTimeMultiplier: 1,
    unlockedByDefault: false,
    description: "A celebration bake for longer-term focus progress.",
  },
];
