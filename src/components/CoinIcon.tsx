import coinSprite from "../media/sprites/gold_coin.png";

type CoinIconProps = {
  className?: string;
};

/**
 * The gold coin sprite shown alongside coin amounts. Purely decorative: every
 * place it appears already states the amount in text, so it stays out of the
 * accessibility tree.
 */
export function CoinIcon({ className = "" }: CoinIconProps) {
  return (
    <img
      alt=""
      aria-hidden="true"
      className={`coin-icon${className ? ` ${className}` : ""}`}
      draggable={false}
      src={coinSprite}
    />
  );
}
