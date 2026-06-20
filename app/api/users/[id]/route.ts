import { NextRequest, NextResponse } from "next/server";
import { cloudinaryV2 } from "@/c";
import fs from "fs";
import path from "path";
import os from "os";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Team from "@/models/Team";
import {
  authenticateUser,
  createAuthErrorResponse,
  requireAdmin,
  requireEmailVerified,
} from "@/lib/middleware/auth";
import { verifyRecaptcha } from "@/lib/recaptcha";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // specify nodejs runtime
export const preferredRegion = "auto"; // or specify regions if needed

// Configure Cloudinary
cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Function to extract public_id from Cloudinary URL
const extractPublicIdFromUrl = (url: string): string => {
  if (!url) return "";

  try {
    const urlObj = new URL(url);
    let pathname = urlObj.pathname;
    pathname = pathname.replace(/\/(image|raw)\/upload\//, "");
    const publicId = pathname.substring(0, pathname.lastIndexOf("."));
    return publicId;
  } catch (error) {
    console.error("Failed to extract public ID from URL:", error);
    return "";
  }
};

// Function to delete file from Cloudinary
const deleteFromCloudinary = async (
  url: string,
  resourceType: string = "image",
): Promise<boolean> => {
  if (!url) return true;

  const publicId = extractPublicIdFromUrl(url);
  if (!publicId) return false;

  return new Promise((resolve) => {
    cloudinaryV2.uploader.destroy(
      publicId,
      { resource_type: resourceType },
      (error: Error | null, result: any) => {
        if (error || result.result !== "ok") {
          console.error("Failed to delete from Cloudinary:", error || result);
          resolve(false);
        } else {
          console.log("Successfully deleted from Cloudinary:", publicId);
          resolve(true);
        }
      },
    );
  });
};

// Function to upload file to Cloudinary
const uploadToCloudinary = async (
  filePath: string,
  folder: string,
  mimeType: string,
): Promise<string> => {
  const resourceType = mimeType.includes("pdf") ? "raw" : "auto";

  const uploadOptions: any = {
    folder: folder,
    resource_type: resourceType,
  };

  if (mimeType.includes("pdf")) {
    uploadOptions.format = "pdf";
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

          if (mimeType.includes("pdf")) {
            if (url.includes("/image/upload/")) {
              url = url.replace("/image/upload/", "/raw/upload/");
            }
          }

          resolve(url);
        }

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
): Promise<{ fields: Record<string, any>; files: Record<string, any> }> => {
  const formData = await req.formData();
  const fields: Record<string, any> = {};
  const files: Record<string, any> = {};

  const tempDir = os.tmpdir();

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      const safeFilename = value.name.replace(/[^a-zA-Z0-9.]/g, "_");
      const tempFilePath = path.join(tempDir, `${Date.now()}_${safeFilename}`);
      const arrayBuffer = await value.arrayBuffer();
      await fs.promises.writeFile(tempFilePath, new Uint8Array(arrayBuffer));

      files[key] = {
        filepath: tempFilePath,
        originalFilename: value.name,
        mimetype: value.type,
        size: value.size,
      };
    } else {
      fields[key] = value;
    }
  }

  return { fields, files };
};

// Validate an optional profile link. Empty/undefined is allowed (the field can
// be cleared); a provided value must be a well-formed absolute http(s) URL with
// a real hostname — non-web schemes (javascript:, data:, mailto:, …) are
// rejected so we never store a value that breaks or could be used for injection.
function isValidLinkUrl(value: unknown): boolean {
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
}

