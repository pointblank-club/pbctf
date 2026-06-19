import Link from "next/link";

/**
 * Minimal brand header for the auth pages (login / register). Renders the
 * PBCTF5.0 wordmark in the top-left, linking back to the landing page —
 * matching the landing/dashboard header logo. The bar itself is
 * click-through (pointer-events-none) so only the logo is interactive.
 */
export function AuthHeader() {
  return (
    <header className="pointer-events-none fixed top-0 left-0 z-30 w-full px-[clamp(1.25rem,4vw,2.5rem)] py-5">
      <Link
        href="/"
        aria-label="PBCTF 5.0 home"
        className="pointer-events-auto inline-flex items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <span className="font-body font-extrabold text-[1.5rem] leading-none tracking-[-0.02em] bg-gradient-to-br from-white to-brand bg-clip-text text-transparent">
          PBCTF5.0
        </span>
      </Link>
    </header>
  );
}

export default AuthHeader;
