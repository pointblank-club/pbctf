import Link from "next/link";

/**
 * Minimal brand header for the auth pages (login / register). Renders the
 * PBCTF 5.0 logo in the top-left, linking back to the landing page —
 * matching the landing/dashboard header logo. The bar itself is
 * click-through (pointer-events-none) so only the logo is interactive.
 */
export function AuthHeader() {
  return (
    <header className="pointer-events-none absolute top-0 left-0 z-30 w-full px-[clamp(1.25rem,4vw,2.5rem)] py-5">
      <Link
        href="/"
        aria-label="PBCTF 5.0 home"
        className="group pointer-events-auto inline-flex items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark */}
        <img
          src="/pbctf/images/pbctf-logo.svg"
          alt="PBCTF 5.0"
          className="h-9 w-auto drop-shadow-[0_0_8px_rgba(0,255,136,0.4)] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
        />
      </Link>
    </header>
  );
}

export default AuthHeader;
