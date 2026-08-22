import { useTranslation } from "react-i18next";
import { CrumbMap } from "../components/CrumbMap";
import { EmptyState } from "../components/EmptyState";
import { PastryVisual } from "../components/PastryVisual";
import { SessionCard } from "../components/SessionCard";
import croissantIcon from "../media/sprites/icon.png";
import trashIcon from "../media/sprites/trash.png";
import type { AppState } from "../types";
import { formatMinutes } from "../utils/sessionUtils";
import { getPastryCounts } from "../utils/statsUtils";

type BakeryViewProps = {
  state: AppState;
};

export function BakeryView({ state }: BakeryViewProps) {
  const { t } = useTranslation();
  const summaries = getPastryCounts(state.completedSessions).filter(
    (summary) => summary.count > 0,
  );

  return (
    <div className="page-stack">
      <section className="page-heading bakery-heading">
        <div>
          <h1>{t("bakery.title")}</h1>
          <p>{t("bakery.intro")}</p>
        </div>
        <div
          className="bakery-heading__count"
          aria-label={t("bakery.completedAria")}
        >
          <strong>{state.completedSessions.length}</strong>
          <span>{t("bakery.baked")}</span>
        </div>
      </section>

      {state.completedSessions.length === 0 ? (
        <EmptyState
          icon={"\u{1F950}"}
          iconSrc={croissantIcon}
          title={t("bakery.emptyTitle")}
        >
          {t("bakery.emptyBody")}
        </EmptyState>
      ) : (
        <>
          <CrumbMap sessions={state.completedSessions} />

          <section className="bakery-case" aria-labelledby="pastry-groups">
            <h2 id="pastry-groups">{t("bakery.displayCase")}</h2>
            <div className="shelf-grid">
              {summaries.map((summary) => (
                <article className="shelf-card" key={summary.id}>
                  <PastryVisual
                    className="shelf-card__visual"
                    emoji={summary.emoji}
                    pastryId={summary.id}
                    pastryName={summary.name}
                  />
                  <div>
                    <h3>{summary.name}</h3>
                    <p>
                      {t("bakery.shelfLine", {
                        count: summary.count,
                        time: formatMinutes(summary.totalMinutes),
                      })}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="page-card" aria-labelledby="completed-gallery">
            <div className="section-title-row">
              <h2 id="completed-gallery">{t("bakery.freshGallery")}</h2>
              <span>
                {t("bakery.sessions", {
                  count: state.completedSessions.length,
                })}
              </span>
            </div>
            <div className="session-grid">
              {state.completedSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  variant="completed"
                />
              ))}
            </div>
          </section>
        </>
      )}

      <section className="page-card expired-bin" aria-labelledby="expired-bin">
        <div className="section-title-row">
          <h2 id="expired-bin">{t("bakery.expiredBin")}</h2>
          <span>
            {t("bakery.stoppedEarly", {
              count: state.expiredSessions.length,
            })}
          </span>
        </div>

        {state.expiredSessions.length === 0 ? (
          <EmptyState compact icon={"\u{1F9FA}"} iconSrc={trashIcon}>
            {t("bakery.expiredEmpty")}
          </EmptyState>
        ) : (
          <div className="session-grid">
            {state.expiredSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                variant="expired"
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
