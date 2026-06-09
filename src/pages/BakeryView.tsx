import { EmptyState } from "../components/EmptyState";
import { PastryVisual } from "../components/PastryVisual";
import { SessionCard } from "../components/SessionCard";
import type { AppState } from "../types";
import { formatMinutes } from "../utils/sessionUtils";
import { getPastryCounts } from "../utils/statsUtils";

type BakeryViewProps = {
  state: AppState;
};

export function BakeryView({ state }: BakeryViewProps) {
  const summaries = getPastryCounts(state.completedSessions).filter(
    (summary) => summary.count > 0,
  );

  return (
    <div className="page-stack">
      <section className="page-heading bakery-heading">
        <div>
          <h1>Bakery shelf</h1>
          <p>
            Your completed study pastries are arranged by type, with stopped
            sessions kept in the expired bin below.
          </p>
        </div>
        <div className="bakery-heading__count" aria-label="Completed pastries">
          <strong>{state.completedSessions.length}</strong>
          <span>baked</span>
        </div>
      </section>

      {state.completedSessions.length === 0 ? (
        <EmptyState
          icon={"\u{1F950}"}
          title="You have not baked any pastries yet."
        >
          Start a study session to fill your bakery.
        </EmptyState>
      ) : (
        <>
          <section className="bakery-case" aria-labelledby="pastry-groups">
            <h2 id="pastry-groups">Display case</h2>
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
                      {summary.count} baked - {formatMinutes(summary.totalMinutes)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="page-card" aria-labelledby="completed-gallery">
            <div className="section-title-row">
              <h2 id="completed-gallery">Freshly baked gallery</h2>
              <span>{state.completedSessions.length} sessions</span>
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
          <h2 id="expired-bin">Expired pastry bin</h2>
          <span>{state.expiredSessions.length} stopped early</span>
        </div>

        {state.expiredSessions.length === 0 ? (
          <EmptyState compact icon={"\u{1F9FA}"}>
            No expired pastries yet. Keep your next bake going until the timer
            finishes.
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
