import { PastryVisual } from "./PastryVisual";
import { ProgressBar } from "./ProgressBar";

export type OvenStatus = "idle" | "active" | "complete" | "expired";

type OvenProps = {
  pastryEmoji: string;
  pastryId: string;
  pastryName: string;
  progressPercent: number;
  status: OvenStatus;
  timeLabel?: string;
};

export function Oven({
  pastryEmoji,
  pastryId,
  pastryName,
  progressPercent,
  status,
  timeLabel,
}: OvenProps) {
  const clampedProgress = Math.min(100, Math.max(0, progressPercent));

  return (
    <section
      className={`oven oven--${status}`}
      aria-label={`${pastryName} oven status`}
    >
      <div className="oven__body">
        <div className="oven__interior">
          <span className="oven__glow" />
          {status === "active" && (
            <>
              <span className="oven__heat-wave" />
              <span className="oven__heat-wave oven__heat-wave--two" />
              <span className="oven__heat-wave oven__heat-wave--three" />
            </>
          )}
          {status === "complete" && (
            <span className="oven__sparkles" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          )}
          {status === "expired" ? (
            <span className="oven__expired-visual" aria-hidden="true">
              <PastryVisual
                className="oven__pastry oven__pastry--expired"
                emoji={pastryEmoji}
                pastryId={pastryId}
                pastryName={pastryName}
              />
              <span className="oven__bin">
                <span />
              </span>
            </span>
          ) : (
            <PastryVisual
              className="oven__pastry"
              emoji={pastryEmoji}
              pastryId={pastryId}
              pastryName={pastryName}
            />
          )}
        </div>
      </div>

      <div className="oven__status">
        <strong>
          {status === "complete"
            ? "Freshly baked!"
            : status === "expired"
              ? "Expired pastry"
              : pastryName}
        </strong>
        {timeLabel && (
          <span
            aria-label={
              status === "active" ? `Time remaining ${timeLabel}` : undefined
            }
            role={status === "active" ? "timer" : undefined}
          >
            {timeLabel}
          </span>
        )}
      </div>

      <div className="oven__progress-wrap">
        <div className="oven__progress-label">
          <span>Progress</span>
          <span>{Math.round(clampedProgress)}%</span>
        </div>
        <ProgressBar
          ariaLabel="Session progress"
          className="oven__progress"
          fillClassName="oven__progress-fill"
          value={clampedProgress}
          valueText={`${Math.round(clampedProgress)}% complete`}
        />
      </div>
    </section>
  );
}
