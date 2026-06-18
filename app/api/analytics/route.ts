import { NextRequest, NextResponse } from "next/server";
import {
  authenticateUser,
  createAuthErrorResponse,
} from "@/lib/middleware/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Team from "@/models/Team";
import Analytics from "@/models/Analytics";
import ProblemStatement from "@/models/ProblemStatement";

export const dynamic = "force-dynamic";

function createSuccessResponse(data: any) {
  return NextResponse.json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });
}

function createErrorResponse(message: string, code: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
      error: { code, message },
      timestamp: new Date().toISOString(),
    },
    { status },
  );
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthErrorResponse(authResult);
    }

    // Allow 'admin' role only
    const userRole = authResult.user.role;
    if (userRole !== "admin") {
      return createErrorResponse("Access denied", "FORBIDDEN", 403);
    }

    await dbConnect();

    // Fetch real stats
    const [
      totalUsers,
      totalTeams,
      submittedCount,
      evaluatedCount,
      shortlistedCount,
    ] = await Promise.all([
      User.countDocuments({ role: "user" }),
      Team.countDocuments({}),
      Team.countDocuments({
        teamStatus: { $in: ["submitted"] },
      }),
      Team.countDocuments({ evaluations: { $exists: true, $ne: [] } }),
      Team.countDocuments({
        "evaluations.tier": { $in: ["accepted", "strongly_accepted"] },
      }),
    ]);

    const realRegistered = Math.max(
      0,
      totalTeams - (submittedCount + evaluatedCount),
    );

    const currentStats = {
      totalUsers,
      totalTeams,
      totalSubmissions: submittedCount,
      totalEvaluated: evaluatedCount,
    };

    const teamDistribution = [
      { name: "Registered", value: realRegistered },
      { name: "Submitted", value: submittedCount },
      {
        name: "Evaluated",
        value: Math.max(0, evaluatedCount - shortlistedCount),
      },
      { name: "Shortlisted", value: shortlistedCount },
    ];

    // Fetch history (last 30 days)
    const historyDocs = await Analytics.find({}).sort({ date: 1 }).limit(30);
    const history = historyDocs.map((doc: any) => ({
      date: doc.date,
      totalUsers: doc.totalUsers,
    }));

    // Calculate Problem Statement Distribution
    return createSuccessResponse({
      ...currentStats,
      history,
      teamDistribution,
    });
  } catch (error: any) {
    console.error("Analytics data fetch error:", error);
    return createErrorResponse("Failed to retrieve data", "SERVER_ERROR", 500);
  }
}
