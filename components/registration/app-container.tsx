"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from '@/hooks/use-auth';
import { NavBar } from "./navbar";
import { DotPattern } from "./dot-pattern";
import { AlertBanner } from "./alert-banner";
import { StickyAlert } from "./sticky-alert";
import { RegistrationContainer } from "./registration-container";
import { DashboardContainer } from "./dashboard-container";
import { ProfileContainer } from "./profile-container";
import { TeamContainer } from "./team-container";
import { SubmissionContainer } from "./submission-container";
import { LandingContainer } from "./landing-container";
import { ProblemStatementsContainer } from "./problem-statements-container";
import { DiscoverContainer } from "./discover-container";
import { EvaluatorContainer } from "./evaluator-container";
import { AdminContainer } from "./admin-container";
import { Spinner } from "@/components/ui/spinner";

type View = "landing" | "login" | "register" | "problem-statements" | "dashboard" | "profile" | "team" | "submission" | "discover" | "evaluator" | "admin";

export function AppContainer() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [currentView, setCurrentView] = useState<View>("landing");
  const [alert, setAlert] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && user) {
      // User is authenticated, redirect to dashboard based on role
      if (user.role === 'admin') {
        router.push('/dashboard/admin');
      } else if (user.role === 'evaluator') {
        router.push('/dashboard/evaluator');
      } else {
        router.push('/dashboard');
      }
    } else if (!isAuthenticated && !user) {
      // User is not authenticated, show landing page
      setCurrentView("landing");
    }
  }, [isAuthenticated, user, isLoading, router]);

  const handleNavigate = (view: string) => {
    // Handle navigation based on view
    if (view === 'login') {
      router.push('/login');
    } else if (view === 'register') {
      router.push('/register');
    } else if (view.startsWith('team?joinCode=')) {
      // Extract join code from query string
      const joinCode = view.split('joinCode=')[1];
      router.push(`/dashboard/team?joinCode=${joinCode}`);
    } else if (view === 'dashboard' || view === 'profile' || view === 'team' || view === 'submission' || view === 'discover' || view === 'evaluator' || view === 'admin') {
      router.push(`/dashboard/${view === 'dashboard' ? '' : view}`);
    } else {
      setCurrentView(view as View);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
    setAlert({
      type: "info",
      message: "Logged out successfully",
    });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleRegistrationSuccess = () => {
    router.push('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0a]">
        <Spinner size="lg" />
      </div>
    );
  }

  // Show landing/login/register pages if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div
        className="min-h-screen w-full flex flex-col items-start relative"
        style={{
          backgroundImage: "linear-gradient(90deg, rgb(10,10,10) 0%, rgb(10,10,10) 100%)",
        }}
      >
        <NavBar 
          user={undefined} 
          onLogout={() => {}}
          onNavigate={handleNavigate}
        />

        <div className="bg-[#0a0a0a] w-full relative flex-1">
          <div
            className="flex flex-col items-center justify-center w-full min-h-screen pb-[80px] pt-[60px] px-[40px] relative"
            style={{
              backgroundImage:
                "url('data:image/svg+xml;utf8,<svg viewBox=\\'0 0 1440 652\\' xmlns=\\'http://www.w3.org/2000/svg\\' preserveAspectRatio=\\'none\\'><rect x=\\'0\\' y=\\'0\\' height=\\'100%\\' width=\\'100%\\' fill=\\'url(%23grad)\\' opacity=\\'1\\'/><defs><radialGradient id=\\'grad\\' gradientUnits=\\'userSpaceOnUse\\' cx=\\'0\\' cy=\\'0\\' r=\\'10\\' gradientTransform=\\'matrix(31.68 0 0 22.168 0 174.74)\\'><stop stop-color=\\'rgba(34,197,94,0.28)\\' offset=\\'0.10445\\'/><stop stop-color=\\'rgba(34,197,94,0)\\' offset=\\'1\\'/></radialGradient></defs></svg>')",
            }}
          >
            <div className="max-w-[1000px] w-full z-10 flex flex-col gap-[32px] items-center">
              {alert && (
                <StickyAlert
                  type={alert.type}
                  message={alert.message}
                  onClose={() => setAlert(null)}
                />
              )}

              {currentView === "landing" && (
                <LandingContainer onNavigate={handleNavigate} />
              )}

              {currentView === "problem-statements" && (
                <ProblemStatementsContainer onNavigate={handleNavigate} />
              )}
            </div>
          </div>

          <DotPattern />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col items-start relative"
      style={{
        backgroundImage: "linear-gradient(90deg, rgb(10,10,10) 0%, rgb(10,10,10) 100%)",
      }}
    >
      <NavBar 
        user={user && user.name ? { uid: user.uid, name: user.name, email: user.email, role: user.role } : undefined} 
        onLogout={handleLogout}
        onNavigate={handleNavigate}
      />

      <div className="bg-[#0a0a0a] w-full relative flex-1">
        <div
          className="flex flex-col items-center justify-center w-full min-h-screen pb-[80px] pt-[60px] px-[40px] relative"
          style={{
            backgroundImage:
              "url('data:image/svg+xml;utf8,<svg viewBox=\\'0 0 1440 652\\' xmlns=\\'http://www.w3.org/2000/svg\\' preserveAspectRatio=\\'none\\'><rect x=\\'0\\' y=\\'0\\' height=\\'100%\\' width=\\'100%\\' fill=\\'url(%23grad)\\' opacity=\\'1\\'/><defs><radialGradient id=\\'grad\\' gradientUnits=\\'userSpaceOnUse\\' cx=\\'0\\' cy=\\'0\\' r=\\'10\\' gradientTransform=\\'matrix(31.68 0 0 22.168 0 174.74)\\'><stop stop-color=\\'rgba(34,197,94,0.28)\\' offset=\\'0.10445\\'/><stop stop-color=\\'rgba(34,197,94,0)\\' offset=\\'1\\'/></radialGradient></defs></svg>')",
          }}
        >
          <div className="max-w-[1000px] w-full z-10 flex flex-col gap-[32px] items-center">
            {alert && (
              <StickyAlert
                type={alert.type}
                message={alert.message}
                onClose={() => setAlert(null)}
              />
            )}

            {/* Authenticated users are redirected to /dashboard routes */}
            {/* This section should not be reached for authenticated users */}
          </div>
        </div>

        <DotPattern />
      </div>
    </div>
  );
}

