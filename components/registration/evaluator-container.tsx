"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from '@/hooks/use-auth';
import { API_ENDPOINTS } from "@/lib/api-config";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGrid, CheckCircle2, Vote, Search, ChevronLeft, ChevronRight, Layers, ThumbsUp, ThumbsDown } from "lucide-react";
import { FormSection } from "@/components/registration/form-section";
import { StickyAlert } from "@/components/registration/sticky-alert";
import { TeamDetailView } from "./team-detail-view";

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
    appliedFor?: { id: string; title: string };
    videoURL?: string;
    submissionPDF?: string;
    anyOtherLink?: string;
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
}

type Tab = 'pending' | 'evaluated' | 'all_submissions';
type Tier = 'strongly_accepted' | 'accepted' | 'borderline' | 'rejected';

// Skeleton Component for Team Card
const TeamCardSkeleton = () => (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-3">
        <div className="flex justify-between items-start gap-4">
            <Skeleton className="h-6 w-3/4 bg-white/10" />
            <Skeleton className="h-5 w-16 bg-white/5" />
        </div>
        <Skeleton className="h-4 w-full bg-white/5" />
        <Skeleton className="h-4 w-2/3 bg-white/5" />
        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
            <Skeleton className="h-3 w-24 bg-white/5" />
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
    const [problemStatements, setProblemStatements] = useState<{ id: string; title: string }[]>([]);
    const [selectedPsIds, setSelectedPsIds] = useState<string[]>([]);

    const [searchQuery, setSearchQuery] = useState("");
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

            // Map tab to API type & filters
            if (selectedPsIds.length > 0) {
                url += `&psIds=${selectedPsIds.join(',')}`;
            }
            if (selectedTiers.length > 0) {
                url += `&tiers=${selectedTiers.join(',')}`;
            }

            if (activeTab === 'all_submissions') {
                url += '&type=all_submissions&sort=votes&filter=submitted';
            } else {
                url += '&type=assigned';
                // 'pending' and 'evaluated' are filtered client-side currently
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
    }, [activeTab, selectedTiers, selectedPsIds]);

    // Fetch Problem Statements
    useEffect(() => {
        const fetchPS = async () => {
            const token = await getToken();
            if (!token) return;
            try {
                const res = await fetch(`${API_ENDPOINTS.problemStatements}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.data && data.data.problemStatements) {
                        setProblemStatements(data.data.problemStatements.map((ps: any) => ({ id: ps.id, title: ps.title })));
                    }
                }
            } catch (e) {
                console.error("Failed to fetch PS", e);
            }
        }
        fetchPS();
    }, [getToken]);

    // Fetch data
    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, activeTab, selectedTiers, selectedPsIds]);

    const togglePs = (id: string) => {
        setSelectedPsIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleTier = (tier: Tier) => {
        setSelectedTiers(prev => prev.includes(tier) ? prev.filter(x => x !== tier) : [...prev, tier]);
    };

    const filteredTeams = useMemo(() => {
        let list = [...teams];

        // Client-side filtering for Assigned tabs
        if (activeTab === 'pending') {
            list = list.filter(t => !t.myEvaluation);
        } else if (activeTab === 'evaluated') {
            list = list.filter(t => !!t.myEvaluation);
        }
        // All Submissions is pre-filtered by API

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(t =>
                t.teamName.toLowerCase().includes(q) ||
                t.teamCode.toLowerCase().includes(q)
            );
        }
        return list;
    }, [teams, activeTab, searchQuery]);

    const handleEvaluationSuccess = (teamCode: string, evaluation: Evaluation) => {
        setTeams(prev => prev.map(t =>
            t.teamCode === teamCode ? { ...t, myEvaluation: evaluation, evaluations: [...t.evaluations, evaluation] } : t
        ));
        setStats(prev => ({ ...prev, evaluated: prev.evaluated + 1, pending: prev.pending - 1 }));
        setSelectedTeam(null);
        setAlert({ type: "success", message: "Evaluation submitted successfully!" });
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

    return (
        <div className="flex flex-col gap-[24px] w-full">
            {alert && (
                <StickyAlert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
            )}

            {/* Header Section */}
            <div className="flex flex-col gap-[12px] items-center text-center">
                <h1 className="text-[48px] text-white leading-[52px] tracking-[-1px]" style={{ fontFamily: 'var(--font-heading)' }}>
                    Evaluator Dashboard
                </h1>
                <p className="text-[15.9px] text-white opacity-90 leading-[23.8px]" style={{ fontFamily: 'var(--font-body)' }}>
                    Welcome back, {user?.name}. You have <span className="text-[#22c55e] font-bold">{stats.pending}</span> teams pending evaluation.
                </p>
            </div>

            {/* Main Content Area in FormSection */}
            <FormSection title="Evaluation Overview">
                <div className="flex flex-col gap-6">
                    {/* Tabs */}
                    <div className="flex border-b border-white/10 overflow-x-auto">
                        <button
                            onClick={() => handleTabChange('pending')}
                            className={`px-6 py-3 text-[14px] font-medium transition-all relative whitespace-nowrap ${activeTab === 'pending' ? 'text-[#22c55e]' : 'text-white/60 hover:text-white'
                                }`}
                            style={{ fontFamily: 'var(--font-body)' }}
                        >
                            <div className="flex items-center gap-2">
                                <LayoutGrid className="w-4 h-4" />
                                My Pending
                                {stats.pending > 0 && (
                                    <span className="bg-[#22c55e] text-white text-[10px] px-2 py-0.5 rounded-full">{stats.pending}</span>
                                )}
                            </div>
                            {activeTab === 'pending' && (
                                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#22c55e]" />
                            )}
                        </button>
                        <button
                            onClick={() => handleTabChange('evaluated')}
                            className={`px-6 py-3 text-[14px] font-medium transition-all relative whitespace-nowrap ${activeTab === 'evaluated' ? 'text-[#22c55e]' : 'text-white/60 hover:text-white'
                                }`}
                            style={{ fontFamily: 'var(--font-body)' }}
                        >
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                My Evaluated
                            </div>
                            {activeTab === 'evaluated' && (
                                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#22c55e]" />
                            )}
                        </button>
                        <button
                            onClick={() => handleTabChange('all_submissions')}
                            className={`px-6 py-3 text-[14px] font-medium transition-all relative whitespace-nowrap ${activeTab === 'all_submissions' ? 'text-[#22c55e]' : 'text-white/60 hover:text-white'
                                }`}
                            style={{ fontFamily: 'var(--font-body)' }}
                        >
                            <div className="flex items-center gap-2">
                                <Vote className="w-4 h-4" />
                                All Submissions
                            </div>
                            {activeTab === 'all_submissions' && (
                                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#22c55e]" />
                            )}
                        </button>
                    </div>

                    {/* Search and Filter Toggle */}
                    <div className="flex items-center gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <input
                                type="text"
                                placeholder="Search teams..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-[#22c55e]/50 transition-colors"
                                style={{ fontFamily: 'var(--font-body)' }}
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(prev => !prev)}
                            className={`p-2.5 rounded-lg border transition-all duration-200 ${showFilters
                                ? 'bg-[#22c55e]/10 border-[#22c55e]/50 text-[#22c55e]'
                                : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20'}`}
                        >
                            <Layers className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Global Filter Tags (Moved Below) */}
                    {showFilters && (
                        <div className="flex flex-col gap-6 bg-[#0a0a0a]/50 backdrop-blur-sm border border-white/10 p-5 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
                            {/* Tiers */}
                            <div className="flex flex-col gap-3">
                                <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
                                    Selection Status
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { id: 'strongly_accepted', label: 'Strongly Accepted', color: 'text-green-400 bg-green-500/10 border-green-500/20 hover:border-green-500/40', active: 'ring-1 ring-green-500/50 bg-green-500/20' },
                                        { id: 'accepted', label: 'Accepted', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40', active: 'ring-1 ring-emerald-500/50 bg-emerald-500/20' },
                                        { id: 'borderline', label: 'Borderline', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20 hover:border-yellow-500/40', active: 'ring-1 ring-yellow-500/50 bg-yellow-500/20' },
                                        { id: 'rejected', label: 'Rejected', color: 'text-red-400 bg-red-500/10 border-red-500/20 hover:border-red-500/40', active: 'ring-1 ring-red-500/50 bg-red-500/20' },
                                    ].map((tier) => {
                                        const isSelected = selectedTiers.includes(tier.id as Tier);
                                        return (
                                            <button
                                                key={tier.id}
                                                onClick={() => toggleTier(tier.id as Tier)}
                                                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-200 ${isSelected
                                                    ? tier.color + ' ' + tier.active
                                                    : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white/60'
                                                    }`}
                                            >
                                                {tier.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="h-[1px] w-full bg-white/5" />

                            {/* Problem Statements */}
                            <div className="flex flex-col gap-3">
                                <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
                                    Problem Statement
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {problemStatements.map((ps) => {
                                        const isSelected = selectedPsIds.includes(ps.id);
                                        return (
                                            <button
                                                key={ps.id}
                                                onClick={() => togglePs(ps.id)}
                                                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-200 text-left ${isSelected
                                                    ? 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/30 ring-1 ring-[#22c55e]/20'
                                                    : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white/60 hover:border-white/20'
                                                    }`}
                                            >
                                                {ps.title}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Team List or Skeleton */}
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <TeamCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : filteredTeams.length === 0 ? (
                        <div className="text-center py-20 border border-dashed border-white/10 rounded-xl bg-white/5">
                            <p className="text-white/50" style={{ fontFamily: 'var(--font-body)' }}>No teams found on this page.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredTeams.map((team) => (
                                <div
                                    key={team.teamCode}
                                    onClick={() => setSelectedTeam(team)}
                                    className="group relative bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer flex flex-col gap-3"
                                >
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-lg font-medium text-white group-hover:text-[#22c55e] transition-colors line-clamp-1" style={{ fontFamily: 'var(--font-body)' }}>
                                            {team.teamName}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            {activeTab === 'all_submissions' && (
                                                <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded border border-white/5">
                                                    <div className="flex items-center gap-1 text-[10px] text-green-400">
                                                        <ThumbsUp className="w-3 h-3" /> {team.upvoteCount || 0}
                                                    </div>
                                                    <div className="w-[1px] h-3 bg-white/10" />
                                                    <div className="flex items-center gap-1 text-[10px] text-red-400">
                                                        <ThumbsDown className="w-3 h-3" /> {team.downvoteCount || 0}
                                                    </div>
                                                </div>
                                            )}
                                            {team.isAssigned && (
                                                <span className="text-[10px] uppercase bg-blue-500/20 text-blue-400 px-2 py-1 rounded border border-blue-500/20">
                                                    Assigned
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-sm text-white/60 line-clamp-2 min-h-[40px]" style={{ fontFamily: 'var(--font-body)' }}>
                                        {team.appliedFor ? team.appliedFor.title : 'No specific problem statement'}
                                    </p>

                                    <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
                                        <span style={{ fontFamily: 'var(--font-body)' }}>Team Code: {team.teamCode}</span>
                                        {activeTab === 'evaluated' && team.myEvaluation && (
                                            <span className={`px-2 py-0.5 rounded border ${team.myEvaluation.tier === 'strongly_accepted' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                                                team.myEvaluation.tier === 'accepted' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
                                                    team.myEvaluation.tier === 'borderline' ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400' :
                                                        'bg-red-500/20 border-red-500/30 text-red-400'
                                                }`} style={{ fontFamily: 'var(--font-body)' }}>
                                                {team.myEvaluation.tier.replace('_', ' ')}
                                            </span>
                                        )}
                                        {activeTab === 'all_submissions' && team.myVote && (
                                            <span className={`px-2 py-0.5 rounded border ${team.myVote.vote === 'up' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                                                'bg-red-500/20 border-red-500/30 text-red-400'
                                                }`} style={{ fontFamily: 'var(--font-body)' }}>
                                                voted {team.myVote.vote}
                                            </span>
                                        )}
                                        {/* Display Selection Status Tags */}
                                        {(() => {
                                            const uniqueTiers = Array.from(new Set(team.evaluations.map(e => e.tier)));
                                            if (uniqueTiers.length === 0 && team.isEvaluated) return null;
                                            return uniqueTiers.map(tier => (
                                                <span key={tier} className={`px-2 py-0.5 rounded border capitalize flex items-center ${tier === 'strongly_accepted' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                                                    tier === 'accepted' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                                        tier === 'borderline' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                                                            'bg-red-500/10 border-red-500/20 text-red-400'
                                                    }`} style={{ fontFamily: 'var(--font-body)' }}>
                                                    {tier.replace('_', ' ')}
                                                </span>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-2">
                            <div className="text-sm text-white/40" style={{ fontFamily: 'var(--font-body)' }}>
                                Showing page {page} of {totalPages} ({totalTeams} total)
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 rounded-lg border border-white/10 bg-white/5 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 rounded-lg border border-white/10 bg-white/5 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </FormSection>
        </div>
    );
}
