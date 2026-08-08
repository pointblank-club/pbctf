"use client";

import { HudFrame } from "./hud-frame";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { API_ENDPOINTS } from "@/lib/api-config";
import {
  Home,
  Users,
  X,
  Award,
  Check,
  UserPlus,
  Trash2,
  User,
  Copy,
  KeyRound,
  Terminal,
  Inbox,
  Send,
  ShieldAlert,
  Radar,
  Hash,
  LogOut,
  Mail,
  ArrowRight,
  Crown,
} from "lucide-react";
import { FormSection } from "./form-section";
import { FormInput } from "./form-input";
import { Button } from "./button";
import { StatusBadge } from "./status-badge";
import { AlertBanner } from "./alert-banner";
import { UserProfileModal, UserDetails } from "./user-profile-modal";
import { TransferOwnershipModal } from "./transfer-ownership-modal";
import { SectionTab } from "./section-tab";
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
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";

interface TeamMember {
  uid: string;
  name: string;
  email?: string;
  role: string;
}

interface Team {
  id: string;
  name: string;
  code: string;
  leadId: string;
  members: string[];
  teamMembers?: TeamMember[];
  lookingForMembers: boolean;
  status:
    | "none"
    | "active"
    | "submitted"
    | "under-review"
    | "shortlisted"
    | "confirmed"
    | "declined"
    | "withdrawn";
}

