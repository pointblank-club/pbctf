import { auth } from "@/Firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { NextResponse } from "next/server";
import { cloudinaryV2 } from "@/c";
import fs from "fs";
import path from "path";
import os from "os";
import dbConnect from "@/lib/db";
import User, { IUser } from "@/models/User";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyRecaptcha } from "@/lib/recaptcha";

// Utility functions for format validation
const validateEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validateDiscordUsername = (username: string) =>
  username.length >= 2 && username.length <= 32;
const validateAge = (age: string) => {
  const ageNum = parseInt(age);
  return !isNaN(ageNum) && ageNum > 0 && ageNum < 120;
};
const validateURL = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    // Check for valid hostname (at least one dot and valid characters)
    if (
      !parsedUrl.hostname.includes(".") ||
      !/^[a-zA-Z0-9.-]+$/.test(parsedUrl.hostname)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};
const validateReferralCode = (code: string) => {
  const referralCodesEnv = process.env.VALID_REFERRAL_CODES || "";
  const validCodes = referralCodesEnv
    .split(",")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  return validCodes.includes(code);
};
const validateBio = (bio: string) => bio.length <= 500; // 100 words ≈ 500 chars

// Configure route to disable body parser for file uploads
export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // specify nodejs runtime
export const preferredRegion = "auto"; // or specify regions if needed

// Configure Cloudinary
cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Function to upload file to Cloudinary
const uploadToCloudinary = async (
  filePath: string,
  folder: string,
  mimeType: string,
): Promise<string> => {
  // Choose the appropriate resource type based on mimetype
  const resourceType = mimeType.includes("pdf") ? "raw" : "auto";

  // Prepare upload options
  const uploadOptions: any = {
    folder: folder,
    resource_type: resourceType,
  };

  // For PDFs, add specific options to ensure proper rendering in browser
  if (mimeType.includes("pdf")) {
    uploadOptions.format = "pdf";
    // Add the attachment flag to ensure proper download behavior
    uploadOptions.flags = "attachment";
  }

  return new Promise((resolve, reject) => {
    cloudinaryV2.uploader.upload(
      filePath,
      uploadOptions,
      (error: any, result: any) => {
        if (error) reject(error);
        else {
          let url = result?.secure_url || "";

          // For PDFs, ensure URL format is correct
          if (mimeType.includes("pdf")) {
            // Check if URL needs correction
            if (url.includes("/image/upload/")) {
              // Replace image with raw for PDFs if needed
              url = url.replace("/image/upload/", "/raw/upload/");
            }
          }

          resolve(url);
        }

        // Clean up temp file
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error("Failed to delete temp file:", err);
        }
      },
    );
  });
};

// Parse multipart form data
const parseForm = async (
  req: Request,
): Promise<{ fields: any; files: any }> => {
  const formData = await req.formData();
  const fields: any = {};
  const files: any = {};

  // Get system temp directory
  const tempDir = os.tmpdir();

  // Process all form data
  for (const [key, value] of formData.entries()) {
    const isFile =
      typeof value === "object" &&
      value !== null &&
      typeof (value as any).name === "string" &&
      typeof (value as any).arrayBuffer === "function" &&
      typeof (value as any).type === "string";

    if (isFile) {
      const file = value as any;
      // Create a safe filename - replace spaces and special chars
      const safeFilename = file.name.replace(/[^a-zA-Z0-9.]/g, "_");

      // Save file to system temp directory with a unique name
      const tempFilePath = path.join(tempDir, `${Date.now()}_${safeFilename}`);

      // Get file content as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Use fs.promises.writeFile which handles Buffer types better
      await fs.promises.writeFile(tempFilePath, new Uint8Array(arrayBuffer));

      files[key] = {
        filepath: tempFilePath,
        originalFilename: file.name,
        mimetype: file.type,
        size: file.size,
      };
    } else {
      fields[key] = value;
    }
  }

  return { fields, files };
};

// Create user in Firebase Authentication
const createAuthUser = async (
  email: string,
  password: string,
): Promise<string> => {
  try {
    // Create the user with email and password
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );

    // Send email verification
    await sendEmailVerification(userCredential.user);

    // Return the Firebase Auth UID
    return userCredential.user.uid;
  } catch (error: any) {
    console.error("Firebase Auth error:", error);

    // Handle specific Firebase Auth errors
    if (error.code === "auth/email-already-in-use") {
      throw new Error("Email is already in use with Firebase Authentication");
    } else if (error.code === "auth/invalid-email") {
      throw new Error("Invalid email format for Firebase Authentication");
    } else if (error.code === "auth/weak-password") {
      throw new Error(
        "Password is too weak. It should be at least 6 characters",
      );
    }

    throw error;
  }
};

