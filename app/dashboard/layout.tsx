"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { NavBar } from "@/components/registration/navbar";
import { DotPattern } from "@/components/registration/dot-pattern";
import { StickyAlert } from "@/components/registration/sticky-alert";

// Single source of truth for which roles can access which dashboard segment.
// Longest matching prefix wins. Anything not matched is treated as open to all
// signed-in users (e.g. /dashboard root, which has its own role-based redirect
// below).
type Role = "admin" | "evaluator" | "user" | "frai";

const ROUTE_POLICY: Array<{ prefix: string; roles: Role[] }> = [
  // Participant-only routes
  { prefix: "/dashboard/profile",   roles: ["user", "frai"] },
  { prefix: "/dashboard/team",      roles: ["user", "frai"] },
  { prefix: "/dashboard/discover",  roles: ["user", "frai"] },
  // Role-scoped workspaces
  { prefix: "/dashboard/admin",     roles: ["admin"] },
  { prefix: "/dashboard/evaluator", roles: ["evaluator"] },
  { prefix: "/dashboard/frai",      roles: ["frai"] },
  // Shared utility pages
  { prefix: "/dashboard/resume",    roles: ["user", "frai", "admin", "evaluator"] },
];

const ROLE_LANDING: Record<Role, string> = {
  admin: "/dashboard/admin",
  evaluator: "/dashboard/evaluator",
  frai: "/dashboard/frai",
  user: "/dashboard",
};

function policyFor(pathname: string) {
  // Pick the longest-matching prefix (so /dashboard/team/x matches /dashboard/team).
  const match = ROUTE_POLICY
    .filter((p) => pathname === p.prefix || pathname.startsWith(p.prefix + "/"))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return match;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, logout, refreshUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [alert, setAlert] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);
  const [hasRefreshed, setHasRefreshed] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user && !hasRefreshed) {
      refreshUser()
        .then(() => setHasRefreshed(true))
        .catch((error) => {
          console.error("Error refreshing user:", error);
          setHasRefreshed(true);
        });
    }
  }, [isLoading, isAuthenticated, user, hasRefreshed, refreshUser]);

  // Compute whether the current route is forbidden for this user. Used to
  // suppress the content render while the redirect below is in flight so we
  // don't leak even one frame of the disallowed page (the screenshot bug).
  const policy = useMemo(() => policyFor(pathname || ""), [pathname]);
  const role = (user?.role as Role | undefined) ?? undefined;
  const forbidden =
    !!user && !!role && !!policy && !policy.roles.includes(role);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }

    // /dashboard root: redirect privileged roles to their own workspace.
    if (pathname === "/dashboard" || pathname === "/dashboard/") {
      if (role && role !== "user") {
        router.replace(ROLE_LANDING[role]);
        return;
      }
    }

    // Forbidden-by-policy: redirect to that role's landing page.
    if (forbidden && role) {
      router.replace(ROLE_LANDING[role]);
    }
  }, [isAuthenticated, user, isLoading, router, pathname, role, forbidden]);

  const handleLogout = async () => {
    await logout();
    setAlert({ type: "info", message: "Logged out successfully" });
    setTimeout(() => setAlert(null), 3000);
  };

  // Once auth has resolved and confirmed no user, the useEffect above redirects to /login.
  // Render nothing in that brief gap to avoid flashing the dashboard shell.
  if (!isLoading && (!isAuthenticated || !user)) {
    return null;
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-void relative">
      <NavBar
        isAuthLoading={isLoading}
        user={
          user && user.name
            ? {
                uid: user.uid,
                name: user.name,
                email: user.email,
                role: user.role,
                profilePicture: user.profile_picture,
              }
            : undefined
        }
        onLogout={handleLogout}
        onNavigate={(view) => {
          if (view === "login") router.push("/login");
          else if (view === "register") router.push("/register");
          else if (view === "landing") router.push("/");
          else if (view.startsWith("team?joinCode=")) {
            const joinCode = view.split("joinCode=")[1];
            router.push(`/dashboard/team?joinCode=${joinCode}`);
          } else {
            router.push(`/dashboard/${view}`);
          }
        }}
      />

      <main className="relative flex-1 w-full">
        <DotPattern />

        <div className="relative mx-auto w-full max-w-[1100px] px-4 sm:px-6 md:px-8 py-8 sm:py-10 md:py-12">
          <div className="flex flex-col gap-6 md:gap-8">
            {alert && (
              <StickyAlert
                type={alert.type}
                message={alert.message}
                onClose={() => setAlert(null)}
              />
            )}

            {/* If the route is policy-forbidden for this user, suppress the
                page content while the layout redirect is in flight. Prevents
                the data fetch + content render of a page they shouldn't see. */}
            {forbidden ? null : children}
          </div>
        </div>
      </main>
    </div>
  );
}
