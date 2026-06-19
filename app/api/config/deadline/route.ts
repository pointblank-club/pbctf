import { NextRequest, NextResponse } from "next/server";
import { REGISTRATION_DEADLINE, RSVP_DEADLINE } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * GET /api/config/deadline
 * Returns the submission deadline, RSVP deadline, and current server time
 * This endpoint is public (no authentication required)
 */
export async function GET(request: NextRequest) {
  try {
    const serverTime = new Date();
    const isSubmissionExpired = serverTime > REGISTRATION_DEADLINE;
    const isRsvpExpired = serverTime > RSVP_DEADLINE;

    return NextResponse.json({
      success: true,
      data: {
        deadline: REGISTRATION_DEADLINE.toISOString(),
        serverTime: serverTime.toISOString(),
        isExpired: isSubmissionExpired,
        rsvpDeadline: RSVP_DEADLINE.toISOString(),
        isRsvpExpired,
      },
    });
  } catch (error: any) {
    console.error("Deadline config error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
