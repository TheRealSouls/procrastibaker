import type { View } from "../types";

const navItems: { icon: string; id: View; label: string }[] = [
  { icon: "🏠", id: "dashboard", label: "Dashboard" },
  { icon: "⏲️", id: "timer", label: "Timer" },
  { icon: "🧁", id: "bakery", label: "Bakery" },
  { icon: "🛒", id: "shop", label: "Shop" },
  { icon: "📊", id: "stats", label: "Stats" },
];

type AppNavProps = {
  currentView: View;
  onChange: (view: View) => void;
};

export function AppNav({ currentView, onChange }: AppNavProps) {
  return (
    <nav className="app-nav" aria-label="Primary navigation">
      {navItems.map((item) => (
        <button
          aria-current={currentView === item.id ? "page" : undefined}
          className={currentView === item.id ? "nav-button active" : "nav-button"}
          key={item.id}
          onClick={() => onChange(item.id)}
          type="button"
        >
          <span aria-hidden="true">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
