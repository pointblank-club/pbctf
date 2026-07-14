"use client";

import { useEffect } from "react";
import {
  User,
  Mail,
  MessageSquare,
  Building,
  FileText,
  Github,
  Linkedin,
  ExternalLink,
  UserPlus,
  Check,
  X,
  Award,
  Globe,
  Flag,
  ShieldCheck,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "./button";
import { AlertBanner } from "./alert-banner";

interface UserDetails {
  uid: string;
  name: string;
  email: string;
  discord_username?: string;
  organisation?: string;
  bio?: string;
  profile_picture?: string;
  resume_link?: string;
  github_link?: string;
  linkedin_link?: string;
  portfolio_link?: string;
  ctf_profile?: string;
  age?: number;
  hasSolvedChallenge?: boolean;
  twintroChallengeSolved?: boolean;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userDetails: UserDetails | null;
  isLoading: boolean;
  onInvite?: (email: string, uid: string) => void;
  isInviting?: boolean;
  isInvited?: boolean;
  canInvite?: boolean;
  showCreateTeamHint?: boolean;
  error?: string | null;
  openResumeInNewTab?: boolean;
}

function LinkRow({
  href,
  onClick,
  label,
  Icon,
}: {
  href?: string;
  onClick?: () => void;
  label: string;
  Icon: typeof Github;
}) {
  const cls =
    "group flex items-center gap-3 px-3 py-2.5 rounded-md bg-surface-inset border border-[var(--border-soft)] hover:border-brand/35 hover:bg-surface-2 transition-[background,border-color] cursor-pointer";
  const inner = (
    <>
      <span className="inline-flex w-7 h-7 items-center justify-center rounded-sm bg-surface-2 border border-[var(--border-soft)] group-hover:border-brand/40 transition-colors">
        <Icon className="w-3.5 h-3.5 text-ink-secondary group-hover:text-brand transition-colors" />
      </span>
      <span className="text-[13.5px] text-ink font-body font-medium">{label}</span>
      <ExternalLink className="w-3.5 h-3.5 text-ink-muted ml-auto group-hover:text-brand transition-colors" />
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${cls} w-full text-left`}>
        {inner}
      </button>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  );
}

export function UserProfileModal({
  isOpen,
  onClose,
  userDetails,
  isLoading,
  onInvite,
  isInviting = false,
  isInvited = false,
  canInvite = false,
  showCreateTeamHint = false,
  error,
  openResumeInNewTab = false,
}: UserProfileModalProps) {
  const handleResumeClick = async (url: string) => {
    try {
      if (openResumeInNewTab) {
        // Route to the in-app viewer wrapper so the navbar / app chrome
        // stays visible instead of dropping the user onto a raw PDF tab.
        const name = userDetails?.name || "Operator";
        const viewerUrl = `/dashboard/resume?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`;
        window.open(viewerUrl, "_blank", "noopener,noreferrer");
        return;
      }
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "resume.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (e) {
      console.error("Error downloading resume:", e);
    }
  };

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const initials =
    (userDetails?.name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";

  const hasLinks = !!(
    userDetails?.github_link ||
    userDetails?.linkedin_link ||
    userDetails?.resume_link ||
    userDetails?.portfolio_link ||
    userDetails?.ctf_profile
  );

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-6 pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-label="User Profile"
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-[6px] pointer-events-auto"
        onClick={onClose}
        aria-hidden
      />

      {/* dialog */}
      <div className="relative z-[111] pointer-events-auto w-full max-w-xl max-h-[92vh] overflow-y-auto thin-scrollbar bg-surface-2 border border-[var(--border-default)] rounded-t-xl sm:rounded-lg shadow-modal anim-fade-up">
        {/* sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-5 md:px-6 py-4 bg-surface-2/95 backdrop-blur-md">
          <div className="min-w-0 flex items-center gap-2.5">
            <span className="text-mono text-brand text-[12px] leading-none">{">"}</span>
            <h2 className="font-heading text-[16px] md:text-[18px] font-semibold text-ink truncate tracking-tight">
              Operator Profile
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex w-8 h-8 items-center justify-center rounded-md text-ink-muted hover:text-ink hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 md:px-6 py-5 md:py-6">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <p className="text-[var(--danger)] mb-1 font-medium">Failed to load profile</p>
              <p className="text-[13.5px] text-ink-secondary font-body">{error}</p>
            </div>
          ) : userDetails ? (
            <div className="flex flex-col gap-6">
              {/* Identity */}
              <div className="flex items-start gap-4">
                {userDetails.profile_picture ? (
                  <img
                    src={userDetails.profile_picture}
                    alt={userDetails.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-md object-cover border border-[var(--border-default)]"
                  />
                ) : (
                  <span className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 inline-flex items-center justify-center rounded-md bg-surface-inset border border-[var(--border-default)] font-mono text-[22px] sm:text-[26px] font-bold text-ink">
                    {initials}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-[20px] sm:text-[22px] font-semibold text-ink tracking-tight leading-tight">
                    {userDetails.name}
                  </h3>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {userDetails.email && (
                      <div className="flex items-center gap-2 text-[12.5px] text-ink-secondary font-body min-w-0">
                        <Mail className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                        <span className="truncate">{userDetails.email}</span>
                      </div>
                    )}
                    {userDetails.discord_username && (
                      <div className="flex items-center gap-2 text-[12.5px] text-ink-secondary font-body min-w-0">
                        <MessageSquare className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                        <span className="truncate">{userDetails.discord_username}</span>
                      </div>
                    )}
                    {userDetails.organisation && (
                      <div className="flex items-center gap-2 text-[12.5px] text-ink-secondary font-body min-w-0">
                        <Building className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                        <span className="truncate">{userDetails.organisation}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    {userDetails.hasSolvedChallenge ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-brand bg-brand-soft border border-brand/35 px-1.5 py-0.5 rounded">
                        <Award className="w-3 h-3" />
                        Warm-up Solved
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted bg-white/[0.04] border border-[var(--border-soft)] px-1.5 py-0.5 rounded"
                        title="Hasn't captured the warm-up flag yet"
                      >
                        <Flag className="w-3 h-3" />
                        No Warm-up Flag
                      </span>
                    )}
                    {userDetails.twintroChallengeSolved ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-brand bg-brand-soft border border-brand/35 px-1.5 py-0.5 rounded">
                        <ShieldCheck className="w-3 h-3" />
                        Twintro Solved
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted bg-white/[0.04] border border-[var(--border-soft)] px-1.5 py-0.5 rounded"
                        title="Hasn't solved the prerequisite (Twintro) challenge yet"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        No Twintro Flag
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio */}
              {userDetails.bio && (
                <div className="flex flex-col gap-2">
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-muted">
                    Bio
                  </div>
                  <p className="text-[13.5px] text-ink-secondary font-body leading-relaxed">
                    {userDetails.bio}
                  </p>
                </div>
              )}

              {/* Links */}
              {hasLinks && (
                <div className="flex flex-col gap-2.5">
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-muted">
                    Links & Profiles
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {userDetails.github_link && (
                      <LinkRow href={userDetails.github_link} label="GitHub" Icon={Github} />
                    )}
                    {userDetails.linkedin_link && (
                      <LinkRow href={userDetails.linkedin_link} label="LinkedIn" Icon={Linkedin} />
                    )}
                    {userDetails.resume_link && (
                      <LinkRow
                        onClick={() => handleResumeClick(userDetails.resume_link!)}
                        label="Resume"
                        Icon={FileText}
                      />
                    )}
                    {userDetails.portfolio_link && (
                      <LinkRow href={userDetails.portfolio_link} label="Portfolio" Icon={Globe} />
                    )}
                    {userDetails.ctf_profile && (
                      <LinkRow href={userDetails.ctf_profile} label="CTF Profile" Icon={Flag} />
                    )}
                  </div>
                </div>
              )}

              {/* Hints / actions */}
              {showCreateTeamHint && (
                <div className="pt-2">
                  <AlertBanner
                    type="info"
                    message="Want to invite members? You need to create a team first to send invitations."
                  />
                </div>
              )}

              {canInvite && userDetails.email && onInvite && (
                <div className="pt-2 flex justify-end">
                  <Button
                    variant="primary"
                    onClick={() => onInvite(userDetails.email!, userDetails.uid)}
                    disabled={isInviting || isInvited}
                  >
                    {isInviting ? (
                      <>
                        <Spinner size="sm" />
                        Sending Invite…
                      </>
                    ) : isInvited ? (
                      <>
                        <Check className="w-4 h-4" />
                        Invited
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Invite to Team
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-ink-secondary text-center py-10 font-body text-[13.5px]">
              Failed to load user details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type { UserDetails };
