import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

// Lo-fi background music player.
//
// Architecture: two HTMLAudioElement "decks" are kept in refs (never in state).
// One deck is active; the other preloads the upcoming track. Advancing performs
// a 2s crossfade between the two decks driven by requestAnimationFrame. Only
// these two elements ever exist, so at most the current + next track are loaded.
// React state holds only what the UI shows (isPlaying, volume, muted, title),
// keeping re-renders limited to the player bar.

export type LofiTrack = { id: string; title: string; src: string };

type LofiPlayerContextValue = {
  available: boolean; // at least one track was found
  isPlaying: boolean;
  volume: number; // 0..1
  muted: boolean;
  currentTitle: string;
  togglePlay: () => void;
  next: () => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
};

const LofiPlayerContext = createContext<LofiPlayerContextValue | null>(null);

export function useLofiPlayer(): LofiPlayerContextValue {
  const value = useContext(LofiPlayerContext);
  if (!value) {
    throw new Error("useLofiPlayer must be used within <LofiPlayerProvider>");
  }
  return value;
}

const PLAYLIST_URL = "/sounds/lofi/playlist.json";
const FADE_MS = 2000; // crossfade / fade duration
const FADE_TAIL_S = 2.2; // begin the crossfade this long before a track ends
const DEFAULT_VOLUME = 0.5;

const LS_VOLUME = "procrastibaker-lofi-volume";
const LS_MUTED = "procrastibaker-lofi-muted";
const LS_PLAYING = "procrastibaker-lofi-playing";

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors (e.g. private mode).
  }
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/** Fisher–Yates shuffle of [0..n). Optionally avoids putting `avoidFirst` first. */
function shuffleIndices(n: number, avoidFirst?: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // Prevent the same song playing twice across a reshuffle boundary.
  if (avoidFirst != null && n > 1 && order[0] === avoidFirst) {
    [order[0], order[1]] = [order[1], order[0]];
  }
  return order;
}

