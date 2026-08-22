# Lo-Fi Music

Background music played by the in-app lo-fi player.

## Where the music comes from

Every track here was downloaded from [Pixabay](https://pixabay.com/music/) and is
used under the [Pixabay Content License](https://pixabay.com/service/license-summary/).
This license is royalty-free and permits commercial use; crediting the artist is
appreciated but not legally required. The credits for the current tracks live in
[`LICENSES.md`](./LICENSES.md).

## How the playlist works

The player does **not** hardcode filenames. A manifest at `playlist.json` in this
folder is generated automatically from the audio files present here by
[`scripts/generate-lofi-playlist.mjs`](../../../scripts/generate-lofi-playlist.mjs).
It regenerates on every `npm run dev` and `npm run build` (wired through a small
Vite plugin in `vite.config.ts`), and can be run on demand:

```bash
npm run lofi:playlist
```

Supported audio extensions: `.mp3`, `.ogg`, `.oga`, `.opus`, `.wav`, `.m4a`,
`.aac`, `.flac`, `.webm`. Track titles shown in the UI are derived from the
filename (the trailing Pixabay id and any `" (1)"` copy marker are stripped);
file paths are never shown to users.

## Adding new music

1. Drop the audio file into this folder (`public/sounds/lofi/`). Prefer a
   descriptive, hyphenated filename, e.g. `artist-name-track-title-123456.mp3` —
   the title is generated from it.
2. Add the track's attribution to [`LICENSES.md`](./LICENSES.md), keeping the
   Pixabay wording (`Music by <Artist> from Pixabay`).
3. Restart the dev server (or run `npm run lofi:playlist`) so `playlist.json` picks
   up the new file. On a production build it is regenerated automatically.

Only use tracks you have the right to distribute. If you add music from a source
other than Pixabay, record its license and attribution here before shipping.
