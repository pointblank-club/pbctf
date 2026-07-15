import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, createAuthErrorResponse, requireEmailVerified } from "@/lib/middleware/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Team from "@/models/Team";
import { isRsvpClosed, RSVP_DEADLINE } from "@/lib/constants";

export const dynamic = 'force-dynamic';

/**
 * PUT /api/user/rsvp
 * Individual RSVP for selected team member
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { message: authResult.error.message },
        { status: authResult.status }
      );
    }

    const emailError = requireEmailVerified(authResult);
    if (emailError) {
      return createAuthErrorResponse(emailError);
    }

    const body = await request.json();
    const { rsvpStatus, idName } = body;

    // Validate rsvpStatus
    if (!rsvpStatus || !['confirmed', 'declined'].includes(rsvpStatus)) {
      return NextResponse.json(
        {
          message: "Invalid RSVP status",
          error: {
            code: 'INVALID_RSVP_STATUS',
            message: "rsvpStatus must be 'confirmed' or 'declined'"
          }
        },
        { status: 400 }
      );
    }

    const trimmedIdName = typeof idName === 'string' ? idName.trim() : '';
    if (rsvpStatus === 'confirmed' && !trimmedIdName) {
      return NextResponse.json(
        {
          message: "ID name is required",
          error: {
            code: 'MISSING_ID_NAME',
            message: "Please enter your name exactly as per your identification document to confirm participation"
          }
        },
        { status: 400 }
      );
    }

    if (isRsvpClosed()) {
      return NextResponse.json(
        {
          message: "RSVP deadline has passed",
          error: {
            code: 'RSVP_DEADLINE_PASSED',
            message: `The RSVP deadline was ${RSVP_DEADLINE.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })} IST. RSVP submissions are now closed.`
          }
        },
        { status: 400 }
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

    if (!user.twintroChallengeSolved) {
      return NextResponse.json(
        {
          message: "Prerequisite challenge not completed",
          error: {
            code: 'TWINTRO_NOT_SOLVED',
            message: 'You must solve the prerequisite challenge before RSVPing'
          }
        },
        { status: 400 }
      );
    }

    if (!user.teamCode) {
      return NextResponse.json(
        {
          message: "User not part of any team",
          error: {
            code: 'USER_NOT_IN_TEAM',
            message: 'User not part of any team'
          }
        },
        { status: 400 }
      );
    }

    const team = await Team.findOne({ teamCode: user.teamCode });
    if (!team) {
      return NextResponse.json(
        { message: "Team not found" },
        { status: 404 }
      );
    }

    // RSVP unlocks once the admin panel explicitly shortlists the team, not
    // from evaluator scoring alone (a team can have an accepted evaluation
    // and still not be shortlisted for finals).
    if (!team.isShortlisted) {
      return NextResponse.json(
        {
          message: "Team not selected",
          error: {
            code: 'TEAM_NOT_SELECTED',
            message: 'Team must be shortlisted by the admin panel before RSVP'
          }
        },
        { status: 400 }
      );
    }

    // RSVP can be changed as many times as needed up until RSVP_DEADLINE (the
    // isRsvpClosed() check above is the only hard cutoff), so update an
    // existing entry in place instead of rejecting a resubmission.
    const rsvpDate = new Date();
    const existingRSVP = team.memberRSVPs.find((r: any) => r.uid === authResult.user.uid);
    if (existingRSVP) {
      existingRSVP.rsvpStatus = rsvpStatus;
      existingRSVP.rsvpedAt = rsvpDate;
    } else {
      team.memberRSVPs.push({
        uid: authResult.user.uid,
        name: user.name,
        rsvpStatus,
        rsvpedAt: rsvpDate,
      });
    }

    // Name as per ID is captured on the user profile, not the team RSVP record.
    // Same as RSVP status, it can be updated on every resubmission until the deadline.
    if (rsvpStatus === 'confirmed') {
      user.idName = trimmedIdName;
    }

    // Check if all members have RSVPed
    const allRSVPed = team.teamMembers.every((member: any) =>
      team.memberRSVPs.some((rsvp: any) => rsvp.uid === member.uid)
    );

    // Check if all RSVPs are confirmed
    const allConfirmed = allRSVPed && team.memberRSVPs.every(
      (rsvp: any) => rsvp.rsvpStatus === 'confirmed'
    );

    // Check if any member declined
    const anyDeclined = team.memberRSVPs.some(
      (rsvp: any) => rsvp.rsvpStatus === 'declined'
    );

    // Update team status
    if (allConfirmed) {
      team.teamStatus = 'rsvped';
      team.rsvpCompletedAt = new Date();
    } else if (anyDeclined) {
      team.teamStatus = 'rsvp_declined';
    }

    await Promise.all([team.save(), user.save()]);

    // Format memberRSVPs for response
    const formattedRSVPs = team.memberRSVPs.map((rsvp: any) => ({
      uid: rsvp.uid,
      name: rsvp.name,
      rsvpStatus: rsvp.rsvpStatus,
      rsvpedAt: rsvp.rsvpedAt instanceof Date ? rsvp.rsvpedAt.toISOString() : rsvp.rsvpedAt,
    }));

    return NextResponse.json({
      success: true,
      message: allConfirmed ? "RSVP submitted successfully. Your team is now fully confirmed!" : "RSVP submitted successfully",
      data: {
        userRSVP: {
          uid: authResult.user.uid,
          name: user.name,
          idName: rsvpStatus === 'confirmed' ? trimmedIdName : null,
          rsvpStatus,
          rsvpedAt: rsvpDate.toISOString(),
        },
        teamStatus: {
          teamCode: team.teamCode,
          teamName: team.teamName,
          totalMembers: team.memberCount,
          rsvpedMembers: team.memberRSVPs.length,
          pendingRSVPs: team.memberCount - team.memberRSVPs.length,
          allRSVPed,
          teamStatus: team.teamStatus,
          ...(team.rsvpCompletedAt && { rsvpCompletedAt: team.rsvpCompletedAt instanceof Date ? team.rsvpCompletedAt.toISOString() : team.rsvpCompletedAt }),
          memberRSVPs: formattedRSVPs,
        },
      },
    });
  } catch (error: any) {
    console.error("RSVP error:", error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/rsvp
 * Alias for /api/user/rsvp-status
 */
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
        message: "RSVP status retrieved",
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
        message: "RSVP status retrieved",
        data: {
          hasRSVPed: false,
          userRSVP: null,
          team: null,
        },
      });
    }

    const userRSVP = team.memberRSVPs.find((r: any) => r.uid === authResult.user.uid);

    // Get member names + ID names for RSVP display
    const memberUids = team.teamMembers.map((m: any) => m.uid);
    const members = await User.find({ uid: { $in: memberUids } }).select('uid name idName');

    const memberRSVPs = team.teamMembers.map((member: any) => {
      const memberInfo = members.find(m => m.uid === member.uid);
      const rsvp = team.memberRSVPs.find((r: any) => r.uid === member.uid);
      return {
        name: memberInfo?.name || 'Unknown',
        idName: memberInfo?.idName || null,
        rsvpStatus: rsvp?.rsvpStatus || null,
        rsvpedAt: rsvp?.rsvpedAt || null,
      };
    });

    return NextResponse.json({
      success: true,
      message: "RSVP status retrieved",
      data: {
        hasRSVPed: !!userRSVP,
        userRSVP: userRSVP ? {
          idName: user.idName || null,
          rsvpStatus: userRSVP.rsvpStatus,
          rsvpedAt: userRSVP.rsvpedAt,
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
