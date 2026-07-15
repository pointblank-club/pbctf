import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/lib/middleware/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Team from "@/models/Team";

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { message: authResult.error.message },
        { status: authResult.status }
      );
    }

    await dbConnect();

    const user = await User.findOne({ uid: authResult.user.uid });
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    if (!user.teamCode) {
      return NextResponse.json({
        success: true,
        data: {
          hasRSVPed: false,
          userRSVP: null,
          team: null,
        },
      });
    }

    const team = await Team.findOne({ teamCode: user.teamCode });
    if (!team) {
      return NextResponse.json({
        success: true,
        data: {
          hasRSVPed: false,
          userRSVP: null,
          team: null,
        },
      });
    }

    const userRSVP = team.memberRSVPs.find((r: any) => r.uid === authResult.user.uid);

    const memberUids = team.teamMembers.map((m: any) => m.uid);
    const members = await User.find({ uid: { $in: memberUids } }).select('uid name idName');

    const memberRSVPs = team.teamMembers.map((member: any) => {
      const memberInfo = members.find(m => m.uid === member.uid);
      const rsvp = team.memberRSVPs.find((r: any) => r.uid === member.uid);
      return {
        name: memberInfo?.name || 'Unknown',
        idName: memberInfo?.idName || null,
        rsvpStatus: rsvp?.rsvpStatus || null,
        rsvpedAt: rsvp?.rsvpedAt ? (rsvp.rsvpedAt instanceof Date ? rsvp.rsvpedAt.toISOString() : rsvp.rsvpedAt) : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        hasRSVPed: !!userRSVP,
        userRSVP: userRSVP ? {
          idName: user.idName || null,
          rsvpStatus: userRSVP.rsvpStatus,
          rsvpedAt: userRSVP.rsvpedAt instanceof Date ? userRSVP.rsvpedAt.toISOString() : userRSVP.rsvpedAt,
        } : null,
        team: {
          teamCode: team.teamCode,
          teamName: team.teamName,
          isShortlisted: team.isShortlisted,
          teamStatus: team.teamStatus,
          totalMembers: team.memberCount,
          rsvpedMembers: team.memberRSVPs.length,
          pendingRSVPs: team.memberCount - team.memberRSVPs.length,
          allRSVPed: team.memberCount === team.memberRSVPs.length,
          memberRSVPs,
        },
      },
    });
  } catch (error: any) {
    console.error("Get RSVP status error:", error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
