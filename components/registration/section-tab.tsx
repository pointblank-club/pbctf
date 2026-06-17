"use client";

import { LucideIcon } from "lucide-react";

interface SectionTabProps {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}

export function SectionTab({ active, onClick, icon: Icon, label }: SectionTabProps) {
  return (
    <button
      onClick={onClick}
      className={`backdrop-blur-[2.5px] backdrop-filter ${
        active 
          ? 'bg-[rgba(34,197,94,0.3)] border-[#22c55e]' 
          : 'bg-[rgba(138,138,138,0.2)] border-[rgba(255,255,255,0.38)] hover:bg-[rgba(138,138,138,0.3)]'
      } flex items-center gap-[10px] justify-center px-[20px] py-[10px] rounded-[15px] border border-solid transition-all relative`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <Icon className="w-4 h-4" />
      <span className="font-['Google_Sans_Flex',sans-serif] text-[14px] text-white">
        {label}
      </span>
      {active && (
        <div className="absolute inset-0 pointer-events-none shadow-[0px_0px_10px_0px_rgba(34,197,94,0.3)] rounded-[15px]" />
      )}
    </button>
  );
}

