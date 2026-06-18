import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, requireAdmin, createAuthErrorResponse } from "@/lib/middleware/auth";
import dbConnect from "@/lib/db";
import Team from "@/models/Team";

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

export async function PUT(request: NextRequest) {
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
    const { teamCodes, shortlistAll = false, topN } = body;

    await dbConnect();

    let teamsToShortlist: string[] = [];

    if (teamCodes && Array.isArray(teamCodes) && teamCodes.length > 0) {
      teamsToShortlist = teamCodes;
    } else if (shortlistAll) {
      const evaluatedTeams = await Team.find({ isEvaluated: true });
      teamsToShortlist = evaluatedTeams.map(t => t.teamCode);
    } else if (topN && typeof topN === 'number') {
      const topTeams = await Team.find({ isEvaluated: true })
        .sort({ 'scores.total': -1 })
        .limit(topN);
      teamsToShortlist = topTeams.map(t => t.teamCode);
    } else {
      return createErrorResponse(
        "Provide teamCodes array, shortlistAll: true, or topN number",
        "VALIDATION_ERROR",
        400
      );
    }

    const result = await Team.updateMany(
      { teamCode: { $in: teamsToShortlist } },
      {
        isShortlisted: true,
        shortlistedAt: new Date(),
      }
    );

    return createSuccessResponse("Teams finalized successfully", {
      shortlistedCount: result.modifiedCount,
      teamCodes: teamsToShortlist,
    });
  } catch (error: any) {
    console.error("Finalize teams error:", error);
    return createErrorResponse("Failed to finalize teams", "SERVER_ERROR", 500);
  }
}
