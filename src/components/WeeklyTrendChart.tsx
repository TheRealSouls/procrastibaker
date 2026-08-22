import { useState } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { WeeklyFocus } from "../utils/statsUtils";
import { formatMinutes } from "../utils/sessionUtils";

type WeeklyTrendChartProps = {
  data: WeeklyFocus[];
};

export function WeeklyTrendChart({ data }: WeeklyTrendChartProps) {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const maxMinutes = data.reduce((max, week) => Math.max(max, week.minutes), 0);
  const lastIndex = data.length - 1;

  if (maxMinutes <= 0) {
    return (
      <p className="weekly-trend__empty">
        {t("weeklyTrend.empty", { weeks: data.length })}
      </p>
    );
  }

  const active = activeIndex === null ? null : data[activeIndex];
  const readout = active
    ? t("weeklyTrend.readoutActive", {
        label: active.label,
        time: formatMinutes(active.minutes),
        bakes: t("weeklyTrend.bakes", { count: active.count }),
      })
    : t("weeklyTrend.readoutDefault", {
        time: formatMinutes(maxMinutes),
        weeks: data.length,
      });

  return (
    <div className="weekly-trend">
      <div
        className="weekly-trend__bars"
        role="img"
        aria-label={t("weeklyTrend.barsAria", {
          weeks: data.length,
          time: formatMinutes(maxMinutes),
        })}
      >
        {data.map((week, index) => {
          const heightPercent =
            week.minutes > 0
              ? Math.max(6, Math.round((week.minutes / maxMinutes) * 100))
              : 0;
          const isCurrent = index === lastIndex;
          const isActive = index === activeIndex;

          return (
            <div
              aria-label={t("weeklyTrend.weekOfAria", {
                label: week.label,
                time: formatMinutes(week.minutes),
              })}
              className={`weekly-trend__col${isCurrent ? " is-current" : ""}${
                isActive ? " is-active" : ""
              }`}
              key={week.weekStartKey}
              onBlur={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(index)}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              tabIndex={0}
            >
              <div className="weekly-trend__bar-track">
                <div
                  className="weekly-trend__bar"
                  style={{ "--height": `${heightPercent}%` } as CSSProperties}
                />
              </div>
              <span className="weekly-trend__label" aria-hidden="true">
                {week.label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="weekly-trend__readout" role="status">
        {readout}
      </p>
    </div>
  );
}
