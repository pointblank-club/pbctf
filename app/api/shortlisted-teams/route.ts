import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Team from "@/models/Team";
import User from "@/models/User";
import { isShortlistAnnounced } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * GET /api/shortlisted-teams
 * Public listing for the /shortlisted announcement page. Uses the same
 * isShortlisted gate that unlocks the RSVP flow for a team on their
 * dashboard (set via the admin panel, not evaluator scoring), so this list
 * always matches who's actually seeing RSVP.
 */
export async function GET(request: NextRequest) {
  try {
    if (!isShortlistAnnounced()) {
      return NextResponse.json({
        success: true,
        data: { isAnnounced: false, teams: [] },
      });
    }

    await dbConnect();

    const teams = await Team.find({ isShortlisted: true }).select(
      "teamCode teamName teamLead memberCount",
    );

    const leadUids = teams.map((team) => team.teamLead);
    const leads = await User.find({ uid: { $in: leadUids } }).select("uid name");
    const leadNameByUid = new Map(leads.map((user) => [user.uid, user.name]));

    const shortlistedTeams = teams.map((team) => ({
      teamCode: team.teamCode,
      teamName: team.teamName,
      memberCount: team.memberCount,
      leaderName: leadNameByUid.get(team.teamLead) || "Unknown",
    }));

    return NextResponse.json({
      success: true,
      data: { isAnnounced: true, teams: shortlistedTeams },
    });
  } catch (error: any) {
    console.error("Shortlisted teams error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
