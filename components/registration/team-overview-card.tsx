"use client";

import { useState } from "react";
import { Users, Copy, Check, Award } from "lucide-react";
import { FormSection } from "./form-section";
import { StatusBadge } from "./status-badge";

interface TeamOverviewCardProps {
  team: {
    teamName: string;
    teamCode: string;
    memberCount: number;
    maxMembers?: number;
    problemStatement?: string;
  };
  isLead: boolean;
  status: "none" | "active" | "submitted" | "under-review" | "shortlisted" | "confirmed" | "declined";
}

export function TeamOverviewCard({ team, isLead, status }: TeamOverviewCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(team.teamCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy team code:", err);
    }
  };

  const maxMembers = team.maxMembers || 4;

  return (
    <FormSection
      title="Team Overview"
      status={
        status !== "active" && status !== "none" ? (
          <StatusBadge
            status={status}
            icon={status === "shortlisted" || status === "confirmed" ? Award : Users}
          />
        ) : undefined
      }
    >
      <div className="flex flex-col gap-[16px]">
        {/* Team Name */}
        <div className="flex flex-col gap-[4px]">
          <span className="text-[12px] text-white opacity-60 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
            Team Name
          </span>
          <span className="text-[24px] text-white font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
            {team.teamName}
          </span>
        </div>

        {/* Team Details Grid */}
        <div className="grid grid-cols-2 gap-[16px]">
          {/* Team Code with Copy */}
          <div className="flex flex-col gap-[4px]">
            <span className="text-[12px] text-white opacity-60 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
              Team Code
            </span>
            <div className="flex items-center gap-[8px]">
              <span className="text-[16px] text-white font-mono bg-[rgba(138,138,138,0.2)] px-[12px] py-[6px] rounded-[6px]">
                {team.teamCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-[8px] rounded-[6px] bg-[rgba(138,138,138,0.2)] hover:bg-[rgba(138,138,138,0.3)] transition-colors text-white"
                title={copied ? "Copied!" : "Copy team code"}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Members */}
          <div className="flex flex-col gap-[4px]">
            <span className="text-[12px] text-white opacity-60 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
              Members
            </span>
            <div className="flex items-center gap-[8px]">
              <span className="text-[16px] text-white" style={{ fontFamily: 'var(--font-body)' }}>
                {team.memberCount} / {maxMembers}
              </span>
              {/* Progress bar */}
              <div className="flex-1 max-w-[80px] bg-[rgba(138,138,138,0.2)] rounded-full h-[6px] overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#22c55e] to-[#4ade80] h-full transition-all duration-500"
                  style={{ width: `${(team.memberCount / maxMembers) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Problem Statement */}
          {team.problemStatement && (
            <div className="flex flex-col gap-[4px] col-span-2">
              <span className="text-[12px] text-white opacity-60 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
                Problem Statement
              </span>
              <span className="text-[14px] text-white" style={{ fontFamily: 'var(--font-body)' }}>
                {team.problemStatement}
              </span>
            </div>
          )}

          {/* Your Role */}
          <div className="flex flex-col gap-[4px]">
            <span className="text-[12px] text-white opacity-60 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
              Your Role
            </span>
            <span className={`text-[14px] ${isLead ? 'text-[#22c55e]' : 'text-white'} font-medium`} style={{ fontFamily: 'var(--font-body)' }}>
              {isLead ? "Team Lead" : "Member"}
            </span>
          </div>
        </div>
      </div>
    </FormSection>
  );
}
