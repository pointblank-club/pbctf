import { NextRequest, NextResponse } from "next/server";
import {
  authenticateUser,
  requireEmailVerified,
  createAuthErrorResponse,
} from "@/lib/middleware/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  try {
    // Rate limit per IP: 5 calls per hour
    const ip = getClientIp(request);
    if (!(await checkRateLimit(`twintro-solved:${ip}`, 5, 60 * 60 * 1000))) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    // Auth required
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error.message },
        { status: authResult.status },
      );
    }

    const emailError = requireEmailVerified(authResult);
    if (emailError) return createAuthErrorResponse(emailError);

    await dbConnect();

    const updatedUser = await User.findOneAndUpdate(
      { uid: authResult.user.uid },
      { $set: { twintroChallengeSolved: true } },
      { new: true },
    );

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Twintro challenge marked as solved.",
    });
  } catch (error) {
    console.error("[twintro-solved] error:", error);
    return NextResponse.json(
      { success: false, message: "Server error. Please try again." },
      { status: 500 },
    );
  }
}
