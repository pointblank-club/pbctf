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
import { isRegistrationClosed } from "@/lib/constants";

// Utility functions for format validation
const validateEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validateDiscordUsername = (username: string) =>
  username.length >= 2 && username.length <= 32;
const validateAge = (age: string) => {
  const ageNum = parseInt(age);
  return !isNaN(ageNum) && ageNum > 0 && ageNum < 120;
};

const isValidLinkUrl = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return true;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }
  return (
    (parsed.protocol === "https:" || parsed.protocol === "http:") &&
    parsed.hostname.includes(".") &&
    /^[a-zA-Z0-9.-]+$/.test(parsed.hostname)
  );
};

const isValidLinkDomain = (value: unknown, domains: string[]): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value !== "string" || !value.trim()) return true;
  if (!isValidLinkUrl(value)) return false;
  const host = new URL(value.trim()).hostname
    .toLowerCase()
    .replace(/^www\./, "");
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
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

const normalizePhoneForComparison = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
};

const normalizeProfileLink = (link: string) => {
  const parsed = new URL(link.trim());
  parsed.hash = "";
  parsed.search = "";
  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed.toString();
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildProfileLinkCandidates = (link: string) => {
  const normalized = normalizeProfileLink(link);
  const protocolVariants = ["https://", "http://"].flatMap((protocol) => {
    const withoutProtocol = normalized.replace(/^https?:\/\//, "");
    const base = `${protocol}${withoutProtocol}`;
    const withWww = base.replace("://", "://www.");
    return [base, `${base}/`, withWww, `${withWww}/`];
  });
  return Array.from(new Set([link.trim(), normalized, ...protocolVariants])).map(
    (candidate) => new RegExp(`^${escapeRegExp(candidate)}$`, "i"),
  );
};

const validateRegistrationStep = async (data: Record<string, string | null>) => {
  const errors: Record<string, string> = {};
  const step = data.step;
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

  if (step === "account") {
    const normalizedEmail = data.email?.trim().toLowerCase() || "";
    if (!normalizedEmail) {
      errors.email = "Email is required.";
    } else if (!validateEmail(normalizedEmail)) {
      errors.email = "Invalid email format.";
    }

    if (!data.password) {
      errors.password = "Password is required.";
    } else if (!passwordRegex.test(data.password)) {
      errors.password =
        "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.";
    }

    if (!data.confirm_password) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (data.password !== data.confirm_password) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (!errors.email && normalizedEmail) {
      await dbConnect();
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        errors.email = "This email is already registered.";
      }
    }
  } else if (step === "identity") {
    if (!data.name?.trim()) errors.name = "Name is required.";
    if (!data.age?.trim()) {
      errors.age = "Age is required.";
    } else if (!validateAge(data.age)) {
      errors.age = "Invalid age value.";
    }
    if (!data.phone?.trim()) errors.phone = "Phone is required.";
    if (!data.discord_username?.trim()) {
      errors.discord_username = "Discord username is required.";
    } else if (!validateDiscordUsername(data.discord_username.trim())) {
      errors.discord_username = "Invalid Discord username.";
    }
    if (!data.organisation?.trim()) {
      errors.organisation = "Organisation is required.";
    }

    if (!errors.phone && data.phone?.trim()) {
      await dbConnect();
      const normalizedPhone = normalizePhoneForComparison(data.phone);
      const existingPhone = await User.findOne({
        phone: {
          $in: [
            data.phone.trim(),
            normalizedPhone,
            `+${normalizedPhone}`,
            normalizedPhone.startsWith("91")
              ? normalizedPhone.slice(2)
              : normalizedPhone,
            normalizedPhone.startsWith("91")
              ? `0${normalizedPhone.slice(2)}`
              : normalizedPhone,
          ],
        },
      });
      if (existingPhone) {
        errors.phone = "This phone number is already registered.";
      }
    }

    if (!errors.discord_username && data.discord_username?.trim()) {
      await dbConnect();
      const existingUser = await User.findOne({
        discord_username: String(data.discord_username.trim()),
      });
      if (existingUser) {
        errors.discord_username =
          "This Discord username is already registered.";
      }
    }
  } else if (step === "profile") {
    if (!data.bio?.trim()) {
      errors.bio = "Bio is required.";
    } else if (!validateBio(data.bio)) {
      errors.bio = "Bio exceeds maximum length of 500 characters.";
    }
  } else if (step === "links") {
    if (!data.github_link?.trim()) {
      errors.github = "GitHub link is required.";
    } else if (!isValidLinkDomain(data.github_link, ["github.com"])) {
      errors.github = "Invalid GitHub profile URL format.";
    }

    if (!data.linkedin_link?.trim()) {
      errors.linkedin = "LinkedIn link is required.";
    } else if (!isValidLinkDomain(data.linkedin_link, ["linkedin.com"])) {
      errors.linkedin = "Invalid LinkedIn profile URL format.";
    }

    if (data.portfolio_link?.trim() && !isValidLinkUrl(data.portfolio_link)) {
      errors.portfolio = "Invalid Portfolio URL format.";
    }

    if (data.ctf_profile?.trim() && !isValidLinkUrl(data.ctf_profile)) {
      errors.ctf = "Invalid CTF profile URL format.";
    }

    if (!errors.github && data.github_link?.trim()) {
      await dbConnect();
      const existingGithub = await User.findOne({
        github_link: { $in: buildProfileLinkCandidates(data.github_link) },
      });
      if (existingGithub) {
        errors.github = "This GitHub profile is already registered.";
      }
    }

    if (!errors.linkedin && data.linkedin_link?.trim()) {
      await dbConnect();
      const existingLinkedin = await User.findOne({
        linkedin_link: { $in: buildProfileLinkCandidates(data.linkedin_link) },
      });
      if (existingLinkedin) {
        errors.linkedin = "This LinkedIn profile is already registered.";
      }
    }
  } else {
    errors.step = "Invalid validation step";
  }

  return errors;
};

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
    const ip = getClientIp(request);

    if (request.headers.get("content-type")?.includes("application/json")) {
      if (!(await checkRateLimit(`${ip}:registration_validation`, 20, 60 * 1000))) {
        return NextResponse.json(
          {
            message: "Too many validation requests. Please try again later.",
            error: "Rate limit exceeded",
          },
          { status: 429 },
        );
      }

      const body = await request.json();
      if (body?.validation_step) {
        if (isRegistrationClosed()) {
          return NextResponse.json(
            {
              message:
                "Registration deadline has passed. Registrations are no longer accepted.",
              error: "Registration closed",
            },
            { status: 403 },
          );
        }

        const captcha = await verifyRecaptcha(
          body.recaptcha_token,
          "check_registration",
        );
        if (!captcha.ok) {
          console.warn(
            "[registration:check] reCAPTCHA rejected:",
            captcha.reason,
            captcha.score,
          );
          return NextResponse.json(
            {
              message: "reCAPTCHA validation failed",
              error: "Security check failed. Please try again.",
            },
            { status: 400 },
          );
        }

        const errors = await validateRegistrationStep({
          ...body,
          step: body.validation_step,
        });
        if (errors.step) {
          return NextResponse.json(
            {
              message: errors.step,
              error: errors.step,
            },
            { status: 400 },
          );
        }

        return NextResponse.json({
          valid: Object.keys(errors).length === 0,
          errors,
        });
      }
    }

    // IP rate limiting (5 requests per minute)
    if (!(await checkRateLimit(ip, 5, 60 * 1000))) {
      return NextResponse.json(
        {
          message: "Too many requests. Please try again later.",
          error: "Rate limit exceeded",
        },
        { status: 429 },
      );
    }

    if (isRegistrationClosed()) {
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
      console.warn(
        "[registration] reCAPTCHA rejected:",
        captcha.reason,
        captcha.score,
      );
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
    data.email = data.email.trim().toLowerCase();

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
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        {
          message:
            "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
          error: "Weak password",
        },
        { status: 400 },
      );
    }

    if (
      data.github_link &&
      !isValidLinkDomain(data.github_link, ["github.com"])
    ) {
      return NextResponse.json(
        {
          message: "Invalid GitHub profile URL format.",
          error: "Invalid GitHub profile",
        },
        { status: 400 },
      );
    }

    data.github_link = normalizeProfileLink(data.github_link);

    if (
      data.linkedin_link &&
      !isValidLinkDomain(data.linkedin_link, ["linkedin.com"])
    ) {
      return NextResponse.json(
        {
          message: "Invalid LinkedIn profile URL format.",
          error: "Invalid LinkedIn profile",
        },
        { status: 400 },
      );
    }

    data.linkedin_link = normalizeProfileLink(data.linkedin_link);

    if (data.ctf_profile && !isValidLinkUrl(data.ctf_profile)) {
      return NextResponse.json(
        {
          message: "Invalid CTF profile URL format.",
          error: "Invalid CTF profile",
        },
        { status: 400 },
      );
    }

    if (data.portfolio_link && !isValidLinkUrl(data.portfolio_link)) {
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

    await dbConnect();

    const normalizedPhone = normalizePhoneForComparison(String(data.phone));
    const existingUserByPhone = await User.findOne({
      phone: {
        $in: [
          String(data.phone).trim(),
          normalizedPhone,
          `+${normalizedPhone}`,
          normalizedPhone.startsWith("91")
            ? normalizedPhone.slice(2)
            : normalizedPhone,
          normalizedPhone.startsWith("91")
            ? `0${normalizedPhone.slice(2)}`
            : normalizedPhone,
        ],
      },
    });
    if (existingUserByPhone) {
      return NextResponse.json(
        {
          message: "Phone number is already registered!",
          error: "Phone number is already registered!",
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

    const existingUserByGithub = await User.findOne({
      github_link: { $in: buildProfileLinkCandidates(data.github_link) },
    });
    if (existingUserByGithub) {
      return NextResponse.json(
        {
          message: "GitHub profile is already registered!",
          error: "GitHub profile is already registered!",
        },
        { status: 400 },
      );
    }

    const existingUserByLinkedin = await User.findOne({
      linkedin_link: { $in: buildProfileLinkCandidates(data.linkedin_link) },
    });
    if (existingUserByLinkedin) {
      return NextResponse.json(
        {
          message: "LinkedIn profile is already registered!",
          error: "LinkedIn profile is already registered!",
        },
        { status: 400 },
      );
    }

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
      phone: String(data.phone).trim(),
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
  const recaptcha_token = searchParams.get("recaptcha_token");

  // reCAPTCHA v3 — fail closed (rejects when the token is missing) and check
  // the score + action before any DB lookups. GET carries the token as a query
  // param since there is no request body.
  const captcha = await verifyRecaptcha(recaptcha_token, "check_registration");
  if (!captcha.ok) {
    console.warn(
      "[registration:check] reCAPTCHA rejected:",
      captcha.reason,
      captcha.score,
    );
    return NextResponse.json(
      {
        message: "reCAPTCHA validation failed",
        error: "Security check failed. Please try again.",
      },
      { status: 400 },
    );
  }

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
      const existingUser = await User.findOne({
        email: email.trim().toLowerCase(),
      });
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
