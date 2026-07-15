import React, { useState, useEffect } from "react";
import { useAuth } from '@/hooks/use-auth';
import { API_ENDPOINTS } from "@/lib/api-config";
import { HudFrame } from "./hud-frame";
import {
  UserCircle, Users, CheckCircle, Download, Eye, Star, ChevronDown, ChevronUp,
  Check, X, Clock, CalendarCheck, ShieldAlert, Activity, Crosshair, Terminal,
  Search,
} from "lucide-react";
import { FormInput } from "./form-input";
import { Button } from "./button";
import { Card } from "./card";
import { StickyAlert } from "./sticky-alert";
import { Spinner } from "@/components/ui/spinner";
import { TeamDetailsModal, TeamDetails } from "./team-details-modal";
import { UserProfileModal, UserDetails } from "./user-profile-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EvaluatorsTab } from "./evaluators-tab";
import { ConfirmationDialog } from "./confirmation-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface AdminStats {
  totalUsers: number;
  totalTeams: number;
  totalEvaluated: number;
  rsvped: number;
}

interface Team {
  teamCode: string;
  teamName: string;
  memberCount: number;
  status: string;
  isShortlisted: boolean;
}

interface Participant {
  id: string;
  uid: string;
  name: string;
  email: string;
  idName?: string | null;
  teamName: string | null;
  isLooking: boolean;
}

