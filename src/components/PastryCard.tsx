import { PastryVisual } from "./PastryVisual";
import type { Pastry } from "../types";

type PastryCardProps = {
  canAfford: boolean;
  isSelected: boolean;
  isUnlocked: boolean;
  onBuyPastry: (pastryId: string) => void;
  onSelectPastry: (pastryId: string) => void;
  pastry: Pastry;
};

export function PastryCard({
  canAfford,
  isSelected,
  isUnlocked,
  onBuyPastry,
  onSelectPastry,
  pastry,
}: PastryCardProps) {
  const hintId = `${pastry.id}-shop-hint`;

  function buyPastry() {
    if (canAfford) {
      onBuyPastry(pastry.id);
    }
  }

  return (
    <article
      className={`page-card shop-card${isUnlocked ? "" : " shop-card--locked"}${
        isSelected ? " shop-card--selected" : ""
      }`}
    >
      <div className="shop-card__top">
        <PastryVisual
          className="shop-card__visual"
          emoji={pastry.emoji}
          pastryId={pastry.id}
          pastryName={pastry.name}
        />
        <div>
          <h2>{pastry.name}</h2>
          <p>{pastry.description}</p>
        </div>
      </div>

      <dl className="shop-card__meta">
        <div>
          <dt>Price</dt>
          <dd>{pastry.price === 0 ? "Free" : `${pastry.price} coins`}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd
            className={isUnlocked ? "shop-status unlocked" : "shop-status locked"}
          >
            {isUnlocked ? "Unlocked" : "Locked"}
          </dd>
        </div>
      </dl>

      {isUnlocked ? (
        <button
          className={isSelected ? "button selected-button" : "button"}
          disabled={isSelected}
          onClick={() => onSelectPastry(pastry.id)}
          type="button"
        >
          {isSelected ? "Selected" : "Select pastry"}
        </button>
      ) : (
        <button
          aria-describedby={!canAfford ? hintId : undefined}
          aria-disabled={!canAfford}
          className="button primary"
          onClick={buyPastry}
          type="button"
        >
          Buy
        </button>
      )}

      {!isUnlocked && !canAfford && (
        <p className="shop-card__hint" id={hintId}>
          Complete more study sessions to unlock this pastry.
        </p>
      )}
    </article>
  );
}
