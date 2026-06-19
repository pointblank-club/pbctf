"use client";

import { usePathname } from "next/navigation";
import { HelpButton } from "./help-button";

// Hide the floating help button on the landing page ("/"), show it elsewhere.
export function HelpButtonGate() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <HelpButton />;
}