export function TeamContainer() {
  const { user, isAuthenticated, getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [team, setTeam] = useState<Team | null>(null);
  const [teamFormData, setTeamFormData] = useState({
    teamName: "",
    lookingForMembers: false,
    joinCode: "",
  });

  // Read joinCode from URL query params
  useEffect(() => {
    const joinCodeFromUrl = searchParams.get("joinCode");
    if (joinCodeFromUrl) {
      setTeamFormData((prev) => ({
        ...prev,
        joinCode: joinCodeFromUrl.toUpperCase(),
      }));
    }
  }, [searchParams]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // User details modal state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  // Confirmation dialog state
  const [deleteTeamDialogOpen, setDeleteTeamDialogOpen] = useState(false);
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
  const [leaveTeamDialogOpen, setLeaveTeamDialogOpen] = useState(false);
  const [transferLeadDialogOpen, setTransferLeadDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Tabbed UI state for Create/Join
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");

  // Copy state for team code
  const [copied, setCopied] = useState(false);

  // Collapsible requests state
  const [requestsExpanded, setRequestsExpanded] = useState(false);

  // Cancel-invite state. mirrors the `respondingTo` pattern in dashboard-container,
  // but scoped to outbound invites a team lead is revoking.
  const [cancellingInviteId, setCancellingInviteId] = useState<string | null>(null);
  const [inviteToCancel, setInviteToCancel] = useState<{
    requestId: string;
    userName: string;
    userEmail: string;
  } | null>(null);
  const [cancelInviteDialogOpen, setCancelInviteDialogOpen] = useState(false);

  const { toast } = useToast();

  // Memoized filtered requests
  const incomingRequests = useMemo(
    () => joinRequests.filter((r) => r.type === "request"),
    [joinRequests],
  );
  const sentInvites = useMemo(
    () => joinRequests.filter((r) => r.type === "invite"),
    [joinRequests],
  );

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }

    const fetchTeamData = async () => {
      try {
        setIsLoading(true);
        const token = await getToken();
        if (!token) {
          setIsLoading(false);
          return;
        }

        const userResponse = await fetch(API_ENDPOINTS.userProfile, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          // Check for teamCode in the fresh profile data
          const teamCode = userData.success
            ? userData.data.teamCode
            : userData.teamCode;

          if (teamCode) {
            const teamResponse = await fetch(API_ENDPOINTS.getTeam(teamCode), {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });

            if (teamResponse.ok) {
              const teamData = await teamResponse.json();
              if (teamData.success && teamData.data) {
                const teamInfo = teamData.data;
                setTeam({
                  id: teamInfo.teamCode,
                  name: teamInfo.teamName,
                  code: teamInfo.teamCode,
                  leadId:
                    typeof teamInfo.teamLead === "string"
                      ? teamInfo.teamLead
                      : teamInfo.teamLead?.id || "",
                  members:
                    teamInfo.teamMembers?.map((m: any) => m.uid || m.id) || [],
                  teamMembers:
                    teamInfo.teamMembers?.map((m: any) => ({
                      uid: m.uid,
                      name: m.name,
                      email: m.email,
                      role: m.role || "Member",
                    })) || [],
                  lookingForMembers: teamInfo.isLooking || false,
                  status:
                    teamInfo.teamStatus === "pending"
                      ? "active"
                      : teamInfo.teamStatus === "submitted"
                        ? "submitted"
                        : teamInfo.teamStatus === "shortlisted"
                          ? "shortlisted"
                          : teamInfo.teamStatus === "rsvped"
                            ? "confirmed"
                            : teamInfo.teamStatus === "rsvp_declined"
                              ? "declined"
                              : teamInfo.teamStatus === "withdrawn"
                                ? "withdrawn"
                                : "active",
                });

                // Join requests will be fetched by useEffect when team state is set
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching team data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load team data. Please try again.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamData();
  }, [user, isAuthenticated, router, getToken]);

  // Fetch join requests function
  const fetchJoinRequests = useCallback(
    async (teamCode: string, token: string) => {
      try {
        setIsLoadingRequests(true);
        const response = await fetch(
          `${API_ENDPOINTS.joinRequest}?teamCode=${teamCode}&type=team`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setJoinRequests(data.data.requests || []);
          } else {
            setJoinRequests([]);
          }
        } else {
          setJoinRequests([]);
        }
      } catch (error) {
        console.error("Error fetching join requests:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load join requests.",
        });
        setJoinRequests([]);
      } finally {
        setIsLoadingRequests(false);
      }
    },
    [],
  );

  const handleCopyCode = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!team?.code) return;
    try {
      await navigator.clipboard.writeText(team.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy team code:", err);
    }
  };

  const handleDeleteTeam = async () => {
    if (!team || !user) return;

    try {
      const token = await getToken();
      if (!token) {
        setAlert({
          type: "error",
          message: "Authentication required",
        });
        return;
      }

      const response = await fetch(API_ENDPOINTS.deleteTeam, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamCode: team.code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete team");
      }

      toast({
        title: "Team deleted",
        description: "Team has been deleted successfully.",
      });

      // Clear team state and redirect to dashboard
      setTeam(null);
      setDeleteTeamDialogOpen(false);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (error) {
      console.error("Error deleting team:", error);
      toast({
        variant: "destructive",
        title: "Failed to delete team",
        description:
          error instanceof Error ? error.message : "Failed to delete team",
      });
      setDeleteTeamDialogOpen(false);
    }
  };

  const handleRemoveMemberClick = (memberId: string, memberName: string) => {
    setMemberToRemove({ id: memberId, name: memberName });
    setRemoveMemberDialogOpen(true);
  };

  const handleRemoveMember = async () => {
    if (!team || !user || !memberToRemove) return;

    try {
      const token = await getToken();
      if (!token) {
        setAlert({
          type: "error",
          message: "Authentication required",
        });
        return;
      }

      const response = await fetch(API_ENDPOINTS.removeMember, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamCode: team.code,
          memberId: memberToRemove.id,
          setTheirLookingStatus: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to remove member");
      }

      toast({
        title: "Member removed",
        description: `${memberToRemove.name} has been removed from the team`,
      });
      setRemoveMemberDialogOpen(false);
      setMemberToRemove(null);

      // Refresh team data
      const teamResponse = await fetch(API_ENDPOINTS.getTeam(team.code), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (teamResponse.ok) {
        const teamData = await teamResponse.json();
        if (teamData.success && teamData.data) {
          const teamInfo = teamData.data;
          setTeam({
            id: teamInfo.teamCode,
            name: teamInfo.teamName,
            code: teamInfo.teamCode,
            leadId:
              typeof teamInfo.teamLead === "string"
                ? teamInfo.teamLead
                : teamInfo.teamLead?.id || "",
            members: teamInfo.teamMembers?.map((m: any) => m.uid || m.id) || [],
            teamMembers:
              teamInfo.teamMembers?.map((m: any) => ({
                uid: m.uid,
                name: m.name,
                email: m.email,
                role: m.role || "Member",
              })) || [],
            lookingForMembers: teamInfo.isLooking || false,
            status:
              teamInfo.teamStatus === "pending"
                ? "active"
                : teamInfo.teamStatus === "submitted"
                  ? "submitted"
                  : teamInfo.teamStatus === "shortlisted"
                    ? "shortlisted"
                    : teamInfo.teamStatus === "rsvped"
                      ? "confirmed"
                      : teamInfo.teamStatus === "rsvp_declined"
                        ? "declined"
                        : teamInfo.teamStatus === "withdrawn"
                          ? "withdrawn"
                          : "active",
          });
        }
      }
    } catch (error) {
      console.error("Error removing member:", error);
      setAlert({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to remove member",
      });
      setTimeout(() => setAlert(null), 3000);
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
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamCode: team.code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to leave team");
      }

      toast({
        title: "Left team",
        description: "You have successfully left the team",
      });
      setLeaveTeamDialogOpen(false);
      setTeam(null);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (error) {
      console.error("Error leaving team:", error);
      toast({
        variant: "destructive",
        title: "Failed to leave team",
        description:
          error instanceof Error ? error.message : "Failed to leave team",
      });
      setLeaveTeamDialogOpen(false);
    }
  };

  const handleTransferLead = async (newLeadId: string) => {
    if (!team || !user) return;
    try {
      const token = await getToken();
      if (!token) {
        toast({
          variant: "destructive",
          title: "Authentication required",
          description: "Please log in again to transfer the lead role.",
        });
        return;
      }

      const response = await fetch("/pbctf/api/team/transfer-ownership", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamCode: team.code,
          newLeadId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to transfer ownership");
      }

      toast({
        title: "Lead transferred",
        description: "The other operator is now the team lead.",
      });
      setTransferLeadDialogOpen(false);

      // Refresh team state to reflect the new lead
      const teamResponse = await fetch(API_ENDPOINTS.getTeam(team.code), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (teamResponse.ok) {
        const teamData = await teamResponse.json();
        if (teamData.success && teamData.data) {
          const teamInfo = teamData.data;
          setTeam({
            id: teamInfo.teamCode,
            name: teamInfo.teamName,
            code: teamInfo.teamCode,
            leadId:
              typeof teamInfo.teamLead === "string"
                ? teamInfo.teamLead
                : teamInfo.teamLead?.id || "",
            members:
              teamInfo.teamMembers?.map((m: any) => m.uid || m.id) || [],
            teamMembers:
              teamInfo.teamMembers?.map((m: any) => ({
                uid: m.uid,
                name: m.name,
                email: m.email,
                role: m.role || "Member",
              })) || [],
            lookingForMembers: teamInfo.isLooking || false,
            status:
              teamInfo.teamStatus === "pending"
                ? "active"
                : teamInfo.teamStatus === "submitted"
                  ? "submitted"
                  : teamInfo.teamStatus === "shortlisted"
                    ? "shortlisted"
                    : teamInfo.teamStatus === "rsvped"
                      ? "confirmed"
                      : teamInfo.teamStatus === "rsvp_declined"
                        ? "declined"
                        : teamInfo.teamStatus === "withdrawn"
                          ? "withdrawn"
                          : "active",
          });
        }
      }
    } catch (error) {
      console.error("Error transferring lead:", error);
      toast({
        variant: "destructive",
        title: "Failed to transfer",
        description:
          error instanceof Error ? error.message : "Failed to transfer ownership",
      });
      setTransferLeadDialogOpen(false);
    }
  };

  const handleUserClick = async (userId: string) => {
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

  const handleRespondToRequest = async (
    requestId: string,
    action: "accept" | "decline",
  ) => {
    if (!team) return;

    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(
        API_ENDPOINTS.respondToJoinRequest(requestId),
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Failed to ${action} request`);
      }
      toast({
        title: action === "accept" ? "Success" : "Rejected",
       description: `Request ${action === "decline" ? "declined" : "accepted"} successfully`,
        variant: action === "accept" ? "default" : "destructive",
      });

      // Refresh team data and requests
      if (team.code) {
        const teamResponse = await fetch(API_ENDPOINTS.getTeam(team.code), {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (teamResponse.ok) {
          const teamData = await teamResponse.json();
          if (teamData.success && teamData.data) {
            const teamInfo = teamData.data;
            setTeam({
              id: teamInfo.teamCode,
              name: teamInfo.teamName,
              code: teamInfo.teamCode,
              leadId:
                typeof teamInfo.teamLead === "string"
                  ? teamInfo.teamLead
                  : teamInfo.teamLead?.id || "",
              members:
                teamInfo.teamMembers?.map((m: any) => m.uid || m.id) || [],
              teamMembers:
                teamInfo.teamMembers?.map((m: any) => ({
                  uid: m.uid,
                  name: m.name,
                  email: m.email,
                  role: m.role || "Member",
                })) || [],
              lookingForMembers: teamInfo.isLooking || false,
              status:
                teamInfo.teamStatus === "pending"
                  ? "active"
                  : teamInfo.teamStatus === "submitted"
                    ? "submitted"
                    : teamInfo.teamStatus === "shortlisted"
                      ? "shortlisted"
                      : teamInfo.teamStatus === "rsvped"
                        ? "confirmed"
                        : teamInfo.teamStatus === "rsvp_declined"
                          ? "declined"
                          : teamInfo.teamStatus === "withdrawn"
                            ? "withdrawn"
                            : "active",
            });
          }
        }

        // Refresh join requests
        await fetchJoinRequests(team.code, token);
      }
    } catch (error) {
      console.error("Error responding to request:", error);
      setAlert({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : `Failed to ${action} request`,
      });
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const handleCancelInviteClick = (
    requestId: string,
    userName: string,
    userEmail: string,
  ) => {
    setInviteToCancel({ requestId, userName, userEmail });
    setCancelInviteDialogOpen(true);
  };

  const confirmCancelInvite = async () => {
    if (!team || !inviteToCancel) return;
    if (cancellingInviteId) return; // already in flight

    const { requestId } = inviteToCancel;
    setCancellingInviteId(requestId);

    try {
      const token = await getToken();
      if (!token) {
        toast({
          variant: "destructive",
          title: "Authentication required",
          description: "Please log in again to cancel the invite",
        });
        return;
      }

      const response = await fetch(API_ENDPOINTS.cancelInvite(requestId), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to cancel invitation");
      }

      // Optimistically drop the row, then refresh from the server.
      setJoinRequests((prev) =>
        prev.filter((r) => r.requestId !== requestId),
      );

      toast({
        title: "Invitation cancelled",
        description: `Invite to ${inviteToCancel.userName} has been revoked.`,
      });

      if (team.code) {
        await fetchJoinRequests(team.code, token);
      }
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      toast({
        variant: "destructive",
        title: "Failed to cancel invite",
        description:
          error instanceof Error
            ? error.message
            : "Failed to cancel invitation",
      });
      // If the invite was already accepted/declined elsewhere, refresh the
      // list so the stale pending row disappears.
      const token = await getToken().catch(() => null);
      if (token && team.code) {
        await fetchJoinRequests(team.code, token);
      }
    } finally {
      setCancellingInviteId(null);
      setCancelInviteDialogOpen(false);
      setInviteToCancel(null);
    }
  };

  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  const sendInvite = async (email: string) => {
    if (!team) return;
    setIsInviting(true);
    setAlert(null);

    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(API_ENDPOINTS.joinRequest, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamCode: team.code,
          type: "invite",
          email: email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send invitation");
      }

      toast({
        title: "Invitation sent",
        description: "Invitation sent successfully!",
      });
      setInviteEmail("");

      // Refresh requests
      fetchJoinRequests(team.code, token);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to invite user",
        description:
          error instanceof Error ? error.message : "Failed to invite user",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendInvite(inviteEmail);
  };

  const handleToggleLookingForMembers = async (value: boolean) => {
    if (!team) return;

    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(API_ENDPOINTS.lookingForMembers, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamCode: team.code,
          isLooking: value,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update setting");
      }

      setTeam({ ...team, lookingForMembers: value });
      toast({
        title: value ? "Team visible in Discover" : "Team hidden from Discover",
        description: value
          ? "Other participants can now find and request to join your team"
          : "Your team is now hidden from the Discover section",
      });
    } catch (error) {
      console.error("Error toggling looking for members:", error);
      toast({
        variant: "destructive",
        title: "Failed to update",
        description:
          error instanceof Error ? error.message : "Could not update setting",
      });
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAlert(null);

    try {
      const token = await getToken();

      // Call API to create team
      const payload = {
        teamName: teamFormData.teamName,
        isLooking: teamFormData.lookingForMembers,
      };

      const response = await fetch(API_ENDPOINTS.createTeam, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create team");
      }

      if (data.success && data.data) {
        const teamCode = data.data.teamCode;

        const mapTeamShape = (teamInfo: any) => ({
          id: teamInfo.teamCode,
          name: teamInfo.teamName,
          code: teamInfo.teamCode,
          leadId:
            typeof teamInfo.teamLead === "string"
              ? teamInfo.teamLead
              : teamInfo.teamLead?.id || "",
          members:
            teamInfo.teamMembers?.map((m: any) => m.uid || m.id) || [],
          teamMembers:
            teamInfo.teamMembers?.map((m: any) => ({
              uid: m.uid,
              name: m.name,
              email: m.email,
              role: m.role || "Member",
            })) || [],
          lookingForMembers: teamInfo.isLooking || false,
          status:
            teamInfo.teamStatus === "pending"
              ? ("active" as const)
              : teamInfo.teamStatus === "submitted"
                ? ("submitted" as const)
                : teamInfo.teamStatus === "shortlisted"
                  ? ("shortlisted" as const)
                  : teamInfo.teamStatus === "rsvped"
                    ? ("confirmed" as const)
                    : teamInfo.teamStatus === "rsvp_declined"
                      ? ("declined" as const)
                      : teamInfo.teamStatus === "withdrawn"
                        ? ("withdrawn" as const)
                        : ("active" as const),
        });

        // Set team state from the creation response immediately so the UI
        // flips into the team-management view even if the secondary fetch fails.
        setTeam(mapTeamShape(data.data));

        setAlert({
          type: "success",
          message: `Team "${data.data.teamName}" created! Team code: ${data.data.teamCode}`,
        });
        setTimeout(() => setAlert(null), 5000);

        // Best-effort refresh with the canonical shape (full member details, etc.).
        try {
          const teamResponse = await fetch(API_ENDPOINTS.getTeam(teamCode), {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          if (teamResponse.ok) {
            const teamData = await teamResponse.json();
            if (teamData.success && teamData.data) {
              setTeam(mapTeamShape(teamData.data));
            }
          }
        } catch {
          // ignore -- UI already shows the created team from the create response
        }
      }
    } catch (error) {
      setAlert({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to create team",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAlert(null);

    try {
      const token = await getToken();

      // Call API to join team
      const response = await fetch(API_ENDPOINTS.joinTeam, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamCode: teamFormData.joinCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to join team");
      }

      if (data.success && data.data) {
        const joinedTeamCode = data.data.teamCode;

        // Mapper used by both the immediate set (from the join response)
        // and the optional refresh below.
        const mapTeamShape = (teamInfo: any) => ({
          id: teamInfo.teamCode,
          name: teamInfo.teamName,
          code: teamInfo.teamCode,
          leadId:
            typeof teamInfo.teamLead === "string"
              ? teamInfo.teamLead
              : teamInfo.teamLead?.id || "",
          members:
            teamInfo.teamMembers?.map((m: any) => m.uid || m.id) || [],
          teamMembers:
            teamInfo.teamMembers?.map((m: any) => ({
              uid: m.uid,
              name: m.name,
              email: m.email,
              role: m.role || "Member",
            })) || [],
          lookingForMembers: teamInfo.isLooking || false,
          status:
            teamInfo.teamStatus === "pending"
              ? ("active" as const)
              : teamInfo.teamStatus === "submitted"
                ? ("submitted" as const)
                : teamInfo.teamStatus === "shortlisted"
                  ? ("shortlisted" as const)
                  : teamInfo.teamStatus === "rsvped"
                    ? ("confirmed" as const)
                    : teamInfo.teamStatus === "rsvp_declined"
                      ? ("declined" as const)
                      : teamInfo.teamStatus === "withdrawn"
                        ? ("withdrawn" as const)
                        : ("active" as const),
        });

        // CRITICAL: flip into team-management view immediately from the
        // join response. The earlier two-step flow left the UI stuck on the
        // join form whenever the second fetch (getTeam) failed.
        setTeam(mapTeamShape(data.data));

        setAlert({
          type: "success",
          message: `Joined team "${data.data.teamName}"!`,
        });
        setTimeout(() => setAlert(null), 3000);

        // Best-effort refresh with the canonical shape (full member details,
        // etc.). If this errors, we silently keep the join response shape.
        try {
          const teamResponse = await fetch(
            API_ENDPOINTS.getTeam(joinedTeamCode),
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
              setTeam(mapTeamShape(teamData.data));
            }
          }
        } catch {
          // ignore -- UI already shows the joined team from the join response
        }
      }
    } catch (error) {
      setAlert({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to join team",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch join requests when team changes and user is team lead
  useEffect(() => {
    const loadJoinRequests = async () => {
      if (team && team.leadId === user?.uid && team.code) {
        const token = await getToken();
        if (token) {
          await fetchJoinRequests(team.code, token);
        }
      } else {
        setJoinRequests([]);
        setIsLoadingRequests(false);
      }
    };

    loadJoinRequests();
  }, [team?.code, team?.leadId, user?.uid, getToken, fetchJoinRequests]);

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Spinner size="lg" />
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-brand opacity-70">
          &gt; loading_roster<span className="anim-blink">_</span>
        </div>
      </div>
    );
  }

  const isLead = team ? team.leadId === user.uid : false;
  const locked =
    team &&
    (team.status === "submitted" ||
      team.status === "shortlisted" ||
      team.status === "confirmed");

  return (
    <div className="flex flex-col gap-6 w-full max-w-[760px] mx-auto">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-brand opacity-80">
            PBCTF 5.0 // {team ? "ROSTER" : "ENLIST"}
          </div>
          <h1 className="font-heading text-[32px] sm:text-[40px] font-bold text-ink tracking-tight leading-[1.05]">
            {team ? team.name : "Assemble your squad"}
          </h1>
          <p className="font-mono text-[11px] text-ink-muted">
            {team
              ? <>&gt; operating as <span className="text-brand">{isLead ? "team_lead" : "member"}</span></>
              : <>&gt; spin up a new crew or join one with a code</>}
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard")} variant="secondary" size="sm">
          <Home className="w-3.5 h-3.5" />
          Dashboard
        </Button>
      </div>

      {alert && <AlertBanner type={alert.type} message={alert.message} />}

      {!team ? (
        <>
          {/* Tab Navigation. using SectionTab atom */}
          <div className="flex gap-2 flex-wrap" role="tablist" aria-label="Team entry">
            <SectionTab
              active={activeTab === "create"}
              onClick={() => setActiveTab("create")}
              icon={Terminal}
              label="Spin up team"
            />
            <SectionTab
              active={activeTab === "join"}
              onClick={() => setActiveTab("join")}
              icon={KeyRound}
              label="Join with code"
            />
          </div>

          {/* Create Team Form */}
          {activeTab === "create" && (
            <FormSection
              title="Initialize new team"
              eyebrow="// CREATE_TEAM"
            >
              <form
                onSubmit={handleCreateTeam}
                className="flex flex-col gap-5"
              >
                <FormInput
                  label="Team callsign"
                  placeholder="e.g, zero-day-syndicate"
                  required
                  value={teamFormData.teamName}
                  onChange={(e) =>
                    setTeamFormData({
                      ...teamFormData,
                      teamName: e.target.value,
                    })
                  }
                />
                <div className="flex flex-col gap-2 p-4 rounded-md border border-[var(--border-soft)] bg-surface-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Radar className="w-4 h-4 text-brand shrink-0" />
                      <label
                        htmlFor="lookingForMembers"
                        className="text-[14px] font-semibold text-ink cursor-pointer truncate"
                      >
                        Broadcast on Discover
                      </label>
                    </div>
                    <Switch
                      id="lookingForMembers"
                      checked={teamFormData.lookingForMembers}
                      onCheckedChange={(checked) =>
                        setTeamFormData({
                          ...teamFormData,
                          lookingForMembers: checked,
                        })
                      }
                      className="data-[state=checked]:bg-brand border-brand"
                    />
                  </div>
                  <p className="text-[12.5px] text-ink-secondary pl-7">
                    Surfaces your team in the Discover feed so solo operators can request to join.
                  </p>
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Spinner size="sm" className="mr-2" />
                  ) : (
                    <Terminal className="w-4 h-4" />
                  )}
                  {isSubmitting ? "Initializing..." : "Initialize team"}
                </Button>

                {/* Secondary inline join. saves the user from switching tabs */}
                <div className="pt-3">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-muted mb-2">
                    &gt; already invited?
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("join")}
                    className="inline-flex items-center gap-1.5 text-[13px] text-brand hover:text-brand-hover transition-colors group"
                  >
                    Join an existing team with a 6-digit code
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </form>
            </FormSection>
          )}

          {/* Join Team Form */}
          {activeTab === "join" && (
            <FormSection
              title="Join with team code"
              eyebrow="// JOIN_TEAM"
            >
              <form
                onSubmit={handleJoinTeam}
                className="flex flex-col gap-5"
              >
                <FormInput
                  label="6-digit team code"
                  placeholder="XXXXXX"
                  required
                  value={teamFormData.joinCode}
                  onChange={(e) =>
                    setTeamFormData({
                      ...teamFormData,
                      joinCode: e.target.value.toUpperCase(),
                    })
                  }
                />
                <div className="flex items-start gap-2 p-3 rounded-md border border-[var(--border-soft)] bg-surface-2">
                  <KeyRound className="w-3.5 h-3.5 text-brand mt-0.5 shrink-0" />
                  <p className="text-[12.5px] text-ink-secondary">
                    Ask your team lead for the code. Codes are case-insensitive.
                  </p>
                </div>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting && <Spinner size="sm" className="mr-2" />}
                  {isSubmitting ? "Authenticating..." : "Join team"}
                </Button>

                <div className="pt-3">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-muted mb-2">
                    &gt; no code?
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("create")}
                    className="inline-flex items-center gap-1.5 text-[13px] text-brand hover:text-brand-hover transition-colors group"
                  >
                    Spin up your own team instead
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </form>
            </FormSection>
          )}
        </>
      ) : (
        <>
          {/* HERO: Team identity */}
          <section className="relative rounded-lg border border-[var(--border-default)] bg-surface-1/90 shadow-card">
      <HudFrame cornerSize="md" intensity="strong" />
<div className="relative z-10 p-5 sm:p-6 flex flex-col gap-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand">
                    // TEAM_NODE
                  </div>
                  <h2 className="font-heading text-[24px] sm:text-[28px] font-semibold text-ink tracking-tight leading-tight">
                    {team.name}
                  </h2>
                </div>
                <StatusBadge
                  status={team.status}
                  icon={team.status === "shortlisted" ? Award : Users}
                />
              </div>

              {/* Code + Members grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Team code tile */}
                <div className="sm:col-span-2 flex items-center justify-between gap-3 p-3 rounded-md border border-[var(--border-soft)] bg-surface-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Hash className="w-3.5 h-3.5 text-brand shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-muted">
                        access code
                      </span>
                      <span className="font-mono text-[15px] text-ink tracking-[0.18em] truncate">
                        {team.code}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-sm border border-[var(--border-soft)] bg-surface-1 text-ink-secondary hover:text-brand hover:border-brand/40 transition-colors font-mono text-[10.5px] uppercase tracking-[0.16em]"
                    title="Copy team code"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3" />
                        copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        copy
                      </>
                    )}
                  </button>
                </div>

                {/* Roster count tile */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-md border border-[var(--border-soft)] bg-surface-2">
                  <div className="flex items-center gap-2.5">
                    <Users className="w-3.5 h-3.5 text-brand" />
                    <div className="flex flex-col">
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-muted">
                        roster
                      </span>
                      <span className="font-mono text-[15px] text-ink">
                        {(team.members || []).length}<span className="text-ink-muted">/2</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex -space-x-2">
                    {(team.teamMembers || []).slice(0, 3).map((member) => (
                      <div
                        key={member.uid}
                        className="w-7 h-7 rounded-full bg-surface-inset flex items-center justify-center text-[11px] font-semibold text-brand border border-brand/40"
                        title={member.name}
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {team.status === "shortlisted" && (
                <AlertBanner
                  type="success"
                  message="Your team has been shortlisted. Stand by for next steps."
                />
              )}
            </div>
          </section>

          {/* ROSTER */}
          {team.teamMembers && team.teamMembers.length > 0 && (
            <FormSection
              title="Roster"
              eyebrow="// MEMBERS"
              status={
                <div className="flex items-center gap-2">
                  {isLead && !locked && team.teamMembers.length > 1 && (
                    <Button
                      onClick={() => setTransferLeadDialogOpen(true)}
                      variant="secondary"
                      size="sm"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      Transfer lead
                    </Button>
                  )}
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-muted">
                    {team.teamMembers.length}/2 slots
                  </span>
                </div>
              }
            >
              <div className="flex flex-col gap-2">
                {team.teamMembers.map((member: TeamMember) => {
                  const memberIsLead = member.role === "Team Lead";
                  const isSelf = member.uid === user?.uid;
                  return (
                    <div
                      key={member.uid}
                      className="flex items-center justify-between gap-3 p-3 bg-surface-2 rounded-md border border-[var(--border-soft)] hover:border-brand/25 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-surface-inset border border-brand/30 flex items-center justify-center text-[13px] font-semibold text-brand shrink-0">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[14px] text-ink font-medium truncate">
                              {member.name}
                            </span>
                            {isSelf && (
                              <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-muted">
                                you
                              </span>
                            )}
                          </div>
                          {member.email && (
                            <span className="text-[12px] text-ink-muted truncate">
                              {member.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={[
                            "inline-flex items-center font-mono text-[9.5px] uppercase tracking-[0.18em] px-2 py-1 rounded-sm border",
                            memberIsLead
                              ? "bg-brand-soft text-brand border-brand/45"
                              : "bg-surface-1 text-ink-secondary border-[var(--border-soft)]",
                          ].join(" ")}
                        >
                          {memberIsLead ? "lead" : "member"}
                        </span>
                        {isLead && !isSelf && !locked && (
                          <Button
                            onClick={() =>
                              handleRemoveMemberClick(member.uid, member.name)
                            }
                            variant="ghost"
                            size="sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Empty slots. visual affordance */}
                {Array.from({
                  length: Math.max(0, 2 - team.teamMembers.length),
                }).map((_, i) => (
                  <div
                    key={`slot-${i}`}
                    className="flex items-center gap-3 p-3 rounded-md border border-dashed border-[var(--border-soft)] bg-surface-1/40"
                  >
                    <div className="w-9 h-9 rounded-full border border-dashed border-[var(--border-soft)] flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-ink-disabled" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] text-ink-subtle">Open slot</span>
                      <span className="font-mono text-[10.5px] text-ink-muted">
                        &gt; awaiting operator
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </FormSection>
          )}

          {/* LEAD CONTROLS: invite + discover toggle */}
          {isLead && (
            <>
              {/* Invite (only if room) */}
              {team.status === "active" && team.members.length < 2 && (
                <FormSection
                  title="Recruit operator"
                  eyebrow="// INVITE"
                >
                  <form
                    onSubmit={handleInviteMember}
                    className="flex flex-col sm:flex-row gap-3 sm:items-end"
                  >
                    <div className="flex-1 min-w-0">
                      <FormInput
                        label="Operator email"
                        placeholder="alex@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        type="email"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isInviting}
                    >
                      {isInviting ? (
                        <Spinner size="sm" className="mr-2" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      {isInviting ? "Sending..." : "Send invite"}
                    </Button>
                  </form>
                  <p className="font-mono text-[10.5px] text-ink-muted">
                    &gt; or share access code <span className="text-brand">{team.code}</span> directly.
                  </p>
                </FormSection>
              )}

              {/* Discover toggle */}
              <FormSection
                title="Discover visibility"
                eyebrow="// SIGNAL"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <Radar className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                    <div className="flex flex-col gap-1 min-w-0">
                      <label
                        htmlFor="teamLookingForMembers"
                        className={`text-[14px] font-semibold text-ink ${team.status === "active" ? "cursor-pointer" : "cursor-not-allowed"}`}
                      >
                        Broadcast as recruiting
                      </label>
                      <p
                        className={`text-[12.5px] text-ink-secondary ${team.status !== "active" ? "opacity-50" : ""}`}
                      >
                        When live, your team appears in the Discover feed for solo operators searching for a crew.
                      </p>
                      {team.status !== "active" && (
                        <p className="font-mono text-[10.5px] text-ink-muted mt-1">
                          &gt; locked. submission is {team.status}
                        </p>
                      )}
                    </div>
                  </div>
                  <Switch
                    id="teamLookingForMembers"
                    checked={team.lookingForMembers}
                    onCheckedChange={(checked) => {
                      if (team.status === "active") {
                        handleToggleLookingForMembers(checked);
                      }
                    }}
                    disabled={team.status !== "active"}
                    className="data-[state=checked]:bg-brand border-brand"
                  />
                </div>
              </FormSection>

              {/* Incoming Requests */}
              <FormSection
                title="Incoming requests"
                eyebrow="// INBOUND"
                status={
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-muted">
                    {incomingRequests.length} pending
                  </span>
                }
              >
                {isLoadingRequests ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-6">
                    <Spinner size="md" />
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-muted">
                      &gt; scanning inbox
                    </span>
                  </div>
                ) : incomingRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                    <Inbox className="w-6 h-6 text-ink-muted" />
                    <p className="text-[13px] text-ink-secondary">No inbound requests</p>
                    <p className="font-mono text-[10.5px] text-ink-muted">
                      &gt; toggle Discover on to attract operators
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {incomingRequests.map((request) => (
                      <div
                        key={request.requestId}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-surface-2 rounded-md border border-[var(--border-soft)]"
                      >
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-[14px] text-ink font-medium truncate">
                            {request.userName}
                          </span>
                          <span className="text-[12px] text-ink-muted truncate">
                            {request.userEmail}
                          </span>
                          <span className="font-mono text-[10.5px] text-ink-muted">
                            &gt; received {new Date(request.requestedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                          <Button
                            onClick={() => handleUserClick(request.userId)}
                            variant="secondary"
                            size="sm"
                          >
                            <User className="w-3.5 h-3.5" />
                            Profile
                          </Button>
                          <Button
                            onClick={() =>
                              handleRespondToRequest(request.requestId, "accept")
                            }
                            variant="primary"
                            size="sm"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Accept
                          </Button>
                          <Button
                            onClick={() =>
                              handleRespondToRequest(request.requestId, "decline")
                            }
                            variant="danger"
                            size="sm"
                          >
                            <X className="w-3.5 h-3.5" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </FormSection>

              {/* Sent Invitations */}
              <FormSection
                title="Sent invites"
                eyebrow="// OUTBOUND"
                status={
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-muted">
                    {sentInvites.length} pending
                  </span>
                }
              >
                {isLoadingRequests ? (
                  <div className="flex justify-center py-6">
                    <Spinner size="md" />
                  </div>
                ) : sentInvites.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                    <Send className="w-6 h-6 text-ink-muted" />
                    <p className="text-[13px] text-ink-secondary">No pending invitations</p>
                    <p className="font-mono text-[10.5px] text-ink-muted">
                      &gt; send one above to invite an operator
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {sentInvites.map((request) => {
                      const cancelling =
                        cancellingInviteId === request.requestId;
                      return (
                        <div
                          key={request.requestId}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-surface-2 rounded-md border border-[var(--border-soft)]"
                        >
                          <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <Mail className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                              <span className="text-[14px] text-ink font-medium truncate">
                                {request.userName}
                              </span>
                            </div>
                            <span className="text-[12px] text-ink-muted truncate pl-5">
                              {request.userEmail}
                            </span>
                            <span className="font-mono text-[10.5px] text-ink-muted pl-5">
                              &gt; sent {new Date(request.requestedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] px-2 py-1 rounded-sm bg-[var(--warning-soft)] border border-[var(--warning)]/40 text-[var(--warning)]">
                              pending
                            </span>
                            <Button
                              onClick={() =>
                                handleCancelInviteClick(
                                  request.requestId,
                                  request.userName,
                                  request.userEmail,
                                )
                              }
                              variant="danger"
                              size="sm"
                              disabled={!!cancellingInviteId}
                              aria-label={`Cancel invitation to ${request.userName}`}
                            >
                              {cancelling ? (
                                <Spinner size="sm" />
                              ) : (
                                <X className="w-3.5 h-3.5" />
                              )}
                              Cancel
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </FormSection>
            </>
          )}

          {/* DANGER ZONE */}
          {((isLead && !locked) || !isLead) && (
            <section className="relative rounded-lg border border-[var(--danger)]/35 bg-surface-1/90 shadow-card">
      <HudFrame cornerSize="md" intensity="strong" />
              <div className="relative z-10 p-5 sm:p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[var(--danger)]" />
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[var(--danger)]">
                    // DANGER_ZONE
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-md border border-[var(--danger)]/30 bg-[var(--danger-soft)]">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-[14px] text-ink font-medium">
                      {isLead ? "Disband team" : "Leave team"}
                    </span>
                    <span className="text-[12px] text-ink-secondary">
                      {isLead
                        ? "Permanently delete this team. All members will be ejected."
                        : "Exit this team. Your slot will open up immediately."}
                    </span>
                  </div>
                  {isLead && !locked ? (
                    <Button
                      onClick={() => setDeleteTeamDialogOpen(true)}
                      variant="danger"
                      size="sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Disband
                    </Button>
                  ) : !isLead ? (
                    <Button
                      onClick={() => setLeaveTeamDialogOpen(true)}
                      variant="danger"
                      size="sm"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Leave
                    </Button>
                  ) : null}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* User Details Modal */}
      <UserProfileModal
        isOpen={!!selectedUserId}
        onClose={handleCloseUserModal}
        userDetails={userDetails}
        isLoading={isLoadingUser}
        onInvite={() => {
          if (userDetails?.email) {
            setInviteEmail(userDetails.email);
            sendInvite(userDetails.email);
          }
        }}
        isInviting={
          userDetails ? isInviting && inviteEmail === userDetails.email : false
        }
        isInvited={false} // Team container doesn't track sent invites per user easily
        canInvite={false} // Invite logic is different in team container (by email)
        error={userError}
        openResumeInNewTab
      />

      {/* Delete Team Confirmation Dialog */}
      <AlertDialog
        open={deleteTeamDialogOpen}
        onOpenChange={setDeleteTeamDialogOpen}
      >
        <AlertDialogContent className="bg-surface-2 border-[var(--border-default)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-ink font-heading flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[var(--danger)]" />
              Disband team
            </AlertDialogTitle>
            <AlertDialogDescription className="text-ink-secondary">
              You're about to disband <span className="font-mono text-ink">{team?.name}</span>. This action is irreversible. every member will be ejected immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-ink">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTeam}
              className="bg-[var(--danger-soft)] hover:bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)]/40"
            >
              Confirm disband
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog
        open={removeMemberDialogOpen}
        onOpenChange={setRemoveMemberDialogOpen}
      >
        <AlertDialogContent className="bg-surface-2 border-[var(--border-default)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-ink font-heading flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-[var(--danger)]" />
              Eject operator
            </AlertDialogTitle>
            <AlertDialogDescription className="text-ink-secondary">
              Remove <span className="font-mono text-ink">{memberToRemove?.name}</span> from the roster? Their slot will reopen immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-ink">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-[var(--danger-soft)] hover:bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)]/40"
            >
              Eject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Team Confirmation Dialog */}
      <AlertDialog
        open={leaveTeamDialogOpen}
        onOpenChange={setLeaveTeamDialogOpen}
      >
        <AlertDialogContent className="bg-surface-2 border-[var(--border-default)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-ink font-heading flex items-center gap-2">
              <LogOut className="w-4 h-4 text-[var(--danger)]" />
              Leave team
            </AlertDialogTitle>
            <AlertDialogDescription className="text-ink-secondary">
              Exit <span className="font-mono text-ink">{team?.name}</span>? You'll lose access to its submission state and need a new code to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-ink">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveTeam}
              className="bg-[var(--danger-soft)] hover:bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)]/40"
            >
              Confirm exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invitation Confirmation Dialog */}
      <AlertDialog
        open={cancelInviteDialogOpen}
        onOpenChange={(open) => {
          // Block closing while the cancel request is in flight.
          if (!open && cancellingInviteId) return;
          setCancelInviteDialogOpen(open);
          if (!open) setInviteToCancel(null);
        }}
      >
        <AlertDialogContent className="bg-surface-2 border-[var(--border-default)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-ink font-heading flex items-center gap-2">
              <X className="w-4 h-4 text-[var(--danger)]" />
              Cancel invitation
            </AlertDialogTitle>
            <AlertDialogDescription className="text-ink-secondary">
              Revoke the pending invitation to{" "}
              <span className="font-mono text-ink">
                {inviteToCancel?.userName}
              </span>
              {inviteToCancel?.userEmail ? (
                <>
                  {" "}
                  (
                  <span className="font-mono text-ink">
                    {inviteToCancel.userEmail}
                  </span>
                  )
                </>
              ) : null}
              ? They won't be able to accept it after this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="text-ink"
              disabled={!!cancellingInviteId}
            >
              Keep invite
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Prevent the radix default close-on-click. confirmCancelInvite
                // closes the dialog itself on completion.
                e.preventDefault();
                confirmCancelInvite();
              }}
              disabled={!!cancellingInviteId}
              className="bg-[var(--danger-soft)] hover:bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)]/40"
            >
              {cancellingInviteId ? (
                <Spinner size="sm" className="mr-2" />
              ) : null}
              Cancel invite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Lead Modal */}
      {team && user && (
        <TransferOwnershipModal
          isOpen={transferLeadDialogOpen}
          onClose={() => setTransferLeadDialogOpen(false)}
          onConfirm={handleTransferLead}
          members={(team.teamMembers ?? []).map((m) => ({
            uid: m.uid,
            name: m.name,
            role: m.role,
          }))}
          currentUserId={user.uid}
        />
      )}
    </div>
  );
}
