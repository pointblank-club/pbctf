"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { API_ENDPOINTS } from "@/lib/api-config";
import {
  Users,
  Search,
  Home,
  User,
  Github,
  Linkedin,
  ExternalLink,
  ShieldAlert,
  Lock,
  ChevronLeft,
  ChevronRight,
  Radio,
} from "lucide-react";
import { Button } from "./button";
import { Card } from "./card";
import { SectionTab } from "./section-tab";
import { TeamDetailsModal, TeamDetails } from "./team-details-modal";
import { UserProfileModal, UserDetails } from "./user-profile-modal";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { AlertBanner } from "./alert-banner";

import { HudFrame } from "./hud-frame";
interface TeamLookingForMembers {
  teamName: string;
  teamCode: string;
  currentMembers: number;
  maxMembers: number;
  teamLead?: {
    id: string;
    name: string;
  };
  teamMembers?: Array<{
    id: string;
    name: string;
    organisation?: string;
  }>;
}

interface ParticipantLookingForTeam {
  id: string; // uid
  name: string;
  // skills: string;
  // interests: string;
  university?: string;
  email?: string;
  hasSolvedChallenge?: boolean;
  bio?: string;
  profile_picture?: string;
  github_link?: string;
  linkedin_link: string;
}

export function DiscoverContainer() {
  const { user, getToken } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"teams" | "participants">("teams");
  const [teamsLookingForMembers, setTeamsLookingForMembers] = useState<
    TeamLookingForMembers[]
  >([]);
  const [participantsLookingForTeams, setParticipantsLookingForTeams] =
    useState<ParticipantLookingForTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRequests, setUserRequests] = useState<Record<string, string>>({}); // teamCode -> requestStatus
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTeamLead, setIsTeamLead] = useState(false);
  const [invitingUser, setInvitingUser] = useState<string | null>(null);
  const [sentInvites, setSentInvites] = useState<Set<string>>(new Set()); // User IDs
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [userIsLooking, setUserIsLooking] = useState(false);
  const [userHasTeam, setUserHasTeam] = useState(false);
  const [teamCapacity, setTeamCapacity] = useState<{
    current: number;
    max: number;
  } | null>(null);

  // Pagination state
  const [teamsPage, setTeamsPage] = useState(1);
  const [participantsPage, setParticipantsPage] = useState(1);
  const [teamsPagination, setTeamsPagination] = useState({
    totalPages: 1,
    total: 0,
  });
  const [participantsPagination, setParticipantsPagination] = useState({
    totalPages: 1,
    total: 0,
  });
  const ITEMS_PER_PAGE = 10;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      // Reset to page 1 when search changes
      setTeamsPage(1);
      setParticipantsPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Modal states
  const [selectedTeamCode, setSelectedTeamCode] = useState<string | null>(null);
  const [teamDetails, setTeamDetails] = useState<TeamDetails | null>(null);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const token = await getToken();
        if (!token) {
          setIsLoading(false);
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        // Phase 1: profile + own team (if any) + user's join requests, all
        // independent so they fire in parallel.
        const phase1 = await Promise.allSettled([
          fetch(API_ENDPOINTS.userProfile, { headers }),
          user?.teamCode
            ? fetch(API_ENDPOINTS.getTeam(user.teamCode), { headers })
            : Promise.resolve(null as any),
          fetch(`${API_ENDPOINTS.joinRequest}?type=user`, { headers }),
        ]);
        const [profileSettled, teamSettled, requestsSettled] = phase1;

        // Process profile -> isLooking. Note: we deliberately do NOT trust
        // profile.teamCode for "has team" — it can be stale right after a
        // team delete. We only set userHasTeam after the team fetch confirms
        // the team actually exists.
        let userIsLookingValue = false;
        if (
          profileSettled.status === "fulfilled" &&
          profileSettled.value &&
          (profileSettled.value as Response).ok
        ) {
          try {
            const userProfileData = await (profileSettled.value as Response).json();
            const profileData = userProfileData.success
              ? userProfileData.data
              : userProfileData;
            userIsLookingValue = profileData?.isLooking || false;
            setUserIsLooking(userIsLookingValue);
          } catch (error) {
            console.error("Error parsing user profile:", error);
          }
        } else if (profileSettled.status === "rejected") {
          console.error("Error fetching user profile:", profileSettled.reason);
        }

        // Process own team -> lead status, capacity, ACTIVE existence
        let isLeadLocal = false;
        let userHasTeamValue = false;
        if (
          teamSettled.status === "fulfilled" &&
          teamSettled.value &&
          (teamSettled.value as Response).ok
        ) {
          try {
            const teamData = await (teamSettled.value as Response).json();
            if (teamData.success && teamData.data) {
              // Team exists and is active. Now we can trust user has a team.
              userHasTeamValue = true;
              const leadId =
                typeof teamData.data.teamLead === "string"
                  ? teamData.data.teamLead
                  : teamData.data.teamLead?.id;
              if (leadId === user?.uid) {
                isLeadLocal = true;
                setIsTeamLead(true);
                setActiveTab("participants"); // Auto-switch for team leads
                setTeamCapacity({
                  current:
                    teamData.data.currentMemberCount ||
                    teamData.data.teamMembers?.length ||
                    0,
                  max: teamData.data.maxMembers || 2,
                });
              }
            }
          } catch (error) {
            console.error("Error parsing team:", error);
          }
        } else if (teamSettled.status === "rejected") {
          console.error("Error verifying team lead status:", teamSettled.reason);
        }
        setUserHasTeam(userHasTeamValue);
        // Reset lead status if the team fetch came back negative -- guards
        // against stale state when the team has just been deleted.
        if (!userHasTeamValue) {
          setIsTeamLead(false);
        }

        // Process user's join requests (independent of everything else)
        if (
          requestsSettled.status === "fulfilled" &&
          (requestsSettled.value as Response).ok
        ) {
          try {
            const requestsData = await (requestsSettled.value as Response).json();
            if (
              requestsData.success &&
              requestsData.data &&
              Array.isArray(requestsData.data.requests)
            ) {
              const requestsMap: Record<string, string> = {};
              requestsData.data.requests.forEach((req: any) => {
                // Only track pending and accepted requests.
                // Declined/cancelled requests are ignored so user can send a new request.
                if (req.status === "pending" || req.status === "accepted") {
                  requestsMap[req.teamCode] = req.status;
                }
              });
              setUserRequests(requestsMap);
            }
          } catch (error) {
            console.error("Error parsing user requests:", error);
          }
        }

        // Build query string for paginated fetches
        const queryParams = debouncedSearchQuery.trim()
          ? `?search=${encodeURIComponent(debouncedSearchQuery.trim())}`
          : "";

        const shouldFetchLists =
          userIsLookingValue || userHasTeamValue || isLeadLocal || isTeamLead;
        const userIsLead = isLeadLocal || isTeamLead;

        // Phase 2: lists + sent invites, all independent, fire in parallel.
        const phase2 = await Promise.allSettled([
          // Teams looking for members -- only for non-leads who can see the list
          shouldFetchLists && !userIsLead
            ? fetch(
              `${API_ENDPOINTS.lookingForMembers}${queryParams}${queryParams ? "&" : "?"}page=${teamsPage}&limit=${ITEMS_PER_PAGE}`,
              { method: "GET", headers },
            )
            : Promise.resolve(null as any),
          // Operators looking for teams
          shouldFetchLists
            ? fetch(
              `${API_ENDPOINTS.lookingForTeam}${queryParams}${queryParams ? "&" : "?"}page=${participantsPage}&limit=${ITEMS_PER_PAGE}`,
              { method: "GET", headers },
            )
            : Promise.resolve(null as any),
          // Sent invites by this team -- only if user is the lead of their team
          isLeadLocal && user?.teamCode
            ? fetch(`${API_ENDPOINTS.joinRequest}?teamCode=${user.teamCode}`, {
              headers,
            })
            : Promise.resolve(null as any),
        ]);
        const [teamsSettled, participantsSettled, sentInvitesSettled] = phase2;

        // Process teams list
        if (
          teamsSettled.status === "fulfilled" &&
          teamsSettled.value &&
          (teamsSettled.value as Response).ok
        ) {
          try {
            const teamsData = await (teamsSettled.value as Response).json();
            if (
              teamsData.success &&
              teamsData.data &&
              Array.isArray(teamsData.data.teams)
            ) {
              const transformed = teamsData.data.teams.map((team: any) => ({
                teamName: team.teamName,
                teamCode: team.teamCode,
                currentMembers: team.currentMemberCount || 0,
                maxMembers: team.maxMembers || 2,
                teamLead: team.teamLead,
                teamMembers: team.teamMembers,
              }));
              setTeamsLookingForMembers(transformed);
              if (teamsData.data.pagination) {
                setTeamsPagination({
                  totalPages: teamsData.data.pagination.totalPages || 1,
                  total: teamsData.data.pagination.totalTeams || 0,
                });
              }
            } else {
              setTeamsLookingForMembers([]);
            }
          } catch (error) {
            console.error("Error parsing teams list:", error);
          }
        } else if (!shouldFetchLists) {
          setTeamsLookingForMembers([]);
        }

        // Process participants list
        if (
          participantsSettled.status === "fulfilled" &&
          participantsSettled.value &&
          (participantsSettled.value as Response).ok
        ) {
          try {
            const participantsData = await (participantsSettled.value as Response).json();
            if (
              participantsData.success &&
              participantsData.data &&
              Array.isArray(participantsData.data.users)
            ) {
              const transformed = participantsData.data.users
                .filter((userData: any) => userData.id !== user?.uid)
                .map((u: any) => ({
                  id: u.id,
                  name: u.name,
                  bio: u.bio,
                  university: u.organisation || undefined,
                  email: u.email,
                  hasSolvedChallenge: u.hasSolvedChallenge || false,
                  profile_picture: u.profile_picture,
                  github_link: u.github_link,
                  linkedin_link: u.linkedin_link,
                }));
              setParticipantsLookingForTeams(transformed);
              if (participantsData.data.pagination) {
                setParticipantsPagination({
                  totalPages: participantsData.data.pagination.totalPages || 1,
                  total: participantsData.data.pagination.totalUsers || 0,
                });
              }
            } else {
              setParticipantsLookingForTeams([]);
            }
          } catch (error) {
            console.error("Error parsing participants list:", error);
          }
        } else if (!shouldFetchLists) {
          setParticipantsLookingForTeams([]);
        }

        // Process sent invites (lead-only)
        if (
          sentInvitesSettled.status === "fulfilled" &&
          sentInvitesSettled.value &&
          (sentInvitesSettled.value as Response).ok
        ) {
          try {
            const invitesData = await (sentInvitesSettled.value as Response).json();
            if (
              invitesData.success &&
              invitesData.data &&
              Array.isArray(invitesData.data.requests)
            ) {
              const inviteeIds = new Set<string>();
              invitesData.data.requests.forEach((req: any) => {
                if (
                  req.type === "invite" &&
                  (req.status === "pending" || req.status === "accepted")
                ) {
                  inviteeIds.add(req.userId);
                }
              });
              setSentInvites(inviteeIds);
            }
          } catch (error) {
            console.error("Error parsing sent invites:", error);
          }
        }
      } catch (error) {
        console.error("Failed to fetch discover data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [
    getToken,
    user,
    debouncedSearchQuery,
    isTeamLead,
    teamsPage,
    participantsPage,
  ]);

  const handleSendRequest = async (teamCode: string) => {
    if (!user) return;

    try {
      setSendingRequest(teamCode);
      const token = await getToken();
      if (!token) return;

      const response = await fetch(API_ENDPOINTS.joinRequest, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ teamCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send request");
      }

      // Update user requests map
      setUserRequests((prev) => ({ ...prev, [teamCode]: "pending" }));
      toast({
        title: "Request sent",
        description: "Your join request has been sent successfully.",
      });
    } catch (error) {
      console.error("Error sending join request:", error);
      toast({
        variant: "destructive",
        title: "Failed to send request",
        description:
          error instanceof Error ? error.message : "Failed to send request",
      });
    } finally {
      setSendingRequest(null);
    }
  };

  const handleInviteUser = async (userEmail: string, userId: string) => {
    if (!user || !user.teamCode) return;

    try {
      setInvitingUser(userId);
      const token = await getToken();
      if (!token) return;

      const response = await fetch(API_ENDPOINTS.joinRequest, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamCode: user.teamCode,
          type: "invite",
          email: userEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to invite user");
      }

      setSentInvites((prev) => new Set(prev).add(userId));

      toast({
        title: "Invitation sent",
        description: `Invitation sent to ${userEmail} successfully.`,
      });
    } catch (error) {
      console.error("Error sending invite:", error);
      toast({
        variant: "destructive",
        title: "Failed to send invite",
        description:
          error instanceof Error ? error.message : "Failed to send invite",
      });
    } finally {
      setInvitingUser(null);
    }
  };

  const handleTeamClick = async (teamCode: string) => {
    setSelectedTeamCode(teamCode);
    setIsLoadingTeam(true);
    setTeamError(null);

    // First, try to use the basic data we already have from the looking-for-members endpoint
    const basicTeamData = teamsLookingForMembers.find(
      (t) => t.teamCode === teamCode,
    );

    // Try to fetch full team details (will fail if user is not a member)
    try {
      const token = await getToken();
      if (!token) {
        // If no token, use basic data
        if (basicTeamData) {
          const basicDetails = {
            teamCode: basicTeamData.teamCode,
            teamName: basicTeamData.teamName,
            teamLead: basicTeamData.teamLead || { id: '', name: 'Unknown' },
            teamMembers: basicTeamData.teamMembers?.map(m => ({
              uid: m.id,
              name: m.name,
              role: 'Member',
            })) || [],
            memberCount: basicTeamData.currentMembers,
            maxMembers: basicTeamData.maxMembers,
            teamStatus: "pending",
          };
          setTeamDetails(basicDetails);
        } else {
          setTeamError("Authentication required");
        }
        setIsLoadingTeam(false);
        return;
      }

      const response = await fetch(API_ENDPOINTS.getTeam(teamCode), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setTeamDetails(data.data);
          setTeamError(null);
        } else {
          // Fallback to basic data
          if (basicTeamData) {
            const basicDetails = {
              teamCode: basicTeamData.teamCode,
              teamName: basicTeamData.teamName,
              teamLead: basicTeamData.teamLead || { id: '', name: 'Unknown' },
              teamMembers: basicTeamData.teamMembers?.map(m => ({
                uid: m.id,
                name: m.name,
                role: 'Member',
              })) || [],
              memberCount: basicTeamData.currentMembers,
              maxMembers: basicTeamData.maxMembers,
              teamStatus: "pending",
            };
            setTeamDetails(basicDetails);
          } else {
            setTeamError("Failed to load team details");
          }
        }
      } else {
        // If API fails (e.g., user is not a member), use basic data if available
        if (basicTeamData) {
          const basicDetails = {
            teamCode: basicTeamData.teamCode,
            teamName: basicTeamData.teamName,
            teamLead: basicTeamData.teamLead || { id: '', name: 'Unknown' },
            teamMembers: basicTeamData.teamMembers?.map(m => ({
              uid: m.id,
              name: m.name,
              role: 'Member',
            })) || [],
            memberCount: basicTeamData.currentMembers,
            maxMembers: basicTeamData.maxMembers,
            teamStatus: "pending",
          };
          setTeamDetails(basicDetails);
          setTeamError(null);
        } else {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage =
            errorData.message || "Failed to fetch team details";
          setTeamError(errorMessage);
        }
      }
    } catch (error) {
      console.error("Error fetching team details:", error);
      // Fallback to basic data if available
      if (basicTeamData) {
        const basicDetails: TeamDetails = {
          teamCode: basicTeamData.teamCode,
          teamName: basicTeamData.teamName,
          teamLead: basicTeamData.teamLead || { id: '', name: 'Unknown' },
          teamMembers: basicTeamData.teamMembers?.map(m => ({
            uid: m.id,
            name: m.name,
            role: 'Member',
          })) || [],
          memberCount: basicTeamData.currentMembers,
          maxMembers: basicTeamData.maxMembers,
          teamStatus: "pending",
        };
        setTeamDetails(basicDetails);
      } else {
        setTeamError("Network error. Please try again.");
      }
    } finally {
      setIsLoadingTeam(false);
    }
  };

  const handleCloseTeamModal = () => {
    setSelectedTeamCode(null);
    setTeamDetails(null);
    setTeamError(null);
    // Also close user modal if open
    setSelectedUserId(null);
    setUserDetails(null);
  };

  const handleUserClick = async (userId: string) => {
    // Prevent team members from seeing profiles of other team members
    if (user?.teamCode && userId !== user.uid) {
      // Check if the clicked user is a member of the same team
      try {
        const token = await getToken();
        if (token) {
          const teamResponse = await fetch(
            API_ENDPOINTS.getTeam(user.teamCode),
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            },
          );
          if (teamResponse.ok) {
            const teamData = await teamResponse.json();
            if (teamData.success && teamData.data) {
              const teamMembers = teamData.data.teamMembers || [];
              const isTeamMember = teamMembers.some(
                (member: any) => member.uid === userId,
              );
              if (isTeamMember) {
                toast({
                  variant: "destructive",
                  title: "Access Denied",
                  description: "You cannot view profiles of your team members.",
                });
                return;
              }
            }
          }
        }
      } catch (error) {
        console.error("Error checking team membership:", error);
      }
    }

    setSelectedUserId(userId);
    setIsLoadingUser(true);
    setUserError(null);

    try {
      const token = await getToken();
      if (!token) {
        setUserError("Authentication required");
        setIsLoadingUser(false);
        return;
      }

      const response = await fetch(`/api/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === "success" && data.user) {
          setUserDetails(data.user);
        } else {
          setUserError(data.message || "Failed to load user details");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setUserError(errorData.message || "Failed to fetch user details");
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
      setUserError("Network error. Please try again.");
    } finally {
      setIsLoadingUser(false);
    }
  };

  const handleCloseUserModal = () => {
    setSelectedUserId(null);
    setUserDetails(null);
    setUserError(null);
  };

  const teamsCount = teamsPagination.total;
  const participantsCount = participantsPagination.total;
  const activeListLength =
    activeTab === "teams" && !isTeamLead
      ? teamsLookingForMembers.length
      : participantsLookingForTeams.length;
  const activeTotal =
    activeTab === "teams" && !isTeamLead ? teamsCount : participantsCount;

  return (
    <div className="flex flex-col gap-6 w-full max-w-[760px] mx-auto">
      {isLoading && !debouncedSearchQuery ? (
        <div className="flex flex-col items-center justify-center py-[120px] gap-3">
          <Spinner size="lg" />
          <div className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-ink-muted">
            Scanning network<span className="anim-blink">_</span>
          </div>
        </div>
      ) : (
        <>
          {/* HERO. compact operator strip */}
          <div className="relative overflow-hidden">
            <div className="relative flex items-end justify-between gap-4 flex-wrap">
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex w-1.5 h-1.5 rounded-full bg-brand shadow-glow-sm anim-blink" />
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-brand">
                    PBCTF 5.0 // DISCOVER
                  </div>
                </div>
                <h1 className="font-heading text-[30px] sm:text-[38px] font-bold text-ink tracking-tight leading-[1.05]">
                  {isTeamLead ? (
                    <>Recruit your <span className="text-brand">crew</span>.</>
                  ) : (
                    <>Find your <span className="text-brand">people</span>.</>
                  )}
                </h1>
                <p className="text-[13px] text-ink-secondary font-body max-w-[52ch] leading-relaxed">
                  {isTeamLead
                    ? "Scan the network for solo operators. Send an invite when you spot a fit."
                    : "Scan open rosters or solo operators. Request to join, or get pulled in."}
                </p>
              </div>
              <Button
                onClick={() => router.push("/dashboard")}
                variant="ghost"
                size="sm"
              >
                <Home className="w-3.5 h-3.5" />
                Dashboard
              </Button>
            </div>
          </div>

          {userHasTeam && (!isTeamLead || (isTeamLead && teamCapacity && teamCapacity.current >= teamCapacity.max)) ? (
            <Card hudCorners>
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center gap-4">
                <span className="inline-flex w-12 h-12 items-center justify-center rounded-md bg-brand-soft border border-brand/40">
                  <Lock className="w-5 h-5 text-brand" />
                </span>
                <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand">
                  &gt; {isTeamLead ? "Team Full" : "Already enlisted"}
                </div>
                <h2 className="font-heading text-[22px] font-bold text-ink leading-tight">
                  You ride with{" "}
                  <span className="font-mono text-brand bg-brand-soft border border-brand/30 px-1.5 py-0.5 rounded text-[18px] align-middle">
                    {user?.teamCode}
                  </span>
                </h2>
                <p className="text-[13px] text-ink-secondary font-body max-w-[44ch] leading-relaxed">
                  {isTeamLead
                    ? "Your squad has reached its maximum capacity. You must remove members if you want to recruit new ones."
                    : "Leave the current squad if you want to scout new ones. Recruitment is locked to leads only."}
                </p>
                <Button
                  onClick={() => router.push("/dashboard")}
                  variant="primary"
                  size="md"
                >
                  Back to console
                </Button>
              </div>
            </Card>
          ) : !userIsLooking &&
            !isTeamLead &&
            !userHasTeam &&
            activeTab === "teams" ? (
            <Card hudCorners>
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center gap-4">
                <span className="inline-flex w-12 h-12 items-center justify-center rounded-md bg-[var(--warning-soft)] border border-[var(--warning)]/40">
                  <Radio className="w-5 h-5 text-[var(--warning)]" />
                </span>
                <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[var(--warning)]">
                  &gt; Signal: offline
                </div>
                <h2 className="font-heading text-[22px] font-bold text-ink leading-tight">
                  Go public to scout teams
                </h2>
                <p className="text-[13px] text-ink-secondary font-body max-w-[46ch] leading-relaxed">
                  Enable <span className="text-ink font-medium">Public Profile</span> in your settings.
                  Without it, teams can&apos;t see you. and you can&apos;t see open rosters.
                </p>
                <Button
                  onClick={() => router.push("/dashboard/profile")}
                  variant="primary"
                  size="md"
                >
                  Open profile settings
                </Button>
              </div>
            </Card>
          ) : (
            <>
              {!user?.teamCode && (
                <AlertBanner
                  type="info"
                  message="Want to invite people? Spin up a team first, only leads can send invites."
                />
              )}

              {/* Privacy disclosure. minimal terminal note */}
              <details className="group rounded-md border border-[var(--warning)]/30 bg-[var(--warning-soft)]/60">
                <summary className="cursor-pointer list-none flex items-center gap-2.5 px-3 py-2 select-none">
                  <ShieldAlert className="w-3.5 h-3.5 text-[var(--warning)] shrink-0" />
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[var(--warning)]">
                    // Privacy disclosure
                  </span>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted group-open:hidden">
                    [ + ]
                  </span>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted hidden group-open:inline">
                    [ - ]
                  </span>
                </summary>
                <div className="px-3 pb-3 pt-1 text-[12px] text-ink-secondary font-body leading-relaxed">
                  Going public exposes your{" "}
                  <span className="text-ink">name, bio, organisation, profile picture, resume,
                    and social links</span>{" "}
                  to other operators. Strip phone numbers, addresses, and personal emails from your resume before publishing.
                </div>
              </details>

              {/* Tabs. When a team lead only sees the Operators tab, render a
                  static header instead of a single tab pill. */}
              {isTeamLead ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-brand-soft border border-brand/40 text-brand">
                    <User className="w-3.5 h-3.5" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] font-medium">
                      Operators · {participantsCount}
                    </span>
                  </div>
                  <div className="ml-auto hidden sm:flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-muted">
                    <span className="inline-flex w-1.5 h-1.5 rounded-full bg-brand anim-blink" />
                    <span>
                      {activeTotal} {activeTotal === 1 ? "match" : "matches"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <SectionTab
                    active={activeTab === "teams"}
                    onClick={() => setActiveTab("teams")}
                    icon={Users}
                    label={`Teams · ${teamsCount}`}
                  />
                  <SectionTab
                    active={activeTab === "participants"}
                    onClick={() => setActiveTab("participants")}
                    icon={User}
                    label={`Operators · ${participantsCount}`}
                  />
                  <div className="ml-auto hidden sm:flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-muted">
                    <span className="inline-flex w-1.5 h-1.5 rounded-full bg-brand anim-blink" />
                    <span>
                      {activeTotal} {activeTotal === 1 ? "match" : "matches"}
                    </span>
                  </div>
                </div>
              )}

              {/* Command-bar style search: Enter flushes the debounce, Esc clears */}
              <div className="group relative flex items-center gap-2 rounded-md bg-surface-inset border border-[var(--border-soft)] focus-within:border-brand focus-within:shadow-[0_0_16px_rgba(0,255,136,0.25)] transition-[border-color,box-shadow] duration-150 px-3 py-2.5">
                <span className="font-mono text-[13px] text-brand select-none leading-none" aria-hidden>
                  &gt;
                </span>
                <Search className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                <input
                  type="text"
                  placeholder={
                    activeTab === "teams"
                      ? "grep teams by name or code (esc to clear)"
                      : "grep operators by name or org (esc to clear)"
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setSearchQuery("");
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      // Flush the 500ms debounce immediately
                      setDebouncedSearchQuery(searchQuery);
                    }
                  }}
                  className="flex-1 bg-transparent border-0 outline-none font-mono text-[13px] text-ink placeholder:text-ink-disabled placeholder:font-mono"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted hover:text-brand transition-colors px-1.5 py-1 rounded"
                  >
                    esc
                  </button>
                )}
              </div>

              {/* Tab content */}
              {activeTab === "teams" && !isTeamLead ? (
                <div>
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-[60px] gap-3">
                      <Spinner size="md" />
                      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
                        Scanning rosters<span className="anim-blink">_</span>
                      </div>
                    </div>
                  ) : teamsLookingForMembers.length === 0 ? (
                    <div className="rounded-md border border-dashed border-[var(--border-soft)] bg-surface-1/40 py-[56px] px-6 text-center">
                      <div className="inline-flex w-10 h-10 items-center justify-center rounded-md bg-surface-2 border border-[var(--border-default)] mb-3">
                        <Users className="w-4 h-4 text-ink-muted" />
                      </div>
                      <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-muted mb-1.5">
                        {searchQuery.trim() ? "// no match" : "// quiet on the wire"}
                      </div>
                      <p className="text-[13px] text-ink-secondary font-body max-w-[40ch] mx-auto leading-relaxed">
                        {searchQuery.trim()
                          ? `No teams match "${searchQuery.trim()}". Try a shorter query or clear the filter.`
                          : "No open rosters right now. Check back later, or switch to the Operators tab and recruit yourself in."}
                      </p>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-2.5">
                      {teamsLookingForMembers.map((team) => {
                        const req = userRequests[team.teamCode];
                        const initials = (team.teamName || "?")
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((w) => w[0]?.toUpperCase())
                          .join("");
                        const pct = Math.min(
                          100,
                          Math.round((team.currentMembers / team.maxMembers) * 100),
                        );
                        return (
                          <li key={team.teamCode}>
                            <button
                              type="button"
                              onClick={() => handleTeamClick(team.teamCode)}
                              className="group w-full text-left rounded-md bg-surface-1 border border-[var(--border-soft)] hover:border-brand/40 hover:bg-surface-2 transition-[background,border-color] duration-150 p-3 sm:p-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                            >
                              <div className="flex items-center gap-3 sm:gap-3.5">
                                {/* Team mark */}
                                <span className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 inline-flex items-center justify-center rounded-md bg-brand-soft border border-brand/35 font-mono text-[12px] font-bold text-brand">
                                  {initials || <Users className="w-4 h-4" />}
                                </span>

                                {/* Identity + meta */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-[14px] sm:text-[14.5px] font-semibold text-ink font-body truncate leading-tight">
                                      {team.teamName}
                                    </h3>
                                    {req === "pending" && (
                                      <span className="inline-flex items-center font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--warning)] bg-[var(--warning-soft)] border border-[var(--warning)]/40 px-1.5 py-0.5 rounded">
                                        Request Sent
                                      </span>
                                    )}
                                    {req === "accepted" && (
                                      <span className="inline-flex items-center font-mono text-[9.5px] uppercase tracking-[0.18em] text-brand bg-brand-soft border border-brand/40 px-1.5 py-0.5 rounded">
                                        Accepted
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 flex items-center gap-2 text-[11.5px] text-ink-muted font-mono">
                                    <span className="text-brand">{team.teamCode}</span>
                                    <span className="text-ink-subtle">·</span>
                                    <span>
                                      {team.currentMembers}/{team.maxMembers} members
                                    </span>
                                  </div>
                                </div>

                                {/* Capacity meter + chevron */}
                                <div className="hidden sm:flex shrink-0 items-center gap-3">
                                  <div className="w-16 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-brand to-brand-hover transition-all duration-500"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="inline-flex items-center font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted group-hover:text-brand transition-colors">
                                    view
                                    <ExternalLink className="w-3 h-3 ml-1" />
                                  </span>
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {/* Teams Pagination. terminal style */}
                  {teamsLookingForMembers.length > 0 &&
                    teamsPagination.totalPages > 1 && (
                      <div className="flex items-center justify-between gap-3 mt-5 pt-4">
                        <button
                          type="button"
                          onClick={() =>
                            setTeamsPage((prev) => Math.max(1, prev - 1))
                          }
                          disabled={teamsPage <= 1 || isLoading}
                          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-secondary hover:text-brand disabled:opacity-30 disabled:hover:text-ink-secondary disabled:cursor-not-allowed transition-colors px-2 py-1.5 rounded"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          prev
                        </button>
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-muted">
                          &gt; page <span className="text-brand">{String(teamsPage).padStart(2, "0")}</span>{" "}
                          / {String(teamsPagination.totalPages).padStart(2, "0")}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setTeamsPage((prev) =>
                              Math.min(teamsPagination.totalPages, prev + 1),
                            )
                          }
                          disabled={
                            teamsPage >= teamsPagination.totalPages || isLoading
                          }
                          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-secondary hover:text-brand disabled:opacity-30 disabled:hover:text-ink-secondary disabled:cursor-not-allowed transition-colors px-2 py-1.5 rounded"
                        >
                          next
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                </div>
              ) : (
                <div>
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-[60px] gap-3">
                      <Spinner size="md" />
                      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
                        Pinging operators<span className="anim-blink">_</span>
                      </div>
                    </div>
                  ) : participantsLookingForTeams.length === 0 ? (
                    <div className="rounded-md border border-dashed border-[var(--border-soft)] bg-surface-1/40 py-[56px] px-6 text-center">
                      <div className="inline-flex w-10 h-10 items-center justify-center rounded-md bg-surface-2 border border-[var(--border-default)] mb-3">
                        <User className="w-4 h-4 text-ink-muted" />
                      </div>
                      <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-muted mb-1.5">
                        {searchQuery.trim() ? "// no match" : "// the network is empty"}
                      </div>
                      <p className="text-[13px] text-ink-secondary font-body max-w-[42ch] mx-auto leading-relaxed">
                        {searchQuery.trim()
                          ? `No operators match "${searchQuery.trim()}". Try a different query.`
                          : isTeamLead
                            ? "No solo operators on the wire yet. Check back soon, or share the registration link."
                            : "No solo operators looking right now. Toggle your profile public and you might be the first."}
                      </p>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-2.5">
                      {participantsLookingForTeams.map((participant) => {
                        const initials = (participant.name || "?")
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((w) => w[0]?.toUpperCase())
                          .join("");
                        const invited = sentInvites.has(participant.id);
                        return (
                          <li key={participant.id}>
                            <button
                              type="button"
                              onClick={() => handleUserClick(participant.id)}
                              className="group w-full text-left rounded-md bg-surface-1 border border-[var(--border-soft)] hover:border-brand/40 hover:bg-surface-2 transition-[background,border-color] duration-150 p-3 sm:p-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                            >
                              <div className="flex items-center gap-3 sm:gap-3.5">
                                {/* Avatar */}
                                {participant.profile_picture ? (
                                  <img
                                    src={participant.profile_picture}
                                    alt={participant.name}
                                    className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-md object-cover border border-[var(--border-default)]"
                                  />
                                ) : (
                                  <span className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 inline-flex items-center justify-center rounded-md bg-surface-2 border border-[var(--border-default)] font-mono text-[12px] font-bold text-ink">
                                    {initials || <User className="w-4 h-4 text-ink-muted" />}
                                  </span>
                                )}

                                {/* Identity + meta */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-[14px] sm:text-[14.5px] font-semibold text-ink font-body truncate leading-tight">
                                      {participant.name}
                                    </h3>
                                    {invited && (
                                      <span className="inline-flex items-center font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--warning)] bg-[var(--warning-soft)] border border-[var(--warning)]/40 px-1.5 py-0.5 rounded">
                                        Invited
                                      </span>
                                    )}
                                    {!participant.hasSolvedChallenge && (
                                      <span
                                        title="Hasn't captured the warm-up flag yet"
                                        className="inline-flex items-center font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-muted bg-white/[0.04] border border-[var(--border-soft)] px-1.5 py-0.5 rounded"
                                      >
                                        no flag
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-ink-muted font-mono truncate">
                                    {participant.university ? (
                                      <span className="truncate">{participant.university}</span>
                                    ) : (
                                      <span className="text-ink-subtle">no org listed</span>
                                    )}
                                  </div>
                                  {participant.bio && (
                                    <p className="mt-1.5 text-[12.5px] text-ink-secondary font-body leading-snug line-clamp-2">
                                      {participant.bio}
                                    </p>
                                  )}
                                </div>

                                {/* Social cluster + chevron */}
                                <div
                                  className="hidden sm:flex shrink-0 items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {participant.github_link && (
                                    <a
                                      href={participant.github_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      aria-label="GitHub Profile"
                                      className="inline-flex w-8 h-8 items-center justify-center rounded-md text-ink-muted hover:text-ink hover:bg-white/[0.04] transition-colors"
                                    >
                                      <Github className="w-4 h-4" />
                                    </a>
                                  )}
                                  {participant.linkedin_link && (
                                    <a
                                      href={participant.linkedin_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      aria-label="LinkedIn Profile"
                                      className="inline-flex w-8 h-8 items-center justify-center rounded-md text-ink-muted hover:text-ink hover:bg-white/[0.04] transition-colors"
                                    >
                                      <Linkedin className="w-4 h-4" />
                                    </a>
                                  )}
                                  <span className="ml-1 inline-flex items-center font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted group-hover:text-brand transition-colors">
                                    view
                                    <ExternalLink className="w-3 h-3 ml-1" />
                                  </span>
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {/* Participants Pagination. terminal style */}
                  {participantsLookingForTeams.length > 0 &&
                    participantsPagination.totalPages > 1 && (
                      <div className="flex items-center justify-between gap-3 mt-5 pt-4">
                        <button
                          type="button"
                          onClick={() =>
                            setParticipantsPage((prev) =>
                              Math.max(1, prev - 1),
                            )
                          }
                          disabled={participantsPage <= 1 || isLoading}
                          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-secondary hover:text-brand disabled:opacity-30 disabled:hover:text-ink-secondary disabled:cursor-not-allowed transition-colors px-2 py-1.5 rounded"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          prev
                        </button>
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-muted">
                          &gt; page{" "}
                          <span className="text-brand">
                            {String(participantsPage).padStart(2, "0")}
                          </span>{" "}
                          /{" "}
                          {String(participantsPagination.totalPages).padStart(2, "0")}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setParticipantsPage((prev) =>
                              Math.min(
                                participantsPagination.totalPages,
                                prev + 1,
                              ),
                            )
                          }
                          disabled={
                            participantsPage >=
                            participantsPagination.totalPages || isLoading
                          }
                          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-secondary hover:text-brand disabled:opacity-30 disabled:hover:text-ink-secondary disabled:cursor-not-allowed transition-colors px-2 py-1.5 rounded"
                        >
                          next
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                </div>
              )}

              {/* Team Details Modal */}
              <TeamDetailsModal
                isOpen={!!selectedTeamCode}
                onClose={handleCloseTeamModal}
                teamDetails={teamDetails}
                isLoading={isLoadingTeam}
                error={teamError}
                onMemberClick={(userId: string) => handleUserClick(userId)}
                requestStatus={
                  selectedTeamCode ? userRequests[selectedTeamCode] : undefined
                }
                onSendRequest={
                  selectedTeamCode
                    ? () => handleSendRequest(selectedTeamCode)
                    : undefined
                }
                isSendingRequest={
                  selectedTeamCode ? sendingRequest === selectedTeamCode : false
                }
              />

              {/* User Details Modal */}
              <UserProfileModal
                isOpen={!!selectedUserId}
                onClose={handleCloseUserModal}
                userDetails={userDetails}
                isLoading={isLoadingUser}
                onInvite={handleInviteUser}
                isInviting={
                  userDetails ? invitingUser === userDetails.uid : false
                }
                isInvited={
                  userDetails ? sentInvites.has(userDetails.uid) : false
                }
                canInvite={
                  isTeamLead &&
                  (!teamCapacity || teamCapacity.current < teamCapacity.max)
                }
                showCreateTeamHint={!user?.teamCode}
                error={userError}
                openResumeInNewTab
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
