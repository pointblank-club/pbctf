/**
 * In-app browser (webview) detection and escape.
 *
 * Google blocks OAuth inside embedded webviews with "403: disallowed_useragent"
 * (its "Use secure browsers" policy), so Google sign-in launched from the
 * WhatsApp/Instagram/Facebook in-app browser always fails. The fix is to get
 * the user into a real browser BEFORE starting OAuth:
 *
 *  1. Detect the webview from the user agent.
 *  2. Try a programmatic escape — intent:// on Android, x-safari- on iOS.
 *  3. Keep a manual fallback visible (copy link / "open in browser" menu hint),
 *     because some apps ignore the escape schemes entirely.
 *
 * See https://support.google.com/faqs/answer/12284343
 */

export interface InAppBrowserInfo {
  inApp: boolean;
  /** Human-readable host app name when it can be identified from the UA. */
  appName: string | null;
  platform: "android" | "ios" | "other";
}

const IN_APP_MARKERS: Array<[RegExp, string]> = [
  [/whatsapp/i, "WhatsApp"],
  [/instagram/i, "Instagram"],
  [/fb_iab|fban|fbav/i, "Facebook"],
  [/messenger/i, "Messenger"],
  [/linkedinapp/i, "LinkedIn"],
  [/snapchat/i, "Snapchat"],
  [/telegram/i, "Telegram"],
  [/twitter/i, "X"],
  [/line\//i, "LINE"],
];

export function detectInAppBrowser(): InAppBrowserInfo {
  if (typeof navigator === "undefined") {
    return { inApp: false, appName: null, platform: "other" };
  }
  const ua = navigator.userAgent;
  const platform = /android/i.test(ua)
    ? "android"
    : /iphone|ipad|ipod/i.test(ua)
      ? "ios"
      : "other";

  for (const [pattern, name] of IN_APP_MARKERS) {
    if (pattern.test(ua)) {
      return { inApp: true, appName: name, platform };
    }
  }

  // Generic webview signatures: Android WebView adds "; wv)" to the UA; iOS
  // webviews are AppleWebKit without the "Safari/" token that every real iOS
  // browser (Safari, CriOS, FxiOS, ...) carries.
  if (platform === "android" && /;\s?wv\)/.test(ua)) {
    return { inApp: true, appName: null, platform };
  }
  if (platform === "ios" && /applewebkit/i.test(ua) && !/safari\//i.test(ua)) {
    return { inApp: true, appName: null, platform };
  }

  return { inApp: false, appName: null, platform };
}

/**
 * Try to reopen `url` in the system browser. Not guaranteed — some host apps
 * ignore these schemes, so callers must keep a manual fallback on screen.
 */
export function escapeInAppBrowser(
  url: string,
  platform: InAppBrowserInfo["platform"],
): void {
  const target = new URL(url);
  const rest = `${target.host}${target.pathname}${target.search}`;
  if (platform === "android") {
    // scheme=https (no package pin) opens the user's default browser.
    window.location.href = `intent://${rest}#Intent;scheme=https;end`;
  } else if (platform === "ios") {
    window.location.href = `x-safari-https://${rest}`;
  } else {
    window.open(url, "_blank", "noopener");
  }
}
