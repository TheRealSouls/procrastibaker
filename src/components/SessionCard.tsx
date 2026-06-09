import type { CSSProperties } from "react";
import { PastryVisual } from "./PastryVisual";
import { pastries } from "../data/pastries";
import type { StudySession } from "../types";
import { formatDate } from "../utils/dateUtils";
import { formatMinutes } from "../utils/sessionUtils";

type SessionCardProps = {
  session: StudySession;
  variant: "completed" | "expired";
};

export function SessionCard({ session, variant }: SessionCardProps) {
  const pastry = pastries.find((item) => item.id === session.pastryId);
  const isExpired = variant === "expired";

  return (
    <article
      className={isExpired ? "session-card session-card--expired" : "session-card"}
    >
      <PastryVisual
        className="session-card__visual"
        emoji={pastry?.emoji ?? "\u{1F950}"}
        pastryId={session.pastryId}
        pastryName={session.pastryName}
      />
      <div>
        <h3>{session.pastryName}</h3>
        <p className="session-card__meta">
          <span
            className="tag-pill"
            style={{ "--tag-color": session.tagColor } as CSSProperties}
          >
            <span className="tag-dot" aria-hidden="true" />
            <span>{session.tagName}</span>
          </span>
          <span>
            {isExpired ? "planned " : ""}
            {formatMinutes(session.durationMinutes)}
          </span>
        </p>
        <time dateTime={session.endedAt}>{formatDate(session.endedAt)}</time>
        {isExpired && (
          <p className="expired-copy">
            This pastry expired because the session was stopped early. Try
            finishing your next baking session.
          </p>
        )}
      </div>
    </article>
  );
}
