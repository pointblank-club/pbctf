"use client";

import { HudFrame } from "./hud-frame";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useRecaptcha } from "@/hooks/use-recaptcha";
import {
  Home,
  Lock,
  User,
  Mail,
  Phone,
  CalendarClock,
  Radio,
  ShieldOff,
  Github,
  Linkedin,
  Globe,
  Flag,
  FileText,
  ImageIcon,
  Save,
  CheckCircle2,
  Eye,
  EyeOff,
  IdCard,
  Link2,
  FolderUp,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { FormSection } from "./form-section";
import { FormInput } from "./form-input";
import { FormTextarea } from "./form-textarea";
import { FormFileUpload } from "./form-file-upload";
import { Button } from "./button";
import { AlertBanner } from "./alert-banner";
import { SectionTab } from "./section-tab";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/api-config";
import { DISCORD_USERNAME_REGEX, FILE_SIZE } from "@/lib/constants";

export function ProfileContainer() {
  const { user, isAuthenticated, refreshUser, getToken } = useAuth();
  const { executeRecaptcha } = useRecaptcha();
  const { toast } = useToast();
  const router = useRouter();
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    discord_username: "",
    age: "",
    organisation: "",
    bio: "",
    github: "",
    linkedin: "",
    portfolio: "",
    ctf_profile: "",
    profile_picture: "",
    isLooking: false,
    teamCode: "",
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [resumeFileName, setResumeFileName] = useState("");
  const [profilePhotoFileName, setProfilePhotoFileName] = useState("");
  const [currentResumeUrl, setCurrentResumeUrl] = useState<string>("");
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProfileLocked, setIsProfileLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);
  const [activeSection, setActiveSection] = useState<"dossier" | "links" | "files">(
    "dossier"
  );
  const [discordError, setDiscordError] = useState<string>("");

  const validateDiscord = (handle: string): string => {
    const v = handle.trim();
    if (!v) return "";
    if (!DISCORD_USERNAME_REGEX.test(v)) {
      return "Use 2-32 lowercase letters, numbers, dots, or underscores";
    }
    return "";
  };

  const handleResumeChange = (file: File) => {
    if (file.size > FILE_SIZE.resume * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Resume too large",
        description: `Max size is ${FILE_SIZE.resume}MB. This file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`,
      });
      return;
    }
    setResumeFile(file);
    setResumeFileName(file.name);
  };

  const handlePhotoChange = (file: File) => {
    if (file.size > FILE_SIZE.profilePhoto * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Profile photo too large",
        description: `Max size is ${FILE_SIZE.profilePhoto}MB. This file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`,
      });
      return;
    }
    setProfilePhoto(file);
    setProfilePhotoFileName(file.name);
  };

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }

    // Load data from API
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const token = await getToken();

        const response = await fetch("/api/user/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          const userData = data.success ? data.data : data;

          if (userData && userData.email) {
            setProfileData({
              name: userData.name || "",
              email: userData.email || "",
              phone: userData.phone || "",
              age: userData.age?.toString() || "",
              discord_username: userData.discord_username || "",
              organisation: userData.organisation || "",
              bio: userData.bio || "",
              github: userData.github_link || "",
              linkedin: userData.linkedin_link || "",
              portfolio: userData.portfolio_link || "",
              ctf_profile: userData.ctf_profile || "",
              isLooking: userData.isLooking || false,
              teamCode: userData.teamCode || "",
              profile_picture: userData.profile_picture || "",
            });

            if (userData.resume_link) {
              setResumeFileName("resume.pdf");
              setCurrentResumeUrl(userData.resume_link);
            }
            if (userData.profile_picture) {
              setProfilePhotoFileName("profile.jpg");
              setCurrentPhotoUrl(userData.profile_picture);
            }

            if (userData.isProfileLocked || data.isProfileLocked) {
              setIsProfileLocked(true);
              setAlert({
                type: "warning",
                message:
                  "Your profile is locked because your team has been evaluated. You can no longer make changes.",
              });
            }
          }
        } else {
          console.error("Failed to fetch profile:", response.status);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load profile data.",
          });
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load profile data. Please refresh the page.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.uid, router]);

  const userResumeLink = (user as any)?.resume_link;
  const userProfilePicture = (user as any)?.profile_picture;
  useEffect(() => {
    if (userResumeLink) setCurrentResumeUrl(userResumeLink);
    if (userProfilePicture) setCurrentPhotoUrl(userProfilePicture);
  }, [userResumeLink, userProfilePicture]);

  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  const handleToggleLooking = async () => {
    try {
      const token = await getToken();
      if (!token) {
        toast({
          variant: "destructive",
          title: "Authentication required",
          description: "Please log in again to update your status",
        });
        return;
      }

      // You can't be "looking for a team" while you're already on one.
      if (profileData.teamCode && !profileData.isLooking) {
        toast({
          variant: "destructive",
          title: "Action not allowed",
          description: "You cannot flag yourself as 'looking for team' while you're already on one.",
        });
        return;
      }

      const newValue = !profileData.isLooking;

      const response = await fetch(API_ENDPOINTS.lookingForTeam, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isLooking: newValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update status");
      }

      setProfileData((prev) => ({ ...prev, isLooking: newValue }));

      toast({
        title: newValue ? "Marked as looking for team" : "No longer looking for team",
        description: newValue
          ? "Teams can now find you in Discover and reach out to recruit."
          : "Your profile is hidden from Discover.",
      });

      // Update global user context silently
      refreshUser();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast({
        variant: "destructive",
        title: "Failed to update status",
        description:
          error instanceof Error ? error.message : "Could not update status",
      });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAlert(null);

    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Not authenticated");
      }

      let resumeBase64: string | undefined;
      let photoBase64: string | undefined;

      if (resumeFile) {
        resumeBase64 = await toBase64(resumeFile);
      }

      if (profilePhoto) {
        photoBase64 = await toBase64(profilePhoto);
      }

      // reCAPTCHA v3 background token — scored server-side, no user interaction.
      const recaptchaToken = await executeRecaptcha("update_profile");

      const payload = {
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        age: profileData.age,
        organisation: profileData.organisation,
        bio: profileData.bio,
        discord_username: profileData.discord_username,
        github_link: profileData.github,
        linkedin_link: profileData.linkedin,
        portfolio_link: profileData.portfolio,
        ctf_profile: profileData.ctf_profile,
        isLooking: profileData.isLooking,
        resume: resumeBase64,
        profile_picture: photoBase64,
        recaptcha_token: recaptchaToken,
      };

      // Call Next.js API route
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || (!data.success && data.status !== "success")) {
        throw new Error(data.message || "Failed to update profile");
      }
      
      if (resumeFile) {
        setResumeFileName(resumeFile.name);
        setResumeFile(null);
      }
      if (profilePhoto) {
        setProfilePhotoFileName(profilePhoto.name);
        setProfilePhoto(null);
      }

      setAlert({
        type: "success",
        message: "Profile updated successfully!",
      });

      // Refresh global user data. This no longer re-triggers this page's
      // loading spinner (the fetch effect is keyed on user?.uid, not the whole
      // user object), so the success banner stays visible after the commit.
      await refreshUser();

      setTimeout(() => setAlert(null), 3000);
    } catch (error) {
      setAlert({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to update profile",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Profile completeness. calculated from editable fields the user can actually move
  const completeness = useMemo(() => {
    const trackable: Array<{ key: string; value: string }> = [
      { key: "discord", value: profileData.discord_username },
      { key: "organisation", value: profileData.organisation },
      { key: "bio", value: profileData.bio },
      { key: "github", value: profileData.github },
      { key: "linkedin", value: profileData.linkedin },
      { key: "portfolio", value: profileData.portfolio },
      { key: "ctf", value: profileData.ctf_profile },
      { key: "resume", value: resumeFileName },
      { key: "photo", value: profilePhotoFileName },
    ];
    const filled = trackable.filter((t) => (t.value || "").trim().length > 0).length;
    return {
      filled,
      total: trackable.length,
      pct: Math.round((filled / trackable.length) * 100),
      missing: trackable.filter((t) => !(t.value || "").trim()).map((t) => t.key),
    };
  }, [
    profileData.discord_username,
    profileData.organisation,
    profileData.bio,
    profileData.github,
    profileData.linkedin,
    profileData.portfolio,
    profileData.ctf_profile,
    resumeFileName,
    profilePhotoFileName,
  ]);

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-[400px]">
        <Spinner size="lg" />
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-muted">
          <span className="text-brand">{">"}</span> Decrypting dossier
          <span className="anim-blink">_</span>
        </div>
      </div>
    );
  }

  const broadcastDisabled = !!profileData.teamCode && !profileData.isLooking;
  const linkCount = [
    profileData.github,
    profileData.linkedin,
    profileData.portfolio,
    profileData.ctf_profile,
  ].filter((l) => (l || "").trim().length > 0).length;
  const fileCount = (resumeFileName ? 1 : 0) + (profilePhotoFileName ? 1 : 0);

  return (
    <div className="flex flex-col gap-6 w-full max-w-[760px] mx-auto pb-28">
      {/* HEADER */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-brand opacity-80">
            {">"} PBCTF 5.0 // OPERATOR DOSSIER
          </div>
          <h1 className="font-heading text-[32px] sm:text-[40px] font-bold text-ink tracking-tight leading-[1.05]">
            Your dossier
          </h1>
          <p className="text-[13px] text-ink-muted font-body leading-relaxed max-w-[520px]">
            Keep this current. Admins use it to verify identity. Other operators use
            it to recognise you when looking for a team.
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard")} variant="secondary" size="sm">
          <Home className="w-3.5 h-3.5" />
          Dashboard
        </Button>
      </div>

      {alert && <AlertBanner type={alert.type} message={alert.message} />}

      {/* BROADCAST PANEL. public/private discoverability is the hero decision */}
      <section
        className={[
          "relative w-full rounded-lg overflow-hidden",
          "bg-surface-1/90 border shadow-card",
          profileData.isLooking
            ? "border-brand/45"
            : "border-[var(--border-soft)]",
        ].join(" ")}
      >
        <div className="relative z-10 flex items-start gap-4 p-5 sm:p-6">
          <div
            className={[
              "shrink-0 w-10 h-10 rounded-md flex items-center justify-center border",
              profileData.isLooking
                ? "bg-brand-soft border-brand/45 text-brand shadow-glow-sm"
                : "bg-surface-inset border-[var(--border-soft)] text-ink-muted",
            ].join(" ")}
          >
            {profileData.isLooking ? (
              <Radio className="w-5 h-5" />
            ) : (
              <ShieldOff className="w-5 h-5" />
            )}
          </div>

          <div className="min-w-0 flex-1 flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand opacity-80">
                {">"} LOOKING FOR TEAM
              </div>
              <span
                className={[
                  "inline-flex items-center gap-2 px-2 py-0.5 rounded-md border font-mono text-[10.5px] uppercase tracking-[0.18em]",
                  profileData.isLooking
                    ? "bg-brand-soft border-brand/45 text-brand"
                    : "bg-white/[0.03] border-[var(--border-soft)] text-ink-muted",
                ].join(" ")}
              >
                <span
                  className={[
                    "relative inline-flex w-1.5 h-1.5 rounded-full",
                    profileData.isLooking ? "bg-brand" : "bg-ink-muted",
                  ].join(" ")}
                >
                  <span
                    className="absolute inset-0 rounded-full opacity-60 anim-pulse-soft"
                    style={{ background: "currentColor" }}
                  />
                </span>
                {profileData.isLooking ? "On" : "Off"}
              </span>
            </div>

            <label
              htmlFor="profileLookingForTeam"
              className="font-heading text-[18px] sm:text-[20px] font-semibold text-ink cursor-pointer leading-tight"
            >
              Looking for a team
            </label>

            <p className="text-[13px] text-ink-secondary font-body leading-relaxed">
              {profileData.isLooking ? (
                <>
                  Other operators can find you in{" "}
                  <span className="text-ink">Discover</span> and reach out to
                  recruit. Your contact info and links from this profile are
                  visible to them.
                </>
              ) : broadcastDisabled ? (
                <>
                  You&apos;re already on a team. Leave it first if you want to
                  appear as looking for a new one.
                </>
              ) : (
                <>
                  You&apos;re hidden from Discover. Turn this on if you want
                  teams to find and recruit you.
                </>
              )}
            </p>
          </div>

          <Switch
            id="profileLookingForTeam"
            checked={profileData.isLooking}
            onCheckedChange={handleToggleLooking}
            className="data-[state=checked]:bg-brand border-brand mt-1"
          />
        </div>
      </section>

      {/* IDENTITY. locked, read-only operator card. Replaces 4 greyed-out inputs. */}
      <section className="relative w-full rounded-lg bg-surface-1/80 border border-[var(--border-soft)] shadow-card">
      <HudFrame cornerSize="md" intensity="strong" />
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3 bg-surface-inset/40">
          <div className="flex items-center gap-2 min-w-0">
            <IdCard className="w-3.5 h-3.5 text-brand opacity-80" />
            <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand opacity-80 truncate">
              IDENTITY // VERIFIED
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-muted">
            <Lock className="w-3 h-3" />
            Locked at signup
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 sm:">
          <ReadOnlyRow
            icon={User}
            label="Operator"
            value={profileData.name || "-"}
          />
          <ReadOnlyRow
            icon={Mail}
            label="Email"
            value={profileData.email || "-"}
          />
        </dl>
        <dl className="grid grid-cols-1 sm:grid-cols-2 sm:">
          <ReadOnlyRow
            icon={Phone}
            label="Phone"
            value={profileData.phone || "-"}
          />
          <ReadOnlyRow
            icon={CalendarClock}
            label="Age"
            value={profileData.age || "-"}
          />
        </dl>
      </section>

      {/* COMPLETENESS METER. only when not locked, so it motivates action */}
      {!isProfileLocked && (
        <section className="rounded-md border border-[var(--border-soft)] bg-surface-1/70 px-4 py-3.5 sm:px-5 sm:py-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand opacity-80">
                Dossier completeness
              </div>
              <span className="font-mono text-[11px] tracking-[0.1em] text-ink-muted">
                {completeness.filled}/{completeness.total}
              </span>
            </div>
            <div className="font-mono text-[12px] tabular-nums text-ink">
              <span className={completeness.pct === 100 ? "text-brand" : "text-ink"}>
                {completeness.pct}%
              </span>
            </div>
          </div>
          <div className="relative h-1.5 rounded-full bg-surface-inset overflow-hidden border border-[var(--border-hairline)]">
            <div
              className="absolute inset-y-0 left-0 bg-brand shadow-glow-sm transition-[width] duration-500"
              style={{ width: `${completeness.pct}%` }}
            />
          </div>
          <p className="text-[12px] text-ink-muted font-body leading-relaxed">
            {completeness.pct === 100 ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 inline-block mr-1 text-brand align-text-bottom" />
                Dossier complete. Operators scouting Discover will see the full
                picture.
              </>
            ) : (
              <>
                A complete dossier gets noticed faster. Fill remaining fields to
                stand out in Discover.
              </>
            )}
          </p>
        </section>
      )}

      {/* SECTION TABS. anchored navigation across the editable form */}
      <nav className="flex items-center gap-2 flex-wrap" aria-label="Profile sections">
        <SectionTab
          active={activeSection === "dossier"}
          onClick={() => setActiveSection("dossier")}
          icon={User}
          label="Dossier"
        />
        <SectionTab
          active={activeSection === "links"}
          onClick={() => setActiveSection("links")}
          icon={Link2}
          label={`Links · ${linkCount}/4`}
        />
        <SectionTab
          active={activeSection === "files"}
          onClick={() => setActiveSection("files")}
          icon={FolderUp}
          label={`Files · ${fileCount}/2`}
        />
      </nav>

      <form onSubmit={handleUpdateProfile} className="flex flex-col gap-[24px]">
        <div
          className={`flex flex-col gap-[24px] ${isProfileLocked ? "opacity-70 pointer-events-none" : ""}`}
        >
          {activeSection === "dossier" && (
            <FormSection
              title="Dossier"
              eyebrow="// PUBLIC METADATA"
              status={
                <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-muted">
                  Editable
                </div>
              }
            >
              <FormInput
                label="Discord Handle"
                placeholder="operator.handle"
                required
                value={profileData.discord_username}
                onChange={(e) => {
                  setProfileData({
                    ...profileData,
                    discord_username: e.target.value,
                  });
                  if (discordError) setDiscordError("");
                }}
                onBlur={(e) => setDiscordError(validateDiscord(e.target.value))}
                error={discordError}
                disabled={isProfileLocked}
              />
              <FormInput
                label="Organisation"
                placeholder="University, company, or 'Independent'"
                required
                value={profileData.organisation}
                onChange={(e) =>
                  setProfileData({ ...profileData, organisation: e.target.value })
                }
                disabled={isProfileLocked}
              />
              <FormTextarea
                label="Operator brief"
                placeholder="Stacks you run with, categories you crush, what you're hunting at PBCTF…"
                value={profileData.bio}
                onChange={(e) =>
                  setProfileData({ ...profileData, bio: e.target.value })
                }
                rows={4}
                disabled={isProfileLocked}
              />
              <p className="text-[11.5px] text-ink-subtle font-body -mt-1 leading-relaxed">
                {">"} A short brief helps captains recruit. Aim for 1–3 sentences.
              </p>
            </FormSection>
          )}

          {activeSection === "links" && (
            <FormSection
              title="Links"
              eyebrow="// SOCIAL & RECON"
              status={
                <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-muted">
                  {linkCount}/4 set
                </div>
              }
            >
              <LinkRow
                icon={Github}
                label="GitHub"
                placeholder="https://github.com/username"
                value={profileData.github}
                onChange={(v) => setProfileData({ ...profileData, github: v })}
                disabled={isProfileLocked}
              />
              <LinkRow
                icon={Linkedin}
                label="LinkedIn"
                placeholder="https://linkedin.com/in/username"
                value={profileData.linkedin}
                onChange={(v) => setProfileData({ ...profileData, linkedin: v })}
                disabled={isProfileLocked}
              />
              <LinkRow
                icon={Globe}
                label="Portfolio"
                placeholder="https://yourportfolio.com"
                value={profileData.portfolio}
                onChange={(v) =>
                  setProfileData({ ...profileData, portfolio: v })
                }
                disabled={isProfileLocked}
              />
              <LinkRow
                icon={Flag}
                label="CTF Profile"
                placeholder="https://ctftime.org/user/12345"
                value={profileData.ctf_profile}
                onChange={(v) =>
                  setProfileData({ ...profileData, ctf_profile: v })
                }
                disabled={isProfileLocked}
              />
            </FormSection>
          )}

          {activeSection === "files" && (
            <FormSection
              title="Files"
              eyebrow="// ATTACHMENTS"
              status={
                <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-muted">
                  {fileCount}/2 set
                </div>
              }
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-9 h-9 rounded-md bg-surface-inset border border-[var(--border-soft)] flex items-center justify-center text-ink-muted">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <FormFileUpload
                    label={resumeFile ? "Resume (PDF)" : currentResumeUrl ? "Replace resume (PDF)" : "Resume (PDF)"}
                    accept=".pdf"
                    maxSizeMB={FILE_SIZE.resume}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleResumeChange(e.target.files[0]);
                      }
                    }}
                    currentFile={resumeFile ? resumeFileName : ""}
                  />
                  {currentResumeUrl && !resumeFile && (
                    <a
                      href={`/dashboard/resume?url=${encodeURIComponent(currentResumeUrl)}&name=${encodeURIComponent(profileData.name || "your")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pointer-events-auto inline-flex items-center gap-1.5 self-start font-mono text-[10.5px] uppercase tracking-[0.18em] text-brand hover:text-brand-hover underline underline-offset-2"
                    >
                      View current resume
                      <Link2 className="w-3 h-3" />
                    </a>
                  )}
                  {resumeFile && (
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--warning)]">
                      &gt; pending save · {resumeFile.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="shrink-0 w-9 h-9 rounded-md bg-surface-inset border border-[var(--border-soft)] flex items-center justify-center text-ink-muted">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <FormFileUpload
                    label={profilePhoto ? "Profile Photo" : currentPhotoUrl ? "Replace profile photo" : "Profile Photo"}
                    accept="image/*"
                    maxSizeMB={FILE_SIZE.profilePhoto}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handlePhotoChange(e.target.files[0]);
                      }
                    }}
                    currentFile={profilePhoto ? profilePhotoFileName : ""}
                  />
                  {currentPhotoUrl && !profilePhoto && (
                    <div className="flex items-center gap-3">
                      <img
                        src={currentPhotoUrl}
                        alt="Current profile photo"
                        className="w-12 h-12 rounded-md object-cover border border-[var(--border-soft)]"
                      />
                      <a
                        href={currentPhotoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pointer-events-auto inline-flex items-center gap-1.5 self-start font-mono text-[10.5px] uppercase tracking-[0.18em] text-brand hover:text-brand-hover underline underline-offset-2"
                      >
                        Open full size
                        <Link2 className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {profilePhoto && (
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--warning)]">
                      &gt; pending save · {profilePhoto.name}
                    </p>
                  )}
                </div>
              </div>

              <p className="text-[11.5px] text-ink-subtle font-body leading-relaxed">
                {">"} Files are kept private from other operators. Only admins and
                evaluators can view them.
              </p>
            </FormSection>
          )}

          {/* STICKY SAVE FOOTER. gives the action a permanent home */}
          <div className="sticky bottom-4 z-20 -mx-2 sm:mx-0">
            <div className="rounded-md border border-[var(--border-soft)] bg-surface-1/95 backdrop-blur-md shadow-card px-3 sm:px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={[
                    "inline-flex w-1.5 h-1.5 rounded-full",
                    profileData.isLooking ? "bg-brand" : "bg-ink-muted",
                  ].join(" ")}
                />
                <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-muted truncate">
                  {isProfileLocked ? (
                    <>Read-only · team evaluated</>
                  ) : profileData.isLooking ? (
                    <>
                      Broadcasting <Eye className="w-3 h-3 inline-block ml-1 align-text-bottom" />
                    </>
                  ) : (
                    <>
                      Hidden <EyeOff className="w-3 h-3 inline-block ml-1 align-text-bottom" />
                    </>
                  )}
                </span>
              </div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSubmitting || isProfileLocked}
              >
                {isSubmitting && <Spinner size="sm" className="mr-2" />}
                {!isSubmitting && !isProfileLocked && <Save className="w-3.5 h-3.5" />}
                {isSubmitting
                  ? "Committing…"
                  : isProfileLocked
                    ? "Profile locked"
                    : "Commit changes"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────
// Internal helpers (no new atom. composed from primitives + tokens)
// ─────────────────────────────────────────────

function ReadOnlyRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 px-5 sm:px-6 py-4 min-w-0">
      <div className="shrink-0 w-8 h-8 rounded-md bg-surface-inset border border-[var(--border-hairline)] flex items-center justify-center text-ink-muted">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0 flex flex-col gap-0.5">
        <dt className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-muted">
          {label}
        </dt>
        <dd className="text-[14px] text-ink font-body truncate" title={value}>
          {value}
        </dd>
      </div>
    </div>
  );
}

function LinkRow({
  icon: Icon,
  label,
  placeholder,
  value,
  onChange,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const hasValue = (value || "").trim().length > 0;
  return (
    <div className="flex items-start gap-3">
      <div
        className={[
          "shrink-0 w-9 h-9 rounded-md flex items-center justify-center border transition-colors duration-150 mt-[26px]",
          hasValue
            ? "bg-brand-soft border-brand/40 text-brand"
            : "bg-surface-inset border-[var(--border-soft)] text-ink-muted",
        ].join(" ")}
        aria-hidden="true"
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <FormInput
          label={label}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
