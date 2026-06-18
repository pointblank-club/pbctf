import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, requireEvaluator, createAuthErrorResponse } from "@/lib/middleware/auth";
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
 * GET /api/evaluator/teams
 * Get teams assigned to the evaluator
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthErrorResponse(authResult);
    }

    const evaluatorCheck = requireEvaluator(authResult);
    if (evaluatorCheck) {
      return createAuthErrorResponse(evaluatorCheck);
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'assigned'; // 'assigned', 'community', 'tier'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sort = searchParams.get('sort'); // 'votes'
    const tiers = searchParams.get('tiers')?.split(',').filter(Boolean) || [];

    const skip = (page - 1) * limit;

    await dbConnect();

    const evaluator = await Evaluator.findOne({ uid: authResult.user.uid });
    const assignedTeamCodes = evaluator ? evaluator.assignedTeams.map((t: any) => t.teamCode) : [];

    // --- Build Aggregation Pipeline ---
    const pipeline: any[] = [];

    if (type === 'assigned') {
      if (!evaluator) {
        return createSuccessResponse("No assigned teams", {
          teams: [],
          pagination: { total: 0, page, limit, totalPages: 0 },
          stats: { assigned: 0, evaluated: 0, pending: 0 },
        });
      }
      pipeline.push({ $match: { teamCode: { $in: assignedTeamCodes } } });

      // Filter by tiers in assigned view if requested
      if (tiers.length > 0) {
        pipeline.push({ $match: { 'evaluations': { $elemMatch: { evaluatorId: authResult.user.uid, tier: { $in: tiers } } } } });
      }

    } else {
      // All Teams view — show every team, optionally filtered by evaluation tier
      if (tiers.length > 0) {
        pipeline.push({ $match: { 'evaluations.tier': { $in: tiers } } });
      }
    }

    pipeline.push({
      $addFields: {
        voteCount: { $size: { $ifNull: ["$votes", []] } }, // Total votes
        upvoteCount: {
          $size: {
            $filter: {
              input: { $ifNull: ["$votes", []] },
              as: "v",
              cond: { $eq: ["$$v.vote", "up"] }
            }
          }
        },
        downvoteCount: {
          $size: {
            $filter: {
              input: { $ifNull: ["$votes", []] },
              as: "v",
              cond: { $eq: ["$$v.vote", "down"] }
            }
          }
        }
      }
    });

    if (sort === 'votes') {
      // Sort by upvoteCount as requested
      pipeline.push({ $sort: { upvoteCount: -1, createdAt: -1 } });
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: limit }]
      }
    });

    // Execute Aggregation
    const result = await Team.aggregate(pipeline);

    const metadata = result[0].metadata[0] || { total: 0 };
    const rawTeams = result[0].data;
    const totalTeams = metadata.total;
    const totalPages = Math.ceil(totalTeams / limit);

    // Fetch User Details (Members + Evaluators + Voters)
    const teamMemberUids = rawTeams.flatMap((t: any) => t.teamMembers.map((m: any) => m.uid));
    const evaluatorUids = rawTeams.flatMap((t: any) => (t.evaluations || []).map((e: any) => e.evaluatorId));
    const voterUids = rawTeams.flatMap((t: any) => (t.votes || []).map((v: any) => v.evaluatorId));

    const uniqueUids = [...new Set([...teamMemberUids, ...evaluatorUids, ...voterUids])] as string[];

    // Fetch users for members, evaluators, and voters
    const users = await User.find({ uid: { $in: uniqueUids } }).select('uid name organisation');

    const userMap = new Map(users.map((u: any) => [u.uid, u]));

    // Helper to format team
    const formatTeam = (team: any) => {
      const isAssigned = assignedTeamCodes.includes(team.teamCode);
      const assignment = isAssigned ? evaluator?.assignedTeams.find((a: any) => a.teamCode === team.teamCode) : null;

      // Check if THIS evaluator has evaluated/voted
      const myEvaluationRaw = team.evaluations?.find((e: any) => e.evaluatorId === authResult.user.uid);
      const myVoteRaw = team.votes?.find((v: any) => v.evaluatorId === authResult.user.uid);

      // Hydrate members
      const hydratedMembers = team.teamMembers.map((m: any) => {
        const user = userMap.get(m.uid);
        return {
          uid: m.uid,
          role: m.role,
          name: user?.name || "Unknown User",
          organisation: user?.organisation || "N/A"
        };
      });

      // Hydrate Evaluations
      const hydratedEvaluations = (team.evaluations || []).map((e: any) => ({
        ...e,
        name: userMap.get(e.evaluatorId)?.name || "Unknown Evaluator"
      }));

      // Hydrate Votes
      const hydratedVotes = (team.votes || []).map((v: any) => ({
        ...v,
        name: userMap.get(v.evaluatorId)?.name || "Community Member"
      }));

      return {
        teamCode: team.teamCode,
        teamName: team.teamName,
        teamMembers: hydratedMembers,
        memberCount: team.memberCount,

        // Evaluation Context
        isAssigned,
        assignedAt: assignment?.assignedAt || null,

        // My Actions
        myEvaluation: myEvaluationRaw ? { ...myEvaluationRaw, name: userMap.get(myEvaluationRaw.evaluatorId)?.name } : null,
        myVote: myVoteRaw ? { ...myVoteRaw, name: userMap.get(myVoteRaw.evaluatorId)?.name } : null,

        // Public Data
        evaluations: hydratedEvaluations,
        votes: hydratedVotes,
        voteCount: team.voteCount,
        upvoteCount: team.upvoteCount,
        downvoteCount: team.downvoteCount,

        // Legacy/Global status
        isEvaluated: team.isEvaluated,
      };
    };

    const formattedTeams = rawTeams.map((t: any) => formatTeam(t));

    return createSuccessResponse("Teams retrieved successfully", {
      teams: formattedTeams,
      pagination: {
        total: totalTeams,
        page,
        limit,
        totalPages
      },
      stats: evaluator ? {
        assigned: evaluator.assignedCount,
        evaluated: evaluator.evaluatedCount,
        pending: evaluator.assignedCount - evaluator.evaluatedCount,
      } : { assigned: 0, evaluated: 0, pending: 0 },
    });
  } catch (error: any) {
    console.error("Get evaluator teams error:", error);
    return createErrorResponse("Failed to retrieve teams", "SERVER_ERROR", 500);
  }
}
