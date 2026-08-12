import { useState } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { HeatmapData } from "../utils/statsUtils";
import { formatMinutes } from "../utils/sessionUtils";
import { heatmapToBlob, shareOrDownloadImage } from "../utils/shareHeatmap";

type FocusHeatmapProps = {
  data: HeatmapData;
};

// Weekday chrome stays in English for now, localizing calendar labels is a
// later date-formatting concern (see i18n plan).
const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];
const WEEKDAY_FULL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function FocusHeatmap({ data }: FocusHeatmapProps) {
  const { t } = useTranslation();
  const [active, setActive] = useState<HeatmapData["weeks"][number][number]>(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState("");

  const weekCount = data.weeks.length;

  async function handleShare() {
    setSharing(true);
    setShareError("");
    try {
      const blob = await heatmapToBlob(data);
      if (!blob) {
        setShareError(t("heatmap.shareError"));
        return;
      }
      await shareOrDownloadImage(blob, "procrastibaker-focus.png");
    } catch {
      setShareError(t("heatmap.shareError"));
    } finally {
      setSharing(false);
    }
  }

  function describeCell(
    cell: { date: Date; minutes: number; count: number } | null,
  ): string {
    if (!cell) {
      return "";
    }
    const weekday = WEEKDAY_FULL[(cell.date.getDay() + 6) % 7];
    const day = `${weekday} ${cell.date.getDate()}`;
    if (cell.minutes === 0) {
      return t("heatmap.noFocus", { day });
    }
    return t("heatmap.cellInfo", {
      day,
      time: formatMinutes(cell.minutes),
      bakes: t("heatmap.bakes", { count: cell.count }),
    });
  }

  const readout = active
    ? describeCell(active)
    : t("heatmap.readout", {
        count: data.activeDays,
        time: formatMinutes(data.totalMinutes),
      });

  return (
    <div className="focus-heatmap">
      <div
        className="focus-heatmap__scroll"
        style={{ "--weeks": weekCount } as CSSProperties}
      >
        <div className="focus-heatmap__months" aria-hidden="true">
          {data.monthLabels.map((label) => (
            <span
              className="focus-heatmap__month"
              key={`${label.column}-${label.label}`}
              style={{ gridColumnStart: label.column + 1 }}
            >
              {label.label}
            </span>
          ))}
        </div>

        <div className="focus-heatmap__body">
          <div className="focus-heatmap__weekdays" aria-hidden="true">
            {WEEKDAY_LABELS.map((label, index) => (
              <span className="focus-heatmap__weekday" key={index}>
                {label}
              </span>
            ))}
          </div>

          <div
            className="focus-heatmap__grid"
            role="img"
            aria-label={t("heatmap.aria", {
              days: data.activeDays,
              time: formatMinutes(data.totalMinutes),
            })}
          >
            {data.weeks.map((week, col) =>
              week.map((cell, row) =>
                cell === null ? (
                  <span
                    aria-hidden="true"
                    className="focus-heatmap__cell is-empty"
                    key={`${col}-${row}`}
                  />
                ) : (
                  <span
                    aria-label={describeCell(cell)}
                    className="focus-heatmap__cell"
                    data-level={cell.level}
                    key={cell.dateKey}
                    onBlur={() => setActive(null)}
                    onFocus={() => setActive(cell)}
                    onMouseEnter={() => setActive(cell)}
                    onMouseLeave={() => setActive(null)}
                    tabIndex={0}
                    title={describeCell(cell)}
                  />
                ),
              ),
            )}
          </div>
        </div>
      </div>

      <div className="focus-heatmap__footer">
        <p className="focus-heatmap__readout" role="status">
          {readout}
        </p>
        <div className="focus-heatmap__footer-right">
          <div className="focus-heatmap__legend" aria-hidden="true">
            <span>{t("heatmap.less")}</span>
            <span className="focus-heatmap__cell" data-level={0} />
            <span className="focus-heatmap__cell" data-level={1} />
            <span className="focus-heatmap__cell" data-level={2} />
            <span className="focus-heatmap__cell" data-level={3} />
            <span className="focus-heatmap__cell" data-level={4} />
            <span>{t("heatmap.more")}</span>
          </div>
          <button
            className="button focus-heatmap__share"
            disabled={sharing}
            onClick={handleShare}
            type="button"
          >
            <i aria-hidden="true" className="fa-solid fa-share-nodes" />
            {sharing ? t("heatmap.sharing") : t("heatmap.share")}
          </button>
        </div>
      </div>

      {shareError && (
        <p className="auth-error" role="alert">
          {shareError}
        </p>
      )}
    </div>
  );
}
