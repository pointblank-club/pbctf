"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Trophy,
  XCircle,
  Check,
  X,
} from "lucide-react";
import { HudFrame } from "./hud-frame";
import { isShortlistAnnounced } from "@/lib/constants";

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

interface DeadlineTimerProps {
  teamStatus?: string;
  hasSubmitted?: boolean;
  isEvaluated?: boolean;
  evaluations?: Array<{
    evaluatorId: string;
    name: string;
    tier: "strongly_accepted" | "accepted" | "borderline" | "rejected";
    comment: string;
    createdAt: Date | string;
  }>;
  hasTeam?: boolean;
  /** Admin-panel shortlist flag. Unlike evaluations, this is the actual RSVP gate. */
  isShortlisted?: boolean;
  rsvpStatus?: "pending" | "confirmed" | "declined";
  onRsvpExpiredChange?: (expired: boolean) => void;
}

function ShellWrap({
  children,
  glow,
}: {
  children: React.ReactNode;
  glow?: boolean;
}) {
  return (
    <div className="relative w-full rounded-lg card-surface border border-[var(--border-soft)]">
      <HudFrame cornerSize="md" intensity="strong" />
      <div className="relative z-10 p-5 sm:p-6">{children}</div>
    </div>
  );
}

const TimeBox = ({
  value,
  label,
  big = false,
}: {
  value: number;
  label: string;
  big?: boolean;
}) => (
  <div
    className={[
      "flex flex-col items-center justify-center flex-1 min-w-0",
      "bg-surface-inset border border-[var(--border-soft)] rounded-md",
      big ? "p-3.5" : "p-2.5",
    ].join(" ")}
  >
    <span
      className={[
        "font-mono font-bold text-brand tabular-nums leading-none",
        big ? "text-[26px] sm:text-[30px]" : "text-[18px] sm:text-[20px]",
      ].join(" ")}
      style={{ textShadow: "0 0 18px rgba(0,255,136,0.42)" }}
    >
      {String(value).padStart(2, "0")}
    </span>
    <span className="font-mono text-[9px] text-ink-muted uppercase tracking-[0.2em] mt-1.5">
      {label}
    </span>
  </div>
);

const RsvpStatusBadge = ({
  status,
  message,
}: {
  status: "confirmed" | "declined";
  message: string;
}) => (
  <div
    className={[
      "flex items-center justify-center gap-2 px-3 py-2.5 rounded-md mt-2 border w-full",
      status === "confirmed"
        ? "bg-brand-soft border-brand/35"
        : "bg-white/[0.02] border-[var(--border-soft)]",
    ].join(" ")}
  >
    {status === "confirmed" ? (
      <Check className="w-4 h-4 text-brand" />
    ) : (
      <X className="w-4 h-4 text-ink-muted" />
    )}
    <p
      className={[
        "text-[13px] font-medium font-body",
        status === "confirmed" ? "text-brand" : "text-ink-muted",
      ].join(" ")}
    >
      {message}
    </p>
  </div>
);

