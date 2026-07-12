import { Capacitor } from "@capacitor/core";

/** True when running inside the native Capacitor shell (Android/iOS). */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Native-only startup: tint the status bar to match the bakery theme and dismiss
 * the splash screen once the web app has booted. Plugins are imported lazily and
 * guarded so the web build is completely unaffected.
 */
export async function initNativeShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    // Dark icons/text over the light honey bar.
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#ffd76a" });
  } catch {
    // StatusBar isn't available on this platform — ignore.
  }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    // SplashScreen isn't available — ignore.
  }
}
