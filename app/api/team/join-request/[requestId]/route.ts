import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, createAuthErrorResponse, requireRegistrationOpen } from "@/lib/middleware/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Team from "@/models/Team";
import TeamJoinRequest from "@/models/TeamJoinRequest";

export const dynamic = 'force-dynamic';

// Max team members
const MAX_TEAM_MEMBERS = 2;

export async function PUT(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { message: authResult.error.message },
        { status: authResult.status }
      );
    }

    const deadlineError = requireRegistrationOpen();
    if (deadlineError) {
      return createAuthErrorResponse(deadlineError);
    }

    const body = await request.json();
    const { action } = body;

    if (!action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json(
        { message: "Action must be 'accept' or 'decline'" },
        { status: 400 }
      );
    }

    await dbConnect();

    const joinRequest = await TeamJoinRequest.findById(params.requestId);
    if (!joinRequest) {
      return NextResponse.json(
        { message: "Join request not found" },
        { status: 404 }
      );
    }

    if (joinRequest.status !== 'pending') {
      return NextResponse.json(
        { message: `Request has already been ${joinRequest.status}` },
        { status: 400 }
      );
    }

    const team = await Team.findOne({ teamCode: joinRequest.teamCode });
    if (!team) {
      return NextResponse.json(
        { message: "Team not found" },
        { status: 404 }
      );
    }

    const isInvite = joinRequest.type === 'invite';

    if (isInvite) {
      if (joinRequest.userId !== authResult.user.uid) {
        return NextResponse.json(
          { message: "Only the invited user can respond to this invitation" },
          { status: 403 }
        );
      }
    } else {
      if (team.teamLead !== authResult.user.uid) {
        return NextResponse.json(
          { message: "Only team lead can respond to join requests" },
          { status: 403 }
        );
      }
    }

    if (['submitted', 'shortlisted', 'rsvped'].includes(team.teamStatus)) {
      return NextResponse.json(
        { message: "Cannot modify team after submission" },
        { status: 400 }
      );
    }

    if (action === 'accept') {
      const requestingUser = await User.findOne({ uid: joinRequest.userId });
      if (!requestingUser) {
        return NextResponse.json(
          { message: "User not found" },
          { status: 404 }
        );
      }

      const targetCode = team.teamCode;

      // Atomically seat the requesting user. The conditional update enforces the
      // size cap (a seat must be free), guards against re-adding the same member,
      // and respects the team status — all in one document write, so a racing
      // accept/join cannot oversize the team. The unique teamMembers.uid index is
      // the DB backstop that prevents seating a user who is already in another team.
      let updatedTeam;
      try {
        const seatFilter: Record<string, any> = {
          teamCode: targetCode,
          teamStatus: { $nin: ['submitted', 'shortlisted', 'rsvped'] },
          "teamMembers.uid": { $ne: joinRequest.userId },
        };
        seatFilter[`teamMembers.${MAX_TEAM_MEMBERS - 1}`] = { $exists: false };

        updatedTeam = await Team.findOneAndUpdate(
          seatFilter,
          {
            $push: {
              teamMembers: {
                uid: joinRequest.userId,
                joinedAt: new Date(),
                role: 'Member',
              },
            },
            $inc: { memberCount: 1 },
          },
          { new: true }
        );
      } catch (err: any) {
        // Duplicate key on teamMembers.uid => user already belongs to another team.
        if (err?.code === 11000) {
          joinRequest.status = 'declined';
          joinRequest.respondedAt = new Date();
          joinRequest.respondedBy = authResult.user.uid;
          await joinRequest.save();

          return NextResponse.json(
            { message: "User is already in another team. Request/Invite declined." },
            { status: 409 }
          );
        }
        throw err;
      }

      if (!updatedTeam) {
        // No seat taken — distinguish "already a member here" from "team full".
        const current = await Team.findOne({ teamCode: targetCode });
        if (current?.teamMembers?.some((m: any) => m.uid === joinRequest.userId)) {
          joinRequest.status = 'declined';
          joinRequest.respondedAt = new Date();
          joinRequest.respondedBy = authResult.user.uid;
          await joinRequest.save();

          return NextResponse.json(
            { message: "User is already in this team. Request/Invite declined." },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { message: "Team is full" },
          { status: 409 }
        );
      }

      // Keep the user's cached teamCode in sync (the team array is the authority).
      await User.findOneAndUpdate(
        { uid: joinRequest.userId },
        { teamCode: targetCode, isLooking: false }
      );

      joinRequest.status = 'accepted';
      joinRequest.respondedAt = new Date();
      joinRequest.respondedBy = authResult.user.uid;
      await joinRequest.save();

      await TeamJoinRequest.updateMany(
        {
          userId: joinRequest.userId,
          status: 'pending',
          _id: { $ne: joinRequest._id },
        },
        {
          status: 'cancelled',
          respondedAt: new Date(),
        }
      );

      return NextResponse.json({
        success: true,
        message: isInvite ? "Invitation accepted. You have joined the team." : "Join request accepted. User added to team.",
        data: {
          requestId: joinRequest._id.toString(),
          teamCode: updatedTeam.teamCode,
          teamName: updatedTeam.teamName,
          status: 'accepted',
        },
      });
    } else {
      joinRequest.status = 'declined';
      joinRequest.respondedAt = new Date();
      joinRequest.respondedBy = authResult.user.uid;
      await joinRequest.save();

      return NextResponse.json({
        success: true,
        message: isInvite ? "Invitation declined" : "Join request declined",
        data: {
          requestId: joinRequest._id.toString(),
          status: 'declined',
        },
      });
    }
  } catch (error: any) {
    console.error("Respond to join request error:", error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { message: authResult.error.message },
        { status: authResult.status }
      );
    }

    const deadlineError = requireRegistrationOpen();
    if (deadlineError) {
      return createAuthErrorResponse(deadlineError);
    }

    await dbConnect();

    const joinRequest = await TeamJoinRequest.findById(params.requestId);
    if (!joinRequest) {
      return NextResponse.json(
        { message: "Join request not found" },
        { status: 404 }
      );
    }

    if (joinRequest.type !== 'invite') {
      return NextResponse.json(
        { message: "Only outbound invites can be cancelled" },
        { status: 400 }
      );
    }

    if (joinRequest.status !== 'pending') {
      return NextResponse.json(
        { message: `Invitation has already been ${joinRequest.status}` },
        { status: 409 }
      );
    }

    const team = await Team.findOne({ teamCode: joinRequest.teamCode });
    if (!team) {
      return NextResponse.json(
        { message: "Team not found" },
        { status: 404 }
      );
    }

    if (team.teamLead !== authResult.user.uid) {
      return NextResponse.json(
        { message: "Only team lead can cancel invitations" },
        { status: 403 }
      );
    }

    if (['submitted', 'shortlisted', 'rsvped'].includes(team.teamStatus)) {
      return NextResponse.json(
        { message: "Cannot modify team after submission" },
        { status: 400 }
      );
    }

    joinRequest.status = 'cancelled';
    joinRequest.respondedAt = new Date();
    joinRequest.respondedBy = authResult.user.uid;
    await joinRequest.save();

    return NextResponse.json({
      success: true,
      message: "Invitation cancelled",
      data: {
        requestId: joinRequest._id.toString(),
        teamCode: team.teamCode,
        status: 'cancelled',
      },
    });
  } catch (error: any) {
    console.error("Cancel invitation error:", error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
