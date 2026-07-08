import { useState } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { TagMinuteTotal } from "../utils/statsUtils";
import { formatMinutes } from "../utils/sessionUtils";

type TagDonutChartProps = {
  data: TagMinuteTotal[];
  totalMinutes: number;
};

// Geometry for the stroke-dasharray donut. The viewBox is a normalized 42x42
// box so the circumference math stays simple and resolution-independent.
const RADIUS = 15.915_494_3; // circumference === 100 for easy percentage maths
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTER = 21;

type Slice = TagMinuteTotal & {
  percent: number;
  // Cumulative percentage offset where this slice begins (0–100).
  offset: number;
};

export function TagDonutChart({ data, totalMinutes }: TagDonutChartProps) {
  const { t } = useTranslation();
  const [activeTagId, setActiveTagId] = useState<string | null>(null);

  if (totalMinutes <= 0) {
    return <p className="tag-donut__empty">{t("stats.donutEmpty")}</p>;
  }

  let runningOffset = 0;
  const slices: Slice[] = data
    .filter((entry) => entry.minutes > 0)
    .map((entry) => {
      const percent = (entry.minutes / totalMinutes) * 100;
      const slice: Slice = { ...entry, percent, offset: runningOffset };
      runningOffset += percent;
      return slice;
    });

  const activeSlice = slices.find((slice) => slice.tagId === activeTagId) ?? null;
  const summary = slices
    .map((slice) => `${slice.tagName} ${Math.round(slice.percent)}%`)
    .join(", ");

  const clearActive = () => setActiveTagId(null);

  return (
    <div className="tag-donut">
      <div className="tag-donut__chart-wrap">
        <svg
          aria-label={t("stats.donutAria", { summary })}
          className="tag-donut__chart"
          role="img"
          viewBox="0 0 42 42"
        >
          {/* Base ring so the donut reads as a full shape even with one slice. */}
          <circle
            className="tag-donut__track"
            cx={CENTER}
            cy={CENTER}
            fill="none"
            r={RADIUS}
          />
          {slices.map((slice) => {
            const isActive = slice.tagId === activeTagId;
            const dimmed = activeTagId !== null && !isActive;
            // dasharray draws the colored arc then leaves the remainder blank.
            const dash = `${slice.percent} ${CIRCUMFERENCE - slice.percent}`;
            // Start at 12 o'clock (25 = quarter of 100) then walk backwards.
            const dashOffset = 25 - slice.offset;

            return (
              <circle
                aria-label={t("stats.donutSliceAria", {
                  tag: slice.tagName,
                  time: formatMinutes(slice.minutes),
                  percent: Math.round(slice.percent),
                })}
                className={`tag-donut__slice${isActive ? " is-active" : ""}${
                  dimmed ? " is-dimmed" : ""
                }`}
                cx={CENTER}
                cy={CENTER}
                fill="none"
                key={slice.tagId}
                onBlur={clearActive}
                onFocus={() => setActiveTagId(slice.tagId)}
                onMouseEnter={() => setActiveTagId(slice.tagId)}
                onMouseLeave={clearActive}
                r={RADIUS}
                role="img"
                stroke={slice.tagColor}
                strokeDasharray={dash}
                strokeDashoffset={dashOffset}
                tabIndex={0}
              />
            );
          })}
        </svg>

        <div aria-hidden="true" className="tag-donut__center">
          {activeSlice ? (
            <>
              <strong className="tag-donut__center-value">
                {Math.round(activeSlice.percent)}%
              </strong>
              <span className="tag-donut__center-label">
                {activeSlice.tagName}
              </span>
            </>
          ) : (
            <>
              <strong className="tag-donut__center-value">
                {formatMinutes(totalMinutes)}
              </strong>
              <span className="tag-donut__center-label">
                {t("stats.donutTotal")}
              </span>
            </>
          )}
        </div>

        {activeSlice && (
          <div className="tag-donut__tooltip" role="status">
            <span
              aria-hidden="true"
              className="tag-dot"
              style={{ "--tag-color": activeSlice.tagColor } as CSSProperties}
            />
            <span className="tag-donut__tooltip-name">
              {activeSlice.tagName}
            </span>
            <span className="tag-donut__tooltip-meta">
              {formatMinutes(activeSlice.minutes)} ·{" "}
              {Math.round(activeSlice.percent)}%
            </span>
          </div>
        )}
      </div>

      <ul className="tag-donut__legend">
        {data.map((entry) => {
          const percent =
            totalMinutes > 0 ? (entry.minutes / totalMinutes) * 100 : 0;
          const isActive = entry.tagId === activeTagId;
          const dimmed = activeTagId !== null && !isActive;
          const interactive = entry.minutes > 0;

          return (
            <li
              className={`tag-donut__legend-row${isActive ? " is-active" : ""}${
                dimmed ? " is-dimmed" : ""
              }${interactive ? "" : " is-empty"}`}
              key={entry.tagId}
              onBlur={interactive ? clearActive : undefined}
              onFocus={
                interactive ? () => setActiveTagId(entry.tagId) : undefined
              }
              onMouseEnter={
                interactive ? () => setActiveTagId(entry.tagId) : undefined
              }
              onMouseLeave={interactive ? clearActive : undefined}
              style={{ "--tag-color": entry.tagColor } as CSSProperties}
              tabIndex={interactive ? 0 : undefined}
            >
              <span aria-hidden="true" className="tag-dot" />
              <span className="tag-donut__legend-name">{entry.tagName}</span>
              <span className="tag-donut__legend-minutes">
                {formatMinutes(entry.minutes)}
              </span>
              <span className="tag-donut__legend-percent">
                {Math.round(percent)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