// Same as isValidLinkUrl, but the host must be (a subdomain of) one of
// `domains`. Used for fields that must point at a specific site (GitHub /
// LinkedIn). A leading `www.` is ignored.
function isValidLinkDomain(value: unknown, domains: string[]): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value !== "string" || !value.trim()) return true;
  if (!isValidLinkUrl(value)) return false;
  const host = new URL(value.trim())
    .hostname.toLowerCase()
    .replace(/^www\./, "");
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authResult = await authenticateUser(req);
    if (!authResult.success) {
      return createAuthErrorResponse(authResult);
    }

    await dbConnect();

    let user = await User.findOne({ uid: params.id });
    if (!user && params.id.includes("@")) {
      // Searching by email
      user = await User.findOne({ email: params.id });
    } else if (!user) {
      try {
        user = await User.findById(params.id);
      } catch (e) {}
    }

    if (!user) {
      return NextResponse.json(
        {
          message: "User not found",
          status: "error",
        },
        { status: 404 },
      );
    }

    // A profile is visible when any of these hold:
    //   - the requester is an admin or evaluator
    //   - the requester is viewing their own profile
    //   - the requester and target are on the same team
    //   - the target is personally "looking for a team" (isLooking)
    //   - the target's team is discoverable (looking for members)
    // Otherwise the profile is private.
    const requester = authResult.user;
    const isPrivileged =
      requester.role === "admin" || requester.role === "evaluator";
    const isSelf = requester.uid === user.uid;
    const isTeammate =
      !!requester.teamCode &&
      !!user.teamCode &&
      requester.teamCode === user.teamCode;

    let canView = user.isLooking || isPrivileged || isSelf || isTeammate;

    // Expose members of a team that is itself looking for members, so the team
    // can be browsed from the Discover page.
    if (!canView && user.teamCode) {
      const team = await Team.findOne({ teamCode: user.teamCode }).select(
        "isLooking",
      );
      canView = !!team?.isLooking;
    }

    if (!canView) {
      return NextResponse.json(
        {
          message: "This profile is private",
          status: "error",
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      message: "User found",
      status: "success",
      user: {
        uid: user.uid,
        email: user.email,
        name: user.name,
        discord_username: user.discord_username || null,
        profile_picture: user.profile_picture || null,
        resume_link: user.resume_link || null,
        github_link: user.github_link || null,
        linkedin_link: user.linkedin_link || null,
        portfolio_link: user.portfolio_link || null,
        ctf_profile: user.ctf_profile || null,
        bio: user.bio || null,
        age: user.age || null,
        organisation: user.organisation || null,
        isLooking: user.isLooking,
        role: user.role,
        isAdmin: user.role === "admin",
        hasSolvedChallenge: user.hasSolvedChallenge || false,
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch user",
        error: String(error),
        status: "error",
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authResult = await authenticateUser(req);
    if (!authResult.success) {
      return createAuthErrorResponse(authResult);
    }

    const { fields, files } = await parseForm(req);

    // reCAPTCHA v3 background score check — reject likely-bot/scripted uploads.
    const captcha = await verifyRecaptcha(fields.recaptcha_token, "update_user");
    if (!captcha.ok) {
      console.warn(
        "[users/[id]] reCAPTCHA rejected:",
        captcha.reason,
        captcha.score,
      );
      return NextResponse.json(
        {
          message: "reCAPTCHA verification failed",
          status: "error",
          error: {
            code: "recaptcha_failed",
            message: "reCAPTCHA verification failed",
          },
        },
        { status: 400 },
      );
    }

    const updates: Record<string, any> = { ...fields };
    delete updates.recaptcha_token;

    // Validate profile links. Empty clears the field; a provided value must be
    // a well-formed http(s) URL (and the correct site for GitHub / LinkedIn).
    if (!isValidLinkDomain(updates.github_link, ["github.com"])) {
      return NextResponse.json(
        {
          message: "Please enter a valid GitHub URL (e.g. https://github.com/username)",
          status: "error",
        },
        { status: 400 },
      );
    }
    if (!isValidLinkDomain(updates.linkedin_link, ["linkedin.com"])) {
      return NextResponse.json(
        {
          message:
            "Please enter a valid LinkedIn URL (e.g. https://linkedin.com/in/username)",
          status: "error",
        },
        { status: 400 },
      );
    }
    if (!isValidLinkUrl(updates.portfolio_link)) {
      return NextResponse.json(
        {
          message: "Please enter a valid portfolio URL (https://…)",
          status: "error",
        },
        { status: 400 },
      );
    }
    if (!isValidLinkUrl(updates.ctf_profile)) {
      return NextResponse.json(
        {
          message: "Please enter a valid CTF profile URL (https://…)",
          status: "error",
        },
        { status: 400 },
      );
    }

    await dbConnect();

    let user = null;
    try {
      user = await User.findById(params.id);
    } catch (e) {
      // Ignore invalid ObjectId
    }

    if (!user) {
      // Try finding by uid
      user = await User.findOne({ uid: params.id });
    }

    if (!user) {
      return NextResponse.json(
        {
          message: "User not found",
          status: "error",
        },
        { status: 404 },
      );
    }

    // Authorization Check
    const isSelf = user.uid === authResult.user.uid;
    const isAdmin = authResult.user.role === "admin";

    if (!isSelf && !isAdmin) {
      return NextResponse.json(
        {
          message: "Unauthorized: You can only update your own profile",
          status: "error",
        },
        { status: 403 },
      );
    }

    // Check if name update is attempted (not allowed)
    if (updates.name) {
      return NextResponse.json(
        {
          message: "Name cannot be updated",
          status: "error",
        },
        { status: 400 },
      );
    }

    // Handle resume update if provided
    if (files.resume) {
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

      if (resumeFile.size > 1 * 1024 * 1024) {
        return NextResponse.json(
          {
            message: "Resume file size must be under 1MB.",
            error: "File size limit exceeded",
          },
          { status: 413 },
        );
      }

      // Delete old resume from Cloudinary if it exists
      if (user.resume_link) {
        await deleteFromCloudinary(user.resume_link, "raw");
      }

      // Upload new resume to Cloudinary
      try {
        const resumeUrl = await uploadToCloudinary(
          resumeFile.filepath,
          "resumes",
          resumeFile.mimetype,
        );
        updates.resume_link = resumeUrl;
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
    }

    // Handle profile picture update if provided
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

      if (profileFile.size > 1 * 1024 * 1024) {
        return NextResponse.json(
          {
            message: "Profile picture size must be under 1MB.",
            error: "File size limit exceeded",
          },
          { status: 413 },
        );
      }

      // Delete old profile picture from Cloudinary if it exists
      if (user.profile_picture) {
        await deleteFromCloudinary(user.profile_picture, "image");
      }

      // Upload new profile picture to Cloudinary
      try {
        const profilePictureUrl = await uploadToCloudinary(
          profileFile.filepath,
          "profile_pictures",
          profileFile.mimetype,
        );
        updates.profile_picture = profilePictureUrl;
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

    const allowedFields = [
      "discord_username",
      "bio",
      "age",
      "organisation",
      "resume_link",
      "profile_picture",
      "github_link",
      "linkedin_link",
      "portfolio_link",
      "ctf_profile",
      "isLooking",
    ];

    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === "age" && updates[field]) {
          updateData[field] = parseInt(updates[field]);
        } else if (field === "isLooking") {
          updateData[field] =
            updates[field] === "true" || updates[field] === true;
        } else {
          updateData[field] = updates[field];
        }
      }
    }

    const updatedUser = await User.findByIdAndUpdate(params.id, updateData, {
      new: true,
    });

    return NextResponse.json({
      message: "User updated successfully",
      id: updatedUser?._id.toString(),
      uid: updatedUser?.uid,
      status: "success",
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      {
        message: "Failed to update user",
        error: String(error),
        status: "error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authResult = await authenticateUser(req);
    if (!authResult.success) {
      return createAuthErrorResponse(authResult);
    }

    const adminError = requireAdmin(authResult);
    if (adminError) {
      return createAuthErrorResponse(adminError);
    }

    await dbConnect();

    const targetUser = await User.findById(params.id);
    if (!targetUser) {
      return NextResponse.json(
        {
          message: "User not found",
          status: "error",
        },
        { status: 404 },
      );
    }

    await User.findByIdAndDelete(params.id);

    return NextResponse.json({
      message: "User deleted successfully",
      status: "success",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      {
        message: "Failed to delete user",
        error: String(error),
        status: "error",
      },
      { status: 500 },
    );
  }
}
