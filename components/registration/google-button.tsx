import React from "react";
import { Spinner } from "@/components/ui/spinner";

/**
 * "Continue with Google" button, themed to match the dark/terminal surface
 * styling used across the auth screens (mirrors the Button `secondary` variant).
 * lucide-react has no Google glyph, so the multi-color "G" is inlined as an SVG.
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
  return (
    <button
      type="button"
      onClick={onClick}
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
  );
}
