"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useRecaptcha } from "@/hooks/use-recaptcha";
import { FormSection } from "@/components/registration/form-section";
import { FormInput } from "@/components/registration/form-input";
import { GoogleButton } from "@/components/registration/google-button";
import { Button } from "@/components/registration/button";
import { StickyAlert } from "@/components/registration/sticky-alert";
import { RecaptchaNotice } from "@/components/registration/recaptcha-notice";
import { DotPattern } from "@/components/registration/dot-pattern";
import { AuthHeader } from "@/components/registration/auth-header";
import { Spinner } from "@/components/ui/spinner";
import { ArrowRight, LogIn, Link2 } from "lucide-react";

export default function LoginPage() {
  const {
    login,
    signInWithGoogle,
    linkGoogleWithPassword,
    isAuthenticated,
    isLoading,
  } = useAuth();
  const { executeRecaptcha } = useRecaptcha();
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  // Progressive disclosure: password + submit appear once the email is focused
  // (or already carries a value).
  const [expanded, setExpanded] = useState(false);
  // "Same email already has a password" linking flow. When set, we ask for the
  // existing password to attach the Google credential to that account.
  const [linkPrompt, setLinkPrompt] = useState<
    { email: string; pendingCred: any } | null
  >(null);
  const [linkPassword, setLinkPassword] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.push("/dashboard");
  }, [isAuthenticated, isLoading, router]);

  const credentialsVisible = expanded || loginData.email.length > 0;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const recaptchaToken = await executeRecaptcha("login");
      await login(loginData.email, loginData.password, recaptchaToken);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Route a successful Google sign-in: existing profile → dashboard; brand new
  // Google user → registration wizard (they stay signed in and finish there).
  const routeAfterGoogle = (hasProfile: boolean) => {
    router.push(hasProfile ? "/dashboard" : "/register");
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const res = await signInWithGoogle();
      routeAfterGoogle(res.hasProfile);
    } catch (err: any) {
      if (err?.code === "popup_cancelled") {
        return;
      }
      if (err?.code === "link_password_required") {
        // Surface the inline password-to-link prompt.
        setLinkPrompt({ email: err.email, pendingCred: err.pendingCred });
        return;
      }
      setError(err?.message || "Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkPrompt) return;
    if (!linkPrompt.pendingCred) {
      setError("Couldn't link Google to this account. Please log in with your password.");
      setLinkPrompt(null);
      return;
    }
    setLinkLoading(true);
    setError("");
    try {
      const res = await linkGoogleWithPassword(
        linkPrompt.email,
        linkPassword,
        linkPrompt.pendingCred,
      );
      setLinkPrompt(null);
      setLinkPassword("");
      routeAfterGoogle(res.hasProfile);
    } catch (err: any) {
      setError(
        err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password"
          ? "Incorrect password. Please try again."
          : err?.message || "Couldn't link your Google account. Please try again.",
      );
    } finally {
      setLinkLoading(false);
    }
  };

  if (isLoading || isAuthenticated) {
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

      <main className="relative z-10 min-h-screen w-full flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-16">
        <div className="w-full max-w-[460px] flex flex-col gap-6 anim-fade-up">
          {error && <StickyAlert type="error" message={error} onClose={() => setError("")} />}

          {/* Brand */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="inline-flex items-center gap-2 h-7 px-3 rounded-full border border-brand/35 bg-brand-soft text-brand font-mono text-[10px] uppercase tracking-[0.22em]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand anim-pulse-soft" />
              Secure Login
            </div>
            <h1 className="font-heading text-balance text-[34px] sm:text-[42px] font-bold text-ink leading-[1.05] tracking-tight">
              Login to{" "}
              <span className="font-mono text-brand" style={{ textShadow: "0 0 24px rgba(0,255,136,0.3)" }}>
                PBCTF&nbsp;5.0
              </span>
            </h1>
            <p className="text-[14px] text-ink-secondary font-body leading-relaxed max-w-[400px]">
              Access your dashboard and manage your CTF journey.
            </p>
          </div>

          <FormSection title="Operator Login" eyebrow="step · 01">
            {linkPrompt ? (
              /* ---------- Link Google to an existing password account ---------- */
              <form onSubmit={handleLinkSubmit} className="flex flex-col gap-4 w-full">
                <div className="flex items-start gap-2.5 p-3 rounded-md border border-brand/35 bg-brand/[0.04]">
                  <Link2 className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                  <p className="text-[12.5px] text-ink-secondary leading-[1.5]">
                    <span className="text-ink font-medium">{linkPrompt.email}</span>{" "}
                    is already registered with a password. Enter it once to link
                    Google sign-in to your account.
                  </p>
                </div>
                <FormInput
                  label="Password"
                  type="password"
                  placeholder="Enter your existing password"
                  required
                  value={linkPassword}
                  onChange={(e) => setLinkPassword(e.target.value)}
                />
                <Button type="submit" variant="primary" disabled={linkLoading} className="w-full">
                  {linkLoading ? <Spinner size="sm" /> : <Link2 className="w-4 h-4" />}
                  Link &amp; sign in
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setLinkPrompt(null);
                    setLinkPassword("");
                  }}
                  className="text-[12px] text-ink-muted hover:text-brand transition-colors font-body underline-offset-2 hover:underline"
                >
                  Cancel
                </button>
              </form>
            ) : (
              /* ---------- Standard login with progressive disclosure ---------- */
              <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full">
                <GoogleButton
                  onClick={handleGoogleSignIn}
                  loading={googleLoading}
                  disabled={isSubmitting}
                />
                <div className="flex items-center gap-3 py-0.5">
                  <span className="h-px flex-1 bg-[var(--border-hairline)]" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    or
                  </span>
                  <span className="h-px flex-1 bg-[var(--border-hairline)]" />
                </div>

                <FormInput
                  label="Email Address"
                  type="email"
                  placeholder="your.email@example.com"
                  required
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  onFocus={() => setExpanded(true)}
                />

                {credentialsVisible && (
                  <div className="flex flex-col gap-4 anim-fade-up">
                    <FormInput
                      label="Password"
                      type="password"
                      placeholder="Enter your password"
                      required
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    />

                    <div className="flex justify-end -mt-1">
                      <button
                        type="button"
                        onClick={() => router.push("/forgot-password")}
                        className="text-[12px] text-ink-muted hover:text-brand transition-colors font-body underline-offset-2 hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? <Spinner size="sm" /> : <LogIn className="w-4 h-4" />}
                      Login
                      <ArrowRight className="w-4 h-4 -mr-1" />
                    </Button>
                  </div>
                )}

              <div className="flex items-center justify-center gap-2 text-center pt-1">
                <span className="text-[13px] text-ink-muted font-body">
                  Don't have an account?
                </span>
                <button
                  type="button"
                  onClick={() => router.push("/register")}
                  className="text-[13px] text-brand font-medium font-body hover:underline underline-offset-2"
                >
                  Register here
                </button>
              </div>

              <RecaptchaNotice className="pt-1" />
            </form>

            )}
          </FormSection>
        </div>
      </main>
    </div>
  );
}