export function LofiPlayerProvider({ children }: { children: ReactNode }) {
  const storedVolume = Number(readStored(LS_VOLUME));
  const initialVolume =
    Number.isFinite(storedVolume) && storedVolume >= 0 && storedVolume <= 1
      ? storedVolume
      : DEFAULT_VOLUME;

  const [available, setAvailable] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(initialVolume);
  const [muted, setMuted] = useState(readStored(LS_MUTED) === "true");
  const [currentTitle, setCurrentTitle] = useState("");

  // Imperative audio state lives in refs so it never triggers React re-renders.
  const decksRef = useRef<HTMLAudioElement[]>([]);
  const activeRef = useRef(0);
  const tracksRef = useRef<LofiTrack[]>([]);
  const queueRef = useRef<number[]>([]);
  const posRef = useRef(0);
  const fadeRafRef = useRef(0);
  const fadingRef = useRef(false);
  const readyRef = useRef(false);
  const isPlayingRef = useRef(false);
  const volumeRef = useRef(initialVolume);
  const mutedRef = useRef(muted);

  function targetVolume() {
    return mutedRef.current ? 0 : volumeRef.current;
  }

  // Ramp `out` deck down and `inn` deck up to `target` over FADE_MS.
  function runFade(options: {
    out: HTMLAudioElement | null;
    inn: HTMLAudioElement | null;
    target: number;
    onDone?: () => void;
  }) {
    const { out, inn, target, onDone } = options;
    cancelAnimationFrame(fadeRafRef.current);
    fadingRef.current = true;
    const start = performance.now();
    const outFrom = out ? out.volume : 0;
    const innFrom = inn ? inn.volume : 0;

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / FADE_MS);
      if (out) out.volume = clamp01(outFrom * (1 - p));
      if (inn) inn.volume = clamp01(innFrom + (target - innFrom) * p);
      if (p < 1) {
        fadeRafRef.current = requestAnimationFrame(tick);
      } else {
        fadingRef.current = false;
        onDone?.();
      }
    };
    fadeRafRef.current = requestAnimationFrame(tick);
  }

  function loadTrack(deck: HTMLAudioElement, track: LofiTrack) {
    deck.src = track.src;
    deck.load();
  }

  function startPlayback() {
    const decks = decksRef.current;
    const tracks = tracksRef.current;
    if (!readyRef.current || tracks.length === 0) {
      return;
    }
    const deck = decks[activeRef.current];
    if (!deck.src) {
      loadTrack(deck, tracks[queueRef.current[posRef.current]]);
      deck.volume = 0;
    }
    const promise = deck.play();
    if (promise) {
      promise.catch(() => {
        // Autoplay was blocked — stay paused until the next explicit gesture.
        setIsPlaying(false);
        isPlayingRef.current = false;
      });
    }
    runFade({ out: null, inn: deck, target: targetVolume() });
    setIsPlaying(true);
    isPlayingRef.current = true;
    writeStored(LS_PLAYING, "true");
  }

  function pausePlayback() {
    const deck = decksRef.current[activeRef.current];
    setIsPlaying(false);
    isPlayingRef.current = false;
    writeStored(LS_PLAYING, "false");
    runFade({
      out: deck,
      inn: null,
      target: 0,
      onDone: () => deck.pause(),
    });
  }

  function advance() {
    const tracks = tracksRef.current;
    if (!readyRef.current || tracks.length === 0 || fadingRef.current) {
      return;
    }

    const decks = decksRef.current;

    // Single-track playlists simply loop the one track.
    if (tracks.length === 1) {
      const only = decks[activeRef.current];
      only.currentTime = 0;
      void only.play();
      return;
    }

    let pos = posRef.current + 1;
    if (pos >= queueRef.current.length) {
      const last = queueRef.current[queueRef.current.length - 1];
      queueRef.current = shuffleIndices(tracks.length, last);
      pos = 0;
    }
    posRef.current = pos;

    const track = tracks[queueRef.current[pos]];
    const out = decks[activeRef.current];
    const inn = decks[activeRef.current ^ 1];
    loadTrack(inn, track);
    inn.currentTime = 0;
    inn.volume = 0;
    activeRef.current ^= 1;
    setCurrentTitle(track.title);

    const promise = inn.play();
    if (promise) {
      promise.catch(() => {});
    }
    runFade({
      out,
      inn,
      target: targetVolume(),
      onDone: () => out.pause(),
    });
  }

  function togglePlay() {
    if (isPlayingRef.current) {
      pausePlayback();
    } else {
      startPlayback();
    }
  }

  function next() {
    if (!isPlayingRef.current) {
      startPlayback();
      return;
    }
    advance();
  }

  function setVolume(value: number) {
    const clamped = clamp01(value);
    volumeRef.current = clamped;
    setVolumeState(clamped);
    writeStored(LS_VOLUME, String(clamped));
    // Apply immediately when we're not mid-fade and not muted.
    if (!fadingRef.current && !mutedRef.current) {
      const deck = decksRef.current[activeRef.current];
      if (deck) {
        deck.volume = clamped;
      }
    }
  }

  function toggleMute() {
    const nextMuted = !mutedRef.current;
    mutedRef.current = nextMuted;
    setMuted(nextMuted);
    writeStored(LS_MUTED, String(nextMuted));
    if (!fadingRef.current) {
      const deck = decksRef.current[activeRef.current];
      if (deck) {
        deck.volume = nextMuted ? 0 : volumeRef.current;
      }
    }
  }

  // Set up decks, load the playlist, wire auto-advance, and clean up on unmount.
  useEffect(() => {
    let disposed = false;
    const deckA = new Audio();
    const deckB = new Audio();
    for (const deck of [deckA, deckB]) {
      deck.preload = "auto";
      deck.volume = 0;
    }
    decksRef.current = [deckA, deckB];

    const onTimeUpdate = (event: Event) => {
      const deck = event.currentTarget as HTMLAudioElement;
      if (
        deck !== decksRef.current[activeRef.current] ||
        fadingRef.current ||
        !isPlayingRef.current
      ) {
        return;
      }
      const duration = deck.duration;
      if (
        Number.isFinite(duration) &&
        duration > FADE_TAIL_S &&
        deck.currentTime >= duration - FADE_TAIL_S
      ) {
        advance();
      }
    };

    const onEnded = (event: Event) => {
      const deck = event.currentTarget as HTMLAudioElement;
      if (deck !== decksRef.current[activeRef.current] || fadingRef.current) {
        return;
      }
      // Fallback when the timeupdate crossfade didn't fire (unknown duration).
      advance();
    };

    for (const deck of [deckA, deckB]) {
      deck.addEventListener("timeupdate", onTimeUpdate);
      deck.addEventListener("ended", onEnded);
    }

    let removeGesture: (() => void) | null = null;

    fetch(PLAYLIST_URL, { cache: "no-cache" })
      .then((response) => (response.ok ? response.json() : []))
      .then((data: LofiTrack[]) => {
        if (disposed) {
          return;
        }
        const tracks = Array.isArray(data) ? data.filter((t) => t?.src) : [];
        tracksRef.current = tracks;
        setAvailable(tracks.length > 0);
        if (tracks.length === 0) {
          return;
        }

        queueRef.current = shuffleIndices(tracks.length);
        posRef.current = 0;
        const first = tracks[queueRef.current[0]];
        loadTrack(decksRef.current[activeRef.current], first);
        decksRef.current[activeRef.current].volume = 0;
        setCurrentTitle(first.title);
        readyRef.current = true;

        // Autoplay is blocked until a gesture. If the user last left music
        // playing, resume it on their first interaction with the page.
        if (readStored(LS_PLAYING) === "true") {
          const onFirstGesture = () => {
            removeGesture?.();
            removeGesture = null;
            startPlayback();
          };
          window.addEventListener("pointerdown", onFirstGesture, { once: true });
          window.addEventListener("keydown", onFirstGesture, { once: true });
          removeGesture = () => {
            window.removeEventListener("pointerdown", onFirstGesture);
            window.removeEventListener("keydown", onFirstGesture);
          };
        }
      })
      .catch(() => {
        if (!disposed) {
          setAvailable(false);
        }
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(fadeRafRef.current);
      removeGesture?.();
      for (const deck of [deckA, deckB]) {
        deck.removeEventListener("timeupdate", onTimeUpdate);
        deck.removeEventListener("ended", onEnded);
        deck.pause();
        deck.removeAttribute("src");
        deck.load();
      }
      readyRef.current = false;
      isPlayingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<LofiPlayerContextValue>(
    () => ({
      available,
      isPlaying,
      volume,
      muted,
      currentTitle,
      togglePlay,
      next,
      setVolume,
      toggleMute,
    }),
    // Handlers are stable closures over refs; only UI state needs to refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [available, isPlaying, volume, muted, currentTitle],
  );

  return (
    <LofiPlayerContext.Provider value={value}>
      {children}
    </LofiPlayerContext.Provider>
  );
}
