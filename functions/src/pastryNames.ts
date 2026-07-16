// Display names for pastry ids, mirroring src/data/pastries.ts in the web app.
// Kept as a small static map so the push text can name the pastry without a
// database read. Keep in sync when pastries are added/renamed.
export const PASTRY_NAMES: Record<string, string> = {
  cookie: "Cookie",
  brownie: "Brownie",
  muffin: "Muffin",
  "birthday-cake": "Birthday Cake",
  pretzel: "Pretzel",
  "cinnamon-roll": "Cinnamon Roll",
  "pumpkin-pie": "Pumpkin Pie",
  donut: "Donut",
  eclair: "Éclair",
  procroistinant: "Procroistinant",
  "gingerbread-man": "Gingerbread Man",
};

export function pastryName(id: string): string {
  return PASTRY_NAMES[id] ?? "pastry";
}
