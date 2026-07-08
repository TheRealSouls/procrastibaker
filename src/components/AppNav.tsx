import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import barChartIcon from "../media/sprites/bar_chart.png";
import clockIcon from "../media/sprites/clock.png";
import houseIcon from "../media/sprites/house.png";
import magnifyingGlassIcon from "../media/sprites/magnifying_glass.png";
import muffinIcon from "../media/sprites/muffin.png";
import shoppingCartIcon from "../media/sprites/shopping_cart.png";

const navItems = [
  { icon: houseIcon, to: "/dashboard", labelKey: "nav.dashboard" },
  { icon: clockIcon, to: "/timer", labelKey: "nav.timer" },
  { icon: muffinIcon, to: "/bakery", labelKey: "nav.bakery" },
  { icon: shoppingCartIcon, to: "/shop", labelKey: "nav.shop" },
  { icon: barChartIcon, to: "/stats", labelKey: "nav.stats" },
  { icon: magnifyingGlassIcon, to: "/feedback", labelKey: "nav.feedback" },
] as const;

export function AppNav() {
  const { t } = useTranslation();

  return (
    <nav className="app-nav" aria-label={t("nav.primaryLabel")}>
      {navItems.map((item) => (
        <NavLink
          className={({ isActive }) =>
            isActive ? "nav-button active" : "nav-button"
          }
          key={item.to}
          to={item.to}
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
          {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}
