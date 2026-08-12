import { useTranslation } from "react-i18next";
import { CoinIcon } from "../components/CoinIcon";
import { PastryCard } from "../components/PastryCard";
import { pastries } from "../data/pastries";
import snowflakeSprite from "../media/sprites/snowflake.png";
import type { AppState } from "../types";
import { isPastryVisible } from "../utils/season";
import { MAX_FREEZES, STREAK_FREEZE_PRICE } from "../utils/streakUtils";

type ShopViewProps = {
  state: AppState;
  onBuyPastry: (pastryId: string) => void;
  onBuyStreakFreeze: () => void;
  onSelectPastry: (pastryId: string) => void;
};

export function ShopView({
  state,
  onBuyPastry,
  onBuyStreakFreeze,
  onSelectPastry,
}: ShopViewProps) {
  const { t } = useTranslation();
  const coins = state.user?.coins ?? 0;
  const freezes = state.user?.streakFreezes ?? 0;
  const freezesMaxed = freezes >= MAX_FREEZES;
  const canBuyFreeze = !freezesMaxed && coins >= STREAK_FREEZE_PRICE;
  // Seasonal pastries only appear while in season (owned ones always stay).
  const visiblePastries = pastries.filter((pastry) =>
    isPastryVisible(pastry, state.unlockedPastryIds),
  );

  return (
    <div className="page-stack">
      <section className="page-heading shop-heading">
        <div>
          <h1>{t("shop.title")}</h1>
          <p>{t("shop.intro")}</p>
        </div>
        <div className="shop-wallet" aria-label={t("shop.walletAria")}>
          <CoinIcon className="coin-icon--lg" />
          <strong>{coins}</strong>
          <span>{t("shop.coins")}</span>
        </div>
      </section>

      <section
        className="page-card streak-freeze-card"
        aria-labelledby="streak-freeze-heading"
      >
        <div className="streak-freeze-card__main">
          <span className="streak-freeze-card__icon" aria-hidden="true">
            <img
              alt=""
              className="streak-freeze-card__icon-img"
              draggable={false}
              src={snowflakeSprite}
            />
          </span>
          <div>
            <h2 id="streak-freeze-heading">{t("shop.freezeTitle")}</h2>
            <p>{t("shop.freezeDesc", { max: MAX_FREEZES })}</p>
          </div>
        </div>
        <dl className="streak-freeze-card__meta">
          <div>
            <dt>{t("shop.price")}</dt>
            <dd>{t("shop.priceCoins", { count: STREAK_FREEZE_PRICE })}</dd>
          </div>
          <div>
            <dt>{t("shop.owned")}</dt>
            <dd>
              {freezes} / {MAX_FREEZES}
            </dd>
          </div>
        </dl>
        <button
          className="button primary"
          disabled={!canBuyFreeze}
          onClick={onBuyStreakFreeze}
          type="button"
        >
          {freezesMaxed
            ? t("shop.maxedOut")
            : coins < STREAK_FREEZE_PRICE
              ? t("shop.notEnoughCoins")
              : t("shop.buyFreeze")}
        </button>
      </section>

      <section className="card-grid" aria-label={t("shop.itemsAria")}>
        {visiblePastries.map((pastry) => (
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
