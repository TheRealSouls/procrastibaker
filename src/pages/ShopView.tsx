import { PastryCard } from "../components/PastryCard";
import { pastries } from "../data/pastries";
import type { AppState } from "../types";

type ShopViewProps = {
  state: AppState;
  onBuyPastry: (pastryId: string) => void;
  onSelectPastry: (pastryId: string) => void;
};

export function ShopView({
  state,
  onBuyPastry,
  onSelectPastry,
}: ShopViewProps) {
  const coins = state.user?.coins ?? 0;

  return (
    <div className="page-stack">
      <section className="page-heading shop-heading">
        <div>
          <h1>Pastry shop</h1>
          <p>
            Spend study coins on new pastries, then choose one as your active
            bake for future focus sessions.
          </p>
        </div>
        <div className="shop-wallet" aria-label="Current coin balance">
          <strong>{coins}</strong>
          <span>coins</span>
        </div>
      </section>

      <section className="card-grid" aria-label="Pastry shop items">
        {pastries.map((pastry) => (
          <PastryCard
            canAfford={coins >= pastry.price}
            isSelected={state.selectedPastryId === pastry.id}
            isUnlocked={state.unlockedPastryIds.includes(pastry.id)}
            key={pastry.id}
            onBuyPastry={onBuyPastry}
            onSelectPastry={onSelectPastry}
            pastry={pastry}
          />
        ))}
      </section>
    </div>
  );
}
