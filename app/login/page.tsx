"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useRecaptcha } from "@/hooks/use-recaptcha";
import { FormSection } from "@/components/registration/form-section";
import { FormInput } from "@/components/registration/form-input";
import { Button } from "@/components/registration/button";
import { StickyAlert } from "@/components/registration/sticky-alert";
import { RecaptchaNotice } from "@/components/registration/recaptcha-notice";
import { DotPattern } from "@/components/registration/dot-pattern";
import { Spinner } from "@/components/ui/spinner";
import { ArrowRight, LogIn } from "lucide-react";

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const { executeRecaptcha } = useRecaptcha();
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.push("/dashboard");
  }, [isAuthenticated, isLoading, router]);

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
            <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full">
              <FormInput
                label="Email Address"
                type="email"
                placeholder="your.email@example.com"
                required
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
              />
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
          </FormSection>
        </div>
      </main>
    </div>
  );
}
