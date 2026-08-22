// Scans public/sounds/lofi for audio files and writes a playlist.json manifest.
//
// Why a generated manifest? The tracks live in `public/`, which is served as
// raw static files — a browser cannot list a directory at runtime. This script
// is the single source of truth for the playlist: it runs automatically on
// `vite dev` / `vite build` (see vite.config.ts) and can be run by hand with
// `npm run lofi:playlist`. To add a song, drop a file in the folder and rebuild.
import fs from "node:fs";
import path from "node:path";

const AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".ogg",
  ".oga",
  ".opus",
  ".wav",
  ".m4a",
  ".aac",
  ".flac",
  ".webm",
]);

/** Turn "alex-morgan-lofi-jazz-560051.mp3" into "Alex Morgan Lofi Jazz". */
function titleFromFilename(file) {
  return file
    .replace(/\.[^.]+$/, "") // drop extension
    .replace(/\s*\(\d+\)\s*$/, "") // drop a trailing " (1)" copy marker
    .replace(/[-_]+\d+$/, "") // drop the trailing "-552792" Pixabay id
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Builds the playlist manifest. Returns the array of tracks written.
 * @param {string} [rootDir] project root (defaults to the current working dir)
 */
export function generateLofiPlaylist(rootDir = process.cwd()) {
  const dir = path.resolve(rootDir, "public", "sounds", "lofi");
  const outFile = path.join(dir, "playlist.json");

  if (!fs.existsSync(dir)) {
    return [];
  }

  const hasCopyMarker = (file) => /\(\d+\)\s*\.[^.]+$/.test(file);

  const files = fs
    .readdirSync(dir)
    .filter((file) => AUDIO_EXTENSIONS.has(path.extname(file).toLowerCase()))
    // Clean filenames win over " (1)" copies during de-duplication below.
    .sort((a, b) => {
      const copyDelta = Number(hasCopyMarker(a)) - Number(hasCopyMarker(b));
      return copyDelta !== 0 ? copyDelta : a.localeCompare(b);
    });

  const seen = new Set();
  const tracks = [];

  for (const file of files) {
    const title = titleFromFilename(file);
    const id = slugify(title) || slugify(file);

    // De-duplicate identical display names (e.g. an accidental "file (1)" copy)
    // so the same song can't sit twice in the queue.
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);

    tracks.push({
      id,
      title,
      // Encode so spaces/parentheses in filenames stay URL-safe. We never expose
      // this path in the UI — only the title is shown to users.
      src: `/sounds/lofi/${encodeURIComponent(file)}`,
    });
  }

  fs.writeFileSync(outFile, `${JSON.stringify(tracks, null, 2)}\n`);
  return tracks;
}

// When run directly (`node scripts/generate-lofi-playlist.mjs`), generate + log.
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("generate-lofi-playlist.mjs")) {
  const tracks = generateLofiPlaylist();
  console.log(`[lofi] wrote playlist.json with ${tracks.length} track(s).`);
}
