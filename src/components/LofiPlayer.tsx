import { useState, type CSSProperties } from "react";
import { useLofiPlayer } from "../context/LofiPlayerContext";

/**
 * Compact, keyboard-accessible ambient-sound player: pick a pack (lo-fi, rain,
 * forest, oven) and control playback. All logic lives in LofiPlayerProvider.
 */
export function LofiPlayer() {
  const {
    available,
    packs,
    pack,
    label,
    canSkip,
    isPlaying,
    volume,
    muted,
    selectPack,
    togglePlay,
    next,
    setVolume,
    toggleMute,
  } = useLofiPlayer();
  // On narrow screens the player collapses to a floating note button so it no
  // longer overlaps the bottom nav / top bar; tapping it reveals the panel.
  const [open, setOpen] = useState(false);

  if (!available) {
    return null;
  }

  return (
    <div className={`lofi-dock${open ? " is-open" : ""}`}>
      <button
        aria-expanded={open}
        aria-label={open ? "Hide sound player" : "Show sound player"}
        className="lofi-dock__toggle"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <i
          aria-hidden="true"
          className={open ? "fa-solid fa-xmark" : "fa-solid fa-music"}
        />
      </button>

      <section className="lofi-player" aria-label="Ambient sound player">
        <div className="lofi-player__packs" role="group" aria-label="Sound pack">
        {packs.map((option) => (
          <button
            aria-label={option.label}
            aria-pressed={option.id === pack}
            className={`lofi-player__pack${
              option.id === pack ? " is-active" : ""
            }`}
            key={option.id}
            onClick={() => selectPack(option.id)}
            title={option.label}
            type="button"
          >
            <i aria-hidden="true" className={option.icon} />
          </button>
        ))}
      </div>

      <div className="lofi-player__controls">
        <button
          aria-label={isPlaying ? "Pause sound" : "Play sound"}
          className="lofi-player__btn lofi-player__btn--primary"
          onClick={togglePlay}
          type="button"
        >
          <i
            aria-hidden="true"
            className={isPlaying ? "fa-solid fa-pause" : "fa-solid fa-play"}
          />
        </button>

        {canSkip && (
          <button
            aria-label="Next track"
            className="lofi-player__btn"
            onClick={next}
            type="button"
          >
            <i aria-hidden="true" className="fa-solid fa-forward-step" />
          </button>
        )}

        <div className="lofi-player__meta">
          <span className="lofi-player__title">{label}</span>
        </div>

        <button
          aria-label={muted ? "Unmute sound" : "Mute sound"}
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
          aria-label="Sound volume"
          className="lofi-player__volume"
          max={1}
          min={0}
          onChange={(event) => setVolume(Number(event.target.value))}
          step={0.01}
          style={{ "--fill": `${(muted ? 0 : volume) * 100}%` } as CSSProperties}
          type="range"
          value={muted ? 0 : volume}
        />
        </div>
      </section>
    </div>
  );
}
