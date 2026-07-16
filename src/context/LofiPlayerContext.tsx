import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

// Ambient sound player with switchable "packs":
//   - lofi   → a shuffled playlist of tracks that crossfade into each other
//   - rain / forest / oven → a single seamless looping ambience
//
// Architecture: two HTMLAudioElement "decks" kept in refs (never in state). One
// deck is active; the other is used to crossfade — either to the next lo-fi
// track or when switching packs. At most two files are ever loaded, so it stays
// light and quick. React state holds only what the UI shows.

export type LofiTrack = { id: string; title: string; src: string };

export type SoundPackId = "lofi" | "rain" | "forest" | "oven";

type SoundPack = {
  id: SoundPackId;
  label: string;
  icon: string; // Font Awesome class
  kind: "playlist" | "loop";
  src?: string; // for loop packs
};

export const SOUND_PACKS: SoundPack[] = [
  { id: "lofi", label: "Lo-Fi beats", icon: "fa-solid fa-headphones", kind: "playlist" },
  { id: "rain", label: "Rain", icon: "fa-solid fa-cloud-rain", kind: "loop", src: "/sounds/rain.mp3" },
  { id: "forest", label: "Forest", icon: "fa-solid fa-tree", kind: "loop", src: "/sounds/forest.mp3" },
  { id: "oven", label: "Oven", icon: "fa-solid fa-fire", kind: "loop", src: "/sounds/oven-loop.mp3" },
];

type SoundPlayerContextValue = {
  available: boolean;
  packs: { id: SoundPackId; label: string; icon: string }[];
  pack: SoundPackId;
  label: string;
  canSkip: boolean; // Next only applies to the lo-fi playlist
  isPlaying: boolean;
  volume: number; // 0..1
  muted: boolean;
  selectPack: (id: SoundPackId) => void;
  togglePlay: () => void;
  next: () => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
};

const LofiPlayerContext = createContext<SoundPlayerContextValue | null>(null);

export function useLofiPlayer(): SoundPlayerContextValue {
  const value = useContext(LofiPlayerContext);
  if (!value) {
    throw new Error("useLofiPlayer must be used within <LofiPlayerProvider>");
  }
  return value;
}

const PLAYLIST_URL = "/sounds/lofi/playlist.json";
const FADE_MS = 1600; // crossfade / fade duration
const FADE_TAIL_S = 2.2; // begin the lo-fi crossfade this long before a track ends
const DEFAULT_VOLUME = 0.5;

const LS_VOLUME = "procrastibaker-sound-volume";
const LS_MUTED = "procrastibaker-sound-muted";
const LS_PLAYING = "procrastibaker-sound-playing";
const LS_PACK = "procrastibaker-sound-pack";

function findPack(id: SoundPackId): SoundPack {
  return SOUND_PACKS.find((pack) => pack.id === id) ?? SOUND_PACKS[0];
}

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
  if (avoidFirst != null && n > 1 && order[0] === avoidFirst) {
    [order[0], order[1]] = [order[1], order[0]];
  }
  return order;
}

function initialPack(): SoundPackId {
  const stored = readStored(LS_PACK);
  return SOUND_PACKS.some((pack) => pack.id === stored)
    ? (stored as SoundPackId)
    : "lofi";
}

