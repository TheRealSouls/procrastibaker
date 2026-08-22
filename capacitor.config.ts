import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.procrastibaker.app",
  appName: "Procrastibaker",
  // Vite builds the web app into dist/; `cap sync` copies it into the native app.
  webDir: "dist",
  backgroundColor: "#fff7df",
  android: {
    backgroundColor: "#fff7df",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 700,
      backgroundColor: "#fff7df",
      showSpinner: false,
    },
    FirebaseAuthentication: {
      // The native plugin only performs the Google sign-in and hands back a
      // credential; the JS SDK (which Firestore uses) is the actual session, so
      // we skip the plugin's own native Firebase sign-in.
      skipNativeAuth: true,
      providers: ["google.com"],
    },
  },
  // For live-reload against the dev server on a device/emulator, run
  // `npm run dev -- --host` and temporarily add here (do NOT commit):
  //   server: { url: "http://<your-lan-ip>:5188", cleartext: true },
};

export default config;
