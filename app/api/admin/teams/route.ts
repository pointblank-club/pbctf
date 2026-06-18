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
 * GET /api/admin/teams
 * Get all teams with filtering's and pagination (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthErrorResponse(authResult);
    }

    const adminCheck = requireAdmin(authResult);
    if (adminCheck) {
      return createAuthErrorResponse(adminCheck);
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const status = searchParams.get('status');
    const isShortlisted = searchParams.get('isShortlisted');
    const isEvaluated = searchParams.get('isEvaluated');
    const appliedFor = searchParams.get('appliedFor');
    const search = searchParams.get('search');
    const evaluationTier = searchParams.get('evaluationTier'); // Filter by evaluation tier
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    await dbConnect();

    const query: any = {};

    if (status) query.teamStatus = status;
    if (isShortlisted === 'true') query.isShortlisted = true;
    if (isShortlisted === 'false') query.isShortlisted = false;
    if (isEvaluated === 'true') query.isEvaluated = true;
    if (isEvaluated === 'false') query.isEvaluated = false;
    if (appliedFor) query.appliedFor = appliedFor;
    if (evaluationTier) {
      const tiers = evaluationTier.split(',').map(t => t.trim());
      if (tiers.length === 1) {
        query['evaluations.tier'] = tiers[0];
      } else {
        query['evaluations.tier'] = { $in: tiers };
      }
    }

    if (search) {
      query.$or = [
        { teamName: { $regex: search, $options: 'i' } },
        { teamCode: { $regex: search, $options: 'i' } },
      ];
    }

    if (searchParams.get('excludeAssigned') === 'true') {
      // Find all team codes that are already assigned to any evaluator
      const evaluators = await Evaluator.find({}, 'assignedTeams.teamCode');
      const assignedTeamCodes = evaluators.flatMap((e: any) => e.assignedTeams.map((t: any) => t.teamCode));

      // Add exclusion to query
      if (assignedTeamCodes.length > 0) {
        query.teamCode = { $nin: assignedTeamCodes };
      }
    }

    const skip = (page - 1) * limit;
    const sortObj: any = { [sortBy]: sortOrder };

    const [teams, totalTeams] = await Promise.all([
      Team.find(query)
        .skip(skip)
        .limit(limit)
        .sort(sortObj),
      Team.countDocuments(query),
    ]);

    // Get team leads
    const teamLeadUids = teams.map(t => t.teamLead);

    // Get Assignments for these teams
    const pageTeamCodes = teams.map(t => t.teamCode);
    const evaluatorsWithTeams = await Evaluator.find({ 'assignedTeams.teamCode': { $in: pageTeamCodes } });

    // Create Map: TeamCode -> { uid, name }
    const assignmentMap = new Map<string, { uid: string, name: string }>();
    evaluatorsWithTeams.forEach(ev => {
      ev.assignedTeams.forEach((at: any) => {
        if (pageTeamCodes.includes(at.teamCode)) {
          assignmentMap.set(at.teamCode, { uid: ev.uid, name: ev.name });
        }
      });
    });

    const teamLeads = await User.find({ uid: { $in: teamLeadUids } }).select('uid name email');

    // Get stats
    const [shortlisted, evaluated, rsvpResult] = await Promise.all([
      Team.countDocuments({ isShortlisted: true }),
      Team.countDocuments({ isEvaluated: true }),
      Team.aggregate([
        { $unwind: { path: '$memberRSVPs', preserveNullAndEmptyArrays: false } },
        { $match: { 'memberRSVPs.rsvpStatus': 'confirmed' } },
        { $count: 'total' }
      ])
    ]);

    const rsvped = rsvpResult[0]?.total || 0;

    const formattedTeams = teams.map(team => {
      const lead = teamLeads.find(u => u.uid === team.teamLead);
      const assignedEvaluator = assignmentMap.get(team.teamCode);

      return {
        teamCode: team.teamCode,
        teamName: team.teamName,
        teamLead: lead ? { id: lead._id.toString(), uid: lead.uid, name: lead.name, email: lead.email } : null,
        memberCount: team.memberCount,
        teamStatus: team.teamStatus,
        isEvaluated: team.isEvaluated,
        evaluator: assignedEvaluator || null,
        isShortlisted: team.isShortlisted,
        evaluationCount: team.evaluations?.length || 0,
        createdAt: team.createdAt,
      };
    });

    return createSuccessResponse("Teams retrieved successfully", {
      teams: formattedTeams,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalTeams / limit),
        totalTeams,
        limit,
      },
      stats: {
        totalTeams,
        shortlisted,
        rsvped,
        evaluated,
        pending: totalTeams - evaluated,
      },
    });
  } catch (error: any) {
    console.error("Get teams error:", error);
    return createErrorResponse("Failed to retrieve teams", "SERVER_ERROR", 500);
  }
}
