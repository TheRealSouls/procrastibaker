import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { generateLofiPlaylist } from "./scripts/generate-lofi-playlist.mjs";

// Source-map upload only runs when a build-time token is present (CI / local
// release build). Without it the app still builds — just with minified traces.
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

// Regenerate public/sounds/lofi/playlist.json on every dev-server start and
// production build so dropping a new track into the folder is all that's needed.
function lofiPlaylistPlugin(): Plugin {
  return {
    name: "lofi-playlist",
    buildStart() {
      generateLofiPlaylist();
    },
    configureServer() {
      generateLofiPlaylist();
    },
  };
}

export default defineConfig({
  plugins: [
    lofiPlaylistPlugin(),
    react(),
    ...(sentryAuthToken
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: sentryAuthToken,
            sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
          }),
        ]
      : []),
  ],
  publicDir: "public",
  build: {
    // Generate hidden maps for Sentry only when we're uploading them; otherwise
    // don't ship maps publicly.
    sourcemap: sentryAuthToken ? "hidden" : false,
  },
});
