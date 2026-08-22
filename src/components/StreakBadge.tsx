import { useTranslation } from "react-i18next";
import fireSprite from "../media/sprites/fire.png";

type StreakBadgeProps = {
  count: number;
  className?: string;
};

export function StreakBadge({ count, className }: StreakBadgeProps) {
  const { t } = useTranslation();
  const classes = ["streak-badge", className].filter(Boolean).join(" ");

  return (
    <span className={classes} aria-label={t("streakBadge.aria", { count })}>
      <img
        alt=""
        aria-hidden="true"
        className="streak-badge__flame"
        draggable={false}
        src={fireSprite}
      />
      <span className="streak-badge__count">{count}</span>
    </span>
  );
}
