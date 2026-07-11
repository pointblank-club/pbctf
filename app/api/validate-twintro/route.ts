import { NextResponse } from "next/server";
import { validateTwintroCode } from "@/lib/validate-twintro";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // Rate limit: 10 attempts per IP per minute to prevent brute-force
    const ip = getClientIp(request);
    if (!(await checkRateLimit(`twintro:${ip}`, 10, 60 * 1000))) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many attempts. Please wait a minute and try again.",
        },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Challenge code is required.",
        },
        { status: 400 },
      );
    }

    if (validateTwintroCode(code)) {
      return NextResponse.json({
        success: true,
        message: "Correct code! Challenge solved.",
      });
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Invalid code. Please check the challenge description and try again.",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("Validate Twintro code error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server error. Please try again.",
      },
      { status: 500 },
    );
  }
}
