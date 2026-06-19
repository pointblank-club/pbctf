/**
 * GET /api/me/bootstrap
 *
 * Aggregated read-only payload the dashboard needs on first render:
 *   - the user's team (if any), with formatted members & RSVPs
 *   - the user's RSVP summary
 *   - incoming team invites (type=user)
 *   - pending team-join requests (type=team). only if user is team lead
 *   - the dynamic warm-up flag value (same hash as /api/user/flag)
 *
 * Profile data is intentionally NOT returned here. The auth-provider already
 * fetches /api/user/profile and exposes it globally via context, so duplicating
 * it would mean two Mongo queries + two JSON payloads for the same data.
 *
 * Read-only. No side effects.
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/lib/middleware/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Team from "@/models/Team";
import TeamJoinRequest from "@/models/TeamJoinRequest";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FLAG_PREFIX = "pbctf";

function generateFlag(sessionId: string): string {
  if (!process.env.FLAG_SECRET) {
    throw new Error("FLAG_SECRET is not configured");
  }
  const hmac = crypto
    .createHmac("sha256", process.env.FLAG_SECRET)
    .update(sessionId)
    .digest("hex");
  return `${FLAG_PREFIX}{${hmac.slice(0, 24)}}`;
}

function isoIfDate(v: any) {
  return v instanceof Date ? v.toISOString() : (v ?? null);
}

export async function GET(request: NextRequest) {
  try {
    // ONE auth verify (was: 5x across the page's individual fetches)
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { message: authResult.error.message },
        { status: authResult.status },
      );
    }
    const uid = authResult.user.uid;

    // ONE Mongo connection (cached singleton via lib/db.ts)
    await dbConnect();

    // Phase 1: look up the user (canonical source for teamCode). Profile
    // fields are intentionally NOT projected. the auth-provider already
    // owns the full profile globally, and bootstrap shouldn't duplicate it.
    // Invites load in parallel since they don't depend on the user doc.
    const [user, userInvites] = await Promise.all([
      User.findOne({ uid }).select("uid teamCode"),
      TeamJoinRequest.find({ userId: uid }).sort({ requestedAt: -1 }),
    ]);

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Pre-compute the warm-up flag in parallel with everything else. If
    let flag: string | null = null;
    try {
      flag = generateFlag(uid);
    } catch (flagError) {
      console.error("bootstrap flag generation skipped:", flagError);
    }

    // Phase 2: anything that depends on the user's teamCode.
    let team: any = null;
    let teamRequests: any[] = [];
    let memberDetails: any[] = [];
    let isTeamLead = false;

    if (user.teamCode) {
      // Fetch the team; if user is the lead, also fetch pending join requests
      // for that team. Both queries are independent so they fire concurrently.
      const [teamDoc, leadJoinRequests] = await Promise.all([
        Team.findOne({ teamCode: user.teamCode }),
        TeamJoinRequest.find({
          teamCode: user.teamCode,
          type: "request",
          status: "pending",
        }).sort({ requestedAt: -1 }),
      ]);

      if (teamDoc) {
        team = teamDoc;
        isTeamLead = team.teamLead === uid;

        // Only the lead is allowed to see incoming join requests. We fetched
        // them eagerly to save a roundtrip but filter to empty for non-leads
        // so the response shape matches /api/team/join-request behaviour.
        teamRequests = isTeamLead
          ? leadJoinRequests.map((req: any) => ({
              requestId: req._id.toString(),
              userId: req.userId,
              userName: req.userName,
              userEmail: req.userEmail,
              type: req.type || "request",
              status: req.status,
              requestedAt: isoIfDate(req.requestedAt),
            }))
          : [];

        // Hydrate team member details (name + light public fields).
        const memberUids: string[] = team.teamMembers.map((m: any) => m.uid);
        memberDetails = await User.find({ uid: { $in: memberUids } }).select(
          "uid name email organisation profile_picture discord_username resume_link github_link linkedin_link hasSolvedChallenge",
        );
      }
    }

    // ---- Build the response payload ----

    // Match the existing /api/team/[teamCode] shape so the dashboard can drop
    // this in without changing its destructuring logic.
    let teamPayload: any = null;
    let rsvpPayload: any = {
      hasRSVPed: false,
      userRSVP: null,
      team: null,
    };

    if (team) {
      const teamLeadUser = memberDetails.find(
        (u: any) => u.uid === team.teamLead,
      );

      const formattedMembers = team.teamMembers.map((member: any) => {
        const info = memberDetails.find((u: any) => u.uid === member.uid);
        return {
          uid: member.uid,
          name: info?.name || "Unknown",
          email: info?.email || null,
          organisation: info?.organisation || null,
          role: member.role,
          joinedAt: isoIfDate(member.joinedAt),
          hasSolvedChallenge: info?.hasSolvedChallenge || false,
          github_link: info?.github_link || null,
          linkedin_link: info?.linkedin_link || null,
        };
      });

      const formattedRSVPs = team.memberRSVPs.map((rsvp: any) => ({
        uid: rsvp.uid,
        name: rsvp.name,
        rsvpStatus: rsvp.rsvpStatus,
        rsvpedAt: isoIfDate(rsvp.rsvpedAt),
      }));

      teamPayload = {
        teamCode: team.teamCode,
        teamName: team.teamName,
        teamLead: {
          id: teamLeadUser?.uid || team.teamLead,
          name: teamLeadUser?.name || "Unknown",
          email: teamLeadUser?.email || null,
          discord_username: teamLeadUser?.discord_username || null,
          organisation: teamLeadUser?.organisation || null,
          resume_link: teamLeadUser?.resume_link || null,
          github_link: teamLeadUser?.github_link || null,
        },
        teamMembers: formattedMembers,
        memberCount: team.memberCount,
        teamStatus: team.teamStatus,
        isLooking: team.isLooking,
        isEvaluated: team.isEvaluated,
        isShortlisted: team.isShortlisted,
        evaluations: team.evaluations || [],
        memberRSVPs: formattedRSVPs,
        createdAt: isoIfDate(team.createdAt),
      };

      // RSVP summary shape mirrors /api/user/rsvp-status.
      const userRSVP = team.memberRSVPs.find((r: any) => r.uid === uid);
      const rsvpMemberRollup = team.teamMembers.map((member: any) => {
        const info = memberDetails.find((u: any) => u.uid === member.uid);
        const rsvp = team.memberRSVPs.find((r: any) => r.uid === member.uid);
        return {
          name: info?.name || "Unknown",
          rsvpStatus: rsvp?.rsvpStatus || null,
          rsvpedAt: rsvp?.rsvpedAt ? isoIfDate(rsvp.rsvpedAt) : null,
        };
      });

      rsvpPayload = {
        hasRSVPed: !!userRSVP,
        userRSVP: userRSVP
          ? {
              rsvpStatus: userRSVP.rsvpStatus,
              rsvpedAt: isoIfDate(userRSVP.rsvpedAt),
            }
          : null,
        team: {
          teamCode: team.teamCode,
          teamName: team.teamName,
          isShortlisted: team.isShortlisted,
          teamStatus: team.teamStatus,
          totalMembers: team.memberCount,
          rsvpedMembers: team.memberRSVPs.length,
          pendingRSVPs: team.memberCount - team.memberRSVPs.length,
          allRSVPed: team.memberCount === team.memberRSVPs.length,
          memberRSVPs: rsvpMemberRollup,
        },
      };
    }

    // Invites = TeamJoinRequest docs where userId === me. We mirror the
    // /api/team/join-request?type=user shape, hydrating team names in one
    // batch query instead of N+1.
    let invites: any[] = [];
    if (userInvites.length > 0) {
      const inviteTeamCodes = Array.from(
        new Set(userInvites.map((r: any) => r.teamCode)),
      );
      const teamsForInvites = await Team.find({
        teamCode: { $in: inviteTeamCodes },
      }).select("teamCode teamName");
      const teamNameByCode = new Map<string, string>();
      for (const t of teamsForInvites) {
        teamNameByCode.set(t.teamCode, t.teamName);
      }
      invites = userInvites.map((req: any) => ({
        requestId: req._id.toString(),
        teamCode: req.teamCode,
        teamName: teamNameByCode.get(req.teamCode) || "Unknown Team",
        type: req.type || "request",
        status: req.status,
        requestedAt: isoIfDate(req.requestedAt),
        respondedAt: isoIfDate(req.respondedAt),
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        team: teamPayload,
        rsvp: rsvpPayload,
        invites,
        teamRequests,
        flag,
        isTeamLead,
      },
    });
  } catch (error: any) {
    console.error("bootstrap error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
