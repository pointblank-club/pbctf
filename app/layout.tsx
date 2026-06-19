import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/toaster";
import { HelpButtonGate } from "@/components/ui/help-button-gate";
import { Analytics } from "@vercel/analytics/next";
import { PostHogProvider } from "@/components/providers/PostHogProvider";

export const metadata: Metadata = {
  title: {
    template: "%s | PBCTF 5.0",
    default: "PBCTF 5.0. Capture the Flag",
  },
  description:
    "PBCTF 5.0 is a Capture the Flag competition that brings together hackers, security enthusiasts, and problem solvers across web exploitation, reverse engineering, cryptography, forensics, and more. Race the clock, capture the flags, sharpen your edge.",
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#050507",
  icons: { icon: "/images/pbctf-logo.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="dark"
      style={{ background: "#050507", colorScheme: "dark" }}
    >
      <head>
        {/* Inline critical paint colors so the very first frame is already
            dark. Prevents the brief flash of white on first load (FOUC). */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html { background: #050507; color-scheme: dark; }
              body { background: #0a0a0c; color: #f5f5f7; margin: 0; }
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ background: "#0a0a0c", color: "#f5f5f7" }}>
        <PostHogProvider>
          <AuthProvider>
            {children}
            <Toaster />
            <HelpButtonGate />
          </AuthProvider>
          <Analytics />
        </PostHogProvider>
      </body>
    </html>
  );
}
