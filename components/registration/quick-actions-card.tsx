"use client";

import { FileText, Edit, Search, Trash2, LogOut, Upload, Users, X } from "lucide-react";
import { FormSection } from "./form-section";
import { Button } from "./button";

interface QuickActionsCardProps {
  isLead: boolean;
  teamStatus: string;
  isEvaluated?: boolean;
  isShortlisted?: boolean;
  memberCount: number;
  maxMembers?: number;
  onNavigate: (path: string) => void;
  onDeleteTeam: () => void;
  onLeaveTeam: () => void;
  onWithdrawSubmission?: () => void;
  isDeadlineExpired?: boolean;
}

export function QuickActionsCard({
  isLead,
  teamStatus,
  isEvaluated = false,
  isShortlisted = false,
  memberCount,
  maxMembers = 2,
  onNavigate,
  onDeleteTeam,
  onLeaveTeam,
  onWithdrawSubmission,
  isDeadlineExpired = false,
}: QuickActionsCardProps) {
  const canSubmit = isLead && teamStatus === "active";
  const canEditSubmission = isLead && teamStatus === "submitted" && !isEvaluated && !isShortlisted;
  const canEdit = isLead;
  const canDiscover = isLead && memberCount < maxMembers;
  const canDelete = isLead && 
    teamStatus !== "submitted" && 
    teamStatus !== "shortlisted" && 
    teamStatus !== "confirmed";
  const canLeave = !isLead && 
    teamStatus !== "submitted" && 
    teamStatus !== "shortlisted" && 
    teamStatus !== "confirmed";
  const canWithdraw = isLead && teamStatus === "submitted" && !isEvaluated && !isShortlisted;

  const hasActions = canSubmit || canEditSubmission || canDiscover || canDelete || canLeave || canWithdraw;

  if (!hasActions) {
    return null;
  }

  return (
    <FormSection title="Quick Actions">
      <div className="flex flex-col gap-[12px]">
        {/* Primary Actions */}
        {canSubmit && (
          <Button 
            onClick={() => onNavigate("/dashboard/submission")} 
            variant="primary"
            disabled={isDeadlineExpired}
            className={isDeadlineExpired ? "opacity-50 cursor-not-allowed" : ""}
          >
            <Upload className="w-4 h-4" />
            {isDeadlineExpired ? "Submission Closed" : "Submit Team"}
          </Button>
        )}

        {canEditSubmission && (
          <Button onClick={() => onNavigate("/dashboard/submission")} variant="primary">
            <FileText className="w-4 h-4" />
            Edit Submission
          </Button>
        )}

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
        {(canDelete || canLeave || canWithdraw) && (
          <>
            <div className="h-[1px] bg-[rgba(255,255,255,0.1)] my-[4px]" />
            
            {canWithdraw && onWithdrawSubmission && (
              <Button onClick={onWithdrawSubmission} variant="danger">
                <X className="w-4 h-4" />
                Withdraw Submission
              </Button>
            )}

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
