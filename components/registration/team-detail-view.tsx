"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/registration/button";
import {
    ChevronLeft,
    ThumbsUp,
    ThumbsDown,
    MessageSquare,
    User,
    Shield,
    Vote,
    Github,
    Linkedin,
    Flag,
    ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { API_ENDPOINTS } from "@/lib/api-config";
import { StickyAlert } from "@/components/registration/sticky-alert";
import { Spinner } from "@/components/ui/spinner";
import { FormSection } from "@/components/registration/form-section";
import { UserProfileModal, UserDetails } from "./user-profile-modal";

interface TeamDetailViewProps {
    team: any;
    onBack: () => void;
    onEvaluationSuccess: (teamCode: string, evaluation: any) => void;
    onVoteSuccess: (teamCode: string, vote: any) => void;
}

const TIER_OPTIONS = [
    {
        value: "strongly_accepted",
        label: "Strongly accept",
        hint: "Top-tier work",
        activeCls: "border-brand/55 text-brand bg-brand-soft",
    },
    {
        value: "accepted",
        label: "Accept",
        hint: "Solid submission",
        activeCls: "border-emerald-500/55 text-emerald-300 bg-emerald-500/10",
    },
    {
        value: "borderline",
        label: "Borderline",
        hint: "Mixed signals",
        activeCls: "border-[var(--warning)]/55 text-[var(--warning)] bg-[var(--warning-soft)]",
    },
    {
        value: "rejected",
        label: "Reject",
        hint: "Below the bar",
        activeCls: "border-[var(--danger)]/55 text-[var(--danger)] bg-[var(--danger-soft)]",
    },
];

export function TeamDetailView({ team, onBack, onEvaluationSuccess, onVoteSuccess }: TeamDetailViewProps) {
    const { getToken } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tier, setTier] = useState<string>(team.myEvaluation?.tier || "");
    const [comment, setComment] = useState<string>(team.myEvaluation?.comment || "");

    // Voting state
    const [voteComment, setVoteComment] = useState<string>(team.myVote?.comment || "");
    const [localVote, setLocalVote] = useState<any>(team.myVote || null); // Optimistic UI state

    const [error, setError] = useState<string | null>(null);

    // Profile Modal State
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);

    const isAssigned = team.isAssigned;

    // Sync local state when prop changes (e.g. after refresh)
    useEffect(() => {
        setLocalVote(team.myVote || null);
        setVoteComment(team.myVote?.comment || "");
    }, [team.myVote]);

    const handleMemberClick = async (uid: string) => {
        setIsLoadingProfile(true);
        setIsProfileOpen(true);
        setSelectedUser(null); // Reset
        try {
            const token = await getToken();
            const response = await fetch(`${API_ENDPOINTS.users}/${uid}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok && data.user) {
                setSelectedUser(data.user);
            } else {
                setError("Failed to load user profile");
            }
        } catch (err) {
            console.error(err);
            setError("Network error loading profile");
        } finally {
            setIsLoadingProfile(false);
        }
    };

    const handleEvaluationSubmit = async () => {
        if (!tier) {
            setError("Please select a tier.");
            return;
        }
        setIsSubmitting(true);
        setError(null);

        try {
            const token = await getToken();
            const response = await fetch(API_ENDPOINTS.evaluatorEvaluate, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    teamCode: team.teamCode,
                    tier,
                    comment,
                }),
            });

            const data = await response.json();
            if (response.ok) {
                onEvaluationSuccess(team.teamCode, data.data.evaluation);
            } else {
                setError(data.message || "Failed to submit evaluation.");
            }
        } catch (err) {
            setError("Network error.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Optimistic UI for Counts
    const { displayUpvotes, displayDownvotes } = useMemo(() => {
        let u = team.upvoteCount || 0;
        let d = team.downvoteCount || 0;

        // Subtract original vote if it existed
        if (team.myVote?.vote === "up") u--;
        if (team.myVote?.vote === "down") d--;

        // Add current local vote
        if (localVote?.vote === "up") u++;
        if (localVote?.vote === "down") d++;

        return { displayUpvotes: Math.max(0, u), displayDownvotes: Math.max(0, d) };
    }, [team.upvoteCount, team.downvoteCount, team.myVote, localVote?.vote]);

    const handleVoteSubmit = async (voteType: "up" | "down", isCommentUpdate = false) => {
        // Optimistic Update
        const previousVote = localVote;
        let newVoteState = null;

        if (isCommentUpdate) {
            newVoteState = { ...previousVote, comment: voteComment };
        } else {
            // Toggling or Switching
            if (previousVote && previousVote.vote === voteType) {
                newVoteState = null;
            } else {
                // Switching or New Vote
                newVoteState = { vote: voteType, comment: voteComment || "" };
            }
        }

        setLocalVote(newVoteState);
        setIsSubmitting(true);
        setError(null);

        try {
            const token = await getToken();
            const response = await fetch(API_ENDPOINTS.evaluatorVote, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    teamCode: team.teamCode,
                    vote: voteType,
                    comment: voteComment,
                    skipToggle: isCommentUpdate,
                }),
            });

            const data = await response.json();
            if (response.ok) {
                onVoteSuccess(team.teamCode, data.data.vote);
            } else {
                // Revert on failure
                setLocalVote(previousVote);
                setError(data.message || "Failed to submit vote.");
            }
        } catch (err) {
            setLocalVote(previousVote);
            setError("Network error.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const hasEvaluation = !!team.myEvaluation?.tier;
    const totalEvaluations = team.evaluations?.length || 0;
    const totalVoteComments = (team.votes || []).filter((v: any) => v.comment).length;

    return (
        <div className="flex flex-col gap-6 h-full">
            <UserProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                userDetails={selectedUser}
                isLoading={isLoadingProfile}
                openResumeInNewTab
            />

            {/* Header bar */}
            <div className="flex flex-col gap-3">
                <Button variant="secondary" onClick={onBack} size="sm">
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Back to console
                </Button>
                <div className="flex flex-col gap-1.5">
                    <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand opacity-80">
                        {isAssigned ? "// OFFICIAL_REVIEW" : "// COMMUNITY_REVIEW"} &middot; {team.teamCode}
                    </div>
                    <h1 className="font-heading text-[28px] sm:text-[32px] font-bold text-ink tracking-tight leading-[1.05]">
                        {team.teamName}
                    </h1>
                </div>
            </div>

            {error && <StickyAlert type="error" message={error} onClose={() => setError(null)} />}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Voting / Evaluation */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <FormSection
                        title={isAssigned ? "Official evaluation" : "Cast community vote"}
                        eyebrow={isAssigned ? "// VERDICT" : "// SIGNAL"}
                        status={
                            isAssigned ? (
                                <span
                                    className={[
                                        "inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] px-2 py-1 rounded-sm border",
                                        hasEvaluation
                                            ? "bg-brand-soft border-brand/45 text-brand"
                                            : "bg-[var(--warning-soft)] border-[var(--warning)]/40 text-[var(--warning)]",
                                    ].join(" ")}
                                >
                                    <Shield className="w-3 h-3" />
                                    {hasEvaluation ? "logged" : "pending"}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] px-2 py-1 rounded-sm border bg-surface-2 border-[var(--border-soft)] text-ink-muted">
                                    <Vote className="w-3 h-3" />
                                    {localVote ? `voted ${localVote.vote}` : "no vote"}
                                </span>
                            )
                        }
                    >
                        <div className="flex flex-col gap-6">
                            {isAssigned ? (
                                <>
                                    <div className="flex flex-col gap-2.5">
                                        <label className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-brand">
                                            &gt; decision_tier
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {TIER_OPTIONS.map((option) => {
                                                const isActive = tier === option.value;
                                                return (
                                                    <button
                                                        key={option.value}
                                                        onClick={() => setTier(option.value)}
                                                        className={[
                                                            "px-3 py-3 rounded-md border text-left transition-all flex flex-col gap-0.5",
                                                            isActive
                                                                ? `${option.activeCls} shadow-glow-sm`
                                                                : "border-[var(--border-soft)] text-ink-secondary hover:border-[var(--border-default)] hover:bg-surface-2",
                                                        ].join(" ")}
                                                    >
                                                        <span className="text-[13px] font-medium">{option.label}</span>
                                                        <span className="font-mono text-[10.5px] opacity-70">
                                                            &gt; {option.hint}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-brand">
                                            &gt; reviewer_notes
                                        </label>
                                        <textarea
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            placeholder="Why this tier? Strengths, weaknesses, risk flags..."
                                            className="w-full h-32 bg-surface-inset border border-[var(--border-soft)] rounded-md p-3 text-ink placeholder:text-ink-disabled resize-none focus:outline-none focus:border-brand focus:shadow-[0_0_16px_rgba(0,255,136,0.35)] transition-all duration-200 font-mono text-[13px]"
                                        />
                                        <span className="font-mono text-[10.5px] text-ink-muted">
                                            &gt; visible only to the review panel
                                        </span>
                                    </div>
                                    <Button
                                        variant="primary"
                                        onClick={handleEvaluationSubmit}
                                        disabled={isSubmitting || !tier}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Spinner size="sm" className="mr-2" />
                                                Logging verdict...
                                            </>
                                        ) : hasEvaluation ? (
                                            "Update verdict"
                                        ) : (
                                            "Log verdict"
                                        )}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="flex gap-2 sm:gap-3">
                                        <button
                                            onClick={() => handleVoteSubmit("up")}
                                            disabled={isSubmitting}
                                            className={[
                                                "flex-1 flex items-center justify-center gap-2 py-4 rounded-md border transition-all",
                                                localVote?.vote === "up"
                                                    ? "bg-brand-soft border-brand text-brand shadow-glow-sm"
                                                    : "bg-surface-2 border-[var(--border-soft)] text-ink-muted hover:bg-brand-soft hover:text-brand hover:border-brand/40",
                                            ].join(" ")}
                                        >
                                            <ThumbsUp className="w-5 h-5" />
                                            <span className="font-mono text-[12px] uppercase tracking-[0.16em]">
                                                Upvote
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => handleVoteSubmit("down")}
                                            disabled={isSubmitting}
                                            className={[
                                                "flex-1 flex items-center justify-center gap-2 py-4 rounded-md border transition-all",
                                                localVote?.vote === "down"
                                                    ? "bg-[var(--danger-soft)] border-[var(--danger)] text-[var(--danger)]"
                                                    : "bg-surface-2 border-[var(--border-soft)] text-ink-muted hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] hover:border-[var(--danger)]/40",
                                            ].join(" ")}
                                        >
                                            <ThumbsDown className="w-5 h-5" />
                                            <span className="font-mono text-[12px] uppercase tracking-[0.16em]">
                                                Downvote
                                            </span>
                                        </button>
                                    </div>

                                    {/* Tally */}
                                    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-surface-2 border border-[var(--border-soft)]">
                                        <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-muted">
                                            &gt; live tally
                                        </span>
                                        <div className="flex items-center gap-3 select-none">
                                            <div className="flex items-center gap-1.5 text-[12px] text-brand font-medium font-mono">
                                                <ThumbsUp className="w-3.5 h-3.5" />
                                                {displayUpvotes}
                                            </div>
                                            <div className="w-px h-3 bg-[var(--border-soft)]" />
                                            <div className="flex items-center gap-1.5 text-[12px] text-[var(--danger)] font-medium font-mono">
                                                <ThumbsDown className="w-3.5 h-3.5" />
                                                {displayDownvotes}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Comment block */}
                                    <div className="flex flex-col gap-2 pt-3">
                                        <label className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-brand flex items-center gap-1.5">
                                            <MessageSquare className="w-3 h-3" />
                                            &gt; optional_comment
                                        </label>
                                        <div className="relative">
                                            <textarea
                                                value={voteComment}
                                                onChange={(e) => setVoteComment(e.target.value)}
                                                placeholder="Share what you saw, what worked, what didn't..."
                                                className="w-full h-24 bg-surface-inset border border-[var(--border-soft)] rounded-md p-3 text-ink placeholder:text-ink-disabled resize-none focus:outline-none focus:border-brand focus:shadow-[0_0_16px_rgba(0,255,136,0.35)] transition-all duration-200 font-mono text-[13px]"
                                                disabled={!localVote}
                                            />
                                            {!localVote && (
                                                <div className="absolute inset-0 bg-void/60 backdrop-blur-[1px] rounded-md flex items-center justify-center border border-[var(--border-soft)]">
                                                    <p className="font-mono text-[11px] text-ink-muted flex items-center gap-2">
                                                        <ThumbsUp className="w-3 h-3" /> cast a vote to comment
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-end">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleVoteSubmit(localVote?.vote as "up" | "down", true)}
                                                disabled={
                                                    isSubmitting ||
                                                    !localVote ||
                                                    !voteComment.trim() ||
                                                    voteComment === localVote?.comment
                                                }
                                            >
                                                {isSubmitting ? <Spinner size="sm" /> : "Post comment"}
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </FormSection>
                </div>

                {/* Right Column: Team Members*/}
                <div className="flex flex-col h-full min-h-[350px]">
                    <FormSection
                        title="Operators"
                        eyebrow="// ROSTER"
                        className="h-full"
                    >
                        <div className="flex flex-col h-full gap-3 flex-1 justify-stretch pb-2">
                            {/* Render Actual Members */}
                            {team.teamMembers?.map((member: any) => (
                                <div
                                    key={member.uid}
                                    onClick={() => handleMemberClick(member.uid)}
                                    className="w-full flex flex-col gap-2.5 p-3 bg-surface-2 border border-[var(--border-soft)] rounded-md hover:border-brand/40 hover:bg-surface-1 cursor-pointer transition-all duration-200 group"
                                >
                                    {/* Row 1: identity gets the full card width minus the role chip */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-full bg-surface-inset flex items-center justify-center border border-brand/30 group-hover:border-brand/60 transition-colors flex-shrink-0">
                                            <span className="text-[13px] font-semibold text-brand">
                                                {member.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span
                                                className="text-[13px] font-medium text-ink group-hover:text-brand transition-colors truncate"
                                                title={member.name}
                                            >
                                                {member.name}
                                            </span>
                                            <span
                                                className="text-[11.5px] text-ink-muted truncate"
                                                title={member.organisation || undefined}
                                            >
                                                {member.organisation || "-"}
                                            </span>
                                        </div>
                                        <span
                                            className={[
                                                "shrink-0 font-mono text-[9.5px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-sm border",
                                                member.role === "Team Lead"
                                                    ? "bg-brand-soft text-brand border-brand/45"
                                                    : "bg-surface-1 text-ink-secondary border-[var(--border-soft)]",
                                            ].join(" ")}
                                        >
                                            {member.role === "Team Lead" ? "lead" : "member"}
                                        </span>
                                    </div>

                                    {/* Row 2: status + socials, indented under the name so the
                                        eye still tracks down the same column */}
                                    <div className="flex items-center justify-between gap-2 pl-12">
                                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                            <span
                                                className={[
                                                    "inline-flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-sm border shrink-0",
                                                    member.hasSolvedChallenge
                                                        ? "bg-brand-soft text-brand border-brand/45"
                                                        : "bg-white/[0.03] text-ink-muted border-[var(--border-soft)]",
                                                ].join(" ")}
                                                title={
                                                    member.hasSolvedChallenge
                                                        ? "Captured the warm-up flag"
                                                        : "Hasn't captured the warm-up flag"
                                                }
                                            >
                                                <Flag className="w-2.5 h-2.5" />
                                                {member.hasSolvedChallenge ? "warm-up ✓" : "no warm-up"}
                                            </span>

                                            <span
                                                className={[
                                                    "inline-flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-sm border shrink-0",
                                                    member.twintroChallengeSolved
                                                        ? "bg-brand-soft text-brand border-brand/45"
                                                        : "bg-white/[0.03] text-ink-muted border-[var(--border-soft)]",
                                                ].join(" ")}
                                                title={
                                                    member.twintroChallengeSolved
                                                        ? "Solved the Twintro challenge"
                                                        : "Hasn't solved the Twintro challenge"
                                                }
                                            >
                                                <ShieldCheck className="w-2.5 h-2.5" />
                                                {member.twintroChallengeSolved ? "twintro ✓" : "no twintro"}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2.5 z-10 shrink-0">
                                            {member.github_link && (
                                                <a
                                                    href={member.github_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-ink-muted hover:text-brand transition-colors"
                                                    aria-label="GitHub profile"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Github className="w-3.5 h-3.5" />
                                                </a>
                                            )}

                                            {member.linkedin_link && (
                                                <a
                                                    href={member.linkedin_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-ink-muted hover:text-brand transition-colors"
                                                    aria-label="LinkedIn profile"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Linkedin className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Render Empty Slots */}
                            {Array.from({ length: Math.max(0, 2 - (team.teamMembers?.length || 0)) }).map(
                                (_, i) => (
                                    <div
                                        key={`empty-${i}`}
                                        className="flex-1 min-h-[72px] w-full flex items-center gap-3 p-3 border border-dashed border-[var(--border-soft)] rounded-md bg-surface-1/40 select-none"
                                    >
                                        <div className="w-9 h-9 rounded-full border border-dashed border-[var(--border-soft)] flex items-center justify-center shrink-0">
                                            <User className="w-4 h-4 text-ink-disabled" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[13px] text-ink-subtle">Open slot</span>
                                            <span className="font-mono text-[10.5px] text-ink-muted">
                                                &gt; unfilled
                                            </span>
                                        </div>
                                    </div>
                                ),
                            )}
                        </div>
                    </FormSection>
                </div>
            </div>

            {/* Community Activity Feed */}
            <FormSection
                title="Review feed"
                eyebrow="// COMMUNITY_LOG"
                status={
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-muted">
                        {totalEvaluations + totalVoteComments} entries
                    </span>
                }
            >
                {!team.evaluations?.length && !totalVoteComments ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                        <MessageSquare className="w-6 h-6 text-ink-muted" />
                        <p className="text-[13px] text-ink-secondary">No reviews logged yet</p>
                        <p className="font-mono text-[10.5px] text-ink-muted">
                            &gt; be the first to cast a verdict
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {/* Official Evaluations */}
                        {team.evaluations?.map((ev: any, i: number) => (
                            <div
                                key={`ev-${i}`}
                                className="bg-surface-2 rounded-md p-3 border border-[var(--border-soft)]"
                            >
                                <div className="flex justify-between items-start gap-2 mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Shield className="w-3.5 h-3.5 text-[var(--info)] shrink-0" />
                                        <span className="font-medium text-ink text-[13px] truncate">
                                            {ev.name || "Evaluator"}
                                        </span>
                                    </div>
                                    <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-sm bg-[var(--info-soft)] text-[var(--info)] border border-[var(--info)]/35 shrink-0">
                                        official
                                    </span>
                                </div>
                                <div className="mb-2">
                                    <span
                                        className={[
                                            "font-mono text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded-sm border",
                                            ev.tier === "strongly_accepted"
                                                ? "bg-brand-soft border-brand/45 text-brand"
                                                : ev.tier === "accepted"
                                                  ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-300"
                                                  : ev.tier === "borderline"
                                                    ? "bg-[var(--warning-soft)] border-[var(--warning)]/40 text-[var(--warning)]"
                                                    : "bg-[var(--danger-soft)] border-[var(--danger)]/40 text-[var(--danger)]",
                                        ].join(" ")}
                                    >
                                        {ev.tier.replace("_", " ")}
                                    </span>
                                </div>
                                {ev.comment && (
                                    <p className="text-[12.5px] text-ink-secondary font-mono leading-relaxed">
                                        {ev.comment}
                                    </p>
                                )}
                            </div>
                        ))}

                        {/* Community Votes */}
                        {team.votes?.map((v: any, i: number) =>
                            v.comment ? (
                                <div
                                    key={`vt-${i}`}
                                    className="bg-surface-2 rounded-md p-3 border border-[var(--border-soft)]"
                                >
                                    <div className="flex justify-between items-start gap-2 mb-2">
                                        <span className="font-medium text-ink-secondary text-[13px] truncate">
                                            {v.name || "Community member"}
                                        </span>
                                        {v.vote === "up" ? (
                                            <span className="inline-flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-sm bg-brand-soft text-brand border border-brand/35 shrink-0">
                                                <ThumbsUp className="w-3 h-3" />
                                                up
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-sm bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)]/35 shrink-0">
                                                <ThumbsDown className="w-3 h-3" />
                                                down
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[12.5px] text-ink-secondary font-mono leading-relaxed">
                                        {v.comment}
                                    </p>
                                </div>
                            ) : null,
                        )}
                    </div>
                )}
            </FormSection>
        </div>
    );
}
