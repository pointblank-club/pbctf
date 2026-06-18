import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, createAuthErrorResponse, requireEmailVerified } from "@/lib/middleware/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

const FLAG_SECRET = process.env.FLAG_SECRET || "pbctf_default_secret_key_2026";
const FLAG_PREFIX = process.env.FLAG_PREFIX || "pbctf";

// Logic for generating the dynamic flag using hmac
function generateFlag(sessionId: string): string {
  const hmac = crypto
    .createHmac("sha256", FLAG_SECRET)
    .update(sessionId)
    .digest("hex");
  return `{${hmac.slice(0, 24)}}`;
}

// GET /api/user/flag
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json(
        { message: authResult.error.message },
        { status: authResult.status }
      );
    }

    const flag = generateFlag(authResult.user.uid);

    return NextResponse.json({
      success: true,
      flag
    });
  } catch (error: any) {
    console.error("Get flag error:", error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}


//POST /api/user/flag

export async function POST(request: NextRequest) {
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
    const { flag } = body;

    if (!flag || typeof flag !== "string") {
      return NextResponse.json(
        { success: false, message: "Flag is required" },
        { status: 400 }
      );
    }

    const expectedFlag = generateFlag(authResult.user.uid);
    const fullExpectedFlag = `${FLAG_PREFIX}${expectedFlag}`;

    if (flag.trim() !== fullExpectedFlag) {
      return NextResponse.json(
        { success: false, message: "Incorrect flag. Try again!" },
        { status: 400 }
      );
    }

    await dbConnect();
    
    // Update the database to mark challenge as solved
    const updatedUser = await User.findOneAndUpdate(
      { uid: authResult.user.uid },
      { hasSolvedChallenge: true },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Congratulations! Correct flag submitted."
    });
  } catch (error: any) {
    console.error("Submit flag error:", error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
