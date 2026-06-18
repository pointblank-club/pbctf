import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, requireAdmin, createAuthErrorResponse } from "@/lib/middleware/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Team from "@/models/Team";
import Evaluator from "@/models/Evaluator";

export const dynamic = 'force-dynamic';

function createSuccessResponse(message: string, data: any, status = 200) {
  return NextResponse.json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  }, { status });
}

function createErrorResponse(message: string, code: string, status: number) {
  return NextResponse.json({
    success: false,
    message,
    error: { code, message },
    timestamp: new Date().toISOString(),
  }, { status });
}

/**
 * GET /api/admin/teams/:teamCode
 * Get detailed team info (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { teamCode: string } }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthErrorResponse(authResult);
    }

    const adminCheck = requireAdmin(authResult);
    if (adminCheck) {
      return createAuthErrorResponse(adminCheck);
    }

    await dbConnect();

    const team = await Team.findOne({ teamCode: params.teamCode });
    if (!team) {
      return createErrorResponse("Team not found", "NOT_FOUND", 404);
    }

    // Get member details
    const memberUids = team.teamMembers.map((m: any) => m.uid);
    const members = await User.find({ uid: { $in: memberUids } })
      .select('uid name email organisation profile_picture discord_username resume_link github_link');

    // Get evaluator info
    // Fetch all evaluators who are assigned to this team
    const assignedEvaluators = await Evaluator.find({ "assignedTeams.teamCode": team.teamCode })
      .select('name email uid assignedTeams');

    const formattedMembers = team.teamMembers.map((member: any) => {
      const userInfo = members.find(u => u.uid === member.uid);
      return {
        uid: member.uid,
        name: userInfo?.name || 'Unknown',
        email: userInfo?.email || null,
        organisation: userInfo?.organisation || null,
        role: member.role,
        joinedAt: member.joinedAt,
      };
    });

    return createSuccessResponse("Team retrieved successfully", {
      teamCode: team.teamCode,
      teamName: team.teamName,
      teamLead: {
        id: members.find(u => u.uid === team.teamLead)?._id.toString(),
        uid: members.find(u => u.uid === team.teamLead)?.uid,
        name: members.find(u => u.uid === team.teamLead)?.name,
        email: members.find(u => u.uid === team.teamLead)?.email,
        discord_username: members.find(u => u.uid === team.teamLead)?.discord_username,
        organisation: members.find(u => u.uid === team.teamLead)?.organisation,
        resume_link: members.find(u => u.uid === team.teamLead)?.resume_link,
        github_link: members.find(u => u.uid === team.teamLead)?.github_link,
      },
      teamMembers: formattedMembers,
      memberCount: team.memberCount,
      teamStatus: team.teamStatus,
      isLooking: team.isLooking,
      isEvaluated: team.isEvaluated,
      evaluations: team.evaluations || [],
      votes: team.votes || [],
      assignedEvaluators: assignedEvaluators,
      isShortlisted: team.isShortlisted,
      memberRSVPs: team.memberRSVPs,
      createdAt: team.createdAt,
      evaluatedAt: team.evaluatedAt || null,
      shortlistedAt: team.shortlistedAt || null,
      rsvpCompletedAt: team.rsvpCompletedAt || null,
    });
  } catch (error: any) {
    console.error("Get team error:", error);
    return createErrorResponse("Failed to retrieve team", "SERVER_ERROR", 500);
  }
}

/**
 * PUT /api/admin/teams/:teamCode
 * Update team (shortlist, change status, etc.) (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { teamCode: string } }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthErrorResponse(authResult);
    }

    const adminCheck = requireAdmin(authResult);
    if (adminCheck) {
      return createAuthErrorResponse(adminCheck);
    }

    const body = await request.json();
    const { isShortlisted, teamStatus, comments, adminNotes } = body;

    await dbConnect();

    const team = await Team.findOne({ teamCode: params.teamCode });
    if (!team) {
      return createErrorResponse("Team not found", "NOT_FOUND", 404);
    }

    const updateData: Record<string, any> = {};
    const updateOps: Record<string, any> = {};

    if (isShortlisted !== undefined) {
      updateData.isShortlisted = Boolean(isShortlisted);
      if (isShortlisted && !team.shortlistedAt) {
        updateData.shortlistedAt = new Date();
      }

      // Tag shortlisted teams with a "strongly_accepted" evaluation so they
      // surface in the evaluation-tier based "Selected Teams" view alongside
      // teams accepted through the regular evaluation flow.
      const adminEvaluatorId = `admin:${authResult.user.uid}`;
      if (isShortlisted) {
        const alreadyTagged = (team.evaluations || []).some(
          (e: any) => e.evaluatorId === adminEvaluatorId
        );
        if (!alreadyTagged) {
          updateOps.$push = {
            evaluations: {
              evaluatorId: adminEvaluatorId,
              name: authResult.user.name,
              tier: 'strongly_accepted',
              comment: 'Shortlisted via admin panel',
              createdAt: new Date(),
            },
          };
        }
        updateData.isEvaluated = true;
        if (!team.evaluatedAt) {
          updateData.evaluatedAt = new Date();
        }
      } else {
        // Remove only the admin-added evaluation tag when un-shortlisting,
        // leaving any genuine evaluator reviews intact.
        updateOps.$pull = {
          evaluations: { evaluatorId: adminEvaluatorId },
        };
      }
    }

    if (teamStatus !== undefined) {
      const validStatuses = ['pending', 'submitted', 'withdrawn', 'shortlisted', 'rsvped', 'rsvp_declined'];
      if (!validStatuses.includes(teamStatus)) {
        return createErrorResponse("Invalid team status", "INVALID_STATUS", 400);
      }
      updateData.teamStatus = teamStatus;
    }

    if (Object.keys(updateData).length > 0) {
      updateOps.$set = updateData;
    }

    const updatedTeam = await Team.findOneAndUpdate(
      { teamCode: params.teamCode },
      updateOps,
      { new: true }
    );

    return createSuccessResponse("Team updated successfully", {
      teamCode: updatedTeam!.teamCode,
      teamName: updatedTeam!.teamName,
      teamStatus: updatedTeam!.teamStatus,
      isShortlisted: updatedTeam!.isShortlisted,
      updatedAt: updatedTeam!.updatedAt,
    });
  } catch (error: any) {
    console.error("Update team error:", error);
    return createErrorResponse("Failed to update team", "SERVER_ERROR", 500);
  }
}