export function AdminContainer() {
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState("users");

  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalTeams: 0,
    totalEvaluated: 0,
    rsvped: 0,
  });

  const [alert, setAlert] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);

  // Users State
  const [users, setUsers] = useState<Participant[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersSearch, setUsersSearch] = useState("");
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  // Teams State
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsPage, setTeamsPage] = useState(1);
  const [teamsTotalPages, setTeamsTotalPages] = useState(1);
  const [teamsSearch, setTeamsSearch] = useState("");
  const [isTeamsLoading, setIsTeamsLoading] = useState(false);

  interface SelectedTeam extends Team {
    memberRSVPs?: Array<{
      uid: string;
      name: string;
      rsvpStatus: "confirmed" | "declined";
      rsvpedAt: Date | string;
    }>;
    teamMembers?: Array<{
      uid: string;
      name: string;
      email?: string;
      idName?: string;
      role: string;
    }>;
  }
  const [selectedTeams, setSelectedTeams] = useState<SelectedTeam[]>([]);
  const [selectedTeamsPage, setSelectedTeamsPage] = useState(1);
  const [selectedTeamsTotalPages, setSelectedTeamsTotalPages] = useState(1);
  const [selectedTeamsSearch, setSelectedTeamsSearch] = useState("");
  const [isSelectedTeamsLoading, setIsSelectedTeamsLoading] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  // View Modal State
  const [selectedTeam, setSelectedTeam] = useState<TeamDetails | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isViewLoading, setIsViewLoading] = useState(false);

  // State for User Profile Modal
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isUserLoading, setIsUserLoading] = useState(false);

  // Confirmation Dialog State
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    variant?: "default" | "danger";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
  });

  // Fetch Stats. Single parallel pair of count-only fetches.
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const authHeaders = { Authorization: `Bearer ${token}` };
        const [usersRes, teamsRes] = await Promise.all([
          fetch(`${API_ENDPOINTS.adminParticipants}?limit=1`, { headers: authHeaders }),
          fetch(`${API_ENDPOINTS.adminTeams}?limit=1`, { headers: authHeaders }),
        ]);

        if (usersRes.ok && teamsRes.ok) {
          const usersData = await usersRes.json();
          const teamsData = await teamsRes.json();

          setStats({
            totalUsers: usersData.data?.stats?.totalParticipants || 0,
            totalTeams: teamsData.data?.stats?.totalTeams || 0,
            totalEvaluated: teamsData.data?.stats?.evaluated || 0,
            rsvped: teamsData.data?.stats?.rsvped || 0,
          });
        }
      } catch (error) {
        console.error("Failed to fetch stats", error);
      }
    };
    fetchStats();
  }, [getToken]);

  // Fetch Users
  const fetchUsers = async () => {
    setIsUsersLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      const queryParams = new URLSearchParams({
        page: usersPage.toString(),
        limit: '10', // Fixed limit for now
        search: usersSearch
      });

      const response = await fetch(`${API_ENDPOINTS.adminParticipants}?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.data.participants);
        setUsersTotalPages(data.data.pagination.totalPages);
      } else {
        setAlert({ type: "error", message: "Failed to fetch users" });
      }
    } catch (error) {
      setAlert({ type: "error", message: "Error fetching users" });
    } finally {
      setIsUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      const timeoutId = setTimeout(() => {
        fetchUsers();
      }, 300); // Debounce search
      return () => clearTimeout(timeoutId);
    }
  }, [usersPage, usersSearch, activeTab, getToken]);


  // Fetch Teams
  const fetchTeams = async () => {
    setIsTeamsLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      const queryParams = new URLSearchParams({
        page: teamsPage.toString(),
        limit: '10',
        search: teamsSearch
      });

      const response = await fetch(`${API_ENDPOINTS.adminTeams}?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const teamsList = data.data.teams || [];
        const mappedTeams: Team[] = teamsList.map((t: any) => ({
          teamCode: t.teamCode,
          teamName: t.teamName,
          memberCount: t.memberCount,
          status: t.teamStatus,
          isShortlisted: Boolean(t.isShortlisted)
        }));
        setTeams(mappedTeams);
        setTeamsTotalPages(data.data.pagination.totalPages);
      } else {
        setAlert({ type: "error", message: "Failed to fetch teams" });
      }
    } catch (error) {
      setAlert({ type: "error", message: "Error fetching teams" });
    } finally {
      setIsTeamsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'teams') {
      const timeoutId = setTimeout(() => {
        fetchTeams();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [teamsPage, teamsSearch, activeTab, getToken]);

  const fetchSelectedTeams = async () => {
    setIsSelectedTeamsLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const queryParams = new URLSearchParams({
        page: selectedTeamsPage.toString(),
        limit: '50',
        search: selectedTeamsSearch,
        evaluationTier: 'accepted,strongly_accepted'
      });
      const response = await fetch(`${API_ENDPOINTS.adminTeams}?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const teamsList = data.data.teams || [];
        const teamsWithDetails = await Promise.all(
          teamsList.map(async (t: any) => {
            try {
              const detailResponse = await fetch(API_ENDPOINTS.adminTeamDetails(t.teamCode), {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (detailResponse.ok) {
                const detailData = await detailResponse.json();
                if (detailData.success && detailData.data) {
                  return {
                    teamCode: t.teamCode,
                    teamName: t.teamName,
                    memberCount: t.memberCount,
                    status: t.teamStatus,
                    isShortlisted: Boolean(t.isShortlisted),
                    memberRSVPs: detailData.data.memberRSVPs || [],
                    teamMembers: detailData.data.teamMembers || [],
                  };
                }
              }
            } catch (error) {
              console.error(`Error fetching details for team ${t.teamCode}:`, error);
            }
            return {
              teamCode: t.teamCode,
              teamName: t.teamName,
              memberCount: t.memberCount,
              status: t.teamStatus,
              isShortlisted: Boolean(t.isShortlisted),
              memberRSVPs: [],
              teamMembers: [],
            } as SelectedTeam;
          })
        );

        setSelectedTeams(teamsWithDetails);
        setSelectedTeamsTotalPages(data.data.pagination.totalPages);
      } else {
        setAlert({ type: "error", message: "Failed to fetch selected teams" });
      }
    } catch (error) {
      setAlert({ type: "error", message: "Error fetching selected teams" });
    } finally {
      setIsSelectedTeamsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'selected-teams') {
      const timeoutId = setTimeout(() => {
        fetchSelectedTeams();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedTeamsPage, selectedTeamsSearch, activeTab, getToken]);

  const toggleTeamExpansion = (teamCode: string) => {
    setExpandedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamCode)) {
        newSet.delete(teamCode);
      } else {
        newSet.add(teamCode);
      }
      return newSet;
    });
  };

  const handleExport = async (type: 'users' | 'teams') => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${API_ENDPOINTS.adminExport}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pbctf-${type}-${new Date().toISOString()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setAlert({
          type: "success",
          message: `Exported ${type} data successfully!`,
        });
        setTimeout(() => setAlert(null), 3000);
      }
    } catch (error) {
      setAlert({
        type: "error",
        message: `Failed to export ${type} data`,
      });
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const handleToggleShortlistTeam = async (teamCode: string, shortlist: boolean) => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(API_ENDPOINTS.adminUpdateTeam(teamCode), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamStatus: shortlist ? 'shortlisted' : 'pending',
          isShortlisted: shortlist,
        }),
      });

      if (response.ok) {
        setTeams(prev =>
          prev.map(team =>
            team.teamCode === teamCode
              ? { ...team, status: shortlist ? 'shortlisted' : 'pending', isShortlisted: shortlist }
              : team
          )
        );
        if (activeTab === 'selected-teams') {
          fetchSelectedTeams();
        }

        setAlert({
          type: "success",
          message: shortlist ? "Team shortlisted successfully!" : "Team removed from shortlist.",
        });
        setTimeout(() => setAlert(null), 3000);
      } else {
        setAlert({
          type: "error",
          message: shortlist ? "Failed to shortlist team" : "Failed to remove team from shortlist",
        });
        setTimeout(() => setAlert(null), 3000);
      }
    } catch (error) {
      setAlert({
        type: "error",
        message: shortlist ? "Failed to shortlist team" : "Failed to remove team from shortlist",
      });
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const handleViewTeam = async (teamCode: string) => {
    setIsViewModalOpen(true);
    setIsViewLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(API_ENDPOINTS.adminTeamDetails(teamCode), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSelectedTeam(data.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch team details");
    } finally {
      setIsViewLoading(false);
    }
  };

  const handleViewUser = async (userId: string) => {
    setIsUserModalOpen(true);
    setIsUserLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setSelectedUser(data.user);
        }
      }
    } catch (error) {
      console.error("Failed to fetch user details");
      setAlert({ type: "error", message: "Failed to fetch user details" });
      setTimeout(() => setAlert(null), 3000);
    } finally {
      setIsUserLoading(false);
    }
  };

  const renderPagination = (currentPage: number, totalPages: number, setPage: (page: number) => void) => {
    if (totalPages <= 1) return null;

    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(page => Math.abs(page - currentPage) <= 2 || page === 1 || page === totalPages)
            .map((page, index, array) => (
              <React.Fragment key={page}>
                {index > 0 && array[index - 1] !== page - 1 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationLink
                    isActive={page === currentPage}
                    onClick={() => setPage(page)}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              </React.Fragment>
            ))}

          <PaginationItem>
            <PaginationNext
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  // ---- presentation helpers (no state changes) ----

  const statTiles: Array<{
    icon: typeof UserCircle;
    value: number;
    label: string;
    code: string;
    foot: string;
  }> = [
    { icon: UserCircle, value: stats.totalUsers, label: "Operators", code: "USR", foot: "registered identities" },
    { icon: Users, value: stats.totalTeams, label: "Crews", code: "TM", foot: "active teams" },
    { icon: CheckCircle, value: stats.totalEvaluated, label: "Evaluated", code: "EV", foot: "submissions scored" },
    { icon: CalendarCheck, value: stats.rsvped, label: "RSVPed", code: "RSV", foot: "confirmed to attend" },
  ];

  const tabConfig = [
    { value: "users", label: "Operators", code: "01" },
    { value: "teams", label: "Crews", code: "02" },
    { value: "selected-teams", label: "Shortlist", code: "03" },
    { value: "evaluators", label: "Judges", code: "04" },
  ] as const;

  const activeTabLabel = tabConfig.find((t) => t.value === activeTab)?.label ?? "";

  return (
    <div className="flex flex-col gap-6 w-full">
      {alert && (
        <StickyAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* ──────────────────────────────────────────────
           COMMAND HEADER. operator console identity
         ──────────────────────────────────────────── */}
      <section className="relative rounded-lg border border-brand/20 bg-surface-1/80 shadow-card">
      <HudFrame cornerSize="md" intensity="strong" />
<div className="relative z-10 flex flex-col gap-5 p-5 md:p-7">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand mb-2 flex items-center gap-2">
                <span className="inline-flex w-1.5 h-1.5 rounded-full bg-brand shadow-glow-sm anim-blink" />
                root@pbctf:~/admin
              </div>
              <h1 className="font-heading text-[26px] md:text-[34px] font-semibold text-ink tracking-tight leading-tight">
                Command Center
              </h1>
              <p className="font-mono text-[12px] text-ink-muted mt-1.5">
                <span className="text-brand">&gt;</span> manage operators, crews, judges &amp; shortlist
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-brand/30 bg-brand-soft font-mono text-[10.5px] uppercase tracking-[0.16em] text-brand">
                <Activity className="w-3 h-3" />
                LIVE
              </span>
              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-[var(--border-soft)] bg-surface-inset font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">
                <ShieldAlert className="w-3 h-3" />
                ADMIN
              </span>
            </div>
          </div>

          {/* Stat tiles. terminal HUD numbers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {statTiles.map(({ icon: Icon, value, label, code, foot }) => (
              <div
                key={label}
                className="group relative rounded-md border border-[var(--border-soft)] bg-surface-inset/80 p-3.5 hover:border-brand/40 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-subtle">
                    {code}
                  </span>
                  <Icon className="w-3.5 h-3.5 text-brand/70" />
                </div>
                <div
                  className="font-heading text-[26px] md:text-[30px] font-semibold text-ink tabular-nums tracking-tight leading-none"
                  style={{ textShadow: "0 0 20px rgba(0,255,136,0.28)" }}
                >
                  {value.toLocaleString()}
                </div>
                <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-brand mt-2">
                  {label}
                </div>
                <div className="text-[11px] text-ink-muted mt-0.5 truncate">{foot}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────
           PRIMARY WORK SURFACE. tabbed table
         ──────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Tab rail. terminal-style with code prefixes */}
        <div className="rounded-lg border border-[var(--border-soft)] bg-surface-1/60 p-1.5">
          <TabsList className="flex flex-wrap items-center gap-1 bg-transparent p-0 h-auto w-full">
            {tabConfig.map(({ value, label, code }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex items-center gap-2 bg-transparent border border-transparent text-ink-muted rounded-md px-3 py-2 text-[13px] font-medium whitespace-nowrap data-[state=active]:bg-brand-soft data-[state=active]:border-brand/55 data-[state=active]:text-brand data-[state=active]:shadow-[0_0_16px_rgba(0,255,136,0.18)] hover:text-ink hover:bg-white/[0.03] transition-all duration-200"
              >
                <span className="font-mono text-[10.5px] tracking-[0.16em] opacity-70">{code}</span>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* OPERATORS / USERS */}
        <TabsContent value="users" className="mt-4">
          <Card className="!p-0">
            <div className="flex flex-col">
              {/* surface header */}
              <div className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0 flex items-center gap-2.5">
                  <span className="font-mono text-brand text-[12px] leading-none">{">"}</span>
                  <h2 className="font-heading text-[15px] font-semibold text-ink tracking-tight">
                    {activeTabLabel}
                  </h2>
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">
                    page {usersPage}/{Math.max(usersTotalPages, 1)}
                  </span>
                </div>
                <Button variant="secondary" size="sm" onClick={() => handleExport("users")}>
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </Button>
              </div>

              {/* toolbar: search */}
              <div className="px-5 pt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle pointer-events-none" />
                  <input
                    type="text"
                    placeholder="grep operators / name or email…"
                    value={usersSearch}
                    onChange={(e) => {
                      setUsersSearch(e.target.value);
                      setUsersPage(1);
                    }}
                    className="w-full bg-surface-inset border border-[var(--border-soft)] rounded-md pl-9 pr-3 py-2.5 text-ink text-[13px] font-mono placeholder:text-ink-subtle focus:outline-none focus:border-brand focus:shadow-[0_0_16px_rgba(0,255,136,0.25)] transition-all duration-200"
                  />
                </div>
              </div>

              {/* body */}
              <div className="px-5 py-4">
                {isUsersLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Spinner size="lg" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
                      querying directory…
                    </span>
                  </div>
                ) : users.length === 0 ? (
                  <EmptyState
                    icon={UserCircle}
                    title={usersSearch ? "No matches" : "No operators yet"}
                    detail={
                      usersSearch
                        ? `No operator matches "${usersSearch}". Try a shorter query.`
                        : "Once people register, they will surface here for review."
                    }
                  />
                ) : (
                  <div className="overflow-hidden rounded-md border border-[var(--border-soft)]">
                    {/* table header */}
                    <div className="hidden md:grid grid-cols-[1fr_180px_120px] gap-3 px-3 py-2 bg-surface-inset font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-subtle">
                      <span>Identity</span>
                      <span>Crew</span>
                      <span className="text-right">Action</span>
                    </div>
                    <ul className="">
                      {users.map((user) => (
                        <li
                          key={user.id}
                          className="grid grid-cols-1 md:grid-cols-[1fr_180px_120px] gap-3 px-3 py-3 hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-md bg-brand-soft border border-brand/20 flex items-center justify-center shrink-0">
                              <UserCircle className="w-5 h-5 text-brand" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[13.5px] text-ink truncate">{user.name}</div>
                              <div className="font-mono text-[11.5px] text-ink-muted truncate">
                                {user.email}
                              </div>
                              {user.idName && (
                                <div className="font-mono text-[11px] text-brand truncate">
                                  ID: {user.idName}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center min-w-0">
                            {user.teamName ? (
                              <span className="inline-flex items-center gap-1.5 max-w-full px-2 py-0.5 rounded-md bg-brand-soft border border-brand/20 font-mono text-[11px] text-brand/90 truncate">
                                <Users className="w-3 h-3 shrink-0" />
                                <span className="truncate">{user.teamName}</span>
                              </span>
                            ) : (
                              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-subtle">
                                solo
                              </span>
                            )}
                          </div>
                          <div className="flex md:justify-end">
                            <Button variant="secondary" size="sm" onClick={() => handleViewUser(user.uid)}>
                              <Eye className="w-3.5 h-3.5" />
                              Inspect
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!isUsersLoading && users.length > 0 && renderPagination(usersPage, usersTotalPages, setUsersPage)}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TEAMS / CREWS */}
        <TabsContent value="teams" className="mt-4">
          <Card className="!p-0">
            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0 flex items-center gap-2.5">
                  <span className="font-mono text-brand text-[12px] leading-none">{">"}</span>
                  <h2 className="font-heading text-[15px] font-semibold text-ink tracking-tight">
                    {activeTabLabel}
                  </h2>
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">
                    page {teamsPage}/{Math.max(teamsTotalPages, 1)}
                  </span>
                </div>
                <Button variant="secondary" size="sm" onClick={() => handleExport("teams")}>
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </Button>
              </div>

              <div className="px-5 pt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle pointer-events-none" />
                  <input
                    type="text"
                    placeholder="grep crews / by team name…"
                    value={teamsSearch}
                    onChange={(e) => {
                      setTeamsSearch(e.target.value);
                      setTeamsPage(1);
                    }}
                    className="w-full bg-surface-inset border border-[var(--border-soft)] rounded-md pl-9 pr-3 py-2.5 text-ink text-[13px] font-mono placeholder:text-ink-subtle focus:outline-none focus:border-brand focus:shadow-[0_0_16px_rgba(0,255,136,0.25)] transition-all duration-200"
                  />
                </div>
              </div>

              <div className="px-5 py-4">
                {isTeamsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Spinner size="lg" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
                      enumerating crews…
                    </span>
                  </div>
                ) : teams.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title={teamsSearch ? "No crews matched" : "No crews registered"}
                    detail={
                      teamsSearch
                        ? `No team matches "${teamsSearch}".`
                        : "Crews appear here once teams form."
                    }
                  />
                ) : (
                  <div className="overflow-hidden rounded-md border border-[var(--border-soft)]">
                    <div className="hidden md:grid grid-cols-[1fr_120px_140px_200px] gap-3 px-3 py-2 bg-surface-inset font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-subtle">
                      <span>Team</span>
                      <span>Members</span>
                      <span>Status</span>
                      <span className="text-right">Action</span>
                    </div>
                    <ul className="">
                      {teams.map((team) => (
                        <li
                          key={team.teamCode}
                          className="grid grid-cols-1 md:grid-cols-[1fr_120px_140px_200px] gap-3 px-3 py-3 hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="min-w-0 flex items-center gap-2 flex-wrap">
                            <span className="text-[13.5px] text-ink truncate">{team.teamName}</span>
                            {team.isShortlisted && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-brand-soft border border-brand/30 font-mono text-[10px] uppercase tracking-[0.14em] text-brand">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                Shortlisted
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[12px] text-ink-muted tabular-nums">
                            <span className="md:hidden font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-subtle mr-1.5">members:</span>
                            {team.memberCount}
                          </div>
                          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-secondary">
                            <span className="md:hidden text-[10.5px] text-ink-subtle mr-1.5">status:</span>
                            {team.status || "-"}
                          </div>
                          <div className="flex gap-2 md:justify-end">
                            <Button variant="secondary" size="sm" onClick={() => handleViewTeam(team.teamCode)}>
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </Button>
                            {team.isShortlisted ? (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                  setConfirmation({
                                    isOpen: true,
                                    title: "Remove from shortlist",
                                    message: `Drop team "${team.teamName}" from the shortlist?`,
                                    variant: "danger",
                                    onConfirm: () => handleToggleShortlistTeam(team.teamCode, false),
                                  });
                                }}
                              >
                                <X className="w-3.5 h-3.5" />
                                Drop
                              </Button>
                            ) : (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  setConfirmation({
                                    isOpen: true,
                                    title: "Shortlist team",
                                    message: `Promote team "${team.teamName}" to the next round?`,
                                    onConfirm: () => handleToggleShortlistTeam(team.teamCode, true),
                                  });
                                }}
                              >
                                <Star className="w-3.5 h-3.5" />
                                Shortlist
                              </Button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!isTeamsLoading && teams.length > 0 && renderPagination(teamsPage, teamsTotalPages, setTeamsPage)}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* SHORTLIST */}
        <TabsContent value="selected-teams" className="mt-4">
          <Card className="!p-0">
            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0 flex items-center gap-2.5">
                  <span className="font-mono text-brand text-[12px] leading-none">{">"}</span>
                  <h2 className="font-heading text-[15px] font-semibold text-ink tracking-tight">
                    Shortlist
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-brand/30 bg-brand-soft font-mono text-[10.5px] uppercase tracking-[0.16em] text-brand">
                    <Crosshair className="w-3 h-3" />
                    Finalists
                  </span>
                </div>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">
                  page {selectedTeamsPage}/{Math.max(selectedTeamsTotalPages, 1)}
                </span>
              </div>

              <div className="px-5 pt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle pointer-events-none" />
                  <input
                    type="text"
                    placeholder="grep shortlist…"
                    value={selectedTeamsSearch}
                    onChange={(e) => {
                      setSelectedTeamsSearch(e.target.value);
                      setSelectedTeamsPage(1);
                    }}
                    className="w-full bg-surface-inset border border-[var(--border-soft)] rounded-md pl-9 pr-3 py-2.5 text-ink text-[13px] font-mono placeholder:text-ink-subtle focus:outline-none focus:border-brand focus:shadow-[0_0_16px_rgba(0,255,136,0.25)] transition-all duration-200"
                  />
                </div>
              </div>

              <div className="px-5 py-4 flex flex-col gap-3">
                {isSelectedTeamsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Spinner size="lg" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
                      resolving rsvp roster…
                    </span>
                  </div>
                ) : selectedTeams.length === 0 ? (
                  <EmptyState
                    icon={Crosshair}
                    title={selectedTeamsSearch ? "No shortlisted matches" : "Shortlist is empty"}
                    detail={
                      selectedTeamsSearch
                        ? `No shortlisted team matches "${selectedTeamsSearch}".`
                        : "Promote crews from the Crews tab to populate the shortlist."
                    }
                  />
                ) : (
                  selectedTeams.map((team) => {
                    const isExpanded = expandedTeams.has(team.teamCode);
                    const memberRSVPsMap = new Map(
                      (team.memberRSVPs || []).map((rsvp: any) => [rsvp.uid, rsvp])
                    );
                    const confirmedCount = (team.memberRSVPs || []).filter(
                      (r: any) => r.rsvpStatus === "confirmed"
                    ).length;
                    const declinedCount = (team.memberRSVPs || []).filter(
                      (r: any) => r.rsvpStatus === "declined"
                    ).length;
                    const totalMembers = team.memberCount || 0;
                    const respondedCount = team.memberRSVPs?.length || 0;
                    const pct =
                      totalMembers > 0 ? Math.min(100, Math.round((respondedCount / totalMembers) * 100)) : 0;

                    return (
                      <div
                        key={team.teamCode}
                        className="rounded-md border border-[var(--border-soft)] bg-surface-inset/60 hover:border-brand/30 transition-colors"
                      >
                        <div className="p-4 flex flex-col gap-3">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-[14.5px] font-medium text-ink truncate">{team.teamName}</h3>
                                <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-subtle">
                                  {team.teamCode}
                                </span>
                              </div>
                              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted mt-1">
                                {totalMembers} members · status {team.status || "-"}
                              </p>
                            </div>
                            <div className="flex gap-2 flex-wrap sm:justify-end">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => toggleTeamExpansion(team.teamCode)}
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="w-3.5 h-3.5" />
                                    Hide roster
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                    Roster
                                  </>
                                )}
                              </Button>
                              <Button variant="secondary" size="sm" onClick={() => handleViewTeam(team.teamCode)}>
                                <Eye className="w-3.5 h-3.5" />
                                Inspect
                              </Button>
                            </div>
                          </div>

                          {/* RSVP progress meter */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-subtle">
                                RSVP signal
                              </span>
                              <span className="font-mono text-[11px] tabular-nums text-ink-secondary">
                                <span className="text-brand">{confirmedCount}</span>
                                <span className="text-ink-subtle"> / </span>
                                {totalMembers}
                                {declinedCount > 0 && (
                                  <span className="text-[var(--danger)] ml-2">−{declinedCount}</span>
                                )}
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-surface-inset border border-[var(--border-hairline)] overflow-hidden">
                              <div
                                className="h-full bg-brand shadow-glow-sm transition-[width] duration-500"
                                style={{ width: `${pct}%` }}
                                aria-hidden
                              />
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-muted">
                              <span>
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand mr-1" />
                                confirmed {confirmedCount}
                              </span>
                              <span>
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--warning)] mr-1" />
                                pending {Math.max(totalMembers - respondedCount, 0)}
                              </span>
                              {declinedCount > 0 && (
                                <span>
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--danger)] mr-1" />
                                  declined {declinedCount}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Expanded roster */}
                          {isExpanded && team.teamMembers && team.teamMembers.length > 0 && (
                            <div className="mt-2 pt-3">
                              <h4 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-brand mb-2">
                                Roster
                              </h4>
                              <div className="flex flex-col gap-2">
                                {team.teamMembers.map((member) => {
                                  const rsvp = memberRSVPsMap.get(member.uid);
                                  const rsvpStatus = rsvp?.rsvpStatus || null;

                                  return (
                                    <div
                                      key={member.uid}
                                      className="flex items-center justify-between gap-3 p-2.5 bg-surface-1 rounded-md border border-[var(--border-hairline)]"
                                    >
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-8 h-8 rounded-md bg-brand-soft border border-brand/20 flex items-center justify-center shrink-0">
                                          <UserCircle className="w-4 h-4 text-brand" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h5 className="text-[13px] text-ink flex items-center gap-2 truncate">
                                            <span className="truncate">{member.name}</span>
                                            {member.role === "Team Lead" && (
                                              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand bg-brand-soft border border-brand/30 px-1.5 py-0.5 rounded-md shrink-0">
                                                Lead
                                              </span>
                                            )}
                                          </h5>
                                          {member.email && (
                                            <p className="font-mono text-[11px] text-ink-muted break-all">
                                              {member.email}
                                            </p>
                                          )}
                                          {rsvpStatus === "confirmed" && member.idName && (
                                            <p className="font-mono text-[11px] text-brand truncate">
                                              ID: {member.idName}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="shrink-0">
                                        {rsvpStatus === "confirmed" ? (
                                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-brand-soft border border-brand/40 font-mono text-[10.5px] uppercase tracking-[0.14em] text-brand">
                                            <Check className="w-3 h-3" />
                                            Confirmed
                                          </span>
                                        ) : rsvpStatus === "declined" ? (
                                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--danger-soft)] border border-[var(--danger)]/40 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--danger)]">
                                            <X className="w-3 h-3" />
                                            Declined
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--warning-soft)] border border-[var(--warning)]/40 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--warning)]">
                                            <Clock className="w-3 h-3" />
                                            Pending
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                {!isSelectedTeamsLoading &&
                  selectedTeams.length > 0 &&
                  renderPagination(selectedTeamsPage, selectedTeamsTotalPages, setSelectedTeamsPage)}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* JUDGES */}
        <TabsContent value="evaluators" className="mt-4">
          <EvaluatorsTab />
        </TabsContent>
      </Tabs>

      {/* Footer / hint line */}
      <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-subtle px-1">
        <Terminal className="w-3 h-3" />
        <span>session encrypted · admin role required</span>
      </div>

      <TeamDetailsModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        teamDetails={selectedTeam}
        isLoading={isViewLoading}
        error={null}
        onMemberClick={(memberId) => handleViewUser(memberId)}
      />

      <UserProfileModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        userDetails={selectedUser}
        isLoading={isUserLoading}
        openResumeInNewTab
      />

      <ConfirmationDialog
        isOpen={confirmation.isOpen}
        onClose={() => setConfirmation({ ...confirmation, isOpen: false })}
        onConfirm={async () => {
          const promise = confirmation.onConfirm();
          if (promise instanceof Promise) {
            await promise;
          }
          setConfirmation({ ...confirmation, isOpen: false });
        }}
        title={confirmation.title}
        message={confirmation.message}
        variant={confirmation.variant}
      />
    </div>
  );
}

// Local empty-state cell. terminal-flavored, consistent across tabs.
function EmptyState({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof UserCircle;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 rounded-md border border-dashed border-[var(--border-soft)] bg-surface-inset/50">
      <div className="w-11 h-11 rounded-md bg-brand-soft border border-brand/20 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-brand" />
      </div>
      <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand mb-1">
        no_records.found
      </div>
      <h3 className="text-[15px] text-ink font-medium">{title}</h3>
      <p className="text-[12.5px] text-ink-muted mt-1 max-w-sm">{detail}</p>
    </div>
  );
}
