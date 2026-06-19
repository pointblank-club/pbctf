"use client";

import { useState } from "react";
import { Modal } from "@/components/registration/modal";
import { MessageCircleQuestion, ArrowUpRight } from "lucide-react";

export function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open help"
        className="group fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 h-11 px-4 rounded-md bg-surface-1/95 backdrop-blur-md text-ink border border-brand/30 hover:border-brand/55 hover:bg-surface-2 transition-[background,border-color,transform,box-shadow] duration-200 hover:shadow-glow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        <MessageCircleQuestion className="w-4 h-4 text-brand group-hover:rotate-12 transition-transform duration-200" />
        <span className="text-[12.5px] font-body font-medium">Need help?</span>
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Need assistance?" size="md">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-[14.5px] text-ink font-body leading-relaxed">
              Stuck or have a question? We&apos;re here to help.
            </p>
            <p className="text-[13.5px] text-ink-secondary font-body leading-relaxed">
              Join our official Discord server and head to the{" "}
              <span className="text-mono text-brand font-medium">#doubts</span>{" "}
              channel for support.
            </p>
          </div>

          <a
            href="https://discord.gg/Und8vHaw5a"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-md bg-brand text-brand-ink font-semibold text-[13px] hover:bg-brand-hover hover:shadow-glow-md transition-[background,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Join Discord Server
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      </Modal>
    </>
  );
}
