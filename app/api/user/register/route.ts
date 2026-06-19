import { NextResponse } from "next/server";
import { auth } from "@/Firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { cloudinaryV2 } from "@/c";
import dbConnect from "@/lib/db";
import User, { IUser } from "@/models/User";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAuth as getAdminAuth } from "@/lib/firebase-admin";

// Configure route
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Configure Cloudinary
cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Validation functions
const validateEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validateDiscordUsername = (username: string) =>
  username.length >= 2 && username.length <= 32;
const validatePhone = (phone: string) => /^\+?\d{1,4}[-\s]?\d{10}$/.test(phone);
const validateAge = (age: number) => age >= 13 && age <= 100;
const validatePassword = (password: string) => {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
};
const validateURL = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Upload base64 file to Cloudinary
async function uploadBase64ToCloudinary(
  base64Data: string,
  folder: string,
  resourceType: "image" | "raw",
): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinaryV2.uploader.upload(
      base64Data,
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result!.secure_url);
      },
    );
  });
}

export async function POST(request: Request) {
  try {
    // IP rate limiting (5 requests per minute)
    const ip = getClientIp(request);
    if (!(await checkRateLimit(ip, 5, 60 * 1000))) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many requests. Please try again later.",
          error: {
            code: "rate_limit_exceeded",
            message: "Rate limit exceeded",
          },
        },
        { status: 429 },
      );
    }

    const REGISTRATION_DEADLINE = new Date("2026-07-19T10:00:00+05:30");
    if (new Date() > REGISTRATION_DEADLINE) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Registration deadline has passed. Registrations are no longer accepted.",
          error: {
            code: "registration_closed",
            message:
              "Registration deadline has passed. Registrations are no longer accepted.",
          },
        },
        { status: 403 },
      );
    }

    const formData = await request.formData();

    // reCAPTCHA v3 background score check — reject likely-bot registrations
    // before doing any Firebase/Cloudinary/DB work.
    const recaptchaToken = formData.get("recaptcha_token") as string | null;
    const captcha = await verifyRecaptcha(recaptchaToken, "register");
    if (!captcha.ok) {
      console.warn(
        "[register] reCAPTCHA rejected:",
        captcha.reason,
        captcha.score,
      );
      return NextResponse.json(
        {
          success: false,
          message: "Security check failed. Please try again.",
          error: {
            code: "recaptcha_failed",
            message: "reCAPTCHA verification failed",
          },
        },
        { status: 400 },
      );
    }

    const isGoogle = formData.get("auth_provider") === "google";
    let googleUid: string | undefined;
    let googleEmail: string | undefined;
    if (isGoogle) {
      const idToken = formData.get("id_token") as string | null;
      if (!idToken) {
        return NextResponse.json(
          {
            success: false,
            message: "Missing Google sign-in token",
            error: {
              code: "missing_id_token",
              message: "Missing Google sign-in token",
            },
          },
          { status: 400 },
        );
      }
      try {
        const decoded = await getAdminAuth().verifyIdToken(idToken);
        googleUid = decoded.uid;
        googleEmail = decoded.email?.toLowerCase();
      } catch (tokenError) {
        console.error(
          "[register] Google ID token verification failed:",
          tokenError,
        );
        return NextResponse.json(
          {
            success: false,
            message: "Invalid Google sign-in token. Please sign in again.",
            error: {
              code: "invalid_id_token",
              message: "Invalid Google sign-in token",
            },
          },
          { status: 401 },
        );
      }
      if (!googleEmail) {
        return NextResponse.json(
          {
            success: false,
            message: "Your Google account has no email address.",
            error: {
              code: "google_no_email",
              message: "Google account has no email address",
            },
          },
          { status: 400 },
        );
      }
    }

    // Helper to convert File to base64
    const fileToBase64 = async (file: File): Promise<string> => {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return `data:${file.type};base64,${buffer.toString("base64")}`;
    };

    // Extract fields
    const name = formData.get("name") as string;
    // For Google, the email comes from the verified ID token, never the client.
    const email = isGoogle
      ? (googleEmail as string)
      : (formData.get("email") as string);
    const password = formData.get("password") as string;
    const discord_username = formData.get("discord_username") as string;
    const phone = formData.get("phone") as string;
    const age = formData.get("age") as string;
    const organisation = formData.get("organisation") as string;
    const bio = formData.get("bio") as string;

    // Handle files
    const resumeFile = formData.get("resume") as File | null;
    const profilePicFile = formData.get("profile_picture") as File | null;

    let resume: string | undefined;
    if (resumeFile && resumeFile.size > 0) {
      resume = await fileToBase64(resumeFile);
    }

    let profile_picture: string | undefined;
    if (profilePicFile && profilePicFile.size > 0) {
      profile_picture = await fileToBase64(profilePicFile);
    }

    const github_link = formData.get("github_link") as string;
    const linkedin_link = formData.get("linkedin_link") as string;
    const portfolio_link = formData.get("portfolio_link") as string;
    const ctf_profile = formData.get("ctf_profile") as string;
    const isLooking = formData.get("isLooking") === "true";

    // Validation
    const errors: Record<string, string> = {};

    if (!name?.trim() || name.length < 2 || name.length > 100) {
      errors.name = "Name is required (2-100 characters)";
    }

    if (!email?.trim()) {
      errors.email = "Email is required";
    } else if (!validateEmail(email)) {
      errors.email = "Invalid email format";
    }

    // Google users have no password — Firebase handles their credential.
    if (!isGoogle && (!password || !validatePassword(password))) {
      errors.password =
        "Password must be at least 8 characters and contain uppercase, lowercase, number, and special character";
    }

    if (!discord_username?.trim()) {
      errors.discord_username = "Discord username is required";
    } else if (!validateDiscordUsername(discord_username)) {
      errors.discord_username = "Invalid Discord username";
    }

    if (!phone?.trim()) {
      errors.phone = "Phone number is required";
    } else if (!validatePhone(phone)) {
      errors.phone = "Invalid phone format";
    }

    if (age === undefined || age === null) {
      errors.age = "Age is required";
    } else if (!validateAge(Number(age))) {
      errors.age = "Age must be between 13 and 100";
    }

    if (
      !organisation?.trim() ||
      organisation.length < 2 ||
      organisation.length > 200
    ) {
      errors.organisation = "Organisation is required (2-200 characters)";
    }

    // Optional URL validations
    if (github_link && !validateURL(github_link)) {
      errors.github_link = "Invalid GitHub URL";
    }
    if (linkedin_link && !validateURL(linkedin_link)) {
      errors.linkedin_link = "Invalid LinkedIn URL";
    }
    if (portfolio_link && !validateURL(portfolio_link)) {
      errors.portfolio_link = "Invalid portfolio URL";
    }

    if (Object.keys(errors).length > 0) {
      console.error("Registration validation errors:", errors);
      return NextResponse.json(
        {
          success: false,
          message: "Validation error",
          errors,
        },
        { status: 400 },
      );
    }

    // Connect to database
    await dbConnect();

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Email already exists",
          error: { code: "email_exists", message: "Email already exists" },
        },
        { status: 409 },
      );
    }

    // Check if discord username already exists
    const existingDiscord = await User.findOne({ discord_username });
    if (existingDiscord) {
      return NextResponse.json(
        {
          success: false,
          message: "Discord username already exists",
          error: {
            code: "discord_exists",
            message: "Discord username already exists",
          },
        },
        { status: 409 },
      );
    }

    // Check if phone already exists
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return NextResponse.json(
        {
          success: false,
          message: "Phone number already exists",
          error: {
            code: "phone_exists",
            message: "Phone number already exists",
          },
        },
        { status: 409 },
      );
    }

    if (isGoogle) {
      const existingUid = await User.findOne({ uid: googleUid });
      if (existingUid) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This Google account is already registered. Please log in.",
            error: {
              code: "already_registered",
              message: "Account already exists",
            },
          },
          { status: 409 },
        );
      }
    }

    // Resolve the Firebase uid. Email/password users are created here (and sent
    // a verification email); Google users already exist in Firebase with a
    // verified email, so we reuse the uid from their ID token and skip both.
    let uid: string;
    if (isGoogle) {
      uid = googleUid!;
    } else {
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await sendEmailVerification(userCredential.user);
        uid = userCredential.user.uid;
      } catch (firebaseError: any) {
        if (firebaseError.code === "auth/email-already-in-use") {
          return NextResponse.json(
            {
              success: false,
              message: "Email already exists",
              error: { code: "email_exists", message: "Email already exists" },
            },
            { status: 409 },
          );
        }
        if (firebaseError.code === "auth/weak-password") {
          return NextResponse.json(
            {
              success: false,
              message: "Password is too weak",
              error: { code: "weak_password", message: "Password is too weak" },
            },
            { status: 400 },
          );
        }
        throw firebaseError;
      }
    }

    // Upload files to Cloudinary if provided
    let resumeUrl: string | undefined;
    let profilePicUrl: string | undefined;

    if (resume) {
      try {
        resumeUrl = await uploadBase64ToCloudinary(
          resume,
          "zenith/resumes",
          "raw",
        );
      } catch (uploadError) {
        console.error("Resume upload error:", uploadError);
        // Continue without resume
      }
    }

    if (profile_picture) {
      try {
        profilePicUrl = await uploadBase64ToCloudinary(
          profile_picture,
          "zenith/profiles",
          "image",
        );
      } catch (uploadError) {
        console.error("Profile picture upload error:", uploadError);
        // Continue without profile picture
      }
    }

    // Create user in MongoDB
    const newUser = new User({
      uid,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      discord_username: discord_username.trim(),
      age: Number(age),
      organisation: organisation.trim(),
      bio: bio?.trim(),
      resume_link: resumeUrl,
      profile_picture: profilePicUrl,
      github_link: github_link?.trim(),
      linkedin_link: linkedin_link?.trim(),
      portfolio_link: portfolio_link?.trim(),
      ctf_profile: ctf_profile?.trim(),
      isLooking: Boolean(isLooking),
      role: "user",
      teamCode: undefined,
      authProvider: isGoogle ? "google" : "password",
    });

    await newUser.save();

    return NextResponse.json(
      {
        message: "Registration successful",
        uid,
        // Google emails arrive verified, so there's nothing pending for them.
        status: isGoogle ? "active" : "pending_verification",
        user: {
          uid,
          email: newUser.email,
          name: newUser.name,
          isAdmin: false,
          profile_picture: newUser.profile_picture || null,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Server error",
        error: {
          code: "server_error",
          message: error instanceof Error ? error.message : "Server error",
          details: process.env.NODE_ENV === "development" ? error : undefined,
        },
      },
      { status: 500 },
    );
  }
}
