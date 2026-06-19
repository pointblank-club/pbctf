"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { API_ENDPOINTS } from "@/lib/api-config";
import {
  Users,
  X,
  Check,
  Search,
  ChevronDown,
  Flag,
  ShieldAlert,
  Inbox,
  Terminal,
  ArrowRight,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { FormSection } from "./form-section";
import { FormInput } from "./form-input";
import { Button } from "./button";
import { AlertBanner } from "./alert-banner";
import { TeamOverviewCard } from "./team-overview-card";
import { TeamMembersCard } from "./team-members-card";
import { QuickActionsCard } from "./quick-actions-card";
import { DeadlineTimer } from "./deadline-timer";
import { TransferOwnershipModal } from "./transfer-ownership-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { TEAM_SIZE } from "@/lib/constants";
import { HudFrame } from "./hud-frame";

interface Team {
  teamCode: string;
  teamName: string;
  teamLead: {
    id?: string;
    name: string;
    email?: string;
    phone?: string;
    discord_username?: string;
    organisation?: string;
    resume_link?: string;
    github_link?: string;
  };
  teamMembers: Array<{
    uid: string;
    name: string;
    email?: string;
    organisation?: string;
    role: string;
    joinedAt?: Date;
  }>;
  memberCount: number;
  teamStatus: string;
  isLooking: boolean;
  isEvaluated?: boolean;
  evaluator?: {
    id: string;
    name: string;
    email: string;
  } | null;
  scores?: any;
  comments?: string;
  isShortlisted?: boolean;
  evaluations?: Array<{
    evaluatorId: string;
    name: string;
    tier: "strongly_accepted" | "accepted" | "borderline" | "rejected";
    comment: string;
    createdAt: Date | string;
  }>;
  createdAt?: Date;
}

// Operator status strip: tells the user EXACTLY what state they're in and what to do next.
function StatusStrip({
  status,
  teamName,
  pendingCount,
  onPrimary,
  primaryLabel,
  primaryIcon: PrimaryIcon,
  userName,
  profileCompleteness,
  onOpenProfile,
}: {
  status: "none" | "active" | "submitted" | "under-review" | "shortlisted" | "confirmed" | "declined";
  teamName?: string;
  pendingCount: number;
  onPrimary?: () => void;
  primaryLabel?: string;
  primaryIcon?: typeof ArrowRight;
  userName: string;
  profileCompleteness?: number;
  onOpenProfile?: () => void;
}) {
  const meta: Record<
    string,
    { label: string; tone: "danger" | "warning" | "info" | "brand"; sub: string }
  > = {
    none: {
      label: "NO TEAM",
      tone: "warning",
      sub: "Create a team to register. You can run solo or add one teammate.",
    },
    active: {
      label: "DRAFT",
      tone: "info",
      sub: `${teamName ?? "Team"} is in draft. Complete registration to submit.`,
    },
    submitted: {
      label: "SUBMITTED",
      tone: "info",
      sub: `${teamName ?? "Team"} is awaiting evaluation.`,
    },
    "under-review": {
      label: "UNDER REVIEW",
      tone: "info",
      sub: `${teamName ?? "Team"} is being evaluated.`,
    },
    shortlisted: {
      label: "SHORTLISTED",
      tone: "brand",
      sub: `${teamName ?? "Team"} cleared eval. Lock in your RSVP.`,
    },
    confirmed: {
      label: "RSVP CONFIRMED",
      tone: "brand",
      sub: `${teamName ?? "Team"} is locked in. See you on-site.`,
    },
    declined: {
      label: "RSVP DECLINED",
      tone: "danger",
      sub: `${teamName ?? "Team"} declined the slot.`,
    },
  };

  const m = meta[status];
  const toneRing =
    m.tone === "danger"
      ? "border-[var(--danger)]/40 bg-[var(--danger-soft)]"
      : m.tone === "warning"
      ? "border-[var(--warning)]/40 bg-[var(--warning-soft)]"
      : m.tone === "brand"
      ? "border-brand/40 bg-brand/10"
      : "border-[var(--info)]/40 bg-[var(--info-soft)]";
  const dotColor =
    m.tone === "danger"
      ? "bg-[var(--danger)]"
      : m.tone === "warning"
      ? "bg-[var(--warning)]"
      : m.tone === "brand"
      ? "bg-brand"
      : "bg-[var(--info)]";
  const labelColor =
    m.tone === "danger"
      ? "text-[var(--danger)]"
      : m.tone === "warning"
      ? "text-[var(--warning)]"
      : m.tone === "brand"
      ? "text-brand"
      : "text-[var(--info)]";

  return (
    <div className="relative w-full rounded-lg border border-[var(--border-soft)] card-surface">
      <HudFrame cornerSize="md" intensity="strong" />
      <div className="relative z-10 flex flex-col gap-5 p-5 sm:p-6">
        {/* top row: prompt line + profile meter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand">
            <Terminal className="w-3 h-3" />
            <span className="opacity-80">operator/{userName.split(" ")[0]?.toLowerCase()}</span>
            <span className="text-ink-disabled">$</span>
            <span className="text-ink-secondary normal-case tracking-normal font-body text-[12px]">
              session.status
            </span>
            <span className="anim-blink text-brand">_</span>
          </div>

          {typeof profileCompleteness === "number" && profileCompleteness < 100 && onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="ml-auto group inline-flex items-center gap-2 px-2 h-6 rounded border border-[var(--border-soft)] bg-surface-inset hover:border-brand/45 hover:bg-surface-2 transition-colors"
              title="Open profile"
            >
              <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-muted group-hover:text-ink">
                profile
              </span>
              <span className="relative w-14 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                <span
                  className="absolute inset-y-0 left-0 bg-brand"
                  style={{ width: `${profileCompleteness}%` }}
                />
              </span>
              <span className="font-mono text-[10px] tabular-nums text-brand">
                {profileCompleteness}%
              </span>
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="flex flex-col gap-2 min-w-0">
            <div
              className={[
                "inline-flex items-center gap-2 self-start px-2.5 h-7 rounded-md border",
                toneRing,
              ].join(" ")}
            >
              <span className={["w-1.5 h-1.5 rounded-full", dotColor, "animate-pulse"].join(" ")} />
              <span className={["font-mono text-[10.5px] uppercase tracking-[0.22em]", labelColor].join(" ")}>
                {m.label}
              </span>
              {pendingCount > 0 && (
                <>
                  <span className="text-ink-disabled font-mono text-[10px]">·</span>
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-brand">
                    {pendingCount} ping{pendingCount === 1 ? "" : "s"}
                  </span>
                </>
              )}
            </div>
            <h1 className="font-heading text-[26px] sm:text-[32px] md:text-[36px] font-bold text-ink leading-[1.05] tracking-tight">
              {m.sub}
            </h1>
          </div>
          {onPrimary && primaryLabel && (
            <div className="shrink-0">
              <Button onClick={onPrimary} variant="primary" size="md">
                {PrimaryIcon ? <PrimaryIcon className="w-4 h-4" /> : null}
                {primaryLabel}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashboardContainer() {
  const { user, firebaseUser, isLoading: authLoading, getToken, refreshUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [team, setTeam] = useState<Team | null>(null);
  const [profileCompleteness, setProfileCompleteness] = useState(0);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [rsvpStatus, setRsvpStatus] = useState<"pending" | "confirmed" | "declined">("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [alert, setAlert] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);
  const [deleteTeamDialogOpen, setDeleteTeamDialogOpen] = useState(false);
  const [leaveTeamDialogOpen, setLeaveTeamDialogOpen] = useState(false);
  const [invites, setInvites] = useState<any[]>([]);
  const [teamRequests, setTeamRequests] = useState<any[]>([]);
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [transferOwnershipDialogOpen, setTransferOwnershipDialogOpen] = useState(false);
  const [hasSolvedChallenge, setHasSolvedChallenge] = useState(false);
  const [isChallengeCardOpen, setIsChallengeCardOpen] = useState(false);
  const [dynamicFlag, setDynamicFlag] = useState("");
  const [flagInput, setFlagInput] = useState("");
  const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);
  const [flagError, setFlagError] = useState("");

  // Tracks which join-request is currently being responded to, so we can show
  // a pending state on the right button (accept or decline) for that row.
  const [respondingTo, setRespondingTo] = useState<
    { id: string; action: "accept" | "decline" } | null
  >(null);

  const handleRespondToInvite = async (requestId: string, action: "accept" | "decline") => {
    if (respondingTo) return; // already in flight
    setRespondingTo({ id: requestId, action });
    try {
      const token = await getToken();
      if (!token) return;
      const response = await fetch(API_ENDPOINTS.respondToJoinRequest(requestId), {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `Failed to ${action} invitation`);
      toast({
        title: action === "accept" ? "Invitation Accepted" : "Invitation Declined",
        description: data.message,
      });
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error responding to invitation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to respond",
      });
    } finally {
      setRespondingTo(null);
    }
  };

  // Derive hasSolvedChallenge + profileCompleteness/missingFields from the
  // auth-provider's user (which already owns the full profile globally).
  // Keeps bootstrap free of duplicate profile data while preserving the
  // dashboard's per-field completeness chip + missing-field list.
  useEffect(() => {
    if (!user) return;
    setHasSolvedChallenge(!!(user as any).hasSolvedChallenge);

    const profileFields = [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "discord_username", label: "Discord" },
      { key: "age", label: "Age" },
      { key: "organisation", label: "Organisation" },
      { key: "bio", label: "Bio" },
      { key: "profile_picture", label: "Profile Picture" },
      { key: "resume_link", label: "Resume" },
      { key: "github_link", label: "GitHub" },
      { key: "linkedin_link", label: "LinkedIn" },
      { key: "portfolio_link", label: "Portfolio" },
      { key: "ctf_profile", label: "CTF Profile" },
    ];
    let completed = 0;
    const missing: string[] = [];
    profileFields.forEach((field) => {
      const value = (user as any)[field.key];
      if (value && value !== null && value !== "") completed++;
      else missing.push(field.label);
    });
    setProfileCompleteness(Math.round((completed / profileFields.length) * 100));
    setMissingFields(missing);
  }, [user]);

  // Idempotency guard. The effect below depends on firebaseUser?.uid +
  // authLoading + router + refreshTrigger. During the auth cascade these
  // can churn (firebaseUser arrives → authLoading flips, plus any router
  // identity changes from Next's app router) and fire the effect 3–4 times
  // back-to-back. Without this guard, each fire would issue a fresh
  // /api/me/bootstrap call — observed as 4 duplicate fetches on prod.
  // The ref records the last (uid, refreshTrigger) combo we actually
  // fetched for; subsequent fires for the same combo no-op.
  const lastBootstrapKey = useRef<string>("");

  useEffect(() => {
    // We kick off /api/me/bootstrap the moment Firebase confirms a session,
    // in parallel with the auth-provider's /api/user/profile fetch — they're
    // independent, and waiting for profile to finish before starting bootstrap
    // adds an unnecessary serial RTT to the dashboard's first paint.
    if (!firebaseUser) {
      // No Firebase session. Only redirect once the auth-provider has actually
      // finished initialising — before that, firebaseUser==null just means
      // "we haven't heard back from onAuthStateChanged yet".
      if (!authLoading) router.push("/login");
      lastBootstrapKey.current = "";
      return;
    }

    const fetchKey = `${firebaseUser.uid}::${refreshTrigger}`;
    if (lastBootstrapKey.current === fetchKey) return;
    lastBootstrapKey.current = fetchKey;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const token = await getToken();
        if (!token) {
          router.push("/login");
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        // One unified call replaces the previous 5 sequential serverless
        // roundtrips (flag, profile, rsvp, invites, team, team-requests).
        // Each of those would re-verify the Firebase token and re-open a
        // Mongo connection; the bootstrap route does both once.
        const response = await fetch("/api/me/bootstrap", { headers });
        if (!response.ok) {
          console.error("bootstrap fetch failed:", response.status);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load dashboard data. Please refresh the page.",
          });
          return;
        }

        const json = await response.json();
        if (!json.success || !json.data) return;

        const {
          team: teamPayload,
          rsvp,
          invites: invitesPayload,
          teamRequests: teamRequestsPayload,
          flag,
        } = json.data;

        if (flag) setDynamicFlag(flag);

        // hasSolvedChallenge + profileCompleteness/missingFields are derived
        // from the auth-provider's user object (see the effect below). Bootstrap
        // intentionally no longer returns profile to avoid duplicating the
        // /api/user/profile fetch already done by the auth provider.

        setInvites(
          Array.isArray(invitesPayload)
            ? invitesPayload.filter(
                (r: any) => r.type === "invite" && r.status === "pending",
              )
            : [],
        );

        if (!teamPayload) {
          setTeam(null);
          setRsvpStatus("pending");
          setTeamRequests([]);
          return;
        }

        setTeam(teamPayload);

        if (rsvp?.userRSVP) {
          setRsvpStatus(rsvp.userRSVP.rsvpStatus as "confirmed" | "declined");
        } else {
          setRsvpStatus("pending");
        }

        // bootstrap already filters teamRequests to [] for non-leads, so
        // the dashboard can trust it without re-checking role here.
        setTeamRequests(
          Array.isArray(teamRequestsPayload) ? teamRequestsPayload : [],
        );
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load dashboard data. Please refresh the page.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // Key on firebaseUser?.uid (stable string available as soon as Firebase
    // confirms the session) rather than user?.uid (set later, after profile
    // fetch). This lets bootstrap run in parallel with /api/user/profile
    // instead of in series. Strict Mode / token rotations don't change uid,
    // so the effect doesn't re-fire and flash the skeleton.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser?.uid, authLoading, router, refreshTrigger]);

  const getTeamStatus = ():
    | "none"
    | "active"
    | "submitted"
    | "under-review"
    | "shortlisted"
    | "confirmed"
    | "declined" => {
    if (!team || !team.teamStatus) return "none";
    const hasAcceptedEvaluation = team.evaluations?.some(
      (evaluation: any) =>
        evaluation.tier === "accepted" || evaluation.tier === "strongly_accepted",
    );
    if (hasAcceptedEvaluation && team.teamStatus === "submitted") return "shortlisted";
    const statusMap: Record<string, any> = {
      pending: "active",
      submitted: "submitted",
      withdrawn: "none",
      shortlisted: "shortlisted",
      rsvped: "confirmed",
      rsvp_declined: "declined",
    };
    return statusMap[team.teamStatus] || "active";
  };

  const isTeamLead = (): boolean => {
    if (!team || !user) return false;
    const userMember = team.teamMembers?.find((member: any) => member.uid === user.uid);
    return userMember?.role === "Team Lead" || false;
  };

  const handleRSVP = async (status: "confirmed" | "declined") => {
    if (!user) return;
    try {
      const token = await getToken();
      if (!token) {
        toast({
          variant: "destructive",
          title: "Authentication required",
          description: "Please log in again to submit RSVP",
        });
        return;
      }
      const response = await fetch("/api/user/rsvp", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ rsvpStatus: status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to submit RSVP");
      setRsvpStatus(status);
      toast({
        title: status === "confirmed" ? "RSVP Confirmed" : "RSVP Declined",
        description:
          data.message ||
          `You have ${status === "confirmed" ? "confirmed" : "declined"} your attendance.`,
      });
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error submitting RSVP:", error);
      toast({
        variant: "destructive",
        title: "Failed to submit RSVP",
        description: error instanceof Error ? error.message : "Failed to submit RSVP",
      });
    }
  };

  const handleSubmitFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagInput.trim()) return;
    setIsSubmittingFlag(true);
    setFlagError("");
    try {
      const token = await getToken();
      if (!token) return;
      const response = await fetch("/api/user/flag", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ flag: flagInput.trim() }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setHasSolvedChallenge(true);
        setIsChallengeCardOpen(false);
        toast({
          title: "Challenge Solved!",
          description: "Congratulations! You captured the warm-up flag.",
        });
        await refreshUser();
      } else {
        setFlagError(data.message || "Incorrect flag. Try again!");
      }
    } catch (err) {
      console.error("Error submitting flag:", err);
      setFlagError("Failed to submit flag. Server error.");
    } finally {
      setIsSubmittingFlag(false);
    }
  };

  const checkDeleteTeamEligibility = () => {
    if (!team) return;
    if (team.teamMembers.length > 1) {
      toast({
        variant: "destructive",
        title: "Cannot Delete Team",
        description:
          "You must transfer ownership or remove other members before deleting the team.",
      });
      return;
    }
    setDeleteTeamDialogOpen(true);
  };

  const executeDeleteTeam = async () => {
    if (!team || !user) return;
    try {
      const token = await getToken();
      if (!token) {
        setAlert({ type: "error", message: "Authentication required" });
        return;
      }
      const response = await fetch(API_ENDPOINTS.deleteTeam, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ teamCode: team.teamCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to delete team");
      toast({ title: "Team deleted", description: "Team has been deleted successfully." });
      setDeleteTeamDialogOpen(false);
      setTeam(null);
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error("Error deleting team:", error);
      toast({
        variant: "destructive",
        title: "Failed to delete team",
        description: error instanceof Error ? error.message : "Failed to delete team",
      });
      setDeleteTeamDialogOpen(false);
    }
  };

  const handleLeaveTeam = async () => {
    if (!team || !user) return;
    try {
      const token = await getToken();
      if (!token) {
        toast({
          variant: "destructive",
          title: "Authentication required",
          description: "Please log in again to leave the team",
        });
        return;
      }
      const response = await fetch(API_ENDPOINTS.leaveTeam, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ teamCode: team.teamCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to leave team");
      toast({ title: "Left team", description: "You have successfully left the team" });
      setLeaveTeamDialogOpen(false);
      setTeam(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error leaving team:", error);
      toast({
        variant: "destructive",
        title: "Failed to leave team",
        description: error instanceof Error ? error.message : "Failed to leave team",
      });
      setLeaveTeamDialogOpen(false);
    }
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    setMemberToRemove({ id: memberId, name: memberName });
    setRemoveMemberDialogOpen(true);
  };

  const executeRemoveMember = async () => {
    if (!team || !user || !memberToRemove) return;
    try {
      const token = await getToken();
      if (!token) return;
      const response = await fetch(API_ENDPOINTS.removeMember, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          teamCode: team.teamCode,
          memberId: memberToRemove.id,
          setTheirLookingStatus: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to remove member");
      const teamResponse = await fetch(API_ENDPOINTS.getTeam(team.teamCode), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (teamResponse.ok) {
        const teamData = await teamResponse.json();
        if (teamData.success && teamData.data) setTeam(teamData.data);
      }
      setRemoveMemberDialogOpen(false);
    } catch (error) {
      console.error("Error removing member:", error);
      setAlert({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to remove member",
      });
      setTimeout(() => setAlert(null), 3000);
      setRemoveMemberDialogOpen(false);
    }
  };

  const handleTransferOwnership = async (newLeadId: string) => {
    if (!team || !user) return;
    try {
      const token = await getToken();
      if (!token) {
        setAlert({ type: "error", message: "Authentication required" });
        return;
      }
      const response = await fetch("/api/team/transfer-ownership", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ teamCode: team.teamCode, newLeadId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to transfer ownership");
      toast({
        title: "Ownership Transferred",
        description: "You have successfully transferred team ownership.",
      });
      setTransferOwnershipDialogOpen(false);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error transferring ownership:", error);
      toast({
        variant: "destructive",
        title: "Failed to transfer",
        description: error instanceof Error ? error.message : "Failed to transfer ownership",
      });
      setTransferOwnershipDialogOpen(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex flex-col gap-6 w-full">
        {/* Status strip skeleton */}
        <div className="relative w-full rounded-lg overflow-hidden border border-[var(--border-soft)] bg-surface-1/90 p-5 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="h-3 w-48 rounded bg-surface-3 animate-pulse" />
            <div className="h-7 w-28 rounded-md bg-surface-3 animate-pulse" />
            <div className="h-8 w-3/4 rounded bg-surface-3 animate-pulse" />
          </div>
        </div>
        {/* Timer + grid skeletons */}
        <div className="h-24 rounded-lg border border-[var(--border-soft)] bg-surface-1/90 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
          <div className="lg:col-span-2 flex flex-col gap-5">
            <div className="h-40 rounded-lg border border-[var(--border-soft)] bg-surface-1/90 animate-pulse" />
            <div className="h-56 rounded-lg border border-[var(--border-soft)] bg-surface-1/90 animate-pulse" />
          </div>
          <div className="flex flex-col gap-5">
            <div className="h-48 rounded-lg border border-[var(--border-soft)] bg-surface-1/90 animate-pulse" />
            <div className="h-32 rounded-lg border border-[var(--border-soft)] bg-surface-1/90 animate-pulse" />
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 py-2">
          <Spinner size="sm" />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.3em] text-brand opacity-70">
            Booting operator terminal...
          </span>
        </div>
      </div>
    );
  }

  const teamStatus = getTeamStatus();
  const pendingCount = invites.length + teamRequests.length;
  const lead = isTeamLead();

  // Pick the single most useful primary action for the status strip.
  let stripPrimaryLabel: string | undefined;
  let stripPrimaryOnClick: (() => void) | undefined;
  let stripPrimaryIcon: typeof ArrowRight | undefined;
  if (teamStatus === "none") {
    stripPrimaryLabel = "Initialize Team";
    stripPrimaryOnClick = () => router.push("/dashboard/team");
    stripPrimaryIcon = ArrowRight;
  } else if (teamStatus === "active" && lead) {
    stripPrimaryLabel = "Open Team Console";
    stripPrimaryOnClick = () => router.push("/dashboard/team");
    stripPrimaryIcon = ArrowRight;
  } else if (teamStatus === "shortlisted" && rsvpStatus === "pending") {
    stripPrimaryLabel = "Confirm RSVP";
    stripPrimaryOnClick = () => handleRSVP("confirmed");
    stripPrimaryIcon = Check;
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {alert && <AlertBanner type={alert.type} message={alert.message} />}

      {/* Challenge banner. compact, dismissible chip-style */}
      {!hasSolvedChallenge ? (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setIsChallengeCardOpen((v) => !v)}
            aria-expanded={isChallengeCardOpen}
            aria-controls="warmup-flag-panel"
            className="group text-left rounded-md border border-[var(--danger)]/35 bg-[var(--danger-soft)] hover:border-[var(--danger)]/60 transition-all p-3 md:p-3.5 flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] min-h-[44px]"
          >
            <span className="shrink-0 inline-flex w-7 h-7 items-center justify-center rounded-md bg-[var(--danger)]/15 border border-[var(--danger)]/40">
              <ShieldAlert className="w-3.5 h-3.5 text-[var(--danger)]" />
            </span>
            <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[var(--danger)]">
                WARM-UP · 001
              </span>
              <span className="text-[13px] md:text-[13.5px] text-ink font-body truncate">
                You haven&apos;t captured the warm-up flag yet. Tap to solve it.
              </span>
            </div>
            <span className="hidden sm:inline font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--danger)]/80">
              {isChallengeCardOpen ? "collapse" : "expand"}
            </span>
            <ChevronDown
              className={[
                "w-4 h-4 text-[var(--danger)] transition-transform shrink-0",
                isChallengeCardOpen ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>

          {isChallengeCardOpen && (
            <div id="warmup-flag-panel">
              <FormSection title="Acquire the Flag" eyebrow="// CTF · 001. DON'T BE A NOOB">
                <div className="flex flex-col gap-4">
                  <div className="p-4 rounded-md bg-surface-inset border border-[var(--border-soft)] space-y-3">
                    <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand">
                      <span className="text-ink-disabled">&gt;</span>
                      <span>intel.briefing</span>
                    </div>
                    <p className="text-[13.5px] leading-relaxed text-ink font-body">
                      A sensitive artifact is being disclosed somewhere within the application. The
                      leak affects only the currently authenticated user. Find the exposed artifact.
                    </p>
                    <p className="text-[13px] leading-relaxed text-brand font-body">
                      <span className="underline underline-offset-2">hint</span>. The browser
                      receives more than the interface chooses to render. Trace the flow of data.
                    </p>
                    <p className="font-mono text-[11px] text-ink-muted uppercase tracking-[0.18em]">
                      Format · pbctf{"{...}"}
                    </p>
                  </div>

                  <form onSubmit={handleSubmitFlag} className="flex flex-col sm:flex-row gap-3 sm:items-end">
                    <div className="flex-1">
                      <FormInput
                        label="Submit flag"
                        placeholder="pbctf{...}"
                        value={flagInput}
                        onChange={(e) => setFlagInput(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" variant="primary" disabled={isSubmittingFlag}>
                      {isSubmittingFlag ? <Spinner size="sm" className="mr-2" /> : <Flag className="w-4 h-4" />}
                      Acquire Flag
                    </Button>
                  </form>

                  {flagError && (
                    <p className="text-[13px] text-[var(--danger)] font-body flex items-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--danger)] animate-pulse" />
                      {flagError}
                    </p>
                  )}
                </div>
              </FormSection>
            </div>
          )}
        </div>
      ) : (
        <AlertBanner type="success" message="Warm-up flag captured." />
      )}

      {/* Status strip. replaces the old hero. THE primary above-the-fold moment. */}
      <StatusStrip
        status={teamStatus}
        teamName={team?.teamName}
        pendingCount={pendingCount}
        onPrimary={stripPrimaryOnClick}
        primaryLabel={stripPrimaryLabel}
        primaryIcon={stripPrimaryIcon}
        userName={user.name}
        profileCompleteness={profileCompleteness}
        onOpenProfile={() => router.push("/dashboard/profile")}
      />

      {/* Timer */}
      <DeadlineTimer
        teamStatus={team?.teamStatus}
        hasSubmitted={!!team}
        hasTeam={!!team}
        rsvpStatus={rsvpStatus}
        onRSVP={handleRSVP}
      />

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 flex flex-col gap-5 md:gap-6">
          {teamStatus === "none" && (
            <FormSection title="No team detected" eyebrow="// 01 · NEXT STEP. INITIALIZE">
              <div className="flex flex-col gap-5">
                <div className="p-4 rounded-md bg-surface-inset border border-[var(--border-soft)] flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand">
                    <Sparkles className="w-3 h-3" />
                    <span>operator.note</span>
                  </div>
                  <p className="text-[13.5px] leading-relaxed text-ink font-body">
                    Registering solo is fine. Just create a team of one. You can add a second
                    teammate later if you want. Teams cap at two members.
                  </p>
                </div>

                {/* Two clear paths, primary emphasized */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => router.push("/dashboard/team")}
                    className="group text-left p-4 rounded-md bg-brand/8 border border-brand/40 hover:border-brand hover:bg-brand/12 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand min-h-[44px]"
                  >
                    <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand mb-2">
                      <Users className="w-3 h-3" />
                      <span>recommended</span>
                    </div>
                    <div className="text-[15px] text-ink font-heading font-semibold mb-1">
                      Create a team
                    </div>
                    <p className="text-[12.5px] text-ink-secondary font-body">
                      Solo is fine. Add a teammate later, or stay a team of one.
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 text-brand text-[12px] font-mono uppercase tracking-[0.18em] group-hover:gap-2.5 transition-all">
                      initialize <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  <button
                    onClick={() => router.push("/dashboard/discover")}
                    className="group text-left p-4 rounded-md bg-surface-inset border border-[var(--border-soft)] hover:border-[var(--border-strong)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand min-h-[44px]"
                  >
                    <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-muted mb-2">
                      <Search className="w-3 h-3" />
                      <span>alternative</span>
                    </div>
                    <div className="text-[15px] text-ink font-heading font-semibold mb-1">
                      Discover teams
                    </div>
                    <p className="text-[12.5px] text-ink-secondary font-body">
                      Browse teams looking for a second member.
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 text-ink-secondary text-[12px] font-mono uppercase tracking-[0.18em] group-hover:gap-2.5 group-hover:text-ink transition-all">
                      browse <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                </div>
              </div>
            </FormSection>
          )}

          {team && teamStatus !== "none" && (
            <TeamOverviewCard
              team={{
                teamName: team.teamName,
                teamCode: team.teamCode,
                memberCount: team.memberCount,
                maxMembers: TEAM_SIZE,
              }}
              isLead={isTeamLead()}
              status={teamStatus}
            />
          )}

          {team && team.teamMembers && team.teamMembers.length > 0 && (
            <TeamMembersCard
              members={team.teamMembers}
              isLead={isTeamLead()}
              teamStatus={teamStatus}
              currentUserId={user.uid}
              onRemoveMember={handleRemoveMember}
              onTransferOwnership={() => setTransferOwnershipDialogOpen(true)}
            />
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5 md:gap-6">
          {team && teamStatus !== "none" && (
            <QuickActionsCard
              isLead={isTeamLead()}
              teamStatus={teamStatus}
              memberCount={team.memberCount}
              maxMembers={TEAM_SIZE}
              onNavigate={(path) => router.push(path)}
              onDeleteTeam={checkDeleteTeamEligibility}
              onLeaveTeam={() => setLeaveTeamDialogOpen(true)}
            />
          )}

          {/* Inbox. unified incoming pings (requests + invites) */}
          <FormSection
            title="Inbox"
            eyebrow={
              pendingCount > 0
                ? `// ${pendingCount} INCOMING PING${pendingCount === 1 ? "" : "S"}`
                : "// INCOMING"
            }
          >
            {pendingCount === 0 ? (
              <div className="flex flex-col items-center text-center gap-3 py-6">
                <div className="w-10 h-10 rounded-md bg-surface-inset border border-[var(--border-soft)] flex items-center justify-center">
                  <Inbox className="w-4 h-4 text-ink-muted" />
                </div>
                <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-muted">
                  no signal · all quiet
                </div>
                <p className="text-[12.5px] text-ink-subtle font-body max-w-[220px]">
                  Invites and join requests will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {teamRequests.map((request) => {
                  const responding = respondingTo?.id === request.requestId;
                  const busyAccept = responding && respondingTo?.action === "accept";
                  const busyDecline = responding && respondingTo?.action === "decline";
                  return (
                    <div
                      key={request.requestId}
                      className="p-3.5 rounded-md bg-surface-inset border border-[var(--border-soft)] hover:border-brand/30 transition-colors flex flex-col gap-3"
                    >
                      <div className="min-w-0 flex items-start gap-2.5">
                        <span className="shrink-0 mt-0.5 inline-flex w-6 h-6 items-center justify-center rounded-md bg-brand/10 border border-brand/30">
                          <UserPlus className="w-3 h-3 text-brand" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-brand mb-0.5">
                            join request
                          </div>
                          <p className="text-[13.5px] text-ink font-body">
                            <span className="font-semibold">{request.userName}</span> wants to join
                          </p>
                          <p className="text-[11.5px] text-ink-muted font-mono break-all mt-0.5">
                            {request.userEmail}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 w-full">
                        <Button
                          onClick={() => handleRespondToInvite(request.requestId, "accept")}
                          variant="primary"
                          size="sm"
                          disabled={!!respondingTo}
                          className="w-full"
                        >
                          {busyAccept ? (
                            <>
                              <Spinner size="sm" />
                              Accepting…
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Accept
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleRespondToInvite(request.requestId, "decline")}
                          variant="danger"
                          size="sm"
                          disabled={!!respondingTo}
                          className="w-full"
                        >
                          {busyDecline ? (
                            <>
                              <Spinner size="sm" />
                              Declining…
                            </>
                          ) : (
                            <>
                              <X className="w-3.5 h-3.5" />
                              Decline
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {invites.map((invite) => {
                  const responding = respondingTo?.id === invite.requestId;
                  const busyAccept = responding && respondingTo?.action === "accept";
                  const busyDecline = responding && respondingTo?.action === "decline";
                  return (
                    <div
                      key={invite.requestId}
                      className="p-3.5 rounded-md bg-surface-inset border border-[var(--border-soft)] hover:border-brand/30 transition-colors flex flex-col gap-3"
                    >
                      <div className="min-w-0 flex items-start gap-2.5">
                        <span className="shrink-0 mt-0.5 inline-flex w-6 h-6 items-center justify-center rounded-md bg-[var(--info)]/10 border border-[var(--info)]/30">
                          <Users className="w-3 h-3 text-[var(--info)]" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--info)] mb-0.5">
                            team invite
                          </div>
                          <p className="text-[13.5px] text-ink font-body">
                            Invited to{" "}
                            <span className="font-semibold">
                              {invite.teamName || invite.teamCode}
                            </span>
                          </p>
                          <p className="text-[11.5px] text-ink-muted font-mono mt-0.5">
                            code · <span className="text-brand">{invite.teamCode}</span>
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 w-full">
                        <Button
                          onClick={() => handleRespondToInvite(invite.requestId, "accept")}
                          variant="primary"
                          size="sm"
                          disabled={!!respondingTo}
                          className="w-full"
                        >
                          {busyAccept ? (
                            <>
                              <Spinner size="sm" />
                              Accepting…
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Accept
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleRespondToInvite(invite.requestId, "decline")}
                          variant="danger"
                          size="sm"
                          disabled={!!respondingTo}
                          className="w-full"
                        >
                          {busyDecline ? (
                            <>
                              <Spinner size="sm" />
                              Declining…
                            </>
                          ) : (
                            <>
                              <X className="w-3.5 h-3.5" />
                              Decline
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </FormSection>
        </div>
      </div>

      {/* Dialogs */}
      <AlertDialog open={deleteTeamDialogOpen} onOpenChange={setDeleteTeamDialogOpen}>
        <AlertDialogContent className="bg-surface-2 border-[var(--border-default)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-ink">Delete Team</AlertDialogTitle>
            <AlertDialogDescription className="text-ink-secondary font-body">
              Are you sure you want to delete the team "{team?.teamName}"? This action cannot be
              undone and all team data including members will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-surface-1 border-[var(--border-soft)] text-ink hover:bg-surface-3 hover:text-ink">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDeleteTeam}
              className="bg-[var(--danger)] hover:bg-[var(--danger)]/85 text-white border border-[var(--danger)]/60"
            >
              Delete Team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={removeMemberDialogOpen} onOpenChange={setRemoveMemberDialogOpen}>
        <AlertDialogContent className="bg-surface-2 border-[var(--border-default)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-ink">Remove Member</AlertDialogTitle>
            <AlertDialogDescription className="text-ink-secondary font-body">
              Are you sure you want to remove {memberToRemove?.name} from the team?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-surface-1 border-[var(--border-soft)] text-ink hover:bg-surface-3 hover:text-ink">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeRemoveMember}
              className="bg-[var(--danger)] hover:bg-[var(--danger)]/85 text-white border border-[var(--danger)]/60"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={leaveTeamDialogOpen} onOpenChange={setLeaveTeamDialogOpen}>
        <AlertDialogContent className="bg-surface-2 border-[var(--border-default)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-ink">Leave Team</AlertDialogTitle>
            <AlertDialogDescription className="text-ink-secondary font-body">
              Are you sure you want to leave the team "{team?.teamName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-surface-1 border-[var(--border-soft)] text-ink hover:bg-surface-3 hover:text-ink">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveTeam}
              className="bg-[var(--danger)] hover:bg-[var(--danger)]/85 text-white border border-[var(--danger)]/60"
            >
              Leave Team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {team && (
        <TransferOwnershipModal
          isOpen={transferOwnershipDialogOpen}
          onClose={() => setTransferOwnershipDialogOpen(false)}
          onConfirm={handleTransferOwnership}
          members={team.teamMembers}
          currentUserId={user.uid}
        />
      )}

      <div data-howdy={dynamicFlag} />
      {!hasSolvedChallenge && dynamicFlag && (
        <div className="text-[10px] text-white/5 select-all hover:text-white/20 transition-colors text-center mt-12 mb-6" />
      )}
    </div>
  );
}
