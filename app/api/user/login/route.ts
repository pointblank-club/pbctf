import { NextResponse } from "next/server";
import { auth } from "@/Firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // IP rate limiting (10 requests per minute) — throttles password guessing
    const ip = getClientIp(request);
    if (!(await checkRateLimit(ip, 10, 60 * 1000))) {
      return NextResponse.json(
        { message: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const { email, password, recaptcha_token } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    // reCAPTCHA v3 background score check — reject likely-bot traffic.
    const captcha = await verifyRecaptcha(recaptcha_token, "login");
    if (!captcha.ok) {
      console.warn("[login] reCAPTCHA rejected:", captcha.reason, captcha.score);
      return NextResponse.json(
        {
          success: false,
          message: "Security check failed. Please try again.",
          error: { code: "recaptcha_failed", message: "reCAPTCHA verification failed" },
        },
        { status: 400 }
      );
    }

    // Authenticate against Firebase only. Privilege is NEVER derived from the
    // request: a user's role comes solely from their database record, which is
    // provisioned out-of-band (admin via /api/admin/register, evaluator via
    // /api/evaluator/register). There is deliberately no "log in with the shared
    // secret to become admin" path and no account auto-creation here.
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    const idToken = await firebaseUser.getIdToken();

    await dbConnect();
    let user = await User.findOne({ uid: firebaseUser.uid });
    if (!user) {
      user = await User.findOne({ email: email.toLowerCase() });
    }

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Login successful",
      status: "success",
      user: {
        uid: user.uid,
        email: user.email,
        name: user.name,
        isAdmin: user.role === 'admin',
        profile_picture: user.profile_picture || null,
        status: "active"
      },
      token: idToken
    });
  } catch (error: unknown) {
    console.error("Login error:", error);

    const errorCode = error instanceof FirebaseError ? error.code : undefined;
    let errorMessage = "Server error";
    let statusCode = 500;

    switch (errorCode) {
      case 'auth/invalid-email':
        errorMessage = "Invalid email format";
        statusCode = 400;
        break;
      case 'auth/invalid-credential':
        errorMessage = "Invalid credentials";
        statusCode = 401;
        break;
      case 'auth/user-disabled':
        errorMessage = "This account has been disabled";
        statusCode = 403;
        break;
      case 'auth/user-not-found':
        errorMessage = "User not found";
        statusCode = 404;
        break;
      case 'auth/wrong-password':
        errorMessage = "Invalid credentials";
        statusCode = 401;
        break;
      case 'auth/too-many-requests':
        errorMessage = "Too many unsuccessful login attempts. Please try again later";
        statusCode = 429;
        break;
    }

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        error: {
          code: errorCode || 'server_error',
          message: errorMessage
        }
      },
      { status: statusCode }
    );
  }
}
