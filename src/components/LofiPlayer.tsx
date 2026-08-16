import { useEffect, useState, type CSSProperties } from "react";
import { useLofiPlayer } from "../context/LofiPlayerContext";
import { useDraggablePanel } from "../hooks/useDraggablePanel";

const OPEN_STORAGE_KEY = "procrastibaker.lofiOpen";

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
  // The player can be minimised to a floating note button at any size. Starts
  // expanded, and the choice is remembered between visits.
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(OPEN_STORAGE_KEY) !== "false";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_STORAGE_KEY, String(open));
    } catch {
      // Storage unavailable; the choice just won't persist.
    }
  }, [open]);
  const {
    nodeRef,
    position,
    isDragging,
    resetPosition,
    reclamp,
    wasDragged,
    handleProps,
  } = useDraggablePanel("procrastibaker.lofiPosition");

  // Expanding near a screen edge would otherwise push the panel out of view,
  // since the dock keeps the corner it was dragged to and simply grows.
  useEffect(() => {
    reclamp();
  }, [open, reclamp]);

  if (!available) {
    return null;
  }

  // Until the user drags it, the panel keeps its CSS-defined corner. Once moved,
  // switch to explicit coordinates and release the default anchoring.
  const dockStyle: CSSProperties | undefined = position
    ? { left: position.x, top: position.y, right: "auto", bottom: "auto" }
    : undefined;

  return (
    <div
      className={`lofi-dock${open ? " is-open" : ""}${
        isDragging ? " is-dragging" : ""
      }${position ? " is-floating" : ""}`}
      ref={nodeRef}
      style={dockStyle}
    >
      {/* Collapsed: the bubble is both the restore button and the drag handle,
          so the player can be repositioned without expanding it first. A drag
          past the threshold suppresses the click. */}
      {!open && (
        <button
          aria-expanded={false}
          aria-label="Show sound player"
          className="lofi-dock__toggle"
          onClick={() => {
            if (!wasDragged()) {
              setOpen(true);
            }
          }}
          onDoubleClick={resetPosition}
          title="Show sound player. Drag to move."
          type="button"
          {...handleProps}
        >
          <i aria-hidden="true" className="fa-solid fa-music" />
        </button>
      )}

      <section className="lofi-player" aria-label="Ambient sound player">
        <div className="lofi-player__header">
          <div
            aria-label="Drag to move the sound player. Double click to reset its position."
            className="lofi-player__grip"
            onDoubleClick={resetPosition}
            role="separator"
            title="Drag to move"
            {...handleProps}
          >
            <i aria-hidden="true" className="fa-solid fa-grip-lines" />
          </div>
          <button
            aria-expanded
            aria-label="Minimise sound player"
            className="lofi-player__close"
            onClick={() => setOpen(false)}
            title="Minimise sound player"
            type="button"
          >
            <i aria-hidden="true" className="fa-solid fa-xmark" />
          </button>
        </div>

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
