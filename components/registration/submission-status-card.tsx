"use client";

import { Check, X, Clock, CheckCircle, Award, AlertCircle } from "lucide-react";
import { FormSection } from "./form-section";
import { Button } from "./button";
import { AlertBanner } from "./alert-banner";

interface SubmissionStatusCardProps {
  status: "submitted" | "under-review" | "shortlisted" | "confirmed" | "declined";
  rsvpStatus?: "pending" | "confirmed" | "declined";
  submittedAt?: Date;
  onRSVP?: (status: "confirmed" | "declined") => void;
}

export function SubmissionStatusCard({
  status,
  rsvpStatus = "pending",
  submittedAt,
  onRSVP,
}: SubmissionStatusCardProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "submitted":
        return {
          icon: Clock,
          color: "text-white",
          bgColor: "bg-white/10",
          message: "Project submitted! Waiting for evaluation.",
          bannerType: "info" as const,
        };
      case "under-review":
        return {
          icon: AlertCircle,
          color: "text-white",
          bgColor: "bg-[rgba(34,197,94,0.15)]",
          message: "Your project is under review by evaluators.",
          bannerType: "warning" as const,
        };
      case "shortlisted":
        return {
          icon: Award,
          color: "text-white",
          bgColor: "bg-[rgba(34,197,94,0.2)]",
          message: "🎉 Congratulations! Your team has been shortlisted!",
          bannerType: "success" as const,
        };
      case "confirmed":
        return {
          icon: CheckCircle,
          color: "text-white",
          bgColor: "bg-[rgba(34,197,94,0.2)]",
          message: "✅ RSVP Confirmed! See you at the event!",
          bannerType: "success" as const,
        };
      case "declined":
        return {
          icon: X,
          color: "text-white",
          bgColor: "bg-black/50",
          message: "You have declined participation.",
          bannerType: "error" as const,
        };
      default:
        return {
          icon: Clock,
          color: "text-white",
          bgColor: "bg-white/10",
          message: "",
          bannerType: "info" as const,
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <FormSection title="Submission Status">
      <div className="flex flex-col gap-[16px]">
        {/* Status Banner */}
        <AlertBanner type={config.bannerType} message={config.message} />

        {/* Status Details */}
        <div className="flex items-center gap-[12px] p-[16px] rounded-[12px] bg-[rgba(138,138,138,0.1)] border border-[rgba(255,255,255,0.1)]">
          <div className={`p-[12px] rounded-full ${config.bgColor}`}>
            <StatusIcon className={`w-6 h-6 ${config.color}`} />
          </div>
          <div className="flex flex-col gap-[4px]">
            <span className="text-[16px] text-white font-medium capitalize" style={{ fontFamily: 'var(--font-body)' }}>
              {status.replace("-", " ")}
            </span>
            {submittedAt && (
              <span className="text-[12px] text-white opacity-50" style={{ fontFamily: 'var(--font-body)' }}>
                Submitted on {new Date(submittedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* RSVP Actions for Shortlisted Teams */}
        {status === "shortlisted" && rsvpStatus === "pending" && onRSVP && (
          <div className="flex flex-col gap-[12px]">
            <p className="text-[14px] text-white" style={{ fontFamily: 'var(--font-body)' }}>
              Please confirm your participation:
            </p>
            <div className="flex gap-[12px]">
              <Button onClick={() => onRSVP("confirmed")} variant="primary">
                <Check className="w-4 h-4" />
                Confirm Participation
              </Button>
              <Button onClick={() => onRSVP("declined")} variant="danger">
                <X className="w-4 h-4" />
                Decline
              </Button>
            </div>
          </div>
        )}
      </div>
    </FormSection>
  );
}
