import { type KeyboardEvent, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { PastryVisual } from "./PastryVisual";
import { formatMinutes } from "../utils/sessionUtils";

type SessionSummary = {
  minutes: number;
  coins: number;
  pastryId: string;
  pastryName: string;
  pastryEmoji: string;
};

type SessionSummaryModalProps = {
  summary: SessionSummary;
  onClose: () => void;
};

/**
 * Brief celebratory recap shown when a bake finishes: minutes studied, the
 * pastry added to the shelf, and coins earned. Dismissing returns to the
 * dashboard. (A congrats sound can hook in here later.)
 */
export function SessionSummaryModal({
  summary,
  onClose,
}: SessionSummaryModalProps) {
  const { t } = useTranslation();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" || event.key === "Enter") {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <div className="modal-backdrop">
      <section
        aria-labelledby="session-summary-title"
        aria-modal="true"
        className="confirmation-modal session-summary"
        onKeyDown={handleKeyDown}
        role="dialog"
      >
        <PastryVisual
          className="session-summary__visual"
          emoji={summary.pastryEmoji}
          pastryId={summary.pastryId}
          pastryName={summary.pastryName}
        />
        <h2 id="session-summary-title">{t("summary.title")}</h2>
        <p>{t("summary.subtitle")}</p>

        <dl className="session-summary__stats">
          <div>
            <dt>{t("summary.minutes")}</dt>
            <dd>{formatMinutes(summary.minutes)}</dd>
          </div>
          <div>
            <dt>{t("summary.pastry")}</dt>
            <dd>{t("summary.pastryAdded", { name: summary.pastryName })}</dd>
          </div>
          <div>
            <dt>{t("summary.coins")}</dt>
            <dd>{t("summary.coinsEarned", { count: summary.coins })}</dd>
          </div>
        </dl>

        <div className="confirmation-modal__actions">
          <button
            className="button primary"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            {t("summary.continue")}
          </button>
        </div>
      </section>
    </div>
  );
}
