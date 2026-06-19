import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAllowedResumeUrl(url: string): boolean {
  try {
    const u = new URL(url);

    // Only allow Cloudinary hosted resumes from our folder.
    if (u.protocol !== "https:") return false;
    if (u.hostname !== "res.cloudinary.com") return false;

    // Example path:
    // /<cloud_name>/raw/upload/v123/zenith/resumes/<public_id>
    // We only need to ensure it contains our resumes folder. pathname excludes
    // the host/query, so these substring checks can't be host-spoofed.
    const path = u.pathname;
    return path.includes("/raw/upload/") && path.includes("/zenith/resumes/");
  } catch {
    return false;
  }
}

/**
 * GET /api/resume/view?url=<cloudinary_raw_url>
 *
 * Proxies the resume and forces "inline" viewing with "application/pdf"
 * so browsers open the resume in a new tab instead of downloading it.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ message: "Missing url" }, { status: 400 });
  }

  if (!isAllowedResumeUrl(url)) {
    return NextResponse.json(
      { message: "Invalid resume url" },
      { status: 400 },
    );
  }

  const upstream = await fetch(url, { cache: "no-store" });
  if (!upstream.ok) {
    return NextResponse.json(
      { message: "Failed to fetch resume" },
      { status: upstream.status },
    );
  }

  const bytes = await upstream.arrayBuffer();
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="resume.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
