import { useEffect, useState } from "react";
import { pastrySprites } from "../data/pastrySprites";

type PastryVisualProps = {
  className?: string;
  emoji: string;
  pastryId: string;
  pastryName: string;
};

export function PastryVisual({
  className = "",
  emoji,
  pastryId,
  pastryName,
}: PastryVisualProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const spriteSrc = pastrySprites[pastryId];
  const classes = ["pastry-visual", className].filter(Boolean).join(" ");

  useEffect(() => {
    setImageFailed(false);
  }, [spriteSrc]);

  return (
    <span className={classes} aria-hidden="true">
      {spriteSrc && !imageFailed ? (
        <img
          alt=""
          draggable={false}
          onError={() => setImageFailed(true)}
          src={spriteSrc}
        />
      ) : (
        <span className="pastry-visual__emoji">{emoji || pastryName}</span>
      )}
    </span>
  );
}