// Helper function to get or create a batch document
// TODO: Remove batch system - MongoDB doesn't need batching, create user directly
const getOrCreateBatchDocument = async () => {
  // TODO: With MongoDB, we don't need batches - users are stored directly in User collection
  // Return empty batchId since it's not needed with MongoDB
  return { batchId: "", batchDoc: null };
};

export async function POST(request: Request) {
  try {
    // IP rate limiting (5 requests per minute)
    const ip = getClientIp(request);
    if (!(await checkRateLimit(ip, 5, 60 * 1000))) {
      return NextResponse.json(
        {
          message: "Too many requests. Please try again later.",
          error: "Rate limit exceeded",
        },
        { status: 429 }
      );
    }

    const REGISTRATION_DEADLINE = new Date("2026-07-19T10:00:00+05:30");
    if (new Date() > REGISTRATION_DEADLINE) {
      return NextResponse.json(
        {
          message:
            "Registration deadline has passed. Registrations are no longer accepted.",
          error: "Registration closed",
        },
        { status: 403 },
      );
    }
    // Parse form data with files
    const { fields, files } = await parseForm(request);
    const data = { ...fields };
    const { recaptcha_token, password } = data;

    // reCAPTCHA v3 — fail closed (rejects when the token is missing) and check
    // the score + action, before any Firebase/Cloudinary/DB writes.
    const captcha = await verifyRecaptcha(recaptcha_token, "register");
    if (!captcha.ok) {
      console.warn("[registration] reCAPTCHA rejected:", captcha.reason, captcha.score);
      return NextResponse.json(
        {
          message: "reCAPTCHA validation failed",
          error: "Security check failed. Please try again.",
        },
        { status: 400 },
      );
    }

    // Check if required resume file is present
    if (!files.resume) {
      return NextResponse.json(
        {
          message: "Resume file is required.",
          error: "Missing resume file",
        },
        { status: 400 },
      );
    }

    // Validate resume file is PDF
    const resumeFile = files.resume;
    if (!resumeFile.mimetype.includes("pdf")) {
      return NextResponse.json(
        {
          message: "Resume must be in PDF format.",
          error: "Invalid resume format",
        },
        { status: 400 },
      );
    }

    // Check file size limit (1MB = 1,048,576 bytes)
    if (resumeFile.size > 1 * 1024 * 1024) {
      return NextResponse.json(
        {
          message: "Resume file size must be under 1MB.",
          error: "File size limit exceeded",
        },
        { status: 413 },
      );
    }

    // Validate profile picture if provided (must be an image)
    let profilePictureUrl: string | null = null;
    if (files.profile_picture) {
      const profileFile = files.profile_picture;
      if (!profileFile.mimetype.includes("image")) {
        return NextResponse.json(
          {
            message: "Profile picture must be an image format.",
            error: "Invalid profile picture format",
          },
          { status: 400 },
        );
      }

      // Check file size limit (1MB = 1,048,576 bytes)
      if (profileFile.size > 1 * 1024 * 1024) {
        return NextResponse.json(
          {
            message: "Profile picture size must be under 1MB.",
            error: "File size limit exceeded",
          },
          { status: 413 },
        );
      }

      // Upload profile picture to Cloudinary
      try {
        profilePictureUrl = await uploadToCloudinary(
          profileFile.filepath,
          "profile_pictures",
          profileFile.mimetype,
        );
      } catch (error) {
        console.error("Failed to upload profile picture:", error);
        return NextResponse.json(
          {
            message: "Failed to upload profile picture.",
            error: String(error),
          },
          { status: 500 },
        );
      }
    }

    // Upload resume to Cloudinary
    let resumeUrl: string;
    try {
      resumeUrl = await uploadToCloudinary(
        resumeFile.filepath,
        "resumes",
        resumeFile.mimetype,
      );
    } catch (error) {
      console.error("Failed to upload resume:", error);
      return NextResponse.json(
        {
          message: "Failed to upload resume.",
          error: String(error),
        },
        { status: 500 },
      );
    }

    // Validate required fields
    if (
      !data.name ||
      !data.email ||
      !data.discord_username ||
      !data.linkedin_link ||
      !data.github_link ||
      !resumeUrl ||
      !password ||
      !data.bio ||
      !data.age ||
      !data.organisation
    ) {
      return NextResponse.json(
        {
          message: "Required information is missing.",
          error: "Missing required fields",
        },
        { status: 400 },
      );
    }

    // Validate required fields format
    if (!validateEmail(data.email)) {
      return NextResponse.json(
        {
          message: "Invalid email format.",
          error: "Invalid email",
        },
        { status: 400 },
      );
    }

    if (!validateDiscordUsername(data.discord_username)) {
      return NextResponse.json(
        {
          message: "Invalid Discord username.",
          error: "Invalid Discord username",
        },
        { status: 400 },
      );
    }

    // Validate password (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        {
          message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
          error: "Weak password",
        },
        { status: 400 },
      );
    }

    if (data.github_link && !validateURL(data.github_link)) {
      return NextResponse.json(
        {
          message: "Invalid GitHub profile URL format.",
          error: "Invalid GitHub profile",
        },
        { status: 400 },
      );
    }

    if (data.linkedin_link && !validateURL(data.linkedin_link)) {
      return NextResponse.json(
        {
          message: "Invalid LinkedIn profile URL format.",
          error: "Invalid LinkedIn profile",
        },
        { status: 400 },
      );
    }

    if (data.ctf_profile && !validateURL(data.ctf_profile)) {
      return NextResponse.json(
        {
          message: "Invalid CTF profile URL format.",
          error: "Invalid CTF profile",
        },
        { status: 400 },
      );
    }

    if (data.portfolio_link && !validateURL(data.portfolio_link)) {
      return NextResponse.json(
        {
          message: "Invalid Portfolio URL format.",
          error: "Invalid Portfolio link",
        },
        { status: 400 },
      );
    }

    if (!validateBio(data.bio)) {
      return NextResponse.json(
        {
          message: "Bio exceeds maximum length of 500 characters.",
          error: "Bio too long",
        },
        { status: 400 },
      );
    }

    if (!validateAge(data.age)) {
      return NextResponse.json(
        {
          message: "Invalid age value.",
          error: "Invalid age",
        },
        { status: 400 },
      );
    }

    if (!data.organisation || data.organisation.trim().length === 0) {
      return NextResponse.json(
        {
          message: "Organisation is required.",
          error: "Invalid organisation",
        },
        { status: 400 },
      );
    }

    if (data.referral_code && !validateReferralCode(data.referral_code)) {
      return NextResponse.json(
        {
          message: "Invalid referral code.",
          error: "Invalid referral code",
        },
        { status: 400 },
      );
    }

    await dbConnect();
    // Check for duplicate email registration
    const existingUserByEmail = await User.findOne({ email: data.email });
    if (existingUserByEmail) {
      return NextResponse.json(
        {
          message: "Email is already registered!",
          error: "Email is already registered!",
        },
        { status: 400 },
      );
    }

    // Check for duplicate discord registration
    const existingUserByDiscord = await User.findOne({
      discord_username: String(data.discord_username),
    });
    if (existingUserByDiscord) {
      return NextResponse.json(
        {
          message: "Discord username is already registered!",
          error: "Discord username is already registered!",
        },
        { status: 400 },
      );
    }

    // Create user in Firebase Authentication
    let authUid: string;
    try {
      authUid = await createAuthUser(data.email, password);
    } catch (error: any) {
      return NextResponse.json(
        {
          message: error.message || "Authentication failed",
          error: String(error),
        },
        { status: 400 },
      );
    }

    const userData: Partial<IUser> = {
      uid: authUid,
      name: data.name,
      email: data.email,
      discord_username: String(data.discord_username), // Store discord username as string
      resume_link: resumeUrl,
      bio: data.bio,
      age: parseInt(data.age),
      organisation: data.organisation,
      isLooking: false, // Default value
    };

    const updates = {
      ...(profilePictureUrl && { profile_picture: profilePictureUrl }),
      ...(data.github_link && { github_link: data.github_link }),
      ...(data.linkedin_link && { linkedin_link: data.linkedin_link }),
      ...(data.ctf_profile && { ctf_profile: data.ctf_profile }),
      ...(data.portfolio_link && { portfolio_link: data.portfolio_link }),
    };

    Object.assign(userData, updates);

    const newUser = await new User(userData).save();
    const userId = newUser._id.toString();

    return NextResponse.json({
      message: "Registration successful",
      uid: authUid,
      status: "pending_verification",
      // Include any token or auth information needed for subsequent requests
      // token: authUid,
      user: {
        uid: authUid,
        email: data.email,
        name: data.name,
        isAdmin: false,
        profile_picture: profilePictureUrl || null,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      {
        message: "An error occurred during registration",
        error: String(error),
        status: "error",
      },
      { status: 500 },
    );
  }
}

// GET endpoint for frontend validation
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const discord_username = searchParams.get("discord_username");

  if (!email && !discord_username) {
    return NextResponse.json(
      {
        message: "Missing query parameters",
        error: "Email or Discord username must be provided",
      },
      { status: 400 },
    );
  }

  try {
    await dbConnect();
    if (email) {
      const existingUser = await User.findOne({ email });
      return NextResponse.json({
        exists: !!existingUser,
        field: "email",
      });
    }

    if (discord_username) {
      const existingUser = await User.findOne({
        discord_username: String(discord_username),
      });
      return NextResponse.json({
        exists: !!existingUser,
        field: "discord_username",
      });
    }
  } catch (error) {
    console.error("Check registration error:", error);
    return NextResponse.json(
      { message: "An error occurred", error: String(error) },
      { status: 500 },
    );
  }
}
