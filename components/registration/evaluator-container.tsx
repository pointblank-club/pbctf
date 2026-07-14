"use client";

import { useState, useEffect } from "react";
import { useAuth } from '@/hooks/use-auth';
import { API_ENDPOINTS } from "@/lib/api-config";
import { Skeleton } from "@/components/ui/skeleton";
import {
    CheckCircle2,
    Vote,
    Search,
    ChevronLeft,
    ChevronRight,
    ThumbsUp,
    ThumbsDown,
    Inbox,
    SlidersHorizontal,
    Terminal,
    Users,
    X,
    ArrowRight,
    Flag,
    ShieldCheck,
} from "lucide-react";
import { StickyAlert } from "@/components/registration/sticky-alert";
import { TeamDetailView } from "./team-detail-view";

import { HudFrame } from "./hud-frame";
interface Evaluation {
    evaluatorId: string;
    tier: string;
    comment: string;
    createdAt: string;
}

interface Vote {
    evaluatorId: string;
    vote: 'up' | 'down';
    comment?: string;
    createdAt: string;
}

interface Team {
    teamCode: string;
    teamName: string;
    memberCount: number;
    isAssigned: boolean;
    assignedAt?: string;
    myEvaluation?: Evaluation;
    myVote?: Vote;
    evaluations: Evaluation[];
    votes: Vote[];
    voteCount?: number;
    upvoteCount?: number;
    downvoteCount?: number;
    isEvaluated: boolean;
    teamMembers?: Array<{ uid?: string; hasSolvedChallenge?: boolean; twintroChallengeSolved?: boolean }>;
}

type Tab = 'pending' | 'evaluated' | 'all_teams';
type Tier = 'strongly_accepted' | 'accepted' | 'borderline' | 'rejected';

const TIER_META: Record<Tier, { label: string; short: string; chip: string; dot: string }> = {
    strongly_accepted: {
        label: 'Strongly Accepted',
        short: 'S.ACCEPT',
        chip: 'bg-brand-soft border-brand/40 text-brand',
        dot: 'bg-brand',
    },
    accepted: {
        label: 'Accepted',
        short: 'ACCEPT',
        chip: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400',
        dot: 'bg-emerald-400',
    },
    borderline: {
        label: 'Borderline',
        short: 'BORDER',
        chip: 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400',
        dot: 'bg-yellow-400',
    },
    rejected: {
        label: 'Rejected',
        short: 'REJECT',
        chip: 'bg-red-500/10 border-red-500/40 text-red-400',
        dot: 'bg-red-400',
    },
};

const TeamRowSkeleton = () => (
    <div className="bg-surface-2 border border-[var(--border-soft)] rounded-md p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-1/2 bg-white/10" />
            <Skeleton className="h-4 w-16 bg-white/5" />
        </div>
        <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-32 bg-white/5" />
            <Skeleton className="h-5 w-20 bg-white/10" />
        </div>
    </div>
);

