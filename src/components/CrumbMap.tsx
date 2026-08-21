import { useMemo, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { pastrySprites } from "../data/pastrySprites";
import type { StudySession } from "../types";
import {
  bakedMonths,
  buildCrumbMap,
  buildCrumbMapFromCounts,
  type CrumbTile,
} from "../utils/crumbMap";

type CrumbMapProps = {
  // Own map: real sessions, so it can be filtered by month.
  sessions?: StudySession[];
  // Friend map: only aggregate totals are shared, so no month filter.
  counts?: Record<string, number>;
  title?: string;
  compact?: boolean;
};

const TILE_PX = 26;
const ZOOM_STEPS = [0.5, 0.75, 1, 1.5, 2];

function formatMonth(key: string, locale: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

/**
 * The Crumb Map: every finished bake is one tile, spiralling out from the very
 * first one at the centre, so a study history reads as a shape that grows rather
 * than a list of totals.
 */
export function CrumbMap({ sessions, counts, title, compact = false }: CrumbMapProps) {
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState<string | null>(null);
  const [zoomIndex, setZoomIndex] = useState(compact ? 1 : 2);

  const months = useMemo(
    () => (sessions ? bakedMonths(sessions) : []),
    [sessions],
  );

  const tiles: CrumbTile[] = useMemo(() => {
    if (sessions) {
      return buildCrumbMap(sessions, month);
    }
    return counts ? buildCrumbMapFromCounts(counts) : [];
  }, [sessions, counts, month]);

  const zoom = ZOOM_STEPS[zoomIndex];

  // The spiral is centred on 0,0, so the extent in each direction sets the size.
  const radius = useMemo(
    () =>
      tiles.reduce(
        (max, tile) => Math.max(max, Math.abs(tile.x), Math.abs(tile.y)),
        0,
      ),
    [tiles],
  );

  const side = (radius * 2 + 1) * TILE_PX;

  if (tiles.length === 0) {
    return (
      <section className="crumb-map crumb-map--empty">
        <h2 className="crumb-map__title">{title ?? t("crumbMap.title")}</h2>
        <p className="quiet-text">{t("crumbMap.empty")}</p>
      </section>
    );
  }

  return (
    <section className={`crumb-map${compact ? " crumb-map--compact" : ""}`}>
      <div className="crumb-map__header">
        <div>
          <h2 className="crumb-map__title">{title ?? t("crumbMap.title")}</h2>
          <p className="crumb-map__count">
            {t("crumbMap.tileCount", { count: tiles.length })}
          </p>
        </div>

        <div className="crumb-map__controls">
          {months.length > 0 && (
            <>
              <label className="sr-only" htmlFor="crumb-month">
                {t("crumbMap.period")}
              </label>
              <select
                className="crumb-map__select"
                id="crumb-month"
                onChange={(event) => setMonth(event.target.value || null)}
                value={month ?? ""}
              >
                <option value="">{t("crumbMap.allTime")}</option>
                {months.map((key) => (
                  <option key={key} value={key}>
                    {formatMonth(key, i18n.language)}
                  </option>
                ))}
              </select>
            </>
          )}

          <div className="crumb-map__zoom" role="group" aria-label={t("crumbMap.zoom")}>
            <button
              aria-label={t("crumbMap.zoomOut")}
              className="button"
              disabled={zoomIndex === 0}
              onClick={() => setZoomIndex((value) => Math.max(0, value - 1))}
              type="button"
            >
              <i aria-hidden="true" className="fa-solid fa-magnifying-glass-minus" />
            </button>
            <button
              aria-label={t("crumbMap.zoomIn")}
              className="button"
              disabled={zoomIndex === ZOOM_STEPS.length - 1}
              onClick={() =>
                setZoomIndex((value) => Math.min(ZOOM_STEPS.length - 1, value + 1))
              }
              type="button"
            >
              <i aria-hidden="true" className="fa-solid fa-magnifying-glass-plus" />
            </button>
          </div>
        </div>
      </div>

      <div className="crumb-map__viewport">
        <div
          className="crumb-map__canvas"
          role="img"
          aria-label={t("crumbMap.aria", { count: tiles.length })}
          style={
            {
              width: side,
              height: side,
              transform: `scale(${zoom})`,
            } as CSSProperties
          }
        >
          {tiles.map((tile) => (
            <img
              alt=""
              className="crumb-map__tile"
              key={tile.key}
              src={pastrySprites[tile.pastryId]}
              style={{
                // Centre the spiral inside the square canvas.
                left: (tile.x + radius) * TILE_PX,
                top: (tile.y + radius) * TILE_PX,
                width: TILE_PX,
                height: TILE_PX,
              }}
              title={tile.pastryName}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
