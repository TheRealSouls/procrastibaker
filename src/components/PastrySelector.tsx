import { PastryVisual } from "./PastryVisual";
import type { Pastry } from "../types";

type PastrySelectorProps = {
  onSelect: (pastryId: string) => void;
  pastries: Pastry[];
  selectedPastryId: string;
  unlockedPastryIds: string[];
};

export function PastrySelector({
  onSelect,
  pastries,
  selectedPastryId,
  unlockedPastryIds,
}: PastrySelectorProps) {
  function selectPastry(pastryId: string) {
    if (unlockedPastryIds.includes(pastryId)) {
      onSelect(pastryId);
    }
  }

  return (
    <section
      className="setup-section"
      aria-describedby="pastry-help"
      aria-labelledby="pastry-heading"
    >
      <h2 id="pastry-heading">Pastry</h2>
      <p id="pastry-help">
        Locked pastries can be previewed here but cannot be selected until they
        are bought in the shop.
      </p>
      <div className="pastry-choice-grid">
        {pastries.map((pastry) => {
          const unlocked = unlockedPastryIds.includes(pastry.id);
          const statusId = `${pastry.id}-pastry-status`;

          return (
            <button
              aria-describedby={statusId}
              aria-disabled={!unlocked}
              aria-pressed={pastry.id === selectedPastryId}
              className={
                pastry.id === selectedPastryId
                  ? "pastry-choice active"
                  : "pastry-choice"
              }
              key={pastry.id}
              onClick={() => selectPastry(pastry.id)}
              type="button"
            >
              <PastryVisual
                className="pastry-choice__visual"
                emoji={pastry.emoji}
                pastryId={pastry.id}
                pastryName={pastry.name}
              />
              <strong>{pastry.name}</strong>
              <small id={statusId}>
                {unlocked ? "Unlocked" : `Locked, costs ${pastry.price} coins`}
              </small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