export function DeadlineTimer({
  teamStatus,
  hasSubmitted = false,
  isEvaluated = false,
  evaluations = [],
  hasTeam = true,
  isShortlisted = false,
  rsvpStatus = "pending",
  onRsvpExpiredChange,
}: DeadlineTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(
    null,
  );
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [serverOffset, setServerOffset] = useState(0);
  const [error, setError] = useState(false);
  const [rsvpDeadline, setRsvpDeadline] = useState<Date | null>(null);
  const [rsvpTimeRemaining, setRsvpTimeRemaining] =
    useState<TimeRemaining | null>(null);
  const [isRsvpExpired, setIsRsvpExpired] = useState(false);

  // Report the RSVP deadline's live expiry status up so the status strip
  // (rendered by the parent, above this timer) can hide its Confirm/Decline
  // actions the moment the deadline passes.
  useEffect(() => {
    onRsvpExpiredChange?.(isRsvpExpired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRsvpExpired]);

  useEffect(() => {
    const fetchDeadline = async () => {
      try {
        const response = await fetch("/api/config/deadline");
        const data = await response.json();
        if (data.success && data.data) {
          const serverTime = new Date(data.data.serverTime).getTime();
          const clientTime = Date.now();
          setServerOffset(serverTime - clientTime);
          setDeadline(new Date(data.data.deadline));
          setIsExpired(data.data.isExpired);
          if (data.data.rsvpDeadline) {
            setRsvpDeadline(new Date(data.data.rsvpDeadline));
            setIsRsvpExpired(data.data.isRsvpExpired);
          }
        }
      } catch (e) {
        console.error("Failed to fetch deadline:", e);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDeadline();
  }, []);

  useEffect(() => {
    if (!deadline || isExpired) return;
    const calc = (): TimeRemaining => {
      const now = Date.now() + serverOffset;
      const total = deadline.getTime() - now;
      if (total <= 0) {
        setIsExpired(true);
        return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
      }
      return {
        seconds: Math.floor((total / 1000) % 60),
        minutes: Math.floor((total / 1000 / 60) % 60),
        hours: Math.floor((total / (1000 * 60 * 60)) % 24),
        days: Math.floor(total / (1000 * 60 * 60 * 24)),
        total,
      };
    };
    const timer = setInterval(() => setTimeRemaining(calc()), 1000);
    setTimeRemaining(calc());
    return () => clearInterval(timer);
  }, [deadline, serverOffset, isExpired]);

  useEffect(() => {
    if (!rsvpDeadline || isRsvpExpired) return;
    const calc = (): TimeRemaining => {
      const now = Date.now() + serverOffset;
      const total = rsvpDeadline.getTime() - now;
      if (total <= 0) {
        setIsRsvpExpired(true);
        return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
      }
      return {
        seconds: Math.floor((total / 1000) % 60),
        minutes: Math.floor((total / 1000 / 60) % 60),
        hours: Math.floor((total / (1000 * 60 * 60)) % 24),
        days: Math.floor(total / (1000 * 60 * 60 * 24)),
        total,
      };
    };
    const timer = setInterval(() => setRsvpTimeRemaining(calc()), 1000);
    setRsvpTimeRemaining(calc());
    return () => clearInterval(timer);
  }, [rsvpDeadline, serverOffset, isRsvpExpired]);

  if (isLoading) {
    return (
      <ShellWrap>
        <div className="h-16 flex items-center justify-center">
          <div className="w-full h-3 bg-brand-soft/40 rounded animate-pulse" />
        </div>
      </ShellWrap>
    );
  }

  if (error) {
    return (
      <ShellWrap>
        <p className="text-[13px] text-ink-muted text-center font-body">
          Failed to load deadline timer
        </p>
      </ShellWrap>
    );
  }

  const submitted =
    hasSubmitted ||
    teamStatus === "submitted" ||
    teamStatus === "shortlisted" ||
    teamStatus === "rsvped";
  const hasRejectedEvaluation = evaluations.some((e) => e.tier === "rejected");
  const notSelected =
    isExpired && hasTeam && !isShortlisted && isShortlistAnnounced();

  const getHeaderIcon = () => {
    if (notSelected) return <XCircle className="w-4 h-4 text-ink-muted" />;
    if (isExpired && hasTeam && isEvaluated) {
      if (hasRejectedEvaluation)
        return <XCircle className="w-4 h-4 text-ink-muted" />;
      if (isShortlisted) return <Trophy className="w-4 h-4 text-brand" />;
      return <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />;
    }
    if (isExpired)
      return <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />;
    if (submitted) return <CheckCircle2 className="w-4 h-4 text-brand" />;
    return <Clock className="w-4 h-4 text-ink-secondary" />;
  };

  const getHeaderText = () => {
    if (notSelected) return "Team Not Selected";
    if (isExpired && hasTeam && isEvaluated) {
      if (hasRejectedEvaluation) return "Team Not Selected";
      if (isShortlisted) return "Your Team Has Been Selected";
      return "Registration Closed";
    }
    if (isExpired) return "Registration Closed";
    if (submitted) return "You're Registered";
    return "Registration Deadline";
  };

  return (
    <ShellWrap glow={isShortlisted && isEvaluated && isExpired}>
      <div className="flex flex-col items-center text-center">
        {/* Eyebrow */}
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-brand opacity-80 mb-1">
          PBCTF 5.0 · TIMER
        </div>

        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {getHeaderIcon()}
          <h3 className="text-[15px] sm:text-[16px] font-semibold text-ink font-heading tracking-tight">
            {getHeaderText()}
          </h3>
        </div>

        {/* Body */}
        {isExpired ? (
          <div className="flex flex-col items-center gap-3 w-full">
            {hasTeam ? (
              notSelected ? (
                <>
                  <p className="text-[14px] text-ink-secondary font-body text-center max-w-[42ch]">
                    Unfortunately, your team wasn&apos;t shortlisted for PBCTF
                    5.0.
                  </p>
                  <p className="text-[12.5px] text-ink-muted font-body text-center max-w-[42ch]">
                    Thank you for participating. We&apos;d love to have you at
                    our{" "}
                    <a
                      href="https://pointblank.club/events"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand underline underline-offset-2 hover:brightness-110"
                    >
                      future events
                    </a>
                    .
                  </p>
                </>
              ) : isEvaluated ? (
                hasRejectedEvaluation ? (
                  <>
                    <p className="text-[14px] text-ink-secondary font-body text-center max-w-[42ch]">
                      Unfortunately, your team was not selected for the next
                      round.
                    </p>
                    <p className="text-[12.5px] text-ink-muted font-body text-center max-w-[42ch]">
                      Thank you for participating. We&apos;d love to have you at
                      our{" "}
                      <a
                        href="https://pointblank.club/events"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand underline underline-offset-2 hover:brightness-110"
                      >
                        future events
                      </a>
                      .
                    </p>
                  </>
                ) : isShortlisted ? (
                  <>
                    {rsvpStatus === "confirmed" && (
                      <RsvpStatusBadge
                        status="confirmed"
                        message="RSVP Confirmed. See you at the event."
                      />
                    )}
                    {rsvpStatus === "declined" && (
                      <RsvpStatusBadge
                        status="declined"
                        message="You have declined participation."
                      />
                    )}
                    {(rsvpStatus === "confirmed" ||
                      rsvpStatus === "declined") &&
                      !isRsvpExpired && (
                        <p className="text-[11.5px] text-ink-muted font-body text-center max-w-[44ch]">
                          Changed your mind? You can update above until the RSVP
                          deadline.
                        </p>
                      )}
                    {rsvpStatus === "pending" && (
                      <p className="text-[12.5px] text-ink-secondary font-body text-center max-w-[44ch]">
                        Use the status panel above to confirm or decline your
                        participation.
                      </p>
                    )}

                    {/* Once confirmed there's nothing left to act on, so the
                        countdown only matters while a response can still change. */}
                    {rsvpStatus !== "confirmed" &&
                      rsvpTimeRemaining &&
                      !isRsvpExpired && (
                        <div className="w-full mt-1">
                          <p className="font-mono text-[10px] text-ink-muted text-center mb-2.5 uppercase tracking-[0.2em]">
                            RSVP Deadline
                          </p>
                          <div className="flex justify-center gap-2 w-full">
                            <TimeBox
                              value={rsvpTimeRemaining.days}
                              label="Days"
                            />
                            <TimeBox
                              value={rsvpTimeRemaining.hours}
                              label="Hours"
                            />
                            <TimeBox
                              value={rsvpTimeRemaining.minutes}
                              label="Mins"
                            />
                            <TimeBox
                              value={rsvpTimeRemaining.seconds}
                              label="Secs"
                            />
                          </div>
                        </div>
                      )}

                    {isRsvpExpired && (
                      <p className="text-[12px] text-[var(--warning)] font-medium font-body text-center max-w-[44ch] mt-1">
                        RSVP deadline has passed
                        {rsvpDeadline
                          ? ` (${new Date(rsvpDeadline).toLocaleString(
                              "en-IN",
                              {
                                dateStyle: "medium",
                                timeStyle: "short",
                                timeZone: "Asia/Kolkata",
                              },
                            )} IST)`
                          : ""}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-[12.5px] text-ink-muted font-body text-center max-w-[44ch]">
                      The registration deadline has passed. No new registrations
                      are being accepted.
                    </p>
                    <p className="text-[14px] text-ink-secondary font-medium font-body text-center">
                      Results will be out soon.
                    </p>
                  </>
                )
              ) : (
                <>
                  <p className="text-[12.5px] text-ink-muted font-body text-center max-w-[44ch]">
                    The registration deadline has passed. No new registrations
                    are being accepted.
                  </p>
                  <p className="text-[14px] text-ink-secondary font-medium font-body text-center">
                    Results will be out soon.
                  </p>
                </>
              )
            ) : (
              <p className="text-[12.5px] text-ink-muted font-body text-center max-w-[44ch]">
                The submission deadline has passed. No new submissions are being
                accepted.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center w-full">
            {!submitted && timeRemaining && (
              <div className="flex justify-center gap-2 mb-4 w-full">
                <TimeBox big value={timeRemaining.days} label="Days" />
                <TimeBox big value={timeRemaining.hours} label="Hours" />
                <TimeBox big value={timeRemaining.minutes} label="Mins" />
                <TimeBox big value={timeRemaining.seconds} label="Secs" />
              </div>
            )}

            <p className="text-[13px] text-ink-secondary font-body text-center max-w-[44ch]">
              {submitted
                ? "Your team is registered. Good luck."
                : "Your team is not registered yet, make sure to register before the deadline."}
            </p>

            <p className="font-mono text-[10px] text-ink-muted mt-2.5 text-center uppercase tracking-[0.16em]">
              Changes allowed until{" "}
              {new Date(deadline!).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
                timeZone: "Asia/Kolkata",
              })}{" "}
              IST
            </p>
          </div>
        )}
      </div>
    </ShellWrap>
  );
}