export function LofiPlayerProvider({ children }: { children: ReactNode }) {
  const storedVolume = Number(readStored(LS_VOLUME));
  const startVolume =
    Number.isFinite(storedVolume) && storedVolume >= 0 && storedVolume <= 1
      ? storedVolume
      : DEFAULT_VOLUME;

  const [available, setAvailable] = useState(false);
  const [pack, setPackState] = useState<SoundPackId>(initialPack);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(startVolume);
  const [muted, setMuted] = useState(readStored(LS_MUTED) === "true");

  const decksRef = useRef<HTMLAudioElement[]>([]);
  const activeRef = useRef(0);
  const packRef = useRef<SoundPackId>(pack);
  const tracksRef = useRef<LofiTrack[]>([]);
  const queueRef = useRef<number[]>([]);
  const posRef = useRef(0);
  const fadeRafRef = useRef(0);
  const fadingRef = useRef(false);
  const readyRef = useRef(false);
  const isPlayingRef = useRef(false);
  const volumeRef = useRef(startVolume);
  const mutedRef = useRef(muted);

  function targetVolume() {
    return mutedRef.current ? 0 : volumeRef.current;
  }

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

  // Load a pack's source(s) into `deck`, leaving it paused at volume 0.
  function loadPackIntoDeck(deck: HTMLAudioElement, id: SoundPackId) {
    const target = findPack(id);
    deck.volume = 0;

    if (target.kind === "loop") {
      deck.loop = true;
      deck.src = target.src ?? "";
      deck.load();
      return true;
    }

    // Playlist (lo-fi): shuffle and load the first track.
    deck.loop = false;
    const tracks = tracksRef.current;
    if (tracks.length === 0) {
      return false;
    }
    queueRef.current = shuffleIndices(tracks.length);
    posRef.current = 0;
    deck.src = tracks[queueRef.current[0]].src;
    deck.load();
    return true;
  }

  function startPlayback() {
    const deck = decksRef.current[activeRef.current];
    if (!readyRef.current || !deck) {
      return;
    }
    if (!deck.src && !loadPackIntoDeck(deck, packRef.current)) {
      return; // e.g. lo-fi selected before the playlist finished loading
    }
    const promise = deck.play();
    if (promise) {
      promise.catch(() => {
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
    runFade({ out: deck, inn: null, target: 0, onDone: () => deck?.pause() });
  }

  // Crossfade the lo-fi playlist to its next track.
  function advance() {
    if (packRef.current !== "lofi" || fadingRef.current) {
      return;
    }
    const tracks = tracksRef.current;
    const decks = decksRef.current;
    if (tracks.length === 0) {
      return;
    }
    if (tracks.length === 1) {
      const only = decks[activeRef.current];
      only.currentTime = 0;
      void only.play();
      return;
    }

    let pos = posRef.current + 1;
    if (pos >= queueRef.current.length) {
      queueRef.current = shuffleIndices(
        tracks.length,
        queueRef.current[queueRef.current.length - 1],
      );
      pos = 0;
    }
    posRef.current = pos;

    const track = tracks[queueRef.current[pos]];
    const out = decks[activeRef.current];
    const inn = decks[activeRef.current ^ 1];
    inn.loop = false;
    inn.src = track.src;
    inn.load();
    inn.currentTime = 0;
    inn.volume = 0;
    activeRef.current ^= 1;

    const promise = inn.play();
    if (promise) {
      promise.catch(() => {});
    }
    runFade({ out, inn, target: targetVolume(), onDone: () => out.pause() });
  }

  // Crossfade from the current pack to a different one.
  function crossToPack(id: SoundPackId) {
    const decks = decksRef.current;
    const out = decks[activeRef.current];
    const inn = decks[activeRef.current ^ 1];
    packRef.current = id;
    setPackState(id);
    writeStored(LS_PACK, id);

    if (!loadPackIntoDeck(inn, id)) {
      return; // nothing to play (e.g. lo-fi playlist not ready yet)
    }
    inn.currentTime = 0;
    activeRef.current ^= 1;

    if (isPlayingRef.current) {
      const promise = inn.play();
      if (promise) {
        promise.catch(() => {});
      }
      runFade({ out, inn, target: targetVolume(), onDone: () => out.pause() });
    }
  }

  function selectPack(id: SoundPackId) {
    if (id !== packRef.current) {
      crossToPack(id);
    }
    if (!isPlayingRef.current) {
      startPlayback();
    }
  }

  function togglePlay() {
    if (isPlayingRef.current) {
      pausePlayback();
    } else {
      startPlayback();
    }
  }

  function next() {
    if (packRef.current !== "lofi") {
      return;
    }
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
        packRef.current !== "lofi" ||
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
      if (
        packRef.current !== "lofi" ||
        deck !== decksRef.current[activeRef.current] ||
        fadingRef.current
      ) {
        return;
      }
      advance();
    };

    for (const deck of [deckA, deckB]) {
      deck.addEventListener("timeupdate", onTimeUpdate);
      deck.addEventListener("ended", onEnded);
    }

    // The player is available immediately — loop packs (rain/forest/oven) are
    // bundled static files; the lo-fi playlist is fetched below.
    readyRef.current = true;
    setAvailable(true);

    // Preload the current pack into the active deck (paused, volume 0) so pressing
    // play is instant. Playback NEVER starts on its own — only an explicit play
    // press begins audio, so a stray click never triggers music.
    if (findPack(packRef.current).kind === "loop") {
      loadPackIntoDeck(decksRef.current[activeRef.current], packRef.current);
    }

    fetch(PLAYLIST_URL, { cache: "no-cache" })
      .then((response) => (response.ok ? response.json() : []))
      .then((data: LofiTrack[]) => {
        if (disposed) {
          return;
        }
        tracksRef.current = Array.isArray(data)
          ? data.filter((track) => track?.src)
          : [];
        if (packRef.current === "lofi" && tracksRef.current.length > 0) {
          loadPackIntoDeck(decksRef.current[activeRef.current], "lofi");
        }
      })
      .catch(() => {});

    return () => {
      disposed = true;
      cancelAnimationFrame(fadeRafRef.current);
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

  const value = useMemo<SoundPlayerContextValue>(
    () => ({
      available,
      packs: SOUND_PACKS.map(({ id, label, icon }) => ({ id, label, icon })),
      pack,
      label: findPack(pack).label,
      canSkip: pack === "lofi",
      isPlaying,
      volume,
      muted,
      selectPack,
      togglePlay,
      next,
      setVolume,
      toggleMute,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [available, pack, isPlaying, volume, muted],
  );

  return (
    <LofiPlayerContext.Provider value={value}>
      {children}
    </LofiPlayerContext.Provider>
  );
}
