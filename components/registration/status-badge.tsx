import React from "react";
import { LucideIcon } from "lucide-react";

interface StatusBadgeProps {
  status: string | undefined | null;
  icon: LucideIcon;
}

export function StatusBadge({
  status,
  icon: Icon,
}: StatusBadgeProps) {
  const getStatusColor = () => {
    if (!status || typeof status !== 'string') {
      return "bg-white/5 border-white/38";
    }
    switch (status.toLowerCase()) {
      case "rsvped":
      case "confirmed":
      case "shortlisted":
      case "accepted":
        return "bg-[rgba(34,197,94,0.2)] border-[#22c55e]";
      case "pending":
      case "active":
      case "under-review":
        return "bg-[rgba(34,197,94,0.15)] border-[#4ade80]";
      case "submitted":
        return "bg-white/5 border-white/38";
      case "declined":
      case "rejected":
      case "rsvp_declined":
        return "bg-black/50 border-[#22c55e]";
      case "withdrawn":
        return "bg-white/5 border-white/20";
      default:
        return "bg-white/5 border-white/38";
    }
  };

  return (
    <div
      className={`flex items-center gap-[8px] px-[12px] py-[6px] rounded-[12px] border ${getStatusColor()}`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-[13px] text-white capitalize" style={{ fontFamily: 'var(--font-body)' }}>
        {status || 'Unknown'}
      </span>
    </div>
  );
}

