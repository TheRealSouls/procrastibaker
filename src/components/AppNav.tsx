import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import barChartIcon from "../media/sprites/bar_chart.png";
import clockIcon from "../media/sprites/clock.png";
import friendsIcon from "../media/sprites/friends.png";
import houseIcon from "../media/sprites/house.png";
import magnifyingGlassIcon from "../media/sprites/magnifying_glass.png";
import muffinIcon from "../media/sprites/muffin.png";
import shoppingCartIcon from "../media/sprites/shopping_cart.png";

type NavItem = {
  to: string;
  labelKey:
    | "nav.dashboard"
    | "nav.timer"
    | "nav.bakery"
    | "nav.shop"
    | "nav.stats"
    | "nav.friends"
    | "nav.feedback";
  icon?: string;
  faIcon?: string;
};

const navItems: NavItem[] = [
  { icon: houseIcon, to: "/dashboard", labelKey: "nav.dashboard" },
  { icon: clockIcon, to: "/timer", labelKey: "nav.timer" },
  { icon: muffinIcon, to: "/bakery", labelKey: "nav.bakery" },
  { icon: shoppingCartIcon, to: "/shop", labelKey: "nav.shop" },
  { icon: barChartIcon, to: "/stats", labelKey: "nav.stats" },
  { icon: friendsIcon, to: "/friends", labelKey: "nav.friends" },
  { icon: magnifyingGlassIcon, to: "/feedback", labelKey: "nav.feedback" },
];

export function AppNav() {
  const { t } = useTranslation();

  return (
    <nav className="app-nav" id="primary-nav" aria-label={t("nav.primaryLabel")}>
      {navItems.map((item) => (
        <NavLink
          className={({ isActive }) =>
            isActive ? "nav-button active" : "nav-button"
          }
          key={item.to}
          to={item.to}
        >
          {item.faIcon ? (
            <i aria-hidden="true" className={`sidebar-icon-fa ${item.faIcon}`} />
          ) : (
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
          )}
          {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}
