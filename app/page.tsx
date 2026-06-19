"use client";

import dynamic from "next/dynamic";

// Client-only mount mirrors the original Vite app and avoids SSR with
// canvas/WebGL/face-api/sessionStorage in the landing components.
const LandingPage = dynamic(
  () => import("@/components/landing/LandingPage"),
  { ssr: false }
);

export default function Home() {
  return <LandingPage />;
}
