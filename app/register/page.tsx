"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { RegistrationContainer } from "@/components/registration/registration-container";
import { DotPattern } from "@/components/registration/dot-pattern";
import { AuthHeader } from "@/components/registration/auth-header";
import { Spinner } from "@/components/ui/spinner";

export default function RegisterPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [isRegistrationClosed, setIsRegistrationClosed] = useState(false);
  const [isDeadlineLoading, setIsDeadlineLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.push("/dashboard");
  }, [isAuthenticated, isLoading, router]);

  // Server-authoritative deadline check. If the fetch fails we fail open and
  // show the form — the register API rejects late submissions regardless.
  useEffect(() => {
    const fetchDeadline = async () => {
      try {
        const response = await fetch("/pbctf/api/config/deadline");
        const data = await response.json();
        if (data.success && data.data) {
          setDeadline(new Date(data.data.deadline));
          setIsRegistrationClosed(Boolean(data.data.isExpired));
        }
      } catch (e) {
        console.error("Failed to fetch deadline:", e);
      } finally {
        setIsDeadlineLoading(false);
      }
    };
    fetchDeadline();
  }, []);

  if (isLoading || isAuthenticated || isDeadlineLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-void">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-void relative overflow-hidden">
      <DotPattern />
      <AuthHeader />

      <main
        className={`relative z-10 w-full min-h-screen flex flex-col items-center px-4 sm:px-6 md:px-8 ${
          isRegistrationClosed
            ? "justify-center py-24"
            : "pt-24 pb-10 sm:pt-28 sm:pb-14"
        }`}
      >
        <div className="w-full max-w-[1000px] flex flex-col gap-7 items-center anim-fade-up">
          {isRegistrationClosed ? (
            <div className="flex flex-col gap-6 w-full max-w-[760px] mx-auto">
              <header className="relative overflow-hidden rounded-lg border border-[var(--border-soft)] bg-surface-1/60 backdrop-blur-[6px]">
                <div className="relative z-10 flex flex-col gap-4 p-5 sm:p-7">
                  <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand">
                    <span className="inline-flex w-1.5 h-1.5 rounded-full bg-brand shadow-glow-sm" />
                    <span>&gt;</span>
                    <span>operator_intake // pbctf 5.0</span>
                    <span className="anim-blink">_</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h1 className="font-heading text-[28px] sm:text-[34px] md:text-[40px] font-semibold text-ink tracking-tight leading-[1.05]">
                      Registration closed
                    </h1>
                    <p className="text-[14px] sm:text-[15px] text-ink-secondary leading-[1.55] max-w-[58ch]">
                      The registration deadline
                      {deadline
                        ? ` (${deadline.toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: "Asia/Kolkata",
                          })} IST)`
                        : ""}{" "}
                      has passed and new registrations are no longer accepted.
                      If you already have an account, you can still log in.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-signal-danger/35 bg-signal-danger/5">
                      <span className="inline-flex w-1.5 h-1.5 rounded-full bg-signal-danger" />
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-signal-danger">
                        intake closed
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push("/login")}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[var(--border-soft)] hover:border-brand/45 text-ink-secondary hover:text-brand transition-colors font-mono text-[10.5px] uppercase tracking-[0.22em]"
                    >
                      <LogIn className="w-3 h-3" />
                      already an operator? authenticate
                    </button>
                  </div>
                </div>
              </header>
            </div>
          ) : (
            <RegistrationContainer />
          )}
        </div>
      </main>
    </div>
  );
}
