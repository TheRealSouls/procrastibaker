import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
          {!isExpired && <span>{formatMinutes(session.durationMinutes)}</span>}
        </p>
        <time dateTime={session.endedAt}>{formatDate(session.endedAt)}</time>
      </div>
    </article>
  );
}
