import type { View } from "../types";
import barChartIcon from "../media/sprites/bar_chart.png";
import clockIcon from "../media/sprites/clock.png";
import houseIcon from "../media/sprites/house.png";
import muffinIcon from "../media/sprites/muffin.png";
import shoppingCartIcon from "../media/sprites/shopping_cart.png";

const navItems: { icon: string; id: View; label: string }[] = [
  { icon: houseIcon, id: "dashboard", label: "Dashboard" },
  { icon: clockIcon, id: "timer", label: "Timer" },
  { icon: muffinIcon, id: "bakery", label: "Bakery" },
  { icon: shoppingCartIcon, id: "shop", label: "Shop" },
  { icon: barChartIcon, id: "stats", label: "Stats" },
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
          <img
            alt=""
            aria-hidden="true"
            className="sidebar-icon"
            draggable={false}
            onError={(event) => {
              event.currentTarget.classList.add("sidebar-icon--missing");
            }}
            src={item.icon}
          />
          {item.label}
        </button>
      ))}
    </nav>
  );
}
