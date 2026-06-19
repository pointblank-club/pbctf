"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { RegistrationContainer } from "@/components/registration/registration-container";
import { DotPattern } from "@/components/registration/dot-pattern";
import { AuthHeader } from "@/components/registration/auth-header";
import { Spinner } from "@/components/ui/spinner";

export default function RegisterPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.push("/dashboard");
  }, [isAuthenticated, isLoading, router]);

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

      <main className="relative z-10 w-full min-h-screen flex flex-col items-center px-4 sm:px-6 md:px-8 pt-24 pb-10 sm:pt-28 sm:pb-14">
        <div className="w-full max-w-[1000px] flex flex-col gap-7 items-center anim-fade-up">
          <RegistrationContainer />
        </div>
      </main>
    </div>
  );
}
