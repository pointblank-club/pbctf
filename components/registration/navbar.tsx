"use client";

import { usePathname } from "next/navigation";
import { LogOut, LogIn, Shield, ShieldCheck } from "lucide-react";

interface User {
  uid: string;
  name: string;
  email: string;
  role?: string;
  /** Base64 data-URI or remote URL. Shown in the avatar tile; falls back to initials. */
  profilePicture?: string;
}

interface NavBarProps {
  user?: User;
  onLogout: () => void;
  onNavigate?: (view: string) => void;
  /** Auth is still resolving. Show a skeleton avatar instead of the Login button. */
  isAuthLoading?: boolean;
}

type NavItem = {
  view: string;
  match: string;
  label: string;
  short: string;
};

const BASE_NAV: NavItem[] = [
  { view: "/dashboard",          match: "/dashboard",          label: "Dashboard", short: "Home" },
  { view: "/dashboard/team",     match: "/dashboard/team",     label: "Team",      short: "Team" },
  { view: "/dashboard/discover", match: "/dashboard/discover", label: "Discover",  short: "Discover" },
];

const ROLE_NAV: Record<string, NavItem[]> = {
  admin: [
    { view: "/dashboard/admin", match: "/dashboard/admin", label: "Admin", short: "Admin" },
  ],
  evaluator: [
    { view: "/dashboard/evaluator", match: "/dashboard/evaluator", label: "Evaluator", short: "Eval" },
  ],
};

function RoleChip({ role }: { role: string }) {
  const map: Record<string, { Icon: typeof Shield; cls: string }> = {
    admin: { Icon: ShieldCheck, cls: "text-brand border-brand/40 bg-brand-soft" },
    evaluator: { Icon: Shield, cls: "text-[var(--info)] border-[var(--info)]/35 bg-[var(--info-soft)]" },
  };
  const entry = map[role.toLowerCase()];
  if (!entry) return null;
  const { Icon, cls } = entry;
  return (
    <span
      className={[
        "hidden md:inline-flex items-center gap-1.5 px-2 h-6 rounded border",
        "font-mono text-[10px] uppercase tracking-[0.18em]",
        cls,
      ].join(" ")}
    >
      <Icon className="w-3 h-3" />
      {role}
    </span>
  );
}

/**
 * 28px identity badge. Shows the user's profile picture when present,
 * otherwise the green initials chip. Used in every avatar tile.
 */
function Avatar({ src, initials, alt }: { src?: string; initials: string; alt?: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- base64 data-URI / arbitrary remote source, not a static asset
      <img
        src={src}
        alt={alt || ""}
        className="w-7 h-7 rounded-sm object-cover bg-surface-2"
      />
    );
  }
  return (
    <span className="inline-flex w-7 h-7 items-center justify-center rounded-sm bg-brand text-brand-ink text-[11px] font-mono font-bold">
      {initials}
    </span>
  );
}

/**
 * Section link styled to mirror the landing header: uppercase mono label
 * with green [ ] brackets that animate in on hover. Active route keeps the
 * brackets lit and the label green.
 */
function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  const { label, short } = item;
  const bracket = [
    "text-brand transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
    active ? "opacity-100 translate-x-0" : "opacity-0",
  ].join(" ");
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={[
        "group relative inline-flex shrink-0 items-center gap-0.5 px-3 py-2",
        "font-body text-[13px] font-semibold uppercase tracking-[0.05em]",
        "transition-colors duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded",
        active
          ? "text-brand"
          : "text-ink-secondary hover:text-ink hover:[text-shadow:0_0_8px_rgba(255,255,255,0.3)]",
      ].join(" ")}
    >
      <span className={`${bracket} -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0`}>[</span>
      <span className="hidden lg:inline">{label}</span>
      <span className="lg:hidden">{short}</span>
      <span className={`${bracket} translate-x-1 group-hover:opacity-100 group-hover:translate-x-0`}>]</span>
    </button>
  );
}

