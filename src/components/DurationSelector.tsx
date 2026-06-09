type DurationSelectorProps = {
  duration: number;
  max?: number;
  min?: number;
  onChange: (duration: number) => void;
  step?: number;
};

export function DurationSelector({
  duration,
  max = 120,
  min = 10,
  onChange,
  step = 5,
}: DurationSelectorProps) {
  function changeDuration(nextDuration: number) {
    onChange(Math.min(max, Math.max(min, nextDuration)));
  }

  return (
    <section
      className="setup-section"
      aria-describedby="duration-help"
      aria-labelledby="duration-heading"
    >
      <h2 id="duration-heading">Duration</h2>
      <div className="duration-stepper">
        <button
          aria-describedby="duration-help"
          className="button"
          disabled={duration <= min}
          onClick={() => changeDuration(duration - step)}
          type="button"
        >
          -{step} min
        </button>
        <output aria-label="Selected duration" aria-live="polite">
          {duration} min
        </output>
        <button
          aria-describedby="duration-help"
          className="button"
          disabled={duration >= max}
          onClick={() => changeDuration(duration + step)}
          type="button"
        >
          +{step} min
        </button>
      </div>
      <p id="duration-help">
        Durations stay between {min} and {max} minutes in {step}-minute steps.
      </p>
    </section>
  );
}
