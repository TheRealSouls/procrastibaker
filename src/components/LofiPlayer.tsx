import type { CSSProperties } from "react";
import { useLofiPlayer } from "../context/LofiPlayerContext";

/**
 * Compact, keyboard-accessible lo-fi controls. All playback logic lives in
 * LofiPlayerProvider; this component only renders state and dispatches actions.
 */
export function LofiPlayer() {
  const {
    available,
    isPlaying,
    volume,
    muted,
    togglePlay,
    next,
    setVolume,
    toggleMute,
  } = useLofiPlayer();

  if (!available) {
    return null;
  }

  return (
    <section className="lofi-player" aria-label="Lo-fi music player">
      <button
        aria-label={isPlaying ? "Pause music" : "Play music"}
        className="lofi-player__btn lofi-player__btn--primary"
        onClick={togglePlay}
        type="button"
      >
        <i
          aria-hidden="true"
          className={isPlaying ? "fa-solid fa-pause" : "fa-solid fa-play"}
        />
      </button>

      <button
        aria-label="Next track"
        className="lofi-player__btn"
        onClick={next}
        type="button"
      >
        <i aria-hidden="true" className="fa-solid fa-forward-step" />
      </button>

      <div className="lofi-player__meta">
        <span className="lofi-player__title">Lo-Fi beats</span>
      </div>

      <button
        aria-label={muted ? "Unmute music" : "Mute music"}
        aria-pressed={muted}
        className="lofi-player__btn"
        onClick={toggleMute}
        type="button"
      >
        <i
          aria-hidden="true"
          className={
            muted ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high"
          }
        />
      </button>

      <input
        aria-label="Music volume"
        className="lofi-player__volume"
        max={1}
        min={0}
        onChange={(event) => setVolume(Number(event.target.value))}
        step={0.01}
        style={{ "--fill": `${(muted ? 0 : volume) * 100}%` } as CSSProperties}
        type="range"
        value={muted ? 0 : volume}
      />
    </section>
  );
}