export function NavBar({ user, onLogout, onNavigate, isAuthLoading }: NavBarProps) {
  const pathname = usePathname() || "";

  const initials =
    (user?.name || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "U";

  // Role-scoped nav. Admins and evaluators only get their own workspace;
  // they shouldn't see the participant routes (Dashboard / Team / Discover).
  const roleKey = user?.role?.toLowerCase();
  const roleNav = (roleKey && ROLE_NAV[roleKey]) || [];
  const isPrivilegedRole = roleKey === "admin" || roleKey === "evaluator";
  const nav: NavItem[] = user
    ? isPrivilegedRole
      ? roleNav
      : [...BASE_NAV, ...roleNav]
    : [];

  const isActive = (match: string) => {
    if (match === "/dashboard") return pathname === "/dashboard" || pathname === "/dashboard/";
    return pathname === match || pathname.startsWith(match + "/");
  };

  const handleNav = (view: string) => {
    if (!onNavigate) return;
    if (view === "/dashboard") onNavigate("");
    else onNavigate(view.replace("/dashboard/", ""));
  };

  // Subtle control surface shared by the avatar tile and logout button —
  // mirrors the landing header's sound-toggle/hamburger treatment.
  const control =
    "border border-white/[0.06] bg-white/[0.03] transition-[background,border-color,color,box-shadow] duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]";

  return (
    <header
      className={[
        "sticky top-0 z-50 w-full",
        "bg-[rgba(5,5,5,0.78)] backdrop-blur-[20px]",
        "border-b border-[rgba(0,255,136,0.15)]",
        "shadow-[0_10px_40px_rgba(0,0,0,0.5)]",
      ].join(" ")}
    >
      <div className="w-full px-[clamp(1.25rem,4vw,2.5rem)]">
        <div className="h-16 md:h-[70px] flex items-center">
          {/* Brand wordmark — matches the landing header logo */}
          <button
            type="button"
            onClick={() => onNavigate && onNavigate("landing")}
            className="group flex shrink-0 items-center -ml-1 px-1 py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="PBCTF 5.0 Home"
          >
            <span className="font-body font-extrabold text-[1.5rem] leading-none tracking-[-0.02em] bg-gradient-to-br from-white to-brand bg-clip-text text-transparent">
              PBCTF5.0
            </span>
          </button>

          {/* Right cluster — nav + auth flush right, mirroring the landing header */}
          <div className="ml-auto flex items-center gap-4 md:gap-6 min-w-0">
            {/* Nav. scroll horizontally on small screens */}
            {user && nav.length > 0 && (
              <nav
                aria-label="Primary"
                className="min-w-0 overflow-x-auto no-scrollbar"
              >
                <div className="flex items-center gap-1 md:gap-2 px-1">
                  {nav.map((item) => (
                    <NavLink
                      key={item.view}
                      item={item}
                      active={isActive(item.match)}
                      onClick={() => handleNav(item.view)}
                    />
                  ))}
                </div>
              </nav>
            )}

          {/* Auth zone */}
          {isAuthLoading ? (
            <div className="flex shrink-0 items-center gap-2 md:gap-3" aria-label="Loading user">
              <div className={`hidden sm:flex items-center gap-2.5 pl-1 pr-3 h-9 rounded-md ${control}`}>
                <span className="inline-flex w-7 h-7 rounded-sm bg-surface-2 animate-pulse" />
                <span className="inline-flex w-14 h-3 rounded bg-surface-2 animate-pulse" />
              </div>
              <span className={`sm:hidden inline-flex w-9 h-9 rounded-md animate-pulse ${control}`} />
            </div>
          ) : user ? (
            <div className="flex shrink-0 items-center gap-2 md:gap-3">
              {user.role && <RoleChip role={user.role} />}

              {isPrivilegedRole ? (
                // Admin / evaluator: profile page doesn't apply, so the
                // avatar tile is non-interactive and just displays identity.
                <div
                  className={`hidden sm:flex items-center gap-2.5 pl-1 pr-3 h-9 rounded-md ${control}`}
                  aria-label="Current operator"
                >
                  <Avatar src={user.profilePicture} initials={initials} alt={user.name} />
                  <span className="text-[13px] text-ink font-body font-medium leading-none max-w-[120px] truncate">
                    {user.name.split(/\s+/)[0]}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleNav("/dashboard/profile")}
                  aria-label="Open profile"
                  aria-current={isActive("/dashboard/profile") ? "page" : undefined}
                  className={[
                    "hidden sm:flex items-center gap-2.5 pl-1 pr-3 h-9 rounded-md",
                    control,
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                    isActive("/dashboard/profile")
                      ? "border-brand/45 bg-brand-soft shadow-[0_0_15px_rgba(0,255,136,0.15)]"
                      : "hover:border-brand/40 hover:bg-[rgba(0,255,136,0.08)] hover:shadow-[0_0_15px_rgba(0,255,136,0.15)]",
                  ].join(" ")}
                >
                  <Avatar src={user.profilePicture} initials={initials} alt={user.name} />
                  <span className="text-[13px] text-ink font-body font-medium leading-none max-w-[120px] truncate">
                    {user.name.split(/\s+/)[0]}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={onLogout}
                className={[
                  "inline-flex items-center gap-2 h-9 px-3 rounded-md",
                  control,
                  "text-ink-secondary hover:text-brand hover:border-brand/40 hover:bg-[rgba(0,255,136,0.08)] hover:shadow-[0_0_15px_rgba(0,255,136,0.15)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                ].join(" ")}
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline font-body text-[11px] font-semibold uppercase tracking-[0.05em]">Logout</span>
              </button>

              {isPrivilegedRole ? (
                <div
                  className={`sm:hidden inline-flex w-9 h-9 items-center justify-center rounded-md ${control}`}
                  aria-label="Current operator"
                >
                  <Avatar src={user.profilePicture} initials={initials} alt={user.name} />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleNav("/dashboard/profile")}
                  aria-label="Open profile"
                  aria-current={isActive("/dashboard/profile") ? "page" : undefined}
                  className={[
                    "sm:hidden inline-flex w-9 h-9 items-center justify-center rounded-md",
                    control,
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                    isActive("/dashboard/profile")
                      ? "border-brand/45 bg-brand-soft text-brand"
                      : "text-ink-secondary hover:border-brand/40 hover:text-brand",
                  ].join(" ")}
                >
                  <Avatar src={user.profilePicture} initials={initials} alt={user.name} />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate && onNavigate("login")}
              className={[
                "inline-flex items-center gap-2 h-9 px-4 rounded-md",
                "bg-brand text-brand-ink font-body text-[11px] font-bold uppercase tracking-[0.05em]",
                "shadow-[0_0_15px_rgba(0,255,136,0.15)] hover:shadow-[0_0_25px_rgba(0,255,136,0.35)] hover:-translate-y-px",
                "transition-[transform,box-shadow] duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
              ].join(" ")}
            >
              <LogIn className="w-4 h-4" />
              Login
            </button>
          )}
          </div>
        </div>
      </div>
    </header>
  );
}
