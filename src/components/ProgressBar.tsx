type ProgressBarProps = {
  ariaLabel: string;
  className?: string;
  fillClassName?: string;
  max?: number;
  valueText?: string;
  value: number;
};

export function ProgressBar({
  ariaLabel,
  className = "bar-track",
  fillClassName = "bar-fill",
  max = 100,
  valueText,
  value,
}: ProgressBarProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const safeValue = Number.isFinite(value)
    ? Math.min(safeMax, Math.max(0, value))
    : 0;
  const width = (safeValue / safeMax) * 100;

  return (
    <div
      aria-label={ariaLabel}
      aria-valuemax={safeMax}
      aria-valuemin={0}
      aria-valuenow={Math.round(safeValue)}
      aria-valuetext={valueText}
      className={className}
      role="progressbar"
    >
      <span className={fillClassName} style={{ width: `${width}%` }} />
    </div>
  );
}
