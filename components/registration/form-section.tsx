import React from "react";
import { HudFrame } from "./hud-frame";

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  status?: React.ReactNode;
  eyebrow?: string;
  className?: string;
  compact?: boolean;
}

export function FormSection({
  title,
  children,
  status,
  eyebrow,
  className,
  compact,
}: FormSectionProps) {
  return (
    <section
      className={[
        "relative w-full rounded-lg",
        "card-surface",
        "border border-[var(--border-soft)]",
        className || "",
      ].join(" ")}
    >
      <HudFrame cornerSize="md" intensity="strong" />
      <div className={compact ? "flex flex-col gap-3 p-3.5 sm:p-4" : "flex flex-col gap-5 p-5 sm:p-6 md:p-8"}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && (
              <div className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-brand mb-1">
                {eyebrow}
              </div>
            )}
            <h2 className={compact ? "text-[18px] sm:text-[20px] font-semibold text-ink tracking-tight font-heading leading-tight" : "text-[20px] sm:text-[24px] md:text-[28px] font-semibold text-ink tracking-tight font-heading leading-tight"}>
              {title}
            </h2>
          </div>
          {status && <div className="shrink-0">{status}</div>}
        </div>
        <div className="flex flex-col gap-3">{children}</div>
      </div>
    </section>
  );
}
