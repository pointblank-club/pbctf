import React, { useEffect, useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  detectInAppBrowser,
  escapeInAppBrowser,
  InAppBrowserInfo,
} from "@/lib/in-app-browser";

/**
 * "Continue with Google" button, themed to match the dark/terminal surface
 * styling used across the auth screens (mirrors the Button `secondary` variant).
 * lucide-react has no Google glyph, so the multi-color "G" is inlined as an SVG.
 *
 * Inside an in-app browser (WhatsApp, Instagram, ...) Google blocks OAuth with
 * "403: disallowed_useragent", so instead of firing `onClick` the button tries
 * to reopen the page in the system browser and shows manual instructions —
 * see lib/in-app-browser.ts.
 */

interface GoogleButtonProps {
  onClick: () => void;
  label?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

export function GoogleButton({
  onClick,
  label = "Continue with Google",
  loading = false,
  disabled = false,
  className = "",
}: GoogleButtonProps) {
  const isDisabled = disabled || loading;
  // Detect after mount only — the server render must match the first client
  // render, and the UA is unknown until we're in the browser.
  const [inApp, setInApp] = useState<InAppBrowserInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const info = detectInAppBrowser();
    if (info.inApp) setInApp(info);
  }, []);

  const handleEscape = () => {
    escapeInAppBrowser(window.location.href, inApp?.platform ?? "other");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable in webviews — the ⋯ menu hint in the
      // notice text remains as the last-resort path.
    }
  };

  const notice = inApp && (
    <div className="flex flex-col gap-2.5 p-3 rounded-md border border-brand/35 bg-brand/[0.04]">
      <p className="text-[12.5px] text-ink-secondary leading-[1.5]">
        Google sign-in doesn&apos;t work inside{" "}
        <span className="text-ink font-medium">
          {inApp.appName ? `${inApp.appName}'s` : "this app's"} built-in browser
        </span>
        . Open this page in{" "}
        {inApp.platform === "ios" ? "Safari" : "Chrome"} to continue, or tap the
        ⋯ menu and choose &quot;Open in browser&quot;.
      </p>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleEscape}
          className="inline-flex items-center gap-1.5 text-[12px] text-brand font-medium font-body hover:underline underline-offset-2"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open in browser
        </button>
        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-brand transition-colors font-body underline-offset-2 hover:underline"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={inApp ? handleEscape : onClick}
        disabled={isDisabled}
        className={[
          "inline-flex items-center justify-center gap-2.5 w-full h-12 px-5 rounded-md",
          "bg-surface-1 text-ink text-[14px] font-medium tracking-[0.02em]",
          "border border-[var(--border-default)]",
          "transition-[background,border-color,color,box-shadow] duration-150 ease-out",
          "hover:bg-surface-2 hover:border-[var(--border-brand)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
          "whitespace-nowrap select-none",
          isDisabled
            ? "!bg-surface-1 !text-ink-disabled !border-[var(--border-hairline)] cursor-not-allowed pointer-events-none"
            : "cursor-pointer",
          className,
        ].join(" ")}
      >
        {loading ? <Spinner size="sm" /> : <GoogleGlyph />}
        {label}
      </button>
      {notice}
    </>
  );
}
