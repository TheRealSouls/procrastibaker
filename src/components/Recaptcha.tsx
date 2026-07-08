import { useEffect, useRef } from "react";
import { RECAPTCHA_SITE_KEY, isRecaptchaConfigured } from "../config/recaptcha";

type GrecaptchaRenderParams = {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

type Grecaptcha = {
  ready?: (cb: () => void) => void;
  render: (container: HTMLElement, params: GrecaptchaRenderParams) => number;
  reset: (widgetId?: number) => void;
};

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

const SCRIPT_SRC = "https://www.google.com/recaptcha/api.js?render=explicit";

let loadPromise: Promise<void> | null = null;

function loadRecaptchaScript(): Promise<void> {
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    if (window.grecaptcha?.render) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    const script = existing ?? document.createElement("script");

    const handleLoad = () => {
      if (window.grecaptcha?.ready) {
        window.grecaptcha.ready(() => resolve());
      } else {
        resolve();
      }
    };

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", () =>
      reject(new Error("Failed to load reCAPTCHA")),
    );

    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    } else if (window.grecaptcha?.render) {
      handleLoad();
    }
  });

  return loadPromise;
}

type RecaptchaProps = {
  /** Fires the token when solved, or null when it expires / errors. */
  onChange: (token: string | null) => void;
  /** Change this value to force the challenge to reset (e.g. after submit). */
  resetSignal?: number;
  className?: string;
};

/**
 * Google reCAPTCHA v2 ("I'm not a robot") checkbox, rendered explicitly so it
 * works inside the SPA. If no site key is configured the component renders
 * nothing and immediately reports "verified" (fail-open) so a missing key can
 * never permanently block sign-in or feedback.
 */
export function Recaptcha({ onChange, resetSignal, className }: RecaptchaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!isRecaptchaConfigured) {
      onChangeRef.current("recaptcha-disabled");
      return;
    }

    let cancelled = false;

    loadRecaptchaScript()
      .then(() => {
        const container = containerRef.current;

        if (
          cancelled ||
          !container ||
          !window.grecaptcha ||
          widgetIdRef.current !== null ||
          container.childElementCount > 0
        ) {
          return;
        }

        widgetIdRef.current = window.grecaptcha.render(container, {
          sitekey: RECAPTCHA_SITE_KEY,
          callback: (token: string) => onChangeRef.current(token),
          "expired-callback": () => onChangeRef.current(null),
          "error-callback": () => onChangeRef.current(null),
        });
      })
      .catch((error) => {
        console.error("reCAPTCHA failed to load", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (resetSignal === undefined || widgetIdRef.current === null) {
      return;
    }

    window.grecaptcha?.reset(widgetIdRef.current);
    onChangeRef.current(null);
  }, [resetSignal]);

  if (!isRecaptchaConfigured) {
    return null;
  }

  return <div className={className} ref={containerRef} />;
}
