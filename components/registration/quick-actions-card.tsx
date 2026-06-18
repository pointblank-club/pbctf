"use client";

import { Search, Trash2, LogOut } from "lucide-react";
import { FormSection } from "./form-section";
import { Button } from "./button";

interface QuickActionsCardProps {
  isLead: boolean;
  teamStatus: string;
  memberCount: number;
  maxMembers?: number;
  onNavigate: (path: string) => void;
  onDeleteTeam: () => void;
  onLeaveTeam: () => void;
}

export function QuickActionsCard({
  isLead,
  teamStatus,
  memberCount,
  maxMembers = 2,
  onNavigate,
  onDeleteTeam,
  onLeaveTeam,
}: QuickActionsCardProps) {
  const canDiscover = isLead && memberCount < maxMembers;
  const canDelete =
    isLead && teamStatus !== "shortlisted" && teamStatus !== "confirmed";
  const canLeave =
    !isLead && teamStatus !== "shortlisted" && teamStatus !== "confirmed";

  const hasActions = canDiscover || canDelete || canLeave;

  if (!hasActions) {
    return null;
  }

  return (
    <FormSection title="Quick Actions">
      <div className="flex flex-col gap-[12px]">
        {/* Secondary Actions */}
        <div className="flex flex-col gap-[8px]">
          {canDiscover && (
            <Button onClick={() => onNavigate("/dashboard/discover")} variant="secondary">
              <Search className="w-4 h-4" />
              Discover Members
            </Button>
          )}
        </div>

        {/* Destructive Actions */}
        {(canDelete || canLeave) && (
          <>
            <div className="h-[1px] bg-[rgba(255,255,255,0.1)] my-[4px]" />

            {canDelete && (
              <Button onClick={onDeleteTeam} variant="danger">
                <Trash2 className="w-4 h-4" />
                Delete Team
              </Button>
            )}

            {canLeave && (
              <Button onClick={onLeaveTeam} variant="danger">
                <LogOut className="w-4 h-4" />
                Leave Team
              </Button>
            )}
          </>
        )}
      </div>
    </FormSection>
  );
}
