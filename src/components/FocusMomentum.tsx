import { useTranslation } from "react-i18next";
import { StreakBadge } from "./StreakBadge";
import { formatMinutes } from "../utils/sessionUtils";
import type { FocusRecords } from "../utils/statsUtils";

type WeekDelta = {
  current: number;
  previous: number;
  deltaPercent: number | null;
} | null;

type FocusMomentumProps = {
  streakCount: number;
  delta: WeekDelta;
  records: FocusRecords;
};

function DeltaChip({ delta }: { delta: WeekDelta }) {
  const { t } = useTranslation();

  if (!delta) {
    return null;
  }

  if (delta.deltaPercent === null) {
    return (
      <span className="momentum-delta is-up">
        <span aria-hidden="true">▲</span> {t("momentum.newThisWeek")}
      </span>
    );
  }

  const up = delta.deltaPercent >= 0;

  return (
    <span className={`momentum-delta ${up ? "is-up" : "is-down"}`}>
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      {up
        ? t("momentum.deltaUp", { percent: delta.deltaPercent })
        : t("momentum.deltaDown", { percent: delta.deltaPercent })}
    </span>
  );
}

export function FocusMomentum({
  streakCount,
  delta,
  records,
}: FocusMomentumProps) {
  const { t } = useTranslation();

  const headline =
    streakCount > 0
      ? t("momentum.streak", { count: streakCount })
      : t("momentum.noStreak");

  const recordItems = [
    { key: "best-day", label: t("momentum.bestDay"), value: formatMinutes(records.bestDayMinutes) },
    { key: "best-week", label: t("momentum.bestWeek"), value: formatMinutes(records.bestWeekMinutes) },
    {
      key: "longest",
      label: t("momentum.longestSession"),
      value: formatMinutes(records.longestSessionMinutes),
    },
    {
      key: "active-days",
      label: t("momentum.activeDays"),
      value: records.activeDays.toLocaleString(),
    },
    { key: "total", label: t("momentum.totalFocus"), value: formatMinutes(records.totalMinutes) },
  ];

  return (
    <section className="page-card focus-momentum" aria-label={t("momentum.aria")}>
      <div className="focus-momentum__hero">
        <div className="focus-momentum__streak">
          <StreakBadge count={streakCount} />
          <strong className="focus-momentum__headline">{headline}</strong>
        </div>
        <DeltaChip delta={delta} />
      </div>

      <dl className="records-grid">
        {recordItems.map((item) => (
          <div className="records-grid__item" key={item.key}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
