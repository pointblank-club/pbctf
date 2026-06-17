import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/toaster";
import { HelpButton } from "@/components/ui/help-button";
import { Analytics } from "@vercel/analytics/next";
import { PostHogProvider } from "@/components/providers/PostHogProvider";

export const metadata: Metadata = {
  title: {
    template: "%s | PBCTF 5.0",
    default: "PBCTF 5.0",
  },
  description:
    "PBCTF 5.0 is a Capture the Flag (CTF) competition that brings together hackers, security enthusiasts, and problem-solvers to compete on challenges spanning web exploitation, reverse engineering, cryptography, forensics, and more. Teams race against the clock to capture flags, sharpening their offensive and defensive security skills in a high-energy, competitive environment.",
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#0a0a0a",
  icons: {
    icon: "/images/pbctf-logo.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" style={{ background: "#0a0a0a" }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "var(--font-body)", background: "#0a0a0a" }}>
        <PostHogProvider>
          <AuthProvider>
            {children}
            <Toaster />
            <HelpButton />
          </AuthProvider>
          <Analytics />
        </PostHogProvider>
      </body>
    </html>
  );
}
