"use client";

import { useCallback, useEffect } from "react";

/**
 * reCAPTCHA v3 client hook.
 *
 * v3 runs entirely in the background — no checkbox, no challenge. The hook
 * loads Google's script once (lazily, shared across all callers) and exposes
 * executeRecaptcha(action) which resolves to a short-lived token the server
 * verifies via lib/recaptcha.ts.
 *
 * Returns null (rather than throwing) when the site key is unset or the script
 * fails to load, so callers can keep working in environments without keys.
 */

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
const SCRIPT_ID = "recaptcha-v3-script";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (
        siteKey: string,
        opts: { action: string },
      ) => Promise<string>;
    };
  }
}

// Module-level singleton so the <script> is injected at most once, no matter
// how many components mount the hook.
let scriptPromise: Promise<void> | null = null;

function loadRecaptchaScript(): Promise<void> {
  if (typeof window === "undefined" || !SITE_KEY) {
    return Promise.reject(new Error("recaptcha unavailable"));
  }
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Allow a later attempt to retry loading.
      scriptPromise = null;
      reject(new Error("failed to load reCAPTCHA script"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export function useRecaptcha() {
  // Preload the script on mount so the first executeRecaptcha() is fast.
  useEffect(() => {
    if (SITE_KEY) {
      loadRecaptchaScript().catch((err) =>
        console.error("[recaptcha]", err),
      );
    }
  }, []);

  const executeRecaptcha = useCallback(
    async (action: string): Promise<string | null> => {
      if (!SITE_KEY) return null;
      try {
        await loadRecaptchaScript();
        return await new Promise<string>((resolve, reject) => {
          if (!window.grecaptcha) {
            reject(new Error("grecaptcha not available"));
            return;
          }
          window.grecaptcha.ready(() => {
            window
              .grecaptcha!.execute(SITE_KEY, { action })
              .then(resolve)
              .catch(reject);
          });
        });
      } catch (err) {
        console.error("[recaptcha] execute failed:", err);
        return null;
      }
    },
    [],
  );

  return { executeRecaptcha };
}