export function EvaluatorContainer() {
    const { getToken, user } = useAuth();
    const [teams, setTeams] = useState<Team[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('pending');

    // Filter State
    const [selectedTiers, setSelectedTiers] = useState<Tier[]>([]);
    const [unreviewedOnly, setUnreviewedOnly] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [alert, setAlert] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null);

    // Pagination State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalTeams, setTotalTeams] = useState(0);
    const limit = 10;

    // Toggle for filter panel
    const [showFilters, setShowFilters] = useState(false);

    // Stats for header
    const [stats, setStats] = useState({ assigned: 0, evaluated: 0, pending: 0 });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const token = await getToken();
            if (!token) return;

            let url = `${API_ENDPOINTS.evaluatorTeams}?page=${page}&limit=${limit}`;

            if (selectedTiers.length > 0) {
                url += `&tiers=${selectedTiers.join(',')}`;
            }

            if (unreviewedOnly) {
                url += '&reviewed=false';
            }

            if (debouncedSearchQuery) {
                url += `&search=${encodeURIComponent(debouncedSearchQuery)}`;
            }

            if (activeTab === 'all_teams') {
                // Browse every team, sorted by community votes
                url += '&type=all_teams&sort=votes';
            } else {
                url += '&type=assigned';
                // Filter to this tab server-side so pagination totals match what's shown.
                url += `&status=${activeTab}`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    setTeams(data.data.teams || []);
                    if (data.data.pagination) {
                        setTotalPages(data.data.pagination.totalPages);
                        setTotalTeams(data.data.pagination.total);
                    }
                    if (data.data.stats) {
                        setStats(data.data.stats);
                    }
                }
            } else {
                setAlert({ type: "error", message: "Failed to load teams." });
            }
        } catch (error) {
            console.error("Fetch teams error:", error);
            setAlert({ type: "error", message: "Network error. Please try again." });
        } finally {
            setIsLoading(false);
        }
    };

    // Reset page on tab/filter change
    useEffect(() => {
        setPage(1);
    }, [activeTab, selectedTiers, unreviewedOnly]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery.trim());
            setPage(1);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch data
    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, activeTab, selectedTiers, unreviewedOnly, debouncedSearchQuery]);

    const toggleTier = (tier: Tier) => {
        setSelectedTiers(prev => prev.includes(tier) ? prev.filter(x => x !== tier) : [...prev, tier]);
    };

    // Pending/evaluated/search filters are applied server-side so pagination
    // totals match the full result set, not just the current page.
    const filteredTeams = teams;

    const handleEvaluationSuccess = (teamCode: string, evaluation: Evaluation) => {
        const team = teams.find(t => t.teamCode === teamCode);
        const isUpdate = !!team?.myEvaluation;

        setTeams(prev => prev.map(t =>
            t.teamCode === teamCode ? {
                ...t,
                myEvaluation: evaluation,
                // Replace this evaluator's existing evaluation rather than appending,
                // mirroring the server which pulls the old one before pushing the new.
                evaluations: [
                    ...t.evaluations.filter(e => e.evaluatorId !== evaluation.evaluatorId),
                    evaluation,
                ],
                isEvaluated: true,
            } : t
        ));
        // Only adjust counts the first time a team is evaluated; updates don't change them.
        if (!isUpdate) {
            setStats(prev => ({ ...prev, evaluated: prev.evaluated + 1, pending: prev.pending - 1 }));
        }
        setSelectedTeam(null);
        setAlert({ type: "success", message: isUpdate ? "Evaluation updated successfully!" : "Evaluation submitted successfully!" });
        setTimeout(() => setAlert(null), 3000);
    };

    const handleVoteSuccess = (teamCode: string, vote: Vote | null) => {
        setTeams(prev => prev.map(t =>
            t.teamCode === teamCode ? {
                ...t,
                myVote: vote || undefined,
                votes: vote
                    ? [...t.votes.filter(v => v.evaluatorId !== vote.evaluatorId), vote]
                    : t.votes.filter(v => v.evaluatorId !== user?.uid)
            } : t
        ));

        // We need to update selectedTeam as well since it's passed as prop
        if (selectedTeam?.teamCode === teamCode) {
            setSelectedTeam(prev => prev ? ({
                ...prev,
                myVote: vote || undefined,
                votes: vote
                    ? [...prev.votes.filter(v => v.evaluatorId !== vote.evaluatorId), vote]
                    : prev.votes.filter(v => v.evaluatorId !== user?.uid)
            }) : null);
        }

        setAlert({ type: "success", message: vote ? "Vote submitted!" : "Vote removed!" });
        setTimeout(() => setAlert(null), 3000);
    }

    const handleTabChange = (tab: Tab) => {
        if (activeTab !== tab) {
            setActiveTab(tab);
            setPage(1);
        }
    };

    // Keyboard nav: J/down = next, K/up = previous, Enter = open focused row.
    // Disabled while a team is selected (the detail view owns the keyboard).
    const [focusedIndex, setFocusedIndex] = useState(0);
    useEffect(() => {
        setFocusedIndex(0);
    }, [activeTab, searchQuery, page]);
    useEffect(() => {
        if (selectedTeam || filteredTeams.length === 0) return;
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            // Ignore when typing in inputs / textareas / contenteditables
            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
                return;
            }
            if (e.key === "j" || e.key === "ArrowDown") {
                e.preventDefault();
                setFocusedIndex((i) => Math.min(filteredTeams.length - 1, i + 1));
            } else if (e.key === "k" || e.key === "ArrowUp") {
                e.preventDefault();
                setFocusedIndex((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") {
                e.preventDefault();
                const t = filteredTeams[focusedIndex];
                if (t) setSelectedTeam(t);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [filteredTeams, focusedIndex, selectedTeam]);

    // If a team is selected, show detail view (replaces grid)
    if (selectedTeam) {
        return (
            <TeamDetailView
                team={selectedTeam}
                onBack={() => setSelectedTeam(null)}
                onEvaluationSuccess={handleEvaluationSuccess}
                onVoteSuccess={handleVoteSuccess}
            />
        );
    }

    const total = stats.assigned || (stats.pending + stats.evaluated);
    const progress = total > 0 ? Math.round((stats.evaluated / total) * 100) : 0;
    const isCaughtUp = stats.pending === 0 && stats.evaluated > 0 && activeTab === 'pending';
    const firstName = user?.name?.split(' ')[0] || 'operator';

    const TABS: { id: Tab; label: string; icon: typeof Inbox; count?: number }[] = [
        { id: 'pending', label: 'Queue', icon: Inbox, count: stats.pending },
        { id: 'evaluated', label: 'Reviewed', icon: CheckCircle2, count: stats.evaluated },
        { id: 'all_teams', label: 'All teams', icon: Vote },
    ];

    return (
        <div className="flex flex-col gap-6 w-full">
            {alert && (
                <StickyAlert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
            )}

            {/* Operator console header */}
            <section className="relative w-full rounded-lg border border-[var(--border-soft)] bg-surface-1/90 shadow-card">
      <HudFrame cornerSize="md" intensity="strong" />
<div className="relative z-10 flex flex-col gap-5 p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <Terminal className="w-3.5 h-3.5 text-brand shrink-0" />
                            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand">
                                eval.console
                            </span>
                            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-subtle">
                                &gt; {firstName}
                            </span>
                            <span className="font-mono text-[10.5px] text-brand anim-blink">_</span>
                        </div>
                        <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-subtle">
                            {progress}% complete
                        </div>
                    </div>

                    <div className="flex items-end justify-between gap-6 flex-wrap">
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <h1 className="font-heading text-[32px] sm:text-[40px] leading-[1.05] tracking-[-0.02em] text-ink">
                                Triage queue
                            </h1>
                            <p className="font-mono text-[12px] text-ink-secondary">
                                <span className="text-brand">{stats.evaluated}</span>
                                <span className="text-ink-subtle"> / </span>
                                <span className="text-ink">{total || 0}</span>
                                <span className="text-ink-subtle"> teams reviewed </span>
                                <span className="text-ink-subtle">·</span>
                                <span className="text-ink"> {stats.pending}</span>
                                <span className="text-ink-subtle"> awaiting your call</span>
                            </p>
                        </div>

                        {/* Stat tiles */}
                        <div className="flex items-center gap-2 font-mono">
                            <div className="flex flex-col items-end px-3 py-2 rounded-md border border-brand/25 bg-brand-soft min-w-[72px]">
                                <span className="text-[10.5px] uppercase tracking-[0.22em] text-brand">Pending</span>
                                <span className="text-[20px] leading-none text-ink mt-1">{stats.pending}</span>
                            </div>
                            <div className="flex flex-col items-end px-3 py-2 rounded-md border border-[var(--border-soft)] bg-surface-inset min-w-[72px]">
                                <span className="text-[10.5px] uppercase tracking-[0.22em] text-ink-subtle">Done</span>
                                <span className="text-[20px] leading-none text-ink mt-1">{stats.evaluated}</span>
                            </div>
                        </div>
                    </div>

                    {/* Progress rail */}
                    <div className="flex flex-col gap-1.5">
                        <div className="h-1.5 w-full rounded-sm bg-surface-inset border border-[var(--border-hairline)] overflow-hidden">
                            <div
                                className="h-full bg-brand transition-all duration-500 shadow-glow-sm"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-subtle">
                            <span>// progress</span>
                            <span>{stats.evaluated} of {total || 0}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Caught-up signal */}
            {isCaughtUp && (
                <div className="rounded-md border border-brand/40 bg-brand-soft px-4 py-3 flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand">// inbox zero</div>
                        <div className="text-[13px] text-ink mt-0.5">All assigned teams reviewed. Stand by for new assignments.</div>
                    </div>
                </div>
            )}

            {/* Main panel */}
            <section className="relative w-full rounded-lg border border-[var(--border-soft)] bg-surface-1/90 shadow-card">
      <HudFrame cornerSize="md" intensity="strong" />
<div className="relative z-10 flex flex-col gap-5 p-5 sm:p-6">
                    {/* Tab rail */}
                    <div className="flex items-center gap-1 p-1 rounded-md bg-surface-inset border border-[var(--border-hairline)] overflow-x-auto">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-sm font-mono text-[11px] uppercase tracking-[0.15em] transition-all duration-150 whitespace-nowrap min-h-[36px] ${
                                        isActive
                                            ? 'bg-brand-soft text-brand border border-brand/40 shadow-glow-sm'
                                            : 'text-ink-muted hover:text-ink border border-transparent'
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    <span>{tab.label}</span>
                                    {typeof tab.count === 'number' && tab.count > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-sm border ${
                                            isActive
                                                ? 'border-brand/50 bg-void text-brand'
                                                : 'border-[var(--border-hairline)] bg-surface-2 text-ink-secondary'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Search + filter */}
                    <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search by team name or code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-surface-inset border border-[var(--border-soft)] rounded-md pl-10 pr-9 py-2.5 text-[13px] text-ink placeholder:text-ink-disabled focus:outline-none focus:border-brand focus:shadow-glow-sm transition-all duration-200 min-h-[44px] font-mono"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-sm text-ink-subtle hover:text-ink hover:bg-surface-2 transition-colors"
                                    aria-label="Clear search"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowFilters(prev => !prev)}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-md border transition-all duration-200 min-h-[44px] font-mono text-[11px] uppercase tracking-[0.15em] ${
                                showFilters || selectedTiers.length > 0 || unreviewedOnly
                                    ? 'bg-brand-soft border-brand/40 text-brand shadow-glow-sm'
                                    : 'bg-surface-inset border-[var(--border-soft)] text-ink-muted hover:text-ink hover:border-[var(--border-default)]'
                            }`}
                            aria-expanded={showFilters}
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Filter</span>
                            {(selectedTiers.length > 0 || unreviewedOnly) && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-sm border border-brand/50 bg-void text-brand">
                                    {selectedTiers.length + (unreviewedOnly ? 1 : 0)}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Filter chip rail */}
                    {showFilters && (
                        <div className="flex flex-col gap-4 rounded-md border border-[var(--border-soft)] bg-surface-inset p-4 anim-fade-up">
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand">
                                        // review status
                                    </span>
                                    {unreviewedOnly && (
                                        <button
                                            onClick={() => setUnreviewedOnly(false)}
                                            className="font-mono text-[10.5px] uppercase tracking-[0.15em] text-ink-subtle hover:text-ink transition-colors"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                                <button
                                    onClick={() => setUnreviewedOnly(prev => !prev)}
                                    disabled={activeTab === 'evaluated'}
                                    title={activeTab === 'evaluated' ? "Reviewed teams have always been reviewed by someone — this filter doesn't apply here." : undefined}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-[12px] font-medium border transition-all duration-150 min-h-[36px] w-fit disabled:opacity-40 disabled:cursor-not-allowed ${
                                        unreviewedOnly
                                            ? 'bg-brand-soft border-brand/40 text-brand ring-1 ring-current/40'
                                            : 'bg-surface-2 text-ink-subtle border-[var(--border-hairline)] hover:text-ink hover:border-[var(--border-default)]'
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${unreviewedOnly ? 'bg-brand' : 'bg-ink-subtle'}`} />
                                    <span>Not reviewed by anyone</span>
                                </button>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand">
                                        // verdict filter
                                    </span>
                                    {selectedTiers.length > 0 && (
                                        <button
                                            onClick={() => setSelectedTiers([])}
                                            className="font-mono text-[10.5px] uppercase tracking-[0.15em] text-ink-subtle hover:text-ink transition-colors"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(Object.keys(TIER_META) as Tier[]).map((tier) => {
                                        const meta = TIER_META[tier];
                                        const isSelected = selectedTiers.includes(tier);
                                        return (
                                            <button
                                                key={tier}
                                                onClick={() => toggleTier(tier)}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-[12px] font-medium border transition-all duration-150 min-h-[36px] ${
                                                    isSelected
                                                        ? `${meta.chip} ring-1 ring-current/40`
                                                        : 'bg-surface-2 text-ink-subtle border-[var(--border-hairline)] hover:text-ink hover:border-[var(--border-default)]'
                                                }`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                                                <span>{meta.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Queue list */}
                    {isLoading ? (
                        <div className="flex flex-col gap-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <TeamRowSkeleton key={i} />
                            ))}
                        </div>
                    ) : filteredTeams.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-md border border-dashed border-[var(--border-soft)] bg-surface-inset">
                            {activeTab === 'pending' && stats.evaluated > 0 && !searchQuery && selectedTiers.length === 0 ? (
                                <>
                                    <div className="w-12 h-12 rounded-md border border-brand/40 bg-brand-soft flex items-center justify-center mb-4 shadow-glow-sm">
                                        <CheckCircle2 className="w-5 h-5 text-brand" />
                                    </div>
                                    <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand mb-2">
                                        // inbox zero
                                    </div>
                                    <h3 className="font-heading text-[20px] text-ink mb-1.5">All caught up</h3>
                                    <p className="text-[13px] text-ink-secondary max-w-sm">
                                        You&apos;ve reviewed every team in your queue. Switch to <span className="text-brand">Reviewed</span> to revisit your calls.
                                    </p>
                                </>
                            ) : searchQuery || selectedTiers.length > 0 ? (
                                <>
                                    <div className="w-12 h-12 rounded-md border border-[var(--border-soft)] bg-surface-2 flex items-center justify-center mb-4">
                                        <Search className="w-5 h-5 text-ink-muted" />
                                    </div>
                                    <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-subtle mb-2">
                                        // no matches
                                    </div>
                                    <h3 className="font-heading text-[20px] text-ink mb-1.5">Nothing matched</h3>
                                    <p className="text-[13px] text-ink-secondary max-w-sm mb-4">
                                        Try a different query or drop the active filters to see more teams.
                                    </p>
                                    <button
                                        onClick={() => {
                                            setSearchQuery("");
                                            setSelectedTiers([]);
                                        }}
                                        className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand hover:text-ink transition-colors px-3 py-2 rounded-sm border border-brand/30 hover:border-brand/60"
                                    >
                                        Reset filters
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="w-12 h-12 rounded-md border border-[var(--border-soft)] bg-surface-2 flex items-center justify-center mb-4">
                                        <Inbox className="w-5 h-5 text-ink-muted" />
                                    </div>
                                    <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-subtle mb-2">
                                        // empty queue
                                    </div>
                                    <h3 className="font-heading text-[20px] text-ink mb-1.5">No teams here yet</h3>
                                    <p className="text-[13px] text-ink-secondary max-w-sm">
                                        {activeTab === 'pending'
                                            ? 'No assignments yet. Stand by. the admin is still routing teams.'
                                            : activeTab === 'evaluated'
                                                ? "You haven't submitted any evaluations yet. Start with your Queue."
                                                : 'No teams have been registered yet.'}
                                    </p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {/* Queue header row */}
                            <div className="flex items-center justify-between px-2 pb-2 gap-3 flex-wrap">
                                <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-subtle">
                                    {activeTab === 'all_teams' ? '// all teams' : activeTab === 'evaluated' ? '// reviewed' : '// queue'}
                                </span>
                                <div className="flex items-center gap-3">
                                    <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                                        <kbd className="px-1 py-0.5 rounded bg-surface-inset border border-[var(--border-soft)] text-ink">J</kbd>
                                        <span>/</span>
                                        <kbd className="px-1 py-0.5 rounded bg-surface-inset border border-[var(--border-soft)] text-ink">K</kbd>
                                        <span>navigate</span>
                                        <span className="text-ink-disabled">·</span>
                                        <kbd className="px-1 py-0.5 rounded bg-surface-inset border border-[var(--border-soft)] text-ink">↵</kbd>
                                        <span>open</span>
                                    </span>
                                    <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-subtle">
                                        {filteredTeams.length} of {totalTeams || filteredTeams.length}
                                    </span>
                                </div>
                            </div>

                            {filteredTeams.map((team, idx) => {
                                const tierFromMy = team.myEvaluation?.tier as Tier | undefined;
                                const uniqueTiers = Array.from(new Set(team.evaluations.map(e => e.tier))) as Tier[];
                                const isFocused = idx === focusedIndex;

                                return (
                                    <button
                                        key={team.teamCode}
                                        onClick={() => setSelectedTeam(team)}
                                        onMouseEnter={() => setFocusedIndex(idx)}
                                        aria-current={isFocused ? "true" : undefined}
                                        className={[
                                            "group relative w-full text-left rounded-md p-4 flex flex-col gap-3 border",
                                            "transition-[background,border-color,box-shadow] duration-150",
                                            "focus:outline-none focus:border-brand focus:shadow-glow-sm",
                                            isFocused
                                                ? "bg-surface-3 border-brand/55 shadow-glow-sm"
                                                : "bg-surface-2 border-[var(--border-soft)] hover:border-brand/50 hover:bg-surface-3",
                                        ].join(" ")}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-subtle pt-1 shrink-0 w-6">
                                                    {String((page - 1) * limit + idx + 1).padStart(2, '0')}
                                                </span>
                                                <div className="min-w-0 flex flex-col gap-1">
                                                    <h3 className="text-[15px] font-medium text-ink group-hover:text-brand transition-colors line-clamp-1 leading-tight">
                                                        {team.teamName}
                                                    </h3>
                                                    <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.15em] text-ink-subtle flex-wrap">
                                                        <span>{team.teamCode}</span>
                                                        <span className="text-ink-disabled">·</span>
                                                        <span className="flex items-center gap-1">
                                                            <Users className="w-3 h-3" />
                                                            {team.memberCount}
                                                        </span>
                                                        {(() => {
                                                            const ms = team.teamMembers;
                                                            if (!ms || ms.length === 0) return null;
                                                            const solved = ms.filter((m) => m.hasSolvedChallenge).length;
                                                            const twintroSolved = ms.filter((m) => m.twintroChallengeSolved).length;
                                                            const total = ms.length;
                                                            const allSolved = solved === total;
                                                            const allTwintroSolved = twintroSolved === total;
                                                            return (
                                                                <>
                                                                    <span className="text-ink-disabled">·</span>
                                                                    <span
                                                                        className={[
                                                                            "inline-flex items-center gap-1",
                                                                            allSolved ? "text-brand" : "text-ink-muted",
                                                                        ].join(" ")}
                                                                        title={allSolved
                                                                            ? "All members captured the warm-up flag"
                                                                            : `${solved} of ${total} captured the warm-up flag`}
                                                                    >
                                                                        <Flag className="w-3 h-3" />
                                                                        {solved}/{total} warm-up
                                                                    </span>
                                                                    <span className="text-ink-disabled">·</span>
                                                                    <span
                                                                        className={[
                                                                            "inline-flex items-center gap-1",
                                                                            allTwintroSolved ? "text-brand" : "text-ink-muted",
                                                                        ].join(" ")}
                                                                        title={allTwintroSolved
                                                                            ? "All members solved the Twintro challenge"
                                                                            : `${twintroSolved} of ${total} solved the Twintro challenge`}
                                                                    >
                                                                        <ShieldCheck className="w-3 h-3" />
                                                                        {twintroSolved}/{total} twintro
                                                                    </span>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {activeTab === 'all_teams' && (
                                                    <div className="flex items-center gap-1.5 font-mono text-[10.5px]">
                                                        <span className="flex items-center gap-1 text-brand">
                                                            <ThumbsUp className="w-3 h-3" /> {team.upvoteCount || 0}
                                                        </span>
                                                        <span className="text-ink-disabled">/</span>
                                                        <span className="flex items-center gap-1 text-red-400">
                                                            <ThumbsDown className="w-3 h-3" /> {team.downvoteCount || 0}
                                                        </span>
                                                    </div>
                                                )}
                                                {team.isAssigned && activeTab !== 'pending' && (
                                                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] bg-brand-soft text-brand px-1.5 py-0.5 rounded-sm border border-brand/30">
                                                        Mine
                                                    </span>
                                                )}
                                                <ArrowRight className="w-4 h-4 text-ink-subtle group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                                            </div>
                                        </div>

                                        {/* Verdict rail */}
                                        <div className="flex items-center justify-between gap-3 pt-2">
                                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                                {tierFromMy && (
                                                    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-sm border font-mono text-[10px] uppercase tracking-[0.15em] ${TIER_META[tierFromMy].chip}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${TIER_META[tierFromMy].dot}`} />
                                                        Your call: {TIER_META[tierFromMy].short}
                                                    </span>
                                                )}
                                                {!tierFromMy && uniqueTiers.length > 0 && (
                                                    <>
                                                        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-subtle">
                                                            Panel:
                                                        </span>
                                                        {uniqueTiers.map((tier) => (
                                                            <span
                                                                key={tier}
                                                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-sm border font-mono text-[10px] uppercase tracking-[0.15em] ${TIER_META[tier].chip}`}
                                                            >
                                                                <span className={`w-1.5 h-1.5 rounded-full ${TIER_META[tier].dot}`} />
                                                                {TIER_META[tier].short}
                                                            </span>
                                                        ))}
                                                    </>
                                                )}
                                                {!tierFromMy && uniqueTiers.length === 0 && (
                                                    <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-subtle">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-ink-disabled anim-blink" />
                                                        Awaiting review
                                                    </span>
                                                )}
                                            </div>
                                            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                Open &gt;
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between gap-3 pt-4 mt-1">
                            <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-subtle">
                                Page {page} / {totalPages} · {totalTeams} total
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="flex items-center justify-center w-10 h-10 rounded-md border border-[var(--border-soft)] bg-surface-inset text-ink-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:text-brand hover:border-brand/40 hover:bg-brand-soft transition-all"
                                    aria-label="Previous page"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="flex items-center justify-center w-10 h-10 rounded-md border border-[var(--border-soft)] bg-surface-inset text-ink-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:text-brand hover:border-brand/40 hover:bg-brand-soft transition-all"
                                    aria-label="Next page"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
